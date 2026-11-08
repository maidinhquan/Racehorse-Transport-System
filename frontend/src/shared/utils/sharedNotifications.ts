export interface SharedNotification {
  id: string;
  userId?: string;
  requestId?: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  link?: string;
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
