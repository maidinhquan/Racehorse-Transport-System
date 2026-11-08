import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type {
  ActionResult,
  AuditEntry,
  ClearanceResult,
  CustomerDoc,
  CustomerDocKey,
  DocType,
  Insurance,
  RecordDocInput,
  RegPackage,
  Regulation,
  SpecTrip,
} from '../types';
import { specialistApi } from '../api/specialistApi';
import { getSharedIncidents } from '../../../shared/utils/sharedIncidents';
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
  findMatchingPackage,
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
import { getSharedRequests, saveSharedRequest } from '../../../shared/utils/sharedRequests';
import { getSharedTrips } from '../../../shared/utils/sharedTrips';
import { createSyncController } from '../../../shared/utils/syncChannel';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const cleanId = (x?: string | null) => (x || '').replace(/-/g, '_');

let state: SpecialistState;

export function autoApplyMatchingPackages(trips: SpecTrip[], packages: RegPackage[], dataContext?: SpecialistData): boolean {
  let changed = false;
  for (const t of trips) {
    if (!t.reqSet) {
      const match = findMatchingPackage(packages, t.originCountry, t.destCountry, t.mode);
      if (match) {
        const dummyData: SpecialistData = dataContext ?? {
          trips,
          docTypes: (state && state.docTypes) ? state.docTypes : (getDemoMode('specialist') ? clone(mockDocTypes) : []),
          regulations: (state && state.regulations) ? state.regulations : (getDemoMode('specialist') ? clone(mockRegulations) : []),
          packages,
          customerDocs: (state && state.customerDocs) ? state.customerDocs : [],
          documents: (state && state.documents) ? state.documents : [],
          requests: (state && state.requests) ? state.requests : [],
          bookings: (state && state.bookings) ? state.bookings : [],
          audit: (state && state.audit) ? state.audit : [],
        };
        t.reqSet = snapshot(dummyData, match, 'Hệ thống tự động');
        changed = true;
      }
    }
  }
  return changed;
}

