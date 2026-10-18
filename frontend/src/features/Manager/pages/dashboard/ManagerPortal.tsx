import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ManagerPortal.css';
import type {
  ManagerNav,
  TransportRequestItem,
  ContractItem,
  BankTransferTransaction,
  DeadlineOverdueItem,
  AlertItem,
  ActiveTripItem,
} from './views';
import {
  INITIAL_REQUESTS,
  INITIAL_CONTRACTS,
  INITIAL_BANK_TRANSACTIONS,
  INITIAL_DEADLINE_OVERDUE,
  INITIAL_ALERTS,
  INITIAL_ACTIVE_TRIPS,
  RenderOverviewPage,
  RenderRequestsPage,
  RenderContractsPage,
  RenderPaymentsPage,
} from './views';

interface ManagerPortalProps {
  initialNav?: ManagerNav;
}

export const ManagerPortal: React.FC<ManagerPortalProps> = ({
  initialNav = 'overview',
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine activeNav from prop or route pathname
  const getNavFromPath = (): ManagerNav => {
    const path = location.pathname;
    if (path.includes('/manager/requests')) return 'requests';
    if (path.includes('/manager/contracts')) return 'contracts';
    if (path.includes('/manager/payments')) return 'payments';
    if (path.includes('/manager/overview') || path.includes('/manager/dashboard')) {
      return 'overview';
    }
    return initialNav;
  };

  const [activeNav, setActiveNav] = useState<ManagerNav>(getNavFromPath);
  const [selectedTargetId, setSelectedTargetId] = useState<string | undefined>(undefined);
  const [lang, setLang] = useState<'VI' | 'EN'>('VI');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Synchronize route with nav state
  useEffect(() => {
    const navFromUrl = getNavFromPath();
    if (navFromUrl !== activeNav) {
      setActiveNav(navFromUrl);
    }
  }, [location.pathname]);

  // Global Mock States & Real-time Sync with Customer
  const loadMergedRequests = (): TransportRequestItem[] => {
    let customManagerList: TransportRequestItem[] = [];
    try {
      customManagerList = JSON.parse(localStorage.getItem('cbn_custom_manager_requests') || '[]');
    } catch {
      customManagerList = [];
    }

    const isJapanSubmitted = localStorage.getItem('cbn_japan_dossier_submitted') === 'true';
    const japanSubmitTime = localStorage.getItem('cbn_japan_dossier_submitted_at');

    const baseList = INITIAL_REQUESTS.map((r) => {
      if (isJapanSubmitted && (r.id === 'TRN-8930' || r.destinationCountry === 'JP')) {
        return {
          ...r,
          status: 'PENDING' as const,
          statusLabel: 'Chờ duyệt • Hồ sơ mới nộp từ Khách hàng',
          createdAt:
            'Hôm nay ' +
            (japanSubmitTime
              ? new Date(japanSubmitTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              : '09:15'),
        };
      }
      return r;
    });

    const customIds = new Set(customManagerList.map((c) => c.id));
    return [...customManagerList, ...baseList.filter((b) => !customIds.has(b.id))];
  };

  const [requests, setRequests] = useState<TransportRequestItem[]>(loadMergedRequests);

  useEffect(() => {
    const handleSync = () => {
      setRequests(loadMergedRequests());
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('cbn_request_created', handleSync);
    window.addEventListener('cbn_request_updated', handleSync);
    const interval = setInterval(handleSync, 1200);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('cbn_request_created', handleSync);
      window.removeEventListener('cbn_request_updated', handleSync);
      clearInterval(interval);
    };
  }, []);

  const [contracts, setContracts] = useState<ContractItem[]>(INITIAL_CONTRACTS);
  const [transactions, setTransactions] = useState<BankTransferTransaction[]>(
    INITIAL_BANK_TRANSACTIONS
  );
  const [overdueList, setOverdueList] = useState<DeadlineOverdueItem[]>(
    INITIAL_DEADLINE_OVERDUE
  );
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [activeTrips, setActiveTrips] = useState<ActiveTripItem[]>(INITIAL_ACTIVE_TRIPS);

  // Dynamic counts for sidebar badges
  const pendingRequestsCount = requests.filter((r) => r.status === 'PENDING').length;
  const pendingPaymentsCount = transactions.filter(
    (t) => t.status === 'PENDING_CONFIRMATION'
  ).length;

  const handleNavigate = (nav: ManagerNav, targetId?: string) => {
    setActiveNav(nav);
    setSelectedTargetId(targetId);
    navigate(`/manager/${nav}`);
  };

  // Helper to sync status update back to localStorage
  const syncStatusToStorages = (requestId: string, newStatus: string, label: string) => {
    try {
      const customList = JSON.parse(localStorage.getItem('cbn_custom_manager_requests') || '[]');
      const updatedCustom = customList.map((item: any) =>
        item.id === requestId
          ? { ...item, status: newStatus, statusLabel: label }
          : item
      );
      localStorage.setItem('cbn_custom_manager_requests', JSON.stringify(updatedCustom));

      // Customer storage mapping
      const custRequests = JSON.parse(localStorage.getItem('cbn_transport_requests') || '[]');
      let customerStatus = 'Waiting for Manager Review';
      if (newStatus === 'ACCEPTED') customerStatus = 'Accepted – Contract Preparation';
      else if (newStatus === 'CHANGES_REQUESTED') customerStatus = 'Changes Requested';
      else if (newStatus === 'REJECTED') customerStatus = 'Rejected';

      const updatedCust = custRequests.map((cr: any) =>
        cr.id === requestId ? { ...cr, status: customerStatus } : cr
      );
      localStorage.setItem('cbn_transport_requests', JSON.stringify(updatedCust));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('cbn_request_updated'));
    } catch (e) {
      console.error('Lỗi khi đồng bộ trạng thái đơn:', e);
    }
  };

  // ===================== ACTION HANDLERS =====================

  // 1. Accept Request (F01-M02)
  const handleAcceptRequest = (requestId: string, _note?: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'ACCEPTED',
            statusLabel: 'Đã chấp nhận – Đang soạn hợp đồng',
          };
        }
        return r;
      })
    );

    syncStatusToStorages(requestId, 'ACCEPTED', 'Đã chấp nhận – Đang soạn hợp đồng');

    // Update alert
    setAlerts((prev) => [
      {
        id: `alt-${Date.now()}`,
        type: 'info',
        bulletColor: 'blue',
        title: `Soạn hợp đồng nháp • ${requestId}`,
        subtitle: `Đã chấp nhận yêu cầu • ${
          requests.find((r) => r.id === requestId)?.customerName
        }`,
        requestId,
        linkNav: 'contracts',
      },
      ...prev,
    ]);
  };

  // 2. Request Revision (F01-M04)
  const handleRequestRevision = (
    requestId: string,
    _reason: string,
    _suggestionDate?: string
  ) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'CHANGES_REQUESTED',
            statusLabel: 'Yêu cầu điều chỉnh',
          };
        }
        return r;
      })
    );

    syncStatusToStorages(requestId, 'CHANGES_REQUESTED', 'Yêu cầu điều chỉnh');
  };

  // 3. Reject Request (F01-M03)
  const handleRejectRequest = (
    requestId: string,
    _reasonGroup: string,
    _reason: string
  ) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'REJECTED',
            statusLabel: 'Đã từ chối',
          };
        }
        return r;
      })
    );

    syncStatusToStorages(requestId, 'REJECTED', 'Đã từ chối');
  };

  // 4. Save Contract Draft (F01-M15)
  const handleSaveContract = (updatedContract: ContractItem) => {
    setContracts((prev) => {
      const idx = prev.findIndex((c) => c.id === updatedContract.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedContract;
        return copy;
      }
      return [updatedContract, ...prev];
    });
  };

  // 5. Send Contract to Customer (F01-M16)
  const handleSendContract = (
    contractId: string,
    completionDeadline: string
  ) => {
    setContracts((prev) =>
      prev.map((c) => {
        if (c.id === contractId) {
          return {
            ...c,
            status: 'PENDING_SIGNATURE',
            statusLabel: 'Chờ khách ký OTP & nộp cọc',
            completionDeadline,
          };
        }
        return c;
      })
    );

    // Update corresponding request to AWAITING_CONTRACT
    const curContract = contracts.find((c) => c.id === contractId);
    if (curContract) {
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id === curContract.requestId) {
            return {
              ...r,
              status: 'AWAITING_CONTRACT',
              statusLabel: 'Chờ khách ký hợp đồng',
            };
          }
          return r;
        })
      );
    }
  };

  // 6. Confirm Bank Transfer (F01-M20)
  const handleConfirmTransaction = (
    transactionId: string,
    confirmedAmount: number,
    bankRef: string,
    _note?: string
  ) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.transactionId === transactionId) {
          return {
            ...t,
            status: 'SUCCESS',
            confirmedAmount,
            bankReference: bankRef,
            confirmedAt: new Date().toLocaleString(),
          };
        }
        return t;
      })
    );

    // Activate Request & Contract
    const targetTxn = transactions.find((t) => t.transactionId === transactionId);
    if (targetTxn) {
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id === targetTxn.requestId) {
            return {
              ...r,
              status: 'ACTIVATED',
              statusLabel: 'Đã kích hoạt vận chuyển',
            };
          }
          return r;
        })
      );

      setContracts((prev) =>
        prev.map((c) => {
          if (c.id === targetTxn.contractId) {
            return {
              ...c,
              status: 'EFFECTIVE',
              statusLabel: 'Hợp đồng có hiệu lực',
            };
          }
          return c;
        })
      );

      // Create planning trip
      setActiveTrips((prev) => [
        {
          id: `TRP-${targetTxn.requestId.replace('TRN-', '')}`,
          route: targetTxn.customerName.includes('Saigon')
            ? 'Hanoi → Tokyo'
            : 'HCMC → Tokyo',
          status: 'Chuẩn bị điều phối (Planning)',
          statusClass: 'status-ready',
          eta: '10 ngày tới',
          lastUpdated: 'Vừa xong',
          driverEscort: 'Chờ phân công điều phối',
        },
        ...prev,
      ]);
    }
  };

  // 7. Reject Bank Transfer (F01-M21)
  const handleRejectTransaction = (transactionId: string, reason: string) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.transactionId === transactionId) {
          return {
            ...t,
            status: 'REJECTED',
            rejectReason: reason,
          };
        }
        return t;
      })
    );
  };

  // 8. Extend Completion Deadline (F01-M23)
  const handleExtendDeadline = (
    requestId: string,
    _newDeadline: string,
    _reason: string
  ) => {
    setOverdueList((prev) => prev.filter((o) => o.requestId !== requestId));
  };

  // 9. Cancel Overdue Manually (F01-M24)
  const handleCancelOverdue = (requestId: string, _reason: string) => {
    setOverdueList((prev) => prev.filter((o) => o.requestId !== requestId));
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'CANCELLED',
            statusLabel: 'Đã hủy quá hạn',
          };
        }
        return r;
      })
    );
  };

  // Title for top navbar
  const getNavTitle = () => {
    switch (activeNav) {
      case 'overview':
        return 'Tổng quan';
      case 'requests':
        return 'Yêu cầu vận chuyển';
      case 'contracts':
        return 'Hợp đồng & chi phí';
      case 'payments':
        return 'Đặt cọc & thanh toán';
      default:
        return 'Tổng quan';
    }
  };

  return (
    <div className="manager-app-container">
      {/* ================= SIDEBAR ================= */}
      <aside className="manager-sidebar">
        {/* Brand & Subtitle */}
        <div className="sidebar-brand-box">
          <div className="brand-title-wrap">
            <h1 className="brand-company-name">CBN Transport</h1>
          </div>
          <div className="brand-badge-box">
            <span className="brand-role-title">Quản lý vận hành</span>
            <span className="brand-demo-label">Cổng demo</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-menu-list">
          {/* 1. Tổng quan */}
          <button
            type="button"
            className={`menu-item-btn ${activeNav === 'overview' ? 'active' : ''}`}
            onClick={() => handleNavigate('overview')}
          >
            <span className="menu-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </span>
            <span className="menu-text">Tổng quan</span>
          </button>

          {/* 2. Yêu cầu vận chuyển */}
          <button
            type="button"
            className={`menu-item-btn ${activeNav === 'requests' ? 'active' : ''}`}
            onClick={() => handleNavigate('requests')}
          >
            <span className="menu-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </span>
            <span className="menu-text">Yêu cầu vận chuyển</span>
            {pendingRequestsCount > 0 && (
              <span className="menu-badge">{pendingRequestsCount}</span>
            )}
          </button>

          {/* 3. Hợp đồng & chi phí */}
          <button
            type="button"
            className={`menu-item-btn ${activeNav === 'contracts' ? 'active' : ''}`}
            onClick={() => handleNavigate('contracts')}
          >
            <span className="menu-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </span>
            <span className="menu-text">Hợp đồng &amp; chi phí</span>
          </button>

          {/* 4. Đặt cọc & thanh toán */}
          <button
            type="button"
            className={`menu-item-btn ${activeNav === 'payments' ? 'active' : ''}`}
            onClick={() => handleNavigate('payments')}
          >
            <span className="menu-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
            </span>
            <span className="menu-text">Đặt cọc &amp; thanh toán</span>
            {pendingPaymentsCount > 0 && (
              <span className="menu-badge">{pendingPaymentsCount}</span>
            )}
          </button>
        </nav>
      </aside>

      {/* ================= MAIN CONTENT WRAPPER ================= */}
      <div className="manager-content-area">
        {/* Top Navbar */}
        <header className="manager-top-navbar">
          <div className="navbar-left">
            <h1 className="navbar-page-title">{getNavTitle()}</h1>
          </div>

          <div className="navbar-right">
            {/* Language Switcher Pill */}
            <div className="lang-switcher-pill">
              <button
                type="button"
                className={`lang-option ${lang === 'VI' ? 'active' : ''}`}
                onClick={() => setLang('VI')}
              >
                VI
              </button>
              <button
                type="button"
                className={`lang-option ${lang === 'EN' ? 'active' : ''}`}
                onClick={() => setLang('EN')}
              >
                EN
              </button>
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              className="navbar-bell-btn"
              title="Thông báo hệ thống"
              onClick={() => handleNavigate('overview')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="bell-badge">5</span>
            </button>

            {/* User Profile */}
            <div
              className="user-profile-widget"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
            >
              <div className="user-avatar-circle">LP</div>
              <span className="user-profile-name">Linh Pham</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="user-chevron"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>

              {showUserDropdown && (
                <div className="user-dropdown-menu fade-in">
                  <div className="dropdown-user-info">
                    <div className="font-semibold text-slate-800">Linh Pham</div>
                    <div className="text-xs text-slate-500">Logistics Manager</div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button
                    type="button"
                    className="dropdown-item"
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
            <RenderOverviewPage
              requests={requests}
              alerts={alerts}
              activeTrips={activeTrips}
              onNavigate={handleNavigate}
            />
          )}

          {activeNav === 'requests' && (
            <RenderRequestsPage
              requests={requests}
              onAcceptRequest={handleAcceptRequest}
              onRequestRevision={handleRequestRevision}
              onRejectRequest={handleRejectRequest}
              onNavigate={handleNavigate}
              initialSelectedId={selectedTargetId}
            />
          )}

          {activeNav === 'contracts' && (
            <RenderContractsPage
              contracts={contracts}
              requests={requests}
              onSaveContract={handleSaveContract}
              onSendContract={handleSendContract}
              onNavigate={handleNavigate}
              initialSelectedRequestId={selectedTargetId}
            />
          )}

          {activeNav === 'payments' && (
            <RenderPaymentsPage
              transactions={transactions}
              overdueList={overdueList}
              onConfirmTransaction={handleConfirmTransaction}
              onRejectTransaction={handleRejectTransaction}
              onExtendDeadline={handleExtendDeadline}
              onCancelOverdue={handleCancelOverdue}
              onNavigate={handleNavigate}
            />
          )}
        </main>
      </div>
    </div>
  );
};