import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { DemoDataToggle, ThemeToggle } from '../../../../shared/components';
import { useDriver } from '../../hooks/useDriver';
import { DRIVER_USERS } from '../../data/mockData';
import './DriverLayout.css';

// ---------------------------------------------------------------------------
// Icon dùng chung trong feature
// ---------------------------------------------------------------------------
const PATHS: Record<string, React.ReactNode> = {
  map: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>,
  truck: <><path d="M2 6h12v10H2zM14 9h4l4 4v3h-8z" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  alert: <path d="M12 3 2 20h20zM12 10v4M12 17h.01" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pin: <><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  back: <path d="m15 18-6-6 6-6" />,
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /></>,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
};
export const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <svg className={`drv-i ${className}`} viewBox="0 0 24 24" aria-hidden="true">{PATHS[name] ?? null}</svg>
);

const initials = (name = '') => name.replace(/^Dr\.\s*/, '').split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase();
const roleText = (role?: string) => (role === 'VETERINARIAN' ? 'Hộ tống • Bác sĩ thú y' : role === 'ESCORT' ? 'Hộ tống' : 'Tài xế');

// ---------------------------------------------------------------------------
// Layout: sidebar (desktop) + thanh điều hướng dưới (mobile) + topbar + toast
// ---------------------------------------------------------------------------
interface DriverLayoutProps {
  title: string;
  children: React.ReactNode;
}

export const DriverLayout: React.FC<DriverLayoutProps> = ({ title, children }) => {
  const navigate = useNavigate();
  const { me, crew, activeTrips, incidents, toast, actions } = useDriver();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => actions.clearToast(), 3500);
    return () => clearTimeout(timer);
  }, [toast, actions]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const logout = () => {
    ['accessToken', 'user', 'userFullName', 'userEmail', 'userRole'].forEach((k) => sessionStorage.removeItem(k));
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const openIncidents = incidents.filter((i) => activeTrips.some((t) => t.id === i.tripId) && !['RESOLVED', 'CLOSED'].includes(i.status)).length;
  const NAV: Array<[string, string, string, number?]> = [
    ['/driver/journey', 'Hành trình', 'map', activeTrips.length],
    ['/driver/trips', 'Chuyến đi', 'truck'],
    ['/driver/incidents', 'Sự cố', 'alert', openIncidents],
    ['/driver/history', 'Lịch sử', 'clock'],
  ];
  const demoUsers = DRIVER_USERS.map((id) => crew.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c);

  return (
    <div className="drv-app">
      <aside className="drv-sidebar">
        <NavLink to="/driver/journey" className="drv-brand">CBN Transport</NavLink>
        <div className="drv-role">
          <b>Tài xế &amp; Hộ tống</b>
          <span>Driver / Escort portal</span>
        </div>
        <nav className="drv-nav">
          {NAV.map(([to, label, icon, count]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon name={icon} />
              <span>{label}</span>
              {!!count && <em className="drv-nav__count">{count}</em>}
            </NavLink>
          ))}
        </nav>
        <p className="drv-sidebar__hint">Không có GPS trực tiếp: vị trí chuyến dựa trên các mốc bạn xác nhận.</p>
      </aside>

      <div className="drv-main">
        <header className="drv-topbar">
          <h1>{title}</h1>
          <div className="drv-topbar__right">
            <DemoDataToggle role="driver" compact />
            <ThemeToggle showLabel={false} />
            <div className="drv-user" ref={menuRef}>
              <button type="button" className="drv-user__btn" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-label="Menu tài khoản">
                <span className="drv-avatar">{initials(me?.name) || 'TX'}</span>
                <span className="drv-user__text"><b>{me?.name ?? 'Tài xế'}</b><small>{roleText(me?.role)}</small></span>
                <Icon name="chevron" />
              </button>
              {menuOpen && (
                <div className="drv-user__menu" role="menu">
                  {demoUsers.length > 0 && <div className="drv-user__label">Đổi tài khoản demo</div>}
                  {demoUsers.map((c) => (
                    <button key={c.id} type="button" role="menuitem" className={c.id === me?.id ? 'on' : ''}
                      onClick={() => { setMenuOpen(false); actions.switchUser(c.id); navigate('/driver/journey'); }}>
                      <span className="drv-avatar drv-avatar--sm">{initials(c.name)}</span>
                      <span><b>{c.name}</b><small>{roleText(c.role)}</small></span>
                      {c.id === me?.id && <Icon name="check" />}
                    </button>
                  ))}
                  <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/driver/profile'); }}>
                    <Icon name="user" /> Hồ sơ của tôi
                  </button>
                  <hr />
                  <button type="button" role="menuitem" className="drv-user__logout" onClick={logout}><Icon name="logout" /> Đăng xuất</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="drv-view">{children}</main>
      </div>

      <nav className="drv-bottomnav" aria-label="Điều hướng">
        {NAV.map(([to, label, icon, count]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name={icon} />
            <span>{label}</span>
            {!!count && <em>{count}</em>}
          </NavLink>
        ))}
      </nav>

      {toast && <div className="drv-toast" role="status" key={toast.id}>{toast.message}</div>}
    </div>
  );
};

export default DriverLayout;
