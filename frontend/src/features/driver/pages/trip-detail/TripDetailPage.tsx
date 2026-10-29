import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DriverLayout, Icon } from '../../components/DriverLayout';
import { TripHero } from '../../components/TripHero/TripHero';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { useDriver } from '../../hooks/useDriver';
import { DELAY_LABEL, fmtDateTime, myPosition } from '../../hooks/driverRules';
import type { TripDetailTab } from '../../types';
import { OverviewTab } from './tabs/OverviewTab';
import { StopsTab } from './tabs/StopsTab';
import { DocumentsTab } from './tabs/DocumentsTab';
import { HealthTab } from './tabs/HealthTab';
import { HandoverTab } from './tabs/HandoverTab';
import './TripDetailPage.css';

const TABS: Array<[TripDetailTab, string]> = [
  ['overview', 'Tổng quan'],
  ['stops', 'Tuyến & điểm dừng'],
  ['docs', 'Hồ sơ'],
  ['health', 'Sức khoẻ ngựa'],
  ['handover', 'Bàn giao'],
];

export const TripDetailPage: React.FC = () => {
  const { tripId, tab } = useParams<{ tripId?: string; tab?: TripDetailTab }>();
  const navigate = useNavigate();
  const { getTrip, activeTrips, userId, loading } = useDriver();

  // Chỉ có một chuyến đang hoạt động: mở thẳng chuyến đó
  useEffect(() => {
    if (!tripId && activeTrips.length === 1) navigate(`/driver/trips/${activeTrips[0].id}`, { replace: true });
  }, [tripId, activeTrips, navigate]);

  const trip = getTrip(tripId);

  if (!tripId) {
    return (
      <DriverLayout title="Chuyến đi">
        <div className="drv-head"><div><h2 className="drv-title">Chuyến đi</h2><p className="drv-subtitle">Chọn chuyến để xem thông tin, hồ sơ, sức khoẻ ngựa và bàn giao.</p></div></div>
        {activeTrips.length ? activeTrips.map((t) => (
          <TripHero key={t.id} trip={t} compact actions={<button type="button" className="drv-btn drv-btn--solid" onClick={() => navigate(`/driver/trips/${t.id}`)}>Mở chuyến</button>} />
        )) : <div className="drv-card drv-empty"><b>{loading ? 'Đang tải…' : 'Không có chuyến đang hoạt động'}</b>Chuyến đã hoàn tất nằm trong mục Lịch sử.</div>}
      </DriverLayout>
    );
  }

  if (!trip) {
    return (
      <DriverLayout title="Chuyến đi">
        <div className="drv-card drv-empty">
          <b>Không tìm thấy chuyến {tripId}</b>Chuyến không được giao cho tài khoản này.
          <div className="drv-btn-row" style={{ justifyContent: 'center' }}><button type="button" className="drv-btn" onClick={() => navigate('/driver/journey')}>Về Hành trình</button></div>
        </div>
      </DriverLayout>
    );
  }

  const on: TripDetailTab = TABS.some(([k]) => k === tab) ? (tab as TripDetailTab) : 'overview';
  const done = trip.status === 'COMPLETED';

  return (
    <DriverLayout title={done ? 'Lịch sử' : 'Chuyến đi'}>
      {done ? (
        <>
          <button type="button" className="drv-back" onClick={() => navigate('/driver/history')}><Icon name="back" /> Lịch sử</button>
          <div className="drv-head">
            <div>
              <h2 className="drv-title">{trip.id} <TripStatusBadge status={trip.status} /></h2>
              <p className="drv-subtitle">{trip.origin} → {trip.destination} • bạn là {myPosition(trip, userId).toLowerCase()}</p>
            </div>
          </div>
        </>
      ) : (
        <>
          {activeTrips.length > 1 && <button type="button" className="drv-back" onClick={() => navigate('/driver/trips')}><Icon name="back" /> Chuyến của tôi</button>}
          <TripHero trip={trip} compact actions={<button type="button" className="drv-btn drv-btn--solid" onClick={() => navigate(`/driver/journey/${trip.id}`)}>Mở Hành trình</button>} />
        </>
      )}

      {trip.departureDelay && trip.departureDelay.status !== 'APPROVED' && (
        <div className="drv-note drv-note--yellow">
          <Icon name="clock" />
          <div><b>Đã báo chậm khởi hành • {fmtDateTime(trip.departureDelay.at)}</b>{trip.departureDelay.reason}<br />Trạng thái: {DELAY_LABEL[trip.departureDelay.status]}</div>
        </div>
      )}

      <div className="drv-tabs" role="tablist">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" className={k === on ? 'on' : ''} onClick={() => navigate(`/driver/trips/${trip.id}/${k}`)}>{label}</button>
        ))}
      </div>

      {on === 'overview' && <OverviewTab trip={trip} />}
      {on === 'stops' && <StopsTab trip={trip} />}
      {on === 'docs' && <DocumentsTab trip={trip} />}
      {on === 'health' && <HealthTab trip={trip} />}
      {on === 'handover' && <HandoverTab trip={trip} />}
    </DriverLayout>
  );
};

export default TripDetailPage;
