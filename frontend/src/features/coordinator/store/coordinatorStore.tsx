// ============================================================================
// Coordinator – kho dữ liệu dùng chung cho mọi trang Điều phối (giống bản HTML demo)
// Dữ liệu là dữ liệu mẫu, chỉ sống trong phiên trình duyệt; mọi thao tác gọi commit()
// để các trang React vẽ lại (tương đương render(true) của bản HTML).
// ============================================================================
import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { getDemoMode } from '../../../shared/context/DemoModeContext';
import seed from '../data/seed.json';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Any = any;

// ---------- đồng hồ demo: 04/10/2026 11:30 (giờ Việt Nam), chạy theo thời gian thực ----------
const DEMO_CLOCK_START = Date.UTC(2026, 9, 4, 4, 30);
const T0 = Date.now();
export const clockNow = () => new Date(DEMO_CLOCK_START + (Date.now() - T0));
export const nowStamp = () => new Date(clockNow().getTime() + 7 * 3600000).toISOString().slice(0, 16).replace('T', ' ');
export const today = () => nowStamp().slice(0, 10);

// ---------- dữ liệu ----------
export interface Db {
  trips: Any[]; requests: Any[]; customers: Any[]; horses: Any[]; vehicles: Any[]; employees: Any[];
  places: Any[]; incidents: Any[]; complaints: Any[]; notifications: Any[]; audit: Any[];
  air: { partners: Any[]; routes: Any[]; schedules: Any[] };
  vetStations: Any[]; quarantineBookings: Any[]; clearances: Any[]; cities: Any[];
  users: { coordinator: Any; manager: Any; specialist: Any };
  seq: number;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

import { getSharedRequests } from '../../../shared/utils/sharedRequests';

const cleanId = (x?: string) => (x || '').replace(/-/g, '_');

const emptyDb = (): Db => ({
  trips: [],
  requests: [],
  customers: clone((seed as Any).customers),
  horses: clone((seed as Any).horses),
  vehicles: clone((seed as Any).vehicles),
  employees: clone((seed as Any).employees),
  places: clone((seed as Any).places),
  incidents: [],
  complaints: [],
  notifications: [],
  audit: [],
  air: clone((seed as Any).air),
  vetStations: clone((seed as Any).vetStations),
  quarantineBookings: [],
  clearances: [],
  cities: clone((seed as Any).cities),
  users: { coordinator: clone((seed as Any).ROLES.FC.user), manager: clone((seed as Any).ROLES.LM), specialist: clone((seed as Any).ROLES.TS) },
  seq: 1040,
});

function seededDb(): Db {
  const s = clone(seed as Any);
  const shared = getSharedRequests();
  const sharedTrips = shared.map((r: any) => ({
    id: `TRP-${(r.id || '').replace(/^TRN[_-]/, '')}`,
    requestId: r.id,
    customerName: r.customerName || (r.pickup?.contact) || 'Khách hàng',
    origin: r.origin,
    destination: r.destination,
    status: 'PLANNING',
    deployment: { status: 'CONFIRMED', assignees: { coordinator: 'EMP-15', specialist: 'EMP-11' } },
    plannedDepart: `${r.date || '2026-12-26'} 06:00`,
    eta: `${r.date || '2026-12-26'} 22:00`,
    mode: r.destination?.includes('Sapporo') || r.destination?.includes('Tokyo') ? 'AIR' : 'ROAD',
    routes: [],
    crew: {},
    horses: r.horses || [],
  }));
  const mergedTrips = [...sharedTrips, ...s.trips.filter((t: any) => !sharedTrips.some((st: any) => cleanId(st.id) === cleanId(t.id) || cleanId(st.requestId) === cleanId(t.requestId)))];
  const sharedRequests = shared.map((r: any) => ({
    id: r.id,
    customer: r.customerId || 'CUS-001',
    customerName: r.customerName || 'Khách hàng',
    origin: r.origin,
    destination: r.destination,
    date: r.date,
    count: r.horseCount || (r.horses ? r.horses.length : 1),
    horses: r.horses || [],
    pickup: r.pickup || {},
    delivery: r.delivery || {},
    status: r.status,
  }));
  const mergedRequests = [...sharedRequests, ...s.requests.filter((sr: any) => !sharedRequests.some((sh: any) => cleanId(sh.id) === cleanId(sr.id)))];
  return {
    trips: mergedTrips,
    requests: mergedRequests,
    customers: s.customers,
    horses: s.horses,
    vehicles: s.vehicles,
    employees: s.employees,
    places: s.places,
    incidents: s.incidents,
    complaints: s.complaints,
    notifications: s.notifications,
    audit: [],
    air: s.air,
    vetStations: s.vetStations,
    quarantineBookings: s.quarantineBookings,
    clearances: s.clearances || [],
    cities: s.cities,
    users: { coordinator: s.ROLES.FC.user, manager: s.ROLES.LM, specialist: s.ROLES.TS },
    seq: s.seq || 1040,
  };
}

export let db: Db = getDemoMode('coordinator') ? seededDb() : emptyDb();
export const demoOn = () => getDemoMode('coordinator');

/** trạng thái giao diện (tab, bảng, bộ lọc…) – giữ nguyên khi chuyển trang */
export const ui: Any = { tab: {}, t: {}, journeyDisclosures: {} };

// ---------- đăng ký vẽ lại ----------
let version = 0;
const listeners = new Set<() => void>();
export function commit() { version++; listeners.forEach((l) => l()); }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
/** Hook: component đọc db/ui trực tiếp; mỗi lần commit() sẽ vẽ lại */
export const useCoordinatorStore = () => useSyncExternalStore(subscribe, () => version);

export function resetDemo(on: boolean) {
  db = on ? seededDb() : emptyDb();
  ui.tab = {}; ui.t = {}; ui.journeyDisclosures = {};
  resetHooks.forEach((fn) => fn());
  commit();
}
const resetHooks: Array<() => void> = [];
export const onReset = (fn: () => void) => { resetHooks.push(fn); };

if (typeof window !== 'undefined') {
  window.addEventListener('rts_requests_updated', () => {
    resetDemo(demoOn());
  });

  window.addEventListener('rts_demo_mode_change', (event: Event) => {
    const e = event as CustomEvent<{ role: string; enabled: boolean }>;
    if (e.detail?.role === 'coordinator') {
      resetDemo(e.detail.enabled);
      toast(e.detail.enabled ? 'Đã bật dữ liệu mẫu & hiển thị nút demo trên toàn hệ thống.' : 'Đã tắt dữ liệu mẫu & ẩn nút demo trên toàn hệ thống.');
    }
  });
}

// ---------- id, người dùng, nhật ký, thông báo ----------
export const nextId = (prefix: string) => `${prefix}-${++db.seq}`;
export const me = () => db.users.coordinator;
export function audit(action: string, entity = '', detail = '') {
  db.audit.unshift({ at: nowStamp(), actor: me().name, role: 'FLEET_COORDINATOR', action, entity, detail });
}
/** Thông báo gửi tới vai trò khác chỉ lưu lại (mô phỏng); thông báo cho Điều phối hiện trên chuông */
export function notify(to: Any, title: string, body = '', go = '') {
  db.notifications.unshift({ id: nextId('N'), to: typeof to === 'string' ? to : to?.id || to, title, body, at: nowStamp(), read: false, go });
}

// ---------- toast ----------
export const toastState: { id: number; msg: string } = { id: 0, msg: '' };
let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function toast(msg: string) {
  toastState.id++; toastState.msg = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastState.msg = ''; commit(); }, 3800);
  commit();
}

