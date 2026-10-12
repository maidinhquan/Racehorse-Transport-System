
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
import HomePage from "../../features/user-dashboard/page/home-page/HomePage";
import TransportRequestPage from "../../features/user-dashboard/page/transport-request-page/list/TransportRequestPage";
import CreateTransportRequestPage from "../../features/user-dashboard/page/transport-request-page/create-transport-request/CreateTransportRequestPage";
import TransportRequestDetailPage from "../../features/user-dashboard/page/transport-request-page/detail/TransportRequestDetailPage";
import TransportInformationPage from "../../features/user-dashboard/page/transport-request-page/transport-information/TransportInformationPage";
import TransportInformationSuccessPage from "../../features/user-dashboard/page/transport-request-page/transport-information/TransportInformationSuccessPage";

import MyHorsesPage from "../../features/user-dashboard/page/my-horses/MyHorsesPage";
import TripTrackingPage from "../../features/user-dashboard/page/trip-tracking/TripTrackingPage";
import HistoryPage from "../../features/user-dashboard/page/history/HistoryPage";
import CustomerProfilePage from "../../features/user-dashboard/page/profile/CustomerProfilePage";

// ==================== CONTRACT & PAYMENT ====================
import ContractPage from "../../features/user-dashboard/page/transport-request-page/contract/ContractPage";
import PaymentPage from "../../features/user-dashboard/page/transport-request-page/payment/PaymentPage";
import PaymentSuccessPage from "../../features/user-dashboard/page/transport-request-page/payment/PaymentSuccessPage";
import PaymentCancelPage from "../../features/user-dashboard/page/transport-request-page/payment/PaymentCancelPage";
import SandboxPaymentPage from "../../features/payment/pages/SandboxPaymentPage";

// ==================== ROLE DASHBOARDS ====================
import AdminDashboard from "../../features/admin/AdminDashboard";
import DriverDashboard from "../../features/driver/DriverDashboard";
import ManagerDashboard from "../../features/manager/ManagerDashboard";
import SpecialistDashboard from "../../features/documents/SpecialistDashboard";

// Import các trang khác của specialist
import CoordinatorDashboard from "../../features/coordinator/CoordinatorDashboard";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ==================== DEFAULT ==================== */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* ==================== AUTH ==================== */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ==================== ADMIN ==================== */}
        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />

        {/* ==================== DRIVER ==================== */}
        <Route
          path="/driver/dashboard"
          element={<DriverDashboard />}
        />

        {/* ==================== MANAGER ==================== */}
        <Route
          path="/manager/dashboard"
          element={<ManagerDashboard />}
        />

        {/* Màn hình coordinator */}
        <Route
          path="/coordinator/dashboard"
          element={<CoordinatorDashboard />}
        />

        {/* ==================== SPECIALIST ==================== */}
        <Route
          path="/specialist/documents"
          element={<SpecialistDashboard />}
        />

        {/* ==================== CUSTOMER ==================== */}
        <Route
          path="/customer/home"
          element={<HomePage />}
        />

        <Route
          path="/customer/profile"
          element={<CustomerProfilePage />}
        />

        <Route
          path="/customer/requests"
          element={<TransportRequestPage />}
        />

        <Route
          path="/customer/requests/new"
          element={<CreateTransportRequestPage />}
        />

        <Route
          path="/customer/requests/:requestId"
          element={<TransportRequestDetailPage />}
        />

        <Route
          path="/customer/requests/:requestId/information"
          element={<TransportInformationPage />}
        />

        <Route
          path="/customer/requests/:requestId/information/success"
          element={<TransportInformationSuccessPage />}
        />

        <Route
          path="/customer/requests/:requestId/contract"
          element={<ContractPage />}
        />

        <Route
          path="/customer/requests/:requestId/payment"
          element={<PaymentPage />}
        />

        <Route
          path="/customer/horses"
          element={<MyHorsesPage />}
        />

        <Route
          path="/customer/tracking"
          element={<TripTrackingPage />}
        />

        <Route
          path="/customer/history"
          element={<HistoryPage />}
        />

        {/* ==================== PAYMENT ==================== */}
        <Route
          path="/customer/payment/success"
          element={<PaymentSuccessPage />}
        />

        <Route
          path="/customer/payment/cancel"
          element={<PaymentCancelPage />}
        />

        <Route
          path="/payment/sandbox"
          element={<SandboxPaymentPage />}
        />

        <Route
          path="/payment/return"
          element={<SandboxPaymentPage />}
        />

        {/* ==================== NOT FOUND ==================== */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
