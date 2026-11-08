import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ManagerLayout } from '../../components/ManagerLayout';
import { useManager } from '../../hooks/useManager';
import { MANAGER_NAME } from '../../data/mockData';

export const ManagerProfilePage: React.FC = () => {
  const { stats } = useManager();
  const navigate = useNavigate();

  const rawUser = typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem('user') || (typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null)
    : null;
  const userObj = rawUser ? (() => { try { return JSON.parse(rawUser); } catch { return {}; } })() : {};

  const name = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userFullName') : null)
    || (typeof localStorage !== 'undefined' ? localStorage.getItem('userFullName') : null)
    || userObj.fullName
    || userObj.name
    || MANAGER_NAME;

  const email = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userEmail') : null)
    || (typeof localStorage !== 'undefined' ? localStorage.getItem('userEmail') : null)
    || userObj.email
    || 'linh.pham@racehorse.vn';

  const role = 'Logistics Manager (Quản lý điều hành vận chuyển)';
  const phone = userObj.phone || '0905 550 110';
  const id = userObj.id || userObj.userId || 'MGR-001';
  const username = userObj.username || 'manager_linhp';
  const initials = name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(-2).toUpperCase() || 'LM';

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
    <ManagerLayout title="Hồ sơ của tôi">
      <div className="mgr-stack" style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Banner hồ sơ */}
        <div className="mgr-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--mgr-orange-soft, #ffedd5)',
                color: 'var(--mgr-orange-text, #ea580c)',
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
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: 'var(--mgr-ink)' }}>{name}</h2>
              <div style={{ fontSize: 13, color: 'var(--mgr-orange-text, #ea580c)', fontWeight: 600, marginBottom: 4 }}>
                {role}
              </div>
              <div style={{ fontSize: 12, color: 'var(--mgr-muted)' }}>
                Mã tài khoản: <b>{id}</b> • Trạng thái: <span style={{ color: '#16a34a', fontWeight: 600 }}>Trực tuyến</span>
              </div>
            </div>
            <div className="mgr-btn-row">
              <button type="button" className="mgr-btn mgr-btn--sm" onClick={() => navigate('/manager/dashboard')}>
                Về bảng điều khiển
              </button>
              <button
                type="button"
                className="mgr-btn mgr-btn--sm"
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
          <section className="mgr-card">
            <h3 className="mgr-card__title">Thông tin cá nhân &amp; Tài khoản</h3>
            <div className="mgr-kv" style={{ marginTop: 12 }}>
              <div>
                <span>Họ và tên</span>
                <b>{name}</b>
              </div>
              <div>
                <span>Tên đăng nhập</span>
                <b>{username}</b>
              </div>
              <div>
                <span>Email liên hệ</span>
                <b>{email}</b>
              </div>
              <div>
                <span>Số điện thoại</span>
                <b>{phone}</b>
              </div>
              <div>
                <span>Vai trò hệ thống</span>
                <b>LOGISTICS_MANAGER</b>
              </div>
              <div>
                <span>Đơn vị công tác</span>
                <b>Ban Điều hành Vận chuyển Racehorse</b>
              </div>
            </div>
          </section>

          <section className="mgr-card">
            <h3 className="mgr-card__title">Phạm vi công việc hiện tại</h3>
            <div className="mgr-kv" style={{ marginTop: 12 }}>
              <div>
                <span>Yêu cầu cần xử lý</span>
                <b>{stats.pendingReview + stats.cancellations} đơn</b>
              </div>
              <div>
                <span>Hợp đồng chờ phát hành</span>
                <b>{stats.awaitingContract} hợp đồng</b>
              </div>
              <div>
                <span>Thanh toán &amp; cọc chờ duyệt</span>
                <b>{stats.payQueue} giao dịch</b>
              </div>
              <div>
                <span>Chuyến đi cần quyết định</span>
                <b>{stats.tripDecisions} chuyến</b>
              </div>
              <div>
                <span>Sự cố &amp; khiếu nại mở</span>
                <b>{stats.openIncidents + stats.openComplaints} vụ</b>
              </div>
              <div>
                <span>Thông báo chưa đọc</span>
                <b>{stats.unread} thông báo</b>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ManagerLayout>
  );
};

export default ManagerProfilePage;
