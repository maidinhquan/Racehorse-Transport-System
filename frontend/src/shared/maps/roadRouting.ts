/**
 * Dịch vụ tìm đường bộ thực tế (Road Routing Service) dùng chung cho mọi bản đồ:
 * - Điều phối viên (Coordinator)
 * - Tài xế (Driver)
 * - Quản lý (Manager)
 * - Khách hàng (Customer)
 *
 * Tính năng chính:
 * 1. Ép lộ trình nội địa Việt Nam luôn bám theo Quốc lộ 1A / Cao tốc Bắc-Nam,
 *    tuyệt đối KHÔNG bị OSRM cắt xuyên biên giới sang Lào / Campuchia.
 * 2. Tự động chia chặng và lấy tọa độ đường uốn lượn thực tế theo mặt đường.
 * 3. Bộ nhớ đệm (Cache) tức thì + chống gọi trùng (in-flight deduplication).
 * 4. Tự động fallback sang Geoapify Routing API khi OSRM bị quá tải / giới hạn tần suất (HTTP 429).
 * 5. Định tuyến cả chuyến trong một lần gọi (fetchTripSegments) để đồng bộ hoàn toàn với Điều phối.
 */

export interface LatLngPoint {
  lat: number;
  lng: number;
}

const DEFAULT_GEOAPIFY_KEY = 'b729f957018d45e4b2d1d07c08ec202c';

// Hành lang ven biển QL1A / Cao tốc Bắc-Nam để ép OSRM không cắt qua Lào / Campuchia
export const VN_CORRIDORS: Array<{ lat: number; lng: number; desc: string }> = [
  { lat: 18.6800, lng: 105.6800, desc: 'Vinh - Nghệ An' },
  { lat: 16.0500, lng: 108.2000, desc: 'Đà Nẵng' },
  { lat: 13.7800, lng: 109.2200, desc: 'Quy Nhơn - Bình Định' },
  { lat: 12.2400, lng: 109.1900, desc: 'Nha Trang - Khánh Hòa' },
  { lat: 10.9300, lng: 108.1000, desc: 'Phan Thiết - Bình Thuận' },
];

export function isInsideVietnam(lat: number, lng: number): boolean {
  return lat >= 8.2 && lat <= 23.5 && lng >= 102.1 && lng <= 109.8;
}

/**
 * Kiểm tra xem giữa 2 điểm nội địa Việt Nam có khoảng cách Bắc-Nam đủ xa
 * để OSRM có nguy cơ cắt qua Lào/Campuchia hay không.
 */
export function getDomesticCorridors(pA: LatLngPoint, pB: LatLngPoint): LatLngPoint[] {
  if (!isInsideVietnam(pA.lat, pA.lng) || !isInsideVietnam(pB.lat, pB.lng)) return [];
  const minLat = Math.min(pA.lat, pB.lat);
  const maxLat = Math.max(pA.lat, pB.lat);
  if (maxLat - minLat < 2.5) return []; // Dưới 2.5 độ vĩ (~280km) thì OSRM chạy cục bộ chuẩn

  const goingSouth = pA.lat > pB.lat;
  const filtered = VN_CORRIDORS.filter((c) => {
    // Chỉ lấy các mốc hành lang nằm giữa 2 điểm (với biên đệm 0.3 độ)
    return c.lat > minLat + 0.3 && c.lat < maxLat - 0.3;
  });

  return goingSouth
    ? filtered.sort((a, b) => b.lat - a.lat)
    : filtered.sort((a, b) => a.lat - b.lat);
}

