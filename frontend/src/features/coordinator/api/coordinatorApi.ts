import { apiClient } from "../../../shared/api/apiClient";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

export interface CoordinatorDashboardData {
  needRoute: number;
  needAssignment: number;
  availableVehicles: number;
  totalVehicles: number;
  activeTrips: number;
  incidentsCount: number;
  fleet: {
    ready: number;
    maintenance: number;
    inactive: number;
    total: number;
  };
  recentTrips: Array<{
    tripId: string;
    tripCode: string;
    routeName: string;
    horseCount: number;
    plannedDeparture: string;
    status: string;
  }>;
}

export interface PlanningTrip {
  tripId: string;
  requestId: string;
  tripCode: string;
  customerName: string;
  origin: string;
  destination: string;
  horseCount: number;
  transportType: string;
  plannedDepartureAt: string;
  deliveryDeadline: string;
  tripStatus: string;
  stage: string;
  vehicleAssigned: boolean;
  driverAssigned: boolean;
  escortAssigned: boolean;
  allowedActions: string[];
  // Flow 3 new attributes
  rejectionReason?: string;
  earliestDepartureDate?: string;
  documentExpiryDate?: string;
  specialistLegalNote?: string;
  resourcesConfirmedAt?: string;
  resourcesConfirmedBy?: string;
  departureApprovedAt?: string;
  departureApprovedBy?: string;
  isOperationsReady?: boolean;
  isLegalReady?: boolean;
}

export interface Vehicle {
  vehicleId: string;
  type: string;
  capacityStalls: number;
  maxRangeKm?: number;
  fuelCostPerKm?: number;
  status: string;
  isAvailable: boolean;
  operatingCountry?: string;
  plateNumber?: string;
}

export interface Staff {
  userId: string;
  fullName: string;
  role: string;
  email: string;
  phone: string;
  isActive: boolean;
  specialization: string;
  country?: string;
}

export interface Checkpoint {
  checkpointId: number;
  name: string;
  country: string;
  type: string;
  lat: number;
  lng: number;
  active: boolean;
  address?: string;
}

export interface FlightBooking {
  flightBookingId?: number;
  tripId: string;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  bookingRef: string;
  cargoAwb?: string;
  status: string;
  airStallsCount: number;
  bookedAt?: string;
  bookedBy?: string;
}

export interface LegAssignment {
  legNumber: number;
  legType: string; // 'OUTBOUND' | 'INBOUND'
  fromLocation?: string;
  toLocation?: string;
  vehicleId: string;
  mainDriverId: string;
  coDriverId?: string;
  veterinarianId?: string;
  operatingCountry?: string;
  mainDriverName?: string;
  coDriverName?: string;
  veterinarianName?: string;
}

export interface TripAssignmentsDetail {
  tripId: string;
  assignments: LegAssignment[];
}

export interface RouteCalculatePoint {
  sequence: number;
  type: string;
  name: string;
  lat: number;
  lng: number;
  plannedStopMinutes?: number;
}

export interface RouteCalculateLeg {
  fromSequence: number;
  toSequence: number;
  mode: string; // 'ROAD' | 'AIR'
}

export interface RouteCalculateRequest {
  tripId?: string;
  plannedDepartureAt: string;
  earliestDepartureDate?: string;
  documentExpiryDate?: string;
  committedDeadline?: string;
  deadlineJustification?: string;
  points: RouteCalculatePoint[];
  legs: RouteCalculateLeg[];
}

export interface RouteCalculateResponse {
  totalDistanceKm: number;
  totalElapsedHours: number;
  estimatedArrivalAt: string;
  meetsEquineWelfare: boolean;
  isWithinSpecialistWindow: boolean;
  meetsCustomerDeadline: boolean;
  requiresDeadlineJustification: boolean;
  distanceSource: string;
  warnings: string[];
  polylineCoordinates: Array<[number, number]>;
  segments: Array<{
    segmentId: number;
    fromName: string;
    toName: string;
    mode: string;
    distanceKm: number;
    estimatedMinutes: number;
    polylineCoordinates: Array<[number, number]>;
  }>;
}

export interface TripMonitoringData {
  tripId: string;
  tripCode: string;
  status: string;
  vehiclePosition: {
    latitude: number;
    longitude: number;
    lastUpdated: string;
    currentStatus: string;
  };
  fixedMarkers: Array<{
    name: string;
    type: string;
    lat: number;
    lng: number;
    color: string;
    icon: string;
    status: string;
  }>;
  routePolyline: Array<[number, number]>;
  currentLocationName: string;
  etaDestination?: string;
}

