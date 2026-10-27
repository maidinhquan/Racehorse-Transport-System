import { apiClient } from '../../../shared/api/apiClient';
import { DRIVER_ENDPOINTS } from './driverEndpoints';
import type {
  ApiResponse,
  CompleteHandoverRequestDto,
  CrewMember,
  DepartureDelayRequestDto,
  HealthLogRequestDto,
  Horse,
  Incident,
  RecordMilestoneRequestDto,
  RefuseHandoverRequestDto,
  ReportIncidentRequestDto,
  Trip,
} from '../types';
import { mockCrew, mockHorses, mockIncidents, mockTrips } from '../data/mockData';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** GET có fallback về mock data khi Backend chưa chạy */
async function getOr<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await apiClient.get<ApiResponse<T>>(url);
    return res.data?.data ?? clone(fallback);
  } catch {
    return clone(fallback);
  }
}

/** POST: trả về true nếu Backend nhận, false nếu đang chạy chế độ mock (UI vẫn cập nhật cục bộ) */
async function send(url: string, body?: unknown): Promise<boolean> {
  try {
    const res = await apiClient.post<ApiResponse<unknown>>(url, body);
    return res.data?.success !== false;
  } catch {
    return false;
  }
}

export const driverApi = {
  /** Các chuyến được giao cho tài khoản tổ xe đang đăng nhập */
  getMyTrips: () => getOr<Trip[]>(DRIVER_ENDPOINTS.MY_TRIPS, mockTrips),

  /** Chi tiết một chuyến */
  getTrip: (tripId: string) =>
    getOr<Trip | undefined>(DRIVER_ENDPOINTS.TRIP_DETAIL(tripId), mockTrips.find((t) => t.id === tripId)),

  /** Danh bạ tổ xe (tài xế, phụ lái, bác sĩ thú y) */
  getCrew: () => getOr<CrewMember[]>(DRIVER_ENDPOINTS.CREW, mockCrew),

  /** Thông tin ngựa trên các chuyến */
  getHorses: () => getOr<Horse[]>(DRIVER_ENDPOINTS.HORSES, mockHorses),

  /** Sự cố của các chuyến được giao */
  getIncidents: () => getOr<Incident[]>(DRIVER_ENDPOINTS.INCIDENTS, mockIncidents),

  /** Ghi nhận mốc hành trình (thủ công, không có GPS) */
  recordMilestone: (tripId: string, body: RecordMilestoneRequestDto) =>
    send(DRIVER_ENDPOINTS.MILESTONES(tripId), body),

  /** Báo chậm khởi hành để Coordinator đề xuất lịch mới */
  reportDepartureDelay: (tripId: string, body: DepartureDelayRequestDto) =>
    send(DRIVER_ENDPOINTS.DEPARTURE_DELAY(tripId), body),

  /** Nhắc Transport Specialist ghi kết quả thông quan */
  remindClearance: (tripId: string) => send(DRIVER_ENDPOINTS.CLEARANCE_REMINDER(tripId)),

  /** Hộ tống / bác sĩ thú y ghi nhật ký sức khoẻ ngựa */
  addHealthLog: (tripId: string, body: HealthLogRequestDto) =>
    send(DRIVER_ENDPOINTS.HEALTH_LOGS(tripId), body),

  /** Báo cáo sự cố (SOS) */
  reportIncident: (tripId: string, body: ReportIncidentRequestDto) =>
    send(DRIVER_ENDPOINTS.REPORT_INCIDENT(tripId), body),

  /** Hoàn tất bàn giao tại điểm đích */
  completeHandover: (tripId: string, body: CompleteHandoverRequestDto) =>
    send(DRIVER_ENDPOINTS.HANDOVER(tripId), body),

  /** Ghi nhận người nhận từ chối / không thể bàn giao */
  refuseHandover: (tripId: string, body: RefuseHandoverRequestDto) =>
    send(DRIVER_ENDPOINTS.HANDOVER_REFUSAL(tripId), body),
};

export default driverApi;
