import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { ManagerNav } from './types';
import { useManager } from './hooks/useManager';
import { ManagerOverviewPage } from './pages/overview/ManagerOverviewPage';
import { ManagerRequestsPage } from './pages/requests/ManagerRequestsPage';
import { ManagerContractsPage } from './pages/contracts/ManagerContractsPage';
import { ManagerPaymentsPage } from './pages/payments/ManagerPaymentsPage';
import { ManagerTripsPage } from './pages/trips/ManagerTripsPage';
import { ManagerReportsPage } from './pages/reports/ManagerReportsPage';
import './ManagerPortal.css';

interface ManagerPortalProps {
  initialNav?: ManagerNav;
}

export const ManagerPortal: React.FC<ManagerPortalProps> = ({ initialNav = 'overview' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine activeNav from prop or route pathname
  const getNavFromPath = (): ManagerNav => {
    const path = location.pathname;
    if (path.includes('/manager/requests')) return 'requests';
    if (path.includes('/manager/contracts')) return 'contracts';
    if (path.includes('/manager/payments')) return 'payments';
    if (path.includes('/manager/trips')) return 'trips';
    if (path.includes('/manager/reports')) return 'reports';
    if (path.includes('/manager/overview') || path.includes('/manager/dashboard')) {
      return 'overview';
    }
    return initialNav;
  };

  const [activeNav, setActiveNav] = useState<ManagerNav>(getNavFromPath);
  const [selectedTargetId, setSelectedTargetId] = useState<string | undefined>(undefined);
  const [lang, setLang] = useState<'VI' | 'EN'>('VI');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Use custom hook for manager data & actions
  const {
    metrics,
    requests,
    contracts,
    transactions,
    overdueList,
    alerts,
    notifications,
    activeTrips,
    handleAcceptRequest,
    handleRequestRevision,
    handleRejectRequest,
    handleSaveContract,
    handleSendContract,
    handleConfirmTransaction,
    handleRejectTransaction,
    handleExtendDeadline,
    handleCancelOverdue,
  } = useManager();

  // Synchronize route with nav state
  useEffect(() => {
    const navFromUrl = getNavFromPath();
    if (navFromUrl !== activeNav) {
      setActiveNav(navFromUrl);
    }
  }, [location.pathname]);

  const handleNavigate = (nav: ManagerNav, targetId?: string) => {
    setActiveNav(nav);
    setSelectedTargetId(targetId);
    navigate(`/manager/${nav}`);
  };

  // Nav titles map
  const getPageTitle = () => {
    switch (activeNav) {
      case 'overview':
        return 'Tổng quan';
      case 'requests':
        return 'Yêu cầu vận chuyển';
      case 'contracts':
        return 'Hợp đồng & chi phí';
      case 'payments':
        return 'Đặt cọc & thanh toán';
      case 'trips':
        return 'Chuyến đi';
      case 'reports':
        return 'Chi phí & báo cáo';
      default:
        return 'Tổng quan';
    }
  };

  return (
    <div className="manager-app-container">
      {/* ================= SIDEBAR ================= */}
      <aside className="manager-sidebar">
        <div className="sidebar-brand-box">
          <h1 className="brand-company-name">CBN Transport</h1>
        </div>

        <nav className="sidebar-menu-list">
          {/* 1. Tổng quan */}
          <button
            type="button"
            className={`menu-item-btn ${activeNav === 'overview' ? 'active' : ''}`}
            onClick={() => handleNavigate('overview')}
          >
            <span className="menu-icon">🏠</span>
            <span className="menu-label">Tổng quan</span>
          </button>

          {/* 2. Yêu cầu vận chuyển */}
          <button
            type="button"
            className={`menu-item-btn ${activeNav === 'requests' ? 'active' : ''}`}
            onClick={() => handleNavigate('requests')}
          >
            <span className="menu-icon">📄</span>
            <span className="menu-label">Yêu cầu vận chuyển</span>
            <span className="menu-badge">3</span>
          </button>

          {/* 3. Hợp đồng & chi phí */}
          <button
            type="button"
            className={`menu-item-btn ${activeNav === 'contracts' ? 'active' : ''}`}
            onClick={() => handleNavigate('contracts')}
          >
            <span className="menu-icon">📄</span>
            <span className="menu-label">Hợp đồng & chi phí</span>
          </button>

          {/* 4. Đặt cọc & thanh toán */}
          <button
            type="button"
            className={`menu-item-btn ${activeNav === 'payments' ? 'active' : ''}`}
            onClick={() => handleNavigate('payments')}
          >
            <span className="menu-icon">💳</span>
            <span className="menu-label">Đặt cọc & thanh toán</span>
            <span className="menu-badge">1</span>
          </button>

          {/* 5. Chuyến đi */}
          <button
            type="button"
            className={`menu-item-btn ${activeNav === 'trips' ? 'active' : ''}`}
            onClick={() => handleNavigate('trips')}
          >
            <span className="menu-icon">🚚</span>
            <span className="menu-label">Chuyến đi</span>
            <span className="menu-badge">3</span>
          </button>

          {/* 6. Chi phí & báo cáo */}
          <button
            type="button"
            className={`menu-item-btn ${activeNav === 'reports' ? 'active' : ''}`}
            onClick={() => handleNavigate('reports')}
          >
            <span className="menu-icon">📊</span>
            <span className="menu-label">Chi phí & báo cáo</span>
          </button>
        </nav>
      </aside>

      {/* ================= MAIN CONTENT WRAPPER ================= */}
      <div className="manager-main-wrapper">
        {/* TOPBAR */}
        <header className="manager-topbar">
          <h2 className="topbar-page-title">{getPageTitle()}</h2>

          <div className="topbar-right-controls">
            {/* Language Switch */}
            <div className="lang-toggle-box">
              <button
                type="button"
                className={`lang-btn ${lang === 'VI' ? 'active' : ''}`}
                onClick={() => setLang('VI')}
              >
                VI
              </button>
              <button
                type="button"
                className={`lang-btn ${lang === 'EN' ? 'active' : ''}`}
                onClick={() => setLang('EN')}
              >
                EN
              </button>
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              className="topbar-bell-btn"
              title="Thông báo hệ thống"
              onClick={() => handleNavigate('overview')}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="bell-badge-pill">9+</span>
            </button>

            {/* User Profile */}
            <div className="relative">
              <button
                type="button"
                className="user-profile-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
              >
                <div className="avatar-circle">LP</div>
                <span className="user-name-text">Linh Pham</span>
                <span className="caret-icon">▾</span>
              </button>

              {showUserDropdown && (
                <div className="user-dropdown-popover fade-in">
                  <div className="dropdown-user-header">
                    <div className="font-semibold text-white text-xs">Linh Pham</div>
                    <div className="text-[11px] text-gray-400">Logistics Manager</div>
                  </div>
                  <button
                    type="button"
                    className="dropdown-item-btn text-red"
                    onClick={() => navigate('/login')}
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View Content Renderer */}
        <main className="manager-view-container">
          {activeNav === 'overview' && (
            <ManagerOverviewPage
              metrics={metrics}
              requests={requests}
              alerts={alerts}
              notifications={notifications}
              activeTrips={activeTrips}
              onNavigate={handleNavigate}
              onAcceptRequest={handleAcceptRequest}
              onRequestRevision={handleRequestRevision}
              onRejectRequest={handleRejectRequest}
            />
          )}

          {activeNav === 'requests' && (
            <ManagerRequestsPage
              requests={requests}
              onAcceptRequest={handleAcceptRequest}
              onRequestRevision={handleRequestRevision}
              onRejectRequest={handleRejectRequest}
              onNavigate={handleNavigate}
              initialSelectedId={selectedTargetId}
            />
          )}

          {activeNav === 'contracts' && (
            <ManagerContractsPage
              contracts={contracts}
              requests={requests}
              onSaveContract={handleSaveContract}
              onSendContract={handleSendContract}
              onNavigate={handleNavigate}
              initialSelectedRequestId={selectedTargetId}
            />
          )}

          {activeNav === 'payments' && (
            <ManagerPaymentsPage
              transactions={transactions}
              overdueList={overdueList}
              onConfirmTransaction={handleConfirmTransaction}
              onRejectTransaction={handleRejectTransaction}
              onExtendDeadline={handleExtendDeadline}
              onCancelOverdue={handleCancelOverdue}
              onNavigate={handleNavigate}
            />
          )}

          {activeNav === 'trips' && (
            <ManagerTripsPage onNavigate={handleNavigate} />
          )}

          {activeNav === 'reports' && (
            <ManagerReportsPage onNavigate={handleNavigate} />
          )}
        </main>
      </div>
    </div>
  );
};

export default ManagerPortal;
