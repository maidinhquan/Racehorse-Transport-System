import type { DriverNotification } from '../../data/mockData';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DriverLayout, Icon } from '../../components/DriverLayout';
import { useDriver } from '../../hooks/useDriver';
import { formatNotification } from '../../../../shared/utils/notificationFormat';
import './DriverNotificationsPage.css';

export const DriverNotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadNotificationsCount, actions } = useDriver();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [search, setSearch] = useState('');

  const formattedList = useMemo(() => {
    return (notifications || []).map((raw: DriverNotification) =>
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
    return formattedList.filter((n: ReturnType<typeof formatNotification>) => {
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

  const readCount = (notifications || []).length - unreadNotificationsCount;

  const handleItemClick = (n: ReturnType<typeof formatNotification>) => {
    if (!n.read) {
      actions.markNotificationRead(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <DriverLayout title="Thông báo">
      <div className="drv-notif-page">
        <button type="button" className="drv-back" onClick={() => navigate(-1)}>
          <Icon name="back" /> Quay lại
        </button>

        <div className="drv-head drv-notif-page__head">
          <div>
            <h2 className="drv-title" style={{ fontSize: 24, fontWeight: 800, margin: '8px 0 4px' }}>
              Thông báo Tài xế &amp; Hộ tống
            </h2>
            <p className="drv-subtitle" style={{ margin: 0, color: 'var(--drv-muted)' }}>
              Theo dõi toàn bộ phân công chuyến đi, cập nhật lộ trình, nhật ký sức khỏe và biên bản bàn giao ngựa.
            </p>
          </div>
          {unreadNotificationsCount > 0 && (
            <button
              type="button"
              className="drv-btn drv-btn--solid"
              onClick={actions.markAllNotificationsRead}
            >
              <Icon name="check" /> Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>

        <div className="drv-toolbar drv-notif-page__toolbar">
          <label className="drv-search" style={{ flex: 1, minWidth: 260 }}>
            <Icon name="search" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm nội dung thông báo…"
            />
          </label>
          <div className="drv-notif-page__filters">
            {(
              [
                ['all', `Tất cả (${(notifications || []).length})`],
                ['unread', `Chưa đọc (${unreadNotificationsCount})`],
                ['read', `Đã đọc (${readCount})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`drv-chip ${filter === k ? 'on' : ''}`}
                onClick={() => setFilter(k)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="drv-notif-page__list">
          {filteredList.map((n: ReturnType<typeof formatNotification>) => (
            <article
              key={n.id}
              className={`drv-notif-card ${n.read ? 'read' : 'unread'}`}
              onClick={() => handleItemClick(n)}
            >
              <div className={`drv-notif-card__icon tone-${n.tone}`}>
                <Icon name={n.icon} />
              </div>

              <div className="drv-notif-card__body">
                <div className="drv-notif-card__top">
                  <h4 className="drv-notif-card__title">
                    {n.title}
                    {!n.read && <span className="drv-notif-card__new-pill">Mới</span>}
                  </h4>
                  <span className="drv-notif-card__time">
                    <Icon name="clock" /> {n.at}
                  </span>
                </div>
                <p className="drv-notif-card__text">{n.body}</p>
                <div className="drv-notif-card__actions">
                  <span className="drv-notif-card__link">
                    Xem chi tiết →
                  </span>
                  {!n.read && (
                    <button
                      type="button"
                      className="drv-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        actions.markNotificationRead(n.id);
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
            <div className="drv-notif-card__empty">
              <div className="drv-notif-card__empty-icon">
                <Icon name="bell" />
              </div>
              <h3>Không tìm thấy thông báo nào</h3>
              <p>
                {search
                  ? `Không có kết quả phù hợp với từ khóa "${search}".`
                  : filter === 'unread'
                  ? 'Tuyệt vời! Bạn không còn thông báo chưa đọc nào.'
                  : 'Hiện tại bạn chưa có thông báo nào.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </DriverLayout>
  );
};

export default DriverNotificationsPage;
