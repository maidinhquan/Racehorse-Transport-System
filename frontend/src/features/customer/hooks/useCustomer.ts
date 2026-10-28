import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type {
  ActionResult,
  ActorRole,
  ComplaintInput,
  ContractChangeInput,
  CustomerNotification,
  CustomerProfile,
  DocKey,
  DocRecord,
  FileRef,
  Horse,
  HorseInput,
  Place,
  RequestField,
  TransportRequest,
  TripInfoInput,
} from '../types';
import { customerApi } from '../api/customerApi';
import { readRequestDrafts, writeRequestDrafts, mergeRequestDrafts } from '../api/requestDrafts';
import { apiMessage } from '../../../shared/api/apiError';
import { getCurrentUser } from '../../auth/api/authApi';
import {
  FILE_DOC_KEYS,
  addHours,
  balanceDue,
  canAcceptTerms,
  canCancel,
  canComplain,
  canRequestContractChange,
  canSign,
  clockMs,
  closureChecks,
  contractItems,
  ctRef,
  curVersion,
  depositPayments,
  depositState,
  docRecord,
  docsNeedingAction,
  emptyPlace,
  fmtDateTime,
  fmtMoney,
  horseDocItems,
  isActive,
  isPast,
  isSupportedRoute,
  nowStamp,
  pickedHorses,
  qrExpired,
  sharedDocItems,
  sumItems,
  today,
  tripTemplate,
  validateHorseForm,
  versionState,
  wizardErrors,
} from './customerRules';

// ============================================================================
// Store dùng chung cho mọi trang Customer (giữ dữ liệu khi chuyển route)
// ============================================================================
interface OtpSession {
  requestId: string;
  expiresAtMs: number;
  tries: number;
  resendAtMs: number;
}

interface CustomerState {
  profile: CustomerProfile;
  horses: Horse[];
  requests: TransportRequest[];
  notifications: CustomerNotification[];
  otp: OtpSession | null;
  loading: boolean;
  loaded: boolean;
  toast: { id: number; message: string } | null;
}

import { getDemoMode } from '../../../shared/context/DemoModeContext';
import { mockHorses, mockNotifications, mockRequests } from '../data/mockData';
import { getSharedRequests, saveSharedRequest, toCustomerRequest } from '../../../shared/utils/sharedRequests';
import { createSyncController, notifySync } from '../../../shared/utils/syncChannel';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const cleanId = (x?: string) => (x || '').replace(/-/g, '_');

const getInitialProfile = (): CustomerProfile => {
  const p: CustomerProfile = { id: '', name: '', initials: '', email: '', phone: '', company: '' };
  try {
    const storedName = sessionStorage.getItem('userFullName') || localStorage.getItem('userFullName');
    const storedEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
    if (storedName) {
      p.name = storedName;
      p.initials = storedName.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(-2).toUpperCase();
    }
    if (storedEmail) {
      p.email = storedEmail;
    }
  } catch {
    // ignore
  }
  return p;
};

const initialDemo = getDemoMode('customer');
let state: CustomerState = {
  profile: getInitialProfile(),
  horses: initialDemo ? clone(mockHorses) : [],
  requests: initialDemo
    ? (() => {
        const initialShared = getSharedRequests().map(toCustomerRequest);
        const initialMock = clone(mockRequests);
        return [...initialShared, ...initialMock.filter((m) => !initialShared.some((s) => cleanId(s.id) === cleanId(m.id)))];
      })()
    : readRequestDrafts(),
  notifications: initialDemo ? clone(mockNotifications) : [],
  otp: null,
  loading: false,
  loaded: false,
  toast: null,
};
const listeners = new Set<() => void>();
const setState = (patch: Partial<CustomerState> | ((s: CustomerState) => Partial<CustomerState>)) => {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  if (!getDemoMode('customer')) writeRequestDrafts(state.requests);
  for (const r of state.requests.filter(r => r.status === 'DRAFT')) {
    try { sessionStorage.setItem(`flow1-progress:${r.id}`, JSON.stringify({ horseCount: r.horseCount, wizardStep: r.wizardStep })); } catch { /* UI metadata is optional. */ }
  }
  listeners.forEach((l) => l());
};

const syncController = createSyncController({
  intervalMs: 15000,
  onRefresh: ({ silent, force }) => loadAll({ silent, force }),
  eventType: 'requests_updated',
});

let unsubscribeSyncController: (() => void) | null = null;

const subscribe = (l: () => void) => {
  listeners.add(l);
  if (listeners.size === 1) {
    unsubscribeSyncController = syncController.subscribe();
  }
  return () => {
    listeners.delete(l);
    if (listeners.size === 0 && unsubscribeSyncController) {
      unsubscribeSyncController();
      unsubscribeSyncController = null;
    }
  };
};
const getSnapshot = () => state;

const toast = (message: string) => setState({ toast: { id: Date.now(), message } });

export function resetCustomerState() {
  setState({
    profile: getInitialProfile(),
    horses: [],
    requests: [],
    notifications: [],
    otp: null,
    loading: false,
    loaded: false,
    toast: null,
  });
}


if (typeof window !== 'undefined') {
  window.addEventListener('rts_requests_updated', () => {
    const isDemo = getDemoMode('customer');
    if (isDemo) {
      const shared = getSharedRequests().map(toCustomerRequest);
      setState((s) => {
        const newRequests = [...s.requests];
        for (const req of shared) {
          const idx = newRequests.findIndex((r) => cleanId(r.id) === cleanId(req.id));
          if (idx >= 0) {
            newRequests[idx] = { ...newRequests[idx], ...req };
          } else {
            newRequests.unshift(req);
          }
        }
        return { requests: newRequests };
      });
    } else {
      void syncRequestsOnly();
    }
  });

  window.addEventListener('rts_demo_mode_change', (event: Event) => {
    const customEvent = event as CustomEvent<{ role: string; enabled: boolean }>;
    if (customEvent.detail && customEvent.detail.role === 'customer') {
      if (customEvent.detail.enabled) {
        const shared = getSharedRequests().map(toCustomerRequest);
        const mock = clone(mockRequests);
        const merged = [...shared, ...mock.filter((m) => !shared.some((s) => cleanId(s.id) === cleanId(m.id)))];
        setState({
          horses: clone(mockHorses),
          requests: merged,
          notifications: clone(mockNotifications),
          loading: false,
          loaded: true,
        });
        toast('Đã bật dữ liệu mẫu & hiển thị nút demo trên toàn hệ thống.');
      } else {
        setState({
          horses: [],
          requests: [],
          notifications: [],
          loading: false,
          loaded: false,
        });
        void loadAll({ force: true });
        toast('Đã tắt dữ liệu mẫu & ẩn nút demo trên toàn hệ thống.');
      }
    }
  });
}
const ok = (message: string, id?: string): ActionResult => { toast(message); return { ok: true, message, id }; };
const fail = (message: string): ActionResult => { toast(message); return { ok: false, message }; };

const findReq = (id: string) => state.requests.find((r) => r.id === id || cleanId(r.id) === cleanId(id));
const findHorse = (id: string) => state.horses.find((h) => h.id === id || cleanId(h.id) === cleanId(id));
/** Sửa một yêu cầu trên bản sao rồi ghi lại vào store */
const updateReq = (id: string, fn: (r: TransportRequest) => void) => {
  setState((s) => ({
    requests: s.requests.map((r) => {
      if (r.id !== id && cleanId(r.id) !== cleanId(id)) return r;
      const c = clone(r);
      fn(c);
      if (!getDemoMode('customer') && c.status === 'CHANGES_REQUESTED') c.editingLocally = true;
      if (getDemoMode('customer')) saveSharedRequest(c);
      return c;
    }),
  }));
};
const ACTOR: Record<ActorRole, string> = {
  CUSTOMER: '', LOGISTICS_MANAGER: 'Linh Pham', TRANSPORT_SPECIALIST: 'Hoang Thu Ha', FLEET_ROUTE_COORDINATOR: 'Dang Minh Quan',
  DRIVER_ESCORT: 'Pham Van Duc', SYSTEM: 'Hệ thống',
};
const log = (r: TransportRequest, role: ActorRole, action: string, detail?: string) =>
  r.history.push({ at: nowStamp(), actor: role === 'CUSTOMER' ? state.profile.name : ACTOR[role], role, action, detail });
