import React from 'react';
import type { MockTrip } from './coordinator.types';
import { Icon, VEHICLES } from './coordinator.types';

interface RenderDashboardPageProps {
  trips: MockTrip[];
  lang: 'vi' | 'en';
  onNavigate: (nav: 'dashboard' | 'trips' | 'fleet' | 'crew' | 'flights' | 'active' | 'incidents') => void;
  onSelectTrip: (tripId: string) => void;
  onOpenTripTab: (tripId: string, tab: 'overview' | 'route' | 'resources' | 'flight' | 'milestones') => void;
}

export const RenderDashboardPage: React.FC<RenderDashboardPageProps> = ({
  trips,
  lang,
  onNavigate,
  onSelectTrip,
  onOpenTripTab,
}) => {
  const toRoute = trips.filter((t) => t.routeStatus === 'DRAFT');
  const pending = trips.filter((t) => t.routeStatus === 'PENDING_APPROVAL');
  const returned = trips.filter((t) => t.routeStatus === 'RETURNED');
  const missing = trips.filter((t) => !t.resourcesConfirmed);
  const readyVehicles = VEHICLES.filter((v) => v.status === 'READY');

  return (
    <div className="render-dashboard-page">
      <div className="head">
        <div>
          <h2 className="page-title">{lang === 'vi' ? 'Xin chào, Quân' : 'Hello, Quan'}</h2>
          <p className="subtitle">
            {lang === 'vi'
              ? 'Lộ trình, phương tiện và tổ vận hành cho các chuyến đã triển khai.'
              : 'Routes, vehicles and crews for deployed trips.'}
          </p>
        </div>
      </div>

      {/* 6 Stat Cards (.stats.six) */}
      <div className="stats six">
        <button className={`stat card ${toRoute.length ? 'warn' : ''}`} onClick={() => onNavigate('trips')}>
          <span className="label"><Icon name="map" />Chờ lập tuyến</span>
          <b>{toRoute.length}</b>
          <small>{toRoute.length} bản thảo đang soạn</small>
        </button>

        <button className="stat card" onClick={() => onNavigate('trips')}>
          <span className="label"><Icon name="clock" />Tuyến chờ duyệt</span>
          <b>{pending.length}</b>
          <small>Chờ Logistics Manager</small>
        </button>

        <button className={`stat card ${returned.length ? 'bad' : ''}`} onClick={() => onNavigate('trips')}>
          <span className="label"><Icon name="alert" />Tuyến bị trả về</span>
          <b>{returned.length}</b>
          <small>{returned.length ? 'Cần chỉnh sửa lại' : 'Không có tuyến trả về'}</small>
        </button>

        <button className={`stat card ${missing.length ? 'bad' : ''}`} onClick={() => onNavigate('trips')}>
          <span className="label"><Icon name="truck" />Chưa chốt nguồn lực</span>
          <b>{missing.length}</b>
          <small>Xe hoặc nhân sự chưa đủ</small>
        </button>

        <button className="stat card" onClick={() => onNavigate('active')}>
          <span className="label"><Icon name="pin" />Chuyến hoạt động</span>
          <b>{trips.length}</b>
          <small>1 đang chạy • 1 sẵn sàng</small>
        </button>

        <button className="stat card" onClick={() => onNavigate('fleet')}>
          <span className="label"><Icon name="truck" />Xe sẵn sàng</span>
          <b>{readyVehicles.length}/{VEHICLES.length}</b>
          <small>1 xe đang bảo dưỡng</small>
        </button>
      </div>

      {/* Main Grid: Planning Table + Sidebar Stack */}
      <div className="grid-main">
        <div className="stack">
          <div className="card pad">
            <div className="section-title">
              <h3 className="card-title">Phân công điều phối kế hoạch</h3>
              <button className="link" onClick={() => onNavigate('trips')}>Xem tất cả</button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Chuyến đi</th>
                  <th>Tuyến vận chuyển</th>
                  <th>Ngày khởi hành</th>
                  <th>Tình trạng chuẩn bị</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr
                    key={t.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      onSelectTrip(t.id);
                      onOpenTripTab(t.id, 'resources');
                    }}
                  >
                    <td>
                      <b style={{ color: 'var(--ink)' }}>{t.id}</b>
                      <br />
                      <small style={{ color: 'var(--muted)' }}>{t.mode}</small>
                    </td>
                    <td>
                      <span>{t.origin} ➔ {t.destination}</span>
                      <br />
                      <small style={{ color: 'var(--muted)' }}>{t.horses} cá thể ngựa</small>
                    </td>
                    <td>{t.plannedDepart}</td>
                    <td>
                      <span className={`pill ${t.resourcesConfirmed ? 'READY' : 'PENDING'}`}>
                        {t.resourcesConfirmed ? '✓ Operations READY' : 'Thiếu nhân sự/xe'}
                      </span>
                      <br />
                      <span
                        className={`pill ${
                          t.routeStatus === 'APPROVED'
                            ? 'APPROVED'
                            : t.routeStatus === 'PENDING_APPROVAL'
                            ? 'PENDING'
                            : 'DRAFT'
                        }`}
                        style={{ marginTop: '4px' }}
                      >
                        {t.routeStatus === 'APPROVED'
                          ? 'Tuyến đã duyệt'
                          : t.routeStatus === 'PENDING_APPROVAL'
                          ? 'Chờ duyệt'
                          : 'Bản thảo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack">
          {/* Attention Card */}
          <div className="card pad">
            <div className="section-title">
              <h3 className="card-title">Cần chú ý</h3>
              <span className="pill NOT_READY">2 mục</span>
            </div>
            <div className="alerts">
              <button className="alert-row bad" onClick={() => onNavigate('trips')}>
                <span className="dot"></span>
                <div>
                  <b>Bố trí 2 chặng đường bộ TRP-20261120-0003</b>
                  <span>Chặng VN và JP cần 3 nhân sự độc lập và xác nhận nguồn lực.</span>
                </div>
              </button>
              <button className="alert-row" onClick={() => onNavigate('fleet')}>
                <span className="dot"></span>
                <div>
                  <b>Xe 51E-992.11 đang bảo dưỡng</b>
                  <span>Dự kiến hoàn thành bảo dưỡng ngày 2026-10-30.</span>
                </div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
