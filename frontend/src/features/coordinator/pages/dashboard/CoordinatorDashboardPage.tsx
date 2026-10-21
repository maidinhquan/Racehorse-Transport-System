import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CoordinatorLayout } from '../../components/CoordinatorLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { useCoordinator } from '../../hooks/useCoordinator';
import { fmtDateTime, isActiveTrip, modeLabel, planGaps } from '../../hooks/coordinatorRules';
import './CoordinatorDashboardPage.css';

export const CoordinatorDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { trips, vehicles, staff, stats } = useCoordinator();

  const todo = trips
    .filter((t) => t.deploymentStatus === 'CONFIRMED' && t.status === 'PLANNING')
    .map((t) => ({ t, gaps: planGaps(t, vehicles, staff, trips) }))
    .filter((x) => x.gaps.length);
  const upcoming = trips
    .filter((t) => isActiveTrip(t))
    .sort((a, b) => a.plannedDepart.localeCompare(b.plannedDepart))
    .slice(0, 6);

  return (
    <CoordinatorLayout title="Tổng quan">
      <div className="crd-head">
        <div>
          <h2 className="crd-title">Xin chào, Dang Minh Quan</h2>
          <p className="crd-subtitle">Lập tuyến, bố trí xe và nhân sự, theo dõi hành trình cho các chuyến được Manager giao.</p>
        </div>
      </div>

      <div className="crd-stats">
        <button type="button" className="crd-stat" onClick={() => navigate('/coordinator/trips')}>
          <span>Chờ lập / duyệt tuyến</span><b>{stats.needRoute}</b><small>chuyến đang lập kế hoạch</small>
        </button>
        <button type="button" className="crd-stat" onClick={() => navigate('/coordinator/trips')}>
          <span>Chờ bố trí xe & nhân sự</span><b>{stats.needResources}</b><small>chưa xác nhận Operations READY</small>
        </button>
        <button type="button" className="crd-stat" onClick={() => navigate('/coordinator/fleet')}>
          <span>Xe sẵn sàng</span><b>{stats.readyVehicles}/{stats.totalVehicles}</b><small>chưa gắn chuyến nào</small>
        </button>
        <button type="button" className="crd-stat" onClick={() => navigate('/coordinator/trips')}>
          <span>Đang vận chuyển</span><b>{stats.inTransit}</b><small>chuyến trên đường</small>
        </button>
        <button type="button" className="crd-stat" onClick={() => navigate('/coordinator/incidents')}>
          <span>Sự cố đang mở</span><b>{stats.openIncidents}</b><small>cần theo dõi</small>
        </button>
      </div>

      <div className="crd-dash-grid">
        <div className="crd-card">
          <h3 className="crd-card__title">Chuyến sắp khởi hành</h3>
          <div className="crd-table-wrap">
            <table className="crd-table">
              <thead><tr><th>Chuyến</th><th>Tuyến</th><th>Phương thức</th><th>Khởi hành</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {upcoming.map((t) => (
                  <tr key={t.id} className="clickable" onClick={() => navigate(`/coordinator/trips/${t.id}`)}>
                    <td><span className="crd-strong">{t.id}</span><div className="crd-muted">{t.requestId}</div></td>
                    <td>{t.origin} → {t.destination}</td>
                    <td>{modeLabel(t.mode)}</td>
                    <td>{fmtDateTime(t.plannedDepart)}</td>
                    <td><TripStatusBadge status={t.deploymentStatus === 'CONFIRMED' ? t.status : t.deploymentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="crd-card crd-dash-todo">
          <h3 className="crd-card__title">Việc cần làm <span className="crd-dash-count">{todo.reduce((n, x) => n + x.gaps.length, 0)}</span></h3>
          {todo.length ? todo.map(({ t, gaps }) => (
            <button key={t.id} type="button" className="crd-dash-todo__item" onClick={() => navigate(`/coordinator/trips/${t.id}`)}>
              <b>{t.id} • {t.origin} → {t.destination}</b>
              <ul>{gaps.slice(0, 4).map((g) => <li key={g}>{g}</li>)}{gaps.length > 4 && <li>+{gaps.length - 4} mục khác</li>}</ul>
            </button>
          )) : <p className="crd-muted">Không có việc cần xử lý.</p>}
        </aside>
      </div>
    </CoordinatorLayout>
  );
};

export default CoordinatorDashboardPage;
