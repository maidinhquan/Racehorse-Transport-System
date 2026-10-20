import React from 'react';
import type {
  ManagerNav,
  TransportRequestItem,
  AlertItem,
  ActiveTripItem,
} from './manager.types';

interface RenderOverviewPageProps {
  requests: TransportRequestItem[];
  alerts: AlertItem[];
  activeTrips: ActiveTripItem[];
  onNavigate: (nav: ManagerNav, targetId?: string) => void;
  onOpenRequestModal?: (request: TransportRequestItem) => void;
}

export const RenderOverviewPage: React.FC<RenderOverviewPageProps> = ({
  requests,
  alerts,
  activeTrips,
  onNavigate,
  onOpenRequestModal,
}) => {
  // Pending review requests: PENDING
  const pendingRequests = requests.filter((r) => r.status === 'PENDING');

  // Awaiting contract: ACCEPTED
  const contractPendingRequests = requests.filter(
    (r) => r.status === 'ACCEPTED' || r.status === 'AWAITING_CONTRACT'
  );

  return (
    <div className="overview-page fade-in">
      <div className="overview-grid">
        {/* ================= LEFT MAIN COLUMN ================= */}
        <div className="overview-main-col">
          {/* Card 1: Yêu cầu chờ xét duyệt */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h2 className="dash-card-title">Yêu cầu chờ xét duyệt</h2>
              <button
                type="button"
                className="dash-card-link"
                onClick={() => onNavigate('requests')}
              >
                Xem tất cả
              </button>
            </div>

            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>YÊU CẦU</th>
                    <th style={{ width: '38%' }}>KHÁCH HÀNG</th>
                    <th style={{ width: '24%' }}>TUYẾN ĐƯỜNG</th>
                    <th style={{ width: '20%' }}>KHỞI HÀNH</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="clickable-row"
                      onClick={() => {
                        if (onOpenRequestModal) {
                          onOpenRequestModal(req);
                        } else {
                          onNavigate('requests', req.id);
                        }
                      }}
                    >
                      <td className="font-semibold text-primary-dark">
                        {req.id}
                      </td>
                      <td>
                        <div className="customer-cell-main">{req.customerName}</div>
                        <div className="customer-cell-sub">{req.contactPerson}</div>
                      </td>
                      <td className="route-cell">{req.routeDisplay}</td>
                      <td>
                        <div className="date-cell-main">{req.departureDate}</div>
                        <div className="date-cell-sub">{req.daysRemainingText}</div>
                      </td>
                    </tr>
                  ))}
                  {pendingRequests.length === 0 && (
                    <tr>
                      <td colSpan={4} className="empty-cell">
                        Không có yêu cầu chờ xét duyệt nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="dash-card-footer">
              <span>{pendingRequests.length} bản ghi</span>
            </div>
          </div>

          {/* Card 2: Yêu cầu chờ lập hợp đồng */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h2 className="dash-card-title">Yêu cầu chờ lập hợp đồng</h2>
              <button
                type="button"
                className="dash-card-link"
                onClick={() => onNavigate('contracts')}
              >
                Xem tất cả
              </button>
            </div>

            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>YÊU CẦU</th>
                    <th style={{ width: '38%' }}>KHÁCH HÀNG</th>
                    <th style={{ width: '22%' }}>TUYẾN ĐƯỜNG</th>
                    <th style={{ width: '22%' }}>TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody>
                  {contractPendingRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="clickable-row"
                      onClick={() => onNavigate('contracts', req.id)}
                    >
                      <td className="font-semibold text-primary-dark">
                        {req.id}
                      </td>
                      <td>
                        <div className="customer-cell-main">{req.customerName}</div>
                        <div className="customer-cell-sub">{req.contactPerson}</div>
                      </td>
                      <td className="route-cell">{req.routeDisplay}</td>
                      <td>
                        <span className="badge-status-blue">
                          {req.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {contractPendingRequests.length === 0 && (
                    <tr>
                      <td colSpan={4} className="empty-cell">
                        Hiện không có yêu cầu chờ lập hợp đồng.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="dash-card-footer">
              <span>{contractPendingRequests.length} bản ghi</span>
            </div>
          </div>

          {/* Card 3: Chuyến đang chạy */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h2 className="dash-card-title">Chuyến đang chạy</h2>
            </div>

            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>CHUYẾN</th>
                    <th style={{ width: '26%' }}>TUYẾN ĐƯỜNG</th>
                    <th style={{ width: '32%' }}>TRẠNG THÁI</th>
                    <th style={{ width: '24%' }}>CẬP NHẬT GẦN NHẤT</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTrips.map((trip) => (
                    <tr
                      key={trip.id}
                    >
                      <td className="font-semibold text-primary-dark">
                        {trip.id}
                      </td>
                      <td className="route-cell">{trip.route}</td>
                      <td>
                        <span className={`badge-trip ${trip.statusClass}`}>
                          {trip.status}
                        </span>
                      </td>
                      <td className="text-muted text-sm">{trip.lastUpdated}</td>
                    </tr>
                  ))}
                  {activeTrips.length === 0 && (
                    <tr>
                      <td colSpan={4} className="empty-cell">
                        Không có chuyến nào đang hoạt động.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="dash-card-footer">
              <span>{activeTrips.length} bản ghi</span>
            </div>
          </div>
        </div>

        {/* ================= RIGHT ALERT COLUMN ================= */}
        <div className="overview-side-col">
          <div className="dash-card alerts-panel">
            <div className="dash-card-header">
              <h2 className="dash-card-title">Cảnh báo</h2>
              <span className="alerts-count-badge">{alerts.length}</span>
            </div>

            <div className="alerts-list">
              {alerts.map((alt) => (
                <div
                  key={alt.id}
                  className={`alert-item-card border-${alt.bulletColor}`}
                  onClick={() => {
                    if (alt.linkNav) {
                      onNavigate(alt.linkNav, alt.requestId);
                    }
                  }}
                >
                  <div className="alert-item-header">
                    <span className={`bullet-dot bullet-${alt.bulletColor}`}>
                      ●
                    </span>
                    <span className="alert-item-title">{alt.title}</span>
                  </div>
                  <p className="alert-item-sub">{alt.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
