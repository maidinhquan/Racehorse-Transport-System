// ============================================================================
// FLOW 5 – Xử lý sự cố trong chuyến (vai trò Điều phối)
// Báo sự cố → Điều phối tiếp nhận & lập phương án → Manager duyệt (nếu thuộc diện) → thực hiện & xác nhận
// → Điều phối cho phép tiếp tục chặng → Driver/Escort báo kết quả → Điều phối kiểm tra & đóng sự cố.
// ============================================================================
import { Chk, Field, Inp, Note, Sel, Txt } from '../components/common/ui';
import { DateTimeInput } from '../components/forms/DateTime';
import { changeEta, crewConflict, crewOf, dWhere, emp, horse, isDriver, isStaffAssignedToTrip, isVet, lastMilestone, legHolds, legOf, livePos, reqOfTrip, staffError, trip, tripHalted, tripHorses, tripLabel, tripStops, vehicle, vehicleConflict } from '../domain/coordinatorRules';
import type { Any } from '../store/coordinatorStore';
import { audit, cleanId, commit, db, go, me, nextId, notify, nowStamp, openModal, toast } from '../store/coordinatorStore';
import { apiClient } from '../../../shared/api/apiClient';
import { notifySync } from '../../../shared/utils/syncChannel';
import { dt, human, incTypeVi } from '../utils/format';

function syncIncidentToLocal(id: string, patch: Record<string, Any>) {
  if (typeof window === 'undefined') return;
  const cid = cleanId(id);
  try {
    const raw = localStorage.getItem('rts_driver_reported_incidents');
    if (raw) {
      const list = JSON.parse(raw);
      const updatedList = list.map((x: Any) => {
        if (cleanId(x.id) === cid || x.id === id) {
          return { ...x, ...patch };
        }
        return x;
      });
      localStorage.setItem('rts_driver_reported_incidents', JSON.stringify(updatedList));
    }
  } catch {
    // ignore
  }
  notifySync('requests_updated');
}

export const F5_TYPES: Record<string, string> = {
  VEHICLE_BREAKDOWN: 'Hỏng xe', TRAFFIC_ACCIDENT: 'Va chạm / tai nạn', ROAD_CLOSURE: 'Kẹt / cấm đường', BORDER_DELAY: 'Ách tắc tại cửa khẩu', BAD_WEATHER: 'Thời tiết xấu',
  FLIGHT_DELAY: 'Hoãn / đổi chuyến bay', HORSE_HEALTH: 'Sức khỏe ngựa', OTHER: 'Sự cố khác ảnh hưởng chặng',
};
export const F5_PLAN: Record<string, string> = {
  NO_CHANGE: 'Khắc phục tại chỗ, giữ nguyên kế hoạch',
  PICKUP_RELOCATE: 'Đổi điểm hẹn đón ngoại vi (Dưới 500m • Không phát sinh phí)',
  VEHICLE_SWAP: 'Nhóm 1: Sự cố về xe (Tổ xe khỏe mạnh)',
  CREW_SWAP: 'Nhóm 2: Sự cố về nhân sự (Xe hoạt động tốt)',
  VEHICLE_AND_CREW_SWAP: 'Nhóm 3: Tai nạn nghiêm trọng (Đổi cả xe và người)',
  ROUTE_ADJUST: 'Điều chỉnh lộ trình trong tuyến pháp lý đã duyệt',
};

export const F5_SCENARIOS: Record<string, { title: string; desc: string; group: string }> = {
  '1.1_STANDARD': {
    group: 'VEHICLE_SWAP',
    title: 'Kịch bản 1.1: Đổi xe dọc đường (Standard Swap)',
    desc: 'Cử xe mới + 1 Tài xế trung chuyển (Relief Driver) từ Hub đến. Tổ xe cũ nhận xe mới chạy tiếp. Relief Driver ở lại hiện trường chờ cứu hộ kéo xe cũ về xưởng.',
  },
  '1.2_CRITICAL': {
    group: 'VEHICLE_SWAP',
    title: 'Kịch bản 1.2: Cứu hộ khẩn cấp - Xe chặn ngang đường (Critical Swap)',
    desc: 'Book xe kéo cứu hộ ngoài (Third-party Towing) dọn hiện trường khẩn cấp + điều xe mới và Relief Driver ra.',
  },
  '2.1_QUICK_SWAP': {
    group: 'CREW_SWAP',
    title: 'Kịch bản 2.1: Phụ lái lên thay lái chính (Quick Swap)',
    desc: 'Tài xế chính mất khả năng lái. Phụ lái đủ điều kiện đổi lên ghế lái chính đi tiếp. Điều xe cấp cứu/taxi đưa tài xế cũ đi viện.',
  },
  '2.2_INTERNAL_SUPPORT': {
    group: 'CREW_SWAP',
    title: 'Kịch bản 2.2: Thay tài xế từ xa bằng xe công ty (Internal Support)',
    desc: 'Điều xe con nội bộ công ty (Company Car) + nhân viên hậu cần chở tài xế mới ra hiện trường, đồng thời chở tài xế bị ốm quay về hoặc đi khám.',
  },
  '2.3_EXTERNAL_SUPPORT': {
    group: 'CREW_SWAP',
    title: 'Kịch bản 2.3: Thay tài xế từ xa bằng Taxi / Grab ngoài (External Support)',
    desc: 'Tài xế mới tự bắt Taxi/Grab ra nhận xe, tài xế cũ bắt Taxi về. Toàn bộ chi phí được hạch toán vào chi phí nội bộ.',
  },
  '3.1_FULL_REPLACEMENT': {
    group: 'VEHICLE_AND_CREW_SWAP',
    title: 'Kịch bản 3.1: Tai nạn giao thông - Thay mới toàn bộ (Full Replacement)',
    desc: 'Xe và tài xế đều gặp nạn. Gọi xe cấp cứu người, điều tổ xe mới hoàn toàn (xe mới + tài xế mới) + Specialist làm việc với cảnh sát và bảo hiểm.',
  },
};
export const F5_ST: Record<string, [string, string]> = {
  REPORTED: ['NEW', 'Mới báo – chờ tiếp nhận'], PLANNING: ['IN_PROGRESS', 'Đang lập phương án'], PENDING_APPROVAL: ['PENDING_APPROVAL', 'Chờ phê duyệt'],
  CHANGES_REQUESTED: ['FAILED', 'Yêu cầu chỉnh sửa'], EXECUTING: ['IN_PROGRESS', 'Đang thực hiện phương án'], CONTINUE_ALLOWED: ['APPROVED', 'Đã cho tiếp tục chặng'],
  RESULT_REPORTED: ['PENDING', 'Chờ Điều phối kiểm tra'], ESCALATED: ['ESCALATED', 'Chờ quyết định'], HALTED: ['ON_HOLD', 'Chuyến dừng theo quyết định'], CLOSED: ['CLOSED', 'Đã đóng'],
};
export const f5Pill = (i: Any): [string, string] => (F5_ST[i.status] ? F5_ST[i.status] : [i.status, human(i.status)]);
export const F5_DONE = ['CLOSED', 'HALTED'];
export const ROLE_VI: Record<string, string> = { DRIVER: 'Tài xế / Áp tải', FLEET_COORDINATOR: 'Điều phối viên', LOGISTICS_MANAGER: 'Quản lý vận hành', CUSTOMER: 'Khách hàng', SYSTEM: 'Hệ thống' };
export const CMP_VI: Record<string, string> = { NEW: 'Mới', OPEN: 'Đang mở', SUBMITTED: 'Đã gửi', IN_PROGRESS: 'Đang xử lý', ESCALATED: 'Đã chuyển cấp trên', PENDING_CUSTOMER_CONFIRMATION: 'Chờ khách xác nhận', RESOLVED: 'Đã giải quyết', CLOSED: 'Đã đóng' };
export const PAYER_VI: Record<string, string> = { COMPANY: 'Công ty', CUSTOMER: 'Khách hàng', INSURANCE: 'Bảo hiểm' };
const BY_VI: Record<string, string> = { 'Điều phối': 'Điều phối', Manager: 'Quản lý', 'Quản lý': 'Quản lý', 'Driver / Escort': 'Tài xế / Áp tải', 'Tài xế / Áp tải': 'Tài xế / Áp tải' };
export const byVi = (b: string) => BY_VI[b] || b;

const f5Log = (i: Any, text: string) => {
  if (!i) return;
  i.log = Array.isArray(i.log) ? i.log : [];
  i.log.push([nowStamp(), text, me().name, 'FLEET_COORDINATOR']);
};
export const curPlan = (i: Any) => (Array.isArray(i?.plans) && i.plans.length ? i.plans[i.plans.length - 1] : null);
export const resSig = (p: Any) => JSON.stringify([p.vehicleId || '', p.newCrew ? Object.entries(p.newCrew).sort() : [p.crewRole || '', p.crewId || '']]);

export function f5Status(i: Any) {
  if (F5_DONE.includes(i.status)) return i.status;
  const p = curPlan(i);

  // Sự cố đã có phương án duyệt/áp dụng từ hệ thống hoặc đang thực thi thì luôn coi là đã tiếp nhận và ở trạng thái EXECUTING
  if (i.status === 'RECOVERY_APPLIED' || i.status === 'EXECUTING' || i.approvedPlan || (p && p.status !== 'DRAFT')) {
    i.ackAt = i.ackAt || i.at || nowStamp();
    if (!i.result && !i.continueAt && !i.escalation) {
      i.status = 'EXECUTING';
      return i.status;
    }
  }

  i.status = i.escalation && !i.escalation.decision ? 'ESCALATED' : i.result ? 'RESULT_REPORTED' : i.continueAt ? 'CONTINUE_ALLOWED' : !i.ackAt ? 'REPORTED'
    : !p || p.status === 'DRAFT' || (i.replan && p.v <= i.replanFrom) ? 'PLANNING' : 'EXECUTING';
  return i.status;
}

