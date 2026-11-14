// ============================================================================
// FLOW 5 – Xử lý sự cố trong chuyến (vai trò Điều phối)
// Báo sự cố → Điều phối tiếp nhận & lập phương án → Manager duyệt (nếu thuộc diện) → thực hiện & xác nhận
// → Điều phối cho phép tiếp tục chặng → Driver/Escort báo kết quả → Điều phối kiểm tra & đóng sự cố.
// ============================================================================
import { Chk, Field, Inp, Note, Sel, Txt } from '../components/common/ui';
import { DateTimeInput } from '../components/forms/DateTime';
import { changeEta, crewConflict, crewOf, dWhere, emp, horse, isDriver, isStaffAssignedToTrip, isVet, lastMilestone, legHolds, legOf, livePos, reqOfTrip, staffError, selectableStaff, trip, tripHalted, tripHorses, tripLabel, tripStops, vehicle, vehicleConflict } from '../domain/coordinatorRules';
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
  VEHICLE_SWAP: 'Thay xe',
  CREW_SWAP: 'Thay nhân sự',
  VEHICLE_AND_CREW_SWAP: 'Thay cả xe và nhân sự',
  ROUTE_ADJUST: 'Điều chỉnh lộ trình trong tuyến pháp lý đã duyệt',
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
  if (p.newCrew && typeof p.newCrew === 'object') {
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
    ['', '— Chọn tài xế thay thế —'],
    ...selectableStaff().filter((e: Any) => isDriver(e) && !isStaffAssignedToTrip(e, t) && !crewConflict(e, t))
      .map((e: Any) => [e.id, `${e.name} • ${human(e.position)}`] as [string, string]),
  ];

  const coDriverOpts: Array<[string, string]> = [
    ['', '— Chọn người thay thế —'],
    ...selectableStaff().filter((e: Any) => (isDriver(e) || (e.role === 'ESCORT' && e.position === 'ESCORT')) && !isStaffAssignedToTrip(e, t) && !crewConflict(e, t))
      .map((e: Any) => [e.id, `${e.name} • ${human(e.position)}`] as [string, string]),
  ];

  const vetOpts: Array<[string, string]> = [
    ['', '— Chọn người thay thế —'],
    ...selectableStaff().filter((e: Any) => (isVet(e) || e.position === 'VETERINARIAN') && !isStaffAssignedToTrip(e, t) && !crewConflict(e, t) && (!e.certExpiry || e.certExpiry >= t.eta.slice(0, 10)))
      .map((e: Any) => [e.id, `${e.name} • Thú y (Hạn chứng chỉ: ${e.certExpiry || '—'})`] as [string, string]),
  ];

  const guess = p.kind && F5_PLAN[p.kind] ? p.kind : (/BREAKDOWN|ACCIDENT/.test(i.type) ? 'VEHICLE_SWAP' : /ROAD|BORDER|WEATHER/.test(i.type) ? 'ROUTE_ADJUST' : i.type === 'HORSE_HEALTH' ? 'CREW_SWAP' : 'NO_CHANGE');
  const vets = i.type === 'HORSE_HEALTH' ? nearestVets(t) : [];

  openModal({
    title: `${curPlan(i) && curPlan(i).status !== 'DRAFT' ? 'Sửa phương án → tạo phiên bản mới' : 'Phương án xử lý'} • ${i.id}`,
    ok: 'Lưu phương án',
    wide: true,
    init: {
      k: guess,
      desc: p.desc || '',
      reason: p.reason || '',
      veh: p.vehicleId || '',
      changeMainDriver: !!(p.newCrew?.MAIN_DRIVER || (p.crewRole === 'MAIN_DRIVER' && p.crewId)),
      mainDriverId: p.newCrew?.MAIN_DRIVER || (p.crewRole === 'MAIN_DRIVER' ? p.crewId : '') || '',
      changeCoDriver: !!(p.newCrew?.CO_DRIVER || (p.crewRole === 'CO_DRIVER' && p.crewId)),
      coDriverId: p.newCrew?.CO_DRIVER || (p.crewRole === 'CO_DRIVER' ? p.crewId : '') || '',
      changeVet: !!(p.newCrew?.VETERINARIAN || (p.crewRole === 'VETERINARIAN' && p.crewId)),
      vetId: p.newCrew?.VETERINARIAN || (p.crewRole === 'VETERINARIAN' ? p.crewId : '') || '',
      legal: p.legalRoute !== false,
      eta: p.etaTo || t.eta,
      cost: String(p.cost || 0),
      payer: p.payer || 'COMPANY',
    },
    body: (f) => {
      return (
        <>
          <p className="subtitle" style={{ marginTop: 0 }}>{legOf(t, i.leg)} • ETA đã xác nhận {dt(t.eta)}</p>
          <Field label="Hướng xử lý *">
            <Sel name="k" options={Object.entries(F5_PLAN)} />
          </Field>
          {vets.length ? (
            <Note tone="grey" icon="info" title="Cơ sở thú y gần vị trí hiện tại">
              {vets.map((v: Any, idx: number) => (
                <span key={v.id}>{idx ? <br /> : null}{v.name} (~{v.est} km, {v.phone}, {v.hours})</span>
              ))}
            </Note>
          ) : null}
          <Field label="Nội dung phương án *">
            <Txt name="desc" placeholder="Việc cần làm, ai làm, khi nào" />
          </Field>
          <Field label="Lý do *">
            <Inp name="reason" placeholder="Lý do thực hiện phương án" />
          </Field>

          {/* KHỐI 1: XE - Chỉ hiển thị khi chọn Thay xe hoặc Thay cả xe và nhân sự */}
          {(f.v.k === 'VEHICLE_SWAP' || f.v.k === 'VEHICLE_AND_CREW_SWAP') && (
            <div style={{ marginTop: 14, padding: 12, border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 8, background: 'var(--bg-surface, #fff)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <b style={{ fontSize: 14, color: 'var(--text-primary, #111827)' }}>
                  1. Phương tiện vận chuyển (Xe điều động / thay thế)
                </b>
                <span className="muted" style={{ fontSize: 12 }}>Đã khóa xe đang trong chuyến / bận</span>
              </div>
              <Field label="Xe điều động / thay thế *" hint="Chọn xe sẵn sàng để điều đến hiện trường thay thế xe gặp sự cố">
                <Sel name="veh" options={vOpts} />
              </Field>
            </div>
          )}

          {/* KHỐI 2: NHÂN SỰ TÁCH 3 VAI TRÒ - Chỉ hiển thị khi chọn Thay nhân sự hoặc Thay cả xe và nhân sự */}
          {(f.v.k === 'CREW_SWAP' || f.v.k === 'VEHICLE_AND_CREW_SWAP') && (
            <div style={{ marginTop: 14, padding: 12, border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 8, background: 'var(--bg-surface, #fff)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <b style={{ fontSize: 14, color: 'var(--text-primary, #111827)' }}>
                  2. Nhân sự tổ xe (3 vị trí riêng biệt)
                </b>
                <span className="muted" style={{ fontSize: 12 }}>Tích chọn từng vị trí để mở khóa phân công thay thế</span>
              </div>

              {/* Vị trí 1: Tài xế chính */}
              <div style={{ marginBottom: 12, padding: 10, background: 'var(--bg-page, #f9fafb)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div>
                    <b>Tài xế chính:</b> <span className="muted">{curMD ? curMD.name : 'Chưa phân công'}</span>
                  </div>
                  <Chk name="changeMainDriver">Thay tài xế chính / Cử tài xế lái xe cứu viện</Chk>
                </div>
                {f.v.changeMainDriver && (
                  <Field label="Chọn tài xế chính mới *" hint="Chỉ hiển thị tài xế sẵn sàng và không có lịch chuyến nào đang chạy">
                    <Sel name="mainDriverId" options={mainDriverOpts} />
                  </Field>
                )}
              </div>

              {/* Vị trí 2: Phụ lái / Áp tải */}
              <div style={{ marginBottom: 12, padding: 10, background: 'var(--bg-page, #f9fafb)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div>
                    <b>Phụ lái / Áp tải:</b> <span className="muted">{curCD ? curCD.name : 'Chưa phân công'}</span>
                  </div>
                  <Chk name="changeCoDriver">Thay phụ lái / Áp tải đi kèm</Chk>
                </div>
                {f.v.changeCoDriver && (
                  <Field label="Chọn phụ lái / áp tải mới *" hint="Chỉ hiển thị nhân sự sẵn sàng và không có lịch chuyến nào đang chạy">
                    <Sel name="coDriverId" options={coDriverOpts} />
                  </Field>
                )}
              </div>

              {/* Vị trí 3: Áp tải chăm sóc ngựa */}
              <div style={{ padding: 10, background: 'var(--bg-page, #f9fafb)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div>
                    <b>Áp tải chăm sóc ngựa / Thú y:</b> <span className="muted">{curVet ? curVet.name : 'Chưa phân công'}</span>
                  </div>
                  <Chk name="changeVet">Cử bác sĩ thú y / áp tải mới hỗ trợ</Chk>
                </div>
                {f.v.changeVet && (
                  <Field label="Chọn người chăm sóc ngựa / bác sĩ thú y mới *" hint="Chỉ hiển thị bác sĩ thú y có chứng chỉ hợp lệ và đang sẵn sàng">
                    <Sel name="vetId" options={vetOpts} />
                  </Field>
                )}
              </div>
            </div>
          )}

          <div id="f5-route-box" style={{ marginTop: 12 }}>
            <Chk name="legal">Lộ trình mới vẫn trong tuyến pháp lý đã duyệt (giữ quốc gia và cửa khẩu)</Chk>
          </div>

          <div className="form-grid" style={{ marginTop: 12 }}>
            <Field label="Thời gian giao dự kiến *"><DateTimeInput name="eta" /></Field>
            <Field label="Chi phí phát sinh (USD) *"><Inp name="cost" type="number" min="0" /></Field>
            <Field label="Bên chịu chi phí"><Sel name="payer" options={[['COMPANY', 'CBN Transport'], ['CUSTOMER', 'Khách hàng (thỏa thuận riêng)'], ['INSURANCE', 'Bảo hiểm (dự kiến)']]} /></Field>
          </div>
        </>
      );
    },
    onOk: (v) => {
      const k = v.k;
      const cost = Number(v.cost || 0), eta = String(v.eta || '').replace('T', ' ');

      if (String(v.desc).trim().length < 10) return 'Mô tả phương án ít nhất 10 ký tự.';
      if (String(v.reason).trim().length < 3) return 'Nhập lý do.';
      if (k === 'ROUTE_ADJUST' && !v.legal) return 'Đổi quốc gia/cửa khẩu nằm ngoài Flow 5: dùng “Báo không thể tiếp tục” để Điều phối lập lại kế hoạch.';

      // Kiểm tra chọn xe khi phương án yêu cầu đổi xe
      if ((k === 'VEHICLE_SWAP' || k === 'VEHICLE_AND_CREW_SWAP') && !v.veh) {
        return 'Vui lòng chọn xe điều động / thay thế cho chuyến đi.';
      }

      // Kiểm tra nhân sự
      const newCrew: Record<string, string> = {};
      if (k === 'CREW_SWAP' || k === 'VEHICLE_AND_CREW_SWAP') {
        if (v.changeMainDriver) {
          if (!v.mainDriverId) return 'Vui lòng chọn tài xế chính mới.';
          newCrew.MAIN_DRIVER = v.mainDriverId;
        }
        if (v.changeCoDriver) {
          if (!v.coDriverId) return 'Vui lòng chọn phụ lái / escort mới.';
          newCrew.CO_DRIVER = v.coDriverId;
        }
        if (v.changeVet) {
          if (!v.vetId) return 'Vui lòng chọn áp tải chăm sóc ngựa mới.';
          newCrew.VETERINARIAN = v.vetId;
        }

        if (k === 'CREW_SWAP' && Object.keys(newCrew).length === 0) {
          return 'Bạn đã chọn hướng xử lý “Thay nhân sự”, vui lòng tích chọn và phân công ít nhất một vị trí nhân sự thay thế.';
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

      if (!eta) return 'Chọn thời gian giao dự kiến.';
      if (!(cost >= 0)) return 'Chi phí không hợp lệ.';

      const base = curPlan(i), draft = base && base.status === 'DRAFT';
      const primaryRole = Object.keys(newCrew)[0] || '';
      const primaryCid = Object.values(newCrew)[0] || '';

      const np: Any = {
        v: draft ? base.v : (base ? base.v + 1 : 1),
        id: draft ? base.id : nextId('PL'),
        kind: k,
        desc: String(v.desc).trim(),
        reason: String(v.reason).trim(),
        vehicleId: v.veh || '',
        crewRole: primaryRole,
        crewId: primaryCid,
        newCrew,
        legalRoute: true,
        etaBase: t.eta,
        etaTo: eta === t.eta ? '' : eta,
        cost,
        payer: v.payer,
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
      try {
        // Để Tài xế / Quản lý / Khách thấy ngay (cùng trình duyệt)
        localStorage.setItem(`rts_incident_status_${cleanId(i.id)}`, 'CLOSED');
        localStorage.setItem(`rts_incident_status_${i.id}`, 'CLOSED');
        window.dispatchEvent(new Event('rts_incident_pins_changed'));
      } catch { /* bỏ qua */ }
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
