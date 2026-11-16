import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import ThemeToggle from '../../components/ThemeToggle/ThemeToggle';
import './DashboardLayout.css';

export interface DashboardMenuItem {
  path: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
}

export interface DashboardNotificationItem {
  id: string;
  title: string;
  body?: string;
  time?: string;
  unread?: boolean;
  link?: string;
}

export interface DashboardLayoutProps {
  title: string;
  brandTitle?: string;
  brandLink?: string;
  roleLabel: string;
  roleDescription?: string;
  userName?: string;
  userRoleLabel?: string;
  userInitials?: string;
  menu: DashboardMenuItem[];
  notifications?: DashboardNotificationItem[];
  unreadNotificationsCount?: number;
  notificationsPath?: string;
  onNotificationClick?: (notification: DashboardNotificationItem) => void;
  onReadAllNotifications?: () => void;
  userProfilePath?: string;
  onLogout?: () => void;
  toast?: string | { id?: number | string; message: string } | null;
  onClearToast?: () => void;
  headerActions?: ReactNode;
  narrow?: boolean;
  children: ReactNode;
}

export function DashboardLayout({
  title,
  brandTitle = 'CBN Transport',
  brandLink,
  roleLabel,
  roleDescription,
  userName,
  userRoleLabel,
  userInitials,
  menu,
  notifications = [],
  unreadNotificationsCount = 0,
  notificationsPath,
  onNotificationClick,
  onReadAllNotifications,
  userProfilePath,
  onLogout,
  toast,
  onClearToast,
  headerActions,
  narrow = false,
  children,
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const toastMessage = typeof toast === 'string' ? toast : toast?.message;

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage || !onClearToast) return;
    const timer = setTimeout(() => onClearToast(), 3800);
    return () => clearTimeout(timer);
  }, [toastMessage, onClearToast]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notifOpen && notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [notifOpen, userMenuOpen]);

  // Fallback user display
  const storedName =
    userName ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userFullName') : null) ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('userFullName') : null) ||
    'Người dùng';

  const initials =
    userInitials ||
    storedName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(-2)
      .toUpperCase() ||
    'US';

  const defaultBrandLink = brandLink || menu[0]?.path || '/';

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userFullName');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userRole');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userFullName');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  return (
    <div className="dashboard-layout">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="dashboard-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${mobileOpen ? 'dashboard-sidebar--open' : ''}`}>
        <div className="dashboard-sidebar__header">
          <NavLink
            to={defaultBrandLink}
            className="dashboard-brand"
            onClick={() => setMobileOpen(false)}
          >
            <span className="dashboard-brand__icon">♞</span>
            <span className="dashboard-brand__title">{brandTitle}</span>
          </NavLink>
          <button
            type="button"
            className="dashboard-mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
          >
            ✕
          </button>
        </div>

        <div className="dashboard-role-badge">
          <b>{roleLabel}</b>
          {roleDescription && <span>{roleDescription}</span>}
        </div>

        <nav aria-label="Menu chính" className="dashboard-nav">
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `dashboard-nav-item ${isActive ? 'active' : ''}`
              }
              onClick={() => setMobileOpen(false)}
            >
              {item.icon && <span className="dashboard-nav-item__icon">{item.icon}</span>}
              <span className="dashboard-nav-item__label">{item.label}</span>
              {!!item.badge && item.badge > 0 && (
                <span className="dashboard-nav-item__badge">{item.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="dashboard-main">
        {/* Topbar */}
        <header className="dashboard-topbar">
          <div className="dashboard-topbar__left">
            <button
              type="button"
              className="dashboard-menu-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Mở thanh điều hướng"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h1 className="dashboard-page-title">{title}</h1>
          </div>

          <div className="dashboard-topbar__actions">
            {headerActions}

            {/* Theme Toggle */}
            <ThemeToggle showLabel={false} />

            {/* Notifications Dropdown */}
            {(notifications.length > 0 || notificationsPath) && (
              <div className="dashboard-dropdown" ref={notifRef}>
                <button
                  type="button"
                  className={`dashboard-icon-btn ${unreadNotificationsCount > 0 ? 'has-unread' : ''}`}
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    setUserMenuOpen(false);
                  }}
                  title="Thông báo"
                  aria-expanded={notifOpen}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0" />
                  </svg>
                  {unreadNotificationsCount > 0 && (
                    <span className="dashboard-unread-dot">{unreadNotificationsCount}</span>
                  )}
                </button>

                {notifOpen && (
                  <div className="dashboard-popover dashboard-popover--notif">
                    <div className="dashboard-popover__header">
                      <strong>Thông báo ({unreadNotificationsCount})</strong>
                      {onReadAllNotifications && unreadNotificationsCount > 0 && (
                        <button
                          type="button"
                          className="dashboard-link-btn"
                          onClick={() => {
                            onReadAllNotifications();
                          }}
                        >
                          Đánh dấu đã đọc
                        </button>
                      )}
                    </div>

                    <div className="dashboard-notif-list">
                      {notifications.length === 0 ? (
                        <p className="dashboard-notif-empty">Không có thông báo mới.</p>
                      ) : (
                        notifications.slice(0, 8).map((item) => (
                          <div
                            key={item.id}
                            className={`dashboard-notif-item ${item.unread ? 'dashboard-notif-item--unread' : ''}`}
                            onClick={() => {
                              onNotificationClick?.(item);
                              if (item.link) {
                                navigate(item.link);
                                setNotifOpen(false);
                              }
                            }}
                          >
                            <b className="dashboard-notif-item__title">{item.title}</b>
                            {item.body && <p className="dashboard-notif-item__body">{item.body}</p>}
                            {item.time && <span className="dashboard-notif-item__time">{item.time}</span>}
                          </div>
                        ))
                      )}
                    </div>

                    {notificationsPath && (
                      <div className="dashboard-popover__footer">
                        <button
                          type="button"
                          className="dashboard-link-btn"
                          onClick={() => {
                            setNotifOpen(false);
                            navigate(notificationsPath);
                          }}
                        >
                          Xem tất cả thông báo →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* User Account Dropdown */}
            <div className="dashboard-dropdown" ref={userMenuRef}>
              <button
                type="button"
                className="dashboard-user-trigger"
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setNotifOpen(false);
                }}
                aria-expanded={userMenuOpen}
              >
                <span className="dashboard-avatar">{initials}</span>
                <span className="dashboard-user-name">{storedName}</span>
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {userMenuOpen && (
                <div className="dashboard-popover dashboard-popover--user">
                  <div className="dashboard-user-card">
                    <span className="dashboard-avatar dashboard-avatar--lg">{initials}</span>
                    <div className="dashboard-user-card__info">
                      <b>{storedName}</b>
                      <span>{userRoleLabel || roleLabel}</span>
                    </div>
                  </div>

                  <div className="dashboard-user-menu">
                    {userProfilePath && (
                      <button
                        type="button"
                        className="dashboard-user-menu__item"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate(userProfilePath);
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>Hồ sơ của tôi</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="dashboard-user-menu__item dashboard-user-menu__item--danger"
                      onClick={handleLogout}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="dashboard-toast" role="alert">
            <span className="dashboard-toast__msg">{toastMessage}</span>
            {onClearToast && (
              <button
                type="button"
                className="dashboard-toast__close"
                onClick={onClearToast}
                aria-label="Đóng thông báo"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <main className={`dashboard-content ${narrow ? 'dashboard-content--narrow' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
