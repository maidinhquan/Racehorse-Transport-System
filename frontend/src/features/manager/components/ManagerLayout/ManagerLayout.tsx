import React, { useMemo } from 'react';
import { DashboardLayout } from '../../../../shared/layouts/DashboardLayout';
import { formatNotification } from '../../../../shared/utils/notificationFormat';
import { useManager } from '../../hooks/useManager';
import { fmtDateTime } from '../../hooks/managerRules';
import { MANAGER_INITIALS, MANAGER_NAME } from '../../types';

// ---------------------------------------------------------------------------
// Icon dùng chung trong feature Manager (giữ nguyên để không phá vỡ import)
// ---------------------------------------------------------------------------
const PATHS: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  inbox: <path d="M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z" />,
  file: <><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M8 13h8M8 17h5" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  truck: <><path d="M2 6h12v10H2zM14 9h4l4 4v3h-8z" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  alert: <path d="M12 3 2 20h20zM12 10v4M12 17h.01" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  check: <path d="m5 12 5 5 9-10" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  back: <path d="m15 18-6-6 6-6" />,
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M16 4.5a3.5 3.5 0 0 1 0 7M22 20c0-3-2-5.2-5-5.8" /></>,
  route: <><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7" /></>,
  plane: <path d="M10 14 3 11l1-2 8 1 4-6h2l-2 7 5 1 1 2-6 1-3 6h-2l1-6" />,
  shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  print: <><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2" /><rect x="6" y="14" width="12" height="7" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
};

export const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <svg className={`mgr-i ${className}`} viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2">
    {PATHS[name] ?? null}
  </svg>
);

interface ManagerLayoutProps {
  title: string;
  children: React.ReactNode;
}

/** Layout trang Logistics Manager - chuẩn hóa qua DashboardLayout chung */
export const ManagerLayout: React.FC<ManagerLayoutProps> = ({ title, children }) => {
  const { stats, toast, notifications, actions } = useManager();

  const storedName =
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userFullName') : null) ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('userFullName') : null) ||
    MANAGER_NAME;

  const managerInitials =
    storedName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(-2)
      .toUpperCase() || MANAGER_INITIALS;

  const menu = [
    { path: '/manager/dashboard', label: 'Tổng quan', icon: <Icon name="home" /> },
    {
      path: '/manager/requests',
      label: 'Yêu cầu vận chuyển',
      icon: <Icon name="inbox" />,
      badge: stats.pendingReview + stats.cancellations,
    },
    {
      path: '/manager/contracts',
      label: 'Hợp đồng & giá',
      icon: <Icon name="file" />,
      badge: stats.awaitingContract,
    },
    {
      path: '/manager/payments',
      label: 'Tiền cọc & thanh toán',
      icon: <Icon name="card" />,
      badge: stats.payQueue,
    },
    {
      path: '/manager/trips',
      label: 'Chuyến đi',
      icon: <Icon name="truck" />,
      badge: stats.tripDecisions,
    },
    {
      path: '/manager/incidents',
      label: 'Sự cố & khiếu nại',
      icon: <Icon name="alert" />,
      badge: stats.openIncidents + stats.openComplaints,
    },
    { path: '/manager/reports', label: 'Chi phí & báo cáo', icon: <Icon name="chart" /> },
  ];

  const formattedNotifs = useMemo(() => {
    return (notifications || []).map((raw) => {
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
      brandLink="/manager/dashboard"
      roleLabel="Logistics Manager"
      roleDescription="Xét duyệt, hợp đồng & điều hành"
      userName={storedName}
      userRoleLabel="Quản lý vận tải"
      userInitials={managerInitials}
      menu={menu}
      notifications={formattedNotifs}
      unreadNotificationsCount={stats.unread}
      notificationsPath="/manager/notifications"
      onNotificationClick={(item) => actions.markRead(item.id)}
      onReadAllNotifications={() => actions.markAllRead()}
      userProfilePath="/manager/profile"
      toast={toast}
      onClearToast={() => actions.clearToast()}
    >
      {children}
    </DashboardLayout>
  );
};

export default ManagerLayout;
