import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { DemoDataToggle, ThemeToggle } from '../../../../shared/components';
import { cleanDisplayName, getInitials } from '../../../../shared/utils/textUtils';
import { useManager } from '../../hooks/useManager';
import { fmtDateTime } from '../../hooks/managerRules';
import { MANAGER_INITIALS, MANAGER_NAME } from '../../data/mockData';
import { clearAuthSession } from '../../../auth/api/authApi';
import './ManagerLayout.css';

// ---------------------------------------------------------------------------
// Icon dùng chung trong feature
// ---------------------------------------------------------------------------
const PATHS: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  inbox: <path d="M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z" />,
  file: <><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M8 13h8M8 17h5" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  truck: <><path d="M2 6h12v10H2zM14 9h4l4 4v3h-8z" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  alert: <path d="M12 3 2 20h20zM12 10v4M12 17h.01" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  check: <path d="m5 12 5 5 9-10" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  back: <path d="m15 18-6-6 6-6" />,
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M16 4.5a3.5 3.5 0 0 1 0 7M22 20c0-3-2-5.2-5-5.8" /></>,
  route: <><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7" /></>,
  plane: <path d="M10 14 3 11l1-2 8 1 4-6h2l-2 7 5 1 1 2-6 1-3 6h-2l1-6" />,
  shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  print: <><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2" /><rect x="6" y="14" width="12" height="7" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
};
export const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <svg className={`mgr-i ${className}`} viewBox="0 0 24 24" aria-hidden="true">{PATHS[name] ?? null}</svg>
);

interface ManagerLayoutProps {
  title: string;
  children: React.ReactNode;
}

/** Layout trang Logistics Manager: sidebar + topbar (thông báo) + toast */
export const ManagerLayout: React.FC<ManagerLayoutProps> = ({ title, children }) => {
  const { stats, toast, notifications, actions } = useManager();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => actions.clearToast(), 3800);
    return () => clearTimeout(timer);
  }, [toast, actions]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (open && boxRef.current && !boxRef.current.contains(target)) setOpen(false);
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open, userMenuOpen]);

  const currentManagerName = cleanDisplayName(localStorage.getItem('userFullName')) || MANAGER_NAME;
  const managerInitials = getInitials(currentManagerName, MANAGER_INITIALS);

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  const NAV: Array<[string, string, string, number?]> = [
    ['/manager/dashboard', 'Tổng quan', 'home'],
    ['/manager/requests', 'Yêu cầu vận chuyển', 'inbox', stats.pendingReview + stats.cancellations],
    ['/manager/contracts', 'Hợp đồng & giá', 'file', stats.awaitingContract],
    ['/manager/payments', 'Tiền cọc & thanh toán', 'card', stats.payQueue],
    ['/manager/trips', 'Chuyến đi', 'truck', stats.tripDecisions],
    ['/manager/incidents', 'Sự cố & khiếu nại', 'alert', stats.openIncidents + stats.openComplaints],
    ['/manager/reports', 'Chi phí & báo cáo', 'chart'],
  ];

  return (
    <div className="mgr-app">
      <aside className="mgr-sidebar">
        <NavLink to="/manager/dashboard" className="mgr-brand" style={{ textDecoration: 'none', display: 'block' }}>
          CBN Transport
        </NavLink>
        <div className="mgr-role"><b>Logistics Manager</b><span>Xét duyệt, hợp đồng & điều hành</span></div>
        <nav className="mgr-nav">
          {NAV.map(([to, label, icon, count]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon name={icon} /><span>{label}</span>{!!count && <em className="mgr-nav__count">{count}</em>}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="mgr-main">
        <header className="mgr-topbar">
          <h1>{title}</h1>
          <div className="mgr-topbar__user">
            <DemoDataToggle role="manager" />
            <ThemeToggle showLabel={false} />

            {/* Chuông thông báo */}
            <div ref={boxRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="mgr-icon-btn mgr-bell"
                aria-label="Thông báo"
                aria-expanded={open}
                onClick={() => { setOpen((v) => !v); setUserMenuOpen(false); }}
              >
                <Icon name="bell" />{stats.unread > 0 && <span className="mgr-bell__dot" />}
              </button>
              {open && (
                <div className="mgr-notif" role="dialog" aria-label="Thông báo">
                  <div className="mgr-notif__head">
                    <span>Thông báo</span>
                    <button type="button" className="mgr-link" onClick={() => actions.markAllRead()}>Đánh dấu đã đọc</button>
                  </div>
                  {notifications.slice(0, 8).map((n) => (
                    <button key={n.id} type="button" className={`mgr-notif__item ${n.read ? '' : 'unread'}`}
                      onClick={() => { actions.markRead(n.id); setOpen(false); navigate(n.link); }}>
                      <b>{n.title}</b><span>{n.text}</span><small>{fmtDateTime(n.at)}</small>
                    </button>
                  ))}
                  {!notifications.length && <p className="mgr-hint" style={{ padding: 8 }}>Không có thông báo.</p>}
                </div>
              )}
            </div>

            {/* Menu người dùng / Tài khoản */}
            <div className="mgr-user-wrap" ref={userMenuRef}>
              <button
                type="button"
                className="mgr-user-widget"
                onClick={() => { setUserMenuOpen((v: boolean) => !v); setOpen(false); }}
                aria-label="Menu tài khoản"
                aria-expanded={userMenuOpen}
              >
                <span className="mgr-avatar">{managerInitials}</span>
                <span className="mgr-user-name">{currentManagerName}</span>
                <Icon name="chevron" className="mgr-user-chevron" />
              </button>

              {userMenuOpen && (
                <div className="mgr-user-menu" role="menu">
                  <div className="mgr-user-menu__header">
                    <div className="mgr-user-menu__avatar">{managerInitials}</div>
                    <div className="mgr-user-menu__info">
                      <b>{currentManagerName}</b>
                      <span>Logistics Manager</span>
                    </div>
                  </div>
                  <div className="mgr-user-menu__divider" />
                  <button type="button" className="mgr-user-menu__item" onClick={() => { setUserMenuOpen(false); navigate('/manager/dashboard'); }}>
                    <Icon name="home" /> Tổng quan
                  </button>
                  <button type="button" className="mgr-user-menu__item" onClick={() => { setUserMenuOpen(false); navigate('/manager/requests'); }}>
                    <Icon name="inbox" /> Yêu cầu vận chuyển
                  </button>
                  <button type="button" className="mgr-user-menu__item" onClick={() => { setUserMenuOpen(false); navigate('/manager/contracts'); }}>
                    <Icon name="file" /> Hợp đồng & giá
                  </button>
                  <button type="button" className="mgr-user-menu__item" onClick={() => { setUserMenuOpen(false); navigate('/manager/trips'); }}>
                    <Icon name="truck" /> Chuyến đi
                  </button>
                  <div className="mgr-user-menu__divider" />
                  <button type="button" className="mgr-user-menu__item mgr-user-menu__logout" onClick={handleLogout}>
                    <Icon name="logout" /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <nav className="mgr-mobile-nav">
          {NAV.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>)}
        </nav>
        <main className="mgr-view">{children}</main>
      </div>
      {toast && <div className="mgr-toast" role="status" key={toast.id}>{toast.message}</div>}
    </div>
  );
};

export default ManagerLayout;
