// Đồng bộ dữ liệu Chuyến đi giữa Điều phối (Coordinator), Quản lý (Manager), Chuyên viên (Specialist) và Tài xế (Driver)

const STORAGE_KEY = 'rts_shared_trips';
const cleanId = (id?: string) => (id || '').replace(/-/g, '_');

export interface SharedTripSyncData {
  id: string;
  requestId?: string;
  mode?: string;
  status?: string;
  plannedDepart?: string;
  eta?: string;
  specialistId?: string;
  coordinatorId?: string;
  deployment?: {
    status: string;
    specialistId?: string;
    coordinatorId?: string;
    at?: string;
    holdReason?: string;
  } | string;
  customerName?: string;
  origin?: string;
  destination?: string;
  originCountry?: string;
  destCountry?: string;
  horses?: any[];
  checkpoints?: any[];
  route?: {
    v: number;
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'CHANGES_REQUESTED' | 'RETURNED';
    submittedAt?: string;
    decidedAt?: string;
    decidedBy?: string;
    decisionNote?: string;
    note?: string;
    stops?: Array<{ name: string; type: string; plannedAt: string; exactGeo?: boolean; lat?: number; lng?: number }>;
    vehicle?: string;
    crew?: Array<[string, string]>;
    resourcesConfirmed?: boolean;
  };
  flight?: {
    airline: string;
    flightNo: string;
    budget: number;
    status: 'BUDGET_PENDING' | 'APPROVED' | 'REJECTED' | 'BOOKED';
    decidedAt?: string;
    from?: string;
    to?: string;
    departAt?: string;
    arriveAt?: string;
    contractNo?: string;
    bookingRef?: string;
    jetStallId?: string;
  };
  departureApprovedAt?: string;
  updatedAt: string;
}

