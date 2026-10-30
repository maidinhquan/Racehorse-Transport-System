import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type {
  ActionResult,
  CrewMember,
  HandoverDraft,
  HealthLogRequestDto,
  Horse,
  Incident,
  Photo,
  RefuseHandoverRequestDto,
  ReportIncidentRequestDto,
  Trip,
} from '../types';
import { driverApi } from '../api/driverApi';
import { DEFAULT_DRIVER_USER, mockCrew, mockHorses, mockIncidents, mockTrips } from '../data/mockData';
import {
  INCIDENT_TYPE_LABEL,
  cooldownLeft,
  delayPending,
  emptyHandoverDraft,
  fromInputValue,
  handoverCheck,
  isActiveTrip,
  lastMilestone,
  milestoneText,
  minutesBetween,
  nextMilestone,
  nowStamp,
  tripsOf,
  whereNow,
} from './driverRules';
import { getDemoMode } from '../../../shared/context/DemoModeContext';

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
  toast: { id: number; message: string } | null;
  /** Thời điểm thực (ms) ghi mốc gần nhất của từng chuyến – dùng tính thời gian chờ */
  lastRecordedMs: Record<string, number>;
  /** Bản nháp bàn giao đang nhập */
  drafts: Record<string, HandoverDraft>;
  /** Ảnh đính kèm báo cáo sự cố đang soạn */
  incidentPhotos: Photo[];
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const USER_KEY = 'rts_driver_user';

const savedUser = () => {
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
  toast: null,
  lastRecordedMs: {},
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
    setState({ ...(detail.enabled ? demoData() : emptyData), loading: false, loaded: true, drafts: {}, lastRecordedMs: {} });
    toast(detail.enabled ? 'Đã bật dữ liệu mẫu & hiển thị nút demo.' : 'Đã tắt dữ liệu mẫu & ẩn nút demo.');
  });
}

const findTrip = (tripId: string) => state.trips.find((t) => t.id === tripId);
const updateTrip = (tripId: string, fn: (t: Trip) => Trip) =>
  setState((s) => ({ trips: s.trips.map((t) => (t.id === tripId ? fn(clone(t)) : t)) }));
const crewName = (id: string) => state.crew.find((c) => c.id === id)?.name ?? id;
const horseName = (id: string) => state.horses.find((h) => h.id === id)?.name ?? id;
const isMine = (t: Trip) => Object.values(t.crew).includes(state.userId);
const draftOf = (t: Trip) => state.drafts[t.id] ?? emptyHandoverDraft(t);

async function loadAll() {
  if (state.loading || state.loaded) return;
  setState({ loading: true });
  try {
    const [trips, crew, horses, incidents] = await Promise.all([
      driverApi.getMyTrips(), driverApi.getCrew(), driverApi.getHorses(), driverApi.getIncidents(),
    ]);
    if (!getDemoMode('driver')) { setState({ ...emptyData, loading: false, loaded: true }); return; }
    setState({ trips, crew, horses, incidents, loading: false, loaded: true });
  } catch {
    setState(getDemoMode('driver') ? { loading: false, loaded: true } : { ...emptyData, loading: false, loaded: true });
  }
}

