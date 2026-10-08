import { useState } from "react";
import { useNavigate } from "react-router-dom";

import authHorseImage from "../../../../assets/images/login-horse.jpg";
import "./ForgotPasswordPage.css";

function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    console.log("Forgot password email:", email);

    // Sau này gọi API:
    // await forgotPasswordApi(email);

    // Tạm thời chuyển sang reset password
    navigate("/reset-password", {
      state: {
        email,
      },
    });
  };

  return (
    <div className="forgot-password-page auth-page">
      <div className="forgot-password-container">

        {/* LEFT SIDE */}

        <section
          className="forgot-password-hero"
          style={{
            backgroundImage: `url(${authHorseImage})`,
          }}
        >
          <div className="forgot-password-overlay" />

          <div className="forgot-password-hero-content">
            <div className="forgot-password-brand">
              <div className="forgot-password-brand-icon">
                ♞
              </div>

              <span>CNB Transport</span>
            </div>

            <div className="forgot-password-hero-bottom">
              <div className="forgot-password-hero-label">
                <span className="forgot-password-hero-line" />

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

              <div className="forgot-password-hero-badge">
                <span>✓</span>
                Chuyên biệt • An toàn • Đúng giờ
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT SIDE */}

        <section className="forgot-password-form-section">
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

              <button
                // type="submit" note lại để thực hiện demo thử, về sau khi bấm là nó sẽ gửi qua mail
                className="forgot-password-submit-button"
                 type="button"
                onClick={() => navigate("/reset-password")}
              >
                Gửi liên kết đặt lại
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
        </section>

      </div>
    </div>
  );
}

export default ForgotPasswordPage;