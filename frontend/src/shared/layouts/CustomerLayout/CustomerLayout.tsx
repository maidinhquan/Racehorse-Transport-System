import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import "./CustomerLayout.css";
import { useState } from "react";
interface CustomerLayoutProps {
  pageTitle: string;
  children: ReactNode;
}

function CustomerLayout({
  pageTitle,
  children,
}: CustomerLayoutProps) {
  const navigate = useNavigate();
  const [isAccountOpen, setIsAccountOpen] =
    useState(false);
  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <div className="customer-layout">
      {/* Sidebar */}
      <aside className="customer-sidebar">
        <div
          className="customer-brand"
          onClick={() => navigate("/customer/home")}
        >
          CBN Transport
        </div>

        <nav className="customer-nav">
          <NavLink
            to="/customer/home"
            className={({ isActive }) =>
              `customer-nav-item ${isActive ? "active" : ""}`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
            </svg>
            <span>Trang chủ</span>
          </NavLink>

          <NavLink
            to="/customer/requests"
            className={({ isActive }) =>
              `customer-nav-item ${isActive ? "active" : ""}`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
              <path d="M14 3v5h5" />
              <path d="M9 13h6" />
              <path d="M9 17h6" />
            </svg>
            <span>Yêu cầu vận chuyển</span>
          </NavLink>

          <NavLink
            to="/customer/horses"
            className={({ isActive }) =>
              `customer-nav-item ${isActive ? "active" : ""}`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
            <span>Ngựa của tôi</span>
          </NavLink>

          <NavLink
            to="/customer/history"
            className={({ isActive }) =>
              `customer-nav-item ${isActive ? "active" : ""}`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span>Lịch sử</span>
          </NavLink>

          <NavLink
            to="/japan-route"
            className={({ isActive }) =>
              `customer-nav-item ${isActive ? "active" : ""}`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>

            <span>Hồ sơ Nhật Bản (AQS)</span>
          </NavLink>
        </nav>
      </aside>

      {/* Main area */}
      <div className="customer-main">
        {/* Topbar */}
        <header className="customer-topbar">
          <h1>{pageTitle}</h1>

          <div className="customer-user-area">
            {/* Language Switcher */}
            <div className="customer-lang-toggle">
              <button
                type="button"
                className="lang-btn active"
                title="Tiếng Việt"
              >
                VI
              </button>
              <button
                type="button"
                className="lang-btn"
                title="English"
              >
                EN
              </button>
            </div>

            {/* Notification */}
            <button
              type="button"
              className="customer-notification-button"
              aria-label="Notifications"
            >
              <span className="customer-notification-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="customer-notif-badge">7</span>
              </span>
            </button>

            {/* Account dropdown */}
            <div className="customer-account-wrapper">
              <button
                type="button"
                className={`customer-account ${isAccountOpen ? "open" : ""}`}
                onClick={() =>
                  setIsAccountOpen(
                    (current) => !current
                  )
                }
              >
                <div className="customer-avatar">
                  AE
                </div>

                <span className="customer-account-name">
                  Alex Equine
                </span>

                <svg
                  className="customer-account-chevron"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {isAccountOpen && (
                <div className="customer-account-dropdown">
                  <button
                    type="button"
                    className="customer-dropdown-item"
                    onClick={() => {
                      setIsAccountOpen(false);

                      navigate(
                        "/customer/profile"
                      );
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle
                        cx="12"
                        cy="8"
                        r="4"
                      />

                      <path d="M4 21a8 8 0 0 1 16 0" />
                    </svg>

                    <span>
                      Personal Information
                    </span>
                  </button>

                  <div className="customer-dropdown-divider" />

                  <button
                    type="button"
                    className="customer-dropdown-item customer-dropdown-logout"
                    onClick={handleLogout}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />

                      <path d="m16 17 5-5-5-5" />

                      <path d="M21 12H9" />
                    </svg>

                    <span>
                      Logout
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="customer-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default CustomerLayout;