const notify = (title: string, body: string, link: string) =>
  setState((s) => ({ notifications: [{ id: `N-${Date.now()}`, title, body, at: nowStamp(), read: false, link }, ...s.notifications] }));
const nextId = (prefix: string, list: string[]) => {
  const numbers = list
    .filter((x) => typeof x === 'string' && (x.startsWith(`${prefix}-`) || x.startsWith(`${prefix}_`)))
    .map((x) => {
      const part = x.includes('_') ? x.split('_')[1] : x.split('-')[1];
      const n = parseInt(part, 10);
      return !isNaN(n) && n < 1000000 ? n : 0;
    });
  const max = numbers.length > 0 ? Math.max(1000, ...numbers) : 8945;
  return `${prefix}_${max + 1}`;
};

let currentLoadSeq = 0;
let inFlightPromise: Promise<void> | null = null;
let inFlightSyncPromise: Promise<void> | null = null;

async function syncRequestsOnly(): Promise<void> {
  if (inFlightSyncPromise) return inFlightSyncPromise;
  inFlightSyncPromise = (async () => {
    try {
      const rawRequests = await customerApi.getRequests();
      const isDemo = getDemoMode('customer');
      if (!isDemo) {
        setState((prev) => ({
          ...prev,
          requests: mergeRequestDrafts(rawRequests, prev.requests),
        }));
        return;
      }
      const shared = getSharedRequests().map(toCustomerRequest);
      const merged = [...shared, ...rawRequests.filter((b) => !shared.some((s) => cleanId(s.id) === cleanId(b.id)))];
      const mock = clone(mockRequests);
      const allDemoRequests = [...merged, ...mock.filter((m) => !merged.some((r) => cleanId(r.id) === cleanId(m.id)))];
      setState((prev) => ({ ...prev, requests: allDemoRequests }));
    } catch {
      // Ignore background sync errors
    } finally {
      inFlightSyncPromise = null;
    }
  })();
  return inFlightSyncPromise;
}