/** Suy luận tọa độ dự phòng từ tên/địa chỉ điểm dừng (đồng bộ với Điều phối) */
export function inferStopCoords(rawText: string): [number, number] | null {
  const addr = String(rawText || '').toLowerCase();
  if (!addr) return null;
  if (addr.includes('cái mép') || addr.includes('thị vải') || addr.includes('tân phước') || addr.includes('phú mỹ')) return [10.5667, 107.0333];
  if (addr.includes('vũng tàu') || addr.includes('bà rịa')) return [10.4114, 107.1362];
  if (addr.includes('cang da nang') || addr.includes('cảng đà nẵng') || addr.includes('hải châu') || addr.includes('đà nẵng') || addr.includes('da nang')) return [16.0748, 108.2240];
  if (addr.includes('quảng ngãi') || addr.includes('quang ngai')) return [15.1214, 108.8044];
  if (addr.includes('tuy hòa') || addr.includes('tuy hoa') || addr.includes('phú yên')) return [13.0955, 109.2967];
  if (addr.includes('cam ranh')) return [11.9069, 109.1456];
  if (addr.includes('xuân lộc') || addr.includes('xuan loc') || addr.includes('đồng nai')) return [10.9254, 107.4045];
  if (addr.includes('lê đức thọ') || addr.includes('gò vấp')) return [10.8550, 106.6565];
  if (addr.includes('hà nội') || addr.includes('ha noi') || addr.includes('hanoi') || addr.includes('hoàn kiếm') || addr.includes('ba đình') || addr.includes('cầu giấy')) return [21.0285, 105.8542];
  if (addr.includes('nội bài') || addr.includes('noi bai')) return [21.2212, 105.8072];
  if (addr.includes('tân sơn nhất') || addr.includes('tan son nhat')) return [10.8185, 106.6588];
  if (addr.includes('hải phòng') || addr.includes('hai phong')) return [20.8449, 106.6881];
  if (addr.includes('vinh') || addr.includes('nghệ an')) return [18.6796, 105.6813];
  if (addr.includes('huế') || addr.includes('thừa thiên')) return [16.4637, 107.5909];
  if (addr.includes('quy nhơn') || addr.includes('bình định')) return [13.7820, 109.2190];
  if (addr.includes('nha trang') || addr.includes('khánh hòa')) return [12.2388, 109.1967];
  if (addr.includes('phan thiết') || addr.includes('bình thuận')) return [10.9289, 108.1021];
  if (addr.includes('đà lạt') || addr.includes('lâm đồng')) return [11.9404, 108.4583];
  if (addr.includes('cần thơ') || addr.includes('can tho')) return [10.0452, 105.7469];
  if (addr.includes('tây ninh') || addr.includes('mộc bài')) return [11.0776, 106.1583];
  if (addr.includes('tokyo') || addr.includes('narita')) return [35.67686, 139.763895];
  if (addr.includes('bangkok')) return [13.7563, 100.5018];
  if (addr.includes('saigon') || addr.includes('hồ chí minh') || addr.includes('ho chi minh')) return [10.7769, 106.7009];
  return null;
}

const memoryCache = new Map<string, [number, number][]>();
const inFlightCache = new Map<string, Promise<[number, number][]>>();

function saveCachedCoords(cacheKey: string, coords: [number, number][]) {
  if (!coords || coords.length <= 2) return;
  memoryCache.set(cacheKey, coords);
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`rts_route_${cacheKey}`, JSON.stringify(coords));
    }
  } catch {}
}

function readCachedCoords(cacheKey: string): [number, number][] | null {
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }
  try {
    const cachedStr = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`rts_route_${cacheKey}`) : null;
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr) as [number, number][];
      if (Array.isArray(parsed) && parsed.length > 2) {
        memoryCache.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch {}
  return null;
}

async function fetchGeoapifyCoords(waypoints: LatLngPoint[], signal: AbortSignal): Promise<[number, number][] | null> {
  try {
    const wpQuery = waypoints.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
    const url = `https://api.geoapify.com/v1/routing?waypoints=${wpQuery}&mode=drive&avoid=borders&apiKey=${DEFAULT_GEOAPIFY_KEY}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature?.geometry?.coordinates?.length) return null;
    const rawCoords = Array.isArray(feature.geometry.coordinates[0]?.[0])
      ? feature.geometry.coordinates.flat(1)
      : feature.geometry.coordinates;
    const coords: [number, number][] = rawCoords
      .filter((c: any) => Array.isArray(c) && c.length >= 2)
      .map((c: [number, number]) => [c[1], c[0]]);
    return coords.length > 1 ? coords : null;
  } catch {
    return null;
  }
}

/**
 * Lấy danh sách tọa độ uốn lượn đường bộ thực tế nối giữa danh sách các điểm dừng.
 * Trả về mảng các cặp [latitude, longitude] tương thích trực tiếp với Leaflet L.polyline.
 */
export async function fetchRoadRoute(points: LatLngPoint[]): Promise<[number, number][]> {
  const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (valid.length < 2) return valid.map((p) => [p.lat, p.lng]);

  const cacheKey = valid.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(';');
  const cached = readCachedCoords(cacheKey);
  if (cached) return cached;

  if (inFlightCache.has(cacheKey)) {
    return inFlightCache.get(cacheKey)!;
  }

  const promise = (async (): Promise<[number, number][]> => {
    // Xây dựng danh sách waypoints gửi đến OSRM kèm hành lang bảo vệ
    const osrmWaypoints: LatLngPoint[] = [valid[0]];
    for (let i = 0; i < valid.length - 1; i++) {
      const pA = valid[i];
      const pB = valid[i + 1];
      const corridors = getDomesticCorridors(pA, pB);
      for (const c of corridors) {
        osrmWaypoints.push(c);
      }
      osrmWaypoints.push(pB);
    }

    const query = osrmWaypoints.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';');
    const pathQuery = `${query}?overview=full&geometries=geojson&steps=false`;

    let response: Response | null = null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);

    try {
      // 1. Thử qua proxy nội bộ Vite /osrm
      try {
        response = await fetch(`/osrm/route/v1/driving/${pathQuery}`, { signal: ctrl.signal });
        if (!response.ok && response.status !== 400) response = null;
      } catch {
        response = null;
      }

      // 2. Thử trực tiếp tới OSRM công cộng
      if (!response) {
        try {
          response = await fetch(`https://router.project-osrm.org/route/v1/driving/${pathQuery}`, { signal: ctrl.signal });
          if (!response.ok) response = null;
        } catch {
          response = null;
        }
      }

      if (response && response.ok) {
        const data = await response.json();
        if (data?.routes?.[0]?.geometry?.coordinates?.length) {
          const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]]
          );
          if (coords.length > 1) {
            saveCachedCoords(cacheKey, coords);
            return coords;
          }
        }
      }

      // 3. Fallback sang Geoapify Routing API khi OSRM bị quá tải / lỗi
      const geoCoords = await fetchGeoapifyCoords(osrmWaypoints, ctrl.signal);
      if (geoCoords && geoCoords.length > 1) {
        saveCachedCoords(cacheKey, geoCoords);
        return geoCoords;
      }
    } catch {
      // Bỏ qua lỗi mạng, sẽ fallback về đường nối thẳng bên dưới
    } finally {
      clearTimeout(timer);
      inFlightCache.delete(cacheKey);
    }

    // Fallback an toàn: nếu mất mạng hoàn toàn, nối thẳng các điểm (không lưu cache để lần sau tự thử lại)
    return valid.map((p) => [p.lat, p.lng]);
  })();

  inFlightCache.set(cacheKey, promise);
  return promise;
}