function sharedTripsAndDocs(): { trips: SpecTrip[]; customerDocs: CustomerDoc[] } {
  const shared = getSharedRequests();
  const trips: SpecTrip[] = [];
  const customerDocs: CustomerDoc[] = [];

  for (const r of shared) {
    const isAir = (r.origin && r.destination && (r.origin.includes('Tokyo') || r.destination.includes('Sapporo') || r.destination.includes('Japan') || r.destination.includes('Osaka')));
    const tripId = `TRP-${(r.id || '').replace(/^TRN[_-]/, '')}`;
    const horseList = (r.horses && r.horses.length > 0 ? r.horses : ['HOR-1029']).map((h: string) => ({
      id: h,
      name: h.includes('1029') ? 'Thunderbolt' : (r.horseName || h),
      microchip: '985112004571029',
      passportNo: 'VN-EQ-2020-1029',
    }));
    trips.push({
      id: tripId,
      requestId: r.id,
      customerName: r.customerName || (r.pickup?.contact) || 'Nguyễn Văn A',
      origin: r.origin,
      destination: r.destination,
      originCountry: 'VN',
      destCountry: r.destination?.includes('Sapporo') || r.destination?.includes('Tokyo') ? 'JP' : 'VN',
      mode: isAir ? 'AIR' : 'ROAD',
      status: 'PLANNING',
      deployment: 'CONFIRMED',
      plannedDepart: `${r.date || '2026-12-26'} 06:00`,
      eta: `${r.date || '2026-12-26'} 22:00`,
      horses: horseList,
      checkpoints: isAir ? [
        { name: 'Sân bay Tân Sơn Nhất', type: 'AIRPORT', country: 'VN', plannedAt: `${r.date || '2026-12-26'} 10:00` },
        { name: 'Sân bay New Chitose (AQS)', type: 'QUARANTINE_STATION', country: 'JP', plannedAt: `${r.date || '2026-12-26'} 20:00` },
      ] : [],
    });

    // Chuẩn hoá đầy đủ bộ 6 hồ sơ cho từng ngựa trong chuyến:
    // 3 mục bắt buộc: passport (Hộ chiếu), flu (Sổ tiêm cúm), health (Giấy khám sức khỏe)
    // 3 mục thông tin bổ trợ: ownership (Sở hữu), bio (Sinh học/vi mạch), valueProof (Giá trị)
    const STANDARD_CUSTOMER_DOCS: Array<{ key: CustomerDocKey; optional: boolean; defaultNote: string }> = [
      { key: 'passport', optional: false, defaultNote: 'Hộ chiếu ngựa' },
      { key: 'ownership', optional: false, defaultNote: 'Chứng nhận sở hữu ngựa' },
      { key: 'bio', optional: false, defaultNote: 'Thông tin sinh học' },
      { key: 'valueProof', optional: false, defaultNote: 'Giá trị thương mại' },
      { key: 'flu', optional: false, defaultNote: 'Tiêm vắc xin cúm định kỳ' },
      { key: 'health', optional: false, defaultNote: 'Chứng nhận kiểm dịch thú y đủ điều kiện di chuyển' },
    ];

    for (const h of horseList) {
      for (const std of STANDARD_CUSTOMER_DOCS) {
        const found = (Array.isArray(r.docs) ? r.docs : []).find(
          (d: any) => (d.key === std.key || (std.key === 'flu' && d.key === 'vaccine')) && (cleanId(d.scope) === cleanId(h.id) || !d.scope)
        ) || (Array.isArray(r.dossier) ? r.dossier : []).find(
          (d: any) => {
            const k = d.name?.toLowerCase().includes('tiêm') ? 'flu' : d.name?.toLowerCase().includes('hộ chiếu') ? 'passport' : d.name?.toLowerCase().includes('sở hữu') ? 'ownership' : d.name?.toLowerCase().includes('sinh học') ? 'bio' : d.name?.toLowerCase().includes('giá trị') ? 'valueProof' : d.name?.toLowerCase().includes('sức khỏe') ? 'health' : '';
            return k === std.key && (cleanId(d.scope) === cleanId(h.id) || !d.scope);
          }
        );

        const status = found?.status === 'APPROVED' ? 'APPROVED' : found?.status === 'ACTION_REQUIRED' ? 'ACTION_REQUIRED' : (found?.status === 'OPTIONAL' ? 'SUBMITTED' : (found?.status || 'SUBMITTED'));

        customerDocs.push({
          tripId,
          key: std.key,
          scope: h.id,
          status: status as any,
          optional: false,
          file: typeof found?.file === 'object' && found.file ? found.file.name : (found?.file || `${h.id.toLowerCase()}-${std.key}.png`),
          reviewedAt: found?.reviewedAt,
          reviewedBy: found?.reviewedBy,
          note: found?.note || (std.key === 'bio' ? `Màu: Nâu hạt dẻ, Giống: Thoroughbred, Vi mạch: ${h.microchip || '985112004571029'}` : std.defaultNote),
          issue: found?.issue,
          expiry: found?.expiry,
        });
      }
    }
  }

  // Tích hợp từ sharedTrips do Quản lý phân công hoặc Điều phối lập
  const sharedTripsMap = getSharedTrips();
  Object.values(sharedTripsMap).forEach((st) => {
    const existing = trips.find((t) => cleanId(t.id) === cleanId(st.id) || (st.requestId && cleanId(t.requestId) === cleanId(st.requestId)));
    const depStatus = (typeof st.deployment === 'object' ? st.deployment?.status : st.deployment) || (st.specialistId ? 'CONFIRMED' : 'NOT_CONFIRMED');
    if (existing) {
      if (st.status) existing.status = st.status as any;
      if (st.plannedDepart) existing.plannedDepart = st.plannedDepart;
      if (st.eta) existing.eta = st.eta;
      if (depStatus) existing.deployment = depStatus as any;
      (existing as any).specialistId = st.specialistId || (typeof st.deployment === 'object' ? st.deployment?.specialistId : undefined);
      (existing as any).coordinatorId = st.coordinatorId || (typeof st.deployment === 'object' ? st.deployment?.coordinatorId : undefined);
      if (st.updatedAt) (existing as any).updatedAt = st.updatedAt;
    } else {
      const isAir = st.mode === 'AIR';
      trips.unshift({
        id: st.id,
        requestId: st.requestId || `TRN-${st.id.replace(/\D/g, "")}`,
        customerName: st.customerName || 'Khách hàng',
        origin: st.origin || (isAir ? 'Hanoi' : 'Ho Chi Minh City'),
        destination: st.destination || (isAir ? 'Tokyo' : 'Da Nang'),
        originCountry: (st.originCountry as any) || 'VN',
        destCountry: (st.destCountry as any) || (isAir ? 'JP' : 'VN'),
        mode: (st.mode as any) || (isAir ? 'AIR' : 'ROAD'),
        status: (st.status as any) || 'PLANNING',
        deployment: depStatus as any,
        plannedDepart: st.plannedDepart || `${today()} 06:00`,
        eta: st.eta || `${today()} 22:00`,
        horses: Array.isArray(st.horses) && st.horses.length > 0 ? st.horses : [{ id: 'HOR-1029', name: 'Thunderbolt', microchip: '985112004571029', passportNo: 'VN-EQ-2020-1029' }],
        checkpoints: Array.isArray(st.checkpoints) ? st.checkpoints : [],
        ...({
          specialistId: st.specialistId || (typeof st.deployment === 'object' ? st.deployment?.specialistId : undefined),
          coordinatorId: st.coordinatorId || (typeof st.deployment === 'object' ? st.deployment?.coordinatorId : undefined),
          updatedAt: st.updatedAt,
        } as any),
      });
    }
  });
  const currentPkgs = (state && state.packages && state.packages.length) ? state.packages : (getDemoMode('specialist') ? clone(mockPackages) : []);
  autoApplyMatchingPackages(trips, currentPkgs);
  return { trips, customerDocs };
}

