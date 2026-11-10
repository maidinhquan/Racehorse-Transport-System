import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type {
  ActionResult,
  CrewMember,
  HandoverDraft,
  HealthLog,
  HealthLogRequestDto,
  Horse,
  Incident,
  Photo,
  RefuseHandoverRequestDto,
  ReportIncidentRequestDto,
  Trip,
} from '../types';
import { saveIncidentPin } from '../../../shared/utils/sharedIncidentPins';
import { driverApi, saveLocalIncident } from '../api/driverApi';
import { notifySync } from '../../../shared/utils/syncChannel';
import { saveSharedIncident } from '../../../shared/utils/sharedIncidents';
import { tripFromTracking } from '../api/flow4Mapper';
import { flow4Api } from '../../tracking/api/flow4Api';
import { DEFAULT_DRIVER_USER, mockCrew, mockHorses, mockIncidents, mockTrips } from '../data/mockData';
import {
  INCIDENT_TYPE_LABEL,
  delayPending,
  emptyHandoverDraft,
  fromInputValue,
  handoverCheck,
  isActiveTrip,
  milestoneText,
  minutesBetween,
  nextMilestone,
  nowStamp,
  tripsOf,
  incidentSegment,
  incidentWhere,
  pointOnSegment,
} from './driverRules';
import { getDemoMode } from '../../../shared/context/DemoModeContext';
import { flow6Api } from '../../aftercare/api/flow6Api';

