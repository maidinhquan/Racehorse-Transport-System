import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trip } from '../../../types';
import { useCoordinator } from '../../../hooks/useCoordinator';
import { SLOTS, SLOT_LABEL, crewList, fmtDateTime, modeLabel, planGaps } from '../../../hooks/coordinatorRules';

export const OverviewTab: React.FC<{ trip: Trip }> = ({ trip }) => {
  const navigate = useNavigate();
  const { trips, vehicles, staff, actions } = useCoordinator();
  const gaps = planGaps(trip, vehicles, staff, trips);
  const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
  const name = (id?: string) => staff.find((s) => s.id === id)?.name ?? '—';

  return (
    <div className="crd-grid2">
      <div className="crd-card">
        <h3 className="crd-card__title">Thông tin chuyến</h3>
        <div className="crd-kv">
          <div><span>Chuyến</span><b>{trip.id}</b></div>
          <div><span>Yêu cầu</span><b>{trip.requestId}</b></div>
          <div><span>Khách hàng</span><b>{trip.customer}</b></div>
          <div><span>Phương thức</span><b>{modeLabel(trip.mode)}</b></div>
          <div><span>Nơi đi</span><b>{trip.origin}</b></div>
          <div><span>Nơi đến</span><b>{trip.destination}</b></div>
          <div><span>Khởi hành dự kiến</span><b>{fmtDateTime(trip.plannedDepart)}</b></div>
          <div><span>ETA</span><b>{fmtDateTime(trip.eta)}</b></div>
          <div><span>Ngựa</span><b>{trip.horses.join(', ')}</b></div>
          <div><span>Xe</span><b>{trip.mode === 'AIR' ? '2 chặng xe + chuyến bay' : vehicle ? `${vehicle.plate} • ${vehicle.stalls} ngăn` : '—'}</b></div>
        </div>
        {trip.mode === 'ROAD' && crewList(trip.crew).length > 0 && (
          <>
            <h3 className="crd-card__title" style={{ marginTop: 18 }}>Tổ xe</h3>
            <div className="crd-kv">{SLOTS.map((k) => <div key={k}><span>{SLOT_LABEL[k]}</span><b>{name(trip.crew[k])}</b></div>)}</div>
          </>
        )}
      </div>

      <div className="crd-card">
        <h3 className="crd-card__title">Việc cần làm để sẵn sàng khởi hành</h3>
        {trip.status !== 'PLANNING' ? (
          <div className="crd-note crd-note--green"><div><b>Đã qua bước lập kế hoạch</b>Theo dõi chuyến ở tab “Theo dõi hành trình”.</div></div>
        ) : gaps.length ? (
          <ul className="crd-gap-list">{gaps.map((g) => <li key={g}>{g}</li>)}</ul>
        ) : (
          <div className="crd-note crd-note--green"><div><b>Đã đủ điều kiện</b>Tuyến đã duyệt, xe & nhân sự đã xác nhận. Manager có thể duyệt khởi hành.</div></div>
        )}
        <div className="crd-btn-row">
          <button type="button" className="crd-btn crd-btn--sm" onClick={() => navigate(`/coordinator/trips/${trip.id}/route`)}>Tuyến đường</button>
          <button type="button" className="crd-btn crd-btn--sm" onClick={() => navigate(`/coordinator/trips/${trip.id}/resources`)}>Xe & nhân sự</button>
        </div>
        {trip.status === 'PLANNING' && trip.deploymentStatus === 'CONFIRMED' && (
          <div className="crd-demo">
            <div className="crd-demo__title">Điều khiển demo</div>
            <p>Giả lập Manager duyệt khởi hành khi mọi điều kiện đã đủ.</p>
            <button type="button" className="crd-btn crd-btn--sm" disabled={gaps.length > 0} onClick={() => actions.demoApproveDeparture(trip.id)}>Demo: Manager duyệt khởi hành</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverviewTab;
