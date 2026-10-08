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
import SandboxPaymentPage from "../../features/payment/pages/SandboxPaymentPage";
function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/payment/sandbox" element={<SandboxPaymentPage />} />
        <Route path="/payment/return" element={<SandboxPaymentPage />} />
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
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
