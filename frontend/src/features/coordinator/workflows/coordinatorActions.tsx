// ============================================================================
// Thao tác của Điều phối trên chuyến: xe & nhân sự, xác nhận nguồn lực, ETA, cảnh báo lịch trình,
// ghi mốc thay tổ xe, trạng thái xe/nhân sự, thông báo và các nút demo (mô phỏng quyết định Manager)
// ============================================================================
import { Chk, Field, Icon, Inp, Sel, Txt } from '../components/common/ui';
import { DateInput, DateTimeInput } from '../components/forms/DateTime';
import { ACTIVE_TRIP, approvedRoute, canPlan, changeEta, crewConflict, crewOf, curRoute, editableF3, emp, fleetCountry, GROUND_ROLE_KEYS, groundCanEdit, groundCountry, groundLegEndDate, groundLegs, groundServiceArea, handoverState, holdText, horseCountError, isDriver, isVet, lastMilestone, nextMilestone, opsBlock, placeById, recordGroundChange, reqOfTrip, resourceGaps, routeState, staffError, trip, tripHorses, tripLabel, tripPersonnelIds, tripStops, tripVehicleIds, tripWindow, vehicle, vehicleAccessIssue, vehicleConflict } from '../domain/coordinatorRules';
import type { Any } from '../store/coordinatorStore';
import { audit, commit, confirmAction, db, go, me, nextId, notify, nowStamp, openModal, toast } from '../store/coordinatorStore';
import { addHours, city, cityLabel, date, dt, human, MILESTONE_LABEL, MS_VI } from '../utils/format';
import { approveAirPlan, submitAirPlan } from './airOperations';
import { resourceSignature, ROUTE_POLICY, RP, rpCalc, rpEnsure, rpRoute, rpRouteKey, rpState, rpWriteTimes, stop, submitRoadRoute } from './routePlanner';

