// Trang thông báo và hồ sơ của Điều phối
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/common/ui';
import { CoordinatorLayout, myNotifs } from '../../components/layout/CoordinatorLayout';
import type { Any } from '../../store/coordinatorStore';
import { commit, useCoordinatorStore } from '../../store/coordinatorStore';
import { dt } from '../../utils/format';
import { notifOpen } from '../../workflows/coordinatorActions';
import { formatNotification } from '../../../../shared/utils/notificationFormat';
import './CoordinatorNotificationsPage.css';

export function NotificationsPage() {
  useCoordinatorStore();
  const navigate = useNavigate();
  const list = myNotifs();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [search, setSearch] = useState('');

  const formattedList = useMemo(() => {
    return list.map((raw: Any) =>
      formatNotification({
        id: raw.id,
        title: raw.title,
        body: raw.body,
        at: raw.at,
        read: raw.read,
        link: raw.go ? `/coordinator/${raw.go.replace(/^f\//, '')}` : '',
      })
    );
  }, [list]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return formattedList.filter((n) => {
      if (filter === 'unread' && n.read) return false;
      if (filter === 'read' && !n.read) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        n.at.toLowerCase().includes(q)
      );
    });
  }, [formattedList, filter, search]);

  const unreadCount = list.filter((n: Any) => !n.read).length;
  const readCount = list.length - unreadCount;

  const markAllRead = () => {
    list.forEach((n: Any) => {
      n.read = true;
    });
    commit();
  };

  const toggleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const item = list.find((n: Any) => n.id === id);
    if (item) {
      item.read = !item.read;
      commit();
    }
  };

  const handleClick = (n: ReturnType<typeof formatNotification>) => {
    const item = list.find((x: Any) => x.id === n.id);
    if (item && !item.read) {
      item.read = true;
      commit();
    }
    if (item?.go) {
      notifOpen(n.id);
    } else if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <CoordinatorLayout title="Thông báo">
      <div className="coord-notif-page">
        <div className="coord-notif-page__head">
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px' }}>Thông báo Điều phối</h2>
            <p style={{ margin: 0, color: '#64748b' }}>
              {unreadCount > 0 ? `${unreadCount} thông báo mới cần chú ý.` : 'Bạn đã xem hết các thông báo gần đây.'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button type="button" className="btn ghost" onClick={markAllRead}>
              <Icon name="check" /> Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>

        <div className="coord-notif-page__toolbar">
          <label className="coord-notif-page__search">
            <Icon name="search" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm thông báo điều phối…"
            />
          </label>
          <div className="coord-notif-page__filters">
            {(
              [
                ['all', `Tất cả (${list.length})`],
                ['unread', `Chưa đọc (${unreadCount})`],
                ['read', `Đã đọc (${readCount})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`coord-notif-chip ${filter === k ? 'on' : ''}`}
                onClick={() => setFilter(k)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="coord-notif-page__list">
          {filteredList.map((n) => (
            <article
              key={n.id}
              className={`coord-notif-card ${n.read ? 'read' : 'unread'}`}
              onClick={() => handleClick(n)}
            >
              <div className={`coord-notif-card__icon tone-${n.tone}`}>
                <Icon name={n.icon === 'alert' ? 'alert' : n.icon === 'file' ? 'list' : n.icon === 'truck' ? 'truck' : 'bell'} />
              </div>

              <div className="coord-notif-card__body">
                <div className="coord-notif-card__top">
                  <h4 className="coord-notif-card__title">
                    {n.title}
                    {!n.read && <span className="coord-notif-card__new-pill">Mới</span>}
                  </h4>
                  <span className="coord-notif-card__time">
                    {dt(n.at)}
                  </span>
                </div>
                <p className="coord-notif-card__text">{n.body}</p>
                <div className="coord-notif-card__actions">
                  <span className="coord-notif-card__link">
                    Xem chi tiết →
                  </span>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={(e) => toggleRead(n.id, e)}
                  >
                    Đánh dấu {n.read ? 'chưa đọc' : 'đã đọc'}
                  </button>
                </div>
              </div>
            </article>
          ))}

          {filteredList.length === 0 && (
            <div className="coord-notif-empty">
              <div className="coord-notif-empty__icon">
                <Icon name="bell" />
              </div>
              <h3>Không tìm thấy thông báo nào</h3>
              <p>
                {search
                  ? 'Không có thông báo nào khớp với từ khóa tìm kiếm.'
                  : filter === 'unread'
                  ? 'Tuyệt vời! Bạn không còn thông báo chưa đọc nào.'
                  : 'Chưa có thông báo nào được ghi nhận.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </CoordinatorLayout>
  );
}

export default NotificationsPage;
