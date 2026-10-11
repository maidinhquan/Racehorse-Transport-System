import axios from "axios";

import { requestRegisterOtp } from "../../api/authApi";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AuthLayout from "../../../../shared/layouts/AuthLayout/AuthLayout";

import "./RegisterPage.css";

function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const handleSubmit = async (
  event: React.FormEvent<HTMLFormElement>
) => {
  event.preventDefault();

  setErrorMessage("");

  const normalizedEmail =
    email.trim().toLowerCase();

  if (password !== confirmPassword) {
    setErrorMessage(
      "Mật khẩu xác nhận không khớp."
    );
    return;
  }

  const demoEmail =
    import.meta.env.VITE_DEMO_EMAIL
      ?.trim()
      .toLowerCase();

  const isDemoAccount =
    import.meta.env.DEV &&
    normalizedEmail === demoEmail;

  /*
    =========================
    DEMO FLOW
    =========================
  */

  if (isDemoAccount) {
    navigate("/verify-otp", {
      state: {
        mode: "demo",
        email: normalizedEmail,
        fullName,
        phoneNumber,
      },
    });

    return;
  }

  /*
    =========================
    REAL BACKEND FLOW
    =========================
  */

  setIsLoading(true);

  try {
    const response =
      await requestRegisterOtp({
        fullName,
        email: normalizedEmail,
        phoneNumber,
        password,
      });

    if (!response.data) {
      setErrorMessage(
        "Không nhận được thông tin đăng ký từ hệ thống."
      );
      return;
    }

    navigate("/verify-otp", {
      state: {
        mode: "real",
        email: normalizedEmail,

        registrationToken:
          response.data.registrationToken,

        expiresIn:
          response.data.expiresIn,
      },
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      setErrorMessage(
        error.response?.data?.message ??
          "Không thể gửi mã OTP."
      );
    } else {
      setErrorMessage(
        "Đã xảy ra lỗi. Vui lòng thử lại."
      );
    }
  } finally {
    setIsLoading(false);
  }
};

  return (
    <AuthLayout>
      <div className="register-form-wrapper">

        {/* STEP INDICATOR */}
        <div className="register-steps">

          <div className="register-step active">
            <span className="register-step-number">
              1
            </span>

            <span>Thông tin tài khoản</span>
          </div>

          <div className="register-step">
            <span className="register-step-number">
              2
            </span>

            <span>Xác minh OTP</span>
          </div>

        </div>

        <div className="register-title-line" />

        <h2>Đăng ký</h2>

        <p className="register-description">
          Tạo tài khoản để bắt đầu quản lý vận chuyển.
        </p>

        <form onSubmit={handleSubmit}>

          {/* FULL NAME */}
          <div className="register-form-group">
            <label htmlFor="fullName">
              Họ và tên
            </label>

            <input
              id="fullName"
              type="text"
              placeholder="Nhập họ và tên"
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
              autoComplete="name"
              required
            />
          </div>

          {/* EMAIL */}
          <div className="register-form-group">
            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              placeholder="Nhập địa chỉ email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
              required
            />
          </div>

          {/* PHONE */}
          <div className="register-form-group">
            <label htmlFor="phoneNumber">
              Số điện thoại
            </label>

            <input
              id="phoneNumber"
              type="tel"
              placeholder="Nhập số điện thoại"
              value={phoneNumber}
              onChange={(event) =>
                setPhoneNumber(
                  event.target.value
                )
              }
              autoComplete="tel"
              required
            />
          </div>

          {/* PASSWORD */}
          <div className="register-form-group">
            <label htmlFor="password">
              Mật khẩu
            </label>

            <div className="register-password-wrapper">
              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Tạo mật khẩu"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                autoComplete="new-password"
                required
              />

              <button
                type="button"
                className="register-password-toggle"
                onClick={() =>
                  setShowPassword(
                    (current) => !current
                  )
                }
                aria-label={
                  showPassword
                    ? "Ẩn mật khẩu"
                    : "Hiện mật khẩu"
                }
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="register-form-group">
            <label htmlFor="confirmPassword">
              Xác nhận mật khẩu
            </label>

            <div className="register-password-wrapper">
              <input
                id="confirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                autoComplete="new-password"
                required
              />

              <button
                type="button"
                className="register-password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    (current) => !current
                  )
                }
                aria-label={
                  showConfirmPassword
                    ? "Ẩn mật khẩu"
                    : "Hiện mật khẩu"
                }
              >
                {showConfirmPassword
                  ? "Ẩn"
                  : "Hiện"}
              </button>
            </div>
          </div>

          {errorMessage && (
            <p className="register-error-message">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            className="register-submit-button"
            disabled={isLoading}
          >
            {isLoading
              ? "Đang gửi mã..."
              : "Gửi mã OTP"}
          </button>

        </form>

        <p className="register-login-text">
          Đã có tài khoản?{" "}

          <button
            type="button"
            onClick={() =>
              navigate("/login")
            }
          >
            Đăng nhập
          </button>
        </p>

      </div>
    </AuthLayout>
  );
}

export default RegisterPage;