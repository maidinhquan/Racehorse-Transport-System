import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type {
  ActionResult,
  AuditEntry,
  ClearanceResult,
  CustomerDocKey,
  DocType,
  Insurance,
  RecordDocInput,
  RegPackage,
  Regulation,
  SpecTrip,
} from '../types';
import { specialistApi } from '../api/specialistApi';
import {
  SPECIALIST_NAME,
  mockAudit,
  mockBookings,
  mockCustomerDocs,
  mockDocTypes,
  mockDocuments,
  mockPackages,
  mockRegulations,
  mockRequests,
  mockTrips,
} from '../data/mockData';
import {
  CUSTOMER_DOC_NAME,
  TYPE_CUSTOMER_KEY,
  addDays,
  checklist,
  customerDoc,
  deployed,
  docEffective,
  docsReadyBlock,
  expiringOrExpired,
  findDoc,
  fmtDate,
  missingItems,
  nowStamp,
  openRequestFor,
  opsBlock,
  pkgWhyNot,
  prepTrips,
  snapshot,
  suggestPackage,
  today,
  type SpecialistData,
} from './specialistRules';

// ============================================================================
// Store dùng chung cho mọi trang Specialist (giữ dữ liệu khi chuyển route)
// ============================================================================
interface SpecialistState extends SpecialistData {
  loading: boolean;
  loaded: boolean;
  toast: { id: number; message: string } | null;
}

import { getDemoMode } from '../../../shared/context/DemoModeContext';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const initialDemo = getDemoMode('specialist');

