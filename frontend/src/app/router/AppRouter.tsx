import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// ==================== AUTH ====================
import LoginPage from "../../features/auth/pages/login/LoginPage";
import RegisterPage from "../../features/auth/pages/register/RegisterPage";
import VerifyOtpPage from "../../features/auth/pages/verify-otp/VerifyOtpPage";
import ForgotPasswordPage from "../../features/auth/pages/forgot-password/ForgotPasswordPage";
import ResetPasswordPage from "../../features/auth/pages/reset-password/ResetPasswordPage";

// ==================== CUSTOMER ====================
import {
  CustomerHomePage,
  CustomerRequestsPage,
  CreateRequestPage,
  RequestWizardPage,
  RequestDetailPage,
  DepositPage,
  ContractViewPage,
  ReviewSignPage,
  MyHorsesPage,
  HorseDetailPage,
  HorseFormPage,
  CustomerTrackingPage,
  CustomerHistoryPage,
} from "../../features/customer";

// ==================== CONTRACT & PAYMENT ====================
import SandboxPaymentPage from "../../features/payment/pages/SandboxPaymentPage";

// ==================== ROLE DASHBOARDS ====================
// ==================== ROLE DASHBOARDS ====================
import AdminDashboard from "../../features/admin/AdminDashboard";
import {
  JourneyPage as DriverDashboard,
  TripDetailPage as DriverTripDetailPage,
  IncidentsPage as DriverIncidentsPage,
  HistoryPage as DriverHistoryPage,
} from "../../features/driver";
import {
  ManagerDashboardPage,
  RequestsPage as ManagerRequestsPage,
  RequestDetailPage as ManagerRequestDetailPage,
  ContractsPage as ManagerContractsPage,
  ContractEditorPage,
  PaymentsPage as ManagerPaymentsPage,
  TripsPage as ManagerTripsPage,
  TripDetailPage as ManagerTripDetailPage,
  IncidentsPage as ManagerIncidentsPage,
  IncidentDetailPage,
  ComplaintDetailPage,
  ReportsPage as ManagerReportsPage,
} from "../../features/manager";
import {
  SpecialistDashboardPage,
  AssignedTripsPage,
  TripDetailPage as SpecialistTripDetailPage,
  DocumentReviewPage,
  RegulationsPage,
  AuditPage,
} from "../../features/specialist";
import {
  CoordinatorDashboardPage,
  TripDetailPage as CoordinatorTripDetailPage,
  FleetPage,
  VehicleDetailPage,
  CrewPage,
  FlightsPage,
  IncidentsPage as CoordinatorIncidentsPage,
  IncidentDetailPage as CoordinatorIncidentDetailPage,
  MonitorPage,
  PlacesPage,
  CoordinatorNotificationsPage,
  CoordinatorProfilePage,
} from "../../features/coordinator";
import { LandingPage } from "../../features/landing/LandingPage";
import { RequireAuth } from "../../features/auth/RequireAuth";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ==================== LANDING & PUBLIC ==================== */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />

        {/* ==================== AUTH ==================== */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ==================== ADMIN ==================== */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* ==================== DRIVER ==================== */}
        <Route path="/driver" element={<Navigate to="/driver/journey" replace />} />
        <Route path="/driver/dashboard" element={<Navigate to="/driver/journey" replace />} />
        <Route path="/driver/journey" element={<DriverDashboard />} />
        <Route path="/driver/journey/:tripId" element={<DriverDashboard />} />
        <Route path="/driver/trips" element={<DriverTripDetailPage />} />
        <Route path="/driver/trips/:tripId" element={<DriverTripDetailPage />} />
        <Route path="/driver/trips/:tripId/:tab" element={<DriverTripDetailPage />} />
        <Route path="/driver/trip-detail" element={<DriverTripDetailPage />} />
        <Route path="/driver/handover" element={<Navigate to="/driver/journey" replace />} />
        <Route path="/driver/incidents" element={<DriverIncidentsPage />} />
        <Route path="/driver/history" element={<DriverHistoryPage />} />
        <Route path="/driver/profile" element={<DriverDashboard />} />

        {/* ==================== MANAGER ==================== */}
        <Route path="/manager" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><Navigate to="/manager/dashboard" replace /></RequireAuth>} />
        <Route path="/manager/dashboard" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><ManagerDashboardPage /></RequireAuth>} />
        <Route path="/manager/profile" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><ManagerDashboardPage /></RequireAuth>} />
        <Route path="/manager/overview" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><Navigate to="/manager/dashboard" replace /></RequireAuth>} />
        <Route path="/manager/requests" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><ManagerRequestsPage /></RequireAuth>} />
        <Route path="/manager/requests/:requestId" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><ManagerRequestDetailPage /></RequireAuth>} />
        <Route path="/manager/requests/:requestId/:tab" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><ManagerRequestDetailPage /></RequireAuth>} />
        <Route path="/manager/contracts" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><ManagerContractsPage /></RequireAuth>} />
        <Route path="/manager/contracts/:requestId" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><ContractEditorPage /></RequireAuth>} />
        <Route path="/manager/contracts/:requestId/:version" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><ContractEditorPage /></RequireAuth>} />
        <Route path="/manager/payments" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><ManagerPaymentsPage /></RequireAuth>} />
        <Route path="/manager/payments/:tab" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><ManagerPaymentsPage /></RequireAuth>} />
        <Route path="/manager/trips" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><ManagerTripsPage /></RequireAuth>} />
        <Route path="/manager/trips/:tripId" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><ManagerTripDetailPage /></RequireAuth>} />
        <Route path="/manager/trips/:tripId/:stage" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><ManagerTripDetailPage /></RequireAuth>} />
        <Route path="/manager/incidents" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><ManagerIncidentsPage /></RequireAuth>} />
        <Route path="/manager/incidents/:incidentId" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><IncidentDetailPage /></RequireAuth>} />
        <Route path="/manager/complaints/:complaintId" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><ComplaintDetailPage /></RequireAuth>} />
        <Route path="/manager/reports" element={<RequireAuth allowedRoles={['LOGISTICS_MANAGER']}><ManagerReportsPage /></RequireAuth>} />

        {/* ==================== COORDINATOR ==================== */}
        <Route path="/coordinator" element={<Navigate to="/coordinator/dashboard" replace />} />
        <Route path="/coordinator/dashboard" element={<CoordinatorDashboardPage />} />
        <Route path="/coordinator/overview" element={<Navigate to="/coordinator/dashboard" replace />} />
        <Route path="/coordinator/trips" element={<Navigate to="/coordinator/monitor" replace />} />
        <Route path="/coordinator/trips/:tripId" element={<CoordinatorTripDetailPage />} />
        <Route path="/coordinator/trips/:tripId/:tab" element={<CoordinatorTripDetailPage />} />
        <Route path="/coordinator/fleet" element={<FleetPage />} />
        <Route path="/coordinator/fleet/:vehicleId" element={<VehicleDetailPage />} />
        <Route path="/coordinator/crew" element={<CrewPage />} />
        <Route path="/coordinator/flights" element={<FlightsPage />} />
        <Route path="/coordinator/incidents" element={<CoordinatorIncidentsPage />} />
        <Route path="/coordinator/incidents/:incidentId" element={<CoordinatorIncidentDetailPage />} />
        <Route path="/coordinator/monitor" element={<MonitorPage />} />
        <Route path="/coordinator/places" element={<PlacesPage />} />
        <Route path="/coordinator/notifications" element={<CoordinatorNotificationsPage />} />
        <Route path="/coordinator/profile" element={<CoordinatorProfilePage />} />

        {/* ==================== SPECIALIST ==================== */}
        <Route path="/specialist" element={<Navigate to="/specialist/dashboard" replace />} />
        <Route path="/specialist/dashboard" element={<SpecialistDashboardPage />} />
        <Route path="/specialist/profile" element={<SpecialistDashboardPage />} />
        <Route path="/specialist/trips" element={<AssignedTripsPage />} />
        <Route path="/specialist/trips/:tripId" element={<SpecialistTripDetailPage />} />
        <Route path="/specialist/trips/:tripId/:tab" element={<SpecialistTripDetailPage />} />
        <Route path="/specialist/documents/:docId" element={<DocumentReviewPage />} />
        <Route path="/specialist/regulations" element={<RegulationsPage />} />
        <Route path="/specialist/audit" element={<AuditPage />} />
        {/* Legacy redirects */}
        <Route path="/specialist/master" element={<Navigate to="/specialist/regulations" replace />} />
        <Route path="/specialist/queue" element={<Navigate to="/specialist/trips" replace />} />
        <Route path="/specialist/documents" element={<Navigate to="/specialist/trips" replace />} />
        <Route path="/specialist/requests" element={<Navigate to="/specialist/trips" replace />} />
        <Route path="/specialist/checkpoints" element={<Navigate to="/specialist/regulations" replace />} />
        <Route path="/specialist/packages" element={<Navigate to="/specialist/regulations" replace />} />

        {/* ==================== CUSTOMER ==================== */}
        <Route path="/customer" element={<RequireAuth allowedRoles={['CUSTOMER']}><Navigate to="/customer/home" replace /></RequireAuth>} />
        <Route path="/customer/home" element={<RequireAuth allowedRoles={['CUSTOMER']}><CustomerHomePage /></RequireAuth>} />
        <Route path="/customer/dashboard" element={<RequireAuth allowedRoles={['CUSTOMER']}><CustomerHomePage /></RequireAuth>} />
        <Route path="/customer/profile" element={<RequireAuth allowedRoles={['CUSTOMER']}><CustomerHomePage /></RequireAuth>} />

        {/* Requests & Wizard Flow */}
        <Route path="/customer/requests" element={<RequireAuth allowedRoles={['CUSTOMER']}><CustomerRequestsPage /></RequireAuth>} />
        <Route path="/customer/requests/new" element={<RequireAuth allowedRoles={['CUSTOMER']}><CreateRequestPage /></RequireAuth>} />
        <Route path="/customer/create-request" element={<RequireAuth allowedRoles={['CUSTOMER']}><CreateRequestPage /></RequireAuth>} />
        <Route path="/customer/requests/:requestId/edit" element={<RequireAuth allowedRoles={['CUSTOMER']}><CreateRequestPage /></RequireAuth>} />
        <Route path="/customer/requests/:requestId/wizard" element={<RequireAuth allowedRoles={['CUSTOMER']}><RequestWizardPage /></RequireAuth>} />
        <Route path="/customer/requests/:requestId/wizard/:step" element={<RequireAuth allowedRoles={['CUSTOMER']}><RequestWizardPage /></RequireAuth>} />
        <Route path="/customer/requests/:requestId/deposit" element={<RequireAuth allowedRoles={['CUSTOMER']}><DepositPage /></RequireAuth>} />
        <Route path="/customer/requests/:requestId/contract/v/:version" element={<RequireAuth allowedRoles={['CUSTOMER']}><ContractViewPage /></RequireAuth>} />
        <Route path="/customer/requests/:requestId/contract/view" element={<RequireAuth allowedRoles={['CUSTOMER']}><ContractViewPage /></RequireAuth>} />
        <Route path="/customer/requests/:requestId/sign" element={<RequireAuth allowedRoles={['CUSTOMER']}><ReviewSignPage /></RequireAuth>} />
        <Route path="/customer/requests/:requestId" element={<RequireAuth allowedRoles={['CUSTOMER']}><RequestDetailPage /></RequireAuth>} />
        <Route path="/customer/requests/:requestId/:tab" element={<RequireAuth allowedRoles={['CUSTOMER']}><RequestDetailPage /></RequireAuth>} />

        {/* Horses */}
        <Route path="/customer/horses" element={<RequireAuth allowedRoles={['CUSTOMER']}><MyHorsesPage /></RequireAuth>} />
        <Route path="/customer/horses/new" element={<RequireAuth allowedRoles={['CUSTOMER']}><HorseFormPage /></RequireAuth>} />
        <Route path="/customer/horses/:horseId" element={<RequireAuth allowedRoles={['CUSTOMER']}><HorseDetailPage /></RequireAuth>} />
        <Route path="/customer/horses/:horseId/edit" element={<RequireAuth allowedRoles={['CUSTOMER']}><HorseFormPage /></RequireAuth>} />
        <Route path="/customer/horses/:horseId/:tab" element={<RequireAuth allowedRoles={['CUSTOMER']}><HorseDetailPage /></RequireAuth>} />

        {/* Tracking & History */}
        <Route path="/customer/tracking" element={<RequireAuth allowedRoles={['CUSTOMER']}><CustomerTrackingPage /></RequireAuth>} />
        <Route path="/customer/tracking/:requestId" element={<RequireAuth allowedRoles={['CUSTOMER']}><CustomerTrackingPage /></RequireAuth>} />
        <Route path="/customer/history" element={<RequireAuth allowedRoles={['CUSTOMER']}><CustomerHistoryPage /></RequireAuth>} />

        {/* ==================== PAYMENT ==================== */}
        <Route path="/payment/sandbox" element={<SandboxPaymentPage />} />
        <Route path="/payment/return" element={<SandboxPaymentPage />} />
        <Route path="/customer/payments/return" element={<SandboxPaymentPage />} />
        <Route path="/customer/payments" element={<Navigate to="/customer/requests" replace />} />
        <Route path="/payment" element={<Navigate to="/customer/requests" replace />} />

        {/* ==================== NOT FOUND ==================== */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
