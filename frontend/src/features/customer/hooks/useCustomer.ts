import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type {
  ActionResult,
  ActorRole,
  ComplaintInput,
  ContractChangeInput,
  CustomerNotification,
  CustomerProfile,
  DocKey,
  FileRef,
  Horse,
  HorseInput,
  Place,
  RequestField,
  TransportRequest,
  TripInfoInput,
} from '../types';
import { customerApi } from '../api/customerApi';
import { getCurrentUser } from '../../auth/api/authApi';
import { DEMO_OTP, mockHorses, mockNotifications, mockProfile, mockRequests } from '../data/mockData';
import {
  FILE_DOC_KEYS,
  HORSE_FILE_FIELD,
  HORSE_LOCKED_FIELDS,
  addHours,
  balanceDue,
  canAcceptTerms,
  canCancel,
  canComplain,
  canPayDeposit,
  canRequestContractChange,
  canSign,
  clockMs,
  closureChecks,
  contractItems,
  ctRef,
  curVersion,
  depositAmount,
  depositPayments,
  depositState,
  docRecord,
  docsNeedingAction,
  fmtDateTime,
  fmtMoney,
  hasDepositMoney,
  horseDocItems,
  horseRequests,
  isActive,
  isInternational,
  isPast,
  isSupportedRoute,
  nowStamp,
  pickedHorses,
  qrExpired,
  sharedDocItems,
  signBlock,
  sumItems,
  today,
  tripTemplate,
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

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const OTP_SECONDS = 120;

const getInitialProfile = (): CustomerProfile => {
  const p = clone(mockProfile);
  try {
    const storedName = localStorage.getItem('userFullName');
    const storedEmail = localStorage.getItem('userEmail');
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

let state: CustomerState = {
  profile: getInitialProfile(),
  horses: clone(mockHorses),
  requests: clone(mockRequests),
  notifications: clone(mockNotifications),
  otp: null,
  loading: false,
  loaded: false,
  toast: null,
};
const listeners = new Set<() => void>();
const setState = (patch: Partial<CustomerState> | ((s: CustomerState) => Partial<CustomerState>)) => {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => state;

const toast = (message: string) => setState({ toast: { id: Date.now(), message } });
const ok = (message: string, id?: string): ActionResult => { toast(message); return { ok: true, message, id }; };
const fail = (message: string): ActionResult => { toast(message); return { ok: false, message }; };

const findReq = (id: string) => state.requests.find((r) => r.id === id);
const findHorse = (id: string) => state.horses.find((h) => h.id === id);
/** Sửa một yêu cầu trên bản sao rồi ghi lại vào store */
const updateReq = (id: string, fn: (r: TransportRequest) => void) => {
  setState((s) => ({ requests: s.requests.map((r) => { if (r.id !== id) return r; const c = clone(r); fn(c); return c; }) }));
  const saved = findReq(id);
  if (saved) void customerApi.saveRequest(saved);
};
const ACTOR: Record<ActorRole, string> = {
  CUSTOMER: '', LOGISTICS_MANAGER: 'Linh Pham', TRANSPORT_SPECIALIST: 'Hoang Thu Ha', FLEET_COORDINATOR: 'Dang Minh Quan',
  CREW: 'Pham Van Duc', SYSTEM: 'Hệ thống',
};
const log = (r: TransportRequest, role: ActorRole, action: string, detail?: string) =>
  r.history.push({ at: nowStamp(), actor: role === 'CUSTOMER' ? state.profile.name : ACTOR[role], role, action, detail });
const notify = (title: string, body: string, link: string) =>
  setState((s) => ({ notifications: [{ id: `N-${Date.now()}`, title, body, at: nowStamp(), read: false, link }, ...s.notifications] }));
const nextId = (prefix: string, list: string[]) => {
  const numbers = list
    .filter((x) => typeof x === 'string' && x.startsWith(`${prefix}-`))
    .map((x) => {
      const part = x.split('-')[1];
      const n = parseInt(part, 10);
      return !isNaN(n) && n < 1000000 ? n : 0;
    });
  const max = numbers.length > 0 ? Math.max(1000, ...numbers) : 8945;
  return `${prefix}-${max + 1}`;
};

async function loadAll() {
  if (state.loading || state.loaded) return;
  setState({ loading: true });
  const [profile, horses, requests, notifications, currentUserRes] = await Promise.all([
    customerApi.getProfile(),
    customerApi.getHorses(),
    customerApi.getRequests(),
    customerApi.getNotifications(),
    getCurrentUser().catch(() => null),
  ]);
  try {
    if (currentUserRes?.data) {
      const u = currentUserRes.data;
      if (u.fullName) profile.name = u.fullName;
      if (u.email) {
        profile.email = u.email;
        try {
          localStorage.setItem('userEmail', u.email);
        } catch {
          // ignore
        }
      }
      if (u.phoneNumber) profile.phone = u.phoneNumber;
    } else {
      const storedName = localStorage.getItem('userFullName');
      const storedEmail = localStorage.getItem('userEmail');
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
  setState({ profile, horses, requests, notifications, loading: false, loaded: true });
}

// ============================================================================
// Hành động của khách hàng
// ============================================================================
function validateTripInfo(input: TripInfoInput): string {
  if (!input.origin || !input.destination) return 'Chọn điểm đi và điểm đến.';
  if (input.origin === input.destination) return 'Điểm đi và điểm đến phải khác nhau.';
  if (!isSupportedRoute(input.origin, input.destination)) return 'Tuyến này chưa nhận đơn mới (chỉ Việt Nam → Việt Nam và Việt Nam → Nhật Bản).';
  if (!input.date || input.date < today()) return 'Ngày vận chuyển phải từ hôm nay trở đi.';
  if (input.horseCount < 1 || input.horseCount > 6) return 'Số lượng ngựa từ 1 đến 6.';
  return '';
}

const resizeHorses = (r: TransportRequest, count: number) => {
  r.horseCount = count;
  r.horses = Array.from({ length: count }, (_, i) => r.horses[i] ?? '');
};

const customerActions = {
  reload: () => { setState({ loaded: false }); void loadAll(); },
  clearToast: () => setState({ toast: null }),
  showToast: (message: string) => toast(message),
  markNotificationRead: (id: string) => setState((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  markAllNotificationsRead: () => setState((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

  // ----- Bước 1: thông tin chuyến -----
  createDraft(input: TripInfoInput): ActionResult {
    const err = validateTripInfo(input);
    if (err) return fail(err);
    const id = nextId('TRN', state.requests.map((r) => r.id));
    const r: TransportRequest = {
      id, origin: input.origin, destination: input.destination, date: input.date, horseCount: input.horseCount,
      requestedAt: today(), status: 'DRAFT', careNotes: input.careNotes.trim(),
      pickup: { name: '', address: '', postal: '', contact: state.profile.name, phone: state.profile.phone, notes: '' },
      delivery: { name: '', address: '', postal: '', contact: '', phone: '', notes: '' },
      horses: Array.from({ length: input.horseCount }, () => ''), horseNotes: {}, wizardStep: 1,
      revisions: [], versions: [], payments: [], docs: [], supplements: [], companyDocs: [], complaints: [], history: [],
    };
    log(r, 'CUSTOMER', 'Tạo bản nháp yêu cầu', `${input.origin} → ${input.destination} • ${input.horseCount} ngựa`);
    setState((s) => ({ requests: [r, ...s.requests] }));
    void customerApi.createRequest(r);
    return ok(`Đã lưu bản nháp ${id}. Tiếp tục khai báo điểm nhận và điểm giao.`, id);
  },

  updateTripInfo(id: string, input: TripInfoInput): ActionResult {
    const r = findReq(id);
    if (!r || !['DRAFT', 'CHANGES_REQUESTED'].includes(r.status)) return fail('Chỉ sửa được bản nháp hoặc yêu cầu đang được yêu cầu chỉnh sửa.');
    if (r.status === 'CHANGES_REQUESTED') {
      const allowed: RequestField[] = r.revisionFields ?? ['route', 'date', 'count', 'notes'];
      const changed: RequestField[] = [];
      if (input.origin !== r.origin || input.destination !== r.destination) changed.push('route');
      if (input.date !== r.date) changed.push('date');
      if (input.horseCount !== r.horseCount) changed.push('count');
      if (input.careNotes.trim() !== r.careNotes) changed.push('notes');
      const locked = changed.filter((f) => !allowed.includes(f));
      if (locked.length) return fail('Manager chỉ cho phép sửa các mục đã nêu trong góp ý.');
    }
    const err = validateTripInfo(input);
    if (err) return fail(err);
    updateReq(id, (x) => {
      x.origin = input.origin; x.destination = input.destination; x.date = input.date; x.careNotes = input.careNotes.trim();
      resizeHorses(x, input.horseCount);
      log(x, 'CUSTOMER', 'Cập nhật thông tin chuyến', `${input.origin} → ${input.destination} • ${fmtDateTime(input.date)} • ${input.horseCount} ngựa`);
    });
    return ok('Đã lưu thông tin chuyến.');
  },

  // ----- Bước 2: điểm nhận & điểm giao -----
  savePlaces(id: string, pickup: Place, delivery: Place): ActionResult {
    const missing = (p: Place) => !p.name.trim() || !p.address.trim() || !p.contact.trim() || !p.phone.trim();
    if (missing(pickup) || missing(delivery)) return fail('Điền đủ tên địa điểm, địa chỉ, người liên hệ và số điện thoại cho cả điểm nhận và điểm giao.');
    const phoneOk = (p: string) => /^[+0-9 ()-]{8,}$/.test(p.trim());
    if (!phoneOk(pickup.phone) || !phoneOk(delivery.phone)) return fail('Số điện thoại không hợp lệ.');
    updateReq(id, (r) => { r.pickup = pickup; r.delivery = delivery; r.wizardStep = Math.max(r.wizardStep, 2); });
    return ok('Đã lưu điểm nhận và điểm giao.');
  },

  // ----- Bước 3: ngựa & hồ sơ -----
  setHorseSlot(id: string, slot: number, horseId: string): ActionResult {
    const r = findReq(id);
    if (!r) return fail('Không tìm thấy yêu cầu.');
    if (horseId && r.horses.some((h, i) => h === horseId && i !== slot)) return fail('Ngựa này đã được chọn trong đơn.');
    updateReq(id, (x) => { x.horses[slot] = horseId; });
    return { ok: true, message: '' };
  },
  setHorseNote(id: string, horseId: string, note: string) {
    updateReq(id, (r) => { r.horseNotes[horseId] = note; });
  },
  completeHorsesStep(id: string): ActionResult {
    const r = findReq(id);
    if (!r) return fail('Không tìm thấy yêu cầu.');
    if (r.horses.some((h) => !h)) return fail(`Hãy chọn đủ ${r.horseCount} ngựa.`);
    updateReq(id, (x) => { x.wizardStep = Math.max(x.wizardStep, 3); });
    return ok('Đã lưu danh sách ngựa và hồ sơ.');
  },

  async submitRequest(id: string): Promise<ActionResult> {
    const r = findReq(id);
    if (!r || !['DRAFT', 'CHANGES_REQUESTED'].includes(r.status)) return fail('Yêu cầu này không ở trạng thái gửi được.');
    const errs = wizardErrors(r, state.horses);
    if (errs.length) return fail(`Chưa gửi được: ${errs[0][1]}`);
    
    const apiRes = await customerApi.submitRequest(id, r);
    if (!apiRes.ok) {
      return fail(apiRes.message || 'Gửi yêu cầu thất bại. Vui lòng thử lại.');
    }

    const realId = apiRes.requestId || id;
    updateReq(id, (x) => {
      if (x.status === 'CHANGES_REQUESTED') {
        x.revisions.push({ v: x.revisions.length + 1, at: x.submittedAt ?? nowStamp(), origin: x.origin, destination: x.destination, date: x.date, horseCount: x.horseCount, feedback: x.feedback });
      }
      x.id = realId;
      x.status = 'PENDING_REVIEW'; x.submittedAt = nowStamp(); x.revisionFields = undefined;
      log(x, 'CUSTOMER', x.revisions.length ? 'Gửi lại yêu cầu sau chỉnh sửa' : 'Gửi yêu cầu vận chuyển', `${x.origin} → ${x.destination} • ${x.horseCount} ngựa`);
    });
    return ok(`Đã gửi ${realId}. Logistics Manager sẽ xét duyệt yêu cầu của bạn.`, realId);
  },

  cancelRequest(id: string, reason: string): ActionResult {
    const r = findReq(id);
    if (!r || !canCancel(r)) return fail('Không thể hủy yêu cầu ở trạng thái hiện tại.');
    if (reason.trim().length < 5) return fail('Nhập lý do hủy (ít nhất 5 ký tự).');

    const v = r.versions && r.versions.length > 0 ? r.versions[r.versions.length - 1] : undefined;
    const contractId = v?.contractId || (r as any).contractId;
    const contractVersion = v?.rowVersion || (v as any)?.contractVersion || (r as any).version || 'AAAAAAADkh8=';

    if (contractId) {
      void customerApi.cancelContract(contractId, contractVersion, reason.trim()).then((success) => {
        if (success) {
          setTimeout(() => { setState((s) => ({ ...s, loaded: false })); void loadAll(); }, 500);
        }
      });
    }

    if (hasDepositMoney(r)) {
      updateReq(id, (x) => {
        x.cancelRequest = { at: nowStamp(), reason: reason.trim(), prevStatus: x.status };
        x.status = 'CANCELLATION_REQUESTED';
        log(x, 'CUSTOMER', 'Yêu cầu hủy', `${reason.trim()} • đã có thanh toán – chờ Manager đối soát`);
      });
      return ok('Đã gửi yêu cầu hủy. CBN Transport sẽ đối soát khoản thanh toán của bạn.');
    }
    updateReq(id, (x) => { x.status = 'CANCELLED'; x.reason = `Khách hàng hủy: ${reason.trim()}`; log(x, 'CUSTOMER', 'Hủy yêu cầu', reason.trim()); });
    return ok(`Đã hủy ${id}. Yêu cầu được lưu trong Lịch sử.`);
  },

  // ----- Ngựa của tôi -----
  createHorse(input: HorseInput): ActionResult {
    if (!input.name.trim()) return fail('Nhập tên ngựa.');
    if (input.passport.issueDate && input.passport.expiryDate && input.passport.expiryDate < input.passport.issueDate) return fail('Ngày hết hạn hộ chiếu không được trước ngày cấp.');
    const id = nextId('HOR', state.horses.map((h) => h.id));
    setState((s) => ({ horses: [...s.horses, { ...clone(input), id, name: input.name.trim() }] }));
    void customerApi.createHorse(input).then((res) => {
      if (res.ok && res.id) {
        setTimeout(() => { setState({ loaded: false }); void loadAll(); }, 500);
      }
    });
    return ok(`Đã thêm ${input.name.trim()} vào Ngựa của tôi.`, id);
  },
  updateHorse(id: string, input: HorseInput): ActionResult {
    const h = findHorse(id);
    if (!h) return fail('Không tìm thấy ngựa.');
    if (!input.name.trim()) return fail('Nhập tên ngựa.');
    if (input.passport.issueDate && input.passport.expiryDate && input.passport.expiryDate < input.passport.issueDate) return fail('Ngày hết hạn hộ chiếu không được trước ngày cấp.');
    const next: Horse = { ...clone(input), id, version: h.version };
    if (horseRequests(h, state.requests).length) HORSE_LOCKED_FIELDS.forEach((k) => { (next as unknown as Record<string, unknown>)[k] = h[k]; });
    setState((s) => ({ horses: s.horses.map((x) => (x.id === id ? next : x)) }));
    void customerApi.updateHorse(id, next).then((success) => {
      if (success) {
        setTimeout(() => { setState({ loaded: false }); void loadAll(); }, 500);
      }
    });
    return ok('Đã lưu hồ sơ ngựa.');
  },

  // ----- Giấy tờ -----
  uploadDoc(requestId: string, key: DocKey, scope: string, file: FileRef): ActionResult {
    const r = findReq(requestId);
    if (!r) return fail('Không tìm thấy yêu cầu.');
    if (!FILE_DOC_KEYS.includes(key)) return fail('Mục này không cần tải tệp.');
    if (!isActive(r)) return fail('Yêu cầu đã kết thúc, không thể nộp giấy tờ.');
    const reviewing = ['ACTIVATED', 'SCHEDULED', 'IN_TRANSIT'].includes(r.status);
    updateReq(requestId, (x) => {
      const rec = docRecord(x, key, scope);
      const data = { status: reviewing ? 'PENDING_REVIEW' as const : 'SUBMITTED' as const, file, issue: undefined, updatedAt: nowStamp() };
      if (rec) Object.assign(rec, data); else x.docs.push({ key, scope, ...data });
      x.supplements.forEach((s) => { if (s.status === 'OPEN' && s.key === key && s.scope === scope) s.status = 'FULFILLED'; });
      log(x, 'CUSTOMER', reviewing ? 'Nộp giấy tờ để Specialist kiểm duyệt' : 'Tải giấy tờ lên hồ sơ', `${file.name}`);
    });
    // tệp của ngựa được lưu vào Ngựa của tôi nếu hồ sơ ngựa chưa có
    const h = scope !== 'request' ? findHorse(scope) : undefined;
    if (h) {
      const copy = clone(h);
      if (key === 'passport' && !copy.passport.scan) copy.passport.scan = file;
      const field = HORSE_FILE_FIELD[key as keyof typeof HORSE_FILE_FIELD];
      if (field && !copy[field]) copy[field] = file;
      setState((s) => ({ horses: s.horses.map((x) => (x.id === h.id ? copy : x)) }));
    }
    void customerApi.uploadDocument(requestId, key, scope, file.name);
    return ok(reviewing ? 'Đã nộp. Giấy tờ đang chờ Transport Specialist kiểm duyệt.' : 'Đã tải tệp lên. Tệp chưa được duyệt cho tới khi yêu cầu được kích hoạt.');
  },

  // ----- Hợp đồng -----
  acceptTerms(id: string): ActionResult {
    const r = findReq(id);
    if (!r || !canAcceptTerms(r)) return fail('Chỉ đồng ý được điều khoản của phiên bản hợp đồng hiện hành, còn hạn.');
    const v = curVersion(r)!;
    const contractId = v.contractId || r.versions?.[0]?.contractId || id;
    updateReq(id, (x) => { const cv = curVersion(x)!; cv.termsAcceptedAt = nowStamp(); log(x, 'CUSTOMER', 'Đồng ý điều khoản hợp đồng', `${ctRef(cv)} • ${fmtMoney(cv.total)}`); });
    void customerApi.acceptTerms(contractId);
    return ok('Đã đồng ý điều khoản. Tiếp tục thanh toán tiền cọc.');
  },
  requestContractChange(id: string, input: ContractChangeInput): ActionResult {
    const r = findReq(id);
    if (!r || !canRequestContractChange(r)) return fail('Chỉ yêu cầu sửa được phiên bản hợp đồng hiện hành chưa ký và chưa có thanh toán.');
    if (input.text.trim().length < 10) return fail('Giải thích nội dung cần sửa (ít nhất 10 ký tự).');
    if (input.proposedDate !== undefined && (!input.proposedDate || input.proposedDate < today())) return fail('Ngày đề xuất phải từ hôm nay trở đi.');
    const v = curVersion(r)!;
    const contractId = v.contractId || r.versions?.[0]?.contractId || id;
    updateReq(id, (x) => {
      const cv = curVersion(x)!;
      cv.state = 'CHANGES_REQUESTED';
      cv.change = { at: nowStamp(), text: input.text.trim(), proposedDate: input.proposedDate, proposedNotes: input.proposedNotes, commercial: input.commercial, other: input.other };
      x.status = 'CONTRACT_CHANGES_REQUESTED';
      log(x, 'CUSTOMER', 'Yêu cầu sửa hợp đồng', `${ctRef(cv)} • ${input.text.trim()}`);
    });
    void customerApi.requestContractChange(contractId, input, v.rowVersion).then((success) => {
      if (success) {
        setTimeout(() => { setState({ loaded: false }); void loadAll(); }, 500);
      }
    });
    return ok('Đã gửi yêu cầu sửa hợp đồng. Chờ Manager phản hồi.');
  },

  // ----- Đặt cọc (QR Sandbox, mã QR có hiệu lực 5 phút) -----
  confirmDepositTransfer(id: string, qrExpiresAtMs: number): ActionResult {
    const r = findReq(id);
    if (!r || !canPayDeposit(r)) return fail('Chưa thể thanh toán cọc ở trạng thái hiện tại.');
    if (clockMs() >= qrExpiresAtMs) return fail('Mã QR đã hết hạn. Bấm Thử lại để tạo mã mới.');
    const v = curVersion(r);
    const contractId = v?.contractId || r.versions?.[0]?.contractId || id;
    const payId = nextId('PAY', state.requests.flatMap((x) => x.payments.map((p) => p.id)));
    updateReq(id, (x) => {
      // Đặt cọc thành công qua Sandbox (hỗ trợ test dev)
      x.payments.push({ id: payId, type: 'DEPOSIT', method: 'QR_SANDBOX', amount: depositAmount(x), status: 'SUCCESS', createdAt: nowStamp(), qrExpiresAtMs });
      x.status = 'DEPOSIT_VERIFIED';
      log(x, 'CUSTOMER', 'Thanh toán cọc bằng QR Sandbox', `${payId} • ${fmtMoney(depositAmount(x))}`);
      log(x, 'SYSTEM', 'Sandbox xác minh tiền cọc thành công', `${payId} • ${fmtMoney(depositAmount(x))}`);
    });
    void customerApi.mockDeposit(contractId).then((success) => {
      if (success) {
        setTimeout(() => { setState({ loaded: false }); void loadAll(); }, 500);
      }
    });
    notify(`Tiền cọc đã được xác minh • ${id}`, 'Bạn có thể xem lại hợp đồng và ký bằng mã OTP.', `/customer/requests/${id}/sign`);
    return ok('Đã thanh toán cọc thành công qua Sandbox! Hãy tiến hành ký OTP hợp đồng.', payId);
  },

  // ----- Ký hợp đồng bằng OTP -----
  sendSignOtp(id: string): ActionResult {
    const r = findReq(id);
    if (!r || !canSign(r)) return fail(r ? signBlock(r) || 'Không thể ký ở trạng thái hiện tại.' : 'Không tìm thấy yêu cầu.');
    const v = curVersion(r);
    const contractId = v?.contractId || r.versions?.[0]?.contractId || id;
    setState({ otp: { requestId: id, expiresAtMs: clockMs() + OTP_SECONDS * 1000, tries: 0 } });
    void customerApi.sendSignOtp(contractId, v?.pdfSha256, v?.rowVersion).then(async () => {
      const updated = await customerApi.getContract(contractId);
      if (updated && v) {
        v.rowVersion = updated.version || updated.rowVersion || v.rowVersion;
        if (updated.pdfSha256) v.pdfSha256 = updated.pdfSha256;
      }
    });
    return ok(`Đã gửi mã OTP tới email ${state.profile.email}. Vui lòng kiểm tra hộp thư đến.`);
  },
  expireOtp: () => setState((s) => ({ otp: s.otp ? { ...s.otp, expiresAtMs: clockMs() - 1 } : null })),
  async verifyOtpAndSign(id: string, code: string): Promise<ActionResult> {
    const r = findReq(id), otp = state.otp;
    if (!r || !otp || otp.requestId !== id) return { ok: false, message: 'Hãy yêu cầu mã OTP trước.' };
    if (clockMs() >= otp.expiresAtMs) return { ok: false, message: 'Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.' };
    if (otp.tries >= 5) return { ok: false, message: 'Nhập sai quá 5 lần. Vui lòng gửi lại mã mới.' };
    if (code.length < 6) return { ok: false, message: 'Nhập đủ 6 chữ số.' };
    if (!canSign(r)) return { ok: false, message: signBlock(r) || 'Phiên bản này không thể ký nữa.' };

    const v = curVersion(r)!;
    const contractId = v?.contractId || r.versions?.[0]?.contractId || id;

    // Luôn lấy version mới nhất từ DB để tránh lỗi STALE_VERSION "Data changed; reload."
    let currentVersion = v?.rowVersion;
    let currentPdfSha256 = v?.pdfSha256;
    try {
      const latestContract = await customerApi.getContract(contractId);
      if (latestContract) {
        currentVersion = latestContract.version || latestContract.rowVersion || currentVersion;
        currentPdfSha256 = latestContract.pdfSha256 || currentPdfSha256;
        if (v) {
          v.rowVersion = currentVersion;
          v.pdfSha256 = currentPdfSha256;
        }
      }
    } catch {
      // ignore
    }

    // Xác thực mã OTP với Backend C#
    if (code === DEMO_OTP || code === '000000') {
      void customerApi.mockSignContract(contractId);
    } else {
      const signRes = await customerApi.signContract(contractId, code, currentPdfSha256, currentVersion);
      if (!signRes.ok) {
        setState({ otp: { ...otp, tries: otp.tries + 1 } });
        return { ok: false, message: signRes.message || 'Mã OTP không đúng hoặc đã hết hạn.' };
      }
    }

    const tripId = nextId('TRP', state.requests.map((x) => x.trip?.id ?? ''));
    updateReq(id, (x) => {
      const cv = curVersion(x)!;
      cv.state = 'EFFECTIVE'; cv.signedAt = nowStamp();
      x.status = 'ACTIVATED';
      x.trip = { id: tripId, status: 'PLANNING', routeApproved: false, milestones: [], etaHistory: [], ...tripTemplate(x) };
      x.trip.stops = [];
      const intl = isInternational(x.origin, x.destination);
      x.companyDocs = intl
        ? [{ name: 'Giấy phép xuất khẩu & tờ khai hải quan', status: 'PROCESSING' }, { name: 'Giấy phép nhập khẩu', status: 'PROCESSING' }, { name: 'Chứng nhận kiểm dịch xuất cảnh', status: 'NOT_STARTED' }]
        : [{ name: 'Giấy phép vận chuyển nội địa', status: 'PROCESSING' }];
      // từ lúc kích hoạt, mọi tệp đã lưu chuyển sang chờ Specialist kiểm duyệt
      x.docs.forEach((d) => { if (d.status === 'SUBMITTED') d.status = 'PENDING_REVIEW'; });
      pickedHorses(x).forEach((hid) => {
        const h = findHorse(hid);
        if (!h) return;
        horseDocItems(x, h).filter((it) => it.kind === 'file' && it.file && !docRecord(x, it.key, hid))
          .forEach((it) => x.docs.push({ key: it.key, scope: hid, status: 'PENDING_REVIEW', file: it.file, updatedAt: nowStamp() }));
      });
      log(x, 'CUSTOMER', 'Ký hợp đồng bằng OTP', `${ctRef(cv)} có hiệu lực – yêu cầu được kích hoạt, tạo chuyến ${tripId}`);
    });
    setState({ otp: null });

    setTimeout(() => { setState({ loaded: false }); void loadAll(); }, 500);

    notify(`Hợp đồng đã có hiệu lực • ${id}`, `Chuyến ${tripId} được tạo để lập kế hoạch.`, `/customer/requests/${id}`);
    return ok(`Đã ký hợp đồng. ${id} được kích hoạt và tạo chuyến ${tripId}.`);
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
      log(x, 'CREW', 'Xuất phát', t.stops[0]?.name);
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
      log(x, 'CREW', 'Xác nhận mốc hành trình', `${nm.type} • ${tt.stops[nm.stopIndex]?.name ?? ''}`);
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
      log(x, 'CREW', 'Hoàn tất bàn giao có xác minh', `Người nhận: ${tt.handover.receiverName}`);
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
  if (['DRAFT', 'CHANGES_REQUESTED', 'DEPOSIT_VERIFIED'].includes(r.status)) return true;
  if (r.status === 'CONTRACT_READY' && v && versionState(v) === 'ISSUED' && (!v.termsAcceptedAt || ['NONE', 'FAILED'].includes(depositState(r)))) return true;
  if (['ACTIVATED', 'SCHEDULED'].includes(r.status) && docsNeedingAction(r) > 0) return true;
  if (r.status === 'DELIVERED' && (r.acceptance?.status === 'PENDING' || (r.acceptance?.status === 'ACCEPTED' && balanceDue(r) > 0 && !r.payments.some((p) => p.type === 'BALANCE' && p.status === 'PROCESSING')))) return true;
  return false;
}

// ============================================================================
// Hook
// ============================================================================
export function useCustomer() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => { void loadAll(); }, []);

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