// ---------- hộp thoại (modal) ----------
export interface FormApi { v: Record<string, Any>; set: (name: string, value: Any) => void }
export interface ModalSpec {
  title: ReactNode;
  body?: (f: FormApi) => ReactNode;
  init?: Record<string, Any>;
  ok?: string | false;
  cancel?: string;
  noCancel?: boolean;
  danger?: boolean;
  wide?: boolean;
  /** trả về chuỗi lỗi để giữ hộp thoại mở; trả về rỗng/undefined để đóng */
  onOk?: (v: Record<string, Any>) => string | void | Promise<string | void>;
  onChange?: (name: string, value: Any, v: Record<string, Any>) => void;
}
export const modalState: { spec: ModalSpec | null; key: number } = { spec: null, key: 0 };
export function openModal(spec: ModalSpec) { modalState.spec = spec; modalState.key++; commit(); }
export function closeModal() { modalState.spec = null; commit(); }
export function confirmAction(title: ReactNode, body: ReactNode, ok: string, run: () => string | void, danger = false) {
  openModal({ title, body: () => <p>{body}</p>, ok, danger, onOk: () => run() });
}

// ---------- điều hướng (đường dẫn kiểu bản HTML: f/trip/TRP-901/route) ----------
let navigator: ((path: string) => void) | null = null;
export const setNavigator = (fn: (path: string) => void) => { navigator = fn; };
export function routePath(route: string) {
  const [a, b, c] = route.replace(/^f\//, '').split('/');
  if (a === 'trip') return `/coordinator/trips/${b}${c ? '/' + c : ''}`;
  if (a === 'incident') return `/coordinator/incidents/${b}`;
  if (a === 'vehicle') return `/coordinator/fleet/${b}`;
  if (a === 'crew') return '/coordinator/crew';
  if (a === 'notifications') return '/coordinator/notifications';
  return `/coordinator/${a || 'dashboard'}`;
}
export function go(route: string) { if (navigator) navigator(routePath(route)); }
