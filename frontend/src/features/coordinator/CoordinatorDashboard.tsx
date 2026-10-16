import { useState, useEffect } from 'react';
import './CoordinatorDashboard.css';

function CoordinatorDashboard() {
  // Đặt mặc định là 'monitoring' để bạn xem ngay phần Bản đồ
  const [activeMenu, setActiveMenu] = useState('monitoring');
  const [truckPos, setTruckPos] = useState({ lat: 11.5560, lng: 104.9280 });

  // Giả lập GPS update liên tục cho Marker Xe tải
  useEffect(() => {
    if (activeMenu === 'monitoring') {
      const interval = setInterval(() => {
        setTruckPos(prev => ({
          lat: prev.lat + (Math.random() * 0.001 - 0.0005),
          lng: prev.lng + 0.005
        }));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeMenu]);

  const getTopBarTitle = () => {
    switch (activeMenu) {
      case 'dashboard': return 'Dashboard Tổng quan';
      case 'planning-requests': return 'Yêu cầu Lập kế hoạch (Requests)';
      case 'route-planning': return 'Lập & Điều chỉnh Lộ trình';
      case 'fleet-management': return 'Quản lý Phương tiện (Fleet)';
      case 'crew-assignment': return 'Phân công Nhân sự (Crew)';
      case 'monitoring': return 'Giám sát Lộ trình Bản đồ (Map)';
      case 'incidents': return 'Xử lý Sự cố & Đổi tuyến';
      default: return 'Coordinator Dashboard';
    }
  };

  // ==========================================
  // TAB 1: DASHBOARD
  // ==========================================
  const renderDashboard = () => (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tổng quan Điều phối</h1>
          <p className="page-subtitle">Theo dõi trạng thái đội xe, yêu cầu chờ xử lý và cảnh báo hệ thống.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <div className="dashboard-card" style={{ marginBottom: 0 }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6B7280', fontWeight: 600 }}>Yêu cầu chờ lập KH</p>
          <h3 style={{ margin: 0, fontSize: '32px', color: '#D97706' }}>5</h3>
        </div>
        <div className="dashboard-card" style={{ marginBottom: 0 }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6B7280', fontWeight: 600 }}>Xe tải khả dụng</p>
          <h3 style={{ margin: 0, fontSize: '32px', color: '#10B981' }}>12/15</h3>
        </div>
        <div className="dashboard-card" style={{ marginBottom: 0 }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6B7280', fontWeight: 600 }}>Chuyến đang chạy</p>
          <h3 style={{ margin: 0, fontSize: '32px', color: '#3B82F6' }}>3</h3>
        </div>
        <div className="dashboard-card" style={{ marginBottom: 0 }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6B7280', fontWeight: 600 }}>Cảnh báo sự cố</p>
          <h3 style={{ margin: 0, fontSize: '32px', color: '#EF4444' }}>1</h3>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // TAB 2: PLANNING REQUESTS & ASSIGNMENT
  // ==========================================
  const renderPlanningRequests = () => (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Yêu cầu Lập kế hoạch</h1>
          <p className="page-subtitle">Các yêu cầu đã được duyệt, chờ phân công xe, tài xế và lên lộ trình.</p>
        </div>
      </div>

      <div className="dashboard-card">
        <table>
          <thead>
            <tr>
              <th>MÃ YC</th>
              <th>TUYẾN ĐƯỜNG</th>
              <th>SỐ LƯỢNG NGỰA</th>
              <th>NGÀY ĐI DỰ KIẾN</th>
              <th>TRẠNG THÁI</th>
              <th style={{ textAlign: 'right' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: '600' }}>REQ-1004</td>
              <td>Hồ Chí Minh ➡️ Bangkok</td>
              <td>2 cá thể</td>
              <td>25/10/2026</td>
              <td><span className="status-pill status-pending">Chờ Gán Xe</span></td>
              <td style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="btn-outline">Chọn Xe</button>
                <button className="btn-outline">Chọn Tài xế</button>
                <button className="btn-primary">Lập Lộ trình</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  // ==========================================
  // TAB 3: TRIP MONITORING (CORE MAP LOGIC)
  // ==========================================
  const renderMonitoring = () => (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Giám sát Lộ trình Bản đồ</h1>
          <p className="page-subtitle">Mã chuyến: TRP-2026 | Theo dõi dữ liệu Polyline và Marker theo thời gian thực.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-outline">🔄 Cập nhật Kế hoạch</button>
          <button className="btn-danger">Đổi xe khẩn cấp</button>
        </div>
      </div>

      <div className="map-layout">
        {/* KHU VỰC BẢN ĐỒ MÔ PHỎNG */}
        <div className="map-view">
          {/* Base Map -> Polyline (Tuyến đường) */}
          <div className="map-polyline"></div>
          <div className="map-polyline-dashed"></div>

          {/* Marker Cố định */}
          <div className="map-marker" style={{ left: '10%' }}>
            <div className="marker-icon" style={{ borderColor: '#10B981' }}>📍</div>
            <span className="marker-label">HCMC (Origin)</span>
          </div>
          
          <div className="map-marker" style={{ left: '35%' }}>
            <div className="marker-icon">🅿️</div>
            <span className="marker-label">Rest Stop</span>
          </div>
          
          <div className="map-marker" style={{ left: '60%' }}>
            <div className="marker-icon">🛂</div>
            <span className="marker-label">Customs (Bavet)</span>
          </div>
          
          <div className="map-marker" style={{ left: '90%' }}>
            <div className="marker-icon" style={{ borderColor: '#EF4444' }}>📍</div>
            <span className="marker-label">Bangkok (Dest)</span>
          </div>

          {/* Marker Động -> Vị trí xe */}
          <div className="map-truck" title="Dynamic Marker">🚚</div>
        </div>

        {/* BẢNG DỮ LIỆU JSON (Hiển thị đúng logic Polyline và Marker) */}
        <div className="map-data-panel">
          <h3 style={{ color: '#F3F4F6', fontSize: '14px', marginBottom: '16px', borderBottom: '1px solid #374151', paddingBottom: '8px' }}>
            🛰️ DATA STREAM
          </h3>
          
          <p style={{ color: '#9CA3AF', marginBottom: '4px' }}>// 1. Vehicle Marker (Cập nhật liên tục)</p>
          <pre style={{ margin: '0 0 24px 0' }}>
{`vehiclePosition = {
  latitude: ${truckPos.lat.toFixed(4)},
  longitude: ${truckPos.lng.toFixed(4)}
}`}
          </pre>

          <p style={{ color: '#9CA3AF', marginBottom: '4px' }}>// 2. Fixed Markers</p>
          <pre style={{ margin: '0 0 24px 0', color: '#FCD34D' }}>
{`origin = { lat: 10.823, lng: 106.629 }
restStop = { lat: 11.065, lng: 106.172 }
destination = { lat: 13.756, lng: 100.501 }`}
          </pre>

          <p style={{ color: '#9CA3AF', marginBottom: '4px' }}>// 3. Route Polyline (Mảng tọa độ)</p>
          <pre style={{ margin: 0, color: '#93C5FD' }}>
{`const routePolyline = [
  [10.8231, 106.6297],
  [11.0650, 106.1720],
  [11.5560, 104.9280],
  [13.6560, 102.5620],
  [13.7563, 100.5018]
]`}
          </pre>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard': return renderDashboard();
      case 'planning-requests': return renderPlanningRequests();
      case 'monitoring': return renderMonitoring();
      // Các trang khác dùng chung layout trắng tạm thời
      default: return (
        <div className="fade-in text-center mt-20 text-[#6B7280]">
          <h2>Giao diện {getTopBarTitle()} đang được tích hợp API...</h2>
        </div>
      );
    }
  };

  return (
    <div className="coordinator-layout">
      {/* 1. SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="brand-title">CNB <span>TRANSPORT</span></h2>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-group-title">TỔNG QUAN</div>
          <button 
            className={`nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveMenu('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`nav-item ${activeMenu === 'planning-requests' ? 'active' : ''}`}
            onClick={() => setActiveMenu('planning-requests')}
          >
            <span>Planning Requests</span>
            <span className="badge-alert">5</span>
          </button>

          <div className="nav-group-title">LẬP KẾ HOẠCH & ĐỘI XE</div>
          <button 
            className={`nav-item ${activeMenu === 'route-planning' ? 'active' : ''}`}
            onClick={() => setActiveMenu('route-planning')}
          >
            Route Planning
          </button>
          <button 
            className={`nav-item ${activeMenu === 'fleet-management' ? 'active' : ''}`}
            onClick={() => setActiveMenu('fleet-management')}
          >
            Fleet Management
          </button>
          <button 
            className={`nav-item ${activeMenu === 'crew-assignment' ? 'active' : ''}`}
            onClick={() => setActiveMenu('crew-assignment')}
          >
            Driver / Escort Assign
          </button>

          <div className="nav-group-title">GIÁM SÁT & SỰ CỐ</div>
          <button 
            className={`nav-item ${activeMenu === 'monitoring' ? 'active' : ''}`}
            onClick={() => setActiveMenu('monitoring')}
          >
            Trip Monitoring
          </button>
          <button 
            className={`nav-item ${activeMenu === 'incidents' ? 'active' : ''}`}
            onClick={() => setActiveMenu('incidents')}
          >
            Incident Adjustment
          </button>
        </nav>
      </aside>

      {/* 2. TOP BAR & MAIN CONTENT */}
      <div className="content-wrapper">
        <header className="top-bar">
          <div className="top-bar-left">
            <h1 className="top-bar-title">{getTopBarTitle()}</h1>
          </div>
          
          <div className="top-bar-right">
            <button className="notification-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="notification-badge"></span>
            </button>
            
            <div className="user-profile">
              <div className="avatar">QL</div>
              <div className="user-info">
                <span className="user-name">Nguyễn Thanh Quốc Linh</span>
                <span className="user-role">Coordinator</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </header>

        <main className="main-content">
          <p><a href="/coordinator/flow1-work">Tiếp nhận chuyến đã xác nhận từ Flow 1</a></p>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default CoordinatorDashboard;
