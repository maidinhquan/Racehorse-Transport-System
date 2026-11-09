import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trip } from '../../../types';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import { RouteMap } from '../../../components/RouteMap/RouteMap';
import { STOP_COLOR, STOP_LABEL, clearanceFor, fmtDateTime, lastMilestone, stopState } from '../../../hooks/driverRules';

/** Danh sách điểm dừng theo thứ tự; chuyến đã hoàn tất có thêm bản đồ để xem lại hành trình đã đi */
export const StopsTab: React.FC<{ trip: Trip }> = ({ trip }) => {
  const navigate = useNavigate();
  return (
    <div className="drv-card">
      {trip.status !== 'COMPLETED' && (
        <p className="drv-hint" style={{ marginTop: 0, marginBottom: 6 }}>
          Bản đồ tuyến nằm ở mục Hành trình. <button type="button" className="drv-link" onClick={() => navigate(`/driver/journey/${trip.id}`)}>Mở Hành trình</button>
        </p>
      )}
      {trip.status === 'COMPLETED' && trip.stops.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <RouteMap stops={trip.stops} mode={trip.mode} current={lastMilestone(trip)?.stopIndex ?? trip.stops.length - 1} height={380} />
        </div>
      )}
      {trip.stops.length ? (
        <ul className="drv-stops">
          {trip.stops.map((s, i) => {
            const st = stopState(trip, i);
            const cl = clearanceFor(trip, i);
            return (
              <li key={s.id} className={st}>
                <span className="drv-stops__badge" style={{ background: STOP_COLOR[s.type] }}>{i + 1}</span>
                <div className="drv-stops__text"><b>{s.name}</b><span>{STOP_LABEL[s.type]} • {s.country} • dự kiến {fmtDateTime(s.plannedAt)}</span></div>
                <div className="drv-stops__tags">
                  {st === 'now' && <TripStatusBadge tone="brand" label="Bạn đang ở đây" />}
                  {st === 'done' && <TripStatusBadge tone="ok" label="Đã qua" />}
                  {cl && <TripStatusBadge status={cl.result} />}
                </div>
              </li>
            );
          })}
        </ul>
      ) : <div className="drv-empty"><b>Chưa có tuyến</b>Điều phối viên chưa thêm điểm dừng.</div>}
    </div>
  );
};

export default StopsTab;
