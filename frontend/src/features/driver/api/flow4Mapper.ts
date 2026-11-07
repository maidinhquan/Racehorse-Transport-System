import type { Tracking } from '../../tracking/types/flow4.types';
import { progressFromMilestones } from '../../tracking/utils/progress';
import type { CrewMember, CrewRole, CrewSlot, Horse, Milestone, RouteStop, Trip } from '../types';


/** Thông tin bổ sung lấy từ Flow 6 (người nhận được chỉ định) */
export interface TripExtras {
  customer?: string;
  receiverName?: string;
  receiverPhone?: string;
}

export interface MappedTrip {
  trip: Trip;
  crew: CrewMember[];
  horses: Horse[];
}

const SLOT: Record<string, CrewSlot> = { MAIN_DRIVER: 'MAIN_DRIVER', CO_DRIVER: 'CO_DRIVER', VETERINARIAN: 'VETERINARIAN', ESCORT: 'VETERINARIAN' };
const ROLE: Record<CrewSlot, CrewRole> = { MAIN_DRIVER: 'DRIVER', CO_DRIVER: 'DRIVER', VETERINARIAN: 'VETERINARIAN' };

/** Chuyển dữ liệu theo dõi chuyến của Flow 4 sang mô hình `Trip` của giao diện tài xế */
export function tripFromTracking(tracking: Tracking, extras: TripExtras = {}): MappedTrip {
  const ordered = [...tracking.milestones].sort((a, b) => a.sequence - b.sequence);
  const country = tracking.pickup?.country ?? '';

  const progress = progressFromMilestones(tracking.milestones);
  const stops: RouteStop[] = progress.stops.map((s) => ({ ...s, country }));
  const milestones: Milestone[] = progress.milestones.map((m) => ({ ...m, by: ordered[m.stopIndex]?.recordedBy?.userId ?? '' }));

  const crew: Trip['crew'] = {};
  const crewMembers = new Map<string, CrewMember>();
  tracking.legs.forEach((leg) => {
    leg.crew.forEach((c) => {
      const slot = SLOT[c.duty as string];
      if (!slot) return;
      if (!crew[slot]) crew[slot] = c.userId;
      if (!crewMembers.has(c.userId)) crewMembers.set(c.userId, { id: c.userId, name: c.name, role: ROLE[slot], phone: '' });
    });
  });

  const horses: Horse[] = tracking.horses.map((h) => ({ id: h.horseId, name: h.name, breed: '', sex: '', age: 0, color: '', microchip: h.microchip }));
  const leg = tracking.legs.find((l) => l.vehicle) ?? tracking.legs[0];
  const pickup = { name: tracking.pickup?.name ?? '', address: tracking.pickup?.address ?? '' };
  const delivery = { name: tracking.delivery?.name ?? '', address: tracking.delivery?.address ?? '' };

  const trip: Trip = {
    id: tracking.trip.tripId,
    requestId: tracking.trip.requestId,
    customer: extras.customer ?? '',
    mode: tracking.trip.mode,
    origin: pickup.address || pickup.name,
    destination: delivery.address || delivery.name,
    pickup,
    delivery,
    receiver: { name: extras.receiverName ?? '', phone: extras.receiverPhone ?? '' },
    horses: horses.map((h) => h.id),
    plannedDepart: ordered[0]?.plannedAt ?? '',
    eta: tracking.trip.eta?.currentEta ?? '',
    status: tracking.trip.tripStatus,
    vehicle: leg?.vehicle ? { plate: leg.vehicle.plateNumber, model: leg.vehicle.type } : undefined,
    flight: tracking.flight ? { airline: tracking.flight.partnerName, flightNo: tracking.flight.flightCode, departAt: tracking.flight.plannedDepartureAt } : undefined,
    crew,
    stops,
    milestones,
    clearances: [],
    health: [],
    documents: [],
    handoverAttempts: [],
  };

  return { trip, crew: [...crewMembers.values()], horses };
}
