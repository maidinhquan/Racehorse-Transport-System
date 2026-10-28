import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { DemoDataToggle, ThemeToggle } from '../../../../shared/components';
import { cleanDisplayName, getInitials } from '../../../../shared/utils/textUtils';
import { useCustomer } from '../../hooks/useCustomer';
import { fmtDateTime } from '../../hooks/customerRules';
import { clearAuthSession } from '../../../auth/api/authApi';
import './CustomerLayout.css';

// ---------------------------------------------------------------------------
// Icon dùng chung trong feature
// ---------------------------------------------------------------------------
const PATHS: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  file: <><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M8 13h8M8 17h5" /></>,
  horse: <><path d="M5 20v-6l3-5 2-5 3 2 4 1 2 3-2 2-3-1-1 4v5" /><path d="M9 20v-5" /></>,
  pin: <><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="m15 18-6-6 6-6" />,
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0" />,
  alert: <path d="M12 3 2 20h20zM12 10v4M12 17h.01" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  upload: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
  card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  chat: <path d="M4 5h16v11H8l-4 4z" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
};
export const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <svg className={`cus-i ${className}`} viewBox="0 0 24 24" aria-hidden="true">{PATHS[name] ?? null}</svg>
);

// ---------------------------------------------------------------------------
// Layout: sidebar + topbar (thông báo + menu tài khoản) + toast
// ---------------------------------------------------------------------------
interface CustomerLayoutProps {
  title: string;
  children: React.ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({ title, children }) => {
  const navigate = useNavigate();
  const { profile, stats, notifications, toast, actions } = useCustomer();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => actions.clearToast(), 3800);
    return () => clearTimeout(timer);
  }, [toast, actions]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (open && notifRef.current && !notifRef.current.contains(target)) {
        setOpen(false);
      }
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open, userMenuOpen]);

  const displayName = cleanDisplayName(profile.name);
  const displayInitials = profile.initials || getInitials(displayName);
  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  const NAV: Array<[string, string, string, number?]> = [
    ['/customer/home', 'Trang chủ', 'home'],
    ['/customer/requests', 'Yêu cầu vận chuyển', 'file', stats.needAction],
    ['/customer/horses', 'Ngựa của tôi', 'horse'],
    ['/customer/tracking', 'Theo dõi chuyến', 'pin', stats.inTransit],
    ['/customer/history', 'Lịch sử', 'clock'],
  ];

  return (
    <div className="cus-app">
      <aside className="cus-sidebar">
        <NavLink to="/customer/home" className="cus-brand" style={{ textDecoration: 'none', display: 'block' }}>
          CBN Transport
        </NavLink>
        <div className="cus-role">
          <b>Cổng khách hàng</b>
          <span>{profile.company}</span>
        </div>
        <nav className="cus-nav">
          {NAV.map(([to, label, icon, count]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon name={icon} />
              <span>{label}</span>
              {!!count && <em className="cus-nav__count">{count}</em>}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="cus-main">
        <header className="cus-topbar">
          <h1>{title}</h1>
          <div className="cus-topbar__user">
            <DemoDataToggle role="customer" />
            <ThemeToggle showLabel={false} />

            {/* Chuông thông báo */}
            <div className="cus-notif-wrap" ref={notifRef}>
              <button
                type="button"
                className="cus-icon-btn cus-bell"
                aria-label="Thông báo"
                aria-expanded={open}
                onClick={() => { setOpen((v) => !v); setUserMenuOpen(false); }}
              >
                <Icon name="bell" />
                {stats.unread > 0 && <i className="cus-bell__dot" />}
              </button>
              {open && (
                <div className="cus-notif" role="menu">
                  <div className="cus-notif__head">
                    <span>Thông báo</span>
                    {stats.unread > 0 && (
                      <button type="button" className="cus-link" onClick={actions.markAllNotificationsRead}>
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 && <p className="cus-muted" style={{ padding: 10 }}>Bạn không có thông báo mới.</p>}
                  {notifications.slice(0, 8).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`cus-notif__item ${n.read ? '' : 'unread'}`}
                      onClick={() => { actions.markNotificationRead(n.id); setOpen(false); navigate(n.link); }}
                    >
                      <b>{n.title}</b>
                      <span>{n.body}</span>
                      <small>{fmtDateTime(n.at)}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Menu người dùng / Tài khoản */}
            <div className="cus-user-wrap" ref={userMenuRef}>
              <button
                type="button"
                className="cus-user-widget"
                onClick={() => { setUserMenuOpen((v) => !v); setOpen(false); }}
                aria-label="Menu tài khoản"
                aria-expanded={userMenuOpen}
              >
                <span className="cus-avatar">{displayInitials}</span>
                <span className="cus-user-name">{displayName}</span>
                <Icon name="chevron" className="cus-user-chevron" />
              </button>

                  {userMenuOpen && (
                    <div className="cus-user-menu" role="menu">
                      <div className="cus-user-menu__header">
                        <div className="cus-user-menu__avatar">{displayInitials}</div>
                        <div className="cus-user-menu__info">
                          <b>{displayName}</b>
                          <span>{profile.company}</span>
                          <small>{profile.email}</small>
                        </div>
                      </div>
                      <div className="cus-user-menu__divider" />
                      <button type="button" className="cus-user-menu__item" onClick={() => { setUserMenuOpen(false); navigate('/customer/home'); }}>
                        <Icon name="home" /> Trang chủ
                      </button>
                  <button type="button" className="cus-user-menu__item" onClick={() => { setUserMenuOpen(false); navigate('/customer/requests'); }}>
                    <Icon name="file" /> Yêu cầu vận chuyển
                  </button>
                  <button type="button" className="cus-user-menu__item" onClick={() => { setUserMenuOpen(false); navigate('/customer/horses'); }}>
                    <Icon name="horse" /> Ngựa của tôi
                  </button>
                  <button type="button" className="cus-user-menu__item" onClick={() => { setUserMenuOpen(false); navigate('/customer/history'); }}>
                    <Icon name="clock" /> Lịch sử & Hóa đơn
                  </button>
                  <div className="cus-user-menu__divider" />
                  <button type="button" className="cus-user-menu__item cus-user-menu__logout" onClick={handleLogout}>
                    <Icon name="logout" /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <nav className="cus-mobile-nav">
          {NAV.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>)}
        </nav>
        <main className="cus-view">{children}</main>
      </div>

      {toast && <div className="cus-toast" role="status" key={toast.id}>{toast.message}</div>}
    </div>
  );
};

export default CustomerLayout;
