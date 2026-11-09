import { apiClient } from '../../../shared/api/apiClient';
import axios from 'axios';
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
  TripStatus,
} from '../types';
import { mockCrew, mockHorses, mockIncidents, mockTrips } from '../data/mockData';
import { getDemoMode } from '../../../shared/context/DemoModeContext';
import { flow4Api } from '../../tracking/api/flow4Api';
import { generateUuidV4 } from '../../../shared/utils/uuid';
import { getSharedIncidents } from '../../../shared/utils/sharedIncidents';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const roadGeometryCache = new Map<string, Promise<Array<Array<[number, number]>>>>();

/** Hình học từng chặng đường bộ; OSRM nhận kinh độ trước vĩ độ. */
export function roadLegGeometry(points: Array<[number, number]>): Promise<Array<Array<[number, number]>>> {
  if (points.length < 2) return Promise.resolve([]);
  const path = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const cached = roadGeometryCache.get(path);
  if (cached) return cached;
  const base = import.meta.env.DEV ? `${window.location.origin}/osrm` : 'https://router.project-osrm.org';
  const request = axios.get<{ code: string; routes?: Array<{ legs: Array<{ steps: Array<{ geometry: { coordinates: number[][] } }> }> }> }>(
    `${base}/route/v1/driving/${path}`, { params: { overview: 'false', geometries: 'geojson', steps: 'true' }, timeout: 15000 })
    .then(({ data }) => {
      const legs = data.routes?.[0]?.legs;
      if (data.code !== 'Ok' || legs?.length !== points.length - 1) throw new Error('Không tìm được tuyến đường bộ.');
      const geometry = legs.map((leg) => leg.steps.flatMap((step) => step.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])));
      if (geometry.some((leg) => leg.length < 2)) throw new Error('Tuyến đường bộ thiếu hình học.');
      return geometry;
    }).catch((error) => { roadGeometryCache.delete(path); throw error; });
  roadGeometryCache.set(path, request);
  return request;
}

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

  /** Sự cố của các chuyến được giao (kết hợp backend và shared storage) */
  getIncidents: async (): Promise<Incident[]> => {
    const shared = getSharedIncidents();
    const mapDto = (dto: any): Incident => {
      const coords = dto.locationCoordinates ? String(dto.locationCoordinates).split(',') : [];
      const lat = coords.length === 2 ? parseFloat(coords[0]) : undefined;
      const lng = coords.length === 2 ? parseFloat(coords[1]) : undefined;
      return {
        id: dto.incidentId || dto.id,
        tripId: dto.tripId,
        type: (dto.category || dto.incidentType || dto.type || 'OTHER') as any,
        severity: (dto.severity || 'MEDIUM') as any,
        status: (dto.status || 'NEW') as any,
        at: dto.reportedAt || dto.at || new Date().toISOString(),
        by: dto.reportedByUserName || dto.reportedByUserId || dto.by || 'Tài xế',
        location: dto.immediateCare || dto.location || (lat && lng ? `${lat}, ${lng}` : 'Trên tuyến'),
        lat: Number.isFinite(lat) ? lat : undefined,
        lng: Number.isFinite(lng) ? lng : undefined,
        description: dto.description || '',
        photos: dto.imageUrl ? [dto.imageUrl] : Array.isArray(dto.photos) ? dto.photos : [],
        approvedPlan: dto.resolutionNotes,
      };
    };

    let backendList: Incident[] = [];
    try {
      const res = await apiClient.get<ApiResponse<any[]>>(DRIVER_ENDPOINTS.INCIDENTS);
      if (Array.isArray(res.data?.data)) {
        backendList = res.data.data.map(mapDto);
      }
    } catch {
      try {
        const res2 = await apiClient.get<ApiResponse<any[]>>('/incidents');
        if (Array.isArray(res2.data?.data)) {
          backendList = res2.data.data.map(mapDto);
        }
      } catch {
        // Backend unavailable or error
      }
    }

    const clean = (x?: string) => (x || '').replace(/-/g, '_').toUpperCase();
    const mergedMap = new Map<string, Incident>();
    if (getDemoMode('driver')) {
      mockIncidents.forEach((i) => mergedMap.set(clean(i.id), i));
    }
    backendList.forEach((i) => mergedMap.set(clean(i.id), i));
    shared.forEach((s) => {
      const i: Incident = {
        id: s.id,
        tripId: s.tripId,
        type: s.type as any,
        severity: s.severity as any,
        status: s.status as any,
        at: s.at,
        by: s.by,
        location: s.location,
        lat: s.lat,
        lng: s.lng,
        description: s.description,
        photos: s.photos || [],
        approvedPlan: s.approvedPlan,
      };
      const key = clean(s.id);
      const existing = mergedMap.get(key);
      if (existing) {
        mergedMap.set(key, { ...existing, ...i, approvedPlan: s.approvedPlan || existing.approvedPlan });
      } else {
        mergedMap.set(key, i);
      }
    });

    return Array.from(mergedMap.values()).sort((a, b) => b.at.localeCompare(a.at));
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
  reportIncident: async (tripId: string, body: ReportIncidentRequestDto): Promise<{ ok: boolean; incident?: Partial<Incident> }> => {
    const payload = {
      tripId,
      category: body.type,
      type: body.type,
      severity: body.severity,
      description: body.description,
      location: body.location,
      immediateCare: body.location,
      locationCoordinates: body.locationCoordinates,
      imageUrl: body.photos?.[0],
      photos: body.photos,
      occurredAt: new Date().toISOString(),
    };
    try {
      const res = await apiClient.post<ApiResponse<any>>(DRIVER_ENDPOINTS.REPORT_INCIDENT(tripId), payload);
      const data = res.data?.data;
      if (res.data?.success !== false) {
        return {
          ok: true,
          incident: data ? {
            id: data.incidentId || data.id,
            tripId: data.tripId || tripId,
            type: (data.category || data.incidentType || body.type) as any,
            severity: (data.severity || body.severity) as any,
            status: (data.status || 'REPORTED') as any,
            at: data.reportedAt || new Date().toISOString(),
            by: data.reportedByUserName || data.reportedByUserId || 'Tài xế',
            location: data.location || body.location,
            description: data.description || body.description,
          } : undefined,
        };
      }
    } catch {
      try {
        const res2 = await apiClient.post<ApiResponse<any>>('/incidents', payload);
        const data2 = res2.data?.data;
        if (res2.data?.success !== false) {
          return {
            ok: true,
            incident: data2 ? {
              id: data2.incidentId || data2.id,
              tripId: data2.tripId || tripId,
              type: (data2.category || data2.incidentType || body.type) as any,
              severity: (data2.severity || body.severity) as any,
              status: (data2.status || 'REPORTED') as any,
              at: data2.reportedAt || new Date().toISOString(),
              by: data2.reportedByUserName || data2.reportedByUserId || 'Tài xế',
              location: data2.location || body.location,
              description: data2.description || body.description,
            } : undefined,
          };
        }
      } catch {
        // Backend offline / mock
      }
    }
    return { ok: true };
  },

  /** Hoàn tất bàn giao tại điểm đích (Flow 6) */
  completeHandover: (tripId: string, body: CompleteHandoverRequestDto) =>
    send(DRIVER_ENDPOINTS.HANDOVER(tripId), body),

  /** Ghi nhận người nhận từ chối / không thể bàn giao (Flow 6) */
  refuseHandover: (tripId: string, body: RefuseHandoverRequestDto) =>
    send(DRIVER_ENDPOINTS.HANDOVER_REFUSAL(tripId), body),
};

export default driverApi;
