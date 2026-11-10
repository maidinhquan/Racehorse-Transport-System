import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { addGeoapifyTiles } from '../../../../shared/maps/GeoapifyTiles';
import { drawIncidentPins } from '../../../../shared/maps/incidentPinLayer';
import { useIncidentPins } from '../../../../shared/utils/sharedIncidentPins';
import type { IncidentPin } from '../../../../shared/utils/sharedIncidentPins';
import type { RouteStop } from '../../types';
import { fetchRoadRoute } from '../../../../shared/maps/roadRouting';
import './ManagerRouteMap.css';

/** Tọa độ gần đúng cho các địa điểm trong dữ liệu mẫu (dữ liệu thật mang tọa độ từ phương án Điều phối gửi). */
const KNOWN: Record<string, [number, number]> = {
  'Saigon Riding Club': [10.7769, 106.7009],
  'Trạm nghỉ Phan Thiết': [10.9289, 108.1021],
  'Trạm nghỉ Quy Nhơn': [13.7765, 109.2237],
  'Da Nang Riding Center': [16.0544, 108.2022],
  'Trạm nghỉ Đà Nẵng': [16.0678, 108.2208],
  'Trạm nghỉ Vinh': [18.6796, 105.6813],
  'Hanoi Equestrian Club': [21.0285, 105.8542],
  'Soc Son Stud Farm': [21.2581, 105.8486],
  'Sân bay Nội Bài': [21.2212, 105.8072],
  'Sân bay Đà Nẵng': [16.0439, 108.1994],
  'Cửa khẩu Mộc Bài': [11.0848, 106.2056],
  'Trạm nghỉ Phnom Penh': [11.5564, 104.9282],
  'Cửa khẩu Poipet': [13.6595, 102.5627],
  'Bangkok Polo Club': [13.7367, 100.5455],
  'Sân bay Narita': [35.772, 140.3929],
  'Trạm kiểm dịch sân bay Narita (AQS)': [35.7647, 140.3863],
  'Trạm kiểm dịch sân bay Kansai (AQS)': [34.4347, 135.2441],
  'Tokyo Racecourse Stables': [35.6625, 139.4852],
  'Hanshin Training Stables': [34.7783, 135.3653],
  'Sân bay Dubai': [25.2532, 55.3657],
  'Dubai Equestrian Club': [25.1597, 55.3086],
  'Sân bay London Heathrow': [51.47, -0.4543],
  'Royal Windsor Stables': [51.4839, -0.6044],
};

const COLOR: Record<string, string> = {
  ORIGIN: '#0f172a',
  DESTINATION: '#0f172a',
  AIRPORT: '#ea580c',
  CHECKPOINT: '#2563eb',
  QUARANTINE_STATION: '#7c3aed',
  REST_STOP: '#16a34a',
};

const posOf = (s: RouteStop): L.LatLngTuple | null =>
  Number.isFinite(s.lat) && Number.isFinite(s.lng) ? [s.lat as number, s.lng as number] : KNOWN[s.name] ?? null;

