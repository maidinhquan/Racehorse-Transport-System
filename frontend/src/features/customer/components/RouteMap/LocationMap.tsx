import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { addGeoapifyTiles } from './GeoapifyTiles';
import { drawIncidentPins } from '../../../../shared/maps/incidentPinLayer';
import type { IncidentPin } from '../../../../shared/utils/sharedIncidentPins';
import { fetchRoadRoute, fetchTripSegments, inferStopCoords } from '../../../../shared/maps/roadRouting';

export interface MapPoint {
  latitude?: number;
  longitude?: number;
  label: string;
  color?: string;
  type?: string;
}

export const validPoint = (p: MapPoint) => {
  if (
    typeof p.latitude === 'number' && Number.isFinite(p.latitude)
    && Math.abs(p.latitude) <= 90 && typeof p.longitude === 'number' && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180
  ) {
    return true;
  }
  return Boolean(inferStopCoords(p.label));
};

function resolvePosition(p: MapPoint): L.LatLngTuple | null {
  if (
    typeof p.latitude === 'number' && Number.isFinite(p.latitude)
    && Math.abs(p.latitude) <= 90 && typeof p.longitude === 'number' && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180
  ) {
    return [p.latitude, p.longitude];
  }
  return inferStopCoords(p.label);
}

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
    const located = mapPoints.flatMap((point, index) => {
      const position = resolvePosition(point);
      return position ? [{ point, index, position }] : [];
    });
    const hasAir = located.some((item, i) => i > 0 && located[i - 1].point.type === 'AIRPORT' && item.point.type === 'AIRPORT');

    if (route) {
      const polylines: Array<{ legIndex: number; poly: L.Polyline; prevPos: L.LatLngTuple; nextPos: L.LatLngTuple; confirmed: boolean; flight: boolean }> = [];
      for (let i = 1; i < located.length; i++) {
        const previous = located[i - 1], next = located[i];
        if (next.index !== previous.index + 1) continue;
        const confirmed = current >= 0 && next.index <= current;
        const flight = previous.point.type === 'AIRPORT' && next.point.type === 'AIRPORT';
        const poly = L.polyline([previous.position, next.position], {
          color: flight ? '#ea580c' : confirmed ? '#f57c00' : '#2563eb',
          weight: flight ? 3 : 5,
          opacity: 0.88,
          dashArray: flight ? '2 10' : confirmed ? undefined : '6 8',
          interactive: false,
        }).addTo(map);
        polylines.push({
          legIndex: i - 1,
          poly,
          prevPos: previous.position,
          nextPos: next.position,
          confirmed,
          flight,
        });
      }

      if (!hasAir && located.length === mapPoints.length && located.length >= 2) {
        const roadPoints = located.map((p) => ({ lat: p.position[0], lng: p.position[1] }));
        void fetchTripSegments(roadPoints).then((segments) => {
          if (isCancelled) return;
          polylines.forEach(({ legIndex, poly, confirmed }) => {
            const seg = segments[legIndex];
            if (seg && seg.length > 1) {
              (poly as any).setLatLngs?.(seg);
              if (!confirmed) poly.setStyle({ dashArray: undefined });
            }
          });
        });
      } else {
        polylines.forEach(({ poly, prevPos, nextPos, confirmed, flight }) => {
          if (flight) return;
          void fetchRoadRoute([
            { lat: prevPos[0], lng: prevPos[1] },
            { lat: nextPos[0], lng: nextPos[1] },
          ]).then((roadCoords) => {
            if (!isCancelled && roadCoords && roadCoords.length > 1) {
              (poly as any).setLatLngs?.(roadCoords);
              if (!confirmed) poly.setStyle({ dashArray: undefined });
            }
          });
        });
      }
    }
    located.forEach(({ point, index, position }) => {
      const label = document.createElement('span');
      label.textContent = point.label;
      if (route) {
        const latest = index === current;
        const isEnd = index === 0 || index === mapPoints.length - 1 || point.type === 'ORIGIN' || point.type === 'DESTINATION';
        const isReq = point.type === 'CHECKPOINT' || point.type === 'QUARANTINE_STATION' || point.type === 'AIRPORT';
        const pinClass = `rp-pin ${isEnd ? 'end' : isReq ? 'req' : 'sel'} ${latest ? 'cur' : ''}`;
        const icon = L.divIcon({
          className: '',
          html: `<div class="${pinClass}">${index + 1}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        L.marker(position, {
          icon,
          zIndexOffset: point.type === 'AIRPORT' ? 1100 : latest ? 1200 : 1000,
        }).addTo(map).bindTooltip(label, { direction: 'top', offset: [0, -12] });
      } else {
        L.circleMarker(position, {
          radius: index === current ? 11 : 8, color: '#fff', weight: 3, fillOpacity: 1,
          fillColor: index === current ? '#f57c00' : (index === 0 || index === located.length - 1) ? '#0f172a' : (point.color ?? '#f08a2b'),
        }).addTo(map).bindTooltip(label);
      }
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
