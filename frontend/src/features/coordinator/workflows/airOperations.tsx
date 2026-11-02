// ============================================================================
// Dịch vụ bay & đối tác: CBN thuê bên dịch vụ máy bay. Điều phối quản lý danh mục đối tác;
// tuyến và lịch bay là dữ liệu mẫu do đối tác cung cấp (chỉ tra cứu). Không kết nối API hãng bay.
// Điều phối nhập mã chuyến bay → gửi Manager duyệt → được duyệt thì ghi nhận booking.
// ============================================================================
import { Cell, Chk, Field, Inp, Sel, Txt } from '../components/common/ui';
import { DateTimeInput } from '../components/forms/DateTime';
import { assignedOperator, canPlan, crewOf, curRoute, groundCountry, groundLegCheck, groundLegName, opsBlock, placeById, placeByName, reqOfTrip, trip, tripHorses } from '../domain/coordinatorRules';
import type { Any } from '../store/coordinatorStore';
import { audit, commit, confirmAction, db, me, notify, nowStamp, openModal, toast } from '../store/coordinatorStore';
import { addHours, cityLabel, dt, MILESTONE_LABEL, stampMs, usd } from '../utils/format';
import { plannerMap, resourceSignature, ROUTE_POLICY, rpCalc, rpDeadline, rpEnsure, rpFlightKey, rpRoute, rpWriteTimes, stop, validateRoute } from './routePlanner';
import { apiClient } from '../../../shared/api/apiClient';

