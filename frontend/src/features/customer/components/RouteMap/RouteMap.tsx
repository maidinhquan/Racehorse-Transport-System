import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './RouteMap.css';
import type { TripStop } from '../../types';
import { LocationMap, validPoint } from './LocationMap';
import { STOP_COLOR, STOP_LABEL } from '../../hooks/customerRules';

interface RouteMapProps {
  stops: TripStop[];
  /** Chỉ số điểm dừng có mốc xác nhận gần nhất (-1 = chưa xuất phát) */
  current?: number;
  height?: number;
}

function RouteLeafletMap({ stops, current, height }: { stops: TripStop[]; current: number; height: number }) {
  const points = stops.map((stop, index) => ({
    latitude: stop.lat ?? stop.latitude, longitude: stop.lng ?? stop.longitude,
    label: `${index + 1}. ${stop.name}${index === current ? ' • Mốc xác nhận gần nhất' : ''}`,
    color: STOP_COLOR[stop.type],
  }));
  const missing = points.filter(point => !validPoint(point)).length;
  return <>
    <LocationMap points={points} current={current} height={height} route />
    {missing > 0 && <p className="cus-map__notice">{missing} điểm dừng chưa có tọa độ để hiển thị.</p>}
    <p className="cus-map__notice">Đường nối thể hiện thứ tự điểm dừng, vị trí theo mốc được xác nhận.</p>
  </>;
}

// ── Fullscreen overlay ──────────────────────────────────────────────────────
function FullscreenMap({ stops, current, onClose }: { stops: TripStop[]; current: number; onClose: () => void }) {
  const usedTypes = [...new Set(stops.map((s) => s.type))];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div className="cus-map-overlay" role="dialog" aria-modal="true" aria-label="Bản đồ toàn màn hình">
      <button className="cus-map-overlay__close" onClick={onClose} type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        Đóng <kbd>Esc</kbd>
      </button>
      <div className="cus-map-overlay__inner">
        <RouteLeafletMap stops={stops} current={current} height={500} />
      </div>
      <div className="cus-map-overlay__footer">
        {usedTypes.map((t) => (
          <span key={t}><i style={{ background: STOP_COLOR[t] }} />{STOP_LABEL[t]}</span>
        ))}
        <span><i style={{ background: '#f57c00' }} />Mốc xác nhận gần nhất</span>
      </div>
    </div>,
    document.body,
  );
}

// ── Main component ─────────────────────────────────────────────────────────
/** Bản đồ tuyến Leaflet (không có GPS trực tiếp – vị trí theo mốc tổ xe xác nhận) */
export const RouteMap: React.FC<RouteMapProps> = ({ stops, current = -1, height = 240 }) => {
  const [fullscreen, setFullscreen] = useState(false);
  const openFullscreen = useCallback(() => setFullscreen(true), []);
  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  if (!stops.length) return <div className="cus-map cus-map--empty">Tuyến sẽ hiển thị khi CBN Transport duyệt lộ trình.</div>;

  const usedTypes = [...new Set(stops.map((s) => s.type))];

  return (
    <div className="cus-map">
      <div className="cus-map__map-wrap">
        <RouteLeafletMap stops={stops} current={current} height={height} />
      </div>

      {/* Toolbar: nút fullscreen luôn hiển thị */}
      <div className="cus-map__toolbar">
        <button className="cus-map__fullscreen-btn" onClick={openFullscreen} type="button" title="Phóng to toàn màn hình">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          Toàn màn hình
        </button>
      </div>

      <div className="cus-map__legend">
        {usedTypes.map((t) => <span key={t}><i style={{ background: STOP_COLOR[t] }} />{STOP_LABEL[t]}</span>)}
        <span><i style={{ background: '#f57c00' }} />Mốc xác nhận gần nhất</span>
      </div>

      {fullscreen && (
        <FullscreenMap stops={stops} current={current} onClose={closeFullscreen} />
      )}
    </div>
  );
};

export default RouteMap;
