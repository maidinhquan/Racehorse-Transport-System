// ============================================================================
// FLOW 5 – Xử lý sự cố trong chuyến (vai trò Điều phối)
// Báo sự cố → Điều phối tiếp nhận & lập phương án → Manager duyệt (nếu thuộc diện) → thực hiện & xác nhận
// → Điều phối cho phép tiếp tục chặng → Driver/Escort báo kết quả → Điều phối kiểm tra & đóng sự cố.
// ============================================================================
import { Chk, Field, Inp, Note, Sel, Txt } from '../components/common/ui';
import { DateTimeInput } from '../components/forms/DateTime';
import { changeEta, crewConflict, crewOf, dWhere, emp, horse, lastMilestone, legHolds, legOf, livePos, reqOfTrip, staffError, trip, tripHalted, tripHorses, tripLabel, tripPersonnelIds, tripStops, vehicle, vehicleConflict } from '../domain/coordinatorRules';
import type { Any } from '../store/coordinatorStore';
import { audit, commit, db, go, me, nextId, notify, nowStamp, openModal, toast } from '../store/coordinatorStore';
import { addHours, dt, human, incTypeVi, usd } from '../utils/format';

export const F5_TYPES: Record<string, string> = {
  VEHICLE_BREAKDOWN: 'Hỏng xe', TRAFFIC_ACCIDENT: 'Va chạm / tai nạn', ROAD_CLOSURE: 'Kẹt / cấm đường', BORDER_DELAY: 'Ách tắc tại cửa khẩu', BAD_WEATHER: 'Thời tiết xấu',
  FLIGHT_DELAY: 'Hoãn / đổi chuyến bay', HORSE_HEALTH: 'Sức khỏe ngựa', OTHER: 'Sự cố khác ảnh hưởng chặng',
};
export const F5_PLAN: Record<string, string> = {
  NO_CHANGE: 'Khắc phục tại chỗ, giữ nguyên kế hoạch', VEHICLE_SWAP: 'Thay xe', CREW_SWAP: 'Thay nhân sự', ROUTE_ADJUST: 'Điều chỉnh lộ trình trong tuyến pháp lý đã duyệt',
  FLIGHT_CHANGE: 'Đổi / hoãn chuyến bay', EXTERNAL_SERVICE: 'Thuê dịch vụ ngoài (cứu hộ, thú y, chuồng tạm)',
};
export const F5_ST: Record<string, [string, string]> = {
  REPORTED: ['NEW', 'Mới báo – chờ tiếp nhận'], PLANNING: ['IN_PROGRESS', 'Đang lập phương án'], PENDING_APPROVAL: ['PENDING_APPROVAL', 'Chờ Manager duyệt'],
  CHANGES_REQUESTED: ['FAILED', 'Manager yêu cầu chỉnh sửa'], EXECUTING: ['IN_PROGRESS', 'Đang thực hiện phương án'], CONTINUE_ALLOWED: ['APPROVED', 'Đã cho tiếp tục chặng'],
  RESULT_REPORTED: ['PENDING', 'Chờ Điều phối kiểm tra'], ESCALATED: ['ESCALATED', 'Chờ Manager quyết định'], HALTED: ['ON_HOLD', 'Chuyến dừng theo quyết định Manager'], CLOSED: ['CLOSED', 'Đã đóng'],
};
export const f5Pill = (i: Any): [string, string] => (F5_ST[i.status] ? F5_ST[i.status] : [i.status, human(i.status)]);
export const F5_DONE = ['CLOSED', 'HALTED'];
export const ROLE_VI: Record<string, string> = { DRIVER: 'Driver / Escort', FLEET_COORDINATOR: 'Điều phối', LOGISTICS_MANAGER: 'Manager', CUSTOMER: 'Khách hàng', SYSTEM: 'Hệ thống' };
export const CMP_VI: Record<string, string> = { NEW: 'Mới', OPEN: 'Đang mở', SUBMITTED: 'Đã gửi', IN_PROGRESS: 'Đang xử lý', ESCALATED: 'Đã chuyển cấp trên', PENDING_CUSTOMER_CONFIRMATION: 'Chờ khách xác nhận', RESOLVED: 'Đã giải quyết', CLOSED: 'Đã đóng' };
export const PAYER_VI: Record<string, string> = { COMPANY: 'Công ty', CUSTOMER: 'Khách hàng', INSURANCE: 'Bảo hiểm' };
const BY_VI: Record<string, string> = { 'Điều phối': 'Điều phối', Manager: 'Quản lý', 'Driver / Escort': 'Tài xế / Áp tải' };
export const byVi = (b: string) => BY_VI[b] || b;

