import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { registrationErrorMessage, requestRegistrationOtp } from "../../api/registrationApi";
import { saveRegistrationSession } from "../../api/registrationSession";

import registerHeroImage from "../../../../assets/images/login-horse.jpg";
import "./RegisterPage.css";

function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setError("");

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const data = await requestRegistrationOtp({ fullName, email, phoneNumber: phone, password });
      const session = {
        email: email.trim().toLowerCase(), registrationToken: data.registrationToken,
        otpExpiresAt: Date.now() + data.expiresIn * 1000,
        resendAvailableAt: Date.now() + data.resendAfterSeconds * 1000,
      };
      saveRegistrationSession(session);
      setPassword("");
      setConfirmPassword("");
      navigate("/verify-otp", { state: session });
    } catch (error) {
      setError(registrationErrorMessage(error));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
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
          {error && <p role="alert">{error}</p>}
          <div className="register-form-group">
            <label htmlFor="fullName">
              Họ và tên
            </label>

            <input
              id="fullName"
              maxLength={100}
              type="text"
              placeholder="Nhập họ và tên"
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
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
              maxLength={100}
              type="email"
              placeholder="Nhập địa chỉ email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </div>

          {/* PHONE */}
          <div className="register-form-group">
            <label htmlFor="phoneNumber">
              Số điện thoại
            </label>

            <input
              id="phone"
              maxLength={40}
              type="tel"
              placeholder="Nhập số điện thoại"
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
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
                id="registerPassword"
                minLength={6}
                autoComplete="new-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Tạo mật khẩu"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
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
                autoComplete="new-password"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
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
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang gửi mã…" : "Gửi mã xác nhận"}
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
