import { useCallback, useEffect, useState } from 'react';
import { mockCustomerHorses } from './mockData';
import type { CustomerHorse } from '../types';

export type HorseFileKind = 'photo' | 'passport' | 'ownership' | 'valueProof' | 'vaccination' | 'health';
export interface HorseUpload { name: string; type: string; size: number; blob: Blob }
export interface HorseProfile extends CustomerHorse {
  birthDate?: string;
  coatColor?: string;
  passportNumber?: string;
  passportAuthority?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  declaredValue?: number;
  currency?: string;
  lastFluDate?: string;
  healthNotes?: string;
  vetName?: string;
  vetPhone?: string;
  files: Partial<Record<HorseFileKind, HorseUpload>>;
  createdAt: string;
  legacyMissingFiles?: Partial<Record<HorseFileKind, string>>;
}

export const HORSE_FILE_LABELS: Record<HorseFileKind, string> = {
  photo: 'Ảnh nhận diện', passport: 'Bản quét hộ chiếu', ownership: 'Giấy chứng nhận sở hữu',
  valueProof: 'Bằng chứng định giá', vaccination: 'Sổ tiêm ngừa', health: 'Giấy chứng nhận sức khỏe',
};
const DATABASE = 'cbn_customer_horse_profiles';
const PROFILES = 'profiles';
const META = 'metadata';
const LEGACY_KEY = 'cbn_customer_horses_custom';
const CHANGED = 'cbn_horse_profiles_changed';

export function horseAge(birthDate: string, now = new Date()) {
  const birth = new Date(`${birthDate}T00:00:00`);
  const hadBirthday = now.getMonth() > birth.getMonth()
    || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  return Math.max(0, now.getFullYear() - birth.getFullYear() - (hadBirthday ? 0 : 1));
}

export function validateHorseUpload(file: Blob, kind: HorseFileKind): void {
  if (file.size === 0) throw new Error('Tệp rỗng, vui lòng chọn tệp khác.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Tệp không được vượt quá 5 MB.');
  const allowed = kind === 'photo' ? ['image/jpeg', 'image/png'] : ['application/pdf', 'image/jpeg', 'image/png'];
  if (!allowed.includes(file.type)) throw new Error(kind === 'photo'
    ? 'Ảnh chỉ chấp nhận định dạng JPG, JPEG hoặc PNG.' : 'Tệp chỉ chấp nhận định dạng PDF, JPG, JPEG hoặc PNG.');
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('Trình duyệt không hỗ trợ lưu hồ sơ cục bộ.')); return; }
    let blocked = false;
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROFILES)) db.createObjectStore(PROFILES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(new Error('Không mở được kho hồ sơ ngựa.'));
    request.onblocked = () => { blocked = true; reject(new Error('Hãy đóng tab cũ của ứng dụng rồi thử lại.')); };
  });
}

function readAll(db: IDBDatabase): Promise<HorseProfile[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROFILES, 'readonly');
    const request = tx.objectStore(PROFILES).getAll();
    tx.oncomplete = () => resolve(request.result as HorseProfile[]);
    tx.onabort = () => reject(new Error('Không đọc được hồ sơ ngựa.'));
  });
}

