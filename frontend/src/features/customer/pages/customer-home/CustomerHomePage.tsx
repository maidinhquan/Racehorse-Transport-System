import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from '../../hooks/useCustomer';
import TripStatusBadge from '../../components/TripStatusBadge/TripStatusBadge';
import { CustomerLayout } from '../../components/CustomerLayout';
import { TrackingModal } from '../../components/Modals/TrackingModal';
import { IncidentModal } from '../../components/Modals/IncidentModal';
import './CustomerHomePage.css';

export const CustomerHomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentTrip,
    recentRequests,
    notifications,
    incidentDetail,
    handleResolveIncident,
    markNotificationAsRead
  } = useCustomer();

  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);

  return (
    <CustomerLayout pageTitle="Trang chủ" activeNav="home">
      {/* Welcome Hero Banner */}
      <section className="welcome-hero-card">
        <div className="welcome-info">
          <h2 className="welcome-title">Chào mừng trở lại, Alex</h2>
          <p className="welcome-subtitle">
            Quản lý ngựa và yêu cầu vận chuyển ở một nơi.
          </p>
        </div>
        <button
          className="btn-create-request"
          onClick={() => navigate('/customer/create-request')}
        >
          <span>+ Tạo yêu cầu vận chuyển</span>
        </button>
      </section>

      {/* Middle Two-Column Grid */}
      <div className="dashboard-middle-grid">
        {/* Left Card: Chuyến hiện tại */}
        <section className="cbn-card current-trip-card">
          <div className="trip-card-header">
            <h3 className="card-title">Chuyến hiện tại</h3>
            <TripStatusBadge status={currentTrip.status} label={currentTrip.statusText} />
          </div>

          <div className="trip-key-info-row">
            <div className="info-block">
              <span className="info-label">Ngựa</span>
              <span className="info-value">{currentTrip.horse}</span>
            </div>
            <div className="info-block">
              <span className="info-label">Tuyến đường</span>
              <span className="info-value">{currentTrip.origin} → {currentTrip.destination}</span>
            </div>
          </div>

          <div className="trip-progress-box">
            <div className="trip-schedule-times">
              <span className="depart-time">Khởi hành: {currentTrip.departedDate}</span>
              <span className="eta-time">Dự kiến đến: {currentTrip.eta}</span>
            </div>

            <div className="progress-track-wrapper">
              <div
                className="progress-fill-bar"
                style={{ width: `${currentTrip.progress}%` }}
              >
                <span className="progress-dot-marker" />
              </div>
            </div>
          </div>

          <div className="milestone-note-text">
            Mốc đã xác nhận gần nhất: <b>{currentTrip.lastMilestone}</b> • {currentTrip.milestoneTime}
          </div>

          <button
            className="btn-view-tracking"
            onClick={() => setIsTrackingModalOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>Xem theo dõi chuyến đi</span>
          </button>
        </section>

        {/* Right Card: Thông báo */}
        <section className="cbn-card notifications-card">
          <div className="notif-card-header">
            <div className="notif-header-left">
              <h3 className="card-title">Thông báo</h3>
              <span className="unread-pill">14 chưa đọc</span>
            </div>
            <button
              className="link-view-all"
              style={{ background: 'none', border: 'none' }}
              onClick={() => navigate('/customer/history')}
            >
              Xem tất cả
            </button>
          </div>

          <div className="notif-list-container">
            {/* Notif Item 1 */}
            <div
              className="notif-item-row unread"
              onClick={() => markNotificationAsRead('notif-1')}
            >
              <div className="notif-bell-icon-circle">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <div className="notif-content-area">
                <span className="notif-item-title">
                  • Đã xác minh tiền cọc cho TRN-8942
                </span>
                <p className="notif-item-body">
                  $570 đã được xác minh đủ cọc. Xác nhận nội dung hiện hành rồi ký OTP trước 5/10, 09:30 để kích hoạt.
                </p>
                <span className="notif-item-time">4/10, 11:30</span>
              </div>
              <span className="notif-item-chevron">›</span>
            </div>

            {/* Notif Item 2 */}
            <div
              className="notif-item-row unread"
              onClick={() => markNotificationAsRead('notif-2')}
            >
              <div className="notif-bell-icon-circle">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <div className="notif-content-area">
                <span className="notif-item-title">
                  • E-mail: Mã OTP ký CT-8942 v1 được gửi tới alex.equine@example.com (Demo)
                </span>
                <p className="notif-item-body">
                  Đã gửi tới alex.equine@example.com (e-mail mô phỏng)
                </p>
                <span className="notif-item-time">4/10, 11:30</span>
              </div>
              <span className="notif-item-chevron">›</span>
            </div>


            {/* Notif Item 3 */}
            <div
              className="notif-item-row"
              onClick={() => markNotificationAsRead('notif-3')}
            >
              <div className="notif-bell-icon-circle">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <div className="notif-content-area">
                <span className="notif-item-title">
                  • Đã ký hợp đồng CT-8944 v1 – TRN-8944 activated
                </span>
                <p className="notif-item-body">
                  Hợp đồng của bạn đã có hiệu lực. Việc lập kế hoạch và chuẩn bị vận chuyển đã bắt đầu.
                </p>
                <span className="notif-item-time">4/10, 11:30</span>
              </div>
              <span className="notif-item-chevron">›</span>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Card: Yêu cầu vận chuyển gần đây */}
      <section className="cbn-card recent-requests-card">
        <div className="requests-card-header">
          <h3 className="card-title">Yêu cầu vận chuyển gần đây</h3>
          <button
            className="link-view-all"
            style={{ background: 'none', border: 'none' }}
            onClick={() => navigate('/customer/requests')}
          >
            Xem tất cả
          </button>
        </div>

        <div className="requests-table-wrapper">
          <table className="cbn-table">
            <thead>
              <tr>
                <th>MÃ YÊU CẦU</th>
                <th>TUYẾN ĐƯỜNG</th>
                <th>NGỰA</th>
                <th>NGÀY YÊU CẦU</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.map((req) => (
                <tr key={req.id}>
                  <td className="request-id-text">{req.id}</td>
                  <td>{req.origin} → {req.destination}</td>
                  <td>{req.horses}</td>
                  <td>{req.requestedDate}</td>
                  <td>
                    <TripStatusBadge status={req.status} label={req.statusText} />
                  </td>
                  <td>
                    <button
                      className="btn-table-action-link"
                      onClick={() => navigate(`/customer/requests/${req.id}`)}
                    >
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modals for Current Trip and Flow 5 */}
      <TrackingModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        trip={currentTrip}
      />

      <IncidentModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        incident={incidentDetail}
        onResolve={handleResolveIncident}
      />
    </CustomerLayout>
  );
};

export default CustomerHomePage;
