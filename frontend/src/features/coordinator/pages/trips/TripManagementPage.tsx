import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoordinatorLayout } from '../../components/CoordinatorLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { useCoordinator } from '../../hooks/useCoordinator';
import { useCoordinatorFilter, type TripStatusFilter } from '../../hooks/useCoordinatorFilter';
import { fmtDateTime, modeLabel, planGaps } from '../../hooks/coordinatorRules';
import type { Trip } from '../../types';
import './TripManagementPage.css';

export const TripManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { trips, vehicles, staff } = useCoordinator();
  const gapsOf = useCallback((t: Trip) => planGaps(t, vehicles, staff, trips), [vehicles, staff, trips]);
  const f = useCoordinatorFilter(trips, 8, (t) => gapsOf(t).length > 0);

  return (
    <CoordinatorLayout title="Quản lý chuyến">
      <div className="crd-head">
        <div>
          <h2 className="crd-title">Quản lý chuyến</h2>
          <p className="crd-subtitle">Lập tuyến, bố trí xe & nhân sự và theo dõi hành trình. Chỉ lập kế hoạch chính thức sau khi Manager giao chuyến.</p>
        </div>
      </div>

      <div className="crd-card">
        <div className="crd-toolbar">
          <input className="crd-input crd-trips__search" placeholder="Tìm mã chuyến, yêu cầu, khách hàng, tuyến…" value={f.searchTerm} onChange={(e) => f.setSearchTerm(e.target.value)} />
          <select className="crd-select" value={f.statusFilter} onChange={(e) => f.setStatusFilter(e.target.value as TripStatusFilter)}>
            <option value="all">Mọi trạng thái</option>
            <option value="NEEDS_ACTION">Còn việc cần làm</option>
            <option value="PLANNING">Lập kế hoạch</option>
            <option value="READY_TO_DEPART">Sẵn sàng khởi hành</option>
            <option value="IN_TRANSIT">Đang vận chuyển</option>
            <option value="COMPLETED">Hoàn tất</option>
          </select>
          <select className="crd-select" value={f.modeFilter} onChange={(e) => f.setModeFilter(e.target.value as 'all' | Trip['mode'])}>
            <option value="all">Mọi phương thức</option>
            <option value="ROAD">Đường bộ</option>
            <option value="AIR">Hàng không</option>
          </select>
        </div>

        <div className="crd-table-wrap">
          <table className="crd-table">
            <thead>
              <tr><th>Chuyến</th><th>Tuyến</th><th>Phương thức</th><th>Khởi hành</th><th>Tuyến đường</th><th>Việc còn mở</th><th>Trạng thái</th><th /></tr>
            </thead>
            <tbody>
              {f.paginated.map((t) => {
                const gaps = gapsOf(t);
                return (
                  <tr key={t.id} className="clickable" onClick={() => navigate(`/coordinator/trips/${t.id}`)}>
                    <td><span className="crd-strong">{t.id}</span><div className="crd-muted">{t.requestId} • {t.customer}</div></td>
                    <td>{t.origin} → {t.destination}<div className="crd-muted">{t.horses.length} ngựa</div></td>
                    <td>{modeLabel(t.mode)}</td>
                    <td>{fmtDateTime(t.plannedDepart)}<div className="crd-muted">ETA {fmtDateTime(t.eta)}</div></td>
                    <td>{t.route.stops.length ? <TripStatusBadge status={t.route.status} /> : <span className="crd-muted">Chưa lập</span>}</td>
                    <td>{gaps.length ? <TripStatusBadge tone="warn" label={`${gaps.length} việc`} /> : <TripStatusBadge tone="ok" label="Đủ" />}</td>
                    <td><TripStatusBadge status={t.deploymentStatus === 'CONFIRMED' ? t.status : t.deploymentStatus} /></td>
                    <td><button type="button" className="crd-btn crd-btn--solid crd-btn--sm">Mở</button></td>
                  </tr>
                );
              })}
              {!f.paginated.length && <tr><td colSpan={8} className="crd-empty">Không có chuyến phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="crd-pager">
          <span>{f.filtered.length} chuyến • trang {f.page}/{f.totalPages}</span>
          <div>
            <button type="button" className="crd-btn crd-btn--sm" disabled={f.page <= 1} onClick={() => f.setPage(f.page - 1)}>‹</button>
            <button type="button" className="crd-btn crd-btn--sm" disabled={f.page >= f.totalPages} onClick={() => f.setPage(f.page + 1)}>›</button>
          </div>
        </div>
      </div>
    </CoordinatorLayout>
  );
};

export default TripManagementPage;
