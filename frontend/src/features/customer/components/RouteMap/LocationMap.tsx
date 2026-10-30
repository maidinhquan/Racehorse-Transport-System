import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { addGeoapifyTiles } from './GeoapifyTiles';

export interface MapPoint {
  latitude?: number;
  longitude?: number;
  label: string;
  color?: string;
}

export const validPoint = (p: MapPoint) => typeof p.latitude === 'number' && Number.isFinite(p.latitude)
  && Math.abs(p.latitude) <= 90 && typeof p.longitude === 'number' && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180;

/** Read-only map shared by customer tracking and address previews. */
export function LocationMap({ points, current = -1, height = 240, center, route = false }: {
  points: MapPoint[]; current?: number; height?: number;
  center?: { latitude: number; longitude: number }; route?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const pointsKey = JSON.stringify(points);
  useEffect(() => {
    if (!container.current) return;
    setFailed(false);
    const mapPoints: MapPoint[] = JSON.parse(pointsKey);
    const map = L.map(container.current, { scrollWheelZoom: true }).setView(
      center ? [center.latitude, center.longitude] : [16, 106], center ? 11 : 5);
    const cancelTiles = addGeoapifyTiles(map, () => setFailed(true));
    const located = mapPoints.flatMap((point, index) => validPoint(point)
      ? [{ point, index, position: [point.latitude!, point.longitude!] as L.LatLngTuple }] : []);
    if (route) {
      for (let i = 1; i < located.length; i++) {
        const previous = located[i - 1], next = located[i];
        if (next.index !== previous.index + 1) continue;
        const confirmed = next.index <= current;
        L.polyline([previous.position, next.position], {
          color: confirmed ? '#f57c00' : '#64748b', weight: 3,
          dashArray: confirmed ? undefined : '6 8',
        }).addTo(map);
      }
    }
    located.forEach(({ point, index, position }) => {
      const label = document.createElement('span');
      label.textContent = point.label;
      L.circleMarker(position, {
        radius: index === current ? 11 : 8, color: '#fff', weight: 3, fillOpacity: 1,
        fillColor: index === current ? '#f57c00' : point.color ?? '#2563eb',
      }).addTo(map).bindTooltip(label);
    });
    if (located.length) map.fitBounds(L.latLngBounds(located.map(p => p.position)), { padding: [30, 30], maxZoom: 15 });
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(container.current);
    return () => { observer.disconnect(); cancelTiles(); map.remove(); };
  }, [pointsKey, current, center?.latitude, center?.longitude, route]);
  return <>
    <div ref={container} className="cus-location-map" style={{ height, width: '100%', position: 'relative', zIndex: 0 }} role="region" aria-label={route ? 'Bản đồ hành trình' : 'Bản đồ vị trí địa chỉ'} />
    {failed && <p role="alert" style={{ margin: 0, padding: 8 }}>Không tải được nền bản đồ. Vui lòng thử lại sau.</p>}
  </>;
}