/** điều kiện để tiếp tục chặng (còn thiếu gì, ai phải làm) */
export function f5Conditions(i: Any, own = false): Array<{ ok: boolean; label: string; by: string }> {
  const t = trip(i.tripId), p = curPlan(i), out: Array<{ ok: boolean; label: string; by: string }> = [];
  const add = (ok: boolean, label: string, by: string) => out.push({ ok, label, by });

  // Phân định rõ trách nhiệm: Bác sĩ thú y phụ trách sức khỏe ngựa, Tài xế phụ trách xe và lộ trình
  const isHorseHealth = i.type === 'HORSE_HEALTH' || i.reporterRole === 'VETERINARIAN';
  const targetRoleLabel = isHorseHealth ? 'Bác sĩ thú y' : 'Tài xế';

  let isRoleAck = false;
  if (typeof window !== 'undefined') {
    try {
      const rawAck =
        localStorage.getItem(`rts_driver_ack_${cleanId(i.id)}`) ||
        localStorage.getItem(`rts_driver_ack_${i.id}`) ||
        localStorage.getItem(`rts_ack_${cleanId(i.id)}`) ||
        localStorage.getItem(`rts_ack_${i.id}`);
      if (rawAck) {
        const parsed = JSON.parse(rawAck);
        // Chỉ chấp nhận khi người xác nhận là tổ xe tại hiện trường, KHÔNG PHẢI Điều phối
        if (parsed?.ok && parsed?.role !== 'COORDINATOR' && !parsed?.by?.includes('Điều phối')) {
          isRoleAck = true;
        }
      }
    } catch {
      // ignore
    }
  }
  if (!isRoleAck && (i.isSceneReady || i.sceneReady)) {
    isRoleAck = true;
  }
  if (!isRoleAck && i.updates && Array.isArray(i.updates)) {
    isRoleAck = i.updates.some((u: Any) =>
      String(u.text || u.notes || '').toLowerCase().includes('tiếp nhận phương án') ||
      String(u.text || u.notes || '').toLowerCase().includes('sẵn sàng phối hợp')
    );
  }

  if (isHorseHealth) {
    // SỰ CỐ Y TẾ NGỰA
    let isVetResolved = Boolean(i.vetStatus === 'STABILIZED');
    let isVetTransferApproved = Boolean(i.resolutionType === 'VET_TRANSFER' || (i.approvedPlan && i.approvedPlan.includes('Chuyển ngựa cấp cứu')));

    if (typeof window !== 'undefined') {
      try {
        const rawRes = localStorage.getItem(`rts_vet_resolved_${cleanId(i.id)}`) || localStorage.getItem(`rts_vet_resolved_${i.id}`);
        if (rawRes) isVetResolved = true;
        const rawRef = localStorage.getItem(`rts_vet_referral_${cleanId(i.id)}`) || localStorage.getItem(`rts_vet_referral_${i.id}`);
        if (rawRef && isVetTransferApproved) isVetTransferApproved = true;
      } catch {
        // ignore
      }
    }

    if (!isVetResolved && i.updates && Array.isArray(i.updates)) {
      isVetResolved = i.updates.some((u: Any) =>
        String(u.text || u.notes || '').includes('Sự cố đã được xử lý') ||
        String(u.text || u.notes || '').includes('đã ổn định')
      );
    }

    add(
      isVetResolved || isVetTransferApproved,
      isVetResolved
        ? 'Bác sĩ thú y xác nhận sức khỏe ngựa đã ổn định'
        : (isVetTransferApproved ? 'Đã duyệt chuyển viện khẩn cấp đến cơ sở y tế' : 'Chờ Bác sĩ thú y xử lý ổn định hoặc đề xuất chuyển viện'),
      'Bác sĩ thú y'
    );

    add(
      isRoleAck || isVetResolved || isVetTransferApproved,
      isVetResolved ? 'Tổ xe và ngựa sẵn sàng tiếp tục chặng' : 'Hiện trường sẵn sàng phối hợp',
      'Bác sĩ thú y'
    );
  } else {
    // SỰ CỐ XE / TAI NẠN / ĐƯỜNG SÁ
    add(!!p && p.status !== 'DRAFT', p ? `Phương án v${p.v} đã lưu và áp dụng` : 'Có phương án xử lý', 'Điều phối');
    add(isRoleAck, `${targetRoleLabel} xác nhận hiện trường sẵn sàng`, targetRoleLabel);

    // Xe & nhân sự tự động đạt khi phương án đã được Điều phối áp dụng
    const isResConfirmed = !!(p && p.status !== 'DRAFT') || !!(i.resOk && p && i.resOk.sig === resSig(p));
    add(isResConfirmed, `Xe & nhân sự đáp ứng phương án${p ? ' v' + p.v : ''}`, 'Điều phối');
  }

  if (i.type === 'HORSE_HEALTH' && i.vet) {
    add(['FIT', 'FIT_WITH_CONDITIONS'].includes(i.vet.conclusion), i.vet.conclusion === 'NOT_FIT' ? 'Bác sĩ kết luận chưa đủ sức khỏe tiếp tục' : 'Kết luận của bác sĩ bên ngoài cho phép tiếp tục', 'Bác sĩ thú y');
  }
  if (!own) db.incidents.filter((x: Any) => x !== i && x.tripId === i.tripId && x.blocking && !F5_DONE.includes(x.status) && !x.continueAt && f5Conditions(x, true).some((c) => !c.ok))
    .forEach((x: Any) => add(false, `Sự cố ${x.id} (${F5_TYPES[x.type] || incTypeVi(x.type)}) vẫn đang chặn chặng`, 'Điều phối'));
  if (tripHalted(t)) add(false, 'Chuyến đang dừng theo quyết định', 'Điều phối');
  if (p?.newCrew) {
    for (const [r, cid] of Object.entries(p.newCrew)) {
      const error = staffError(emp(cid as string), t, r);
      if (error) out.push({ ok: false, label: error, by: 'Điều phối' });
    }
  } else if (p?.crewId && t) {
    const error = staffError(emp(p.crewId), t, p.crewRole);
    out.push({ ok: !error, label: error || 'Nhân sự thay thế hợp lệ, không trùng chuyến khác', by: 'Điều phối' });
  }
  return out;
}

/** khung "Việc bạn cần làm / Đang chờ ai" */
export function f5Next(i: Any): [string, string, string] {
  const p = curPlan(i), miss = f5Conditions(i).filter((c) => !c.ok), S = i.status;
  if (S === 'CLOSED') return ['done', 'Sự cố đã đóng', `Đóng bởi ${i.closedBy || '—'} lúc ${dt(i.closedAt)}. Đóng sự cố không hoàn tất chuyến; chuyến tiếp tục theo các mốc bình thường.`];
  if (S === 'HALTED') return ['bad', 'Chuyến dừng theo quyết định', i.escalation?.note || i.escalation?.reason || ''];
  if (S === 'ESCALATED') return ['wait', 'Đang chờ quyết định', 'Điều phối đã báo chuyến không thể tiếp tục: ' + (i.escalation?.reason || i.description || '')];
  if (S === 'REPORTED') return ['me', 'Tiếp nhận sự cố', 'Bạn là đầu mối từ tiếp nhận đến đóng sự cố.'];
  if (S === 'PLANNING') return ['me', p ? `Hoàn thiện phương án v${p.v} và áp dụng` : 'Lập phương án xử lý', ''];
  if (S === 'PENDING_APPROVAL') return ['me', `Duyệt & Áp dụng phương án v${p.v}`, 'Điều phối viên trực tiếp phê duyệt và chuyển hướng dẫn cho tổ xe.'];
  if (S === 'EXECUTING') {
    const isHorseHealth = i.type === 'HORSE_HEALTH' || i.reporterRole === 'VETERINARIAN';
    const targetRole = isHorseHealth ? 'Bác sĩ thú y' : 'Tài xế';
    if (!miss.length) return ['me', 'Đủ điều kiện – cho phép tiếp tục chặng', 'Cho phép tiếp tục không đóng sự cố.'];
    const ackMiss = miss.find((c) => c.label.includes('xác nhận'));
    if (ackMiss) {
      return ['wait', `Chờ ${targetRole} xác nhận tiếp nhận phương án`, `Điều phối viên đã phê duyệt phương án. Đang chờ ${targetRole.toLowerCase()} bấm xác nhận tiếp nhận ngoài hiện trường trước khi mở chặng.`];
    }
    const mine = miss.filter((c) => c.by === 'Điều phối');
    if (mine.length) return ['me', 'Hoàn tất điều kiện còn thiếu để tiếp tục chặng', mine.map((c) => c.label).join(' • ')];
    return ['wait', 'Đang chờ các bên khác', miss.map((c) => `${c.label} (${byVi(c.by)})`).join(' • ')];
  }
  if (S === 'CONTINUE_ALLOWED') {
    const isHorseHealth = i.type === 'HORSE_HEALTH' || i.reporterRole === 'VETERINARIAN';
    return ['done', 'Sự cố đã được xử lý', isHorseHealth ? 'Bác sĩ thú y xác nhận ngựa đã ổn định thể trạng, chuyến xe tiếp tục lộ trình.' : 'Sự cố đã được khắc phục, chuyến xe tiếp tục lộ trình.'];
  }
  if (S === 'RESULT_REPORTED') return ['me', 'Kiểm tra kết quả và đóng sự cố', 'Đóng sự cố không hoàn tất chuyến.'];
  return ['wait', '', ''];
}
export const waitingFor = (i: Any) => (
  i.status === 'REPORTED' ? 'Điều phối' :
  i.status === 'PENDING_APPROVAL' || i.status === 'ESCALATED' ? 'Quản lý' :
  i.status === 'CONTINUE_ALLOWED' ? 'Điều phối' :
  ['PLANNING', 'CHANGES_REQUESTED', 'RESULT_REPORTED'].includes(i.status) ? 'Điều phối' :
  i.status === 'EXECUTING' ? ([...new Set(f5Conditions(i).filter((c) => !c.ok).map((c) => byVi(c.by)))].join(', ') || 'Điều phối') :
  '—'
);

