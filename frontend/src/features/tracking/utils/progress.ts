import type { Geo, PublicMilestone, Milestone as F4Milestone } from '../types/flow4.types';

/**
 * Lịch trình và tiến độ hành trình dùng chung cho Tài xế, Quản lý và Khách hàng.
 * Nguồn duy nhất là danh sách mốc Flow 4 (TRIP_MILESTONE): mỗi mốc là một điểm trên lịch, mốc đã xong là điểm đã check-in.
 */
export type ProgressStopType = 'ORIGIN' | 'REST_STOP' | 'FUEL_STOP' | 'CHECKPOINT' | 'AIRPORT' | 'QUARANTINE_STATION' | 'DESTINATION';
export type ProgressMilestoneType = 'DEPARTED' | 'LEFT_STOP' | 'ARRIVED_DESTINATION';

export interface ProgressStop {
  id: string;
  name: string;
  type: ProgressStopType;
  plannedAt: string;
  lat?: number;
  lng?: number;
}

export interface ProgressMilestone {
  type: ProgressMilestoneType;
  stopIndex: number;
  at: string;
  by: string;
  note?: string;
}

type AnyMilestone = (F4Milestone | PublicMilestone) & { sequence?: number; geo?: Geo | null };

const STOP_TYPE: Record<AnyMilestone['kind'], ProgressStopType> = {
  DEPARTED: 'ORIGIN',
  STOP_ARRIVED: 'REST_STOP',
  STOP_DEPARTED: 'REST_STOP',
  CHECKPOINT_ARRIVED: 'CHECKPOINT',
  CHECKPOINT_DEPARTED: 'CHECKPOINT',
  AIRPORT_ORIGIN_ARRIVED: 'AIRPORT',
  AIR_HANDOVER: 'AIRPORT',
  AIR_DEPARTED: 'AIRPORT',
  AIR_ARRIVED: 'AIRPORT',
  AIR_RECEIVED: 'AIRPORT',
  FINAL_ARRIVED: 'DESTINATION',
};

/** Mốc giữa chuyến được ghi là LEFT_STOP để mốc kế tiếp luôn là mốc chờ tiếp theo của backend (không có bước "rời trạm" riêng) */
function milestoneType(kind: AnyMilestone['kind'], index: number): ProgressMilestoneType {
  if (index === 0 && kind === 'DEPARTED') return 'DEPARTED';
  if (kind === 'FINAL_ARRIVED') return 'ARRIVED_DESTINATION';
  return 'LEFT_STOP';
}

/**
 * Đổi danh sách mốc Flow 4 thành điểm dừng và mốc đã hoàn tất.
 * `routePoints` (dữ liệu công khai của khách) chỉ dùng khi số điểm khớp số mốc, để gán tọa độ theo thứ tự.
 */
export function progressFromMilestones(milestones: AnyMilestone[], routePoints: Geo[] = []): { stops: ProgressStop[]; milestones: ProgressMilestone[] } {
  const ordered = [...milestones].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const byIndex = routePoints.length === ordered.length;
  const stops: ProgressStop[] = ordered.map((m, i) => {
    const geo = m.geo ?? (byIndex ? routePoints[i] : undefined);
    return { id: m.id, name: m.label, type: STOP_TYPE[m.kind] ?? 'REST_STOP', plannedAt: m.plannedAt, lat: geo?.lat, lng: geo?.lng };
  });
  const done: ProgressMilestone[] = [];
  ordered.forEach((m, i) => {
    if (m.status !== 'COMPLETED' || !m.occurredAt) return;
    done.push({ type: milestoneType(m.kind, i), stopIndex: i, at: m.occurredAt, by: m.recordedBy?.name ?? m.recordedBy?.userId ?? '', note: m.note || undefined });
  });
  return { stops, milestones: done };
}
