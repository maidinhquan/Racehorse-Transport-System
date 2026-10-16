import { useState } from 'react';
import { BrandLogo } from '../../../../shared/components/brand-logo/BrandLogo';
import './ManagerPortal.css';

export const ManagerPortal = () => {
  const [quotedPrice, setQuotedPrice] = useState(19500);
  const floorPrice = 18000;

  const [locks, setLocks] = useState({
    routeApproved: true,
    staffAssigned: true,
    vehicleReady: true,
    checklist100Percent: false,
  });

  const canDepart = Object.values(locks).every(Boolean);

  return (
    <div className="manager-page">
      <div className="manager-header">
        <BrandLogo />
        <strong>Role: Logistics Manager</strong>
      </div>

      <div className="manager-grid">
        <div className="manager-card">
          <h2 className="manager-card-title">1. Duyệt Đơn & Phát hành Báo giá (Quote Q1)</h2>
          <p className="manager-helper">
            Chi phí kế hoạch (PC) + Biên lợi nhuận tối thiểu = Giá sàn: <strong>${floorPrice.toLocaleString()} USD</strong>
          </p>

          <label className="form-label">Mức báo giá gửi khách hàng (USD)</label>
          <input
            type="number"
            className="form-input"
            value={quotedPrice}
            onChange={(e) => setQuotedPrice(Number(e.target.value))}
          />

          {quotedPrice < floorPrice && (
            <p className="text-danger">
              ❌ Không được gửi báo giá thấp hơn giá sàn (${floorPrice.toLocaleString()} USD).
            </p>
          )}

          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', marginTop: '16px' }}
            disabled={quotedPrice < floorPrice}
            onClick={() => alert('Đã phê duyệt đơn và phát hành Báo giá Q1 cho khách hàng!')}
          >
            Phê duyệt Đơn & Gửi Báo Giá
          </button>
        </div>

        <div className="manager-card">
          <h2 className="manager-card-title">2. Chốt chặn Khởi hành 4 Khóa (4-Lock Gate)</h2>
          <p className="manager-helper">
            Chuyến TRP-2026 chỉ được khởi hành khi cả 4 điều kiện vận hành & pháp lý đều hoàn tất:
          </p>

          <label className="lock-item">
            <span>(1) Lộ trình đã được phê duyệt</span>
            <input
              type="checkbox"
              checked={locks.routeApproved}
              onChange={(e) => setLocks({ ...locks, routeApproved: e.target.checked })}
            />
          </label>
          <label className="lock-item">
            <span>(2) Nhân sự (Driver & Escort) đã phân công đủ</span>
            <input
              type="checkbox"
              checked={locks.staffAssigned}
              onChange={(e) => setLocks({ ...locks, staffAssigned: e.target.checked })}
            />
          </label>
          <label className="lock-item">
            <span>(3) Phương tiện sẵn sàng & không trùng lịch</span>
            <input
              type="checkbox"
              checked={locks.vehicleReady}
              onChange={(e) => setLocks({ ...locks, vehicleReady: e.target.checked })}
            />
          </label>
          <label className="lock-item">
            <span>(4) Hồ sơ pháp lý & kiểm dịch đạt 100%</span>
            <input
              type="checkbox"
              checked={locks.checklist100Percent}
              onChange={(e) => setLocks({ ...locks, checklist100Percent: e.target.checked })}
            />
          </label>

          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={!canDepart}
          >
            {canDepart ? '✓ Mở khóa: Chuyển sang Sẵn Sàng Khởi Hành' : '🔒 Đang khóa khởi hành (Chưa đủ 4 điều kiện)'}
          </button>
        </div>
      </div>
    </div>
  );
};