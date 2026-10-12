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
        navigate("/specialist/dashboard");
        break;

      case "FLEET_ROUTE_COORDINATOR":
        navigate("/coordinator/dashboard");
        break;

      case "DRIVER_ESCORT":
        navigate("/driver/dashboard");
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

        {/* DEMO - xoá khi Backend đã kết nối */}
        {/* DEMO ROLE - xoá khi Backend đã kết nối */}
        <div className="demo-role-section">
          <p className="demo-role-title">
            Demo theo vai trò
          </p>

          <div className="demo-role-grid">
            <button
              type="button"
              className="demo-role-button"
              onClick={() =>
                redirectByRole("CUSTOMER")
              }
            >
              Customer
            </button>

            <button
              type="button"
              className="demo-role-button"
              onClick={() =>
                redirectByRole("LOGISTICS_MANAGER")
              }
            >
              Logistics Manager
            </button>

            <button
              type="button"
              className="demo-role-button"
              onClick={() =>
                redirectByRole("TRANSPORT_SPECIALIST")
              }
            >
              Transport Specialist
            </button>

            <button
              type="button"
              className="demo-role-button"
              onClick={() =>
                redirectByRole("FLEET_ROUTE_COORDINATOR")
              }
            >
              Fleet & Route Coordinator
            </button>

            <button
              type="button"
              className="demo-role-button"
              onClick={() =>
                redirectByRole("DRIVER_ESCORT")
              }
            >
              Driver / Escort
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
      </div>
    </AuthLayout>
  );
}

export default LoginPage;