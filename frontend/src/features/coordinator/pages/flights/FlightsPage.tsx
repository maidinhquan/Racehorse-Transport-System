import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CoordinatorLayout } from '../../components/CoordinatorLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { useCoordinator } from '../../hooks/useCoordinator';
import { fmtDateTime, unitGaps } from '../../hooks/coordinatorRules';
import './FlightsPage.css';

export const FlightsPage: React.FC = () => {
  const navigate = useNavigate();
  const { trips, vehicles, staff } = useCoordinator();
  const air = trips.filter((t) => t.mode === 'AIR' && t.status !== 'COMPLETED');
  const pending = air.filter((t) => t.flight?.status === 'BUDGET_PENDING').length;
  const toBook = air.filter((t) => t.flight?.status === 'BUDGET_APPROVED').length;

  return (
    <CoordinatorLayout title="Chuyến bay">
      <div className="crd-head">
        <div>
          <h2 className="crd-title">Điều phối chuyến bay</h2>
          <p className="crd-subtitle">Đề xuất bay thẳng → Manager duyệt ngân sách → ghi nhận mã đặt chỗ → hoàn tất 2 chặng xe sân bay.</p>
        </div>
      </div>

      <div className="crd-stats">
        <div className="crd-stat"><span>Chuyến hàng không</span><b>{air.length}</b></div>
        <div className="crd-stat"><span>Chờ Manager duyệt ngân sách</span><b>{pending}</b></div>
        <div className="crd-stat"><span>Có thể đặt chỗ</span><b>{toBook}</b></div>
      </div>

      {air.map((t) => {
        const f = t.flight;
        const out = !unitGaps(t, vehicles, staff, trips, 'outbound').length;
        const inb = !unitGaps(t, vehicles, staff, trips, 'inbound').length;
        return (
          <div key={t.id} className="crd-card crd-flight-card">
            <div className="crd-flight-card__head">
              <div>
                <div className="crd-muted">{t.id} • {t.requestId} • {t.horses.length} ngựa</div>
                <div className="crd-flight-card__route">{t.origin} → {t.destination}</div>
                <div className="crd-muted">{f ? `${f.airline} • ${f.flightNo}` : 'Chưa có phương án bay'}</div>
              </div>
              {f ? <TripStatusBadge status={f.status} /> : <TripStatusBadge tone="muted" label="Chưa lập" />}
            </div>
            <div className="crd-kv crd-flight-card__kv">
              <div><span>Sân bay đi</span><b>{f?.fromAirport ?? '—'}</b><div className="crd-muted">{fmtDateTime(f?.departAt)}</div></div>
              <div><span>Sân bay đến</span><b>{f?.toAirport ?? '—'}</b><div className="crd-muted">{fmtDateTime(f?.arriveAt)}</div></div>
              <div><span>Ngân sách</span><b>{f ? `${f.cost.toLocaleString('en-US')} USD` : '—'}</b><div className="crd-muted">{f?.bookingRef ? `Mã đặt chỗ ${f.bookingRef}` : 'Chưa đặt chỗ'}</div></div>
              <div><span>Chặng xe sân bay</span><b>{out ? 'Chặng 1 ✓' : 'Chặng 1 chưa đủ'} • {inb ? 'Chặng 2 ✓' : 'Chặng 2 chưa đủ'}</b></div>
            </div>
            <div className="crd-btn-row">
              <button type="button" className="crd-btn crd-btn--sm" onClick={() => navigate(`/coordinator/trips/${t.id}/resources`)}>Xe & nhân sự</button>
              <button type="button" className="crd-btn crd-btn--solid crd-btn--sm" onClick={() => navigate(`/coordinator/trips/${t.id}/flight`)}>Chi tiết chuyến bay</button>
            </div>
          </div>
        );
      })}
      {!air.length && <div className="crd-card crd-empty">Không có chuyến hàng không đang hoạt động.</div>}
    </CoordinatorLayout>
  );
};

export default FlightsPage;
