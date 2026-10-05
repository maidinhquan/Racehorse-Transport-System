import { useState } from "react";
import { useNavigate } from "react-router-dom";

import loginHorseImage from "../../../../assets/images/login-horse.jpg";
import "./LoginPage.css";

function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const loginData = {
      username,
      password,
      rememberMe,
    };

    console.log("Login data:", loginData);

    // Sau này gọi API login tại đây.
  };

  const handleGoogleLogin = () => {
    console.log("Google login");
  };

  return (
    <div className="login-page auth-page">
      <div className="login-container">
        <section
          className="login-hero"
          style={{
            backgroundImage: `url(${loginHorseImage})`,
          }}
        >
          <div className="hero-overlay" />

          <div className="hero-content">
            <div className="brand">
              <div className="brand-icon">♞</div>

              <span>CNB Transport</span>
            </div>

            <div className="hero-bottom">
              <div className="hero-label">
                <span className="hero-line" />

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

              <div className="hero-badge">
                <span>✓</span>

                Chuyên biệt • An toàn • Đúng giờ
              </div>
            </div>
          </div>
        </section>

        <section className="login-form-section">
          <div className="login-form-wrapper">
            <div className="title-line" />

            <h2>Đăng nhập</h2>

            <p className="login-description">
              Tiếp tục quản lý hành trình vận chuyển của bạn.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username">
                  Email hoặc tên đăng nhập
                </label>

                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Nhập email hoặc tên đăng nhập"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  autoComplete="username"
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
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle-button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
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
                    onChange={(event) =>
                      setRememberMe(event.target.checked)
                    }
                  />

                  <span>Nhớ mật khẩu</span>
                </label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={() => navigate("/forgot-password")}
                >
                  Quên mật khẩu?
                </button>
              </div>

              <button
                type="submit"
                className="login-button"
              >
                Đăng nhập
              </button>
            </form>

            <div className="divider">
              <span />
              <p>Hoặc</p>
              <span />
            </div>

            <button
              type="button"
              className="google-button"
              onClick={handleGoogleLogin}
            >
              <span className="google-logo">G</span>

              Tiếp tục với Google
            </button>

            <p className="register-text">
              Chưa có tài khoản?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
              >
                Đăng ký ngay
              </button>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;