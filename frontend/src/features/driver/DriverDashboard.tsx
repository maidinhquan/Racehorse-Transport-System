import { useState } from 'react';
import './DriverDashboard.css';

function DriverDashboard() {
  const [activeMenu, setActiveMenu] = useState('driver-trips');

  // Đổi tên trang trên Top Bar
  const getTopBarTitle = () => {
    switch (activeMenu) {
      case 'driver-trips':
        return 'My Trips / Dashboard';
      case 'driver-update':
        return 'Trip Detail & Status Update';
      case 'escort-welfare':
        return 'Horse Check & Welfare';
      case 'incident':
        return 'Incident Reporting';
      case 'notifications':
        return 'Notifications & Tasks';
      default:
        return 'Driver Dashboard';
    }
  };

  // ==========================================
  // TAB 1: MY TRIPS (TÀI XẾ)
  // ==========================================
  const renderMyTrips = () => (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Chuyến đi được phân công</h1>
        <p className="page-subtitle">Xem thông tin tổng quan các chuyến bạn đang phụ trách.</p>
      </div>

      <div className="dashboard-card">
        <h2 className="card-title">Chuyến đang thực hiện</h2>
        <div
          style={{
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            backgroundColor: '#F9FAFB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>
              TRP-2026
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '0' }}>Hồ Chí Minh ➡️ Bangkok</p>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0', fontWeight: '500' }}>
              Biển số: 51C-123.45 | Số lượng: 2 ngựa
            </p>
          </div>
          <button className="btn-primary" onClick={() => setActiveMenu('driver-update')}>
            Vào chi tiết & Cập nhật
          </button>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // TAB 2: TRIP STATUS UPDATE (TÀI XẾ)
  // ==========================================
  const renderStatusUpdate = () => (
    <div className="fade-in">
      <div className="page-header flex justify-between items-end">
        <div>
          <h1 className="page-title">Cập nhật Trạng thái Chặng (Trip Status)</h1>
          <p className="page-subtitle">Xác nhận tọa độ GPS và tiến độ hành trình theo thời gian thực.</p>
        </div>
      </div>

      <div className="dashboard-card">
        <h2 className="card-title">Checklist Mốc hiện tại: Đến Cửa khẩu Bavet</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Tọa độ GPS hiện tại</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1, backgroundColor: '#F3F4F6' }}
                value="11.0782° N, 106.1416° E"
                readOnly
              />
              <button className="btn-primary" style={{ padding: '0 16px' }}>
                Làm mới GPS
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Trạng thái chặng hành trình</label>
            <select className="form-select">
              <option>Đã đến cửa khẩu (Chờ thông quan)</option>
              <option>Đã thông quan thành công</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Hình ảnh minh chứng hiện trường (Bắt buộc)</label>
            <label className="file-upload">
              📷 Click để chụp ảnh / Tải file từ máy
              <input type="file" accept="image/*" style={{ display: 'none' }} />
            </label>
          </div>
        </div>
        <button className="btn-primary" style={{ width: '100%', marginTop: '24px' }}>
          Xác nhận & Cập nhật mốc
        </button>
      </div>
    </div>
  );

  // ==========================================
  // TAB 3: HORSE WELFARE (HỘ TỐNG)
  // ==========================================
  const renderHorseWelfare = () => (
    <div className="fade-in">
      <div className="page-header flex justify-between items-end">
        <div>
          <h1 className="page-title">Ghi nhận Tình trạng Ngựa (Equine Welfare)</h1>
          <p className="page-subtitle">Nhật ký y tế định kỳ trong quá trình di chuyển.</p>
        </div>
        <button className="btn-danger" onClick={() => setActiveMenu('incident')}>
          🚑 Báo Y tế Khẩn cấp
        </button>
      </div>

      <div className="horse-grid">
        <div className="dashboard-card" style={{ marginBottom: '0' }}>
          <div className="horse-header">
            <div className="horse-avatar">🐴</div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0' }}>Thunderbolt</h3>
              <p style={{ fontSize: '12px', color: '#6B7280', margin: '0' }}>Microchip: 982001928374</p>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Thể trạng lâm sàng (*)</label>
            <select
              className="form-select"
              style={{ borderColor: '#10B981', color: '#059669', backgroundColor: '#D1FAE5', fontWeight: '600' }}
            >
              <option>✅ Bình thường / Ổn định</option>
              <option>⚠️ Căng thẳng / Stress</option>
              <option>❌ Bỏ ăn / Sốt</option>
            </select>
          </div>

          <div className="form-grid" style={{ gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Nhiệt độ (°C)</label>
              <input type="number" className="form-input" placeholder="VD: 37.5" />
            </div>
            <div className="form-group">
              <label className="form-label">Nhịp tim (bpm)</label>
              <input type="number" className="form-input" placeholder="VD: 40" />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Tiêu thụ (Chăm sóc)</label>
            <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#374151' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" defaultChecked /> Đã cho ăn
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" defaultChecked /> Đã cho uống nước
              </label>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Ảnh chứng minh hiện trạng (*)</label>
            <label className="file-upload" style={{ padding: '16px' }}>
              📷 Tải ảnh ngựa trong chuồng
            </label>
          </div>

          <button className="btn-primary" style={{ width: '100%' }}>
            Lưu Nhật ký
          </button>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // TAB 4: INCIDENTS (CHUNG)
  // ==========================================
  const renderIncident = () => (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title" style={{ color: '#EF4444' }}>Báo cáo Sự cố Hiện trường (SOS)</h1>
        <p className="page-subtitle">Gửi ngay thông tin về trung tâm điều hành nếu xe hỏng hoặc ngựa có vấn đề.</p>
      </div>
      <div className="dashboard-card" style={{ maxWidth: '800px' }}>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Loại sự cố (*)</label>
          <select className="form-select">
            <option>Hỏng xe / Tai nạn giao thông</option>
            <option>Sự cố y tế của ngựa (Colic, Sốc nhiệt...)</option>
            <option>Tắc nghẽn hải quan / Kẹt xe kéo dài</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Mô tả chi tiết</label>
          <textarea
            className="form-input"
            style={{ height: '100px', paddingTop: '12px', resize: 'none' }}
            placeholder="Nhập chi tiết tình hình thực tế..."
          ></textarea>
        </div>
        <div className="form-group" style={{ marginBottom: '32px' }}>
          <label className="form-label">Hình ảnh hiện trường (Bắt buộc)</label>
          <label className="file-upload">📷 Tải ảnh sự cố</label>
        </div>
        <button className="btn-danger" style={{ width: '100%' }}>
          Gửi Báo Cáo SOS Về Trung Tâm
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeMenu) {
      case 'driver-trips':
        return renderMyTrips();
      case 'driver-update':
        return renderStatusUpdate();
      case 'escort-welfare':
        return renderHorseWelfare();
      case 'incident':
        return renderIncident();
      default:
        return renderMyTrips();
    }
  };

  return (
    <div className="driver-layout">
      {/* 1. SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="brand-title">
            CNB <span>TRANSPORT</span>
          </h2>
        </div>

        <nav className="sidebar-nav">
          {/* PHÂN VÙNG CỦA TÀI XẾ */}
          <div className="nav-group-title">🚚 TÀI XẾ (DRIVER)</div>
          <button
            className={`nav-item ${activeMenu === 'driver-trips' ? 'active' : ''}`}
            onClick={() => setActiveMenu('driver-trips')}
          >
            Dashboard / My Trips
          </button>
          <button
            className={`nav-item ${activeMenu === 'driver-update' ? 'active' : ''}`}
            onClick={() => setActiveMenu('driver-update')}
          >
            Trip Status Update
          </button>

          {/* PHÂN VÙNG CỦA HỘ TỐNG */}
          <div className="nav-group-title" style={{ marginTop: '24px' }}>
            🩺 HỘ TỐNG (ESCORT)
          </div>
          <button
            className={`nav-item ${activeMenu === 'escort-welfare' ? 'active' : ''}`}
            onClick={() => setActiveMenu('escort-welfare')}
          >
            Horse Check & Welfare
          </button>

          {/* CHUNG */}
          <div className="nav-group-title" style={{ marginTop: '24px' }}>
            ⚠️ CHUNG
          </div>
          <button
            className={`nav-item ${activeMenu === 'incident' ? 'active' : ''}`}
            onClick={() => setActiveMenu('incident')}
          >
            Incident Reporting
          </button>
          <button
            className={`nav-item ${activeMenu === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveMenu('notifications')}
          >
            Notifications (2)
          </button>
        </nav>
      </aside>

      {/* 2. KHỐI NỘI DUNG (TOP BAR + MAIN CONTENT) */}
      <div className="content-wrapper">
        {/* TOP BAR */}
        <header className="top-bar">
          <div className="top-bar-left">
            <h1 className="top-bar-title">{getTopBarTitle()}</h1>
          </div>

          <div className="top-bar-right">
            {/* Chuông thông báo */}
            <button className="notification-btn" aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="notification-badge"></span>
            </button>

            {/* User Profile */}
            <div className="user-profile">
              <div className="avatar">DR</div>
              <div className="user-info">
                <span className="user-name">Trần Văn Tài</span>
                <span className="user-role">Field Operations</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </header>

        {/* NỘI DUNG CHÍNH */}
        <main className="main-content">{renderContent()}</main>
      </div>
    </div>
  );
}

export default DriverDashboard;