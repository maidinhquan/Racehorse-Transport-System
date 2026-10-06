import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

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

    console.log({
      username,
      password,
      rememberMe,
    });

    // Sau này Backend sẽ xử lý login thật.
  };

  const handleGoogleSuccess = (credentialResponse: {
    credential?: string;
  }) => {
    if (!credentialResponse.credential) {
      console.error("Không nhận được Google credential.");
      return;
    }

    console.log(
      "Google credential:",
      credentialResponse.credential
    );

    /*
      HIỆN TẠI FRONTEND DEMO:

      Google đã xác thực tài khoản và trả credential.

      Sau này Backend team sẽ nhận credential này:

      POST /api/auth/google-login

      {
        credential: credentialResponse.credential
      }

      Backend trả JWT thì FE mới lưu token.
    */

    alert("Đăng nhập Google thành công (Demo)");

    // Demo chuyển sang Dashboard.
    navigate("/dashboard"); //Chưa làm tới
  };

  const handleGoogleError = () => {
    console.error("Google login failed");

    alert("Đăng nhập Google thất bại.");
  };

  return (
    <div className="login-page auth-page">
      <div className="login-container">

        {/* LEFT */}

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
                Quản lý hành trình vận chuyển an toàn
                và chuyên nghiệp.
              </p>

              <div className="hero-badge">
                <span>✓</span>
                Chuyên biệt • An toàn • Đúng giờ
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT */}

        <section className="login-form-section">
          <div className="login-form-wrapper">

            <div className="title-line" />

            <h2>Đăng nhập</h2>

            <p className="login-description">
              Tiếp tục quản lý hành trình vận chuyển
              của bạn.
            </p>

            <form onSubmit={handleSubmit}>

              <div className="form-group">
                <label htmlFor="username">
                  Email hoặc tên đăng nhập
                </label>

                <input
                  id="username"
                  type="text"
                  placeholder="Nhập email hoặc tên đăng nhập"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
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
                      setPassword(event.target.value)
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
                      setRememberMe(
                        event.target.checked
                      )
                    }
                  />

                  <span>Nhớ mật khẩu</span>
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

            {/* GOOGLE LOGIN */}

            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              shape="rectangular"
              size="large"
              width="100%"
            />

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
        </section>
      </div>
    </div>
  );
}

export default LoginPage;