/**
 * Cắt đường tổng (fullCoords) thành từng chặng theo danh sách điểm dừng (giống hệt thuật toán cắt chặng của Điều phối).
 */
function sliceCoordsByWaypoints(fullCoords: [number, number][], points: LatLngPoint[]): Array<[number, number][]> {
  if (points.length < 2 || fullCoords.length < 2) {
    return points.slice(1).map((p, i) => [[points[i].lat, points[i].lng], [p.lat, p.lng]]);
  }
  const cuts = points.map((p) => {
    let best = 0;
    let bestDist = Infinity;
    for (let k = 0; k < fullCoords.length; k++) {
      const c = fullCoords[k];
      const d = (c[0] - p.lat) ** 2 + (c[1] - p.lng) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = k;
      }
    }
    return best;
  });
  for (let k = 1; k < cuts.length; k++) {
    if (cuts[k] < cuts[k - 1]) cuts[k] = cuts[k - 1];
  }
  return points.slice(1).map((_, k) => {
    const seg = fullCoords.slice(cuts[k], cuts[k + 1] + 1);
    const pA = points[k], pB = points[k + 1];
    const legKey = `${pA.lat.toFixed(4)},${pA.lng.toFixed(4)};${pB.lat.toFixed(4)},${pB.lng.toFixed(4)}`;
    if (seg.length > 2) {
      saveCachedCoords(legKey, seg);
    }
    return seg.length >= 2 ? seg : [[pA.lat, pA.lng], [pB.lat, pB.lng]];
  });
}

/**
 * Lấy tọa độ đường uốn lượn thực tế cho từng chặng riêng biệt giữa các điểm dừng.
 * Gửi một truy vấn gộp cho toàn bộ chuỗi điểm đường bộ (giống Điều phối) để tránh bị OSRM chặn 429 khi có nhiều trạm.
 */
export async function fetchTripSegments(points: LatLngPoint[]): Promise<Array<[number, number][]>> {
  if (points.length < 2) return [];
  const allValid = points.every((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng));
  if (allValid) {
    // Kiểm tra xem tất cả từng chặng lẻ đã có sẵn trong cache chưa
    const cachedSegments: Array<[number, number][] | null> = [];
    for (let i = 0; i < points.length - 1; i++) {
      const pA = points[i], pB = points[i + 1];
      const legKey = `${pA.lat.toFixed(4)},${pA.lng.toFixed(4)};${pB.lat.toFixed(4)},${pB.lng.toFixed(4)}`;
      cachedSegments.push(readCachedCoords(legKey));
    }
    if (cachedSegments.every((s) => s !== null && s.length > 2)) {
      return cachedSegments as Array<[number, number][]>;
    }

    // Gọi một lần cho cả hành trình đường bộ rồi cắt theo điểm dừng (giống hệt Điều phối)
    const fullCoords = await fetchRoadRoute(points);
    if (fullCoords.length > points.length) {
      return sliceCoordsByWaypoints(fullCoords, points);
    }
  }

  // Fallback từng chặng nếu có điểm khuyết tọa độ
  const segments: Array<[number, number][]> = [];
  for (let i = 0; i < points.length - 1; i++) {
    const pA = points[i];
    const pB = points[i + 1];
    if (!Number.isFinite(pA?.lat) || !Number.isFinite(pA?.lng) || !Number.isFinite(pB?.lat) || !Number.isFinite(pB?.lng)) {
      segments.push([]);
      continue;
    }
    const coords = await fetchRoadRoute([pA, pB]);
    segments.push(coords);
  }
  return segments;
}