const DEMO_MGR = ['Linh Pham', 'LOGISTICS_MANAGER'];
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// ---------- xe & nhân sự (đường bộ) ----------
export function vehicleAssign(id: string, vid: string) {
  const t = trip(id), v = vehicle(vid);
  if (!t || !v || t.mode === 'AIR') return toast('Đối với chuyến bay, hãy phân xe riêng trong từng chặng sân bay.');
  const check = () => (!editableF3(t) ? 'Tạo phiên bản tuyến nháp trước khi đổi xe.'
    : v.status !== 'READY' || v.stalls < Math.max(tripHorses(t).length, reqOfTrip(t).count || 0) || fleetCountry(v) !== city(reqOfTrip(t).origin)[1] || vehicleConflict(v, t) ? 'Xe không phù hợp quốc gia, sức chứa, trạng thái hoặc lịch phân công.' : '');
  const err = check(); if (err) return toast(err);
  const ai = vehicleAccessIssue(t, v, 'pickup') || vehicleAccessIssue(t, v, 'delivery'); if (ai) return toast(ai);
  confirmAction(`Phân xe ${v.plate} cho ${id}?`, `${v.model}, ${v.stalls} ngăn, ${date(tripWindow(t)[0])} – ${date(tripWindow(t)[1])}.`, 'Phân xe', () => {
    const again = check(); if (again) return again;
    t.vehicleId = vid; t.resourcesConfirmed = null; audit('Assigned vehicle', id, v.plate); toast(`Đã phân xe ${v.plate}.`);
  });
}
export function crewSave(id: string, pick: Record<string, string>) {
  const t = trip(id); if (!t || t.mode === 'AIR') return toast('Vui lòng phân công từng chặng sân bay và bác sĩ chặng bay.');
  if (!editableF3(t)) return toast('Tạo phiên bản tuyến nháp trước khi thay nhân sự.');
  const keys = ['MAIN_DRIVER', 'CO_DRIVER', 'VETERINARIAN'], ids = keys.map((k) => pick[k] || '');
  if (new Set(ids).size !== ids.length) return toast('Ba vị trí cần ba người khác nhau.');
  for (let i = 0; i < keys.length; i++) { const e = staffError(emp(ids[i]), t, keys[i], true); if (e) return toast(e); }
  const before = { ...(t.crew || {}) };
  t.crew = Object.fromEntries(Object.entries(pick).filter(([, v]) => v));
  t.resourcesConfirmed = null;
  Object.entries(t.crew).forEach(([k, e]) => { if (before[k] !== e) notify(e, `Được phân công ${id} – ${human(k).toLowerCase()}`, `${tripLabel(t)} • khởi hành ${dt(t.plannedDepart)}`, `d/trip/${id}`); });
  audit('Saved crew', id, Object.entries(t.crew).map(([k, e]) => `${human(k)}: ${emp(e as string)?.name}`).join(', '));
  toast('Đã lưu tổ lái và gửi thông báo.');
}
// ---------- xe & nhân sự (hai chặng đường bộ của chuyến AIR) ----------
export function groundVehicleSet(id: string, leg: string, vid: string) {
  const t = trip(id);
  if (!t || t.mode !== 'AIR' || !['outbound', 'inbound'].includes(leg) || !groundCanEdit(t)) return toast('Không thể sửa nguồn lực của tuyến đã gửi hoặc đã duyệt. Hãy tạo phiên bản tuyến mới.');
  const v = vehicle(vid), c = groundCountry(t, leg), r = reqOfTrip(t), area = leg === 'outbound' ? r.origin : r.destination;
  const old = groundLegs(t)[leg], other = groundLegs(t)[leg === 'outbound' ? 'inbound' : 'outbound'];
  if (!v || fleetCountry(v) !== c || !groundServiceArea(v, c, area) || v.status !== 'READY' || v.stalls < tripHorses(t).length || vehicleConflict(v, t) || other.vehicleId === v.id) return toast('Xe không đáp ứng quốc gia/khu vực, sức chứa, tình trạng hoặc lịch phân công.');
  const ai = vehicleAccessIssue(t, v, leg === 'outbound' ? 'pickup' : 'delivery'); if (ai) return toast(ai);
  if (old.vehicleId === vid) return;
  const before = vehicle(old.vehicleId)?.plate || 'Chưa phân xe';
  old.vehicleId = vid; recordGroundChange(t, leg, 'Đổi xe', before, v.plate);
  audit('Assigned road vehicle', id, `${leg} ${c}: ${v.plate}`);
  toast(`Đã phân công xe ${v.plate} cho chặng ${leg === 'outbound' ? 'trước' : 'sau'} chuyến bay.`);
}
export function groundCrewSave(id: string, leg: string, ids: string[]) {
  const t = trip(id);
  if (!t || t.mode !== 'AIR' || !['outbound', 'inbound'].includes(leg) || !groundCanEdit(t)) return toast('Không thể sửa nguồn lực đã duyệt/chờ duyệt. Hãy tạo phiên bản tuyến mới.');
  const c = groundCountry(t, leg), r = reqOfTrip(t), area = leg === 'outbound' ? r.origin : r.destination;
  const staff = ids.map((x) => emp(x)), end = groundLegEndDate(t, leg);
  if (ids.some((x) => !x) || staff.some((x) => !x) || new Set(ids).size !== 3) return toast('Phải chọn đủ ba nhân sự khác nhau cho chặng này.');
  if (!isDriver(staff[0]) || !isDriver(staff[1]) || !isVet(staff[2]) || staff.some((e: Any) => e.country !== c || !groundServiceArea(e, c, area))) return toast('Nhân sự không đúng vai trò hoặc khu vực vận hành.');
  if (staff[2].certExpiry < end) return toast('Chứng chỉ bác sĩ thú y không còn hiệu lực đến cuối chặng.');
  const other = groundLegs(t)[leg === 'outbound' ? 'inbound' : 'outbound'];
  if (ids.some((x) => Object.values(other.crew || {}).includes(x))) return toast('Nhân sự đã được phân vào chặng đường bộ còn lại.');
  const busy = staff.find((e: Any) => crewConflict(e, t));
  if (busy) return toast(`${busy.name} đã được gắn vào chuyến ${crewConflict(busy, t).id}. Một nhân sự chỉ được gắn vào một chuyến đang hoạt động.`);
  const data = groundLegs(t)[leg], before = GROUND_ROLE_KEYS.map((k) => emp(data.crew?.[k])?.name || '—').join(', ');
  data.crew = Object.fromEntries(GROUND_ROLE_KEYS.map((k, i) => [k, ids[i]]));
  recordGroundChange(t, leg, 'Lưu nhân sự', before, staff.map((e: Any) => e.name).join(', '));
  staff.forEach((e: Any, i) => notify(e.id, `Phân công chặng ${leg === 'outbound' ? 'trước' : 'sau'} chuyến bay ${id}`, `${['Tài xế chính', 'Phụ lái kiêm Escort', 'Bác sĩ thú y'][i]} • ${c}`, `d/trip/${id}`));
  audit('Assigned road crew', id, `${leg} ${c}: ${staff.map((e: Any) => e.name).join(', ')}`);
  toast(`Đã lưu ba nhân sự cho chặng ${leg === 'outbound' ? 'trước' : 'sau'} chuyến bay.`);
}
export function resourceConfirm(id: string) {
  const t = trip(id); if (!t) return toast('Không tìm thấy Trip.');
  const block = opsBlock(t); if (block) return toast(block);
  if (!canPlan(t)) return toast('Chỉ xác nhận xe và nhân sự khi Trip đang chuẩn bị.');
  const gaps = resourceGaps(t); if (gaps.length) return toast('Chưa đủ điều kiện: ' + gaps.join(', '));
  confirmAction('Xác nhận đã bố trí xe và nhân sự?', 'Coordinator xác nhận các phương tiện, nhân sự và vé bay (nếu có) đã sẵn sàng. Manager sẽ kiểm tra trước khi duyệt khởi hành.', 'Xác nhận bố trí', () => {
    if (opsBlock(t) || resourceGaps(t).length || !canPlan(t)) { toast('Điều kiện chuẩn bị đã thay đổi; kiểm tra lại.'); return; }
    t.resourcesConfirmed = { at: nowStamp(), by: me().name, vehicleId: t.vehicleId, crew: { ...(t.crew || {}) } };
    const accepted = curRoute(t);
    if (accepted?.status === 'APPROVED' && accepted.resourceSnapshot && accepted.resourceSnapshot.signature !== resourceSignature(t)) {
      t.routes.push({ v: accepted.v + 1, status: 'PENDING_APPROVAL', submittedAt: nowStamp(), decidedAt: null, note: 'Xe/nhân sự thay đổi sau duyệt; đề nghị Manager duyệt lại gói phương án.', stops: accepted.stops.map((s: Any) => ({ ...s })) });
      notify('LOGISTICS_MANAGER', `Thay đổi xe/nhân sự của ${id}`, 'Coordinator đã xác nhận lại nguồn lực. Cần duyệt phiên bản tuyến mới.', `m/trip/${id}/route`);
    }
    audit('Coordinator confirmed resources', id, 'Vehicle and crew confirmed');
    notify('LOGISTICS_MANAGER', `Xe và nhân sự ${id} đã xác nhận`, 'Coordinator đã hoàn thành bố trí, kiểm tra toàn bộ điều kiện để duyệt khởi hành.', `m/trip/${id}/prepare`);
    toast('Đã xác nhận xe và nhân sự.');
  });
}

