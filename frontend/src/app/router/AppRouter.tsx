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
import CustomerLayout from "../../shared/layouts/CustomerLayout/CustomerLayout";
import { DatabaseRequests as HomePage } from "../../features/flow1/relational/DatabaseRequests";
import { DatabaseHorses as MyHorsesPage } from "../../features/flow1/relational/DatabaseHorses";
import HistoryPage from "../../features/customer/pages/history/HistoryPage";
import CustomerProfilePage from "../../features/customer/pages/profile/CustomerProfilePage";

// ==================== CONTRACT & PAYMENT ====================
import PaymentSuccessPage from "../../features/customer/pages/payment/PaymentSuccessPage";
import PaymentCancelPage from "../../features/customer/pages/payment/PaymentCancelPage";
import SandboxPaymentPage from "../../features/payment/pages/SandboxPaymentPage";

// ==================== ROLE DASHBOARDS ====================
import AdminDashboard from "../../features/admin/AdminDashboard";
import DriverDashboard from "../../features/driver/DriverDashboard";
import SpecialistDashboard from "../../features/specialist/SpecialistDashboard";

// Import các trang update mới
import { DatabaseCreateRequest as CustomerCreateRequestPage } from "../../features/flow1/relational/DatabaseCreateRequest";
import { DatabaseRequests as CustomerRequestsListPage, DatabaseRequests as CustomerRequestDetailPage, ManagerDatabasePortal as ManagerPortal } from "../../features/flow1/relational/DatabaseRequests";


import { SpecialistPortal } from "../../features/specialist/pages/dashboard/SpecialistPortal";
import { PlanningWorkspace, CoordinatorDatabasePortal as CoordinatorPortal } from "../../features/coordinator/pages/planning/PlanningWorkspace";
import CoordinatorDashboard from "../../features/coordinator/CoordinatorDashboard";
import { DriverPortal } from "../../features/driver/pages/trip-detail/DriverPortal";
import { HandoverPage } from "../../features/driver/pages/handover/HandoverPage";
import { LandingPage } from "../../features/landing/LandingPage";
import { JapanRouteModule } from "../../features/documents/japan-route/JapanRouteModule";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ==================== LANDING & AUTH ==================== */}
        <Route path="/" element={<Navigate to="/landing" replace />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ==================== ADMIN ==================== */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* ==================== DRIVER ==================== */}
        <Route path="/driver/dashboard" element={<DriverDashboard />} />
        <Route path="/driver/trip-detail" element={<DriverPortal />} />
        <Route path="/driver/handover" element={<HandoverPage />} />

        {/* ==================== MANAGER ==================== */}
        <Route path="/manager" element={<Navigate to="/manager/overview" replace />} />
        <Route path="/manager/dashboard" element={<ManagerPortal initialNav="overview" />} />
        <Route path="/manager/overview" element={<ManagerPortal initialNav="overview" />} />
        <Route path="/manager/planning" element={<PlanningWorkspace role="manager" />} />
        <Route path="/specialist/planning" element={<PlanningWorkspace role="specialist" />} />
        <Route path="/manager/requests" element={<ManagerPortal initialNav="requests" />} />
        <Route path="/manager/contracts" element={<ManagerPortal initialNav="contracts" />} />
        <Route path="/manager/payments" element={<ManagerPortal initialNav="payments" />} />

        {/* ==================== COORDINATOR ==================== */}
        <Route path="/coordinator" element={<Navigate to="/coordinator/dashboard" replace />} />
        <Route path="/coordinator/dashboard" element={<CoordinatorPortal initialNav="dashboard" />} />
        <Route path="/coordinator/legacy-dashboard" element={<CoordinatorDashboard />} />
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

        {/* ==================== CUSTOMER ==================== */}
        <Route path="/customer/home" element={<HomePage />} />
        <Route path="/customer/profile" element={<CustomerProfilePage />} />
        <Route path="/customer/requests" element={<CustomerRequestsListPage />} />
        <Route path="/customer/requests/new" element={<CustomerCreateRequestPage />} />
        <Route path="/customer/create-request" element={<CustomerCreateRequestPage />} />
        <Route path="/customer/requests/:requestId" element={<CustomerRequestDetailPage />} />
        <Route path="/customer/horses" element={<MyHorsesPage />} />
        <Route path="/customer/tracking" element={<Navigate to="/customer/requests" replace />} />
        <Route path="/customer/history" element={<HistoryPage />} />

        {/* ==================== PAYMENT ==================== */}
        <Route path="/customer/payment/success" element={<PaymentSuccessPage />} />
        <Route path="/customer/payment/cancel" element={<PaymentCancelPage />} />
        <Route path="/customer/payments/return" element={<PaymentSuccessPage />} />
        <Route path="/payment/sandbox" element={<SandboxPaymentPage />} />
        <Route path="/payment/return" element={<SandboxPaymentPage />} />

        {/* ==================== JAPAN ROUTE MODULE ==================== */}
        <Route
          path="/japan-route"
          element={
            <CustomerLayout pageTitle="Hồ sơ Kiểm dịch Tuyến Nhật Bản (AQS MAFF)">
              <JapanRouteModule hideRoleSwitcher={true} initialRole="customer" />
            </CustomerLayout>
          }
        />

        {/* ==================== NOT FOUND ==================== */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
