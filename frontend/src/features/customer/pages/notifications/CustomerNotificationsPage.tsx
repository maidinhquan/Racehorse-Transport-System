import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { useCustomer } from '../../hooks/useCustomer';
import { fmtDateTime } from '../../hooks/customerRules';
import { formatNotification } from '../../utils/notificationFormat';
import './CustomerNotificationsPage.css';

export const CustomerNotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, stats, actions } = useCustomer();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [search, setSearch] = useState('');

  const formattedList = useMemo(() => {
    return notifications.map(formatNotification);
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
      actions.markNotificationRead(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <CustomerLayout title="Thông báo">
      <div className="cus-notif-page">
        <button type="button" className="cus-back" onClick={() => navigate(-1)}>
          <Icon name="back" /> Quay lại
        </button>

        <div className="cus-head cus-notif-page__head">
          <div>
            <h2 className="cus-title">Thông báo của tôi</h2>
            <p className="cus-subtitle">
              Xem toàn bộ lịch sử thông báo, cập nhật hợp đồng và hành trình vận chuyển.
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              className="cus-btn cus-btn--solid"
              onClick={actions.markAllNotificationsRead}
            >
              <Icon name="check" /> Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>

        <div className="cus-toolbar cus-notif-page__toolbar">
          <label className="cus-search">
            <Icon name="search" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm nội dung thông báo…"
            />
          </label>
          <div className="cus-notif-page__filters">
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
                className={`cus-chip ${filter === k ? 'on' : ''}`}
                onClick={() => setFilter(k)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="cus-notif-page__list">
          {filteredList.map((n) => (
            <article
              key={n.id}
              className={`cus-notif-card ${n.read ? 'read' : 'unread'}`}
              onClick={() => handleItemClick(n)}
            >
              <div className={`cus-notif-card__icon tone-${n.tone}`}>
                <Icon name={n.icon} />
              </div>

              <div className="cus-notif-card__body">
                <div className="cus-notif-card__top">
                  <h4 className="cus-notif-card__title">
                    {n.title}
                    {!n.read && <span className="cus-notif-card__new-pill">Mới</span>}
                  </h4>
                  <span className="cus-notif-card__time">
                    <Icon name="clock" /> {fmtDateTime(n.at)}
                  </span>
                </div>
                <p className="cus-notif-card__text">{n.body}</p>
                <div className="cus-notif-card__actions">
                  <span className="cus-notif-card__link">
                    Xem chi tiết →
                  </span>
                  {!n.read && (
                    <button
                      type="button"
                      className="cus-link"
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
            <div className="cus-notif-empty">
              <div className="cus-notif-empty__icon">
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
    </CustomerLayout>
  );
};

export default CustomerNotificationsPage;