// ---------- gửi tuyến cho Manager duyệt ----------
export function routeSubmit(id: string) {
  const t = trip(id); if (!t) return;
  const ce = horseCountError(reqOfTrip(t)); if (ce) return toast(ce);
  if (t.mode === 'AIR') return submitAirPlan(id);
  if (t.demoFlow3) {
    const rt = curRoute(t);
    if (!rt || rt.status !== 'DRAFT') return toast('Chỉ Điều phối gửi bản nháp.');
    if (!t.resourcesConfirmed || resourceGaps(t).length) return toast('Xác nhận đủ xe và nhân sự trước khi gửi.');
    const sig = resourceSignature(t);
    return submitRoadRoute(id, () => (!t.resourcesConfirmed || resourceGaps(t).length || resourceSignature(t) !== sig ? 'Nguồn lực đã thay đổi; xác nhận và gửi lại.' : ''),
      () => { rt.resourceProposal = { at: nowStamp(), vehicleId: t.vehicleId, crew: clone(t.crew), signature: sig, demoFlow3: true }; });
  }
  return submitRoadRoute(id);
}

// ---------- theo dõi hành trình ----------
export const ALERT_CAUSE: Record<string, string> = { TRAFFIC: 'Sự cố giao thông / ùn tắc', WEATHER: 'Thời tiết xấu', BORDER: 'Tắc nghẽn cửa khẩu', OTHER: 'Lý do khác' };
export const MANUAL_MS: Array<[string, string, string[]]> = [['DEPART', 'Khởi hành', ['DEPARTED', 'LEFT_STOP']], ['ARRIVE', 'Đến điểm dừng', ['ARRIVED_STOP', 'ARRIVED_CHECKPOINT']], ['CLEARED', 'Đã thông quan', ['PASSED_CHECKPOINT']], ['DELIVERED', 'Đã giao', ['ARRIVED_DESTINATION']]];
export function etaUpdate(id: string) {
  const t = trip(id);
  openModal({
    title: `Cập nhật giờ dự kiến đến cho ${id}`, ok: 'Lưu giờ dự kiến', init: { eta: t.eta.replace(' ', 'T'), reason: '' },
    body: () => (<><Field label="Giờ dự kiến đến mới *"><DateTimeInput name="eta" /></Field><Field label="Lý do *"><Inp name="reason" /></Field></>),
    onOk: (v) => {
      if (!v.eta || String(v.reason).trim().length < 4) return 'Nhập giờ dự kiến đến mới và lý do.';
      const old = t.eta; changeEta(t, String(v.eta).replace('T', ' '), String(v.reason).trim(), me().name);
      audit('Updated ETA', id, `${dt(old)} → ${dt(t.eta)}: ${v.reason}`); toast('Đã cập nhật giờ dự kiến đến.');
    },
  });
}
export function scheduleAlert(id: string) {
  const t = trip(id), stops = tripStops(t), m = lastMilestone(t), from = m ? m.stop : 0;
  const ahead = stops.map((s: Any, i: number) => [i, s]).filter(([i]: Any) => i >= from);
  openModal({
    title: `Cảnh báo & điều chỉnh lịch trình – ${t.id}`, ok: 'Gửi cảnh báo', danger: true,
    init: { cause: 'TRAFFIC', where: '', delay: '2', shift: true, msg: '', m: true, s: true, d: true, c: true },
    body: () => (<>
      <div className="form-grid">
        <Field label="Nguyên nhân *"><Sel name="cause" options={Object.entries(ALERT_CAUSE)} /></Field>
        <Field label="Chặng / vị trí bị ảnh hưởng"><Sel name="where" options={[['', '— Chung cho chuyến —'], ...ahead.map(([i, s]: Any) => [String(i), `${i + 1}. ${s.name}`] as [string, string])]} /></Field>
      </div>
      <div className="form-grid">
        <Field label="Trễ dự kiến (giờ) *"><Inp name="delay" type="number" min="0" max="72" step="0.5" /></Field>
        <Field label="ETA hiện tại"><input value={dt(t.eta)} disabled /></Field>
      </div>
      <Chk name="shift">Dời giờ dự kiến của các điểm dừng còn lại theo số giờ trễ</Chk>
      <Field label="Nội dung cảnh báo *"><Txt name="msg" placeholder="Chuyện gì đang xảy ra, tổ xe cần làm gì, lịch mới" /></Field>
      <div className="field"><label>Gửi tới</label><div className="al-to">
        <Chk name="m">Quản lý vận hành</Chk><Chk name="s">Chuyên viên vận chuyển</Chk><Chk name="d">Tổ xe (tài xế / thú y)</Chk><Chk name="c">Khách hàng</Chk>
      </div></div>
      <p className="hint">Điều chỉnh lịch do nguyên nhân bên ngoài không cần Manager duyệt. Nếu cần đổi tuyến, đổi xe hoặc phát sinh chi phí, hãy báo cáo sự cố và đề xuất phương án.</p>
    </>),
    onOk: (v) => {
      const delay = Number(v.delay), msg = String(v.msg).trim(), to = ['m', 's', 'd', 'c'].filter((k) => v[k]);
      if (!(delay >= 0 && delay <= 72)) return 'Số giờ trễ từ 0 đến 72.';
      if (msg.length < 10) return 'Nội dung cảnh báo ít nhất 10 ký tự.';
      if (!to.length) return 'Chọn ít nhất một nơi nhận.';
      const where = v.where !== '' ? stops[Number(v.where)].name : '', cause = v.cause, old = t.eta;
      let shifted = 0;
      if (delay) {
        changeEta(t, addHours(t.eta, delay), `${ALERT_CAUSE[cause]}${where ? ' – ' + where : ''}`, me().name);
        if (v.shift) { const rt = approvedRoute(t) || curRoute(t); if (rt) rt.stops.forEach((s: Any, i: number) => { if (i > from && s.plannedAt) { s.plannedAt = addHours(s.plannedAt, delay); shifted++; } }); }
      }
      (t.alerts = t.alerts || []).push({ id: nextId('AL'), at: nowStamp(), cause, where, delayH: delay, etaFrom: old, etaTo: t.eta, message: msg, to, shifted, by: me().name });
      const title = `${ALERT_CAUSE[cause]} – ${t.id}`, body = `${msg}${delay ? ` ETA mới ${dt(t.eta)}.` : ''}`;
      if (to.includes('m')) notify('LOGISTICS_MANAGER', title, body, `m/trip/${t.id}/progress`);
      if (to.includes('s')) notify('TRANSPORT_SPECIALIST', title, body, `s/trip/${t.id}`);
      if (to.includes('d')) crewOf(t).forEach(([, e]) => notify(e, title, body, `d/trip/${t.id}`));
      if (to.includes('c')) notify('CUSTOMER', `Cập nhật lịch trình ${reqOfTrip(t).id}`, body);
      audit('Sent schedule alert', t.id, `${ALERT_CAUSE[cause]} • +${delay}h`); toast(`Đã gửi cảnh báo tới ${to.length} nơi nhận.`);
    },
  });
}
export function manualMilestone(id: string, k: string) {
  const t = trip(id), n = nextMilestone(t), item = MANUAL_MS.find((x) => x[0] === k)!;
  if (!n || !item[2].includes(n.type) || n.blocked) return toast('Mốc này chưa đến lượt cập nhật.');
  const s = tripStops(t)[n.stop], last = lastMilestone(t), now = nowStamp();
  openModal({
    title: `${item[1]}${s ? ' – ' + s.name : ''}`, ok: 'Ghi nhận mốc', init: { at: now.replace(' ', 'T'), note: '' },
    body: () => (<>
      <p className="subtitle">{MS_VI[n.type]}{s ? <> tại <b>{s.name}</b></> : null} cho {t.id}. Mốc được ghi là “Coordinator cập nhật thủ công”.</p>
      <Field label="Thời điểm *"><DateTimeInput name="at" /></Field>
      <Field label="Nguồn xác nhận *"><Inp name="note" placeholder="VD: Tài xế báo qua điện thoại lúc 14:05" /></Field>
    </>),
    onOk: (v) => {
      const at = String(v.at || '').replace('T', ' ');
      if (!at) return 'Chọn thời điểm.';
      if (at > now) return 'Thời điểm không được ở tương lai.';
      if (last && at < last.at) return `Phải sau mốc trước (${dt(last.at)}).`;
      if (String(v.note).trim().length < 5) return 'Ghi nguồn xác nhận (ít nhất 5 ký tự).';
      t.milestones.push({ type: n.type, stop: n.stop, at, by: me().name, note: String(v.note).trim(), manual: true });
      if (n.type === 'DEPARTED') t.status = 'IN_TRANSIT';
      if (n.type === 'ARRIVED_CHECKPOINT') notify('TRANSPORT_SPECIALIST', `${t.id} đã đến ${s.name}`, 'Ghi nhận kết quả thông quan.', `s/trip/${t.id}`);
      notify('LOGISTICS_MANAGER', `${t.id}: ${MILESTONE_LABEL[n.type]} (Điều phối)`, s ? s.name : '', `m/trip/${t.id}/progress`);
      crewOf(t).forEach(([, e]) => notify(e, `Coordinator đã cập nhật ${t.id}`, `${MS_VI[n.type]}${s ? ' – ' + s.name : ''}`, `d/trip/${t.id}`));
      audit('Recorded milestone manually', t.id, `${MS_VI[n.type]}${s ? ' – ' + s.name : ''} • ${String(v.note).trim()}`);
      toast(`Đã ghi nhận: ${MS_VI[n.type]}.`);
    },
  });
}
/** trạng thái từng nút mốc thủ công */
export function manualSteps(t: Any) {
  const n = t.status === 'IN_TRANSIT' && handover(t) ? null : nextMilestone(t);
  const why = t.status === 'PLANNING' ? 'Chuyến cần được Manager duyệt khởi hành trước.' : !n ? (handover(t) ? 'Chuyến đã đến nơi – tổ xe thực hiện bàn giao.' : 'Không còn chặng nào để cập nhật.') : '';
  return {
    n, why, steps: MANUAL_MS.map(([k, l, types]) => {
      const on = !!n && types.includes(n.type), blocked = on && n.blocked;
      const tip = !n ? why : on ? (blocked ? (n.hold || n.halted ? holdText(t) : 'Chờ Specialist ghi nhận kết quả thông quan tại cửa khẩu.') : '') : `Mốc kế tiếp là “${MS_VI[n.type]}”.`;
      return { k, l, enabled: on && !blocked, tip };
    }),
  };
}
const handover = handoverState;