/** số sự cố cần Điều phối thao tác (huy hiệu trên thanh bên) */
export function coordNavCount() {
  return db.incidents.filter((i: Any) => { f5Status(i); return ['REPORTED', 'PLANNING', 'CHANGES_REQUESTED', 'RESULT_REPORTED'].includes(i.status) || (i.status === 'EXECUTING' && !f5Conditions(i).some((c) => !c.ok)); }).length;
}
export const openIncidentsOf = (tid: string) => db.incidents.filter((i: Any) => i.tripId === tid && i.status !== 'CLOSED');

// ---------- cơ sở thú y cấp cứu gần vị trí ước tính ----------
export function nearestVets(t: Any) {
  const stops = tripStops(t), p = livePos(t), names = stops.map((s: Any) => s.name), r = reqOfTrip(t);
  return db.vetStations.map((v: Any) => {
    const idx = Math.min(...v.near.map((n: string) => { const i = names.indexOf(n); return i < 0 ? 99 : Math.abs(i - (p.idx + p.frac)); }));
    const cityHit = v.near.includes(r.origin) || v.near.includes(r.destination) ? 3 : 99;
    const score = Math.min(idx, cityHit); return { ...v, score, est: score >= 99 ? null : Math.round(v.km + score * 45) };
  }).filter((v: Any) => v.score < 99).sort((a: Any, b: Any) => a.est - b.est).slice(0, 4);
}

// ---------- tác động của phương án đã duyệt / không cần duyệt lên chuyến ----------
function f5Apply(i: Any, p: Any) {
  const t = trip(i.tripId);
  if (p.vehicleId && p.vehicleId !== t.vehicleId) {
    f5Log(i, `Đổi xe ${vehicle(t.vehicleId) ? vehicle(t.vehicleId).plate : '—'} → ${vehicle(p.vehicleId)?.plate || p.vehicleId}`);
    t.vehicleId = p.vehicleId;
  }
  if (p.kind === 'CREW_SWAP' && p.scenario === '2.1_QUICK_SWAP' && t.crew?.CO_DRIVER) {
    const promoted = t.crew.CO_DRIVER;
    t.crew = { ...t.crew, MAIN_DRIVER: promoted };
    f5Log(i, `[Đổi lái chính] Phụ lái ${emp(promoted)?.name} được chuyển lên ghế lái chính tiếp tục hành trình.`);
  } else if (p.newCrew && typeof p.newCrew === 'object') {
    Object.entries(p.newCrew).forEach(([role, crewId]) => {
      if (crewId && emp(crewId as string)) {
        t.crew = { ...(t.crew || {}), [role]: crewId };
        f5Log(i, `Thay ${human(role)}: ${emp(crewId as string)?.name}`);
      }
    });
  } else if (p.crewId && p.crewRole) {
    t.crew = { ...(t.crew || {}), [p.crewRole]: p.crewId };
    f5Log(i, `Thay ${human(p.crewRole)}: ${emp(p.crewId)?.name || p.crewId}`);
  }
  if (p.etaTo && p.etaTo !== t.eta) changeEta(t, p.etaTo, `${i.id} – phương án v${p.v}`, me().name);
  crewOf(t).forEach(([, e]) => notify(e, `Phương án v${p.v} cho ${i.id}`, p.desc.slice(0, 90), `d/incident/${i.id}`));
}

// ============================================================================
// Thao tác của Điều phối
// ============================================================================
const find = (id: string) => db.incidents.find((x: Any) => cleanId(x.id) === cleanId(id) || x.id === id);

