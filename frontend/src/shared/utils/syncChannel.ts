/**
 * Cross-tab and cross-browser synchronization helper for RTS.
 *
 * Mechanisms:
 * 1. BroadcastChannel('rts_sync_channel'): Instant cross-tab notification within the same browser.
 * 2. window 'storage' event on localStorage('rts_sync_event'): Fallback cross-tab notification.
 * 3. window 'visibilitychange' & 'focus': Immediate refresh when user switches back to the tab.
 * 4. 10-second polling: Syncs changes across different browser sessions (e.g. Chrome vs Firefox, Incognito vs Normal).
 *    Pauses when tab is hidden, resumes when tab is visible.
 * 5. Singleton controller per store: Prevents duplicate timers when multiple components use the same hook.
 */

const SYNC_CHANNEL_NAME = 'rts_sync_channel';
const SYNC_STORAGE_KEY = 'rts_sync_event';

export type SyncEventType = 'requests_updated' | 'refresh_all';

export interface SyncMessage {
  type: SyncEventType;
  timestamp: number;
  senderId: string;
}

// Generate unique ID per browser tab to avoid processing own storage events
const TAB_ID = typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : `tab_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

// BroadcastChannel instance (if supported)
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch {
    broadcastChannel = null;
  }
}

let rateLimitedUntil = 0;

export function notifyRateLimited(seconds = 60): void {
  rateLimitedUntil = Date.now() + seconds * 1000;
}

export function isRateLimited(): boolean {
  return Date.now() < rateLimitedUntil;
}

/**
 * Notify other tabs and windows that an update occurred.
 */
export function notifySync(type: SyncEventType = 'requests_updated'): void {
  const msg: SyncMessage = {
    type,
    timestamp: Date.now(),
    senderId: TAB_ID,
  };

  // 1. Post to BroadcastChannel (instant in modern browsers)
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(msg);
    } catch {
      // Ignore BC errors
    }
  }

  // 2. Write to localStorage to trigger storage event in other tabs
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(msg));
    } catch {
      // Ignore quota errors
    }
  }

  // 3. Dispatch local CustomEvent (for same-window listeners that need notification)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rts_sync_local', { detail: msg }));
  }
}

/**
 * Subscribe to sync notifications from other tabs.
 */
export function onSync(callback: (msg: SyncMessage) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleMessage = (event: MessageEvent) => {
    if (event.data && event.data.type) {
      callback(event.data as SyncMessage);
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SYNC_STORAGE_KEY && event.newValue) {
      try {
        const msg = JSON.parse(event.newValue) as SyncMessage;
        // Only trigger if sent by a different tab
        if (msg.senderId !== TAB_ID) {
          callback(msg);
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleMessage);
  }
  window.addEventListener('storage', handleStorage);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleMessage);
    }
    window.removeEventListener('storage', handleStorage);
  };
}

export interface SyncControllerOptions {
  intervalMs?: number; // default 10000 (10s)
  onRefresh: (options: { silent: boolean; force: boolean }) => Promise<void> | void;
  eventType?: SyncEventType;
}

export interface SyncController {
  subscribe: () => () => void;
  triggerRefresh: (silent?: boolean) => void;
}

/**
 * Creates a singleton sync controller that handles:
 * - Singleton 10s polling (only when tab is visible)
 * - Auto-pause on tab hidden
 * - Auto-refresh on tab visible / window focus
 * - Auto-refresh on remote BroadcastChannel / storage sync event
 * - Debounce rapid triggers
 */
export function createSyncController(options: SyncControllerOptions): SyncController {
  const { intervalMs = 10000, onRefresh, eventType = 'requests_updated' } = options;
  let activeSubscribers = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let unsubscribeSync: (() => void) | null = null;
  let isHidden = typeof document !== 'undefined' ? document.hidden : false;
  let lastRefreshTime = 0;

  const triggerRefresh = (silent = true) => {
    if (silent && isRateLimited()) return;
    const now = Date.now();
    // Debounce triggers within 500ms
    if (now - lastRefreshTime < 500) return;
    lastRefreshTime = now;
    void onRefresh({ silent, force: true });
  };

  const startTimer = () => {
    if (timer || typeof window === 'undefined') return;
    timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      triggerRefresh(true);
    }, intervalMs);
  };

  const stopTimer = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const handleVisibilityChange = () => {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      isHidden = true;
      stopTimer();
    } else {
      const wasHidden = isHidden;
      isHidden = false;
      startTimer();
      if (wasHidden) {
        // User came back to this tab: refresh immediately
        triggerRefresh(true);
      }
    }
  };

  const handleWindowFocus = () => {
    if (typeof document !== 'undefined' && !document.hidden) {
      triggerRefresh(true);
    }
  };

  const subscribe = () => {
    activeSubscribers++;
    if (activeSubscribers === 1 && typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleWindowFocus);
      unsubscribeSync = onSync((msg) => {
        if (msg.type === eventType || msg.type === 'refresh_all') {
          triggerRefresh(true);
        }
      });
      if (!document.hidden) {
        startTimer();
      }
    }

    return () => {
      activeSubscribers = Math.max(0, activeSubscribers - 1);
      if (activeSubscribers === 0 && typeof window !== 'undefined') {
        stopTimer();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleWindowFocus);
        if (unsubscribeSync) {
          unsubscribeSync();
          unsubscribeSync = null;
        }
      }
    };
  };

  return {
    subscribe,
    triggerRefresh,
  };
}