// ---------- đội xe ----------
export function vehicleStatusModal(vid: string) {
  const v = vehicle(vid), busy = db.trips.find((t: Any) => tripVehicleIds(t).includes(vid) && ACTIVE_TRIP.includes(t.status));
  openModal({
    title: `Đổi trạng thái của ${v.plate}`, ok: 'Lưu', init: { st: v.status, note: v.note || '' },
    body: () => (<>
      <Field label="Trạng thái *"><Sel name="st" options={['READY', 'MAINTENANCE', 'INACTIVE'].map((x) => [x, human(x)] as [string, string])} /></Field>
      <Field label="Ghi chú"><Inp name="note" /></Field>
      {busy ? <div className="note yellow"><Icon name="alert" /><div><b>Đã phân cho {busy.id}</b>Chuyển sang ngừng hoạt động sẽ đánh dấu chuyến đó cần xe mới.</div></div> : null}
    </>),
    onOk: (x) => { v.status = x.st; v.note = x.note; audit('Changed vehicle status', v.plate, human(v.status)); toast('Đã lưu trạng thái xe.'); },
  });
}
export function equipmentAdd() {
  const bases = db.cities.filter((c: Any) => ['VN', 'JP'].includes(c[1])).map((c: Any) => [c[0], cityLabel(c[0])] as [string, string]);
  openModal({
    title: 'Thêm phương tiện chuyên dụng', ok: 'Thêm', init: { kind: 'TRUCK', code: '', stalls: '2', model: '', base: bases[0]?.[0] || '', status: 'READY', next: '', feat: '' },
    body: () => (<>
      <Field label="Loại *"><Sel name="kind" options={[['TRUCK', 'Xe tải chở ngựa']]} /></Field>
      <div className="form-grid"><Field label="Biển số / mã *"><Inp name="code" /></Field><Field label="Số ô (stalls) *"><Inp name="stalls" type="number" min="1" max="8" /></Field></div>
      <Field label="Model / mô tả *"><Inp name="model" /></Field>
      <div className="form-grid"><Field label="Căn cứ *"><Sel name="base" options={bases} /></Field><Field label="Trạng thái *"><Sel name="status" options={[['READY', 'Sẵn sàng'], ['MAINTENANCE', 'Bảo dưỡng'], ['INACTIVE', 'Ngừng sử dụng']]} /></Field></div>
      <div className="form-grid"><Field label="Hạn kiểm định / bảo dưỡng"><div><DateInput name="next" /></div></Field><Field label="Trang bị"><Inp name="feat" /></Field></div>
    </>),
    onOk: (v) => {
      const code = String(v.code).trim(), model = String(v.model).trim(), stalls = Number(v.stalls);
      if (code.length < 3 || model.length < 3) return 'Nhập biển số/mã và model.';
      if (!(stalls >= 1 && stalls <= 8)) return 'Số ô từ 1 đến 8.';
      if (db.vehicles.some((x: Any) => x.plate === code)) return 'Biển số/mã này đã có trong danh sách.';
      const SPEC: Record<number, Any> = { 2: { heightM: 3.4, widthM: 2.4, lengthM: 8.5, grossT: 11 }, 3: { heightM: 3.6, widthM: 2.5, lengthM: 10, grossT: 15 }, 4: { heightM: 3.8, widthM: 2.5, lengthM: 12, grossT: 18 }, 6: { heightM: 4, widthM: 2.5, lengthM: 16.5, grossT: 26 } };
      db.vehicles.push({ id: nextId('VH'), plate: code, model, stalls, status: v.status, base: v.base, country: city(v.base)[1], nextService: v.next || '—', odometer: 0, features: v.feat || '—', spec: { ...(SPEC[stalls] || SPEC[stalls >= 6 ? 6 : stalls >= 4 ? 4 : 2]) } });
      audit('Added transport equipment', code, `Xe tải chở ngựa • ${model}`); toast(`Đã thêm ${code}.`);
    },
  });
}
// ---------- nhân sự ----------
export const STAFF_LABELS: Record<string, string> = { ACTIVE: 'Đang làm việc', ON_LEAVE: 'Tạm nghỉ', INACTIVE: 'Ngừng làm việc' };
export function staffStatus(id: string) {
  const e = emp(id); if (!e) return;
  const assigned = () => db.trips.filter((t: Any) => ACTIVE_TRIP.includes(t.status) && tripPersonnelIds(t).includes(id));
  openModal({
    title: `Trạng thái nhân sự · ${e.name}`, ok: 'Lưu trạng thái', init: { st: e.status },
    body: () => (<>
      <Field label="Trạng thái"><Sel name="st" options={Object.entries(STAFF_LABELS)} /></Field>
      {assigned().length ? <p className="hint">Đang được gán: {assigned().map((t: Any) => t.id).join(', ')}. Nếu đang vận chuyển, cần hoàn tất thay người qua luồng sự cố trước.</p> : null}
    </>),
    onOk: (v) => {
      const value = v.st; if (!STAFF_LABELS[value]) return 'Trạng thái không hợp lệ.';
      if (value !== 'ACTIVE' && assigned().some((t: Any) => t.status === 'IN_TRANSIT')) return 'Nhân viên đang vận chuyển. Thay nhân sự qua luồng sự cố trước khi cho nghỉ/ngừng làm việc.';
      const old = e.status; e.status = value; e.statusAt = nowStamp(); e.statusBy = me().name;
      if (old !== value) assigned().forEach((t: Any) => { t.resourcesConfirmed = null; notify('LOGISTICS_MANAGER', `${e.name}: ${STAFF_LABELS[value]}`, `${t.id} cần kiểm tra lại nhân sự.`, `m/trip/${t.id}/prepare`); });
      audit('Changed employee status', id, `${old} → ${value}`);
    },
  });
}
// ---------- thông báo ----------
export function notifOpen(id: string) {
  const n = db.notifications.find((x: Any) => x.id === id); if (!n) return;
  n.read = true; if (n.go) go(n.go); commit();
}