let state: SpecialistState = {
  trips: initialDemo ? clone(mockTrips) : [],
  docTypes: clone(mockDocTypes),
  regulations: clone(mockRegulations),
  packages: clone(mockPackages),
  customerDocs: initialDemo ? clone(mockCustomerDocs) : [],
  documents: initialDemo ? clone(mockDocuments) : [],
  requests: initialDemo ? clone(mockRequests) : [],
  bookings: initialDemo ? clone(mockBookings) : [],
  audit: initialDemo ? clone(mockAudit) : [],
  loading: false,
  loaded: false,
  toast: null,
};
const listeners = new Set<() => void>();
const setState = (patch: Partial<SpecialistState> | ((s: SpecialistState) => Partial<SpecialistState>)) => {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => state;

const toast = (message: string) => setState({ toast: { id: Date.now(), message } });

if (typeof window !== 'undefined') {
  window.addEventListener('rts_demo_mode_change', (event: Event) => {
    const customEvent = event as CustomEvent<{ role: string; enabled: boolean }>;
    if (customEvent.detail && customEvent.detail.role === 'specialist') {
      setState({ loaded: false });
      void loadAll();
      toast(customEvent.detail.enabled
        ? 'Đã bật dữ liệu mẫu & hiển thị nút demo trên toàn hệ thống.'
        : 'Đã tắt dữ liệu mẫu & ẩn nút demo trên toàn hệ thống.');
    }
  });
}
const ok = (message: string, id?: string): ActionResult => { toast(message); return { ok: true, message, id }; };
const fail = (message: string): ActionResult => { toast(message); return { ok: false, message }; };

/** Sửa dữ liệu trên bản sao rồi ghi lại (một lần cập nhật cho mọi danh sách) */
const mutate = (fn: (d: SpecialistData) => void) => setState((s) => {
  const d: SpecialistData = clone({
    trips: s.trips, docTypes: s.docTypes, regulations: s.regulations, packages: s.packages, customerDocs: s.customerDocs,
    documents: s.documents, requests: s.requests, bookings: s.bookings, audit: s.audit,
  });
  fn(d);
  return d;
});
const audit = (d: SpecialistData, action: string, entity: string, detail?: string, role: AuditEntry['role'] = 'TRANSPORT_SPECIALIST', actor = SPECIALIST_NAME) =>
  d.audit.unshift({ at: nowStamp(), actor, role, action, entity, detail });
const nextId = (prefix: string, ids: string[]) => `${prefix}-${Math.max(0, ...ids.map((x) => Number(x.split('-')[1]) || 0)) + 1}`;
const tripOf = (d: SpecialistData, id: string) => d.trips.find((t) => t.id === id);
/** Hồ sơ đổi sau khi đã xác nhận Docs READY thì xác nhận hết hiệu lực */
const invalidateReady = (t: SpecTrip) => { if (t.status === 'PLANNING' && t.docsReady) t.docsReady = undefined; };

async function loadAll() {
  if (state.loading || state.loaded) return;
  setState({ loading: true });
  try {
    const [trips, customerDocs, documents, requests, bookings, docTypes, regulations, packages, auditLog] = await Promise.all([
      specialistApi.getTrips(), specialistApi.getCustomerDocs(), specialistApi.getDocuments(), specialistApi.getRequests(), specialistApi.getBookings(),
      specialistApi.getDocTypes(), specialistApi.getRegulations(), specialistApi.getPackages(), specialistApi.getAudit(),
    ]);
    const isDemo = getDemoMode('specialist');
    if (!isDemo) {
      setState({
        trips: trips || [],
        customerDocs: customerDocs || [],
        documents: documents || [],
        requests: requests || [],
        bookings: bookings || [],
        docTypes: docTypes || [],
        regulations: regulations || [],
        packages: packages || [],
        audit: auditLog || [],
        loading: false,
        loaded: true,
      });
      return;
    }

    let displayTrips = trips || [];
    const existingIds = new Set(displayTrips.map((t) => t.id));
    const extraMocks = clone(mockTrips).filter((m) => !existingIds.has(m.id));
    displayTrips = [...displayTrips, ...extraMocks];

    let displayDocs = customerDocs || [];
    const existingDocKeys = new Set(displayDocs.map((d) => `${d.tripId}_${d.key}_${d.scope}`));
    const extraMockDocs = clone(mockCustomerDocs).filter((m) => !existingDocKeys.has(`${m.tripId}_${m.key}_${m.scope}`));
    displayDocs = [...displayDocs, ...extraMockDocs];

    setState({
      trips: displayTrips,
      customerDocs: displayDocs,
      documents: (documents && documents.length > 0) ? documents : clone(mockDocuments),
      requests: (requests && requests.length > 0) ? requests : clone(mockRequests),
      bookings: (bookings && bookings.length > 0) ? bookings : clone(mockBookings),
      docTypes: (docTypes && docTypes.length > 0) ? docTypes : clone(mockDocTypes),
      regulations: (regulations && regulations.length > 0) ? regulations : clone(mockRegulations),
      packages: (packages && packages.length > 0) ? packages : clone(mockPackages),
      audit: (auditLog && auditLog.length > 0) ? auditLog : clone(mockAudit),
      loading: false,
      loaded: true,
    });
  } catch {
    const isDemo = getDemoMode('specialist');
    if (!isDemo) {
      setState({ trips: [], customerDocs: [], documents: [], requests: [], bookings: [], loading: false, loaded: true });
    } else {
      setState({
        trips: clone(mockTrips),
        customerDocs: clone(mockCustomerDocs),
        documents: clone(mockDocuments),
        requests: clone(mockRequests),
        bookings: clone(mockBookings),
        loading: false,
        loaded: true,
      });
    }
  }
}

// ============================================================================
// Hành động của Transport Specialist
// ============================================================================
const specialistActions = {
  reload: () => { setState({ loaded: false }); void loadAll(); },
  clearToast: () => setState({ toast: null }),
  showToast: (m: string) => toast(m),

  // ----- Bộ yêu cầu hồ sơ -----
  applyRequirementSet(tripId: string, pkgId: string): ActionResult {
    const t = tripOf(state, tripId), p = state.packages.find((x) => x.id === pkgId);
    if (!t || !p) return fail('Không tìm thấy chuyến hoặc bộ yêu cầu.');
    if (opsBlock(t)) return fail(opsBlock(t));
    if (t.status !== 'PLANNING') return fail('Chuyến đã khởi hành – bộ yêu cầu được khóa.');
    if (pkgWhyNot(p, t)) return fail(pkgWhyNot(p, t));
    mutate((d) => {
      const tt = tripOf(d, tripId)!;
      tt.reqSet = snapshot(d, d.packages.find((x) => x.id === pkgId)!, SPECIALIST_NAME);
      invalidateReady(tt);
      audit(d, t.reqSet ? 'Cập nhật bộ yêu cầu hồ sơ' : 'Áp dụng bộ yêu cầu hồ sơ', tripId, `${p.id} • ${p.name} v${p.v}`);
    });
    void specialistApi.applyRequirementSet(tripId, pkgId);
    return ok(`Đã áp dụng ${p.name} v${p.v} cho ${tripId}. Checklist được lập theo bộ này.`);
  },

  // ----- Giấy tờ khách hàng cung cấp -----
  approveCustomerDoc(tripId: string, key: CustomerDocKey, scope: string): ActionResult {
    const t = tripOf(state, tripId), cd = customerDoc(state, tripId, key, scope);
    if (!t || !cd) return fail('Không tìm thấy giấy tờ.');
    if (opsBlock(t)) return fail(opsBlock(t));
    if (t.status === 'COMPLETED') return fail(`${tripId} đã hoàn tất.`);
    if (cd.status === 'APPROVED') return fail('Giấy tờ đã được duyệt.');
    if (['MISSING', 'ACTION_REQUIRED'].includes(cd.status)) return fail('Khách hàng chưa nộp bản mới để duyệt.');
    if (cd.expiry && cd.expiry < t.eta.slice(0, 10)) return fail(`Giấy tờ hết hạn ${fmtDate(cd.expiry)}, trước khi chuyến đến nơi. Hãy yêu cầu khách bổ sung bản mới.`);
    mutate((d) => {
      const x = customerDoc(d, tripId, key, scope)!;
      x.status = 'APPROVED'; x.issue = undefined; x.reviewedAt = nowStamp(); x.reviewedBy = SPECIALIST_NAME;
      d.requests.filter((q) => q.tripId === tripId && q.key === key && q.scope === scope && q.status !== 'FULFILLED')
        .forEach((q) => { q.status = 'FULFILLED'; q.history.push([nowStamp(), 'Đã duyệt bản khách nộp – yêu cầu hoàn tất']); });
      audit(d, 'Duyệt giấy tờ khách hàng', tripId, `${CUSTOMER_DOC_NAME[key]}${scope !== 'request' ? ` – ${scope}` : ''}`);
    });
    void specialistApi.reviewCustomerDoc(tripId, { key, scope, decision: 'APPROVED' });
    return ok(`Đã chấp thuận ${CUSTOMER_DOC_NAME[key]}.`);
  },
  requestCustomerDoc(tripId: string, key: CustomerDocKey, scope: string, reason: string, dueAt?: string): ActionResult {
    const t = tripOf(state, tripId), cd = customerDoc(state, tripId, key, scope);
    if (!t || !cd) return fail('Không tìm thấy giấy tờ.');
    if (opsBlock(t)) return fail(opsBlock(t));
    if (t.status === 'COMPLETED') return fail(`${tripId} đã hoàn tất.`);
    if (reason.trim().length < 5) return fail('Nhập lý do yêu cầu bổ sung (ít nhất 5 ký tự).');
    if (dueAt && dueAt < today()) return fail('Hạn nộp không được ở quá khứ.');
    if (openRequestFor(state, tripId, key, scope)) return fail('Giấy tờ này đã có yêu cầu bổ sung đang mở.');
    const id = nextId('DR', state.requests.map((x) => x.id));
    mutate((d) => {
      const x = customerDoc(d, tripId, key, scope)!;
      x.status = 'ACTION_REQUIRED'; x.issue = reason.trim(); x.optional = false;
      d.requests.push({ id, tripId, key, scope, reason: reason.trim(), dueAt: dueAt || undefined, status: 'OPEN', createdAt: nowStamp(), history: [[nowStamp(), 'Gửi yêu cầu cho khách hàng']] });
      invalidateReady(tripOf(d, tripId)!);
      audit(d, 'Yêu cầu khách bổ sung', tripId, `${CUSTOMER_DOC_NAME[key]} • ${reason.trim()}`);
    });
    void specialistApi.createDocRequest({ tripId, key, scope, reason, dueAt });
    return ok(`Đã gửi yêu cầu bổ sung ${id} cho khách hàng.`, id);
  },
  markRequestFulfilled(requestId: string): ActionResult {
    const q = state.requests.find((x) => x.id === requestId);
    if (!q) return fail('Không tìm thấy yêu cầu.');
    if (customerDoc(state, q.tripId, q.key, q.scope)?.status !== 'APPROVED') return fail('Chỉ hoàn tất khi giấy tờ được yêu cầu đã được duyệt.');
    mutate((d) => { const x = d.requests.find((y) => y.id === requestId)!; x.status = 'FULFILLED'; x.history.push([nowStamp(), 'Đánh dấu hoàn tất']); });
    return ok(`${requestId} đã hoàn tất.`);
  },

  // ----- Chứng từ CBN Transport -----
  recordDocument(input: RecordDocInput): ActionResult {
    const t = tripOf(state, input.tripId);
    if (!t) return fail('Không tìm thấy chuyến.');
    if (opsBlock(t)) return fail(opsBlock(t));
    if (!input.number.trim() || !input.issuer.trim() || !input.file.trim()) return fail('Nhập số giấy tờ, cơ quan cấp và tên tệp.');
    if (!input.issuedAt || !input.expiry) return fail('Nhập ngày cấp và ngày hết hạn.');
    if (input.expiry < input.issuedAt) return fail('Ngày hết hạn không được trước ngày cấp.');
    const cur = findDoc(state, t, input.typeId, input.horseId);
    const id = cur ? cur.id : nextId('DOC', state.documents.map((x) => x.id));
    mutate((d) => {
      const tt = tripOf(d, input.tripId)!;
      let doc = d.documents.find((x) => x.id === id);
      if (!doc) {
        doc = { id, tripId: input.tripId, typeId: input.typeId, horseId: input.horseId, status: 'SUBMITTED', number: '', issuer: '', issuedAt: '', expiry: '', versions: [], reviews: [], physicalCopy: false };
        d.documents.push(doc);
      }
      Object.assign(doc, { status: 'SUBMITTED', number: input.number.trim(), issuer: input.issuer.trim(), issuedAt: input.issuedAt, expiry: input.expiry, rejectReason: undefined });
      doc.versions.push({ v: doc.versions.length + 1, file: input.file.trim(), at: nowStamp(), by: SPECIALIST_NAME });
      invalidateReady(tt);
      audit(d, 'Ghi nhận chứng từ CBN', input.tripId, `${id} v${doc.versions.length}`);
    });
    void specialistApi.recordDocument(input);
    return ok(`Đã ghi nhận ${id}. Chứng từ chờ duyệt.`, id);
  },
  reviewDocument(docId: string, version: number, decision: 'APPROVED' | 'REJECTED', remark: string): ActionResult {
    const doc = state.documents.find((x) => x.id === docId);
    const t = doc && tripOf(state, doc.tripId);
    if (!doc || !t) return fail('Không tìm thấy chứng từ.');
    if (opsBlock(t)) return fail(opsBlock(t));
    if (t.status === 'COMPLETED') return fail(`${t.id} đã hoàn tất; chứng từ đã đóng.`);
    if (doc.status !== 'SUBMITTED') return fail('Chỉ xét duyệt được phiên bản đang chờ duyệt.');
    if (version !== doc.versions.length) return fail(`Phiên bản v${version} không còn là bản mới nhất.`);
    if (decision === 'REJECTED' && remark.trim().length < 5) return fail('Nhập lý do từ chối (ít nhất 5 ký tự).');
    if (decision === 'APPROVED' && doc.expiry && doc.expiry < t.eta.slice(0, 10)) return fail(`Chứng từ hết hạn ${fmtDate(doc.expiry)}, trước khi chuyến đến nơi.`);
    mutate((d) => {
      const x = d.documents.find((y) => y.id === docId)!;
      x.status = decision; x.rejectReason = decision === 'REJECTED' ? remark.trim() : undefined;
      x.reviews.push({ v: version, decision, at: nowStamp(), by: SPECIALIST_NAME, remark: remark.trim() });
      if (decision === 'REJECTED') invalidateReady(tripOf(d, x.tripId)!);
      audit(d, decision === 'APPROVED' ? 'Duyệt chứng từ' : 'Từ chối chứng từ', x.tripId, `${docId} v${version}${remark ? ` • ${remark.trim()}` : ''}`);
    });
    void specialistApi.reviewDocument(docId, { version, decision, remark });
    return ok(decision === 'APPROVED' ? `Đã duyệt ${docId} v${version}.` : `Đã từ chối ${docId} v${version}.`);
  },
  togglePhysicalCopy(docId: string) {
    mutate((d) => { const x = d.documents.find((y) => y.id === docId); if (x) { x.physicalCopy = !x.physicalCopy; audit(d, x.physicalCopy ? 'Đã nhận bản cứng gốc' : 'Bỏ đánh dấu bản cứng', x.tripId, docId); } });
  },

  // ----- Bảo hiểm -----
  saveInsurance(tripId: string, ins: Omit<Insurance, 'status'>): ActionResult {
    const t = tripOf(state, tripId);
    if (!t) return fail('Không tìm thấy chuyến.');
    if (opsBlock(t)) return fail(opsBlock(t));
    if (!ins.insurer.trim() || !ins.policy.trim() || !ins.validFrom || !ins.validTo || ins.coverage <= 0) return fail('Nhập đầy đủ hợp đồng bảo hiểm.');
    if (ins.validFrom > ins.validTo) return fail('Thời hạn bảo hiểm không hợp lệ.');
    mutate((d) => { const tt = tripOf(d, tripId)!; tt.insurance = { ...ins, status: 'PENDING' }; invalidateReady(tt); audit(d, 'Ghi nhận bảo hiểm', tripId, ins.policy); });
    void specialistApi.saveInsurance(tripId, ins);
    return ok('Đã lưu hợp đồng bảo hiểm, chờ xác minh.');
  },
  verifyInsurance(tripId: string): ActionResult {
    const t = tripOf(state, tripId), ins = t?.insurance;
    if (!t || !ins) return fail('Chưa có hợp đồng bảo hiểm.');
    if (opsBlock(t)) return fail(opsBlock(t));
    if (ins.validFrom > t.plannedDepart.slice(0, 10) || ins.validTo < t.eta.slice(0, 10)) return fail('Bảo hiểm phải bao phủ toàn bộ thời gian từ khi nhận ngựa đến khi bàn giao.');
    mutate((d) => { const x = tripOf(d, tripId)!.insurance!; x.status = 'VERIFIED'; x.checkedBy = SPECIALIST_NAME; x.checkedAt = nowStamp(); audit(d, 'Xác minh bảo hiểm', tripId, ins.policy); });
    void specialistApi.verifyInsurance(tripId);
    return ok('Bảo hiểm đã được xác minh.');
  },

  // ----- Docs READY -----
  confirmDocsReady(tripId: string): ActionResult {
    const t = tripOf(state, tripId);
    if (!t) return fail('Không tìm thấy chuyến.');
    const why = docsReadyBlock(state, t);
    if (why) return fail(why);
    mutate((d) => { tripOf(d, tripId)!.docsReady = { at: nowStamp(), by: SPECIALIST_NAME }; audit(d, 'Xác nhận hồ sơ sẵn sàng (Docs READY)', tripId); });
    void specialistApi.confirmDocsReady(tripId);
    return ok(`Đã xác nhận hồ sơ sẵn sàng cho ${tripId}. Manager có thể duyệt khởi hành.`);
  },

  // ----- Kiểm dịch & thông quan -----
  createBooking(tripId: string, station: string, slot: string, notes: string): ActionResult {
    const t = tripOf(state, tripId);
    if (!t) return fail('Không tìm thấy chuyến.');
    if (opsBlock(t)) return fail(opsBlock(t));
    if (!station.trim() || !slot) return fail('Nhập trạm kiểm dịch và ngày dự kiến.');
    const id = nextId('QB', state.bookings.map((x) => x.id));
    mutate((d) => { d.bookings.push({ id, tripId, station: station.trim(), slot, ref: '', status: 'REQUESTED', notes: notes.trim() }); audit(d, 'Đặt lịch kiểm dịch', tripId, station); });
    void specialistApi.saveBooking({ tripId, station, slot, notes });
    return ok(`Đã gửi yêu cầu đặt lịch ${id}.`, id);
  },
  confirmBooking(bookingId: string, ref: string): ActionResult {
    if (ref.trim().length < 3) return fail('Nhập mã xác nhận của trạm kiểm dịch.');
    mutate((d) => { const b = d.bookings.find((x) => x.id === bookingId); if (b) { b.status = 'BOOKED'; b.ref = ref.trim(); b.confirmedAt = nowStamp(); audit(d, 'Xác nhận lịch kiểm dịch', b.tripId, `${b.station} • ${ref.trim()}`); } });
    return ok('Đã ghi nhận xác nhận lịch kiểm dịch.');
  },
  recordClearance(tripId: string, index: number, result: ClearanceResult, ref: string): ActionResult {
    const t = tripOf(state, tripId), cp = t?.checkpoints[index];
    if (!t || !cp) return fail('Không tìm thấy điểm kiểm tra.');
    if (t.status !== 'IN_TRANSIT') return fail('Kết quả thông quan được ghi nhận trong hành trình.');
    if (!cp.arrivedAt) return fail('Tổ xe chưa xác nhận đến điểm kiểm tra này.');
    if (cp.clearance?.result === 'PASSED') return fail('Đã đạt – kết quả là cuối cùng.');
    if (ref.trim().length < 3) return fail('Nhập số biên bản / mã quyết định của cơ quan chức năng.');
    mutate((d) => { const c = tripOf(d, tripId)!.checkpoints[index]; c.clearance = { result, at: nowStamp(), ref: ref.trim(), by: SPECIALIST_NAME }; audit(d, 'Ghi nhận kết quả thông quan', tripId, `${c.name}: ${result}`); });
    void specialistApi.recordClearance(tripId, { index, result, ref });
    return ok('Đã ghi nhận kết quả thông quan.');
  },

  // ----- Quy định & thiết lập -----
  saveDocType(dt: DocType): ActionResult {
    if (!dt.name.trim()) return fail('Nhập tên loại giấy tờ.');
    if (state.docTypes.some((x) => x.id !== dt.id && x.name.trim().toLowerCase() === dt.name.trim().toLowerCase())) return fail('Tên loại giấy tờ đã tồn tại.');
    const id = dt.id || nextId('DT', state.docTypes.map((x) => x.id));
    mutate((d) => {
      const i = d.docTypes.findIndex((x) => x.id === id);
      const next = { ...dt, id, name: dt.name.trim() };
      if (i >= 0) d.docTypes[i] = next; else d.docTypes.push(next);
      audit(d, i >= 0 ? 'Sửa loại giấy tờ' : 'Thêm loại giấy tờ', id, next.name);
    });
    void specialistApi.saveDocType({ ...dt, id });
    return ok(`Đã lưu loại giấy tờ ${id}.`, id);
  },
  saveRegulation(reg: Regulation): ActionResult {
    if (!reg.lines.length) return fail('Thêm ít nhất một giấy tờ vào yêu cầu.');
    if (new Set(reg.lines.map((l) => l.typeId)).size !== reg.lines.length) return fail('Mỗi loại giấy tờ chỉ xuất hiện một lần trong một yêu cầu.');
    if (state.regulations.some((g) => g.id !== reg.id && g.country === reg.country && g.direction === reg.direction && g.status === 'ACTIVE'))
      return fail('Quốc gia và hướng này đã có yêu cầu đang áp dụng.');
    const id = reg.id || nextId('REG', state.regulations.map((x) => x.id));
    const old = state.regulations.find((x) => x.id === id);
    const used = state.trips.some((t) => t.reqSet?.rules.some((r) => r.regId === id));
    mutate((d) => {
      const next: Regulation = { ...reg, id, v: old ? (used ? old.v + 1 : old.v) : 1, effectiveFrom: old && !used ? old.effectiveFrom : today() };
      const i = d.regulations.findIndex((x) => x.id === id);
      if (i >= 0) d.regulations[i] = next; else d.regulations.push(next);
      audit(d, old ? 'Sửa yêu cầu theo quốc gia/tuyến' : 'Thêm yêu cầu theo quốc gia/tuyến', id, `v${next.v}`);
    });
    void specialistApi.saveRegulation({ ...reg, id });
    return ok(old && used ? `Đã lưu ${id} thành phiên bản mới; chuyến đã áp dụng giữ phiên bản cũ.` : `Đã lưu yêu cầu ${id}.`, id);
  },
  savePackage(p: RegPackage): ActionResult {
    if (!p.name.trim()) return fail('Nhập tên bộ yêu cầu.');
    if (!p.items.length) return fail('Chọn ít nhất một yêu cầu quốc gia/hướng.');
    if (!p.modes.length) return fail('Chọn ít nhất một phương thức vận chuyển.');
    const id = p.id || nextId('RP', state.packages.map((x) => x.id));
    const old = state.packages.find((x) => x.id === id);
    const used = state.trips.some((t) => t.reqSet?.pkgId === id);
    mutate((d) => {
      const next: RegPackage = { ...p, id, name: p.name.trim(), v: old ? (used ? old.v + 1 : old.v) : 1, effectiveFrom: old && !used ? old.effectiveFrom : today() };
      const i = d.packages.findIndex((x) => x.id === id);
      if (i >= 0) d.packages[i] = next; else d.packages.push(next);
      audit(d, old ? 'Sửa bộ yêu cầu hồ sơ' : 'Thêm bộ yêu cầu hồ sơ', id, `${next.name} v${next.v}`);
    });
    void specialistApi.savePackage({ ...p, id });
    return ok(old && used ? `Đã lưu ${id} thành phiên bản mới; chuyến đã áp dụng không tự thay đổi.` : `Đã lưu bộ yêu cầu ${id}.`, id);
  },
  toggleConfigStatus(kind: 'type' | 'reg' | 'pkg', id: string): ActionResult {
    let label = '';
    mutate((d) => {
      const list: Array<{ id: string; status: 'ACTIVE' | 'RETIRED' }> = kind === 'type' ? d.docTypes : kind === 'reg' ? d.regulations : d.packages;
      const x = list.find((y) => y.id === id);
      if (!x) return;
      x.status = x.status === 'ACTIVE' ? 'RETIRED' : 'ACTIVE';
      label = x.status === 'ACTIVE' ? 'Áp dụng lại' : 'Ngừng áp dụng';
      audit(d, label, id);
    });
    return ok(`${label}: ${id}. Lịch sử và chuyến đã dùng được giữ nguyên.`);
  },
};

// ============================================================================
// Nút demo: giả lập thao tác của Manager / khách hàng / tổ xe (không bao giờ là một quyết định duyệt)
// ============================================================================
const demoActions = {
  managerAssign(tripId: string): ActionResult {
    const t = tripOf(state, tripId);
    if (!t || t.deployment === 'CONFIRMED') return fail('Chuyến đã được giao.');
    mutate((d) => { tripOf(d, tripId)!.deployment = 'CONFIRMED'; audit(d, 'Giao chuyến cho Specialist', tripId, undefined, 'LOGISTICS_MANAGER', 'Linh Pham'); });
    return ok(`Demo: Manager đã giao ${tripId} cho bạn. Hãy chọn bộ yêu cầu hồ sơ.`);
  },
  customerUpload(tripId: string): ActionResult {
    const target = state.customerDocs.find((x) => x.tripId === tripId && !x.optional && ['ACTION_REQUIRED', 'MISSING'].includes(x.status));
    if (!target) return fail('Demo: không có giấy tờ nào đang chờ khách nộp.');
    mutate((d) => {
      const x = customerDoc(d, tripId, target.key, target.scope)!;
      x.status = 'SUBMITTED'; x.issue = undefined; x.file = `${target.scope.toLowerCase()}-${target.key}-moi.pdf`;
      if (x.key === 'health') x.expiry = addDays(tripOf(d, tripId)!.eta.slice(0, 10), 5);
      d.requests.filter((q) => q.tripId === tripId && q.key === target.key && q.scope === target.scope && q.status === 'OPEN')
        .forEach((q) => { q.status = 'SUBMITTED'; q.history.push([nowStamp(), 'Khách hàng đã nộp lại']); });
      audit(d, 'Khách hàng nộp giấy tờ', tripId, CUSTOMER_DOC_NAME[target.key], 'CUSTOMER', 'Alex Equine');
    });
    return ok(`Demo: khách hàng đã nộp ${CUSTOMER_DOC_NAME[target.key]} – chờ bạn duyệt.`);
  },
  prepareAll(tripId: string): ActionResult {
    const t = tripOf(state, tripId);
    if (!t || opsBlock(t)) return fail(t ? opsBlock(t) : 'Không tìm thấy chuyến.');
    if (t.status !== 'PLANNING') return fail('Chuyến đã qua bước chuẩn bị.');
    mutate((d) => {
      const tt = tripOf(d, tripId)!;
      if (!tt.reqSet) { const p = suggestPackage(d, tt); if (p) tt.reqSet = snapshot(d, p, SPECIALIST_NAME); }
      d.customerDocs.filter((x) => x.tripId === tripId && !x.optional).forEach((x) => {
        x.status = 'APPROVED'; x.issue = undefined; x.file = x.file ?? `${x.scope.toLowerCase()}-${x.key}.pdf`;
        if (x.expiry && x.expiry < tt.eta.slice(0, 10)) x.expiry = addDays(tt.eta.slice(0, 10), 5);
        x.reviewedAt = nowStamp(); x.reviewedBy = SPECIALIST_NAME;
      });
      d.requests.filter((q) => q.tripId === tripId && q.status !== 'FULFILLED').forEach((q) => { q.status = 'FULFILLED'; q.history.push([nowStamp(), 'Demo: đã hoàn tất']); });
      checklist(d, tt).items.filter((i) => i.counted && i.provider === 'CBN' && i.status !== 'APPROVED' && !i.missingRule).forEach((i) => {
        let doc = findDoc(d, tt, i.typeId, i.horseId);
        if (!doc) {
          doc = { id: nextId('DOC', d.documents.map((x) => x.id)), tripId, typeId: i.typeId, horseId: i.horseId, status: 'SUBMITTED', number: '', issuer: '', issuedAt: '', expiry: '', versions: [], reviews: [], physicalCopy: false };
          d.documents.push(doc);
        }
        Object.assign(doc, { status: 'APPROVED', number: `${i.typeId}-${tripId.slice(4)}`, issuer: 'Cơ quan chức năng (demo)', issuedAt: today(), expiry: addDays(tt.eta.slice(0, 10), 30), rejectReason: undefined, physicalCopy: true });
        doc.versions.push({ v: doc.versions.length + 1, file: `${tripId.toLowerCase()}-${i.typeId.toLowerCase()}.pdf`, at: nowStamp(), by: SPECIALIST_NAME });
        doc.reviews.push({ v: doc.versions.length, decision: 'APPROVED', at: nowStamp(), by: SPECIALIST_NAME, remark: 'Demo: chuẩn bị đủ hồ sơ' });
      });
      tt.insurance = { insurer: 'Bảo hiểm Bảo Việt', policy: tt.insurance?.policy ?? `BV-DEMO-${tripId.slice(4)}`, validFrom: tt.plannedDepart.slice(0, 10), validTo: addDays(tt.eta.slice(0, 10), 1), coverage: 150000, status: 'VERIFIED', checkedBy: SPECIALIST_NAME, checkedAt: nowStamp() };
      audit(d, 'Demo: chuẩn bị đủ hồ sơ', tripId);
    });
    return ok('Demo: đã chuẩn bị đủ hồ sơ và bảo hiểm. Có thể xác nhận Docs READY.');
  },
  expireDocument(tripId: string): ActionResult {
    const target = state.documents.find((x) => x.tripId === tripId && x.status === 'APPROVED');
    if (!target) return fail('Demo: chuyến chưa có chứng từ đã duyệt.');
    mutate((d) => { const x = d.documents.find((y) => y.id === target.id)!; x.expiry = addDays(today(), -1); invalidateReady(tripOf(d, tripId)!); audit(d, 'Demo: chứng từ hết hạn', tripId, target.id, 'SYSTEM', 'Hệ thống'); });
    return ok(`Demo: ${target.id} đã hết hạn.`);
  },
  crewArrive(tripId: string): ActionResult {
    const t = tripOf(state, tripId);
    const i = t ? t.checkpoints.findIndex((c) => !c.arrivedAt) : -1;
    if (!t || t.status !== 'IN_TRANSIT' || i < 0) return fail('Demo: không còn điểm kiểm tra nào chưa đến.');
    mutate((d) => { const c = tripOf(d, tripId)!.checkpoints[i]; c.arrivedAt = nowStamp(); audit(d, 'Tổ xe đến điểm kiểm tra', tripId, c.name, 'SYSTEM', 'Tổ xe'); });
    return ok(`Demo: tổ xe đã đến ${t.checkpoints[i].name}.`);
  },
};

export type SpecialistActions = typeof specialistActions & { demo: typeof demoActions };
const actions: SpecialistActions = { ...specialistActions, demo: demoActions };

// ============================================================================
// Hook
// ============================================================================
export function useSpecialist() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => { void loadAll(); }, []);

  const stats = useMemo(() => {
    const active = snap.trips.filter((t) => t.status !== 'COMPLETED');
    return {
      awaiting: snap.documents.filter((d) => d.status === 'SUBMITTED' && deployed(snap.trips.find((t) => t.id === d.tripId))).length
        + snap.customerDocs.filter((d) => d.status === 'SUBMITTED' && deployed(snap.trips.find((t) => t.id === d.tripId))).length,
      missing: missingItems(snap).length,
      rejected: snap.documents.filter((d) => d.status === 'REJECTED').length + snap.customerDocs.filter((d) => d.status === 'ACTION_REQUIRED').length,
      expiring: snap.documents.filter((d) => active.some((t) => t.id === d.tripId) && (expiringOrExpired(d) || docEffective(d) === 'EXPIRED')).length,
      openRequests: snap.requests.filter((x) => x.status !== 'FULFILLED').length,
      answered: snap.requests.filter((x) => x.status === 'SUBMITTED').length,
      prep: prepTrips(snap).length,
      waitingDeploy: snap.trips.filter((t) => t.deployment === 'NOT_CONFIRMED').length,
    };
  }, [snap]);

  const getTrip = (id?: string) => snap.trips.find((t) => t.id === id);
  const getDocument = (id?: string) => snap.documents.find((d) => d.id === id);
  /** Mục checklist có trạng thái 'chờ duyệt' của khách hàng được map về loại giấy tờ */
  const customerKeyOf = (typeId: string) => TYPE_CUSTOMER_KEY[typeId];

  return { ...snap, data: snap as SpecialistData, stats, getTrip, getDocument, customerKeyOf, actions };
}

export default useSpecialist;
