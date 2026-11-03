// Bản đồ lộ trình cho Quản lý: đánh số các điểm theo thứ tự, nét liền là đường bộ, nét đứt là chặng bay.
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { addGeoapifyTiles } from '../../../../shared/maps/GeoapifyTiles';
import type { RouteStop } from '../../types';
import './ManagerRouteMap.css';

/** Tọa độ gần đúng cho các địa điểm trong dữ liệu mẫu (dữ liệu thật mang tọa độ từ phương án Điều phối gửi). */
const KNOWN: Record<string, [number, number]> = {
  'Saigon Riding Club': [10.7769, 106.7009], 'Trạm nghỉ Phan Thiết': [10.9289, 108.1021], 'Trạm nghỉ Quy Nhơn': [13.7765, 109.2237],
  'Da Nang Riding Center': [16.0544, 108.2022], 'Trạm nghỉ Đà Nẵng': [16.0678, 108.2208], 'Trạm nghỉ Vinh': [18.6796, 105.6813],
  'Hanoi Equestrian Club': [21.0285, 105.8542], 'Soc Son Stud Farm': [21.2581, 105.8486], 'Sân bay Nội Bài': [21.2212, 105.8072],
  'Sân bay Đà Nẵng': [16.0439, 108.1994], 'Cửa khẩu Mộc Bài': [11.0848, 106.2056], 'Trạm nghỉ Phnom Penh': [11.5564, 104.9282],
  'Cửa khẩu Poipet': [13.6595, 102.5627], 'Bangkok Polo Club': [13.7367, 100.5455], 'Sân bay Narita': [35.772, 140.3929],
  'Trạm kiểm dịch sân bay Narita (AQS)': [35.7647, 140.3863], 'Trạm kiểm dịch sân bay Kansai (AQS)': [34.4347, 135.2441],
  'Tokyo Racecourse Stables': [35.6625, 139.4852], 'Hanshin Training Stables': [34.7783, 135.3653], 'Sân bay Dubai': [25.2532, 55.3657],
  'Dubai Equestrian Club': [25.1597, 55.3086], 'Sân bay London Heathrow': [51.47, -0.4543], 'Royal Windsor Stables': [51.4839, -0.6044],
};
const COLOR: Record<string, string> = { ORIGIN: '#0f172a', DESTINATION: '#0f172a', AIRPORT: '#ea580c', CHECKPOINT: '#2563eb', QUARANTINE_STATION: '#7c3aed', REST_STOP: '#16a34a' };
const posOf = (s: RouteStop): L.LatLngTuple | null =>
  Number.isFinite(s.lat) && Number.isFinite(s.lng) ? [s.lat as number, s.lng as number] : KNOWN[s.name] ?? null;

export function ManagerRouteMap({ stops, focus }: { stops: RouteStop[]; focus?: number | null }) {
  const box = useRef<HTMLDivElement>(null), mapRef = useRef<L.Map | null>(null), markers = useRef<Array<L.Marker | null>>([]);
  const [tilesFailed, setTilesFailed] = useState(false);
  const located = stops.filter((s) => posOf(s)).length;
  const key = stops.map((s) => `${s.name}|${s.lat ?? ''}|${s.lng ?? ''}`).join(';');

  useEffect(() => {
    if (!box.current || located < 2) return;
    const map = L.map(box.current, { zoomControl: true, scrollWheelZoom: true });
    mapRef.current = map;
    const cancelTiles = addGeoapifyTiles(map, () => setTilesFailed(true));
    const pts = stops.map(posOf);
    markers.current = pts.map((p, i) => {
      if (!p) return null;
      const c = COLOR[stops[i].type] ?? '#16a34a';
      const icon = L.divIcon({ className: 'mgr-map-pin', html: `<span style="background:${c}">${i + 1}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] });
      return L.marker(p, { icon, title: stops[i].name }).addTo(map).bindTooltip(`${i + 1}. ${stops[i].name}`, { direction: 'top', offset: [0, -12] });
    });
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i]; if (!a || !b) continue;
      const flight = stops[i - 1].type === 'AIRPORT' && stops[i].type === 'AIRPORT';
      L.polyline([a, b], { color: flight ? '#ea580c' : '#2563eb', weight: flight ? 2 : 4, opacity: 0.85, dashArray: flight ? '6 8' : undefined }).addTo(map);
    }
    map.fitBounds(L.latLngBounds(pts.filter(Boolean) as L.LatLngTuple[]), { padding: [32, 32] });
    return () => { cancelTiles(); map.remove(); mapRef.current = null; markers.current = []; };
  }, [key, located]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (focus == null) return;
    const m = markers.current[focus];
    if (m && mapRef.current) { mapRef.current.setView(m.getLatLng(), Math.max(mapRef.current.getZoom(), 11)); m.openTooltip(); }
  }, [focus]);

  if (located < 2) return <div className="mgr-map mgr-map--empty">Chưa đủ tọa độ các điểm dừng để vẽ bản đồ.</div>;
  return (
    <div className="mgr-map-wrap">
      <div ref={box} className="mgr-map" role="img" aria-label="Bản đồ lộ trình" />
      <div className="mgr-map-legend"><span><i className="road" />Đường bộ</span><span><i className="air" />Chặng bay</span>{tilesFailed ? <span className="mgr-map-warn">Không tải được nền bản đồ</span> : null}</div>
    </div>
  );
}
