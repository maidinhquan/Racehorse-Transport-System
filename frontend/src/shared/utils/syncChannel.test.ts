import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  notifySync,
  onSync,
  createSyncController,
  type SyncMessage,
} from './syncChannel';

describe('syncChannel and syncController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('notifySync writes to localStorage and dispatches local event', () => {
    const localListener = vi.fn();
    window.addEventListener('rts_sync_local', localListener);

    notifySync('requests_updated');

    expect(localListener).toHaveBeenCalledTimes(1);
    const raw = localStorage.getItem('rts_sync_event');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.type).toBe('requests_updated');
    expect(parsed.timestamp).toBeGreaterThan(0);
    expect(parsed.senderId).toBeTruthy();

    window.removeEventListener('rts_sync_local', localListener);
  });

  it('onSync handles storage events from other tabs and ignores own tab', () => {
    const callback = vi.fn();
    const unsubscribe = onSync(callback);

    // Event from own tab (stored in localStorage with same senderId)
    notifySync('requests_updated');
    // Storage event from another tab (different senderId)
    const remoteMessage: SyncMessage = {
      type: 'requests_updated',
      timestamp: Date.now(),
      senderId: 'remote-tab-999',
    };

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'rts_sync_event',
        newValue: JSON.stringify(remoteMessage),
      })
    );

    expect(callback).toHaveBeenCalledWith(remoteMessage);
    unsubscribe();
  });

  it('createSyncController manages singleton polling timer and calls onRefresh with silent=true', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const controller = createSyncController({
      intervalMs: 10000,
      onRefresh,
    });

    // Before subscribing: no refresh called
    expect(onRefresh).not.toHaveBeenCalled();

    // First subscriber
    const unsub1 = controller.subscribe();

    // Advance 10s: timer should fire
    vi.advanceTimersByTime(10000);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledWith({ silent: true, force: true });

    // Second subscriber: should share the timer (singleton), NOT double-fire
    const unsub2 = controller.subscribe();
    vi.advanceTimersByTime(10000);
    expect(onRefresh).toHaveBeenCalledTimes(2);

    // Unsubscribe first: timer still runs because unsub2 is active
    unsub1();
    vi.advanceTimersByTime(10000);
    expect(onRefresh).toHaveBeenCalledTimes(3);

    // Unsubscribe second: timer stops
    unsub2();
    vi.advanceTimersByTime(20000);
    expect(onRefresh).toHaveBeenCalledTimes(3);
  });

  it('createSyncController pauses polling when document is hidden and resumes when visible', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const controller = createSyncController({
      intervalMs: 10000,
      onRefresh,
    });

    const unsub = controller.subscribe();

    // Tab is hidden
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Advance time while hidden: timer should NOT fire
    vi.advanceTimersByTime(30000);
    expect(onRefresh).not.toHaveBeenCalled();

    // Tab becomes visible again
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Tab returning to visible should immediately trigger a refresh
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledWith({ silent: true, force: true });

    // And timer resumes
    vi.advanceTimersByTime(10000);
    expect(onRefresh).toHaveBeenCalledTimes(2);

    unsub();
  });

  it('createSyncController refreshes immediately on window focus', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const controller = createSyncController({
      intervalMs: 10000,
      onRefresh,
    });

    const unsub = controller.subscribe();
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });

    window.dispatchEvent(new Event('focus'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledWith({ silent: true, force: true });

    unsub();
  });

  it('createSyncController debounces rapid triggers within 500ms', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const controller = createSyncController({
      intervalMs: 10000,
      onRefresh,
    });

    const unsub = controller.subscribe();
    controller.triggerRefresh(true);
    controller.triggerRefresh(true);
    controller.triggerRefresh(true);

    expect(onRefresh).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(600);
    controller.triggerRefresh(true);
    expect(onRefresh).toHaveBeenCalledTimes(2);

    unsub();
  });
});
