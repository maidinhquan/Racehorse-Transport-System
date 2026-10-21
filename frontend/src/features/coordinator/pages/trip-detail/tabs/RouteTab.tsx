import React, { useState } from 'react';
import type { Trip } from '../../../types';
import { useCoordinator } from '../../../hooks/useCoordinator';
import { STOP_COLOR, STOP_LABEL, countryName, fmtDateTime, routeEditable } from '../../../hooks/coordinatorRules';
import { RouteMap } from '../../../components/RouteMap/RouteMap';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import { AddStopModal } from '../../../components/Modals';

export const RouteTab: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { actions } = useCoordinator();
  const [adding, setAdding] = useState(false);
  const r = trip.route, editable = routeEditable(trip), stops = r.stops;

  return (
    <>
      <div className="crd-card">
        <h3 className="crd-card__title">
          <span>Tuyến {r.version ? `phiên bản ${r.version}` : '(chưa lập)'}</span>
          <TripStatusBadge status={r.status} />
        </h3>
        <RouteMap stops={stops} />
        {r.status === 'RETURNED' && r.returnReason && (
          <div className="crd-note crd-note--red"><div><b>Manager trả về tuyến</b>{r.returnReason}</div></div>
        )}
        {r.status === 'PENDING_APPROVAL' && (
          <div className="crd-note crd-note--blue"><div><b>Đang chờ Manager duyệt</b>Gửi lúc {fmtDateTime(r.submittedAt)}. Tuyến bị khóa cho đến khi có kết quả.</div></div>
        )}
      </div>

      <div className="crd-card">
        <h3 className="crd-card__title">
          <span>Các điểm dừng ({stops.length})</span>
          {editable && <button type="button" className="crd-btn crd-btn--sm" onClick={() => setAdding(true)}>+ Thêm điểm dừng</button>}
        </h3>
        {stops.length ? stops.map((s, i) => (
          <div key={s.id} className="crd-stop-row">
            <span className="crd-stop-row__no" style={{ background: STOP_COLOR[s.type] }}>{i + 1}</span>
            <div className="crd-stop-row__body">
              <b>{s.name}</b>
              <span className="crd-muted">{STOP_LABEL[s.type]} • {countryName(s.country)} • dự kiến {fmtDateTime(s.plannedAt)}</span>
            </div>
            {editable && s.type !== 'ORIGIN' && s.type !== 'DESTINATION' && (
              <div className="crd-stop-row__actions">
                <button type="button" className="crd-btn crd-btn--sm" aria-label="Lên" onClick={() => actions.moveStop(trip.id, s.id, -1)}>↑</button>
                <button type="button" className="crd-btn crd-btn--sm" aria-label="Xuống" onClick={() => actions.moveStop(trip.id, s.id, 1)}>↓</button>
                <button type="button" className="crd-btn crd-btn--sm crd-btn--danger" onClick={() => actions.removeStop(trip.id, s.id)}>Xoá</button>
              </div>
            )}
          </div>
        )) : <p className="crd-muted">Chưa có điểm dừng. Thêm điểm đi, các điểm nghỉ/cửa khẩu và điểm đến.</p>}

        {editable && (
          <div className="crd-btn-row">
            <button type="button" className="crd-btn crd-btn--solid" onClick={() => actions.submitRoute(trip.id)}>Gửi Manager phê duyệt</button>
          </div>
        )}
        {!editable && trip.deploymentStatus === 'CONFIRMED' && trip.status === 'PLANNING' && r.status === 'APPROVED' && (
          <p className="crd-muted" style={{ marginTop: 12 }}>Tuyến đã được duyệt và bị khóa.</p>
        )}

        {r.status === 'PENDING_APPROVAL' && (
          <div className="crd-demo">
            <div className="crd-demo__title">Điều khiển demo</div>
            <p>Giả lập quyết định của Logistics Manager.</p>
            <div className="crd-btn-row" style={{ marginTop: 0 }}>
              <button type="button" className="crd-btn crd-btn--sm" onClick={() => actions.demoApproveRoute(trip.id)}>Demo: Manager duyệt tuyến</button>
              <button type="button" className="crd-btn crd-btn--sm" onClick={() => actions.demoReturnRoute(trip.id)}>Demo: Manager trả về</button>
            </div>
          </div>
        )}
      </div>

      <AddStopModal
        open={adding}
        defaultCountry={trip.originCountry}
        defaultTime={stops[stops.length - 1]?.plannedAt ?? trip.plannedDepart}
        hasOrigin={stops.some((s) => s.type === 'ORIGIN')}
        hasDestination={stops.some((s) => s.type === 'DESTINATION')}
        onClose={() => setAdding(false)}
        onSubmit={(stop) => actions.addStop(trip.id, stop).ok}
      />
    </>
  );
};

export default RouteTab;
