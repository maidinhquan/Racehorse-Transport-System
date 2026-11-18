// Khung trang Điều phối: chuẩn hóa qua DashboardLayout chung
import type { ReactNode } from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Any } from '../../store/coordinatorStore';
import { commit, db, go, me, setNavigator, toastState, useCoordinatorStore } from '../../store/coordinatorStore';
import '../../styles/coordinator.css';
import { coordNavCount } from '../../workflows/incidentOperations';
import { ModalHost } from '../common/ModalHost';
import { Icon, IconSprite } from '../common/ui';
import { formatNotification } from '../../../../shared/utils/notificationFormat';
import { requestReviewApi } from '../../../../shared/api/reviews/requestReviewApi';
import { DashboardLayout } from '../../../../shared/layouts/DashboardLayout';

export const myNotifs = () =>
  db.notifications
    .filter((n: Any) => n.to === 'FLEET_COORDINATOR')
    .sort((a: Any, b: Any) => b.at.localeCompare(a.at));

export function CoordinatorLayout({
  title,
  children,
  active: _active,
}: {
  title: string;
  children: ReactNode;
  active?: string;
}) {
  useCoordinatorStore();
  const navigate = useNavigate();

  useEffect(() => {
    setNavigator((p) => navigate(p));
  }, [navigate]);

  const u = me() || { name: 'Phạm Hải', initials: 'PH' };
  const notes = myNotifs();
  const unread = notes.filter((n: Any) => !n.read).length;
  const incCount = coordNavCount();
  const [reviewCount, setReviewCount] = useState<number>(0);

  useEffect(() => {
    let activeEffect = true;
    const fetchQueue = () => {
      requestReviewApi
        .queue('coordinator')
        .then((rows) => {
          if (activeEffect && Array.isArray(rows)) setReviewCount(rows.length);
        })
        .catch(() => {});
    };
    fetchQueue();
    const timer = setInterval(fetchQueue, 15000);
    window.addEventListener('rts_requests_updated', fetchQueue);
    return () => {
      activeEffect = false;
      clearInterval(timer);
      window.removeEventListener('rts_requests_updated', fetchQueue);
    };
  }, []);

  const menu = [
    { path: '/coordinator/dashboard', label: 'Tổng quan', icon: <Icon name="home" /> },
    {
      path: '/coordinator/request-reviews',
      label: 'Thẩm định yêu cầu',
      icon: <Icon name="list" />,
      badge: reviewCount,
    },
    { path: '/coordinator/monitor', label: 'Giám sát hành trình', icon: <Icon name="map" /> },
    { path: '/coordinator/places', label: 'Quản lý địa điểm', icon: <Icon name="list" /> },
    { path: '/coordinator/fleet', label: 'Đội xe', icon: <Icon name="truck" /> },
    { path: '/coordinator/crew', label: 'Quản lý nhân sự', icon: <Icon name="users" /> },
    {
      path: '/coordinator/incidents',
      label: 'Sự cố & khiếu nại',
      icon: <Icon name="alert" />,
      badge: incCount,
    },
  ];

  const formattedNotifs = useMemo(() => {
    return notes.map((raw: Any) => {
      const n = formatNotification({
        id: raw.id,
        title: raw.title,
        body: raw.body,
        at: raw.at,
        read: raw.read,
        link: raw.go,
      });
      return {
        id: raw.id,
        title: n.title,
        body: n.body,
        time: raw.at,
        unread: !raw.read,
        link: raw.go ? `/coordinator/${raw.go.replace(/^f\//, '')}` : undefined,
      };
    });
  }, [notes]);

  const handleReadAll = () => {
    notes.forEach((n: Any) => {
      n.read = true;
    });
    commit();
  };

  const handleNotifClick = (item: any) => {
    const raw = notes.find((n: Any) => n.id === item.id);
    if (raw) {
      raw.read = true;
      commit();
      if (raw.go) go(raw.go);
    }
  };

  return (
    <div className="cbn-coord">
      <IconSprite />
      <DashboardLayout
        title={title}
        brandTitle="CBN Transport"
        brandLink="/coordinator/dashboard"
        roleLabel="Điều phối đội xe & tuyến"
        roleDescription="Điều hành lịch trình & phân bổ phương tiện"
        userName={u.name}
        userRoleLabel="Điều phối viên"
        userInitials={u.initials}
        menu={menu}
        notifications={formattedNotifs}
        unreadNotificationsCount={unread}
        notificationsPath="/coordinator/notifications"
        onNotificationClick={handleNotifClick}
        onReadAllNotifications={handleReadAll}
        userProfilePath="/coordinator/profile"
        toast={toastState.msg || null}
      >
        {children}
      </DashboardLayout>
      <ModalHost />
    </div>
  );
}

export default CoordinatorLayout;