// Recover text fields from the previous store; discarded file contents cannot be recovered.
async function migrateLegacy(db: IDBDatabase) {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return;
  const done = await new Promise<boolean>((resolve, reject) => {
    const tx = db.transaction(META, 'readonly');
    const request = tx.objectStore(META).get('legacy-imported');
    tx.oncomplete = () => resolve(Boolean(request.result));
    tx.onabort = () => reject(new Error('Không kiểm tra được dữ liệu hồ sơ cũ.'));
  });
  if (done) return;
  let legacy: HorseProfile[];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some(h => !h || typeof h.id !== 'string' || typeof h.name !== 'string')) throw new Error();
    legacy = parsed;
  } catch { throw new Error('Dữ liệu ngựa cũ không hợp lệ. Hãy sao lưu key cbn_customer_horses_custom trước khi chỉnh sửa.'); }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([PROFILES, META], 'readwrite');
    const store = tx.objectStore(PROFILES);
    const seen = new Set<string>();
    // The old store prepended entries, so keep the first version of each ID.
    legacy.forEach(horse => {
      if (seen.has(horse.id)) return;
      seen.add(horse.id);
      const missing: HorseProfile['legacyMissingFiles'] = {};
      for (const kind of Object.keys(HORSE_FILE_LABELS) as HorseFileKind[]) {
        if (horse.files?.[kind]?.name) missing[kind] = horse.files[kind]!.name;
      }
      const profile: HorseProfile = { ...horse, breed: horse.breed || '', gender: horse.gender || 'Chưa cập nhật',
        microchip: horse.microchip === 'Chưa cung cấp' ? '' : (horse.microchip || ''), age: horse.age || 0,
        submissionStatus: horse.submissionStatus === 'submitted' ? 'submitted' : 'unsubmitted',
        submissionBadgeText: horse.submissionBadgeText || 'Chưa nộp cùng đơn', usageCount: horse.usageCount || 0,
        createdAt: horse.createdAt || '', files: {}, legacyMissingFiles: missing,
        profileStatus: 'Cần bổ sung giấy tờ', passportScanStatus: 'Chưa có bản quét lưu được', medicalRecordStatus: 'Chưa có tệp lưu được' };
      const existing = store.get(horse.id);
      existing.onsuccess = () => { if (!existing.result) store.put(profile); };
    });
    tx.objectStore(META).put(true, 'legacy-imported');
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(new Error('Không chuyển được hồ sơ cũ sang kho lưu trữ mới.'));
  });
  // Keep the legacy key untouched as a backup.
}

export async function getCustomHorseProfiles(): Promise<HorseProfile[]> {
  const db = await openDatabase();
  try { await migrateLegacy(db); return await readAll(db); }
  finally { db.close(); }
}

function mergeProfiles(custom: HorseProfile[]): HorseProfile[] {
  const customIds = new Set(custom.map(horse => horse.id));
  const profiles: HorseProfile[] = [...custom.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    ...mockCustomerHorses.filter(horse => !customIds.has(horse.id)).map(horse => ({ ...horse, files: {}, createdAt: '' }))];
  return profiles.map(horse => horse.birthDate ? { ...horse, age: horseAge(horse.birthDate) } : horse);
}

export async function getHorseProfiles() { return mergeProfiles(await getCustomHorseProfiles()); }

export async function saveHorseProfile(horse: HorseProfile): Promise<void> {
  const profile: HorseProfile = { ...horse, name: horse.name.trim(), microchip: horse.microchip.trim() };
  if (!profile.name) throw new Error('Vui lòng nhập tên ngựa.');
  if (profile.microchip && !/^\d{15}$/.test(profile.microchip)) throw new Error('Số Microchip phải gồm 15 chữ số.');
  for (const kind of Object.keys(profile.files) as HorseFileKind[]) {
    const file = profile.files[kind];
    if (!file || !(file.blob instanceof Blob)) throw new Error('Tệp không còn nội dung. Vui lòng tải lại.');
    validateHorseUpload(file.blob, kind);
  }
  const db = await openDatabase();
  try {
    await migrateLegacy(db);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PROFILES, 'readwrite');
      const store = tx.objectStore(PROFILES);
      let validationError: Error | undefined;
      const request = store.getAll();
      request.onsuccess = () => {
        const duplicate = profile.microchip && mergeProfiles(request.result).some(h => h.id !== profile.id && h.microchip === profile.microchip);
        if (duplicate) { validationError = new Error('Số Microchip đã được sử dụng cho ngựa khác.'); tx.abort(); return; }
        store.put(profile);
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(validationError || new Error('Không lưu được hồ sơ. Kiểm tra dung lượng trống của trình duyệt rồi thử lại.'));
    });
  } finally { db.close(); }
  window.dispatchEvent(new Event(CHANGED));
}

export function useHorseProfiles() {
  const [horses, setHorses] = useState<HorseProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    getHorseProfiles().then(next => { if (active) { setHorses(next); setError(''); } })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Không đọc được hồ sơ ngựa.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    window.addEventListener(CHANGED, refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener(CHANGED, refresh); window.removeEventListener('focus', refresh); };
  }, [refresh]);
  return { horses, loading, error, refresh };
}
