import { TimedDocumentsCard } from '../../../../shared/components/TimedDocumentsCard/TimedDocumentsCard';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CoordinatorLayout, Icon } from '../../components/CoordinatorLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { useCoordinator } from '../../hooks/useCoordinator';
import { fmtDateTime, modeLabel, planGaps } from '../../hooks/coordinatorRules';
import type { TripDetailTab } from '../../types';
import { OverviewTab } from './tabs/OverviewTab';
import { RouteTab } from './tabs/RouteTab';
import { ResourcesTab } from './tabs/ResourcesTab';
import { FlightTab } from './tabs/FlightTab';
import { TrackingTab } from './tabs/TrackingTab';
import './TripDetailPage.css';

export const TripDetailPage: React.FC = () => {
  const { tripId, tab } = useParams<{ tripId: string; tab?: TripDetailTab }>();
  const navigate = useNavigate();
  const { getTrip, trips, vehicles, staff, actions } = useCoordinator();
  const trip = getTrip(tripId);

  if (!trip) {
    return (
      <CoordinatorLayout title="Quản lý chuyến">
        <div className="crd-card crd-empty">Không tìm thấy chuyến {tripId}.
          <div className="crd-btn-row" style={{ justifyContent: 'center' }}>
            <button type="button" className="crd-btn" onClick={() => navigate('/coordinator/trips')}>Về danh sách chuyến</button>
          </div>
        </div>
      </CoordinatorLayout>
    );
  }

  const tabs: Array<[TripDetailTab, string]> = [
    ['overview', 'Tổng quan'],
    ['route', 'Tuyến đường'],
    ['resources', 'Xe & nhân sự'],
    ...(trip.mode === 'AIR' ? [['flight', 'Chuyến bay'] as [TripDetailTab, string]] : []),
    ['tracking', 'Theo dõi hành trình'],
  ];
  const on: TripDetailTab = tabs.some(([k]) => k === tab) ? (tab as TripDetailTab) : 'overview';
  const gaps = planGaps(trip, vehicles, staff, trips);

  return (
    <CoordinatorLayout title="Quản lý chuyến">
      <button type="button" className="crd-back" onClick={() => navigate('/coordinator/trips')}><Icon name="back" /> Quay lại Quản lý chuyến</button>

      <div className="crd-head">
        <div>
          <h2 className="crd-title crd-detail__title">{trip.id} <TripStatusBadge status={trip.deploymentStatus === 'CONFIRMED' ? trip.status : trip.deploymentStatus} /></h2>
          <p className="crd-subtitle">{trip.requestId} • {trip.origin} → {trip.destination} • {modeLabel(trip.mode)} • khởi hành {fmtDateTime(trip.plannedDepart)}</p>
        </div>
        {trip.status === 'PLANNING' && (gaps.length
          ? <TripStatusBadge tone="warn" label={`${gaps.length} việc còn mở`} />
          : <TripStatusBadge tone="ok" label="Đã lập kế hoạch xong" />)}
      </div>

      {trip.deploymentStatus !== 'CONFIRMED' && (
        <div className="crd-note crd-note--yellow">
          <div>
            <b>Chuyến chưa được Manager giao</b>
            Chỉ xem trước. Lập tuyến và phân công chính thức bắt đầu sau khi Manager xác nhận giao việc.
            <div className="crd-btn-row"><button type="button" className="crd-btn crd-btn--sm" onClick={() => actions.demoDeploy(trip.id)}>Demo: Manager giao chuyến</button></div>
          </div>
        </div>
      )}

      {trip.deploymentStatus === 'CONFIRMED' && <TimedDocumentsCard tripId={trip.id} role="coordinator" />}
      <div className="crd-tabs" role="tablist">
        {tabs.map(([k, label]) => (
          <button key={k} type="button" role="tab" className={k === on ? 'on' : ''} onClick={() => navigate(`/coordinator/trips/${trip.id}/${k}`)}>{label}</button>
        ))}
      </div>

      {on === 'overview' && <OverviewTab trip={trip} />}
      {on === 'route' && <RouteTab trip={trip} />}
      {on === 'resources' && <ResourcesTab trip={trip} />}
      {on === 'flight' && <FlightTab trip={trip} />}
      {on === 'tracking' && <TrackingTab trip={trip} />}
    </CoordinatorLayout>
  );
};

export default TripDetailPage;
