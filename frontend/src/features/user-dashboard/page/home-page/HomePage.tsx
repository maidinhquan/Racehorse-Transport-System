import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../../../shared/layouts/CustomerLayout/CustomerLayout";
import {
  currentTrip,
  customerNotifications,
  recentRequests,
  type RequestStatus,
} from "../../data/homeMockData";
import "./HomePage.css";

function formatDate(date: string) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

function getRequestStatusBadge(status: RequestStatus) {
  switch (status) {
    case "In Transit":
      return <span className="status status-transit">Đang vận chuyển</span>;
    case "Scheduled":
      return <span className="status status-success">Đã lên lịch</span>;
    case "Documents Under Review":
      return <span className="status status-processing">Đang duyệt hồ sơ</span>;
    case "Waiting for Manager Review":
      return <span className="status status-warning">Chờ quản lý duyệt</span>;
    case "Completed":
      return <span className="status status-completed">Đã hoàn thành</span>;
    default:
      return <span className="status">{status}</span>;
  }
}

function HomePage() {
  const navigate = useNavigate();
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  return (
    <CustomerLayout pageTitle="Trang chủ">
      <div className="home-page">
        {/* Welcome Banner */}
        <section className="home-card welcome-card">
          <div>
            <h1 className="home-title">Chào mừng trở lại, Alex</h1>
            <p className="home-subtitle">
              Quản lý ngựa và yêu cầu vận chuyển ở một nơi.
            </p>
          </div>

          <button
            className="primary-button"
            onClick={() => navigate("/customer/requests/new")}
          >
            <span className="button-plus">+</span>
            Tạo yêu cầu vận chuyển
          </button>
        </section>

        {/* Main Dashboard 2-Column Grid */}
        <section className="home-dashboard-grid">
          {/* Current Trip Card */}
          <article className="home-card current-trip-card">
            <div className="card-header">
              <h2>Chuyến hiện tại</h2>
              <span className="status status-transit">Đang vận chuyển</span>
            </div>

            <div className="trip-information">
              <div className="trip-field">
                <span className="trip-label">Ngựa</span>
                <strong>{currentTrip.horse}</strong>
              </div>

              <div className="trip-field">
                <span className="trip-label">Tuyến đường</span>
                <strong>
                  {currentTrip.origin}
                  <span className="route-arrow">→</span>
                  {currentTrip.destination}
                </strong>
              </div>
            </div>

            <div className="progress-information">
              <span>Khởi hành: {currentTrip.departedDate}</span>
              <strong>Dự kiến đến: {currentTrip.eta}</strong>
            </div>

            <div className="trip-progress">
              <div
                className="trip-progress-value"
                style={{ width: `${currentTrip.progress}%` }}
              />
              <span
                className="trip-progress-point"
                style={{ left: `${currentTrip.progress}%` }}
              />
            </div>

            <p className="current-location">
              Mốc đã xác nhận gần nhất:{" "}
              <strong>{currentTrip.lastMilestone}</strong> • {currentTrip.milestoneTime}
            </p>

            <button
              className="secondary-button tracking-button"
              onClick={() => setShowTrackingModal(true)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: "16px", height: "16px", marginRight: "6px" }}
              >
                <path d="M12 21s-6-5.33-6-10a6 6 0 0 1 12 0c0 4.67-6 10-6 10z" />
                <circle cx="12" cy="11" r="2.5" />
              </svg>
              Xem theo dõi chuyến đi
            </button>
          </article>

          {/* Notifications Card */}
          <article className="home-card notifications-card">
            <div className="notifications-header">
              <div className="title-with-badge">
                <h2>Thông báo</h2>
                <span className="count-pill">7 chưa đọc</span>
              </div>
              <button
                className="text-button"
                onClick={() => navigate("/customer/requests")}
              >
                Xem tất cả
              </button>
            </div>

            <div className="notifications-list">
              {customerNotifications.slice(0, 3).map((notif) => (
                <div
                  key={notif.id}
                  className="notification-item"
                  onClick={() => navigate("/customer/requests")}
                >
                  <div className="notif-icon-circle">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>

                  <div className="notif-body">
                    <div className="notif-title">
                      <span className="orange-dot">•</span> {notif.title}
                    </div>
                    <div className="notif-desc">{notif.body}</div>
                    <div className="notif-time">{notif.time}</div>
                  </div>

                  <span className="notif-arrow">›</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* Recent Requests Section */}
        <section className="home-card recent-requests-card">
          <div className="recent-header">
            <h2>Yêu cầu vận chuyển gần đây</h2>
            <button
              className="text-button"
              onClick={() => navigate("/customer/requests")}
            >
              Xem tất cả
            </button>
          </div>

          <div className="table-wrapper">
            <table className="request-table">
              <thead>
                <tr>
                  <th>Mã yêu cầu</th>
                  <th>Tuyến đường</th>
                  <th>Ngựa</th>
                  <th>Ngày yêu cầu</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="request-id">{request.id}</td>
                    <td>
                      {request.origin}{" "}
                      <span className="table-arrow">→</span>{" "}
                      {request.destination}
                    </td>
                    <td>{request.horses}</td>
                    <td>{formatDate(request.requestedDate)}</td>
                    <td>{getRequestStatusBadge(request.status)}</td>
                    <td>
                      <button
                        className="text-link-action"
                        onClick={() =>
                          navigate(`/customer/requests/${request.id}`)
                        }
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

        {/* Quick Tracking Detail Modal */}
        {showTrackingModal && (
          <div
            className="customer-modal-overlay"
            onClick={() => setShowTrackingModal(false)}
          >
            <div
              className="customer-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">
                    Tiến độ chuyến đi: {currentTrip.requestId}
                  </h3>
                  <p className="modal-subtitle">
                    {currentTrip.origin} → {currentTrip.destination} • Ngựa:{" "}
                    {currentTrip.horse}
                  </p>
                </div>
                <button
                  className="modal-close"
                  onClick={() => setShowTrackingModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="tracking-summary-box">
                  <div className="summary-item">
                    <span>Khởi hành</span>
                    <b>{currentTrip.departedDate}</b>
                  </div>
                  <div className="summary-item">
                    <span>Dự kiến đến</span>
                    <b style={{ color: "#ea580c" }}>{currentTrip.eta}</b>
                  </div>
                  <div className="summary-item">
                    <span>Trạng thái</span>
                    <span className="status status-transit">Đang vận chuyển</span>
                  </div>
                </div>

                <div className="tracking-milestone-list">
                  <div className="milestone-item done">
                    <div className="milestone-icon">✓</div>
                    <div className="milestone-content">
                      <b>Xuất phát từ trang trại TP. Hồ Chí Minh</b>
                      <span>Xe chuyên dụng CBN-02 • 4/10, 07:00</span>
                    </div>
                  </div>
                  <div className="milestone-item current">
                    <div className="milestone-icon">●</div>
                    <div className="milestone-content">
                      <b>Đã đến tại checkpoint – Moc Bai Border Gate</b>
                      <span>Thủ tục kiểm dịch & hải quan • 4/10, 10:00</span>
                    </div>
                  </div>
                  <div className="milestone-item planned">
                    <div className="milestone-icon">○</div>
                    <div className="milestone-content">
                      <b>Quá cảnh Phnom Penh & Chăm sóc ngựa</b>
                      <span>Dự kiến 5/10, 08:00</span>
                    </div>
                  </div>
                  <div className="milestone-item planned">
                    <div className="milestone-icon">○</div>
                    <div className="milestone-content">
                      <b>Bàn giao tại điểm đến – Bangkok</b>
                      <span>Dự kiến 6/10, 16:00</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="primary-button"
                  onClick={() => setShowTrackingModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}

export default HomePage;