export function f5Ack(id: string) {
  const i = find(id), t = trip(i?.tripId);
  if (!i || i.ackAt) return;
  i.ackAt = nowStamp();
  i.owner = me().name;
  f5Log(i, 'Tiếp nhận sự cố, xác định chặng: ' + legOf(t, i.leg));
  f5Status(i);
  commit();

  const cid = cleanId(id);
  try {
    localStorage.setItem(`rts_coord_ack_${cid}`, JSON.stringify({ ok: true, at: nowStamp(), by: me().name }));
    localStorage.setItem(`rts_coord_ack_${id}`, JSON.stringify({ ok: true, at: nowStamp(), by: me().name }));
    localStorage.removeItem(`rts_driver_ack_${cid}`);
    localStorage.removeItem(`rts_driver_ack_${id}`);
    localStorage.removeItem(`rts_ack_${cid}`);
    localStorage.removeItem(`rts_ack_${id}`);
    localStorage.setItem(`rts_incident_status_${cid}`, 'IN_PROGRESS');
    localStorage.setItem(`rts_incident_status_${id}`, 'IN_PROGRESS');
  } catch {
    // ignore
  }

  syncIncidentToLocal(id, {
    status: 'IN_PROGRESS',
    isCoordAccepted: true,
    ackAt: nowStamp(),
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rts_incident_created', { detail: { id, status: 'IN_PROGRESS' } }));
    window.dispatchEvent(new CustomEvent('rts_incident_pins_changed', { detail: { id, status: 'IN_PROGRESS' } }));
  }

  void (async () => {
    try {
      await apiClient.post(`/coordinator/incidents/${cleanId(id)}/accept`);
    } catch {
      try {
        await apiClient.post(`/incidents/${cleanId(id)}/accept`);
      } catch {
        // ignore
      }
    }
  })();

  if (t) {
    crewOf(t).forEach(([, e]) => notify(e, `Điều phối đã tiếp nhận ${i.id}`, 'Giữ an toàn, gửi cập nhật hiện trường khi có diễn biến.', `d/incident/${i.id}`));
  }
  toast('Đã tiếp nhận sự cố thành công.');
}

export function f5Plan(id: string) {
  const i = find(id), t = trip(i.tripId), p = curPlan(i) || {}, n = tripHorses(t).length;
  const currentVeh = vehicle(t.vehicleId);
  const curMD = t.crew?.MAIN_DRIVER ? emp(t.crew.MAIN_DRIVER) : null;
  const curCD = t.crew?.CO_DRIVER ? emp(t.crew.CO_DRIVER) : null;
  const curVet = t.crew?.VETERINARIAN ? emp(t.crew.VETERINARIAN) : null;

  const vOpts: Array<[string, string]> = [
    ['', `— Giữ xe hiện tại (${currentVeh?.plate || 'Chưa có xe'}) —`],
    ...db.vehicles.filter((v: Any) => v.id !== t.vehicleId && v.status === 'READY' && v.stalls >= n && !vehicleConflict(v, t))
      .map((v: Any) => [v.id, `${v.plate} • ${v.model} • ${v.stalls} ô • ${v.base}`] as [string, string]),
  ];

  const mainDriverOpts: Array<[string, string]> = [
    ['', `— Giữ tài xế chính (${curMD?.name || 'Chưa phân công'}) —`],
    ...db.employees.filter((e: Any) => isDriver(e) && !isStaffAssignedToTrip(e, t) && !crewConflict(e, t))
      .map((e: Any) => [e.id, `${e.name} • ${human(e.position)}`] as [string, string]),
  ];

  const coDriverOpts: Array<[string, string]> = [
    ['', `— Giữ phụ lái (${curCD?.name || 'Chưa phân công'}) —`],
    ...db.employees.filter((e: Any) => (isDriver(e) || (e.role === 'ESCORT' && e.position === 'ESCORT')) && !isStaffAssignedToTrip(e, t) && !crewConflict(e, t))
      .map((e: Any) => [e.id, `${e.name} • ${human(e.position)}`] as [string, string]),
  ];

  const reliefDriverOpts: Array<[string, string]> = [
    ['', '— Chọn tài xế trung chuyển (Relief Driver) —'],
    ...db.employees.filter((e: Any) => isDriver(e) && !isStaffAssignedToTrip(e, t) && !crewConflict(e, t))
      .map((e: Any) => [e.id, `${e.name} • ${human(e.position)}`] as [string, string]),
  ];

  const horsesOnTripOpts: Array<[string, string]> = tripHorses(t).map((hId: string) => {
    const h = horse(hId);
    return [hId, `${h?.name || hId} (${hId}) • Giống ${h?.breed || 'Ngựa đua'}`] as [string, string];
  });

  const specialistOpts: Array<[string, string]> = [
    ['', '— Chọn Specialist pháp lý & bảo hiểm hỗ trợ —'],
    ...db.employees.filter((e: Any) => e.role === 'SPECIALIST' || e.position === 'SPECIALIST')
      .map((e: Any) => [e.id, `${e.name} • Chuyên viên Pháp lý & Hải quan`] as [string, string]),
  ];

  const vetOpts: Array<[string, string]> = [
    ['', `— Giữ áp tải chăm sóc ngựa (${curVet?.name || 'Chưa phân công'}) —`],
    ...db.employees.filter((e: Any) => (isVet(e) || e.position === 'VETERINARIAN') && !isStaffAssignedToTrip(e, t) && !crewConflict(e, t) && (!e.certExpiry || e.certExpiry >= t.eta.slice(0, 10)))
      .map((e: Any) => [e.id, `${e.name} • Thú y (Hạn chứng chỉ: ${e.certExpiry || '—'})`] as [string, string]),
  ];

  const vehicleSwapScenarios: Array<[string, string]> = [
    ['1.1_STANDARD', 'Kịch bản 1.1: Đổi xe dọc đường (Standard Swap - Cử xe mới + Relief Driver lái đến, tổ cũ lái tiếp)'],
    ['1.2_CRITICAL', 'Kịch bản 1.2: Cứu hộ khẩn cấp (Critical Swap - Xe chặn đường, book xe kéo ngoài Towing + xe mới)'],
  ];

  const crewSwapScenarios: Array<[string, string]> = [
    ['2.1_QUICK_SWAP', 'Kịch bản 2.1: Phụ lái lên thay lái chính (Quick Swap) + đưa tài xế cũ đi viện'],
    ['2.2_INTERNAL_SUPPORT', 'Kịch bản 2.2: Thay tài xế từ xa bằng xe con công ty (Company Car), chở tài xế ốm về'],
    ['2.3_EXTERNAL_SUPPORT', 'Kịch bản 2.3: Thay tài xế từ xa bằng Taxi / Grab ngoài (Ghi nhận chi phí nội bộ)'],
  ];

  const combinedScenarios: Array<[string, string]> = [
    ['3.1_FULL_REPLACEMENT', 'Kịch bản 3.1: Tai nạn giao thông - Thay mới toàn bộ (Full Replacement: Xe mới + Tổ xe mới + Cứu thương + Specialist)'],
  ];

  const isPickupAccessBlocked = /PICKUP_ACCESS|PICKUP_BLOCKED/.test(String(i.type || i.category || ''));
  const guess = p.kind && F5_PLAN[p.kind] ? p.kind : (isPickupAccessBlocked ? 'PICKUP_RELOCATE' : /BREAKDOWN|ACCIDENT/.test(i.type) ? 'VEHICLE_SWAP' : /ROAD|BORDER|WEATHER/.test(i.type) ? 'ROUTE_ADJUST' : 'NO_CHANGE');
  const vets = i.type === 'HORSE_HEALTH' ? nearestVets(t) : [];

  const cleanTripKey = (t?.id || i.tripId || '').replace(/-/g, '_');
  let cachedEv: any = null;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(`rts_pickup_evidence_${cleanTripKey}`) : null;
    if (raw) cachedEv = JSON.parse(raw);
  } catch {}
  const rawImg = i?.imageUrl || '';
  const imgParts = rawImg.includes('||') ? rawImg.split('||') : [rawImg];
  const blockedImg = i?.blockedImageUrl || cachedEv?.blockedImageUrl || (imgParts[0]?.trim() || null);
  const relocationImg = i?.relocationImageUrl || cachedEv?.relocationImageUrl || (imgParts.length > 1 ? imgParts[1]?.trim() : null);
  const descMatch = i?.description?.match(/Vị trí dời đề xuất:\s*([^.]+)/i);
  const extractedPlace = descMatch ? descMatch[1].trim() : undefined;
  const isMockPlace = (val?: string | null) => !val || val.toLowerCase().includes('ngã ba đường liên xã');
  const proposedPlace =
    (!isMockPlace((i as any)?.proposedRelocationPlaceName) ? (i as any)?.proposedRelocationPlaceName : undefined) ||
    (!isMockPlace(cachedEv?.proposedPlaceName) ? cachedEv?.proposedPlaceName : undefined) ||
    (!isMockPlace((i as any)?.relocationMeetingPointName) ? (i as any)?.relocationMeetingPointName : undefined) ||
    (!isMockPlace(extractedPlace) ? extractedPlace : undefined) ||
    (!isMockPlace(t?.relocationMeetingPointName) ? t?.relocationMeetingPointName : undefined);

  openModal({
    title: `${curPlan(i) && curPlan(i).status !== 'DRAFT' ? 'Sửa phương án → tạo phiên bản mới' : 'Lập phương án xử lý (Command Center)'} • ${i.id}`,
    ok: 'Lưu phương án',
    wide: true,
    init: {
      k: guess,
      scenario: p.scenario || (guess === 'VEHICLE_SWAP' ? '1.1_STANDARD' : guess === 'CREW_SWAP' ? '2.1_QUICK_SWAP' : guess === 'VEHICLE_AND_CREW_SWAP' ? '3.1_FULL_REPLACEMENT' : ''),
      desc: p.desc || '',
      reason: p.reason || '',
      meetingPointName: p.meetingPointName || '',
      veh: p.vehicleId || '',
      reliefDriverId: p.reliefDriverId || '',
      towingPartner: p.towingPartner || 'Đội Cứu hộ Giao thông Cao tốc 116',
      towingPhone: p.towingPhone || '1900 116 116',
      towingCost: p.towingCost || 250,

      changeMainDriver: !!(p.newCrew?.MAIN_DRIVER || (p.crewRole === 'MAIN_DRIVER' && p.crewId)),
      mainDriverId: p.newCrew?.MAIN_DRIVER || (p.crewRole === 'MAIN_DRIVER' ? p.crewId : '') || '',
      changeCoDriver: !!(p.newCrew?.CO_DRIVER || (p.crewRole === 'CO_DRIVER' && p.crewId)),
      coDriverId: p.newCrew?.CO_DRIVER || (p.crewRole === 'CO_DRIVER' ? p.crewId : '') || '',
      changeVet: !!(p.newCrew?.VETERINARIAN || (p.crewRole === 'VETERINARIAN' && p.crewId)),
      vetId: p.newCrew?.VETERINARIAN || (p.crewRole === 'VETERINARIAN' ? p.crewId : '') || '',
      companyCarPlate: p.companyCarPlate || '51H-992.88 (Xe hậu cần công ty)',
      taxiVendor: p.taxiVendor || 'Taxi Mai Linh / Grab Business',
      taxiCost: p.taxiCost || 45,
      medicalTransport: p.medicalTransport || 'Xe cấp cứu y tế 115 / Taxi y tế',

      ambulancePartner: p.ambulancePartner || 'Cấp cứu 115 Bệnh viện Đa khoa địa phương',
      ambulancePhone: p.ambulancePhone || '115',
      specialistId: p.specialistId || '',

      legal: p.legalRoute !== false,
      eta: p.etaTo || t.eta,
      cost: String(p.cost || 0),
      payer: p.payer || 'COMPANY',
    },
    body: (f) => {
      const activeScenario = F5_SCENARIOS[f.v.scenario];
      return (
        <>
          <p className="subtitle" style={{ marginTop: 0 }}>{legOf(t, i.leg)} • ETA đã xác nhận {dt(t.eta)}</p>
          <Field label="Nhóm phương án xử lý *">
            <Sel
              name="k"
              options={
                isPickupAccessBlocked
                  ? [
                      ['PICKUP_RELOCATE', F5_PLAN.PICKUP_RELOCATE],
                      ['NO_CHANGE', F5_PLAN.NO_CHANGE],
                    ]
                  : Object.entries(F5_PLAN)
              }
              onChange={(e: any) => {
                const newK = e.target.value;
                if (newK === 'VEHICLE_SWAP') f.set('scenario', '1.1_STANDARD');
                else if (newK === 'CREW_SWAP') f.set('scenario', '2.1_QUICK_SWAP');
                else if (newK === 'VEHICLE_AND_CREW_SWAP') f.set('scenario', '3.1_FULL_REPLACEMENT');
                else f.set('scenario', '');
              }}
            />
          </Field>

          {activeScenario && (
            <div style={{ margin: '8px 0 14px', padding: '10px 14px', background: 'var(--bg-page, #f8fafc)', borderRadius: 8, border: '1px solid var(--border-color, #e2e8f0)' }}>
              <div style={{ fontWeight: 600, color: 'var(--accent-primary, #1e40af)', fontSize: 13 }}>
                {activeScenario.title}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary, #475569)' }}>
                {activeScenario.desc}
              </p>
            </div>
          )}

          {vets.length ? (
            <Note tone="grey" icon="info" title="Cơ sở thú y gần vị trí hiện tại">
              {vets.map((v: Any, idx: number) => (
                <span key={v.id}>{idx ? <br /> : null}{v.name} (~{v.est} km, {v.phone}, {v.hours})</span>
              ))}
            </Note>
          ) : null}

          {/* ========================================================= */}
          {/* PHƯƠNG ÁN: ĐỔI ĐIỂM HẸN ĐÓN NGOẠI VI (DƯỚI 500M)         */}
          {/* ========================================================= */}
          {f.v.k === 'PICKUP_RELOCATE' && (
            <div style={{ marginTop: 14, padding: 14, border: '1px solid #bbf7d0', borderRadius: 8, background: '#f0fdf4' }}>
              <b style={{ fontSize: 14, color: '#166534', display: 'block', marginBottom: 6 }}>
                Phương án: Đổi điểm hẹn đón ngoại vi (Dưới 500m • Không phát sinh phí)
              </b>
              <p style={{ margin: '0 0 10px', fontSize: 12.5, color: '#15803d', lineHeight: 1.5 }}>
                Đoạn đường vào trang trại bị giới hạn kích thước xe, xe tải chuyên dụng đang dừng chờ ở đường lớn bên ngoài. Hướng dẫn tài xế và khách hẹn dắt bộ ngựa ra điểm tập kết an toàn.
              </p>

              {proposedPlace && (
                <div style={{ marginBottom: 10, padding: '6px 10px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 6, fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span><b style={{ color: '#065f46' }}>Vị trí tài xế đề xuất:</b> {proposedPlace}</span>
                  <button type="button" onClick={() => f.set('meetingPointName', proposedPlace)} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>
                    Sử dụng đề xuất này
                  </button>
                </div>
              )}

              <Field label="Tên điểm hẹn đón ngoại vi thay thế *">
                <Inp
                  name="meetingPointName"
                  placeholder={
                    proposedPlace
                      ? `Để trống sẽ dùng đề xuất "${proposedPlace}", hoặc nhập tên thay thế...`
                      : 'VD: Cây xăng đầu ngõ 15, Bãi đất trống ngoài đường lớn...'
                  }
                />
              </Field>

              {(blockedImg || relocationImg) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 8, marginBottom: 10 }}>
                  {blockedImg && (
                    <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 6, padding: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#9f1239', display: 'block', marginBottom: 4 }}>
                        1. Ảnh vị trí không thể vào (Tài xế báo):
                      </span>
                      <img src={blockedImg} alt="Vị trí không thể vào" style={{ width: '100%', height: 95, objectFit: 'cover', borderRadius: 4 }} />
                    </div>
                  )}
                  {relocationImg && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', display: 'block', marginBottom: 4 }}>
                        2. Ảnh chỗ dời đề xuất:
                      </span>
                      <img src={relocationImg} alt="Chỗ dời đề xuất" style={{ width: '100%', height: 95, objectFit: 'cover', borderRadius: 4 }} />
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 16, fontSize: 13, marginTop: 8 }}>
                <div>Cự ly ước tính: <b>{t?.relocationDistanceMeters || 320} mét</b> (&lt; 500m)</div>
                <div>Chi phí phát sinh: <b style={{ color: '#16a34a' }}>0 VNĐ (CBN Transport hỗ trợ miễn phí)</b></div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* NHÓM 1: SỰ CỐ VỀ XE (VEHICLE_SWAP) - Tổ xe khỏe mạnh       */}
          {/* ========================================================= */}
          {f.v.k === 'VEHICLE_SWAP' && (
            <div style={{ marginTop: 14, padding: 14, border: '1px solid #bfdbfe', borderRadius: 8, background: '#f0f9ff' }}>
              <b style={{ fontSize: 14, color: '#1e3a8a', display: 'block', marginBottom: 10 }}>
                1. Kịch bản điều chuyển Xe (Nhóm 1: Tổ xe vẫn khỏe mạnh)
              </b>
              <Field label="Chọn kịch bản thực tế *">
                <Sel name="scenario" options={vehicleSwapScenarios} />
              </Field>
              <div className="form-grid" style={{ marginTop: 8 }}>
                <Field label="Xe mới điều động đến hiện trường *">
                  <Sel name="veh" options={vOpts} />
                </Field>
                <Field label="Tài xế trung chuyển lái xe mới ra (Relief Driver) *">
                  <Sel name="reliefDriverId" options={reliefDriverOpts} />
                </Field>
              </div>

              {f.v.scenario === '1.2_CRITICAL' && (
                <div style={{ marginTop: 12, padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #fed7aa' }}>
                  <b style={{ fontSize: 13, color: '#c2410c' }}>Dịch vụ xe kéo cứu hộ ngoài (Third-party Towing)</b>
                  <div className="form-grid" style={{ marginTop: 6 }}>
                    <Field label="Đơn vị cứu hộ xe kéo *"><Inp name="towingPartner" placeholder="Tên đơn vị xe kéo" /></Field>
                    <Field label="Số điện thoại cứu hộ *"><Inp name="towingPhone" placeholder="SĐT liên hệ" /></Field>
                  </div>
                  <Field label="Chi phí cứu hộ xe kéo (USD) *"><Inp name="towingCost" type="number" min="0" /></Field>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* NHÓM 2: SỰ CỐ VỀ NHÂN SỰ (CREW_SWAP) - Xe hoạt động tốt    */}
          {/* ========================================================= */}
          {f.v.k === 'CREW_SWAP' && (
            <div style={{ marginTop: 14, padding: 14, border: '1px solid #e2e8f0', borderRadius: 8, background: 'var(--bg-surface, #fff)' }}>
              <b style={{ fontSize: 14, color: 'var(--text-primary, #111827)', display: 'block', marginBottom: 10 }}>
                2. Kịch bản điều chuyển Nhân sự (Nhóm 2: Xe hoạt động tốt)
              </b>
              <Field label="Chọn kịch bản thực tế *">
                <Sel name="scenario" options={crewSwapScenarios} />
              </Field>

              {f.v.scenario === '2.1_QUICK_SWAP' && (
                <div style={{ marginTop: 10, padding: 12, background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                  <div style={{ color: '#166534', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                    ✓ Phụ lái ({curCD ? curCD.name : 'Chưa phân công'}) được chỉ định lên ghế lái chính tiếp tục chuyến đi.
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: 12.5, color: '#15803d' }}>
                    Tài xế phụ có đủ bằng cấp và chứng từ biên giới, ngay lập tức vận chuyển bầy ngựa tiếp tục lộ trình để kịp giờ bay/hải quan.
                  </p>
                  <Field label="Phương án đưa Tài xế chính (ốm) đi bệnh viện *">
                    <Inp name="medicalTransport" placeholder="VD: Gọi xe cấp cứu 115 / Taxi y tế đưa vào BV Đa khoa gần nhất" />
                  </Field>
                </div>
              )}

              {f.v.scenario === '2.2_INTERNAL_SUPPORT' && (
                <div style={{ marginTop: 10, padding: 12, background: '#faf5ff', borderRadius: 6, border: '1px solid #e9d5ff' }}>
                  <b style={{ color: '#6b21a8', fontSize: 13, display: 'block', marginBottom: 8 }}>Cử tài xế mới bằng phương tiện công ty</b>
                  <Field label="Tài xế mới thay thế *">
                    <Sel name="mainDriverId" options={mainDriverOpts} />
                  </Field>
                  <Field label="Xe con nội bộ công ty chở tài xế ra *">
                    <Inp name="companyCarPlate" placeholder="Biển số xe con nội bộ (VD: 51H-992.88)" />
                  </Field>
                  <p className="hint" style={{ margin: '4px 0 0' }}>Xe con nội bộ chở tài xế mới ra tiếp quản, sau đó chở tài xế ốm về trạm/bệnh viện.</p>
                </div>
              )}

              {f.v.scenario === '2.3_EXTERNAL_SUPPORT' && (
                <div style={{ marginTop: 10, padding: 12, background: '#fffbeb', borderRadius: 6, border: '1px solid #fde68a' }}>
                  <b style={{ color: '#92400e', fontSize: 13, display: 'block', marginBottom: 8 }}>Cử tài xế mới bằng dịch vụ Taxi / Grab ngoài</b>
                  <Field label="Tài xế mới thay thế *">
                    <Sel name="mainDriverId" options={mainDriverOpts} />
                  </Field>
                  <div className="form-grid">
                    <Field label="Hãng xe / Dịch vụ *"><Inp name="taxiVendor" placeholder="Taxi Mai Linh / Grab / Vinasun" /></Field>
                    <Field label="Cước phí Taxi dự kiến (USD) *"><Inp name="taxiCost" type="number" min="0" /></Field>
                  </div>
                  <p className="hint" style={{ margin: '4px 0 0' }}>Chi phí Taxi được hạch toán trực tiếp vào chi phí sự cố nội bộ.</p>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* NHÓM 3: SỰ CỐ NGHIÊM TRỌNG (VEHICLE_AND_CREW_SWAP)          */}
          {/* ========================================================= */}
          {f.v.k === 'VEHICLE_AND_CREW_SWAP' && (
            <div style={{ marginTop: 14, padding: 14, border: '1px solid #fecaca', borderRadius: 8, background: '#fef2f2' }}>
              <b style={{ fontSize: 14, color: '#991b1b', display: 'block', marginBottom: 10 }}>
                3. Kịch bản tai nạn nghiêm trọng (Nhóm 3: Đổi cả xe lẫn người)
              </b>
              <Field label="Kịch bản thực tế *">
                <Sel name="scenario" options={combinedScenarios} />
              </Field>
              <div className="form-grid" style={{ marginTop: 8 }}>
                <Field label="Xe mới điều động thay thế *"><Sel name="veh" options={vOpts} /></Field>
                <Field label="Tài xế chính mới *"><Sel name="mainDriverId" options={mainDriverOpts} /></Field>
              </div>
              <div className="form-grid" style={{ marginTop: 8 }}>
                <Field label="Phụ lái mới *"><Sel name="coDriverId" options={coDriverOpts} /></Field>
                <Field label="Bác sĩ thú y mới (nếu cần) *"><Sel name="vetId" options={vetOpts} /></Field>
              </div>
              <div className="form-grid" style={{ marginTop: 8 }}>
                <Field label="Đơn vị cấp cứu y tế người *"><Inp name="ambulancePartner" placeholder="Bệnh viện cấp cứu địa phương" /></Field>
                <Field label="SĐT cấp cứu *"><Inp name="ambulancePhone" placeholder="SĐT 115" /></Field>
              </div>
              <Field label="Specialist điều động xử lý pháp lý &amp; cảnh sát"><Sel name="specialistId" options={specialistOpts} /></Field>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <Field label="Nội dung phương án tổng quan *">
              <Txt name="desc" placeholder="Tự động sinh theo kịch bản hoặc nhập thêm chỉ dẫn cụ thể..." />
            </Field>
            <Field label="Lý do thực hiện *">
              <Inp name="reason" placeholder="Lý do thực hiện phương án" />
            </Field>
          </div>

          <div id="f5-route-box" style={{ marginTop: 12 }}>
            <Chk name="legal">Lộ trình mới vẫn trong tuyến pháp lý đã duyệt (giữ quốc gia và cửa khẩu)</Chk>
          </div>

          <div className="form-grid" style={{ marginTop: 12 }}>
            <Field label="Thời gian giao dự kiến *"><DateTimeInput name="eta" /></Field>
            <Field label="Tổng chi phí phát sinh nội bộ (USD) *"><Inp name="cost" type="number" min="0" /></Field>
            <Field label="Bên chịu chi phí"><Sel name="payer" options={[['COMPANY', 'CBN Transport (Nội bộ)'], ['INSURANCE', 'Bảo hiểm'], ['CUSTOMER', 'Khách hàng (thỏa thuận riêng)']]} /></Field>
          </div>
          <p className="hint" style={{ margin: '4px 0 0' }}>Toàn bộ chi phí sự cố do công ty và bảo hiểm hạch toán nội bộ. Khách hàng thanh toán 0 VNĐ.</p>
        </>
      );
    },
    onOk: (v) => {
      const k = v.k;
      const cost = Number(v.cost || 0), eta = String(v.eta || '').replace('T', ' ');

      if (k === 'ROUTE_ADJUST' && !v.legal) return 'Đổi quốc gia/cửa khẩu nằm ngoài Flow 5: dùng “Báo không thể tiếp tục” để Điều phối lập lại kế hoạch.';

      // Kiểm tra xe khi yêu cầu đổi xe
      if ((k === 'VEHICLE_SWAP' || k === 'VEHICLE_AND_CREW_SWAP') && !v.veh) {
        return 'Vui lòng chọn xe điều động / thay thế cho chuyến đi.';
      }

      // Kiểm tra nhân sự
      const newCrew: Record<string, string> = {};
      if (k === 'CREW_SWAP' || k === 'VEHICLE_AND_CREW_SWAP') {
        if (v.scenario === '2.1_QUICK_SWAP') {
          if (!curCD) return 'Chuyến xe không có phụ lái khả dụng để chỉ định lên ghế lái chính.';
          newCrew.MAIN_DRIVER = curCD.id;
        } else {
          if (v.mainDriverId) newCrew.MAIN_DRIVER = v.mainDriverId;
          if (v.coDriverId) newCrew.CO_DRIVER = v.coDriverId;
          if (v.vetId) newCrew.VETERINARIAN = v.vetId;

          if (k === 'CREW_SWAP' && Object.keys(newCrew).length === 0) {
            return 'Vui lòng chọn ít nhất một nhân sự thay thế cho chuyến đi.';
          }
        }

        const selectedIds = Object.values(newCrew);
        if (new Set(selectedIds).size !== selectedIds.length) {
          return 'Một nhân sự không thể đảm nhận đồng thời 2 vị trí trong cùng chuyến.';
        }

        for (const [role, cid] of Object.entries(newCrew)) {
          const err = staffError(emp(cid), t, role);
          if (err) return err;
        }
      }

      if (k === 'HORSE_SPLIT' && !v.splitHorseId) {
        return 'Vui lòng chọn con ngựa cần phân tách sang xe cấp cứu chuyển viện.';
      }

      // Xây dựng danh sách Sub-tasks theo đúng kịch bản
      const subTasks: string[] = [];
      let autoDesc = String(v.desc || '').trim();

      if (k === 'PICKUP_RELOCATE') {
        const place = String(v.meetingPointName || '').trim() || proposedPlace || 'Điểm hẹn đón dắt bộ';
        subTasks.push('Walk_Horse_To_Meeting_Point', 'Confirm_Safe_Loading');
        if (!autoDesc) {
          autoDesc = `Đổi điểm hẹn đón ngoại vi tại ${place}. Dắt bộ ngựa ra ngoài đường lớn (< 500m), không phát sinh chi phí.`;
        }
        if (t) {
          t.pickupAccessStatus = 'RELOCATING';
          t.relocationMeetingPointName = place;
        }
        const cleanTripKey = (t?.id || i.tripId || '').replace(/-/g, '_');
        try {
          localStorage.setItem(`rts_pickup_resolution_${cleanTripKey}`, JSON.stringify({
            resolutionType: 'RELOCATING',
            meetingPointName: place,
            meetingLatitude: i.lat || 10.825,
            meetingLongitude: i.lng || 106.632,
            distanceMeters: t?.relocationDistanceMeters || 320,
            shuttleCostVnd: 0,
            customerApprovalStatus: 'APPROVED',
          }));
          localStorage.setItem(`rts_driver_pickup_status_${cleanTripKey}`, 'RELOCATING');
        } catch {}
      }

      if (k === 'VEHICLE_SWAP') {
        if (v.scenario === '1.2_CRITICAL') {
          subTasks.push('Call_Third_Party_Towing', 'Send_Relief_Vehicle', 'Send_Relief_Driver', 'Clear_Roadway');
          if (!autoDesc) {
            autoDesc = `Kịch bản 1.2 (Cứu hộ khẩn cấp): Điều xe kéo ${v.towingPartner || 'Towing'} dọn xe chặn đường. Điều xe mới ${vehicle(v.veh)?.plate || v.veh} và Relief Driver ${emp(v.reliefDriverId)?.name || 'tài xế'} ra để tổ xe cũ tiếp tục hành trình.`;
          }
        } else {
          subTasks.push('Send_Relief_Vehicle', 'Send_Relief_Driver', 'Transfer_Horses', 'Towing_Assistance');
          if (!autoDesc) {
            autoDesc = `Kịch bản 1.1 (Đổi xe dọc đường): Cử xe mới ${vehicle(v.veh)?.plate || v.veh} + Relief Driver ${emp(v.reliefDriverId)?.name || 'tài xế'} lái đến. Tổ xe cũ nhận xe mới chạy tiếp. Relief Driver ở lại chờ xe kéo.`;
          }
        }
      } else if (k === 'CREW_SWAP') {
        if (v.scenario === '2.1_QUICK_SWAP') {
          subTasks.push('Promote_CoDriver_To_Main', 'Medical_Transport_Driver');
          if (!autoDesc) {
            autoDesc = `Kịch bản 2.1 (Phụ lái lên thay): Phụ lái ${curCD?.name || 'Phụ lái'} lên lái chính chở ngựa đi tiếp. Đưa tài xế cũ đi viện bằng ${v.medicalTransport || 'xe cấp cứu/taxi'}.`;
          }
        } else if (v.scenario === '2.2_INTERNAL_SUPPORT') {
          subTasks.push('Send_Relief_Driver_Company_Car', 'Medical_Transport_Driver');
          if (!autoDesc) {
            autoDesc = `Kịch bản 2.2 (Xe công ty hỗ trợ): Điều xe con công ty (${v.companyCarPlate || 'Company Car'}) chở tài xế mới ${emp(v.mainDriverId)?.name || 'tài xế'} ra và chở tài xế ốm về.`;
          }
        } else {
          subTasks.push('Send_Relief_Driver_Taxi', 'Medical_Transport_Driver');
          if (!autoDesc) {
            autoDesc = `Kịch bản 2.3 (Taxi ngoài hỗ trợ): Tài xế mới ${emp(v.mainDriverId)?.name || 'tài xế'} bắt ${v.taxiVendor || 'Taxi'} ra hiện trường. Ghi nhận chi phí taxi vào chi phí nội bộ.`;
          }
        }
      } else if (k === 'VEHICLE_AND_CREW_SWAP') {
        subTasks.push('Call_Ambulance', 'Send_Relief_Vehicle', 'Send_Relief_Crew', 'Specialist_On_Scene');
        if (!autoDesc) {
          autoDesc = `Kịch bản 3.1 (Tai nạn giao thông - Thay mới toàn bộ): Gọi cấp cứu ${v.ambulancePartner || '115'}, điều xe mới ${vehicle(v.veh)?.plate || v.veh} cùng tổ xe mới và Specialist ${emp(v.specialistId)?.name || ''} ra xử lý hiện trường.`;
        }
      } else if (k === 'HORSE_SPLIT') {
        subTasks.push('Horse_Ambulance_Dispatch', 'Vet_Clinic_Transfer', 'Split_Customs_Manifest', 'Resume_Main_Trip');
        const splitH = horse(v.splitHorseId);
        if (!autoDesc) {
          autoDesc = `Kịch bản 4.1 (Tách đàn vận chuyển): Tách ngựa ${splitH?.name || v.splitHorseId} sang xe chuyên dụng ${v.horseAmbulancePartner || 'Horse Ambulance'} chuyển về ${v.targetVetHospital || 'Bệnh viện thú y'}. Các con ngựa còn lại trên xe tiếp tục hành trình.`;
        }
      } else if (k === 'NO_CHANGE') {
        subTasks.push('Onsite_Troubleshooting', 'Driver_Self_Resolution', 'Safety_Inspection');
        if (!autoDesc) {
          autoDesc = `Khắc phục tại chỗ, giữ nguyên kế hoạch: Giữ nguyên phương tiện và tổ xe hiện tại. Tài xế thực hiện kiểm tra an toàn, khắc phục sự cố tại hiện trường. Sau khi hoàn thành và đảm bảo an toàn, bấm nút “Sự cố đã được xử lý” để tiếp tục hành trình.`;
        }
      } else if (k === 'ROUTE_ADJUST') {
        subTasks.push('Adjust_Route_Path', 'Notify_Border_Authority', 'Update_Arrival_Time');
        if (!autoDesc) {
          autoDesc = `Điều chỉnh lộ trình trong tuyến pháp lý đã duyệt: Tránh đoạn đường bị ảnh hưởng, giữ nguyên quốc gia và cửa khẩu đã cấp phép. ETA mới dự kiến: ${eta}.`;
        }
      }

      if (autoDesc.length < 10) return 'Mô tả phương án ít nhất 10 ký tự.';
      if (String(v.reason).trim().length < 3) return 'Nhập lý do thực hiện phương án.';
      if (!eta) return 'Chọn thời gian giao dự kiến.';
      if (!(cost >= 0)) return 'Chi phí không hợp lệ.';

      const base = curPlan(i), draft = base && base.status === 'DRAFT';
      const primaryRole = Object.keys(newCrew)[0] || '';
      const primaryCid = Object.values(newCrew)[0] || '';

      const np: Any = {
        v: draft ? base.v : (base ? base.v + 1 : 1),
        id: draft ? base.id : nextId('PL'),
        kind: k,
        scenario: v.scenario || '',
        scenarioTitle: F5_SCENARIOS[v.scenario]?.title || '',
        subTasks,
        desc: autoDesc,
        reason: String(v.reason).trim(),
        meetingPointName: v.meetingPointName || '',
        vehicleId: v.veh || '',
        reliefDriverId: v.reliefDriverId || '',
        towingPartner: v.towingPartner || '',
        towingPhone: v.towingPhone || '',
        towingCost: Number(v.towingCost || 0),
        crewSwapMode: v.scenario || '',
        companyCarPlate: v.companyCarPlate || '',
        taxiVendor: v.taxiVendor || '',
        taxiCost: Number(v.taxiCost || 0),
        medicalTransport: v.medicalTransport || '',
        ambulancePartner: v.ambulancePartner || '',
        ambulancePhone: v.ambulancePhone || '',
        specialistId: v.specialistId || '',
        splitHorseId: v.splitHorseId || '',
        horseAmbulancePartner: v.horseAmbulancePartner || '',
        targetVetHospital: v.targetVetHospital || '',
        vetEscortName: v.vetEscortName || '',
        crewRole: primaryRole,
        crewId: primaryCid,
        newCrew,
        legalRoute: true,
        etaBase: t.eta,
        etaTo: eta === t.eta ? '' : eta,
        cost,
        payer: v.payer || 'COMPANY',
        by: me().name,
        at: nowStamp(),
        status: 'DRAFT',
        approvals: []
      };

      // Điều phối duyệt cuối trực tiếp, không cần gửi Manager
      np.needsApproval = false;

      if (draft) i.plans[i.plans.length - 1] = np; else i.plans.push(np);
      f5Log(i, `${draft ? 'Cập nhật nháp' : 'Lưu'} phương án v${np.v}: ${F5_PLAN[k] || k}`);
      f5Status(i);
      commit();
      toast(`Đã lưu phương án v${np.v}. Bấm “Duyệt & Áp dụng phương án” để kích hoạt.`);
    },
  });
}

export function f5Submit(id: string) {
  const i = find(id), t = trip(i.tripId), p = curPlan(i); if (!p || p.status !== 'DRAFT') return;
  if (p.newCrew) {
    for (const [r, cid] of Object.entries(p.newCrew)) {
      const err = staffError(emp(cid as string), t, r);
      if (err) return toast(err);
    }
  } else if (p.crewId) {
    const e = staffError(emp(p.crewId), t, p.crewRole);
    if (e) return toast(e);
  }
  p.status = 'APPROVED';
  p.approvedAt = nowStamp();
  p.approvedBy = me().name;
  p.approvals = p.approvals || [];
  p.approvals.push({ at: nowStamp(), by: me().name, decision: 'APPROVED', reason: 'Điều phối viên trực tiếp phê duyệt và áp dụng' });
  f5Log(i, `Điều phối viên phê duyệt và áp dụng phương án v${p.v}: ${F5_PLAN[p.kind] || p.kind}`);
  f5Apply(i, p);

  // Lưu phương án đã duyệt vào sự cố để tài xế xem được ngay
  const planSummary = p.desc || p.reason || F5_PLAN[p.kind] || 'Đã duyệt phương án xử lý sự cố';
  const vehInfo = p.vehicleId && vehicle(p.vehicleId) ? `${vehicle(p.vehicleId).plate} (${vehicle(p.vehicleId).model})` : p.vehicleId;
  const crewInfo = p.newCrew && Object.keys(p.newCrew).length
    ? Object.entries(p.newCrew).map(([r, cid]) => `${human(r)}: ${emp(cid as string)?.name || cid}`).join('; ')
    : (p.crewId ? `${human(p.crewRole)}: ${emp(p.crewId)?.name || p.crewId}` : '');
  const resolutionDetails = [
    p.desc ? `Chỉ dẫn hiện trường: ${p.desc}` : '',
    p.reason ? `Lý do: ${p.reason}` : '',
    vehInfo ? `Phương tiện điều động: ${vehInfo}` : '',
    crewInfo ? `Nhân sự cứu viện: ${crewInfo}` : '',
    p.etaTo ? `ETA mới: ${p.etaTo}` : '',
  ].filter(Boolean).join(' | ');

  i.approvedPlan = planSummary;
  i.resolutionType = p.kind;
  i.resolutionNotes = resolutionDetails || planSummary;
  f5Status(i);
  commit();

  const cid = cleanId(i.id);
  try {
    localStorage.setItem(`rts_incident_plan_${cid}`, planSummary);
    localStorage.setItem(`rts_incident_plan_${i.id}`, planSummary);
    localStorage.setItem(`rts_incident_status_${cid}`, 'EXECUTING');
    localStorage.setItem(`rts_incident_status_${i.id}`, 'EXECUTING');
    localStorage.removeItem(`rts_driver_ack_${cid}`);
    localStorage.removeItem(`rts_driver_ack_${i.id}`);
    localStorage.removeItem(`rts_ack_${cid}`);
    localStorage.removeItem(`rts_ack_${i.id}`);
  } catch {
    // ignore
  }

  syncIncidentToLocal(i.id, {
    status: 'EXECUTING',
    approvedPlan: planSummary,
    resolutionType: p.kind,
    resolutionNotes: resolutionDetails || planSummary,
    isCoordAccepted: true,
  });

  // Đồng bộ lên backend API và tạo Notification cho tài xế
  void (async () => {
    try {
      await apiClient.post(`/incidents/${cleanId(i.id)}/recovery/apply`, {
        planSummary,
        resolutionType: p.kind,
        resolutionNotes: resolutionDetails || planSummary,
      });
    } catch (e) {
      console.warn('[f5Submit] Failed to sync recovery apply to backend:', e);
    }
  })();

  // Phát event thời gian thực cho các tab (Driver / Manager / Specialist)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rts_incident_pins_changed', { detail: { id: i.id, approvedPlan: planSummary, status: i.status } }));
    window.dispatchEvent(new CustomEvent('rts_incident_created', { detail: { id: i.id, approvedPlan: planSummary, status: i.status } }));
  }

  toast('Đã phê duyệt và áp dụng phương án. Phương án đã được gửi tới tài xế!');
}

export function f5Res(id: string) {
  const i = find(id), t = trip(i.tripId), p = curPlan(i), v = vehicle(p.vehicleId || t.vehicleId);
  if (p.newCrew) {
    for (const [r, cid] of Object.entries(p.newCrew)) {
      const e = staffError(emp(cid as string), t, r);
      if (e) return toast(e);
    }
  } else if (p.crewId) {
    const e = staffError(emp(p.crewId), t, p.crewRole);
    if (e) return toast(e);
  }
  openModal({
    title: `Xác nhận nguồn lực cho phương án v${p.v}`, ok: 'Xác nhận', init: { ok: false },
    body: () => (<>
      <div className="kv2">
        <div><div className="label">Xe</div><div className="value sm">{v ? `${v.plate} • ${v.stalls} ô • ${human(v.status)}` : '—'}</div></div>
        <div><div className="label">Nhân sự</div><div className="value sm">{crewOf(t).length ? crewOf(t).map(([k, e], n) => <span key={k}>{n ? <br /> : null}{human(k)}: {emp(e)?.name}</span>) : '—'}</div></div>
      </div>
      <Chk name="ok">Xe và nhân sự đã bố trí đáp ứng phương án</Chk>
    </>),
    onOk: (vals) => {
      if (!vals.ok) return 'Tick xác nhận.';
      if (v && v.stalls < tripHorses(t).length) return 'Xe không đủ ô cho số ngựa.';
      i.resOk = { at: nowStamp(), by: me().name, sig: resSig(p) }; f5Log(i, `Xác nhận xe & nhân sự đáp ứng phương án v${p.v}`); toast('Đã xác nhận nguồn lực.');
    },
  });
}

export function f5Continue(id: string) {
  const i = find(id), t = trip(i.tripId), miss = f5Conditions(i).filter((c) => !c.ok);
  if (miss.length) return toast('Chưa đủ điều kiện: ' + miss.map((c) => c.label).join('; '));
  openModal({
    title: `Cho phép tiếp tục ${legOf(t, i.leg)}`, ok: 'Cho phép tiếp tục',
    body: () => <p>Chặng được mở lại cho tổ xe ghi mốc tiếp theo. Hành động này <b>không đóng sự cố</b> và <b>không hoàn tất chuyến</b>.</p>,
    onOk: () => {
      i.continueAt = nowStamp();
      i.continueBy = me().name;
      f5Log(i, 'Cho phép tiếp tục chặng');
      f5Status(i);
      commit();

      const cid = cleanId(id);
      try {
        localStorage.setItem(`rts_incident_continue_${cid}`, nowStamp());
        localStorage.setItem(`rts_incident_continue_${id}`, nowStamp());
        localStorage.setItem(`rts_incident_status_${cid}`, 'CONTINUE_ALLOWED');
        localStorage.setItem(`rts_incident_status_${id}`, 'CONTINUE_ALLOWED');
      } catch {
        // ignore
      }

      syncIncidentToLocal(id, {
        status: 'CONTINUE_ALLOWED',
        continueAt: nowStamp(),
        isCoordAccepted: true,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rts_incident_created', { detail: { id, status: 'CONTINUE_ALLOWED' } }));
        window.dispatchEvent(new CustomEvent('rts_incident_pins_changed', { detail: { id, status: 'CONTINUE_ALLOWED' } }));
      }

      crewOf(t).forEach(([, e]) => notify(e, `${t.id}: được phép tiếp tục chặng`, `Sau khi thực hiện xong, báo kết quả cho ${i.id}.`, `d/incident/${i.id}`));
      toast(legHolds(t).length ? `Chặng chạy lại khi ${legHolds(t).map((x: Any) => x.id).join(', ')} cũng được cho tiếp tục.` : 'Đã cho phép tiếp tục chặng. Sự cố vẫn mở tới khi có kết quả.');

      // Đồng bộ trạng thái CONTINUE_ALLOWED xuống Backend API để không bị lặp lại trạng thái cũ
      void (async () => {
        try {
          await apiClient.post(`/incidents/${cleanId(i.id)}/continue`, {
            notes: 'Điều phối viên đã xác nhận cho phép tiếp tục chặng sau khi kiểm tra hiện trường.',
          });
        } catch (e) {
          console.warn('[f5Continue] Failed to sync continue to backend:', e);
        }
      })();
    },
  });
}

export function f5Close(id: string) {
  const i = find(id);
  const isHorseHealth = i.type === 'HORSE_HEALTH' || i.reporterRole === 'VETERINARIAN';
  const targetRoleLabel = isHorseHealth ? 'Bác sĩ thú y' : 'Tài xế';
  if (!i.result) {
    i.result = {
      by: targetRoleLabel,
      at: i.continueAt || nowStamp(),
      text: isHorseHealth ? 'Sự cố đã được xử lý, thể trạng ngựa đã ổn định.' : 'Sự cố đã được xử lý, xe tiếp tục hành trình an toàn.',
    };
  }
  openModal({
    title: `Đóng sự cố ${i.id}`, ok: 'Đóng sự cố', init: { ok: false, note: '' },
    body: () => (<>
      <Note tone="grey" title={`Kết quả từ ${i.result.by} (${dt(i.result.at)})`}>{i.result.text}</Note>
      <Chk name="ok">Đã kiểm tra kết quả, tình hình ổn định</Chk>
      <Field label="Ghi chú đóng *"><Txt name="note" placeholder="Kết quả kiểm tra" /></Field>
    </>),
    onOk: (v) => {
      if (!v.ok) return 'Tick xác nhận đã kiểm tra.'; if (String(v.note).trim().length < 5) return 'Nhập ghi chú.';
      i.status = 'CLOSED'; i.closedAt = nowStamp(); i.closedBy = me().name; i.closeNote = String(v.note).trim(); f5Log(i, 'Đóng sự cố: ' + i.closeNote);
      notify('LOGISTICS_MANAGER', `${i.id} đã đóng`, i.closeNote, `m/incident/${i.id}`); toast('Đã đóng sự cố. Chuyến vẫn tiếp tục theo các mốc.');

      void (async () => {
        try {
          await apiClient.post(`/incidents/${cleanId(i.id)}/resolve`, {
            resolutionSummary: i.closeNote,
            requiresCustomerFollowUp: false,
          });
        } catch (e) {
          console.warn('[f5Close] Failed to sync close to backend:', e);
        }
      })();
    },
  });
}

export function f5Escalate(id: string) {
  const i = find(id);
  openModal({
    title: 'Từ chối hỗ trợ tại chỗ – Chuyển Quản lý quyết định',
    ok: 'Chuyển Quản lý',
    danger: true,
    init: { es: '' },
    body: () => (
      <Field label="Lý do từ chối hỗ trợ / không thể xử lý tại chỗ *">
        <Txt name="es" placeholder="Vì sao không thể xử lý trong kế hoạch hiện tại (VD: ngựa nguy kịch cần bệnh viện lớn, xe hư hỏng toàn bộ, vượt ngân sách…)" />
      </Field>
    ),
    onOk: (v) => {
      const reason = String(v.es).trim();
      if (reason.length < 5) return 'Nhập lý do từ chối hỗ trợ (ít nhất 5 ký tự).';

      i.escalation = { at: nowStamp(), by: me().name, reason, decision: null };
      i.status = 'ESCALATED';
      f5Log(i, 'Từ chối hỗ trợ tại chỗ – Chuyển Quản lý: ' + reason);
      f5Status(i);
      commit();

      // Đồng bộ lên backend API để Quản lý nhận được request và thông báo
      void (async () => {
        try {
          await apiClient.post(`/incidents/${cleanId(i.id)}/escalate`, { reason });
        } catch (err) {
          console.warn('[f5Escalate] Failed to sync escalate to backend:', err);
        }
      })();

      notify('LOGISTICS_MANAGER', `${i.id}: Điều phối từ chối hỗ trợ – chuyển Quản lý`, reason, `m/incident/${i.id}`);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rts_incident_pins_changed', { detail: { id: i.id, status: 'ESCALATED', reason } }));
        window.dispatchEvent(new CustomEvent('rts_incident_created', { detail: { id: i.id, status: 'ESCALATED', reason } }));
      }

      toast('Đã từ chối hỗ trợ tại chỗ và chuyển sự cố lên Quản lý giải quyết.');
    },
  });
}

/** Điều phối ghi nhận sự cố thay tổ xe (tổ xe báo qua điện thoại / mất sóng) */
export function f5OnBehalf() {
  const list = db.trips.filter((t: Any) => ['IN_TRANSIT', 'READY_TO_DEPART'].includes(t.status));
  if (!list.length) return toast('Không có chuyến đang chạy.');
  openModal({
    title: 'Ghi nhận sự cố thay tổ xe (báo qua điện thoại / mất sóng)', ok: 'Ghi nhận', danger: true,
    init: { trip: list[0].id, type: '', sev: '', desc: '', safe: '', block: true, safeOk: false },
    body: () => (<>
      <Field label="Chuyến *"><Sel name="trip" options={list.map((t: Any) => [t.id, tripLabel(t)] as [string, string])} /></Field>
      <div className="form-grid">
        <Field label="Loại *"><Sel name="type" options={[['', 'Chọn'], ...Object.entries(F5_TYPES)]} /></Field>
        <Field label="Mức độ *"><Sel name="sev" options={[['', 'Chọn'], ...['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((x) => [x, human(x)] as [string, string])]} /></Field>
      </div>
      <Field label="Mô tả *"><Txt name="desc" /></Field>
      <Field label="Biện pháp tổ xe đã thực hiện *"><Inp name="safe" /></Field>
      <Chk name="block">Ảnh hưởng tiếp tục chặng</Chk>
      <Chk name="safeOk">Tổ xe xác nhận người và ngựa an toàn / đã được chăm sóc</Chk>
    </>),
    onOk: (v) => {
      const t = trip(v.trip);
      if (!v.type || !v.sev) return 'Chọn loại và mức độ.'; if (String(v.desc).trim().length < 10) return 'Mô tả ít nhất 10 ký tự.';
      if (!String(v.safe).trim() || !v.safeOk) return 'Ghi biện pháp và xác nhận an toàn.';
      const m = lastMilestone(t);
      const i: Any = { id: nextId('INC'), f5: true, tripId: t.id, leg: m ? m.stop : 0, type: v.type, severity: v.sev, status: 'REPORTED', at: nowStamp(), by: me().name, reporterRole: 'FLEET_COORDINATOR', location: dWhere(t),
        description: String(v.desc).trim(), safety: String(v.safe).trim(), horseIds: [], photos: [], blocking: !!v.block, updates: [], plans: [], log: [] };
      f5Log(i, 'Ghi nhận thay tổ xe: ' + F5_TYPES[i.type]); i.ackAt = nowStamp(); i.owner = me().name; f5Log(i, 'Tiếp nhận sự cố'); db.incidents.unshift(i); f5Status(i);
      audit('Reported incident on behalf of crew', i.id, F5_TYPES[i.type]);
      setTimeout(() => go(`f/incident/${i.id}`), 0);
    },
  });
}

/** xem khiếu nại (chỉ đọc – Manager trả lời và giải quyết) */
export function cmpView(id: string) {
  const c = db.complaints.find((x: Any) => x.id === id); if (!c) return;
  openModal({
    title: `${c.id} • ${c.title}`, ok: 'Đóng',
    body: () => (<>
      <p className="subtitle" style={{ marginTop: 0 }}>{c.requestId} • {horse(c.horseId)?.name || ''} • {CMP_VI[c.status] || human(c.status)}</p>
      <div className="thread">{(c.messages || []).map((m: Any, k: number) => (
        <div key={k} className={`msg ${m.from === 'CUSTOMER' ? '' : 'me'}`}><b>{m.name}</b><small>{dt(m.at)}</small><p>{m.text}</p>
          {(m.files || []).length ? <div className="photo-strip">{m.files.map((f: string) => <button type="button" key={f} className="ph">{f}</button>)}</div> : null}
        </div>))}
      </div>
    </>),
  });
}

export function f5ApproveVetTransfer(id: string) {
  const i = find(id), t = trip(i?.tripId);
  if (!i) return;

  // Lấy thông tin trạm y tế đề xuất
  let stationName = i.targetVetStation || 'Cơ sở thú y cấp cứu';
  let address = '';
  let phone = '';
  let reason = '';

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`rts_vet_referral_${cleanId(i.id)}`) || localStorage.getItem(`rts_vet_referral_${i.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.station) stationName = parsed.station;
        if (parsed.address) address = parsed.address;
        if (parsed.phone) phone = parsed.phone;
        if (parsed.reason) reason = parsed.reason;
      }
    } catch {
      // ignore
    }
  }

  const planDesc = `Chuyển ngựa cấp cứu khẩn cấp đến: ${stationName}${address ? ` (${address})` : ''}${phone ? ` • SĐT: ${phone}` : ''}.${reason ? ` Lý do: ${reason}` : ''}`;

  i.status = 'EXECUTING';
  i.approvedPlan = planDesc;
  i.resolutionType = 'VET_TRANSFER';
  i.resolutionNotes = planDesc;
  i.plans = i.plans || [];
  i.plans.push({
    v: (i.plans.length || 0) + 1,
    kind: 'VET_TRANSFER',
    status: 'APPROVED',
    desc: planDesc,
    reason: reason || 'Chuyển viện khẩn cấp theo yêu cầu của Bác sĩ thú y',
    approvedAt: nowStamp(),
    approvals: [{ at: nowStamp(), by: me().name, decision: 'APPROVED', reason: 'Điều phối viên duyệt chuyển trạm y tế' }],
  });

  f5Log(i, `Điều phối viên phê duyệt chuyển viện khẩn cấp đến: ${stationName}`);
  f5Status(i);
  commit();

  const cid = cleanId(id);
  try {
    localStorage.setItem(`rts_vet_transfer_approved_${cid}`, JSON.stringify({ at: nowStamp(), station: stationName }));
    localStorage.setItem(`rts_vet_transfer_approved_${id}`, JSON.stringify({ at: nowStamp(), station: stationName }));
    localStorage.setItem(`rts_incident_status_${cid}`, 'EXECUTING');
    localStorage.setItem(`rts_incident_status_${id}`, 'EXECUTING');
    localStorage.setItem(`rts_incident_plan_${cid}`, planDesc);
    localStorage.setItem(`rts_incident_plan_${id}`, planDesc);
  } catch {
    // ignore
  }

  syncIncidentToLocal(id, {
    status: 'EXECUTING',
    approvedPlan: planDesc,
    resolutionType: 'VET_TRANSFER',
    resolutionNotes: planDesc,
    targetVetStation: stationName,
    isTransferApproved: true,
    vetStatus: 'TRANSFER_APPROVED',
    isCoordAccepted: true,
  });

  void (async () => {
    try {
      await apiClient.post(`/incidents/${cleanId(i.id)}/recovery/apply`, {
        planSummary: planDesc,
        resolutionType: 'VET_TRANSFER',
        resolutionNotes: planDesc,
      });
    } catch (e) {
      console.warn('[f5ApproveVetTransfer] Failed to sync to backend:', e);
    }
  })();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rts_incident_pins_changed', { detail: { id: i.id, approvedPlan: planDesc, status: i.status } }));
    window.dispatchEvent(new CustomEvent('rts_incident_created', { detail: { id: i.id, approvedPlan: planDesc, status: i.status } }));
  }

  if (t) {
    crewOf(t).forEach(([, e]) => notify(e, `${t.id}: Điều phối đã duyệt chuyển viện`, `Đưa ngựa đến ${stationName} để cấp cứu khẩn cấp.`, `d/incident/${i.id}`));
  }
  toast(`Đã phê duyệt chuyển viện đến ${stationName}. Lộ trình khẩn cấp đã được kích hoạt!`);
}

export const incidentsChanged = () => commit();
