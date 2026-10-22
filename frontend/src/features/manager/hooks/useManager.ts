import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type {
  ActionResult,
  ActorRole,
  ActualCost,
  ContractDraft,
  ExtraCost,
  RevisionField,
  Transaction,
  TransportRequest,
  Trip,
} from '../types';
import { managerApi } from '../api/managerApi';
import {
  MANAGER_NAME,
  mockActualCosts,
  mockComplaints,
  mockCustomers,
  mockHorses,
  mockIncidents,
  mockNotifications,
  mockRequests,
  mockStaff,
  mockTransactions,
  mockTrips,
} from '../data/mockData';
import {
  CANCELLABLE,
  addDays,
  addHours,
  arrived,
  closureChecks,
  ctRef,
  curVersion,
  customerOf,
  depositOf,
  depositPaid,
  draftError,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  isReady,
  isSigned,
  milestoneText,
  moneyHeld,
  nextMilestone,
  nowStamp,
  outstanding,
  pendingTx,
  readinessChecks,
  stampToMs,
  clockMs,
  sumItems,
  today,
  tripOfReq,
  versionState,
  type ManagerData,
} from './managerRules';

// ============================================================================
// Store dùng chung cho mọi trang Manager (giữ dữ liệu khi chuyển route)
// ============================================================================
interface ManagerState extends ManagerData {
  loading: boolean;
  loaded: boolean;
  toast: { id: number; message: string } | null;
}

import { getDemoMode } from '../../../shared/context/DemoModeContext';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const DATA_KEYS: Array<keyof ManagerData> = ['customers', 'horses', 'staff', 'requests', 'trips', 'transactions', 'incidents', 'complaints', 'actualCosts', 'notifications'];

const initialDemo = getDemoMode('manager');

