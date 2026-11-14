import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ManagerLayout, Icon } from '../../components/ManagerLayout';
import { useManager } from '../../hooks/useManager';
import { fmtDateTime } from '../../hooks/managerRules';
import { formatNotification } from '../../../../shared/utils/notificationFormat';
import './ManagerNotificationsPage.css';

export const ManagerNotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, stats, actions } = useManager();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [search, setSearch] = useState('');

  const formattedList = useMemo(() => {
    return notifications.map((raw) =>
      formatNotification({
        id: raw.id,
        title: raw.title,
        body: raw.text,
        at: raw.at,
        read: raw.read,
        link: raw.link,
      })
    );
  }, [notifications]);

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

  const unreadCount = stats.unread;
  const readCount = notifications.length - unreadCount;

  const handleItemClick = (n: ReturnType<typeof formatNotification>) => {
    if (!n.read) {
      actions.markRead(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <ManagerLayout title="Thông báo">
      <div className="mgr-notif-page">
        <button type="button" className="mgr-back" onClick={() => navigate(-1)}>
          <Icon name="back" /> Quay lại
        </button>

        <div className="mgr-head mgr-notif-page__head">
          <div>
            <h2 className="mgr-title" style={{ fontSize: 24, fontWeight: 800, margin: '8px 0 4px' }}>Thông báo Quản lý</h2>
            <p className="mgr-subtitle" style={{ margin: 0, color: 'var(--mgr-muted)' }}>
              Theo dõi toàn bộ cập nhật xét duyệt yêu cầu, tiến trình hợp đồng, thanh toán cọc và diễn biến các chuyến đi.
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              className="mgr-btn mgr-btn--solid"
              onClick={actions.markAllRead}
            >
              <Icon name="check" /> Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>

        <div className="mgr-toolbar mgr-notif-page__toolbar">
          <label className="mgr-search" style={{ flex: 1, minWidth: 260 }}>
            <Icon name="search" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm nội dung thông báo…"
            />
          </label>
          <div className="mgr-notif-page__filters">
            {(
              [
                ['all', `Tất cả (${notifications.length})`],
                ['unread', `Chưa đọc (${unreadCount})`],
                ['read', `Đã đọc (${readCount})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`mgr-chip ${filter === k ? 'on' : ''}`}
                onClick={() => setFilter(k)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mgr-notif-page__list">
          {filteredList.map((n) => (
            <article
              key={n.id}
              className={`mgr-notif-card ${n.read ? 'read' : 'unread'}`}
              onClick={() => handleItemClick(n)}
            >
              <div className={`mgr-notif-card__icon tone-${n.tone}`}>
                <Icon name={n.icon} />
              </div>

              <div className="mgr-notif-card__body">
                <div className="mgr-notif-card__top">
                  <h4 className="mgr-notif-card__title">
                    {n.title}
                    {!n.read && <span className="mgr-notif-card__new-pill">Mới</span>}
                  </h4>
                  <span className="mgr-notif-card__time">
                    <Icon name="clock" /> {fmtDateTime(n.at)}
                  </span>
                </div>
                <p className="mgr-notif-card__text">{n.body}</p>
                <div className="mgr-notif-card__actions">
                  <span className="mgr-notif-card__link">
                    Xem chi tiết →
                  </span>
                  {!n.read && (
                    <button
                      type="button"
                      className="mgr-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        actions.markRead(n.id);
                      }}
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}

          {filteredList.length === 0 && (
            <div className="mgr-notif-empty">
              <div className="mgr-notif-empty__icon">
                <Icon name="bell" />
              </div>
              <h3>Không tìm thấy thông báo nào</h3>
              <p>
                {search
                  ? 'Không có thông báo nào khớp với từ khóa tìm kiếm của bạn.'
                  : filter === 'unread'
                  ? 'Tuyệt vời! Bạn không còn thông báo chưa đọc nào.'
                  : 'Bạn hiện chưa có thông báo nào trong hệ thống.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </ManagerLayout>
  );
};

export default ManagerNotificationsPage;
