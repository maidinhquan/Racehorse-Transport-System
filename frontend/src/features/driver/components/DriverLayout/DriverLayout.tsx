import React, { useMemo } from 'react';
import { DashboardLayout } from '../../../../shared/layouts/DashboardLayout';
import { useDriver } from '../../hooks/useDriver';
import { formatNotification } from '../../../../shared/utils/notificationFormat';
import type { DriverNotification } from '../../types';

// ---------------------------------------------------------------------------
// Icon dùng chung trong feature Driver (giữ nguyên để không phá vỡ import)
// ---------------------------------------------------------------------------
const PATHS: Record<string, React.ReactNode> = {
  map: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>,
  truck: <><path d="M2 6h12v10H2zM14 9h4l4 4v3h-8z" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  alert: <path d="M12 3 2 20h20zM12 10v4M12 17h.01" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pin: <><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  back: <path d="m15 18-6-6 6-6" />,
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /></>,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  file: <><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M8 13h8M8 17h5" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
};

export const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <svg className={`drv-i ${className}`} viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" fill="none" strokeWidth="2">
    {PATHS[name] ?? null}
  </svg>
);

const initials = (name = '') =>
  name
    .replace(/^Dr\.\s*/, '')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const roleText = (role?: string) =>
  role === 'VETERINARIAN' ? 'Hộ tống • Bác sĩ thú y' : role === 'ESCORT' ? 'Hộ tống' : 'Tài xế';

interface DriverLayoutProps {
  title: string;
  children: React.ReactNode;
}

/** Layout trang Driver - chuẩn hóa qua DashboardLayout chung */
export const DriverLayout: React.FC<DriverLayoutProps> = ({ title, children }) => {
  const { me, activeTrips, incidents, toast, notifications, unreadNotificationsCount, actions } = useDriver();

  const isVet = useMemo(() => {
    if (me?.role === 'VETERINARIAN') return true;
    const fn = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userFullName') : '') || me?.name || '';
    const em = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userEmail') : '') || '';
    return /BS\.|Bác sĩ|thú y|escort|vet/i.test(fn) || /escort|vet/i.test(em);
  }, [me]);

  const openIncidents = incidents.filter((i) => {
    if (!activeTrips.some((t) => t.id === i.tripId) || ['RESOLVED', 'CLOSED'].includes(i.status)) return false;
    const isHorseIssue = i.type === 'HORSE_HEALTH' || (i as any).reporterRole === 'VETERINARIAN' || Boolean(i.horseId) || Boolean((i as any).healthIssueType);
    return isVet ? isHorseIssue : !isHorseIssue;
  }).length;

  const menu = [
    { path: '/driver/journey', label: 'Hành trình', icon: <Icon name="map" />, badge: activeTrips.length },
    { path: '/driver/trips', label: 'Chuyến đi', icon: <Icon name="truck" /> },
    { path: '/driver/incidents', label: 'Sự cố', icon: <Icon name="alert" />, badge: openIncidents },
    { path: '/driver/history', label: 'Lịch sử', icon: <Icon name="clock" /> },
  ];

  const formattedNotifs = useMemo(() => {
    return (notifications || []).map((raw: DriverNotification) => {
      const n = formatNotification({
        id: raw.id,
        title: raw.title,
        body: raw.text,
        at: raw.at,
        read: raw.read,
        link: raw.link,
      });
      return {
        id: raw.id,
        title: n.title,
        body: n.body,
        time: raw.at,
        unread: !raw.read,
        link: n.link,
      };
    });
  }, [notifications]);

  const driverName = me?.name || 'Tài xế';
  const driverInitials = initials(driverName);

  return (
    <DashboardLayout
      title={title}
      brandTitle="CBN Transport"
      brandLink="/driver/journey"
      roleLabel="Tài xế & Hộ tống"
      roleDescription={roleText(me?.role)}
      userName={driverName}
      userRoleLabel={roleText(me?.role)}
      userInitials={driverInitials}
      menu={menu}
      notifications={formattedNotifs}
      unreadNotificationsCount={unreadNotificationsCount}
      notificationsPath="/driver/notifications"
      onNotificationClick={(item) => actions.markNotificationRead(item.id)}
      onReadAllNotifications={() => actions.markAllNotificationsRead()}
      userProfilePath="/driver/profile"
      toast={toast}
      onClearToast={() => actions.clearToast()}
    >
      {children}
    </DashboardLayout>
  );
};

export default DriverLayout;
