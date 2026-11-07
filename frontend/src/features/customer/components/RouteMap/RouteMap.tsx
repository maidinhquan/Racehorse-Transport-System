import React from 'react';
import './RouteMap.css';
import type { TripStop } from '../../types';
import { LocationMap, validPoint } from './LocationMap';
import { STOP_COLOR, STOP_LABEL } from '../../hooks/customerRules';
import { useIncidentPins } from '../../../../shared/utils/sharedIncidentPins';

interface RouteMapProps {
  stops: TripStop[];
  /** Chỉ số điểm dừng có mốc xác nhận gần nhất (-1 = chưa xuất phát) */
  current?: number;
  height?: number;
  /** Mã chuyến để hiển thị vị trí sự cố do tài xế báo */
  tripId?: string;
}

function RouteLeafletMap({ stops, current, height, tripId }: { stops: TripStop[]; current: number; height: number; tripId?: string }) {
  const incidentPins = useIncidentPins(tripId);
  const points = stops.map((stop, index) => ({
    latitude: stop.lat ?? stop.latitude, longitude: stop.lng ?? stop.longitude,
    label: `${index + 1}. ${stop.name}${index === current ? ' • Mốc xác nhận gần nhất' : ''}`,
    color: STOP_COLOR[stop.type],
  }));
  const missing = points.filter(point => !validPoint(point)).length;
  return <>
    <LocationMap points={points} current={current} height={height} route incidentPins={incidentPins} />
    {missing > 0 && <p className="cus-map__notice">{missing} điểm dừng chưa có tọa độ để hiển thị.</p>}
    {incidentPins.length > 0 && <p className="cus-map__notice" role="status">Xe đang gặp sự cố tại vị trí được đánh dấu đỏ trên bản đồ (tài xế chọn, không phải GPS).</p>}
    <p className="cus-map__notice">Đường nối thể hiện thứ tự điểm dừng, vị trí theo mốc được xác nhận.</p>
  </>;
}

// ── Main component ─────────────────────────────────────────────────────────
/** Bản đồ tuyến Leaflet (không có GPS trực tiếp – vị trí theo mốc tổ xe xác nhận) */
export const RouteMap: React.FC<RouteMapProps> = ({ stops, current = -1, height = 240, tripId }) => {

  if (!stops.length) return <div className="cus-map cus-map--empty">Tuyến sẽ hiển thị khi CBN Transport duyệt lộ trình.</div>;

  const usedTypes = [...new Set(stops.map((s) => s.type))];

  return (
    <div className="cus-map">
      <div className="cus-map__map-wrap">
        <RouteLeafletMap stops={stops} current={current} height={height} tripId={tripId} />
      </div>

      <div className="cus-map__legend">
        {usedTypes.map((t) => <span key={t}><i style={{ background: STOP_COLOR[t] }} />{STOP_LABEL[t]}</span>)}
        <span><i style={{ background: '#f57c00' }} />Mốc xác nhận gần nhất</span>
      </div>
    </div>
  );
};

export default RouteMap;
