/// <reference types="vite/client" />

import { useState } from 'react';
import './ManagerDashboard.css';
import ThemeToggle from '../../shared/components/ThemeToggle/ThemeToggle';

function ManagerDashboard() {
  const [activePage, setActivePage] = useState('dashboard');
  const [pendingCount] = useState(3);

  const pendingRequests = [
    { id: 'REQ-1001', customer: 'CLB Phù Đổng', route: 'Đà Lạt ➡️ HCM', horses: '2 cá thể', date: '12/10/2026' },
    { id: 'REQ-1002', customer: 'Trại Ngựa ABC', route: 'HCM ➡️ Bangkok', horses: '5 cá thể', date: '15/10/2026' },
    { id: 'REQ-1003', customer: 'Khu du lịch XYZ', route: 'Hà Nội ➡️ Seoul', horses: '1 cá thể', date: '16/10/2026' },
  ];

  const activeTrips = [
    { id: 'TRP-2026', route: 'Hồ Chí Minh ➡️ Tokyo', status: 'Đang di chuyển', statusClass: 'status-transit', eta: '18:00, 15/10/2026' },
    { id: 'TRP-2027', route: 'Hà Nội ➡️ Paris', status: 'Sẵn sàng khởi hành', statusClass: 'status-ready', eta: '09:00, 18/10/2026' },
  ];

  const getTopBarTitle = () => {
    switch (activePage) {
      case 'dashboard':
        return 'Home / Dashboard';
      case 'requests':
        return 'Transport Requests';
      case 'trips':
        return 'Trip Management';
      case 'incidents':
        return 'Incident Management';
      default:
        return 'Home';
    }
  };

  const renderDashboardOverview = () => (
    <div className="fade-in flex flex-col h-full">
      <div className="page-header">
        <h1 className="page-title">Tổng quan Điều hành</h1>
        <p className="page-subtitle">Theo dõi toàn cảnh vận chuyển, phê duyệt yêu cầu và xử lý sự cố.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3 className="stat-title">Yêu cầu chờ duyệt</h3>
          <p className="stat-value text-[#EF4444]">{pendingCount}</p>
        </div>
        <div className="stat-card">
          <h3 className="stat-title">Chuyến đang chạy</h3>
          <p className="stat-value text-[#F57C00]">{activeTrips.length}</p>
        </div>
        <div className="stat-card">
          <h3 className="stat-title">Sự cố khẩn cấp</h3>
          <p className="stat-value text-[#111827]">0</p>
        </div>
        <div className="stat-card">
          <h3 className="stat-title">Tỷ lệ đúng giờ (OTD)</h3>
          <p className="stat-value text-[#10B981]">98.5%</p>
        </div>
      </div>
    </div>
  );

  const renderRequestsPage = () => (
    <div className="fade-in flex flex-col h-full">
      <div className="page-header">
        <h1 className="page-title">Duyệt Yêu cầu Vận chuyển</h1>
        <p className="page-subtitle">Xem xét tính khả thi và phê duyệt các đơn đặt dịch vụ từ khách hàng.</p>
      </div>
      <section className="data-section">
        <table>
          <thead>
            <tr>
              <th>MÃ YC</th>
              <th>KHÁCH HÀNG</th>
              <th>TUYẾN ĐƯỜNG</th>
              <th>SỐ LƯỢNG NGỰA</th>
              <th>NGÀY DỰ KIẾN</th>
              <th style={{ textAlign: 'right' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {pendingRequests.map((req) => (
              <tr key={req.id}>
                <td style={{ fontWeight: '600' }}>{req.id}</td>
                <td>{req.customer}</td>
                <td>{req.route}</td>
                <td>{req.horses}</td>
                <td>{req.date}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn-primary">Xem &amp; Duyệt</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );

  const renderTripsPage = () => (
    <div className="fade-in flex flex-col h-full">
      <div className="page-header">
        <h1 className="page-title">Quản lý Chuyến đi</h1>
        <p className="page-subtitle">Theo dõi trạng thái, kế hoạch lộ trình và giấy tờ của các chuyến đang hoạt động.</p>
      </div>
      <section className="data-section">
        <table>
          <thead>
            <tr>
              <th>MÃ CHUYẾN</th>
              <th>TUYẾN ĐƯỜNG</th>
              <th>TRẠNG THÁI</th>
              <th>ETA (DỰ KIẾN ĐẾN)</th>
              <th style={{ textAlign: 'right' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {activeTrips.map((trip) => (
              <tr key={trip.id}>
                <td style={{ fontWeight: '600' }}>{trip.id}</td>
                <td>{trip.route}</td>
                <td>
                  <span className={`status-pill ${trip.statusClass}`}>
                    {trip.status}
                  </span>
                </td>
                <td>{trip.eta}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn-secondary">Chi tiết chuyến</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return renderDashboardOverview();
      case 'requests':
        return renderRequestsPage();
      case 'trips':
        return renderTripsPage();
      default:
        return renderDashboardOverview();
    }
  };

  return (
    <div className="manager-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="brand-title">CNB <span>TRANSPORT</span></h2>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActivePage('dashboard')}
          >
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${activePage === 'requests' ? 'active' : ''}`}
            onClick={() => setActivePage('requests')}
          >
            <span>Transport Requests</span>
            {pendingCount > 0 && <span className="badge-alert">{pendingCount}</span>}
          </button>

          <button
            className={`nav-item ${activePage === 'trips' ? 'active' : ''}`}
            onClick={() => setActivePage('trips')}
          >
            <span>Trip Management</span>
          </button>

          <button className="nav-item"><span>Document Overview</span></button>
          <button className="nav-item"><span>Incident Management</span></button>
          <button className="nav-item"><span>Customer Management</span></button>
          <button className="nav-item"><span>Reports &amp; Analytics</span></button>
        </nav>
      </aside>

      <div className="content-wrapper">
        <header className="top-bar">
          <div className="top-bar-left">
            <h1 className="top-bar-title">{getTopBarTitle()}</h1>
          </div>

          <div className="top-bar-right">
            <ThemeToggle showLabel={false} />
            <button className="notification-btn" aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {pendingCount > 0 && <span className="notification-badge"></span>}
            </button>

            <div className="user-profile">
              <div className="avatar">QL</div>
              <div className="user-info">
                <span className="user-name">Nguyễn Thanh Quốc Linh</span>
                <span className="user-role">Logistics Manager</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </header>

        <main className="main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default ManagerDashboard;