export function ManagerRouteMap({
  stops,
  focus,
  tripId,
  incidentPins: externalPins,
}: {
  stops: RouteStop[];
  focus?: number | null;
  tripId?: string;
  incidentPins?: IncidentPin[];
}) {
  const hookIncidentPins = useIncidentPins(tripId);
  const incidentPins = externalPins ?? hookIncidentPins;
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markers = useRef<Array<L.Marker | null>>([]);
  const pinsKey = JSON.stringify(incidentPins);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const located = stops.filter((s) => posOf(s)).length;
  const key = stops.map((s) => `${s.name}|${s.lat ?? ''}|${s.lng ?? ''}`).join(';');

  useEffect(() => {
    if (!isMaximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMaximized(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMaximized]);

  useEffect(() => {
    const tm = setTimeout(() => {
      try {
        mapRef.current?.invalidateSize({ pan: false });
      } catch {}
    }, 120);
    return () => clearTimeout(tm);
  }, [isMaximized]);

  useEffect(() => {
    if (!box.current || located < 2) return;
    if ((box.current as any)._leaflet_id) {
      delete (box.current as any)._leaflet_id;
    }
    let isCancelled = false;
    const map = L.map(box.current, { zoomControl: true, scrollWheelZoom: true });
    mapRef.current = map;
    const cancelTiles = addGeoapifyTiles(map, () => setTilesFailed(true));
    const pts = stops.map(posOf);
    markers.current = pts.map((p, i) => {
      if (!p) return null;
      const c = COLOR[stops[i].type] ?? '#16a34a';
      const icon = L.divIcon({
        className: 'mgr-map-pin',
        html: `<span style="background:${c}">${i + 1}</span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      return L.marker(p, { icon, title: stops[i].name })
        .addTo(map)
        .bindTooltip(`${i + 1}. ${stops[i].name}`, { direction: 'top', offset: [0, -12] });
    });

    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (!a || !b) continue;
      const flight = stops[i - 1].type === 'AIRPORT' && stops[i].type === 'AIRPORT';
      const poly = L.polyline([a, b], {
        color: flight ? '#ea580c' : '#2563eb',
        weight: flight ? 2 : 4,
        opacity: 0.85,
        dashArray: flight ? '6 8' : undefined,
      }).addTo(map);

      if (!flight) {
        void fetchRoadRoute([
          { lat: a[0], lng: a[1] },
          { lat: b[0], lng: b[1] },
        ]).then((roadCoords) => {
          if (!isCancelled && roadCoords && roadCoords.length > 1) {
            (poly as any).setLatLngs?.(roadCoords);
          }
        });
      }
    }

    drawIncidentPins(map, incidentPins);
    map.fitBounds(L.latLngBounds(pts.filter(Boolean) as L.LatLngTuple[]), { padding: [32, 32] });
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(box.current);

    return () => {
      isCancelled = true;
      observer.disconnect();
      cancelTiles();
      map.remove();
      mapRef.current = null;
      markers.current = [];
    };
  }, [key, located, pinsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (focus == null) return;
    const m = markers.current[focus];
    if (m && mapRef.current) {
      mapRef.current.setView(m.getLatLng(), Math.max(mapRef.current.getZoom(), 11));
      m.openTooltip();
    }
  }, [focus]);

  if (located < 2) return <div className="mgr-map mgr-map--empty">Chưa đủ tọa độ các điểm dừng để vẽ bản đồ.</div>;

  return (
    <div className={`mgr-map-wrap ${isMaximized ? 'is-maximized' : ''}`}>
      <div className="mgr-map-canvas-wrap">
        <button
          type="button"
          className="cus-map-maximize-btn"
          onClick={() => setIsMaximized((m) => !m)}
          title={isMaximized ? 'Thu nhỏ (Esc)' : 'Phóng to bản đồ toàn màn hình'}
        >
          {isMaximized ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 14 10 14 10 20"></polyline>
                <polyline points="20 10 14 10 14 4"></polyline>
                <line x1="14" y1="10" x2="21" y2="3"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
              <span>Thu nhỏ (Esc)</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
              <span>Phóng to bản đồ</span>
            </>
          )}
        </button>
        <div ref={box} className="mgr-map" role="img" aria-label="Bản đồ lộ trình" />
      </div>

      <p className="mgr-map-notice">Đường nối thể hiện thứ tự điểm dừng, vị trí theo mốc được xác nhận.</p>

      <div className="mgr-map-legend">
        <span><i className="road" />Đường bộ</span>
        <span><i className="air" />Chặng bay</span>
        {incidentPins.length ? <span className="mgr-map-warn">Có sự cố: xem ghim đỏ trên bản đồ</span> : null}
        {tilesFailed ? <span className="mgr-map-warn">Không tải được nền bản đồ</span> : null}
      </div>
    </div>
  );
}

export default ManagerRouteMap;
