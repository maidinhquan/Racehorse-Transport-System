import { useEffect, useState } from 'react';

export type DemoRole = 'customer' | 'manager' | 'coordinator' | 'specialist' | 'admin' | 'driver';

export const ALL_DEMO_ROLES: DemoRole[] = [
  'customer',
  'manager',
  'coordinator',
  'specialist',
  'admin',
  'driver',
];

const GLOBAL_STORAGE_KEY = 'rts_demo_mode_global';
const STORAGE_PREFIX = 'rts_demo_mode_';

/** Lấy trạng thái chế độ dữ liệu mẫu toàn hệ thống (hoặc theo vai trò) */
export function getDemoMode(role?: DemoRole): boolean {
  try {
    const globalVal = localStorage.getItem(GLOBAL_STORAGE_KEY);
    if (globalVal !== null) {
      return globalVal === 'true';
    }
    if (role) {
      const roleVal = localStorage.getItem(`${STORAGE_PREFIX}${role}`);
      if (roleVal !== null) {
        return roleVal === 'true';
      }
    }
    return true; // Mặc định BẬT để có thể kiểm thử ngay
  } catch {
    return true;
  }
}

/** Lưu trạng thái chế độ dữ liệu mẫu đồng bộ toàn hệ thống */
export function setDemoModeStorage(enabled: boolean) {
  try {
    localStorage.setItem(GLOBAL_STORAGE_KEY, String(enabled));
    ALL_DEMO_ROLES.forEach((r) => {
      localStorage.setItem(`${STORAGE_PREFIX}${r}`, String(enabled));
    });
  } catch {
    // Bỏ qua lỗi truy cập storage
  }
}

/** Phát tín hiệu thay đổi chế độ dữ liệu mẫu đồng bộ tới tất cả các page/role */
export function notifyDemoModeChange(roleOrEnabled?: DemoRole | boolean, maybeEnabled?: boolean) {
  let enabled: boolean;
  let sourceRole: DemoRole | undefined;

  if (typeof roleOrEnabled === 'boolean') {
    enabled = roleOrEnabled;
  } else if (typeof roleOrEnabled === 'string') {
    sourceRole = roleOrEnabled;
    enabled = typeof maybeEnabled === 'boolean' ? maybeEnabled : true;
  } else {
    enabled = typeof maybeEnabled === 'boolean' ? maybeEnabled : true;
  }

  setDemoModeStorage(enabled);

  // Phát event chung và event cho từng role để mọi listener đều nhận được cập nhật tức thì
  ALL_DEMO_ROLES.forEach((r) => {
    window.dispatchEvent(
      new CustomEvent('rts_demo_mode_change', {
        detail: { role: r, enabled, sourceRole },
      })
    );
  });
}

// Lắng nghe thay đổi từ các tab trình duyệt khác (StorageEvent) để đồng bộ đa tab
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === GLOBAL_STORAGE_KEY && e.newValue !== null) {
      const nextEnabled = e.newValue === 'true';
      ALL_DEMO_ROLES.forEach((r) => {
        window.dispatchEvent(
          new CustomEvent('rts_demo_mode_change', {
            detail: { role: r, enabled: nextEnabled },
          })
        );
      });
    }
  });
}

/** Hook tiện ích để theo dõi và bật/tắt chế độ dữ liệu mẫu đồng bộ */
export function useDemoMode(role?: DemoRole) {
  const [enabled, setEnabled] = useState<boolean>(() => getDemoMode(role));

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ role?: DemoRole; enabled: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.enabled === 'boolean') {
        // Đồng bộ khi có bất kỳ thay đổi nào
        if (!role || customEvent.detail.role === role) {
          setEnabled(customEvent.detail.enabled);
        }
      }
    };
    window.addEventListener('rts_demo_mode_change', handler);
    return () => window.removeEventListener('rts_demo_mode_change', handler);
  }, [role]);

  const toggle = (nextState?: boolean) => {
    const next = typeof nextState === 'boolean' ? nextState : !enabled;
    setEnabled(next);
    if (role) {
      notifyDemoModeChange(role, next);
    } else {
      notifyDemoModeChange(next);
    }
    return next;
  };

  return { enabled, toggle };
}
