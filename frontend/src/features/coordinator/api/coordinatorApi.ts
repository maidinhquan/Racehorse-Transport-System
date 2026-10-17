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
}

export interface Vehicle {
  vehicleId: string;
  type: string;
  capacityStalls: number;
  maxRangeKm?: number;
  fuelCostPerKm?: number;
  status: string;
  isAvailable: boolean;
}

export interface Staff {
  userId: string;
  fullName: string;
  role: string;
  email: string;
  phone: string;
  isActive: boolean;
  specialization: string;
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
  stallsSufficient: boolean;
  isReady: boolean;
  confirmedByCoordinator: boolean;
  missingConditions: string[];
}

export const coordinatorApi = {
  getDashboard: async () => {
    const res = await apiClient.get<ApiResponse<CoordinatorDashboardData>>("/coordinator/dashboard");
    return res.data;
  },

  getPlanningTrips: async () => {
    const res = await apiClient.get<ApiResponse<PlanningTrip[]>>("/coordinator/planning-trips");
    return res.data;
  },

  getTripDetail: async (tripId: string) => {
    const res = await apiClient.get<ApiResponse<any>>(`/coordinator/trips/${tripId}`);
    return res.data;
  },

  getVehicles: async (onlyAvailable: boolean = false) => {
    const res = await apiClient.get<ApiResponse<Vehicle[]>>(`/coordinator/vehicles?onlyAvailable=${onlyAvailable}`);
    return res.data;
  },

  getStaff: async () => {
    const res = await apiClient.get<ApiResponse<Staff[]>>("/coordinator/staff");
    return res.data;
  },

  calculateRoute: async (payload: any) => {
    const res = await apiClient.post<ApiResponse<any>>("/coordinator/routes/calculate", payload);
    return res.data;
  },

  assignCrewAndVehicle: async (tripId: string, payload: { vehicleId: string; driverId: string; escortId: string }) => {
    const res = await apiClient.post<ApiResponse<any>>(`/coordinator/trips/${tripId}/assignments`, payload);
    return res.data;
  },

  getTripMonitoring: async (tripId: string) => {
    const res = await apiClient.get<ApiResponse<TripMonitoringData>>(`/coordinator/trips/${tripId}/monitoring`);
    return res.data;
  },

  getOperationsReadiness: async (tripId: string) => {
    const res = await apiClient.get<ApiResponse<OperationsReadiness>>(`/coordinator/trips/${tripId}/operations-readiness`);
    return res.data;
  },

  confirmOperationsReadiness: async (tripId: string) => {
    const res = await apiClient.post<ApiResponse<any>>(`/coordinator/trips/${tripId}/operations-readiness/confirm`);
    return res.data;
  }
};

