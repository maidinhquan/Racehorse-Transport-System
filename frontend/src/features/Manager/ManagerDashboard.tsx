import { useState } from 'react';
import './ManagerDashboard.css';
import ThemeToggle from '../../shared/components/ThemeToggle/ThemeToggle';

function ManagerDashboard() {
  const [activePage, setActivePage] = useState('dashboard');
  const [pendingCount] = useState(3);

  // Dữ liệu mô phỏng
  const pendingRequests = [
    { id: 'REQ-1001', customer: 'CLB Phù Đổng', route: 'Đà Lạt ➡️ HCM', horses: '2 cá thể', date: '12/10/2026' },
    { id: 'REQ-1002', customer: 'Trại Ngựa ABC', route: 'HCM ➡️ Bangkok', horses: '5 cá thể', date: '15/10/2026' },
    { id: 'REQ-1003', customer: 'Khu du lịch XYZ', route: 'Hà Nội ➡️ Seoul', horses: '1 cá thể', date: '16/10/2026' },
  ];

  const activeTrips = [
    { id: 'TRP-2026', route: 'Hồ Chí Minh ➡️ Tokyo', status: 'Đang di chuyển', statusClass: 'status-transit', eta: '18:00, 15/10/2026' },
    { id: 'TRP-2027', route: 'Hà Nội ➡️ Paris', status: 'Sẵn sàng khởi hành', statusClass: 'status-ready', eta: '09:00, 18/10/2026' },
  ];

  // --- TRANG 1: TỔNG QUAN ---
  const renderDashboardOverview = () => (
    <div className="fade-in">
      <header>
        <h1 className="page-title">Tổng quan Điều hành</h1>
        <p className="page-subtitle">Theo dõi toàn cảnh vận chuyển, phê duyệt yêu cầu và xử lý sự cố.</p>
      </header>
      <div className="stats-grid">
        <div className="stat-card">
          <h3 className="stat-title">Yêu cầu chờ duyệt</h3>
          <p className="stat-value text-danger">{pendingCount}</p>
        </div>
        <div className="stat-card">
          <h3 className="stat-title">Chuyến đang chạy</h3>
          <p className="stat-value text-warning">{activeTrips.length}</p>
        </div>
        <div className="stat-card">
          <h3 className="stat-title">Sự cố khẩn cấp</h3>
          <p className="stat-value text-dark">0</p>
        </div>
        <div className="stat-card">
          <h3 className="stat-title">Tỷ lệ đúng giờ (OTD)</h3>
          <p className="stat-value text-success">98.5%</p>
        </div>
      </div>
    </div>
  );

  // --- TRANG 2: DUYỆT YÊU CẦU ---
  const renderRequestsPage = () => (
    <div className="fade-in flex-col-full">
      <header>
        <h1 className="page-title">Duyệt Yêu cầu Vận chuyển</h1>
        <p className="page-subtitle">Xem xét tính khả thi và phê duyệt các đơn đặt dịch vụ từ khách hàng.</p>
      </header>
      <section className="data-section">
        <div className="table-container">
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
                    <button className="btn-primary">Xem & Duyệt</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  // --- TRANG 3: QUẢN LÝ CHUYẾN ĐI ---
  const renderTripsPage = () => (
    <div className="fade-in flex-col-full">
      <header>
        <h1 className="page-title">Quản lý Chuyến đi</h1>
        <p className="page-subtitle">Theo dõi trạng thái, kế hoạch lộ trình và giấy tờ của các chuyến đang hoạt động.</p>
      </header>
      <section className="data-section">
        <div className="table-container">
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
        </div>
      </section>
    </div>
  );

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard': return renderDashboardOverview();
      case 'requests': return renderRequestsPage();
      case 'trips': return renderTripsPage();
      default: return renderDashboardOverview();
    }
  };

  return (
    <div className="manager-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="brand-title">HorseTrans</h2>
          <p className="role-title">Logistics Manager Portal</p>
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
            <span>Duyệt Yêu cầu (Requests)</span>
            {pendingCount > 0 && <span className="badge-alert">{pendingCount}</span>}
          </button>

          <button
            className={`nav-item ${activePage === 'trips' ? 'active' : ''}`}
            onClick={() => setActivePage('trips')}
          >
            <span>Quản lý Chuyến đi (Trips)</span>
          </button>

          <button className="nav-item"><span>Hồ sơ & Kiểm dịch (Docs)</span></button>
          <button className="nav-item"><span>Quản lý Sự cố (Incidents)</span></button>
          <button className="nav-item"><span>Khách hàng & Đối tác</span></button>
          <button className="nav-item"><span>Báo cáo Thống kê</span></button>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default ManagerDashboard;