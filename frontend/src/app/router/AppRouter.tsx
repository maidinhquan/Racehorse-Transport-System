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

// ==================== CUSTOMER (FOLDER: features/customer) ====================
import { CustomerHomePage } from "../../features/customer/pages/customer-home/CustomerHomePage";
import { CustomerRequestsPage } from "../../features/customer/pages/customer-requests/CustomerRequestsPage";
import { CustomerTrackingPage } from "../../features/customer/pages/tracking/CustomerTrackingPage";
import { CreateTransportRequestPage } from "../../features/customer/pages/customer-requests/create-request";
import { MyHorsesPage } from "../../features/customer/pages/my-horses/MyHorsesPage";
import { CustomerHistoryPage } from "../../features/customer/pages/history/CustomerHistoryPage";

// ==================== CONTRACT & PAYMENT ====================
import SandboxPaymentPage from "../../features/payment/pages/SandboxPaymentPage";

// ==================== ROLE DASHBOARDS ====================
import AdminDashboard from "../../features/admin/AdminDashboard";
import DriverDashboard from "../../features/driver/DriverDashboard";
import SpecialistDashboard from "../../features/specialist/SpecialistDashboard";
import { ManagerPortal } from "../../features/Manager/pages/dashboard/ManagerPortal";
import { SpecialistPortal } from "../../features/specialist/pages/dashboard/SpecialistPortal";
import { CoordinatorPortal } from "../../features/coordinator/pages/dashboard/CoordinatorPortal";
import CoordinatorDashboard from "../../features/coordinator/CoordinatorDashboard";
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
        <Route path="/coordinator/dashboard" element={<CoordinatorPortal initialNav="dashboard" />} />
        <Route path="/coordinator/overview" element={<CoordinatorDashboard />} />
        <Route path="/coordinator/trips" element={<CoordinatorPortal initialNav="trips" />} />
        <Route path="/coordinator/fleet" element={<CoordinatorPortal initialNav="fleet" />} />
        <Route path="/coordinator/crew" element={<CoordinatorPortal initialNav="crew" />} />
        <Route path="/coordinator/active" element={<CoordinatorPortal initialNav="active" />} />
        <Route path="/coordinator/incidents" element={<CoordinatorPortal initialNav="incidents" />} />

        {/* ==================== SPECIALIST ==================== */}
        <Route path="/specialist/dashboard" element={<SpecialistDashboard />} />
        <Route path="/specialist/documents" element={<SpecialistPortal initialNav="queue" />} />
        <Route path="/specialist/trips" element={<SpecialistPortal initialNav="trips" />} />
        <Route path="/specialist/queue" element={<SpecialistPortal initialNav="queue" />} />
        <Route path="/specialist/requests" element={<SpecialistPortal initialNav="requests" />} />
        <Route path="/specialist/checkpoints" element={<SpecialistPortal initialNav="checkpoints" />} />
        <Route path="/specialist/packages" element={<SpecialistPortal initialNav="packages" />} />
        <Route path="/specialist/master" element={<SpecialistPortal initialNav="master" />} />
        <Route path="/specialist/audit" element={<SpecialistPortal initialNav="audit" />} />

        {/* ==================== CUSTOMER (FOLDER: features/customer) ==================== */}
        <Route path="/customer" element={<Navigate to="/customer/home" replace />} />
        <Route path="/customer/home" element={<CustomerHomePage />} />
        <Route path="/customer/dashboard" element={<CustomerHomePage />} />
        <Route path="/customer/profile" element={<CustomerHomePage />} />
        <Route path="/customer/requests" element={<CustomerRequestsPage />} />
        <Route path="/customer/requests/new" element={<CreateTransportRequestPage />} />
        <Route path="/customer/create-request" element={<CreateTransportRequestPage />} />
        <Route path="/customer/requests/:requestId" element={<CustomerTrackingPage />} />
        <Route path="/customer/horses" element={<MyHorsesPage />} />
        <Route path="/customer/tracking" element={<CustomerTrackingPage />} />
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