async function loadAll(options: { force?: boolean; silent?: boolean } = {}) {
  const { force = false, silent = false } = options;
  const currentEmail = typeof window !== 'undefined' ? (sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail')) : null;
  if (!force && state.loaded && (!currentEmail || state.profile.email === currentEmail)) return;

  // Lightweight background sync: once already loaded, background polling or sync only fetches requests
  // to avoid exhausting backend rate limits (30 reqs/min).
  if (silent && state.loaded) {
    return syncRequestsOnly();
  }

  if (inFlightPromise) {
    if (silent) return inFlightPromise;
  }

  const seq = ++currentLoadSeq;
  if (!silent) {
    setState({ loading: true });
  }

  inFlightPromise = (async () => {
    try {
      const [profileRes, horsesRes, requestsRes, notificationsRes, currentUserRes] = await Promise.allSettled([
        customerApi.getProfile(),
        customerApi.getHorses(),
        customerApi.getRequests(),
        customerApi.getNotifications(),
        getCurrentUser(),
      ]);

      if (seq !== currentLoadSeq) {
        return;
      }

      const profile: CustomerProfile = profileRes.status === 'fulfilled' && profileRes.value ? profileRes.value : getInitialProfile();
      const horses: Horse[] = horsesRes.status === 'fulfilled' && horsesRes.value ? horsesRes.value : [];
      const notifications: CustomerNotification[] = notificationsRes.status === 'fulfilled' && notificationsRes.value ? notificationsRes.value : [];

      try {
        const u = currentUserRes.status === 'fulfilled' ? currentUserRes.value?.data : null;
        if (u) {
          if (u.fullName) profile.name = u.fullName;
          if (u.email) {
            profile.email = u.email;
            try {
              sessionStorage.setItem('userEmail', u.email);
              localStorage.setItem('userEmail', u.email);
            } catch {
              // ignore
            }
          }
          if (u.phoneNumber) profile.phone = u.phoneNumber;
        } else {
          const storedName = sessionStorage.getItem('userFullName') || localStorage.getItem('userFullName');
          const storedEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
          if (storedName) {
            profile.name = storedName;
          }
          if (storedEmail) {
            profile.email = storedEmail;
          }
        }
        profile.initials = (profile.name || 'Alex Equine')
          .split(' ')
          .filter(Boolean)
          .map((n) => n[0])
          .join('')
          .slice(-2)
          .toUpperCase();
      } catch {
        // ignore
      }

      const baseRequests = requestsRes.status === 'fulfilled' && requestsRes.value ? requestsRes.value : [];
      const isDemo = getDemoMode('customer');
      if (!isDemo) {
        setState((prev) => ({
          ...prev,
          profile,
          horses: horses || [],
          requests: mergeRequestDrafts(baseRequests, prev.requests),
          notifications: notifications || [],
          loading: false,
          loaded: true,
        }));
        return;
      }

      const shared = getSharedRequests().map(toCustomerRequest);
      const merged = [...shared, ...baseRequests.filter((b) => !shared.some((s) => cleanId(s.id) === cleanId(b.id)))];
      const mock = clone(mockRequests);
      const allDemoRequests = [...merged, ...mock.filter((m) => !merged.some((r) => cleanId(r.id) === cleanId(m.id)))];
      setState((prev) => ({
        ...prev,
        profile,
        horses: horses && horses.length > 0 ? horses : clone(mockHorses),
        requests: allDemoRequests,
        notifications: notifications && notifications.length > 0 ? notifications : clone(mockNotifications),
        loading: false,
        loaded: true,
      }));
    } catch (error) {
      if (seq === currentLoadSeq) {
        setState({ loading: false, loaded: true });
      }
    } finally {
      if (seq === currentLoadSeq) {
        inFlightPromise = null;
      }
    }
  })();

  return inFlightPromise;
}

// ============================================================================
// Hành động của khách hàng
// ============================================================================
function validateTripInfo(input: TripInfoInput): string {
  if (!input.origin || !input.destination) return 'Chọn điểm đi và điểm đến.';
  if (input.origin === input.destination) return 'Điểm đi và điểm đến phải khác nhau.';
  if (!isSupportedRoute(input.origin, input.destination)) return 'Tuyến này chưa nhận đơn mới (chỉ Việt Nam → Việt Nam và Việt Nam → Nhật Bản).';
  if (!input.pickupAt || input.pickupAt < today()) return 'Chọn ngày lấy ngựa từ hôm nay trở đi.';
  if (input.pickupAt > input.date) return 'Ngày lấy ngựa không được sau ngày giao mong muốn.';
  if (!input.date || input.date < today()) return 'Ngày vận chuyển phải từ hôm nay trở đi.';
  if (input.horseCount < 1 || input.horseCount > 6) return 'Số lượng ngựa từ 1 đến 6.';
  return '';
}

function validateHorse(h: HorseInput): string {
  const errMap = validateHorseForm(h);
  return Object.values(errMap)[0] || '';
}

const resizeHorses = (r: TransportRequest, count: number) => {
  r.horseCount = count;
  r.horses = Array.from({ length: count }, (_, i) => r.horses[i] ?? '');
};

const customerActions = {
  async loadRequest(id: string) {
    if (getDemoMode('customer') || id.startsWith('LOCAL_')) return;
    if (findReq(id)?.editingLocally) return;
    try {
      const request = await customerApi.getRequest(id);
      setState(s => ({ requests: s.requests.some(r => r.id === id) ? s.requests.map(r => r.id === id ? request : r) : [...s.requests, request] }));
    } catch (error) { toast(apiMessage(error)); }
  },
  reset: resetCustomerState,
  reload: () => { void loadAll({ force: true, silent: false }); },
  clearToast: () => setState({ toast: null }),
  showToast: (message: string) => toast(message),
  async markNotificationRead(id: string) {
    try { await customerApi.markNotificationRead(id); setState(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) })); }
    catch (error) { toast(apiMessage(error)); }
  },
  async markAllNotificationsRead() {
    try { await customerApi.markAllNotificationsRead(); setState(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) })); }
    catch (error) { toast(apiMessage(error)); }
  },

  // ----- Bước 1: thông tin chuyến -----
  async createDraft(input: TripInfoInput, _idempotencyKey?: string): Promise<ActionResult> {
    const err = validateTripInfo(input); if (err) return fail(err);
    const id = getDemoMode('customer') ? nextId('TRN', state.requests.map(x => x.id)) : `LOCAL_${crypto.randomUUID()}`;
    const now = nowStamp();
    const draftReq: TransportRequest = {
      id,
      origin: input.origin,
      destination: input.destination,
      pickupAt: input.pickupAt ?? '',
      date: input.date,
      requestedAt: now,
      horseCount: input.horseCount || 1,
      horses: Array.from({ length: input.horseCount || 1 }, () => ''),
      horseNotes: {},
      careNotes: input.careNotes || '',
      pickup: emptyPlace(),
      delivery: emptyPlace(),
      status: 'DRAFT',
      wizardStep: 1,
      versions: [],
      history: [{
        at: now,
        actor: state.profile.name || 'Khách hàng',
        role: 'CUSTOMER',
        action: 'Tạo bản nháp',
        detail: `${input.origin} → ${input.destination} • ${fmtDateTime(input.date)}`,
      }],
      revisions: [],
      docs: [],
      supplements: [],
      companyDocs: [],
      complaints: [],
      payments: [],
    };
    setState(s => ({ requests: [draftReq, ...s.requests] }));
    if (getDemoMode('customer')) saveSharedRequest(draftReq);
    notifySync('requests_updated');
    return ok(`Đã tạo bản nháp ${id}.`, id);
  },

  /** Save the merged schedule/address step with one PUT; publish local changes only after success. */
  async saveRequestDetails(id: string, input: TripInfoInput, pickup: Place, delivery: Place): Promise<ActionResult> {
    const current = findReq(id);
    if (!current || !['DRAFT', 'CHANGES_REQUESTED'].includes(current.status)) return fail('Yêu cầu này không thể chỉnh sửa.');
    const trip = { ...input, horseCount: current.horseCount, careNotes: current.careNotes };
    const err = validateTripInfo(trip);
    if (err) return fail(err);
    if ([pickup, delivery].some(p => !p.name.trim() || !p.address.trim() || !p.contact.trim() || !/^[+0-9 ()-]{8,}$/.test(p.phone.trim()))) return fail('Điền đủ địa chỉ, người liên hệ và số điện thoại hợp lệ cho cả hai địa điểm.');
    if (current.status === 'CHANGES_REQUESTED') {
      const allowed = current.revisionFields ?? ['route', 'date', 'places', 'horses', 'notes'];
      if ((!allowed.includes('route') && (trip.origin !== current.origin || trip.destination !== current.destination))
        || (!allowed.includes('date') && (trip.date !== current.date || trip.pickupAt !== current.pickupAt))
        || (!allowed.includes('places') && (JSON.stringify(pickup) !== JSON.stringify(current.pickup) || JSON.stringify(delivery) !== JSON.stringify(current.delivery)))) return fail('Manager chỉ cho phép sửa các mục đã nêu trong góp ý.');
    }
    const updated: TransportRequest = { ...current, ...trip, pickup: { ...pickup }, delivery: { ...delivery }, wizardStep: Math.max(current.wizardStep, 2) };
    updateReq(id, r => { Object.assign(r, updated); log(r, 'CUSTOMER', 'Lưu thông tin nhận và giao ngựa'); });
    notifySync('requests_updated');
    return ok('Đã lưu lịch nhận, địa chỉ và người liên hệ.', id);
  },

  setHorseCount(id: string, count: number): ActionResult {
    const r = findReq(id);
    if (!r || !['DRAFT', 'CHANGES_REQUESTED'].includes(r.status)) return fail('Yêu cầu này không thể chỉnh sửa.');
    if (r.status === 'CHANGES_REQUESTED' && !(r.revisionFields ?? ['horses']).includes('horses')) return fail('Manager không cho phép sửa danh sách ngựa.');
    if (!Number.isInteger(count) || count < 1 || count > 6) return fail('Số lượng ngựa từ 1 đến 6.');
    if (r.horses.slice(count).some(Boolean)) return fail('Bỏ ngựa ở các vị trí cuối trước khi giảm số lượng để tránh mất thông tin.');
    updateReq(id, x => resizeHorses(x, count));
    return { ok: true, message: '' };
  },

  async updateTripInfo(id: string, input: TripInfoInput): Promise<ActionResult> {
    const r = findReq(id);
    if (!r || !['DRAFT', 'CHANGES_REQUESTED'].includes(r.status)) return fail('Chỉ sửa được bản nháp hoặc yêu cầu đang được yêu cầu chỉnh sửa.');
    if (r.status === 'CHANGES_REQUESTED') {
      const allowed: RequestField[] = r.revisionFields ?? ['route', 'date', 'places', 'horses', 'notes'];
      const changed: RequestField[] = [];
      if (input.origin !== r.origin || input.destination !== r.destination) changed.push('route');
      if ((input.date !== r.date || input.pickupAt !== r.pickupAt)) changed.push('date');
      if (input.horseCount !== r.horseCount) changed.push('horses');
      if (input.careNotes.trim() !== r.careNotes) changed.push('notes');
      const locked = changed.filter((f) => !allowed.includes(f));
      if (locked.length) return fail('Manager chỉ cho phép sửa các mục đã nêu trong góp ý.');
    }
    const err = validateTripInfo(input);
    if (err) return fail(err);
    updateReq(id, x => {
      Object.assign(x, input, { careNotes: input.careNotes.trim() });
      resizeHorses(x, input.horseCount);
      log(x, 'CUSTOMER', 'Lưu thông tin chuyến');
    });
    return ok('Đã lưu thông tin chuyến trong bản nháp.');
  },

  // ----- Bước 2: điểm nhận & điểm giao -----
  async savePlaces(id: string, pickup: Place, delivery: Place): Promise<ActionResult> {
    const missing = (p: Place) => !p.name.trim() || !p.address.trim() || !p.contact.trim() || !p.phone.trim();
    const current = findReq(id);
    if (current?.status === 'CHANGES_REQUESTED' && !current.revisionFields?.includes('places') && (JSON.stringify(pickup) !== JSON.stringify(current.pickup) || JSON.stringify(delivery) !== JSON.stringify(current.delivery))) return fail('Manager không cho phép sửa điểm nhận/giao.');
    if (missing(pickup) || missing(delivery)) return fail('Điền đủ tên địa điểm, địa chỉ, người liên hệ và số điện thoại cho cả điểm nhận và điểm giao.');
    const phoneOk = (p: string) => /^[+0-9 ()-]{8,}$/.test(p.trim());
    if (!phoneOk(pickup.phone) || !phoneOk(delivery.phone)) return fail('Số điện thoại không hợp lệ.');
    updateReq(id, (r) => { r.pickup = pickup; r.delivery = delivery; r.wizardStep = Math.max(r.wizardStep, 2); });
    notifySync('requests_updated');
    return ok('Đã lưu điểm nhận và điểm giao.');
  },

  // ----- Bước 3: ngựa & hồ sơ -----
  setHorseSlot(id: string, slot: number, horseId: string): ActionResult {
    const r = findReq(id);
    if (!r) return fail('Không tìm thấy yêu cầu.');
    if (r.status === 'CHANGES_REQUESTED' && !(r.revisionFields ?? ['horses']).includes('horses')) return fail('Manager không cho phép sửa danh sách ngựa.');
    if (horseId && r.horses.some((h, i) => h === horseId && i !== slot)) return fail('Ngựa này đã được chọn trong đơn.');
    updateReq(id, (x) => { x.horses[slot] = horseId; });
    return { ok: true, message: '' };
  },
  setHorseNote(id: string, horseId: string, note: string) {
    const current = findReq(id);
    if (current?.status === 'CHANGES_REQUESTED' && !(current.revisionFields ?? ['notes']).includes('notes')) return;
    updateReq(id, (r) => { r.horseNotes[horseId] = note; });
  },
  async completeHorsesStep(id: string): Promise<ActionResult> {
    const r = findReq(id);
    if (!r) return fail('Không tìm thấy yêu cầu.');
    if (r.horses.some((h) => !h)) return fail(`Hãy chọn đủ ${r.horseCount} ngựa.`);
    // Required horse documents (photo, passport scan, ownership…) must be complete before review.
    const horseErrors = wizardErrors(r, state.horses).filter(([step]) => step === 2).map(([, message]) => message);
    if (horseErrors.length) return fail(`Chưa thể tiếp tục: ${horseErrors[0]}${horseErrors.length > 1 ? ` (và ${horseErrors.length - 1} mục khác còn thiếu)` : ''}`);
    updateReq(id, x => { x.wizardStep = Math.max(x.wizardStep, 3); });
    return ok('Đã lưu danh sách ngựa trong bản nháp.');
  },

  async submitRequest(id: string): Promise<ActionResult> {
    const r = findReq(id);
    if (!r || !['DRAFT', 'CHANGES_REQUESTED'].includes(r.status)) return fail('Yêu cầu này không ở trạng thái gửi được.');
    const errs = wizardErrors(r, state.horses);
    if (errs.length) return fail(`Chưa gửi được: ${errs[0][1]}`);
    
    const isDemo = getDemoMode('customer');
    if (!isDemo) {
      try {
        const apiRes = await customerApi.submitRequest(id, r);
        if (!apiRes?.ok) {
          return fail(apiRes?.message || 'Không thể gửi yêu cầu lên máy chủ.');
        }
        const saved = apiRes.request;
        if (saved) {
          setState(s => ({ requests: s.requests.map(x => (x.id === id || cleanId(x.id) === cleanId(id)) ? saved : x) }));
        }
        await loadAll({ force: true, silent: true });
        try { sessionStorage.removeItem(`flow1-progress:${id}`); } catch {}
        notifySync('requests_updated');
        return ok(`Đã gửi ${saved?.id || id}. Logistics Manager sẽ xét duyệt yêu cầu.`, saved?.id || id);
      } catch (error) {
        return fail(apiMessage(error));
      }
    }

    updateReq(id, x => {
      x.status = 'PENDING_REVIEW';
      x.submittedAt = nowStamp();
      log(x, 'CUSTOMER', 'Gửi yêu cầu vận chuyển', `${x.origin} → ${x.destination} • ${x.horseCount} ngựa`);
    });
    try { sessionStorage.removeItem(`flow1-progress:${id}`); } catch { /* Optional UI metadata. */ }
    notify('Đã gửi yêu cầu', `Yêu cầu ${id} đang chờ Logistics Manager xét duyệt.`, `/customer/requests/${id}`);
    notifySync('requests_updated');
    return ok(`Đã gửi ${id}. Logistics Manager sẽ xét duyệt yêu cầu.`, id);
  },

  async cancelRequest(id: string, reason: string): Promise<ActionResult> {
    const r = findReq(id);
    if (!r || !canCancel(r)) return fail('Không thể hủy yêu cầu ở trạng thái hiện tại.');
    if (id.startsWith('LOCAL_') && r.status === 'DRAFT') {
      setState(s => ({ requests: s.requests.filter(x => x.id !== id) }));
      return ok('Đã xóa bản nháp.');
    }
    if (reason.trim().length < 5) return fail('Nhập lý do hủy (ít nhất 5 ký tự).');
    try {
      await customerApi.cancelRequest(id, reason.trim());
      const updated = await customerApi.getRequest(id);
      setState(s => ({ requests: s.requests.map(x => x.id === id ? updated : x) }));
      await loadAll({ force: true, silent: true });
      notifySync('requests_updated');
      return ok('Đã gửi yêu cầu hủy và cập nhật trạng thái từ máy chủ.');
    } catch (error) { return fail(apiMessage(error)); }
  },

  // ----- Ngựa của tôi -----
  async createHorse(input: HorseInput): Promise<ActionResult> {
    const err = validateHorse(input); if (err) return fail(err);
    if (getDemoMode('customer')) {
      const id = nextId('HOR', state.horses.map(h => h.id));
      setState(s => ({ horses: [{ ...input, id }, ...s.horses] }));
      return ok(`Đã thêm ${input.name.trim()}.`, id);
    }
    try {
      const result = await customerApi.createHorse(input);
      const horses = await customerApi.getHorses(); setState({ horses });
      return ok(`Đã thêm ${input.name.trim()}.`, result.id);
    } catch (error) {
      try { setState({ horses: await customerApi.getHorses() }); } catch { /* Keep the original save/upload error. */ }
      return fail(apiMessage(error));
    }
  },
  async updateHorse(id: string, input: HorseInput): Promise<ActionResult> {
    const h = findHorse(id); if (!h) return fail('Không tìm thấy ngựa.');
    const err = validateHorse(input); if (err) return fail(err);
    if (getDemoMode('customer')) {
      setState(s => ({ horses: s.horses.map(item => item.id === id ? { ...item, ...input } : item) }));
      return ok('Đã lưu hồ sơ ngựa.');
    }
    try {
      await customerApi.updateHorse(id, input);
      setState({ horses: await customerApi.getHorses() });
      return ok('Đã lưu hồ sơ ngựa.');
    } catch (error) { return fail(apiMessage(error)); }
  },

  // ----- Giấy tờ -----
  async uploadDoc(requestId: string, key: DocKey, scope: string, file: FileRef): Promise<ActionResult> {
    const r = findReq(requestId);
    if (!r || !isActive(r) || !FILE_DOC_KEYS.includes(key)) return fail('Không thể nộp giấy tờ cho yêu cầu này.');
    if (!getDemoMode('customer')) {
      const fileTypes: Partial<Record<DocKey, string>> = { passport: 'passport', ownership: 'ownership', valueProof: 'value-proof' };
      const fileType = fileTypes[key];
      if (!fileType) return fail('Tài liệu này chưa hỗ trợ nộp trực tuyến. Vui lòng liên hệ chuyên viên phụ trách.');
      if (!file.file) return fail('Chọn tệp từ máy trước khi tải lên.');
      try {
        await customerApi.uploadHorseFile(scope, fileType as 'passport' | 'ownership' | 'value-proof', file.file);
        setState({ horses: await customerApi.getHorses() });
        return ok('Đã lưu tài liệu vào hồ sơ ngựa.');
      } catch (error) { return fail(apiMessage(error)); }
    }
    updateReq(requestId, x => {
      const doc: DocRecord = { key, scope, status: 'SUBMITTED', file, updatedAt: nowStamp() };
      const index = x.docs.findIndex(d => d.key === key && d.scope === scope);
      if (index < 0) x.docs.push(doc); else x.docs[index] = doc;
    });
    return ok('Đã cập nhật tài liệu demo.');
  },

  // ----- Hợp đồng -----
  async acceptTerms(id: string): Promise<ActionResult> {
    const r = findReq(id); const v = r && curVersion(r);
    if (!r || !v?.contractId || !canAcceptTerms(r)) return fail('Phiên bản hợp đồng không thể đồng ý điều khoản.');
    try {
      const result = await customerApi.acceptTerms(v.contractId, v.v);
      updateReq(id, x => { curVersion(x)!.termsAcceptedAt = result.termsAcceptedAt; });
      notifySync('requests_updated');
      return ok('Đã đồng ý điều khoản. Tiếp tục thanh toán cọc.');
    } catch (error) { return fail(apiMessage(error)); }
  },
  async requestContractChange(id: string, input: ContractChangeInput): Promise<ActionResult> {
    const r = findReq(id); const v = r && curVersion(r);
    if (!r || !v?.contractId || !canRequestContractChange(r)) return fail('Chưa thể yêu cầu sửa phiên bản này.');
    if (input.text.trim().length < 10) return fail('Nhập nội dung cần sửa (ít nhất 10 ký tự).');
    try {
      await customerApi.requestContractChange(v.contractId, input, v.v);
      const updated = await customerApi.getRequest(id);
      setState(s => ({ requests: s.requests.map(x => x.id === id ? updated : x) }));
      notifySync('requests_updated');
      return ok('Đã gửi yêu cầu sửa hợp đồng.');
    } catch (error) { return fail(apiMessage(error)); }
  },
  confirmDepositTransfer(_id: string, _expires: number): ActionResult {
    return fail('Tiền cọc chỉ được xác nhận từ kết quả thanh toán hoặc đối soát của quản lý.');
  },
  async sendSignOtp(id: string): Promise<ActionResult> {
    const r = findReq(id); const v = r && curVersion(r);
    if (!r || !v?.contractId || !canSign(r)) return fail('Cần đồng ý điều khoản của phiên bản hợp đồng còn hạn trước khi ký OTP.');
    if (state.otp?.requestId === id && state.otp.resendAtMs > clockMs()) return fail('Chưa đến thời gian gửi lại OTP.');
    try {
      const result = await customerApi.sendSignOtp(v.contractId, v.v);
      setState({ otp: { requestId: id, expiresAtMs: clockMs() + result.expiresInSeconds * 1000, resendAtMs: clockMs() + result.resendAfterSeconds * 1000, tries: 0 } });
      return ok(`Đã gửi OTP tới ${result.sentTo}.`);
    } catch (error) { return fail(apiMessage(error)); }
  },
  expireOtp: () => setState(s => ({ otp: s.otp ? { ...s.otp, expiresAtMs: clockMs() - 1 } : null })),
  async verifyOtpAndSign(id: string, code: string): Promise<ActionResult> {
    const r = findReq(id); const v = r && curVersion(r);
    if (!r || !v?.contractId || !canSign(r)) return fail('Phiên bản này chưa đủ điều kiện ký.');
    if (!/^\d{6}$/.test(code)) return fail('Nhập đủ 6 chữ số OTP.');
    try {
      const result = await customerApi.signContract(v.contractId, code, v.v);
      if (result.requestStatus !== 'ACTIVATED' || !result.tripId || result.tripStatus !== 'PLANNING') return fail('Chưa nhận được kết quả kích hoạt chuyến. Hãy tải lại trạng thái.');
      setState({ otp: null });
      const updated = await customerApi.getRequest(id);
      setState(s => ({ requests: s.requests.map(x => x.id === id ? updated : x) }));
      notifySync('requests_updated');
      return ok('Đã ký hợp đồng và kích hoạt yêu cầu. Chuyến đi đang chờ bố trí.');
    } catch (error) { return fail(apiMessage(error)); }
  },

  // ----- Bàn giao, nghiệm thu, số dư, khiếu nại -----
  confirmAcceptance(id: string): ActionResult {
    const r = findReq(id);
    if (!r || r.status !== 'DELIVERED' || r.acceptance?.status !== 'PENDING') return fail('Chưa thể nghiệm thu ở trạng thái hiện tại.');
    if (r.complaints.some((c) => ['OPEN', 'IN_PROGRESS'].includes(c.status))) return fail('Đang có khiếu nại chưa giải quyết. Nghiệm thu sau khi khiếu nại được xử lý.');
    updateReq(id, (x) => { x.acceptance!.status = 'ACCEPTED'; x.acceptance!.decidedAt = nowStamp(); log(x, 'CUSTOMER', 'Xác nhận nghiệm thu'); });
    void customerApi.confirmAcceptance(id);
    return ok('Đã xác nhận nghiệm thu. Vui lòng thanh toán số dư trong hạn.');
  },
  payBalance(id: string): ActionResult {
    const r = findReq(id);
    if (!r || r.status !== 'DELIVERED' || r.acceptance?.status !== 'ACCEPTED') return fail('Hãy xác nhận nghiệm thu trước khi thanh toán số dư.');
    if (r.payments.some((p) => p.type === 'BALANCE' && p.status === 'PROCESSING')) return fail('Đang có giao dịch VNPay chờ xác minh.');
    const due = balanceDue(r);
    if (due <= 0) return fail('Không còn số dư phải thanh toán.');
    const payId = nextId('PAY', state.requests.flatMap((x) => x.payments.map((p) => p.id)));
    updateReq(id, (x) => {
      x.payments.push({ id: payId, type: 'BALANCE', method: 'VNPAY', amount: due, status: 'PROCESSING', createdAt: nowStamp() });
      log(x, 'CUSTOMER', 'Thanh toán số dư qua VNPay', `${payId} • ${fmtMoney(due)}`);
    });
    void customerApi.payBalance(id);
    return ok('Đã chuyển sang VNPay. Giao dịch đang chờ xác minh.', payId);
  },
  raiseComplaint(id: string, input: ComplaintInput): ActionResult {
    const r = findReq(id);
    if (!r || !canComplain(r)) return fail('Chỉ gửi khiếu nại được sau khi bàn giao và trước khi yêu cầu được đóng.');
    if (input.title.trim().length < 5 || input.description.trim().length < 10) return fail('Nhập tiêu đề (≥ 5 ký tự) và mô tả (≥ 10 ký tự).');
    const cid = nextId('CMP', state.requests.flatMap((x) => x.complaints.map((c) => c.id)));
    updateReq(id, (x) => {
      x.complaints.push({ id: cid, title: input.title.trim(), type: input.type, description: input.description.trim(), status: 'OPEN', createdAt: nowStamp() });
      log(x, 'CUSTOMER', 'Gửi khiếu nại', `${cid} • ${input.title.trim()}`);
    });
    void customerApi.raiseComplaint(id, input);
    return ok(`Đã gửi khiếu nại ${cid}. Hạn nghiệm thu / thanh toán tạm dừng tới khi khiếu nại được giải quyết.`, cid);
  },
};

