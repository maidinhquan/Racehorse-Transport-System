import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { addGeoapifyTiles } from '../../../../shared/maps/GeoapifyTiles';
import { drawIncidentPins } from '../../../../shared/maps/incidentPinLayer';
import { useIncidentPins } from '../../../../shared/utils/sharedIncidentPins';
import type { IncidentPin } from '../../../../shared/utils/sharedIncidentPins';
import type { RouteStop } from '../../types';
import { STOP_TYPE_LABEL, fmtDateTime } from '../../hooks/managerRules';
import { fetchRoadRoute, fetchTripSegments, inferStopCoords } from '../../../../shared/maps/roadRouting';
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

const posOf = (s: RouteStop): L.LatLngTuple | null => {
  if (Number.isFinite(s.lat) && Number.isFinite(s.lng)) {
    return [s.lat as number, s.lng as number];
  }
  return KNOWN[s.name] ?? inferStopCoords(s.name) ?? null;
};

export function ManagerRouteMap({
  stops,
  current = -1,
  focus,
  tripId,
  incidentPins: externalPins,
}: {
  stops: RouteStop[];
  /** Chỉ số điểm dừng có mốc xác nhận gần nhất (-1 = chưa xuất phát / đang lập kế hoạch) */
  current?: number;
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
  const key = stops.map((s) => `${s.name}|${s.type}|${s.lat ?? ''}|${s.lng ?? ''}`).join(';');
  const lastConfirmed = Number.isInteger(current) && current >= 0 && current < stops.length ? current : -1;
  const hasAir = stops.some((s, i) => i > 0 && stops[i - 1].type === 'AIRPORT' && s.type === 'AIRPORT');

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

    const polylines: Array<{ index: number; poly: L.Polyline; a: L.LatLngTuple; b: L.LatLngTuple; flight: boolean }> = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (!a || !b) continue;
      const flight = stops[i - 1].type === 'AIRPORT' && stops[i].type === 'AIRPORT';
      const done = lastConfirmed >= 0 && i <= lastConfirmed;
      const poly = L.polyline([a, b], {
        color: flight ? '#ea580c' : done ? '#f57c00' : '#2563eb',
        weight: flight ? 3 : 5,
        opacity: 0.88,
        dashArray: flight ? '2 10' : done ? undefined : '6 8',
        interactive: false,
      }).addTo(map);
      polylines.push({ index: i - 1, poly, a, b, flight });
    }

    // Nếu không có chặng bay và toàn bộ điểm dừng có tọa độ: gọi gộp 1 lần cho toàn tuyến (đồng bộ 100% với Điều phối)
    if (!hasAir && pts.every(Boolean)) {
      const roadPoints = (pts as L.LatLngTuple[]).map(([lat, lng]) => ({ lat, lng }));
      void fetchTripSegments(roadPoints).then((segments) => {
        if (isCancelled) return;
        polylines.forEach(({ index, poly }) => {
          const seg = segments[index];
          if (seg && seg.length > 1) {
            (poly as any).setLatLngs?.(seg);
            if (!(lastConfirmed >= 0 && index + 1 <= lastConfirmed)) {
              poly.setStyle({ dashArray: undefined });
            }
          }
        });
      });
    } else {
      polylines.forEach(({ index, poly, a, b, flight }) => {
        if (flight) return;
        void fetchRoadRoute([
          { lat: a[0], lng: a[1] },
          { lat: b[0], lng: b[1] },
        ]).then((roadCoords) => {
          if (!isCancelled && roadCoords && roadCoords.length > 1) {
            (poly as any).setLatLngs?.(roadCoords);
            if (!(lastConfirmed >= 0 && index + 1 <= lastConfirmed)) {
              poly.setStyle({ dashArray: undefined });
            }
          }
        });
      });
    }

    markers.current = pts.map((p, i) => {
      if (!p) return null;
      const s = stops[i];
      const latest = i === lastConfirmed;
      const isEnd = i === 0 || i === stops.length - 1 || s.type === 'ORIGIN' || s.type === 'DESTINATION';
      const isAirport = s.type === 'AIRPORT';
      const isReq = s.type === 'CHECKPOINT' || s.type === 'QUARANTINE_STATION' || isAirport;
      const pinClass = `rp-pin ${isEnd ? 'end' : isReq ? 'req' : 'sel'} ${latest ? 'cur' : ''}`;
      const icon = L.divIcon({
        className: '',
        html: `<div class="${pinClass}">${i + 1}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      const marker = L.marker(p, {
        icon,
        title: s.name,
        zIndexOffset: isAirport ? 1100 : latest ? 1200 : 1000,
      }).addTo(map);
      marker.bindTooltip(`${i + 1}. ${s.name}`, { direction: 'top', offset: [0, -12] });
      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `${i + 1}. ${s.name}`;
      const details = document.createElement('p');
      details.style.margin = '4px 0 0';
      details.textContent = `${STOP_TYPE_LABEL[s.type] ?? s.type}${s.plannedAt ? ` • dự kiến ${fmtDateTime(s.plannedAt)}` : ''}`;
      popup.append(title, details);
      if (latest) {
        const status = document.createElement('p');
        status.style.margin = '4px 0 0';
        status.style.fontWeight = '700';
        status.style.color = '#ea580c';
        status.textContent = 'Mốc xác nhận gần nhất';
        popup.append(status);
      }
      marker.bindPopup(popup);
      return marker;
    });

    drawIncidentPins(map, incidentPins);
    map.fitBounds(L.latLngBounds(pts.filter(Boolean) as L.LatLngTuple[]), { padding: [32, 32], maxZoom: 12 });
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
  }, [key, located, pinsKey, lastConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          {incidentPins.length > 0 && (
            <button
              type="button"
              className="cus-map-maximize-btn"
              onClick={() => {
                if (mapRef.current && incidentPins[0]) {
                  mapRef.current.setView([incidentPins[0].lat, incidentPins[0].lng], 13, { animate: true });
                }
              }}
              title="Phóng to vào vị trí điểm sự cố trên tuyến đường"
              style={{ position: 'static', whiteSpace: 'nowrap', background: '#fee2e2', borderColor: '#fca5a5', color: '#b91c1c', fontWeight: 600 }}
            >
              📍 Tới điểm sự cố
            </button>
          )}
          <button
            type="button"
            className="cus-map-maximize-btn"
            onClick={() => setIsMaximized((m) => !m)}
            title={isMaximized ? 'Thu nhỏ (Esc)' : 'Phóng to bản đồ toàn màn hình'}
            style={{ position: 'static', whiteSpace: 'nowrap' }}
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
        </div>
        <div ref={box} className="mgr-map" role="img" aria-label="Bản đồ lộ trình" />
      </div>

      <p className="mgr-map-notice">Đường nối thể hiện thứ tự điểm dừng, vị trí theo mốc được xác nhận.</p>

      <div className="mgr-map-legend">
        <span><i className="pin-dot end" />Điểm nhận/giao</span>
        <span><i className="pin-dot req" />Điểm bắt buộc</span>
        <span><i className="pin-dot sel" />Điểm dừng</span>
        {lastConfirmed >= 0 && <span><i className="pin-dot cur" />Mốc xác nhận gần nhất</span>}
        <span><i className="road" />Đường bộ</span>
        {lastConfirmed >= 0 && <span><i className="done" />Chặng đã qua</span>}
        {hasAir && <span><i className="air" />Chặng bay</span>}
        {incidentPins.length ? <span className="mgr-map-warn">Có sự cố: xem ghim đỏ trên bản đồ</span> : null}
        {tilesFailed ? <span className="mgr-map-warn">Không tải được nền bản đồ</span> : null}
      </div>
    </div>
  );
}

export default ManagerRouteMap;