let state: ManagerState = {
  customers: initialDemo ? clone(mockCustomers) : [],
  horses: initialDemo ? clone(mockHorses) : [],
  staff: initialDemo ? clone(mockStaff) : [],
  requests: initialDemo ? clone(mockRequests) : [],
  trips: initialDemo ? clone(mockTrips) : [],
  transactions: initialDemo ? clone(mockTransactions) : [],
  incidents: initialDemo ? clone(mockIncidents) : [],
  complaints: initialDemo ? clone(mockComplaints) : [],
  actualCosts: initialDemo ? clone(mockActualCosts) : [],
  notifications: initialDemo ? clone(mockNotifications) : [],
  loading: false,
  loaded: false,
  toast: null,
};
const listeners = new Set<() => void>();
const setState = (patch: Partial<ManagerState> | ((s: ManagerState) => Partial<ManagerState>)) => {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => state;

const toast = (message: string) => setState({ toast: { id: Date.now(), message } });

if (typeof window !== 'undefined') {
  window.addEventListener('rts_demo_mode_change', (event: Event) => {
    const customEvent = event as CustomEvent<{ role: string; enabled: boolean }>;
    if (customEvent.detail && customEvent.detail.role === 'manager') {
      if (customEvent.detail.enabled) {
        setState({
          customers: clone(mockCustomers),
          horses: clone(mockHorses),
          staff: clone(mockStaff),
          requests: clone(mockRequests),
          trips: clone(mockTrips),
          transactions: clone(mockTransactions),
          incidents: clone(mockIncidents),
          complaints: clone(mockComplaints),
          actualCosts: clone(mockActualCosts),
          notifications: clone(mockNotifications),
          loading: false,
          loaded: true,
        });
        toast('Đã bật dữ liệu mẫu & hiển thị nút demo trên toàn hệ thống.');
      } else {
        setState({
          customers: [],
          horses: [],
          staff: [],
          requests: [],
          trips: [],
          transactions: [],
          incidents: [],
          complaints: [],
          actualCosts: [],
          notifications: [],
          loading: false,
          loaded: true,
        });
        toast('Đã tắt dữ liệu mẫu & ẩn nút demo trên toàn hệ thống.');
      }
    }
  });
}
const ok = (message: string, id?: string): ActionResult => { toast(message); return { ok: true, message, id }; };
const fail = (message: string): ActionResult => { toast(message); return { ok: false, message }; };

/** Sửa dữ liệu trên bản sao rồi ghi lại (một lần cập nhật cho mọi danh sách) */
const mutate = (fn: (d: ManagerData) => void) => setState((s) => {
  const d = clone(Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as unknown as ManagerData);
  fn(d);
  return d;
});
const reqIn = (d: ManagerData, id: string) => d.requests.find((r) => r.id === id);
const tripIn = (d: ManagerData, id: string) => d.trips.find((t) => t.id === id);
const actorName = (d: ManagerData, r: TransportRequest, role: ActorRole) =>
  role === 'LOGISTICS_MANAGER' ? MANAGER_NAME : role === 'CUSTOMER' ? customerOf(d, r)?.name ?? 'Khách hàng'
    : role === 'TRANSPORT_SPECIALIST' ? 'Hoang Thu Ha' : role === 'FLEET_COORDINATOR' ? 'Dang Minh Quan' : role === 'CREW' ? 'Tổ xe' : 'Hệ thống';
const log = (d: ManagerData, r: TransportRequest, action: string, detail?: string, role: ActorRole = 'LOGISTICS_MANAGER') =>
  r.history.push({ at: nowStamp(), role, actor: actorName(d, r, role), action, detail });
const nextNum = (ids: string[], prefix: string, min: number) =>
  `${prefix}-${Math.max(min, ...ids.map((x) => Number(x.replace(/\D/g, '')) || 0)) + 1}`;
const nextTx = (d: ManagerData) => nextNum(d.transactions.filter((x) => x.id.startsWith('PAY-') && !x.id.startsWith('PAY-R')).map((x) => x.id), 'PAY', 5200);

/** Hủy đơn: hủy hợp đồng chưa ký, từ chối giao dịch đang chờ, tạo lệnh hoàn tiền nếu đã có tiền */
function cancelInPlace(d: ManagerData, r: TransportRequest, reason: string) {
  r.status = 'CANCELLED';
  r.reason = reason;
  const v = curVersion(r);
  if (v && !v.signedAt) v.state = 'VOID';
  d.transactions.filter((x) => x.requestId === r.id && ['PENDING_CONFIRMATION', 'PROCESSING'].includes(x.status) && x.type !== 'REFUND')
    .forEach((x) => { x.status = 'REJECTED'; x.rejectReason = 'Yêu cầu đã hủy – đối soát và hoàn trả nếu tiền đã về.'; });
  const held = moneyHeld(d, r);
  if (held > 0) {
    const id = `PAY-R${r.id.slice(4)}`;
    d.transactions.push({ id, requestId: r.id, type: 'REFUND', method: 'BANK_TRANSFER', amount: held, status: 'PENDING_CONFIRMATION', createdAt: nowStamp(), ref: `Hoàn tiền ${r.id}` });
    log(d, r, 'Tạo lệnh hoàn tiền', `${id} • ${fmtMoney(held)}`);
  }
}

async function loadAll() {
  if (state.loading || state.loaded) return;
  setState({ loading: true });
  const [customers, horses, staff, requests, trips, transactions, incidents, complaints, actualCosts, notifications] = await Promise.all([
    managerApi.getCustomers(), managerApi.getHorses(), managerApi.getStaff(), managerApi.getRequests(), managerApi.getTrips(),
    managerApi.getTransactions(), managerApi.getIncidents(), managerApi.getComplaints(), managerApi.getActualCosts(), managerApi.getNotifications(),
  ]);
  if (!getDemoMode('manager')) {
    setState({
      customers: [], horses: [], staff: [], requests: [], trips: [], transactions: [], incidents: [], complaints: [], actualCosts: [], notifications: [],
      loading: false, loaded: true,
    });
    return;
  }
  setState({ customers, horses, staff, requests, trips, transactions, incidents, complaints, actualCosts, notifications, loading: false, loaded: true });
}

// ============================================================================
// Hành động của Logistics Manager
// ============================================================================
const managerActions = {
  reload: () => { setState({ loaded: false }); void loadAll(); },
  clearToast: () => setState({ toast: null }),
  showToast: (m: string) => toast(m),
  markAllRead: () => mutate((d) => d.notifications.forEach((n) => { n.read = true; })),
  markRead: (id: string) => mutate((d) => { const n = d.notifications.find((x) => x.id === id); if (n) n.read = true; }),

  // ----- Xét duyệt yêu cầu -----
  acceptRequest(id: string): ActionResult {
    const r = reqIn(state, id);
    if (!r || r.status !== 'PENDING_REVIEW') return fail('Chỉ chấp thuận được yêu cầu đang chờ xét duyệt.');
    mutate((d) => { const x = reqIn(d, id)!; x.status = 'CONTRACT_PREPARATION'; x.feedback = undefined; log(d, x, 'Chấp nhận yêu cầu', 'Mở bước soạn hợp đồng'); });
    void managerApi.acceptRequest(id);
    return ok(`Đã chấp thuận ${id}. Bước Hợp đồng & giá đã mở.`);
  },
  requestRevision(id: string, feedback: string, fields: RevisionField[]): ActionResult {
    const r = reqIn(state, id);
    if (!r || r.status !== 'PENDING_REVIEW') return fail('Chỉ yêu cầu chỉnh sửa được đơn đang chờ xét duyệt.');
    if (feedback.trim().length < 10) return fail('Nhập góp ý cho khách hàng (ít nhất 10 ký tự).');
    if (!fields.length) return fail('Chọn ít nhất một mục khách hàng cần sửa.');
    mutate((d) => {
      const x = reqIn(d, id)!;
      x.status = 'CHANGES_REQUESTED'; x.feedback = feedback.trim(); x.revisionFields = fields;
      log(d, x, 'Yêu cầu chỉnh sửa', feedback.trim());
    });
    void managerApi.requestRevision(id, { feedback, fields });
    return ok(`Đã gửi yêu cầu chỉnh sửa ${id} cho khách hàng.`);
  },
  rejectRequest(id: string, reason: string): ActionResult {
    const r = reqIn(state, id);
    if (!r || !['PENDING_REVIEW', 'CHANGES_REQUESTED'].includes(r.status)) return fail('Chỉ từ chối được yêu cầu chưa được chấp thuận.');
    if (reason.trim().length < 10) return fail('Nhập lý do từ chối (ít nhất 10 ký tự).');
    mutate((d) => { const x = reqIn(d, id)!; x.status = 'REJECTED'; x.reason = reason.trim(); log(d, x, 'Từ chối yêu cầu', reason.trim()); });
    void managerApi.rejectRequest(id, reason);
    return ok(`Đã từ chối ${id}.`);
  },
  cancelRequest(id: string, reason: string): ActionResult {
    const r = reqIn(state, id);
    if (!r || !CANCELLABLE.includes(r.status)) return fail('Chỉ hủy được yêu cầu chưa kích hoạt (trước khi khách ký OTP).');
    if (reason.trim().length < 10) return fail('Nhập lý do hủy (ít nhất 10 ký tự).');
    mutate((d) => { const x = reqIn(d, id)!; log(d, x, 'Hủy yêu cầu', reason.trim()); cancelInPlace(d, x, reason.trim()); });
    void managerApi.cancelRequest(id, reason);
    return ok(`Đã hủy ${id}.${moneyHeld(state, r) > 0 ? ' Lệnh hoàn tiền được tạo tại Tiền cọc & thanh toán.' : ''}`);
  },
  decideCancellation(id: string, approve: boolean, note: string): ActionResult {
    const r = reqIn(state, id);
    if (!r || r.status !== 'CANCELLATION_REQUESTED' || !r.cancellation) return fail('Yêu cầu không ở trạng thái chờ duyệt hủy.');
    if (note.trim().length < 5) return fail('Nhập ghi chú quyết định (ít nhất 5 ký tự).');
    mutate((d) => {
      const x = reqIn(d, id)!, c = x.cancellation!;
      c.status = approve ? 'APPROVED' : 'REFUSED'; c.decidedAt = nowStamp(); c.decisionNote = note.trim();
      if (approve) { log(d, x, 'Duyệt yêu cầu hủy', note.trim()); cancelInPlace(d, x, `Khách hàng hủy: ${c.reason}`); }
      else { x.status = c.prevStatus ?? 'CONTRACT_READY'; log(d, x, 'Từ chối yêu cầu hủy', note.trim()); }
    });
    void managerApi.decideCancellation(id, { approve, note });
    return ok(approve ? `Đã duyệt hủy ${id}.` : `Đã từ chối yêu cầu hủy – ${id} tiếp tục quy trình.`);
  },
  closeRequest(id: string): ActionResult {
    const r = reqIn(state, id);
    if (!r || r.status !== 'DELIVERED') return fail('Chỉ đóng được yêu cầu đã bàn giao.');
    const miss = closureChecks(state, r).filter((c) => !c[1]);
    if (miss.length) return fail(`Chưa đủ điều kiện đóng: ${miss[0][0]}.`);
    mutate((d) => {
      const x = reqIn(d, id)!;
      x.status = 'CLOSED'; x.closedAt = nowStamp();
      const v = x.versions.find((y) => y.signedAt); if (v) v.state = 'FULFILLED';
      log(d, x, 'Đóng yêu cầu', 'Đủ mọi điều kiện đóng – hợp đồng đã hoàn thành');
    });
    void managerApi.closeRequest(id);
    return ok(`Đã đóng ${id}.`);
  },
  addCollectionNote(id: string, note: string): ActionResult {
    if (note.trim().length < 10) return fail('Nhập nội dung theo dõi công nợ (ít nhất 10 ký tự).');
    mutate((d) => { const x = reqIn(d, id)!; x.collection.push({ at: nowStamp(), note: note.trim(), by: MANAGER_NAME }); log(d, x, 'Ghi nhận theo dõi công nợ', note.trim()); });
    void managerApi.addCollectionNote(id, note);
    return ok('Đã ghi nhận theo dõi công nợ.');
  },

  // ----- Hợp đồng -----
  saveDraft(id: string, draft: ContractDraft): ActionResult {
    mutate((d) => { const x = reqIn(d, id)!; x.draft = { ...clone(draft), savedAt: nowStamp() }; });
    void managerApi.saveContractDraft(id, draft);
    return ok('Đã lưu bản nháp hợp đồng.');
  },
  discardDraft(id: string) { mutate((d) => { reqIn(d, id)!.draft = undefined; }); },
  issueContract(id: string, draft: ContractDraft, responseText = ''): ActionResult {
    const r = reqIn(state, id);
    if (!r || !['CONTRACT_PREPARATION', 'CONTRACT_READY', 'CONTRACT_CHANGES_REQUESTED'].includes(r.status)) return fail('Yêu cầu không ở bước soạn hợp đồng.');
    if (isSigned(r)) return fail('Hợp đồng đã ký OTP được khóa hoàn toàn.');
    if (depositPaid(state, r)) return fail('Khách đã có tiền cọc được xác minh cho phiên bản hiện hành – không phát hành lại.');
    const err = draftError(draft);
    if (err) return fail(err);
    const prev = curVersion(r);
    const v = (prev?.v ?? 0) + 1;
    mutate((d) => {
      const x = reqIn(d, id)!, p = curVersion(x), at = nowStamp();
      if (p) {
        if (p.change && !p.change.response) {
          p.change.response = { at, text: responseText.trim() || `Đồng ý điều chỉnh – phát hành phiên bản v${v}.`, decision: 'REVISED' };
          if (p.change.proposedDate) x.date = p.change.proposedDate;
        }
        p.state = 'SUPERSEDED';
      }
      x.versions.push({
        v, number: `CT-${id.slice(4)}`, issuedAt: at, validUntil: addHours(at, 24), mode: draft.mode, departAt: draft.departAt, arriveAt: draft.arriveAt,
        items: clone(draft.items).map((i) => ({ ...i, amount: Number(i.amount) })), total: sumItems(draft.items), depositPct: Number(draft.depositPct),
        terms: clone(draft.terms), note: draft.note.trim() || undefined, budget: clone(draft.budget), exception: draft.exception.trim() || undefined,
        state: 'ISSUED', extensions: [],
      });
      x.status = 'CONTRACT_READY'; x.draft = undefined;
      log(d, x, v > 1 ? 'Phát hành hợp đồng sửa đổi' : 'Phát hành hợp đồng', `CT-${id.slice(4)} v${v} • ${fmtMoney(sumItems(draft.items))} • cọc ${draft.depositPct}%`);
    });
    void managerApi.issueContract(id, draft);
    return ok(`Đã phát hành CT-${id.slice(4)} v${v}. Khách hàng có 24 giờ để thanh toán cọc và ký OTP.`);
  },
  respondChange(id: string, decision: 'KEPT' | 'RETURNED', text: string): ActionResult {
    const r = reqIn(state, id), v = r && curVersion(r);
    if (!r || !v || r.status !== 'CONTRACT_CHANGES_REQUESTED' || !v.change || v.change.response) return fail('Không có yêu cầu sửa hợp đồng đang chờ phản hồi.');
    if (text.trim().length < 10) return fail('Nhập phản hồi cho khách hàng (ít nhất 10 ký tự).');
    mutate((d) => {
      const x = reqIn(d, id)!, y = curVersion(x)!, at = nowStamp();
      y.change!.response = { at, text: text.trim(), decision };
      if (decision === 'KEPT') {
        y.state = 'ISSUED'; y.extensions.push({ at, from: y.validUntil, to: addHours(at, 24) }); y.validUntil = addHours(at, 24);
        x.status = 'CONTRACT_READY';
        log(d, x, 'Từ chối sửa – giữ phiên bản', `${ctRef(y)} • hạn chung mới ${fmtDateTime(y.validUntil)}`);
      } else {
        y.state = 'SUPERSEDED'; x.status = 'CHANGES_REQUESTED'; x.feedback = text.trim(); x.revisionFields = ['date', 'notes'];
        log(d, x, 'Trả yêu cầu về cho khách chỉnh sửa', text.trim());
      }
    });
    void managerApi.respondContractChange(id, { decision, text });
    return ok(decision === 'KEPT' ? 'Đã phản hồi và giữ nguyên phiên bản hợp đồng (hạn chung 24 giờ mới).' : 'Đã trả yêu cầu về cho khách hàng chỉnh sửa.');
  },
  extendContract(id: string): ActionResult {
    const r = reqIn(state, id), v = r && curVersion(r);
    if (!r || !v || v.signedAt || !['ISSUED', 'EXPIRED'].includes(versionState(v)) || !['CONTRACT_READY', 'DEPOSIT_VERIFIED'].includes(r.status)) return fail('Chỉ gia hạn được hợp đồng đã phát hành, chưa ký.');
    mutate((d) => {
      const x = reqIn(d, id)!, y = curVersion(x)!, base = Math.max(stampToMs(y.validUntil), clockMs());
      const to = addHours(nowStamp(), (base - clockMs()) / 3600000 + 24);
      y.extensions.push({ at: nowStamp(), from: y.validUntil, to }); y.validUntil = to; y.state = 'ISSUED';
      log(d, x, 'Gia hạn hạn chung 24 giờ', `Đến ${fmtDateTime(to)}`);
    });
    void managerApi.extendContract(id);
    return ok(`Đã gia hạn ${id} thêm 24 giờ.`);
  },
  remindSign(id: string): ActionResult {
    const r = reqIn(state, id);
    if (!r) return fail('Không tìm thấy yêu cầu.');
    mutate((d) => log(d, reqIn(d, id)!, 'Nhắc khách hoàn tất cọc & ký OTP'));
    void managerApi.remindSign(id);
    return ok(`Đã gửi nhắc nhở tới ${customerOf(state, r)?.email}.`);
  },

  // ----- Thanh toán -----
  verifyTransaction(txId: string): ActionResult {
    const x = state.transactions.find((t) => t.id === txId);
    if (!x || x.status !== 'PENDING_CONFIRMATION' || x.method !== 'BANK_TRANSFER' || x.type === 'REFUND') return fail('Chỉ xác minh được chuyển khoản đang chờ.');
    const r = reqIn(state, x.requestId)!;
    if (['CANCELLED', 'REJECTED'].includes(r.status)) return fail('Yêu cầu đã hủy – không xác minh, hãy từ chối và hoàn trả.');
    mutate((d) => {
      const t = d.transactions.find((y) => y.id === txId)!, rr = reqIn(d, t.requestId)!;
      t.status = 'SUCCESS'; t.confirmedAt = nowStamp();
      log(d, rr, `Xác minh ${t.type === 'DEPOSIT' ? 'tiền cọc' : 'số dư'} (chuyển khoản)`, `${t.id} • ${fmtMoney(t.amount)}`);
      if (t.type === 'DEPOSIT' && rr.status === 'CONTRACT_READY' && depositPaid(d, rr)) rr.status = 'DEPOSIT_VERIFIED';
    });
    void managerApi.verifyTransaction(txId);
    return ok(`Đã xác minh ${txId}.${x.type === 'DEPOSIT' ? ' Khách hàng có thể ký OTP.' : ''}`);
  },
  rejectTransaction(txId: string, reason: string): ActionResult {
    const x = state.transactions.find((t) => t.id === txId);
    if (!x || x.status !== 'PENDING_CONFIRMATION' || x.type === 'REFUND') return fail('Giao dịch không ở trạng thái chờ xác minh.');
    if (reason.trim().length < 10) return fail('Nhập lý do từ chối (ít nhất 10 ký tự).');
    mutate((d) => {
      const t = d.transactions.find((y) => y.id === txId)!;
      t.status = 'REJECTED'; t.rejectReason = reason.trim();
      log(d, reqIn(d, t.requestId)!, 'Từ chối chứng từ thanh toán', `${t.id} • ${reason.trim()}`);
    });
    void managerApi.rejectTransaction(txId, reason);
    return ok(`Đã từ chối ${txId}. Khách hàng được thông báo để chuyển lại.`);
  },
  confirmRefund(txId: string): ActionResult {
    const x = state.transactions.find((t) => t.id === txId);
    if (!x || x.type !== 'REFUND' || x.status !== 'PENDING_CONFIRMATION') return fail('Không có lệnh hoàn tiền đang chờ.');
    mutate((d) => {
      const t = d.transactions.find((y) => y.id === txId)!;
      t.status = 'SUCCESS'; t.confirmedAt = nowStamp();
      log(d, reqIn(d, t.requestId)!, 'Xác nhận đã hoàn tiền', `${t.id} • ${fmtMoney(t.amount)}`);
    });
    void managerApi.confirmRefund(txId);
    return ok(`Đã ghi nhận hoàn tiền ${txId}.`);
  },

  // ----- Chuyến đi -----
  confirmDeployment(tripId: string, specialistId: string, coordinatorId: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t || t.status !== 'PLANNING' || t.deployment.status !== 'NOT_CONFIRMED') return fail('Chuyến không ở trạng thái chờ phân công.');
    if (!specialistId || !coordinatorId) return fail('Chọn một Transport Specialist và một Fleet Coordinator.');
    mutate((d) => {
      const x = tripIn(d, tripId)!;
      x.deployment = { status: 'CONFIRMED', specialistId, coordinatorId, at: nowStamp() };
      d.staff.filter((s) => [specialistId, coordinatorId].includes(s.id)).forEach((s) => { s.load += 1; });
      log(d, reqIn(d, x.requestId)!, 'Phân công chuyến', `${tripId} → ${d.staff.find((s) => s.id === specialistId)?.name}, ${d.staff.find((s) => s.id === coordinatorId)?.name}`);
    });
    void managerApi.deployTrip(tripId, { specialistId, coordinatorId });
    return ok(`Đã phân công ${tripId}. Specialist và Coordinator bắt đầu chuẩn bị.`);
  },
  holdTrip(tripId: string, reason: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t || t.status !== 'PLANNING' || t.deployment.status === 'ON_HOLD') return fail('Chỉ tạm dừng được chuyến đang chuẩn bị.');
    if (reason.trim().length < 10) return fail('Nhập lý do tạm dừng (ít nhất 10 ký tự).');
    mutate((d) => { const x = tripIn(d, tripId)!; x.deployment.status = 'ON_HOLD'; x.deployment.holdReason = reason.trim(); log(d, reqIn(d, x.requestId)!, 'Tạm dừng chuẩn bị chuyến', reason.trim()); });
    void managerApi.holdTrip(tripId, reason);
    return ok(`Đã tạm dừng ${tripId}.`);
  },
  resumeTrip(tripId: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t || t.deployment.status !== 'ON_HOLD') return fail('Chuyến không bị tạm dừng.');
    mutate((d) => {
      const x = tripIn(d, tripId)!;
      x.deployment.status = x.deployment.specialistId && x.deployment.coordinatorId ? 'CONFIRMED' : 'NOT_CONFIRMED'; x.deployment.holdReason = undefined;
      log(d, reqIn(d, x.requestId)!, 'Tiếp tục chuẩn bị chuyến', tripId);
    });
    void managerApi.resumeTrip(tripId);
    return ok(`${tripId} tiếp tục chuẩn bị.`);
  },
  approveRoute(tripId: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t?.route || t.route.status !== 'PENDING_APPROVAL') return fail('Không có phương án tuyến chờ duyệt.');
    if (t.deployment.status !== 'CONFIRMED') return fail('Chuyến chưa được phân công hoặc đang tạm dừng.');
    if (!t.route.resourcesConfirmed) return fail('Coordinator chưa xác nhận bố trí xe và nhân sự.');
    mutate((d) => { const x = tripIn(d, tripId)!; x.route!.status = 'APPROVED'; x.route!.decidedAt = nowStamp(); log(d, reqIn(d, x.requestId)!, `Duyệt phương án tuyến v${x.route!.v}`, tripId); });
    void managerApi.decideRoute(tripId, { approve: true });
    return ok(`Đã duyệt phương án tuyến v${t.route.v} của ${tripId}.`);
  },
  returnRoute(tripId: string, reason: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t?.route || t.route.status !== 'PENDING_APPROVAL') return fail('Không có phương án tuyến chờ duyệt.');
    if (reason.trim().length < 10) return fail('Nhập lý do yêu cầu làm lại (ít nhất 10 ký tự).');
    mutate((d) => {
      const x = tripIn(d, tripId)!;
      x.route!.status = 'CHANGES_REQUESTED'; x.route!.decisionNote = reason.trim(); x.route!.decidedAt = nowStamp();
      log(d, reqIn(d, x.requestId)!, `Yêu cầu làm lại tuyến v${x.route!.v}`, reason.trim());
    });
    void managerApi.decideRoute(tripId, { approve: false, reason });
    return ok(`Đã trả phương án tuyến về Coordinator.`);
  },
  decideFlight(tripId: string, approve: boolean, note = ''): ActionResult {
    const t = tripIn(state, tripId);
    if (!t?.flight || t.flight.status !== 'BUDGET_PENDING') return fail('Không có ngân sách chuyến bay chờ duyệt.');
    if (!approve && note.trim().length < 10) return fail('Nhập lý do từ chối ngân sách (ít nhất 10 ký tự).');
    mutate((d) => {
      const x = tripIn(d, tripId)!;
      x.flight!.status = approve ? 'APPROVED' : 'REJECTED'; x.flight!.decidedAt = nowStamp();
      log(d, reqIn(d, x.requestId)!, approve ? 'Duyệt ngân sách chuyến bay' : 'Từ chối ngân sách chuyến bay', `${x.flight!.airline} ${x.flight!.flightNo} • ${fmtMoney(x.flight!.budget)}${note ? ` • ${note.trim()}` : ''}`);
    });
    void managerApi.decideFlight(tripId, { approve, note });
    return ok(approve ? 'Đã duyệt ngân sách. Coordinator tiến hành đặt chỗ.' : 'Đã từ chối ngân sách chuyến bay.');
  },
  approveDeparture(tripId: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t || t.status !== 'PLANNING') return fail('Chuyến không ở giai đoạn chuẩn bị.');
    const miss = readinessChecks(t).filter((c) => !c.ok);
    if (miss.length) return fail(`Chưa đủ điều kiện: ${miss[0].label}.`);
    mutate((d) => {
      const x = tripIn(d, tripId)!, r = reqIn(d, x.requestId)!;
      x.status = 'READY_TO_DEPART'; x.departureApprovedAt = nowStamp(); r.status = 'SCHEDULED';
      log(d, r, 'Duyệt khởi hành', `${tripId} • khởi hành ${fmtDateTime(x.plannedDepart)}`);
    });
    void managerApi.approveDeparture(tripId);
    return ok(`Đã duyệt khởi hành ${tripId}. Tài xế xác nhận khi thực tế xuất phát.`);
  },
  resolveRefusal(tripId: string, resolution: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t?.refusal || t.refusal.resolvedAt) return fail('Không có lần từ chối bàn giao cần xử lý.');
    if (resolution.trim().length < 10) return fail('Nhập quyết định xử lý (ít nhất 10 ký tự).');
    mutate((d) => {
      const x = tripIn(d, tripId)!;
      x.refusal!.resolution = resolution.trim(); x.refusal!.resolvedAt = nowStamp();
      log(d, reqIn(d, x.requestId)!, 'Manager xử lý từ chối bàn giao', resolution.trim());
    });
    void managerApi.resolveHandover(tripId, { resolution });
    return ok('Đã ghi quyết định. Tổ xe được phép bàn giao lại.');
  },
  saveActualCosts(tripId: string, costs: ActualCost['costs'], extra: ExtraCost[]): ActionResult {
    if (Object.values(costs).some((v) => !(v >= 0)) || extra.some((e) => !e.label.trim() || !(e.amount > 0))) return fail('Chi phí phải là số không âm; khoản phát sinh cần tên và số tiền.');
    mutate((d) => {
      const rec: ActualCost = { tripId, costs: clone(costs), extra: clone(extra), enteredAt: nowStamp() };
      const i = d.actualCosts.findIndex((a) => a.tripId === tripId);
      if (i >= 0) d.actualCosts[i] = rec; else d.actualCosts.push(rec);
    });
    void managerApi.saveActualCosts(tripId, { costs, extra });
    return ok(`Đã lưu chi phí thực tế ${tripId}.`);
  },

  // ----- Sự cố -----
  ackIncident(id: string): ActionResult {
    const i = state.incidents.find((x) => x.id === id);
    if (!i || i.status !== 'NEW') return fail('Sự cố không ở trạng thái mới.');
    mutate((d) => { const x = d.incidents.find((y) => y.id === id)!; x.status = 'IN_PROGRESS'; x.log.push([nowStamp(), `${MANAGER_NAME} tiếp nhận xử lý`]); });
    void managerApi.setIncidentStatus(id, 'IN_PROGRESS');
    return ok(`${id} chuyển sang Đang xử lý.`);
  },
  decidePlan(id: string, planId: string, approve: boolean, note: string): ActionResult {
    const i = state.incidents.find((x) => x.id === id), p = i?.plans.find((x) => x.id === planId);
    if (!i || !p || p.status !== 'PENDING_APPROVAL') return fail('Phương án không còn chờ quyết định.');
    if (!approve && note.trim().length < 10) return fail('Nhập lý do từ chối phương án (ít nhất 10 ký tự).');
    mutate((d) => {
      const x = d.incidents.find((y) => y.id === id)!, pp = x.plans.find((y) => y.id === planId)!;
      pp.status = approve ? 'APPROVED' : 'REJECTED'; pp.decisionNote = note.trim() || undefined;
      if (x.status === 'NEW') x.status = 'IN_PROGRESS';
      x.log.push([nowStamp(), `${MANAGER_NAME} ${approve ? 'duyệt' : 'từ chối'} ${planId}${note.trim() ? ` – ${note.trim()}` : ''}`]);
      if (approve && pp.cost > 0 && pp.payer === 'COMPANY') {
        const a = d.actualCosts.find((y) => y.tripId === x.tripId);
        if (a) a.extra.push({ label: `${x.id} • ${pp.kind}`, amount: pp.cost, payer: 'COMPANY' });
      }
    });
    void managerApi.decidePlan(id, planId, { approve, note });
    return ok(approve ? `Đã duyệt ${planId}.` : `Đã từ chối ${planId}.`);
  },
  closeIncident(id: string): ActionResult {
    const i = state.incidents.find((x) => x.id === id);
    if (!i || i.status === 'CLOSED') return fail('Sự cố đã đóng.');
    if (i.plans.some((p) => p.status === 'PENDING_APPROVAL')) return fail('Còn phương án chờ quyết định – duyệt hoặc từ chối trước khi đóng.');
    mutate((d) => { const x = d.incidents.find((y) => y.id === id)!; x.status = 'CLOSED'; x.log.push([nowStamp(), `${MANAGER_NAME} đóng sự cố`]); });
    void managerApi.setIncidentStatus(id, 'CLOSED');
    return ok(`Đã đóng ${id}.`);
  },

  // ----- Khiếu nại -----
  replyComplaint(id: string, text: string, propose: boolean, amount: number): ActionResult {
    const c = state.complaints.find((x) => x.id === id);
    if (!c || c.status === 'RESOLVED') return fail('Khiếu nại đã giải quyết.');
    if (text.trim().length < 10) return fail('Nhập phản hồi cho khách hàng (ít nhất 10 ký tự).');
    if (amount < 0) return fail('Số tiền bồi thường không được âm.');
    mutate((d) => {
      const x = d.complaints.find((y) => y.id === id)!;
      x.messages.push({ from: 'MANAGER', name: MANAGER_NAME, at: nowStamp(), text: text.trim() });
      if (propose) { x.status = 'PROPOSED'; x.resolution = { proposal: text.trim(), amount }; } else if (x.status === 'NEW') x.status = 'IN_PROGRESS';
      log(d, reqIn(d, x.requestId)!, propose ? 'Đề xuất giải quyết khiếu nại' : 'Phản hồi khiếu nại', `${id}${propose && amount ? ` • bồi thường ${fmtMoney(amount)}` : ''}`);
    });
    void managerApi.replyComplaint(id, { text, propose, amount });
    return ok(propose ? 'Đã gửi đề xuất – chờ khách hàng xác nhận.' : 'Đã gửi phản hồi cho khách hàng.');
  },
  recordResolution(id: string, text: string): ActionResult {
    const c = state.complaints.find((x) => x.id === id);
    if (!c || c.status === 'RESOLVED') return fail('Khiếu nại đã giải quyết.');
    if (text.trim().length < 10) return fail('Ghi rõ kết quả đã thống nhất và bằng chứng (ít nhất 10 ký tự).');
    mutate((d) => {
      const x = d.complaints.find((y) => y.id === id)!;
      x.status = 'RESOLVED'; x.resolvedAt = nowStamp(); x.resolution = { proposal: text.trim(), amount: x.resolution?.amount ?? 0 };
      log(d, reqIn(d, x.requestId)!, 'Ghi nhận kết quả giải quyết khiếu nại', `${id} • ${text.trim()}`);
    });
    void managerApi.resolveComplaint(id, { text });
    return ok(`Đã ghi nhận ${id} được giải quyết.`);
  },
  escalateComplaint(id: string): ActionResult {
    const c = state.complaints.find((x) => x.id === id);
    if (!c || !['NEW', 'IN_PROGRESS'].includes(c.status)) return fail('Chỉ chuyển cấp được khiếu nại đang xử lý.');
    mutate((d) => { const x = d.complaints.find((y) => y.id === id)!; x.status = 'ESCALATED'; log(d, reqIn(d, x.requestId)!, 'Chuyển khiếu nại lên cấp trên', id); });
    void managerApi.escalateComplaint(id);
    return ok(`Đã chuyển ${id} lên Ban giám đốc.`);
  },
};