// ============================================================================
// Nút demo: giả lập thao tác của nhân viên CBN Transport (không thuộc cổng khách hàng)
// ============================================================================
const demoActions = {
  managerAccept(id: string): ActionResult {
    const r = findReq(id);
    if (r?.status !== 'PENDING_REVIEW') return fail('Yêu cầu không ở trạng thái chờ xét duyệt.');
    updateReq(id, (x) => { x.status = 'CONTRACT_PREPARATION'; x.feedback = undefined; log(x, 'LOGISTICS_MANAGER', 'Chấp nhận yêu cầu', 'Bắt đầu soạn hợp đồng'); });
    notify(`Yêu cầu ${id} đã được chấp nhận`, 'Manager đang soạn hợp đồng với giá chính thức.', `/customer/requests/${id}`);
    return ok('Demo: Manager đã chấp nhận yêu cầu.');
  },
  managerRequestChanges(id: string, feedback: string, fields: RequestField[]): ActionResult {
    const r = findReq(id);
    if (r?.status !== 'PENDING_REVIEW') return fail('Yêu cầu không ở trạng thái chờ xét duyệt.');
    if (feedback.trim().length < 5 || !fields.length) return fail('Nhập góp ý và chọn ít nhất một mục được sửa.');
    updateReq(id, (x) => { x.status = 'CHANGES_REQUESTED'; x.feedback = feedback.trim(); x.revisionFields = fields; log(x, 'LOGISTICS_MANAGER', 'Yêu cầu chỉnh sửa', feedback.trim()); });
    notify(`Cần chỉnh sửa ${id}`, feedback.trim(), `/customer/requests/${id}`);
    return ok('Demo: Manager đã yêu cầu chỉnh sửa.');
  },
  managerReject(id: string, reason: string): ActionResult {
    const r = findReq(id);
    if (r?.status !== 'PENDING_REVIEW') return fail('Yêu cầu không ở trạng thái chờ xét duyệt.');
    if (reason.trim().length < 5) return fail('Nhập lý do từ chối.');
    updateReq(id, (x) => { x.status = 'REJECTED'; x.reason = reason.trim(); log(x, 'LOGISTICS_MANAGER', 'Từ chối yêu cầu', reason.trim()); });
    notify(`Yêu cầu ${id} bị từ chối`, reason.trim(), `/customer/requests/${id}`);
    return ok('Demo: Manager đã từ chối yêu cầu.');
  },
  issueContract(id: string): ActionResult {
    const r = findReq(id);
    if (r?.status !== 'CONTRACT_PREPARATION') return fail('Yêu cầu chưa ở bước soạn hợp đồng.');
    updateReq(id, (x) => {
      const items = contractItems(x), at = nowStamp();
      x.versions.push({ v: 1, number: `CT-${x.id.slice(4)}`, issuedAt: at, validUntil: addHours(at, 24), items, total: sumItems(items), depositPct: 30, state: 'ISSUED' });
      x.status = 'CONTRACT_READY';
      log(x, 'LOGISTICS_MANAGER', 'Phát hành hợp đồng', `CT-${x.id.slice(4)} v1 • ${fmtMoney(sumItems(items))}`);
    });
    notify(`Hợp đồng cho ${id} đã sẵn sàng`, 'Xem và đồng ý điều khoản trong 24 giờ.', `/customer/requests/${id}/contract`);
    return ok('Demo: Manager đã phát hành hợp đồng v1.');
  },
  reviseContract(id: string): ActionResult {
    const r = findReq(id), v = r && curVersion(r);
    if (!r || !v || !['CONTRACT_CHANGES_REQUESTED', 'CONTRACT_READY'].includes(r.status) || !['CHANGES_REQUESTED', 'EXPIRED'].includes(versionState(v)))
      return fail('Chỉ phát hành bản sửa khi khách yêu cầu sửa hoặc phiên bản đã hết hạn.');
    updateReq(id, (x) => {
      const old = curVersion(x)!, at = nowStamp();
      if (old.change) old.change.response = { at, text: `Đã phát hành phiên bản v${old.v + 1}.` };
      old.state = 'SUPERSEDED';
      if (old.change?.proposedDate) x.date = old.change.proposedDate;
      if (old.change?.proposedNotes) x.careNotes = old.change.proposedNotes;
      const items = contractItems(x).map((i) => (old.change?.commercial && i.desc.startsWith('Thủ tục') ? { ...i, amount: Math.round(i.amount * 0.8) } : i));
      x.versions.push({ v: old.v + 1, number: old.number, issuedAt: at, validUntil: addHours(at, 24), items, total: sumItems(items), depositPct: old.depositPct, state: 'ISSUED',
        note: old.change ? `Đã điều chỉnh theo đề nghị: ${old.change.text}` : 'Phiên bản gia hạn sau khi phiên bản trước hết hạn.' });
      x.status = 'CONTRACT_READY';
      log(x, 'LOGISTICS_MANAGER', 'Phát hành hợp đồng sửa đổi', `${old.number} v${old.v + 1}`);
    });
    notify(`Hợp đồng sửa đổi cho ${id}`, 'Phiên bản mới có hạn 24 giờ.', `/customer/requests/${id}/contract`);
    return ok('Demo: Manager đã phát hành phiên bản mới (hạn mới 24 giờ).');
  },
  keepVersion(id: string): ActionResult {
    const r = findReq(id), v = r && curVersion(r);
    if (!r || !v || r.status !== 'CONTRACT_CHANGES_REQUESTED') return fail('Không có yêu cầu sửa hợp đồng đang chờ.');
    updateReq(id, (x) => {
      const cv = curVersion(x)!, at = nowStamp();
      cv.change!.response = { at, text: 'Điều khoản hiện tại đã là mức tốt nhất; giữ nguyên phiên bản và cấp lại hạn 24 giờ.' };
      cv.state = 'ISSUED';
      (cv.deadlineHistory ??= []).push({ at, from: cv.validUntil, to: addHours(at, 24), by: 'Linh Pham', reason: 'Trả lời yêu cầu sửa – cấp lại hạn' });
      cv.validUntil = addHours(at, 24);
      x.status = 'CONTRACT_READY';
      log(x, 'LOGISTICS_MANAGER', 'Trả lời yêu cầu sửa & giữ phiên bản', ctRef(cv));
    });
    return ok('Demo: Manager đã trả lời và giữ phiên bản hiện tại (cấp lại 24 giờ).');
  },
  extendDeadline(id: string): ActionResult {
    const r = findReq(id), v = r && curVersion(r);
    if (!r || !v || !['CONTRACT_READY', 'DEPOSIT_VERIFIED'].includes(r.status) || !['ISSUED', 'EXPIRED'].includes(versionState(v))) return fail('Không có hạn ký nào để gia hạn.');
    updateReq(id, (x) => {
      const cv = curVersion(x)!, at = nowStamp();
      const to = addHours(isPast(cv.validUntil) ? at : cv.validUntil, 24);
      (cv.deadlineHistory ??= []).push({ at, from: cv.validUntil, to, by: 'Linh Pham', reason: 'Gia hạn theo đề nghị của khách hàng' });
      cv.validUntil = to;
      log(x, 'LOGISTICS_MANAGER', 'Gia hạn hạn chung cọc / ký OTP', `${ctRef(cv)} → ${fmtDateTime(to)}`);
    });
    return ok('Demo: Manager đã gia hạn thêm 24 giờ.');
  },
  expireVersion(id: string): ActionResult {
    const r = findReq(id), v = r && curVersion(r);
    if (!r || !v || versionState(v) !== 'ISSUED') return fail('Phiên bản hiện tại không còn hiệu lực ký.');
    updateReq(id, (x) => { const cv = curVersion(x)!; cv.validUntil = nowStamp(); log(x, 'SYSTEM', 'Phiên bản hợp đồng hết hạn', ctRef(cv)); });
    return ok('Demo: Phiên bản hợp đồng đã hết hạn.');
  },
  sandboxDeposit(id: string, success: boolean): ActionResult {
    const r = findReq(id);
    const p = r && [...depositPayments(r)].reverse().find((x) => x.status === 'PROCESSING');
    if (!r || !p) return fail('Không có giao dịch cọc đang chờ xác minh.');
    if (qrExpired(p)) {
      updateReq(id, (x) => { const t = x.payments.find((y) => y.id === p.id)!; t.status = 'FAILED'; t.reason = 'Mã QR đã hết hạn sau 5 phút.'; });
      return fail('Mã QR đã hết hạn – Sandbox không thể xác nhận giao dịch này. Hãy thử lại.');
    }
    updateReq(id, (x) => {
      const t = x.payments.find((y) => y.id === p.id)!;
      if (success) {
        t.status = 'SUCCESS'; t.confirmedAt = nowStamp(); x.status = 'DEPOSIT_VERIFIED';
        log(x, 'SYSTEM', 'Sandbox xác minh tiền cọc', `${t.id} • ${fmtMoney(t.amount)}`);
      } else {
        t.status = 'FAILED'; t.reason = 'Ngân hàng từ chối giao dịch (Sandbox).';
        log(x, 'SYSTEM', 'Thanh toán cọc thất bại', t.id);
      }
    });
    if (success) {
      const contractId = curVersion(r)?.contractId || r.versions?.[0]?.contractId;
      if (contractId) {
        void customerApi.mockDeposit(contractId);
      }
      notify(`Tiền cọc đã được xác minh • ${id}`, 'Bạn có thể xem lại và ký hợp đồng bằng OTP.', `/customer/requests/${id}/contract`);
    }
    return ok(success ? 'Sandbox: tiền cọc đã được xác minh. Có thể ký OTP.' : 'Sandbox: thanh toán thất bại. Không có khoản tiền nào bị trừ.');
  },
  approveCancellation(id: string): ActionResult {
    const r = findReq(id);
    if (r?.status !== 'CANCELLATION_REQUESTED') return fail('Không có yêu cầu hủy đang chờ.');
    updateReq(id, (x) => {
      x.status = 'CANCELLED'; x.reason = `Khách hàng hủy: ${x.cancelRequest?.reason ?? ''}`;
      x.payments.filter((p) => p.status === 'PROCESSING').forEach((p) => { p.status = 'FAILED'; p.reason = 'Hủy cùng yêu cầu.'; });
      const paidAmount = x.payments.filter((p) => p.type === 'DEPOSIT' && p.status === 'SUCCESS').reduce((s, p) => s + p.amount, 0);
      if (paidAmount) x.refund = { amount: paidAmount, status: 'REQUESTED', at: nowStamp() };
      log(x, 'LOGISTICS_MANAGER', 'Duyệt hủy', paidAmount ? `Hoàn ${fmtMoney(paidAmount)}` : 'Không có khoản phải hoàn');
    });
    return ok('Demo: Manager đã duyệt hủy.');
  },
  advanceRefund(id: string): ActionResult {
    const r = findReq(id);
    if (!r?.refund || r.refund.status === 'REFUNDED') return fail('Không có khoản hoàn tiền đang xử lý.');
    updateReq(id, (x) => {
      const f = x.refund!;
      if (f.status === 'REQUESTED') { f.status = 'PROCESSING'; log(x, 'LOGISTICS_MANAGER', 'Bắt đầu xử lý hoàn tiền'); }
      else { f.status = 'REFUNDED'; f.refundedAt = nowStamp(); f.reference = `RF-${Date.now().toString().slice(-6)}`; log(x, 'LOGISTICS_MANAGER', 'Đã hoàn tiền', f.reference); }
    });
    return ok('Demo: đã cập nhật trạng thái hoàn tiền.');
  },
  specialistApproveAll(id: string): ActionResult {
    const r = findReq(id);
    if (!r || !['ACTIVATED', 'SCHEDULED'].includes(r.status)) return fail('Chỉ duyệt giấy tờ sau khi yêu cầu được kích hoạt.');
    const waiting = r.docs.filter((d) => d.status === 'PENDING_REVIEW' || d.status === 'SUBMITTED');
    if (!waiting.length) return fail('Không có giấy tờ nào đang chờ duyệt.');
    updateReq(id, (x) => {
      x.docs.forEach((d) => { if (d.status === 'PENDING_REVIEW' || d.status === 'SUBMITTED') { d.status = 'APPROVED'; d.issue = undefined; } });
      log(x, 'TRANSPORT_SPECIALIST', 'Duyệt giấy tờ', `${waiting.length} mục`);
    });
    notify(`Giấy tờ đã được duyệt • ${id}`, `${waiting.length} mục giấy tờ đã được chấp thuận.`, `/customer/requests/${id}/documents`);
    return ok(`Demo: Specialist đã duyệt ${waiting.length} giấy tờ.`);
  },
  specialistRejectOne(id: string): ActionResult {
    const r = findReq(id);
    if (!r || !['ACTIVATED', 'SCHEDULED'].includes(r.status)) return fail('Chỉ kiểm duyệt giấy tờ sau khi yêu cầu được kích hoạt.');
    const d = r.docs.find((x) => x.status === 'PENDING_REVIEW' && x.file) ?? r.docs.find((x) => x.status === 'APPROVED' && x.file);
    if (!d) return fail('Chưa có tệp nào để từ chối.');
    const issue = 'Tệp chưa đủ rõ nét hoặc thiếu trang xác nhận. Vui lòng cập nhật và nộp lại.';
    updateReq(id, (x) => {
      const t = docRecord(x, d.key, d.scope)!;
      t.status = 'ACTION_REQUIRED'; t.issue = issue;
      log(x, 'TRANSPORT_SPECIALIST', 'Từ chối giấy tờ', `${d.key} • ${issue}`);
    });
    notify(`Cần nộp lại giấy tờ • ${id}`, issue, `/customer/requests/${id}/documents`);
    return ok('Demo: Specialist đã từ chối 1 giấy tờ kèm lý do.');
  },
  specialistAskSupplement(id: string, horseId: string, key: DocKey, reason: string): ActionResult {
    const r = findReq(id);
    if (!r || !['ACTIVATED', 'SCHEDULED'].includes(r.status)) return fail('Chỉ yêu cầu bổ sung sau khi yêu cầu được kích hoạt.');
    if (reason.trim().length < 5) return fail('Nhập lý do yêu cầu bổ sung.');
    updateReq(id, (x) => {
      x.supplements.push({ id: nextId('SUP', x.supplements.map((s) => s.id)), key, scope: horseId || 'request', reason: reason.trim(), at: nowStamp(), by: 'Hoang Thu Ha', status: 'OPEN' });
      const rec = docRecord(x, key, horseId || 'request');
      if (rec) { rec.status = 'ACTION_REQUIRED'; rec.issue = reason.trim(); }
      log(x, 'TRANSPORT_SPECIALIST', 'Yêu cầu bổ sung giấy tờ', reason.trim());
    });
    notify(`Specialist yêu cầu bổ sung • ${id}`, reason.trim(), `/customer/requests/${id}/documents`);
    return ok('Demo: Specialist đã yêu cầu bổ sung giấy tờ.');
  },
  scheduleTrip(id: string): ActionResult {
    const r = findReq(id);
    if (r?.status !== 'ACTIVATED' || !r.trip) return fail('Chỉ lên lịch được yêu cầu đã kích hoạt.');
    if (docsNeedingAction(r)) return fail('Còn giấy tờ cần nộp lại / bổ sung – chưa thể lên lịch.');
    if (r.docs.some((d) => d.status === 'PENDING_REVIEW')) return fail('Còn giấy tờ chờ Specialist duyệt – hãy duyệt giấy tờ trước.');
    updateReq(id, (x) => {
      const t = x.trip!, tpl = tripTemplate(x);
      t.stops = t.stops.length ? t.stops : tpl.stops;
      t.status = 'READY_TO_DEPART'; t.routeApproved = true; t.plannedDepart = tpl.plannedDepart; t.eta = tpl.eta;
      x.companyDocs.forEach((d) => { d.status = 'COMPLETED'; });
      x.status = 'SCHEDULED';
      log(x, 'LOGISTICS_MANAGER', 'Duyệt khởi hành', `${t.id} • ${fmtDateTime(t.plannedDepart)}`);
    });
    notify(`${id} đã lên lịch`, 'Tuyến và phương tiện đã được duyệt.', `/customer/requests/${id}/tracking`);
    return ok('Demo: chuyến đã được lên lịch.');
  },
  crewDepart(id: string): ActionResult {
    const r = findReq(id);
    if (r?.status !== 'SCHEDULED' || r.trip?.status !== 'READY_TO_DEPART') return fail('Chuyến chưa sẵn sàng khởi hành.');
    updateReq(id, (x) => {
      const t = x.trip!;
      t.status = 'IN_TRANSIT'; t.milestones.push({ type: 'DEPARTED', stopIndex: 0, at: nowStamp(), by: 'Pham Van Duc' });
      x.status = 'IN_TRANSIT';
      log(x, 'DRIVER_ESCORT', 'Xuất phát', t.stops[0]?.name);
    });
    notify(`${id} đang vận chuyển`, 'Tổ xe đã xác nhận xuất phát.', `/customer/tracking/${id}`);
    return ok('Demo: tổ xe đã xác nhận xuất phát.');
  },
  crewNextMilestone(id: string): ActionResult {
    const r = findReq(id), t = r?.trip;
    if (!r || !t || t.status !== 'IN_TRANSIT') return fail('Chuyến không ở trạng thái đang vận chuyển.');
    const m = t.milestones[t.milestones.length - 1];
    if (m?.type === 'ARRIVED_DESTINATION') return fail('Đã đến điểm giao – tiếp theo là bàn giao.');
    updateReq(id, (x) => {
      const tt = x.trip!, lastM = tt.milestones[tt.milestones.length - 1], at = nowStamp();
      if (lastM && lastM.type === 'ARRIVED_STOP') tt.milestones.push({ type: 'LEFT_STOP', stopIndex: lastM.stopIndex, at, by: 'Pham Van Duc' });
      else {
        const nextIdx = (lastM?.stopIndex ?? 0) + 1, isLast = nextIdx >= tt.stops.length - 1;
        tt.milestones.push({ type: isLast ? 'ARRIVED_DESTINATION' : 'ARRIVED_STOP', stopIndex: Math.min(nextIdx, tt.stops.length - 1), at, by: 'Pham Van Duc' });
      }
      const nm = tt.milestones[tt.milestones.length - 1];
      log(x, 'DRIVER_ESCORT', 'Xác nhận mốc hành trình', `${nm.type} • ${tt.stops[nm.stopIndex]?.name ?? ''}`);
    });
    return ok('Demo: tổ xe đã xác nhận mốc tiếp theo.');
  },
  crewHandover(id: string): ActionResult {
    const r = findReq(id), t = r?.trip;
    if (!r || !t || !t.milestones.some((m) => m.type === 'ARRIVED_DESTINATION')) return fail('Chuyến chưa đến điểm giao.');
    if (t.handover) return fail('Đã bàn giao.');
    updateReq(id, (x) => {
      const at = nowStamp(), tt = x.trip!;
      tt.handover = {
        completedAt: at, receiverName: x.delivery.contact || state.profile.name, receiverId: 'CCCD ***1234',
        horses: pickedHorses(x).map((hid) => ({ horseId: hid, microchipOk: true, condition: 'NORMAL' as const })),
        photos: pickedHorses(x).map((hid) => `handover-${hid.toLowerCase()}.jpg`),
      };
      tt.status = 'COMPLETED';
      x.status = 'DELIVERED';
      x.acceptance = { status: 'PENDING', openedAt: at, dueAt: addHours(at, 24) };
      log(x, 'DRIVER_ESCORT', 'Hoàn tất bàn giao có xác minh', `Người nhận: ${tt.handover.receiverName}`);
    });
    notify(`Đã bàn giao • ${id}`, 'Vui lòng nghiệm thu và thanh toán số dư trong 24 giờ.', `/customer/requests/${id}/handover`);
    return ok('Demo: tổ xe đã hoàn tất bàn giao.');
  },
  sandboxBalance(id: string, success: boolean): ActionResult {
    const r = findReq(id);
    const p = r?.payments.find((x) => x.type === 'BALANCE' && x.status === 'PROCESSING');
    if (!r || !p) return fail('Không có giao dịch VNPay đang chờ.');
    updateReq(id, (x) => {
      const t = x.payments.find((y) => y.id === p.id)!;
      if (success) { t.status = 'SUCCESS'; t.confirmedAt = nowStamp(); log(x, 'SYSTEM', 'VNPay xác minh thanh toán số dư', t.id); }
      else { t.status = 'FAILED'; t.reason = 'VNPay từ chối giao dịch (Sandbox).'; log(x, 'SYSTEM', 'Thanh toán số dư thất bại', t.id); }
    });
    return ok(success ? 'VNPay: đã xác minh thanh toán số dư.' : 'VNPay: thanh toán thất bại, không có khoản tiền nào bị trừ.');
  },
  resolveComplaint(id: string, complaintId: string): ActionResult {
    updateReq(id, (x) => {
      const c = x.complaints.find((y) => y.id === complaintId);
      if (!c) return;
      c.status = 'RESOLVED'; c.response = 'CBN Transport đã kiểm tra và phản hồi bằng văn bản. Hạn nghiệm thu được cấp lại 24 giờ.';
      if (x.acceptance) x.acceptance.dueAt = addHours(nowStamp(), 24);
      log(x, 'LOGISTICS_MANAGER', 'Giải quyết khiếu nại', complaintId);
    });
    return ok('Demo: Manager đã giải quyết khiếu nại (hạn mới 24 giờ).');
  },
  endAcceptanceWindow(id: string): ActionResult {
    const r = findReq(id);
    if (!r?.acceptance) return fail('Chưa mở hạn nghiệm thu.');
    updateReq(id, (x) => { x.acceptance!.dueAt = nowStamp(); log(x, 'SYSTEM', 'Hết hạn chung 24 giờ nghiệm thu / thanh toán'); });
    return ok('Demo: đã chuyển tới thời điểm hết hạn 24 giờ.');
  },
  closeRequest(id: string): ActionResult {
    const r = findReq(id);
    if (r?.status !== 'DELIVERED') return fail('Chỉ đóng được yêu cầu đã giao.');
    const missing = closureChecks(r).filter(([, done]) => !done);
    if (missing.length) return fail(`Chưa đủ điều kiện đóng: ${missing[0][0]}.`);
    updateReq(id, (x) => {
      x.status = 'CLOSED'; x.closedAt = nowStamp();
      (x.versions || []).forEach((v) => { if (v.state === 'EFFECTIVE') v.state = 'FULFILLED'; });
      log(x, 'LOGISTICS_MANAGER', 'Đóng yêu cầu', 'Đủ mọi điều kiện đóng');
    });
    return ok('Demo: yêu cầu đã được đóng và chuyển sang Lịch sử.');
  },
};