const f5Log = (i: Any, text: string) => i.log.push([nowStamp(), text, me().name, 'FLEET_COORDINATOR']);
export const curPlan = (i: Any) => i.plans[i.plans.length - 1] || null;
const lastApproved = (i: Any) => [...i.plans].reverse().find((p: Any) => p.status === 'APPROVED') || null;
const mgrSig = (p: Any) => JSON.stringify([p.kind === 'ROUTE_ADJUST', p.kind === 'FLIGHT_CHANGE' ? p.flightAt : '', Number(p.cost || 0), Number(p.cost || 0) ? p.payer || '' : '', p.etaTo || p.etaBase || '']);
export const resSig = (p: Any) => JSON.stringify([p.vehicleId || '', p.crewRole || '', p.crewId || '', p.kind === 'FLIGHT_CHANGE' ? p.flightAt : '']);
const f5NeedsApproval = (p: Any) => p.kind === 'ROUTE_ADJUST' || p.kind === 'FLIGHT_CHANGE' || Number(p.cost || 0) > 0 || (!!p.etaTo && p.etaTo !== p.etaBase);
export const f5Why = (p: Any) => [p.kind === 'ROUTE_ADJUST' ? 'đổi lộ trình' : '', p.kind === 'FLIGHT_CHANGE' ? 'đổi chuyến bay' : '', Number(p.cost) > 0 ? `chi phí ${usd(p.cost)}` : '', p.etaTo && p.etaTo !== p.etaBase ? 'đổi thời gian giao đã cam kết' : ''].filter(Boolean);

export function f5Status(i: Any) {
  if (F5_DONE.includes(i.status)) return i.status;
  const p = curPlan(i);
  i.status = i.escalation && !i.escalation.decision ? 'ESCALATED' : i.result ? 'RESULT_REPORTED' : i.continueAt ? 'CONTINUE_ALLOWED' : !i.ackAt ? 'REPORTED'
    : !p || p.status === 'DRAFT' || (i.replan && p.v <= i.replanFrom) ? 'PLANNING' : p.status === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : p.status === 'CHANGES_REQUESTED' ? 'CHANGES_REQUESTED' : 'EXECUTING';
  return i.status;
}

/** điều kiện để tiếp tục chặng (còn thiếu gì, ai phải làm) */
export function f5Conditions(i: Any, own = false): Array<{ ok: boolean; label: string; by: string }> {
  const t = trip(i.tripId), p = curPlan(i), out: Array<{ ok: boolean; label: string; by: string }> = [];
  const add = (ok: boolean, label: string, by: string) => out.push({ ok, label, by });
  add(!!p && p.status !== 'DRAFT', p ? `Phương án v${p.v} đã lưu và gửi/áp dụng` : 'Có phương án xử lý', 'Điều phối');
  if (p && p.needsApproval) add(p.status === 'APPROVED', `Manager phê duyệt phương án v${p.v} (${f5Why(p).join(', ')})`, 'Manager');
  add(!!(i.sceneReady && p && i.sceneReady.sig === resSig(p)), 'Driver / Escort xác nhận hiện trường sẵn sàng' + (i.sceneReady && p && i.sceneReady.sig !== resSig(p) ? ' (cần xác nhận lại vì xe/nhân sự/chuyến bay đã đổi)' : ''), 'Driver / Escort');
  add(!!(i.resOk && p && i.resOk.sig === resSig(p)), `Xe & nhân sự đáp ứng phương án${p ? ' v' + p.v : ''}` + (i.resOk && p && i.resOk.sig !== resSig(p) ? ' (cần xác nhận lại)' : ''), 'Điều phối');
  if (i.type === 'HORSE_HEALTH') add(!!(i.vet && ['FIT', 'FIT_WITH_CONDITIONS'].includes(i.vet.conclusion)), i.vet && i.vet.conclusion === 'NOT_FIT' ? 'Bác sĩ kết luận chưa đủ sức khỏe tiếp tục' : 'Kết luận của bác sĩ bên ngoài cho phép tiếp tục', 'Driver / Escort');
  if (!own) db.incidents.filter((x: Any) => x !== i && x.tripId === i.tripId && x.blocking && !F5_DONE.includes(x.status) && !x.continueAt && f5Conditions(x, true).some((c) => !c.ok))
    .forEach((x: Any) => add(false, `Sự cố ${x.id} (${F5_TYPES[x.type] || incTypeVi(x.type)}) vẫn đang chặn chặng`, 'Điều phối'));
  if (tripHalted(t)) add(false, 'Chuyến đang dừng theo quyết định Manager', 'Manager');
  if (p?.crewId) { const error = staffError(emp(p.crewId), t, p.crewRole); out.push({ ok: !error, label: error || 'Nhân sự thay thế hợp lệ, không trùng chuyến khác', by: 'Điều phối' }); }
  return out;
}

