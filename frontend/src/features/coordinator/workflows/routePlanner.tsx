// ============================================================================
// FLOW 3 – Quản lý địa điểm & lập lộ trình (Điều phối)
// • Một danh mục địa điểm dùng chung; một địa điểm có nhiều chức năng.
// • Điểm nhận / giao lấy từ yêu cầu của khách hàng.
// • Quãng đường / thời gian lấy từ routing service (OSRM, cấu hình được) – chế độ "Mô phỏng" chỉ bật khi người dùng tự chọn.
// • Chính sách nghỉ chăm sóc ngựa là cấu hình mẫu "Đề xuất cho đồ án", không phải luật quốc tế.
// ============================================================================
import { Chk, Field, Inp, Sel } from '../components/common/ui';
import { PlacePickMap } from '../components/maps/LeafletMaps';
import seed from '../data/seed.json';
import { canPlan, checkpoint, curRoute, groundCountry, groundLegs, opsBlock, placeById, placeByName, reqOfTrip, trip, tripHorses } from '../domain/coordinatorRules';
import type { Any } from '../store/coordinatorStore';
import { audit, commit, confirmAction, db, go, me, nextId, notify, nowStamp, onReset, openModal, toast } from '../store/coordinatorStore';
import { addHours, dt, human, stampMs } from '../utils/format';

export const PF: Record<string, string> = { REST: 'Nghỉ & chăm sóc ngựa', FUEL: 'Tiếp nhiên liệu', QUARANTINE: 'Kiểm dịch', BORDER: 'Cửa khẩu / thông quan', AIRPORT: 'Sân bay' };
export const PF_COLOR: Record<string, string> = { REST: '#d97706', FUEL: '#64748b', QUARANTINE: '#7c3aed', BORDER: '#dc2626', AIRPORT: '#2563eb' };
export const PLACE_ST: Record<string, [string, string]> = { ACTIVE: ['READY', 'Đang hoạt động'], SUSPENDED: ['PENDING', 'Tạm ngừng'], INACTIVE: ['CANCELLED', 'Ngừng sử dụng'] };
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
export const ROUTE_POLICY: Any = clone((seed as Any).policy);
export const ROUTING: Any = clone((seed as Any).routing);
export const CITY_GEO: Record<string, [number, number]> = { 'Ho Chi Minh City': [10.7769, 106.7009], Hanoi: [21.0278, 105.8342], 'Da Nang': [16.0544, 108.2022], Bangkok: [13.7563, 100.5018], Singapore: [1.3521, 103.8198], Tokyo: [35.6762, 139.6503], Sydney: [-33.8688, 151.2093], Dubai: [25.2048, 55.2708], London: [51.5072, -0.1276] };
const RP_REQUIRED = ['BORDER', 'QUARANTINE', 'AIRPORT'];

