import React, { useMemo } from 'react';
import { DashboardLayout } from '../../../../shared/layouts/DashboardLayout';
import { useCustomer } from '../../hooks/useCustomer';
import { fmtDateTime } from '../../hooks/customerRules';
import { formatNotification } from '../../utils/notificationFormat';
import type { CustomerNotification } from '../../types';

// ---------------------------------------------------------------------------
// Icon dùng chung trong feature Customer (giữ nguyên để không phá vỡ import)
// ---------------------------------------------------------------------------
const PATHS: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  file: <><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M8 13h8M8 17h5" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>,
  horse: <><path d="M5 20v-6l3-5 2-5 3 2 4 1 2 3-2 2-3-1-1 4v5" /><path d="M9 20v-5" /></>,
  pin: <><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="m15 18-6-6 6-6" />,
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0" />,
  alert: <path d="M12 3 2 20h20zM12 10v4M12 17h.01" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  upload: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
  card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  chat: <path d="M4 5h16v11H8l-4 4z" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
};

export const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <svg className={`cus-i ${className}`} viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2">
    {PATHS[name] ?? null}
  </svg>
);

interface CustomerLayoutProps {
  title: string;
  children: React.ReactNode;
  narrow?: boolean;
}

/** Layout trang Customer - chuẩn hóa qua DashboardLayout chung */
export const CustomerLayout: React.FC<CustomerLayoutProps> = ({ title, children, narrow = false }) => {
  const { profile, stats, notifications, toast, actions } = useCustomer();

  const menu = [
    { path: '/customer/home', label: 'Trang chủ', icon: <Icon name="home" /> },
    {
      path: '/customer/requests',
      label: 'Yêu cầu vận chuyển',
      icon: <Icon name="file" />,
      badge: stats.needAction,
    },
    { path: '/customer/horses', label: 'Ngựa của tôi', icon: <Icon name="horse" /> },
    {
      path: '/customer/tracking',
      label: 'Theo dõi chuyến',
      icon: <Icon name="pin" />,
      badge: stats.inTransit,
    },
    { path: '/customer/history', label: 'Lịch sử', icon: <Icon name="clock" /> },
  ];

  const formattedNotifs = useMemo(() => {
    return (notifications || []).map((raw: CustomerNotification) => {
      const n = formatNotification({
        id: raw.id,
        title: raw.title,
        body: raw.body,
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

  const initials = profile.name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const handleReadAll = () => {
    notifications.forEach((n) => {
      if (!n.read) {
        actions.markNotificationRead(n.id);
      }
    });
  };

  const handleLogout = () => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userFullName');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userRole');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userFullName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    actions.reset();
    window.location.href = '/login';
  };

  return (
    <DashboardLayout
      title={title}
      brandTitle="CBN Transport"
      brandLink="/customer/home"
      roleLabel="Cổng khách hàng"
      roleDescription={profile.company || 'Chủ ngựa & Doanh nghiệp đua'}
      userName={profile.name}
      userRoleLabel="Khách hàng"
      userInitials={initials}
      menu={menu}
      notifications={formattedNotifs}
      unreadNotificationsCount={stats.unread}
      notificationsPath="/customer/notifications"
      onNotificationClick={(item) => actions.markNotificationRead(item.id)}
      onReadAllNotifications={handleReadAll}
      userProfilePath="/customer/profile"
      onLogout={handleLogout}
      toast={toast}
      onClearToast={() => actions.clearToast()}
      narrow={narrow}
    >
      {children}
    </DashboardLayout>
  );
};

export default CustomerLayout;
