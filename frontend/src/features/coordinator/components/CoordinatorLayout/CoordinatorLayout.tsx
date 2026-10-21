import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ThemeToggle } from '../../../../shared/components';
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
  const { stats, toast, actions } = useCoordinator();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => actions.clearToast(), 3500);
    return () => clearTimeout(timer);
  }, [toast, actions]);

  const NAV: Array<[string, string, string, number?]> = [
    ['/coordinator/dashboard', 'Tổng quan', 'home'],
    ['/coordinator/trips', 'Quản lý chuyến', 'map', stats.needRoute + stats.needResources],
    ['/coordinator/fleet', 'Đội xe', 'truck'],
    ['/coordinator/crew', 'Phân công nhân sự', 'users'],
    ['/coordinator/flights', 'Chuyến bay', 'plane'],
    ['/coordinator/incidents', 'Sự cố', 'alert', stats.openIncidents],
  ];

  return (
    <div className="crd-app">
      <aside className="crd-sidebar">
        <div className="crd-brand">CBN Transport</div>
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
            <ThemeToggle showLabel={false} />
            <button type="button" className="crd-icon-btn" aria-label="Thông báo"><Icon name="bell" /></button>
            <span className="crd-avatar">DQ</span>
            <span className="crd-user-name">{COORDINATOR_NAME}</span>
          </div>
        </header>
        <main className="crd-view">{children}</main>
      </div>

      {toast && <div className="crd-toast" role="status" key={toast.id}>{toast.message}</div>}
    </div>
  );
};

export default CoordinatorLayout;
