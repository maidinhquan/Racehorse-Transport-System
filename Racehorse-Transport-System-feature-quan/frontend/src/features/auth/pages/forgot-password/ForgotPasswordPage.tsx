import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { forgotPassword } from "../../api/authApi";
import AuthLayout from "../../../../shared/layouts/AuthLayout/AuthLayout";

import "./ForgotPasswordPage.css";

function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    /*
      DEMO MODE

      Chỉ hoạt động khi:
      VITE_ENABLE_AUTH_DEMO=true

      Không gọi Backend.
    */
    const isDemoEnabled =
      import.meta.env.VITE_ENABLE_AUTH_DEMO === "true";

    const demoEmail =
      import.meta.env.VITE_DEMO_EMAIL?.toLowerCase();

    if (
      isDemoEnabled &&
      demoEmail &&
      normalizedEmail === demoEmail
    ) {
      navigate("/reset-password?demo=true", {
        state: {
          email: normalizedEmail,
        },
      });

      return;
    }

    /*
      REAL API
    */
    setIsLoading(true);

    try {
      const response = await forgotPassword({
        email: normalizedEmail,
      });

      setSuccessMessage(response.message);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ??
            "Không thể gửi yêu cầu đặt lại mật khẩu."
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
      <div className="forgot-password-form-wrapper">
        <div className="forgot-password-title-line" />

        <h2>Quên mật khẩu?</h2>

        <p className="forgot-password-description">
          Nhập email để nhận liên kết đặt lại mật khẩu.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="forgot-password-form-group">
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

          {errorMessage && (
            <p className="forgot-password-error">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="forgot-password-success">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            className="forgot-password-submit-button"
            disabled={isLoading}
          >
            {isLoading
              ? "Đang gửi..."
              : "Gửi liên kết đặt lại"}
          </button>
        </form>

        <button
          type="button"
          className="forgot-password-back-button"
          onClick={() => navigate("/login")}
        >
          ← Quay lại đăng nhập
        </button>
      </div>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;