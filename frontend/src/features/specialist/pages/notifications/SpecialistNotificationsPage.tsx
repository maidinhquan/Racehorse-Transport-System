import type { SpecialistNotification } from '../../data/mockData';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpecialistLayout, Icon } from '../../components/SpecialistLayout';
import { useSpecialist } from '../../hooks/useSpecialist';
import { fmtDateTime } from '../../hooks/specialistRules';
import { formatNotification } from '../../../../shared/utils/notificationFormat';
import './SpecialistNotificationsPage.css';

export const SpecialistNotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadNotificationsCount, actions } = useSpecialist();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [search, setSearch] = useState('');

  const formattedList = useMemo(() => {
    return notifications.map((raw: SpecialistNotification) =>
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

  const readCount = notifications.length - unreadNotificationsCount;

  const handleItemClick = (n: ReturnType<typeof formatNotification>) => {
    if (!n.read) {
      actions.markNotificationRead(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <SpecialistLayout title="Thông báo">
      <div className="spc-notif-page">
        <button type="button" className="spc-back" onClick={() => navigate(-1)}>
          <Icon name="back" /> Quay lại
        </button>

        <div className="spc-head spc-notif-page__head">
          <div>
            <h2 className="spc-title" style={{ fontSize: 24, fontWeight: 800, margin: '8px 0 4px' }}>
              Thông báo Chuyên viên
            </h2>
            <p className="spc-subtitle" style={{ margin: 0, color: 'var(--spc-muted)' }}>
              Theo dõi toàn bộ cập nhật hồ sơ kiểm dịch, thẩm định chuyến đi, phê duyệt tài liệu và báo cáo kiểm tra ngựa.
            </p>
          </div>
          {unreadNotificationsCount > 0 && (
            <button
              type="button"
              className="spc-btn spc-btn--solid"
              onClick={actions.markAllNotificationsRead}
            >
              <Icon name="check" /> Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>

        <div className="spc-toolbar spc-notif-page__toolbar">
          <label className="spc-search" style={{ flex: 1, minWidth: 260 }}>
            <Icon name="search" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm nội dung thông báo…"
            />
          </label>
          <div className="spc-notif-page__filters">
            {(
              [
                ['all', `Tất cả (${notifications.length})`],
                ['unread', `Chưa đọc (${unreadNotificationsCount})`],
                ['read', `Đã đọc (${readCount})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`spc-chip ${filter === k ? 'on' : ''}`}
                onClick={() => setFilter(k)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="spc-notif-page__list">
          {filteredList.map((n: ReturnType<typeof formatNotification>) => (
            <article
              key={n.id}
              className={`spc-notif-card ${n.read ? 'read' : 'unread'}`}
              onClick={() => handleItemClick(n)}
            >
              <div className={`spc-notif-card__icon tone-${n.tone}`}>
                <Icon name={n.icon} />
              </div>

              <div className="spc-notif-card__body">
                <div className="spc-notif-card__top">
                  <h4 className="spc-notif-card__title">
                    {n.title}
                    {!n.read && <span className="spc-notif-card__new-pill">Mới</span>}
                  </h4>
                  <span className="spc-notif-card__time">
                    <Icon name="clock" /> {fmtDateTime(n.at)}
                  </span>
                </div>
                <p className="spc-notif-card__text">{n.body}</p>
                <div className="spc-notif-card__actions">
                  <span className="spc-notif-card__link">
                    Xem chi tiết →
                  </span>
                  {!n.read && (
                    <button
                      type="button"
                      className="spc-link"
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
            <div className="spc-notif-card__empty">
              <div className="spc-notif-card__empty-icon">
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
    </SpecialistLayout>
  );
};

export default SpecialistNotificationsPage;
