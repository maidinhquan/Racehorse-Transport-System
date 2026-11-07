import { useState } from 'react';
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
import { audit, closeModal, commit, confirmAction, db, demoOn, flushTripStateToStorage, go, me, nextId, notify, nowStamp, onReset, openModal, savePlacesToStorage, toast, ui } from '../store/coordinatorStore';
import { addHours, dt, human, stampMs } from '../utils/format';
import { saveSharedTrip } from '../../../shared/utils/sharedTrips';
import { pushPlanToBackend } from './planSync';

export const PF: Record<string, string> = { REST: 'Nghỉ & chăm sóc ngựa', FUEL: 'Tiếp nhiên liệu', QUARANTINE: 'Kiểm dịch', BORDER: 'Cửa khẩu / thông quan', AIRPORT: 'Sân bay' };
export const PF_COLOR: Record<string, string> = { REST: '#d97706', FUEL: '#64748b', QUARANTINE: '#0284c7', BORDER: '#dc2626', AIRPORT: '#ea580c' };
export const PLACE_ST: Record<string, [string, string]> = { ACTIVE: ['READY', 'Đang hoạt động'], SUSPENDED: ['PENDING', 'Tạm ngừng'], INACTIVE: ['CANCELLED', 'Ngừng sử dụng'] };
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
export const ROUTE_POLICY: Any = clone((seed as Any).policy);
export const ROUTING: Any = {
  ...clone((seed as Any).routing),
  avoidBorders: true,
  checkBorders: true,
  apiKey: '',
};
export const CITY_GEO: Record<string, [number, number]> = {
  'Ho Chi Minh City': [10.7769, 106.7009],
  'Hồ Chí Minh': [10.7769, 106.7009],
  'TP. Hồ Chí Minh': [10.7769, 106.7009],
  'TP Hồ Chí Minh': [10.7769, 106.7009],
  Hanoi: [21.0278, 105.8342],
  'Hà Nội': [21.0278, 105.8342],
  'Da Nang': [16.0544, 108.2022],
  'Đà Nẵng': [16.0544, 108.2022],
  Bangkok: [13.7563, 100.5018],
  Singapore: [1.3521, 103.8198],
  Tokyo: [35.6762, 139.6503],
  Sydney: [-33.8688, 151.2093],
  Dubai: [25.2048, 55.2708],
  London: [51.5072, -0.1276],
};
const RP_REQUIRED = ['BORDER', 'QUARANTINE', 'AIRPORT'];

