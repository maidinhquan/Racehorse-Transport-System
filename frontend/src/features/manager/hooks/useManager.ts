import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type {
  ActionResult,
  ActorRole,
  ActualCost,
  ContractDraft,
  ExtraCost,
  Transaction,
  TransportRequest,
  Trip,
} from '../types';
import { managerApi } from '../api/managerApi';
import { apiMessage } from '../../../shared/api/apiError';
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
import { getDemoMode } from '../../../shared/context/DemoModeContext';
import { getSharedRequests, saveSharedRequest, toManagerRequest } from '../../../shared/utils/sharedRequests';
import {
  addDays,
  addHours,
  arrived,
  closureChecks,
  ctRef,
  curVersion,
  customerOf,
  depositOf,
  depositPaid,
  verifiedDeposit,
  draftError,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  isReady,
  isSigned,
  milestoneText,
  nextMilestone,
  nowStamp,
  outstanding,
  pendingTx,
  receivedDepositTx,
  readinessChecks,
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

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const DATA_KEYS: Array<keyof ManagerData> = ['customers', 'horses', 'staff', 'requests', 'trips', 'transactions', 'incidents', 'complaints', 'actualCosts', 'notifications'];
const cleanId = (x?: string) => (x || '').replace(/-/g, '_');

import { createSyncController, notifySync } from '../../../shared/utils/syncChannel';

const initialDemo = getDemoMode('manager');
let state: ManagerState = {
  customers: initialDemo ? clone(mockCustomers) : [],
  horses: initialDemo ? clone(mockHorses) : [],
  staff: initialDemo ? clone(mockStaff) : [],
  requests: initialDemo
    ? (() => {
        const initialShared = getSharedRequests().map(toManagerRequest);
        const initialMock = clone(mockRequests);
        return [...initialShared, ...initialMock.filter((m) => !initialShared.some((s) => cleanId(s.id) === cleanId(m.id)))];
      })()
    : [],
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

if (typeof window !== 'undefined') {
  window.addEventListener('rts_requests_updated', () => {
    const isDemo = getDemoMode('manager');
    if (isDemo) {
      const shared = getSharedRequests().map(toManagerRequest);
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
    if (customEvent.detail && customEvent.detail.role === 'manager') {
      if (customEvent.detail.enabled) {
        const shared = getSharedRequests().map(toManagerRequest);
        const mock = clone(mockRequests);
        const merged = [...shared, ...mock.filter((m) => !shared.some((s) => cleanId(s.id) === cleanId(m.id)))];
        setState({
          customers: clone(mockCustomers),
          horses: clone(mockHorses),
          staff: clone(mockStaff),
          requests: merged,
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

/** Sửa dữ liệu trên bản sao rồi ghi lại (một lần cập nhật cho mọi danh sách) */
const mutate = (fn: (d: ManagerData) => void) => setState((s) => {
  const d = clone(Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as unknown as ManagerData);
  fn(d);
  return d;
});
const reqIn = (d: ManagerData, id: string) => d.requests.find((r) => r.id === id || cleanId(r.id) === cleanId(id));
const tripIn = (d: ManagerData, id: string) => d.trips.find((t) => t.id === id);
const actorName = (d: ManagerData, r: TransportRequest, role: ActorRole) =>
  role === 'LOGISTICS_MANAGER' ? MANAGER_NAME : role === 'CUSTOMER' ? customerOf(d, r)?.name ?? 'Khách hàng'
    : role === 'TRANSPORT_SPECIALIST' ? 'Hoang Thu Ha' : role === 'FLEET_ROUTE_COORDINATOR' ? 'Dang Minh Quan' : role === 'DRIVER_ESCORT' ? 'Tổ xe' : 'Hệ thống';
const log = (d: ManagerData, r: TransportRequest, action: string, detail?: string, role: ActorRole = 'LOGISTICS_MANAGER') =>
  r.history.push({ at: nowStamp(), role, actor: actorName(d, r, role), action, detail });
const nextNum = (ids: string[], prefix: string, min: number) =>
  `${prefix}-${Math.max(min, ...ids.map((x) => Number(x.replace(/\D/g, '')) || 0)) + 1}`;
const nextTx = (d: ManagerData) => nextNum(d.transactions.filter((x) => x.id.startsWith('PAY-') && !x.id.startsWith('PAY-R')).map((x) => x.id), 'PAY', 5200);

let currentLoadSeq = 0;
let inFlightPromise: Promise<void> | null = null;
let inFlightSyncPromise: Promise<void> | null = null;
const mergeRequestList = (incoming: TransportRequest[], current: TransportRequest[]) => incoming.map(r => {
  const previous = current.find(p => p.id === r.id);
  return previous?.status === r.status ? { ...r, versions: previous.versions, dossier: previous.dossier, draft: previous.draft } : r;
});

async function syncRequestsOnly(): Promise<void> {
  if (inFlightSyncPromise) return inFlightSyncPromise;
  inFlightSyncPromise = (async () => {
    try {
      const rawRequests = await managerApi.getRequests();
      const isDemo = getDemoMode('manager');
      if (!isDemo) {
        setState((prev) => ({
          ...prev,
          requests: mergeRequestList(rawRequests, prev.requests),
        }));
        return;
      }
      const shared = getSharedRequests().map(toManagerRequest);
      const merged = [...shared, ...rawRequests.filter((b) => !shared.some((s) => cleanId(s.id) === cleanId(b.id)))];
      const mock = clone(mockRequests);
      const allDemoRequests = [...merged, ...mock.filter((m) => !merged.some((r) => cleanId(r.id) === cleanId(m.id)))];
      setState((prev) => ({ ...prev, requests: allDemoRequests }));
    } catch (error) {
      // Background sync stays quiet for users; keep the reason visible to developers.
      console.error('[manager] background request sync failed', error);
    } finally {
      inFlightSyncPromise = null;
    }
  })();
  return inFlightSyncPromise;
}

async function loadAll(options: { force?: boolean; silent?: boolean } = {}) {
  const { force = false, silent = false } = options;
  if (!force && state.loaded) return;

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
      const [customersRes, horsesRes, staffRes, requestsRes, tripsRes, txsRes, notifsRes] = await Promise.allSettled([
        managerApi.getCustomers(), managerApi.getHorses(), managerApi.getStaff(), managerApi.getRequests(),
        managerApi.getTrips(), managerApi.getTransactions(), managerApi.getNotifications(),
      ]);

      if (seq !== currentLoadSeq) {
        return;
      }

      const customers = customersRes.status === 'fulfilled' && customersRes.value ? customersRes.value : [];
      const horses = horsesRes.status === 'fulfilled' && horsesRes.value ? horsesRes.value : [];
      const staff = staffRes.status === 'fulfilled' && staffRes.value ? staffRes.value : [];
      const trips = tripsRes.status === 'fulfilled' && tripsRes.value ? tripsRes.value : [];
      const transactions = txsRes.status === 'fulfilled' && txsRes.value ? txsRes.value : [];
      const notifications = notifsRes.status === 'fulfilled' && notifsRes.value ? notifsRes.value : [];
      const baseRequests = requestsRes.status === 'fulfilled' && requestsRes.value ? requestsRes.value : [];
      // Surface list failures (auth, contract mismatch…) instead of silently showing an empty list.
      if (requestsRes.status === 'rejected') {
        console.error('[manager] GET /manager/requests failed', requestsRes.reason);
        toast(`Không tải được danh sách yêu cầu: ${apiMessage(requestsRes.reason)}`);
      }

      const isDemo = getDemoMode('manager');
      if (!isDemo) {
        setState((prev) => ({
          ...prev,
          customers: customers || [],
          horses: horses || [],
          staff: staff || [],
          requests: mergeRequestList(baseRequests, prev.requests),
          trips: trips || [],
          transactions: transactions || [],
          notifications: notifications || [],
          loading: false,
          loaded: true,
        }));
        return;
      }
      const shared = getSharedRequests().map(toManagerRequest);
      const merged = [...shared, ...baseRequests.filter((b) => !shared.some((s) => cleanId(s.id) === cleanId(b.id)))];
      const mock = clone(mockRequests);
      const allDemoRequests = [...merged, ...mock.filter((m) => !merged.some((r) => cleanId(r.id) === cleanId(m.id)))];
      setState((prev) => ({
        ...prev,
        customers: customers?.length ? customers : clone(mockCustomers),
        horses: horses?.length ? horses : clone(mockHorses),
        staff: staff?.length ? staff : clone(mockStaff),
        requests: allDemoRequests,
        trips: trips?.length ? trips : clone(mockTrips),
        transactions: transactions?.length ? transactions : clone(mockTransactions),
        notifications: notifications?.length ? notifications : clone(mockNotifications),
        loading: false,
        loaded: true,
      }));
      const extra = await Promise.allSettled([managerApi.getIncidents(), managerApi.getComplaints(), managerApi.getActualCosts()]);
      if (seq !== currentLoadSeq) return;
      if (extra[0].status === 'fulfilled') setState({ incidents: extra[0].value?.length ? extra[0].value : clone(mockIncidents) });
      if (extra[1].status === 'fulfilled') setState({ complaints: extra[1].value?.length ? extra[1].value : clone(mockComplaints) });
      if (extra[2].status === 'fulfilled') setState({ actualCosts: extra[2].value?.length ? extra[2].value : clone(mockActualCosts) });
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

const running = new Set<string>();
async function perform(key: string, action: () => Promise<unknown>, message: string): Promise<ActionResult> {
  if (running.has(key)) return fail('Thao tác đang được xử lý.');
  running.add(key);
  try {
    await action();
    await loadAll({ force: true, silent: true });
    if (key.startsWith('REQUEST_')) {
      const request = await managerApi.getRequest(key);
      setState(s => ({ requests: s.requests.map(r => r.id === key ? request : r) }));
    }
    notifySync('requests_updated');
    return ok(message);
  } catch (error) {
    return fail(apiMessage(error));
  } finally {
    running.delete(key);
  }
}

// ============================================================================
// Hành động của Logistics Manager
// ============================================================================
const managerActions = {
  async loadRequest(id: string) {
    if (getDemoMode('manager')) return;
    try {
      const request = await managerApi.getRequest(id);
      setState(s => ({ requests: s.requests.some(r => r.id === id) ? s.requests.map(r => r.id === id ? request : r) : [...s.requests, request],
        transactions: s.transactions.map(p => request.versions.some(v => v.contractId === p.contractId) ? { ...p, requestId: id } : p),
      }));
    } catch (error) { toast(apiMessage(error)); }
  },
  reload: () => { void loadAll({ force: true, silent: false }); },
  async cancelPayment(id: string, reason: string): Promise<ActionResult> {
    try {
      const p = await managerApi.cancelPayment(id, reason);
      await loadAll({ force: true, silent: true });
      notifySync('requests_updated');
      return p.status === 'SUCCESS'
        ? ok(`${id}: VNPay xác nhận khách ĐÃ thanh toán – không huỷ, đã ghi nhận cọc.`)
        : ok(`Đã huỷ ${id}. Khách có thể thanh toán lại.`);
    } catch (error) { return fail(apiMessage(error)); }
  },
  /** Reading a pending payment makes the server query VNPay (querydr) and record the result. */
  async reconcilePayment(id: string): Promise<ActionResult> {
    try {
      const p = await managerApi.getPayment(id);
      await loadAll({ force: true, silent: true });
      notifySync('requests_updated');
      return ok(p.status === 'SUCCESS' ? `${id}: VNPay xác nhận đã thanh toán – đã ghi nhận cọc.`
        : ['FAILED', 'REJECTED'].includes(p.status) ? `${id}: không có giao dịch thành công – khách có thể thanh toán lại.`
        : `${id}: VNPay chưa trả kết quả. Hệ thống tự kiểm tra lại mỗi 5 phút.`);
    } catch (error) { return fail(apiMessage(error)); }
  },
  clearToast: () => setState({ toast: null }),
  showToast: (m: string) => toast(m),
  markAllRead: () => perform('notifications', () => managerApi.markAllRead(), 'Đã đánh dấu thông báo đã đọc.'),
  markRead: (id: string) => perform(id, () => managerApi.markRead(id), 'Đã đọc thông báo.'),
  async acceptRequest(id: string): Promise<ActionResult> {
    const r = reqIn(state, id);
    if (!r || r.status !== 'PENDING_REVIEW') return fail('Yêu cầu chưa ở hàng chờ xét duyệt.');
    const isDemo = getDemoMode('manager');
    if (!isDemo) {
      return perform(id, async () => {
        const updated = await managerApi.acceptRequest(id);
        mutate((d) => {
          const target = reqIn(d, id);
          if (target) {
            Object.assign(target, updated);
            target.status = updated.status || 'CONTRACT_PREPARATION';
            log(d, target, 'Chấp thuận yêu cầu', 'Chuyển sang bước soạn hợp đồng');
          }
        });
      }, `Đã chấp thuận yêu cầu ${id}.`);
    }
    mutate((d) => {
      const x = reqIn(d, id);
      if (x) {
        x.status = 'CONTRACT_PREPARATION';
        log(d, x, 'Chấp thuận yêu cầu', 'Chuyển sang bước soạn hợp đồng');
        saveSharedRequest(x);
      }
    });
    notifySync('requests_updated');
    return ok('Đã chấp thuận yêu cầu.');
  },
  async requestRevision(id: string, feedback: string): Promise<ActionResult> {
    if (feedback.trim().length < 10) return fail('Nhập góp ý ít nhất 10 ký tự.');
    const r = reqIn(state, id);
    if (!r) return fail('Không tìm thấy yêu cầu.');
    const isDemo = getDemoMode('manager');
    if (!isDemo) {
      return perform(id, async () => {
        const updated = await managerApi.requestRevision(id, feedback.trim());
        mutate((d) => {
          const target = reqIn(d, id);
          if (target) {
            Object.assign(target, updated);
            target.status = updated.status || 'CHANGES_REQUESTED';
            target.feedback = feedback.trim();
            log(d, target, 'Yêu cầu chỉnh sửa', feedback.trim());
          }
        });
      }, 'Đã gửi yêu cầu chỉnh sửa.');
    }
    mutate((d) => {
      const x = reqIn(d, id);
      if (x) {
        x.status = 'CHANGES_REQUESTED';
        x.feedback = feedback.trim();
        log(d, x, 'Yêu cầu chỉnh sửa', feedback.trim());
        saveSharedRequest(x);
      }
    });
    notifySync('requests_updated');
    return ok('Đã gửi yêu cầu chỉnh sửa.');
  },
  async rejectRequest(id: string, reason: string): Promise<ActionResult> {
    if (reason.trim().length < 10) return fail('Nhập lý do ít nhất 10 ký tự.');
    const r = reqIn(state, id);
    if (!r) return fail('Không tìm thấy yêu cầu.');
    const isDemo = getDemoMode('manager');
    if (!isDemo) {
      return perform(id, async () => {
        const updated = await managerApi.rejectRequest(id, reason.trim());
        mutate((d) => {
          const target = reqIn(d, id);
          if (target) {
            Object.assign(target, updated);
            target.status = updated.status || 'REJECTED';
            target.reason = reason.trim();
            log(d, target, 'Từ chối yêu cầu', reason.trim());
          }
        });
      }, 'Đã từ chối yêu cầu.');
    }
    mutate((d) => {
      const x = reqIn(d, id);
      if (x) {
        x.status = 'REJECTED';
        x.reason = reason.trim();
        log(d, x, 'Từ chối yêu cầu', reason.trim());
        saveSharedRequest(x);
      }
    });
    notifySync('requests_updated');
    return ok('Đã từ chối yêu cầu.');
  },
  cancelRequest(id: string, reason: string) {
    if (reason.trim().length < 10) return Promise.resolve(fail('Nhập lý do ít nhất 10 ký tự.'));
    return perform(id, () => managerApi.cancelRequest(id, reason.trim()), 'Đã xử lý hủy theo trạng thái máy chủ.');
  },
  decideCancellation(id: string, approve: boolean, note: string) {
    const r = reqIn(state, id), v = r && curVersion(r);
    if (!v?.contractId || note.trim().length < 5) return Promise.resolve(fail('Thiếu hợp đồng hoặc ghi chú quyết định.'));
    return perform(id, () => managerApi.decideCancellation(v.contractId!, approve, note.trim()), 'Đã ghi nhận quyết định hủy.');
  },
  async closeRequest(id: string): Promise<ActionResult> {
    const r = reqIn(state, id);
    if (!r || r.status !== 'DELIVERED') return fail('Chỉ đóng được yêu cầu đã bàn giao.');
    const miss = closureChecks(state, r).filter((c) => !c[1]);
    if (miss.length) return fail(`Chưa đủ điều kiện đóng: ${miss[0][0]}.`);
    const isDemo = getDemoMode('manager');
    if (!isDemo) {
      return perform(id, async () => {
        await managerApi.closeRequest(id);
        mutate((d) => {
          const x = reqIn(d, id);
          if (x) {
            x.status = 'CLOSED'; x.closedAt = nowStamp();
            const v = x.versions.find((y) => y.signedAt); if (v) v.state = 'FULFILLED';
            log(d, x, 'Đóng yêu cầu', 'Đủ mọi điều kiện đóng – hợp đồng đã hoàn thành');
          }
        });
      }, `Đã đóng ${id}.`);
    }
    mutate((d) => {
      const x = reqIn(d, id)!;
      x.status = 'CLOSED'; x.closedAt = nowStamp();
      const v = x.versions.find((y) => y.signedAt); if (v) v.state = 'FULFILLED';
      log(d, x, 'Đóng yêu cầu', 'Đủ mọi điều kiện đóng – hợp đồng đã hoàn thành');
      saveSharedRequest(x);
    });
    void managerApi.closeRequest(id);
    notifySync('requests_updated');
    return ok(`Đã đóng ${id}.`);
  },
  addCollectionNote(id: string, note: string): ActionResult {
    if (note.trim().length < 10) return fail('Nhập nội dung theo dõi công nợ (ít nhất 10 ký tự).');
    mutate((d) => { const x = reqIn(d, id)!; x.collection.push({ at: nowStamp(), note: note.trim(), by: MANAGER_NAME }); log(d, x, 'Ghi nhận theo dõi công nợ', note.trim()); });
    void managerApi.addCollectionNote(id, note);
    return ok('Đã ghi nhận theo dõi công nợ.');
  },

  // ----- Hợp đồng -----
  async saveDraft(id: string, draft: ContractDraft): Promise<ActionResult> {
    return perform(id, async () => {
        await managerApi.saveContractDraft(id, draft);
        const editor = await managerApi.getContractEditor(id);
        mutate(d => { const r = reqIn(d, id); if (r) r.draft = editor.draft ?? undefined; });
    }, 'Đã lưu bản nháp hợp đồng trên máy chủ.');
  },
  discardDraft(id: string) { return perform(id, () => managerApi.discardContractDraft(id), 'Đã bỏ bản nháp.'); },
  async issueContract(id: string, draft: ContractDraft, responseText = ''): Promise<ActionResult> {
    const r = reqIn(state, id);
    if (!r || isSigned(r) || verifiedDeposit(state, r) > 0 || depositPaid(state, r) || receivedDepositTx(state, r)) return fail('Yêu cầu không đủ điều kiện phát hành hợp đồng.');
    const err = draftError(draft); if (err) return fail(err);
    const published = curVersion(r);
    const openChange = published?.change && !published.change.response ? published : undefined;
    if (openChange && responseText.trim() && responseText.trim().length < 10) return fail('Phản hồi gửi khách hàng cần ít nhất 10 ký tự.');
    return perform(id, async () => {
      // A pending customer change request is accepted with the Manager's reply before the new version is issued.
      // (Without a reply, the server marks it accepted when publishing.)
      if (openChange?.contractId && responseText.trim()) {
        await managerApi.respondContractChange(openChange.contractId, openChange.v, 'ACCEPTED', responseText.trim());
      }
      const saved = await managerApi.saveContractDraft(id, draft);
      await managerApi.publishContract(id, saved.versionNo);
    }, 'Đã phát hành hợp đồng. Hạn hoàn tất được lấy từ máy chủ.');
  },
  respondChange(id: string, decision: 'KEPT' | 'RETURNED', text: string) {
    const r = reqIn(state, id), v = r && curVersion(r);
    if (!v?.contractId || text.trim().length < 10) return Promise.resolve(fail('Nhập phản hồi ít nhất 10 ký tự.'));
    return perform(id, () => managerApi.respondContractChange(v.contractId!, v.v, decision === 'KEPT' ? 'REJECTED' : 'ACCEPTED', text.trim()), 'Đã phản hồi. Hạn hợp đồng được giữ nguyên.');
  },
  extendContract(id: string, reason: string) {
    const r = reqIn(state, id), v = r && curVersion(r);
    if (!v?.contractId || reason.trim().length < 5) return Promise.resolve(fail('Nhập lý do gia hạn ít nhất 5 ký tự.'));
    return perform(id, () => managerApi.extendContract(v.contractId!, v.v, reason.trim()), 'Đã gia hạn theo thời hạn máy chủ trả về.');
  },
  remindSign(id: string) {
    const r = reqIn(state, id), v = r && curVersion(r);
    if (!v?.contractId) return Promise.resolve(fail('Không tìm thấy hợp đồng.'));
    return perform(id, () => managerApi.remindSign(v.contractId!, v.v), 'Đã gửi nhắc hoàn tất hợp đồng.');
  },
  confirmRefund(requestId: string) {
    const request = reqIn(state, requestId), contractId = request?.contractId ?? (request && curVersion(request)?.contractId);
    if (!contractId) return Promise.resolve(fail('Không tìm thấy hợp đồng để ghi nhận trạng thái hoàn tiền.'));
    return perform(requestId, () => managerApi.confirmRefund(contractId), 'Đã cập nhật trạng thái hoàn tiền theo máy chủ.');
  },
  confirmDeployment(id: string, specialistId: string, coordinatorId: string) {
    if (!specialistId || !coordinatorId) return Promise.resolve(fail('Chọn đủ người phụ trách.'));
    return perform(id, () => managerApi.deployTrip(id, { specialistId, coordinatorId }), 'Đã phân công chuyến.');
  },
  holdTrip(id: string, reason: string) { return perform(id, () => managerApi.holdTrip(id, reason.trim()), 'Đã tạm dừng chuyến.'); },
  resumeTrip(id: string) { return perform(id, () => managerApi.resumeTrip(id), 'Đã gửi yêu cầu tiếp tục chuẩn bị chuyến.'); },
  approveRoute(tripId: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t?.route || t.route.status !== 'PENDING_APPROVAL') return fail('Không có phương án tuyến chờ duyệt.');
    if (t.deployment.status !== 'CONFIRMED') return fail('Chuyến chưa được phân công hoặc đang tạm dừng.');
    if (!t.route.resourcesConfirmed) return fail('Coordinator chưa xác nhận bố trí xe và nhân sự.');
    const version = t.route.v || 1;
    mutate((d) => { const x = tripIn(d, tripId)!; x.route!.status = 'APPROVED'; x.route!.decidedAt = nowStamp(); log(d, reqIn(d, x.requestId)!, `Duyệt phương án tuyến v${x.route!.v}`, tripId); });
    void managerApi.approveRoute(tripId, version).catch(() => managerApi.decideRoute(tripId, { approve: true }));
    return ok(`Đã duyệt phương án tuyến v${t.route.v} của ${tripId}.`);
  },
  returnRoute(tripId: string, reason: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t?.route || t.route.status !== 'PENDING_APPROVAL') return fail('Không có phương án tuyến chờ duyệt.');
    if (reason.trim().length < 5) return fail('Nhập lý do yêu cầu làm lại (ít nhất 5 ký tự).');
    const version = t.route.v || 1;
    mutate((d) => {
      const x = tripIn(d, tripId)!;
      x.route!.status = 'CHANGES_REQUESTED'; x.route!.decisionNote = reason.trim(); x.route!.decidedAt = nowStamp();
      log(d, reqIn(d, x.requestId)!, `Yêu cầu làm lại tuyến v${x.route!.v}`, reason.trim());
    });
    void managerApi.returnRoute(tripId, version, reason.trim()).catch(() => managerApi.decideRoute(tripId, { approve: false, reason }));
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
  customerRequestChange(id: string, customText?: string): ActionResult {
    const r = reqIn(state, id), v = r && curVersion(r);
    if (!r || !v || r.status !== 'CONTRACT_READY' || versionState(v) !== 'ISSUED' || depositPaid(state, r)) return fail('Demo: chỉ yêu cầu sửa được hợp đồng đang hiệu lực, chưa có cọc.');
    mutate((d) => {
      const x = reqIn(d, id)!, y = curVersion(x)!;
      y.state = 'CHANGES_REQUESTED';
      y.change = { at: nowStamp(), text: customText?.trim() || 'Đề nghị dời ngày vận chuyển thêm 3 ngày và giảm 5% cước vì đặt nhiều chuyến trong quý.', proposedDate: addDays(x.date, 3), commercial: 'Giảm 5% cước vận chuyển' };
      x.status = 'CONTRACT_CHANGES_REQUESTED';
      log(d, x, 'Yêu cầu sửa hợp đồng', y.change.text, 'CUSTOMER');
    });
    return ok(`Demo: khách yêu cầu sửa hợp đồng ${id}.`);
  },
  customerRequestCancel(id: string, customReason?: string): ActionResult {
    const r = reqIn(state, id);
    if (!r || !['CONTRACT_READY', 'DEPOSIT_VERIFIED'].includes(r.status)) return fail('Demo: chỉ gửi yêu cầu hủy được khi hợp đồng đã phát hành, chưa ký.');
    mutate((d) => {
      const x = reqIn(d, id)!;
      x.cancellation = { reason: customReason?.trim() || 'Kế hoạch thi đấu thay đổi, không còn nhu cầu vận chuyển.', at: nowStamp(), status: 'REQUESTED', prevStatus: x.status };
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
      log(d, r, `Gửi phương án tuyến v${x.route.v}`, 'Kèm xe và nhân sự đã xác nhận', 'FLEET_ROUTE_COORDINATOR');
    });
    return ok(`Demo: Coordinator gửi phương án tuyến cho ${tripId}.`);
  },
  coordinatorBookFlight(tripId: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t?.flight || t.flight.status !== 'APPROVED') return fail('Demo: ngân sách chuyến bay cần được Manager duyệt trước.');
    mutate((d) => { const x = tripIn(d, tripId)!; x.flight!.status = 'BOOKED'; log(d, reqIn(d, x.requestId)!, 'Đặt chỗ chuyến bay', `${x.flight!.airline} ${x.flight!.flightNo}`, 'FLEET_ROUTE_COORDINATOR'); });
    return ok(`Demo: Coordinator đã đặt chỗ ${t.flight.flightNo}.`);
  },
  driverDepart(tripId: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t || t.status !== 'READY_TO_DEPART' || !t.departureApprovedAt) return fail('Demo: Manager cần duyệt khởi hành trước.');
    mutate((d) => {
      const x = tripIn(d, tripId)!, r = reqIn(d, x.requestId)!;
      x.status = 'IN_TRANSIT'; r.status = 'IN_TRANSIT';
      x.milestones.push({ type: 'DEPARTED', stopIndex: 0, at: nowStamp(), by: 'Tài xế' });
      log(d, r, 'Xuất phát', x.route?.stops[0]?.name, 'DRIVER_ESCORT');
    });
    return ok(`Demo: tài xế xác nhận xuất phát ${tripId}.`);
  },
  driverNext(tripId: string): ActionResult {
    const t = tripIn(state, tripId), n = t && nextMilestone(t);
    if (!t || t.status !== 'IN_TRANSIT' || !n) return fail('Demo: không còn mốc nào để xác nhận.');
    mutate((d) => {
      const x = tripIn(d, tripId)!;
      x.milestones.push({ ...n, at: nowStamp(), by: 'Tài xế' });
      log(d, reqIn(d, x.requestId)!, milestoneText(x, n), undefined, 'DRIVER_ESCORT');
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
      log(d, r, 'Báo sự cố', `${id} • lỗi làm mát khoang ngựa`, 'DRIVER_ESCORT');
    });
    return ok(`Demo: tài xế báo sự cố ${id} – chờ Manager quyết định phương án.`, id);
  },
  receiverRefuse(tripId: string): ActionResult {
    const t = tripIn(state, tripId);
    if (!t || !arrived(t) || t.handover || (t.refusal && !t.refusal.resolvedAt)) return fail('Demo: chuyến chưa đến điểm giao hoặc đã bàn giao.');
    mutate((d) => {
      const x = tripIn(d, tripId)!;
      x.refusal = { at: nowStamp(), reason: 'Người có mặt không phải người nhận đã đăng ký và không có giấy ủy quyền.' };
      log(d, reqIn(d, x.requestId)!, 'Từ chối bàn giao', x.refusal.reason, 'DRIVER_ESCORT');
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
      log(d, r, 'Hoàn tất bàn giao có xác minh', `Người nhận: ${r.delivery.contact}`, 'DRIVER_ESCORT');
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

  const getRequest = (id?: string) => snap.requests.find((r) => r.id === id || (id && cleanId(r.id) === cleanId(id)));
  const getTrip = (id?: string) => snap.trips.find((t) => t.id === id);
  const tripFor = (requestId: string) => tripOfReq(snap, requestId);
  const customer = (r?: TransportRequest) => customerOf(snap, r);

  return { ...snap, data: snap as ManagerData, stats, getRequest, getTrip, tripFor, customer, actions };
}

export default useManager;