export function normalizeCustomerDocs(docs: CustomerDoc[], trips: SpecTrip[]): CustomerDoc[] {
  const cleanId = (x?: string | null) => (x || '').replace(/-/g, '_');
  const STANDARD_KEYS: CustomerDocKey[] = ['passport', 'ownership', 'bio', 'valueProof', 'flu', 'health'];
  const STANDARD_TITLES: Partial<Record<CustomerDocKey, string>> = {
    passport: 'Hộ chiếu ngựa',
    ownership: 'Chứng nhận sở hữu ngựa',
    bio: 'Thông tin sinh học',
    valueProof: 'Giá trị thương mại',
    flu: 'Sổ tiêm ngừa',
    health: 'Giấy chứng nhận sức khỏe',
    conditions: 'Ghi chú sức khỏe đặc biệt'
  };

  const normalized: CustomerDoc[] = docs.map((d) => ({
    ...d,
    optional: false,
    status: d.status === 'OPTIONAL' ? 'SUBMITTED' : d.status,
  }));

  for (const t of trips) {
    const horses = t.horses && t.horses.length > 0 ? t.horses : [{ id: 'HOR-1029', name: 'Thunderbolt' }];
    const tTrips = [t.id, cleanId(t.id), t.requestId, cleanId(t.requestId)].filter(Boolean);
    for (const h of horses) {
      for (const k of STANDARD_KEYS) {
        const exists = normalized.some(
          (d) =>
            tTrips.some((tid) => tid === d.tripId || cleanId(d.tripId) === tid) &&
            d.key === k &&
            (cleanId(d.scope) === cleanId(h.id) || !d.scope)
        );
        if (!exists) {
          normalized.push({
            tripId: t.id,
            key: k,
            scope: h.id,
            status: 'SUBMITTED',
            optional: false,
            file: `${h.id.toLowerCase()}-${k}.pdf`,
            note: STANDARD_TITLES[k] || '',
          });
        }
      }
    }
  }

  return normalized;
}

const initialDemo = getDemoMode('specialist');
const initialShared = sharedTripsAndDocs();
const initialTrips = initialDemo
  ? [...initialShared.trips, ...clone(mockTrips).filter((m) => !initialShared.trips.some((s) => cleanId(s.id) === cleanId(m.id)))]
  : initialShared.trips;
const initialCustomerDocs = normalizeCustomerDocs(
  initialDemo
    ? [...initialShared.customerDocs, ...clone(mockCustomerDocs).filter((m) => !initialShared.customerDocs.some((s) => cleanId(s.tripId) === cleanId(m.tripId) && s.key === m.key))]
    : initialShared.customerDocs,
  initialTrips
);

state = {
  trips: initialTrips,
  docTypes: initialDemo ? clone(mockDocTypes) : [],
  regulations: initialDemo ? clone(mockRegulations) : [],
  packages: initialDemo ? clone(mockPackages) : [],
  customerDocs: initialCustomerDocs,
  documents: initialDemo ? clone(mockDocuments) : [],
  requests: initialDemo ? clone(mockRequests) : [],
  bookings: initialDemo ? clone(mockBookings) : [],
  audit: initialDemo ? clone(mockAudit) : [],
  loading: false,
  loaded: false,
  toast: null,
};
autoApplyMatchingPackages(state.trips, state.packages);
const listeners = new Set<() => void>();
const setState = (patch: Partial<SpecialistState> | ((s: SpecialistState) => Partial<SpecialistState>)) => {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  listeners.forEach((l) => l());
};
let unsubscribeSyncController: (() => void) | null = null;
const subscribe = (l: () => void) => {
  listeners.add(l);
  if (listeners.size === 1) unsubscribeSyncController = syncController.subscribe();
  return () => {
    listeners.delete(l);
    if (listeners.size === 0 && unsubscribeSyncController) { unsubscribeSyncController(); unsubscribeSyncController = null; }
  };
};
const getSnapshot = () => state;

/** Bỏ các khóa undefined/null để bản sao cục bộ không xóa dữ liệu đã có */
const definedOnly = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null)) as Partial<T>;

/** Chuyến đã có giấy tờ từ backend: bản lưu cục bộ không được ghi đè hay thêm trùng cho các chuyến này */
let backendDocTrips = new Set<string>();
const mergeBackendDocs = (backend: any[], shared: any[]) => {
  backendDocTrips = new Set(backend.map((d) => cleanId(d.tripId)));
  return [...backend, ...shared.filter((x) => !backendDocTrips.has(cleanId(x.tripId)))];
};

/** Tải lại giấy tờ khách hàng và yêu cầu bổ sung từ backend (giữ nguyên dữ liệu đang chỉnh khác) để thấy khách vừa nộp */
async function refreshCustomerDocs() {
  if (!state.loaded || getDemoMode('specialist')) return;
  try {
    const [customerDocs, requests] = await Promise.all([specialistApi.getCustomerDocs(), specialistApi.getRequests()]);
    if (!customerDocs || customerDocs.length === 0) return;
    setState((s) => ({
      customerDocs: normalizeCustomerDocs(mergeBackendDocs(customerDocs, s.customerDocs), s.trips),
      ...(requests && requests.length > 0 ? { requests } : {}),
    }));
  } catch {
    // giữ dữ liệu hiện tại, lần làm mới sau sẽ thử lại
  }
}
const syncController = createSyncController({ intervalMs: 15000, onRefresh: () => refreshCustomerDocs(), eventType: 'requests_updated' });

const toast = (message: string) => setState({ toast: { id: Date.now(), message } });

