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
import AdminDashboard from "../../features/admin/AdminDashboard";
import DriverDashboard from "../../features/driver/DriverDashboard";
import { ManagerPortal } from "../../features/manager/pages/dashboard/ManagerPortal";
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
  TripManagementPage,
  TripDetailPage,
  FleetPage,
  CrewPage,
  FlightsPage,
  IncidentsPage,
} from "../../features/coordinator";
import { DriverPortal } from "../../features/driver/pages/trip-detail/DriverPortal";
import { HandoverPage } from "../../features/driver/pages/handover/HandoverPage";
import { LandingPage } from "../../features/landing/LandingPage";

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
        <Route path="/driver/dashboard" element={<DriverDashboard />} />
        <Route path="/driver/trip-detail" element={<DriverPortal />} />
        <Route path="/driver/handover" element={<HandoverPage />} />

        {/* ==================== MANAGER ==================== */}
        <Route path="/manager" element={<Navigate to="/manager/overview" replace />} />
        <Route path="/manager/dashboard" element={<ManagerPortal initialNav="overview" />} />
        <Route path="/manager/overview" element={<ManagerPortal initialNav="overview" />} />
        <Route path="/manager/requests" element={<ManagerPortal initialNav="requests" />} />
        <Route path="/manager/contracts" element={<ManagerPortal initialNav="contracts" />} />
        <Route path="/manager/payments" element={<ManagerPortal initialNav="payments" />} />

        {/* ==================== COORDINATOR ==================== */}
        <Route path="/coordinator" element={<Navigate to="/coordinator/dashboard" replace />} />
        <Route path="/coordinator/dashboard" element={<CoordinatorDashboardPage />} />
        <Route path="/coordinator/overview" element={<Navigate to="/coordinator/dashboard" replace />} />
        <Route path="/coordinator/trips" element={<TripManagementPage />} />
        <Route path="/coordinator/trips/:tripId" element={<TripDetailPage />} />
        <Route path="/coordinator/trips/:tripId/:tab" element={<TripDetailPage />} />
        <Route path="/coordinator/fleet" element={<FleetPage />} />
        <Route path="/coordinator/crew" element={<CrewPage />} />
        <Route path="/coordinator/flights" element={<FlightsPage />} />
        <Route path="/coordinator/incidents" element={<IncidentsPage />} />

        {/* ==================== SPECIALIST ==================== */}
        <Route path="/specialist" element={<Navigate to="/specialist/dashboard" replace />} />
        <Route path="/specialist/dashboard" element={<SpecialistDashboardPage />} />
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
        <Route path="/customer" element={<Navigate to="/customer/home" replace />} />
        <Route path="/customer/home" element={<CustomerHomePage />} />
        <Route path="/customer/dashboard" element={<CustomerHomePage />} />
        <Route path="/customer/profile" element={<CustomerHomePage />} />

        {/* Requests & Wizard Flow */}
        <Route path="/customer/requests" element={<CustomerRequestsPage />} />
        <Route path="/customer/requests/new" element={<CreateRequestPage />} />
        <Route path="/customer/create-request" element={<CreateRequestPage />} />
        <Route path="/customer/requests/:requestId/edit" element={<CreateRequestPage />} />
        <Route path="/customer/requests/:requestId/wizard" element={<RequestWizardPage />} />
        <Route path="/customer/requests/:requestId/wizard/:step" element={<RequestWizardPage />} />
        <Route path="/customer/requests/:requestId" element={<RequestDetailPage />} />
        <Route path="/customer/requests/:requestId/deposit" element={<DepositPage />} />
        <Route path="/customer/requests/:requestId/contract" element={<ContractViewPage />} />
        <Route path="/customer/requests/:requestId/contract/:version" element={<ContractViewPage />} />
        <Route path="/customer/requests/:requestId/sign" element={<ReviewSignPage />} />

        {/* Horses */}
        <Route path="/customer/horses" element={<MyHorsesPage />} />
        <Route path="/customer/horses/new" element={<HorseFormPage />} />
        <Route path="/customer/horses/:horseId" element={<HorseDetailPage />} />
        <Route path="/customer/horses/:horseId/edit" element={<HorseFormPage />} />
        <Route path="/customer/horses/:horseId/:tab" element={<HorseDetailPage />} />

        {/* Tracking & History */}
        <Route path="/customer/tracking" element={<CustomerTrackingPage />} />
        <Route path="/customer/tracking/:requestId" element={<CustomerTrackingPage />} />
        <Route path="/customer/history" element={<CustomerHistoryPage />} />

        {/* ==================== PAYMENT ==================== */}
        <Route path="/payment/sandbox" element={<SandboxPaymentPage />} />
        <Route path="/payment/return" element={<SandboxPaymentPage />} />

        {/* ==================== NOT FOUND ==================== */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
