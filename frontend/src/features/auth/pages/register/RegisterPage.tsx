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
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);

  const [showPassword, setShowPassword] = useState(false);
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
    <div className="register-page auth-page">
      <div className="register-container">
        <section
          className="register-hero"
          style={{
            backgroundImage: `url(${registerHeroImage})`,
          }}
        >
          <div className="register-overlay" />

          <div className="register-hero-content">
            <div className="register-brand">
              <div className="register-brand-icon">
                ♞
              </div>

              <span>CNB Transport</span>
            </div>

            <div className="register-hero-bottom">
              <div className="register-hero-label">
                <span className="register-hero-line" />

                AN TOÀN TRÊN MỌI HÀNH TRÌNH
              </div>

              <h1>
                Đồng hành cùng ngựa trên mọi
                <br />
                chặng đường
              </h1>

              <p>
                Quản lý hành trình vận chuyển an toàn và chuyên nghiệp.
              </p>

              <div className="register-hero-badge">
                <span>✓</span>

                Chuyên biệt • An toàn • Đúng giờ
              </div>
            </div>
          </div>
        </section>

        <section className="register-form-section">
          <div className="register-form-wrapper">
            <div className="register-steps">
              <div className="register-step register-step-active">
                <span>1</span>
                Thông tin tài khoản
              </div>

              <div className="register-step">
                <span>2</span>
                Xác minh OTP
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

              <div className="register-form-group">
                <label htmlFor="phone">
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

              <div className="register-form-group">
                <label htmlFor="registerPassword">
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
                    className="register-eye-button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                  >
                    {showPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>

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
                    className="register-eye-button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (current) => !current
                      )
                    }
                  >
                    {showConfirmPassword
                      ? "Ẩn"
                      : "Hiện"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="register-submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang gửi mã…" : "Gửi mã xác nhận"}
              </button>
            </form>

            <p className="register-login-link">
              Đã có tài khoản?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
              >
                Đăng nhập
              </button>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default RegisterPage;