// ============================================================================
// Actions
// ============================================================================
const actions = {
  reload: async () => { setState({ loaded: false }); await loadAll(); },
  clearToast: () => setState({ toast: null }),

  /** Đổi tài khoản demo (tài xế / bác sĩ thú y) */
  switchUser(userId: string) {
    try { sessionStorage.setItem(USER_KEY, userId); } catch { /* ignore */ }
    setState({ userId });
    toast(`Đang dùng tài khoản ${crewName(userId)} (demo).`);
  },

  // ---------- Hành trình ----------
  async recordMilestone(tripId: string, atInput: string, note: string): Promise<ActionResult> {
    const t = findTrip(tripId); if (!t || !isMine(t)) return fail('Không tìm thấy chuyến được giao.');
    const n = nextMilestone(t); if (!n) return fail('Không còn mốc nào để ghi.');
    if (n.blocked) return fail('Đang chờ Specialist ghi kết quả thông quan.');
    const wait = cooldownLeft(state.lastRecordedMs[tripId]);
    if (wait) return fail(`Vừa ghi nhận mốc trước. Có thể ghi mốc tiếp sau ${wait} giây.`);
    const at = fromInputValue(atInput);
    if (!at) return fail('Nhập thời điểm.');
    if (n.type === 'DEPARTED' && at.slice(0, 10) < t.plannedDepart.slice(0, 10)) return fail('Không thể xuất phát trước ngày khởi hành đã được phê duyệt.');
    if (n.type === 'DEPARTED' && delayPending(t)) return fail('Lịch khởi hành thay đổi đang chờ xử lý, chưa thể bắt đầu.');
    const last = lastMilestone(t);
    if (last && at < last.at) return fail(`Thời điểm phải sau mốc trước (${last.at}).`);
    const m = { type: n.type, stopIndex: n.stopIndex, at, by: state.userId, note: note.trim() || undefined };
    await driverApi.recordMilestone(tripId, { type: m.type, stopIndex: m.stopIndex, at, note: m.note });
    updateTrip(tripId, (x) => ({ ...x, milestones: [...x.milestones, m], status: n.type === 'DEPARTED' ? 'IN_TRANSIT' : x.status }));
    setState((s) => ({ lastRecordedMs: { ...s.lastRecordedMs, [tripId]: Date.now() } }));
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
    await driverApi.addHealthLog(tripId, { ...body, at });
    updateTrip(tripId, (x) => ({ ...x, health: [...x.health, { ...body, at, id: `HL-${Date.now()}`, notes: body.notes.trim(), by: state.userId }] }));
    if (body.condition === 'ABNORMAL') return ok('Đã lưu. Manager và Coordinator đã được cảnh báo – báo sự cố nếu cần.');
    if (body.condition !== 'NORMAL' || body.temp >= 38.6) return ok('Đã lưu. Coordinator đã được báo dấu hiệu bất thường.');
    return ok('Đã lưu nhật ký sức khoẻ.');
  },

  // ---------- Sự cố ----------
  addIncidentPhoto: (p: Photo) => setState((s) => ({ incidentPhotos: [...s.incidentPhotos, p] })),
  removeIncidentPhoto: (i: number) => setState((s) => ({ incidentPhotos: s.incidentPhotos.filter((_, k) => k !== i) })),

  async reportIncident(tripId: string, body: Omit<ReportIncidentRequestDto, 'photos' | 'location'> & { locationDetail: string; safe: boolean }): Promise<ActionResult> {
    const t = findTrip(tripId); if (!t || t.status === 'COMPLETED') return fail('Chỉ báo cáo sự cố cho chuyến đang hoạt động.');
    if (!body.type || !body.severity) return fail('Chọn loại và mức độ sự cố.');
    if (body.description.trim().length < 10) return fail('Mô tả sự việc ít nhất 10 ký tự.');
    if (!body.safe) return fail('Xác nhận người và ngựa đã an toàn hoặc đã bắt đầu sơ cứu.');
    const location = whereNow(t) + (body.locationDetail.trim() ? ' – ' + body.locationDetail.trim() : '');
    const photos = state.incidentPhotos.map((p) => p.name);
    await driverApi.reportIncident(tripId, { type: body.type, severity: body.severity, description: body.description.trim(), location, photos });
    const inc: Incident = {
      id: `INC-${String(Date.now()).slice(-4)}`, tripId, type: body.type, severity: body.severity, status: 'NEW',
      at: nowStamp(), by: state.userId, location, description: body.description.trim(), photos,
    };
    setState((s) => ({ incidents: [inc, ...s.incidents], incidentPhotos: [] }));
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
  demoFastForward(): ActionResult {
    setState({ lastRecordedMs: {} });
    return ok('Demo: bỏ qua thời gian chờ giữa 2 mốc.');
  },
};

export type DriverActions = typeof actions;

// ============================================================================
// Hook
// ============================================================================
export const useDriver = () => {
  const snap = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => { void loadAll(); }, []);

  const me = useMemo(() => snap.crew.find((c) => c.id === snap.userId), [snap.crew, snap.userId]);
  const myTrips = useMemo(() => tripsOf(snap.trips, snap.userId), [snap.trips, snap.userId]);
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
