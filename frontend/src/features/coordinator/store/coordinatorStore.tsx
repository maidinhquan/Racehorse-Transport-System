// ============================================================================
// Coordinator – kho dữ liệu dùng chung cho mọi trang Điều phối (giống bản HTML demo)
// Dữ liệu là dữ liệu mẫu, chỉ sống trong phiên trình duyệt; mọi thao tác gọi commit()
// để các trang React vẽ lại (tương đương render(true) của bản HTML).
// ============================================================================
import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import {
  COORDINATOR_DEFAULT_USERS,
  DEFAULT_AIR,
  DEFAULT_CITIES,
  DEFAULT_VET_STATIONS,
} from '../domain/coordinatorConfig';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Any = any;

// ---------- đồng hồ: theo thời gian thực ----------
export const clockNow = () => new Date();
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

import { apiClient } from '../../../shared/api/core/apiClient';
import { progressFromMilestones } from '../../../shared/utils/progress';

export const cleanId = (x?: string) => (x || '').replace(/-/g, '_');

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
  const loadedPlaces = loadPlacesFromStorage([]);
  const loadedVehicles = loadVehiclesFromStorage([]);
  const maxPlaceNum = loadedPlaces.reduce((max: number, p: Any) => {
    const m = String(p.id || '').match(/PL-(\d+)/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 1040);
  return {
    trips: [],
    requests: [],
    customers: [],
    horses: [],
    vehicles: loadedVehicles,
    employees: [],
    places: loadedPlaces,
    incidents: [],
    complaints: [],
    notifications: [],
    audit: [],
    air: clone(DEFAULT_AIR),
    vetStations: clone(DEFAULT_VET_STATIONS),
    quarantineBookings: [],
    clearances: [],
    cities: clone(DEFAULT_CITIES),
    users: clone(COORDINATOR_DEFAULT_USERS),
    seq: Math.max(maxPlaceNum, loadedVehicles.reduce((max: number, v: Any) => {
      const m = String(v.id || '').match(/VH-(\d+)/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 1040)),
  };
};

// ---------- lưu phần việc của Điều phối (tuyến, xe, nhân sự, chuyến bay) để không mất khi tải lại trang ----------
export const TRIP_STATE_STORAGE_KEY = 'rts_coord_trip_state';
const TRIP_STATE_FIELDS = ['routes', 'vehicleId', 'crew', 'groundLegs', 'flight', 'resourcesConfirmed', 'resourcesPlanned', 'plannedDepart', 'eta'];
function saveTripStateToStorage(trips: Any[]) {
  if (typeof window === 'undefined') return;
  try {
    const out: Record<string, Any> = {};
    trips.forEach((t: Any) => {
      if (!t?.id) return;
      const x: Any = {};
      TRIP_STATE_FIELDS.forEach((k) => { if (t[k] !== undefined) x[k] = t[k]; });
      if (Array.isArray(x.routes)) x.routes = x.routes.map((r: Any) => { const { geom: _g, ...rest } = r || {}; return rest; });
      out[cleanId(t.id)] = x;
    });
    localStorage.setItem(TRIP_STATE_STORAGE_KEY, JSON.stringify(out));
  } catch (e) {
    console.warn('[coordinator] Failed to persist trip state', e);
  }
}
export function applyTripStateFromStorage(trips: Any[]) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(TRIP_STATE_STORAGE_KEY);
    if (!raw) return;
    const map = JSON.parse(raw) || {};
    trips.forEach((t: Any) => {
      const x = map[cleanId(t.id)];
      if (!x) return;
      TRIP_STATE_FIELDS.forEach((k) => {
        if (x[k] === undefined) return;
        if (k === 'routes' && !(Array.isArray(x.routes) && x.routes.some((r: Any) => r?.stops?.length))) return;
        t[k] = x[k];
      });
    });
  } catch (e) {
    console.warn('[coordinator] Failed to read trip state', e);
  }
}

export let db: Db = emptyDb();

/** trạng thái giao diện (tab, bảng, bộ lọc…) – giữ nguyên khi chuyển trang */
export const ui: Any = { tab: {}, t: {}, journeyDisclosures: {}, lastSavedPlaceId: null, lastSavedVehicleId: null };

// ---------- đăng ký vẽ lại ----------
let version = 0;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function flushTripStateToStorage() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  saveTripStateToStorage(db.trips);
}
export function commit() {
  version++; listeners.forEach((l) => l());
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveTimer = null; saveTripStateToStorage(db.trips); }, 300);
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
/** Hook: component đọc db/ui trực tiếp; mỗi lần commit() sẽ vẽ lại */
export const useCoordinatorStore = () => useSyncExternalStore(subscribe, () => version);