export type CustomerActions = typeof customerActions & { demo: typeof demoActions };
const actions: CustomerActions = { ...customerActions, demo: demoActions };

/** Số mục khách hàng cần xử lý trong một yêu cầu (dùng cho huy hiệu menu) */
export function needsCustomerAction(r: TransportRequest) {
  const v = curVersion(r);
  if (['DRAFT', 'CHANGES_REQUESTED', 'AWAITING_DEPOSIT', 'DEPOSIT_VERIFIED'].includes(r.status)) return true;
  if (r.status === 'CONTRACT_READY' && v && versionState(v) === 'ISSUED' && (!v.termsAcceptedAt || ['NONE', 'FAILED'].includes(depositState(r)))) return true;
  if (['ACTIVATED', 'SCHEDULED'].includes(r.status) && docsNeedingAction(r) > 0) return true;
  if (r.status === 'DELIVERED' && (r.acceptance?.status === 'PENDING' || (r.acceptance?.status === 'ACCEPTED' && balanceDue(r) > 0 && !r.payments.some((p) => p.type === 'BALANCE' && p.status === 'PROCESSING')))) return true;
  return false;
}

// ============================================================================
// Hook
// ============================================================================
export function useCustomer(requestId?: string) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const currentEmail = typeof window !== 'undefined' ? (sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail')) : null;
  useEffect(() => {
    if (!requestId) return;
    void actions.loadRequest(requestId);
    const timer = setInterval(() => { void actions.loadRequest(requestId); }, 15000);
    return () => clearInterval(timer);
  }, [requestId]);

  useEffect(() => {
    if (currentEmail && snap.profile.email && currentEmail !== snap.profile.email) {
      resetCustomerState();
    }
    void loadAll();
  }, [currentEmail, snap.profile.email]);

  const stats = useMemo(() => ({
    active: snap.requests.filter(isActive).length,
    needAction: snap.requests.filter((r) => isActive(r) && needsCustomerAction(r)).length,
    inTransit: snap.requests.filter((r) => r.status === 'IN_TRANSIT').length,
    history: snap.requests.filter((r) => !isActive(r)).length,
    unread: snap.notifications.filter((n) => !n.read).length,
  }), [snap.requests, snap.notifications]);

  const getRequest = (id?: string) => snap.requests.find((r) => r.id === id);
  const getHorse = (id?: string) => snap.horses.find((h) => h.id === id);
  /** Giấy tờ chung + hồ sơ từng ngựa của một yêu cầu */
  const docsOf = (r: TransportRequest) => ({
    shared: sharedDocItems(r),
    perHorse: pickedHorses(r).map((id) => snap.horses.find((h) => h.id === id)).filter((h): h is Horse => !!h)
      .map((h) => ({ horse: h, items: horseDocItems(r, h) })),
  });

  return { ...snap, stats, getRequest, getHorse, docsOf, actions };
}

/** Vẽ lại định kỳ cho các đồng hồ đếm ngược (hạn ký 24 giờ, QR 5 phút, OTP) */
export function useClock(intervalMs = 1000) {
  const [ms, setMs] = useState(clockMs());
  useEffect(() => {
    const t = setInterval(() => setMs(clockMs()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return ms;
}

export default useCustomer;
