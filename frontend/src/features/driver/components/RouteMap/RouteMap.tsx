import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RouteMap.css';
import type { RouteStop } from '../../types';
import { STOP_COLOR, STOP_LABEL } from '../../hooks/driverRules';

type GeoPoint = { lat: number; lng: number };

interface RouteMapProps {
  stops: RouteStop[];
  current?: number;
  height?: number;
  onPick?: (point: GeoPoint) => void;
  /** Ẩn chú giải và ghi chú dưới bản đồ */
  compact?: boolean;
}

function hasCoordinates(stop: RouteStop) {
  return typeof stop.lat === 'number' && Number.isFinite(stop.lat)
    && stop.lat >= -90 && stop.lat <= 90
    && typeof stop.lng === 'number' && Number.isFinite(stop.lng)
    && stop.lng >= -180 && stop.lng <= 180;
}

/** Khởi tạo bản đồ Leaflet vào một container div */
function initMap(
  el: HTMLDivElement,
  stops: RouteStop[],
  current: number,
  onPick?: (point: GeoPoint) => void,
): () => void {
  if ((el as unknown as { _leaflet_id?: number })._leaflet_id) {
    delete (el as unknown as { _leaflet_id?: number })._leaflet_id;
  }
  const map = L.map(el, { scrollWheelZoom: true }).setView([13, 106], 5);
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  });
  tiles.addTo(map);
  const layers = L.layerGroup().addTo(map);

  const located = stops.flatMap((stop, index) =>
    hasCoordinates(stop) ? [{ stop, index, position: [stop.lat!, stop.lng!] as L.LatLngTuple }] : []);
  const lastConfirmed = Number.isInteger(current) && current >= 0 && current < stops.length ? current : -1;

  for (let i = 1; i < located.length; i++) {
    const prev = located[i - 1], next = located[i];
    if (next.index !== prev.index + 1) continue;
    const confirmed = next.index <= lastConfirmed;
    L.polyline([prev.position, next.position], {
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

  if (located.length) {
    map.fitBounds(L.latLngBounds(located.map(p => p.position)), { padding: [35, 35], maxZoom: 13 });
  } else {
    map.setView([13, 106], 5);
  }

  if (onPick) {
    map.on('click', (e: L.LeafletMouseEvent) => {
      const pt = e.latlng.wrap();
      onPick({ lat: pt.lat, lng: pt.lng });
    });
  }

  const resize = new ResizeObserver(() => map.invalidateSize({ pan: false }));
  resize.observe(el);

  return () => {
    resize.disconnect();
    tiles.off();
    map.remove();
  };
}

// ── Fullscreen overlay ──────────────────────────────────────────────────────
interface FullscreenMapProps {
  stops: RouteStop[];
  current: number;
  onClose: () => void;
  onPick?: (point: GeoPoint) => void;
  compact?: boolean;
}

function FullscreenMap({ stops, current, onClose, onPick, compact }: FullscreenMapProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const destroy = initMap(canvasRef.current, stops, current, onPick);
    return destroy;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ESC để thoát
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const usedTypes = [...new Set(stops.map(s => s.type))];

  return createPortal(
    <div className="drv-geo-map-overlay" role="dialog" aria-modal="true" aria-label="Bản đồ toàn màn hình">
      <div className="drv-geo-map-overlay__canvas">
        <div ref={canvasRef} style={{ width: '100%', height: '100%' }} />
        <button className="drv-geo-map-overlay__close" onClick={onClose} type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Đóng <kbd>Esc</kbd>
        </button>
      </div>
      {!compact && (
        <div className="drv-geo-map-overlay__footer">
          {usedTypes.map(type => (
            <span key={type}><i style={{ background: STOP_COLOR[type] ?? '#64748b' }} />{STOP_LABEL[type] ?? type}</span>
          ))}
          <span><i style={{ background: '#f57c00' }} />Mốc xác nhận gần nhất</span>
        </div>
      )}
    </div>,
    document.body,
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function RouteMap({ stops, current = -1, height = 380, onPick, compact }: RouteMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const lastBounds = useRef('');
  const [tileError, setTileError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const missing = stops.filter(stop => !hasCoordinates(stop));

  const openFullscreen = useCallback(() => setFullscreen(true), []);
  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  useEffect(() => {
    if (!container.current) return;
    if ((container.current as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (container.current as unknown as { _leaflet_id?: number })._leaflet_id;
    }
    const map = L.map(container.current, { scrollWheelZoom: true }).setView([13, 106], 5);
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

  return (
    <div className="drv-geo-map">
      <div ref={container} className="drv-geo-map__canvas" style={{ height: Math.max(260, height) }}
        role="region" aria-label={`Bản đồ tuyến gồm ${stops.length} điểm dừng`} />

      {/* Toolbar: nút fullscreen luôn hiển thị kể cả compact */}
      <div className="drv-geo-map__toolbar">
        <button className="drv-geo-map__fullscreen-btn" onClick={openFullscreen} type="button" title="Phóng to toàn màn hình">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          Toàn màn hình
        </button>
      </div>

      {!stops.length && <p className="drv-geo-map__notice">Chưa có điểm dừng nào trên tuyến.</p>}
      {missing.length > 0 && <p className="drv-geo-map__notice" role="status">Chưa có tọa độ hợp lệ cho {missing.length} điểm: {missing.map(stop => stop.name).join(', ')}.</p>}
      {tileError && <p className="drv-geo-map__notice" role="status">Chưa tải được nền bản đồ. Kiểm tra kết nối Internet hoặc tải lại trang.</p>}
      {!compact && <div className="drv-geo-map__legend">
        {[...new Set(stops.map(stop => stop.type))].map(type => <span key={type}><i style={{ background: STOP_COLOR[type] ?? '#64748b' }} />{STOP_LABEL[type] ?? type}</span>)}
        <span><i style={{ background: '#f57c00' }} />Mốc xác nhận gần nhất</span>
      </div>}
      {!compact && <p className="drv-geo-map__caption">Đường nối các điểm dừng theo thứ tự, chưa tính tuyến theo đường bộ. Vị trí dựa trên mốc xác nhận, không có GPS trực tiếp.</p>}

      {fullscreen && (
        <FullscreenMap
          stops={stops}
          current={current}
          onClose={closeFullscreen}
          onPick={onPick}
          compact={compact}
        />
      )}
    </div>
  );
}

export default RouteMap;