export interface OperationsReadiness {
  tripId: string;
  routeCreated: boolean;
  routeApproved: boolean;
  vehicleAssigned: boolean;
  driverAssigned: boolean;
  escortAssigned: boolean;
  coDriverAssigned?: boolean;
  veterinarianAssigned?: boolean;
  stallsSufficient: boolean;
  isReady: boolean;
  isOperationsReady?: boolean;
  isLegalReady?: boolean;
  confirmedByCoordinator: boolean;
  missingConditions: string[];
}

export interface DepartureConditions {
  tripId: string;
  status: string;
  rejectionReason?: string;
  allMet: boolean;
  isOperationsReady: boolean;
  isLegalReady: boolean;
  canApproveDeparture: boolean;
  departureApprovedAt?: string;
  departureApprovedBy?: string;
  conditions: Array<{
    code: string;
    description: string;
    met: boolean;
    missingReason?: string;
  }>;
}

export const coordinatorApi = {
  // =========================================================================
  // 1. DASHBOARD & PLANNING QUEUE
  // =========================================================================
  getDashboard: async () => {
    const res = await apiClient.get<ApiResponse<CoordinatorDashboardData>>("/coordinator/dashboard");
    return res.data;
  },

  getPlanningTrips: async () => {
    const res = await apiClient.get<ApiResponse<PlanningTrip[]>>("/coordinator/planning-trips");
    return res.data;
  },

  getUnplannedRequests: async () => {
    const res = await apiClient.get<ApiResponse<any[]>>("/coordinator/unplanned-requests");
    return res.data;
  },

  startPlanningTrip: async (payload: { requestId: string } | string) => {
    const body = typeof payload === "string" ? { requestId: payload } : payload;
    const res = await apiClient.post<ApiResponse<any>>("/coordinator/trips/start-planning", body);
    return res.data;
  },

  getTripDetail: async (tripId: string) => {
    const res = await apiClient.get<ApiResponse<any>>(`/coordinator/trips/${tripId}`);
    return res.data;
  },

  // =========================================================================
  // 2. CHECKPOINTS CATALOG & MAP GEOCODING
  // =========================================================================
  getCheckpoints: async (country?: string, type?: string, q?: string) => {
    const params = new URLSearchParams();
    if (country) params.append("country", country);
    if (type) params.append("type", type);
    if (q) params.append("q", q);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const res = await apiClient.get<ApiResponse<Checkpoint[]>>(`/coordinator/checkpoints${queryString}`);
    return res.data;
  },

  geocodeAddress: async (address: string, country: string = "VN") => {
    const res = await apiClient.get<ApiResponse<Checkpoint[]>>(
      `/coordinator/maps/geocode?address=${encodeURIComponent(address)}&country=${country}`
    );
    return res.data;
  },

  // =========================================================================
  // 3. FLEET (VEHICLES) MANAGEMENT
  // =========================================================================
  getVehicles: async (onlyAvailable: boolean = false, country?: string, minAvailableStalls?: number) => {
    const params = new URLSearchParams();
    if (onlyAvailable) params.append("onlyAvailable", "true");
    if (country) params.append("country", country);
    if (minAvailableStalls) params.append("minAvailableStalls", minAvailableStalls.toString());
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const res = await apiClient.get<ApiResponse<Vehicle[]>>(`/coordinator/vehicles${queryString}`);
    return res.data;
  },

  getVehicleDetail: async (vehicleId: string) => {
    const res = await apiClient.get<ApiResponse<Vehicle>>(`/coordinator/vehicles/${vehicleId}`);
    return res.data;
  },

  getAvailableVehicles: async (tripId?: string, legId?: number) => {
    const params = new URLSearchParams();
    if (tripId) params.append("tripId", tripId);
    if (legId) params.append("legId", legId.toString());
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const res = await apiClient.get<ApiResponse<Vehicle[]>>(`/coordinator/vehicles/available${queryString}`);
    return res.data;
  },

  // =========================================================================
  // 4. STAFF & CREW
  // =========================================================================
  getStaff: async (role?: string, country?: string) => {
    const params = new URLSearchParams();
    if (role) params.append("role", role);
    if (country) params.append("country", country);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const res = await apiClient.get<ApiResponse<Staff[]>>(`/coordinator/staff${queryString}`);
    return res.data;
  },

  getStaffSchedule: async (userId: string) => {
    const res = await apiClient.get<ApiResponse<any>>(`/coordinator/staff/${userId}/schedule`);
    return res.data;
  },

  // =========================================================================
  // 5. ROUTE CALCULATION & SUBMISSION
  // =========================================================================
  calculateRoute: async (payload: RouteCalculateRequest | any) => {
    const res = await apiClient.post<ApiResponse<RouteCalculateResponse>>("/coordinator/routes/calculate", payload);
    return res.data;
  },

  getRouteVersions: async (tripId: string) => {
    const res = await apiClient.get<ApiResponse<any[]>>(`/coordinator/trips/${tripId}/routes`);
    return res.data;
  },

  getRouteVersionDetail: async (routeVersionId: number) => {
    const res = await apiClient.get<ApiResponse<any>>(`/coordinator/routes/${routeVersionId}`);
    return res.data;
  },

  createRouteDraft: async (tripId: string, payload: any) => {
    const res = await apiClient.post<ApiResponse<any>>(`/coordinator/trips/${tripId}/routes`, payload);
    return res.data;
  },

  updateRouteDraft: async (routeVersionId: number, payload: any) => {
    const res = await apiClient.put<ApiResponse<any>>(`/coordinator/routes/${routeVersionId}`, payload);
    return res.data;
  },

  submitRouteVersion: async (routeVersionId: number, payload?: { note?: string }) => {
    const res = await apiClient.post<ApiResponse<any>>(`/coordinator/routes/${routeVersionId}/submit`, payload || {});
    return res.data;
  },

  submitRoute: async (tripId: string) => {
    const res = await apiClient.post<ApiResponse<any>>(`/coordinator/trips/${tripId}/submit-route`);
    return res.data;
  },

  // =========================================================================
  // 6. LEG ASSIGNMENTS (MULTI-LEG & 3 CREW MEMBERS)
  // =========================================================================
  getTripAssignments: async (tripId: string) => {
    const res = await apiClient.get<ApiResponse<TripAssignmentsDetail>>(`/coordinator/trips/${tripId}/assignments`);
    return res.data;
  },

  validateAssignments: async (tripId: string, payload: TripAssignmentsDetail | any) => {
    const res = await apiClient.post<ApiResponse<any>>(`/coordinator/trips/${tripId}/assignments/validate`, payload);
    return res.data;
  },

  saveTripAssignments: async (tripId: string, payload: TripAssignmentsDetail | any) => {
    const res = await apiClient.put<ApiResponse<any>>(`/coordinator/trips/${tripId}/assignments`, payload);
    return res.data;
  },

  assignCrewAndVehicle: async (
    tripId: string,
    payload: {
      vehicleId: string;
      driverId: string;
      escortId?: string;
      coDriverId?: string;
      veterinarianId?: string;
      legNumber?: number;
    }
  ) => {
    const res = await apiClient.post<ApiResponse<any>>(`/coordinator/trips/${tripId}/assignments`, payload);
    return res.data;
  },

  // =========================================================================
  // 7. FLIGHT BOOKING (AIR LEG)
  // =========================================================================
  getFlightBooking: async (tripId: string) => {
    const res = await apiClient.get<ApiResponse<FlightBooking>>(`/coordinator/trips/${tripId}/flight-booking`);
    return res.data;
  },

  saveFlightBooking: async (tripId: string, payload: Partial<FlightBooking>) => {
    const res = await apiClient.put<ApiResponse<FlightBooking>>(`/coordinator/trips/${tripId}/flight-booking`, payload);
    return res.data;
  },

  // =========================================================================
  // 8. OPERATIONS READINESS & DEPARTURE CONDITIONS
  // =========================================================================
  getOperationsReadiness: async (tripId: string) => {
    const res = await apiClient.get<ApiResponse<OperationsReadiness>>(`/coordinator/trips/${tripId}/operations-readiness`);
    return res.data;
  },

  confirmOperationsReadiness: async (tripId: string, payload?: { note?: string }) => {
    const res = await apiClient.post<ApiResponse<any>>(`/coordinator/trips/${tripId}/operations-readiness/confirm`, payload);
    return res.data;
  },

  confirmResources: async (tripId: string, payload?: { note?: string }) => {
    const res = await apiClient.post<ApiResponse<any>>(`/coordinator/trips/${tripId}/resources/confirm`, payload);
    return res.data;
  },

  getDepartureConditions: async (tripId: string) => {
    const res = await apiClient.get<ApiResponse<DepartureConditions>>(`/coordinator/trips/${tripId}/departure-conditions`);
    return res.data;
  },

  // =========================================================================
  // 9. TRIP MONITORING (MAP DATA STREAM & POLYLINE)
  // =========================================================================
  getTripMonitoring: async (tripId: string) => {
    const res = await apiClient.get<ApiResponse<TripMonitoringData>>(`/coordinator/trips/${tripId}/monitoring`);
    return res.data;
  }
};