if (typeof window !== 'undefined') {
  window.addEventListener('rts_requests_updated', () => {
    const sh = sharedTripsAndDocs();
    setState((s) => {
      const newTrips = [...s.trips];
      for (const t of sh.trips) {
        const idx = newTrips.findIndex((x) => cleanId(x.id) === cleanId(t.id));
        if (idx >= 0) newTrips[idx] = { ...newTrips[idx], ...definedOnly(t), insurance: newTrips[idx].insurance ?? (t as any).insurance, horses: newTrips[idx].horses?.length ? newTrips[idx].horses : (t as any).horses };
        else newTrips.unshift(t);
      }
      const newDocs = [...s.customerDocs];
      for (const d of sh.customerDocs) {
        if (backendDocTrips.has(cleanId(d.tripId)) && !getDemoMode('specialist')) continue;
        const idx = newDocs.findIndex((x) => cleanId(x.tripId) === cleanId(d.tripId) && x.key === d.key && cleanId(x.scope) === cleanId(d.scope));
        if (idx >= 0) newDocs[idx] = { ...newDocs[idx], ...d };
        else newDocs.unshift(d);
      }
      return { trips: newTrips, customerDocs: newDocs };
    });
  });

  window.addEventListener('rts_demo_mode_change', (event: Event) => {
    const customEvent = event as CustomEvent<{ role: string; enabled: boolean }>;
    if (customEvent.detail && customEvent.detail.role === 'specialist') {
      const sh = sharedTripsAndDocs();
      if (customEvent.detail.enabled) {
        const mergedTrips = [...sh.trips, ...clone(mockTrips).filter((m) => !sh.trips.some((s) => cleanId(s.id) === cleanId(m.id)))];
        const mergedDocs = [...sh.customerDocs, ...clone(mockCustomerDocs).filter((m) => !sh.customerDocs.some((s) => cleanId(s.tripId) === cleanId(m.tripId) && s.key === m.key))];
        setState({
          trips: mergedTrips,
          customerDocs: mergedDocs,
          documents: clone(mockDocuments),
          requests: clone(mockRequests),
          bookings: clone(mockBookings),
          audit: clone(mockAudit),
          docTypes: clone(mockDocTypes),
          regulations: clone(mockRegulations),
          packages: clone(mockPackages),
          loading: false,
          loaded: true,
        });
        toast('Đã bật dữ liệu mẫu & hiển thị nút demo trên toàn hệ thống.');
      } else {
        setState({
          trips: sh.trips,
          customerDocs: sh.customerDocs,
          documents: [],
          requests: [],
          bookings: [],
          audit: [],
          docTypes: [],
          regulations: [],
          packages: [],
          loading: false,
          loaded: false,
        });
        toast('Đã tắt dữ liệu mẫu & ẩn nút demo trên toàn hệ thống.');
      }
    }
  });
}
/** Mã chứng từ trên giao diện -> mã do backend cấp (sau khi ghi nhận) */
const serverDocId = new Map<string, string>();
const pendingDocSync = new Map<string, Promise<void>>();
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
const tripOf = (d: SpecialistData, id: string) => {
  const found = d.trips.find((t) => t.id === id || cleanId(t.id) === cleanId(id) || cleanId(t.requestId) === cleanId(id));
  if (found) return found;
  const mock = mockTrips.find((m) => m.id === id || cleanId(m.id) === cleanId(id) || cleanId(m.requestId) === cleanId(id));
  if (mock) {
    const copy = clone(mock);
    d.trips.push(copy);
    return copy;
  }
  return undefined;
};
/** Kiểm tra xem hồ sơ chuyến có đang bị khoá sau khi Docs READY không (chỉ mở khi có sự cố) */
const checkDocsLocked = (tripId: string): string | null => {
  const t = tripOf(state, tripId);
  if (!t || !t.docsReady) return null;
  const incs = getSharedIncidents(tripId);
  const hasIncident = (t.status as string) === 'INCIDENT' || incs.length > 0;
  if (!hasIncident) {
    return 'Hồ sơ chuyến đã được xác nhận Docs READY và đã khoá. Chỉ được phép chỉnh sửa khi có sự cố vận chuyển phát sinh.';
  }
  return null;
};

const invalidateReady = (_t: SpecTrip) => {
  // Không tự động huỷ xác nhận Docs READY khi sửa đổi trong bối cảnh xử lý sự cố
};

