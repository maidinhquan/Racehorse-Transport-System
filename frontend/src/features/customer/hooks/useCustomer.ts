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
import { apiMessage } from '../../../shared/api/core/apiError';
import { getCurrentUser } from '../../auth/api/authApi';
import {
  FILE_DOC_KEYS,
  balanceDue,
  canAcceptTerms,
  canCancel,
  canComplain,
  canRequestContractChange,
  canSign,
  clockMs,
  curVersion,
  depositState,
  docsNeedingAction,
  emptyPlace,
  fmtDateTime,
  fmtMoney,
  horseDocItems,
  isActive,
  isSupportedRoute,
  nowStamp,
  pickedHorses,
  sharedDocItems,
  today,
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

import { getSharedRequests, saveSharedRequest,} from '../../../shared/utils/sharedRequests';
import { createSyncController, notifySync } from '../../../shared/utils/syncChannel';
import { getSharedNotificationsFor } from '../../../shared/utils/sharedNotifications';

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

const CUSTOMER_READ_NOTIFS_KEY = 'customer_read_notifications';

function getCustomerReadNotifIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CUSTOMER_READ_NOTIFS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function persistCustomerReadNotifIds(ids: string[]): void {
  try {
    const current = getCustomerReadNotifIds();
    ids.forEach((id) => {
      if (id) {
        current.add(id);
        current.add(cleanId(id));
      }
    });
    localStorage.setItem(CUSTOMER_READ_NOTIFS_KEY, JSON.stringify([...current]));
  } catch {
    // ignore
  }
}

const resolveCustomerNotifs = (listIn: CustomerNotification[]): CustomerNotification[] => {
  const readIds = getCustomerReadNotifIds();
  const shared: CustomerNotification[] = getSharedNotificationsFor('CUSTOMER', (() => { try { return state.requests.map((r) => r.id); } catch { return undefined; } })())
    .map((n) => ({ id: n.id, title: n.title, body: n.body, at: n.at, read: n.read, link: n.link || '' }));
  const list = [...shared.filter((n) => !listIn.some((x) => x.id === n.id)), ...listIn];
  return list.map((n) => ({
    ...n,
    read: Boolean(n.read || readIds.has(n.id) || readIds.has(cleanId(n.id))),
  }));
};

let state: CustomerState = {
  profile: getInitialProfile(),
  horses: [],
  requests: readRequestDrafts(),
  notifications: [],
  otp: null,
  loading: false,
  loaded: false,
  toast: null,
};
const listeners = new Set<() => void>();
const setState = (patch: Partial<CustomerState> | ((s: CustomerState) => Partial<CustomerState>)) => {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  writeRequestDrafts(state.requests);
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

const refreshSharedNotifs = () => setState({ notifications: resolveCustomerNotifs(state.notifications) });

const subscribe = (l: () => void) => {
  listeners.add(l);
  if (listeners.size === 1) {
    unsubscribeSyncController = syncController.subscribe();
    if (typeof window !== 'undefined') {
      window.addEventListener('rts_shared_notifications_changed', refreshSharedNotifs);
      window.addEventListener('storage', refreshSharedNotifs);
    }
  }
  return () => {
    listeners.delete(l);
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('rts_shared_notifications_changed', refreshSharedNotifs);
      window.removeEventListener('storage', refreshSharedNotifs);
    }
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
    void syncRequestsOnly();
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
      if (c.status === 'CHANGES_REQUESTED') c.editingLocally = true;
      return c;
    }),
  }));
};
/** Specialist cùng trình duyệt đọc trạng thái giấy tờ từ đơn dùng chung: báo cho họ biết khách đã nộp bản mới */
const shareSubmittedDoc = (requestId: string, key: DocKey, scope: string, file: FileRef) => {
  try {
    const same = (s?: string) => !!s && (s === scope || cleanId(s) === cleanId(scope));
    const shared = getSharedRequests().find((q: any) => cleanId(q.id) === cleanId(requestId))
      ?? getSharedRequests().find((q: any) => Array.isArray(q.horses) && q.horses.some(same));
    if (!shared) return;
    const docs: any[] = Array.isArray(shared.docs) ? shared.docs : (shared.docs = []);
    const doc = { key, scope, status: 'SUBMITTED', file: { name: file.name }, updatedAt: nowStamp(), issue: undefined };
    const index = docs.findIndex((d) => d.key === key && same(d.scope));
    if (index < 0) docs.push(doc); else docs[index] = { ...docs[index], ...doc };
    (shared.supplements ?? []).forEach((s: any) => { if (s.key === key && same(s.scope) && s.status === 'OPEN') s.status = 'SUBMITTED'; });
    saveSharedRequest(shared);
  } catch { /* Đồng bộ cục bộ chỉ là phần phụ */ }
};
const ACTOR: Record<ActorRole, string> = {
  CUSTOMER: '', LOGISTICS_MANAGER: 'Linh Pham', TRANSPORT_SPECIALIST: 'Hoang Thu Ha', FLEET_ROUTE_COORDINATOR: 'Phạm Hải',
  DRIVER_ESCORT: 'Pham Van Duc', SYSTEM: 'Hệ thống',
};
const log = (r: TransportRequest, role: ActorRole, action: string, detail?: string) =>
  r.history.push({ at: nowStamp(), actor: role === 'CUSTOMER' ? state.profile.name : ACTOR[role], role, action, detail });
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
      // Lấy luôn thông báo để các nhắc nhở từ Quản lý hiện ngay, không cần tải lại trang
      const [requestsRes, notificationsRes] = await Promise.allSettled([customerApi.getRequests(), customerApi.getNotifications()]);
      if (requestsRes.status === 'rejected') throw requestsRes.reason;
      const fetched = requestsRes.value;
      const freshNotifications = notificationsRes.status === 'fulfilled' && Array.isArray(notificationsRes.value) ? notificationsRes.value : null;
      setState((prev) => ({
        ...prev,
        requests: mergeRequestDrafts(fetched, prev.requests),
        ...(freshNotifications ? { notifications: resolveCustomerNotifs(freshNotifications) } : {}),
      }));
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
      // Surface load failures instead of silently showing empty lists.
      for (const [label, res] of [['ngựa', horsesRes], ['yêu cầu', requestsRes]] as const) {
        if (res.status === 'rejected') {
          console.error(`[customer] loading ${label} failed`, res.reason);
          toast(`Không tải được danh sách ${label}: ${apiMessage(res.reason)}`);
        }
      }
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
      setState((prev) => ({
        ...prev,
        profile,
        horses: horses || [],
        requests: mergeRequestDrafts(baseRequests, prev.requests),
        notifications: resolveCustomerNotifs(notifications || []),
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
  if (input.horseCount < 1 || input.horseCount > 100) return 'Số lượng ngựa phải từ 1 trở lên.';
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
    if (id.startsWith('LOCAL_')) return;
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
    setState(s => ({ notifications: s.notifications.map(n => (n.id === id || cleanId(n.id) === cleanId(id)) ? { ...n, read: true } : n) }));
    persistCustomerReadNotifIds([id]);
    try { await customerApi.markNotificationRead(id); }
    catch { /* backend sync error */ }
  },
  async markAllNotificationsRead() {
    setState(s => {
      const allIds = s.notifications.map(n => n.id);
      persistCustomerReadNotifIds(allIds);
      return { notifications: s.notifications.map(n => ({ ...n, read: true })) };
    });
    try { await customerApi.markAllNotificationsRead(); }
    catch { /* backend sync error */ }
  },

  // ----- Bước 1: thông tin chuyến -----
  async createDraft(input: TripInfoInput, _idempotencyKey?: string): Promise<ActionResult> {
    const err = validateTripInfo(input); if (err) return fail(err);
    const id = `LOCAL_${crypto.randomUUID()}`;
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (delivery.email && !emailRegex.test(delivery.email.trim())) return fail('Email người nhận không hợp lệ.');
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
    if (key === 'health') {
      if (!file.file) return fail('Chọn tệp từ máy trước khi tải lên.');
      try {
        const saved = await customerApi.uploadDocument(requestId, key, scope, file);
        updateReq(requestId, x => {
          const same = (s: string) => s === scope || cleanId(s) === cleanId(scope);
          const answered = x.supplements.some(s => s.key === key && same(s.scope) && s.status === 'OPEN') || x.docs.some(d => d.key === key && same(d.scope) && d.status === 'ACTION_REQUIRED');
          const doc: DocRecord = { key, scope, status: answered ? 'RESUBMITTED' : 'PENDING_REVIEW', file: saved?.file ?? file, updatedAt: nowStamp() };
          const index = x.docs.findIndex(d => d.key === key && same(d.scope));
          if (index < 0) x.docs.push(doc); else x.docs[index] = doc;
          x.supplements.forEach(s => { if (s.key === key && same(s.scope) && s.status === 'OPEN') s.status = 'SUBMITTED'; });
        });
        shareSubmittedDoc(requestId, key, scope, saved?.file ?? file);
        await syncRequestsOnly();
        return ok('Đã gửi giấy tờ cho Transport Specialist kiểm duyệt.');
      } catch (error) { return fail(apiMessage(error)); }
    }
    const fileTypes: Partial<Record<DocKey, string>> = { passport: 'passport', ownership: 'ownership', valueProof: 'value-proof', flu: 'flu' };
    const fileType = fileTypes[key];
    if (!fileType) return fail('Tài liệu này chưa hỗ trợ nộp trực tuyến. Vui lòng liên hệ chuyên viên phụ trách.');
    if (!file.file) return fail('Chọn tệp từ máy trước khi tải lên.');
    try {
      await customerApi.uploadHorseFile(scope, fileType as 'passport' | 'ownership' | 'value-proof' | 'flu', file.file);
      setState({ horses: await customerApi.getHorses() });
      updateReq(requestId, x => {
        const same = (s: string) => s === scope || cleanId(s) === cleanId(scope);
        const answered = x.supplements.some(s => s.key === key && same(s.scope) && s.status === 'OPEN') || x.docs.some(d => d.key === key && same(d.scope) && d.status === 'ACTION_REQUIRED');
        const doc: DocRecord = { key, scope, status: answered ? 'RESUBMITTED' : 'PENDING_REVIEW', file, updatedAt: nowStamp() };
        const index = x.docs.findIndex(d => d.key === key && same(d.scope));
        if (index < 0) x.docs.push(doc); else x.docs[index] = doc;
        x.supplements.forEach(s => { if (s.key === key && same(s.scope) && s.status === 'OPEN') s.status = 'SUBMITTED'; });
      });
      shareSubmittedDoc(requestId, key, scope, file);
      await syncRequestsOnly();
      return ok('Đã lưu tài liệu vào hồ sơ ngựa.');
    } catch (error) { return fail(apiMessage(error)); }
  
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

export type CustomerActions = typeof customerActions;
const actions: CustomerActions = customerActions;

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

  const getRequest = (id?: string) => {
    if (!id) return undefined;
    const target = cleanId(id);
    return snap.requests.find((r) => r.id === id || cleanId(r.id) === target || (r.trip && cleanId(r.trip.id) === target));
  };
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