// ============================================================================
// Store dùng chung cho mọi trang Tài xế (giữ state khi chuyển route)
// ============================================================================
interface DriverState {
  userId: string;
  trips: Trip[];
  crew: CrewMember[];
  horses: Horse[];
  incidents: Incident[];
  loading: boolean;
  loaded: boolean;
  /** Tài khoản mà dữ liệu chuyến đang giữ thuộc về (chế độ thật): đổi tài khoản thì phải tải lại */
  loadedFor: string;
  toast: { id: number; message: string } | null;
  /** Bản nháp bàn giao đang nhập */
  drafts: Record<string, HandoverDraft>;
  /** Ảnh đính kèm báo cáo sự cố đang soạn */
  incidentPhotos: Photo[];
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const USER_KEY = 'rts_driver_user';

/** Mã người dùng của tài khoản đang đăng nhập (claim `sub` trong access token) */
const tokenUser = () => {
  try {
    const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
    if (!token) return '';
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.sub === 'string' ? payload.sub : '';
  } catch { return ''; }
};
const savedUser = () => {
  if (!getDemoMode('driver')) { const u = tokenUser(); if (u) return u; }
  try { return sessionStorage.getItem(USER_KEY) || DEFAULT_DRIVER_USER; } catch { return DEFAULT_DRIVER_USER; }
};

const initialDemo = getDemoMode('driver');
const emptyData = { trips: [] as Trip[], crew: [] as CrewMember[], horses: [] as Horse[], incidents: [] as Incident[] };
const demoData = () => ({ trips: clone(mockTrips), crew: clone(mockCrew), horses: clone(mockHorses), incidents: clone(mockIncidents) });

let state: DriverState = {
  userId: savedUser(),
  ...(initialDemo ? demoData() : emptyData),
  loading: false,
  loaded: false,
  loadedFor: '',
  toast: null,
  drafts: {},
  incidentPhotos: [],
};
const listeners = new Set<() => void>();
const setState = (patch: Partial<DriverState> | ((s: DriverState) => Partial<DriverState>)) => {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => state;

const toast = (message: string) => setState({ toast: { id: Date.now(), message } });
const ok = (message: string): ActionResult => { toast(message); return { ok: true, message }; };
const fail = (message: string): ActionResult => ({ ok: false, message });

if (typeof window !== 'undefined') {
  window.addEventListener('rts_demo_mode_change', (event: Event) => {
    const detail = (event as CustomEvent<{ role: string; enabled: boolean }>).detail;
    if (!detail || detail.role !== 'driver') return;
    if (detail.enabled) {
      setState({ ...demoData(), loading: false, loaded: true, drafts: {} });
      toast('Đã bật dữ liệu mẫu & hiển thị nút demo.');
    } else {
      setState({ ...emptyData, loading: false, loaded: false, drafts: {} });
      toast('Đã tắt dữ liệu mẫu & chuyển sang dữ liệu thật từ máy chủ.');
      void loadAll();
    }
  });

  const reloadIncidents = async () => {
    try {
      const serverIncidents = await driverApi.getIncidents();
      if (serverIncidents) {
        setState((s) => {
          const merged = serverIncidents.map((srv) => {
            const loc = s.incidents.find((li) => li.id === srv.id);
            if (loc) {
              return {
                ...srv,
                horseId: srv.horseId || loc.horseId,
                horseName: srv.horseName || loc.horseName,
                healthIssueType: srv.healthIssueType || loc.healthIssueType,
                immediateCare: srv.immediateCare || loc.immediateCare,
                tripId: loc.tripId || srv.tripId,
              };
            }
            return srv;
          });
          s.incidents.forEach((loc) => {
            if (!merged.some((srv) => srv.id === loc.id)) {
              merged.unshift(loc);
            }
          });
          merged.sort((a, b) => {
            const tA = new Date((a as any).updatedAt || a.at || 0).getTime() || 0;
            const tB = new Date((b as any).updatedAt || b.at || 0).getTime() || 0;
            return tB - tA;
          });
          return { incidents: merged };
        });
      }
    } catch {
      // ignore
    }
  };
  window.addEventListener('rts_incident_created', reloadIncidents);
  window.addEventListener('rts_incident_pins_changed', reloadIncidents);
}

const findTrip = (tripId: string) => state.trips.find((t) => t.id === tripId);
const updateTrip = (tripId: string, fn: (t: Trip) => Trip) =>
  setState((s) => ({ trips: s.trips.map((t) => (t.id === tripId ? fn(clone(t)) : t)) }));
const crewName = (id: string) => state.crew.find((c) => c.id === id)?.name ?? id;
const horseName = (id: string) => state.horses.find((h) => h.id === id)?.name ?? id;
// Chế độ thật: backend đã lọc chuyến theo tài khoản đăng nhập
const isMine = (t: Trip) => !getDemoMode('driver') || Object.values(t.crew).includes(state.userId);
const draftOf = (t: Trip) => state.drafts[t.id] ?? emptyHandoverDraft(t);

/** Dựng một chuyến từ dữ liệu thật: Flow 4 (hành trình) kết hợp Flow 6 (người nhận, trạng thái bàn giao) */
async function buildLiveTrip(id: string, f6?: { tripId: string; requestId: string; status: string }) {
  const [trackingRes, ctxRes, healthRes] = await Promise.allSettled([flow4Api.getTracking(id), flow6Api.getTripContext(id), flow4Api.getHealthLogs(id)]);
  const ctx = ctxRes.status === 'fulfilled' ? ctxRes.value : undefined;
  // Nhật ký sức khỏe thật của chuyến (bản đã bị thay thế bởi bản đính chính không hiển thị)
  const health: HealthLog[] = healthRes.status === 'fulfilled'
    ? healthRes.value
        .filter((h) => !healthRes.value.some((o) => o.supersedesId === h.id))
        .map((h) => ({
          id: h.id, horseId: h.entry.horseId, at: h.entry.observedAt, temp: h.entry.temperatureC ?? 0, hr: h.entry.heartRateBpm ?? 0,
          condition: h.entry.condition, notes: h.entry.observation, by: h.recordedBy.userId,
        }))
    : [];
  const extras = { customer: ctx?.designatedReceiverName || 'Khách hàng', receiverName: ctx?.designatedReceiverName || '', receiverPhone: ctx?.designatedReceiverPhone || '' };
  if (trackingRes.status === 'fulfilled') {
    const mapped = tripFromTracking(trackingRes.value, extras);
    mapped.trip.health = health;
    return mapped;
  }
  const trip: Trip = {
    id, requestId: f6?.requestId ?? '', customer: extras.customer, mode: 'ROAD', origin: '', destination: '',
    pickup: { name: '', address: '' }, delivery: { name: '', address: '' },
    receiver: { name: extras.receiverName, phone: extras.receiverPhone }, horses: ctx?.horseIds || [],
    plannedDepart: '', eta: '', status: (f6?.status as Trip['status']) || 'IN_TRANSIT', crew: {},
    stops: [], milestones: [], clearances: [], health: [], documents: [], handoverAttempts: [],
  };
  return { trip, crew: [] as CrewMember[], horses: [] as Horse[] };
}

async function loadAll() {
  if (state.loading) return;
  setState({ loading: true });
  try {
    if (!getDemoMode('driver')) {
      try {
        const [f4Res, f6Res, incRes] = await Promise.allSettled([
          flow4Api.getDriverTrips(),
          flow6Api.getTrips(),
          driverApi.getIncidents(),
        ]);
        if (f4Res.status === 'rejected' && f6Res.status === 'rejected') throw f6Res.reason;
        const f4 = f4Res.status === 'fulfilled' ? f4Res.value : [];
        const f6 = f6Res.status === 'fulfilled' ? f6Res.value : [];
        const incidents = incRes.status === 'fulfilled' ? incRes.value : [];
        const ids = [...new Set([...f4.map((x) => x.tripId), ...f6.map((x) => x.tripId)])];
        const built = await Promise.all(ids.map((id) => buildLiveTrip(id, f6.find((x) => x.tripId === id))));
        const crewMap = new Map<string, CrewMember>();
        const horseMap = new Map<string, Horse>();
        built.forEach((b) => { b.crew.forEach((c) => crewMap.set(c.id, c)); b.horses.forEach((h) => horseMap.set(h.id, h)); });
        const currentLocals = state.incidents.filter((li) => !incidents.some((srv) => srv.id === li.id));
        const finalIncidents = [...currentLocals, ...incidents];
        setState({
          trips: built.map((b) => b.trip),
          crew: [...crewMap.values()],
          horses: [...horseMap.values()],
          incidents: finalIncidents,
          userId: tokenUser() || state.userId,
          loading: false,
          loaded: true,
          loadedFor: tokenUser(),
        });
        return;
      } catch (err) {
        console.warn('[useDriver] Failed to fetch real trips:', err);
        setState({ ...emptyData, loading: false, loaded: true });
        return;
      }
    }

    const [trips, crew, horses, incidents] = await Promise.all([
      driverApi.getMyTrips(), driverApi.getCrew(), driverApi.getHorses(), driverApi.getIncidents(),
    ]);
    setState({ trips, crew, horses, incidents, loading: false, loaded: true });
  } catch {
    setState({ ...(getDemoMode('driver') ? demoData() : emptyData), loading: false, loaded: true });
  }
}

// ============================================================================
// Actions
// ============================================================================
const actions = {
  reload: async () => { setState({ loaded: false }); await loadAll(); },
  clearToast: () => setState({ toast: null }),
  showToast: (message: string) => toast(message),

  /** Đổi tài khoản demo (tài xế / bác sĩ thú y) */
  switchUser(userId: string) {
    try { sessionStorage.setItem(USER_KEY, userId); } catch { /* ignore */ }
    setState({ userId });
    toast(`Đang dùng tài khoản ${crewName(userId)} (demo).`);
  },

  // ---------- Hành trình ----------
  async recordMilestone(tripId: string, atInput: string, note: string): Promise<ActionResult> {
    const t = findTrip(tripId); if (!t || !isMine(t)) return fail('Không tìm thấy chuyến được giao.');
    // Bác sĩ thú y / hộ tống chỉ ghi nhật ký sức khỏe; mốc hành trình do tài xế cập nhật
    const me = state.crew.find((c) => c.id === state.userId);
    if (me && me.role !== 'DRIVER') return fail('Bác sĩ thú y không được cập nhật mốc hành trình. Hãy ghi nhật ký sức khỏe ngựa; mốc do tài xế ghi.');
    const n = nextMilestone(t); if (!n) return fail('Không còn mốc nào để ghi.');
    if (n.blocked) return fail('Đang chờ Specialist ghi kết quả thông quan.');
    const at = fromInputValue(atInput);
    if (!at) return fail('Nhập thời điểm.');
    if (n.type === 'DEPARTED' && delayPending(t)) return fail('Lịch khởi hành thay đổi đang chờ xử lý, chưa thể bắt đầu.');
    const m = { type: n.type, stopIndex: n.stopIndex, at, by: state.userId, note: note.trim() || undefined };
    try {
      await driverApi.recordMilestone(tripId, { type: m.type, stopIndex: m.stopIndex, at, note: m.note, milestoneId: t.stops[n.stopIndex]?.id });
    } catch (error) {
      return fail(error instanceof Error && error.message ? error.message : 'Không ghi nhận được mốc.');
    }
    if (!getDemoMode('driver')) {
      // Backend đã ghi mốc: lỗi khi tải lại dữ liệu không được làm hỏng kết quả ghi nhận.
      try {
        const fresh = await buildLiveTrip(tripId);
        setState((s) => ({ trips: s.trips.map((x) => (x.id === tripId ? { ...fresh.trip, handover: x.handover, handoverAttempts: x.handoverAttempts, handoverStatus: x.handoverStatus } : x)) }));
      } catch (error) {
        console.warn('[useDriver] Đã ghi mốc nhưng chưa làm mới được chuyến:', error);
      }
    } else {
      updateTrip(tripId, (x) => ({ ...x, milestones: [...x.milestones, m], status: n.type === 'DEPARTED' ? 'IN_TRANSIT' : x.status }));
    }
    const extra = n.type === 'ARRIVED_CHECKPOINT' ? ' Specialist đã được báo để ghi kết quả thông quan.'
      : n.type === 'ARRIVED_DESTINATION' ? ' Hãy tiến hành bàn giao.' : '';
    return ok(`Đã ghi nhận: ${milestoneText(t, n)}.${extra}`);
  },

  async reportDepartureDelay(tripId: string, reason: string): Promise<ActionResult> {
    const t = findTrip(tripId); if (!t || t.status !== 'READY_TO_DEPART') return fail('Chuyến chưa sẵn sàng để báo chậm khởi hành.');
    if (delayPending(t)) return fail('Đang có báo cáo chậm khởi hành chưa xử lý.');
    if (reason.trim().length < 10) return fail('Mô tả lý do ít nhất 10 ký tự.');
    await driverApi.reportDepartureDelay(tripId, { reason: reason.trim() });
    updateTrip(tripId, (x) => ({ ...x, departureDelay: { status: 'REPORTED', at: nowStamp(), by: state.userId, reason: reason.trim() } }));
    return ok('Đã báo Coordinator để đề xuất lịch mới.');
  },

  async remindClearance(tripId: string): Promise<ActionResult> {
    const t = findTrip(tripId); if (!t) return fail('Không tìm thấy chuyến.');
    if (t.pingAt && minutesBetween(t.pingAt, nowStamp()) < 10) return ok(`Đã nhắc lúc ${t.pingAt.slice(11)}. Đợi 10 phút rồi nhắc lại.`);
    await driverApi.remindClearance(tripId);
    updateTrip(tripId, (x) => ({ ...x, pingAt: nowStamp() }));
    return ok('Đã nhắc Specialist ghi kết quả thông quan.');
  },

  // ---------- Sức khoẻ ngựa ----------
  async addHealthLog(tripId: string, body: HealthLogRequestDto): Promise<ActionResult> {
    const t = findTrip(tripId); if (!t || t.status === 'COMPLETED') return fail('Chuyến đã hoàn tất.');
    const me = state.crew.find((c) => c.id === state.userId);
    if (!me || me.role === 'DRIVER') return fail('Chỉ hộ tống / bác sĩ thú y ghi nhật ký sức khoẻ.');
    if (!body.horseId) return fail('Chọn ngựa.');
    if (!body.temp || body.temp < 35 || body.temp > 42) return fail('Nhập thân nhiệt từ 35 đến 42 °C.');
    if (!body.hr || body.hr < 20 || body.hr > 120) return fail('Nhập nhịp tim từ 20 đến 120 lần/phút.');
    if (body.condition !== 'NORMAL' && body.notes.trim().length < 5) return fail('Mô tả điều quan sát được khi tình trạng không bình thường.');
    const at = fromInputValue(body.at) || nowStamp();
    // Nhật ký gắn với mốc đang chờ: trạm dừng yêu cầu có nhật ký sức khỏe trước khi tài xế hoàn tất mốc
    const pending = nextMilestone(t);
    try {
      await driverApi.addHealthLog(tripId, { ...body, at, milestoneId: pending ? t.stops[pending.stopIndex]?.id : undefined });
    } catch (error) {
      return fail(error instanceof Error && error.message ? error.message : 'Không lưu được nhật ký sức khỏe.');
    }
    updateTrip(tripId, (x) => ({ ...x, health: [...x.health, { ...body, at, id: `HL-${Date.now()}`, notes: body.notes.trim(), by: state.userId }] }));
    if (body.condition === 'ABNORMAL') return ok('Đã lưu. Manager và Coordinator đã được cảnh báo – báo sự cố nếu cần.');
    if (body.condition !== 'NORMAL' || body.temp >= 38.6) return ok('Đã lưu. Coordinator đã được báo dấu hiệu bất thường.');
    return ok('Đã lưu nhật ký sức khoẻ.');
  },

  // ---------- Sự cố ----------
  addIncidentPhoto: (p: Photo) => setState((s) => ({ incidentPhotos: [...s.incidentPhotos, p] })),
  removeIncidentPhoto: (i: number) => setState((s) => ({ incidentPhotos: s.incidentPhotos.filter((_, k) => k !== i) })),

  async reportIncident(tripId: string, body: Omit<ReportIncidentRequestDto, 'photos' | 'location' | 'locationCoordinates'> & { locationDetail: string; safe: boolean; ratio: number }): Promise<ActionResult> {
    let t = findTrip(tripId);
    if (!t || t.status === 'COMPLETED') {
      const activeFallback = state.trips.find((x) => x.status === 'IN_TRANSIT') || state.trips.find((x) => x.status !== 'COMPLETED') || state.trips[0];
      if (activeFallback) {
        t = activeFallback;
        tripId = activeFallback.id;
      }
    }
    if (!t) return fail('Không tìm thấy thông tin chuyến đi phù hợp.');
    if (!body.type || !body.severity) return fail('Chọn loại và mức độ sự cố.');
    if (body.description.trim().length < 5) return fail('Vui lòng mô tả sự việc ít nhất 5 ký tự.');
    if (!body.safe) return fail('Xác nhận người và ngựa đã an toàn hoặc đã bắt đầu sơ cứu.');
    const { a, b } = incidentSegment(t);
    const point = a && b ? pointOnSegment(a, b, body.ratio) : null;
    const location = incidentWhere(t, body.ratio) + (body.locationDetail.trim() ? ' – ' + body.locationDetail.trim() : '');
    const photos = state.incidentPhotos.map((p) => p.url || p.name);
    const locationCoordinates = point ? `${point.lat.toFixed(6)},${point.lng.toFixed(6)}` : undefined;
    const backendRes = await driverApi.reportIncident(tripId, {
      type: body.type,
      severity: body.severity,
      description: body.description.trim(),
      location,
      locationCoordinates,
      photos,
      horseId: body.horseId,
      horseName: body.horseName,
      healthIssueType: body.healthIssueType,
      immediateCare: body.immediateCare,
    });
    const realId = backendRes?.incidentId || `INC-${String(Date.now()).slice(-4)}`;
    const inc: Incident = {
      id: realId,
      tripId,
      type: body.type,
      severity: body.severity,
      status: 'NEW',
      at: nowStamp(),
      updatedAt: nowStamp(),
      by: state.userId,
      location,
      lat: point?.lat,
      lng: point?.lng,
      description: body.description.trim(),
      photos,
      horseId: body.horseId,
      horseName: body.horseName,
      healthIssueType: body.healthIssueType,
      immediateCare: body.immediateCare,
    };
    saveSharedIncident(inc as any);
    if (point) saveIncidentPin({ id: inc.id, tripId, label: INCIDENT_TYPE_LABEL[inc.type], lat: point.lat, lng: point.lng, where: location, description: inc.description, at: inc.at });
    saveLocalIncident(inc);
    setState((s) => ({ incidents: [inc, ...s.incidents.filter((x) => x.id !== inc.id)], incidentPhotos: [] }));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rts_incident_created', { detail: inc }));
      notifySync('requests_updated');
    }
    return ok(`Đã gửi báo cáo ${INCIDENT_TYPE_LABEL[inc.type].toLowerCase()}. Manager, Coordinator và khách hàng đã được thông báo.`);
  },

  // ---------- Bàn giao ----------
  updateDraft(tripId: string, fn: (d: HandoverDraft) => HandoverDraft) {
    const t = findTrip(tripId); if (!t) return;
    setState((s) => ({ drafts: { ...s.drafts, [tripId]: fn(clone(draftOf(t))) } }));
  },
  verifyHorse(tripId: string, horseId: string) {
    const t = findTrip(tripId); if (!t) return;
    const chip = state.horses.find((h) => h.id === horseId)?.microchip ?? '';
    actions.updateDraft(tripId, (d) => {
      const v = d.horses[horseId] ?? { chip: '', condition: 'NORMAL', notes: '', ok: false, err: '' };
      if (v.chip.replace(/\s/g, '') !== chip) v.err = 'Microchip không khớp với ngựa này. Kiểm tra lại và quét lần nữa.';
      else if (v.condition !== 'NORMAL' && v.notes.trim().length < 5) v.err = 'Ghi chú tình trạng ngựa khi không bình thường.';
      else v.err = '';
      v.ok = !v.err;
      return { ...d, horses: { ...d.horses, [horseId]: v } };
    });
  },

  async completeHandover(tripId: string): Promise<ActionResult> {
    const t = findTrip(tripId); if (!t) return fail('Không tìm thấy chuyến.');
    if (t.handover || t.status !== 'IN_TRANSIT') return fail('Bàn giao không còn ở trạng thái chờ.');
    const d = draftOf(t);
    const chk = handoverCheck(t, d);
    if (chk.errors.length) return fail(`Chưa thể hoàn tất bàn giao: ${chk.errors[0]}.`);
    const record = {
      completedAt: nowStamp(),
      receiver: { name: d.receiver.name.trim(), idType: d.receiver.idType, idNumber: d.receiver.idNumber.trim() },
      horses: t.horses.map((h) => ({ horseId: h, condition: d.horses[h].condition, notes: d.horses[h].notes })),
      photos: d.photos.map((p) => p.name),
      signature: d.signature ?? '',
      by: state.userId,
    };
    await driverApi.completeHandover(tripId, { receiver: record.receiver, horses: record.horses, photos: record.photos, signature: record.signature });
    updateTrip(tripId, (x) => ({
      ...x, handover: record, status: 'COMPLETED', handoverStatus: 'COMPLETED',
      handoverAttempts: [...x.handoverAttempts, { at: record.completedAt, status: 'COMPLETED', by: state.userId }],
    }));
    setState((s) => { const drafts = { ...s.drafts }; delete drafts[tripId]; return { drafts }; });
    return ok('Bàn giao hoàn tất. Chuyến đã kết thúc; yêu cầu vận chuyển chuyển sang Đã giao.');
  },

  async refuseHandover(tripId: string, body: RefuseHandoverRequestDto): Promise<ActionResult> {
    const t = findTrip(tripId); if (!t || t.status !== 'IN_TRANSIT' || t.handover) return fail('Chỉ ghi nhận từ chối khi bàn giao đang chờ.');
    if (!body.category) return fail('Chọn nhóm lý do.');
    if (body.reason.trim().length < 5) return fail('Nhập lý do chi tiết.');
    if (!body.next) return fail('Chọn bước tiếp theo đề xuất.');
    await driverApi.refuseHandover(tripId, body);
    updateTrip(tripId, (x) => ({
      ...x, handoverStatus: 'REFUSED',
      handoverAttempts: [...x.handoverAttempts, { at: nowStamp(), status: 'REFUSED', by: state.userId, category: body.category, reason: body.reason.trim(), next: body.next, note: body.note }],
    }));
    return ok('Đã ghi nhận từ chối bàn giao. Manager đã được thông báo.');
  },

  // ---------- Nút demo (giả lập Specialist / Coordinator / Manager) ----------
  demoClearance(tripId: string): ActionResult {
    const t = findTrip(tripId); const n = t && nextMilestone(t);
    if (!t || !n || n.type !== 'PASSED_CHECKPOINT') return fail('Chuyến không đang chờ thông quan.');
    updateTrip(tripId, (x) => ({ ...x, clearances: [...x.clearances, { stopIndex: n.stopIndex, result: 'PASSED', notes: 'Hồ sơ hợp lệ, cho qua.', at: nowStamp(), by: 'Hoang Thu Ha' }] }));
    return ok(`Demo: Specialist ghi thông quan đạt tại ${t.stops[n.stopIndex]?.name ?? 'trạm'}.`);
  },
  demoApproveDelay(tripId: string): ActionResult {
    const t = findTrip(tripId); if (!t?.departureDelay || !delayPending(t)) return fail('Không có báo chậm khởi hành chờ xử lý.');
    const depart = new Date(t.plannedDepart.replace(' ', 'T'));
    depart.setDate(depart.getDate() + 1);
    const p = (n: number) => String(n).padStart(2, '0');
    const newDepart = `${depart.getFullYear()}-${p(depart.getMonth() + 1)}-${p(depart.getDate())} ${t.plannedDepart.slice(11)}`;
    updateTrip(tripId, (x) => ({ ...x, plannedDepart: newDepart, departureDelay: x.departureDelay && { ...x.departureDelay, status: 'APPROVED', proposedDepart: newDepart } }));
    return ok(`Demo: Manager duyệt lịch khởi hành mới ${newDepart}.`);
  },
  demoResolveRefusal(tripId: string): ActionResult {
    const t = findTrip(tripId); if (t?.handoverStatus !== 'REFUSED') return fail('Không có lần từ chối cần xử lý.');
    updateTrip(tripId, (x) => ({ ...x, handoverStatus: undefined }));
    return ok('Demo: Manager đã xử lý lần từ chối – có thể bàn giao lại.');
  },
};

export type DriverActions = typeof actions;

// ============================================================================
// Hook
// ============================================================================
export const useDriver = () => {
  const snap = useSyncExternalStore(subscribe, getSnapshot);

  // Chỉ tải lần đầu: mỗi component gắn vào hook này không được kích hoạt tải lại (tránh vòng lặp khi màn hình đổi giữa "đang tải" và danh sách)
  useEffect(() => {
    // Đăng nhập tài khoản khác trong cùng phiên trang: bỏ dữ liệu chuyến của người trước rồi tải lại theo tài khoản mới
    if (state.loaded && !getDemoMode('driver') && state.loadedFor !== tokenUser()) {
      setState({ ...emptyData, loaded: false, loadedFor: '', drafts: {} });
    }
    if (!state.loaded) void loadAll();
  }, []);

  const me = useMemo(() => {
    const found = snap.crew.find((c) => c.id === snap.userId);
    if (found) return found;
    const storedName = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userFullName') : null;
    if (storedName) {
      return { id: snap.userId, name: storedName, role: 'MAIN_DRIVER' as const, phone: '' };
    }
    return undefined;
  }, [snap.crew, snap.userId]);
  const myTrips = useMemo(() => {
    if (!getDemoMode('driver')) return snap.trips;
    return tripsOf(snap.trips, snap.userId);
  }, [snap.trips, snap.userId]);
  const activeTrips = useMemo(() => myTrips.filter(isActiveTrip), [myTrips]);
  const completedTrips = useMemo(() => myTrips.filter((t) => !isActiveTrip(t)), [myTrips]);
  const getTrip = useCallback((id?: string) => myTrips.find((t) => t.id === id), [myTrips]);
  const crewMember = useCallback((id?: string) => snap.crew.find((c) => c.id === id), [snap.crew]);
  const horse = useCallback((id?: string) => snap.horses.find((h) => h.id === id), [snap.horses]);
  const draft = useCallback((t: Trip) => snap.drafts[t.id] ?? emptyHandoverDraft(t), [snap.drafts]);
  const isEscort = !!me && me.role !== 'DRIVER';

  return { ...snap, me, isEscort, myTrips, activeTrips, completedTrips, getTrip, crewMember, horse, draft, actions };
};

export { crewName, horseName };

export default useDriver;
