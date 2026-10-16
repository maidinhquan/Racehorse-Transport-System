
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
import { RequestsPage as TransportRequestPage, RequestWizardPage as CreateTransportRequestPage,
  RequestDetailPage as TransportRequestDetailPage, RequestDetailPage as TransportInformationPage,
  RequestDetailPage as TransportInformationSuccessPage, HorsesPage as MyHorsesPage, PublicEstimatePage } from "../../features/flow1/CustomerPages";

import TripTrackingPage from "../../features/user-dashboard/page/trip-tracking/TripTrackingPage";
import HistoryPage from "../../features/user-dashboard/page/history/HistoryPage";
import CustomerProfilePage from "../../features/user-dashboard/page/profile/CustomerProfilePage";

// ==================== CONTRACT & PAYMENT ====================
import ContractPage from "../../features/user-dashboard/page/transport-request-page/contract/ContractPage";
import PaymentPage from "../../features/user-dashboard/page/transport-request-page/payment/PaymentPage";
import { CustomerVnpayReturnPage } from "../../features/flow1/CustomerVnpayReturnPage";
import { OperationsInbox } from "../../features/flow1/OperationsInbox";
import PaymentSuccessPage from "../../features/user-dashboard/page/transport-request-page/payment/PaymentSuccessPage";
import PaymentCancelPage from "../../features/user-dashboard/page/transport-request-page/payment/PaymentCancelPage";
import SandboxPaymentPage from "../../features/payment/pages/SandboxPaymentPage";

// ==================== ROLE DASHBOARDS ====================
import AdminDashboard from "../../features/admin/AdminDashboard";
import DriverDashboard from "../../features/driver/DriverDashboard";
import { ManagerRequestsPage, ManagerRequestPage } from "../../features/flow1/ManagerPages";
import { RequestEditPage } from "../../features/flow1/CustomerPages";
import SpecialistDashboard from "../../features/documents/SpecialistDashboard";

// Import các trang khác của specialist
import CoordinatorDashboard from "../../features/coordinator/CoordinatorDashboard";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/estimate" element={<PublicEstimatePage />} />
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
          element={<ManagerRequestsPage />}
        />
        <Route path="/manager/requests" element={<ManagerRequestsPage />} />
        <Route path="/manager/requests/:requestId" element={<ManagerRequestPage />} />
        <Route path="/coordinator/flow1-work" element={<OperationsInbox stream="ROUTING" />} />
        <Route path="/specialist/flow1-work" element={<OperationsInbox stream="DOCUMENTS" />} />
        <Route path="/customer/requests/:requestId/revision" element={<RequestEditPage mode="revision" />} />
        <Route path="/customer/requests/:requestId/change" element={<RequestEditPage mode="change-requests" />} />

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
        <Route path="/customer/payments/return" element={<CustomerVnpayReturnPage />} />

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
