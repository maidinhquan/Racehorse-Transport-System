import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RouteMap.css';
import type { RouteStop } from '../../types';
import { STOP_LABEL } from '../../hooks/driverRules';
import { addGeoapifyTiles } from '../../../../shared/maps/GeoapifyTiles';
import { drawIncidentPins } from '../../../../shared/maps/incidentPinLayer';
import type { IncidentPin } from '../../../../shared/utils/sharedIncidentPins';

type GeoPoint = { lat: number; lng: number };

interface RouteMapProps {
  stops: RouteStop[];
  current?: number;
  height?: number;
  onPick?: (point: GeoPoint) => void;
  /** Ẩn chú giải và ghi chú dưới bản đồ */
  compact?: boolean;
  /** Ghim sự cố (vị trí do tài xế chọn) */
  pins?: IncidentPin[];
  /** Cho phép kéo trực tiếp ghim sự cố trên bản đồ */
  draggablePin?: boolean;
}

function hasCoordinates(stop: RouteStop) {
  return typeof stop.lat === 'number' && Number.isFinite(stop.lat)
    && stop.lat >= -90 && stop.lat <= 90
    && typeof stop.lng === 'number' && Number.isFinite(stop.lng)
    && stop.lng >= -180 && stop.lng <= 180;
}

// ── Main component ─────────────────────────────────────────────────────────
/** Bản đồ lộ trình cho Tài xế: đồng bộ bố cục và giao diện như trang Khách hàng */
export const RouteMap: React.FC<RouteMapProps> = ({
  stops,
  current = -1,
  height = 280,
  onPick,
  compact,
  pins,
  draggablePin,
}) => {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const lastBounds = useRef('');
  const [tileError, setTileError] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const missing = stops.filter((stop) => !hasCoordinates(stop));
  const pinsKey = JSON.stringify(pins ?? []);

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
    if ((container.current as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (container.current as unknown as { _leaflet_id?: number })._leaflet_id;
    }
    const map = L.map(container.current, { scrollWheelZoom: true }).setView([13, 106], 5);
    mapRef.current = map;
    const cancelTiles = addGeoapifyTiles(map, () => setTileError(true));
    layersRef.current = L.layerGroup().addTo(map);
    const resize = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      cancelTiles();
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
    return () => {
      map.off('click', handleClick);
    };
  }, [onPick]);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;
    layers.clearLayers();
    const located = stops.flatMap((stop, index) =>
      hasCoordinates(stop)
        ? [{ stop, index, position: [stop.lat!, stop.lng!] as L.LatLngTuple }]
        : []
    );
    const lastConfirmed =
      Number.isInteger(current) && current >= 0 && current < stops.length ? current : -1;

    for (let i = 1; i < located.length; i++) {
      const previous = located[i - 1], next = located[i];
      if (next.index !== previous.index + 1) continue;
      const confirmed = next.index <= lastConfirmed;
      L.polyline([previous.position, next.position], {
        color: confirmed ? '#f57c00' : '#2563eb',
        weight: 5,
        dashArray: confirmed ? undefined : '7 8',
        interactive: false,
      }).addTo(layers);
    }

    located.forEach(({ stop, index, position }) => {
      const latest = index === lastConfirmed;
      const isEnd = index === 0 || index === stops.length - 1;
      const isReq =
        stop.type === 'CHECKPOINT' ||
        stop.type === 'AIRPORT' ||
        Boolean((stop as unknown as { required?: boolean }).required);
      const pinClass = `rp-pin ${isEnd ? 'end' : isReq ? 'req' : 'sel'} ${latest ? 'cur' : ''}`;
      const html = `<div class="${pinClass}">${index + 1}</div>`;
      const marker = L.marker(position, {
        icon: L.divIcon({ html, className: '', iconSize: [26, 26], iconAnchor: [13, 13] }),
        zIndexOffset: latest ? 1200 : 1000,
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

    drawIncidentPins(layers, JSON.parse(pinsKey) as IncidentPin[], {
      draggable: draggablePin,
      onDrag: onPick,
    });

    const boundsKey = JSON.stringify(located.map((point) => [point.stop.id, ...point.position]));
    if (boundsKey !== lastBounds.current) {
      if (located.length) {
        map.fitBounds(L.latLngBounds(located.map((point) => point.position)), {
          padding: [35, 35],
          maxZoom: 13,
        });
      } else {
        map.setView([13, 106], 5);
      }
      lastBounds.current = boundsKey;
    }
  }, [stops, current, pinsKey, draggablePin, onPick]);

  return (
    <div className={`drv-geo-map ${isMaximized ? 'is-maximized' : ''}`}>
      <div className="drv-geo-map__canvas-wrap">
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

        <div
          ref={container}
          className="drv-geo-map__canvas"
          style={{ height: isMaximized ? '100%' : Math.max(260, height) }}
          role="region"
          aria-label={`Bản đồ tuyến gồm ${stops.length} điểm dừng`}
        />
      </div>

      {!stops.length && <p className="drv-geo-map__notice">Chưa có điểm dừng nào trên tuyến.</p>}
      {missing.length > 0 && (
        <p className="drv-geo-map__notice" role="status">
          {missing.length} điểm dừng chưa có tọa độ để hiển thị.
        </p>
      )}
      {tileError && (
        <p className="drv-geo-map__notice" role="status">
          Chưa tải được nền bản đồ Geoapify. Vui lòng thử lại sau.
        </p>
      )}
      <p className="drv-geo-map__notice">Đường nối thể hiện thứ tự điểm dừng, vị trí theo mốc được xác nhận.</p>

      {!compact && (
        <div className="drv-geo-map__legend">
          <span><i style={{ background: '#0f172a' }} />Điểm nhận</span>
          <span><i style={{ background: '#2563eb' }} />Sân bay</span>
          <span><i style={{ background: '#16a34a' }} />Điểm giao</span>
          <span><i style={{ background: '#f57c00' }} />Mốc xác nhận gần nhất</span>
          {pins && pins.length > 0 && <span><i style={{ background: '#dc2626' }} />Vị trí sự cố</span>}
        </div>
      )}
    </div>
  );
};

export default RouteMap;
