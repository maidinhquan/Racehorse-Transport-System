// Khung trang Điều phối: thanh bên, thanh trên (thông báo, tài khoản), hộp thoại, thông báo nhanh
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { Any } from '../../store/coordinatorStore';
import { commit, db, go, me, setNavigator, toastState, useCoordinatorStore } from '../../store/coordinatorStore';
import '../../styles/coordinator.css';
import { coordNavCount } from '../../workflows/incidentOperations';
import { ModalHost } from '../common/ModalHost';
import { Icon, IconSprite } from '../common/ui';
import { formatNotification } from '../../../../shared/utils/notificationFormat';
import { requestReviewApi } from '../../../../shared/api/requestReviewApi';

const NAV: Array<[string, string, string]> = [
  ['/coordinator/dashboard', 'Tổng quan', 'home'],
  ['/coordinator/request-reviews', 'Thẩm định yêu cầu', 'list'],
  ['/coordinator/monitor', 'Giám sát hành trình', 'map'],
  ['/coordinator/places', 'Quản lý địa điểm', 'list'],
  ['/coordinator/fleet', 'Đội xe', 'truck'],
  ['/coordinator/crew', 'Quản lý nhân sự', 'users'],
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
  const u = me() || { name: 'Phạm Hải', initials: 'PH' };
  const notes = myNotifs(), unread = notes.filter((n: Any) => !n.read).length;
  const incCount = coordNavCount();
  const [reviewCount, setReviewCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    const fetchQueue = () => {
      requestReviewApi.queue('coordinator')
        .then((rows) => {
          if (active && Array.isArray(rows)) setReviewCount(rows.length);
        })
        .catch(() => {});
    };
    fetchQueue();
    const timer = setInterval(fetchQueue, 15000);
    window.addEventListener('rts_requests_updated', fetchQueue);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('rts_requests_updated', fetchQueue);
    };
  }, []);
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
              {to.endsWith('request-reviews') && reviewCount > 0 ? (
                <span className="badge-count" title={`${reviewCount} yêu cầu chờ thẩm định`}>{reviewCount}</span>
              ) : null}
              {to.endsWith('incidents') && incCount ? <span className="badge-count">{incCount}</span> : null}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <div className="user" ref={userRef}>
            <div className="coord-notif-anchor">
              <button type="button" className="icon-btn" aria-label="Thông báo" onClick={() => setMenu(menu === 'notif' ? '' : 'notif')}>
                <span className={`bell ${unread ? 'dot' : ''}`}><Icon name="bell" /></span>
              </button>
              {menu === 'notif' && (
                <div className="coord-notif" role="menu">
                  <div className="coord-notif__head">
                    <div className="coord-notif__title-wrap">
                      <span className="coord-notif__title">Thông báo</span>
                      {unread > 0 && <span className="coord-notif__badge-count">{unread} mới</span>}
                    </div>
                    {unread > 0 && (
                      <button type="button" className="coord-notif__mark" onClick={() => { notes.forEach((n: Any) => { n.read = true; }); commit(); }}>
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                  <div className="coord-notif__list">
                    {notes.length === 0 && (
                      <div className="coord-notif__empty">
                        <Icon name="bell" />
                        <p>Bạn không có thông báo nào.</p>
                      </div>
                    )}
                    {notes.slice(0, 8).map((raw: Any) => {
                      const n = formatNotification({ id: raw.id, title: raw.title, body: raw.body, at: raw.at, read: raw.read, link: raw.go });
                      return (
                        <button
                          type="button"
                          key={raw.id}
                          className={`coord-notif__item ${raw.read ? 'read' : 'unread'}`}
                          onClick={() => { raw.read = true; commit(); setMenu(''); if (raw.go) go(raw.go); }}
                        >
                          <span className={`coord-notif__icon-box tone-${n.tone}`}>
                            <Icon name={n.icon} />
                          </span>
                          <div className="coord-notif__content">
                            <div className="coord-notif__item-head">
                              <b>{n.title}</b>
                              {!raw.read && <span className="coord-notif__unread-dot" />}
                            </div>
                            <span className="coord-notif__body">{n.body}</span>
                            <small className="coord-notif__time">
                              <Icon name="clock" /> {raw.at}
                            </small>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="coord-notif__foot">
                    <button type="button" className="coord-notif__view-all-btn" onClick={() => { setMenu(''); go('f/notifications'); }}>
                      <span>Xem tất cả thông báo ({notes.length})</span>
                      <Icon name="chev" className="i coord-notif__chevron-right" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button type="button" className="icon-btn" onClick={() => setMenu(menu === 'account' ? '' : 'account')}>
              <span className="avatar">{u.initials}</span><span className="user-name">{u.name}</span><Icon name="chev" className="i chev" />
            </button>
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
