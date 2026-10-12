import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// 1. Auth Pages
import LoginPage from "../../features/auth/pages/login/LoginPage";
import RegisterPage from "../../features/auth/pages/register/RegisterPage";
import VerifyOtpPage from "../../features/auth/pages/verify-otp/VerifyOtpPage";
import ForgotPasswordPage from "../../features/auth/pages/forgot-password/ForgotPasswordPage";
import ResetPasswordPage from "../../features/auth/pages/reset-password/ResetPasswordPage";

// 2. Staff & Admin Dashboards
import AdminDashboard from "../../features/admin/AdminDashboard";
import ManagerDashboard from "../../features/Manager/ManagerDashboard";
import DriverDashboard from "../../features/driver/DriverDashboard";
import SpecialistDashboard from "../../features/documents/SpecialistDashboard";

// 3. Customer Pages
import HomePage from "../../features/user-dashboard/page/home-page/HomePage";
import CustomerProfilePage from "../../features/user-dashboard/page/profile/CustomerProfilePage";
import MyHorsesPage from "../../features/user-dashboard/page/my-horses/MyHorsesPage";
import TripTrackingPage from "../../features/user-dashboard/page/trip-tracking/TripTrackingPage";
import HistoryPage from "../../features/user-dashboard/page/history/HistoryPage";
import TransportRequestPage from "../../features/user-dashboard/page/transport-request-page/list/TransportRequestPage";
import CreateTransportRequestPage from "../../features/user-dashboard/page/transport-request-page/create-transport-request/CreateTransportRequestPage";
import TransportRequestDetailPage from "../../features/user-dashboard/page/transport-request-page/detail/TransportRequestDetailPage";
import TransportInformationPage from "../../features/user-dashboard/page/transport-request-page/transport-information/TransportInformationPage";
import TransportInformationSuccessPage from "../../features/user-dashboard/page/transport-request-page/transport-information/TransportInformationSuccessPage";
import ContractPage from "../../features/user-dashboard/page/transport-request-page/contract/ContractPage";
import PaymentPage from "../../features/user-dashboard/page/transport-request-page/payment/PaymentPage";
import PaymentSuccessPage from "../../features/user-dashboard/page/transport-request-page/payment/PaymentSuccessPage";
import PaymentCancelPage from "../../features/user-dashboard/page/transport-request-page/payment/PaymentCancelPage";

// 4. Payment Sandbox
import SandboxPaymentPage from "../../features/payment/pages/SandboxPaymentPage";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ==================== MÀN HÌNH QUẢN TRỊ & NHÂN SỰ ==================== */}
        {/* Admin */}
        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />

        {/* Manager */}
        <Route
          path="/manager/dashboard"
          element={<ManagerDashboard />}
        />

        {/* Driver */}
        <Route
          path="/driver/dashboard"
          element={<DriverDashboard />}
        />

        {/* Specialist */}
        <Route
          path="/specialist/dashboard"
          element={<SpecialistDashboard />}
        />
        <Route
          path="/specialist/documents"
          element={<SpecialistDashboard />}
        />

        {/* Coordinator */}
        <Route
          path="/coordinator/dashboard"
          element={<ManagerDashboard />}
        />

        {/* ==================== MÀN HÌNH XÁC THỰC (AUTH) ==================== */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />
        <Route
          path="/login"
          element={<LoginPage />}
        />
        <Route
          path="/register"
          element={<RegisterPage />}
        />
        <Route
          path="/verify-otp"
          element={<VerifyOtpPage />}
        />
        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />
        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />

        {/* ==================== MÀN HÌNH KHÁCH HÀNG (CUSTOMER) ==================== */}
        <Route
          path="/customer/home"
          element={<HomePage />}
        />
        <Route
          path="/customer/profile"
          element={<CustomerProfilePage />}
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
          path="/customer/payment/success"
          element={<PaymentSuccessPage />}
        />
        <Route
          path="/customer/payment/cancel"
          element={<PaymentCancelPage />}
        />

        {/* ==================== CỔNG THANH TOÁN (PAYMENT) ==================== */}
        <Route
          path="/payment/sandbox"
          element={<SandboxPaymentPage />}
        />
        <Route
          path="/payment/return"
          element={<SandboxPaymentPage />}
        />

        {/* ==================== ROUTE MẶC ĐỊNH (CATCH-ALL) ==================== */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