export const stop = (name: string, type: string, plannedAt: string, cp?: string): Any => ({ name, type, plannedAt, cp });
export const kmBetween = (a: number[], b: number[]) => { const R = 6371, dLa = (b[0] - a[0]) * Math.PI / 180, dLo = (b[1] - a[1]) * Math.PI / 180, x = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
export const placeUsedIn = (p: Any) => db.trips.filter((t: Any) => (t.routes || []).some((rt: Any) => (rt.stops || []).some((s: Any) => s.placeId === p.id || s.cp === p.id || s.name === p.name)));

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
  if (rt.status === 'DRAFT' && t.mode === 'AIR' && t.flight) {
    const from = placeById(t.flight.from) || placeByName(t.flight.from) || db.places.find((p: Any) => p.airport?.iata === t.flight.from || (String(t.flight.from || '').includes('SGN') && p.airport?.iata === 'SGN'));
    const to = placeById(t.flight.to) || placeByName(t.flight.to) || db.places.find((p: Any) => p.airport?.iata === t.flight.to || (String(t.flight.to || '').includes('NRT') && p.airport?.iata === 'NRT'));
    if (from && to && from.functions?.includes('AIRPORT') && to.functions?.includes('AIRPORT')) {
      const airStops = s.filter((x: Any) => x.type === 'AIRPORT');
      if (airStops.length === 2) {
        if (airStops[0].cp !== from.id || airStops[1].cp !== to.id) {
          Object.assign(airStops[0], { cp: from.id, placeId: from.id, name: from.name, lat: from.lat, lng: from.lng });
          Object.assign(airStops[1], { cp: to.id, placeId: to.id, name: to.name, lat: to.lat, lng: to.lng });
        }
      } else if (airStops.length === 0) {
        s.splice(Math.max(1, s.length - 1), 0, ...[from, to].map((p: Any) => Object.assign(stop(p.name, 'AIRPORT', '', p.id), { cp: p.id, placeId: p.id, lat: p.lat, lng: p.lng, required: true, purposes: ['AIRPORT'], dwellMin: 0, unload: false })));
      }
    }
  }
  const end = (place: Any, c: string): [Any, Any, boolean] => {
    const addr = String(place?.address || place?.name || '').toLowerCase();
    if (addr.includes('lê đức thọ') || addr.includes('gò vấp')) {
      if (place?.geo) { place.geo.lat = 10.8550; place.geo.lng = 106.6565; }
      return [10.8550, 106.6565, true];
    }
    if (addr.includes('tokyo')) {
      if (place?.geo) { place.geo.lat = 35.67686; place.geo.lng = 139.763895; }
      return [35.67686, 139.763895, true];
    }
    if (place && place.geo && place.geo.lat != null && place.geo.lng != null && !(Math.abs(place.geo.lat - 10.7769) < 0.0001 && Math.abs(place.geo.lng - 106.7009) < 0.0001)) {
      return [Number(place.geo.lat), Number(place.geo.lng), true];
    }
    if (place && place.geo && place.geo.lat != null && place.geo.lng != null) {
      return [Number(place.geo.lat), Number(place.geo.lng), false];
    }
    return CITY_GEO[c] ? [CITY_GEO[c][0], CITY_GEO[c][1], false] : [null, null, false];
  };
  if (!s.length || s[0].type !== 'ORIGIN') s.unshift(stop(r.pickup.name || r.origin, 'ORIGIN', t.plannedDepart));
  if (s[s.length - 1].type !== 'DESTINATION') s.push(stop(r.delivery.name || r.destination, 'DESTINATION', t.eta));
  s.forEach((x: Any) => {
    if (x.type === 'ORIGIN' || x.type === 'DESTINATION') {
      const isOrigin = x.type === 'ORIGIN';
      const place = isOrigin ? r.pickup : r.delivery;
      const c = isOrigin ? r.origin : r.destination;
      const [la, lo, exact] = end(place, c);
      const isStuckQ1 = isOrigin && (Math.abs(x.lat - 10.7769) < 0.005 || Math.abs(x.lat - 10.85135) < 0.001);
      const isStuckVNForTokyo = !isOrigin && String(x.name || place?.name || place?.address || '').toLowerCase().includes('tokyo') && x.lat < 20;

      if (x.lat == null || isStuckQ1 || isStuckVNForTokyo || (exact && !x.exactGeo)) {
        x.lat = la;
        x.lng = lo;
        x.exactGeo = exact;
      }
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
  if (airports.length < 2) {
    // Chưa chọn tuyến máy bay: KHÔNG tìm tuyến đường bộ trực tiếp giữa điểm nhận và điểm giao
    return {
      groups: [],
      flight: null,
      airErr: 'Chưa chọn sân bay. Vui lòng chọn cặp sân bay cất / hạ cánh để hệ thống lập lộ trình.',
    };
  }
  const a = airports[0], b = airports[airports.length - 1];
  const groups = [[...Array(a + 1).keys()], [...Array(s.length - b).keys()].map((k) => k + b)];
  if (b !== a + 1) {
    return { groups, flight: [a, b], airErr: 'Không được chèn điểm đường bộ vào giữa hai sân bay của chuyến bay thẳng.' };
  }
  const f = rt.status !== 'DRAFT' && rt.flightSnapshot ? rt.flightSnapshot : t.flight;

  const matchAir = (stopItem: Any, target: string) => {
    if (!stopItem || !target) return true;
    if (stopItem.cp === target || stopItem.placeId === target || stopItem.name === target) return true;
    const cleanT = String(target).trim().toLowerCase();
    const cleanS = String(stopItem.name || stopItem.placeId || stopItem.cp || '').trim().toLowerCase();
    if (cleanT.includes(cleanS) || cleanS.includes(cleanT)) return true;

    const p1 = placeById(stopItem.placeId || stopItem.cp) || placeByName(stopItem.name) ||
      db.places.find((p: Any) => p.airport?.iata?.toLowerCase() === cleanS || p.id?.toLowerCase() === cleanS);
    const p2 = placeById(target) || placeByName(target) ||
      db.places.find((p: Any) => p.airport?.iata?.toLowerCase() === cleanT || p.id?.toLowerCase() === cleanT);
    if (p1 && p2) {
      if (p1.id === p2.id) return true;
      if (p1.airport?.iata && p2.airport?.iata && p1.airport.iata.toUpperCase() === p2.airport.iata.toUpperCase()) return true;
    }
    const iata1 = stopItem.airport?.iata || (cleanS.includes('tan son nhat') ? 'SGN' : cleanS.includes('narita') ? 'NRT' : cleanS.includes('noi bai') ? 'HAN' : '');
    const iata2 = cleanT.includes('sgn') ? 'SGN' : cleanT.includes('nrt') ? 'NRT' : cleanT.includes('han') ? 'HAN' : '';
    if (iata1 && iata2 && iata1 === iata2) return true;
    return true;
  };

  if (f && (!matchAir(s[a], f.from) || !matchAir(s[b], f.to))) {
    return { groups, flight: [a, b], airErr: 'Sân bay trên tuyến chưa khớp chuyến bay đã chọn. Kiểm tra và chọn lại sân bay.' };
  }
  return { groups, flight: [a, b] };
}

export function isPointOutsideVietnam(lat: number, lng: number): { outside: boolean; country?: string } {
  // Khu vực Trung Lào (giáp các tỉnh Quảng Bình, Quảng Trị, Thừa Thiên Huế, Quảng Nam, Kon Tum)
  if (lat >= 14.0 && lat <= 16.5 && lng < 107.2) return { outside: true, country: 'Lào' };
  if (lat > 16.5 && lat <= 17.8 && lng < 106.15) return { outside: true, country: 'Lào' };
  // Khu vực Campuchia (giáp Tây Ninh, Bình Phước, Đắk Lắk, Đắk Nông)
  if (lat >= 11.4 && lat < 14.0 && lng < 106.45) return { outside: true, country: 'Campuchia' };
  return { outside: false };
}

export function isPointInVietnam(lat: number, lng: number): boolean {
  if (lat < 8.2 || lat > 23.5 || lng < 102.1 || lng > 109.8) return false;
  return !isPointOutsideVietnam(lat, lng).outside;
}

/** Tọa độ hành lang ven biển QL1A (Quy Nhơn, Bình Định) dùng để ép OSRM giữ tuyến trong nước cho các chặng Bắc-Nam */
export const VN_CORRIDOR_WAYPOINT = [13.7820, 109.2190];

/** Kiểm tra xem một chặng đường bộ giữa 2 điểm nội địa có nguy cơ bị OSRM cắt qua Lào/Campuchia hay không */
export function needsVietnamDomesticCorridor(pA: number[], pB: number[]): boolean {
  if (!pA || !pB || pA.length < 2 || pB.length < 2) return false;
  if (!isPointInVietnam(pA[0], pA[1]) || !isPointInVietnam(pB[0], pB[1])) return false;
  const minLat = Math.min(pA[0], pB[0]), maxLat = Math.max(pA[0], pB[0]);
  const minLng = Math.min(pA[1], pB[1]);
  // Tuyến nối giữa miền Nam (lat < 13.5, lng < 107.5) và Bắc/Bắc Trung Bộ (lat >= 16.6)
  return minLat < 13.5 && minLng < 107.5 && maxLat >= 16.6;
}

// ---- routing (OSRM, Geoapify hoặc mô phỏng do người dùng chọn); yêu cầu mới nhất thắng; nhớ đệm theo tọa độ ----
const ROUTE_CACHE_VER = 'v2_corridor';
const routeCache = new Map<string, Any>();
export function rpClearRouteCache() { routeCache.clear(); }

export async function routeVia(points: number[][]): Promise<Any> {
  const key = ROUTE_CACHE_VER + '|' + ROUTING.provider + '|' + ROUTING.url + '|' + (ROUTING.avoidBorders ? 'avoidBorders|' : '') + points.map((p) => p.map((v) => v.toFixed(5)).join(',')).join(';');
  if (routeCache.has(key)) return routeCache.get(key);
  let res: Any;
  if (ROUTING.provider === 'SIM') {
    await new Promise((r) => setTimeout(r, 250));
    const legs = points.slice(1).map((p, i) => { const km = kmBetween(points[i], p) * 1.3; return { km, min: km, geom: [points[i], p] }; });
    res = { ok: true, sim: true, legs };
  } else if (ROUTING.provider === 'GEOAPIFY') {
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), ROUTING.timeoutMs);
    try {
      const waypoints = points.map((p) => `${p[0]},${p[1]}`).join('|');
      const avoid = ROUTING.avoidBorders ? '&avoid=borders' : '';
      const apiKey = ROUTING.apiKey || 'b729f957018d45e4b2d1d07c08ec202c';
      const r = await fetch(`https://api.geoapify.com/v1/routing?waypoints=${waypoints}&mode=drive${avoid}&apiKey=${apiKey}`, { signal: ctrl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (!j.features || !j.features.length) {
        res = { ok: false, noroute: true, message: 'Geoapify không tìm được đường qua các điểm này.' };
      } else {
        const feature = j.features[0];
        const rawCoords = feature.geometry.coordinates[0] || feature.geometry.coordinates;
        const coords = rawCoords.map((c: number[]) => [c[1], c[0]]);
        const legsData = feature.properties.legs || [];
        const cuts = points.map((p) => { let best = 0, bd = 1e9; coords.forEach((c: number[], k: number) => { const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2; if (d < bd) { bd = d; best = k; } }); return best; });
        for (let k = 1; k < cuts.length; k++) if (cuts[k] < cuts[k - 1]) cuts[k] = cuts[k - 1];
        res = {
          ok: true,
          legs: (legsData.length ? legsData : points.slice(1)).map((l: Any, k: number) => ({
            km: (l.distance || feature.properties.distance || 0) / 1000,
            min: (l.time || feature.properties.time || 0) / 60,
            geom: coords.slice(cuts[k], cuts[k + 1] + 1),
          })),
        };
      }
    } catch (e: Any) {
      res = { ok: false, network: true, error: e?.message || 'Lỗi kết nối Geoapify Routing.' };
    } finally { clearTimeout(timer); }
  } else {
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), ROUTING.timeoutMs);
    try {
      // Chuẩn bị danh sách điểm gửi OSRM: nếu là chặng nội địa Việt Nam đi xuyên Bắc-Nam, tự động chèn corridor waypoint duyên hải
      const osrmPoints: number[][] = [points[0]];
      const segLegCount: number[] = [];
      for (let i = 0; i < points.length - 1; i++) {
        const pA = points[i], pB = points[i + 1];
        if (ROUTING.avoidBorders !== false && needsVietnamDomesticCorridor(pA, pB)) {
          osrmPoints.push(VN_CORRIDOR_WAYPOINT);
          osrmPoints.push(pB);
          segLegCount.push(2);
        } else {
          osrmPoints.push(pB);
          segLegCount.push(1);
        }
      }

      const pathQuery = `${osrmPoints.map((p) => `${p[1]},${p[0]}`).join(';')}?overview=full&geometries=geojson&steps=false`;
      let r: Response | null = null;
      try {
        r = await fetch(`/osrm/route/v1/driving/${pathQuery}`, { signal: ctrl.signal });
        if (!r.ok && r.status !== 400) r = null;
      } catch {
        r = null;
      }

      if (!r) {
        const directBase = ROUTING.url || 'https://router.project-osrm.org/route/v1/driving/';
        r = await fetch(`${directBase}${pathQuery}`, { signal: ctrl.signal });
      }
      if (!r.ok && r.status !== 400) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (j.code === 'NoRoute' || j.code === 'NoSegment' || !j.routes || !j.routes.length) res = { ok: false, noroute: true, message: j.message || 'Không tìm được đường bộ qua các điểm này.' };
      else {
        const route = j.routes[0], coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
        const cuts = points.map((p) => { let best = 0, bd = 1e9; coords.forEach((c: number[], k: number) => { const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2; if (d < bd) { bd = d; best = k; } }); return best; });
        for (let k = 1; k < cuts.length; k++) if (cuts[k] < cuts[k - 1]) cuts[k] = cuts[k - 1];

        let osrmLegIdx = 0;
        const legs = points.slice(1).map((_, k) => {
          const numSubLegs = segLegCount[k] || 1;
          let km = 0, min = 0;
          for (let s = 0; s < numSubLegs; s++) {
            const l = route.legs[osrmLegIdx++];
            if (l) {
              km += (l.distance || 0) / 1000;
              min += (l.duration || 0) / 60;
            }
          }
          return {
            km,
            min,
            geom: coords.slice(cuts[k], cuts[k + 1] + 1),
          };
        });

        // Tự kiểm tra an toàn (self-healing): nếu chặng nội địa nào vẫn lọt điểm ra nước ngoài, tự động định tuyến lại qua hành lang QL1A
        if (ROUTING.avoidBorders !== false) {
          for (let k = 0; k < legs.length; k++) {
            const pA = points[k], pB = points[k + 1];
            if (isPointInVietnam(pA[0], pA[1]) && isPointInVietnam(pB[0], pB[1])) {
              const hasBorderCross = legs[k].geom.some(([gLat, gLng]: [number, number]) => isPointOutsideVietnam(gLat, gLng).outside);
              if (hasBorderCross) {
                try {
                  const fallbackQuery = `${[pA, VN_CORRIDOR_WAYPOINT, pB].map((p) => `${p[1]},${p[0]}`).join(';')}?overview=full&geometries=geojson&steps=false`;
                  let fallbackRes: Response | null = null;
                  try {
                    fallbackRes = await fetch(`/osrm/route/v1/driving/${fallbackQuery}`, { signal: ctrl.signal });
                    if (!fallbackRes.ok) fallbackRes = null;
                  } catch {
                    fallbackRes = null;
                  }
                  if (!fallbackRes) {
                    fallbackRes = await fetch(`${ROUTING.url || 'https://router.project-osrm.org/route/v1/driving/'}${fallbackQuery}`, { signal: ctrl.signal });
                  }
                  if (fallbackRes && fallbackRes.ok) {
                    const fj = await fallbackRes.json();
                    if (fj.routes && fj.routes.length) {
                      const fRoute = fj.routes[0];
                      legs[k] = {
                        km: (fRoute.legs[0].distance + fRoute.legs[1].distance) / 1000,
                        min: (fRoute.legs[0].duration + fRoute.legs[1].duration) / 60,
                        geom: fRoute.geometry.coordinates.map((c: number[]) => [c[1], c[0]]),
                      };
                    }
                  }
                } catch {
                  // Giữ nguyên leg hiện tại nếu fallback không thành công
                }
              }
            }
          }
        }

        res = { ok: true, legs };
      }
    } catch (e: Any) {
      res = { ok: false, network: true, error: e?.name === 'AbortError' ? 'Hết thời gian chờ routing service.' : 'Trình duyệt không kết nối được routing service (OSRM) – môi trường xem trang có thể đang chặn truy cập mạng ra ngoài.' };
    } finally { clearTimeout(timer); }
  }
  if (res && res.ok && !res.sim && Array.isArray(res.legs) && res.legs.length > 0 && res.legs[0]?.geom?.length > 2) {
    routeCache.set(key, res);
  }
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

          // Kiểm tra vi phạm biên giới trên các chặng đường bộ nội địa
          const prevStop = s[i - 1];
          const isBorderCp = (x.purposes || []).includes('BORDER') || (prevStop.purposes || []).includes('BORDER');
          if (!isBorderCp && l.geom && Array.isArray(l.geom) && ROUTING.checkBorders !== false) {
            const pt = l.geom.find(([gLat, gLng]: [number, number]) => isPointOutsideVietnam(gLat, gLng).outside);
            if (pt) {
              const borderInfo = isPointOutsideVietnam(pt[0], pt[1]);
              issue('seg', i - 1, `Tuyến đường bộ bị cắt qua lãnh thổ ${borderInfo.country || 'quốc tế'}. Lộ trình nội địa cần giữ trong nước – bấm “Nắn tuyến qua QL1A” hoặc thêm trạm dừng duyên hải.`);
            }
          }
        }
      }
    }
    const dwell = Number(x.dwellMin || 0), p = rpPlace(x, rt);
    let validRest = false, depart = arrive;
    if (!Number.isFinite(dwell) || dwell < 0) issue('stop', i, 'Thời gian dừng phải là số không âm.');
    if (i > 0 && i < s.length - 1 && !isDep && !isArr) {
      const qualifiesAsRest = (x.purposes && x.purposes.includes('REST')) || (p && p.functions && p.functions.includes('REST') && dwell >= pol.shortRestMin);
      if (qualifiesAsRest) {
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
      const minHandoverMin = (pol.airportHandoverH || 3) * 60;
      if (f?.departAt && stampMs(f.departAt) >= stampMs(arrive) + minHandoverMin * 60000) {
        const waiting = (stampMs(f.departAt) - stampMs(arrive)) / 60000;
        stopMin += Math.max(0, waiting);
        airCareMin += Math.max(0, waiting);
        depart = f.departAt;
      } else {
        depart = add(arrive, minHandoverMin);
        stopMin += minHandoverMin;
        airCareMin += minHandoverMin;
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
export const RP = (id: string) => (rpState[id] = rpState[id] || { seg: null, sel: null, selStop: null, filters: { fn: [], country: '', radius: 25, status: 'ACTIVE', hoursOk: false, capOk: false, loading: false, stabling: false, water: false, onboard: false }, seq: 0, routing: { status: 'idle' }, detour: {} });
export const rpEditable = (t: Any, rt: Any) => !!rt && rt.status === 'DRAFT' && canPlan(t) && !opsBlock(t, true);
export const fmtMin = (m: number | null | undefined) => (m == null ? '—' : m < 60 ? `${Math.round(m)} phút` : `${Math.floor(m / 60)} giờ ${String(Math.round(m % 60)).padStart(2, '0')}`);
export const rpRouteKey = (t: Any, rt: Any) => JSON.stringify([rt.status !== 'DRAFT' && rt.metrics ? rt.metrics.provider : ROUTING.provider, ROUTING.url, t.mode, t.truckProfiles || {}, rt.stops.map((x: Any) => [x.lat, x.lng, x.type])]);

/** chuyến demo lập kế hoạch dùng routing mô phỏng riêng */
function rpSimulateDemo(t: Any, rt: Any) {
  const ps = RP(t.id);
  if (rt.status !== 'DRAFT' && rt.routingSnapshot) { ps.routing = { ...clone(rt.routingSnapshot), key: rpRouteKey(t, rt) }; return; }
  if (t.mode === 'AIR') {
    const { groups, airErr } = rpGroups(t, rt);
    if (!groups || !groups.length) {
      if (ps.routing.key === rpRouteKey(t, rt) && ps.routing.status === 'no_airports') return;
      ps.routing = { status: 'no_airports', key: rpRouteKey(t, rt), legs: [], message: airErr };
      return;
    }
  }
  if (rt.stops.some((s: Any) => s.lat == null || s.lng == null)) { ps.routing = { status: 'error', key: rpRouteKey(t, rt), error: 'Điểm mới chưa có tọa độ.' }; return; }
  const pts = rt.stops.map((s: Any) => [s.lat, s.lng]);
  ps.routing = { status: 'ok', key: rpRouteKey(t, rt), sim: true, at: nowStamp(), legs: pts.slice(1).map((p: number[], i: number) => { const km = kmBetween(pts[i], p) * 1.3; return { km, min: km, geom: [pts[i], p] }; }) };
}

export async function rpRoute(t: Any, force = false) {
  const rt = curRoute(t), ps = RP(t.id); if (!rt) return;
  if (force) rpClearRouteCache();
  rpEnsure(t, rt);
  const key = rpRouteKey(t, rt);
  if (t.demoFlow3) { if (force || ps.routing.key !== key) { rpSimulateDemo(t, rt); commit(); } return; }
  if (rt.status !== 'DRAFT' && rt.routingSnapshot && rt.scheduleSnapshot) { if (ps.routing.key !== key) { ps.routing = { ...clone(rt.routingSnapshot), key }; commit(); } return; }
  if (!force && ps.routing.key === key && ps.routing.status !== 'idle' && ps.routing.status !== 'error' && ps.routing.status !== 'noroute') return;
  const seq = ++ps.seq;
  const missing = rt.stops.filter((x: Any) => x.lat == null || x.lng == null);
  if (missing.length) { ps.routing = { status: 'error', key, error: `Thiếu tọa độ cho: ${missing.map((x: Any) => x.name).join(', ')}.` }; commit(); return; }
  const { groups, airErr } = rpGroups(t, rt);
  if (!groups || !groups.length) {
    if (ps.routing.key === key && ps.routing.status === 'no_airports') return;
    ps.routing = { status: 'no_airports', key, legs: [], message: airErr };
    commit();
    return;
  }
  ps.routing = { status: 'loading', key, legs: ps.routing.legs || [] }; commit();
  const res = await Promise.all(
    groups.map(async (g) => {
      const pts = g.map((i) => [rt.stops[i].lat, rt.stops[i].lng]);
      try {
        const r = await routeVia(pts);
        if (r && r.ok && r.legs && r.legs.length) return r;
        const legs = pts.slice(1).map((p, k) => {
          const km = kmBetween(pts[k], p) * 1.3;
          return { km, min: km, geom: [pts[k], p], sim: true };
        });
        return { ok: true, sim: true, legs };
      } catch {
        const legs = pts.slice(1).map((p, k) => {
          const km = kmBetween(pts[k], p) * 1.3;
          return { km, min: km, geom: [pts[k], p], sim: true };
        });
        return { ok: true, sim: true, legs };
      }
    })
  );
  if (seq !== ps.seq) return;   // có yêu cầu mới hơn thay thế – bỏ kết quả cũ
  const legs: Any[] = [];
  groups.forEach((g, gi) => {
    const groupRes = res[gi];
    if (groupRes && groupRes.legs) {
      g.slice(1).forEach((idx, k) => {
        const leg = groupRes.legs[k];
        if (leg) {
          legs[idx - 1] = {
            ...leg,
            sim: !!groupRes.sim || !!leg.sim,
          };
        }
      });
    }
  });
  ps.routing = { status: 'ok', key, legs, sim: res.some((x: Any) => x?.sim), at: nowStamp() };
  commit();
}
export function rpCalc(t: Any) {
  const rt = curRoute(t), ps = RP(t.id);
  if (!rt) return null;
  if (rt.status !== 'DRAFT' && rt.scheduleSnapshot) return clone(rt.scheduleSnapshot);
  if (t.mode === 'AIR') {
    const { flight } = rpGroups(t, rt);
    if (!flight) return null;
  }
  return ps.routing.status === 'ok' && ps.routing.key === rpRouteKey(t, rt) ? rpSchedule(t, rt, ps.routing.legs) : null;
}

/** gợi ý địa điểm gần đoạn đường bộ đang chọn (lọc khoảng cách thô; độ lệch thực tế tính bằng routing) */
export function rpCandidates(t: Any) {
  const rt = curRoute(t), ps = RP(t.id), f = ps.filters, seg = ps.seg, calc = rpCalc(t);
  if (t.mode === 'AIR') {
    const { flight } = rpGroups(t, rt);
    if (!flight) return [];
  }
  const used = new Set((rt?.stops || []).map((x: Any) => x.placeId).filter(Boolean));
  const n = tripHorses(t).length;

  const matchFunctions = (p: Any) => {
    if (!f.fn || !f.fn.length) return false;
    return f.fn.some((fn: string) => p.functions && p.functions.includes(fn));
  };

  if (seg != null && calc && ps.routing.legs && ps.routing.legs[seg]) {
    const { flight } = rpGroups(t, rt); if (flight && seg === flight[0]) return [];
    const geom = ps.routing.legs[seg].geom, step = Math.max(1, Math.floor(geom.length / 300)), pts = geom.filter((_: Any, k: number) => k % step === 0);
    const leg = ps.routing.legs[seg];
    const care = calc.rows[seg].sinceCareAfter || 0, departA = calc.rows[seg].depart;
    const isStrategicFacility = (p: Any) => (p.functions || []).some((fn: string) => ['AIRPORT', 'BORDER', 'QUARANTINE'].includes(fn));
    const maxRadius = f.radius === 0 ? 999999 : (f.radius || 25);

    return db.places.filter((p: Any) => !used.has(p.id) && p.lat != null && matchFunctions(p) && (!f.country || p.country === f.country) && (f.status === 'ALL' || p.status === f.status || (f.status === 'ACTIVE_SUSP' && p.status !== 'INACTIVE')))
      .map((p: Any) => { let best = 1e9, at = 0; pts.forEach((g: number[], k: number) => { const d = kmBetween(g, [p.lat, p.lng]); if (d < best) { best = d; at = k / Math.max(1, pts.length - 1); } }); return { p, off: best, frac: at }; })
      .filter((c: Any) => isStrategicFacility(c.p) || c.off <= maxRadius)
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

  // Khi chưa chọn chặng cụ thể: hiển thị các địa điểm khớp bộ lọc để người điều phối thấy được vị trí trên bản đồ
  return db.places
    .filter((p: Any) =>
      !used.has(p.id) &&
      p.lat != null &&
      matchFunctions(p) &&
      (!f.country || p.country === f.country) &&
      (f.status === 'ALL' || p.status === f.status || (f.status === 'ACTIVE_SUSP' && p.status !== 'INACTIVE')) &&
      (!f.stabling || (p.rest && p.rest.stabling)) &&
      (!f.loading || (p.rest && p.rest.loadingArea)) &&
      (!f.water || (p.rest && p.rest.waterFeed)) &&
      (!f.onboard || (p.rest && p.rest.onboardCare)) &&
      (!f.capOk || !p.functions.includes('REST') || (p.rest && p.rest.capacity >= n))
    )
    .map((p: Any) => ({
      p,
      off: 0,
      frac: 0,
      why: p.status !== 'ACTIVE' ? [PLACE_ST[p.status][1]] : [],
    }))
    .slice(0, 80);
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
  (rt.stops || []).forEach((x: Any) => {
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
export const plannerMap: {
  fitLeg?: (geom: number[][]) => void;
  focus?: (lat: number, lng: number) => void;
  fitAll?: () => void;
  fitGroup?: (groupIndex: number) => void;
  invalidate?: () => void;
} = {};
const rpChanged = (t: Any) => { const ps = RP(t.id); ps.sel = null; ps.detour = {}; commit(); rpRoute(t); };

export function rpSeg(tid: string, i: number) {
  const ps = RP(tid); ps.seg = ps.seg === i ? null : i; ps.sel = null; commit();
  const l = ps.routing.legs && ps.routing.legs[ps.seg]; if (l && l.geom.length) plannerMap.fitLeg?.(l.geom);
}
export function rpFocus(tid: string, i: number, from = '') {
  const t = trip(tid), ps = RP(tid), rt = curRoute(t), s = rt?.stops?.[i];
  if (!s) return;
  ps.selStop = i; ps.sel = null; commit();
  if (from === 'map') setTimeout(() => document.getElementById('rp-stop-' + i)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
  else if (s.lat != null && s.lng != null) plannerMap.focus?.(s.lat, s.lng);
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
/** Helper tính hình chiếu và sắp xếp mảng stops theo đúng tiến trình địa lý từ điểm nhận đến điểm giao */
export function autoSortStopsArray(t: Any, rt: Any) {
  if (!rt || !rt.stops || rt.stops.length <= 3) return;
  rpCoords(t, rt);
  const grouping = rpGroups(t, rt);

  const projectScalar = (start: Any, end: Any, p: Any): number => {
    if (start.lat == null || start.lng == null || end.lat == null || end.lng == null || p.lat == null || p.lng == null) return 0;
    const vLat = end.lat - start.lat;
    const vLng = end.lng - start.lng;
    const vLenSq = vLat * vLat + vLng * vLng;
    if (vLenSq === 0) return 0;
    const wLat = p.lat - start.lat;
    const wLng = p.lng - start.lng;
    return (wLat * vLat + wLng * vLng) / vLenSq;
  };

  const sortLegStops = (startStop: Any, endStop: Any, intermediateStops: Any[]) => {
    return [...intermediateStops].sort((a, b) => {
      const scalarA = projectScalar(startStop, endStop, a);
      const scalarB = projectScalar(startStop, endStop, b);
      if (Math.abs(scalarA - scalarB) > 0.0001) {
        return scalarA - scalarB;
      }
      const distA = kmBetween([startStop.lat, startStop.lng], [a.lat, a.lng]);
      const distB = kmBetween([startStop.lat, startStop.lng], [b.lat, b.lng]);
      return distA - distB;
    });
  };

  if (t.mode === 'AIR' && grouping.flight && grouping.flight.length >= 2) {
    const depAirIdx = grouping.flight[0];
    const arrAirIdx = grouping.flight[1];
    const origin = rt.stops[0];
    const depAirport = rt.stops[depAirIdx];
    const arrAirport = rt.stops[arrAirIdx];
    const dest = rt.stops[rt.stops.length - 1];

    const outboundIntermediates = rt.stops.slice(1, depAirIdx);
    const inboundIntermediates = rt.stops.slice(arrAirIdx + 1, rt.stops.length - 1);

    const sortedOutbound = sortLegStops(origin, depAirport, outboundIntermediates);
    const sortedInbound = sortLegStops(arrAirport, dest, inboundIntermediates);

    rt.stops = [origin, ...sortedOutbound, depAirport, arrAirport, ...sortedInbound, dest];
  } else if (t.mode !== 'AIR') {
    const origin = rt.stops[0];
    const dest = rt.stops[rt.stops.length - 1];
    const intermediates = rt.stops.slice(1, rt.stops.length - 1);

    const sortedIntermediates = sortLegStops(origin, dest, intermediates);
    rt.stops = [origin, ...sortedIntermediates, dest];
  }
}

/** Tự động sắp xếp lại các điểm dừng trung gian theo đúng tiến trình lộ trình */
export function rpAutoSort(tid: string) {
  const t = trip(tid), rt = curRoute(t);
  if (!t || !rt || !rpEditable(t, rt)) return toast('Chỉ sắp xếp được phiên bản nháp.');
  if (rt.stops.length <= 3) return toast('Cần ít nhất 2 điểm dừng trung gian để sắp xếp.');

  autoSortStopsArray(t, rt);
  const ps = RP(t.id);
  ps.selStop = null;
  ps.seg = null;
  audit('Auto-sorted route stops', t.id, `${rt.stops.length} stops`);
  toast('Đã tự động sắp xếp lại các điểm dừng theo chiều di chuyển từ điểm đón đến điểm giao.');
  rpChanged(t);
}

export function rpAdd(tid: string, pid: string, forceSeg?: number) {
  const t = trip(tid), rt = curRoute(t), ps = RP(tid), p = placeById(pid);
  if (!rpEditable(t, rt)) return toast('Chỉ sửa được phiên bản nháp.');

  // Đảm bảo tất cả các điểm đã có tọa độ
  rpCoords(t, rt);

  let seg = forceSeg;
  if (seg == null) {
    let bestSeg = -1, bestDetour = 1e9;
    const grouping = rpGroups(t, rt);
    const pCountry = p?.country;
    const outCountry = groundCountry(t, 'outbound') || 'VN';
    const inCountry = groundCountry(t, 'inbound') || 'JP';

    for (let i = 0; i < rt.stops.length - 1; i++) {
      // 1. Không chèn vào chặng bay giữa 2 sân bay
      if (grouping.flight && i === grouping.flight[0]) continue;

      // 2. Với chuyến bay AIR: kiểm tra quốc gia phù hợp với từng chặng đường bộ
      if (t.mode === 'AIR' && grouping.flight && pCountry) {
        const isOutboundSeg = i < grouping.flight[0];
        const isInboundSeg = i >= grouping.flight[1];
        if (pCountry === outCountry && !isOutboundSeg) continue;
        if (pCountry === inCountry && !isInboundSeg) continue;
      }

      const a = rt.stops[i], b = rt.stops[i + 1];
      if (a.lat != null && a.lng != null && b.lat != null && b.lng != null && p && p.lat != null && p.lng != null) {
        const distAtoP = kmBetween([a.lat, a.lng], [p.lat, p.lng]);
        const distPtoB = kmBetween([p.lat, p.lng], [b.lat, b.lng]);
        const distAtoB = kmBetween([a.lat, a.lng], [b.lat, b.lng]);
        // Quãng đường phát sinh thêm khi chèn P vào giữa [A, B]
        const detour = distAtoP + distPtoB - distAtoB;
        if (detour < bestDetour) {
          bestDetour = detour;
          bestSeg = i;
        }
      }
    }
    if (bestSeg >= 0) seg = bestSeg;
  }
  if (seg == null || !p || p.status !== 'ACTIVE') return toast('Chọn đoạn đường bộ và địa điểm đang hoạt động.');
  const grouping = rpGroups(t, rt);
  if (grouping.flight && seg === grouping.flight[0]) return toast('Không chèn điểm đường bộ vào chặng bay.');
  const selected = p.functions.filter((fn: string) => ps.filters.fn.includes(fn));
  const nonAirport = p.functions.filter((fn: string) => fn !== 'AIRPORT');
  const purposes = selected.length ? selected : nonAirport.length ? nonAirport : [...p.functions];
  if (!purposes.length) return toast('Địa điểm chưa có chức năng phục vụ.');
  if (purposes.includes('AIRPORT') && t.mode === 'AIR') return rpAirports(tid);
  const required = purposes.some((fn: string) => RP_REQUIRED.includes(fn));
  const s = stop(p.name, stopTypeFor(purposes), '', required ? p.id : '');
  Object.assign(s, {
    cp: required ? p.id : '',
    placeId: p.id,
    lat: p.lat,
    lng: p.lng,
    required,
    purposes,
    dwellMin: purposes.includes('REST') ? 60 : purposes.includes('QUARANTINE') ? 90 : purposes.includes('BORDER') ? 60 : 20,
    unload: false,
    careNote: purposes.includes('REST') ? 'Kiểm tra ngựa, cho uống nước và thức ăn' : '',
  });
  rt.stops.splice(seg + 1, 0, s);

  // Tự động tinh chỉnh thứ tự các điểm dừng trung gian để luôn giữ đúng tiến trình lộ trình
  if (forceSeg === undefined) {
    autoSortStopsArray(t, rt);
  }

  const newIdx = rt.stops.findIndex((x: Any) => x === s || (x.placeId && x.placeId === p.id));
  ps.selStop = newIdx >= 0 ? newIdx : seg + 1;
  ps.seg = null;
  audit('Added route stop', t.id, p.name);
  toast(`Đã thêm “${p.name}” vào lộ trình – đang tính lại tuyến…`);
  rpChanged(t);
}

function AddStopModalBody({ tid, segIndex }: { tid: string; segIndex: number }) {
  const t = trip(tid), rt = curRoute(t);
  const fromStop = rt.stops[segIndex];
  const toStop = rt.stops[segIndex + 1];
  const [q, setQ] = useState('');
  const [fnFilter, setFnFilter] = useState('ALL');
  const [cFilter, setCFilter] = useState('');

  const fromLat = fromStop?.lat, fromLng = fromStop?.lng;
  const toLat = toStop?.lat, toLng = toStop?.lng;
  const refPoint: [number, number] | null =
    fromLat != null && fromLng != null && toLat != null && toLng != null
      ? [(fromLat + toLat) / 2, (fromLng + toLng) / 2]
      : fromLat != null && fromLng != null
      ? [fromLat, fromLng]
      : toLat != null && toLng != null
      ? [toLat, toLng]
      : null;

  const preferredCountry =
    toStop?.placeSnapshot?.country ||
    (toStop?.placeId && placeById(toStop.placeId)?.country) ||
    fromStop?.placeSnapshot?.country ||
    (fromStop?.placeId && placeById(fromStop.placeId)?.country) ||
    '';

  const usedIds = new Set(rt.stops.map((s: Any) => s.placeId).filter(Boolean));

  const places = db.places
    .filter((p: Any) => {
      if (p.status !== 'ACTIVE') return false;
      // Sân bay thuần chỉ chọn qua "Chọn sân bay" của chuyến hàng không; đường bộ không được thêm sân bay.
      if (p.functions.includes('AIRPORT') && (t.mode === 'AIR' || p.functions.every((fn: string) => fn === 'AIRPORT'))) return false;
      if (fnFilter !== 'ALL' && !p.functions.includes(fnFilter)) return false;
      if (cFilter && p.country !== cFilter) return false;
      if (q.trim()) {
        const query = q.trim().toLowerCase();
        const matchName = String(p.name || '').toLowerCase().includes(query);
        const matchAddr = String(p.address || '').toLowerCase().includes(query);
        const matchProv = String(p.province || '').toLowerCase().includes(query);
        const matchCountry = String(p.country || '').toLowerCase().includes(query);
        if (!matchName && !matchAddr && !matchProv && !matchCountry) return false;
      }
      return true;
    })
    .map((p: Any) => {
      let dist = 0;
      if (refPoint && p.lat != null && p.lng != null) {
        dist = kmBetween(refPoint, [p.lat, p.lng]);
      }
      return { p, dist };
    })
    .sort((a: Any, b: Any) => {
      if (!cFilter && preferredCountry) {
        const aSame = a.p.country === preferredCountry ? 1 : 0;
        const bSame = b.p.country === preferredCountry ? 1 : 0;
        if (aSame !== bSame) return bSame - aSame;
      }
      return a.dist - b.dist;
    });

  const allCountries = [...new Set(db.places.map((p: Any) => p.country as string))].filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>
          Chèn điểm dừng vào Đoạn {segIndex + 1}:
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>
          {fromStop?.name || 'Điểm bắt đầu'} <span style={{ color: '#0284c7' }}>→</span> {toStop?.name || 'Điểm kết thúc'}
        </div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
          Điểm được chọn sẽ được chèn vào giữa 2 điểm này. Hệ thống sẽ tự động tính lại lộ trình và thời gian di chuyển.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          className="inp"
          style={{ flex: 1, minWidth: 200, padding: '7px 10px', fontSize: 13 }}
          placeholder="Tìm theo tên địa điểm, địa chỉ, tỉnh/thành..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          value={cFilter}
          onChange={(e) => setCFilter(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
        >
          <option value="">Tất cả quốc gia</option>
          {allCountries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => {
            ui.pendingAddStop = { tid, segIndex };
            closeModal();
            placeEdit('');
          }}
          title="Tạo địa điểm mới và lưu vào danh mục"
        >
          ＋ Tạo địa điểm mới
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[
          ['ALL', 'Tất cả chức năng'],
          ['REST', 'Nghỉ & chăm sóc'],
          ['FUEL', 'Tiếp nhiên liệu'],
          ['QUARANTINE', 'Kiểm dịch'],
          ['BORDER', 'Cửa khẩu'],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`btn sm ${fnFilter === k ? 'solid' : 'ghost'}`}
            style={{ borderRadius: 20, padding: '3px 12px', fontSize: 12 }}
            onClick={() => setFnFilter(k)}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
        {places.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
            <p style={{ margin: 0, fontWeight: 500 }}>Không tìm thấy địa điểm phù hợp trong danh mục.</p>
            <p style={{ margin: '4px 0 12px', fontSize: 12 }}>Bạn có thể tạo địa điểm mới ngay bây giờ để thêm vào lộ trình.</p>
            <button
              type="button"
              className="btn solid sm"
              onClick={() => {
                ui.pendingAddStop = { tid, segIndex };
                closeModal();
                placeEdit('');
              }}
            >
              ＋ Thêm địa điểm mới vào danh mục
            </button>
          </div>
        ) : (
          places.map(({ p, dist }: { p: Any; dist: number }) => {
            const isUsed = usedIds.has(p.id);
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: isUsed ? '#f8fafc' : '#ffffff',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{p.name}</span>
                    {dist > 0 ? (
                      <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: 4, fontWeight: 500 }}>
                        Cách đoạn này ~{dist.toFixed(0)} km
                      </span>
                    ) : null}
                    {(p.functions || []).map((fn: string) => (
                      <span
                        key={fn}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '1px 7px',
                          borderRadius: 4,
                          color: '#fff',
                          background: PF_COLOR[fn] || '#64748b',
                        }}
                      >
                        {PF[fn] || fn}
                      </span>
                    ))}
                  </div>

                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                    {p.address ? `${p.address}, ` : ''}{p.province ? `${p.province}, ` : ''}{p.country}
                    {p.hours ? ` • Giờ: ${p.hours}` : ''}
                  </div>

                  {p.rest ? (
                    <div style={{ fontSize: 11.5, color: '#475569', marginTop: 3 }}>
                      Sức chứa: {p.rest.capacity || '—'} ngựa • Chăm sóc trên xe: {p.rest.onboardCare ? 'Có' : 'Không'} • Khu lên/xuống: {p.rest.loadingArea ? 'Có' : 'Không'} • Nước/thức ăn: {p.rest.waterFeed ? 'Có' : 'Không'}
                    </div>
                  ) : p.fuel ? (
                    <div style={{ fontSize: 11.5, color: '#475569', marginTop: 3 }}>
                      Nhiên liệu: {p.fuel.fuels || 'Diesel'} • Xe lớn vào được: {p.fuel.heavyAccess !== false ? 'Có' : 'Không'}
                    </div>
                  ) : null}
                </div>

                <div>
                  {isUsed ? (
                    <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Đã có trong tuyến</span>
                  ) : (
                    <button
                      type="button"
                      className="btn solid sm"
                      onClick={() => {
                        closeModal();
                        rpAdd(tid, p.id, segIndex);
                      }}
                    >
                      ＋ Chọn điểm này
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function rpOpenAddStop(tid: string, segIndex: number) {
  const t = trip(tid), rt = curRoute(t);
  if (!rpEditable(t, rt)) return toast('Chỉ sửa được phiên bản nháp.');
  const grouping = rpGroups(t, rt);
  if (grouping.flight && segIndex === grouping.flight[0]) {
    return toast('Không chèn điểm đường bộ vào chặng bay. Hãy dùng chức năng “Chọn sân bay”.');
  }
  const ps = RP(tid);
  ps.seg = segIndex;
  commit();

  openModal({
    title: `Thêm điểm dừng vào đoạn ${segIndex + 1}`,
    wide: true,
    ok: false,
    cancel: 'Đóng',
    body: () => <AddStopModalBody tid={tid} segIndex={segIndex} />,
  });
}

export function rpAirports(tid: string) {
  const t = trip(tid), rt = curRoute(t); if (!rpEditable(t, rt) || t.mode !== 'AIR') return;
  const outCountry = groundCountry(t, 'outbound') || 'VN';
  const inCountry = groundCountry(t, 'inbound') || 'JP';
  const airports = (country: string) => db.places.filter((p: Any) => p.functions.includes('AIRPORT') && p.status === 'ACTIVE' && (!country || p.country === country) && p.airport && p.airport.horseHandling);
  const existing = rt.stops.filter((s: Any) => s.type === 'AIRPORT');
  const options = (country: string): Array<[string, string]> => {
    let list = airports(country);
    if (!list.length) {
      list = db.places.filter((p: Any) => p.functions.includes('AIRPORT') && p.status === 'ACTIVE' && p.airport && p.airport.horseHandling);
    }
    return [['', 'Chọn sân bay'], ...list.map((p: Any) => [p.id, `${p.name} (${p.airport.iata || 'chưa có mã'}) – ${p.country}`] as [string, string])];
  };
  openModal({
    title: 'Chọn cặp sân bay cho chuyến AIR', ok: 'Áp dụng',
    init: { from: existing[0]?.cp || t.flight?.from || '', to: existing[1]?.cp || t.flight?.to || '' },
    body: () => (<>
      <p className="hint">Chọn sân bay đi (${outCountry}) và sân bay đến (${inCountry}). Hệ thống sẽ cập nhật cặp sân bay và giữ nguyên toàn bộ các điểm dừng đã chọn trên cả hai chặng đường bộ.</p>
      <Field label={`Sân bay đi (${outCountry})`}><Sel name="from" options={options(outCountry)} /></Field>
      <Field label={`Sân bay đến (${inCountry})`}><Sel name="to" options={options(inCountry)} /></Field>
    </>),
    onOk: (v) => {
      const a = placeById(v.from), b = placeById(v.to);
      if (!a || !b || a.id === b.id) return 'Vui lòng chọn 2 sân bay khác nhau cho điểm đi và điểm đến.';
      if (t.flight?.status === 'BOOKED' && (t.flight.from !== a.id || t.flight.to !== b.id)) {
        return `Chuyến bay ${t.flight.airline || ''} ${t.flight.flightNo || ''} đã xác nhận đặt chỗ (BOOKED). Không thể đổi cặp sân bay trong bản nháp khi booking đã chốt.`;
      }

      const airportA = Object.assign(stop(a.name, 'AIRPORT', '', a.id), {
        cp: a.id,
        placeId: a.id,
        lat: a.lat,
        lng: a.lng,
        purposes: ['AIRPORT'],
        required: true,
        dwellMin: 0,
        unload: false,
        placeSnapshot: clone(a),
      });

      const airportB = Object.assign(stop(b.name, 'AIRPORT', '', b.id), {
        cp: b.id,
        placeId: b.id,
        lat: b.lat,
        lng: b.lng,
        purposes: ['AIRPORT'],
        required: true,
        dwellMin: 0,
        unload: false,
        placeSnapshot: clone(b),
      });

      // Giữ nguyên các điểm dừng đã chọn, chỉ thay thế/cập nhật cặp sân bay
      const firstAirIdx = rt.stops.findIndex((s: Any) => s.type === 'AIRPORT');
      const lastAirIdx = [...rt.stops].map((s: Any, i: number) => (s.type === 'AIRPORT' ? i : -1)).filter((i) => i >= 0).pop();

      if (firstAirIdx >= 0 && lastAirIdx !== undefined && lastAirIdx >= firstAirIdx) {
        // Giữ nguyên toàn bộ các điểm outbound trước sân bay đi và inbound sau sân bay đến
        const outbound = rt.stops.slice(0, firstAirIdx);
        const inbound = rt.stops.slice(lastAirIdx + 1);
        rt.stops = [...outbound, airportA, airportB, ...inbound];
      } else {
        const origin = rt.stops.find((s: Any) => s.type === 'ORIGIN') || rt.stops[0];
        const dest = [...rt.stops].reverse().find((s: Any) => s.type === 'DESTINATION') || rt.stops[rt.stops.length - 1];
        const intermediate = rt.stops.filter((s: Any) => s !== origin && s !== dest && s.type !== 'AIRPORT');
        
        // Phân loại các điểm dừng trung gian theo quốc gia
        const outbound = intermediate.filter((s: Any) => {
          const p = s.placeId ? placeById(s.placeId) : null;
          return (p && p.country === outCountry) || s.country === outCountry;
        });
        const inbound = intermediate.filter((s: Any) => !outbound.includes(s));
        rt.stops = [origin, ...outbound, airportA, airportB, ...inbound, dest];
      }

      if (t.flight) {
        t.flight.from = a.id;
        t.flight.to = b.id;
        if (t.flight.serviceSnapshot) {
          t.flight.serviceSnapshot.from = a.id;
          t.flight.serviceSnapshot.to = b.id;
        }
      }

      const ps = RP(t.id);
      ps.seg = null;
      ps.sel = null;
      ps.selStop = null;
      ps.routing = { status: 'idle' };
      audit('Updated route airports', t.id, `${a.name} -> ${b.name}`);
      toast(`Đã cập nhật cặp sân bay: ${a.name} → ${b.name} (giữ nguyên các điểm dừng đã chọn).`);
      rpChanged(t);
    },
  });
}
/** Điểm dừng được phép bỏ: mọi điểm không bắt buộc; riêng sân bay chỉ bắt buộc khi chuyến đi bằng đường hàng không. */
export const rpDeletable = (t: Any, s: Any) => s.type !== 'ORIGIN' && s.type !== 'DESTINATION' && (!s.required || (s.type === 'AIRPORT' && t.mode !== 'AIR'));
export function rpDel(tid: string, i: number) { const t = trip(tid), rt = curRoute(t), s = rt.stops[i]; if (!rpEditable(t, rt) || !rpDeletable(t, s)) return toast(s.type === 'AIRPORT' ? 'Chuyến đi bằng đường hàng không bắt buộc có sân bay đi và sân bay đến; dùng "Đổi sân bay" để thay.' : 'Không bỏ được điểm bắt buộc.'); rt.stops.splice(i, 1); RP(tid).selStop = null; rpChanged(t); }
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
    title: 'Chính sách nghỉ chăm sóc', ok: 'Lưu cấu hình',
    init: { a: P.careIntervalH, b: P.shortRestMin, c: P.roadEpisodeH, d: P.recoveryRestH, e: P.truckFactor, f: P.airportHandoverH, g: P.airportReceiveH },
    body: () => (<>
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
    title: 'Cấu hình dịch vụ định tuyến', ok: 'Lưu & Tính lại',
    init: {
      prov: ROUTING.provider || 'OSRM',
      url: ROUTING.url || 'https://router.project-osrm.org/route/v1/driving/',
      apiKey: ROUTING.apiKey || '',
      avoidBorders: ROUTING.avoidBorders !== false,
      checkBorders: ROUTING.checkBorders !== false,
    },
    body: (fm) => (<>
      <Field label="Nhà cung cấp định tuyến">
        <Sel name="prov" options={[
          ['OSRM', 'OSRM (Mặc định – đường bộ thực tế miễn phí)'],
          ['GEOAPIFY', 'Geoapify Routing API (Hỗ trợ avoid=borders tự động)'],
          ['SIM', 'Mô phỏng – chỉ để demo khi không có mạng'],
        ]} />
      </Field>
      {fm.v.prov === 'OSRM' ? (
        <Field label="URL OSRM Server"><Inp name="url" /></Field>
      ) : fm.v.prov === 'GEOAPIFY' ? (
        <Field label="Geoapify API Key"><Inp name="apiKey" placeholder="Nhập API Key của Geoapify" /></Field>
      ) : null}
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label className="check-line" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={fm.v.avoidBorders}
            onChange={(e) => fm.set('avoidBorders', e.target.checked)}
          />
          <b>Kích hoạt tránh biên giới (avoid=borders)</b> khi gọi API định tuyến
        </label>
        <label className="check-line" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={fm.v.checkBorders}
            onChange={(e) => fm.set('checkBorders', e.target.checked)}
          />
          <b>Kiểm tra & Cảnh báo vi phạm ranh giới</b> trên các chặng đường bộ nội địa
        </label>
      </div>
    </>),
    onOk: (v) => {
      ROUTING.provider = v.prov;
      ROUTING.url = v.url || ROUTING.url;
      ROUTING.apiKey = v.apiKey || ROUTING.apiKey;
      ROUTING.avoidBorders = v.avoidBorders;
      ROUTING.checkBorders = v.checkBorders;
      resetRouting();
      commit();
      toast('Đã cập nhật cấu hình định tuyến. Đang tính lại tuyến đường…');
    },
  });
}

export function rpFixDomesticRoute(tid: string, seg: number) {
  const t = trip(tid), rt = curRoute(t);
  if (!rpEditable(t, rt)) return toast('Chỉ nắn tuyến được trên phiên bản nháp.');
  const a = rt.stops[seg], b = rt.stops[seg + 1];
  if (!a || !b) return;

  const minLat = Math.min(a.lat, b.lat), maxLat = Math.max(a.lat, b.lat);
  const midLat = (minLat + maxLat) / 2;

  // Tìm trạm dừng hoặc trạm xăng dọc hành lang duyên hải QL1A ở giữa 2 điểm (kinh độ bám bờ biển >= 107.8)
  const used = new Set(rt.stops.map((s: Any) => s.placeId).filter(Boolean));
  const coastalPlaces = db.places.filter(
    (p: Any) =>
      !used.has(p.id) &&
      p.country === 'VN' &&
      p.status === 'ACTIVE' &&
      p.lat != null &&
      p.lng != null &&
      p.lng >= 107.8 &&
      p.lat >= minLat &&
      p.lat <= maxLat &&
      (p.functions.includes('REST') || p.functions.includes('FUEL'))
  );

  coastalPlaces.sort((p1: Any, p2: Any) => Math.abs(p1.lat - midLat) - Math.abs(p2.lat - midLat));

  const chosen = coastalPlaces[0];
  if (!chosen) {
    return toast('Không tìm thấy trạm dừng phù hợp dọc QL1A giữa 2 điểm này. Vui lòng chọn địa điểm dừng từ danh mục.');
  }

  rpAdd(tid, chosen.id, seg);
  toast(`Đã tự động chèn trạm dừng “${chosen.name}” trên QL1A để giữ lộ trình hoàn toàn trong nước!`);
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
  if (!t?.mode) return toast('Hợp đồng chưa ghi phương thức vận chuyển. Vui lòng liên hệ Manager.');
  if (!canPlan(t)) return toast(opsBlock(t) || 'Lập tuyến bắt đầu sau khi Quản lý xác nhận triển khai.');
  if (last && ['DRAFT', 'PENDING_APPROVAL'].includes(last.status)) return toast(last.status === 'DRAFT' ? `Phiên bản ${last.v} vẫn là bản nháp. Chỉnh sửa và gửi phiên bản này.` : `Phiên bản ${last.v} đang chờ Quản lý quyết định.`);
  const stops = last ? last.stops.map((x: Any) => { const s = { ...x }; delete s.placeSnapshot; return s; }) : [stop(r.pickup.name || r.origin, 'ORIGIN', t.plannedDepart), stop(r.delivery.name || r.destination, 'DESTINATION', t.eta)];
  if (!t.routes) t.routes = [];
  t.routes.push({ v: (last ? last.v : 0) + 1, status: 'DRAFT', submittedAt: null, decidedAt: null, note: '', stops });
  audit(last ? 'Started revised route version' : 'Started route version', id, `Version ${t.routes.length}`);
  go(`f/trip/${id}/route`); commit();
}

// ---- gửi Manager duyệt (đường bộ) – chuyến AIR dùng submitAirPlan trong air.tsx ----
export let routeSubmitError = '';
export const setRouteError = (m: string) => { routeSubmitError = m; if (m) toast(m); commit(); };
export function submitRoadRoute(id: string, extraCheck?: () => string, onSubmitted?: () => void) {
  const t = trip(id), rt = curRoute(t);
  if (!rt || rt.status !== 'DRAFT') return toast('Chỉ áp dụng được phiên bản tuyến đang là bản nháp.');
  rpEnsure(t, rt);
  const calc = rpCalc(t), ps = RP(id);
  if (!calc) return setRouteError(ps.routing.status === 'loading' ? 'Đang tính tuyến – chờ kết quả rồi chốt lộ trình.' : 'Chưa có tuyến hợp lệ cho danh sách điểm hiện tại (routing lỗi hoặc chưa tính). Không thể chốt lộ trình.');
  if (calc.issues.length) return setRouteError(`Còn ${calc.issues.length} lỗi về nghỉ chăm sóc / địa điểm – xử lý trước khi chốt lộ trình.`);
  if (rpDeadline(t) && calc.eta > rpDeadline(t)) return setRouteError('ETA trễ hơn hạn giao.');
  const pre = extraCheck?.(); if (pre) return toast(pre);
  rpWriteTimes(t, rt, calc);
  const err = validateRoute(t, rt);
  if (err) return setRouteError(err);
  routeSubmitError = '';
  confirmAction(`Gửi tuyến ${t.id} v${rt.v} cho Manager duyệt?`, `${rt.stops.length} điểm dừng, kèm xe và tổ lái đã phân công.`, 'Gửi Manager duyệt', () => {
    if (rt.status !== 'DRAFT' || opsBlock(t)) { toast(opsBlock(t) || 'Phiên bản này đã được gửi.'); return; }
    const again = extraCheck?.(); if (again) return again;
    onSubmitted?.();
    rt.status = 'PENDING_APPROVAL';
    rt.submittedAt = nowStamp();
    flushTripStateToStorage();
    saveSharedTrip(t);
    flushTripStateToStorage();
    void pushPlanToBackend(t).then((err) => { if (err && !demoOn()) toast('Chưa gửi được phương án lên máy chủ: ' + err); });
    notify('LOGISTICS_MANAGER', `Tuyến ${t.id} cần duyệt`, `v${rt.v} · ${rt.stops.length} điểm dừng`, `m/trip/${t.id}/route`);
    audit('Submitted road route', id, `Version ${rt.v}`);
    toast(`Đã gửi tuyến phiên bản ${rt.v} cho Manager duyệt.`);
    rpChanged(t);
  });
}

// ============================================================================
// Danh mục địa điểm
// ============================================================================
const COUNTRY_NAMES: Record<string, string> = {
  VN: 'Việt Nam (VN)',
  CN: 'Trung Quốc (CN)',
  KH: 'Campuchia (KH)',
  LA: 'Lào (LA)',
  TH: 'Thái Lan (TH)',
  MY: 'Malaysia (MY)',
  SG: 'Singapore (SG)',
  JP: 'Nhật Bản (JP)',
  KR: 'Hàn Quốc (KR)',
  TW: 'Đài Loan (TW)',
  AU: 'Úc (AU)',
  US: 'Hoa Kỳ (US)',
  FR: 'Pháp (FR)',
  DE: 'Đức (DE)',
  GB: 'Anh (GB)',
  PH: 'Philippines (PH)',
  ID: 'Indonesia (ID)',
  MM: 'Myanmar (MM)',
  IN: 'Ấn Độ (IN)',
  AE: 'UAE (AE)',
  QA: 'Qatar (QA)',
};
const COUNTRIES = ['VN', 'CN', 'KH', 'LA', 'TH', 'MY', 'SG', 'JP', 'KR', 'TW', 'AU', 'US', 'FR', 'DE', 'GB'];
export function placeEdit(id: string) {
  const p = id ? placeById(id) : null;
  const h = String(p?.hours || '24/7'), all = h === '24/7', parts = h.split(/[–-]/);
  const r = p?.rest || {}, f = p?.fuel || {}, a = p?.airport || {}, s = p?.service || {};
  openModal({
    title: p ? `Địa điểm • ${p.name}` : 'Thêm địa điểm', ok: p ? 'Lưu thay đổi' : 'Thêm', wide: true,
    init: {
      name: p?.name || '', country: p?.country || 'VN', prov: p?.province || '', addr: p?.address || '',
      fn: p ? [...p.functions] : ['REST'], lat: p && p.lat != null ? String(p.lat) : '', lng: p && p.lng != null ? String(p.lng) : '',
      hAll: all, hOpen: all ? '06:00' : parts[0] || '', hClose: all ? '22:00' : parts[1] || '',
      r1: r.truckParking !== false, r2: !!r.onboardCare, r3: !!r.waterFeed, r4: !!r.loadingArea, r5: !!r.stabling, r6: String(r.capacity || 4),
      f1: f.fuels || 'Diesel', f2: f.heavyAccess !== false, a1: a.iata || '', a2: a.horseHandling !== false, s1: s.kind || '', s2: s.capacity || '',
    },
    body: (fm) => <PlaceForm p={p} fm={fm} />,
    onOk: (v) => {
      let fn: string[] = Array.isArray(v.fn) ? v.fn : [];
      if (!fn.length) fn = ['REST'];
      const name = String(v.name || '').trim();
      const prov = String(v.prov || '').trim();
      const addr = String(v.addr || '').trim();

      if (name.length < 2) return 'Vui lòng nhập tên địa điểm.';
      if (!prov && !addr) return 'Vui lòng nhập tỉnh/thành hoặc địa chỉ.';

      const lat = Number(v.lat);
      const lng = Number(v.lng);
      if (isNaN(lat) || isNaN(lng) || !(lat >= -90 && lat <= 90) || !(lng >= -180 && lng <= 180) || v.lat === '' || v.lng === '') {
        return 'Vui lòng nhập hoặc bấm chọn tọa độ trên bản đồ.';
      }

      const hours = v.hAll ? '24/7' : v.hOpen && v.hClose && v.hOpen !== v.hClose ? `${v.hOpen}–${v.hClose}` : '24/7';
      if (!rpHours(hours)) return 'Giờ hoạt động phải là 24/7 hoặc HH:mm–HH:mm hợp lệ.';

      const restCap = Number(v.r6) >= 1 ? Math.floor(Number(v.r6)) : 4;

      let iata = String(v.a1 || '').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
      if (fn.includes('AIRPORT') && iata.length < 3) {
        const nameLetters = (name.replace(/[^A-Za-z]/g, '') + 'AIR').toUpperCase();
        iata = (iata + nameLetters).slice(0, 3);
      }

      const dup = db.places.find((x: Any) => x !== p && x.lat != null && kmBetween([x.lat, x.lng], [lat, lng]) < 0.01);
      if (dup) return `Đã có “${dup.name}” tại tọa độ này – vui lòng chọn vị trí khác hoặc chỉnh sửa địa điểm đã có.`;

      const now = nowStamp();
      const nowMs = Date.now();
      const data = {
        name,
        country: v.country || 'VN',
        province: prov || addr,
        address: addr,
        functions: fn,
        lat,
        lng,
        hours,
        updatedAt: now,
        lastModified: nowMs,
        rest: fn.includes('REST') || !fn.length ? {
          truckParking: v.r1 !== false,
          onboardCare: !!v.r2,
          waterFeed: !!v.r3,
          loadingArea: !!v.r4,
          stabling: !!v.r5,
          capacity: restCap,
        } : null,
        fuel: fn.includes('FUEL') ? { fuels: v.f1 || 'Diesel', heavyAccess: v.f2 !== false } : null,
        airport: fn.includes('AIRPORT') ? { iata, horseHandling: v.a2 !== false } : null,
        service: fn.some((x) => ['QUARANTINE', 'BORDER'].includes(x)) ? { kind: v.s1 || 'Kiểm dịch', capacity: v.s2 || 'Tiếp nhận xe chuyên dụng' } : null,
      };

      let savedPlace: Any;
      if (p) {
        Object.assign(p, data);
        const idx = db.places.indexOf(p);
        if (idx > -1) {
          db.places.splice(idx, 1);
        }
        db.places.unshift(p);
        savedPlace = p;
      } else {
        savedPlace = Object.assign({ id: nextId('PL'), type: 'SERVICE', status: 'ACTIVE', sample: false }, data);
        db.places.unshift(savedPlace);
      }

      savePlacesToStorage(db.places);

      if (ui?.t?.['f-places']) {
        ui.t['f-places'].q = '';
        ui.t['f-places'].f = {};
        ui.t['f-places'].sort = null;
        ui.t['f-places'].page = 1;
      }
      ui.lastSavedPlaceId = savedPlace.id;

      commit();
      audit(p ? 'Updated place' : 'Added place', data.name, fn.join(', '));
      toast(p ? `Đã lưu địa điểm “${data.name}” và đưa lên đầu danh sách.` : `Đã thêm địa điểm “${data.name}” vào đầu danh sách.`);
    
      const pending = ui?.pendingAddStop;
      if (pending) {
        delete ui.pendingAddStop;
        setTimeout(() => {
          rpAdd(pending.tid, savedPlace.id, pending.segIndex);
        }, 100);
      }
},
  });
}
const geoCache = new Map<string, { province: string; address: string; country: string; name?: string }>();
let activeReverseAbort: AbortController | null = null;
let reverseDebounceTimer: ReturnType<typeof setTimeout> | null = null;

async function fetchReverseWithFallbacks(la: number, lo: number, signal?: AbortSignal) {
  const cacheKey = `${la.toFixed(3)},${lo.toFixed(3)}`;
  if (geoCache.has(cacheKey)) {
    return geoCache.get(cacheKey)!;
  }

  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${la}&longitude=${lo}&localityLanguage=vi`, { signal });
    if (res.ok) {
      const d = await res.json();
      const country = String(d.countryCode || '').toUpperCase();
      const province = d.principalSubdivision || d.city || '';
      const localParts = [d.locality, d.city && d.city !== d.locality ? d.city : ''].filter(Boolean);
      const address = localParts.join(', ') || d.plusCode || '';
      if (country || province || address) {
        const item = { province, address, country, name: d.locality || d.city || '' };
        geoCache.set(cacheKey, item);
        return item;
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
  }

  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${la}&lon=${lo}`, { signal });
    if (res.ok) {
      const data = await res.json();
      if (data?.features?.length) {
        const props = data.features[0].properties || {};
        const province = props.state || props.city || props.county || '';
        const streetParts = [props.housenumber, props.street, props.district || props.county].filter(Boolean);
        const address = streetParts.join(', ') || props.name || '';
        const country = String(props.countrycode || '').toUpperCase();
        const item = { province, address, country, name: props.name || '' };
        geoCache.set(cacheKey, item);
        return item;
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
  }

  return null;
}
// phần thân form địa điểm (bản đồ chọn tọa độ ở components/LeafletMaps)
function PlaceForm({ p, fm }: { p: Any; fm: { v: Any; set: (k: string, v: Any) => void } }) {
  const fns: string[] = fm.v.fn;
  const toggle = (fn: string, on: boolean) => fm.set('fn', on ? [...fns, fn] : fns.filter((x) => x !== fn));
  const onPickCoord = (la: number, lo: number) => {
    fm.set('lat', la.toFixed(6));
    fm.set('lng', lo.toFixed(6));
    fm.set('reverseLoading', true);
    fm.set('reverseMsg', 'Đang tra cứu địa chỉ...');

    if (activeReverseAbort) {
      activeReverseAbort.abort();
      activeReverseAbort = null;
    }
    if (reverseDebounceTimer) {
      clearTimeout(reverseDebounceTimer);
      reverseDebounceTimer = null;
    }

    const abort = new AbortController();
    activeReverseAbort = abort;

    reverseDebounceTimer = setTimeout(async () => {
      try {
        const info = await fetchReverseWithFallbacks(la, lo, abort.signal);
        if (abort.signal.aborted) return;
        if (info) {
          if (info.province) fm.set('prov', info.province);
          if (info.address) fm.set('addr', info.address);
          if (info.country && /^[A-Z]{2}$/.test(info.country)) fm.set('country', info.country);
          if (!String(fm.v.name || '').trim() && info.name) fm.set('name', info.name);

          const countryLabel = COUNTRY_NAMES[info.country] || info.country;
          const summary = [info.address, info.province, countryLabel].filter(Boolean).join(', ');
          fm.set('reverseMsg', summary ? `Đã tự điền: ${summary}` : 'Đã nhận tọa độ');
          toast(summary ? `Đã tự điền địa chỉ: ${summary}` : 'Đã nhận tọa độ vị trí.');
        } else {
          fm.set('reverseMsg', 'Đã nhận tọa độ (không có thông tin địa chỉ)');
          toast('Đã nhận tọa độ (không tìm thấy địa chỉ cụ thể, bạn có thể tự nhập).');
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        fm.set('reverseMsg', 'Đã nhận tọa độ (tra cứu gặp sự cố)');
        toast('Đã nhận tọa độ. Tra cứu địa chỉ tự động gặp sự cố, bạn vui lòng tự nhập.');
      } finally {
        if (!abort.signal.aborted) {
          fm.set('reverseLoading', false);
        }
      }
    }, 120);
  };
  const geo = async () => {
    const q = [fm.v.addr, fm.v.prov].filter(Boolean).join(', ');
    if (!q) return toast('Nhập địa chỉ hoặc tỉnh/thành trước.');
    const hits = db.places.filter((x: Any) => x.lat != null && x.country === fm.v.country && [x.province, x.address, x.name].some((k: string) => String(k || '').toLowerCase().includes(String(fm.v.prov || fm.v.addr).toLowerCase())));
    let resList = hits.slice(0, 5).map((x: Any) => ({ label: `${x.address || x.name}, ${x.province}`, lat: x.lat, lng: x.lng, province: x.province, address: x.address, country: x.country }));
    if (resList.length < 5) {
      try {
        const resp = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`);
        if (resp.ok) {
          const data = await resp.json();
          const online = (data?.features || []).map((f: Any) => {
            const pr = f.properties || {};
            const label = [pr.name, pr.street, pr.city || pr.state, pr.country].filter(Boolean).join(', ');
            return {
              label,
              lat: f.geometry?.coordinates?.[1],
              lng: f.geometry?.coordinates?.[0],
              province: pr.state || pr.city || pr.county || '',
              address: [pr.housenumber, pr.street, pr.district || pr.county].filter(Boolean).join(', ') || pr.name || '',
              country: String(pr.countrycode || '').toUpperCase(),
            };
          });
          resList = [...resList, ...online.filter((o: Any) => o.lat != null && o.lng != null)].slice(0, 5);
        }
      } catch {}
    }
    fm.set('geoRes', resList);
    fm.set('geoDone', true);
  };
  const countryOptions = Array.from(new Set([
    ...COUNTRIES,
    ...(db.places.map((x: Any) => x.country).filter(Boolean)),
    ...(fm.v.country ? [fm.v.country] : []),
  ]));
  return (<>
    <div className="form-grid">
      <Field label="Tên địa điểm *"><Inp name="name" /></Field>
      <Field label="Quốc gia *"><Sel name="country" options={countryOptions.map((c) => [c, COUNTRY_NAMES[c] || c] as [string, string])} /></Field>
    </div>
    <div className="form-grid">
      <Field label="Tỉnh/thành *"><Inp name="prov" /></Field>
      <Field label="Địa chỉ"><Inp name="addr" /></Field>
    </div>
    <div className="field"><label>Chức năng phục vụ *</label>
      <div className="pl-fns">{Object.keys(PF).map((fn) => <label key={fn}><input type="checkbox" checked={fns.includes(fn)} onChange={(e) => toggle(fn, e.target.checked)} /> {PF[fn]}</label>)}</div>
    </div>
    <div id="pl-extras">
      {fns.includes('FUEL') ? <fieldset className="pl-fs"><legend>Trạm nhiên liệu</legend><Field label="Loại nhiên liệu"><Inp name="f1" /></Field><Chk name="f2">Xe tải lớn vào được</Chk></fieldset> : null}
      {fns.includes('AIRPORT') ? <fieldset className="pl-fs"><legend>Sân bay</legend><Field label="Mã sân bay (IATA)"><Inp name="a1" maxLength={3} /></Field><Chk name="a2">Tiếp nhận vận chuyển ngựa</Chk></fieldset> : null}
      {fns.some((x) => ['QUARANTINE', 'BORDER'].includes(x)) ? <fieldset className="pl-fs"><legend>Kiểm dịch / cửa khẩu</legend><Field label="Loại dịch vụ"><Inp name="s1" /></Field><Field label="Khả năng tiếp nhận"><Inp name="s2" /></Field></fieldset> : null}
    </div>
    <div className="field"><label>Tọa độ *</label>
      <div className="pl-coord"><Inp name="lat" placeholder="Vĩ độ" /><Inp name="lng" placeholder="Kinh độ" /><button type="button" className="btn ghost sm" onClick={geo}>Tìm theo địa chỉ</button></div>
      <div id="pl-geo-res">{fm.v.geoDone ? ((fm.v.geoRes || []).length ? <>{fm.v.geoRes.map((it: Any, k: number) => (
        <button type="button" key={k} className="geo-item" onClick={() => {
          fm.set('lat', String(it.lat));
          fm.set('lng', String(it.lng));
          if (it.province) fm.set('prov', it.province);
          if (it.address) fm.set('addr', it.address);
          if (it.country && /^[A-Z]{2}$/.test(it.country)) fm.set('country', it.country);
          fm.set('geoDone', false);
        }}>
          <span><b>{it.label}</b><small className="geo-coord">{Number(it.lat).toFixed(5)}, {Number(it.lng).toFixed(5)}</small></span></button>))}</> : <p className="hint">Không tìm thấy. Chọn trực tiếp trên bản đồ.</p>) : null}</div>
      <PlacePickMap lat={fm.v.lat === '' ? null : Number(fm.v.lat)} lng={fm.v.lng === '' ? null : Number(fm.v.lng)} onPick={onPickCoord} />
      <div style={{ marginTop: 8, padding: '8px 12px', background: fm.v.reverseLoading ? '#eff6ff' : fm.v.reverseMsg ? '#f0fdf4' : '#f8fafc', borderRadius: 8, border: '1px solid ' + (fm.v.reverseLoading ? '#bfdbfe' : fm.v.reverseMsg ? '#bbf7d0' : '#e2e8f0'), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#475569' }}>
          <span>Bấm bản đồ để ghim tọa độ, hệ thống tự động điền Tỉnh/thành, Địa chỉ &amp; Quốc gia.</span>
        </div>
        {fm.v.reverseLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }}></span>
            Đang tra cứu địa chỉ...
          </div>
        ) : fm.v.reverseMsg ? (
          <div style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
            {fm.v.reverseMsg}
          </div>
        ) : null}
      </div>
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
      {used.length ? <div className="note yellow"><div><b>Đang dùng trong ${used.length} kế hoạch</b>{used.map((t: Any) => `${t.id} (${human(t.status)})`).join(', ')}. Tạm ngừng/ngừng sẽ cảnh báo các kế hoạch này; kế hoạch đã duyệt không tự bị sửa.</div></div> : null}
    </>),
    onOk: (v) => {
      const old = p.status;
      p.status = v.st;
      p.statusReason = v.note;
      p.updatedAt = nowStamp();
      p.lastModified = Date.now();
      const idx = db.places.indexOf(p);
      if (idx > -1) {
        db.places.splice(idx, 1);
        db.places.unshift(p);
      }
      savePlacesToStorage(db.places);
      if (ui?.t?.['f-places']) {
        ui.t['f-places'].sort = null;
        ui.t['f-places'].page = 1;
      }
      ui.lastSavedPlaceId = p.id;
      commit();
      if (old === 'ACTIVE' && p.status !== 'ACTIVE') used.filter((t: Any) => t.status !== 'COMPLETED').forEach((t: Any) => notify('FLEET_COORDINATOR', `Địa điểm “${p.name}” ${PLACE_ST[p.status][1].toLowerCase()}`, `Kế hoạch ${t.id} có dùng địa điểm này – kiểm tra và thay thế nếu cần.`, `f/trip/${t.id}/route`));
      audit('Changed place status', p.name, PLACE_ST[p.status][1]);
      toast(`Đã cập nhật trạng thái địa điểm “${p.name}”.`);
    },
  });
}
export function placeDelete(id: string) {
  const p = placeById(id); if (placeUsedIn(p).length) return toast('Địa điểm đã dùng trong lịch sử chuyến – chỉ có thể ngừng sử dụng.');
  confirmAction(`Xóa ${p.name}?`, 'Địa điểm chưa được dùng trong kế hoạch nào.', 'Xóa', () => {
    const idx = db.places.indexOf(p);
    if (idx > -1) {
      db.places.splice(idx, 1);
      savePlacesToStorage(db.places);
      commit();
      toast(`Đã xóa địa điểm “${p.name}”.`);
    }
  });
}

/** bổ sung tọa độ cho mọi tuyến đã có (bản đồ chỉ đọc) */
export const ensureCoords = () => db.trips.forEach((t: Any) => (t.routes || []).forEach((rt: Any) => rpCoords(t, rt)));
