import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DriverLayout } from '../../components/DriverLayout';
import { useDriver } from '../../hooks/useDriver';

const roleText = (role?: string) => (role === 'VETERINARIAN' ? 'Hộ tống • Bác sĩ thú y' : role === 'ESCORT' ? 'Hộ tống' : 'Tài xế');

export const DriverProfilePage: React.FC = () => {
  const { me, trips, activeTrips } = useDriver();
  const navigate = useNavigate();

  const rawUser = typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem('user') || (typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null)
    : null;
  const userObj = rawUser ? (() => { try { return JSON.parse(rawUser); } catch { return {}; } })() : {};

  const name = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userFullName') : null)
    || (typeof localStorage !== 'undefined' ? localStorage.getItem('userFullName') : null)
    || userObj.fullName
    || userObj.name
    || me?.name
    || 'Tài xế';

  const email = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userEmail') : null)
    || (typeof localStorage !== 'undefined' ? localStorage.getItem('userEmail') : null)
    || userObj.email
    || 'taixe@racehorse.vn';

  const role = me ? roleText(me.role) : 'Tài xế chính (Driver)';
  const phone = userObj.phone || me?.phone || '0901 888 999';
  const id = userObj.id || userObj.userId || me?.id || 'DRV-001';
  const initials = name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(-2).toUpperCase() || 'TX';

  const currentTrip = activeTrips[0];
  const completedCount = trips.filter((t) => t.status === 'COMPLETED').length;

  const handleLogout = () => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userFullName');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userRole');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <DriverLayout title="Hồ sơ của tôi">
      <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Banner hồ sơ */}
        <div className="drv-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--accent-light, #ffedd5)',
                color: 'var(--accent-primary, #ea580c)',
                fontSize: 26,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{name}</h2>
              <div style={{ fontSize: 13, color: 'var(--accent-primary)', fontWeight: 600, marginBottom: 4 }}>
                {role}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Mã nhân sự: <b>{id}</b> • Trạng thái: <span style={{ color: '#16a34a', fontWeight: 600 }}>Sẵn sàng nhận lệnh</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="drv-btn drv-btn--sm" onClick={() => navigate('/driver/journey')}>
                Hành trình
              </button>
              <button
                type="button"
                className="drv-btn drv-btn--sm"
                style={{ color: '#dc2626' }}
                onClick={handleLogout}
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>

        {/* Thông tin chi tiết */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
          <section className="drv-card">
            <h3 className="drv-card__title" style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
              Thông tin nhân sự
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Họ và tên</span>
                <b style={{ color: 'var(--text-primary)' }}>{name}</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Vị trí đảm nhiệm</span>
                <b style={{ color: 'var(--text-primary)' }}>{role}</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Email liên hệ</span>
                <b style={{ color: 'var(--text-primary)' }}>{email}</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Số điện thoại</span>
                <b style={{ color: 'var(--text-primary)' }}>{phone}</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Mã nhân viên</span>
                <b style={{ color: 'var(--text-primary)' }}>{id}</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Bộ phận</span>
                <b style={{ color: 'var(--text-primary)' }}>Đội Vận tải &amp; Áp tải đường bộ</b>
              </div>
            </div>
          </section>

          <section className="drv-card">
            <h3 className="drv-card__title" style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
              Nhiệm vụ chuyến đi
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Chuyến đi hiện tại</span>
                <b style={{ color: currentTrip ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                  {currentTrip ? currentTrip.id : 'Chưa có chuyến'}
                </b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Chuyến hoàn tất</span>
                <b style={{ color: 'var(--text-primary)' }}>{completedCount} chuyến</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Xe được gán</span>
                <b style={{ color: 'var(--text-primary)' }}>{currentTrip?.vehicle?.plate || '43H-246.81'}</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Cập nhật vị trí</span>
                <b style={{ color: 'var(--text-primary)' }}>Thủ công tại các trạm</b>
              </div>
            </div>
            {currentTrip && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                <button
                  type="button"
                  className="drv-btn drv-btn--sm drv-btn--block"
                  onClick={() => navigate(`/driver/trips/${currentTrip.id}`)}
                >
                  Xem chi tiết chuyến {currentTrip.id}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </DriverLayout>
  );
};

export default DriverProfilePage;