// ============================================================================
// Nút demo: giả lập thao tác của khách hàng, Specialist, Coordinator, tổ xe, cổng thanh toán.
// Không nút nào thay thế quyết định chính thức của Manager.
// ============================================================================
function createTrip(d: ManagerData, r: TransportRequest): Trip {
  const v = curVersion(r)!, intl = r.origin !== r.destination && v.mode === 'AIR';
  const t: Trip = {
    id: nextNum(d.trips.map((x) => x.id), 'TRP', 907), requestId: r.id, mode: v.mode, status: 'PLANNING', deployment: { status: 'NOT_CONFIRMED' },
    plannedDepart: v.departAt, eta: v.arriveAt,
    readiness: { docsReady: 0, docsTotal: (intl ? 4 : 3) + r.horses.length * (intl ? 4 : 2), insurance: 'MISSING', quarantineOk: !intl },
    milestones: [], etaHistory: [],
  };
  d.trips.push(t);
  return t;
}

const demoActions = {
  customerSubmitRequest(): ActionResult {
    let id = '';
    mutate((d) => {
      id = nextNum(d.requests.map((r) => r.id), 'TRN', 8948);
      const date = addDays(today(), 14);
      d.requests.unshift({
        id, customerId: 'CUS-002', origin: 'Ho Chi Minh City', destination: 'Hanoi', date, status: 'PENDING_REVIEW', horses: ['HOR-2003'],
        pickup: { name: 'Phu Tho Racecourse Stables', address: '2 Lê Đại Hành, Quận 11', contact: 'Nguyen Hoai Nam', phone: '+84 91 5550 0222' },
        delivery: { name: 'Soc Son Stud Farm', address: 'Xã Minh Phú, Sóc Sơn', contact: 'Tran Van Phuc', phone: '+84 98 5550 0333' },
        careNotes: 'Cho ăn cỏ khô mỗi 3 giờ.', submittedAt: nowStamp(), versions: [], collection: [], history: [],
        dossier: ['Hộ chiếu ngựa', 'Giấy chứng nhận quyền sở hữu', 'Sổ tiêm phòng cúm ngựa', 'Giấy chứng nhận sức khỏe'].map((name) => ({ name, scope: 'HOR-2003', status: 'PENDING_REVIEW' as const, file: `silver-moon-${name.length}.pdf` })),
      });
      const r = d.requests[0];
      log(d, r, 'Gửi yêu cầu vận chuyển', `Ho Chi Minh City → Hanoi • ngày ${fmtDate(date)}`, 'CUSTOMER');
    });
    return ok(`Demo: khách hàng gửi yêu cầu ${id}.`, id);
  },
  customerResubmit(id: string): ActionResult {
    const r = reqIn(state, id);
    if (!r || r.status !== 'CHANGES_REQUESTED') return fail('Demo: yêu cầu không chờ khách chỉnh sửa.');
    mutate((d) => {
      const x = reqIn(d, id)!;
      if (x.revisionFields?.includes('date')) x.date = addDays(today(), 10);
      if (x.revisionFields?.includes('notes')) x.careNotes = 'Ngựa dị ứng phấn hoa: dùng cỏ khô đã rửa, khoang có lọc bụi.';
      x.status = 'PENDING_REVIEW'; x.submittedAt = nowStamp();
      log(d, x, 'Gửi lại yêu cầu sau chỉnh sửa', (x.revisionFields ?? []).join(', '), 'CUSTOMER');
    });
    return ok(`Demo: khách hàng gửi lại ${id}.`);
  },
  customerAcceptTerms(id: string): ActionResult {
    const r = reqIn(state, id), v = r && curVersion(r);
    if (!r || !v || r.status !== 'CONTRACT_READY' || versionState(v) !== 'ISSUED' || v.termsAcceptedAt) return fail('Demo: hợp đồng không chờ khách đồng ý điều khoản.');
    mutate((d) => { const x = reqIn(d, id)!, y = curVersion(x)!; y.termsAcceptedAt = nowStamp(); log(d, x, 'Đồng ý điều khoản hợp đồng', ctRef(y), 'CUSTOMER'); });
    return ok(`Demo: khách hàng đồng ý điều khoản ${id}.`);
  },
  customerPayBank(id: string): ActionResult {
    const r = reqIn(state, id), v = r && curVersion(r);
    if (!r || !v || r.status !== 'CONTRACT_READY' || !v.termsAcceptedAt || versionState(v) !== 'ISSUED') return fail('Demo: khách cần đồng ý điều khoản trong hạn chung trước khi chuyển cọc.');
    if (pendingTx(state, r) || depositPaid(state, r)) return fail('Demo: đã có giao dịch cọc.');
    let txId = '';
    mutate((d) => {
      const x = reqIn(d, id)!; txId = nextTx(d);
      const tx: Transaction = { id: txId, requestId: id, type: 'DEPOSIT', method: 'BANK_TRANSFER', amount: depositOf(x), status: 'PENDING_CONFIRMATION', createdAt: nowStamp(), ref: `VCB ${Date.now().toString().slice(-10)}`, receipt: `uy-nhiem-chi-${id.slice(4)}.pdf` };
      d.transactions.push(tx);
      log(d, x, 'Báo đã chuyển khoản tiền cọc', `${txId} • ${fmtMoney(tx.amount)}`, 'CUSTOMER');
    });
    return ok(`Demo: khách chuyển khoản cọc ${txId} – chờ Manager xác minh.`, txId);
  },
  gatewayConfirm(txId: string): ActionResult {
    const x = state.transactions.find((t) => t.id === txId);
    if (!x || x.status !== 'PROCESSING') return fail('Demo: giao dịch không ở trạng thái cổng đang xử lý.');
    mutate((d) => {
      const t = d.transactions.find((y) => y.id === txId)!, r = reqIn(d, t.requestId)!;
      t.status = 'SUCCESS'; t.confirmedAt = nowStamp();
      log(d, r, 'Cổng thanh toán xác nhận giao dịch', `${t.id} • ${fmtMoney(t.amount)}`, 'SYSTEM');
      if (t.type === 'DEPOSIT' && r.status === 'CONTRACT_READY' && depositPaid(d, r)) r.status = 'DEPOSIT_VERIFIED';
    });
    return ok(`Demo: cổng thanh toán xác nhận ${txId}.`);
  },
  customerSign(id: string): ActionResult {
    const r = reqIn(state, id), v = r && curVersion(r);
    if (!r || !v || r.status !== 'DEPOSIT_VERIFIED') return fail('Demo: chỉ ký OTP được khi tiền cọc đã xác minh.');
    if (versionState(v) !== 'ISSUED') return fail('Demo: hợp đồng đã quá hạn chung – Manager cần gia hạn trước.');
    let tripId = '';
    mutate((d) => {
      const x = reqIn(d, id)!, y = curVersion(x)!;
      y.signedAt = nowStamp(); y.state = 'EFFECTIVE'; x.status = 'ACTIVATED';
      tripId = createTrip(d, x).id;
      log(d, x, 'Ký hợp đồng bằng OTP', `${ctRef(y)} – yêu cầu được kích hoạt, tạo ${tripId}`, 'CUSTOMER');
    });
    return ok(`Demo: khách ký OTP ${id}. Hệ thống tạo ${tripId} – chờ Manager phân công.`, tripId);
  },
  customerRequestChange(id: string): ActionResult {
    const r = reqIn(state, id), v = r && curVersion(r);
    if (!r || !v || r.status !== 'CONTRACT_READY' || versionState(v) !== 'ISSUED' || depositPaid(state, r)) return fail('Demo: chỉ yêu cầu sửa được hợp đồng đang hiệu lực, chưa có cọc.');
    mutate((d) => {
      const x = reqIn(d, id)!, y = curVersion(x)!;
      y.state = 'CHANGES_REQUESTED';
      y.change = { at: nowStamp(), text: 'Đề nghị dời ngày vận chuyển thêm 3 ngày và giảm 5% cước vì đặt nhiều chuyến trong quý.', proposedDate: addDays(x.date, 3), commercial: 'Giảm 5% cước vận chuyển' };
      x.status = 'CONTRACT_CHANGES_REQUESTED';
      log(d, x, 'Yêu cầu sửa hợp đồng', y.change.text, 'CUSTOMER');
    });
    return ok(`Demo: khách yêu cầu sửa hợp đồng ${id}.`);
  },
  customerRequestCancel(id: string): ActionResult {
    const r = reqIn(state, id);
    if (!r || !['CONTRACT_READY', 'DEPOSIT_VERIFIED'].includes(r.status)) return fail('Demo: chỉ gửi yêu cầu hủy được khi hợp đồng đã phát hành, chưa ký.');
    mutate((d) => {
      const x = reqIn(d, id)!;
      x.cancellation = { reason: 'Kế hoạch thi đấu thay đổi, không còn nhu cầu vận chuyển.', at: nowStamp(), status: 'REQUESTED', prevStatus: x.status };
      x.status = 'CANCELLATION_REQUESTED';
      log(d, x, 'Yêu cầu hủy', x.cancellation.reason, 'CUSTOMER');
    });
    return ok(`Demo: khách yêu cầu hủy ${id}.`);
  },
  specialistPrepare(tripId: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t || t.status !== 'PLANNING' || t.deployment.status !== 'CONFIRMED') return fail('Demo: chuyến cần được phân công trước.');
    mutate((d) => {
      const x = tripIn(d, tripId)!;
      x.readiness = { ...x.readiness, docsReady: x.readiness.docsTotal, docsReadyAt: nowStamp(), insurance: 'VERIFIED', quarantineOk: true };
      const r = reqIn(d, x.requestId)!;
      r.dossier.forEach((i) => { i.status = 'APPROVED'; i.note = undefined; });
      log(d, r, 'Xác nhận hồ sơ READY & xác minh bảo hiểm', tripId, 'TRANSPORT_SPECIALIST');
    });
    return ok(`Demo: Specialist hoàn tất hồ sơ, bảo hiểm và kiểm dịch cho ${tripId}.`);
  },
  coordinatorSubmitRoute(tripId: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t || t.status !== 'PLANNING' || t.deployment.status !== 'CONFIRMED') return fail('Demo: chuyến cần được phân công trước.');
    if (t.route?.status === 'PENDING_APPROVAL' || t.route?.status === 'APPROVED') return fail('Demo: đã có phương án tuyến đang chờ hoặc đã duyệt.');
    mutate((d) => {
      const x = tripIn(d, tripId)!, r = reqIn(d, x.requestId)!, dep = x.plannedDepart;
      const stops: NonNullable<Trip['route']>['stops'] = x.mode === 'AIR'
        ? [{ name: r.pickup.name, type: 'ORIGIN', plannedAt: dep }, { name: `Sân bay ${r.origin === 'Hanoi' ? 'Nội Bài' : r.origin === 'Da Nang' ? 'Đà Nẵng' : 'Tân Sơn Nhất'}`, type: 'AIRPORT', plannedAt: addHours(dep, 3) },
          { name: `Trạm kiểm dịch sân bay ${r.destination}`, type: 'QUARANTINE_STATION', plannedAt: addHours(dep, 12) }, { name: r.delivery.name, type: 'DESTINATION', plannedAt: x.eta }]
        : [{ name: r.pickup.name, type: 'ORIGIN', plannedAt: dep }, { name: 'Trạm nghỉ giữa tuyến', type: 'REST_STOP', plannedAt: addHours(dep, 5) }, { name: r.delivery.name, type: 'DESTINATION', plannedAt: x.eta }];
      x.route = {
        v: (x.route?.v ?? 0) + 1, status: 'PENDING_APPROVAL', submittedAt: nowStamp(), stops, resourcesConfirmed: true,
        vehicle: '51C-135.79 • Hino 500 (4 chỗ)', crew: [['Tài xế chính', 'Nguyen Van Hung'], ['Bác sĩ thú y', 'Dr. Le Thu Trang']],
        note: x.route?.decisionNote ? `Đã điều chỉnh theo góp ý: ${x.route.decisionNote}` : undefined,
      };
      if (x.mode === 'AIR' && (!x.flight || x.flight.status === 'REJECTED')) x.flight = { airline: 'Vietnam Airlines Cargo', flightNo: 'VN-9318F', budget: x.flight ? x.flight.budget - 600 : 6200, status: 'BUDGET_PENDING' };
      log(d, r, `Gửi phương án tuyến v${x.route.v}`, 'Kèm xe và nhân sự đã xác nhận', 'FLEET_COORDINATOR');
    });
    return ok(`Demo: Coordinator gửi phương án tuyến cho ${tripId}.`);
  },
  coordinatorBookFlight(tripId: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t?.flight || t.flight.status !== 'APPROVED') return fail('Demo: ngân sách chuyến bay cần được Manager duyệt trước.');
    mutate((d) => { const x = tripIn(d, tripId)!; x.flight!.status = 'BOOKED'; log(d, reqIn(d, x.requestId)!, 'Đặt chỗ chuyến bay', `${x.flight!.airline} ${x.flight!.flightNo}`, 'FLEET_COORDINATOR'); });
    return ok(`Demo: Coordinator đã đặt chỗ ${t.flight.flightNo}.`);
  },
  driverDepart(tripId: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t || t.status !== 'READY_TO_DEPART' || !t.departureApprovedAt) return fail('Demo: Manager cần duyệt khởi hành trước.');
    mutate((d) => {
      const x = tripIn(d, tripId)!, r = reqIn(d, x.requestId)!;
      x.status = 'IN_TRANSIT'; r.status = 'IN_TRANSIT';
      x.milestones.push({ type: 'DEPARTED', stopIndex: 0, at: nowStamp(), by: 'Tài xế' });
      log(d, r, 'Xuất phát', x.route?.stops[0]?.name, 'CREW');
    });
    return ok(`Demo: tài xế xác nhận xuất phát ${tripId}.`);
  },
  driverNext(tripId: string): ActionResult {
    const t = tripIn(state, tripId), n = t && nextMilestone(t);
    if (!t || t.status !== 'IN_TRANSIT' || !n) return fail('Demo: không còn mốc nào để xác nhận.');
    mutate((d) => {
      const x = tripIn(d, tripId)!;
      x.milestones.push({ ...n, at: nowStamp(), by: 'Tài xế' });
      log(d, reqIn(d, x.requestId)!, milestoneText(x, n), undefined, 'CREW');
    });
    return ok(`Demo: ${milestoneText(t, n)}.`);
  },
  driverIncident(tripId: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t || t.status !== 'IN_TRANSIT') return fail('Demo: chỉ báo sự cố khi chuyến đang vận chuyển.');
    let id = '';
    mutate((d) => {
      const x = tripIn(d, tripId)!, r = reqIn(d, x.requestId)!, at = nowStamp();
      id = nextNum(d.incidents.map((i) => i.id), 'INC', 301);
      d.incidents.push({
        id, tripId, type: 'VEHICLE', severity: 'HIGH', status: 'NEW', at, by: 'Tài xế', location: x.route?.stops[lastStop(x)]?.name ?? 'Trên tuyến',
        description: 'Xe báo lỗi hệ thống làm mát khoang ngựa; nhiệt độ khoang tăng lên 31°C.', safety: 'Dừng xe ở nơi có bóng râm, mở cửa thông gió, bác sĩ thú y kiểm tra ngựa ổn định.',
        photos: ['cooling-alert.jpg'], horseId: r.horses[0],
        plans: [{ id: `PLN-${id.slice(4)}`, kind: 'Thay xe dự phòng', desc: 'Điều xe dự phòng 51C-246.80 từ kho gần nhất, chuyển ngựa trong 2 giờ. ETA lùi 3 giờ.', cost: 260, payer: 'COMPANY', status: 'PENDING_APPROVAL', at: addHours(at, 0.3) }],
        log: [[at, 'Tài xế báo sự cố'], [addHours(at, 0.3), 'Specialist đề xuất thay xe dự phòng']],
      });
      log(d, r, 'Báo sự cố', `${id} • lỗi làm mát khoang ngựa`, 'CREW');
    });
    return ok(`Demo: tài xế báo sự cố ${id} – chờ Manager quyết định phương án.`, id);
  },
  receiverRefuse(tripId: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t || !arrived(t) || t.handover || (t.refusal && !t.refusal.resolvedAt)) return fail('Demo: chuyến chưa đến điểm giao hoặc đã bàn giao.');
    mutate((d) => {
      const x = tripIn(d, tripId)!;
      x.refusal = { at: nowStamp(), reason: 'Người có mặt không phải người nhận đã đăng ký và không có giấy ủy quyền.' };
      log(d, reqIn(d, x.requestId)!, 'Từ chối bàn giao', x.refusal.reason, 'CREW');
    });
    return ok('Demo: bàn giao bị từ chối – Manager cần ghi quyết định xử lý.');
  },
  driverHandover(tripId: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t || t.status !== 'IN_TRANSIT' || !arrived(t)) return fail('Demo: chuyến chưa đến điểm giao.');
    if (t.refusal && !t.refusal.resolvedAt) return fail('Demo: cần Manager xử lý lần từ chối bàn giao trước.');
    mutate((d) => {
      const x = tripIn(d, tripId)!, r = reqIn(d, x.requestId)!, at = nowStamp();
      x.status = 'COMPLETED';
      x.handover = { completedAt: at, receiverName: r.delivery.contact, receiverId: 'CCCD 079****8888', signature: true, photos: [`handover-${tripId.toLowerCase()}.jpg`],
        horses: r.horses.map((horseId) => ({ horseId, microchipOk: true, condition: 'NORMAL' as const })) };
      r.status = 'DELIVERED'; r.acceptance = { status: 'PENDING', openedAt: at, dueAt: addHours(at, 24) };
      log(d, r, 'Hoàn tất bàn giao có xác minh', `Người nhận: ${r.delivery.contact}`, 'CREW');
    });
    return ok(`Demo: tổ xe hoàn tất bàn giao ${tripId}.`);
  },
  customerAccept(id: string): ActionResult {
    const r = reqIn(state, id);
    if (!r || r.status !== 'DELIVERED' || r.acceptance?.status !== 'PENDING') return fail('Demo: không có bàn giao chờ nghiệm thu.');
    if (state.complaints.some((c) => c.requestId === id && !['RESOLVED'].includes(c.status))) return fail('Demo: khiếu nại đang mở – hạn nghiệm thu tạm dừng.');
    mutate((d) => { const x = reqIn(d, id)!; x.acceptance = { ...x.acceptance!, status: 'ACCEPTED', decidedAt: nowStamp() }; log(d, x, 'Nghiệm thu bàn giao', undefined, 'CUSTOMER'); });
    return ok(`Demo: khách hàng nghiệm thu ${id}.`);
  },
  customerPayBalance(id: string): ActionResult {
    const r = reqIn(state, id);
    if (!r || r.acceptance?.status !== 'ACCEPTED' || outstanding(state, r) <= 0) return fail('Demo: khách cần nghiệm thu trước; hoặc không còn số dư.');
    mutate((d) => {
      const x = reqIn(d, id)!, at = nowStamp(), txId = nextTx(d);
      d.transactions.push({ id: txId, requestId: id, type: 'BALANCE', method: 'VNPAY', amount: outstanding(d, x), status: 'SUCCESS', createdAt: at, confirmedAt: at, ref: `VNP-${txId.slice(4)}` });
      log(d, x, 'VNPay xác minh số dư', txId, 'SYSTEM');
    });
    return ok(`Demo: khách thanh toán số dư ${id} qua VNPay.`);
  },
  customerComplaint(id: string): ActionResult {
    const r = reqIn(state, id);
    if (!r || r.status !== 'DELIVERED') return fail('Demo: chỉ gửi khiếu nại sau bàn giao.');
    let cid = '';
    mutate((d) => {
      const x = reqIn(d, id)!;
      cid = nextNum(d.complaints.map((c) => c.id), 'CMP', 120);
      d.complaints.push({ id: cid, requestId: id, type: 'SERVICE', title: 'Bàn giao trễ so với ETA đã thông báo', status: 'NEW', createdAt: nowStamp(), horseId: x.horses[0],
        messages: [{ from: 'CUSTOMER', name: customerOf(d, x)?.name ?? 'Khách hàng', at: nowStamp(), text: 'Xe đến muộn hơn ETA 2 giờ mà không có thông báo, nhân viên chuồng phải chờ.' }] });
      log(d, x, 'Gửi khiếu nại', cid, 'CUSTOMER');
    });
    return ok(`Demo: khách hàng gửi khiếu nại ${cid}.`, cid);
  },
  customerConfirmResolution(cid: string): ActionResult {
    const c = state.complaints.find((x) => x.id === cid);
    if (!c || c.status !== 'PROPOSED') return fail('Demo: không có đề xuất chờ khách xác nhận.');
    mutate((d) => {
      const x = d.complaints.find((y) => y.id === cid)!;
      x.status = 'RESOLVED'; x.resolvedAt = nowStamp();
      x.messages.push({ from: 'CUSTOMER', name: customerOf(d, reqIn(d, x.requestId))?.name ?? 'Khách hàng', at: nowStamp(), text: 'Tôi đồng ý với phương án giải quyết.' });
      log(d, reqIn(d, x.requestId)!, 'Khách xác nhận kết quả khiếu nại', cid, 'CUSTOMER');
    });
    return ok(`Demo: khách hàng xác nhận phương án giải quyết ${cid}.`);
  },
};
const lastStop = (t: Trip) => t.milestones[t.milestones.length - 1]?.stopIndex ?? 0;