/** khung "Việc bạn cần làm / Đang chờ ai" */
export function f5Next(i: Any): [string, string, string] {
  const p = curPlan(i), miss = f5Conditions(i).filter((c) => !c.ok), S = i.status;
  if (S === 'CLOSED') return ['done', 'Sự cố đã đóng', `Đóng bởi ${i.closedBy || '—'} lúc ${dt(i.closedAt)}. Đóng sự cố không hoàn tất chuyến; chuyến tiếp tục theo các mốc bình thường.`];
  if (S === 'HALTED') return ['bad', 'Chuyến dừng theo quyết định Manager', i.escalation?.note || ''];
  if (S === 'ESCALATED') return ['wait', 'Đang chờ Manager quyết định', 'Điều phối đã báo chuyến không thể tiếp tục: ' + i.escalation.reason];
  if (S === 'REPORTED') return ['me', 'Tiếp nhận sự cố', 'Bạn là đầu mối từ tiếp nhận đến đóng sự cố.'];
  if (S === 'PLANNING' && i.replan) return ['me', 'Lập lại kế hoạch theo quyết định Manager', (i.escalation?.note || '') + ' – phương án mới cần Manager duyệt.'];
  if (S === 'PLANNING' || S === 'CHANGES_REQUESTED') return ['me', S === 'CHANGES_REQUESTED' ? 'Chỉnh sửa phương án theo yêu cầu của Manager' : (p ? `Hoàn thiện phương án v${p.v} và ${p.needsApproval ? 'gửi Manager duyệt' : 'áp dụng'}` : 'Lập phương án xử lý'), S === 'CHANGES_REQUESTED' ? 'Lý do: ' + ((p.approvals.slice(-1)[0] || {}).reason || '') : ''];
  if (S === 'PENDING_APPROVAL') return ['wait', `Chờ Manager duyệt phương án v${p.v}`, 'Phê duyệt không đồng nghĩa với được tiếp tục chặng.'];
  if (S === 'EXECUTING') {
    const mine = miss.filter((c) => c.by === 'Điều phối');
    if (!miss.length) return ['me', 'Đủ điều kiện – cho phép tiếp tục chặng', 'Cho phép tiếp tục không đóng sự cố.'];
    if (mine.length) return ['me', 'Hoàn tất điều kiện còn thiếu để tiếp tục chặng', mine.map((c) => c.label).join(' • ')];
    return ['wait', 'Đang chờ các bên khác', miss.map((c) => `${c.label} (${byVi(c.by)})`).join(' • ')];
  }
  if (S === 'CONTINUE_ALLOWED') return ['wait', 'Chờ Driver / Escort báo kết quả thực hiện', 'Chặng đã tiếp tục; sự cố chưa đóng.'];
  if (S === 'RESULT_REPORTED') return ['me', 'Kiểm tra kết quả và đóng sự cố', 'Đóng sự cố không hoàn tất chuyến.'];
  return ['wait', '', ''];
}
export const waitingFor = (i: Any) => (i.status === 'REPORTED' ? 'Điều phối' : i.status === 'PENDING_APPROVAL' || i.status === 'ESCALATED' ? 'Quản lý' : i.status === 'CONTINUE_ALLOWED' ? 'Tài xế / Áp tải'
  : ['PLANNING', 'CHANGES_REQUESTED', 'RESULT_REPORTED'].includes(i.status) ? 'Điều phối'
    : i.status === 'EXECUTING' ? ([...new Set(f5Conditions(i).filter((c) => !c.ok).map((c) => byVi(c.by)))].join(', ') || 'Điều phối') : '—');

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
  if (p.vehicleId && p.vehicleId !== t.vehicleId) { f5Log(i, `Đổi xe ${vehicle(t.vehicleId) ? vehicle(t.vehicleId).plate : '—'} → ${vehicle(p.vehicleId).plate}`); t.vehicleId = p.vehicleId; }
  if (p.crewId && p.crewRole) { t.crew = { ...(t.crew || {}), [p.crewRole]: p.crewId }; f5Log(i, `Thay ${human(p.crewRole)}: ${emp(p.crewId).name}`); }
  if (p.kind === 'FLIGHT_CHANGE' && t.flight && p.flightAt) { const d = Date.parse(t.flight.arriveAt.replace(' ', 'T')) - Date.parse(t.flight.departAt.replace(' ', 'T')); t.flight.departAt = p.flightAt; t.flight.arriveAt = addHours(p.flightAt, d / 3600000); f5Log(i, `Chuyến bay dời sang ${dt(p.flightAt)}`); }
  if (p.etaTo && p.etaTo !== t.eta) changeEta(t, p.etaTo, `${i.id} – phương án v${p.v}`, me().name);
  crewOf(t).forEach(([, e]) => notify(e, `Phương án v${p.v} cho ${i.id}`, p.desc.slice(0, 90), `d/incident/${i.id}`));
}

