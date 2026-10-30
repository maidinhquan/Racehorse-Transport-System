// ============================================================================
// Dịch vụ bay & đối tác: CBN thuê bên dịch vụ máy bay. Điều phối quản lý danh mục đối tác;
// tuyến và lịch bay là dữ liệu mẫu do đối tác cung cấp (chỉ tra cứu). Không kết nối API hãng bay.
// Điều phối nhập mã chuyến bay → gửi Manager duyệt → được duyệt thì ghi nhận booking.
// ============================================================================
import { Cell, Chk, Field, Inp, Txt } from '../components/common/ui';
import { DateTimeInput } from '../components/forms/DateTime';
import { assignedOperator, canPlan, crewOf, curRoute, groundCountry, groundLegCheck, groundLegName, opsBlock, placeById, reqOfTrip, trip, tripHorses } from '../domain/coordinatorRules';
import type { Any } from '../store/coordinatorStore';
import { audit, commit, confirmAction, db, me, notify, nowStamp, openModal, toast } from '../store/coordinatorStore';
import { cityLabel, dt, MILESTONE_LABEL, usd } from '../utils/format';
import { resourceSignature, ROUTE_POLICY, rpCalc, rpDeadline, rpEnsure, rpWriteTimes, validateRoute } from './routePlanner';

