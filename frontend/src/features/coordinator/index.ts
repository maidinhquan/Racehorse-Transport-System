// Public API của feature Coordinator (Điều phối đội xe & tuyến) – giao diện theo bản HTML demo "CBN Transport"
export { CoordinatorLayout } from './components/layout/CoordinatorLayout';
export { NotificationsPage as CoordinatorNotificationsPage } from './pages/account/NotificationsPage';
export { ProfilePage as CoordinatorProfilePage } from './pages/account/ProfilePage';
export { CrewPage } from './pages/crew/CrewPage';
export { CoordinatorDashboardPage } from './pages/dashboard/CoordinatorDashboardPage';
export { FleetPage } from './pages/fleet/FleetPage';
export { VehicleDetailPage } from './pages/fleet/VehicleDetailPage';
export { FlightsPage } from './pages/flights/FlightsPage';
export { IncidentDetailPage } from './pages/incidents/IncidentDetailPage';
export { IncidentsPage } from './pages/incidents/IncidentsPage';
export { MonitorPage } from './pages/monitor/MonitorPage';
export { PlacesPage } from './pages/places/PlacesPage';
export { TripDetailPage } from './pages/trip-detail/TripDetailPage';

// Flow 3 — Planning, Routing & Departure Approval (từ nhánh feature/api-flow2-flow3)
export * from './api/flow3Api';
export * from './api/flow3Endpoints';
export * from './api/flow3Client';
export type * from './types/flow3.types';
