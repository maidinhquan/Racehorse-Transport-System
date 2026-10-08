import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./OtpSuccess.css";

export default function OtpSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="otp-success-page">
      <div className="otp-success-container">
        <div className="otp-success-image">
          <div className="brand">
            <div className="brand-icon">▣</div>
            <span>CNB Transport</span>
          </div>

          <div className="hero-overlay">
            <div className="hero-label">
              <span></span>
              AN TOÀN TRÊN MỌI HÀNH TRÌNH
            </div>

            <h1>
              Đồng hành cùng ngựa trên mọi
              <br />
              chặng đường
            </h1>

            <p>Quản lý hành trình vận chuyển an toàn và chuyên nghiệp.</p>

            <div className="hero-tag">
              Chuyên biệt • An toàn • Đúng giờ
            </div>
          </div>
        </div>

        <div className="otp-success-content">
          <div className="success-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path d="M5 12.5L9.5 17L19 7" />
            </svg>
          </div>

          <h2>Xác thực email thành công!</h2>

          <p className="success-description">
            Tài khoản của bạn đã được tạo.
            <br />
            Bạn sẽ được chuyển đến trang đăng nhập ngay bây giờ.
          </p>

          <div className="redirect-box">
            <div className="loading-circle"></div>

            <div>
              <strong>Đang chuyển đến trang đăng nhập...</strong>
              <span>Vui lòng chờ trong giây lát.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}