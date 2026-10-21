import React from 'react';
import './RouteMap.css';
import type { RouteStop } from '../../types';
import { STOP_COLOR, STOP_LABEL } from '../../hooks/coordinatorRules';

interface RouteMapProps {
  stops: RouteStop[];
  /** Chỉ số điểm dừng có mốc gần nhất (-1 = chưa xuất phát) */
  current?: number;
  height?: number;
}

/** Sơ đồ tuyến dạng SVG (không có GPS thật – vị trí theo mốc tài xế xác nhận) */
export const RouteMap: React.FC<RouteMapProps> = ({ stops, current = -1, height = 260 }) => {
  if (!stops.length) {
    return <div className="crd-map crd-map--empty">Chưa có điểm dừng nào trên tuyến.</div>;
  }
  const W = 720, H = height, n = stops.length;
  const pts = stops.map((_, i) => [
    70 + (n === 1 ? (W - 140) / 2 : (i * (W - 140)) / (n - 1)),
    H / 2 + Math.round(Math.sin(i * 1.25 + 0.6) * (H / 4.2)),
  ]);
  const line = pts.map((p) => p.join(',')).join(' ');
  const done = current >= 0 ? pts.slice(0, current + 1).map((p) => p.join(',')).join(' ') : '';
  const usedTypes = [...new Set(stops.map((s) => s.type))];

  return (
    <div className="crd-map">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Tuyến gồm ${n} điểm dừng`}>
        <polyline points={line} fill="none" stroke="#94a3b8" strokeWidth={3} strokeDasharray="6 6" />
        {done && <polyline points={done} fill="none" stroke="#f57c00" strokeWidth={4} />}
        {pts.map(([x, y], i) => (
          <g key={stops[i].id}>
            <circle cx={x} cy={y} r={i === current ? 10 : 7} fill={i === current ? '#f57c00' : (STOP_COLOR[stops[i].type] ?? '#64748b')} stroke="#fff" strokeWidth={2.5} />
            <text x={x} y={y + (i % 2 ? 26 : -16)} textAnchor="middle" className="crd-map__label">
              {i + 1}. {stops[i].name.length > 24 ? stops[i].name.slice(0, 23) + '…' : stops[i].name}
            </text>
          </g>
        ))}
      </svg>
      <div className="crd-map__legend">
        {usedTypes.map((t) => (
          <span key={t}><i style={{ background: STOP_COLOR[t] ?? '#64748b' }} />{STOP_LABEL[t] ?? t}</span>
        ))}
        <span><i style={{ background: '#f57c00' }} />Mốc xác nhận gần nhất</span>
      </div>
    </div>
  );
};

export default RouteMap;
