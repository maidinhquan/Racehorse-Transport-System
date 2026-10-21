import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RouteMap.css';
import type { GeoPoint } from '../../api/checkpointCatalog';
import type { RouteStop } from '../../types';
import { STOP_COLOR, STOP_LABEL } from '../../hooks/coordinatorRules';

interface RouteMapProps {
  stops: RouteStop[];
  current?: number;
  height?: number;
  onPick?: (point: GeoPoint) => void;
}

function hasCoordinates(stop: RouteStop) {
  return typeof stop.lat === 'number' && Number.isFinite(stop.lat)
    && stop.lat >= -90 && stop.lat <= 90
    && typeof stop.lng === 'number' && Number.isFinite(stop.lng)
    && stop.lng >= -180 && stop.lng <= 180;
}

export function RouteMap({ stops, current = -1, height = 380, onPick }: RouteMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const lastBounds = useRef('');
  const [tileError, setTileError] = useState(false);
  const missing = stops.filter(stop => !hasCoordinates(stop));

  useEffect(() => {
    if (!container.current) return;
    if ((container.current as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (container.current as unknown as { _leaflet_id?: number })._leaflet_id;
    }
    const map = L.map(container.current, { scrollWheelZoom: false }).setView([13, 106], 5);
    mapRef.current = map;
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
    tiles.on('tileerror', () => setTileError(true));
    tiles.addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    const resize = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      tiles.off();
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
      lastBounds.current = '';
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onPick) return;
    const handleClick = (event: L.LeafletMouseEvent) => {
      const point = event.latlng.wrap();
      onPick({ lat: point.lat, lng: point.lng });
    };
    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [onPick]);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;
    layers.clearLayers();
    const located = stops.flatMap((stop, index) => hasCoordinates(stop)
      ? [{ stop, index, position: [stop.lat!, stop.lng!] as L.LatLngTuple }] : []);
    const lastConfirmed = Number.isInteger(current) && current >= 0 && current < stops.length ? current : -1;

    // Never connect across a stop whose coordinates are missing.
    for (let i = 1; i < located.length; i++) {
      const previous = located[i - 1], next = located[i];
      if (next.index !== previous.index + 1) continue;
      const confirmed = next.index <= lastConfirmed;
      L.polyline([previous.position, next.position], {
        color: confirmed ? '#f57c00' : '#64748b', weight: 4,
        dashArray: confirmed ? undefined : '7 8', interactive: false,
      }).addTo(layers);
    }

    located.forEach(({ stop, index, position }) => {
      const latest = index === lastConfirmed;
      const marker = L.circleMarker(position, {
        bubblingMouseEvents: false, radius: latest ? 11 : 8, color: '#fff', weight: 3,
        fillColor: latest ? '#f57c00' : (STOP_COLOR[stop.type] ?? '#64748b'), fillOpacity: 1,
      }).addTo(layers);
      // Use text nodes, so names entered by users are not treated as HTML.
      const tooltip = document.createElement('span');
      tooltip.textContent = `${index + 1}. ${stop.name}`;
      marker.bindTooltip(tooltip, { direction: 'top' });
      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `${index + 1}. ${stop.name}`;
      const details = document.createElement('p');
      details.textContent = `${STOP_LABEL[stop.type] ?? stop.type} • ${stop.country} • dự kiến ${stop.plannedAt || 'Chưa cập nhật'}`;
      popup.append(title, details);
      if (latest) {
        const status = document.createElement('p');
        status.textContent = 'Mốc xác nhận gần nhất';
        popup.append(status);
      }
      marker.bindPopup(popup);
    });

    const boundsKey = JSON.stringify(located.map(point => [point.stop.id, ...point.position]));
    if (boundsKey !== lastBounds.current) {
      if (located.length) map.fitBounds(L.latLngBounds(located.map(point => point.position)), { padding: [35, 35], maxZoom: 13 });
      else map.setView([13, 106], 5);
      lastBounds.current = boundsKey;
    }
  }, [stops, current]);

  return <div className="crd-geo-map">
    <div ref={container} className="crd-geo-map__canvas" style={{ height: Math.max(260, height) }}
      role="region" aria-label={`Bản đồ tuyến gồm ${stops.length} điểm dừng`} />
    {!stops.length && <p className="crd-geo-map__notice">Chưa có điểm dừng nào trên tuyến.</p>}
    {missing.length > 0 && <p className="crd-geo-map__notice" role="status">Chưa có tọa độ hợp lệ cho {missing.length} điểm: {missing.map(stop => stop.name).join(', ')}.</p>}
    {tileError && <p className="crd-geo-map__notice" role="status">Chưa tải được nền bản đồ. Kiểm tra kết nối Internet hoặc tải lại trang.</p>}
    <div className="crd-geo-map__legend">
      {[...new Set(stops.map(stop => stop.type))].map(type => <span key={type}><i style={{ background: STOP_COLOR[type] ?? '#64748b' }} />{STOP_LABEL[type] ?? type}</span>)}
      <span><i style={{ background: '#f57c00' }} />Mốc xác nhận gần nhất</span>
    </div>
    <p className="crd-geo-map__caption">Đường nối các điểm dừng theo thứ tự, chưa tính tuyến theo đường bộ. Vị trí dựa trên mốc xác nhận, không có GPS trực tiếp.</p>
  </div>;
}

export default RouteMap;
