import { useState } from 'react';
import { DemoDataToggle, ThemeToggle } from '../../shared/components';
import './DriverDashboard.css';

// ==========================================
// THÀNH PHẦN 1: GIAO DIỆN TÀI XẾ (DRIVER)
// ==========================================
const DriverView = () => (
  <div className="fade-in">
    <div className="page-header">
      <div>
        <h1 className="page-title">Cập nhật Lộ trình - TRP-2026</h1>
        <p className="page-subtitle">Tuyến đường: Hồ Chí Minh ➡️ Bangkok | Biển số: 51C-123.45</p>
      </div>
      <button className="btn-danger">⚠️ Báo cáo Sự cố (SOS)</button>
    </div>

    <div className="dashboard-card">
      <h2 className="card-title">Tiến độ Chuyến đi</h2>
      
      {/* Stepper Tracking */}
      <div className="stepper-container">
        <div className="step-item completed">
          <div className="step-marker">✓</div>
          <span className="step-label">Xuất phát (HCM)</span>
          <span className="step-time">08:00 AM</span>
        </div>
        <div className="step-item current">
          <div className="step-marker">2</div>
          <span className="step-label">Trạm Mộc Bài</span>
          <span className="step-time">ETA: 10:30 AM</span>
        </div>
        <div className="step-item">
          <div className="step-marker">3</div>
          <span className="step-label">Cửa khẩu Bavet</span>
          <span className="step-time">Chưa đến</span>
        </div>
        <div className="step-item">
          <div className="step-marker">4</div>
          <span className="step-label">Đích (Bangkok)</span>
          <span className="step-time">Chưa đến</span>
        </div>
      </div>

      <hr style={{ border: 0, borderTop: '1px solid #E5E7EB', margin: '32px 0' }} />

      {/* Form Checklist cập nhật chặng */}
      <h2 className="card-title" style={{ color: '#F57C00' }}>Checklist: Xác nhận đến Trạm Mộc Bài</h2>
      <div className="form-grid" style={{ marginBottom: '24px' }}>
        <div className="form-group">
          <label className="form-label">Tọa độ GPS hiện tại (Bắt buộc)</label>
          <div className="input-with-button">
            <input type="text" className="form-input" style={{ flex: 1, backgroundColor: '#F9FAFB' }} value="11.0782° N, 106.1416° E" readOnly />
            <button className="btn-outline">📍 Lấy tọa độ</button>
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Hình ảnh bối cảnh (Bắt buộc)</label>
          <label className="file-upload">
            📷 Click để chụp ảnh / Tải lên minh chứng trạm dừng
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} />
          </label>
        </div>
      </div>
      
      <button className="btn-primary" style={{ width: '100%' }}>Xác nhận đã đến Trạm</button>
    </div>
  </div>
);

// ==========================================
// THÀNH PHẦN 2: GIAO DIỆN HỘ TỐNG (ESCORT)
// ==========================================
const EscortView = () => (
  <div className="fade-in">
    <div className="page-header">
      <div>
        <h1 className="page-title">Nhật ký Y tế Ngựa - TRP-2026</h1>
        <p className="page-subtitle">Cập nhật định kỳ sinh hiệu và tài sản đi kèm của cá thể ngựa.</p>
      </div>
      <button className="btn-danger">🚑 Báo cáo Y tế Khẩn cấp</button>
    </div>

    <div className="dashboard-card">
      <h2 className="card-title">Danh sách cá thể ngựa trên chuyến</h2>
      
      <div className="horse-grid">
        {/* Card Ngựa 1 */}
        <div className="dashboard-card" style={{ boxShadow: 'none', margin: 0, padding: '20px' }}>
          <div className="horse-header">
            <div className="horse-avatar">🐴</div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>Thunderbolt</h3>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Chip: 982001928374</p>
            </div>
          </div>
          
          {/* Form Checklist Y tế */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Thể trạng (*)</label>
            <select className="form-select" style={{ borderColor: '#10B981', color: '#059669', backgroundColor: '#F0FDF4' }}>
              <option>✅ Bình thường / Ổn định</option>
              <option>⚠️ Căng thẳng</option>
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

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Chăm sóc & Tiện ích đi kèm</label>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#374151' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" defaultChecked /> Đã cho ăn</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" defaultChecked /> Đã uống nước</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" /> Chăn phủ</label>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Hình ảnh cận cảnh (Bắt buộc)</label>
            <label className="file-upload" style={{ padding: '16px' }}>
              📷 Tải ảnh ngựa lên
              <input type="file" accept="image/*" style={{ display: 'none' }} />
            </label>
          </div>

          <button className="btn-primary" style={{ width: '100%' }}>Lưu Nhật ký Y tế</button>
        </div>

        {/* Card Ngựa 2 */}
        <div className="dashboard-card" style={{ boxShadow: 'none', margin: 0, padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div className="horse-header">
            <div className="horse-avatar">🐴</div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>Shadowfax</h3>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Chip: 982002112233</p>
            </div>
          </div>
          <button className="btn-outline" style={{ marginTop: 'auto' }}>➕ Mở form ghi nhật ký</button>
        </div>
      </div>
    </div>
  </div>
);

// ==========================================
// MAIN COMPONENT
// ==========================================
function DriverDashboard() {
  const [activeTab, setActiveTab] = useState('driver');

  return (
    <div className="driver-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="brand-title">CNB <span>TRANSPORT</span></h2>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'driver' ? 'active' : ''}`}
            onClick={() => setActiveTab('driver')}
          >
            🚚 Trang của Tài xế
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'escort' ? 'active' : ''}`}
            onClick={() => setActiveTab('escort')}
          >
            🩺 Trang của Hộ tống
          </button>

          <hr style={{ border: 0, borderTop: '1px solid #E5E7EB', margin: '8px 0' }} />
          
          <button className="nav-item">📋 Chi tiết chuyến đi</button>
          <button className="nav-item">🔔 Thông báo / Yêu cầu</button>
        </nav>
      </aside>

      {/* CONTENT WRAPPER */}
      <div className="content-wrapper">
        
        {/* TOP BAR */}
        <header className="top-bar">
          <h2 className="top-bar-title">{activeTab === 'driver' ? 'Dashboard Tài xế' : 'Dashboard Hộ tống'}</h2>
          
          <div className="top-bar-right">
            <DemoDataToggle role="driver" />
            <ThemeToggle showLabel={false} />
            <button className="notification-btn">
              🔔
              <span className="notification-badge"></span>
            </button>
            
            <div className="user-profile">
              <div className="avatar">
                {((localStorage.getItem('userFullName') || 'Hoàng Hùng').replace(/\s*\([^)]*\)/g, '').trim().split(' ').filter(Boolean).map((p) => p[0]).join('').slice(-2).toUpperCase()) || 'HH'}
              </div>
              <div className="user-info">
                <span className="user-name">{(localStorage.getItem('userFullName') || 'Hoàng Hùng').replace(/\s*\([^)]*\)/g, '').trim()}</span>
                <span className="user-role">{activeTab === 'driver' ? 'Tài xế chính' : 'Nhân viên Hộ tống'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="main-content">
          {activeTab === 'driver' ? <DriverView /> : <EscortView />}
        </main>
      </div>
    </div>
  );
}

export default DriverDashboard;