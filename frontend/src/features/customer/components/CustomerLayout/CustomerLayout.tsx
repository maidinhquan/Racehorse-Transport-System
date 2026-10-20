import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCustomer } from '../../hooks/useCustomer';
import { TrackingModal } from '../Modals/TrackingModal';
import { IncidentModal } from '../Modals/IncidentModal';
import './CustomerLayout.css';

export type CustomerNavKey = 'home' | 'requests' | 'horses' | 'tracking' | 'history';

interface CustomerLayoutProps {
  pageTitle: string;
  activeNav?: CustomerNavKey;
  children: React.ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({
  pageTitle,
  activeNav,
  children
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentTrip,
    notifications,
    incidentDetail,
    handleResolveIncident,
    markNotificationAsRead
  } = useCustomer();

  const [lang, setLang] = useState<'VI' | 'EN'>('VI');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);

  // Automatically detect current nav if not provided
  const getCurrentNav = (): CustomerNavKey => {
    if (activeNav) return activeNav;
    const path = location.pathname;
    if (path.includes('/customer/requests')) return 'requests';
    if (path.includes('/customer/horses')) return 'horses';
    if (path.includes('/customer/history')) return 'history';
    return 'home';
  };

  const currentNavKey = getCurrentNav();

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="customer-shared-layout">
      {/* ==================== LEFT SIDEBAR ==================== */}
      <aside className="customer-shared-sidebar">
        <div className="customer-sidebar-brand" onClick={() => navigate('/customer/home')}>
          CBN Transport
        </div>

        <nav className="customer-sidebar-nav">
          <button
            className={`customer-sidebar-nav-item ${currentNavKey === 'home' ? 'active' : ''}`}
            onClick={() => navigate('/customer/home')}
          >
            <svg className="customer-sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
            </svg>
            <span>Trang chủ</span>
          </button>

          <button
            className={`customer-sidebar-nav-item ${currentNavKey === 'requests' ? 'active' : ''}`}
            onClick={() => navigate('/customer/requests')}
          >
            <svg className="customer-sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
              <path d="M14 3v5h5" />
              <path d="M9 13h6" />
              <path d="M9 17h6" />
            </svg>
            <span>Yêu cầu vận chuyển</span>
          </button>

          <button
            className={`customer-sidebar-nav-item ${currentNavKey === 'horses' ? 'active' : ''}`}
            onClick={() => navigate('/customer/horses')}
          >
            <svg className="customer-sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
            <span>Ngựa của tôi</span>
          </button>

          <button
            className={`customer-sidebar-nav-item ${currentNavKey === 'tracking' ? 'active' : ''}`}
            onClick={() => navigate('/customer/tracking')}
          >
            <svg className="customer-sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>Theo dõi chuyến đi</span>
          </button>

          <button
            className={`customer-sidebar-nav-item ${currentNavKey === 'history' ? 'active' : ''}`}
            onClick={() => navigate('/customer/history')}
          >
            <svg className="customer-sidebar-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span>Lịch sử</span>
          </button>
        </nav>
      </aside>

      {/* ==================== MAIN COLUMN ==================== */}
      <div className="customer-shared-main">
        {/* Topbar */}
        <header className="customer-shared-topbar">
          <h1 className="customer-topbar-title">{pageTitle}</h1>

          <div className="customer-topbar-controls">
            {/* Language toggle capsule */}
            <div className="customer-lang-capsule">
              <button
                type="button"
                className={`customer-lang-btn ${lang === 'VI' ? 'active' : ''}`}
                onClick={() => setLang('VI')}
              >
                VI
              </button>
              <button
                type="button"
                className={`customer-lang-btn ${lang === 'EN' ? 'active' : ''}`}
                onClick={() => setLang('EN')}
              >
                EN
              </button>
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              className="customer-notif-btn"
              aria-label="Thông báo"
              onClick={() => {
                const unread = notifications.find((n) => !n.read);
                if (unread) markNotificationAsRead(unread.id);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="customer-notif-badge">9+</span>
            </button>

            {/* User Profile */}
            <div className="customer-user-menu">
              <button
                type="button"
                className="customer-user-btn"
                onClick={() => setShowProfileMenu((prev) => !prev)}
              >
                <div className="customer-user-avatar">AE</div>
                <span className="customer-user-name">Alex Equine</span>
                <svg className="customer-user-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {showProfileMenu && (
                <div className="customer-profile-dropdown">
                  <button
                    className="customer-dropdown-btn"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/customer/profile');
                    }}
                  >
                    <span>Thông tin cá nhân</span>
                  </button>
                  <button
                    className="customer-dropdown-btn logout"
                    onClick={handleLogout}
                  >
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ==================== CONTENT BODY ==================== */}
        <main className="customer-shared-content">
          {children}
        </main>
      </div>

      {/* Global Modals */}
      <TrackingModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        trip={currentTrip}
      />

      <IncidentModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        incident={incidentDetail}
        onResolve={handleResolveIncident}
      />
    </div>
  );
};

export default CustomerLayout;
