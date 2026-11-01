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
import { apiClient } from '../../../shared/api/apiClient';

const cleanId = (x?: string) => (x || '').replace(/-/g, '_');

export const PLACES_STORAGE_KEY = 'rts_coord_places';
export const VEHICLES_STORAGE_KEY = 'rts_coord_vehicles';

export function saveVehiclesToStorage(vehicles: Any[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(vehicles));
  } catch (e) {
    console.warn('[coordinator] Failed to persist vehicles to localStorage', e);
  }
}

export function loadVehiclesFromStorage(fallbackVehicles: Any[]): Any[] {
  if (typeof window === 'undefined') return clone(fallbackVehicles);
  try {
    const raw = localStorage.getItem(VEHICLES_STORAGE_KEY);
    if (!raw) return clone(fallbackVehicles);
    const stored = JSON.parse(raw);
    if (Array.isArray(stored) && stored.length > 0) {
      const storedMap = new Map(stored.map((v: Any) => [v.id, v]));
      const result = [...stored];
      fallbackVehicles.forEach((sv: Any) => {
        if (!storedMap.has(sv.id)) {
          result.push(clone(sv));
        }
      });
      return result;
    }
  } catch (e) {
    console.warn('[coordinator] Failed to read vehicles from localStorage', e);
  }
  return clone(fallbackVehicles);
}

export function savePlacesToStorage(places: Any[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PLACES_STORAGE_KEY, JSON.stringify(places));
  } catch (e) {
    console.warn('[coordinator] Failed to persist places to localStorage', e);
  }
}

export function loadPlacesFromStorage(fallbackPlaces: Any[]): Any[] {
  if (typeof window === 'undefined') return clone(fallbackPlaces);
  try {
    const raw = localStorage.getItem(PLACES_STORAGE_KEY);
    if (!raw) return clone(fallbackPlaces);
    const stored = JSON.parse(raw);
    if (Array.isArray(stored) && stored.length > 0) {
      const storedMap = new Map(stored.map((p: Any) => [p.id, p]));
      const result = [...stored];
      fallbackPlaces.forEach((sp: Any) => {
        if (!storedMap.has(sp.id)) {
          result.push(clone(sp));
        }
      });
      return result;
    }
  } catch (e) {
    console.warn('[coordinator] Failed to read places from localStorage', e);
  }
  return clone(fallbackPlaces);
}