export type ManagerActions = typeof managerActions & { demo: typeof demoActions };
const actions: ManagerActions = { ...managerActions, demo: demoActions };

// ============================================================================
// Hook
// ============================================================================
export function useManager() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => { void loadAll(); }, []);

  const stats = useMemo(() => {
    const rq = (s: string[]) => snap.requests.filter((r) => s.includes(r.status)).length;
    const bankQueue = snap.transactions.filter((x) => x.status === 'PENDING_CONFIRMATION' && x.type !== 'REFUND').length;
    const refunds = snap.transactions.filter((x) => x.type === 'REFUND' && x.status === 'PENDING_CONFIRMATION').length;
    return {
      pendingReview: rq(['PENDING_REVIEW']),
      awaitingContract: rq(['CONTRACT_PREPARATION', 'CONTRACT_CHANGES_REQUESTED']),
      awaitingSignature: rq(['CONTRACT_READY', 'DEPOSIT_VERIFIED']),
      cancellations: rq(['CANCELLATION_REQUESTED']),
      bankQueue,
      refunds,
      payQueue: bankQueue + refunds + rq(['CANCELLATION_REQUESTED']),
      preparing: snap.trips.filter((t) => t.status === 'PLANNING').length,
      notDeployed: snap.trips.filter((t) => t.deployment.status === 'NOT_CONFIRMED').length,
      tripDecisions: snap.trips.filter((t) => t.deployment.status === 'NOT_CONFIRMED' || t.route?.status === 'PENDING_APPROVAL' || t.flight?.status === 'BUDGET_PENDING'
        || (t.status === 'PLANNING' && t.deployment.status === 'CONFIRMED' && isReady(t))).length,
      active: snap.trips.filter((t) => ['READY_TO_DEPART', 'IN_TRANSIT'].includes(t.status)).length,
      openIncidents: snap.incidents.filter((i) => i.status !== 'CLOSED').length,
      openComplaints: snap.complaints.filter((c) => c.status !== 'RESOLVED').length,
      delivered: rq(['DELIVERED']),
      unread: snap.notifications.filter((n) => !n.read).length,
    };
  }, [snap]);

  const getRequest = (id?: string) => snap.requests.find((r) => r.id === id);
  const getTrip = (id?: string) => snap.trips.find((t) => t.id === id);
  const tripFor = (requestId: string) => tripOfReq(snap, requestId);
  const customer = (r?: TransportRequest) => customerOf(snap, r);

  return { ...snap, data: snap as ManagerData, stats, getRequest, getTrip, tripFor, customer, actions };
}

export default useManager;
