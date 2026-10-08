import { useState } from "react";
import { useNavigate } from "react-router-dom";

import authHorseImage from "../../../../assets/images/login-horse.jpg";
import "./ResetPasswordPage.css";

function ResetPasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      alert("Mật khẩu xác nhận không khớp.");
      return;
    }

    console.log("New password:", password);

    // Sau này gọi API reset password.

    navigate("/login");
  };

  return (
    <div className="reset-password-page auth-page">
      <div className="reset-password-container">

        <section
          className="reset-password-hero"
          style={{
            backgroundImage: `url(${authHorseImage})`,
          }}
        >
          <div className="reset-password-overlay" />

          <div className="reset-password-hero-content">

            <div className="reset-password-brand">
              <div className="reset-password-brand-icon">
                ♞
              </div>

              <span>CNB Transport</span>
            </div>

            <div className="reset-password-hero-bottom">

              <div className="reset-password-hero-label">
                <span className="reset-password-hero-line" />

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

              <div className="reset-password-hero-badge">
                <span>✓</span>
                Chuyên biệt • An toàn • Đúng giờ
              </div>

            </div>

          </div>
        </section>

        <section className="reset-password-form-section">

          <div className="reset-password-form-wrapper">

            <div className="reset-password-title-line" />

            <h2>Đặt lại mật khẩu</h2>

            <p className="reset-password-description">
              Tạo mật khẩu mới cho tài khoản của bạn.
            </p>

            <form onSubmit={handleSubmit}>

              <div className="reset-password-form-group">

                <label htmlFor="newPassword">
                  Mật khẩu mới
                </label>

                <div className="reset-password-input-wrapper">

                  <input
                    id="newPassword"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Nhập mật khẩu mới"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    required
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                  >
                    {showPassword ? "Ẩn" : "Hiện"}
                  </button>

                </div>

              </div>

              <div className="reset-password-form-group">

                <label htmlFor="confirmPassword">
                  Xác nhận mật khẩu
                </label>

                <div className="reset-password-input-wrapper">

                  <input
                    id="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value
                      )
                    }
                    required
                  />

                  <button
                    type="button"
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
                className="reset-password-submit-button"
              >
                Đặt lại mật khẩu
              </button>

            </form>

            <button
              type="button"
              className="reset-password-back-button"
              onClick={() => navigate("/login")}
            >
              ← Quay lại đăng nhập
            </button>

          </div>

        </section>

      </div>
    </div>
  );
}

export default ResetPasswordPage;