export async function syncCoordinatorTrips(): Promise<void> {
  if (typeof apiClient?.get !== 'function') return;
  try {
    const res = await apiClient.get<Any>('/coordinator/trips');
    const apiTrips = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    if (!Array.isArray(apiTrips)) return;

    // The list contains planning summaries only. Addresses and horse IDs live in the trip context.
    const [contexts, executions] = await Promise.all([
      Promise.all(apiTrips.map(async (item: Any) => {
        try {
          const response = await apiClient.get<Any>(`/coordinator/trips/${encodeURIComponent(item.tripId || item.id)}`);
          return response.data?.data ?? response.data;
        } catch (error) {
          console.error('[coordinator] Failed to load trip details:', item.tripId || item.id, error);
          return null;
        }
      })),
      Promise.all(apiTrips.map(async (item: Any) => {
        if (!['READY_TO_DEPART', 'IN_TRANSIT', 'COMPLETED'].includes(item.status)) return null;
        try {
          const response = await apiClient.get<Any>(`/trips/${encodeURIComponent(item.tripId || item.id)}/execution`);
          return response.data?.data ?? response.data;
        } catch {
          return null;
        }
      })),
    ]);

    const mappedTrips = apiTrips.map((bt: Any, index: number) => {
      const cleanTripId = bt.tripId || bt.id;
      const context = contexts[index];
      const execData = executions[index];
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

      // Trích xuất nguồn lực xe & nhân sự từ approvedPlan hoặc draft của backend (nếu có)
      const planRes: Any[] = context?.approvedPlan?.resources || context?.draft?.resources || [];
      const resRoad = planRes.find((r: Any) => r.leg === 'road') || (planRes.length === 1 ? planRes[0] : null);
      const resOutbound = planRes.find((r: Any) => r.leg === 'outbound');
      const resInbound = planRes.find((r: Any) => r.leg === 'inbound');

      const extractedRoadCrew = resRoad?.crew ? {
        MAIN_DRIVER: resRoad.crew.MAIN_DRIVER || resRoad.crew.mainDriver || '',
        CO_DRIVER: resRoad.crew.CO_DRIVER || resRoad.crew.coDriver || '',
        VETERINARIAN: resRoad.crew.VETERINARIAN || resRoad.crew.veterinarian || '',
      } : null;

      const hasRoadCrew = extractedRoadCrew && Object.values(extractedRoadCrew).some(Boolean);
      const finalCrew = (hasRoadCrew ? extractedRoadCrew : null) ?? bt.crew ?? previous?.crew ?? {};
      const finalVehicleId = resRoad?.vehicleId || previous?.vehicleId || bt.vehicleId || null;

      let finalGroundLegs = previous?.groundLegs;
      if (resOutbound || resInbound) {
        finalGroundLegs = {
          outbound: {
            vehicleId: resOutbound?.vehicleId || previous?.groundLegs?.outbound?.vehicleId || '',
            crew: resOutbound?.crew ? {
              MAIN_DRIVER: resOutbound.crew.MAIN_DRIVER || resOutbound.crew.mainDriver || '',
              CO_DRIVER: resOutbound.crew.CO_DRIVER || resOutbound.crew.coDriver || '',
              VETERINARIAN: resOutbound.crew.VETERINARIAN || resOutbound.crew.veterinarian || '',
            } : (previous?.groundLegs?.outbound?.crew || {}),
            history: previous?.groundLegs?.outbound?.history || [],
          },
          inbound: {
            vehicleId: resInbound?.vehicleId || previous?.groundLegs?.inbound?.vehicleId || '',
            crew: resInbound?.crew ? {
              MAIN_DRIVER: resInbound.crew.MAIN_DRIVER || resInbound.crew.mainDriver || '',
              CO_DRIVER: resInbound.crew.CO_DRIVER || resInbound.crew.coDriver || '',
              VETERINARIAN: resInbound.crew.VETERINARIAN || resInbound.crew.veterinarian || '',
            } : (previous?.groundLegs?.inbound?.crew || {}),
            history: previous?.groundLegs?.inbound?.history || [],
          },
        };
      }

      const isApprovedTrip = ['PLAN_APPROVED', 'READY_TO_DEPART', 'IN_TRANSIT', 'COMPLETED'].includes(bt.status) || ['PLANNED', 'READY'].includes(bt.planningState);
      const planToRoute = (plan: Any, fallbackStatus: string) => {
        if (!plan || !Array.isArray(plan.stops) || !plan.stops.length) return null;
        const rawStops = [...plan.stops];
        if (rawStops.length === 1 && context?.delivery) {
          rawStops.push({
            type: 'DESTINATION',
            name: context.delivery.name || context.delivery.address || 'Điểm giao',
            geo: context.delivery.geo,
            arriveAt: plan.eta || context.deliveryDeadline || bt.eta || '',
          });
        }
        const lastIdx = rawStops.length - 1;
        return {
          v: Number(plan.planVersion) || 1,
          status: plan.status === 'WITHDRAWN' ? 'DRAFT' : (isApprovedTrip ? 'APPROVED' : (plan.status || fallbackStatus)),
          note: plan.note || '',
          stops: rawStops.map((s: Any, idx: number) => ({
            ...s,
            type: idx === 0 ? 'ORIGIN' : idx === lastIdx ? 'DESTINATION' : (s.type || 'REST_STOP'),
            name: s.name || (idx === 0 ? (context?.pickup?.name || context?.pickup?.address || 'Điểm nhận') : idx === lastIdx ? (context?.delivery?.name || context?.delivery?.address || 'Điểm giao') : `Điểm dừng ${idx + 1}`),
            placeId: s.placeId || undefined,
            cp: s.cp || s.placeId || undefined,
            purposes: Array.isArray(s.purposes) ? s.purposes : [],
            dwellMin: Number(s.dwellMin) || 0,
            careNote: s.careNote || '',
            lat: s.lat != null ? Number(s.lat) : (s.geo?.lat != null ? Number(s.geo.lat) : undefined),
            lng: s.lng != null ? Number(s.lng) : (s.geo?.lng != null ? Number(s.geo.lng) : undefined),
            required: s.required ?? (idx === 0 || idx === lastIdx),
            plannedAt: (idx === 0 ? (s.departAt || s.arriveAt || plan.plannedDepart || bt.plannedDepart) : (s.arriveAt || s.departAt)) || s.plannedAt || '',
            departAt: s.departAt || '',
          })),
        };
      };

      const backendRoutes: Any[] = [];
      const approvedRt = planToRoute(context?.approvedPlan, 'APPROVED');
      const draftFallbackStatus = isApprovedTrip ? 'APPROVED' : bt.planningState === 'ROUTE_PENDING' ? 'PENDING_APPROVAL' : bt.planningState === 'ROUTE_RETURNED' ? 'RETURNED' : 'DRAFT';
      const draftRt = planToRoute(context?.draft, draftFallbackStatus);
      if (approvedRt) backendRoutes.push(approvedRt);
      if (draftRt && (!approvedRt || (draftRt.v > approvedRt.v && !isApprovedTrip))) backendRoutes.push(draftRt);
      if (!backendRoutes.length && isApprovedTrip && (context?.pickup || context?.delivery)) {
        backendRoutes.push({
          v: 1,
          status: 'APPROVED',
          note: '',
          stops: [
            {
              type: 'ORIGIN',
              name: context?.pickup?.name || context?.pickup?.address || 'Điểm nhận',
              lat: context?.pickup?.geo?.lat,
              lng: context?.pickup?.geo?.lng,
              required: true,
              purposes: [],
              plannedAt: bt.plannedDepart || `${today()} 06:00`,
            },
            {
              type: 'DESTINATION',
              name: context?.delivery?.name || context?.delivery?.address || 'Điểm giao',
              lat: context?.delivery?.geo?.lat,
              lng: context?.delivery?.geo?.lng,
              required: true,
              purposes: [],
              plannedAt: context?.approvedPlan?.eta || context?.deliveryDeadline || bt.eta || '',
            },
          ],
        });
      }

      const execProgress = Array.isArray(execData?.milestones) && execData.milestones.length > 0
        ? progressFromMilestones(execData.milestones)
        : null;

      if (execProgress && execProgress.stops.length > 0) {
        const currentBackendStops = backendRoutes[backendRoutes.length - 1]?.stops?.length || 0;
        if (!backendRoutes.length || execProgress.stops.length > currentBackendStops) {
          backendRoutes.push({
            v: (backendRoutes[backendRoutes.length - 1]?.v || 0) + 1,
            status: 'APPROVED',
            note: '',
            stops: execProgress.stops.map((s, idx) => ({
              type: s.type,
              name: s.name,
              lat: s.lat,
              lng: s.lng,
              required: idx === 0 || idx === execProgress.stops.length - 1 || ['CHECKPOINT', 'QUARANTINE_STATION', 'AIRPORT'].includes(s.type),
              purposes: s.type === 'REST_STOP' ? ['REST'] : s.type === 'FUEL_STOP' ? ['FUEL'] : s.type === 'CHECKPOINT' ? ['BORDER'] : s.type === 'QUARANTINE_STATION' ? ['QUARANTINE'] : s.type === 'AIRPORT' ? ['AIRPORT'] : [],
              plannedAt: s.plannedAt || '',
            })),
          });
        }
      }

      const prevRoutes = Array.isArray(previous?.routes) ? previous.routes : [];
      const prevStopsLen = prevRoutes[prevRoutes.length - 1]?.stops?.length || 0;
      const backendStopsLen = backendRoutes[backendRoutes.length - 1]?.stops?.length || 0;
      const existingRoutes = bt.routes ?? (prevStopsLen >= backendStopsLen && prevStopsLen > 0 ? prevRoutes : backendRoutes);

      const apiMilestones = execProgress
        ? execProgress.milestones.map((m) => ({
            type: m.type,
            stop: m.stopIndex,
            at: m.at || nowStamp(),
            by: m.by || finalCrew?.MAIN_DRIVER || 'Tổ xe',
            note: m.note || '',
          }))
        : [];
      const finalMilestones = apiMilestones.length >= (previous?.milestones?.length || 0) && apiMilestones.length > 0
        ? apiMilestones
        : (bt.milestones ?? previous?.milestones ?? []);

      return {
        ...previous,
        _backendRoutes: backendRoutes,
        id: cleanTripId,
        tripId: cleanTripId,
        binding: context?.binding ?? previous?.binding,
        requestId,
        // Backend đổi trạng thái chuyến khi gửi/duyệt/trả tuyến; với Điều phối đó vẫn là giai đoạn lập kế hoạch
        status: ['PLAN_APPROVED', 'PENDING_APPROVAL', 'RETURNED'].includes(bt.status) ? 'PLANNING' : (bt.status || 'PLANNING'),
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
        vehicleId: finalVehicleId,
        groundLegs: finalGroundLegs,
        routes: existingRoutes.map((rt: Any) => {
          if (!rt?.stops) return rt;
          return {
            ...rt,
            stops: rt.stops.map((s: Any) => {
              if (s.type === 'ORIGIN') {
                if (context?.pickupRelocation?.status === 'CUSTOMER_CONFIRMED' && context?.pickupRelocation?.placeSnapshot) {
                  const ps = context.pickupRelocation.placeSnapshot;
                  return {
                    ...s,
                    name: ps.name || s.name,
                    address: ps.address || s.address,
                    placeId: ps.id,
                    lat: ps.geo?.lat ?? s.lat,
                    lng: ps.geo?.lng ?? s.lng,
                    exactGeo: true,
                  };
                }
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
        milestones: finalMilestones,
        crew: finalCrew,
        horses: context?.horseIds ?? bt.horses ?? previous?.horses ?? [],
        pickupAccess: context?.pickupAccess ?? previous?.pickupAccess,
        pickupRelocation: context?.pickupRelocation ?? previous?.pickupRelocation,
        effectivePickup: context?.effectivePickup ?? previous?.effectivePickup,
        effectivePickupRelocationId: context?.effectivePickupRelocationId ?? previous?.effectivePickupRelocationId,
      };
    });

    applyTripStateFromStorage(mappedTrips);
    // Kết quả duyệt của Quản lý lấy từ backend: chỉ áp vào phiên bản đang chờ duyệt hoặc chuyến đã duyệt/khởi hành
    const DECIDED: Record<string, string> = { PLANNED: 'APPROVED', READY: 'APPROVED', ROUTE_RETURNED: 'RETURNED' };
    mappedTrips.forEach((t: Any) => {
      const localStopsLen = Array.isArray(t.routes) ? (t.routes[t.routes.length - 1]?.stops?.length || 0) : 0;
      const backendStopsLen = Array.isArray(t._backendRoutes) ? (t._backendRoutes[t._backendRoutes.length - 1]?.stops?.length || 0) : 0;
      if ((localStopsLen === 0 || (['READY_TO_DEPART', 'IN_TRANSIT', 'COMPLETED'].includes(t.status) && backendStopsLen > localStopsLen)) && backendStopsLen > 0) {
        t.routes = t._backendRoutes;
      }
      delete t._backendRoutes;
      const cur = t.routes?.[t.routes.length - 1], next = DECIDED[t.planningState];
      if (cur && (['READY_TO_DEPART', 'IN_TRANSIT', 'COMPLETED'].includes(t.status) || next === 'APPROVED')) {
        cur.status = 'APPROVED';
        cur.decidedAt = cur.decidedAt || nowStamp();
      } else if (cur?.status === 'PENDING_APPROVAL' && next) {
        cur.status = next;
        cur.decidedAt = cur.decidedAt || nowStamp();
      }
      autoConfirmIfApproved(t);
    });
    db.trips = mappedTrips;
    commit();
    void syncCoordinatorIncidents();
  } catch (err) {
    console.error('[coordinator] Failed to sync trips from API:', err);
  }
}

const DELETED_SPAM_IDS = new Set([
  'INC_20261102_17F406', 'INC_20261106_44A3AF', 'INC_20261107_26EACE', 'INC_20261107_552507',
  'INC_20261107_59E0B0', 'INC_20261107_619E30', 'INC_20261107_71DBE2', 'INC_20261107_AFD75F',
  'INC_20261107_BE43C1', 'INC_20261107_E6F8D1', 'INC_20261108_09C04D', 'INC_20261108_1E5D35',
  'INC_20261108_402208', 'INC_20261108_4C75B1', 'INC_20261108_59699D', 'INC_20261108_63E037',
  'INC_20261108_9EA7FB', 'INC_20261108_A6D8E9', 'INC_20261108_B18836', 'INC_20261108_BD39EC',
  'INC_20261108_C40695', 'INC_20261107_D190C1',
]);

export function toLocalTimeString(val?: string | null): string {
  if (!val) return '';
  const str = String(val).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime()) && (str.includes('T') || str.endsWith('Z') || str.includes('+'))) {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  return str.replace('T', ' ').slice(0, 19);
}

export function parseIncidentTime(val?: string | number | null): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const t = new Date(val).getTime();
  if (!isNaN(t) && t > 0) return t;
  const parts = String(val).split(/[ T]/);
  if (parts.length >= 2) {
    const dParts = parts[0].split(/[-/]/);
    const tParts = parts[1].split(':');
    if (dParts.length === 3 && tParts.length >= 2) {
      const y = dParts[0].length === 4 ? Number(dParts[0]) : Number(dParts[2]);
      const m = (dParts[0].length === 4 ? Number(dParts[1]) : Number(dParts[1])) - 1;
      const day = dParts[0].length === 4 ? Number(dParts[2]) : Number(dParts[0]);
      const hr = Number(tParts[0]);
      const min = Number(tParts[1]);
      const sec = tParts[2] ? Number(tParts[2]) : 0;
      const parsed = new Date(y, m, day, hr, min, sec).getTime();
      if (!isNaN(parsed)) return parsed;
    }
  }
  return 0;
}

export function sortIncidentsLatestFirst<T extends { id?: string; at?: string; updatedAt?: string; vetStatus?: string; status?: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    // 1. Luôn đưa sự cố cần xử lý (NEW, REPORTED, REFERRAL_REQUESTED) lên trên các sự cố đã hoàn tất
    const isDoneA = ['CLOSED', 'RESOLVED', 'RECOVERY_APPLIED'].includes(String(a.status || ''));
    const isDoneB = ['CLOSED', 'RESOLVED', 'RECOVERY_APPLIED'].includes(String(b.status || ''));
    if (isDoneA !== isDoneB) return isDoneA ? 1 : -1;

    // 2. Sắp xếp giảm dần theo mốc thời gian cập nhật/phát sinh mới nhất
    const timeA = Math.max(parseIncidentTime(a.updatedAt), parseIncidentTime(a.at));
    const timeB = Math.max(parseIncidentTime(b.updatedAt), parseIncidentTime(b.at));
    if (timeB !== timeA) return timeB - timeA;

    const urgentA = a.vetStatus === 'REFERRAL_REQUESTED' ? 2 : (a.status === 'REPORTED' || a.status === 'NEW' ? 1 : 0);
    const urgentB = b.vetStatus === 'REFERRAL_REQUESTED' ? 2 : (b.status === 'REPORTED' || b.status === 'NEW' ? 1 : 0);
    if (urgentB !== urgentA) return urgentB - urgentA;

    return String(b.id || '').localeCompare(String(a.id || ''));
  });
}

export async function syncCoordinatorIncidents(): Promise<void> {
  if (typeof apiClient?.get !== 'function') return;
  try {
    const res = await apiClient.get<Any>('/incidents');
    const apiIncidents = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    if (!Array.isArray(apiIncidents)) return;

    let hasChange = false;
    const origLen = db.incidents.length;
    db.incidents = db.incidents.filter((x: Any) => !DELETED_SPAM_IDS.has(cleanId(x.id)) && !DELETED_SPAM_IDS.has(x.id));
    if (db.incidents.length !== origLen) hasChange = true;

    for (const bi of apiIncidents) {
      const id = bi.incidentId || bi.id;
      if (!id || DELETED_SPAM_IDS.has(cleanId(id)) || DELETED_SPAM_IDS.has(id)) continue;
      const isApplied = bi.status === 'RECOVERY_APPLIED' || bi.status === 'EXECUTING';
      const existing = db.incidents.find((x: Any) => cleanId(x.id) === cleanId(id));
      const biUpdatedAt = bi.updatedAt ? toLocalTimeString(bi.updatedAt) : undefined;
      const biReportedAt = bi.reportedAt ? toLocalTimeString(bi.reportedAt) : (bi.at ? toLocalTimeString(bi.at) : undefined);

      if (existing) {
        if (biReportedAt && (!existing.at || existing.at !== biReportedAt)) {
          existing.at = biReportedAt;
          existing.reportedAt = biReportedAt;
          hasChange = true;
        }
        if (bi.status && existing.status !== bi.status) {
          existing.status = isApplied ? 'EXECUTING' : bi.status;
          existing.updatedAt = biUpdatedAt || nowStamp();
          hasChange = true;
        }
        if (bi.status && bi.status !== 'REPORTED' && !existing.ackAt) {
          existing.ackAt = biReportedAt ? biReportedAt.slice(0, 16) : nowStamp();
          hasChange = true;
        }
        if (bi.approvedPlan && !existing.approvedPlan) {
          existing.approvedPlan = bi.approvedPlan;
          existing.resolutionNotes = bi.resolutionNotes || bi.approvedPlan;
          existing.resolutionType = bi.resolutionType;
          existing.updatedAt = biUpdatedAt || nowStamp();
          hasChange = true;
        }
        if (existing.approvedPlan && (!existing.plans || existing.plans.length === 0)) {
          existing.plans = [{
            v: 1,
            kind: existing.resolutionType || 'NO_CHANGE',
            status: 'APPROVED',
            desc: existing.approvedPlan,
            reason: existing.resolutionNotes || '',
            approvedAt: nowStamp(),
            approvals: [],
          }];
          hasChange = true;
        }
        if (!existing.log) {
          existing.log = [
            [existing.at || nowStamp(), 'Báo cáo sự cố', existing.description || '', existing.reporterRole || 'DRIVER']
          ];
        }
        if (!existing.updates) {
          existing.updates = [];
        }
        if (!existing.plans) {
          existing.plans = [];
        } else {
          for (const pl of existing.plans) {
            if (!pl.approvals) pl.approvals = [];
          }
        }
        if (!existing.reporterRole && bi.reportedByUserRole) {
          existing.reporterRole = bi.reportedByUserRole;
          hasChange = true;
        }
        if (!existing.reporterPhone && bi.reportedByUserPhone) {
          existing.reporterPhone = bi.reportedByUserPhone;
          hasChange = true;
        }
        if (!existing.immediateCare && bi.immediateCare) {
          existing.immediateCare = bi.immediateCare;
          hasChange = true;
        }
        if (bi.horseId && !existing.horseId) {
          existing.horseId = bi.horseId;
          hasChange = true;
        }
        if (bi.horseName && !existing.horseName) {
          existing.horseName = bi.horseName;
          hasChange = true;
        }
        if (bi.healthIssueType && !existing.healthIssueType) {
          existing.healthIssueType = bi.healthIssueType;
          hasChange = true;
        }
        if (bi.vetStatus && existing.vetStatus !== bi.vetStatus) {
          existing.vetStatus = bi.vetStatus;
          existing.updatedAt = biUpdatedAt || nowStamp();
          hasChange = true;
        }
        if (bi.targetVetStation && !existing.targetVetStation) {
          existing.targetVetStation = bi.targetVetStation;
          hasChange = true;
        }
        if (bi.vetResolutionNote && !existing.vetResolutionNote) {
          existing.vetResolutionNote = bi.vetResolutionNote;
          hasChange = true;
        }
        if (!existing.proposedRelocationPlaceName && bi.proposedRelocationPlaceName) {
          existing.proposedRelocationPlaceName = bi.proposedRelocationPlaceName;
          hasChange = true;
        }
        if (!existing.blockedImageUrl && bi.blockedImageUrl) {
          existing.blockedImageUrl = bi.blockedImageUrl;
          hasChange = true;
        }
        if (!existing.relocationImageUrl && bi.relocationImageUrl) {
          existing.relocationImageUrl = bi.relocationImageUrl;
          hasChange = true;
        }
        if (biUpdatedAt && (!existing.updatedAt || parseIncidentTime(biUpdatedAt) > parseIncidentTime(existing.updatedAt))) {
          existing.updatedAt = biUpdatedAt;
          hasChange = true;
        }
      } else {
        const isPastReported = bi.status && bi.status !== 'REPORTED';
        const atTime = biReportedAt || (bi.at ? toLocalTimeString(bi.at) : nowStamp());
        const newInc: Any = {
          id,
          tripId: bi.tripId,
          type: bi.category || bi.incidentType || 'OTHER',
          severity: bi.severity || 'HIGH',
          status: isApplied ? 'EXECUTING' : (bi.status || 'REPORTED'),
          ackAt: isPastReported ? (biReportedAt ? biReportedAt.slice(0, 16) : nowStamp()) : undefined,
          approvedPlan: bi.approvedPlan,
          resolutionNotes: bi.resolutionNotes,
          resolutionType: bi.resolutionType,
          at: atTime,
          reportedAt: atTime,
          updatedAt: biUpdatedAt || atTime,
          by: bi.reportedByUserName || bi.reportedByUserId || 'Tài xế / Áp tải',
          reporterName: bi.reportedByUserName || '',
          reporterRole: bi.reportedByUserRole || (bi.category === 'HORSE_HEALTH' ? 'VETERINARIAN' : 'MAIN_DRIVER'),
          reporterPhone: bi.reportedByUserPhone || '',
          immediateCare: bi.immediateCare || '',
          location: bi.location || 'Trên đường vận chuyển',
          locationCoordinates: bi.locationCoordinates || '',
          description: bi.description || '',
          photos: bi.photos || (bi.imageUrl ? [bi.imageUrl] : []),
          horseId: bi.horseId || '',
          horseName: bi.horseName || '',
          healthIssueType: bi.healthIssueType || '',
          vetStatus: bi.vetStatus || '',
          targetVetStation: bi.targetVetStation || '',
          vetResolutionNote: bi.vetResolutionNote || '',
          proposedRelocationPlaceName: bi.proposedRelocationPlaceName || '',
          blockedImageUrl: bi.blockedImageUrl || undefined,
          relocationImageUrl: bi.relocationImageUrl || undefined,
          plans: bi.approvedPlan ? [{
            v: 1,
            kind: bi.resolutionType || 'NO_CHANGE',
            status: 'APPROVED',
            desc: bi.approvedPlan,
            reason: bi.resolutionNotes || '',
            approvedAt: nowStamp(),
            approvals: [],
          }] : [],
          updates: [],
          log: [[nowStamp(), 'Nhân sự tổ xe báo cáo sự cố qua hệ thống', bi.reportedByUserName || 'Driver/Escort', bi.reportedByUserRole || 'DRIVER']],
        };
        db.incidents.unshift(newInc);
        hasChange = true;
      }
    }
    db.incidents = sortIncidentsLatestFirst(db.incidents);
    if (hasChange) commit();
  } catch (err) {
    console.error('[coordinator] Failed to sync incidents from API:', err);
  }
}

export async function syncCoordinatorMasterData(): Promise<void> {
  if (typeof apiClient?.get !== 'function') return;
  try {
    const [placesRes, vehiclesRes, staffRes, airRes] = await Promise.allSettled([
      apiClient.get<Any>('/coordinator/places'),
      apiClient.get<Any>('/coordinator/vehicles'),
      apiClient.get<Any>('/coordinator/staff'),
      apiClient.get<Any>('/coordinator/air-partners'),
    ]);

    let hasChange = false;

    if (placesRes.status === 'fulfilled') {
      const placesData = placesRes.value.data?.data || (Array.isArray(placesRes.value.data) ? placesRes.value.data : []);
      if (Array.isArray(placesData) && placesData.length > 0) {
        db.places = placesData;
        savePlacesToStorage(placesData);
        hasChange = true;
      }
    }

    if (vehiclesRes.status === 'fulfilled') {
      const vehiclesData = vehiclesRes.value.data?.data || (Array.isArray(vehiclesRes.value.data) ? vehiclesRes.value.data : []);
      if (Array.isArray(vehiclesData) && vehiclesData.length > 0) {
        db.vehicles = vehiclesData;
        saveVehiclesToStorage(vehiclesData);
        hasChange = true;
      }
    }

    if (staffRes.status === 'fulfilled') {
      const staffData = staffRes.value.data?.data || (Array.isArray(staffRes.value.data) ? staffRes.value.data : []);
      if (Array.isArray(staffData) && staffData.length > 0) {
        db.employees = staffData;
        hasChange = true;
      }
    }

    if (airRes.status === 'fulfilled') {
      const airData = airRes.value.data?.data || (Array.isArray(airRes.value.data) ? airRes.value.data : []);
      if (Array.isArray(airData) && airData.length > 0) {
        db.air.partners = airData;
        hasChange = true;
      }
    }

    if (hasChange) commit();
  } catch (err) {
    console.error('[coordinator] Failed to sync master data from API:', err);
  }
}

export function resetCoordinatorState() {
  db = emptyDb();
  ui.tab = {}; ui.t = {}; ui.journeyDisclosures = {};
  resetHooks.forEach((fn) => fn());
  commit();
  void syncCoordinatorTrips();
  void syncCoordinatorMasterData();
}
const resetHooks: Array<() => void> = [];
export const onReset = (fn: () => void) => { resetHooks.push(fn); };

/** Tuyến đã được Manager duyệt thì xe & nhân sự trong phương án coi như đã xác nhận – không bắt Điều phối xác nhận lại. */
export function autoConfirmIfApproved(t: Any): boolean {
  const cur = t?.routes?.[t.routes.length - 1];
  if (!cur || cur.status !== 'APPROVED' || t.resourcesConfirmed) return false;
  t.resourcesConfirmed = { at: cur.decidedAt || nowStamp(), by: 'Theo phương án Manager đã duyệt' };
  return true;
}

/** Kiểm tra nhẹ kết quả duyệt của Quản lý (1 request) – chỉ chạy khi có tuyến đang chờ duyệt và tab đang mở. */
async function pollRouteDecisions() {
  if (document.visibilityState !== 'visible' || typeof apiClient?.get !== 'function') return;
  const pending = db.trips.filter((t: Any) => t.routes?.[t.routes.length - 1]?.status === 'PENDING_APPROVAL');
  if (!pending.length) return;
  try {
    const res = await apiClient.get<Any>('/coordinator/trips');
    const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    if (!Array.isArray(list)) return;
    const DECIDED: Record<string, string> = { PLANNED: 'APPROVED', ROUTE_RETURNED: 'RETURNED' };
    let changed = false;
    list.forEach((bt: Any) => {
      const t = pending.find((x: Any) => cleanId(x.id) === cleanId(bt.tripId || bt.id));
      const cur = t?.routes?.[t.routes.length - 1], next = DECIDED[bt.planningState];
      if (t && cur?.status === 'PENDING_APPROVAL' && next) {
        cur.status = next; cur.decidedAt = nowStamp(); t.planningState = bt.planningState; changed = true;
        autoConfirmIfApproved(t);
        toast(next === 'APPROVED' ? `Manager đã duyệt tuyến ${t.id} v${cur.v}.` : `Manager trả lại tuyến ${t.id} v${cur.v}.`);
      }
    });
    if (changed) commit();
  } catch { /* lần sau thử lại */ }
}

if (typeof window !== 'undefined') {
  void syncCoordinatorTrips();
  void syncCoordinatorMasterData();
  window.setInterval(() => { void pollRouteDecisions(); }, 15000);

  window.addEventListener('rts_trips_updated', () => {
    void syncCoordinatorTrips();
  });

  window.addEventListener('rts_requests_updated', () => {
    void syncCoordinatorTrips();
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
