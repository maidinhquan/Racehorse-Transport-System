import React, { useState, useEffect } from 'react';
import './CoordinatorPortal.css';
import { OperationsInbox } from '../../../flow1/relational/Pages';
import { Notifications } from '../../../flow1/relational/Notifications';
import { coordinatorApi } from '../../api/coordinatorApi';
import type { MockTrip } from './views';
import {
  Icon,
  INITIAL_TRIPS,
  RenderDashboardPage,
  RenderTripStudioPage,
  RenderFleetPage,
  RenderCrewPage,
  RenderActiveTripsPage,
  RenderIncidentsPage,
} from './views';

export type CoordinatorNav = 'dashboard' | 'trips' | 'fleet' | 'crew' | 'flights' | 'active' | 'incidents';

interface CoordinatorPortalProps {
  isEmbedded?: boolean;
  flow1?: boolean;
  initialNav?: CoordinatorNav;
}

export const CoordinatorPortal: React.FC<CoordinatorPortalProps> = ({ initialNav = 'dashboard', flow1 = false }) => {
  // Navigation states
  const [activeNav, setActiveNav] = useState<CoordinatorNav>(initialNav);
  const [selectedTripId, setSelectedTripId] = useState<string>('TRP-20261120-0003');
  const [tripTab, setTripTab] = useState<'overview' | 'route' | 'resources' | 'flight' | 'milestones'>('resources');

  // Language & Notification states
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Trips state
  const [trips, setTrips] = useState<MockTrip[]>(INITIAL_TRIPS);
  const curTrip = trips.find((t) => t.id === selectedTripId) || trips[0];

  // Map simulation state (merged from old CoordinatorDashboard)
  const [truckPos, setTruckPos] = useState({ lat: 10.8231, lng: 106.6297 });

  // Optional backend sync
  useEffect(() => {
    if(flow1)return;
    coordinatorApi
      .getDashboard()
      .then((res) => {
        if (res && res.success) {
          // Connected to backend successfully
        }
      })
      .catch(() => {
        // Running standalone / mock mode
      });
  }, [flow1]);

  // Moving truck simulation on Milestones tab
  useEffect(() => {
    if (activeNav === 'active' || (activeNav === 'trips' && tripTab === 'milestones')) {
      const timer = setInterval(() => {
        setTruckPos((prev) => ({
          lat: prev.lat + (Math.random() * 0.0006 - 0.0003),
          lng: prev.lng + 0.001,
        }));
      }, 2500);
      return () => clearInterval(timer);
    }
  }, [activeNav, tripTab]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // --------------------------------------------------------------------------
  // ACTIONS
  // --------------------------------------------------------------------------
  const handleSetGroundVehicle = (leg: 'outbound' | 'inbound', vehicleId: string) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== curTrip.id) return t;
        return {
          ...t,
          [leg === 'outbound' ? 'outboundLeg' : 'inboundLeg']: {
            ...t[leg === 'outbound' ? 'outboundLeg' : 'inboundLeg'],
            vehicleId,
          },
          resourcesConfirmed: false,
        };
      })
    );
    showToast(`Đã phân công xe cho chặng ${leg === 'outbound' ? 'trước' : 'sau'} chuyến bay.`);
  };

  const handleSetGroundCrew = (
    leg: 'outbound' | 'inbound',
    role: 'mainDriver' | 'coDriver' | 'vet',
    staffId: string
  ) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== curTrip.id) return t;
        const currentLeg = t[leg === 'outbound' ? 'outboundLeg' : 'inboundLeg'];
        return {
          ...t,
          [leg === 'outbound' ? 'outboundLeg' : 'inboundLeg']: {
            ...currentLeg,
            [role]: staffId,
          },
          resourcesConfirmed: false,
        };
      })
    );
  };

  const handleConfirmResources = () => {
    setTrips((prev) =>
      prev.map((t) => (t.id === curTrip.id ? { ...t, resourcesConfirmed: true } : t))
    );
    showToast('✓ Coordinator đã xác nhận bố trí xe và nhân sự (Operations READY)! Sẵn sàng gửi Manager.');
  };

  const handleSubmitRoute = () => {
    setTrips((prev) =>
      prev.map((t) => (t.id === curTrip.id ? { ...t, routeStatus: 'PENDING_APPROVAL' } : t))
    );
    showToast('🚀 Đã gửi phương án tuyến đường cho Logistics Manager phê duyệt.');
  };

  // Demo buttons (Simulates Manager actions)
  const handleDemoDeploy = () => {
    setTrips((prev) =>
      prev.map((t) => (t.id === curTrip.id ? { ...t, deploymentStatus: 'CONFIRMED' } : t))
    );
    showToast('Demo: Logistics Manager đã xác nhận triển khai chuyến (Deployment Confirmed).');
  };

  const handleDemoApprove = () => {
    setTrips((prev) =>
      prev.map((t) => (t.id === curTrip.id ? { ...t, routeStatus: 'APPROVED' } : t))
    );
    showToast('Demo: Logistics Manager đã phê duyệt tuyến đường (Route Approved).');
  };

  const handleDemoReturn = () => {
    setTrips((prev) =>
      prev.map((t) => (t.id === curTrip.id ? { ...t, routeStatus: 'RETURNED' } : t))
    );
    showToast('Demo: Logistics Manager đã trả về tuyến yêu cầu điều chỉnh (Route Returned).');
  };

  // --------------------------------------------------------------------------
  // TOPBAR TITLE
  // --------------------------------------------------------------------------
  const getPageTitle = () => {
    switch (activeNav) {
      case 'dashboard':
        return 'Dashboard';
      case 'trips':
        return selectedTripId ? `Trip ${curTrip.id}` : 'Trip Planning';
      case 'fleet':
        return 'Fleet';
      case 'crew':
        return 'Crew Assignments';
      case 'flights':
        return 'Flights';
      case 'active':
        return 'Active Trips';
      case 'incidents':
        return 'Incidents';
      default:
        return 'Fleet & Route Coordinator';
    }
  };

  // --------------------------------------------------------------------------
  // MAIN LAYOUT
  // --------------------------------------------------------------------------
  return (
    <div className="cbn-coordinator-app">
      {/* SIDEBAR (208px fixed) */}
      <aside className="sidebar">
        <div
          className="brand"
          onClick={() => {
            setActiveNav('dashboard');
            setSelectedTripId('');
          }}
        >
          CBN Transport
        </div>
        <div className="role-chip">
          <b>Fleet &amp; Route Coordinator</b>
          <span>Hệ thống điều phối</span>
        </div>

        <nav className="nav">
          <button
            className={activeNav === 'dashboard' ? 'active' : ''}
            onClick={() => {
              setActiveNav('dashboard');
              setSelectedTripId('');
            }}
          >
            <Icon name="home" /> Dashboard
          </button>
          <button
            className={activeNav === 'trips' ? 'active' : ''}
            onClick={() => {
              setActiveNav('trips');
              setSelectedTripId('TRP-20261120-0003');
            }}
          >
            <Icon name="map" /> Trip Planning
            <span className="badge-count">2</span>
          </button>
          <button
            className={activeNav === 'fleet' ? 'active' : ''}
            onClick={() => {
              setActiveNav('fleet');
              setSelectedTripId('');
            }}
          >
            <Icon name="truck" /> Fleet
          </button>
          <button
            className={activeNav === 'crew' ? 'active' : ''}
            onClick={() => {
              setActiveNav('crew');
              setSelectedTripId('');
            }}
          >
            <Icon name="users" /> Crew Assignments
          </button>
          <button
            className={activeNav === 'flights' ? 'active' : ''}
            onClick={() => {
              setActiveNav('trips');
              setTripTab('flight');
            }}
          >
            <Icon name="plane" /> Flights
          </button>
          <button
            className={activeNav === 'active' ? 'active' : ''}
            onClick={() => {
              setActiveNav('active');
            }}
          >
            <Icon name="pin" /> Active Trips
          </button>
          <button
            className={activeNav === 'incidents' ? 'active' : ''}
            onClick={() => {
              setActiveNav('incidents');
              setSelectedTripId('');
            }}
          >
            <Icon name="alert" /> Incidents
          </button>
        </nav>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="main">
        {/* TOPBAR (64px sticky) */}
        <header className="topbar">
          <h1 id="topbar-title">{getPageTitle()}</h1>

          <div className="user">
            <div className="lang-switch" role="group" aria-label="Ngôn ngữ">
              <button
                type="button"
                aria-pressed={lang === 'vi'}
                onClick={() => setLang('vi')}
              >
                VI
              </button>
              <button
                type="button"
                aria-pressed={lang === 'en'}
                onClick={() => setLang('en')}
              >
                EN
              </button>
            </div>

            <Notifications variant="manager"/>

            <button className="icon-btn">
              <span className="avatar">DQ</span>
              <span className="user-name">{localStorage.getItem("userFullName")||"Coordinator"}</span>
              <Icon name="chev" />
            </button>
          </div>
        </header>

        {/* NOTIFICATION TOAST */}
        {toastMsg && (
          <div
            style={{
              position: 'fixed',
              top: '74px',
              right: '32px',
              zIndex: 999,
              background: 'var(--ink)',
              color: '#fff',
              padding: '12px 18px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontSize: '13px',
            }}
          >
            {toastMsg}
          </div>
        )}

        {/* VIEW AREA DELEGATED TO INDIVIDUAL RENDER PAGES */}
        <main className="view">
          {flow1&&activeNav==='dashboard'&&<OperationsInbox stream="ROUTING" portal/>}
          {!flow1&&activeNav === 'dashboard' && (
            <RenderDashboardPage
              trips={trips}
              lang={lang}
              onNavigate={(nav) => setActiveNav(nav)}
              onSelectTrip={(id) => setSelectedTripId(id)}
              onOpenTripTab={(id, tab) => {
                setSelectedTripId(id);
                setActiveNav('trips');
                setTripTab(tab);
              }}
              onDemoDeploy={handleDemoDeploy}
              onDemoApprove={handleDemoApprove}
              onDemoReturn={handleDemoReturn}
            />
          )}

          {activeNav === 'trips' && (
            <RenderTripStudioPage
              curTrip={curTrip}
              tripTab={tripTab}
              setTripTab={setTripTab}
              lang={lang}
              truckPos={truckPos}
              onBack={() => setSelectedTripId('')}
              onSetGroundVehicle={handleSetGroundVehicle}
              onSetGroundCrew={handleSetGroundCrew}
              onConfirmResources={handleConfirmResources}
              onSubmitRoute={handleSubmitRoute}
              onDemoDeploy={handleDemoDeploy}
              onDemoApprove={handleDemoApprove}
              onDemoReturn={handleDemoReturn}
            />
          )}

          {activeNav === 'fleet' && <RenderFleetPage />}

          {activeNav === 'crew' && <RenderCrewPage />}

          {activeNav === 'active' && (
            <RenderActiveTripsPage
              curTrip={curTrip}
              tripTab={tripTab}
              setTripTab={setTripTab}
              lang={lang}
              truckPos={truckPos}
              onBack={() => setSelectedTripId('')}
              onSetGroundVehicle={handleSetGroundVehicle}
              onSetGroundCrew={handleSetGroundCrew}
              onConfirmResources={handleConfirmResources}
              onSubmitRoute={handleSubmitRoute}
              onDemoDeploy={handleDemoDeploy}
              onDemoApprove={handleDemoApprove}
              onDemoReturn={handleDemoReturn}
            />
          )}

          {activeNav === 'incidents' && <RenderIncidentsPage />}
        </main>
      </div>
    </div>
  );
};

export default CoordinatorPortal;
