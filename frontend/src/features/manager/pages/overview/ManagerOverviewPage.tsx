import React, { useState } from 'react';
import type {
  ManagerNav,
  TransportRequestItem,
  AlertItem,
  ActiveTripItem,
  ManagerNotificationItem,
  ManagerMetrics,
} from '../../types';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { RequestDetailModal } from '../../components/Modals/RequestDetailModal';
import './ManagerOverviewPage.css';

interface ManagerOverviewPageProps {
  metrics: ManagerMetrics;
  requests: TransportRequestItem[];
  alerts: AlertItem[];
  notifications: ManagerNotificationItem[];
  activeTrips: ActiveTripItem[];
  onNavigate: (nav: ManagerNav, targetId?: string) => void;
  onAcceptRequest?: (id: string, note?: string) => void;
  onRequestRevision?: (id: string, reason: string, suggestionDate?: string) => void;
  onRejectRequest?: (id: string, reasonGroup: string, reason: string) => void;
}

export const ManagerOverviewPage: React.FC<ManagerOverviewPageProps> = ({
  metrics,
  requests,
  alerts,
  notifications,
  activeTrips,
  onNavigate,
  onAcceptRequest,
  onRequestRevision,
  onRejectRequest,
}) => {
  const [sideTab, setSideTab] = useState<'alerts' | 'notifications'>('alerts');
  const [selectedRequest, setSelectedRequest] = useState<TransportRequestItem | null>(null);
  const [pendingReqPage, setPendingReqPage] = useState(1);

  // Filter requests for pending review table
  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const pendingPageSize = 5;
  const totalPendingPages = Math.ceil(pendingRequests.length / pendingPageSize) || 1;
  const displayedPendingRequests = pendingRequests.slice(
    (pendingReqPage - 1) * pendingPageSize,
    pendingReqPage * pendingPageSize
  );

  // Filter requests awaiting contract drafting or revision
  const contractPendingRequests = requests.filter(
    (r) =>
      r.status === 'ACCEPTED' ||
      r.status === 'CHANGES_REQUESTED' ||
      r.status === 'AWAITING_CONTRACT'
  );

  return (
    <div className="manager-overview animate-fadeIn">
      {/* ================= GREETING HEADER ================= */}
      <div className="overview-greeting-section">
        <h1 className="overview-greeting-title">Chào buổi sáng, Linh</h1>
        <p className="overview-greeting-sub">Chủ Nhật, 4/10/2026 • 16 mục cần bạn chú ý.</p>
      </div>

      {/* ================= 8 KPI METRIC CARDS ================= */}
      <div className="overview-kpi-grid">
        {/* Card 1: Chờ duyệt */}
        <div className="kpi-card" onClick={() => onNavigate('requests')}>
          <div>
            <div className="kpi-card-header">
              <span className="kpi-icon">📄</span>
              <span className="kpi-title">Chờ duyệt</span>
            </div>
            <div className="kpi-value val-orange">{metrics.pendingReviewCount}</div>
          </div>
          <p className="kpi-subtext">{metrics.pendingReviewSubtext}</p>
        </div>

        {/* Card 2: Chờ lập hợp đồng */}
        <div className="kpi-card" onClick={() => onNavigate('contracts')}>
          <div>
            <div className="kpi-card-header">
              <span className="kpi-icon">📄</span>
              <span className="kpi-title">Chờ lập hợp đồng</span>
            </div>
            <div className="kpi-value">{metrics.pendingContractCount}</div>
          </div>
          <p className="kpi-subtext">{metrics.pendingContractSubtext}</p>
        </div>

        {/* Card 3: Chờ khách hàng ký */}
        <div className="kpi-card" onClick={() => onNavigate('contracts')}>
          <div>
            <div className="kpi-card-header">
              <span className="kpi-icon">📄</span>
              <span className="kpi-title">Chờ khách hàng ký</span>
            </div>
            <div className="kpi-value">{metrics.awaitingSignatureCount}</div>
          </div>
          <p className="kpi-subtext">{metrics.awaitingSignatureSubtext}</p>
        </div>

        {/* Card 4: Tiền cọc cần xác minh */}
        <div className="kpi-card" onClick={() => onNavigate('payments')}>
          <div>
            <div className="kpi-card-header">
              <span className="kpi-icon">💳</span>
              <span className="kpi-title">Tiền cọc cần xác minh</span>
            </div>
            <div className="kpi-value val-orange">{metrics.verifyDepositCount}</div>
          </div>
          <p className="kpi-subtext">{metrics.verifyDepositSubtext}</p>
        </div>

        {/* Card 5: Chuẩn bị & triển khai */}
        <div className="kpi-card" onClick={() => onNavigate('trips')}>
          <div>
            <div className="kpi-card-header">
              <span className="kpi-icon">🚚</span>
              <span className="kpi-title">Chuẩn bị & triển khai</span>
            </div>
            <div className="kpi-value">{metrics.preparationCount}</div>
          </div>
          <div>
            <p className="kpi-subtext">{metrics.preparationSubtext}</p>
            <span className="kpi-link">Mở danh sách chuyến đi →</span>
          </div>
        </div>

        {/* Card 6: Chuyến đang chạy */}
        <div className="kpi-card" onClick={() => onNavigate('trips')}>
          <div>
            <div className="kpi-card-header">
              <span className="kpi-icon">🚚</span>
              <span className="kpi-title">Chuyến đang chạy</span>
            </div>
            <div className="kpi-value">{metrics.activeTripsCount}</div>
          </div>
          <p className="kpi-subtext">{metrics.activeTripsSubtext}</p>
        </div>

        {/* Card 7: Sự cố & khiếu nại đang mở */}
        <div className="kpi-card" onClick={() => onNavigate('trips')}>
          <div>
            <div className="kpi-card-header">
              <span className="kpi-icon" style={{ color: '#ef4444' }}>⚠️</span>
              <span className="kpi-title">Sự cố & khiếu nại đang mở</span>
            </div>
            <div className="kpi-value val-red">{metrics.incidentsCount}</div>
          </div>
          <p className="kpi-subtext">{metrics.incidentsSubtext}</p>
        </div>

        {/* Card 8: Bàn giao & đóng đơn */}
        <div className="kpi-card" onClick={() => onNavigate('overview')}>
          <div>
            <div className="kpi-card-header">
              <span className="kpi-icon" style={{ color: '#10b981' }}>✓</span>
              <span className="kpi-title">Bàn giao & đóng đơn</span>
            </div>
            <div className="kpi-value">{metrics.handoverCount}</div>
          </div>
          <p className="kpi-subtext">{metrics.handoverSubtext}</p>
        </div>
      </div>

      {/* ================= TWO-COLUMN CONTENT GRID ================= */}
      <div className="overview-content-grid">
        {/* ================= LEFT MAIN TABLES ================= */}
        <div className="overview-tables-col">
          {/* TABLE 1: Yêu cầu chờ xét duyệt */}
          <div className="overview-card">
            <div className="overview-card-header">
              <h2 className="overview-card-title">Yêu cầu chờ xét duyệt</h2>
              <button
                type="button"
                className="overview-card-action"
                onClick={() => onNavigate('requests')}
              >
                Xem tất cả
              </button>
            </div>

            <div className="overview-table-wrap">
              <table className="overview-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>YÊU CẦU</th>
                    <th style={{ width: '36%' }}>KHÁCH HÀNG</th>
                    <th style={{ width: '24%' }}>TUYẾN ĐƯỜNG</th>
                    <th style={{ width: '22%' }}>KHỞI HÀNH</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedPendingRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="clickable-row"
                      onClick={() => setSelectedRequest(req)}
                    >
                      <td>
                        <span className="table-id-cell">{req.id}</span>
                      </td>
                      <td>
                        <div className="table-cust-title">{req.customerName}</div>
                        <div className="table-cust-sub">{req.contactPerson}</div>
                      </td>
                      <td className="table-route-cell">{req.routeDisplay}</td>
                      <td>
                        <div className="table-date-title">{req.departureDate}</div>
                        <div className="table-date-sub">{req.daysRemainingText}</div>
                      </td>
                    </tr>
                  ))}
                  {displayedPendingRequests.length === 0 && (
                    <tr>
                      <td colSpan={4} className="table-empty-row">
                        Không có yêu cầu chờ xét duyệt nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="overview-card-footer">
              <span>{pendingRequests.length} bản ghi • trang {pendingReqPage}/{totalPendingPages}</span>
              <div className="pagination-group">
                <button
                  type="button"
                  className="page-btn"
                  disabled={pendingReqPage <= 1}
                  onClick={() => setPendingReqPage((p) => Math.max(1, p - 1))}
                >
                  &lt;
                </button>
                {Array.from({ length: totalPendingPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`page-btn ${pendingReqPage === num ? 'active' : ''}`}
                    onClick={() => setPendingReqPage(num)}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  className="page-btn"
                  disabled={pendingReqPage >= totalPendingPages}
                  onClick={() => setPendingReqPage((p) => Math.min(totalPendingPages, p + 1))}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>

          {/* TABLE 2: Yêu cầu chờ lập hợp đồng */}
          <div className="overview-card">
            <div className="overview-card-header">
              <h2 className="overview-card-title">Yêu cầu chờ lập hợp đồng</h2>
              <button
                type="button"
                className="overview-card-action"
                onClick={() => onNavigate('contracts')}
              >
                Xem tất cả
              </button>
            </div>

            <div className="overview-table-wrap">
              <table className="overview-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>YÊU CẦU</th>
                    <th style={{ width: '36%' }}>KHÁCH HÀNG</th>
                    <th style={{ width: '24%' }}>TUYẾN ĐƯỜNG</th>
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
                      <td>
                        <span className="table-id-cell">{req.id}</span>
                      </td>
                      <td>
                        <div className="table-cust-title">{req.customerName}</div>
                        <div className="table-cust-sub">{req.contactPerson}</div>
                      </td>
                      <td className="table-route-cell">{req.routeDisplay}</td>
                      <td>
                        <TripStatusBadge status={req.statusLabel} />
                      </td>
                    </tr>
                  ))}
                  {contractPendingRequests.length === 0 && (
                    <tr>
                      <td colSpan={4} className="table-empty-row">
                        Hiện không có yêu cầu chờ lập hợp đồng.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="overview-card-footer">
              <span>{contractPendingRequests.length} bản ghi</span>
            </div>
          </div>

          {/* TABLE 3: Chuyến đang chạy */}
          <div className="overview-card">
            <div className="overview-card-header">
              <h2 className="overview-card-title">Chuyến đang chạy</h2>
              <button
                type="button"
                className="overview-card-action"
                onClick={() => onNavigate('trips')}
              >
                Xem tất cả
              </button>
            </div>

            <div className="overview-table-wrap">
              <table className="overview-table">
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>CHUYẾN</th>
                    <th style={{ width: '28%' }}>TUYẾN ĐƯỜNG</th>
                    <th style={{ width: '26%' }}>TRẠNG THÁI</th>
                    <th style={{ width: '26%' }}>CẬP NHẬT GẦN NHẤT</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTrips.map((trip) => (
                    <tr
                      key={trip.id}
                      className="clickable-row"
                      onClick={() => onNavigate('trips', trip.id)}
                    >
                      <td>
                        <div className="table-id-cell">{trip.id}</div>
                        {trip.associatedRequestId && (
                          <div className="table-id-sub">{trip.associatedRequestId}</div>
                        )}
                      </td>
                      <td className="table-route-cell">{trip.route}</td>
                      <td>
                        <TripStatusBadge status={trip.status} variant={trip.statusClass as any} />
                      </td>
                      <td>
                        <div className="table-date-title">{trip.lastUpdated.split(' ')[0]}</div>
                        <div className="table-date-sub">{trip.lastUpdated.split(' ').slice(1).join(' ')}</div>
                      </td>
                    </tr>
                  ))}
                  {activeTrips.length === 0 && (
                    <tr>
                      <td colSpan={4} className="table-empty-row">
                        Không có chuyến nào đang hoạt động.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="overview-card-footer">
              <span>{activeTrips.length} bản ghi</span>
            </div>
          </div>
        </div>

        {/* ================= RIGHT SIDE PANEL (ALERTS / NOTIFICATIONS) ================= */}
        <div className="overview-side-col">
          <div className="side-panel-card">
            <div className="side-panel-header">
              <div className="side-tabs-wrap">
                <button
                  type="button"
                  className={`side-tab-btn ${sideTab === 'alerts' ? 'active' : ''}`}
                  onClick={() => setSideTab('alerts')}
                >
                  Cảnh báo <span className="side-tab-badge">({alerts.length})</span>
                </button>
                <span className="text-gray-600">|</span>
                <button
                  type="button"
                  className={`side-tab-btn ${sideTab === 'notifications' ? 'active' : ''}`}
                  onClick={() => setSideTab('notifications')}
                >
                  Thông báo gần đây
                </button>
              </div>
              <button
                type="button"
                className="overview-card-action"
                onClick={() => {
                  if (sideTab === 'alerts') onNavigate('requests');
                  else setSideTab('notifications');
                }}
              >
                Xem tất cả
              </button>
            </div>

            {/* List */}
            <div className="side-panel-list">
              {sideTab === 'alerts' &&
                alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className={`side-item-card ${alt.highlighted ? 'highlighted' : ''}`}
                    onClick={() => {
                      if (alt.linkNav) onNavigate(alt.linkNav, alt.requestId);
                    }}
                  >
                    <div className="side-item-top">
                      <span className={`bullet-dot bullet-${alt.bulletColor}`}>●</span>
                      <span className="side-item-title">{alt.title}</span>
                    </div>
                    <p className="side-item-sub">{alt.subtitle}</p>
                  </div>
                ))}

              {sideTab === 'notifications' &&
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="side-item-card"
                    onClick={() => {
                      if (notif.requestId) onNavigate('contracts', notif.requestId);
                    }}
                  >
                    <div className="side-item-top">
                      <span className={`bullet-dot bullet-${notif.bulletColor}`}>●</span>
                      <span className="side-item-title">{notif.title}</span>
                    </div>
                    <p className="side-item-sub">{notif.subtitle}</p>
                    <div className="side-item-time">{notif.timeText}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>



      <RequestDetailModal
        request={selectedRequest}
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onAccept={(id) => {
          onAcceptRequest?.(id);
          setSelectedRequest(null);
        }}
        onRequestRevision={(id) => {
          onRequestRevision?.(id, 'Yêu cầu cập nhật chứng từ kiểm dịch');
          setSelectedRequest(null);
        }}
        onReject={(id) => {
          onRejectRequest?.(id, 'CAPACITY', 'Không đủ khoang chuyên dụng');
          setSelectedRequest(null);
        }}
      />
    </div>
  );
};

export default ManagerOverviewPage;
