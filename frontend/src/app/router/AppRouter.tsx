import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import LoginPage from "../../features/auth/pages/login/LoginPage";
import RegisterPage from "../../features/auth/pages/register/RegisterPage";
import VerifyOtpPage from "../../features/auth/pages/verify-otp/VerifyOtpPage";
import ForgotPasswordPage from "../../features/auth/pages/forgot-password/ForgotPasswordPage";
import ResetPasswordPage from "../../features/auth/pages/reset-password/ResetPasswordPage";
import HomePage from "../../features/user-dashboard/page/home-page/HomePage";
import TransportRequestPage from "../../features/user-dashboard/page/transport-request-page/TransportRequestPage";
import MyHorsesPage from "../../features/user-dashboard/page/my-horses/MyHorsesPage";
import TripTrackingPage from "../../features/user-dashboard/page/trip-tracking/TripTrackingPage";
function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
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

      </Routes>

    </BrowserRouter>
  );
}

export default AppRouter;