export const SYSTEM_ZONE = 'Asia/Ho_Chi_Minh';
export const ZONES = ['Asia/Ho_Chi_Minh', 'Asia/Phnom_Penh', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Tokyo', 'Asia/Dubai', 'Australia/Sydney', 'Europe/London'];
export const AIR_STATUS: Record<string, string> = { DRAFT: 'Bản nháp · Chưa gửi duyệt', BUDGET_PENDING: 'Chờ Manager duyệt', BUDGET_APPROVED: 'Đã duyệt · Chờ đối tác xác nhận', BOOKED: 'Đã xác nhận đặt chỗ', REJECTED: 'Cần chọn lại phương án' };
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const entity = (list: Any[], id: string) => list.find((x: Any) => x.id === id);
const air = () => db.air;

export function resolveAirportPlace(ref?: string): Any | undefined {
  if (!ref) return undefined;
  const clean = ref.trim().toLowerCase();
  return (
    placeById(ref) ||
    placeByName(ref) ||
    db.places.find((p: Any) =>
      p.id?.toLowerCase() === clean ||
      p.airport?.iata?.toLowerCase() === clean ||
      (clean.includes('sgn') && (p.airport?.iata === 'SGN' || p.name?.toLowerCase().includes('tan son nhat'))) ||
      (clean.includes('nrt') && (p.airport?.iata === 'NRT' || p.name?.toLowerCase().includes('narita'))) ||
      (clean.includes('han') && (p.airport?.iata === 'HAN' || p.name?.toLowerCase().includes('noi bai')))
    ) ||
    (clean.includes('sgn') || clean.includes('tan son nhat')
      ? { id: 'CP-21', name: 'Tan Son Nhat Airport', type: 'AIRPORT', country: 'VN', lat: 10.8188, lng: 106.6519, airport: { iata: 'SGN', horseHandling: true }, functions: ['AIRPORT'], status: 'ACTIVE' }
      : clean.includes('nrt') || clean.includes('narita')
      ? { id: 'CP-25', name: 'Narita International Airport', type: 'AIRPORT', country: 'JP', lat: 35.772, lng: 140.3929, airport: { iata: 'NRT', horseHandling: true }, functions: ['AIRPORT'], status: 'ACTIVE' }
      : clean.includes('han') || clean.includes('noi bai')
      ? { id: 'CP-22', name: 'Noi Bai Airport', type: 'AIRPORT', country: 'VN', lat: 21.2212, lng: 105.8072, airport: { iata: 'HAN', horseHandling: true }, functions: ['AIRPORT'], status: 'ACTIVE' }
      : undefined)
  );
}

export const airportLabel = (id: string) => { const p = resolveAirportPlace(id); return p ? `${p.name}${p.airport?.iata ? ' · ' + p.airport.iata : ''}` : 'Sân bay không còn trong danh mục'; };
export const goodAirport = (id: string) => { const p = resolveAirportPlace(id); return p?.status === 'ACTIVE' && p.functions?.includes('AIRPORT') && p.airport?.horseHandling; };

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

  openModal({
    title: `Chọn dịch vụ bay · ${id}`, ok: 'Lưu vào bản nháp', wide: true,
    init: { code: t.flight?.serviceSnapshot?.externalCode || '', pid: pre },
    body: (fm) => {
      const activePid = fm.v.pid;
      const allSamples = air().schedules.map((x: Any) => resolved(x.id)).filter((v: Any) => v && v.partner.status === 'ACTIVE')
        .map((v: Any) => ({ v, same: placeById(v.airRoute.from)?.country === oc && placeById(v.airRoute.to)?.country === ic, ok: !serviceIssues(t, v).length }));
      const filtered = activePid ? allSamples.filter((s: Any) => s.v.partner.id === activePid) : allSamples;
      const samples = filtered.sort((a: Any, b: Any) => b.ok - a.ok || b.same - a.same || a.v.schedule.departLocal.localeCompare(b.v.schedule.departLocal)).slice(0, 24);

      return (
        <>
          <p className="hint">{Math.max(1, tripHorses(t).length)} ngựa · {cityLabel(reqOfTrip(t).origin)} → {cityLabel(reqOfTrip(t).destination)} · khởi hành {dt(t.plannedDepart)}. Dữ liệu mở rộng lịch bay từ 11/2026 đến 03/2027.{t.id === 'TRP-DEMO-AIR' ? ' Mã mẫu cho Trip này: Pegasus Bloodstock Air · PBA-DEMO-01 hoặc PBA-DEC-28.' : ''}</p>
          <div className="svc-grid">
            <div className="svc-left">
              <Field label="Mã chuyến bay *"><Inp name="code" autoComplete="off" placeholder="Nhập hoặc click mã chuyến bay bên dưới" /></Field>
              <div id="svc-result"><ServiceResult t={t} pid={fm.v.pid} code={String(fm.v.code || '')} /></div>
              <div className="svc-samples" style={{ maxHeight: 380, overflowY: 'auto' }}>
                <b>Mã mẫu khả dụng ({samples.length}{activePid ? ' của bên đã chọn' : ''})</b>
                {samples.map(({ v, ok, same }: Any) => (
                  <button type="button" key={v.schedule.id} className="svc-sample" onClick={() => { fm.set('pid', v.partner.id); fm.set('code', v.schedule.externalCode || v.schedule.flightNo); }}>
                    <code>{v.schedule.externalCode || v.schedule.flightNo}</code>
                    <span>{v.partner.name} · {placeById(v.airRoute.from)?.airport?.iata || ''}→{placeById(v.airRoute.to)?.airport?.iata || ''} · {v.schedule.departLocal}</span>
                    <em className={ok ? 'ok' : ''}>{ok ? 'Phù hợp Trip' : same ? 'Sai lịch/điều kiện' : 'Khác tuyến'}</em>
                  </button>
                ))}
                <small className="muted">Bấm vào mã để tự động điền. Chọn bên dịch vụ ở cột phải để lọc nhanh chuyến bay của đối tác đó.</small>
              </div>
            </div>
            <div className="svc-right">
              <label className="svc-title">Bên dịch vụ thuê máy bay *</label>
              <button type="button" className={`svc-partner ${!fm.v.pid ? 'on' : ''}`} onClick={() => fm.set('pid', '')} style={{ padding: '6px 10px', marginBottom: 6 }}>
                <b>Tất cả bên dịch vụ ({ps.length})</b>
              </button>
              {ps.map((p: Any) => (
                <button type="button" key={p.id} className={`svc-partner ${p.id === fm.v.pid ? 'on' : ''}`} onClick={() => fm.set('pid', p.id)}>
                  <b>{p.name}</b><small>{p.contact || '—'}</small><small>{p.phone || ''}{p.email ? ' · ' + p.email : ''}</small>
                </button>
              ))}
            </div>
          </div>
        </>
      );
    },
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


/**
 * Chọn cặp Sân bay cất / hạ cánh cho lộ trình (nhanh & trực quan)
 * Phục vụ nghiệp vụ Lập lộ trình (Route Planner): Điều phối viên chỉ cần xác định sân bay đi và sân bay đến.
 * Sau khi chọn xong, lộ trình sẽ tự động phân tách thành 2 chặng đường bộ và 1 chặng bay.
 * Thông tin HĐ Charter chi tiết sẽ được nhập riêng ở tab "Chuyến bay".
 */
export function selectAirportsModal(id: string) {
  const t = trip(id);
  if (!t) return toast('Không tìm thấy chuyến đi.');
  const rt = curRoute(t);
  const existing = t.flight;
  const airStops = rt?.stops?.filter((s: Any) => s.type === 'AIRPORT') || [];

  const originCountry = groundCountry(t, 'outbound') || 'VN';
  const destCountry = groundCountry(t, 'inbound') || 'JP';

  const allAirports = db.places.filter((p: Any) => p.functions?.includes('AIRPORT') && p.status === 'ACTIVE' && p.airport?.horseHandling);

  // Sân bay cất cánh: chỉ lấy các sân bay thuộc nước xuất phát (Việt Nam)
  let fromAirports = allAirports.filter((p: Any) => p.country === originCountry);
  if (!fromAirports.length && originCountry === 'VN') {
    fromAirports = allAirports.filter((p: Any) => p.country === 'VN');
  }
  const fromOpts: Array<[string, string]> = fromAirports.map((p: Any) => [
    p.id,
    `${p.name} (${p.airport?.iata || 'AIR'}) · ${p.country}`,
  ]);
  if (!fromOpts.length) {
    fromOpts.push(['PLC-SGN-AIRPORT', 'Tan Son Nhat Airport (SGN) · VN']);
    fromOpts.push(['PLC-HAN-AIRPORT', 'Noi Bai Airport (HAN) · VN']);
  }

  // Sân bay hạ cánh: chỉ lấy các sân bay thuộc nước đến
  let toAirports = allAirports.filter((p: Any) => p.country === destCountry);
  if (!toAirports.length) {
    toAirports = allAirports.filter((p: Any) => p.country !== originCountry);
  }
  const toOpts: Array<[string, string]> = toAirports.map((p: Any) => [
    p.id,
    `${p.name} (${p.airport?.iata || 'AIR'}) · ${p.country}`,
  ]);
  if (!toOpts.length) {
    toOpts.push(['PLC-NRT-AIRPORT', 'Narita International Airport (NRT) · JP']);
    toOpts.push(['PLC-KIX-AIRPORT', 'Kansai International Airport (KIX) · JP']);
  }

  const defaultFrom = (existing?.from && fromOpts.some(([id]) => id === existing.from))
    ? existing.from
    : airStops[0]?.cp || airStops[0]?.placeId || fromOpts[0][0];

  const defaultTo = (existing?.to && toOpts.some(([id]) => id === existing.to))
    ? existing.to
    : airStops[1]?.cp || airStops[1]?.placeId || toOpts[0][0];

  let defaultDepart = existing?.departAt;
  if (!defaultDepart) {
    if (t.plannedDepart) {
      defaultDepart = addHours(t.plannedDepart, 4);
    } else {
      defaultDepart = nowStamp();
    }
  }
  let defaultArrive = existing?.arriveAt;
  if (!defaultArrive && defaultDepart) {
    defaultArrive = addHours(defaultDepart, 6);
  }

  openModal({
    title: `Chọn cặp sân bay cất / hạ cánh · ${t.id}`,
    wide: false,
    ok: 'Lưu sân bay vào lộ trình',
    init: {
      fromAirport: defaultFrom,
      toAirport: defaultTo,
      departAt: defaultDepart ? defaultDepart.replace(' ', 'T') : '',
      arriveAt: defaultArrive ? defaultArrive.replace(' ', 'T') : '',
    },
    body: () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p className="hint" style={{ margin: '0 0 2px 0', fontSize: 12.5 }}>
          Chọn sân bay cất cánh và hạ cánh để hệ thống chia lộ trình thành 2 chặng đường bộ và 1 chặng bay thẳng.
        </p>

        <Field label="Sân bay cất cánh (Việt Nam) *">
          <Sel name="fromAirport" options={fromOpts} />
        </Field>
        <Field label={`Sân bay hạ cánh (${destCountry === 'JP' ? 'Nhật Bản' : destCountry}) *`}>
          <Sel name="toAirport" options={toOpts} />
        </Field>

        <div className="form-grid" style={{ marginTop: 2 }}>
          <Field label="Giờ cất cánh ETD dự kiến *" hint="Thời điểm máy bay cất cánh">
            <DateTimeInput name="departAt" />
          </Field>
          <Field label="Giờ hạ cánh ETA dự kiến *" hint="Thời điểm hạ cánh tại nước đến">
            <DateTimeInput name="arriveAt" />
          </Field>
        </div>
      </div>
    ),
    onOk: async (v) => {
      const fromAirport = String(v.fromAirport || '').trim();
      const toAirport = String(v.toAirport || '').trim();
      const departAt = String(v.departAt || '').replace('T', ' ');
      const arriveAt = String(v.arriveAt || '').replace('T', ' ');

      if (!fromAirport || !toAirport || fromAirport === toAirport) {
        return 'Sân bay cất cánh và sân bay hạ cánh phải khác nhau.';
      }
      if (!departAt || !arriveAt) {
        return 'Vui lòng chọn ngày giờ cất cánh và hạ cánh dự kiến.';
      }
      if (stampMs(arriveAt) <= stampMs(departAt)) {
        return 'Giờ hạ cánh phải sau giờ cất cánh.';
      }

      t.flight = {
        ...(t.flight || {}),
        isCharter: true,
        status: t.flight?.status || 'DRAFT',
        from: fromAirport,
        to: toAirport,
        departAt,
        arriveAt,
        serviceSnapshot: {
          ...(t.flight?.serviceSnapshot || {}),
          fromName: airportLabel(fromAirport),
          toName: airportLabel(toAirport),
          departLocal: departAt,
          arriveLocal: arriveAt,
        },
      };

      if (rt) {
        const pFrom = resolveAirportPlace(fromAirport), pTo = resolveAirportPlace(toAirport);
        if (pFrom && pTo) {
          const stopFrom = Object.assign(stop(pFrom.name, 'AIRPORT', '', pFrom.id), {
            cp: pFrom.id, placeId: pFrom.id, name: pFrom.name, lat: pFrom.lat, lng: pFrom.lng,
            required: true, purposes: ['AIRPORT'], dwellMin: 0, unload: false,
          });
          const stopTo = Object.assign(stop(pTo.name, 'AIRPORT', '', pTo.id), {
            cp: pTo.id, placeId: pTo.id, name: pTo.name, lat: pTo.lat, lng: pTo.lng,
            required: true, purposes: ['AIRPORT'], dwellMin: 0, unload: false,
          });

          const airIdxs = rt.stops.map((s: Any, i: number) => (s.type === 'AIRPORT' ? i : -1)).filter((i: number) => i >= 0);
          if (airIdxs.length >= 2) {
            rt.stops[airIdxs[0]] = stopFrom;
            rt.stops[airIdxs[1]] = stopTo;
          } else {
            const origin = rt.stops[0];
            const dest = rt.stops[rt.stops.length - 1];
            const originCountry = (origin?.placeId && placeById(origin.placeId)?.country) || 'VN';
            const intermediate = rt.stops.slice(1, -1).filter((s: Any) => s.type !== 'AIRPORT');
            const vnIntermediates = intermediate.filter((s: Any) => {
              const c = s.placeId ? placeById(s.placeId)?.country : undefined;
              return !c || c === originCountry;
            });
            const destIntermediates = intermediate.filter((s: Any) => {
              const c = s.placeId ? placeById(s.placeId)?.country : undefined;
              return c && c !== originCountry;
            });
            rt.stops = [origin, ...vnIntermediates, stopFrom, stopTo, ...destIntermediates, dest];
          }
        }
      }

      commit();
      void rpRoute(t, true);
      setTimeout(() => plannerMap.fitAll?.(), 100);
      toast(`Đã lưu 2 sân bay (${airportLabel(fromAirport)} → ${airportLabel(toAirport)}) vào lộ trình.`);
    },
  });
}


/**
 * Nhập liệu thủ công Hợp đồng thuê chuyến bay Charter (Manual Input / Admin Panel)
 * Chuyến bay charter chuyên dụng cho ngựa đua mang tính đặc thù (không có sẵn trên GDS).
 * Điều phối viên tự nhập Hợp đồng thuê chuyến, giờ bay, mã số chuồng chuyên dụng (Jet Stall)
 * và lưu trực tiếp vào CSDL SQL Server (bảng FLIGHT_BOOKING).
 */
export function charterFlightModal(id: string) {
  const t = trip(id);
  if (!t) return toast('Không tìm thấy chuyến đi.');
  const rt = curRoute(t);
  const existing = t.flight;
  const airStops = rt?.stops?.filter((s: Any) => s.type === 'AIRPORT') || [];

  const originCountry = groundCountry(t, 'outbound') || 'VN';
  const destCountry = groundCountry(t, 'inbound') || 'JP';

  const allAirports = db.places.filter((p: Any) => p.functions?.includes('AIRPORT') && p.status === 'ACTIVE' && p.airport?.horseHandling);

  let fromAirports = allAirports.filter((p: Any) => p.country === originCountry);
  if (!fromAirports.length && originCountry === 'VN') {
    fromAirports = allAirports.filter((p: Any) => p.country === 'VN');
  }
  const fromOpts: Array<[string, string]> = fromAirports.map((p: Any) => [
    p.id,
    `${p.name} (${p.airport?.iata || 'AIR'}) · ${p.country}`,
  ]);
  if (!fromOpts.length) {
    fromOpts.push(['PLC-SGN-AIRPORT', 'Tan Son Nhat Airport (SGN) · VN']);
    fromOpts.push(['PLC-HAN-AIRPORT', 'Noi Bai Airport (HAN) · VN']);
  }

  let toAirports = allAirports.filter((p: Any) => p.country === destCountry);
  if (!toAirports.length) {
    toAirports = allAirports.filter((p: Any) => p.country !== originCountry);
  }
  const toOpts: Array<[string, string]> = toAirports.map((p: Any) => [
    p.id,
    `${p.name} (${p.airport?.iata || 'AIR'}) · ${p.country}`,
  ]);
  if (!toOpts.length) {
    toOpts.push(['PLC-NRT-AIRPORT', 'Narita International Airport (NRT) · JP']);
  }

  const defaultFrom = (existing?.from && fromOpts.some(([id]) => id === existing.from))
    ? existing.from
    : airStops[0]?.cp || airStops[0]?.placeId || fromOpts[0][0];

  const defaultTo = (existing?.to && toOpts.some(([id]) => id === existing.to))
    ? existing.to
    : airStops[1]?.cp || airStops[1]?.placeId || toOpts[0][0];

  // Xác định giờ bay mặc định hợp lý theo giờ đón ngựa
  let defaultDepart = existing?.departAt;
  if (!defaultDepart) {
    if (t.plannedDepart) {
      defaultDepart = addHours(t.plannedDepart, 4); // đón + di chuyển đường bộ + thủ tục 3h
    } else {
      defaultDepart = nowStamp();
    }
  }
  let defaultArrive = existing?.arriveAt;
  if (!defaultArrive && defaultDepart) {
    defaultArrive = addHours(defaultDepart, 6); // thời gian bay ~6 tiếng
  }

  openModal({
    title: `Hợp đồng thuê chuyến bay Charter · ${t.id}`,
    wide: true,
    ok: 'Lưu Hợp đồng Charter & Ghi vào CSDL',
    init: {
      contractNo: existing?.contractNo || existing?.bookingRef || '',
      partnerName: existing?.serviceSnapshot?.partnerName || existing?.partnerName || '',
      airline: existing?.airline || '',
      flightNo: existing?.flightNo || '',
      fromAirport: defaultFrom,
      toAirport: defaultTo,
      departAt: defaultDepart ? defaultDepart.replace(' ', 'T') : '',
      arriveAt: defaultArrive ? defaultArrive.replace(' ', 'T') : '',
      jetStallId: existing?.jetStallId || '',
      stallType: existing?.stallType || 'Triple Stall (3 khoang IATA LAR)',
      stallsCount: String(existing?.stalls || countHorses(t)),
      cost: existing?.cost ? String(existing.cost) : '',
      inFlightCare: existing?.inFlightCare || '',
      notes: existing?.bookingNote || '',
    },
    body: () => {
return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="hint" style={{ margin: 0, fontSize: 12.5 }}>
            Nhập thông tin hợp đồng thuê chuyến charter, giờ bay và mã số chuồng chuyên dụng (Jet Stall) phục vụ vận chuyển ngựa.
          </p>

{/* Khối 1: Hợp đồng & Bên cung cấp */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: '#1e293b', fontWeight: 700 }}>
              1. Thông tin Hợp đồng Charter & Hãng bay khai thác
            </h4>
            <div className="form-grid">
              <Field label="Số Hợp đồng Charter / Booking Ref *" hint="Mã HĐ thuê chuyến đã ký với broker / hãng bay">
                <Inp name="contractNo" placeholder="VD: CHR-2026-PEGASUS-01" />
              </Field>
              <Field label="Bên dịch vụ / Môi giới hàng không *" hint="Đơn vị cung cấp dịch vụ bay charter">
                <Inp name="partnerName" placeholder="VD: Pegasus Bloodstock Air" />
              </Field>
            </div>
            <div className="form-grid" style={{ marginTop: 8 }}>
              <Field label="Hãng bay & Dòng tàu bay *" hint="Loại chuyên cơ chở hàng/ngựa">
                <Inp name="airline" placeholder="VD: Vietnam Airlines Cargo (Boeing 777-200F)" />
              </Field>
              <Field label="Số hiệu chuyến bay charter *" hint="Mã chuyến bay cất cánh">
                <Inp name="flightNo" placeholder="VD: VN-C901 hoặc PBA-CHR-01" />
              </Field>
            </div>
          </div>

          {/* Khối 2: Lộ trình & Lịch bay */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: '#1e293b', fontWeight: 700 }}>
              2. Sân bay & Lịch bay cất / hạ cánh
            </h4>
            <div className="form-grid">
              <Field label="Sân bay cất cánh (Việt Nam) *">
                <Sel name="fromAirport" options={fromOpts} />
              </Field>
              <Field label={`Sân bay hạ cánh (${destCountry === 'JP' ? 'Nhật Bản' : destCountry}) *`}>
                <Sel name="toAirport" options={toOpts} />
              </Field>
            </div>
            <div className="form-grid" style={{ marginTop: 8 }}>
              <Field label="Giờ cất cánh ETD *" hint="Thời điểm máy bay bắt đầu cất cánh">
                <DateTimeInput name="departAt" />
              </Field>
              <Field label="Giờ hạ cánh ETA *" hint="Thời điểm máy bay chạm bánh tại sân bay đến">
                <DateTimeInput name="arriveAt" />
              </Field>
            </div>

          </div>

          {/* Khối 3: Chuồng chuyên dụng Jet Stall & Nhân sự */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: '#1e293b', fontWeight: 700 }}>
              3. Thiết bị chuồng bay chuyên dụng (Equine Jet Stall / Air Stall)
            </h4>
            <div className="form-grid">
              <Field label="Mã số chuồng chuyên dụng (Jet Stall ID) *" hint="Đạt chuẩn IATA LAR Container Type 3/4">
                <Inp name="jetStallId" placeholder="VD: JET-STALL-VN01, AIRSTALL-A1" />
              </Field>
              <Field label="Cấu hình chuồng *" hint="Loại khoang chuồng trên máy bay">
                <Sel
                  name="stallType"
                  options={[
                    'Triple Stall (3 khoang IATA LAR)',
                    'Double Stall (2 khoang rộng)',
                    'Single Stall (Khoang đơn VIP)',
                  ]}
                />
              </Field>
            </div>
            <div className="form-grid" style={{ marginTop: 8 }}>
              <Field label="Sức chứa ngựa (ngựa) *" hint="Số lượng chỗ tiếp nhận ngựa trong chuồng">
                <Inp name="stallsCount" type="number" min={countHorses(t)} />
              </Field>
              <Field label="Chi phí thuê chuyến (USD) *" hint="Tổng chi phí thuê chuyến bay charter">
                <Inp name="cost" type="number" min="0" step="100" />
              </Field>
            </div>
            <div style={{ marginTop: 8 }}>
              <Field label="Chuyên viên áp tải / Flying Groom trên máy bay" hint="Nhân sự chăm sóc trực tiếp trên khoang bay">
                <Inp name="inFlightCare" placeholder="VD: Bác sĩ thú y CBN + 1 Flying Groom của đối tác" />
              </Field>
            </div>
          </div>

          {/* Khối 4: Điều khoản & Môi trường cabin */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: '#1e293b', fontWeight: 700 }}>
              4. Ghi chú HĐ & Yêu cầu kiểm soát nhiệt độ / áp suất khoang
            </h4>
            <Field label="Điều khoản kỹ thuật & chăm sóc ngựa trên không">
              <Txt
                name="notes"
                placeholder="Nhiệt độ duy trì 15-18°C, thông khí liên tục, cấp nước/cỏ khô 2h/lần, kiểm tra nhịp tim trước cất cánh…"
              />
            </Field>
          </div>
        </div>
      );
    },
    onOk: async (v) => {
      const contractNo = String(v.contractNo || '').trim();
      const partnerName = String(v.partnerName || '').trim();
      const airline = String(v.airline || '').trim();
      const flightNo = String(v.flightNo || '').trim().toUpperCase();
      const fromAirport = String(v.fromAirport || '').trim();
      const toAirport = String(v.toAirport || '').trim();
      const departAt = String(v.departAt || '').replace('T', ' ');
      const arriveAt = String(v.arriveAt || '').replace('T', ' ');
      const jetStallId = String(v.jetStallId || '').trim().toUpperCase();
      const stallType = String(v.stallType || 'Triple Stall');
      const stallsCount = Number(v.stallsCount) || countHorses(t);
      const cost = Number(v.cost) || 15000;
      const inFlightCare = String(v.inFlightCare || '').trim();
      const notes = String(v.notes || '').trim();

      if (contractNo.length < 3) return 'Vui lòng nhập Số Hợp đồng Charter hợp lệ (tối thiểu 3 ký tự).';
      if (!airline) return 'Vui lòng nhập Hãng bay & Dòng tàu bay.';
      if (flightNo.length < 3) return 'Vui lòng nhập Số hiệu chuyến bay charter hợp lệ (VD: VN-C901).';
      if (!fromAirport || !toAirport || fromAirport === toAirport) return 'Sân bay cất cánh và sân bay hạ cánh phải khác nhau.';
      if (!departAt || !arriveAt) return 'Vui lòng chọn ngày giờ cất cánh và hạ cánh.';
      if (stampMs(arriveAt) <= stampMs(departAt)) return 'Giờ hạ cánh phải sau giờ cất cánh.';
      if (jetStallId.length < 2) return 'Vui lòng nhập Mã số chuồng chuyên dụng (Jet Stall ID).';
      if (stallsCount < countHorses(t)) return `Số chỗ chuồng (${stallsCount}) phải đủ tiếp nhận số ngựa của chuyến (${countHorses(t)}).`;

      // Cập nhật t.flight
      t.flightHistory = t.flightHistory || [];
      if (t.flight) {
        t.flightHistory.push({ ...clone(t.flight), archivedAt: nowStamp(), reason: 'Cập nhật Hợp đồng Charter thủ công' });
      }

      t.flight = {
        isCharter: true,
        status: 'BOOKED',
        contractNo,
        bookingRef: contractNo,
        partnerName: partnerName || airline,
        airline,
        flightNo,
        providerFlightCode: flightNo,
        from: fromAirport,
        to: toAirport,
        departAt,
        arriveAt,
        jetStallId,
        stallType,
        stalls: stallsCount,
        cost,
        inFlightCare,
        bookingNote: notes,
        confirmedHorses: stallsCount,
        bookedAt: nowStamp(),
        bookedBy: me().name,
        serviceSnapshot: {
          partnerName: partnerName || airline,
          airline,
          flightNo,
          fromName: airportLabel(fromAirport),
          toName: airportLabel(toAirport),
          departLocal: departAt,
          arriveLocal: arriveAt,
          cost,
          jetStallId,
          stallType,
          inFlightCare,
        },
      };

      // Tự động chèn/cập nhật 2 trạm sân bay từ HĐ Charter vào lộ trình
      if (rt) {
        const pFrom = resolveAirportPlace(fromAirport), pTo = resolveAirportPlace(toAirport);
        if (pFrom && pTo) {
          const stopFrom = Object.assign(stop(pFrom.name, 'AIRPORT', '', pFrom.id), {
            cp: pFrom.id, placeId: pFrom.id, name: pFrom.name, lat: pFrom.lat, lng: pFrom.lng,
            required: true, purposes: ['AIRPORT'], dwellMin: 0, unload: false,
          });
          const stopTo = Object.assign(stop(pTo.name, 'AIRPORT', '', pTo.id), {
            cp: pTo.id, placeId: pTo.id, name: pTo.name, lat: pTo.lat, lng: pTo.lng,
            required: true, purposes: ['AIRPORT'], dwellMin: 0, unload: false,
          });

          const airIdxs = rt.stops.map((s: Any, i: number) => (s.type === 'AIRPORT' ? i : -1)).filter((i: number) => i >= 0);
          if (airIdxs.length >= 2) {
            rt.stops[airIdxs[0]] = stopFrom;
            rt.stops[airIdxs[1]] = stopTo;
          } else {
            // Chèn vào giữa điểm nhận (và chặng đón) với điểm giao (và chặng trả)
            const origin = rt.stops[0];
            const dest = rt.stops[rt.stops.length - 1];
            const originCountry = (origin?.placeId && placeById(origin.placeId)?.country) || 'VN';
            const intermediate = rt.stops.slice(1, -1).filter((s: Any) => s.type !== 'AIRPORT');
            const vnIntermediates = intermediate.filter((s: Any) => {
              const c = s.placeId ? placeById(s.placeId)?.country : undefined;
              return !c || c === originCountry;
            });
            const destIntermediates = intermediate.filter((s: Any) => {
              const c = s.placeId ? placeById(s.placeId)?.country : undefined;
              return c && c !== originCountry;
            });
            rt.stops = [origin, ...vnIntermediates, stopFrom, stopTo, ...destIntermediates, dest];
          }
        }
        // Tự động xác nhận phương án chăm sóc trên khoang
        rt.airCareConfirmation = {
          flightKey: rpFlightKey({ flight: t.flight }),
          at: nowStamp(),
          by: me().name,
        };
      }

      // Lưu vào CSDL SQL Server (bảng FLIGHT_BOOKING)
      try {
        const depIso = new Date(stampMs(departAt)).toISOString();
        const arrIso = new Date(stampMs(arriveAt)).toISOString();
        const fullNote = `[JET STALL: ${jetStallId} (${stallType})] [ESCORT: ${inFlightCare || 'CBN Groom'}] ${notes}`;

        await apiClient.put(`/coordinator/trips/${encodeURIComponent(t.id)}/flight-booking`, {
          providerName: partnerName || airline,
          airline,
          flightNumber: flightNo,
          bookingReference: contractNo,
          departureAt: depIso,
          arrivalAt: arrIso,
          airStallsCount: stallsCount,
          note: fullNote,
        }).catch((e) => console.warn('Lưu booking SQL Server warning:', e));
      } catch (err) {
        console.warn('Lỗi ghi CSDL SQL Server:', err);
      }

      audit('Entered manual charter flight contract', t.id, `${contractNo} · ${flightNo} · Jet Stall ${jetStallId}`);
      commit();
      void rpRoute(t, true);
      setTimeout(() => plannerMap.fitAll?.(), 100);
      toast(`Đã lưu Hợp đồng thuê chuyến Charter ${contractNo} (Chuồng ${jetStallId}) vào CSDL.`);
    },
  });
}
