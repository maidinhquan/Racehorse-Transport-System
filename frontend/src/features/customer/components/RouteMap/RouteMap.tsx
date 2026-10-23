import React from 'react';
import './RouteMap.css';
import type { TripStop } from '../../types';
import { STOP_COLOR, STOP_LABEL } from '../../hooks/customerRules';

interface RouteMapProps {
  stops: TripStop[];
  /** Chỉ số điểm dừng có mốc xác nhận gần nhất (-1 = chưa xuất phát) */
  current?: number;
  height?: number;
}

/** Sơ đồ tuyến dạng SVG (không có GPS trực tiếp – vị trí theo mốc tổ xe xác nhận) */
export const RouteMap: React.FC<RouteMapProps> = ({ stops, current = -1, height = 240 }) => {
  if (!stops.length) return <div className="cus-map cus-map--empty">Tuyến sẽ hiển thị khi CBN Transport duyệt lộ trình.</div>;
  const W = 720, H = height, n = stops.length;
  const pts = stops.map((_, i) => [
    70 + (n === 1 ? (W - 140) / 2 : (i * (W - 140)) / (n - 1)),
    H / 2 + Math.round(Math.sin(i * 1.25 + 0.6) * (H / 4.2)),
  ]);
  const line = pts.map((p) => p.join(',')).join(' ');
  const done = current >= 0 ? pts.slice(0, current + 1).map((p) => p.join(',')).join(' ') : '';
  const usedTypes = [...new Set(stops.map((s) => s.type))];

  return (
    <div className="cus-map">
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
      <div className="cus-map__legend">
        {usedTypes.map((t) => <span key={t}><i style={{ background: STOP_COLOR[t] }} />{STOP_LABEL[t]}</span>)}
        <span><i style={{ background: '#f57c00' }} />Mốc xác nhận gần nhất</span>
      </div>
    </div>
  );
};

export default RouteMap;
