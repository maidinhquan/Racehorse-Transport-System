import React from 'react';
import './DriverDashboard.css';

function DriverDashboard() {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="header-title">Mã chuyến: TRP-2026</h1>
        <p className="header-status">Trạng thái: Đang di chuyển</p>
      </header>

      <div className="action-group">
        <button className="btn btn-primary">
          Cập nhật mốc hành trình
        </button>

        <button className="btn btn-secondary">
          Ghi nhật ký y tế (Equine Health)
        </button>

        <button className="btn btn-secondary">
          Xác nhận bàn giao (Nhập OTP)
        </button>

        <button className="btn btn-danger">
          Gửi cảnh báo SOS
        </button>
      </div>
    </div>
  );
}

export default DriverDashboard;