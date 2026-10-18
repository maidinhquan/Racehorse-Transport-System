import React, { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import './ManagerPortal.css';
import type { ManagerNav } from './views/manager.types';
import { RenderOverviewPage, RenderRequestsPage } from './views';
import { RenderContractsPage } from './views/RenderContractsPage';
import { RenderPaymentsPage } from './views/RenderPaymentsPage';
import { useRequests } from '../../../flow1/relational/presentation';
import { relational } from '../../../flow1/relational/api';
import { flow1Error } from '../../../flow1/api';
import { managerRequest } from './managerPresentation';
import { Notifications } from '../../../flow1/relational/Notifications';

interface ManagerPortalProps {
  initialNav?: ManagerNav;
  detail?: boolean;
}

export const ManagerPortal: React.FC<ManagerPortalProps> = ({
  initialNav = 'overview',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {requestId}=useParams();

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

  const activeNav=getNavFromPath();
  const [selectedTargetId, setSelectedTargetId] = useState<string | undefined>(undefined);
  const [lang, setLang] = useState<'VI' | 'EN'>('VI');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const {requests:records,error:loadError,loading,reload}=useRequests(true);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [keys]=useState(()=>new Map<string,string>());
  const requests=records.map(managerRequest);
  const transactions=records.flatMap(r=>r.contracts.flatMap(c=>c.payments));
  const alerts=records.filter(r=>r.managerNotes).map(r=>({id:r.requestId,type:'info' as const,bulletColor:'blue' as const,title:r.requestId,subtitle:r.managerNotes!,requestId:r.requestId,linkNav:'requests' as const}));
  const activeTrips=records.flatMap(r=>r.contracts.filter(c=>c.isCurrent&&c.hasAcceptanceEvidence&&c.trip&&!(["COMPLETED","CANCELLED"].includes(c.trip.status))).map(c=>({id:c.trip!.tripId,route:r.departure+' → '+r.destination,status:c.trip!.deploymentStatus||c.trip!.status,statusClass:'planning',eta:'—',lastUpdated:'—',driverEscort:'Chưa phân công'})));
  // Dynamic counts for sidebar badges
  const pendingRequestsCount = requests.filter((r) => r.status === 'PENDING').length;
  const pendingPaymentsCount = transactions.filter(
    (t) => t.status === 'PENDING_GATEWAY'||t.reviewRequired
  ).length;

  const handleNavigate = (nav: ManagerNav, targetId?: string) => {
    setSelectedTargetId(targetId);
    navigate(targetId&&nav==='requests'?`/manager/requests/${targetId}`:`/manager/${nav}`);
  };

  const review=async(id:string,action:string,reason:string)=>{setBusy(true);setError('');try{const row=records.find(r=>r.requestId===id)!;await relational.action(`/manager/requests/${id}/${action}`,{version:row.version,reason});await reload();}catch(e){setError(flow1Error(e));throw e;}finally{setBusy(false);}};
  const handleAcceptRequest=(id:string,note?:string)=>review(id,'accept',note?.trim()||'Đã thẩm định hồ sơ và chấp nhận yêu cầu');
  const handleRequestRevision=(id:string,reason:string,date?:string)=>review(id,'request-changes',reason+(date?' · Ngày gợi ý: '+date:''));
  const handleRejectRequest=(id:string,_group:string,reason:string)=>review(id,'reject',reason);
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

            <Notifications variant="manager"/>

            {/* User Profile */}
            <div
              className="user-profile-widget"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
            >
              <div className="user-avatar-circle">LP</div>
              <span className="user-profile-name">{localStorage.getItem("userFullName")||"Logistics Manager"}</span>
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
                    <div className="font-semibold text-slate-800">{localStorage.getItem("userFullName")||"Logistics Manager"}</div>
                    <div className="text-xs text-slate-500">Logistics Manager</div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {for(const key of ['accessToken','userRole','userFullName'])localStorage.removeItem(key);navigate('/login');}}
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View Content Renderer */}
        <main className="manager-view-container" aria-busy={busy}>{(error||loadError)&&<p className="flow1-ui-error" role="alert">{error||loadError}</p>}{loading&&<p>Đang tải…</p>}
          {activeNav === 'overview' && (
            <RenderOverviewPage
              requests={requests}
              alerts={alerts}
              activeTrips={activeTrips}
              onNavigate={handleNavigate}
            />
          )}

          {!loading&&activeNav === 'requests' && (
            <RenderRequestsPage
              requests={requests}
              onAcceptRequest={handleAcceptRequest}
              onRequestRevision={handleRequestRevision}
              onRejectRequest={handleRejectRequest}
              onNavigate={handleNavigate}
              key={requestId||selectedTargetId||"requests"}
              initialSelectedId={requestId||selectedTargetId}
            />
          )}

          {!loading&&activeNav==='contracts'&&<RenderContractsPage records={records} targetId={selectedTargetId} reload={reload} keys={keys}/>}
          {!loading&&activeNav==='payments'&&<RenderPaymentsPage records={records} reload={reload}/>}

        </main>
      </div>
    </div>
  );
};
