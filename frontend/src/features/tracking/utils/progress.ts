import type { Geo, PublicMilestone, Milestone as F4Milestone } from '../types/flow4.types';

/**
 * Lịch trình và tiến độ hành trình dùng chung cho Tài xế, Quản lý và Khách hàng.
 * Nguồn duy nhất là danh sách mốc Flow 4 (TRIP_MILESTONE).
 * Mỗi trạm dừng/chốt kiểm soát có cả mốc đến (ARRIVED) và mốc rời đi (DEPARTED).
 */
export type ProgressStopType = 'ORIGIN' | 'REST_STOP' | 'FUEL_STOP' | 'CHECKPOINT' | 'AIRPORT' | 'QUARANTINE_STATION' | 'DESTINATION';
export type ProgressMilestoneType =
  | 'DEPARTED'
  | 'ARRIVED_STOP'
  | 'LEFT_STOP'
  | 'ARRIVED_CHECKPOINT'
  | 'PASSED_CHECKPOINT'
  | 'ARRIVED_DESTINATION';

export interface ProgressStop {
  id: string;
  name: string;
  type: ProgressStopType;
  plannedAt: string;
  lat?: number;
  lng?: number;
  requiresHealthCheck?: boolean;
  /** Mã mốc "rời" của điểm dừng (máy chủ gắn nhật ký sức khỏe vào mốc này; `id` là mã mốc "đến") */
  departureId?: string;
}

export interface ProgressMilestone {
  type: ProgressMilestoneType;
  stopIndex: number;
  at: string;
  /** Thời điểm hệ thống ghi nhận mốc (chính xác tới giây), khác với `at` do người dùng nhập theo phút */
  recordedAt?: string;
  by: string;
  note?: string;
}

type AnyMilestone = (F4Milestone | PublicMilestone) & { sequence?: number; geo?: Geo | null; requiresHealthCheck?: boolean };

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

/** Làm sạch tên điểm dừng (bỏ các tiền tố như "Đến trạm dừng", "Rời trạm dừng"...) */
export function cleanStopName(label: string): string {
  if (!label) return '';
  return (
    label
      .replace(
        /^(Xuất phát từ|Đến trạm dừng|Rời trạm dừng|Đến chốt kiểm soát|Rời chốt kiểm soát|Đến điểm giao|Đến ga|Đến sân bay|Đến trung tâm|Bàn giao|Tiếp nhận|Hạ cánh)\s+/i,
        ''
      )
      .trim() || label
  );
}

function milestoneType(kind: AnyMilestone['kind'], index: number): ProgressMilestoneType {
  if (index === 0 && kind === 'DEPARTED') return 'DEPARTED';
  if (kind === 'FINAL_ARRIVED') return 'ARRIVED_DESTINATION';
  if (kind === 'CHECKPOINT_ARRIVED') return 'ARRIVED_CHECKPOINT';
  if (kind === 'CHECKPOINT_DEPARTED') return 'PASSED_CHECKPOINT';
  if (kind === 'STOP_ARRIVED') return 'ARRIVED_STOP';
  if (kind === 'STOP_DEPARTED') return 'LEFT_STOP';
  if (kind === 'AIRPORT_ORIGIN_ARRIVED' || kind === 'AIR_ARRIVED') return 'ARRIVED_STOP';
  if (kind === 'AIR_HANDOVER' || kind === 'AIR_DEPARTED' || kind === 'AIR_RECEIVED') return 'LEFT_STOP';
  return 'ARRIVED_STOP';
}

/**
 * Đổi danh sách mốc Flow 4 thành điểm dừng vật lý và mốc đã hoàn tất.
 * Nếu một trạm dừng có cả mốc đến và mốc rời đi, gom chung vào cùng 1 điểm dừng vật lý (stop).
 */
export function progressFromMilestones(
  milestones: AnyMilestone[],
  routePoints: Geo[] = []
): { stops: ProgressStop[]; milestones: ProgressMilestone[] } {
  const ordered = [...milestones].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const stops: ProgressStop[] = [];
  const milestoneStopIndices: number[] = [];

  ordered.forEach((m, i) => {
    const isDepartureOfPrev =
      stops.length > 0 &&
      (m.kind === 'STOP_DEPARTED' || m.kind === 'CHECKPOINT_DEPARTED' || m.kind === 'AIR_DEPARTED') &&
      (ordered[i - 1]?.kind === 'STOP_ARRIVED' ||
        ordered[i - 1]?.kind === 'CHECKPOINT_ARRIVED' ||
        ordered[i - 1]?.kind === 'AIR_HANDOVER' ||
        cleanStopName(m.label) === stops[stops.length - 1].name);

    if (isDepartureOfPrev) {
      milestoneStopIndices.push(stops.length - 1);
      stops[stops.length - 1].departureId = m.id;
      if (m.requiresHealthCheck) stops[stops.length - 1].requiresHealthCheck = true;
    } else {
      const stopIndex = stops.length;
      milestoneStopIndices.push(stopIndex);
      const geo = m.geo ?? (routePoints.length === ordered.length ? routePoints[i] : undefined);
      stops.push({
        id: m.id,
        name: cleanStopName(m.label),
        type: STOP_TYPE[m.kind] ?? 'REST_STOP',
        plannedAt: m.plannedAt,
        lat: geo?.lat,
        lng: geo?.lng,
        requiresHealthCheck: !!m.requiresHealthCheck,
      });
    }
  });

  // Gán tọa độ routePoints nếu số điểm khớp với số stops (chứ không phải số milestones)
  if (routePoints.length === stops.length && stops.some((s) => s.lat === undefined)) {
    stops.forEach((s, i) => {
      if (s.lat === undefined && routePoints[i]) {
        s.lat = routePoints[i].lat;
        s.lng = routePoints[i].lng;
      }
    });
  }

  const done: ProgressMilestone[] = [];
  ordered.forEach((m, i) => {
    if (m.status !== 'COMPLETED' || !m.occurredAt) return;
    done.push({
      type: milestoneType(m.kind, i),
      stopIndex: milestoneStopIndices[i],
      at: m.occurredAt,
      recordedAt: (m as { recordedAt?: string | null }).recordedAt ?? undefined,
      by: m.recordedBy?.name ?? m.recordedBy?.userId ?? '',
      note: m.note || undefined,
    });
  });

  return { stops, milestones: done };
}
