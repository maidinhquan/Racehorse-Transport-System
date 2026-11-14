// Vị trí sự cố do tài xế chọn trên đoạn đường giữa hai trạm, dùng chung cho bản đồ của mọi vai.
// Chỉ đồng bộ trong cùng một trình duyệt (giống sharedTrips); tọa độ cũng được gửi lên backend qua locationCoordinates.
import { useEffect, useState } from 'react';
import { incidentPhase } from './incidentState';
import { getSharedIncidents } from './sharedIncidents';

const STORAGE_KEY = 'rts_incident_pins';
const EVENT = 'rts_incident_pins_changed';
const MAX_PINS = 100;
const cleanId = (id?: string) => (id || '').replace(/-/g, '_');

export interface IncidentPin {
  id: string;
  tripId: string;
  /** Tên loại sự cố đã dịch sang tiếng Việt */
  label: string;
  lat: number;
  lng: number;
  /** Mô tả vị trí, ví dụ "Trên tuyến A → B, khoảng 40% đoạn đường" */
  where: string;
  description: string;
  at: string;
}

const validCoord = (lat: unknown, lng: unknown) =>
  typeof lat === 'number' && Number.isFinite(lat) && Math.abs(lat) <= 90
  && typeof lng === 'number' && Number.isFinite(lng) && Math.abs(lng) <= 180;

function readAll(): IncidentPin[] {
  try {
    const raw = typeof window === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((p: IncidentPin) => validCoord(p?.lat, p?.lng)) : [];
  } catch {
    return [];
  }
}

/** Sự cố đã được Điều phối đóng thì không còn ghim trên bản đồ tuyến (chi tiết sự cố vẫn xem lại bằng includeClosed) */
const isPinClosed = (p: IncidentPin): boolean => {
  const shared = getSharedIncidents(p.tripId).find((s) => cleanId(s.id) === cleanId(p.id));
  return incidentPhase(p.id, shared?.status) === 'CLOSED';
};

export function getIncidentPins(tripId?: string, includeClosed = false): IncidentPin[] {
  const all = readAll();
  const byTrip = tripId ? all.filter((p) => cleanId(p.tripId) === cleanId(tripId)) : all;
  return includeClosed ? byTrip : byTrip.filter((p) => !isPinClosed(p));
}

export function saveIncidentPin(pin: IncidentPin): void {
  if (!validCoord(pin.lat, pin.lng)) return;
  try {
    const next = [pin, ...readAll().filter((p) => p.id !== pin.id)].slice(0, MAX_PINS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Bộ nhớ trình duyệt đầy hoặc bị chặn: bỏ qua, sự cố vẫn được gửi lên backend
  }
}

/** Danh sách ghim sự cố của một chuyến, tự làm mới khi tab khác hoặc vai khác ghi thêm */
export function useIncidentPins(tripId?: string): IncidentPin[] {
  const [pins, setPins] = useState<IncidentPin[]>(() => getIncidentPins(tripId));
  useEffect(() => {
    const refresh = () => setPins(getIncidentPins(tripId));
    refresh();
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY || e.key === null || e.key.startsWith('rts_incident_') || e.key === 'rts_shared_incidents') refresh(); };
    window.addEventListener(EVENT, refresh);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refresh);
    };
  }, [tripId]);
  return pins;
}
