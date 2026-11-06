import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerLayout } from '../../components/CustomerLayout';
import { useCustomer } from '../../hooks/useCustomer';
import type { TransportRequest } from '../../types';

export const CustomerProfilePage: React.FC = () => {
  const { requests, horses, profile } = useCustomer();
  const navigate = useNavigate();

  const rawUser = typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem('user') || (typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null)
    : null;
  const userObj = rawUser ? (() => { try { return JSON.parse(rawUser); } catch { return {}; } })() : {};

  const name = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userFullName') : null)
    || (typeof localStorage !== 'undefined' ? localStorage.getItem('userFullName') : null)
    || userObj.fullName
    || userObj.name
    || profile?.name
    || 'Quý Khách Hàng';

  const email = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userEmail') : null)
    || (typeof localStorage !== 'undefined' ? localStorage.getItem('userEmail') : null)
    || userObj.email
    || profile?.email
    || 'khachhang@example.com';

  const company = profile?.company || userObj.company || 'Chủ nuôi / Câu lạc bộ ngựa';
  const phone = userObj.phone || profile?.phone || '0901 234 567';
  const id = userObj.id || userObj.userId || profile?.id || 'CUS-001';
  const username = userObj.username || 'customer_account';
  const initials = name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(-2).toUpperCase() || 'KH';

  const totalRequests = requests?.length || 0;
  const activeRequests = requests?.filter((r: TransportRequest) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(r.status))?.length || 0;
  const totalHorses = horses?.length || 0;

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
    <CustomerLayout title="Hồ sơ của tôi">
      <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Banner hồ sơ */}
        <div className="cus-card" style={{ padding: 24 }}>
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
                {company}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Mã khách hàng: <b>{id}</b> • Trạng thái tài khoản: <span style={{ color: '#16a34a', fontWeight: 600 }}>Đã kích hoạt</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="cus-btn cus-btn--sm" onClick={() => navigate('/customer/home')}>
                Về trang chủ
              </button>
              <button
                type="button"
                className="cus-btn cus-btn--sm"
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
          <section className="cus-card">
            <h3 className="cus-card__title" style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
              Thông tin liên hệ &amp; Doanh nghiệp
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Họ và tên đại diện</span>
                <b style={{ color: 'var(--text-primary)' }}>{name}</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Tên đăng nhập</span>
                <b style={{ color: 'var(--text-primary)' }}>{username}</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Đơn vị / Doanh nghiệp</span>
                <b style={{ color: 'var(--text-primary)' }}>{company}</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Mã khách hàng</span>
                <b style={{ color: 'var(--text-primary)' }}>{id}</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Email thông báo</span>
                <b style={{ color: 'var(--text-primary)' }}>{email}</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Số điện thoại</span>
                <b style={{ color: 'var(--text-primary)' }}>{phone}</b>
              </div>
            </div>
          </section>

          <section className="cus-card">
            <h3 className="cus-card__title" style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
              Hoạt động vận chuyển
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Tổng yêu cầu đã tạo</span>
                <b style={{ color: 'var(--text-primary)' }}>{totalRequests} đơn</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Đơn đang thực hiện</span>
                <b style={{ color: activeRequests > 0 ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                  {activeRequests} đơn
                </b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Ngựa trong danh bạ</span>
                <b style={{ color: 'var(--text-primary)' }}>{totalHorses} con ngựa</b>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Phương thức thanh toán</span>
                <b style={{ color: 'var(--text-primary)' }}>VNPay / Chuyển khoản</b>
              </div>
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-color, #e2e8f0)', display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="cus-btn cus-btn--sm"
                onClick={() => navigate('/customer/my-horses')}
              >
                Quản lý đàn ngựa
              </button>
              <button
                type="button"
                className="cus-btn cus-btn--sm"
                onClick={() => navigate('/customer/requests')}
              >
                Xem các đơn hàng
              </button>
            </div>
          </section>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerProfilePage;