export const stop = (name: string, type: string, plannedAt: string, cp?: string): Any => ({ name, type, plannedAt, cp });
export const kmBetween = (a: number[], b: number[]) => { const R = 6371, dLa = (b[0] - a[0]) * Math.PI / 180, dLo = (b[1] - a[1]) * Math.PI / 180, x = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
export const placeUsedIn = (p: Any) => db.trips.filter((t: Any) => t.routes.some((rt: Any) => rt.stops.some((s: Any) => s.placeId === p.id || s.cp === p.id || s.name === p.name)));

export function rpHours(hours: string) {
  const value = String(hours || '').trim();
  if (/^24\s*\/\s*7$/.test(value)) return { always: true, start: 0, end: 0 };
  const m = value.match(/^([01]\d|2[0-3]):([0-5]\d)\s*[–-]\s*([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  const start = +m[1] * 60 + +m[2], end = +m[3] * 60 + +m[4];
  return start === end ? null : { always: false, start, end };
}
export function openDuring(hours: string, arrival: string, minutes = 0) {
  const span = rpHours(hours);
  if (!span || !arrival || !Number.isFinite(Number(minutes)) || minutes < 0) return false;
  if (span.always) return true;
  const at = Number(arrival.slice(11, 13)) * 60 + Number(arrival.slice(14, 16));
  const duration = Math.max(0, Number(minutes));
  const start = span.start, end = span.end > start ? span.end : span.end + 1440;
  const t = span.end < start && at < start ? at + 1440 : at;
  return t >= start && t < end && t + duration <= end;
}
const rpPlace = (s: Any, rt: Any) => (rt && rt.status !== 'DRAFT' && s.placeSnapshot ? s.placeSnapshot : s.placeId ? placeById(s.placeId) : null);
export const rpPolicy = (rt: Any) => (rt && rt.status !== 'DRAFT' && rt.policySnapshot ? rt.policySnapshot : ROUTE_POLICY);
export const rpFlightKey = (t: Any) => JSON.stringify(t.flight ? [t.flight.from, t.flight.to, t.flight.departAt, t.flight.arriveAt, t.flight.flightNo] : null);

function rpRestErrors(t: Any, s: Any, p: Any, policy: Any) {
  const errors: string[] = [];
  if (!p || !p.functions.includes('REST') || !p.rest) return ['Địa điểm không được đăng ký phục vụ nghỉ/chăm sóc ngựa.'];
  if (p.status !== 'ACTIVE') errors.push('Điểm nghỉ không đang hoạt động.');
  if (!p.rest.truckParking) errors.push('Không đủ chỗ đỗ xe chuyên dụng.');
  if (!p.rest.waterFeed) errors.push('Chưa có nước và thức ăn phục vụ ngựa.');
  if (!Number.isInteger(p.rest.capacity) || p.rest.capacity < tripHorses(t).length) errors.push('Chưa xác nhận sức chứa đủ số ngựa của chuyến.');
  if (s.unload) {
    if (!p.rest.loadingArea || !p.rest.stabling) errors.push('Nghỉ ngoài xe cần khu lên/xuống an toàn và chỗ lưu ngựa.');
  } else if (!p.rest.onboardCare) errors.push('Địa điểm không hỗ trợ chăm sóc ngựa trên xe.');
  if (!Number.isFinite(Number(s.dwellMin)) || Number(s.dwellMin) < policy.shortRestMin) errors.push(`Nghỉ ít nhất ${policy.shortRestMin} phút mới được tính là nghỉ chăm sóc.`);
  return errors;
}

// ---- điểm dừng: tọa độ, điểm bắt buộc, mục đích ----
export function rpEnsure(t: Any, rt: Any) {
  const r = reqOfTrip(t), s = rt.stops;
  if (rt.status === 'DRAFT' && t.mode === 'AIR' && !s.some((x: Any) => x.type === 'AIRPORT') && t.flight) {
    const from = placeById(t.flight.from), to = placeById(t.flight.to);
    if (from && to && from.functions.includes('AIRPORT') && to.functions.includes('AIRPORT')) {
      s.splice(Math.max(1, s.length - 1), 0, ...[from, to].map((p: Any) => Object.assign(stop(p.name, 'AIRPORT', '', p.id), { cp: p.id, placeId: p.id, lat: p.lat, lng: p.lng, required: true, purposes: ['AIRPORT'], dwellMin: 0, unload: false })));
    }
  }
  const end = (place: Any, c: string): [Any, Any, boolean] => (place && place.geo ? [place.geo.lat, place.geo.lng, true] : CITY_GEO[c] ? [CITY_GEO[c][0], CITY_GEO[c][1], false] : [null, null, false]);
  if (!s.length || s[0].type !== 'ORIGIN') s.unshift(stop(r.pickup.name || r.origin, 'ORIGIN', t.plannedDepart));
  if (s[s.length - 1].type !== 'DESTINATION') s.push(stop(r.delivery.name || r.destination, 'DESTINATION', t.eta));
  s.forEach((x: Any) => {
    if (x.type === 'ORIGIN' || x.type === 'DESTINATION') {
      const [la, lo, exact] = end(x.type === 'ORIGIN' ? r.pickup : r.delivery, x.type === 'ORIGIN' ? r.origin : r.destination);
      if (x.lat == null) { x.lat = la; x.lng = lo; x.exactGeo = exact; }
      x.required = true; x.purposes = x.purposes || [];
    } else {
      const p = (x.placeId && placeById(x.placeId)) || (x.cp && placeById(x.cp)) || placeByName(x.name);
      if (p) { x.placeId = p.id; if (x.lat == null) { x.lat = p.lat; x.lng = p.lng; } }
      if (x.required == null) x.required = ['CHECKPOINT', 'QUARANTINE_STATION', 'AIRPORT'].includes(x.type);
      if (!x.purposes) x.purposes = x.type === 'REST_STOP' ? ['REST'] : x.type === 'FUEL_STOP' ? ['FUEL'] : x.type === 'CHECKPOINT' ? ['BORDER'] : x.type === 'QUARANTINE_STATION' ? ['QUARANTINE'] : x.type === 'AIRPORT' ? ['AIRPORT'] : [];
      if (x.dwellMin == null) x.dwellMin = x.purposes.includes('REST') ? (/overnight|stable/i.test(x.name) && p && p.rest && p.rest.stabling ? ROUTE_POLICY.recoveryRestH * 60 : 60) : x.purposes.includes('FUEL') ? 20 : x.type === 'CHECKPOINT' ? 60 : x.type === 'QUARANTINE_STATION' ? 90 : 0;
      if (x.unload == null) x.unload = x.dwellMin >= ROUTE_POLICY.recoveryRestH * 60;
    }
  });
}
export const stopTypeFor = (purposes: string[]) => (purposes.includes('BORDER') ? 'CHECKPOINT' : purposes.includes('QUARANTINE') ? 'QUARANTINE_STATION' : purposes.includes('AIRPORT') ? 'AIRPORT' : purposes.includes('REST') ? 'REST_STOP' : 'FUEL_STOP');

/** nhóm đường bộ: ROAD = 1 nhóm; AIR = điểm nhận→sân bay đi, sân bay đến→điểm giao (chặng bay ở giữa không tính đường bộ) */
export function rpGroups(t: Any, rt: Any): { groups: number[][]; flight: [number, number] | null; airErr?: string } {
  const s = rt.stops;
  if (t.mode !== 'AIR') return { groups: [[...s.keys()]], flight: null };
  const airports = s.map((x: Any, i: number) => (x.type === 'AIRPORT' ? i : -1)).filter((i: number) => i >= 0);
  if (airports.length !== 2) return { groups: [], flight: null, airErr: 'Chuyến AIR cần đúng 2 sân bay. Bấm “Chọn sân bay” để lập hai chặng đường bộ.' };
  const [a, b] = airports;
  if (b !== a + 1) return { groups: [], flight: null, airErr: 'Không được chèn điểm đường bộ vào giữa hai sân bay của chuyến bay thẳng.' };
  const f = rt.status !== 'DRAFT' && rt.flightSnapshot ? rt.flightSnapshot : t.flight;
  if (f && (s[a].cp !== f.from || s[b].cp !== f.to)) return { groups: [], flight: null, airErr: 'Sân bay trên tuyến chưa khớp chuyến bay đã chọn. Kiểm tra và chọn lại sân bay.' };
  return { groups: [[...Array(a + 1).keys()], [...Array(s.length - b).keys()].map((k) => k + b)], flight: [a, b] };
}

// ---- routing (OSRM hoặc mô phỏng do người dùng chọn); yêu cầu mới nhất thắng; nhớ đệm theo tọa độ ----
const routeCache = new Map<string, Any>();
export async function routeVia(points: number[][]): Promise<Any> {
  const key = ROUTING.provider + '|' + ROUTING.url + '|' + points.map((p) => p.map((v) => v.toFixed(5)).join(',')).join(';');
  if (routeCache.has(key)) return routeCache.get(key);
  let res: Any;
  if (ROUTING.provider === 'SIM') {
    await new Promise((r) => setTimeout(r, 250));
    const legs = points.slice(1).map((p, i) => { const km = kmBetween(points[i], p) * 1.3; return { km, min: km, geom: [points[i], p] }; });
    res = { ok: true, sim: true, legs };
  } else {
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), ROUTING.timeoutMs);
    try {
      const r = await fetch(`${ROUTING.url}${points.map((p) => `${p[1]},${p[0]}`).join(';')}?overview=full&geometries=geojson&steps=false`, { signal: ctrl.signal });
      if (!r.ok && r.status !== 400) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (j.code === 'NoRoute' || j.code === 'NoSegment' || !j.routes || !j.routes.length) res = { ok: false, noroute: true, message: j.message || 'Không tìm được đường bộ qua các điểm này.' };
      else {
        const route = j.routes[0], coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
        const cuts = points.map((p) => { let best = 0, bd = 1e9; coords.forEach((c: number[], k: number) => { const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2; if (d < bd) { bd = d; best = k; } }); return best; });
        for (let k = 1; k < cuts.length; k++) if (cuts[k] < cuts[k - 1]) cuts[k] = cuts[k - 1];
        res = { ok: true, legs: route.legs.map((l: Any, k: number) => ({ km: l.distance / 1000, min: l.duration / 60, geom: coords.slice(cuts[k], cuts[k + 1] + 1) })) };
      }
    } catch (e: Any) {
      res = { ok: false, network: true, error: e?.name === 'AbortError' ? 'Hết thời gian chờ routing service.' : 'Trình duyệt không kết nối được routing service (OSRM) – môi trường xem trang có thể đang chặn truy cập mạng ra ngoài.' };
    } finally { clearTimeout(timer); }
  }
  if (res.ok || res.noroute) routeCache.set(key, res);
  return res;
}

// ---- lịch + chính sách nghỉ của ngựa ----
export function rpSchedule(t: Any, rt: Any, legs: Any[]) {
  const s = rt.stops, pol = rpPolicy(rt), { flight } = rpGroups(t, rt), out: Any[] = [], issues: Any[] = [];
  const f = rt.status !== 'DRAFT' && rt.flightSnapshot ? rt.flightSnapshot : t.flight;
  let clock = rt.status !== 'DRAFT' && rt.departureSnapshot ? rt.departureSnapshot : t.plannedDepart;
  let sinceCare = 0, episode = 0, driveMin = 0, stopMin = 0, km = 0, flyMin = 0, airCareMin = 0;
  const add = (value: string, min: number) => addHours(value, min / 60);
  const issue = (kind: string, index: number, msg: string) => issues.push({ [kind]: index, msg });
  s.forEach((x: Any, i: number) => {
    let arrive = clock;
    const isDep = !!flight && i === flight[0], isArr = !!flight && i === flight[1];
    const before = issues.length;
    if (i > 0) {
      if (isArr) {
        if (!f || !f.departAt || !f.arriveAt || !Number.isFinite(stampMs(f.arriveAt)) || stampMs(f.arriveAt) <= stampMs(f.departAt)) {
          issue('seg', i - 1, 'Chưa có lịch bay hợp lệ. Chọn chuyến bay trước khi gửi duyệt; không tự tạo giờ bay giả.');
        } else { arrive = f.arriveAt; flyMin = (stampMs(f.arriveAt) - stampMs(f.departAt)) / 60000; airCareMin += flyMin; }
        if (!rt.airCareConfirmation || rt.airCareConfirmation.flightKey !== rpFlightKey({ flight: f })) issue('seg', i - 1, 'Chưa xác nhận phương án hãng bay/đối tác chăm sóc ngựa trong thời gian bàn giao, chờ và bay.');
        sinceCare = 0; episode = 0;
      } else {
        const l = legs[i - 1];
        if (!l || !Number.isFinite(l.min) || !Number.isFinite(l.km)) issue('seg', i - 1, 'Chưa có kết quả đường bộ hợp lệ cho đoạn này.');
        else {
          const duration = l.min * pol.truckFactor;
          driveMin += duration; km += l.km; arrive = add(clock, duration);
          sinceCare += duration; episode += duration;
          if (sinceCare > pol.careIntervalH * 60) issue('seg', i - 1, `Tới “${x.name}” sau ${(sinceCare / 60).toFixed(1)} giờ từ lần nghỉ chăm sóc (tối đa ${pol.careIntervalH} giờ). Chọn điểm nghỉ có thể đến trước ngưỡng.`);
          if (episode > pol.roadEpisodeH * 60) issue('seg', i - 1, `Đợt đường bộ đã ${(episode / 60).toFixed(1)} giờ (tối đa ${pol.roadEpisodeH} giờ). Cần nghỉ hồi phục ngoài xe ít nhất ${pol.recoveryRestH} giờ trước khi vượt ngưỡng.`);
        }
      }
    }
    const dwell = Number(x.dwellMin || 0), p = rpPlace(x, rt);
    let validRest = false, depart = arrive;
    if (!Number.isFinite(dwell) || dwell < 0) issue('stop', i, 'Thời gian dừng phải là số không âm.');
    if (i > 0 && i < s.length - 1 && !isDep && !isArr) {
      if (x.purposes && x.purposes.includes('REST')) {
        const restErrors = rpRestErrors(t, x, p, pol);
        restErrors.forEach((msg) => issue('stop', i, msg));
        validRest = !restErrors.length && openDuring(p.hours, arrive, dwell);
      }
      if (validRest) { sinceCare = 0; episode = x.unload && dwell >= pol.recoveryRestH * 60 ? 0 : episode + dwell; } else { sinceCare += dwell; episode += dwell; }
      depart = add(arrive, dwell); stopMin += dwell;
      if (!validRest && sinceCare > pol.careIntervalH * 60) issue('stop', i, 'Thời gian dừng/chờ chưa phải nghỉ chăm sóc hợp lệ; đã vượt khoảng giữa hai lần nghỉ.');
      if (episode > pol.roadEpisodeH * 60) issue('stop', i, 'Tổng thời gian đợt đường bộ vượt ngưỡng, kể cả dừng/chờ; nghỉ ngắn không xóa tổng này.');
    }
    if (isDep) {
      if (!f || !f.departAt) issue('stop', i, 'Chưa chọn giờ khởi hành chuyến bay.');
      else {
        const waiting = (stampMs(f.departAt) - stampMs(arrive)) / 60000;
        if (waiting < pol.airportHandoverH * 60) issue('stop', i, `Không kịp bàn giao trước giờ bay; cần ít nhất ${pol.airportHandoverH} giờ.`);
        if (waiting < 0) issue('stop', i, 'Đến sân bay sau giờ bay.');
        stopMin += Math.max(0, waiting); airCareMin += Math.max(0, waiting);
        depart = f.departAt;
      }
    }
    if (isArr) { const receiving = pol.airportReceiveH * 60 + Math.max(0, dwell); depart = add(arrive, receiving); stopMin += receiving; airCareMin += receiving; }
    if (p && p.status !== 'ACTIVE') issue('stop', i, 'Địa điểm không đang hoạt động.');
    if (p && i > 0 && i < s.length - 1) {
      const duration = Math.max(0, (stampMs(depart) - stampMs(arrive)) / 60000);
      if (!openDuring(p.hours, arrive, duration)) issue('stop', i, `Giờ hoạt động ${p.hours || 'chưa xác minh'} không bao phủ toàn bộ thời gian ghé ${dt(arrive)} → ${dt(depart)}.`);
      if (x.purposes.some((fn: string) => !p.functions.includes(fn))) issue('stop', i, 'Mục đích dừng không được địa điểm hỗ trợ.');
      if (x.purposes.includes('FUEL') && (!p.fuel || !p.fuel.heavyAccess)) issue('stop', i, 'Chưa xác nhận xe tải chuyên dụng tiếp cận được trạm nhiên liệu.');
      if (x.type === 'AIRPORT' && (!p.airport || !p.airport.horseHandling)) issue('stop', i, 'Sân bay chưa được xác nhận tiếp nhận ngựa.');
    }
    const cur = issues.slice(before);
    out.push({ arrive: i === 0 ? null : arrive, depart: i === s.length - 1 ? null : depart, segIssue: cur.filter((x) => x.seg != null).map((x) => x.msg), stopIssue: cur.filter((x) => x.stop != null).map((x) => x.msg), sinceCareAfter: sinceCare, episodeAfter: episode, validRest });
    clock = depart;
  });
  return { rows: out, issues, km, driveMin, stopMin, flyMin, airCareMin, eta: out[s.length - 1] && out[s.length - 1].arrive };
}

// ---- trạng thái bộ lập lộ trình ----
/** hạn giao cam kết – không bị kéo dài khi ETA bị sửa */
export const rpDeadline = (t: Any) => { const r = reqOfTrip(t); return t.deliveryDeadline || r.deliveryDeadline || (r.date ? r.date + ' 23:59' : '') || t.etaOriginal || ''; };
export const rpState: Record<string, Any> = {};
onReset(() => { Object.keys(rpState).forEach((k) => delete rpState[k]); routeCache.clear(); Object.assign(ROUTE_POLICY, clone((seed as Any).policy)); Object.assign(ROUTING, clone((seed as Any).routing)); });
export const RP = (id: string) => (rpState[id] = rpState[id] || { seg: null, sel: null, selStop: null, filters: { fn: ['REST', 'FUEL'], country: '', radius: 25, status: 'ACTIVE', hoursOk: false, capOk: false, loading: false, stabling: false, water: false, onboard: false }, seq: 0, routing: { status: 'idle' }, detour: {} });
export const rpEditable = (t: Any, rt: Any) => !!rt && rt.status === 'DRAFT' && canPlan(t) && !opsBlock(t, true);
export const fmtMin = (m: number | null | undefined) => (m == null ? '—' : m < 60 ? `${Math.round(m)} phút` : `${Math.floor(m / 60)} giờ ${String(Math.round(m % 60)).padStart(2, '0')}`);
export const rpRouteKey = (t: Any, rt: Any) => JSON.stringify([rt.status !== 'DRAFT' && rt.metrics ? rt.metrics.provider : ROUTING.provider, ROUTING.url, t.mode, t.truckProfiles || {}, rt.stops.map((x: Any) => [x.lat, x.lng, x.type])]);

/** chuyến demo lập kế hoạch dùng routing mô phỏng riêng */
function rpSimulateDemo(t: Any, rt: Any) {
  const ps = RP(t.id);
  if (rt.status !== 'DRAFT' && rt.routingSnapshot) { ps.routing = { ...clone(rt.routingSnapshot), key: rpRouteKey(t, rt) }; return; }
  if (rt.stops.some((s: Any) => s.lat == null || s.lng == null)) { ps.routing = { status: 'error', key: rpRouteKey(t, rt), error: 'Điểm mới chưa có tọa độ.' }; return; }
  const pts = rt.stops.map((s: Any) => [s.lat, s.lng]);
  ps.routing = { status: 'ok', key: rpRouteKey(t, rt), sim: true, at: nowStamp(), legs: pts.slice(1).map((p: number[], i: number) => { const km = kmBetween(pts[i], p) * 1.3; return { km, min: km, geom: [pts[i], p] }; }) };
}

export async function rpRoute(t: Any, force = false) {
  const rt = curRoute(t), ps = RP(t.id); if (!rt) return;
  rpEnsure(t, rt);
  const key = rpRouteKey(t, rt);
  if (t.demoFlow3) { if (force || ps.routing.key !== key) { rpSimulateDemo(t, rt); commit(); } return; }
  if (rt.status !== 'DRAFT' && rt.routingSnapshot && rt.scheduleSnapshot) { if (ps.routing.key !== key) { ps.routing = { ...clone(rt.routingSnapshot), key }; commit(); } return; }
  if (!force && ps.routing.key === key && ps.routing.status !== 'idle') return;
  const seq = ++ps.seq;
  const missing = rt.stops.filter((x: Any) => x.lat == null || x.lng == null);
  if (missing.length) { ps.routing = { status: 'error', key, error: `Thiếu tọa độ cho: ${missing.map((x: Any) => x.name).join(', ')}.` }; commit(); return; }
  const { groups, airErr } = rpGroups(t, rt);
  if (airErr) { ps.routing = { status: 'error', key, error: airErr }; commit(); return; }
  ps.routing = { status: 'loading', key }; commit();
  const res = await Promise.all(groups.map((g) => routeVia(g.map((i) => [rt.stops[i].lat, rt.stops[i].lng]))));
  if (seq !== ps.seq) return;   // có yêu cầu mới hơn thay thế – bỏ kết quả cũ
  const bad = res.find((x: Any) => !x.ok);
  if (bad) { ps.routing = { status: bad.noroute ? 'noroute' : 'error', key, error: bad.noroute ? bad.message : bad.error, network: !!bad.network }; commit(); return; }
  const legs: Any[] = []; groups.forEach((g, gi) => g.slice(1).forEach((idx, k) => { legs[idx - 1] = res[gi].legs[k]; }));
  ps.routing = { status: 'ok', key, legs, sim: res.some((x: Any) => x.sim), at: nowStamp() };
  commit();
}
export function rpCalc(t: Any) {
  const rt = curRoute(t), ps = RP(t.id);
  if (!rt) return null;
  if (rt.status !== 'DRAFT' && rt.scheduleSnapshot) return clone(rt.scheduleSnapshot);
  return ps.routing.status === 'ok' && ps.routing.key === rpRouteKey(t, rt) ? rpSchedule(t, rt, ps.routing.legs) : null;
}

/** gợi ý địa điểm gần đoạn đường bộ đang chọn (lọc khoảng cách thô; độ lệch thực tế tính bằng routing) */
export function rpCandidates(t: Any) {
  const rt = curRoute(t), ps = RP(t.id), f = ps.filters, seg = ps.seg, calc = rpCalc(t);
  if (seg == null || !calc || !ps.routing.legs || !ps.routing.legs[seg]) return [];
  const { flight } = rpGroups(t, rt); if (flight && seg === flight[0]) return [];
  const geom = ps.routing.legs[seg].geom, step = Math.max(1, Math.floor(geom.length / 300)), pts = geom.filter((_: Any, k: number) => k % step === 0);
  const used = new Set(rt.stops.map((x: Any) => x.placeId).filter(Boolean)), n = tripHorses(t).length, leg = ps.routing.legs[seg];
  const care = calc.rows[seg].sinceCareAfter || 0, departA = calc.rows[seg].depart;
  return db.places.filter((p: Any) => !used.has(p.id) && p.lat != null && p.functions.some((fn: string) => f.fn.includes(fn)) && (!f.country || p.country === f.country) && (f.status === 'ALL' || p.status === f.status || (f.status === 'ACTIVE_SUSP' && p.status !== 'INACTIVE')))
    .map((p: Any) => { let best = 1e9, at = 0; pts.forEach((g: number[], k: number) => { const d = kmBetween(g, [p.lat, p.lng]); if (d < best) { best = d; at = k / Math.max(1, pts.length - 1); } }); return { p, off: best, frac: at }; })
    .filter((c: Any) => c.off <= f.radius)
    .map((c: Any) => {
      const estMin = c.frac * leg.min * ROUTE_POLICY.truckFactor + c.off / 50 * 60, eta = addHours(departA, estMin / 60), why: string[] = [];
      if (c.p.status !== 'ACTIVE') why.push(PLACE_ST[c.p.status][1]);
      if (!openDuring(c.p.hours, eta, c.p.functions.includes('REST') ? ROUTE_POLICY.shortRestMin : 20)) why.push(`đóng cửa lúc dự kiến ghé (${dt(eta)})`);
      if (c.p.functions.includes('REST') && f.fn.includes('REST') && care + estMin > ROUTE_POLICY.careIntervalH * 60) why.push(`đến sau ${((care + estMin) / 60).toFixed(1)} giờ kể từ lần nghỉ – vượt ngưỡng ${ROUTE_POLICY.careIntervalH} giờ`);
      if (f.capOk && c.p.functions.includes('REST') && !(c.p.rest && c.p.rest.capacity >= n)) why.push('sức chứa không đủ');
      if (f.loading && !(c.p.rest && c.p.rest.loadingArea)) why.push('không có khu lên/xuống');
      if (f.stabling && !(c.p.rest && c.p.rest.stabling)) why.push('không có chỗ lưu ngựa');
      if (f.water && !(c.p.rest && c.p.rest.waterFeed)) why.push('không có nước/thức ăn');
      if (f.onboard && !(c.p.rest && c.p.rest.onboardCare)) why.push('không chăm sóc trên xe được');
      return { ...c, eta, estMin, careAt: care + estMin, why };
    })
    .filter((c: Any) => !(f.hoursOk && c.why.some((w: string) => /đóng cửa/.test(w))))
    .sort((a: Any, b: Any) => a.off - b.off).slice(0, 60);
}

export function rpWriteTimes(t: Any, rt: Any, calc: Any) {
  rt.stops.forEach((s: Any, i: number) => { const r = calc.rows[i]; s.plannedAt = (i === 0 ? r.depart : r.arrive) || s.plannedAt; s.departAt = r.depart || ''; s.type = s.type === 'ORIGIN' || s.type === 'DESTINATION' || s.required ? s.type : stopTypeFor(s.purposes); });
  rt.metrics = { km: Math.round(calc.km), driveMin: Math.round(calc.driveMin), stopMin: Math.round(calc.stopMin), flyMin: Math.round(calc.flyMin), eta: calc.eta, provider: t.demoFlow3 ? 'SIM' : ROUTING.provider, at: nowStamp() };
  rt.geom = (RP(t.id).routing.legs || []).map((l: Any) => (l ? l.geom : null));
  rt.stops.forEach((s: Any) => { if (s.placeId && placeById(s.placeId)) s.placeSnapshot = clone(placeById(s.placeId)); });
  rt.scheduleSnapshot = clone(calc); rt.policySnapshot = clone(ROUTE_POLICY);
  rt.routingSnapshot = clone(RP(t.id).routing); rt.flightSnapshot = clone(t.flight || null);
  rt.departureSnapshot = t.plannedDepart; rt.deadlineSnapshot = rpDeadline(t);
}

/** chỉ bổ sung tọa độ – không chèn hay đổi thứ tự điểm */
export function rpCoords(t: Any, rt: Any) {
  const r = reqOfTrip(t); if (!r) return;
  rt.stops.forEach((x: Any) => {
    if (x.lat != null) return;
    if (x.type === 'ORIGIN' || x.type === 'DESTINATION') {
      const pl = x.type === 'ORIGIN' ? r.pickup : r.delivery, c = x.type === 'ORIGIN' ? r.origin : r.destination;
      if (pl && pl.geo) { x.lat = pl.geo.lat; x.lng = pl.geo.lng; x.exactGeo = true; } else if (CITY_GEO[c]) { x.lat = CITY_GEO[c][0]; x.lng = CITY_GEO[c][1]; }
      return;
    }
    const p = (x.placeId && placeById(x.placeId)) || (x.cp && placeById(x.cp)) || placeByName(x.name); if (p) { x.placeId = p.id; x.lat = p.lat; x.lng = p.lng; }
  });
}

// ---- điều khiển bản đồ của bộ lập lộ trình (component bản đồ đăng ký vào đây) ----
export const plannerMap: { fitLeg?: (geom: number[][]) => void; focus?: (lat: number, lng: number) => void } = {};
const rpChanged = (t: Any) => { const ps = RP(t.id); ps.sel = null; ps.detour = {}; commit(); rpRoute(t); };

export function rpSeg(tid: string, i: number) {
  const ps = RP(tid); ps.seg = ps.seg === i ? null : i; ps.sel = null; commit();
  const l = ps.routing.legs && ps.routing.legs[ps.seg]; if (l && l.geom.length) plannerMap.fitLeg?.(l.geom);
}
export function rpFocus(tid: string, i: number, from = '') {
  const t = trip(tid), ps = RP(tid), s = curRoute(t).stops[i]; ps.selStop = i; ps.sel = null; commit();
  if (from === 'map') setTimeout(() => document.getElementById('rp-stop-' + i)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
  else if (s.lat != null) plannerMap.focus?.(s.lat, s.lng);
}
export function rpPick(tid: string, pid: string) { const ps = RP(tid); ps.sel = pid; commit(); rpDetour(tid, pid); }
export async function rpDetour(tid: string, pid: string) {
  const t = trip(tid), ps = RP(tid), rt = curRoute(t), p = placeById(pid), seg = ps.seg; if (seg == null) return;
  const a = rt.stops[seg], b = rt.stops[seg + 1], base = ps.routing.legs[seg], routeKey = rpRouteKey(t, rt); ps.detour[pid] = { status: 'loading' }; commit();
  const res = await routeVia([[a.lat, a.lng], [p.lat, p.lng], [b.lat, b.lng]]);
  if (ps.seg !== seg || rpRouteKey(t, curRoute(t)) !== routeKey || curRoute(t) !== rt) return;
  ps.detour[pid] = res.ok ? { status: 'ok', firstMin: res.legs[0].min * ROUTE_POLICY.truckFactor, km: res.legs[0].km + res.legs[1].km - base.km, min: (res.legs[0].min + res.legs[1].min - base.min) * ROUTE_POLICY.truckFactor, sim: !!res.sim } : { status: 'error', error: res.noroute ? 'Không tìm được đường qua địa điểm này.' : res.error };
  if (ps.sel === pid) commit();
}
export function rpAdd(tid: string, pid: string) {
  const t = trip(tid), rt = curRoute(t), ps = RP(tid), p = placeById(pid);
  if (!rpEditable(t, rt)) return toast('Chỉ sửa được phiên bản nháp.');
  if (ps.seg == null || !p || p.status !== 'ACTIVE') return toast('Chọn đoạn đường bộ và địa điểm đang hoạt động.');
  const grouping = rpGroups(t, rt);
  if (grouping.flight && ps.seg === grouping.flight[0]) return toast('Không chèn điểm đường bộ vào chặng bay.');
  const selected = p.functions.filter((fn: string) => ps.filters.fn.includes(fn));
  const purposes = selected.length ? selected : [...p.functions];
  if (!purposes.length) return toast('Địa điểm chưa có chức năng phục vụ.');
  if (purposes.includes('AIRPORT')) return rpAirports(tid);
  const required = purposes.some((fn: string) => RP_REQUIRED.includes(fn));
  const s = stop(p.name, stopTypeFor(purposes), '', required ? p.id : '');
  Object.assign(s, { cp: required ? p.id : '', placeId: p.id, lat: p.lat, lng: p.lng, required, purposes, dwellMin: purposes.includes('REST') ? 60 : purposes.includes('QUARANTINE') ? 90 : purposes.includes('BORDER') ? 60 : 20, unload: false, careNote: purposes.includes('REST') ? 'Kiểm tra ngựa, cho uống nước và thức ăn' : '' });
  rt.stops.splice(ps.seg + 1, 0, s); ps.selStop = ps.seg + 1; ps.seg = null;
  audit('Added route stop', t.id, p.name); toast(`Đã chèn “${p.name}” đúng chức năng – đang tính lại tuyến…`); rpChanged(t);
}
export function rpAirports(tid: string) {
  const t = trip(tid), rt = curRoute(t); if (!rpEditable(t, rt) || t.mode !== 'AIR') return;
  const airports = (country: string) => db.places.filter((p: Any) => p.functions.includes('AIRPORT') && p.status === 'ACTIVE' && p.country === country && p.airport && p.airport.horseHandling);
  const existing = rt.stops.filter((s: Any) => s.type === 'AIRPORT');
  const options = (country: string): Array<[string, string]> => [['', 'Chọn sân bay'], ...airports(country).map((p: Any) => [p.id, `${p.name} (${p.airport.iata || 'chưa có mã'})`] as [string, string])];
  openModal({
    title: 'Chọn cặp sân bay cho chuyến AIR', ok: 'Áp dụng vào bản nháp',
    init: { from: existing[0]?.cp || t.flight?.from || '', to: existing[1]?.cp || t.flight?.to || '' },
    body: () => (<>
      <p className="hint">Chọn sân bay đi và đến để tính riêng hai chặng đường bộ. Phải khớp chuyến bay đã chọn; không tạo booking tại đây.</p>
      <Field label="Sân bay đi"><Sel name="from" options={options(groundCountry(t, 'outbound'))} /></Field>
      <Field label="Sân bay đến"><Sel name="to" options={options(groundCountry(t, 'inbound'))} /></Field>
    </>),
    onOk: (v) => {
      const a = placeById(v.from), b = placeById(v.to);
      if (!a || !b || a.id === b.id || !airports(groundCountry(t, 'outbound')).includes(a) || !airports(groundCountry(t, 'inbound')).includes(b)) return 'Chọn đúng hai sân bay đang tiếp nhận ngựa ở quốc gia đi và đến.';
      if (t.flight && (t.flight.from !== a.id || t.flight.to !== b.id)) return 'Cặp sân bay chưa khớp chuyến bay hiện tại. Cập nhật đề xuất chuyến bay trước.';
      if (existing.length && (existing[0].cp !== a.id || existing[1]?.cp !== b.id)) return 'Đổi cặp sân bay cần lập lại các chặng trong phiên bản nháp; không tự di chuyển điểm bắt buộc hiện có.';
      if (!existing.length) rt.stops.splice(1, 0, ...[a, b].map((p: Any) => Object.assign(stop(p.name, 'AIRPORT', '', p.id), { cp: p.id, placeId: p.id, lat: p.lat, lng: p.lng, purposes: ['AIRPORT'], required: true, dwellMin: 0, unload: false })));
      rpChanged(t);
    },
  });
}
export function rpDel(tid: string, i: number) { const t = trip(tid), rt = curRoute(t), s = rt.stops[i]; if (!rpEditable(t, rt) || s.required) return toast('Không bỏ được điểm bắt buộc.'); rt.stops.splice(i, 1); RP(tid).selStop = null; rpChanged(t); }
export function rpMove(tid: string, k: number, d: number) {
  const t = trip(tid), rt = curRoute(t), j = k + d, s = rt.stops;
  if (!rpEditable(t, rt) || s[k].required) return; if (j <= 0 || j >= s.length - 1) return;
  if (s[j].required) return toast('Không chuyển điểm tùy chọn qua sân bay, cửa khẩu hoặc điểm bắt buộc. Bỏ và thêm lại vào đúng chặng nếu cần.');
  [s[k], s[j]] = [s[j], s[k]]; RP(tid).selStop = j; rpChanged(t);
}
export function rpRetry(tid: string) { const ps = RP(tid); ps.routing = { status: 'idle' }; for (const k of [...routeCache.keys()]) if (!routeCache.get(k).ok) routeCache.delete(k); rpRoute(trip(tid), true); }
export function rpSave(tid: string) {
  const t = trip(tid), rt = curRoute(t), calc = rpCalc(t); if (!rpEditable(t, rt)) return;
  if (!calc) return toast('Chưa có tuyến hợp lệ cho danh sách điểm hiện tại – chưa thể ghi giờ dự kiến. Bản nháp vẫn giữ danh sách điểm.');
  rpWriteTimes(t, rt, calc); rt.savedAt = nowStamp(); audit('Saved route draft', tid, `v${rt.v}`);
  toast(`Đã lưu bản nháp v${rt.v}${calc.issues.length ? ` – còn ${calc.issues.length} lỗi cần xử lý trước khi gửi duyệt` : ''}.`);
}
const resetRouting = () => Object.keys(rpState).forEach((k) => { rpState[k].routing = { status: 'idle' }; rpState[k].detour = {}; });
export function rpUseSim(tid: string) { ROUTING.provider = 'SIM'; resetRouting(); toast('Đang dùng routing mô phỏng – quãng đường/thời gian là ước tính.'); rpRoute(trip(tid), true); }
export function rpPolicyModal() {
  const P = ROUTE_POLICY;
  openModal({
    title: 'Chính sách nghỉ chăm sóc (Đề xuất cho đồ án)', ok: 'Lưu cấu hình',
    init: { a: P.careIntervalH, b: P.shortRestMin, c: P.roadEpisodeH, d: P.recoveryRestH, e: P.truckFactor, f: P.airportHandoverH, g: P.airportReceiveH },
    body: () => (<>
      <p className="hint" style={{ marginTop: 0 }}>Các giá trị chưa được chủ dự án chốt; không phải luật quốc tế. Áp dụng cho bản demo này.</p>
      <div className="form-grid">
        <Field label="Tối đa giữa 2 lần nghỉ chăm sóc (giờ)"><Inp name="a" type="number" min="1" step="0.5" /></Field>
        <Field label="Nghỉ ngắn tối thiểu (phút)"><Inp name="b" type="number" min="10" step="5" /></Field>
        <Field label="Một đợt đường bộ tối đa (giờ)"><Inp name="c" type="number" min="2" step="0.5" /></Field>
        <Field label="Nghỉ hồi phục ngoài xe tối thiểu (giờ)"><Inp name="d" type="number" min="1" step="0.5" /></Field>
        <Field label="Hệ số thời gian xe chở ngựa"><Inp name="e" type="number" min="1" step="0.05" /></Field>
        <Field label="Bàn giao sân bay trước bay (giờ)"><Inp name="f" type="number" min="0" step="0.5" /></Field>
        <Field label="Tiếp nhận sau hạ cánh (giờ)"><Inp name="g" type="number" min="0" step="0.5" /></Field>
      </div>
    </>),
    onOk: (v) => {
      const n = (k: string) => Number(v[k]);
      if (['a', 'b', 'c', 'd', 'e'].some((k) => !(n(k) > 0))) return 'Giá trị không hợp lệ.';
      Object.assign(ROUTE_POLICY, { careIntervalH: n('a'), shortRestMin: n('b'), roadEpisodeH: n('c'), recoveryRestH: n('d'), truckFactor: n('e'), airportHandoverH: n('f'), airportReceiveH: n('g') });
    },
  });
}
export function rpRoutingModal() {
  openModal({
    title: 'Routing service', ok: 'Lưu', init: { prov: ROUTING.provider, url: ROUTING.url },
    body: () => (<>
      <Field label="Nhà cung cấp"><Sel name="prov" options={[['OSRM', 'OSRM (đường bộ thực tế)'], ['SIM', 'Mô phỏng – chỉ để demo khi không có mạng (ước tính, không phải đường thực tế)']]} /></Field>
      <Field label="URL OSRM"><Inp name="url" /></Field>
      <p className="hint">Không cần khóa dịch vụ. Dự án thật nên gọi qua backend/cấu hình môi trường, không đặt khóa trong frontend.</p>
    </>),
    onOk: (v) => { ROUTING.provider = v.prov; ROUTING.url = v.url || ROUTING.url; resetRouting(); },
  });
}
// thay đổi trực tiếp trên danh sách điểm (bản nháp)
export function rpSetFilter(tid: string, key: string, value: Any) { const ps = RP(tid); ps.filters[key] = value; ps.sel = null; commit(); }
export function rpSetAirCare(tid: string, on: boolean) { const t = trip(tid), rt = curRoute(t); if (!rpEditable(t, rt)) return; rt.airCareConfirmation = on ? { flightKey: rpFlightKey(t), at: nowStamp(), by: me().name } : null; commit(); }
export function rpSetPurpose(tid: string, i: number, fn: string, on: boolean) {
  const t = trip(tid), rt = curRoute(t); if (!rpEditable(t, rt)) return; const s = rt.stops[i];
  s.purposes = on ? [...new Set([...s.purposes, fn])] : s.purposes.filter((x: string) => x !== fn);
  if (!s.purposes.length) { s.purposes = [fn]; toast('Một lần ghé cần ít nhất một mục đích.'); return; }
  s.type = stopTypeFor(s.purposes); commit();
}
export function rpSetStop(tid: string, i: number, key: 'dwellMin' | 'unload' | 'careNote', value: Any) {
  const t = trip(tid), rt = curRoute(t); if (!rpEditable(t, rt)) return;
  rt.stops[i][key] = key === 'dwellMin' ? Math.max(0, Number(value) || 0) : value; commit();
}

// ---- kiểm tra trước khi gửi duyệt ----
export function validateRoute(t: Any, rt: Any) {
  const s = rt.stops;
  if (s.length < 2) return 'Tuyến cần ít nhất điểm nhận và điểm giao.';
  if (s[0].type !== 'ORIGIN' || s[s.length - 1].type !== 'DESTINATION') return 'Điểm đầu phải là điểm nhận và điểm cuối phải là điểm giao.';
  if (s.some((x: Any) => !x.name.trim() || !x.plannedAt)) return 'Mỗi điểm dừng cần có tên và thời gian dự kiến.';
  for (let i = 1; i < s.length; i++) if (s[i].plannedAt <= s[i - 1].plannedAt) return `Điểm ${i + 1} (${s[i].name}) phải có thời gian sau điểm ${i}.`;
  if (s.some((x: Any) => ['CHECKPOINT', 'AIRPORT', 'QUARANTINE_STATION'].includes(x.type) && !x.cp)) return 'Chọn cửa khẩu, sân bay hoặc trạm cho mỗi điểm thuộc loại này.';
  if (t.mode === 'ROAD' && s.some((x: Any) => x.type === 'AIRPORT')) return 'Sân bay chỉ thuộc phương án AIR; chọn đúng chức năng nếu ghé địa điểm đa dịch vụ.';
  if (t.mode === 'AIR' && s.filter((x: Any) => x.type === 'AIRPORT').length !== 2) return 'Vận chuyển hàng không dùng một chuyến bay thẳng: thêm đúng hai điểm sân bay.';
  if (t.mode === 'AIR') {
    const ai = s.findIndex((x: Any) => x.type === 'AIRPORT');
    if (s[ai + 1].type !== 'AIRPORT') return 'Chuyến bay thẳng không có điểm dừng giữa sân bay đi và sân bay đến.';
    if (s[ai].cp === s[ai + 1].cp) return 'Sân bay đi và sân bay đến phải khác nhau.';
    if (checkpoint(s[ai].cp)?.country !== groundCountry(t, 'outbound') || checkpoint(s[ai + 1].cp)?.country !== groundCountry(t, 'inbound')) return 'Sân bay trên tuyến phải nằm tại đúng quốc gia xuất phát và quốc gia đến.';
  }
  return '';
}
/** chữ ký nguồn lực (xe + nhân sự + chặng sân bay) để phát hiện thay đổi sau duyệt */
export const resourceSignature = (t: Any) => JSON.stringify([t.vehicleId || '', t.crew || {}, t.mode === 'AIR' ? ['outbound', 'inbound'].map((k) => [groundLegs(t)[k].vehicleId || '', groundLegs(t)[k].crew || {}]) : null]);

// ---- tạo phiên bản tuyến mới ----
export function routeNew(id: string) {
  const t = trip(id), last = curRoute(t), r = reqOfTrip(t);
  if (!canPlan(t)) return toast(opsBlock(t) || 'Lập tuyến bắt đầu sau khi Quản lý xác nhận triển khai.');
  if (last && ['DRAFT', 'PENDING_APPROVAL'].includes(last.status)) return toast(last.status === 'DRAFT' ? `Phiên bản ${last.v} vẫn là bản nháp. Chỉnh sửa và gửi phiên bản này.` : `Phiên bản ${last.v} đang chờ Quản lý quyết định.`);
  const stops = last ? last.stops.map((x: Any) => { const s = { ...x }; delete s.placeSnapshot; return s; }) : [stop(r.pickup.name || r.origin, 'ORIGIN', t.plannedDepart), stop(r.delivery.name || r.destination, 'DESTINATION', t.eta)];
  t.routes.push({ v: (last ? last.v : 0) + 1, status: 'DRAFT', submittedAt: null, decidedAt: null, note: '', stops });
  audit(last ? 'Started revised route version' : 'Started route version', id, `Version ${t.routes.length}`);
  go(`f/trip/${id}/route`); commit();
}

// ---- gửi Manager duyệt (đường bộ) – chuyến AIR dùng submitAirPlan trong air.tsx ----
export let routeSubmitError = '';
export const setRouteError = (m: string) => { routeSubmitError = m; if (m) toast(m); commit(); };
export function submitRoadRoute(id: string, extraCheck?: () => string, onSubmitted?: () => void) {
  const t = trip(id), rt = curRoute(t);
  if (!rt || rt.status !== 'DRAFT') return toast('Chỉ gửi được phiên bản tuyến đang là bản nháp.');
  rpEnsure(t, rt);
  const calc = rpCalc(t), ps = RP(id);
  if (!calc) return setRouteError(ps.routing.status === 'loading' ? 'Đang tính tuyến – chờ kết quả rồi gửi.' : 'Chưa có tuyến hợp lệ cho danh sách điểm hiện tại (routing lỗi hoặc chưa tính). Không gửi duyệt.');
  if (calc.issues.length) return setRouteError(`Còn ${calc.issues.length} lỗi về nghỉ chăm sóc / địa điểm – xử lý trước khi gửi duyệt.`);
  if (rpDeadline(t) && calc.eta > rpDeadline(t)) return setRouteError('ETA trễ hơn hạn giao.');
  const pre = extraCheck?.(); if (pre) return toast(pre);
  rpWriteTimes(t, rt, calc);
  const err = validateRoute(t, rt);
  if (err) return setRouteError(err);
  routeSubmitError = '';
  confirmAction(`Gửi tuyến phiên bản ${rt.v}?`, `${rt.stops.length} điểm dừng. Quản lý duyệt hoặc trả lại; bạn không thể sửa phiên bản này khi đang chờ.`, 'Gửi tuyến', () => {
    if (rt.status !== 'DRAFT' || opsBlock(t)) { toast(opsBlock(t) || 'Phiên bản này đã được gửi.'); return; }
    const again = extraCheck?.(); if (again) return again;
    onSubmitted?.();
    rt.status = 'PENDING_APPROVAL'; rt.submittedAt = nowStamp();
    notify('LOGISTICS_MANAGER', `Tuyến ${id} đã gửi duyệt`, `Phiên bản ${rt.v} • ${rt.stops.length} điểm dừng`, `m/trip/${id}/route`);
    audit('Submitted route', id, `Version ${rt.v}`); toast('Đã gửi tuyến cho Quản lý.');
  });
}

// ============================================================================
// Danh mục địa điểm
// ============================================================================
const COUNTRIES = ['VN', 'KH', 'TH', 'MY', 'SG', 'JP'];
export function placeEdit(id: string) {
  const p = id ? placeById(id) : null;
  const h = String(p?.hours || '24/7'), all = h === '24/7', parts = h.split(/[–-]/);
  const r = p?.rest || {}, f = p?.fuel || {}, a = p?.airport || {}, s = p?.service || {};
  openModal({
    title: p ? `Địa điểm • ${p.name}` : 'Thêm địa điểm', ok: p ? 'Lưu thay đổi' : 'Thêm', wide: true,
    init: {
      name: p?.name || '', country: p?.country || 'VN', prov: p?.province || '', addr: p?.address || '',
      fn: p ? [...p.functions] : [], lat: p && p.lat != null ? String(p.lat) : '', lng: p && p.lng != null ? String(p.lng) : '',
      hAll: all, hOpen: all ? '06:00' : parts[0] || '', hClose: all ? '22:00' : parts[1] || '',
      r1: r.truckParking !== false, r2: !!r.onboardCare, r3: !!r.waterFeed, r4: !!r.loadingArea, r5: !!r.stabling, r6: String(r.capacity || 0),
      f1: f.fuels || 'Diesel', f2: f.heavyAccess !== false, a1: a.iata || '', a2: !!a.horseHandling, s1: s.kind || '', s2: s.capacity || '',
    },
    body: (fm) => <PlaceForm p={p} fm={fm} />,
    onOk: (v) => {
      const fn: string[] = v.fn, lat = Number(v.lat), lng = Number(v.lng);
      const hours = v.hAll ? '24/7' : v.hOpen && v.hClose && v.hOpen !== v.hClose ? `${v.hOpen}–${v.hClose}` : '';
      if (String(v.name).trim().length < 3 || !String(v.prov).trim()) return 'Nhập tên và tỉnh/thành.';
      if (!fn.length) return 'Chọn ít nhất một chức năng.';
      if (!rpHours(hours)) return 'Giờ hoạt động phải là 24/7 hoặc HH:mm–HH:mm hợp lệ.';
      if (fn.includes('REST') && (!Number.isInteger(Number(v.r6)) || Number(v.r6) < 1)) return 'Nhập sức chứa điểm nghỉ là số nguyên lớn hơn 0.';
      if (fn.includes('AIRPORT') && !/^[A-Z]{3}$/.test(String(v.a1).toUpperCase())) return 'Mã sân bay IATA gồm đúng 3 chữ cái.';
      if (!(lat >= -90 && lat <= 90) || !(lng >= -180 && lng <= 180) || v.lat === '' || v.lng === '') return 'Nhập hoặc chọn tọa độ hợp lệ.';
      const dup = db.places.find((x: Any) => x !== p && x.lat != null && kmBetween([x.lat, x.lng], [lat, lng]) < 0.05);
      if (dup) return `Đã có “${dup.name}” tại tọa độ này – thêm chức năng vào địa điểm đó thay vì tạo bản ghi trùng.`;
      const data = {
        name: String(v.name).trim(), country: v.country, province: String(v.prov).trim(), address: String(v.addr).trim(), functions: fn, lat, lng, hours, updatedAt: nowStamp(),
        rest: fn.includes('REST') ? { truckParking: !!v.r1, onboardCare: !!v.r2, waterFeed: !!v.r3, loadingArea: !!v.r4, stabling: !!v.r5, capacity: Number(v.r6 || 0) } : null,
        fuel: fn.includes('FUEL') ? { fuels: v.f1 || 'Diesel', heavyAccess: !!v.f2 } : null,
        airport: fn.includes('AIRPORT') ? { iata: String(v.a1).toUpperCase(), horseHandling: !!v.a2 } : null,
        service: fn.some((x) => ['QUARANTINE', 'BORDER'].includes(x)) ? { kind: v.s1, capacity: v.s2 } : null,
      };
      if (p) Object.assign(p, data); else db.places.push(Object.assign({ id: nextId('PL'), type: 'SERVICE', status: 'ACTIVE', sample: false }, data));
      audit(p ? 'Updated place' : 'Added place', data.name, fn.join(', ')); toast(p ? 'Đã lưu địa điểm.' : 'Đã thêm địa điểm.');
    },
  });
}
// phần thân form địa điểm (bản đồ chọn tọa độ ở components/LeafletMaps)
function PlaceForm({ p, fm }: { p: Any; fm: { v: Any; set: (k: string, v: Any) => void } }) {
  const fns: string[] = fm.v.fn;
  const toggle = (fn: string, on: boolean) => fm.set('fn', on ? [...fns, fn] : fns.filter((x) => x !== fn));
  const geo = () => {
    const q = [fm.v.addr, fm.v.prov].filter(Boolean).join(', ');
    if (!q) return toast('Nhập địa chỉ hoặc tỉnh/thành trước.');
    const hits = db.places.filter((x: Any) => x.lat != null && x.country === fm.v.country && [x.province, x.address, x.name].some((k: string) => String(k || '').toLowerCase().includes(String(fm.v.prov || fm.v.addr).toLowerCase())));
    fm.set('geoRes', hits.length ? hits.slice(0, 5).map((x: Any) => ({ label: `${x.address || x.name}, ${x.province}`, lat: x.lat, lng: x.lng })) : []);
    fm.set('geoDone', true);
  };
  return (<>
    <div className="form-grid">
      <Field label="Tên địa điểm *"><Inp name="name" /></Field>
      <Field label="Quốc gia *"><Sel name="country" options={COUNTRIES.map((c) => [c, c] as [string, string])} /></Field>
    </div>
    <div className="form-grid">
      <Field label="Tỉnh/thành *"><Inp name="prov" /></Field>
      <Field label="Địa chỉ"><Inp name="addr" /></Field>
    </div>
    <div className="field"><label>Chức năng phục vụ *</label>
      <div className="pl-fns">{Object.keys(PF).map((fn) => <label key={fn}><input type="checkbox" checked={fns.includes(fn)} onChange={(e) => toggle(fn, e.target.checked)} /> {PF[fn]}</label>)}</div>
    </div>
    <div id="pl-extras">
      {fns.includes('REST') ? <fieldset className="pl-fs"><legend>Điểm nghỉ</legend>
        <Chk name="r1">Đỗ được xe chuyên dụng</Chk><Chk name="r2">Chăm sóc ngựa trên xe</Chk><Chk name="r3">Có nước / thức ăn</Chk><Chk name="r4">Có khu lên/xuống ngựa</Chk><Chk name="r5">Có chỗ lưu ngựa</Chk>
        <Field label="Sức chứa cơ sở (số ngựa)"><Inp name="r6" type="number" min="0" /></Field></fieldset> : null}
      {fns.includes('FUEL') ? <fieldset className="pl-fs"><legend>Trạm nhiên liệu</legend><Field label="Loại nhiên liệu"><Inp name="f1" /></Field><Chk name="f2">Xe tải lớn vào được</Chk></fieldset> : null}
      {fns.includes('AIRPORT') ? <fieldset className="pl-fs"><legend>Sân bay</legend><Field label="Mã sân bay (IATA)"><Inp name="a1" maxLength={3} /></Field><Chk name="a2">Tiếp nhận vận chuyển ngựa</Chk></fieldset> : null}
      {fns.some((x) => ['QUARANTINE', 'BORDER'].includes(x)) ? <fieldset className="pl-fs"><legend>Kiểm dịch / cửa khẩu</legend><Field label="Loại dịch vụ"><Inp name="s1" /></Field><Field label="Khả năng tiếp nhận"><Inp name="s2" /></Field></fieldset> : null}
    </div>
    <div className="field"><label>Tọa độ *</label>
      <div className="pl-coord"><Inp name="lat" placeholder="Vĩ độ" /><Inp name="lng" placeholder="Kinh độ" /><button type="button" className="btn ghost sm" onClick={geo}>Tìm theo địa chỉ</button></div>
      <div id="pl-geo-res">{fm.v.geoDone ? ((fm.v.geoRes || []).length ? <>{fm.v.geoRes.map((it: Any, k: number) => (
        <button type="button" key={k} className="geo-item" onClick={() => { fm.set('lat', String(it.lat)); fm.set('lng', String(it.lng)); fm.set('geoDone', false); }}>
          <span><b>{it.label}</b><small className="geo-coord">{Number(it.lat).toFixed(5)}, {Number(it.lng).toFixed(5)}</small></span></button>))}
        <p className="hint">Kết quả tìm địa chỉ trong demo là dữ liệu mẫu (cùng dạng API Geoapify).</p></> : <p className="hint">Không tìm thấy. Chọn trực tiếp trên bản đồ.</p>) : null}</div>
      <PlacePickMap lat={fm.v.lat === '' ? null : Number(fm.v.lat)} lng={fm.v.lng === '' ? null : Number(fm.v.lng)} onPick={(la, lo) => { fm.set('lat', la.toFixed(6)); fm.set('lng', lo.toFixed(6)); }} />
      <small className="hint">Bấm trên bản đồ để chọn tọa độ, rồi bấm Lưu để xác nhận.</small>
    </div>
    <fieldset className="f3-hours"><legend>Thời gian hoạt động *</legend>
      <Chk name="hAll">Mở cửa 24/7</Chk>
      <div className="form-grid">
        <Field label="Giờ mở cửa"><Inp name="hOpen" type="time" disabled={!!fm.v.hAll} /></Field>
        <Field label="Giờ đóng cửa"><Inp name="hClose" type="time" disabled={!!fm.v.hAll} /></Field>
      </div>
      <p className="hint">Có thể đóng cửa qua đêm, ví dụ 18:00–06:00. Toàn bộ thời gian ghé phải nằm trong giờ mở cửa.</p>
    </fieldset>
    {p ? <p className="hint">Cập nhật gần nhất {dt(p.updatedAt)}{p.sample ? ' • dữ liệu mẫu' : ''}. Sửa địa điểm không tự sửa kế hoạch đã duyệt.</p> : null}
  </>);
}
export function placeStatus(id: string) {
  const p = placeById(id), used = placeUsedIn(p);
  openModal({
    title: `Trạng thái • ${p.name}`, ok: 'Lưu', init: { st: p.status, note: p.statusReason || '' },
    body: () => (<>
      <Field label="Trạng thái"><Sel name="st" options={Object.keys(PLACE_ST).map((k) => [k, PLACE_ST[k][1]] as [string, string])} /></Field>
      <Field label="Lý do thay đổi trạng thái"><Inp name="note" /></Field>
      {used.length ? <div className="note yellow"><div><b>Đang dùng trong {used.length} kế hoạch</b>{used.map((t: Any) => `${t.id} (${human(t.status)})`).join(', ')}. Tạm ngừng/ngừng sẽ cảnh báo các kế hoạch này; kế hoạch đã duyệt không tự bị sửa.</div></div> : null}
    </>),
    onOk: (v) => {
      const old = p.status; p.status = v.st; p.statusReason = v.note; p.updatedAt = nowStamp();
      if (old === 'ACTIVE' && p.status !== 'ACTIVE') used.filter((t: Any) => t.status !== 'COMPLETED').forEach((t: Any) => notify('FLEET_COORDINATOR', `Địa điểm “${p.name}” ${PLACE_ST[p.status][1].toLowerCase()}`, `Kế hoạch ${t.id} có dùng địa điểm này – kiểm tra và thay thế nếu cần.`, `f/trip/${t.id}/route`));
      audit('Changed place status', p.name, PLACE_ST[p.status][1]);
    },
  });
}
export function placeDelete(id: string) {
  const p = placeById(id); if (placeUsedIn(p).length) return toast('Địa điểm đã dùng trong lịch sử chuyến – chỉ có thể ngừng sử dụng.');
  confirmAction(`Xóa ${p.name}?`, 'Địa điểm chưa được dùng trong kế hoạch nào.', 'Xóa', () => { db.places.splice(db.places.indexOf(p), 1); });
}

/** bổ sung tọa độ cho mọi tuyến đã có (bản đồ chỉ đọc) */
export const ensureCoords = () => db.trips.forEach((t: Any) => t.routes.forEach((rt: Any) => rpCoords(t, rt)));
