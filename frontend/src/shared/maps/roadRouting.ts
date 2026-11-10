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
 * 3. Bộ nhớ đệm (Cache) tức thì, chống giật lag và chống gọi lặp API.
 * 4. Fallback an toàn sang đường nối thẳng khi mất mạng hoàn toàn.
 */

export interface LatLngPoint {
  lat: number;
  lng: number;
}

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

const memoryCache = new Map<string, [number, number][]>();

/**
 * Lấy danh sách tọa độ uốn lượn đường bộ thực tế nối giữa danh sách các điểm dừng.
 * Trả về mảng các cặp [latitude, longitude] tương thích trực tiếp với Leaflet L.polyline.
 */
export async function fetchRoadRoute(points: LatLngPoint[]): Promise<[number, number][]> {
  const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (valid.length < 2) return valid.map((p) => [p.lat, p.lng]);

  const cacheKey = valid.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(';');
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // Thử đọc từ sessionStorage
  try {
    const cachedStr = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`rts_route_${cacheKey}`) : null;
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr) as [number, number][];
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCache.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch {}

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
  const timer = setTimeout(() => ctrl.abort(), 8000);

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
      response = await fetch(`https://router.project-osrm.org/route/v1/driving/${pathQuery}`, { signal: ctrl.signal });
    }

    if (response && response.ok) {
      const data = await response.json();
      if (data?.routes?.[0]?.geometry?.coordinates?.length) {
        // GeoJSON trả về [lng, lat], đổi thành [lat, lng] cho Leaflet
        const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );

        if (coords.length > 0) {
          memoryCache.set(cacheKey, coords);
          try {
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem(`rts_route_${cacheKey}`, JSON.stringify(coords));
            }
          } catch {}
          return coords;
        }
      }
    }
  } catch {
    // Bỏ qua lỗi mạng, sẽ fallback về đường nối thẳng bên dưới
  } finally {
    clearTimeout(timer);
  }

  // Fallback an toàn: nếu mất mạng hoặc OSRM lỗi, nối thẳng các điểm
  const straightLine: [number, number][] = valid.map((p) => [p.lat, p.lng]);
  return straightLine;
}

/**
 * Lấy tọa độ đường uốn lượn thực tế cho từng chặng riêng biệt giữa các điểm dừng.
 */
export async function fetchTripSegments(points: LatLngPoint[]): Promise<Array<[number, number][]>> {
  const segments: Array<[number, number][]> = [];
  for (let i = 0; i < points.length - 1; i++) {
    const pA = points[i];
    const pB = points[i + 1];
    if (!Number.isFinite(pA.lat) || !Number.isFinite(pA.lng) || !Number.isFinite(pB.lat) || !Number.isFinite(pB.lng)) {
      segments.push([]);
      continue;
    }
    const coords = await fetchRoadRoute([pA, pB]);
    segments.push(coords);
  }
  return segments;
}