// ============================================================================
// Thao tác của Điều phối
// ============================================================================
const find = (id: string) => db.incidents.find((x: Any) => x.id === id);

export function f5Ack(id: string) {
  const i = find(id), t = trip(i.tripId); if (i.ackAt) return;
  i.ackAt = nowStamp(); i.owner = me().name; f5Log(i, 'Tiếp nhận sự cố, xác định chặng: ' + legOf(t, i.leg)); f5Status(i);
  crewOf(t).forEach(([, e]) => notify(e, `Điều phối đã tiếp nhận ${i.id}`, 'Giữ an toàn, gửi cập nhật hiện trường khi có diễn biến.', `d/incident/${i.id}`));
  toast('Đã tiếp nhận. Lập phương án xử lý.');
}

export function f5Plan(id: string) {
  const i = find(id), t = trip(i.tripId), p = curPlan(i) || {}, n = tripHorses(t).length;
  const vOpts: Array<[string, string]> = [['', 'Giữ xe hiện tại'], ...db.vehicles.filter((v: Any) => v.id !== t.vehicleId && v.status === 'READY' && v.stalls >= n && !vehicleConflict(v, t)).map((v: Any) => [v.id, `${v.plate} • ${v.model} • ${v.stalls} ô • ${v.base}`] as [string, string])];
  const cOpts: Array<[string, string]> = [['', 'Không thay'], ...db.employees.filter((e: Any) => e.status === 'ACTIVE' && !tripPersonnelIds(t).includes(e.id) && !crewConflict(e, t)).map((e: Any) => [e.id, `${e.name} • ${human(e.position)}`] as [string, string])];
  const guess = p.kind || (/BREAKDOWN|ACCIDENT/.test(i.type) ? 'VEHICLE_SWAP' : i.type === 'FLIGHT_DELAY' ? 'FLIGHT_CHANGE' : /ROAD|BORDER|WEATHER/.test(i.type) ? 'ROUTE_ADJUST' : i.type === 'HORSE_HEALTH' ? 'EXTERNAL_SERVICE' : 'NO_CHANGE');
  const vets = i.type === 'HORSE_HEALTH' ? nearestVets(t) : [];
  openModal({
    title: `${curPlan(i) && curPlan(i).status !== 'DRAFT' ? 'Sửa phương án → tạo phiên bản mới' : 'Phương án xử lý'} • ${i.id}`, ok: 'Lưu phương án', wide: true,
    init: { k: guess, desc: p.desc || '', reason: p.reason || '', veh: p.vehicleId || '', crole: p.crewRole || '', cid: p.crewId || '', legal: p.legalRoute !== false,
      flight: (p.flightAt || (t.flight && t.flight.departAt) || t.plannedDepart), eta: p.etaTo || t.eta, cost: String(p.cost || 0), payer: p.payer || 'COMPANY' },
    body: () => (<>
      <p className="subtitle" style={{ marginTop: 0 }}>{legOf(t, i.leg)} • ETA đã xác nhận {dt(t.eta)}</p>
      <Field label="Hướng xử lý *"><Sel name="k" options={Object.entries(F5_PLAN)} /></Field>
      {vets.length ? <Note tone="grey" icon="info" title="Cơ sở thú y gần vị trí hiện tại">{vets.map((v: Any, k: number) => <span key={v.id}>{k ? <br /> : null}{v.name} (~{v.est} km, {v.phone}, {v.hours})</span>)}</Note> : null}
      <Field label="Nội dung phương án *"><Txt name="desc" placeholder="Việc cần làm, ai làm, khi nào" /></Field>
      <Field label="Lý do *"><Inp name="reason" /></Field>
      <div className="form-grid">
        <Field label="Xe"><Sel name="veh" options={vOpts} /></Field>
        <Field label="Thay nhân sự"><div style={{ display: 'flex', gap: 6 }}><Sel name="crole" options={[['', '—'], ['MAIN_DRIVER', 'Tài xế chính'], ['CO_DRIVER', 'Phụ lái / Escort'], ['VETERINARIAN', 'Áp tải chăm sóc ngựa']]} /><Sel name="cid" options={cOpts} /></div></Field>
      </div>
      <div id="f5-route-box"><Chk name="legal">Lộ trình mới vẫn trong tuyến pháp lý đã duyệt (giữ quốc gia và cửa khẩu)</Chk></div>
      {t.mode === 'AIR' ? <Field label="Giờ bay mới (khi đổi / hoãn chuyến bay)"><DateTimeInput name="flight" /></Field> : null}
      <div className="form-grid">
        <Field label="Thời gian giao dự kiến *"><DateTimeInput name="eta" /></Field>
        <Field label="Chi phí phát sinh (USD) *"><Inp name="cost" type="number" min="0" /></Field>
        <Field label="Bên chịu chi phí"><Sel name="payer" options={[['COMPANY', 'CBN Transport'], ['CUSTOMER', 'Khách hàng (thỏa thuận riêng)'], ['INSURANCE', 'Bảo hiểm (dự kiến)']]} /></Field>
      </div>
      <p className="hint">Cần Manager duyệt khi: đổi lộ trình, đổi chuyến bay, phát sinh chi phí hoặc đổi thời gian giao đã cam kết. Thay xe / nhân sự giữ lịch, không phí: Điều phối tự xử lý. Chi phí không tự cộng vào số tiền khách phải trả.</p>
    </>),
    onOk: (v) => {
      const k = v.k, cost = Number(v.cost || 0), eta = String(v.eta || '').replace('T', ' ');
      if (String(v.desc).trim().length < 10) return 'Mô tả phương án ít nhất 10 ký tự.';
      if (String(v.reason).trim().length < 3) return 'Nhập lý do.';
      if (k === 'ROUTE_ADJUST' && !v.legal) return 'Đổi quốc gia/cửa khẩu nằm ngoài Flow 5: dùng “Báo không thể tiếp tục” để Manager lập lại kế hoạch.';
      if (k === 'VEHICLE_SWAP' && !v.veh) return 'Chọn xe thay thế.';
      if (k === 'CREW_SWAP' && !(v.crole && v.cid)) return 'Chọn vị trí và người thay.';
      if (v.cid) { const error = staffError(emp(v.cid), t, v.crole); if (error) return error; }
      if (k === 'FLIGHT_CHANGE' && (t.mode !== 'AIR' || !v.flight)) return 'Chọn giờ bay mới.';
      if (!eta) return 'Chọn thời gian giao dự kiến.';
      if (!(cost >= 0)) return 'Chi phí không hợp lệ.';
      const base = curPlan(i), draft = base && base.status === 'DRAFT';
      const np: Any = { v: draft ? base.v : (base ? base.v + 1 : 1), id: draft ? base.id : nextId('PL'), kind: k, desc: String(v.desc).trim(), reason: String(v.reason).trim(), vehicleId: v.veh || '', crewRole: v.cid ? v.crole : '', crewId: v.cid || '',
        legalRoute: true, flightAt: k === 'FLIGHT_CHANGE' ? String(v.flight).replace('T', ' ') : '', etaBase: t.eta, etaTo: eta === t.eta ? '' : eta, cost, payer: v.payer, by: me().name, at: nowStamp(), status: 'DRAFT', approvals: [] };
      np.needsApproval = f5NeedsApproval(np) || !!i.replan;
      if (draft) i.plans[i.plans.length - 1] = np; else i.plans.push(np);
      f5Log(i, `${draft ? 'Cập nhật nháp' : 'Lưu'} phương án v${np.v}: ${F5_PLAN[k]}${np.needsApproval ? ' (cần Manager duyệt)' : ''}`); f5Status(i);
      toast(`Đã lưu phương án v${np.v}. ${np.needsApproval ? 'Bấm “Gửi Manager duyệt”.' : 'Bấm “Áp dụng phương án”.'}`);
    },
  });
}

