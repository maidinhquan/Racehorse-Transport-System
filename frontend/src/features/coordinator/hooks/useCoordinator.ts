import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type {
  ActionResult,
  CoordinatorDashboardStats,
  CrewAssignment,
  FlightProposalRequestDto,
  Incident,
  LegKey,
  RouteStop,
  Staff,
  Trip,
  Vehicle,
} from '../types';
import { coordinatorApi } from '../api/coordinatorApi';
import { COORDINATOR_NAME, mockIncidents, mockStaff, mockTrips, mockVehicles } from '../data/mockData';
import {
  SLOTS,
  SLOT_LABEL,
  canPlan,
  isActiveTrip,
  milestoneText,
  nextMilestone,
  nowStamp,
  planGaps,
  resourceGaps,
  routeEditable,
  staffBlock,
  vehicleBlock,
} from './coordinatorRules';

// ============================================================================
// Store dùng chung cho mọi trang Coordinator (giữ state khi chuyển route)
// ============================================================================
interface CoordinatorState {
  trips: Trip[];
  vehicles: Vehicle[];
  staff: Staff[];
  incidents: Incident[];
  loading: boolean;
  loaded: boolean;
  toast: { id: number; message: string } | null;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

let state: CoordinatorState = {
  trips: clone(mockTrips),
  vehicles: clone(mockVehicles),
  staff: clone(mockStaff),
  incidents: clone(mockIncidents),
  loading: false,
  loaded: false,
  toast: null,
};
const listeners = new Set<() => void>();
const setState = (patch: Partial<CoordinatorState> | ((s: CoordinatorState) => Partial<CoordinatorState>)) => {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => state;

const toast = (message: string) => setState({ toast: { id: Date.now(), message } });
const ok = (message: string): ActionResult => { toast(message); return { ok: true, message }; };
const fail = (message: string): ActionResult => { toast(message); return { ok: false, message }; };

const updateTrip = (tripId: string, fn: (t: Trip) => Trip) =>
  setState((s) => ({ trips: s.trips.map((t) => (t.id === tripId ? fn(clone(t)) : t)) }));
const findTrip = (tripId: string) => state.trips.find((t) => t.id === tripId);

async function loadAll() {
  if (state.loading || state.loaded) return;
  setState({ loading: true });
  const [trips, vehicles, staff, incidents] = await Promise.all([
    coordinatorApi.getTrips(), coordinatorApi.getVehicles(), coordinatorApi.getStaff(), coordinatorApi.getIncidents(),
  ]);
  setState({ trips, vehicles, staff, incidents, loading: false, loaded: true });
}

// ============================================================================
// Actions
// ============================================================================
const actions = {
  reload: async () => { setState({ loaded: false }); await loadAll(); },
  clearToast: () => setState({ toast: null }),

  // ---------- Tuyến đường ----------
  addStop(tripId: string, stop: Omit<RouteStop, 'id'>): ActionResult {
    const t = findTrip(tripId); if (!t) return fail('Không tìm thấy chuyến.');
    if (!routeEditable(t)) return fail('Tuyến chỉ sửa được khi đang là bản nháp hoặc bị trả về.');
    if (stop.name.trim().length < 3) return fail('Nhập tên điểm dừng.');
    updateTrip(tripId, (x) => {
      const stops = [...x.route.stops];
      const dest = stops.findIndex((s) => s.type === 'DESTINATION');
      const item = { ...stop, id: `s${Date.now()}` };
      if (stop.type !== 'DESTINATION' && dest >= 0) stops.splice(dest, 0, item); else stops.push(item);
      return { ...x, route: { ...x.route, stops } };
    });
    return ok(`Đã thêm điểm dừng “${stop.name}”.`);
  },
  removeStop(tripId: string, stopId: string): ActionResult {
    const t = findTrip(tripId); if (!t || !routeEditable(t)) return fail('Tuyến không sửa được ở trạng thái hiện tại.');
    updateTrip(tripId, (x) => ({ ...x, route: { ...x.route, stops: x.route.stops.filter((s) => s.id !== stopId) } }));
    return ok('Đã xoá điểm dừng.');
  },
  moveStop(tripId: string, stopId: string, dir: -1 | 1): ActionResult {
    const t = findTrip(tripId); if (!t || !routeEditable(t)) return fail('Tuyến không sửa được ở trạng thái hiện tại.');
    updateTrip(tripId, (x) => {
      const stops = [...x.route.stops];
      const i = stops.findIndex((s) => s.id === stopId), j = i + dir;
      if (i < 1 || j < 1 || j >= stops.length - 1) return x; // giữ nguyên điểm đi/điểm đến
      [stops[i], stops[j]] = [stops[j], stops[i]];
      return { ...x, route: { ...x.route, stops } };
    });
    return { ok: true, message: '' };
  },
  async submitRoute(tripId: string): Promise<ActionResult> {
    const t = findTrip(tripId); if (!t) return fail('Không tìm thấy chuyến.');
    if (!routeEditable(t)) return fail('Tuyến không ở trạng thái có thể gửi duyệt.');
    const s = t.route.stops;
    if (s.length < 2) return fail('Tuyến cần ít nhất điểm đi và điểm đến.');
    if (s[0].type !== 'ORIGIN' || s[s.length - 1].type !== 'DESTINATION') return fail('Điểm đầu phải là Điểm đi và điểm cuối phải là Điểm đến.');
    if (s.some((x, i) => i > 0 && x.plannedAt < s[i - 1].plannedAt)) return fail('Thời gian dự kiến các điểm phải tăng dần.');
    await coordinatorApi.submitRoute(tripId, { stops: s });
    updateTrip(tripId, (x) => ({ ...x, route: { ...x.route, version: Math.max(1, x.route.version + (x.route.status === 'RETURNED' ? 1 : 0)), status: 'PENDING_APPROVAL', submittedAt: nowStamp(), returnReason: undefined } }));
    return ok('Đã gửi phương án tuyến cho Logistics Manager phê duyệt.');
  },

  // ---------- Xe & nhân sự ----------
  async assignVehicle(tripId: string, vehicleId: string, leg?: LegKey): Promise<ActionResult> {
    const t = findTrip(tripId); if (!t) return fail('Không tìm thấy chuyến.');
    if (!canPlan(t)) return fail('Chỉ phân công khi chuyến đã được giao và đang lập kế hoạch.');
    const v = state.vehicles.find((x) => x.id === vehicleId); if (!v) return fail('Không tìm thấy xe.');
    const why = vehicleBlock(v, t, state.trips, leg); if (why) return fail(`${v.plate}: ${why}`);
    await coordinatorApi.assignResources(tripId, { leg, vehicleId, crew: leg && t.legs ? t.legs[leg].crew : t.crew });
    updateTrip(tripId, (x) => (leg && x.legs
      ? { ...x, legs: { ...x.legs, [leg]: { ...x.legs[leg], vehicleId } }, resourcesConfirmed: undefined }
      : { ...x, vehicleId, resourcesConfirmed: undefined }));
    return ok(`Đã phân công xe ${v.plate}${leg ? (leg === 'outbound' ? ' cho chặng 1' : ' cho chặng 2') : ''}.`);
  },
  async assignCrew(tripId: string, crew: CrewAssignment, leg?: LegKey): Promise<ActionResult> {
    const t = findTrip(tripId); if (!t) return fail('Không tìm thấy chuyến.');
    if (!canPlan(t)) return fail('Chỉ phân công khi chuyến đã được giao và đang lập kế hoạch.');
    const ids = SLOTS.map((k) => crew[k]).filter((x): x is string => !!x);
    if (new Set(ids).size !== ids.length) return fail('Mỗi vị trí phải là một người khác nhau.');
    // không trùng người giữa 2 chặng của cùng chuyến
    if (leg && t.legs) {
      const other = t.legs[leg === 'outbound' ? 'inbound' : 'outbound'].crew;
      const dup = ids.find((id) => Object.values(other).includes(id));
      if (dup) return fail(`${state.staff.find((s) => s.id === dup)?.name ?? dup} đã được gắn vào chặng còn lại.`);
    }
    for (const slot of SLOTS) {
      const id = crew[slot]; if (!id) continue;
      const s = state.staff.find((x) => x.id === id); if (!s) return fail('Không tìm thấy nhân sự.');
      const why = staffBlock(s, slot, t, state.trips, leg);
      if (why) return fail(`${SLOT_LABEL[slot]} – ${s.name}: ${why} Một nhân sự chỉ được gắn vào một chuyến đang hoạt động.`);
    }
    await coordinatorApi.assignResources(tripId, { leg, crew });
    updateTrip(tripId, (x) => (leg && x.legs
      ? { ...x, legs: { ...x.legs, [leg]: { ...x.legs[leg], crew } }, resourcesConfirmed: undefined }
      : { ...x, crew, resourcesConfirmed: undefined }));
    return ok('Đã lưu phân công nhân sự.');
  },
  async confirmResources(tripId: string): Promise<ActionResult> {
    const t = findTrip(tripId); if (!t) return fail('Không tìm thấy chuyến.');
    const gaps = resourceGaps(t, state.vehicles, state.staff, state.trips);
    if (gaps.length) return fail(`Chưa đủ điều kiện: ${gaps[0]}${gaps.length > 1 ? ` (+${gaps.length - 1})` : ''}.`);
    await coordinatorApi.confirmResources(tripId);
    updateTrip(tripId, (x) => ({ ...x, resourcesConfirmed: { at: nowStamp(), by: COORDINATOR_NAME } }));
    return ok('Đã xác nhận bố trí phương tiện & nhân sự (Operations READY).');
  },

  // ---------- Chuyến bay ----------
  async proposeFlight(tripId: string, body: FlightProposalRequestDto): Promise<ActionResult> {
    const t = findTrip(tripId); if (!t || t.mode !== 'AIR') return fail('Chỉ chuyến hàng không mới có phương án bay.');
    if (!canPlan(t)) return fail('Chuyến chưa ở bước lập kế hoạch.');
    if (!body.airline || !body.flightNo || !body.departAt || !body.arriveAt) return fail('Nhập đủ hãng bay, số hiệu và giờ bay.');
    if (body.arriveAt <= body.departAt) return fail('Giờ đến phải sau giờ đi.');
    if (body.cost <= 0) return fail('Ngân sách thuê bay phải lớn hơn 0.');
    await coordinatorApi.proposeFlight(tripId, body);
    updateTrip(tripId, (x) => ({ ...x, flight: { ...body, status: 'BUDGET_PENDING' }, resourcesConfirmed: undefined }));
    return ok('Đã gửi phương án bay – chờ Manager duyệt ngân sách.');
  },
  async bookFlight(tripId: string, bookingRef: string): Promise<ActionResult> {
    const t = findTrip(tripId); if (!t?.flight || t.flight.status !== 'BUDGET_APPROVED') return fail('Ngân sách bay chưa được duyệt.');
    if (bookingRef.trim().length < 4) return fail('Nhập mã đặt chỗ của hãng bay.');
    await coordinatorApi.bookFlight(tripId, bookingRef);
    updateTrip(tripId, (x) => ({ ...x, flight: x.flight && { ...x.flight, status: 'BOOKED', bookingRef: bookingRef.trim() } }));
    return ok('Đã ghi nhận mã đặt chỗ chuyến bay.');
  },

  // ---------- Theo dõi hành trình ----------
  async updateEta(tripId: string, eta: string, reason: string): Promise<ActionResult> {
    const t = findTrip(tripId); if (!t || t.status === 'COMPLETED') return fail('Chuyến đã hoàn tất.');
    if (!eta) return fail('Chọn ETA mới.');
    if (eta <= t.plannedDepart) return fail('ETA phải sau giờ khởi hành.');
    if (reason.trim().length < 5) return fail('Nhập lý do thay đổi ETA.');
    await coordinatorApi.updateEta(tripId, { eta, reason });
    updateTrip(tripId, (x) => ({ ...x, eta, etaHistory: [...x.etaHistory, { from: x.eta, to: eta, at: nowStamp(), by: COORDINATOR_NAME, reason }] }));
    return ok('Đã cập nhật ETA và thông báo cho khách hàng.');
  },

  // ---------- Nút demo (giả lập thao tác của Manager / tài xế) ----------
  demoDeploy(tripId: string): ActionResult {
    updateTrip(tripId, (x) => ({ ...x, deploymentStatus: 'CONFIRMED' }));
    return ok('Demo: Manager đã giao chuyến cho Coordinator.');
  },
  demoApproveRoute(tripId: string): ActionResult {
    const t = findTrip(tripId); if (t?.route.status !== 'PENDING_APPROVAL') return fail('Tuyến chưa được gửi duyệt.');
    updateTrip(tripId, (x) => ({ ...x, route: { ...x.route, status: 'APPROVED', reviewedAt: nowStamp() } }));
    return ok('Demo: Manager đã phê duyệt tuyến đường.');
  },
  demoReturnRoute(tripId: string): ActionResult {
    const t = findTrip(tripId); if (t?.route.status !== 'PENDING_APPROVAL') return fail('Tuyến chưa được gửi duyệt.');
    updateTrip(tripId, (x) => ({ ...x, route: { ...x.route, status: 'RETURNED', reviewedAt: nowStamp(), returnReason: 'Demo: điều chỉnh thời gian nghỉ cho ngựa.' } }));
    return ok('Demo: Manager trả tuyến về để điều chỉnh.');
  },
  demoApproveFlightBudget(tripId: string): ActionResult {
    const t = findTrip(tripId); if (t?.flight?.status !== 'BUDGET_PENDING') return fail('Không có ngân sách bay chờ duyệt.');
    updateTrip(tripId, (x) => ({ ...x, flight: x.flight && { ...x.flight, status: 'BUDGET_APPROVED' } }));
    return ok('Demo: Manager đã duyệt ngân sách chuyến bay.');
  },
  demoApproveDeparture(tripId: string): ActionResult {
    const t = findTrip(tripId); if (!t) return fail('Không tìm thấy chuyến.');
    const gaps = planGaps(t, state.vehicles, state.staff, state.trips);
    if (gaps.length) return fail(`Chưa đủ điều kiện khởi hành: ${gaps[0]}.`);
    updateTrip(tripId, (x) => ({ ...x, status: 'READY_TO_DEPART' }));
    return ok('Demo: Manager đã duyệt khởi hành.');
  },
  /** Giả lập tài xế ghi mốc trên ứng dụng tài xế */
  async demoMilestone(tripId: string, kind: 'depart' | 'next' | 'arrive'): Promise<ActionResult> {
    const t = findTrip(tripId); if (!t) return fail('Không tìm thấy chuyến.');
    if (kind === 'depart' && t.status !== 'READY_TO_DEPART') return fail('Chuyến cần được Manager duyệt khởi hành trước.');
    if (kind !== 'depart' && t.status !== 'IN_TRANSIT') return fail('Chuyến chưa ở trạng thái đang vận chuyển.');
    const driver = state.staff.find((s) => s.id === (t.crew.MAIN_DRIVER || t.legs?.outbound.crew.MAIN_DRIVER))?.name ?? 'Tài xế';
    const recorded: string[] = [];
    let x = clone(t), guard = 0;
    do {
      const n = nextMilestone(x); if (!n) break;
      const m = { ...n, at: nowStamp(), by: driver };
      await coordinatorApi.recordMilestone(tripId, m);
      x = { ...x, milestones: [...x.milestones, m], status: n.type === 'DEPARTED' ? 'IN_TRANSIT' : x.status };
      recorded.push(milestoneText(x, n));
      if (kind !== 'arrive' || n.type === 'ARRIVED_DESTINATION') break;
    } while (guard++ < 40);
    if (!recorded.length) return fail('Không còn mốc nào để ghi.');
    updateTrip(tripId, () => x);
    return ok(`Demo: ${recorded[recorded.length - 1]}.`);
  },
};

export type CoordinatorActions = typeof actions;

// ============================================================================
// Hook
// ============================================================================
export const useCoordinator = () => {
  const snap = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => { void loadAll(); }, []);

  const getTrip = useCallback((id?: string) => snap.trips.find((t) => t.id === id), [snap.trips]);

  const stats: CoordinatorDashboardStats = useMemo(() => {
    const deployed = snap.trips.filter((t) => t.deploymentStatus === 'CONFIRMED' && t.status === 'PLANNING');
    return {
      needRoute: deployed.filter((t) => t.route.status !== 'APPROVED').length,
      needResources: deployed.filter((t) => resourceGaps(t, snap.vehicles, snap.staff, snap.trips).length || !t.resourcesConfirmed).length,
      readyVehicles: snap.vehicles.filter((v) => v.status === 'READY' && !snap.trips.some((t) => isActiveTrip(t) && [t.vehicleId, t.legs?.outbound.vehicleId, t.legs?.inbound.vehicleId].includes(v.id))).length,
      totalVehicles: snap.vehicles.length,
      inTransit: snap.trips.filter((t) => t.status === 'IN_TRANSIT').length,
      openIncidents: snap.incidents.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status)).length,
    };
  }, [snap]);

  return { ...snap, stats, getTrip, actions };
};

export default useCoordinator;
