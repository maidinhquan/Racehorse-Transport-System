import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SpecialistLayout } from '../../components/SpecialistLayout';
import { useSpecialist } from '../../hooks/useSpecialist';
import { SPECIALIST_NAME } from '../../data/mockData';

export const SpecialistProfilePage: React.FC = () => {
  const { stats, trips } = useSpecialist();
  const navigate = useNavigate();

  const rawUser = typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem('user') || (typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null)
    : null;
  const userObj = rawUser ? (() => { try { return JSON.parse(rawUser); } catch { return {}; } })() : {};

  const name = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userFullName') : null)
    || (typeof localStorage !== 'undefined' ? localStorage.getItem('userFullName') : null)
    || userObj.fullName
    || userObj.name
    || SPECIALIST_NAME;

  const email = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userEmail') : null)
    || (typeof localStorage !== 'undefined' ? localStorage.getItem('userEmail') : null)
    || userObj.email
    || 'tuan.le@racehorse.vn';

  const role = 'Transport Specialist (Chuyên viên thủ tục & kiểm dịch)';
  const phone = userObj.phone || '0905 550 114';
  const id = userObj.id || userObj.userId || 'USR_SPEC_01';
  const username = userObj.username || 'spec_tuanle';
  const initials = name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(-2).toUpperCase() || 'TS';

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
    <SpecialistLayout title="Hồ sơ của tôi">
      <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Banner hồ sơ */}
        <div className="spc-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--spc-orange-soft, #ffedd5)',
                color: 'var(--spc-orange-text, #ea580c)',
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
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: 'var(--spc-ink, #0f172a)' }}>{name}</h2>
              <div style={{ fontSize: 13, color: 'var(--spc-orange-text, #ea580c)', fontWeight: 600, marginBottom: 4 }}>
                {role}
              </div>
              <div style={{ fontSize: 12, color: 'var(--spc-muted, #64748b)' }}>
                Mã chuyên viên: <b>{id}</b> • Trạng thái: <span style={{ color: '#16a34a', fontWeight: 600 }}>Sẵn sàng làm việc</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="spc-btn spc-btn--sm" onClick={() => navigate('/specialist/dashboard')}>
                Về bảng điều khiển
              </button>
              <button
                type="button"
                className="spc-btn spc-btn--sm"
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
          <section className="spc-card">
            <h3 className="spc-card__title">Thông tin tài khoản</h3>
            <div className="spc-kv" style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--spc-muted)', display: 'block' }}>Họ và tên</span>
                <b>{name}</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--spc-muted)', display: 'block' }}>Tên đăng nhập</span>
                <b>{username}</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--spc-muted)', display: 'block' }}>Email</span>
                <b>{email}</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--spc-muted)', display: 'block' }}>Số điện thoại</span>
                <b>{phone}</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--spc-muted)', display: 'block' }}>Vai trò</span>
                <b>TRANSPORT_SPECIALIST</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--spc-muted)', display: 'block' }}>Bộ phận</span>
                <b>Thủ tục &amp; Kiểm dịch Động vật</b>
              </div>
            </div>
          </section>

          <section className="spc-card">
            <h3 className="spc-card__title">Khối lượng công việc</h3>
            <div className="spc-kv" style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--spc-muted)', display: 'block' }}>Chuyến được giao</span>
                <b>{trips.length} chuyến</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--spc-muted)', display: 'block' }}>Hồ sơ chờ duyệt</span>
                <b style={{ color: stats.awaiting > 0 ? '#f59e0b' : undefined }}>{stats.awaiting} hồ sơ</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--spc-muted)', display: 'block' }}>Giấy tờ cần bổ sung</span>
                <b>{stats.missing} mục</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--spc-muted)', display: 'block' }}>Hồ sơ bị từ chối / lỗi</span>
                <b style={{ color: stats.rejected > 0 ? '#dc2626' : undefined }}>{stats.rejected} mục</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--spc-muted)', display: 'block' }}>Giấy phép sắp hết hạn</span>
                <b>{stats.expiring} giấy phép</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--spc-muted)', display: 'block' }}>Chuyến đang chuẩn bị</span>
                <b>{stats.prep} chuyến</b>
              </div>
            </div>
          </section>
        </div>
      </div>
    </SpecialistLayout>
  );
};

export default SpecialistProfilePage;