// ============================================================================
// Nút demo: mô phỏng quyết định của Logistics Manager để trình diễn luồng lập kế hoạch
// ============================================================================
function demoPickTrip(test: (t: Any) => boolean, current?: string) { const c = current ? trip(current) : null; return c && test(c) ? c : db.trips.find(test); }
function demoDeploy(t: Any) {
  t.deployment = { ...t.deployment, status: 'CONFIRMED', at: nowStamp(), by: DEMO_MGR[0], note: 'Xác nhận demo', assignees: t.deployment.assignees || { coordinator: db.users.coordinator.id, specialist: db.users.specialist.id } };
  notify('FLEET_COORDINATOR', `Lập tuyến và nguồn lực cho ${t.id}`, `${tripLabel(t)} • khởi hành ${dt(t.plannedDepart)}`, `f/trip/${t.id}`);
  notify('TRANSPORT_SPECIALIST', `Chuẩn bị hồ sơ cho ${t.id}`, `${tripLabel(t)} • khởi hành ${dt(t.plannedDepart)}`, `s/trip/${t.id}`);
  db.audit.unshift({ at: nowStamp(), actor: DEMO_MGR[0], role: DEMO_MGR[1], action: 'Confirmed deployment', entity: t.id, detail: 'Demo' });
}
function demoApprove(t: Any) {
  const rt = curRoute(t);
  if (t.mode === 'AIR') approveAirPlan(t, DEMO_MGR[0]);
  else rt.resourceSnapshot = { at: nowStamp(), signature: resourceSignature(t) };
  rt.status = 'APPROVED'; rt.decidedAt = nowStamp(); rt.decidedBy = DEMO_MGR[0]; rt.note = 'Quản lý đã duyệt.';
  notify('FLEET_COORDINATOR', `Tuyến ${t.id} v${rt.v} đã được duyệt`, '', `f/trip/${t.id}`);
  db.audit.unshift({ at: nowStamp(), actor: DEMO_MGR[0], role: DEMO_MGR[1], action: 'Approved route', entity: t.id, detail: `Version ${rt.v} (demo)` });
}
function demoReturn(t: Any, note: string) {
  const rt = curRoute(t);
  rt.status = 'RETURNED'; rt.decidedAt = nowStamp(); rt.decidedBy = DEMO_MGR[0]; rt.note = note;
  notify('FLEET_COORDINATOR', `Tuyến ${t.id} v${rt.v} bị trả lại`, rt.note, `f/trip/${t.id}`);
  db.audit.unshift({ at: nowStamp(), actor: DEMO_MGR[0], role: DEMO_MGR[1], action: 'Returned route', entity: t.id, detail: rt.note });
}
export function coordDemo(what: string, current?: string) {
  if (what === 'deploy') {
    const t = demoPickTrip((x) => x.status === 'PLANNING' && x.deployment.status === 'NOT_CONFIRMED', current);
    if (!t) return toast('Không có chuyến nào đang chờ xác nhận triển khai.');
    demoDeploy(t); toast(`Demo: Quản lý đã xác nhận triển khai ${t.id}. Có thể bắt đầu lập tuyến.`); return;
  }
  if (what === 'ready') return toast('Không có yêu cầu nào đã xác minh tiền cọc đang chờ ký (hoặc hợp đồng đã ký đang chờ tiền cọc), nên không thể kích hoạt chuyến mới. Dùng “Quản lý xác nhận triển khai chuyến” cho chuyến hiện có.');
  const t = demoPickTrip((x) => canPlan(x) && routeState(x) === 'PENDING_APPROVAL', current);
  if (!t) return toast('Không có tuyến nào đang chờ Quản lý duyệt. Hãy gửi một phiên bản tuyến trước.');
  if (what === 'approve') {
    const missing = horseCountError(reqOfTrip(t));
    if (missing || (t.mode !== 'AIR' && (!t.resourcesConfirmed || resourceGaps(t).length))) return toast(missing || 'Cần xác nhận đủ xe và nhân sự trước khi duyệt.');
    demoApprove(t); toast(`Demo: Quản lý đã duyệt tuyến ${t.id} v${curRoute(t).v}.`); return;
  }
  if (what === 'return') { demoReturn(t, 'Vui lòng thêm điểm nghỉ trước chặng dài nhất và xác nhận giờ đến dự kiến tại điểm giao.'); toast(`Demo: Quản lý đã trả lại tuyến ${t.id} v${curRoute(t).v} kèm góp ý.`); }
}

