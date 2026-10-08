import type { ReactNode } from "react";

import authHorseImage from "../../../assets/images/login-horse.jpg";

import "./AuthLayout.css";

interface AuthLayoutProps {
  children: ReactNode;
}

function AuthLayout({ children }: AuthLayoutProps) {
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
          <div className="auth-brand">
            <div className="auth-brand-icon">♞</div>
            <span>CNB Transport</span>
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

      <section className="auth-form-section">
        {children}
      </section>
    </div>
  );
}

export default AuthLayout;