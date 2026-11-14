import { rememberClosedIncident, sortIncidentsNewestFirst } from '../../../shared/utils/incidentState';
import axios from 'axios';
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
import { getSharedIncidents } from '../../../shared/utils/sharedIncidents';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const roadLegCache = new Map<string, Array<Array<[number, number]>>>();

export async function roadLegGeometry(points: Array<[number, number]>): Promise<Array<Array<[number, number]>>> {
  if (points.length < 2) return [];
  const key = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const cached = roadLegCache.get(key);
  if (cached) return cached;
  try {
    const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${key}?overview=false&geometries=geojson&steps=true`);
    const legs = res.data?.routes?.[0]?.legs;
    if (Array.isArray(legs) && legs.length) {
      const parsed: Array<Array<[number, number]>> = legs.map((leg: any, idx: number) => {
        const coords: Array<[number, number]> = [];
        for (const step of leg.steps || []) {
          for (const [lng, lat] of step.geometry?.coordinates || []) {
            if (!coords.length || coords[coords.length - 1][0] !== lat || coords[coords.length - 1][1] !== lng) {
              coords.push([lat, lng]);
            }
          }
        }
        return coords.length ? coords : [points[idx], points[idx + 1]];
      });
      roadLegCache.set(key, parsed);
      return parsed;
    }
  } catch {
    // Fallback to straight segments
  }
  return points.slice(1).map((p, i) => [points[i], p]);
}

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
    VEHICLE_RESOURCE: 'VEHICLE_BREAKDOWN',
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

  const rawAt = d.reportedAt || d.at;
  let formattedAt = '';
  if (rawAt) {
    try {
      const dObj = new Date(rawAt);
      if (!isNaN(dObj.getTime())) {
        const p = (n: number) => String(n).padStart(2, '0');
        formattedAt = `${dObj.getFullYear()}-${p(dObj.getMonth() + 1)}-${p(dObj.getDate())} ${p(dObj.getHours())}:${p(dObj.getMinutes())}`;
      } else {
        formattedAt = String(rawAt).replace('T', ' ').slice(0, 16);
      }
    } catch {
      formattedAt = String(rawAt).replace('T', ' ').slice(0, 16);
    }
  }
  // Máy chủ không trả thời điểm báo thì để trống (không dùng giờ hiện tại: làm mọi sự cố trùng giờ và sai thứ tự); bản cục bộ giữ giờ thật

  return {
    id: d.incidentId || d.id,
    tripId: d.tripId,
    type,
    severity: (d.severity || 'HIGH') as IncidentSeverity,
    status,
    at: formattedAt,
    by: d.reportedByUserName || d.reportedByUserId || d.by || 'Tài xế',
    location: d.location || 'Trên đường vận chuyển',
    description: d.description || '',
    photos: d.imageUrl ? [d.imageUrl] : (d.photos || []),
    approvedPlan: d.approvedPlan || d.resolutionNotes || undefined,
    resolutionType: d.resolutionType || undefined,
    resolutionNotes: d.resolutionNotes || undefined,
    immediateCare: d.immediateCare || undefined,
    acknowledged: Boolean(d.isSceneReady || d.acknowledged),
    isSceneReady: Boolean(d.isSceneReady || d.acknowledged),
    horseId: d.horseId || undefined,
    horseName: d.horseName || undefined,
    healthIssueType: d.healthIssueType || undefined,
    vetStatus: d.vetStatus || undefined,
    targetVetStation: d.targetVetStation || undefined,
    vetResolutionNote: d.vetResolutionNote || undefined,
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

const LOCAL_INCIDENTS_KEY = 'rts_driver_reported_incidents';

export function saveLocalIncident(inc: Incident) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_INCIDENTS_KEY);
    const list: Incident[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((x) => x.id !== inc.id);
    filtered.unshift(inc);
    localStorage.setItem(LOCAL_INCIDENTS_KEY, JSON.stringify(filtered.slice(0, 50)));
  } catch {
    // ignore
  }
}

export function loadLocalIncidents(): Incident[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_INCIDENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function updateLocalIncident(id: string, patch: Partial<Incident>) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_INCIDENTS_KEY);
    const list: Incident[] = raw ? JSON.parse(raw) : [];
    const cleanTarget = (id || '').replace(/-/g, '_').toUpperCase();
    const updated = list.map((item) => {
      const c = (item.id || '').replace(/-/g, '_').toUpperCase();
      if (c === cleanTarget || item.id === id) {
        return { ...item, ...patch };
      }
      return item;
    });
    localStorage.setItem(LOCAL_INCIDENTS_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch {
    // ignore
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
    let local = loadLocalIncidents();
    const cleanTargetId = (x?: string) => (x || '').replace(/-/g, '_').toUpperCase();

    const shared = getSharedIncidents();
    shared.forEach((s) => {
      const cid = cleanTargetId(s.id);
      if (!local.some((li) => li.id === s.id || cleanTargetId(li.id) === cid)) {
        local.push({
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
        });
      }
    });

    // Làm giàu dữ liệu local với trạng thái đã lưu từ các thao tác của Điều phối viên
    local = local.map((inc) => {
      const cid = cleanTargetId(inc.id);
      try {
        const customStatus = localStorage.getItem(`rts_incident_status_${cid}`) || localStorage.getItem(`rts_incident_status_${inc.id}`);
        const customAck = localStorage.getItem(`rts_ack_${cid}`) || localStorage.getItem(`rts_ack_${inc.id}`);
        const transferApproved = localStorage.getItem(`rts_vet_transfer_approved_${cid}`) || localStorage.getItem(`rts_vet_transfer_approved_${inc.id}`);
        const contAllowed = localStorage.getItem(`rts_incident_continue_${cid}`) || localStorage.getItem(`rts_incident_continue_${inc.id}`);
        const planApproved = localStorage.getItem(`rts_incident_plan_${cid}`) || localStorage.getItem(`rts_incident_plan_${inc.id}`);

        const res: Incident = { ...inc };
        if (customStatus) res.status = customStatus as IncidentStatus;
        if (customAck) (res as any).isCoordAccepted = true;
        if (planApproved) {
          res.approvedPlan = planApproved;
          res.resolutionNotes = planApproved;
        }
        if (transferApproved) {
          (res as any).isTransferApproved = true;
          (res as any).vetStatus = 'TRANSFER_APPROVED';
        }
        if (contAllowed) {
          (res as any).continueAt = contAllowed;
          res.status = 'CONTINUE_ALLOWED' as any;
        }
        return res;
      } catch {
        return inc;
      }
    });

    try {
      const res = await apiClient.get<ApiResponse<any[]>>(DRIVER_ENDPOINTS.INCIDENTS);
      if (Array.isArray(res.data?.data)) {
        const fromServer = res.data.data.map(mapIncidentDto);
        fromServer.forEach((si) => { if (si.status === 'CLOSED') rememberClosedIncident(si.id); });
        const merged: Incident[] = [];

        fromServer.forEach((si) => {
          const loc = local.find((li) => li.id === si.id || cleanTargetId(li.id) === cleanTargetId(si.id));
          if (loc) {
            merged.push({
              ...loc,
              ...si,
              // Giờ báo thật: của máy chủ, nếu không có thì của lúc tài xế gửi báo cáo (bộ nhớ dùng chung). Giờ đã lưu cục bộ từ các lần tải trước có thể là giờ tải trang nên không dùng.
              at: si.at || shared.find((x) => cleanTargetId(x.id) === cleanTargetId(si.id))?.at || '',
              status: (si.status && si.status !== 'NEW') ? si.status : (loc.status || si.status),
              approvedPlan: si.approvedPlan || loc.approvedPlan,
              resolutionNotes: si.resolutionNotes || loc.resolutionNotes,
              resolutionType: si.resolutionType || loc.resolutionType,
              vetStatus: si.vetStatus || loc.vetStatus,
              horseId: si.horseId || loc.horseId,
              horseName: si.horseName || loc.horseName,
              healthIssueType: si.healthIssueType || loc.healthIssueType,
              immediateCare: si.immediateCare || loc.immediateCare,
              tripId: loc.tripId || si.tripId,
            });
          } else {
            merged.push(si);
          }
        });

        const DELETED_SPAM_IDS = new Set([
          'INC_20261102_17F406', 'INC_20261106_44A3AF', 'INC_20261107_26EACE', 'INC_20261107_552507',
          'INC_20261107_59E0B0', 'INC_20261107_619E30', 'INC_20261107_71DBE2', 'INC_20261107_AFD75F',
          'INC_20261107_BE43C1', 'INC_20261107_E6F8D1', 'INC_20261108_09C04D', 'INC_20261108_1E5D35',
          'INC_20261108_402208', 'INC_20261108_4C75B1', 'INC_20261108_63E037',
          'INC_20261108_9EA7FB', 'INC_20261108_A6D8E9', 'INC_20261108_B18836', 'INC_20261108_BD39EC',
          'INC_20261108_C40695', 'INC_20261107_D190C1',
        ]);

        local.forEach((li) => {
          if (DELETED_SPAM_IDS.has(li.id) || DELETED_SPAM_IDS.has(cleanTargetId(li.id))) return;
          if (!merged.some((m) => m.id === li.id || cleanTargetId(m.id) === cleanTargetId(li.id))) {
            merged.unshift(li);
          }
        });

        // Luôn sắp xếp toàn bộ danh sách: mới nhất lên đầu
        merged.splice(0, merged.length, ...sortIncidentsNewestFirst(merged));

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_INCIDENTS_KEY, JSON.stringify(merged.slice(0, 100)));
          } catch {
            // ignore
          }
        }
        return merged;
      }
    } catch {
      // Backend error or offline
    }

    const fallback = getDemoMode('driver') ? clone(mockIncidents) : [];
    const merged = [...local];
    fallback.forEach((fi) => {
      if (!merged.some((li) => li.id === fi.id || cleanTargetId(li.id) === cleanTargetId(fi.id))) {
        merged.push(fi);
      }
    });
    return merged;
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
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      locationLabel: body.locationLabel ?? null,
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
      immediateCare: body.immediateCare || 'Người và ngựa đã được sơ cứu hoặc đảm bảo an toàn',
      horseId: body.horseId,
      horseName: body.horseName,
      healthIssueType: body.healthIssueType,
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