export function getSharedTrips(): Record<string, SharedTripSyncData> {
  try {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export function getSharedTrip(tripId: string): SharedTripSyncData | null {
  const all = getSharedTrips();
  const cId = cleanId(tripId);
  const foundKey = Object.keys(all).find((k) => cleanId(k) === cId);
  return foundKey ? all[foundKey] : null;
}

export function saveSharedTrip(trip: any): void {
  try {
    if (typeof window === 'undefined' || !trip?.id) return;
    const all = getSharedTrips();
    const cId = cleanId(trip.id);
    // Điều phối và Quản lý có thể dùng mã chuyến khác dạng → tìm bản ghi cũ theo mã chuyến hoặc mã yêu cầu, ghi đè đúng bản ghi đó
    const key = Object.keys(all).find((k) => cleanId(k) === cId)
      || (trip.requestId ? Object.keys(all).find((k) => cleanId(all[k]?.requestId) === cleanId(trip.requestId)) : undefined)
      || trip.id;
    const existing = all[key] || {};

    // Chuẩn hóa lộ trình (route)
    let routeData = existing.route;
    const curRt = Array.isArray(trip.routes) ? trip.routes.slice(-1)[0] : trip.route;
    if (curRt) {
      const stops = (curRt.stops || []).map((s: any) => ({
        name: s.name || '',
        type: s.type || 'REST_STOP',
        plannedAt: s.plannedAt || s.departAt || s.arrive || '',
        lat: s.lat,
        lng: s.lng,
        exactGeo: s.exactGeo,
      }));

      // Map crew từ Coordinator object { MAIN_DRIVER: 'id' } sang Manager array [['Tài xế chính', 'name']]
      let crewArray: Array<[string, string]> = [];
      if (Array.isArray(curRt.crew)) {
        crewArray = curRt.crew;
      } else if (trip.crew && typeof trip.crew === 'object') {
        const ROLE_MAP: Record<string, string> = {
          MAIN_DRIVER: 'Tài xế chính',
          CO_DRIVER: 'Tài xế phụ',
          VETERINARIAN: 'Bác sĩ thú y',
          ESCORT: 'Áp tải',
        };
        crewArray = Object.entries(trip.crew).map(([roleKey, staffVal]: [string, any]) => [
          ROLE_MAP[roleKey] || roleKey,
          typeof staffVal === 'object' && staffVal ? staffVal.name || staffVal.id : String(staffVal || ''),
        ]);
      }

      routeData = {
        v: curRt.v || 1,
        status: curRt.status || 'PENDING_APPROVAL',
        submittedAt: curRt.submittedAt || new Date().toISOString().replace('T', ' ').slice(0, 16),
        decidedAt: curRt.decidedAt,
        decidedBy: curRt.decidedBy,
        decisionNote: curRt.decisionNote || curRt.note,
        note: curRt.note,
        stops,
        vehicle: typeof trip.vehicle === 'string' ? trip.vehicle : trip.vehicleId || (trip.mode === 'AIR' ? 'Do đơn vị hàng không bố trí' : 'Xe chuyên dụng'),
        crew: crewArray.length ? crewArray : [['Tài xế chính', 'Pham Thanh Son'], ['Bác sĩ thú y', 'Dr. Le Thu Trang']],
        resourcesConfirmed: true,
      };
    }

    // Chuẩn hóa chuyến bay (flight)
    let flightData = existing.flight;
    const curFlight = trip.flight;
    if (curFlight || trip.mode === 'AIR') {
      flightData = {
        airline: curFlight?.airline || 'Vietnam Airlines Cargo',
        flightNo: curFlight?.flightNo || curFlight?.contractNo || 'VN-9310F',
        budget: curFlight?.cost || curFlight?.budget || 6800,
        status: curFlight?.status === 'APPROVED' ? 'APPROVED'
          : curFlight?.status === 'REJECTED' ? 'REJECTED'
          : curFlight?.status === 'BOOKED' ? 'BOOKED'
          : 'BUDGET_PENDING',
        decidedAt: curFlight?.budgetDecidedAt || curFlight?.decidedAt,
        from: curFlight?.from,
        to: curFlight?.to,
        departAt: curFlight?.departAt,
        arriveAt: curFlight?.arriveAt,
        contractNo: curFlight?.contractNo,
        bookingRef: curFlight?.bookingRef,
        jetStallId: curFlight?.jetStallId,
      };
    }

    const specialistId = trip.specialistId || (typeof trip.deployment === 'object' ? trip.deployment?.specialistId : undefined) || existing.specialistId;
    const coordinatorId = trip.coordinatorId || (typeof trip.deployment === 'object' ? trip.deployment?.coordinatorId : undefined) || existing.coordinatorId;
    const deployment = trip.deployment || existing.deployment || (specialistId ? { status: 'CONFIRMED', specialistId, coordinatorId } : undefined);

    const updated: SharedTripSyncData = {
      id: trip.id,
      requestId: trip.requestId || existing.requestId,
      mode: trip.mode || existing.mode || 'ROAD',
      status: trip.status || existing.status || 'PLANNING',
      plannedDepart: trip.plannedDepart || existing.plannedDepart,
      eta: trip.eta || existing.eta,
      route: routeData,
      flight: flightData,
      departureApprovedAt: trip.departureApprovedAt || existing.departureApprovedAt,
      deployment,
      specialistId,
      coordinatorId,
      customerName: trip.customerName || existing.customerName,
      origin: trip.origin || existing.origin,
      destination: trip.destination || existing.destination,
      originCountry: trip.originCountry || existing.originCountry,
      destCountry: trip.destCountry || existing.destCountry,
      horses: trip.horses || existing.horses,
      checkpoints: trip.checkpoints || existing.checkpoints,
      updatedAt: new Date().toISOString(),
    };

    all[key] = { ...updated, id: existing.id || trip.id };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

    // Phát sự kiện cập nhật chuyến đi toàn hệ thống
    window.dispatchEvent(new CustomEvent('rts_trips_updated', { detail: { id: trip.id, trip: updated } }));
  } catch (e) {
    console.error('[sharedTrips] Failed to save shared trip:', e);
  }
}
