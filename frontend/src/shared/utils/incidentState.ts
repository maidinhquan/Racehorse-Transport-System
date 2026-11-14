// Trạng thái sự cố hiển thị thống nhất cho mọi vai (Tài xế, Điều phối, Quản lý, Khách hàng, Chuyên viên).
// Nguồn: trạng thái gốc của sự cố + những gì Tài xế / Điều phối đã ghi vào bộ nhớ dùng chung.
export type IncidentPhase = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export const INCIDENT_PHASE_LABEL: Record<IncidentPhase, string> = {
  NEW: 'Mới báo',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã khắc phục',
  CLOSED: 'Đã đóng',
};

const cleanId = (x?: string) => (x || '').replace(/-/g, '_');

const read = (prefix: string, id: string): string | null => {
  try {
    return localStorage.getItem(`${prefix}${cleanId(id)}`) || localStorage.getItem(`${prefix}${id}`);
  } catch {
    return null;
  }
};

/**
 * RESOLVED  = Tài xế/Bác sĩ đã báo xử lý xong, chờ Điều phối đóng
 * CLOSED    = Điều phối đã đóng (chỉ Điều phối được đóng)
 */
export function incidentPhase(id: string, baseStatus?: string): IncidentPhase {
  const base = (baseStatus || '').toUpperCase();
  const local = (read('rts_incident_status_', id) || '').toUpperCase();
  if (['CLOSED', 'HALTED'].includes(base) || ['CLOSED', 'HALTED'].includes(local)) return 'CLOSED';
  if (base === 'RESOLVED' || read('rts_vet_resolved_', id)) return 'RESOLVED';
  const touched = local || read('rts_ack_', id) || read('rts_incident_plan_', id) || read('rts_incident_continue_', id);
  if (touched || (base && !['NEW', 'REPORTED'].includes(base))) return 'IN_PROGRESS';
  return 'NEW';
}

/** Điều phối đã bấm "Cho phép tiếp tục chặng" hoặc đã đóng sự cố → tài xế được ghi mốc tiếp theo */
export const incidentReleased = (id: string, baseStatus?: string): boolean =>
  !!read('rts_incident_continue_', id)
  || ['CONTINUE_ALLOWED', 'CLOSED', 'HALTED'].includes((read('rts_incident_status_', id) || '').toUpperCase())
  || ['CONTINUE_ALLOWED', 'CLOSED', 'HALTED'].includes((baseStatus || '').toUpperCase());

/** Thời điểm báo sự cố (ms). Thiếu hoặc sai giờ thì lấy ngày trong mã (INC_20261112_…); không có gì thì 0 */
export function incidentTime(i: { id: string; at?: string }): number {
  const t = i.at ? Date.parse(String(i.at).replace(' ', 'T')) : NaN;
  if (Number.isFinite(t)) return t;
  const m = /(\d{4})(\d{2})(\d{2})/.exec(i.id || '');
  return m ? Date.parse(`${m[1]}-${m[2]}-${m[3]}T00:00:00`) || 0 : 0;
}

/** Mới nhất lên đầu cho mọi danh sách sự cố (cùng giờ thì giữ nguyên thứ tự gốc, danh sách gốc không bị đổi) */
export function sortIncidentsNewestFirst<T extends { id: string; at?: string }>(list: readonly T[]): T[] {
  return list
    .map((x, idx) => ({ x, idx, t: incidentTime(x) }))
    .sort((a, b) => b.t - a.t || a.idx - b.idx)
    .map((e) => e.x);
}

/** Máy chủ báo sự cố đã đóng → ghi vào bộ nhớ dùng chung để mọi trang/bản đồ cùng thấy (ví dụ ẩn ghim sự cố) */
export function rememberClosedIncident(id: string): void {
  try {
    if (localStorage.getItem(`rts_incident_status_${cleanId(id)}`) === 'CLOSED') return;
    localStorage.setItem(`rts_incident_status_${cleanId(id)}`, 'CLOSED');
    localStorage.setItem(`rts_incident_status_${id}`, 'CLOSED');
    window.dispatchEvent(new Event('rts_incident_pins_changed'));
  } catch { /* bỏ qua */ }
}
