// Khung trang Điều phối: thanh bên, thanh trên (thông báo, tài khoản), hộp thoại, thông báo nhanh
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { DemoDataToggle } from '../../../../shared/components';
import type { Any } from '../../store/coordinatorStore';
import { commit, db, go, me, setNavigator, toastState, useCoordinatorStore } from '../../store/coordinatorStore';
import '../../styles/coordinator.css';
import { coordNavCount } from '../../workflows/incidentOperations';
import { ModalHost } from '../common/ModalHost';
import { Icon, IconSprite } from '../common/ui';

const NAV: Array<[string, string, string]> = [
  ['/coordinator/dashboard', 'Tổng quan', 'home'],
  ['/coordinator/monitor', 'Giám sát hành trình', 'map'],
  ['/coordinator/places', 'Quản lý địa điểm', 'list'],
  ['/coordinator/fleet', 'Đội xe', 'truck'],
  ['/coordinator/crew', 'Quản lý nhân sự', 'users'],
  ['/coordinator/flights', 'Dịch vụ bay & đối tác', 'plane'],
  ['/coordinator/incidents', 'Sự cố & khiếu nại', 'alert'],
];

export const myNotifs = () => db.notifications.filter((n: Any) => n.to === 'FLEET_COORDINATOR').sort((a: Any, b: Any) => b.at.localeCompare(a.at));

export function CoordinatorLayout({ title, children, active }: { title: string; children: ReactNode; active?: string }) {
  useCoordinatorStore();
  const navigate = useNavigate();
  const [menu, setMenu] = useState<'' | 'notif' | 'account'>('');
  const userRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setNavigator((p) => navigate(p)); }, [navigate]);
  // Bản demo chỉ có giao diện sáng: giữ nguyên lựa chọn giao diện của các vai trò khác
  useEffect(() => {
    const html = document.documentElement, prev = html.getAttribute('data-theme');
    html.setAttribute('data-theme', 'light');
    return () => { if (prev) html.setAttribute('data-theme', prev); };
  }, []);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (menu && userRef.current && !userRef.current.contains(e.target as Node)) setMenu(''); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);
  const u = me() || { name: 'Dang Minh Quan', initials: 'DQ' };
  const notes = myNotifs(), unread = notes.filter((n: Any) => !n.read).length;
  const incCount = coordNavCount();
  const logout = () => {
    ['accessToken', 'user', 'userFullName', 'userEmail', 'userRole'].forEach((k) => sessionStorage.removeItem(k));
    localStorage.removeItem('accessToken'); localStorage.removeItem('user');
    navigate('/login');
  };
  return (
    <div className="cbn-coord">
      <IconSprite />
      <aside className="sidebar">
        <div className="brand" onClick={() => go('f/dashboard')}>CBN Transport</div>
        <div className="role-chip"><b>Điều phối đội xe &amp; tuyến</b>Cổng demo</div>
        <nav className="nav">
          {NAV.map(([to, label, ic]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive || active === to ? 'active' : '')}>
              <Icon name={ic} />{label}
              {to.endsWith('incidents') && incCount ? <span className="badge-count">{incCount}</span> : null}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <div className="user" ref={userRef}>
            <DemoDataToggle role="coordinator" compact />
            <button type="button" className="icon-btn" aria-label="Thông báo" onClick={() => setMenu(menu === 'notif' ? '' : 'notif')}>
              <span className={`bell ${unread ? 'dot' : ''}`} data-count={unread ? (unread > 9 ? '9+' : String(unread)) : ''}><Icon name="bell" /></span>
            </button>
            <button type="button" className="icon-btn" onClick={() => setMenu(menu === 'account' ? '' : 'account')}>
              <span className="avatar">{u.initials}</span><span className="user-name">{u.name}</span><Icon name="chev" className="i chev" />
            </button>
            <div className={`menu ${menu === 'notif' ? 'open' : ''}`}>
              <h4>Thông báo</h4>
              {notes.length ? notes.slice(0, 6).map((n: Any) => (
                <button type="button" key={n.id} className={n.read ? '' : 'unread'} onClick={() => { n.read = true; setMenu(''); if (n.go) go(n.go); else commit(); }}>
                  <b>{n.title}</b><span>{n.body}</span>
                </button>
              )) : <small>Bạn đã xem hết thông báo.</small>}
              <hr />
              <button type="button" className="menu-foot" onClick={() => { setMenu(''); go('f/notifications'); }}>Xem tất cả thông báo</button>
            </div>
            <div className={`menu ${menu === 'account' ? 'open' : ''}`}>
              <h4>{u.name}</h4><small>Điều phối đội xe &amp; tuyến</small>
              <hr />
              <button type="button" onClick={() => { setMenu(''); go('f/profile'); }}>Hồ sơ của tôi</button>
              <hr />
              <button type="button" onClick={logout}>Đăng xuất</button>
            </div>
          </div>
        </header>
        <main className="view">{children}</main>
      </div>
      <div className={`toast ${toastState.msg ? 'show' : ''}`} role="status">{toastState.msg}</div>
      <ModalHost />
    </div>
  );
}

export default CoordinatorLayout;
