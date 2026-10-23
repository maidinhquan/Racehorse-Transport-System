import { useEffect, useState } from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import axios from "axios";

import { resetPassword } from "../../api/authApi";
import AuthLayout from "../../../../shared/layouts/AuthLayout/AuthLayout";

import "./ResetPasswordPage.css";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isDemo =
    searchParams.get("demo") === "true";

  const resetToken =
    searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] =
    useState("");

  const [
    confirmNewPassword,
    setConfirmNewPassword,
  ] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [isSuccess, setIsSuccess] =
    useState(false);

  const [redirectSeconds, setRedirectSeconds] =
    useState(5);

  useEffect(() => {
    if (!isSuccess) {
      return;
    }

    if (redirectSeconds <= 0) {
      navigate("/login");
      return;
    }

    const timer = window.setTimeout(() => {
      setRedirectSeconds(
        (current) => current - 1
      );
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    isSuccess,
    redirectSeconds,
    navigate,
  ]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setErrorMessage("");

    if (
      newPassword !== confirmNewPassword
    ) {
      setErrorMessage(
        "Mật khẩu xác nhận không khớp."
      );
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage(
        "Mật khẩu phải có ít nhất 8 ký tự."
      );
      return;
    }

    setIsLoading(true);

    try {
      if (isDemo) {
        await new Promise((resolve) =>
          setTimeout(resolve, 700)
        );

        setIsSuccess(true);
        setRedirectSeconds(5);
        return;
      }

      if (!resetToken) {
        setErrorMessage(
          "Liên kết đặt lại mật khẩu không hợp lệ."
        );
        return;
      }

      await resetPassword({
        resetToken,
        newPassword,
        confirmNewPassword,
      });

      setIsSuccess(true);
      setRedirectSeconds(5);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ??
            "Không thể đặt lại mật khẩu."
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

  if (isSuccess) {
    return (
      <AuthLayout>
        <div className="reset-success-wrapper">
          <div className="reset-success-icon">
            ✓
          </div>

          <h2>
            Đặt lại mật khẩu thành công!
          </h2>

          <p>
            Mật khẩu của bạn đã được cập nhật
            thành công.
          </p>

          <p className="reset-success-redirect">
            Bạn sẽ được chuyển đến trang đăng nhập
            trong{" "}
            <strong>
              {redirectSeconds}
            </strong>{" "}
            giây.
          </p>

          <button
            type="button"
            className="reset-success-button"
            onClick={() =>
              navigate("/login")
            }
          >
            Đăng nhập ngay
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="reset-password-form-wrapper">
        <div className="reset-password-title-line" />

        <h2>
          Đặt lại mật khẩu
        </h2>

        <p className="reset-password-description">
          Tạo mật khẩu mới cho tài khoản của bạn.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="reset-password-form-group">
            <label htmlFor="newPassword">
              Mật khẩu mới
            </label>

            <input
              id="newPassword"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(
                  event.target.value
                )
              }
              autoComplete="new-password"
              required
            />
          </div>

          <div className="reset-password-form-group">
            <label htmlFor="confirmNewPassword">
              Xác nhận mật khẩu
            </label>

            <input
              id="confirmNewPassword"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Nhập lại mật khẩu"
              value={confirmNewPassword}
              onChange={(event) =>
                setConfirmNewPassword(
                  event.target.value
                )
              }
              autoComplete="new-password"
              required
            />
          </div>

          <label className="reset-password-show">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) =>
                setShowPassword(
                  event.target.checked
                )
              }
            />

            <span>Hiện mật khẩu</span>
          </label>

          {errorMessage && (
            <p className="reset-password-error">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            className="reset-password-submit-button"
            disabled={isLoading}
          >
            {isLoading
              ? "Đang xử lý..."
              : "Đặt lại mật khẩu"}
          </button>
        </form>

        <button
          type="button"
          className="reset-password-back-button"
          onClick={() =>
            navigate("/login")
          }
        >
          ← Quay lại đăng nhập
        </button>
      </div>
    </AuthLayout>
  );
}

export default ResetPasswordPage;