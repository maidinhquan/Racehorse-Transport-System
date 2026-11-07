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
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  RecordMilestoneRequestDto,
  RefuseHandoverRequestDto,
  ReportIncidentRequestDto,
  Trip,
  TripStatus,
} from '../types';
import { mockCrew, mockHorses, mockIncidents, mockTrips } from '../data/mockData';
import { getDemoMode } from '../../../shared/context/DemoModeContext';
import { flow4Api } from '../../tracking/api/flow4Api';
import { generateUuidV4 } from '../../../shared/utils/uuid';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const mapIncidentDto = (d: any): Incident => {
  const cat = String(d.category || d.incidentType || d.type || 'OTHER').toUpperCase();
  const validTypes: IncidentType[] = [
    'VEHICLE_BREAKDOWN',
    'BORDER_DELAY',
    'BAD_WEATHER',
    'TRAFFIC_ACCIDENT',
    'HORSE_HEALTH',
    'CUSTOMS_HOLD',
    'ROAD_CLOSURE',
    'OTHER',
  ];
  const typeMap: Record<string, IncidentType> = {
    BREAKDOWN: 'VEHICLE_BREAKDOWN',
    ACCIDENT: 'TRAFFIC_ACCIDENT',
    HEALTH: 'HORSE_HEALTH',
    DELAY: 'ROAD_CLOSURE',
  };
  const type: IncidentType = validTypes.includes(cat as IncidentType)
    ? (cat as IncidentType)
    : (typeMap[cat] || 'OTHER');

  const rawStatus = String(d.status || 'NEW').toUpperCase();
  const status: IncidentStatus =
    rawStatus === 'REPORTED' ? 'NEW' :
    (['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(rawStatus) ? (rawStatus as IncidentStatus) : 'IN_PROGRESS');

  return {
    id: d.incidentId || d.id,
    tripId: d.tripId,
    type,
    severity: (d.severity || 'HIGH') as IncidentSeverity,
    status,
    at: d.reportedAt ? d.reportedAt.replace('T', ' ').slice(0, 16) : (d.at || new Date().toISOString().replace('T', ' ').slice(0, 16)),
    by: d.reportedByUserName || d.reportedByUserId || d.by || 'Tài xế',
    location: d.location || (d.locationCoordinates ? `Tọa độ: ${d.locationCoordinates}` : 'Trên đường vận chuyển'),
    description: d.description || '',
    photos: d.imageUrl ? [d.imageUrl] : (d.photos || []),
    approvedPlan: d.approvedPlan || d.resolutionNotes || undefined,
    resolutionType: d.resolutionType || undefined,
    resolutionNotes: d.resolutionNotes || undefined,
    immediateCare: d.immediateCare || undefined,
  };
};

/**
 * GET có fallback về mock data CHỈ KHI demo mode đang bật.
 * Khi demo tắt và API lỗi, trả về emptyFallback (mảng rỗng / undefined).
 */
async function getOr<T>(url: string, mockFallback: T, emptyFallback: T = [] as unknown as T): Promise<T> {
  try {
    const res = await apiClient.get<ApiResponse<T>>(url);
    return res.data?.data ?? (getDemoMode('driver') ? clone(mockFallback) : emptyFallback);
  } catch {
    return getDemoMode('driver') ? clone(mockFallback) : emptyFallback;
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
  getMyTrips: async (): Promise<Trip[]> => {
    try {
      const live = await flow4Api.getDriverTrips();
      if (live && live.length > 0) {
        return live.map((s, idx) => {
          const fallback = mockTrips.find((t) => t.id === s.tripId) || mockTrips[idx % mockTrips.length];
          return {
            ...fallback,
            id: s.tripId,
            status: (s.tripStatus as TripStatus) || fallback.status,
            plannedDepart: fallback.plannedDepart,
            eta: s.eta?.currentEta || fallback.eta,
          };
        });
      }
    } catch {
      // Fallback to driver endpoints or mock
    }
    return getOr<Trip[]>(DRIVER_ENDPOINTS.MY_TRIPS, mockTrips);
  },

  /** Chi tiết một chuyến */
  getTrip: async (tripId: string): Promise<Trip | undefined> => {
    try {
      const tracking = await flow4Api.getTracking(tripId);
      if (tracking && tracking.trip) {
        const fallback = mockTrips.find((t) => t.id === tripId) || mockTrips[0];
        return {
          ...fallback,
          id: tracking.trip.tripId,
          status: (tracking.trip.tripStatus as TripStatus) || fallback.status,
          plannedDepart: fallback.plannedDepart,
          eta: tracking.trip.eta?.currentEta || fallback.eta,
        };
      }
    } catch {
      // Fallback
    }
    return getOr<Trip | undefined>(DRIVER_ENDPOINTS.TRIP_DETAIL(tripId), mockTrips.find((t) => t.id === tripId), undefined);
  },

  /** Danh bạ tổ xe (tài xế, phụ lái, bác sĩ thú y) */
  getCrew: () => getOr<CrewMember[]>(DRIVER_ENDPOINTS.CREW, mockCrew),

  /** Thông tin ngựa trên các chuyến */
  getHorses: () => getOr<Horse[]>(DRIVER_ENDPOINTS.HORSES, mockHorses),

  /** Sự cố của các chuyến được giao */
  getIncidents: async (): Promise<Incident[]> => {
    try {
      const res = await apiClient.get<ApiResponse<any[]>>(DRIVER_ENDPOINTS.INCIDENTS);
      if (Array.isArray(res.data?.data)) {
        return res.data.data.map(mapIncidentDto);
      }
    } catch {
      // Backend error or offline
    }
    return getDemoMode('driver') ? clone(mockIncidents) : [];
  },

  /**
   * Ghi nhận mốc hành trình (Flow 4). Chế độ demo chỉ cập nhật cục bộ. Chế độ thật dùng đúng mã mốc và phiên bản
   * hiện tại của backend; lỗi từ backend được ném ra để giao diện hiển thị, không cập nhật giả.
   */
  recordMilestone: async (tripId: string, body: RecordMilestoneRequestDto): Promise<boolean> => {
    if (getDemoMode('driver')) return true;
    const key = generateUuidV4();
    const tracking = await flow4Api.getTracking(tripId);
    const { binding } = tracking;
    if (body.type === 'DEPARTED') {
      const check = await flow4Api.getDepartureCheck(tripId);
      await flow4Api.confirmDeparture(tripId, {
        expectedVersion: binding.executionVersion,
        approvedPlanVersion: binding.approvedPlanVersion,
        assignmentVersion: binding.assignmentVersion,
        occurredAt: body.at,
        acknowledgements: check.requiredAcknowledgements,
        note: body.note || '',
        evidenceFileIds: [],
      }, key);
      return true;
    }
    // Tìm mốc PENDING kế tiếp trong tracking thực tế của backend
    const orderedPending = [...tracking.milestones]
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
      .find((m) => m.status === 'PENDING');
    const milestoneId = orderedPending?.id || body.milestoneId;
    if (!milestoneId) throw new Error('Không xác định được mã mốc của backend.');
    await flow4Api.completeMilestone(tripId, milestoneId, {
      expectedVersion: binding.executionVersion,
      occurredAt: body.at,
      note: body.note || '',
      evidenceFileIds: [],
    }, key);
    return true;
  },

  /** Báo chậm khởi hành để Coordinator đề xuất lịch mới */
  reportDepartureDelay: async (tripId: string, body: DepartureDelayRequestDto) => {
    try {
      const key = generateUuidV4();
      await flow4Api.proposeDriverEta(tripId, {
        expectedVersion: 1,
        proposedEta: new Date(Date.now() + 2 * 3600000).toISOString(),
        reason: body.reason,
        milestoneId: 'MS_DEPARTURE',
        incidentId: null,
      }, key);
      return true;
    } catch {
      return send(DRIVER_ENDPOINTS.DEPARTURE_DELAY(tripId), body);
    }
  },

  /** Nhắc Transport Specialist ghi kết quả thông quan */
  remindClearance: (tripId: string) => send(DRIVER_ENDPOINTS.CLEARANCE_REMINDER(tripId)),

  /**
   * Hộ tống / bác sĩ thú y ghi nhật ký sức khoẻ ngựa (Flow 4). Chế độ demo chỉ cập nhật cục bộ; chế độ thật dùng phiên bản
   * hiện tại của backend, gắn nhật ký với mốc đang chờ, và ném lỗi từ backend ra để giao diện hiển thị.
   */
  addHealthLog: async (tripId: string, body: HealthLogRequestDto): Promise<boolean> => {
    if (getDemoMode('driver')) return true;
    const { binding } = await flow4Api.getTracking(tripId);
    await flow4Api.recordHealthLog(tripId, {
      expectedVersion: binding.executionVersion,
      horseId: body.horseId,
      leg: 'road',
      milestoneId: body.milestoneId ?? null,
      incidentId: null,
      observedAt: body.at,
      condition: body.condition === 'ABNORMAL' ? 'ABNORMAL' : 'NORMAL',
      observation: body.notes || 'Quan sát sức khỏe trên đường',
      feeding: 'Bình thường',
      water: 'Đầy đủ',
      rest: 'Nghỉ ngơi theo lịch',
      care: '',
      temperatureC: body.temp,
      heartRateBpm: body.hr,
      respiratoryRatePerMin: 20,
      photoFileIds: [],
    }, generateUuidV4());
    return true;
  },

  /** Báo cáo sự cố (SOS) */
  reportIncident: async (tripId: string, body: ReportIncidentRequestDto): Promise<{ incidentId: string } | null> => {
    const categoryMap: Record<string, string> = {
      ACCIDENT: 'TRAFFIC_ACCIDENT',
      BREAKDOWN: 'VEHICLE_BREAKDOWN',
      HEALTH: 'HORSE_HEALTH',
      DELAY: 'ROAD_CLOSURE',
      OTHER: 'OTHER',
      VEHICLE_BREAKDOWN: 'VEHICLE_BREAKDOWN',
      TRAFFIC_ACCIDENT: 'TRAFFIC_ACCIDENT',
      HORSE_HEALTH: 'HORSE_HEALTH',
      ROAD_CLOSURE: 'ROAD_CLOSURE',
      BORDER_DELAY: 'BORDER_DELAY',
    };
    const category = categoryMap[body.type] || body.type || 'OTHER';
    const payload = {
      tripId,
      category,
      type: category,
      severity: body.severity,
      description: body.description,
      location: body.location,
      locationCoordinates: body.locationCoordinates,
      photos: body.photos,
      imageUrl: body.photos?.[0] || undefined,
      immediateCare: 'Người và ngựa đã được sơ cứu hoặc đảm bảo an toàn',
      occurredAt: new Date().toISOString(),
    };
    try {
      const res = await apiClient.post<ApiResponse<{ incidentId: string }>>(
        DRIVER_ENDPOINTS.REPORT_INCIDENT(tripId),
        payload
      );
      if (res.data?.success !== false && res.data?.data) {
        return res.data.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  /** Hoàn tất bàn giao tại điểm đích (Flow 6) */
  completeHandover: (tripId: string, body: CompleteHandoverRequestDto) =>
    send(DRIVER_ENDPOINTS.HANDOVER(tripId), body),

  /** Ghi nhận người nhận từ chối / không thể bàn giao (Flow 6) */
  refuseHandover: (tripId: string, body: RefuseHandoverRequestDto) =>
    send(DRIVER_ENDPOINTS.HANDOVER_REFUSAL(tripId), body),
};

export default driverApi;
