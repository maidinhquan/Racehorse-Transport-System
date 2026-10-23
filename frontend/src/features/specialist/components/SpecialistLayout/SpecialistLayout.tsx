import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../../../../shared/components';
import { useSpecialist } from '../../hooks/useSpecialist';
import { SPECIALIST_INITIALS, SPECIALIST_NAME } from '../../data/mockData';
import './SpecialistLayout.css';

// ---------------------------------------------------------------------------
// Icon dùng chung trong feature
// ---------------------------------------------------------------------------
const PATHS: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  truck: <><path d="M2 6h12v10H2zM14 9h4l4 4v3h-8z" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="m15 18-6-6 6-6" />,
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0" />,
  alert: <path d="M12 3 2 20h20zM12 10v4M12 17h.01" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  file: <><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M8 13h8M8 17h5" /></>,
  shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  download: <path d="M12 4v12M7 11l5 5 5-5M5 20h14" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
};
export const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <svg className={`spc-i ${className}`} viewBox="0 0 24 24" aria-hidden="true">{PATHS[name] ?? null}</svg>
);

interface SpecialistLayoutProps {
  title: string;
  children: React.ReactNode;
}

/** Layout trang Transport Specialist: sidebar + topbar + toast */
export const SpecialistLayout: React.FC<SpecialistLayoutProps> = ({ title, children }) => {
  const navigate = useNavigate();
  const { stats, toast, actions } = useSpecialist();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => actions.clearToast(), 3800);
    return () => clearTimeout(timer);
  }, [toast, actions]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
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
    ['/specialist/dashboard', 'Tổng quan', 'home'],
    ['/specialist/trips', 'Chuyến được giao', 'truck', stats.awaiting],
    ['/specialist/regulations', 'Quy định & thiết lập', 'list'],
    ['/specialist/audit', 'Lịch sử thao tác', 'clock'],
  ];

  return (
    <div className="spc-app">
      <aside className="spc-sidebar">
        <NavLink to="/specialist/dashboard" className="spc-brand" style={{ textDecoration: 'none', display: 'block' }}>
          CBN Transport
        </NavLink>
        <div className="spc-role"><b>Transport Specialist</b><span>Hồ sơ pháp lý & quy định</span></div>
        <nav className="spc-nav">
          {NAV.map(([to, label, icon, count]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon name={icon} /><span>{label}</span>{!!count && <em className="spc-nav__count">{count}</em>}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="spc-main">
        <header className="spc-topbar">
          <h1>{title}</h1>
          <div className="spc-topbar__user">
            <ThemeToggle showLabel={false} />
            <button type="button" className="spc-icon-btn" aria-label="Thông báo"><Icon name="bell" /></button>
            
            <div className="spc-user-wrap" ref={userMenuRef}>
              <button
                type="button"
                className="spc-user-widget"
                onClick={() => setUserMenuOpen((v: boolean) => !v)}
                aria-label="Menu chuyên viên"
                aria-expanded={userMenuOpen}
              >
                <span className="spc-avatar">{SPECIALIST_INITIALS}</span>
                <span className="spc-user-name">{SPECIALIST_NAME}</span>
                <Icon name="chevron" className="spc-user-chevron" />
              </button>

              {userMenuOpen && (
                <div className="spc-user-menu" role="menu">
                  <div className="spc-user-menu__header">
                    <div className="spc-user-menu__avatar">{SPECIALIST_INITIALS}</div>
                    <div className="spc-user-menu__info">
                      <b>{SPECIALIST_NAME}</b>
                      <span>Transport Specialist</span>
                    </div>
                  </div>
                  <div className="spc-user-menu__divider" />
                  <button type="button" className="spc-user-menu__item" onClick={() => { setUserMenuOpen(false); navigate('/specialist/dashboard'); }}>
                    <Icon name="home" /> Tổng quan
                  </button>
                  <button type="button" className="spc-user-menu__item" onClick={() => { setUserMenuOpen(false); navigate('/specialist/trips'); }}>
                    <Icon name="truck" /> Chuyến được giao
                  </button>
                  <button type="button" className="spc-user-menu__item" onClick={() => { setUserMenuOpen(false); navigate('/specialist/regulations'); }}>
                    <Icon name="list" /> Quy định & thiết lập
                  </button>
                  <div className="spc-user-menu__divider" />
                  <button type="button" className="spc-user-menu__item spc-user-menu__logout" onClick={handleLogout}>
                    <Icon name="logout" /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <nav className="spc-mobile-nav">
          {NAV.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>)}
        </nav>
        <main className="spc-view">{children}</main>
      </div>
      {toast && <div className="spc-toast" role="status" key={toast.id}>{toast.message}</div>}
    </div>
  );
};

export default SpecialistLayout;