export function f5Submit(id: string) {
  const i = find(id), t = trip(i.tripId), p = curPlan(i); if (!p || p.status !== 'DRAFT') return;
  if (p.crewId) { const e = staffError(emp(p.crewId), t, p.crewRole); if (e) return toast(e); }
  const prev = lastApproved(i);
  if (p.needsApproval && prev && !i.replan && mgrSig(prev) === mgrSig(p)) {
    p.status = 'APPROVED'; p.inherited = prev.v; p.approvals.push({ at: nowStamp(), by: 'Hệ thống', decision: 'INHERITED', reason: `Nội dung thuộc quyền Manager giống v${prev.v}` });
    f5Log(i, `Phương án v${p.v} kế thừa phê duyệt v${prev.v} (chỉ đổi xe/nhân sự/mô tả)`); f5Apply(i, p);
  } else if (p.needsApproval) {
    p.status = 'PENDING_APPROVAL'; p.sentAt = nowStamp(); f5Log(i, `Gửi Manager duyệt phương án v${p.v} (${f5Why(p).join(', ')})`);
    notify('LOGISTICS_MANAGER', `Cần duyệt phương án v${p.v} – ${i.id}`, `${F5_PLAN[p.kind]} • ${f5Why(p).join(', ')}`, `m/incident/${i.id}`);
  } else { p.status = 'NOT_REQUIRED'; f5Log(i, `Áp dụng phương án v${p.v} – không cần Manager duyệt`); f5Apply(i, p); }
  f5Status(i); toast(p.status === 'PENDING_APPROVAL' ? 'Đã gửi Manager duyệt.' : 'Đã áp dụng phương án. Xác nhận nguồn lực và chờ hiện trường sẵn sàng.');
}

