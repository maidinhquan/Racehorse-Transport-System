import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

import { login, googleLogin } from "../../api/authApi";
import type { UserRole } from "../../types/auth.types";

import AuthLayout from "../../../../shared/layouts/AuthLayout/AuthLayout";

import "./LoginPage.css";

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const redirectByRole = (role: UserRole) => {
    switch (role) {
      case "CUSTOMER":
        navigate("/customer/home");
        break;

      case "LOGISTICS_MANAGER":
        navigate("/manager/dashboard");
        break;

      case "TRANSPORT_SPECIALIST":
        navigate("/specialist/documents");
        break;

      case "FLEET_ROUTE_COORDINATOR":
        navigate("/coordinator/dashboard");
        break;

      case "DRIVER_ESCORT":
        navigate("/driver/dashboard");
        break;
      case "ADMIN":
        navigate("/admin/dashboard");
        break;
      default:
        navigate("/");
        break;
    }
  };

  const saveLoginData = (
    accessToken: string,
    role: UserRole,
    fullName: string
  ) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("userRole", role);
    localStorage.setItem("userFullName", fullName);
  };

  const handleQuickLogin = async (
    demoEmail: string,
    demoPassword = "123456"
  ) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await login({
        email: demoEmail,
        password: demoPassword,
      });

      if (!response.data) {
        setErrorMessage(response.message);
        return;
      }

      saveLoginData(
        response.data.accessToken,
        response.data.role,
        response.data.fullName
      );

      redirectByRole(response.data.role);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ??
          "Đăng nhập thất bại."
        );
      } else {
        setErrorMessage(
          "Đã xảy ra lỗi khi đăng nhập."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await login({
        email,
        password,
      });

      if (!response.data) {
        setErrorMessage(response.message);
        return;
      }

      saveLoginData(
        response.data.accessToken,
        response.data.role,
        response.data.fullName
      );

      redirectByRole(response.data.role);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ??
          "Đăng nhập thất bại."
        );
      } else {
        setErrorMessage(
          "Đã xảy ra lỗi khi đăng nhập."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (
    credentialResponse: {
      credential?: string;
    }
  ) => {
    if (!credentialResponse.credential) {
      setErrorMessage(
        "Không nhận được thông tin xác thực từ Google."
      );
      return;
    }

    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await googleLogin({
        idToken: credentialResponse.credential,
      });

      if (!response.data) {
        setErrorMessage(response.message);
        return;
      }

      saveLoginData(
        response.data.accessToken,
        response.data.role,
        response.data.fullName
      );

      redirectByRole(response.data.role);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ??
          "Đăng nhập Google thất bại."
        );
      } else {
        setErrorMessage(
          "Đăng nhập Google thất bại."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErrorMessage(
      "Đăng nhập Google thất bại."
    );
  };

  return (
    <AuthLayout>
      <div className="login-form-wrapper">
        <div className="title-line" />

        <h2>Đăng nhập</h2>

        <p className="login-description">
          Tiếp tục quản lý hành trình vận chuyển của bạn.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              placeholder="Nhập email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Mật khẩu
            </label>

            <div className="password-input-wrapper">
              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                required
              />

              <button
                type="button"
                className="password-toggle-button"
                onClick={() =>
                  setShowPassword(
                    (current) => !current
                  )
                }
              >
                {showPassword
                  ? "Ẩn"
                  : "Hiện"}
              </button>
            </div>
          </div>

          <div className="login-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) =>
                  setRememberMe(
                    event.target.checked
                  )
                }
              />

              <span>Nhớ đăng nhập</span>
            </label>

            <button
              type="button"
              className="forgot-password"
              onClick={() =>
                navigate("/forgot-password")
              }
            >
              Quên mật khẩu?
            </button>
          </div>

          {errorMessage && (
            <p className="login-error-message">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading
              ? "Đang đăng nhập..."
              : "Đăng nhập"}
          </button>
        </form>

        <div className="divider">
          <span />
          <p>Hoặc</p>
          <span />
        </div>

        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          shape="rectangular"
          size="large"
          width="100%"
        />

        {/* DEMO ROLE SECTION - Đăng nhập nhanh tài khoản mẫu */}
        <div className="demo-role-section">
          <p className="demo-role-title">
            ⚡ Đăng nhập nhanh tài khoản mẫu (Mật khẩu: 123456)
          </p>

          <div className="demo-role-grid">
            <button
              type="button"
              className="demo-role-button"
              onClick={() =>
                handleQuickLogin("vana.horse@gmail.com")
              }
              title="Khách hàng: vana.horse@gmail.com"
            >
              🐴 Customer
            </button>

            <button
              type="button"
              className="demo-role-button"
              onClick={() =>
                handleQuickLogin("linh.manager@cbntransport.com")
              }
              title="Quản lý: linh.manager@cbntransport.com"
            >
              📋 Logistics Manager
            </button>

            <button
              type="button"
              className="demo-role-button"
              onClick={() =>
                handleQuickLogin("tuan.specialist@cbntransport.com")
              }
              title="Chuyên viên: tuan.specialist@cbntransport.com"
            >
              🩺 Specialist
            </button>

            <button
              type="button"
              className="demo-role-button"
              onClick={() =>
                handleQuickLogin("hai.coord@cbntransport.com")
              }
              title="Điều phối: hai.coord@cbntransport.com"
            >
              🗺️ Coordinator
            </button>

            <button
              type="button"
              className="demo-role-button"
              onClick={() =>
                handleQuickLogin("hung.driver@cbntransport.com")
              }
              title="Tài xế: hung.driver@cbntransport.com"
            >
              🚚 Driver / Escort
            </button>

            <button
              type="button"
              className="demo-role-button"
              onClick={() =>
                handleQuickLogin("admin@cbntransport.com")
              }
              title="Quản trị: admin@cbntransport.com"
            >
              👑 Admin Quản Trị
            </button>
          </div>
        </div>

        <p className="register-text">
          Chưa có tài khoản?{" "}

          <button
            type="button"
            onClick={() =>
              navigate("/register")
            }
          >
            Đăng ký ngay
          </button>
        </p>

        <p className="register-text" style={{ marginTop: "8px" }}>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              background: "none",
              border: "none",
              color: "#ea580c",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            ← Quay lại trang chủ CBN Transport
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}

export default LoginPage;