import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { DemoDataToggle, ThemeToggle } from '../../../../shared/components';
import { useDemoMode } from '../../../../shared/context/DemoModeContext';
import { useCoordinator } from '../../hooks/useCoordinator';
import { COORDINATOR_NAME } from '../../data/mockData';
import './CoordinatorLayout.css';

// ---------------------------------------------------------------------------
// Icon dùng chung trong feature
// ---------------------------------------------------------------------------
const PATHS: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  map: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>,
  truck: <><path d="M2 6h12v10H2zM14 9h4l4 4v3h-8z" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.4.6 4 2.9 4 6" /></>,
  plane: <path d="M10 15 3 13l1-2 6 .5L14 5c1-1.5 3-1.5 3 0l-2 7 5 1-1 2-5-.5-3 5h-2l1-5z" />,
  alert: <path d="M12 3 2 20h20zM12 10v4M12 17h.01" />,
  pin: <><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="m15 18-6-6 6-6" />,
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
};
export const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <svg className={`crd-i ${className}`} viewBox="0 0 24 24" aria-hidden="true">{PATHS[name] ?? null}</svg>
);

// ---------------------------------------------------------------------------
// Layout: sidebar + topbar + toast
// ---------------------------------------------------------------------------
interface CoordinatorLayoutProps {
  title: string;
  children: React.ReactNode;
}

export const CoordinatorLayout: React.FC<CoordinatorLayoutProps> = ({ title, children }) => {
  const navigate = useNavigate();
  const { enabled: isDemoMode } = useDemoMode('coordinator');
  const { stats, toast, actions } = useCoordinator();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => actions.clearToast(), 3500);
    return () => clearTimeout(timer);
  }, [toast, actions]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [userMenuOpen]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const NAV: Array<[string, string, string, number?]> = [
    ['/coordinator/dashboard', 'Tổng quan', 'home'],
    ['/coordinator/trips', 'Quản lý chuyến', 'map', stats.needRoute + stats.needResources],
    ['/coordinator/fleet', 'Đội xe', 'truck'],
    ['/coordinator/crew', 'Phân công nhân sự', 'users'],
    ['/coordinator/flights', 'Chuyến bay', 'plane'],
    ['/coordinator/incidents', 'Sự cố', 'alert', stats.openIncidents],
  ];

  return (
    <div className="crd-app" data-demo-mode={isDemoMode ? 'true' : 'false'}>
      <aside className="crd-sidebar">
        <NavLink to="/coordinator/dashboard" className="crd-brand" style={{ textDecoration: 'none', display: 'block' }}>
          CBN Transport
        </NavLink>
        <div className="crd-role">
          <b>Điều phối đội xe &amp; tuyến</b>
          <span>Fleet &amp; Route Coordinator</span>
        </div>
        <nav className="crd-nav">
          {NAV.map(([to, label, icon, count]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon name={icon} />
              <span>{label}</span>
              {!!count && <em className="crd-nav__count">{count}</em>}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="crd-main">
        <header className="crd-topbar">
          <h1>{title}</h1>
          <div className="crd-topbar__user">
            <DemoDataToggle role="coordinator" />
            <ThemeToggle showLabel={false} />
            <button type="button" className="crd-icon-btn" aria-label="Thông báo"><Icon name="bell" /></button>

            {/* Menu người dùng / Tài khoản */}
            <div className="crd-user-wrap" ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="crd-user-widget"
                onClick={() => setUserMenuOpen((v: boolean) => !v)}
                aria-label="Menu tài khoản"
                aria-expanded={userMenuOpen}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'transparent', border: '1px solid transparent', borderRadius: '20px',
                  padding: '4px 8px 4px 4px', cursor: 'pointer', color: 'inherit', font: 'inherit',
                }}
              >
                <span className="crd-avatar">DQ</span>
                <span className="crd-user-name">{COORDINATOR_NAME}</span>
                <Icon name="chevron" className="crd-user-chevron" />
              </button>

              {userMenuOpen && (
                <div
                  className="crd-user-menu"
                  role="menu"
                  style={{
                    position: 'absolute', top: '44px', right: 0, zIndex: 50, width: '240px',
                    background: 'var(--crd-card)', border: '1px solid var(--crd-line)',
                    borderRadius: '12px', boxShadow: '0 16px 40px rgba(15, 23, 42, .16)', padding: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px' }}>
                    <span className="crd-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>DQ</span>
                    <div>
                      <b style={{ display: 'block', fontSize: 13 }}>{COORDINATOR_NAME}</b>
                      <span style={{ fontSize: 11, color: 'var(--crd-muted)' }}>Fleet & Route Coordinator</span>
                    </div>
                  </div>
                  <div style={{ height: '1px', background: 'var(--crd-line)', margin: '6px 0' }} />
                  <button
                    type="button"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                      border: 0, background: 'none', padding: '9px 12px', borderRadius: '8px',
                      cursor: 'pointer', font: '500 13px Inter, sans-serif', color: 'var(--crd-ink)',
                    }}
                    onClick={() => { setUserMenuOpen(false); navigate('/coordinator/dashboard'); }}
                  >
                    <Icon name="home" /> Tổng quan
                  </button>
                  <button
                    type="button"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                      border: 0, background: 'none', padding: '9px 12px', borderRadius: '8px',
                      cursor: 'pointer', font: '500 13px Inter, sans-serif', color: 'var(--crd-ink)',
                    }}
                    onClick={() => { setUserMenuOpen(false); navigate('/coordinator/trips'); }}
                  >
                    <Icon name="map" /> Quản lý chuyến
                  </button>
                  <div style={{ height: '1px', background: 'var(--crd-line)', margin: '6px 0' }} />
                  <button
                    type="button"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                      border: 0, background: 'none', padding: '9px 12px', borderRadius: '8px',
                      cursor: 'pointer', font: '500 13px Inter, sans-serif', color: '#dc2626',
                    }}
                    onClick={handleLogout}
                  >
                    <Icon name="logout" /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="crd-view">{children}</main>
      </div>

      {toast && <div className="crd-toast" role="status" key={toast.id}>{toast.message}</div>}
    </div>
  );
};

export default CoordinatorLayout;