export function f5Res(id: string) {
  const i = find(id), t = trip(i.tripId), p = curPlan(i), v = vehicle(p.vehicleId || t.vehicleId);
  if (p.crewId) { const e = staffError(emp(p.crewId), t, p.crewRole); if (e) return toast(e); }
  openModal({
    title: `Xác nhận nguồn lực cho phương án v${p.v}`, ok: 'Xác nhận', init: { ok: false },
    body: () => (<>
      <div className="kv2">
        <div><div className="label">Xe</div><div className="value sm">{v ? `${v.plate} • ${v.stalls} ô • ${human(v.status)}` : '—'}</div></div>
        <div><div className="label">Nhân sự</div><div className="value sm">{crewOf(t).length ? crewOf(t).map(([k, e], n) => <span key={k}>{n ? <br /> : null}{human(k)}: {emp(e)?.name}</span>) : '—'}</div></div>
        {p.kind === 'FLIGHT_CHANGE' ? <div><div className="label">Chuyến bay</div><div className="value sm">{dt(p.flightAt)}</div></div> : null}
      </div>
      <Chk name="ok">Xe và nhân sự đã bố trí đáp ứng phương án{p.kind === 'FLIGHT_CHANGE' ? ' (đã bố trí lại 2 chặng xe sân bay theo giờ bay mới)' : ''}</Chk>
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
      i.continueAt = nowStamp(); i.continueBy = me().name; f5Log(i, 'Cho phép tiếp tục chặng'); f5Status(i);
      crewOf(t).forEach(([, e]) => notify(e, `${t.id}: được phép tiếp tục chặng`, `Sau khi thực hiện xong, báo kết quả cho ${i.id}.`, `d/incident/${i.id}`));
      toast(legHolds(t).length ? `Chặng chạy lại khi ${legHolds(t).map((x: Any) => x.id).join(', ')} cũng được cho tiếp tục.` : 'Đã cho phép tiếp tục chặng. Sự cố vẫn mở tới khi có kết quả.');
    },
  });
}

