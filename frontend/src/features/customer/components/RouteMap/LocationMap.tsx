import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { addGeoapifyTiles } from './GeoapifyTiles';
import { drawIncidentPins } from '../../../../shared/maps/incidentPinLayer';
import type { IncidentPin } from '../../../../shared/utils/sharedIncidentPins';
import { fetchRoadRoute } from '../../../../shared/maps/roadRouting';

export interface MapPoint {
  latitude?: number;
  longitude?: number;
  label: string;
  color?: string;
}

export const validPoint = (p: MapPoint) => typeof p.latitude === 'number' && Number.isFinite(p.latitude)
  && Math.abs(p.latitude) <= 90 && typeof p.longitude === 'number' && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180;

/** Read-only map shared by customer tracking and address previews. */
export function LocationMap({ points, current = -1, height = 240, center, route = false, incidentPins = [] }: {
  points: MapPoint[]; current?: number; height?: number; incidentPins?: IncidentPin[];
  center?: { latitude: number; longitude: number }; route?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [failed, setFailed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const pointsKey = JSON.stringify(points);
  const pinsKey = JSON.stringify(incidentPins);

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
    if (!container.current) return;
    setFailed(false);
    let isCancelled = false;
    const mapPoints: MapPoint[] = JSON.parse(pointsKey);
    const map = L.map(container.current, { scrollWheelZoom: true }).setView(
      center ? [center.latitude, center.longitude] : [16, 106], center ? 11 : 5);
    mapRef.current = map;
    const cancelTiles = addGeoapifyTiles(map, () => setFailed(true));
    const located = mapPoints.flatMap((point, index) => validPoint(point)
      ? [{ point, index, position: [point.latitude!, point.longitude!] as L.LatLngTuple }] : []);
    if (route) {
      for (let i = 1; i < located.length; i++) {
        const previous = located[i - 1], next = located[i];
        if (next.index !== previous.index + 1) continue;
        const confirmed = next.index <= current;
        const poly = L.polyline([previous.position, next.position], {
          color: confirmed ? '#f57c00' : '#2563eb', weight: 4,
          dashArray: confirmed ? undefined : '6 8',
        }).addTo(map);

        void fetchRoadRoute([
          { lat: previous.position[0], lng: previous.position[1] },
          { lat: next.position[0], lng: next.position[1] },
        ]).then((roadCoords) => {
          if (!isCancelled && roadCoords && roadCoords.length > 1) {
            (poly as any).setLatLngs?.(roadCoords);
          }
        });
      }
    }
    located.forEach(({ point, index, position }) => {
      const label = document.createElement('span');
      label.textContent = point.label;
      L.circleMarker(position, {
        radius: index === current ? 11 : 8, color: '#fff', weight: 3, fillOpacity: 1,
        fillColor: index === current ? '#f57c00' : (index === 0 || index === located.length - 1) ? '#0f172a' : (point.color ?? '#f08a2b'),
      }).addTo(map).bindTooltip(label);
    });
    drawIncidentPins(map, JSON.parse(pinsKey) as IncidentPin[]);
    if (located.length) map.fitBounds(L.latLngBounds(located.map(p => p.position)), { padding: [30, 30], maxZoom: 15 });
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(container.current);
    return () => {
      isCancelled = true;
      observer.disconnect();
      cancelTiles();
      map.remove();
      mapRef.current = null;
    };
  }, [pointsKey, pinsKey, current, center?.latitude, center?.longitude, route]);

  return (
    <div className={`cus-location-map-wrap ${isMaximized ? 'is-maximized' : ''}`} style={{ position: 'relative' }}>
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
      <div ref={container} className="cus-location-map" style={{ height: isMaximized ? 'calc(100vh - 60px)' : height, width: '100%', position: 'relative', zIndex: 0 }} role="region" aria-label={route ? 'Bản đồ hành trình' : 'Bản đồ vị trí địa chỉ'} />
      {failed && <p role="alert" style={{ margin: 0, padding: 8 }}>Không tải được nền bản đồ. Vui lòng thử lại sau.</p>}
    </div>
  );
}
