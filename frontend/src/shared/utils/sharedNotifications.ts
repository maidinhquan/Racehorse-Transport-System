export interface SharedNotification {
  id: string;
  userId?: string;
  requestId?: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  link?: string;
  /** Vai nhận thông báo; bỏ trống = không lọc theo vai */
  audience?: 'CUSTOMER' | 'MANAGER' | 'COORDINATOR' | 'SPECIALIST';
}

const STORAGE_KEY = 'rts_shared_notifications';

export function getSharedNotifications(): SharedNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSharedNotification(notif: SharedNotification): void {
  try {
    const list = getSharedNotifications();
    const updated = [notif, ...list.filter(n => n.id !== notif.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('rts_shared_notifications_changed'));
  } catch {
    // Ignore storage quota errors
  }
}

export function markSharedNotificationRead(id: string): void {
  try {
    const list = getSharedNotifications();
    const updated = list.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function markAllSharedNotificationsRead(): void {
  try {
    const list = getSharedNotifications();
    const updated = list.map(n => ({ ...n, read: true }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

/** Thông báo dùng chung dành cho một vai (khách hàng lọc thêm theo mã yêu cầu của mình) */
export function getSharedNotificationsFor(audience: NonNullable<SharedNotification['audience']>, requestIds?: string[]): SharedNotification[] {
  const clean = (x?: string) => (x || '').replace(/-/g, '_');
  const mine = requestIds?.map(clean);
  return getSharedNotifications().filter((n) => n.audience === audience && (!mine || !n.requestId || mine.includes(clean(n.requestId))));
}
