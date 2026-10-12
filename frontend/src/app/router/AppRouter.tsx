import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Import các trang của auth
import LoginPage from "../../features/auth/pages/login/LoginPage";
import RegisterPage from "../../features/auth/pages/register/RegisterPage";
import VerifyOtpPage from "../../features/auth/pages/verify-otp/VerifyOtpPage";
import ForgotPasswordPage from "../../features/auth/pages/forgot-password/ForgotPasswordPage";
import ResetPasswordPage from "../../features/auth/pages/reset-password/ResetPasswordPage";
import HomePage from "../../features/user-dashboard/page/home-page/HomePage";

// Import các trang khác của user-dashboard
import TransportRequestPage from "../../features/user-dashboard/page/transport-request-page/list/TransportRequestPage";
import MyHorsesPage from "../../features/user-dashboard/page/my-horses/MyHorsesPage";
import TripTrackingPage from "../../features/user-dashboard/page/trip-tracking/TripTrackingPage";
import HistoryPage from "../../features/user-dashboard/page/history/HistoryPage";
import CreateTransportRequestPage from "../../features/user-dashboard/page/transport-request-page/create-transport-request/CreateTransportRequestPage";
import TransportRequestDetailPage from "../../features/user-dashboard/page/transport-request-page/detail/TransportRequestDetailPage";
import ContractPage from "../../features/user-dashboard/page/transport-request-page/contract/ContractPage";
import PaymentPage from "../../features/user-dashboard/page/transport-request-page/payment/PaymentPage";
import PaymentSuccessPage from "../../features/user-dashboard/page/transport-request-page/payment/PaymentSuccessPage";
import PaymentCancelPage from "../../features/user-dashboard/page/transport-request-page/payment/PaymentCancelPage";
import TransportInformationPage from "../../features/user-dashboard/page/transport-request-page/transport-information/TransportInformationPage";
import TransportInformationSuccessPage from "../../features/user-dashboard/page/transport-request-page/transport-information/TransportInformationSuccessPage";
import CustomerProfilePage from "../../features/user-dashboard/page/profile/CustomerProfilePage";


// Import các trang khác của manager
import ManagerDashboard from "../../features/Manager/ManagerDashboard.tsx";


// Import các trang khác của driver
import DriverDashboard from "../../features/driver/DriverDashboard";


function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Màn hình driver */}
        <Route
          path="/driver/dashboard"
          element={<DriverDashboard />}
        />

        {/* Màn hình manager */}
        <Route
          path="/manager/dashboard"
          element={<ManagerDashboard />}
        />

        {/* Màn hình customer */}
        <Route
          path="/customer/profile"
          element={<CustomerProfilePage />}
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
        {/* Màn hình login */}
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
        <Route
          path="/customer/home"
          element={<HomePage />}
        />
        <Route
          path="/customer/requests"
          element={<TransportRequestPage />}
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
          path="/customer/requests/new"
          element={<CreateTransportRequestPage />}
        />
        <Route
          path="/customer/requests/:requestId"
          element={<TransportRequestDetailPage />}
        />
        <Route
          path="/customer/requests/:requestId/contract"
          element={<ContractPage />}
        />


      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;