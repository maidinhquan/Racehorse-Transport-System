import { useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import authHorseImage from "../../../assets/images/login-horse.png";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import { useTheme } from "../../context/ThemeContext";

import "./AuthLayout.css";

interface AuthLayoutProps {
  children: ReactNode;
}

function AuthLayout({ children }: AuthLayoutProps) {
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  useEffect(() => {
    // Luôn để trang đăng nhập/auth mặc định là nền sáng (light mode)
    setTheme("light");
  }, [setTheme]);

  return (
    <div className="auth-layout">
      <section
        className="auth-hero"
        style={{
          backgroundImage: `url(${authHorseImage})`,
        }}
      >
        <div className="auth-hero-overlay" />

        <div className="auth-hero-content">
          <div
            className="auth-brand"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/")}
            title="Về trang chủ CBN Transport"
          >
            <div className="auth-brand-icon">♞</div>
            <span>CBN Transport</span>
          </div>

          <div className="auth-hero-bottom">
            <div className="auth-hero-label">
              <span className="auth-hero-line" />
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

            <div className="auth-hero-badge">
              <span>✓</span>
              Chuyên biệt • An toàn • Đúng giờ
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-section" style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: "24px", right: "32px", zIndex: 10 }}>
          <ThemeToggle />
        </div>
        {children}
      </section>
    </div>
  );
}

export default AuthLayout;