export function f5Close(id: string) {
  const i = find(id);
  if (!i.result) return toast('Chỉ đóng khi Driver / Escort đã báo kết quả thực hiện.');
  openModal({
    title: `Đóng sự cố ${i.id}`, ok: 'Đóng sự cố', init: { ok: false, note: '' },
    body: () => (<>
      <Note tone="grey" title={`Kết quả từ ${i.result.by} (${dt(i.result.at)})`}>{i.result.text}</Note>
      <Chk name="ok">Đã kiểm tra kết quả, tình hình ổn định</Chk>
      <Field label="Ghi chú đóng *"><Txt name="note" placeholder="Kết quả kiểm tra" /></Field>
      <p className="hint">Đóng sự cố không hoàn tất chuyến.</p>
    </>),
    onOk: (v) => {
      if (!v.ok) return 'Tick xác nhận đã kiểm tra.'; if (String(v.note).trim().length < 5) return 'Nhập ghi chú.';
      i.status = 'CLOSED'; i.closedAt = nowStamp(); i.closedBy = me().name; i.closeNote = String(v.note).trim(); f5Log(i, 'Đóng sự cố: ' + i.closeNote);
      notify('LOGISTICS_MANAGER', `${i.id} đã đóng`, i.closeNote, `m/incident/${i.id}`); toast('Đã đóng sự cố. Chuyến vẫn tiếp tục theo các mốc.');
    },
  });
}

export function f5Escalate(id: string) {
  const i = find(id);
  openModal({
    title: 'Không thể tiếp tục – chuyển Manager quyết định', ok: 'Chuyển Manager', danger: true, init: { es: '' },
    body: () => <Field label="Lý do *"><Txt name="es" placeholder="Vì sao không thể tiếp tục trong tuyến/kế hoạch hiện tại (VD: cần đổi cửa khẩu, ngựa không đủ sức khỏe…)" /></Field>,
    onOk: (v) => {
      if (String(v.es).trim().length < 10) return 'Nhập lý do (ít nhất 10 ký tự).';
      i.escalation = { at: nowStamp(), by: me().name, reason: String(v.es).trim(), decision: null }; f5Log(i, 'Báo không thể tiếp tục: ' + i.escalation.reason); f5Status(i);
      notify('LOGISTICS_MANAGER', `${i.id}: chuyến không thể tiếp tục`, i.escalation.reason, `m/incident/${i.id}`); toast('Đã chuyển Manager quyết định.');
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
      <p className="hint">Chỉ xem. Logistics Manager trả lời và giải quyết khiếu nại.</p>
    </>),
  });
}

export const incidentsChanged = () => commit();