// ---------- kịch bản demo "Kế hoạch trống → Manager duyệt" (TRP-DEMO-F3) ----------
export const EMPTY_PLAN_ID = 'TRP-DEMO-F3';
function demoPlace(id: string, name: string, lat: number, lng: number) {
  if (!placeById(id)) db.places.push({ id, name, type: 'SERVICE', country: 'VN', province: name, address: 'Cơ sở giả lập để trình bày luồng', lat, lng, functions: ['REST'], hours: '24/7', status: 'ACTIVE', contact: 'Nhân sự Demo', phone: '—', sample: true, demoFlow3: true, updatedAt: nowStamp(), notes: 'Chỉ dữ liệu demo', rest: { truckParking: true, onboardCare: true, waterFeed: true, loadingArea: true, stabling: true, capacity: 4 } });
  return placeById(id);
}
function demoFill(): string {
  const t = trip(EMPTY_PLAN_ID), prev = curRoute(t), r = reqOfTrip(t);
  if (!canPlan(t) || (prev && !['DRAFT', 'RETURNED'].includes(prev.status))) return 'Phương án đã gửi/duyệt đang khóa.';
  if (prev?.status === 'DRAFT' && prev.stops.length > 2) return 'Bản nháp đã có dữ liệu. Tự chỉnh hoặc đặt lại kịch bản trước khi điền lại.';
  const qn = demoPlace('PL-DEMO-F3-QN', 'Quy Nhơn · Trại nghỉ Demo 24/7', 13.783, 109.219), nt = demoPlace('PL-DEMO-F3-NT', 'Nha Trang · Trại nghỉ Demo 24/7', 12.2388, 109.1967);
  const cn = demoPlace('PL-DEMO-F3-CN', 'Cà Ná · Điểm nghỉ Demo 24/7', 11.34, 108.88), sh = demoPlace('PL-DEMO-F3-SH', 'Sa Huỳnh · Điểm nghỉ Demo 24/7', 14.63, 109.05);
  const POL = ROUTE_POLICY;
  const rest = (p: Any, long = false) => ({ name: p.name, type: 'REST_STOP', plannedAt: '', placeId: p.id, lat: p.lat, lng: p.lng, required: false, purposes: ['REST'], dwellMin: long ? POL.recoveryRestH * 60 : Math.max(45, POL.shortRestMin), unload: long, careNote: long ? 'Xuống xe, nghỉ hồi phục, kiểm tra sức khỏe và bổ sung nước/thức ăn (mẫu).' : 'Nghỉ chăm sóc, kiểm tra ngựa và bổ sung nước/thức ăn (mẫu).' });
  const rt = prev?.status === 'DRAFT' ? prev : { v: (prev?.v || 0) + 1, status: 'DRAFT', submittedAt: null, decidedAt: null, note: 'Phương án mẫu cho demo Flow 3', stops: [] as Any[] };
  if (rt !== prev) t.routes.push(rt);
  rt.stops = [stop(r.pickup.name, 'ORIGIN', t.plannedDepart), rest(placeById('PL-114')), rest(sh), rest(qn, true), rest(placeById('PL-115')), rest(nt, true), rest(cn), rest(placeById('PL-111')), rest(placeById('PL-110')), stop(r.delivery.name, 'DESTINATION', t.eta)];
  // nguồn lực mẫu
  if (!vehicle('VH-DEMO-F3')) db.vehicles.push({ ...clone(db.vehicles.find((v: Any) => fleetCountry(v) === 'VN' && v.status === 'READY')), id: 'VH-DEMO-F3', plate: 'DEMO-F3', model: 'Xe chở ngựa mẫu', country: 'VN', base: 'Da Nang', status: 'READY', stalls: 4, demoFlow3: true });
  t.vehicleId = 'VH-DEMO-F3'; t.crew = {};
  for (const [role, suffix, name] of [['MAIN_DRIVER', 'MAIN', 'Tài xế chính'], ['CO_DRIVER', 'CO', 'Phụ lái'], ['VETERINARIAN', 'VET', 'Bác sĩ thú y']]) {
    const id = 'EMP-DEMO-F3-' + suffix;
    if (!emp(id)) db.employees.push({ ...clone(db.employees.find((e: Any) => e.country === 'VN' && (role === 'VETERINARIAN' ? isVet(e) : isDriver(e)))), id, name: name + ' (Demo)', country: 'VN', serviceAreas: ['VN', 'Da Nang', 'Ho Chi Minh City'], role: role === 'VETERINARIAN' ? 'ESCORT' : 'DRIVER', position: role === 'VETERINARIAN' ? 'VETERINARIAN' : 'DRIVER', certExpiry: '2035-12-31', status: 'ACTIVE', avail: { status: 'AVAILABLE', from: '', to: '', note: '' }, demoFlow3: true });
    t.crew[role] = id;
  }
  t.resourcesConfirmed = null;
  rpEnsure(t, rt); RP(t.id).routing = { status: 'idle' }; rpRoute(t, true);
  const calc = rpCalc(t);
  if (!calc || calc.issues.length) return 'Phương án mẫu cần rà soát theo cấu hình hiện tại: ' + JSON.stringify(calc?.issues || []);
  rpWriteTimes(t, rt, calc); RP(t.id).routing.key = rpRouteKey(t, rt);
  audit('Demo filled route and resources', t.id, 'v' + rt.v + '; not confirmed or submitted');
  return '';
}
function demoBlank() {
  return { id: EMPTY_PLAN_ID, requestId: 'TRN-DEMO-F3', demoFlow3: true, mode: 'ROAD', status: 'PLANNING', createdAt: '2026-10-27', transit: [],
    deployment: { status: 'CONFIRMED', at: '2026-10-27 09:00', by: DEMO_MGR[0], note: 'Triển khai sẵn cho demo lập kế hoạch', assignees: { coordinator: db.users.coordinator.id, specialist: db.users.specialist.id } },
    plannedDepart: '2026-11-05 05:00', eta: '2026-11-07 17:00', deliveryDeadline: '2026-11-08 23:59', vehicleId: null, crew: {}, insurance: null, routes: [], milestones: [], health: [], handover: null, flight: null, resourcesConfirmed: null };
}
export function emptyPlanDemo(action: string) {
  const t = trip(EMPTY_PLAN_ID); if (!t) return toast('Không tìm thấy kế hoạch demo.');
  if (action === 'open') return go(`f/trip/${EMPTY_PLAN_ID}/route`);
  if (action === 'fill') { const err = demoFill(); if (err) return toast(err); go(`f/trip/${EMPTY_PLAN_ID}/route`); commit(); return; }
  if (action === 'confirm') return resourceConfirm(EMPTY_PLAN_ID);
  if (action === 'submit') return routeSubmit(EMPTY_PLAN_ID);
  if (action === 'approve' || action === 'return') {
    if (curRoute(t)?.status !== 'PENDING_APPROVAL') return toast('Gửi phương án trước khi mô phỏng quyết định Manager.');
    const rt = curRoute(t);
    if (action === 'approve') return confirmAction(`Duyệt tuyến phiên bản ${rt.v}?`, 'Mô phỏng quyết định của Quản lý vận hành. Chuyến vẫn đang chuẩn bị, chưa được phép khởi hành.', 'Duyệt tuyến', () => { demoApprove(t); toast(`Demo: Quản lý đã duyệt tuyến ${t.id} v${rt.v}.`); });
    return openModal({
      title: `Trả lại tuyến phiên bản ${rt.v}`, ok: 'Trả lại điều phối viên', init: { reason: '' },
      body: () => <Field label="Góp ý *"><Txt name="reason" placeholder="Cần thay đổi gì?" /></Field>,
      onOk: (v) => { if (String(v.reason).trim().length < 5) return 'Nhập góp ý (ít nhất 5 ký tự).'; demoReturn(t, String(v.reason).trim()); },
    });
  }
  if (action === 'reset') return openModal({
    title: 'Đặt lại riêng kế hoạch Demo?', ok: 'Đặt lại kế hoạch trống',
    body: () => <p>Xóa kế hoạch của TRP-DEMO-F3 để trình bày lại từ đầu. Các chuyến khác được giữ nguyên.</p>,
    onOk: () => {
      Object.keys(t).forEach((k) => delete t[k]); Object.assign(t, demoBlank()); delete rpState[EMPTY_PLAN_ID];
      db.notifications.filter((n: Any) => String(n.go || '').includes(EMPTY_PLAN_ID)).forEach((n: Any) => { n.read = true; });
      audit('Reset isolated Flow 3 demo', EMPTY_PLAN_ID, 'Empty planning fixture'); go(`f/trip/${EMPTY_PLAN_ID}/route`);
    },
  });
}