const emptyDb = (): Db => {
  const loadedPlaces = loadPlacesFromStorage((seed as Any).places);
  const loadedVehicles = loadVehiclesFromStorage((seed as Any).vehicles);
  const maxPlaceNum = loadedPlaces.reduce((max: number, p: Any) => {
    const m = String(p.id || '').match(/PL-(\d+)/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 1040);
  return {
    trips: [],
    requests: [],
    customers: clone((seed as Any).customers),
    horses: clone((seed as Any).horses),
    vehicles: loadedVehicles,
    employees: clone((seed as Any).employees),
    places: loadedPlaces,
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
    seq: Math.max(maxPlaceNum, loadedVehicles.reduce((max: number, v: Any) => {
      const m = String(v.id || '').match(/VH-(\d+)/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 1040)),
  };
};

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
    deployment: { status: 'CONFIRMED', assignees: { coordinator: 'USER_006', specialist: 'USER_005' } },
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
    vehicles: loadVehiclesFromStorage(s.vehicles),
    employees: s.employees,
    places: loadPlacesFromStorage(s.places),
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
    seq: Math.max(s.seq || 1040, loadPlacesFromStorage(s.places).reduce((max: number, p: Any) => {
      const m = String(p.id || '').match(/PL-(\d+)/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 1040)),
  };
}

export let db: Db = getDemoMode('coordinator') ? seededDb() : emptyDb();
export const demoOn = () => getDemoMode('coordinator');

/** trạng thái giao diện (tab, bảng, bộ lọc…) – giữ nguyên khi chuyển trang */
export const ui: Any = { tab: {}, t: {}, journeyDisclosures: {}, lastSavedPlaceId: null, lastSavedVehicleId: null };

// ---------- đăng ký vẽ lại ----------
let version = 0;
const listeners = new Set<() => void>();
export function commit() { version++; listeners.forEach((l) => l()); }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
/** Hook: component đọc db/ui trực tiếp; mỗi lần commit() sẽ vẽ lại */
export const useCoordinatorStore = () => useSyncExternalStore(subscribe, () => version);

export async function syncCoordinatorTrips(): Promise<void> {
  try {
    const res = await apiClient.get<Any>('/coordinator/trips');
    const apiTrips = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    if (!Array.isArray(apiTrips)) return;

    // The list contains planning summaries only. Addresses and horse IDs live in the trip context.
    const contexts = await Promise.all(apiTrips.map(async (item: Any) => {
      try {
        const response = await apiClient.get<Any>(`/coordinator/trips/${encodeURIComponent(item.tripId || item.id)}`);
        return response.data?.data ?? response.data;
      } catch (error) {
        console.error('[coordinator] Failed to load trip details:', item.tripId || item.id, error);
        return null;
      }
    }));

    const mappedTrips = apiTrips.map((bt: Any, index: number) => {
      const cleanTripId = bt.tripId || bt.id;
      const context = contexts[index];
      const previous = db.trips.find((t: Any) => cleanId(t.id) === cleanId(cleanTripId));
      const requestId = context?.requestId || bt.requestId;
      if (context) {
        const requestIndex = db.requests.findIndex((r: Any) => cleanId(r.id) === cleanId(requestId));
        const previousRequest = db.requests[requestIndex] || {};
        const horses = context.horseIds ?? bt.horses ?? previousRequest.horses ?? [];
        const request = {
          ...previousRequest, id: requestId,
          origin: context.pickup?.cityName || context.pickup?.name || context.pickup?.address || previousRequest.origin || '',
          destination: context.delivery?.cityName || context.delivery?.name || context.delivery?.address || previousRequest.destination || '',
          pickup: context.pickup ?? previousRequest.pickup ?? {},
          delivery: context.delivery ?? previousRequest.delivery ?? {},
          horses, count: horses.length,
          pickupAt: bt.plannedDepart, date: context.deliveryDeadline?.slice(0, 10) || previousRequest.date || '',
          deliveryDeadline: context.deliveryDeadline,
        };
        if (requestIndex >= 0) db.requests[requestIndex] = request;
        else db.requests.push(request);
      }
      return {
        ...previous,
        id: cleanTripId,
        tripId: cleanTripId,
        binding: context?.binding ?? previous?.binding,
        requestId,
        status: bt.status || 'PLANNING',
        planningState: bt.planningState,
        mode: context ? context.mode ?? null : bt.mode ?? previous?.mode ?? null,
        plannedDepart: bt.plannedDepart || `${today()} 06:00`,
        eta: context?.approvedPlan?.eta || context?.deliveryDeadline || bt.eta || previous?.eta || '',
        deliveryDeadline: context?.deliveryDeadline || previous?.deliveryDeadline,
        deployment: {
          status: context?.deployment?.status || context?.deployment || bt.deployment?.status || bt.deployment || previous?.deployment?.status || 'NOT_CONFIRMED',
          assignees: { coordinator: context?.coordinatorId || bt.coordinatorId || previous?.coordinatorId, specialist: context?.specialistId || bt.specialistId || previous?.specialistId },
        },
        coordinatorId: context?.coordinatorId || bt.coordinatorId || previous?.coordinatorId,
        specialistId: context?.specialistId || bt.specialistId || previous?.specialistId,
        routes: (bt.routes ?? previous?.routes ?? []).map((rt: Any) => {
          if (!rt?.stops) return rt;
          return {
            ...rt,
            stops: rt.stops.map((s: Any) => {
              if (s.type === 'ORIGIN') {
                const pickupObj = context?.pickup || previous?.pickup || db.requests.find((r: Any) => cleanId(r.id) === cleanId(requestId))?.pickup;
                const addr = String(pickupObj?.address || pickupObj?.name || s.name || '').toLowerCase();
                if (addr.includes('lê đức thọ') || addr.includes('gò vấp')) {
                  if ((Math.abs(s.lat - 10.7769) < 0.005 && Math.abs(s.lng - 106.7009) < 0.005) || Math.abs(s.lat - 10.85135) < 0.001) {
                    return { ...s, lat: 10.8550, lng: 106.6565, exactGeo: true };
                  }
                }
              }
              if (s.type === 'DESTINATION' && String(s.name || '').toLowerCase().includes('tokyo') && s.lat < 20) {
                return { ...s, lat: 35.67686, lng: 139.763895, exactGeo: true };
              }
              return s;
            }),
          };
        }),
        milestones: bt.milestones ?? previous?.milestones ?? [],
        crew: bt.crew ?? previous?.crew ?? {},
        horses: context?.horseIds ?? bt.horses ?? previous?.horses ?? [],
      };
    });

    const isDemo = getDemoMode('coordinator');
    if (!isDemo) {
      db.trips = mappedTrips;
    } else {
      const existing = [...db.trips];
      for (const mt of mappedTrips) {
        const idx = existing.findIndex((x: Any) => cleanId(x.id) === cleanId(mt.id));
        if (idx >= 0) existing[idx] = { ...existing[idx], ...mt };
        else existing.unshift(mt);
      }
      db.trips = existing;
    }
    commit();
  } catch (err) {
    console.error('[coordinator] Failed to sync trips from API:', err);
  }
}

export function resetDemo(on: boolean) {
  db = on ? seededDb() : emptyDb();
  ui.tab = {}; ui.t = {}; ui.journeyDisclosures = {};
  resetHooks.forEach((fn) => fn());
  commit();
  void syncCoordinatorTrips();
}
const resetHooks: Array<() => void> = [];
export const onReset = (fn: () => void) => { resetHooks.push(fn); };

if (typeof window !== 'undefined') {
  void syncCoordinatorTrips();

  window.addEventListener('rts_requests_updated', () => {
    resetDemo(demoOn());
    void syncCoordinatorTrips();
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
export const me = () => {
  const storedName = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userFullName') : null;
  const storedEmail = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userEmail') : null;
  if (storedName) {
    const clean = storedName.split('(')[0].trim();
    const initials = clean.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(-2).toUpperCase() || 'PH';
    return { ...db.users.coordinator, name: storedName, initials, email: storedEmail || db.users.coordinator?.email };
  }
  return db.users.coordinator;
};
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
