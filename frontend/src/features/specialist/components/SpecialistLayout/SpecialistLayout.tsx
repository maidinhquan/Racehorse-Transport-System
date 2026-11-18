import React, { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '../../../../shared/layouts/DashboardLayout';
import { useSpecialist } from '../../hooks/useSpecialist';
import { fmtDateTime } from '../../hooks/specialistRules';
import { formatNotification } from '../../../../shared/utils/notificationFormat';
import { SPECIALIST_INITIALS, SPECIALIST_NAME, type SpecialistNotification } from '../../types';
import { requestReviewApi } from '../../../../shared/api/reviews/requestReviewApi';

// ---------------------------------------------------------------------------
// Icon dùng chung trong feature Specialist (giữ nguyên để không phá vỡ import)
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
  card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  pin: <><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" /><circle cx="12" cy="9" r="2.5" /></>,
  shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  download: <path d="M12 4v12M7 11l5 5 5-5M5 20h14" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
};

export const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <svg className={`spc-i ${className}`} viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2">
    {PATHS[name] ?? null}
  </svg>
);

interface SpecialistLayoutProps {
  title: string;
  children: React.ReactNode;
}

/** Layout trang Transport Specialist - chuẩn hóa qua DashboardLayout chung */
export const SpecialistLayout: React.FC<SpecialistLayoutProps> = ({ title, children }) => {
  const { trips, toast, notifications, unreadNotificationsCount, actions } = useSpecialist();
  const [reviewCount, setReviewCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    const fetchQueue = () => {
      requestReviewApi
        .queue('specialist')
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

  const storedName =
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userFullName') : null) ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('userFullName') : null) ||
    SPECIALIST_NAME;

  const specialistInitials =
    storedName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(-2)
      .toUpperCase() || SPECIALIST_INITIALS;

  const menu = [
    { path: '/specialist/dashboard', label: 'Tổng quan', icon: <Icon name="home" /> },
    {
      path: '/specialist/request-reviews',
      label: 'Thẩm định yêu cầu',
      icon: <Icon name="file" />,
      badge: reviewCount > 0 ? reviewCount : undefined,
    },
    {
      path: '/specialist/trips',
      label: 'Chuyến được giao',
      icon: <Icon name="truck" />,
      badge: trips.length > 0 ? trips.length : undefined,
    },
    { path: '/specialist/regulations', label: 'Quy định & thiết lập', icon: <Icon name="list" /> },
    { path: '/specialist/audit', label: 'Lịch sử thao tác', icon: <Icon name="clock" /> },
  ];

  const formattedNotifs = useMemo(() => {
    return (notifications || []).map((raw: SpecialistNotification) => {
      const n = formatNotification({
        id: raw.id,
        title: raw.title,
        body: raw.text,
        at: raw.at,
        read: raw.read,
        link: raw.link,
      });
      return {
        id: n.id,
        title: n.title,
        body: n.body,
        time: raw.at ? fmtDateTime(raw.at) : '',
        unread: !raw.read,
        link: n.link,
      };
    });
  }, [notifications]);

  return (
    <DashboardLayout
      title={title}
      brandTitle="CBN Transport"
      brandLink="/specialist/dashboard"
      roleLabel="Transport Specialist"
      roleDescription="Hồ sơ pháp lý & quy định y tế"
      userName={storedName}
      userRoleLabel="Chuyên viên y tế & pháp lý"
      userInitials={specialistInitials}
      menu={menu}
      notifications={formattedNotifs}
      unreadNotificationsCount={unreadNotificationsCount}
      notificationsPath="/specialist/notifications"
      onNotificationClick={(item) => actions.markNotificationRead(item.id)}
      onReadAllNotifications={() => actions.markAllNotificationsRead()}
      userProfilePath="/specialist/profile"
      toast={toast}
      onClearToast={() => actions.clearToast()}
    >
      {children}
    </DashboardLayout>
  );
};

export default SpecialistLayout;
