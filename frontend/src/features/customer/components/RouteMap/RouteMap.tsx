import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './RouteMap.css';
import type { TripStop } from '../../types';
import { STOP_COLOR, STOP_LABEL } from '../../hooks/customerRules';

interface RouteMapProps {
  stops: TripStop[];
  /** Chỉ số điểm dừng có mốc xác nhận gần nhất (-1 = chưa xuất phát) */
  current?: number;
  height?: number;
}

/** Render phần SVG tuyến (dùng lại cho cả normal + fullscreen) */
function RouteMapSVG({ stops, current, height }: { stops: TripStop[]; current: number; height: number }) {
  const W = 720, H = height, n = stops.length;
  const pts = stops.map((_, i) => [
    70 + (n === 1 ? (W - 140) / 2 : (i * (W - 140)) / (n - 1)),
    H / 2 + Math.round(Math.sin(i * 1.25 + 0.6) * (H / 4.2)),
  ]);
  const line = pts.map((p) => p.join(',')).join(' ');
  const done = current >= 0 ? pts.slice(0, current + 1).map((p) => p.join(',')).join(' ') : '';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Tuyến gồm ${n} điểm`}>
      <polyline points={line} fill="none" stroke="#94a3b8" strokeWidth={3} strokeDasharray="6 6" />
      {done && <polyline points={done} fill="none" stroke="#f57c00" strokeWidth={4} />}
      {pts.map(([x, y], i) => (
        <g key={`${stops[i].name}-${i}`}>
          <circle cx={x} cy={y} r={i === current ? 10 : 7} fill={i === current ? '#f57c00' : STOP_COLOR[stops[i].type]} stroke="#fff" strokeWidth={2.5} />
          <text x={x} y={y + (i % 2 ? 26 : -16)} textAnchor="middle" className="cus-map__label">
            {i + 1}. {stops[i].name.length > 24 ? `${stops[i].name.slice(0, 23)}…` : stops[i].name}
          </text>
        </g>
      ))}
    </svg>
  );
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
        <RouteMapSVG stops={stops} current={current} height={500} />
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
/** Sơ đồ tuyến dạng SVG (không có GPS trực tiếp – vị trí theo mốc tổ xe xác nhận) */
export const RouteMap: React.FC<RouteMapProps> = ({ stops, current = -1, height = 240 }) => {
  const [fullscreen, setFullscreen] = useState(false);
  const openFullscreen = useCallback(() => setFullscreen(true), []);
  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  if (!stops.length) return <div className="cus-map cus-map--empty">Tuyến sẽ hiển thị khi CBN Transport duyệt lộ trình.</div>;

  const usedTypes = [...new Set(stops.map((s) => s.type))];

  return (
    <div className="cus-map">
      <div className="cus-map__svg-wrap">
        <RouteMapSVG stops={stops} current={current} height={height} />
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
