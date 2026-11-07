const STORAGE_KEY = 'rts_shared_requests';

export interface SharedRequestDoc {
  key: string;
  scope: string;
  status: string;
  file?: { name: string; url?: string };
  note?: string;
}

const DEFAULT_SEEDED_REQUESTS = [
  {
    id: 'TRN_8946',
    status: 'PENDING_REVIEW',
    origin: 'Ho Chi Minh City',
    destination: 'Sapporo',
    date: '2026-12-26',
    pickupAt: '2026-12-20',
    horseCount: 1,
    horses: ['HOR_1029'],
    horseNotes: {},
    careNotes: '',
    customerId: 'CUS-001',
    customerName: 'Nguyễn Văn A',
    customerCompany: 'Nguyễn Văn A (Cá nhân)',
    requestedAt: '2026-10-28 12:40',
    submittedAt: '2026-10-28 12:42',
    wizardStep: 3,
    pickup: {
      name: 'CLB Cưỡi ngựa Saigon',
      address: 'Phường An Phú, TP. Thủ Đức, TP.HCM',
      postal: '700000',
      contact: 'Nguyễn Văn A',
      phone: '0901234567',
      notes: '',
    },
    delivery: {
      name: 'Sapporo Racecourse',
      address: '16-1-1 Kita-16-jo Nishi, Chuo-ku, Sapporo',
      postal: '060-0016',
      contact: 'Takeshi Tanaka',
      phone: '+81 11 555 0192',
      notes: '',
    },
    versions: [],
    dossier: [
      { name: 'Sổ tiêm ngừa cúm', scope: 'HOR_1029', status: 'PENDING_REVIEW', file: 'sotienngua.png' },
      { name: 'Hộ chiếu ngựa', scope: 'HOR_1029', status: 'PENDING_REVIEW', file: 'passport.png' },
    ],
    docs: [
      { key: 'flu', scope: 'HOR_1029', status: 'SUBMITTED', file: { name: 'sotienngua.png' }, updatedAt: '2026-10-28 12:42' },
      { key: 'passport', scope: 'HOR_1029', status: 'SUBMITTED', file: { name: 'passport.png' }, updatedAt: '2026-10-28 12:42' },
    ],
    history: [
      { at: '2026-10-28 12:40', actor: 'Nguyễn Văn A', role: 'CUSTOMER', action: 'Tạo bản nháp', detail: 'Ho Chi Minh City → Sapporo • 1 ngựa' },
      { at: '2026-10-28 12:42', actor: 'Nguyễn Văn A', role: 'CUSTOMER', action: 'Gửi yêu cầu vận chuyển', detail: 'Ho Chi Minh City → Sapporo • 1 ngựa' },
    ],
    collection: [],
    payments: [],
    supplements: [],
    companyDocs: [],
    complaints: [],
  },
];

const cleanId = (id: string) => (id || '').replace(/-/g, '_');

export function toManagerRequest(r: any): any {
  if (!r) return r;
  const cloned = { ...r };
  if (!cloned.dossier || cloned.dossier.length === 0) {
    if (Array.isArray(cloned.docs) && cloned.docs.length > 0) {
      const DOC_TITLES: Record<string, string> = {
        flu: 'Sổ tiêm ngừa cúm',
        passport: 'Hộ chiếu ngựa',
        ownership: 'Chứng nhận quyền sở hữu',
        health: 'Giấy chứng nhận sức khỏe',
        export_cert: 'Giấy phép kiểm dịch xuất khẩu',
        customs: 'Tờ khai hải quan',
      };
      cloned.dossier = cloned.docs.map((d: any) => ({
        name: DOC_TITLES[d.key] || d.key || 'Giấy tờ',
        scope: d.scope || (cloned.horses && cloned.horses[0]) || 'request',
        status: d.status === 'APPROVED' ? 'APPROVED' : 'PENDING_REVIEW',
        file: typeof d.file === 'object' && d.file ? d.file.name : (d.file || ''),
        note: d.issue || '',
      }));
    } else {
      cloned.dossier = [];
    }
  } else {
    cloned.dossier = cloned.dossier.map((d: any) => ({
      ...d,
      file: typeof d.file === 'object' && d.file ? d.file.name : (d.file || ''),
      status: d.status === 'SUBMITTED' ? 'PENDING_REVIEW' : (d.status || 'PENDING_REVIEW'),
    }));
  }
  if (!cloned.history) cloned.history = [];
  if (!cloned.versions) cloned.versions = [];
  if (!cloned.collection) cloned.collection = [];
  if (!cloned.pickup) cloned.pickup = { name: '', address: '', contact: '', phone: '', notes: '' };
  if (!cloned.delivery) cloned.delivery = { name: '', address: '', contact: '', phone: '', notes: '' };
  if (!cloned.customerId) cloned.customerId = 'CUS-001';
  return cloned;
}

export function toCustomerRequest(r: any): any {
  if (!r) return r;
  const cloned = { ...r };
  if (!cloned.docs || cloned.docs.length === 0) {
    if (Array.isArray(cloned.dossier) && cloned.dossier.length > 0) {
      cloned.docs = cloned.dossier.map((d: any) => ({
        key: d.name.toLowerCase().includes('tiêm') ? 'flu' : d.name.toLowerCase().includes('hộ chiếu') ? 'passport' : 'health',
        scope: d.scope,
        status: d.status === 'APPROVED' ? 'APPROVED' : 'SUBMITTED',
        file: typeof d.file === 'string' ? { name: d.file } : d.file,
        issue: d.note,
      }));
    } else {
      cloned.docs = [];
    }
  }
  return cloned;
}

export function getSharedRequests(): any[] {
  try {
    if (typeof window === 'undefined') return DEFAULT_SEEDED_REQUESTS;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SEEDED_REQUESTS));
      return DEFAULT_SEEDED_REQUESTS;
    }
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SEEDED_REQUESTS));
      return DEFAULT_SEEDED_REQUESTS;
    }
    // Ensure default seeded requests like TRN_8946 exist if not in storage
    let updated = false;
    for (const seed of DEFAULT_SEEDED_REQUESTS) {
      if (!list.some((r) => cleanId(r.id) === cleanId(seed.id))) {
        list.push(seed);
        updated = true;
      }
    }
    if (updated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
    return list;
  } catch {
    return DEFAULT_SEEDED_REQUESTS;
  }
}

import { notifySync } from './syncChannel';

export function saveSharedRequest(req: any): void {
  try {
    if (typeof window === 'undefined' || !req?.id) return;
    const list = getSharedRequests();
    const idx = list.findIndex((r) => cleanId(r.id) === cleanId(req.id));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...req };
    } else {
      list.unshift(req);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('rts_requests_updated', { detail: { id: req.id } }));
    notifySync('requests_updated');
  } catch {
    // ignore
  }
}

export function removeSharedRequest(id: string): void {
  try {
    if (typeof window === 'undefined') return;
    const list = getSharedRequests().filter((r) => cleanId(r.id) !== cleanId(id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('rts_requests_updated', { detail: { id } }));
    notifySync('requests_updated');
  } catch {
    // ignore
  }
}

