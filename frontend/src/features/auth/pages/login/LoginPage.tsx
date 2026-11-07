import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

import {
  login,
  googleLogin,
  getQuickLoginAccounts,
  type QuickLoginAccount,
} from "../../api/authApi";
import type { UserRole } from "../../types/auth.types";
import { QUICK_LOGIN_ACCOUNTS } from "../../quickLoginAccounts";
import { resetCustomerState } from "../../../customer/hooks/useCustomer";

import AuthLayout from "../../../../shared/layouts/AuthLayout/AuthLayout";

import "./LoginPage.css";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Modal danh sách tài khoản từ DB theo vai trò
  const [accountModalRole, setAccountModalRole] = useState<UserRole | null>(
    null
  );
  const [modalAccounts, setModalAccounts] = useState<QuickLoginAccount[]>([]);
  const [isLoadingModalAccounts, setIsLoadingModalAccounts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAccountModalRole(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const redirectByRole = (role: UserRole) => {
    const fromPath = (location.state as any)?.from?.pathname;
    const hasQuote = Boolean(sessionStorage.getItem("preliminaryQuote"));

    switch (role) {
      case "CUSTOMER":
        navigate(
          fromPath || (hasQuote ? "/customer/create-request" : "/customer/home")
        );
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
    fullName: string,
    email?: string
  ) => {
    sessionStorage.setItem("accessToken", accessToken);
    sessionStorage.setItem("userRole", role);
    sessionStorage.setItem("userFullName", fullName);
    if (email) {
      sessionStorage.setItem("userEmail", email);
    }
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("userRole", role);
    localStorage.setItem("userFullName", fullName);
    if (email) {
      localStorage.setItem("userEmail", email);
    }
    resetCustomerState();
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
        response.data.fullName,
        response.data.email || demoEmail
      );

      redirectByRole(response.data.role);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ?? "Đăng nhập thất bại."
        );
      } else {
        setErrorMessage("Đã xảy ra lỗi khi đăng nhập.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleModalTitle = (role: UserRole | null): string => {
    switch (role) {
      case "CUSTOMER":
        return "Danh sách Khách hàng trong Database";
      case "TRANSPORT_SPECIALIST":
        return "Danh sách Chuyên viên thẩm định trong Database";
      case "FLEET_ROUTE_COORDINATOR":
        return "Danh sách Điều phối viên trong Database";
      case "LOGISTICS_MANAGER":
        return "Danh sách Quản lý vận tải trong Database";
      case "DRIVER_ESCORT":
        return "Danh sách Đội ngũ Tài xế & Áp tải trong Database";
      case "ADMIN":
        return "Danh sách Quản trị viên trong Database";
      default:
        return "Danh sách tài khoản trong Database";
    }
  };

  const handleOpenAccountModal = async (role: UserRole) => {
    setAccountModalRole(role);
    setIsLoadingModalAccounts(true);

    try {
      const res = await getQuickLoginAccounts(role);
      if (res.data && res.data.length > 0) {
        setModalAccounts(res.data);
      } else {
        const fallback = QUICK_LOGIN_ACCOUNTS.filter(
          (a) => a.role === role
        ).map((a) => ({
          id: a.id,
          role: a.role,
          label: a.label,
          email: a.email,
          password: a.password,
        }));
        setModalAccounts(fallback);
      }
    } catch {
      const fallback = QUICK_LOGIN_ACCOUNTS.filter(
        (a) => a.role === role
      ).map((a) => ({
        id: a.id,
        role: a.role,
        label: a.label,
        email: a.email,
        password: a.password,
      }));
      setModalAccounts(fallback);
    } finally {
      setIsLoadingModalAccounts(false);
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
        response.data.fullName,
        response.data.email || email
      );

      redirectByRole(response.data.role);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ?? "Đăng nhập thất bại."
        );
      } else {
        setErrorMessage("Đã xảy ra lỗi khi đăng nhập.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: {
    credential?: string;
  }) => {
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
        response.data.fullName,
        response.data.email
      );

      redirectByRole(response.data.role);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ?? "Đăng nhập Google thất bại."
        );
      } else {
        setErrorMessage("Đăng nhập Google thất bại.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErrorMessage("Đăng nhập Google thất bại.");
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
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              placeholder="Nhập email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>

            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button
                type="button"
                className="password-toggle-button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </div>

          <div className="login-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />

              <span>Nhớ đăng nhập</span>
            </label>

            <button
              type="button"
              className="forgot-password"
              onClick={() => navigate("/forgot-password")}
            >
              Quên mật khẩu?
            </button>
          </div>

          {errorMessage && (
            <p className="login-error-message">{errorMessage}</p>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
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

        {/* DEMO ROLE SECTION - Đăng nhập nhanh tài khoản theo vai trò */}
        <div className="demo-role-section">
          <div className="demo-role-header">
            <span className="demo-role-title">Đăng nhập nhanh theo vai trò</span>
            <span className="demo-role-subtitle">Tải dữ liệu tài khoản từ hệ thống</span>
          </div>

          <div className="demo-role-grid">
            <button
              type="button"
              className="demo-role-card"
              disabled={isLoading}
              onClick={() => handleOpenAccountModal("CUSTOMER")}
              title="Tải danh sách các tài khoản Khách hàng từ cơ sở dữ liệu"
            >
              <div className="demo-role-card-content">
                <span className="demo-role-name">Khách hàng</span>
                <span className="demo-role-desc">Chủ ngựa & Hợp đồng</span>
              </div>
              <span className="demo-role-arrow">→</span>
            </button>

            <button
              type="button"
              className="demo-role-card"
              disabled={isLoading}
              onClick={() =>
                handleQuickLogin(
                  "linh.manager@cbntransport.com",
                  "HASH_SECURE_04"
                )
              }
              title="Đăng nhập Quản lý vận tải: linh.manager@cbntransport.com (Linh Pham)"
            >
              <div className="demo-role-card-content">
                <span className="demo-role-name">Quản lý vận tải</span>
                <span className="demo-role-desc">Phê duyệt & Điều hành</span>
              </div>
              <span className="demo-role-arrow">→</span>
            </button>

            <button
              type="button"
              className="demo-role-card"
              disabled={isLoading}
              onClick={() => handleOpenAccountModal("TRANSPORT_SPECIALIST")}
              title="Tải danh sách Chuyên viên thẩm định (Kiểm thử Chuyên viên A / Chuyên viên B)"
            >
              <div className="demo-role-card-content">
                <span className="demo-role-name">Chuyên viên</span>
                <span className="demo-role-desc">Hồ sơ pháp lý & Thú y</span>
              </div>
              <span className="demo-role-arrow">→</span>
            </button>

            <button
              type="button"
              className="demo-role-card"
              disabled={isLoading}
              onClick={() => handleOpenAccountModal("FLEET_ROUTE_COORDINATOR")}
              title="Tải danh sách Điều phối viên (Kiểm thử Điều phối A / Điều phối B)"
            >
              <div className="demo-role-card-content">
                <span className="demo-role-name">Điều phối viên</span>
                <span className="demo-role-desc">Lộ trình & Xe/chuyến bay</span>
              </div>
              <span className="demo-role-arrow">→</span>
            </button>

            <button
              type="button"
              className="demo-role-card"
              disabled={isLoading}
              onClick={() => handleOpenAccountModal("DRIVER_ESCORT")}
              title="Tải danh sách Tài xế và Bác sĩ thú y áp tải từ cơ sở dữ liệu"
            >
              <div className="demo-role-card-content">
                <span className="demo-role-name">Tài xế & Áp tải</span>
                <span className="demo-role-desc">Tổ lái xe & Bác sĩ</span>
              </div>
              <span className="demo-role-arrow">→</span>
            </button>

            <button
              type="button"
              className="demo-role-card"
              disabled={isLoading}
              onClick={() =>
                handleQuickLogin(
                  "admin@cbntransport.com",
                  "HASH_SECURE_24"
                )
              }
              title="Đăng nhập Quản trị viên hệ thống: admin@cbntransport.com"
            >
              <div className="demo-role-card-content">
                <span className="demo-role-name">Quản trị viên</span>
                <span className="demo-role-desc">Cấu hình & Hệ thống</span>
              </div>
              <span className="demo-role-arrow">→</span>
            </button>
          </div>
        </div>

        {/* MODAL DANH SÁCH TÀI KHOẢN TỪ DATABASE */}
        {accountModalRole && (
          <div
            className="quick-accounts-modal-backdrop"
            onClick={() => setAccountModalRole(null)}
          >
            <div
              className="quick-accounts-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="quick-accounts-header">
                <div>
                  <h3>{getRoleModalTitle(accountModalRole)}</h3>
                  <p>
                    Bấm vào tài khoản để đăng nhập tự động vào hệ thống
                  </p>
                </div>
                <button
                  type="button"
                  className="quick-accounts-close-btn"
                  onClick={() => setAccountModalRole(null)}
                  title="Đóng (Esc)"
                >
                  ✕
                </button>
              </div>

              <div className="quick-accounts-body">
                {isLoadingModalAccounts ? (
                  <div className="quick-accounts-loading">
                    Đang tải danh sách tài khoản từ cơ sở dữ liệu...
                  </div>
                ) : modalAccounts.length === 0 ? (
                  <div className="quick-accounts-empty">
                    Không tìm thấy tài khoản nào trong cơ sở dữ liệu.
                  </div>
                ) : (
                  <div className="quick-accounts-list">
                    {modalAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        className="quick-account-item"
                        disabled={isLoading}
                        onClick={() => {
                          setAccountModalRole(null);
                          handleQuickLogin(
                            acc.email,
                            acc.password || "Password123!"
                          );
                        }}
                      >
                        <div className="quick-account-info">
                          <span className="quick-account-name">
                            {acc.label}
                          </span>
                          <span className="quick-account-meta">
                            {acc.email} • ID: {acc.id}
                            {acc.phone ? ` • SĐT: ${acc.phone}` : ""}
                          </span>
                        </div>
                        <span className="quick-account-arrow">→</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="register-text">
          Chưa có tài khoản?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
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