async function loadAll() {
  if (state.loading || state.loaded) return;
  setState({ loading: true });
  try {
    const [trips, customerDocs, documents, requests, bookings, docTypes, regulations, packages, auditLog] = await Promise.all([
      specialistApi.getTrips(), specialistApi.getCustomerDocs(), specialistApi.getDocuments(), specialistApi.getRequests(), specialistApi.getBookings(),
      specialistApi.getDocTypes(), specialistApi.getRegulations(), specialistApi.getPackages(), specialistApi.getAudit(),
    ]);
    const sh = sharedTripsAndDocs();
    const baseTrips = trips && trips.length > 0 ? trips : [];
    // Dữ liệu backend (bảo hiểm, xác nhận hồ sơ, ngựa…) là bản đúng; bản dùng chung chỉ bổ sung tuyến/chuyến bay và các chuyến backend chưa có
    const mergedTrips = [
      ...sh.trips.map((st) => { const bt = baseTrips.find((b: any) => cleanId(b.id) === cleanId(st.id)); return bt ? { ...st, ...definedOnly(bt) } : st; }),
      ...baseTrips.filter((bt: any) => !sh.trips.some((s) => cleanId(s.id) === cleanId(bt.id))),
    ];
    const baseDocs = customerDocs && customerDocs.length > 0 ? customerDocs : [];
    // Dữ liệu từ backend là bản đúng; bản lưu cục bộ chỉ bổ sung những giấy tờ backend chưa có, chuẩn hoá đầy đủ 6 giấy tờ cho từng ngựa
    const mergedDocs = normalizeCustomerDocs(mergeBackendDocs(baseDocs, sh.customerDocs), mergedTrips);

    const activePackages = (packages && packages.length > 0) ? packages : (getDemoMode('specialist') ? clone(mockPackages) : []);
    const activeRegs = ((regulations && regulations.length > 0) ? regulations : (getDemoMode('specialist') ? clone(mockRegulations) : []))
      .map((g) => ({ ...g, lines: (g.lines || []).filter((l: any) => l.provider !== 'CUSTOMER') }));
    const dummyCtx: SpecialistData = {
      trips: mergedTrips,
      docTypes: docTypes || [],
      regulations: activeRegs,
      packages: activePackages,
      customerDocs: mergedDocs,
      documents: documents || [],
      requests: requests || [],
      bookings: bookings || [],
      audit: auditLog || [],
    };
    autoApplyMatchingPackages(mergedTrips, activePackages, dummyCtx);

    if (!getDemoMode('specialist')) {
      setState({ trips: mergedTrips, customerDocs: mergedDocs, documents: documents || [], requests: requests || [], bookings: bookings || [], docTypes, regulations: activeRegs, packages, audit: auditLog || [], loading: false, loaded: true });
      return;
    }
    const allDemoTrips = [...mergedTrips, ...clone(mockTrips).filter((m) => !mergedTrips.some((t) => cleanId(t.id) === cleanId(m.id)))];
    const allDemoDocs = [...mergedDocs, ...clone(mockCustomerDocs).filter((m) => !mergedDocs.some((d) => cleanId(d.tripId) === cleanId(m.tripId) && d.key === m.key))];
    setState({ trips: allDemoTrips, customerDocs: allDemoDocs, documents: documents?.length ? documents : clone(mockDocuments), requests: requests?.length ? requests : clone(mockRequests), bookings: bookings?.length ? bookings : clone(mockBookings), docTypes, regulations: activeRegs, packages, audit: auditLog?.length ? auditLog : clone(mockAudit), loading: false, loaded: true });
  } catch {
    const sh = sharedTripsAndDocs();
    if (!getDemoMode('specialist')) {
      setState({ trips: sh.trips, customerDocs: sh.customerDocs, documents: [], requests: [], bookings: [], loading: false, loaded: true });
    } else {
      setState({
        trips: [...sh.trips, ...clone(mockTrips).filter((m) => !sh.trips.some((s) => cleanId(s.id) === cleanId(m.id)))],
        customerDocs: [...sh.customerDocs, ...clone(mockCustomerDocs).filter((m) => !sh.customerDocs.some((s) => cleanId(s.tripId) === cleanId(m.tripId) && s.key === m.key))],
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
    if (t.docsReady) return fail('Chuyến đã xác nhận Docs READY — bộ yêu cầu theo tuyến đã chốt cố định và không thể thay đổi.');
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
    const lockedMsg = checkDocsLocked(tripId);
    if (lockedMsg) return fail(lockedMsg);
    const t = tripOf(state, tripId), cd = customerDoc(state, tripId, key, scope);
    if (!t || !cd) return fail('Không tìm thấy giấy tờ.');
    if (opsBlock(t)) return fail(opsBlock(t));
    if (t.status === 'COMPLETED') return fail(`${tripId} đã hoàn tất.`);
    if (cd.status === 'APPROVED') return fail('Giấy tờ đã được duyệt.');
    if (['MISSING', 'ACTION_REQUIRED'].includes(cd.status)) return fail('Khách hàng chưa nộp bản mới để duyệt.');
    if (cd.expiry && cd.expiry < t.eta.slice(0, 10)) return fail(`Giấy tờ hết hạn ${fmtDate(cd.expiry)}, trước khi chuyến đến nơi. Hãy yêu cầu khách bổ sung bản mới.`);
    mutate((d) => {
      const x = customerDoc(d, tripId, key, scope);
      if (x) {
        x.status = 'APPROVED'; x.issue = undefined; x.reviewedAt = nowStamp(); x.reviewedBy = SPECIALIST_NAME;
      }
      d.requests.filter((q) => (q.tripId === tripId || cleanId(q.tripId) === cleanId(tripId)) && q.key === key && (q.scope === scope || cleanId(q.scope) === cleanId(scope)) && q.status !== 'FULFILLED')
        .forEach((q) => { q.status = 'FULFILLED'; q.history.push([nowStamp(), 'Đã duyệt bản khách nộp – yêu cầu hoàn tất']); });
      audit(d, 'Duyệt giấy tờ khách hàng', tripId, `${CUSTOMER_DOC_NAME[key] || key}${scope !== 'request' ? ` – ${scope}` : ''}`);
    });
    // Sync status back to sharedRequests
    try {
      const shared = getSharedRequests();
      const req = shared.find((r: any) => cleanId(r.id) === cleanId(tripId) || cleanId(r.tripId) === cleanId(tripId) || cleanId(`TRP_${(r.id || '').replace(/^TRN[_-]/, '')}`) === cleanId(tripId));
      if (req) {
        if (Array.isArray(req.dossier)) {
          req.dossier.forEach((doc: any) => {
            const docKey = doc.name?.toLowerCase().includes('tiêm') ? 'flu' : doc.name?.toLowerCase().includes('hộ chiếu') ? 'passport' : doc.name?.toLowerCase().includes('sở hữu') ? 'ownership' : doc.name?.toLowerCase().includes('sinh học') ? 'bio' : doc.name?.toLowerCase().includes('giá trị') ? 'valueProof' : doc.name?.toLowerCase().includes('sức khỏe') ? 'health' : '';
            if (docKey === key && (doc.scope === scope || cleanId(doc.scope) === cleanId(scope))) {
              doc.status = 'APPROVED';
              doc.reviewedAt = nowStamp();
              doc.reviewedBy = SPECIALIST_NAME;
            }
          });
        }
        const docs: any[] = Array.isArray(req.docs) ? req.docs : (req.docs = []);
        const approvedAt = nowStamp();
        const matches = docs.filter((doc) => doc.key === key && (doc.scope === scope || cleanId(doc.scope) === cleanId(scope)));
        if (matches.length) matches.forEach((doc) => { doc.status = 'APPROVED'; doc.issue = undefined; doc.reviewedAt = approvedAt; doc.reviewedBy = SPECIALIST_NAME; });
        else docs.push({ key, scope, status: 'APPROVED', reviewedAt: approvedAt, reviewedBy: SPECIALIST_NAME, updatedAt: approvedAt });
        if (Array.isArray(req.supplements)) {
          req.supplements.forEach((s: any) => {
            if (s.key === key && (s.scope === scope || cleanId(s.scope) === cleanId(scope))) s.status = 'FULFILLED';
          });
        }
        saveSharedRequest(req);
      }
    } catch {
      // ignore
    }
    void specialistApi.reviewCustomerDoc(tripId, { key, scope, decision: 'APPROVED' });
    return ok(`Đã chấp thuận ${CUSTOMER_DOC_NAME[key] || key}.`);
  },
  requestCustomerDoc(tripId: string, key: CustomerDocKey, scope: string, reason: string, dueAt?: string): ActionResult {
    const t = tripOf(state, tripId), cd = customerDoc(state, tripId, key, scope);
    if (!t || !cd) return fail('Không tìm thấy giấy tờ.');
    if (opsBlock(t)) return fail(opsBlock(t));
    if (t.status === 'COMPLETED') return fail(`${tripId} đã hoàn tất.`);
    if (reason.trim().length < 5) return fail('Nhập lý do yêu cầu bổ sung (ít nhất 5 ký tự).');
    if (dueAt && dueAt < today()) return fail('Hạn nộp không được ở quá khứ.');
    const current = openRequestFor(state, tripId, key, scope);
    if (current && current.status !== 'SUBMITTED') return fail('Giấy tờ này đã có yêu cầu bổ sung đang mở.');
    // Khách đã nộp nhưng bản nộp chưa đạt: mở lại chính yêu cầu đó thay vì tạo bản trùng
    const id = current ? current.id : nextId('DR', state.requests.map((x) => x.id));
    mutate((d) => {
      const x = customerDoc(d, tripId, key, scope);
      if (x) {
        x.status = 'ACTION_REQUIRED'; x.issue = reason.trim(); x.optional = false;
      }
      const reopened = current ? d.requests.find((q) => q.id === current.id) : undefined;
      if (reopened) {
        reopened.status = 'OPEN'; reopened.reason = reason.trim(); reopened.dueAt = dueAt || undefined;
        reopened.history.push([nowStamp(), 'Yêu cầu khách nộp lại']);
      } else {
        d.requests.push({ id, tripId, key, scope, reason: reason.trim(), dueAt: dueAt || undefined, status: 'OPEN', createdAt: nowStamp(), history: [[nowStamp(), 'Gửi yêu cầu cho khách hàng']] });
      }
      const tt = tripOf(d, tripId);
      if (tt) invalidateReady(tt);
      audit(d, 'Yêu cầu khách bổ sung', tripId, `${CUSTOMER_DOC_NAME[key] || key} • ${reason.trim()}`);
    });
    // Sync status back to sharedRequests
    try {
      const shared = getSharedRequests();
      const req = shared.find((r: any) => cleanId(r.id) === cleanId(tripId) || cleanId(r.tripId) === cleanId(tripId) || cleanId(`TRP_${(r.id || '').replace(/^TRN[_-]/, '')}`) === cleanId(tripId));
      if (req) {
        if (Array.isArray(req.dossier)) {
          req.dossier.forEach((doc: any) => {
            const docKey = doc.name?.toLowerCase().includes('tiêm') ? 'flu' : doc.name?.toLowerCase().includes('hộ chiếu') ? 'passport' : doc.name?.toLowerCase().includes('sở hữu') ? 'ownership' : doc.name?.toLowerCase().includes('sinh học') ? 'bio' : doc.name?.toLowerCase().includes('giá trị') ? 'valueProof' : doc.name?.toLowerCase().includes('sức khỏe') ? 'health' : '';
            if (docKey === key && (doc.scope === scope || cleanId(doc.scope) === cleanId(scope))) {
              doc.status = 'ACTION_REQUIRED';
              doc.note = reason.trim();
            }
          });
        }
        const docs: any[] = Array.isArray(req.docs) ? req.docs : (req.docs = []);
        const sameDoc = (doc: any) => doc.key === key && (doc.scope === scope || cleanId(doc.scope) === cleanId(scope));
        if (docs.some(sameDoc)) {
          docs.filter(sameDoc).forEach((doc) => { doc.status = 'ACTION_REQUIRED'; doc.issue = reason.trim(); });
        } else {
          docs.push({ key, scope, status: 'ACTION_REQUIRED', issue: reason.trim(), updatedAt: nowStamp() });
        }
        // Khách hàng đọc yêu cầu bổ sung từ `supplements` của đơn
        const supplements: any[] = Array.isArray(req.supplements) ? req.supplements : (req.supplements = []);
        supplements.push({ id: `SUP-${id.replace(/^DR-/, '')}`, key, scope, reason: reason.trim(), at: nowStamp(), by: SPECIALIST_NAME, status: 'OPEN' });
        saveSharedRequest(req);
      }
    } catch {
      // ignore
    }
    void specialistApi.createDocRequest({ tripId, key, scope, reason, dueAt });
    return ok(`Đã gửi yêu cầu bổ sung ${id} cho khách hàng.`, id);
  },
  /** Gửi lại yêu cầu bổ sung đang mở khi khách hàng không nhận được (đẩy lại sang đơn dùng chung) */
  resendCustomerDocRequest(requestId: string): ActionResult {
    const q = state.requests.find((x) => x.id === requestId);
    if (!q || q.status !== 'OPEN') return fail('Chỉ gửi lại được yêu cầu đang chờ khách bổ sung.');
    const { tripId, key, scope, reason } = q;
    const trip = tripOf(state, tripId);
    try {
      const shared = getSharedRequests();
      const ids = [tripId, trip?.requestId].filter(Boolean).map((x) => cleanId(x));
      const req = shared.find((r: any) => ids.includes(cleanId(r.id)) || ids.includes(cleanId(r.tripId)) || ids.includes(cleanId(`TRP_${(r.id || '').replace(/^TRN[_-]/, '')}`)));
      if (!req) {
        // Đơn chưa có trong bộ nhớ dùng chung của trình duyệt này: gửi thẳng lên máy chủ
        void specialistApi.createDocRequest({ tripId, key, scope, reason, dueAt: q.dueAt });
        mutate((d) => { d.requests.find((y) => y.id === requestId)?.history.push([nowStamp(), 'Gửi lại yêu cầu cho khách hàng']); });
        return ok(`Đã gửi lại yêu cầu ${requestId} lên hệ thống.`);
      }
      const same = (x: any) => x.key === key && (x.scope === scope || cleanId(x.scope) === cleanId(scope));
      const docs: any[] = Array.isArray(req.docs) ? req.docs : (req.docs = []);
      if (docs.some(same)) docs.filter(same).forEach((x) => { x.status = 'ACTION_REQUIRED'; x.issue = reason; });
      else docs.push({ key, scope, status: 'ACTION_REQUIRED', issue: reason, updatedAt: nowStamp() });
      const supplements: any[] = Array.isArray(req.supplements) ? req.supplements : (req.supplements = []);
      const open = supplements.filter((s) => same(s) && s.status !== 'FULFILLED');
      if (open.length) open.forEach((s) => { s.status = 'OPEN'; s.reason = reason; s.at = nowStamp(); });
      else supplements.push({ id: `SUP-${requestId.replace(/^DR-/, '')}`, key, scope, reason, at: nowStamp(), by: SPECIALIST_NAME, status: 'OPEN' });
      saveSharedRequest(req);
      void specialistApi.createDocRequest({ tripId, key, scope, reason, dueAt: q.dueAt });
    } catch {
      return fail('Không gửi lại được yêu cầu cho khách hàng.');
    }
    mutate((d) => {
      const x = d.requests.find((y) => y.id === requestId);
      if (x) x.history.push([nowStamp(), 'Gửi lại yêu cầu cho khách hàng']);
      audit(d, 'Gửi lại yêu cầu bổ sung', tripId, `${CUSTOMER_DOC_NAME[key] || key}`);
    });
    return ok(`Đã gửi lại yêu cầu ${requestId} cho khách hàng.`);
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
    const lockedMsg = checkDocsLocked(input.tripId);
    if (lockedMsg) return fail(lockedMsg);
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
    const synced = specialistApi.recordDocument(input).then(async (sent) => {
      if (!sent) return;
      // Backend tự cấp mã chứng từ; lấy mã đó để các lần duyệt sau tìm đúng bản ghi
      // Backend ghi đè bản ghi cũ của cùng (chuyến, loại, ngựa) nên mỗi bộ ba chỉ có một mã
      const server = (await specialistApi.getDocuments()).filter((x) => x.tripId === input.tripId && x.typeId === input.typeId
        && (x.horseId || undefined) === (input.horseId || undefined));
      const created = server[server.length - 1];
      if (!created) return;
      serverDocId.set(id, created.id);
      serverDocId.set(created.id, created.id);
      if (created.id === id) return;
      mutate((d) => {
        const x = d.documents.find((y) => y.id === id);
        if (!x) return;
        const dup = d.documents.findIndex((y) => y.id === created.id);
        if (dup >= 0) d.documents.splice(dup, 1);
        x.id = created.id;
      });
    });
    pendingDocSync.set(id, synced);
    return ok(`Đã ghi nhận ${id}. Chứng từ chờ duyệt.`, id);
  },
  /** requestedVersion = 0: duyệt phiên bản mới nhất của chứng từ */
  reviewDocument(docId: string, requestedVersion: number, decision: 'APPROVED' | 'REJECTED', remark: string): ActionResult {
    const doc = state.documents.find((x) => x.id === docId);
    if (doc) {
      const lockedMsg = checkDocsLocked(doc.tripId);
      if (lockedMsg) return fail(lockedMsg);
    }
    const version = requestedVersion > 0 ? requestedVersion : (doc?.versions.length ?? 0);
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
    const pending = pendingDocSync.get(docId) ?? Promise.resolve();
    void pending.then(() => specialistApi.reviewDocument(serverDocId.get(docId) ?? docId, { version, decision, remark }));
    return ok(decision === 'APPROVED' ? `Đã duyệt ${docId} v${version}.` : `Đã từ chối ${docId} v${version}.`);
  },
  togglePhysicalCopy(docId: string, force?: boolean): ActionResult | void {
    const doc = state.documents.find((x) => x.id === docId);
    if (doc) {
      const lockedMsg = checkDocsLocked(doc.tripId);
      if (lockedMsg) return fail(lockedMsg);
    }
    let collected: boolean | undefined;
    mutate((d) => { const x = d.documents.find((y) => y.id === docId); if (x) { x.physicalCopy = force ?? !x.physicalCopy; collected = x.physicalCopy; audit(d, x.physicalCopy ? 'Đã nhận bản cứng gốc' : 'Bỏ đánh dấu bản cứng', x.tripId, docId); } });
    if (collected === undefined) return;
    const pending = pendingDocSync.get(docId) ?? Promise.resolve();
    void pending.then(() => specialistApi.setPhysicalCopy(serverDocId.get(docId) ?? docId, collected!));
  },

  // ----- Bảo hiểm -----
  saveInsurance(tripId: string, ins: Omit<Insurance, 'status'>): ActionResult {
    const lockedMsg = checkDocsLocked(tripId);
    if (lockedMsg) return fail(lockedMsg);
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
    const lockedMsg = checkDocsLocked(tripId);
    if (lockedMsg) return fail(lockedMsg);
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
      if (i >= 0) d.docTypes[i] = next; else d.docTypes.unshift(next);
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
      const cleanedLines = reg.lines.filter((l) => l.provider !== 'CUSTOMER').map((l) => ({ ...l, provider: 'CBN' as const }));
      const next: Regulation = { ...reg, lines: cleanedLines, id, v: old ? (used ? old.v + 1 : old.v) : 1, effectiveFrom: old && !used ? old.effectiveFrom : today() };
      const i = d.regulations.findIndex((x) => x.id === id);
      if (i >= 0) d.regulations[i] = next; else d.regulations.unshift(next);
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
      if (i >= 0) d.packages[i] = next; else d.packages.unshift(next);
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
/** Sắp xếp chuyến mới tạo lên đầu tiên: ưu tiên thời gian cập nhật/phân công, sau đó theo số ID giảm dần */
export function sortTripsNewestFirst(list: SpecTrip[]): SpecTrip[] {
  return [...list].sort((a, b) => {
    const timeA = (a as any).updatedAt ? new Date((a as any).updatedAt).getTime() : 0;
    const timeB = (b as any).updatedAt ? new Date((b as any).updatedAt).getTime() : 0;
    if (timeA && timeB && timeA !== timeB) return timeB - timeA;
    if (timeA && !timeB) return -1;
    if (!timeA && timeB) return 1;

    const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
    if (numA !== numB) return numB - numA;

    return b.id.localeCompare(a.id);
  });
}

export function useSpecialist() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => { void loadAll(); }, []);

  const sortedTrips = useMemo(() => {
    const list = sortTripsNewestFirst(snap.trips);
    autoApplyMatchingPackages(list, snap.packages, snap);
    return list;
  }, [snap.trips, snap.packages, snap]);

  const stats = useMemo(() => {
    const active = sortedTrips.filter((t) => t.status !== 'COMPLETED');
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

  const getTrip = (id?: string) => {
    const t = snap.trips.find((x) => x.id === id || cleanId(x.id) === cleanId(id) || (id && cleanId(x.requestId) === cleanId(id)));
    if (t && !t.reqSet) {
      const match = findMatchingPackage(snap.packages, t.originCountry, t.destCountry, t.mode);
      if (match) {
        t.reqSet = snapshot(snap, match, 'Hệ thống tự động');
        void specialistApi.applyRequirementSet(t.id, match.id);
      }
    }
    return t;
  };
  const getDocument = (id?: string) => snap.documents.find((d) => d.id === id);
  /** Mục checklist có trạng thái 'chờ duyệt' của khách hàng được map về loại giấy tờ */
  const customerKeyOf = (typeId: string) => TYPE_CUSTOMER_KEY[typeId];

  return { ...snap, data: { ...snap, trips: sortedTrips } as SpecialistData, trips: sortedTrips, stats, getTrip, getDocument, customerKeyOf, actions };
}

export default useSpecialist;