export const SYSTEM_ZONE = 'Asia/Ho_Chi_Minh';
export const ZONES = ['Asia/Ho_Chi_Minh', 'Asia/Phnom_Penh', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Tokyo', 'Asia/Dubai', 'Australia/Sydney', 'Europe/London'];
export const AIR_STATUS: Record<string, string> = { DRAFT: 'Bản nháp · Chưa gửi duyệt', BUDGET_PENDING: 'Chờ Manager duyệt', BUDGET_APPROVED: 'Đã duyệt · Chờ đối tác xác nhận', BOOKED: 'Đã xác nhận đặt chỗ', REJECTED: 'Cần chọn lại phương án' };
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const entity = (list: Any[], id: string) => list.find((x: Any) => x.id === id);
const air = () => db.air;

export const airportLabel = (id: string) => { const p = placeById(id); return p ? `${p.name}${p.airport?.iata ? ' · ' + p.airport.iata : ''}` : 'Sân bay không còn trong danh mục'; };
export const goodAirport = (id: string) => { const p = placeById(id); return p?.status === 'ACTIVE' && p.functions?.includes('AIRPORT') && p.airport?.horseHandling; };

function localParts(ms: number, zone: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms)).filter((x) => x.type !== 'literal').map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}
export function instant(value: string, zone = SYSTEM_ZONE): number | null {
  const normalized = String(value || '').replace('T', ' ');
  const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2}) ([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  const target = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  if (new Date(target).toISOString().slice(0, 16).replace('T', ' ') !== normalized) return null;
  let guess = target;
  try {
    for (let i = 0; i < 4; i++) { const display = localParts(guess, zone); const delta = Date.parse(display.replace(' ', 'T') + 'Z') - target; guess -= delta; if (!delta) break; }
    return localParts(guess, zone) === normalized ? guess : null;
  } catch { return null; }
}
const systemStamp = (value: string, zone: string) => { const ms = instant(value, zone); return ms == null ? null : localParts(ms, SYSTEM_ZONE); };
export const LocalTime = ({ value, zone }: { value: string; zone: string }) => <>{dt(value)} <small className="fa-zone">{zone}</small></>;
export const countHorses = (t: Any) => Math.max(1, tripHorses(t).length);

export function resolved(id: string) {
  const s = entity(air().schedules, id), r = s && entity(air().routes, s.routeId), p = r && entity(air().partners, r.partnerId);
  return s && r && p ? { schedule: s, airRoute: r, partner: p } : null;
}
function snapshot(v: Any) {
  const { schedule: s, airRoute: r, partner: p } = v;
  return { partnerId: p.id, partnerName: p.name, contact: p.contact, phone: p.phone, email: p.email, routeId: r.id, serviceId: s.id, from: r.from, to: r.to, fromName: airportLabel(r.from), toName: airportLabel(r.to),
    airline: s.airline, flightNo: s.flightNo, externalCode: s.externalCode, departLocal: s.departLocal, arriveLocal: s.arriveLocal, departZone: s.departZone, arriveZone: s.arriveZone,
    departAt: systemStamp(s.departLocal, s.departZone), arriveAt: systemStamp(s.arriveLocal, s.arriveZone), capacity: s.capacity, cost: s.cost, careIncluded: r.careIncluded, sample: !!s.sample, capturedAt: nowStamp() };
}
export const providerSignature = (f: Any) => JSON.stringify(f ? [f.serviceId || '', f.from, f.to, f.flightNo, f.departAt, f.arriveAt, f.stalls, f.cost, f.serviceSnapshot?.partnerId || ''] : null);
export const planSignature = (t: Any) => JSON.stringify([resourceSignature(t), providerSignature(t.flight)]);

export function serviceIssues(t: Any, v: Any, checkDraft = true) {
  const issues: string[] = [];
  if (!v) return ['Dịch vụ bay không còn trong danh mục.'];
  const { schedule: s, airRoute: r, partner: p } = v;
  if (p.status !== 'ACTIVE') issues.push('Đối tác đã ngừng hợp tác.');
  if (r.status !== 'ACTIVE') issues.push('Tuyến bay đã ngừng sử dụng.');
  if (s.status !== 'AVAILABLE') issues.push('Đối tác chưa thông báo có thể tiếp nhận chuyến này.');
  if (!goodAirport(r.from) || !goodAirport(r.to)) issues.push('Sân bay chưa đáp ứng tiếp nhận ngựa hoặc đang tạm ngừng.');
  if (t) {
    if (t.mode !== 'AIR') issues.push('Phương thức hợp đồng không có chặng bay.');
    if (placeById(r.from)?.country !== groundCountry(t, 'outbound') || placeById(r.to)?.country !== groundCountry(t, 'inbound')) issues.push('Tuyến không khớp quốc gia nhận/giao của Trip.');
    if (s.capacity < countHorses(t)) issues.push(`Khả năng tiếp nhận ${s.capacity} ngựa, cần ${countHorses(t)}.`);
    const dep = instant(s.departLocal, s.departZone), arr = instant(s.arriveLocal, s.arriveZone);
    const start = instant(t.plannedDepart), deadline = rpDeadline(t);
    if (dep == null || arr == null || arr <= dep) issues.push('Ngày giờ hoặc múi giờ chuyến bay không hợp lệ.');
    if (start != null && dep != null && dep < start + ROUTE_POLICY.airportHandoverH * 3600000) issues.push('Không đủ thời gian trước bay tính từ lúc nhận ngựa; còn phải kiểm tra quãng đường xe.');
    if (deadline && arr != null && arr + ROUTE_POLICY.airportReceiveH * 3600000 > (instant(deadline) as number)) issues.push('Giờ đến và tiếp nhận đã vượt hạn giao, chưa kể đường xe sau bay.');
    if (checkDraft) { const rt = curRoute(t); if (rt && !['DRAFT', 'RETURNED'].includes(rt.status)) issues.push('Phương án đã gửi/duyệt đang khóa; tạo bản điều chỉnh trước.'); }
  }
  return issues;
}
export function editableTrip(t: Any, planning = true) {
  if (!t || t.mode !== 'AIR') return 'Trip không có chặng hàng không.';
  const block = opsBlock(t, planning); if (block) return block;
  if (planning && !canPlan(t)) return 'Chỉ chỉnh dịch vụ bay khi chuyến đang lập kế hoạch.';
  return '';
}
export function checkDraft(t: Any) {
  const block = editableTrip(t); if (block) return block;
  if (t.flight?.status === 'BOOKED') return 'Booking đã xác nhận được giữ nguyên; thay đổi phải xử lý theo quy trình điều chỉnh.';
  if (t.flight && !['DRAFT', 'REJECTED'].includes(t.flight.status)) return 'Phương án đang chờ hoặc đã được duyệt; không sửa đè nội dung.';
  if (curRoute(t) && !['DRAFT', 'RETURNED'].includes(curRoute(t).status)) return 'Tạo phiên bản tuyến nháp trước khi đổi dịch vụ bay.';
  return '';
}
export function planningGaps(t: Any) {
  const issues: string[] = [];
  ['outbound', 'inbound'].forEach((k) => { const c = groundLegCheck(t, k); if (!c.vehicleOk) issues.push(`${groundLegName(k)}: xe chưa phù hợp hoặc trùng lịch.`); if (!c.crewOk) issues.push(`${groundLegName(k)}: nhân sự chưa đủ điều kiện hoặc trùng lịch.`); });
  const f = t.flight;
  if (!f || !['DRAFT', 'BUDGET_PENDING', 'BUDGET_APPROVED', 'BOOKED'].includes(f.status)) issues.push('Chưa có phương án bay được chọn để xét duyệt.');
  if (f?.serviceId && f.status !== 'BOOKED') issues.push(...serviceIssues(t, resolved(f.serviceId), false));
  if (f?.serviceId && f.serviceSnapshot && f.status !== 'BOOKED' && resolved(f.serviceId)) {
    const latest: Any = snapshot(resolved(f.serviceId));
    if (['from', 'to', 'flightNo', 'departAt', 'arriveAt', 'cost', 'airline'].some((k) => latest[k] !== f.serviceSnapshot[k])) issues.push('Thông tin dịch vụ đã đổi trong danh mục; cập nhật bản nháp trước khi gửi/duyệt.');
  }
  if (f && (!f.departAt || !f.arriveAt || (instant(f.arriveAt) as number) <= (instant(f.departAt) as number) || f.stalls < countHorses(t))) issues.push('Lịch hoặc số chỗ phương án bay không phù hợp.');
  return [...new Set(issues)];
}
export function selectService(t: Any, id: string) {
  const block = checkDraft(t); if (block) return block;
  const v = resolved(id), issues = serviceIssues(t, v); if (issues.length) return issues.join(' ');
  const snap = snapshot(v);
  t.flightHistory = t.flightHistory || [];
  if (t.flight) t.flightHistory.push({ ...clone(t.flight), archivedAt: nowStamp(), reason: 'Chọn lại dịch vụ trong bản nháp, chưa booking.' });
  t.flight = { status: 'DRAFT', direct: true, airline: snap.airline, flightNo: snap.flightNo, from: snap.from, to: snap.to, departAt: snap.departAt, arriveAt: snap.arriveAt, stalls: countHorses(t), cost: snap.cost, milestones: [],
    serviceId: id, serviceSnapshot: snap, selectedAt: nowStamp(), selectedBy: me().name };
  t.resourcesConfirmed = null; t.resourcesPlanned = null; delete t.flightSupplyIssue;
  const rt = curRoute(t);
  if (rt) {
    const a = rt.stops.filter((s: Any) => s.type === 'AIRPORT');
    if (a.length === 2) [snap.from, snap.to].forEach((pid, i) => { const p = placeById(pid); Object.assign(a[i], { cp: pid, placeId: pid, name: p.name, lat: p.lat, lng: p.lng, required: true, purposes: ['AIRPORT'], dwellMin: 0 }); delete a[i].placeSnapshot; });
    delete rt.airCareConfirmation; delete rt.scheduleSnapshot; delete rt.routingSnapshot; delete rt.metrics; delete rt.geom;
  }
  audit('Selected air service draft', t.id, `${snap.partnerName} · ${snap.flightNo}`);
  return '';
}
export function used(kind: string, id: string) {
  if (kind === 'partners') return air().routes.some((r: Any) => r.partnerId === id);
  if (kind === 'routes') return air().schedules.some((s: Any) => s.routeId === id);
  return db.trips.some((t: Any) => t.flight?.serviceId === id || t.flightHistory?.some((f: Any) => f.serviceId === id));
}
export const airBadge = (status: string): [string, string] => [status === 'ACTIVE' || status === 'AVAILABLE' ? 'READY' : 'PENDING', ({ ACTIVE: 'Đang sử dụng', INACTIVE: 'Ngừng sử dụng', AVAILABLE: 'Đối tác thông báo có thể tiếp nhận', UNAVAILABLE: 'Chưa thể tiếp nhận' } as Record<string, string>)[status]];
export const myAirTrips = () => db.trips.filter((t: Any) => t.mode === 'AIR' && assignedOperator(t, 'coordinator'));

// ---------- danh mục đối tác (chỉ đối tác được sửa; tuyến/lịch bay chỉ tra cứu) ----------
export function partnerEdit(id = '') {
  const item = id ? entity(air().partners, id) : null; if (id && !item) return toast('Không tìm thấy dữ liệu.');
  const linked = !!item && used('partners', id);
  openModal({
    title: `${item ? 'Cập nhật' : 'Thêm'} đối tác hàng không`, wide: true, ok: 'Lưu danh mục',
    init: { name: item?.name || '', contact: item?.contact || '', email: item?.email || '', phone: item?.phone || '', services: item?.services || '' },
    body: () => (<>
      <Field label="Tên đối tác *"><Inp name="name" /></Field>
      <div className="form-grid">
        <Field label="Người/bộ phận liên hệ *"><Inp name="contact" /></Field>
        <Field label="Email"><Inp name="email" type="email" /></Field>
        <Field label="Điện thoại"><Inp name="phone" /></Field>
      </div>
      <Field label="Phạm vi dịch vụ *"><Txt name="services" placeholder="Tuyến phục vụ, tiếp nhận ngựa, chăm sóc và phối hợp sân bay" /></Field>
      {linked ? <p className="fa-warning">Đã được tham chiếu. Chỉ cập nhật thông tin danh mục cho lần dùng sau; không sửa snapshot hợp đồng hoặc Trip đã chọn.</p> : null}
    </>),
    onOk: (v) => {
      const data: Any = { name: String(v.name).trim(), contact: String(v.contact).trim(), email: String(v.email).trim(), phone: String(v.phone).trim(), services: String(v.services).trim(), status: item?.status || 'ACTIVE', updatedAt: nowStamp() };
      if (data.name.length < 3 || data.contact.length < 3 || data.services.length < 5) return 'Nhập tên, liên hệ và phạm vi dịch vụ rõ ràng.';
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Email không hợp lệ.';
      if (air().partners.some((p: Any) => p.id !== id && p.name.toLowerCase() === data.name.toLowerCase())) return 'Đối tác đã có trong danh mục.';
      if (item) Object.assign(item, data); else air().partners.push({ id: `AP-${Date.now().toString(36)}`, sample: false, ...data });
      audit('Updated air service catalogue', 'partners', item?.id || data.name);
      toast('Đã lưu danh mục trên trình duyệt. Các bản đã chọn/phát hành không bị sửa.');
    },
  });
}
export function partnerStatus(id: string) {
  const item = entity(air().partners, id); if (!item) return;
  confirmAction(item.status === 'INACTIVE' ? 'Kích hoạt lại dữ liệu?' : 'Ngừng sử dụng dữ liệu này?', 'Không xóa lịch sử hoặc sửa thông tin đã ghi trong hợp đồng/Trip. Kiểm tra những booking chưa chốt nếu đối tác thay đổi khả năng phục vụ.', 'Xác nhận',
    () => { item.status = item.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE'; item.updatedAt = nowStamp(); audit('Changed air catalogue status', id, item.status); });
}
export function partnerDelete(id: string) {
  const item = entity(air().partners, id); if (!item) return;
  if (used('partners', id)) return toast('Dữ liệu đã được tham chiếu; chỉ được ngừng sử dụng.');
  confirmAction('Xóa bản ghi chưa được sử dụng?', 'Chỉ xóa dữ liệu chưa có tham chiếu trong bản HTML demo.', 'Xóa bản ghi', () => { air().partners.splice(air().partners.indexOf(item), 1); });
}

// ---------- chọn dịch vụ: nhập mã chuyến bay + chọn bên dịch vụ ----------
const findCode = (code: string) => { const q = String(code || '').trim().toLowerCase(); return q ? air().schedules.filter((x: Any) => [x.externalCode, x.flightNo, x.id].some((k) => String(k || '').toLowerCase() === q)).map((x: Any) => resolved(x.id)).filter(Boolean) : []; };
const draftEditable = (t: Any) => !!t && canPlan(t) && !opsBlock(t, true) && (!curRoute(t) || curRoute(t).status === 'DRAFT');
function ServiceResult({ t, pid, code }: { t: Any; pid: string; code: string }) {
  const p = air().partners.find((x: Any) => x.id === pid);
  if (!p) return <p className="hint">Chọn bên dịch vụ ở cột bên phải.</p>;
  if (!code) return <p className="hint">Nhập mã chuyến bay bên dịch vụ cung cấp.</p>;
  const hits = findCode(code), v: Any = hits.find((x: Any) => x.partner.id === pid);
  if (!v) return <p className="f3-warning">{hits.length ? `Mã “${code}” thuộc ${(hits[0] as Any).partner.name}, không phải bên dịch vụ đang chọn.` : `Mã “${code}” không có trong dữ liệu của ${p.name}.`}</p>;
  const f = v.schedule, r = v.airRoute, issues = serviceIssues(t, v);
  return (
    <div className="svc-flight"><b>{f.flightNo} · {f.airline}</b>
      <div className="kv">
        <div><span>Sân bay</span><b>{placeById(r.from)?.name || r.from} → {placeById(r.to)?.name || r.to}</b></div>
        <div><span>Khởi hành</span><b>{f.departLocal} · {f.departZone}</b></div>
        <div><span>Đến</span><b>{f.arriveLocal} · {f.arriveZone}</b></div>
        <div><span>Số ngựa nhận</span><b>{f.capacity}</b></div>
        <div><span>Chi phí</span><b>{usd(f.cost)}</b></div>
        <div><span>Chăm sóc</span><b style={{ whiteSpace: 'normal' }}>{r.careIncluded ? 'Có chăm sóc ngựa trên chuyến bay' : 'Cần thỏa thuận riêng'}</b></div>
      </div>
      {issues.length ? <p className="f3-warning">{issues.map((x, k) => <span key={k}>{k ? <br /> : null}{x}</span>)}</p> : <p className="t-ok">Phù hợp hành trình, lịch và số ngựa.</p>}
    </div>
  );
}
export function serviceSelect(id: string) {
  const t = trip(id);
  if (!draftEditable(t)) return toast('Chỉ Điều phối chọn dịch vụ khi Trip còn lập kế hoạch (bản tuyến nháp).');
  if (t.flight && !['DRAFT', 'REJECTED'].includes(t.flight.status)) return toast('Phương án đã gửi/duyệt/booking không sửa đè. Dùng “Lập bản điều chỉnh” nếu cần đổi.');
  const ps = air().partners.filter((p: Any) => p.status === 'ACTIVE');
  const pre = t.flight?.serviceSnapshot?.partnerId && ps.some((p: Any) => p.id === t.flight.serviceSnapshot.partnerId) ? t.flight.serviceSnapshot.partnerId : '';
  const oc = groundCountry(t, 'outbound'), ic = groundCountry(t, 'inbound');
  const samples = air().schedules.map((x: Any) => resolved(x.id)).filter((v: Any) => v && v.partner.status === 'ACTIVE')
    .map((v: Any) => ({ v, same: placeById(v.airRoute.from)?.country === oc && placeById(v.airRoute.to)?.country === ic, ok: !serviceIssues(t, v).length }))
    .sort((a: Any, b: Any) => b.ok - a.ok || b.same - a.same).slice(0, 8);
  openModal({
    title: `Chọn dịch vụ bay · ${id}`, ok: 'Lưu vào bản nháp', wide: true,
    init: { code: t.flight?.serviceSnapshot?.externalCode || '', pid: pre },
    body: (fm) => (<>
      <p className="hint">{Math.max(1, tripHorses(t).length)} ngựa · {cityLabel(reqOfTrip(t).origin)} → {cityLabel(reqOfTrip(t).destination)} · khởi hành {dt(t.plannedDepart)}. Dữ liệu mẫu, không kết nối API hãng bay.{t.id === 'TRP-DEMO-AIR' ? ' Mã mẫu cho Trip này: Pegasus Bloodstock Air · PBA-DEMO-01.' : ''}</p>
      <div className="svc-grid">
        <div className="svc-left">
          <Field label="Mã chuyến bay *"><Inp name="code" autoComplete="off" placeholder="Mã bên dịch vụ cung cấp" /></Field>
          <div id="svc-result"><ServiceResult t={t} pid={fm.v.pid} code={String(fm.v.code || '')} /></div>
          <div className="svc-samples"><b>Mã mẫu để nhập thử</b>
            {samples.map(({ v, ok, same }: Any) => (
              <button type="button" key={v.schedule.id} className="svc-sample" onClick={() => { fm.set('pid', v.partner.id); fm.set('code', v.schedule.externalCode || v.schedule.flightNo); }}>
                <code>{v.schedule.externalCode || v.schedule.flightNo}</code>
                <span>{v.partner.name} · {placeById(v.airRoute.from)?.airport?.iata || ''}→{placeById(v.airRoute.to)?.airport?.iata || ''} · {v.schedule.departLocal.slice(0, 10)}</span>
                <em className={ok ? 'ok' : ''}>{ok ? 'Phù hợp Trip' : same ? 'Sai lịch/điều kiện' : 'Khác tuyến'}</em>
              </button>))}
            <small className="muted">Bấm để điền bên dịch vụ và mã. Thử nhập mã của bên khác hoặc mã không có để xem cảnh báo.</small>
          </div>
        </div>
        <div className="svc-right"><label className="svc-title">Bên dịch vụ thuê máy bay *</label>
          {ps.map((p: Any) => (
            <button type="button" key={p.id} className={`svc-partner ${p.id === fm.v.pid ? 'on' : ''}`} onClick={() => fm.set('pid', p.id)}>
              <b>{p.name}</b><small>{p.contact || '—'}</small><small>{p.phone || ''}{p.email ? ' · ' + p.email : ''}</small>
            </button>))}
        </div>
      </div>
    </>),
    onOk: (v) => {
      const hits = findCode(v.code), hit: Any = hits.find((x: Any) => x.partner.id === v.pid);
      if (!v.pid) return 'Chọn bên dịch vụ.'; if (!hit) return 'Mã chuyến bay không có trong dữ liệu của bên dịch vụ đang chọn.';
      const err = selectService(t, hit.schedule.id); if (err) return err;
      Object.assign(t.flight, { providerFlightCode: hit.schedule.externalCode || hit.schedule.flightNo, partnerContactedAt: nowStamp() });
      toast('Đã chọn dịch vụ vào bản nháp.');
    },
  });
}
export function serviceSend(id: string) {
  const t = trip(id), block = editableTrip(t); if (block) return toast(block);
  const f = t.flight; if (!f || f.status !== 'DRAFT') return toast('Chỉ gửi phương án bay nháp.');
  const issues = f.serviceId ? serviceIssues(t, resolved(f.serviceId), false) : []; if (issues.length) return toast(issues.join(' '));
  confirmAction('Gửi Manager xem chi phí dịch vụ bay?', `${f.airline} · ${f.flightNo} · ${usd(f.cost)}. Đây chưa phải xác nhận booking và chưa thay thế duyệt kế hoạch tổng thể.`, 'Gửi duyệt', () => {
    if (editableTrip(t) || f !== t.flight || f.status !== 'DRAFT') return;
    f.status = 'BUDGET_PENDING'; f.submittedSignature = providerSignature(f);
    notify('LOGISTICS_MANAGER', `Dịch vụ bay ${t.id} cần duyệt`, `${f.flightNo} · ${usd(f.cost)}`, `m/trip/${t.id}/resources`); audit('Submitted air service budget', t.id, f.flightNo);
  });
}
export function serviceRevision(id: string) {
  const t = trip(id), block = editableTrip(t); if (block) return toast(block);
  if (!t.flight || !['BUDGET_PENDING', 'BUDGET_APPROVED'].includes(t.flight.status)) return toast('Chỉ điều chỉnh phương án chưa chốt booking.');
  openModal({
    title: 'Lập bản điều chỉnh dịch vụ bay', ok: 'Tạo bản nháp điều chỉnh', init: { reason: '' },
    body: () => <Field label="Lý do thay đổi *"><Txt name="reason" placeholder="Đối tác thay lịch/giá, cần đổi phương án…" /></Field>,
    onOk: (v) => {
      if (editableTrip(t) || !['BUDGET_PENDING', 'BUDGET_APPROVED'].includes(t.flight.status)) return 'Trạng thái đã thay đổi.';
      const reason = String(v.reason).trim(); if (reason.length < 5) return 'Nhập lý do rõ ràng.';
      const old = curRoute(t);
      t.flightHistory = t.flightHistory || []; t.flightHistory.push({ ...clone(t.flight), archivedAt: nowStamp(), reason });
      if (old && ['APPROVED', 'PENDING_APPROVAL', 'RETURNED'].includes(old.status)) {
        if (old.status === 'PENDING_APPROVAL') old.status = 'WITHDRAWN';
        const next = { v: old.v + 1, status: 'DRAFT', submittedAt: null, decidedAt: null, note: reason, stops: clone(old.stops) };
        next.stops.forEach((s: Any) => { delete s.placeSnapshot; }); t.routes.push(next);
      }
      t.flight = { ...clone(t.flight), status: 'DRAFT' }; delete t.flight.approvedSignature; delete t.flight.submittedSignature;
      t.resourcesPlanned = null; t.resourcesConfirmed = null;
      audit('Started air plan revision', t.id, reason); notify('LOGISTICS_MANAGER', `Điều phối đang chỉnh phương án ${t.id}`, reason, `m/trip/${t.id}/route`);
    },
  });
}
export function flightBook(id: string) {
  const t = trip(id), block = editableTrip(t); if (block) return toast(block);
  const f = t.flight;
  if (!f || f.status !== 'BUDGET_APPROVED' || curRoute(t)?.status !== 'APPROVED') return toast('Cần Manager duyệt kế hoạch tổng thể và chi phí trước khi chốt booking.');
  openModal({
    title: `Ghi nhận booking · ${f.flightNo}`, ok: 'Xác nhận đã nhận booking', wide: true, init: { ref: '', horses: String(countHorses(t)), note: '', ok: false, file: null },
    body: (fm) => (<>
      <div className="fa-notice"><span>Liên hệ và đặt dịch vụ diễn ra bên ngoài hệ thống. Chỉ ghi nhận khi đối tác xác nhận đúng lịch, chi phí và số ngựa đã duyệt.</span></div>
      <div className="kv2"><Cell label="Đối tác">{f.serviceSnapshot?.partnerName || f.airline}</Cell><Cell label="Chi phí đã duyệt">{usd(f.cost)}</Cell><Cell label="Ngựa cần nhận">{countHorses(t)}</Cell></div>
      <Field label="Mã booking / xác nhận đối tác *"><Inp name="ref" maxLength={100} /></Field>
      <Field label="Số ngựa đã được đối tác xác nhận *"><Inp name="horses" type="number" min="1" step="1" /></Field>
      <Field label="Ghi chú xác nhận"><Txt name="note" /></Field>
      <Field label="Tệp xác nhận (PDF/JPEG/PNG, tùy chọn)"><input id="fa-book-file" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => fm.set('file', e.target.files?.[0] || null)} /></Field>
      <Chk name="ok">Tôi đã nhận xác nhận của đối tác đúng lịch, số ngựa và chi phí được duyệt.</Chk>
    </>),
    onOk: (v) => {
      const rt = curRoute(t), ref = String(v.ref || '').trim(), horses = Number(v.horses), file: File | null = v.file;
      if (f.approvedSignature && f.approvedSignature !== providerSignature(f)) return 'Thông tin bay đã thay đổi sau phê duyệt; phải gửi duyệt lại.';
      if (rt.airApprovalSignature && rt.airApprovalSignature !== planSignature(t)) return 'Nguồn lực hoặc dịch vụ khác phương án tổng thể đã duyệt.';
      if (f.serviceId) {
        const issues = serviceIssues(t, resolved(f.serviceId), false); if (issues.length) return issues.join(' ');
        const cur: Any = snapshot(resolved(f.serviceId));
        if (['from', 'to', 'flightNo', 'departAt', 'arriveAt', 'cost', 'airline'].some((k) => cur[k] !== (f.serviceSnapshot?.[k] ?? f[k]))) return 'Đối tác cập nhật lịch/giá sau lúc chọn. Không ghi đè; cần lập bản điều chỉnh để duyệt lại.';
      }
      if (ref.length < 4 || ref.length > 100) return 'Mã xác nhận phải từ 4 đến 100 ký tự.';
      if (!Number.isInteger(horses) || horses !== countHorses(t)) return 'Số ngựa đối tác xác nhận phải đúng số ngựa của Trip.';
      if (!v.ok) return 'Xác nhận đã nhận thông tin từ đối tác đúng lịch, giá và số ngựa.';
      if (db.trips.some((o: Any) => o.id !== t.id && o.flight?.bookingRef?.trim().toLowerCase() === ref.toLowerCase() && o.flight.serviceSnapshot?.partnerId === f.serviceSnapshot?.partnerId)) return 'Mã booking đã gắn với một Trip khác của đối tác này.';
      if (file && (file.size < 1 || file.size > 10 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type))) return 'Tệp xác nhận phải là PDF/JPEG/PNG thật, tối đa 10 MiB.';
      Object.assign(f, { status: 'BOOKED', bookingRef: ref, confirmedHorses: horses, bookedAt: nowStamp(), bookedBy: me().name, bookingNote: String(v.note || '').trim(),
        bookingEvidence: file ? { name: file.name, size: file.size, mime: file.type, url: URL.createObjectURL(file) } : null });
      t.resourcesConfirmed = null;
      audit('Recorded partner booking confirmation', t.id, `${f.bookingRef} · ${horses} ngựa · ${f.flightNo}`);
      notify('LOGISTICS_MANAGER', `Dịch vụ bay ${t.id} đã được đối tác xác nhận`, f.bookingRef, `m/trip/${t.id}/route`);
      toast('Đã ghi nhận booking đối tác. Tiếp tục xác nhận nguồn lực và kiểm tra điều kiện khởi hành.');
    },
  });
}
/** mốc cất cánh / hạ cánh (chỉ chuyến đang vận chuyển và có booking) */
export function flightMilestone(id: string, type: 'FLIGHT_DEPARTED' | 'FLIGHT_ARRIVED') {
  const t = trip(id), f = t?.flight, block = editableTrip(t, false); if (block) return toast(block);
  if (t.status !== 'IN_TRANSIT' || f?.status !== 'BOOKED') return toast('Chỉ ghi mốc cho chuyến đang vận chuyển và có booking.');
  if (f.milestones?.some((m: Any) => m.type === type)) return toast('Mốc không hợp lệ hoặc đã có.');
  if (type === 'FLIGHT_ARRIVED' && !f.milestones?.some((m: Any) => m.type === 'FLIGHT_DEPARTED')) return toast('Ghi nhận cất cánh trước khi hạ cánh.');
  openModal({
    title: MILESTONE_LABEL[type], ok: 'Ghi nhận', init: { at: nowStamp().replace(' ', 'T') },
    body: () => (<><p>{f.airline} {f.flightNo}. Dùng thời gian do hãng bay thông báo.</p><Field label="Thời điểm *"><DateTimeInput name="at" /></Field></>),
    onOk: (v) => {
      if (!v.at) return 'Chọn thời điểm.';
      f.milestones.push({ type, at: String(v.at).replace('T', ' ') }); audit('Recorded flight milestone', id, MILESTONE_LABEL[type]);
      crewOf(t).forEach(([, e]) => notify(e, `${MILESTONE_LABEL[type]} • ${f.flightNo}`, id, `d/trip/${id}`)); toast('Đã ghi nhận mốc chuyến bay.');
    },
  });
}

/** gửi phương án tổng thể chuyến AIR (tuyến + lịch + xe/người dự kiến + dịch vụ bay) */
export function submitAirPlan(id: string) {
  const t = trip(id), block = editableTrip(t), rt = curRoute(t);
  if (block) return toast(block);
  if (!rt || rt.status !== 'DRAFT') return toast('Chỉ gửi phiên bản tuyến nháp.');
  rpEnsure(t, rt);
  const calc = rpCalc(t), gaps = planningGaps(t);
  if (!calc || calc.issues.length) return toast('Tính xong tuyến và xử lý toàn bộ lỗi lịch/nghỉ/chăm sóc trước khi gửi.');
  if (rpDeadline(t) && calc.eta > rpDeadline(t)) return toast('ETA vượt hạn giao trong yêu cầu/hợp đồng.');
  if (gaps.length) return toast(gaps.join(' '));
  rpWriteTimes(t, rt, calc);
  const routeError = validateRoute(t, rt); if (routeError) return toast(routeError);
  const signature = planSignature(t);
  confirmAction(`Gửi phương án tổng thể ${t.id} v${rt.v}?`, 'Gồm tuyến, lịch, xe/người dự kiến và dịch vụ bay. Chưa yêu cầu booking hoặc xác nhận vận hành thực tế ở bước này.', 'Gửi Manager duyệt', () => {
    const latest = rpCalc(t);
    if (editableTrip(t) || curRoute(t) !== rt || rt.status !== 'DRAFT' || signature !== planSignature(t) || planningGaps(t).length || !latest || latest.issues.length) { toast('Kế hoạch đã thay đổi; kiểm tra lại trước khi gửi.'); return; }
    t.resourcesPlanned = { at: nowStamp(), by: me().name, signature };
    rt.resourceProposal = { at: nowStamp(), signature: resourceSignature(t), airSignature: signature, flight: clone(t.flight) };
    rt.status = 'PENDING_APPROVAL'; rt.submittedAt = nowStamp();
    if (t.flight.status === 'DRAFT' || t.flight.status === 'REJECTED') { t.flight.status = 'BUDGET_PENDING'; t.flight.submittedSignature = providerSignature(t.flight); }
    notify('LOGISTICS_MANAGER', `Phương án tổng thể ${t.id} cần duyệt`, `v${rt.v} · dịch vụ ${t.flight.flightNo} · ${usd(t.flight.cost)}`, `m/trip/${t.id}/route`);
    audit('Submitted air transport plan', t.id, `Route v${rt.v}; booking not required before approval`);
  });
}
/** khi Manager (demo) duyệt phương án AIR */
export function approveAirPlan(t: Any, by: string) {
  const rt = curRoute(t);
  rt.airApprovalSignature = planSignature(t);
  rt.resourceSnapshot = { at: nowStamp(), signature: resourceSignature(t), plannedOnly: true };
  if (t.flight && t.flight.status !== 'BOOKED') { t.flight.status = 'BUDGET_APPROVED'; t.flight.budgetDecidedAt = nowStamp(); t.flight.budgetDecidedBy = by; t.flight.approvedSignature = providerSignature(t.flight); }
  t.resourcesConfirmed = null;
}
export const airChanged = () => commit();
