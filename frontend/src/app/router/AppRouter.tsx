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



import CustomerProfilePage from "../../features/user-dashboard/page/profile/CustomerProfilePage";

// ==================== CONTRACT & PAYMENT ====================
import SandboxPaymentPage from "../../features/payment/pages/SandboxPaymentPage";

// ==================== ROLE DASHBOARDS ====================
import AdminDashboard from "../../features/admin/AdminDashboard";
import DriverDashboard from "../../features/driver/DriverDashboard";


// Import các trang update mới
import { CreateRequestWizard } from "../../features/customer/pages/create-request/CreateRequestWizard";
import { ManagerPortal } from "../../features/Manager/pages/dashboard/ManagerPortal";
import { SpecialistPortal } from "../../features/specialist/pages/dashboard/SpecialistPortal";
import { CoordinatorPortal } from "../../features/coordinator/pages/dashboard/CoordinatorPortal";
import CoordinatorDashboard from "../../features/coordinator/CoordinatorDashboard";
import { DriverPortal } from "../../features/driver/pages/trip-detail/DriverPortal";
import { HandoverPage } from "../../features/driver/pages/handover/HandoverPage";
import { LandingPage } from "../../features/landing/LandingPage";

import { HorsesPage, RequestDetailPage, RequestWizardPage, CustomerVnpayReturnPage } from "../../features/flow1/relational/Pages";
import { CustomerFlowHome, CustomerRequests, OperationsFlowHome } from "../../features/flow1/relational/PortalPages";
import { PublicEstimatePage } from "../../features/flow1/PublicEstimatePage";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ==================== LANDING & PUBLIC ==================== */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/estimate" element={<PublicEstimatePage />} />
        <Route path="/manager/requests/:requestId" element={<ManagerPortal detail />} />
        <Route path="/customer/requests/:requestId/revision" element={<RequestWizardPage revision />} />
        <Route path="/customer/payments/return" element={<CustomerVnpayReturnPage />} />
        <Route path="/coordinator/flow1-work" element={<OperationsFlowHome stream="ROUTING" />} />
        <Route path="/specialist/flow1-work" element={<OperationsFlowHome stream="DOCUMENTS" />} />
        <Route path="/coordinator/flow1" element={<OperationsFlowHome stream="ROUTING" />} />
        <Route path="/specialist/flow1" element={<OperationsFlowHome stream="DOCUMENTS" />} />

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

        {/* Màn hình coordinator: CoordinatorPortal làm mặc định */}
        <Route path="/coordinator/dashboard" element={<OperationsFlowHome stream="ROUTING" />} />
        <Route path="/coordinator/overview" element={<CoordinatorDashboard />} />
        <Route path="/coordinator/trips" element={<CoordinatorPortal initialNav="trips" />} />
        <Route path="/coordinator/fleet" element={<CoordinatorPortal initialNav="fleet" />} />
        <Route path="/coordinator/crew" element={<CoordinatorPortal initialNav="crew" />} />
        <Route path="/coordinator/active" element={<CoordinatorPortal initialNav="active" />} />
        <Route path="/coordinator/incidents" element={<CoordinatorPortal initialNav="incidents" />} />

        {/* ==================== SPECIALIST ==================== */}
        <Route path="/specialist/dashboard" element={<OperationsFlowHome stream="DOCUMENTS" />} />
        <Route path="/specialist/documents" element={<SpecialistPortal initialNav="queue" />} />
        <Route path="/specialist/trips" element={<SpecialistPortal initialNav="trips" />} />
        <Route path="/specialist/queue" element={<SpecialistPortal initialNav="queue" />} />
        <Route path="/specialist/requests" element={<SpecialistPortal initialNav="requests" />} />
        <Route path="/specialist/checkpoints" element={<SpecialistPortal initialNav="checkpoints" />} />
        <Route path="/specialist/packages" element={<SpecialistPortal initialNav="packages" />} />
        <Route path="/specialist/master" element={<SpecialistPortal initialNav="master" />} />
        <Route path="/specialist/audit" element={<SpecialistPortal initialNav="audit" />} />

        {/* ==================== CUSTOMER ==================== */}
        <Route path="/customer/home" element={<CustomerFlowHome />} />
        <Route path="/customer/profile" element={<CustomerProfilePage />} />
        <Route path="/customer/requests" element={<CustomerRequests />} />
        <Route path="/customer/requests/new" element={<CreateRequestWizard />} />
        <Route path="/customer/requests/:requestId" element={<RequestDetailPage />} />
        <Route path="/customer/requests/:requestId/information" element={<RequestDetailPage />} />
        <Route path="/customer/requests/:requestId/information/success" element={<RequestDetailPage />} />
        <Route path="/customer/requests/:requestId/contract" element={<RequestDetailPage />} />
        <Route path="/customer/requests/:requestId/payment" element={<RequestDetailPage />} />
        <Route path="/customer/horses" element={<HorsesPage />} />
        <Route path="/customer/tracking" element={<Navigate to="/customer/home" replace />} />
        <Route path="/customer/history" element={<CustomerRequests />} />
        <Route path="/customer/create-request" element={<CreateRequestWizard />} />

        {/* ==================== PAYMENT ==================== */}
        <Route path="/customer/payment/success" element={<CustomerVnpayReturnPage />} />
        <Route path="/customer/payment/cancel" element={<CustomerVnpayReturnPage />} />
        <Route path="/payment/sandbox" element={<SandboxPaymentPage />} />
        <Route path="/payment/return" element={<SandboxPaymentPage />} />

        {/* ==================== NOT FOUND ==================== */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
