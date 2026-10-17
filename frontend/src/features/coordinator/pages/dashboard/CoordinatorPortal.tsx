import React, { useState, useEffect } from 'react';
import './CoordinatorPortal.css';
import { coordinatorApi } from '../../api/coordinatorApi';

// ============================================================================
// SVG ICONS (Matching reference HTML symbols)
// ============================================================================
const Icon = ({ name }: { name: string }) => {
  switch (name) {
    case 'home':
      return <svg className="i"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>;
    case 'map':
      return <svg className="i"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></svg>;
    case 'truck':
      return <svg className="i"><path d="M2 6h12v10H2zM14 9h4l4 4v3h-8z" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></svg>;
    case 'users':
      return <svg className="i"><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.4.6 4 2.9 4 6" /></svg>;
    case 'plane':
      return <svg className="i"><path d="M10 15 3 13l1-2 6 .5L14 5c1-1.5 3-1.5 3 0l-2 7 5 1-1 2-5-.5-3 5h-2l1-5z" /></svg>;
    case 'pin':
      return <svg className="i"><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case 'alert':
      return <svg className="i"><path d="M12 3 2 20h20zM12 10v4M12 17h.01" /></svg>;
    case 'clock':
      return <svg className="i"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case 'check':
      return <svg className="i"><path d="m5 12 5 5 9-10" /></svg>;
    case 'plus':
      return <svg className="i"><path d="M12 5v14M5 12h14" /></svg>;
    case 'chev':
      return <svg className="i chev"><path d="m6 9 6 6 6-6" /></svg>;
    default:
      return null;
  }
};

// ============================================================================
// DATA MODELS
// ============================================================================
interface StopItem {
  id: string;
  name: string;
  type: 'ORIGIN' | 'REST_STOP' | 'CHECKPOINT' | 'AIRPORT' | 'DESTINATION';
  plannedAt: string;
  cp?: string;
}

interface MockTrip {
  id: string;
  requestId: string;
  customer: string;
  origin: string;
  destination: string;
  mode: 'AIR' | 'ROAD';
  transportDate: string;
  plannedDepart: string;
  eta: string;
  horses: number;
  deploymentStatus: 'CONFIRMED' | 'NOT_CONFIRMED' | 'ON_HOLD';
  routeStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'RETURNED';
  resourcesConfirmed: boolean;
  stops: StopItem[];
  outboundLeg: {
    vehicleId: string;
    mainDriver: string;
    coDriver: string;
    vet: string;
  };
  inboundLeg: {
    vehicleId: string;
    mainDriver: string;
    coDriver: string;
    vet: string;
  };
  flight?: {
    airline: string;
    flightNo: string;
    fromAirport: string;
    toAirport: string;
    departAt: string;
    arriveAt: string;
    stalls: number;
    cost: number;
    bookingRef: string;
  };
}

const INITIAL_TRIPS: MockTrip[] = [
  {
    id: 'TRP-20261120-0003',
    requestId: 'REQ-2026-003',
    customer: 'Saigon Racing Club',
    origin: 'Bình Dương, Việt Nam',
    destination: 'Tokyo, Nhật Bản',
    mode: 'AIR',
    transportDate: '2026-11-20',
    plannedDepart: '2026-11-20 06:00',
    eta: '2026-11-21 14:00',
    horses: 3,
    deploymentStatus: 'CONFIRMED',
    routeStatus: 'DRAFT',
    resourcesConfirmed: false,
    stops: [
      { id: 'st-1', name: 'Trang trại Bến Cát (Bình Dương)', type: 'ORIGIN', plannedAt: '2026-11-20T06:00' },
      { id: 'st-2', name: 'Trạm kiểm tra sinh hiệu Suối Tiên', type: 'REST_STOP', plannedAt: '2026-11-20T08:30' },
      { id: 'st-3', name: 'Cảng hàng không quốc tế Tân Sơn Nhất (SGN)', type: 'AIRPORT', plannedAt: '2026-11-20T11:00', cp: 'SGN' },
      { id: 'st-4', name: 'Sân bay quốc tế Narita (NRT)', type: 'AIRPORT', plannedAt: '2026-11-21T06:00', cp: 'NRT' },
      { id: 'st-5', name: 'Trường đua Fuchu (Tokyo)', type: 'DESTINATION', plannedAt: '2026-11-21T14:00' },
    ],
    outboundLeg: {
      vehicleId: 'VEH-02',
      mainDriver: 'DRV-01',
      coDriver: 'DRV-02',
      vet: 'VET-01',
    },
    inboundLeg: {
      vehicleId: 'VEH-JP-01',
      mainDriver: 'JP-DRV-01',
      coDriver: 'JP-DRV-02',
      vet: 'JP-VET-01',
    },
    flight: {
      airline: 'ANA Cargo Equine Express',
      flightNo: 'NH 8472',
      fromAirport: 'Sân bay Tân Sơn Nhất (SGN)',
      toAirport: 'Sân bay Quốc tế Narita (NRT)',
      departAt: '2026-11-20 23:30',
      arriveAt: '2026-11-21 06:45',
      stalls: 4,
      cost: 14500,
      bookingRef: 'ANA-EQ-99201',
    },
  },
  {
    id: 'TRP-20261125-0004',
    requestId: 'REQ-2026-004',
    customer: 'Phnom Penh Equestrian',
    origin: 'TP. Hồ Chí Minh',
    destination: 'Phnom Penh, Campuchia',
    mode: 'ROAD',
    transportDate: '2026-11-25',
    plannedDepart: '2026-11-25 05:00',
    eta: '2026-11-25 18:00',
    horses: 2,
    deploymentStatus: 'CONFIRMED',
    routeStatus: 'PENDING_APPROVAL',
    resourcesConfirmed: true,
    stops: [
      { id: 'st-10', name: 'Trang trại Củ Chi', type: 'ORIGIN', plannedAt: '2026-11-25T05:00' },
      { id: 'st-11', name: 'Trạm dừng nghỉ Trảng Bàng', type: 'REST_STOP', plannedAt: '2026-11-25T07:30' },
      { id: 'st-12', name: 'Cửa khẩu Quốc tế Mộc Bài', type: 'CHECKPOINT', plannedAt: '2026-11-25T09:00', cp: 'MOC_BAI' },
      { id: 'st-13', name: 'Trường đua Phnom Penh', type: 'DESTINATION', plannedAt: '2026-11-25T18:00' },
    ],
    outboundLeg: {
      vehicleId: 'VEH-01',
      mainDriver: 'DRV-01',
      coDriver: 'DRV-03',
      vet: 'VET-01',
    },
    inboundLeg: {
      vehicleId: 'VEH-01',
      mainDriver: 'DRV-01',
      coDriver: 'DRV-03',
      vet: 'VET-01',
    },
  },
];

const VEHICLES = [
  { id: 'VEH-01', plate: '51C-889.12', model: 'Scania Equine Air-Ride', stalls: 2, country: 'VN', base: 'TP. Hồ Chí Minh', status: 'READY', nextService: '2027-02-15' },
  { id: 'VEH-02', plate: '51D-334.09', model: 'Volvo Pro Horse Carrier', stalls: 6, country: 'VN', base: 'Bình Dương', status: 'READY', nextService: '2027-05-10' },
  { id: 'VEH-03', plate: '51E-992.11', model: 'Mercedes Actros Horse Cruiser', stalls: 4, country: 'VN', base: 'Đồng Nai', status: 'MAINTENANCE', nextService: '2026-10-30' },
  { id: 'VEH-JP-01', plate: 'TK-880-99', model: 'Isuzu Giga Horse Transporter (JP)', stalls: 4, country: 'JP', base: 'Narita / Tokyo', status: 'READY', nextService: '2027-08-01' },
  { id: 'VEH-KH-01', plate: 'PP-2-4412', model: 'Hino 500 Equine Box (KH)', stalls: 3, country: 'KH', base: 'Phnom Penh', status: 'READY', nextService: '2027-01-20' },
];

const EMPLOYEES = [
  { id: 'DRV-01', name: 'Nguyễn Văn Hùng', role: 'DRIVER', country: 'VN', phone: '0903 112 233', certExpiry: '2028-12-31' },
  { id: 'DRV-02', name: 'Trần Đình Trọng', role: 'DRIVER', country: 'VN', phone: '0918 445 566', certExpiry: '2027-08-15' },
  { id: 'DRV-03', name: 'Phạm Minh Tuấn', role: 'DRIVER', country: 'VN', phone: '0977 889 900', certExpiry: '2028-04-10' },
  { id: 'VET-01', name: 'BS. Lê Hoàng Nam', role: 'VETERINARIAN', country: 'VN', phone: '0933 667 788', certExpiry: '2027-12-31' },
  { id: 'JP-DRV-01', name: 'Kenji Takahashi', role: 'DRIVER', country: 'JP', phone: '+81 90 1234 5678', certExpiry: '2029-05-20' },
  { id: 'JP-DRV-02', name: 'Daiki Sato', role: 'DRIVER', country: 'JP', phone: '+81 90 9876 5432', certExpiry: '2028-10-15' },
  { id: 'JP-VET-01', name: 'Dr. Yumi Tanaka', role: 'VETERINARIAN', country: 'JP', phone: '+81 80 5555 4321', certExpiry: '2028-04-30' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const CoordinatorPortal: React.FC<{ isEmbedded?: boolean }> = () => {
  // Navigation states
  const [activeNav, setActiveNav] = useState<'dashboard' | 'trips' | 'fleet' | 'crew' | 'flights' | 'active' | 'incidents'>('dashboard');
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
    coordinatorApi.getDashboard().then((res) => {
      if (res && res.success) {
        // Connected to backend successfully
      }
    }).catch(() => {
      // Running standalone / mock mode
    });
  }, []);

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

  const handleSetGroundCrew = (leg: 'outbound' | 'inbound', role: 'mainDriver' | 'coDriver' | 'vet', staffId: string) => {
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
  // RENDER: TOPBAR & TITLE
  // --------------------------------------------------------------------------
  const getPageTitle = () => {
    switch (activeNav) {
      case 'dashboard': return 'Dashboard';
      case 'trips': return selectedTripId ? `Trip ${curTrip.id}` : 'Trip Planning';
      case 'fleet': return 'Fleet';
      case 'crew': return 'Crew Assignments';
      case 'flights': return 'Flights';
      case 'active': return 'Active Trips';
      case 'incidents': return 'Incidents';
      default: return 'Fleet & Route Coordinator';
    }
  };

  // --------------------------------------------------------------------------
  // RENDER: DASHBOARD VIEW (Matching fDashboard in reference)
  // --------------------------------------------------------------------------
  const renderDashboardView = () => {
    const toRoute = trips.filter((t) => t.routeStatus === 'DRAFT');
    const pending = trips.filter((t) => t.routeStatus === 'PENDING_APPROVAL');
    const returned = trips.filter((t) => t.routeStatus === 'RETURNED');
    const missing = trips.filter((t) => !t.resourcesConfirmed);
    const readyVehicles = VEHICLES.filter((v) => v.status === 'READY');

    return (
      <div>
        <div className="head">
          <div>
            <h2 className="page-title">{lang === 'vi' ? 'Xin chào, Quân' : 'Hello, Quan'}</h2>
            <p className="subtitle">{lang === 'vi' ? 'Lộ trình, phương tiện và tổ vận hành cho các chuyến đã triển khai.' : 'Routes, vehicles and crews for deployed trips.'}</p>
          </div>
        </div>

        {/* 6 Stat Cards (.stats.six) */}
        <div className="stats six">
          <button className={`stat card ${toRoute.length ? 'warn' : ''}`} onClick={() => { setActiveNav('trips'); }}>
            <span className="label"><Icon name="map" />Chờ lập tuyến</span>
            <b>{toRoute.length}</b>
            <small>{toRoute.length} bản thảo đang soạn</small>
          </button>

          <button className="stat card" onClick={() => setActiveNav('trips')}>
            <span className="label"><Icon name="clock" />Tuyến chờ duyệt</span>
            <b>{pending.length}</b>
            <small>Chờ Logistics Manager</small>
          </button>

          <button className={`stat card ${returned.length ? 'bad' : ''}`} onClick={() => setActiveNav('trips')}>
            <span className="label"><Icon name="alert" />Tuyến bị trả về</span>
            <b>{returned.length}</b>
            <small>{returned.length ? 'Cần chỉnh sửa lại' : 'Không có tuyến trả về'}</small>
          </button>

          <button className={`stat card ${missing.length ? 'bad' : ''}`} onClick={() => setActiveNav('trips')}>
            <span className="label"><Icon name="truck" />Chưa chốt nguồn lực</span>
            <b>{missing.length}</b>
            <small>Xe hoặc nhân sự chưa đủ</small>
          </button>

          <button className="stat card" onClick={() => setActiveNav('active')}>
            <span className="label"><Icon name="pin" />Chuyến hoạt động</span>
            <b>{trips.length}</b>
            <small>1 đang chạy • 1 sẵn sàng</small>
          </button>

          <button className="stat card" onClick={() => setActiveNav('fleet')}>
            <span className="label"><Icon name="truck" />Xe sẵn sàng</span>
            <b>{readyVehicles.length}/{VEHICLES.length}</b>
            <small>1 xe đang bảo dưỡng</small>
          </button>
        </div>

        {/* Main Grid: Planning Table + Sidebar Stack */}
        <div className="grid-main">
          <div className="stack">
            <div className="card pad">
              <div className="section-title">
                <h3 className="card-title">Phân công điều phối kế hoạch</h3>
                <button className="link" onClick={() => setActiveNav('trips')}>Xem tất cả</button>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Chuyến đi</th>
                    <th>Tuyến vận chuyển</th>
                    <th>Ngày khởi hành</th>
                    <th>Tình trạng chuẩn bị</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((t) => (
                    <tr
                      key={t.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedTripId(t.id);
                        setActiveNav('trips');
                        setTripTab('resources');
                      }}
                    >
                      <td>
                        <b style={{ color: 'var(--ink)' }}>{t.id}</b>
                        <br />
                        <small style={{ color: 'var(--muted)' }}>{t.mode}</small>
                      </td>
                      <td>
                        <span>{t.origin} ➔ {t.destination}</span>
                        <br />
                        <small style={{ color: 'var(--muted)' }}>{t.horses} cá thể ngựa</small>
                      </td>
                      <td>{t.plannedDepart}</td>
                      <td>
                        <span className={`pill ${t.resourcesConfirmed ? 'READY' : 'PENDING'}`}>
                          {t.resourcesConfirmed ? '✓ Operations READY' : 'Thiếu nhân sự/xe'}
                        </span>
                        <br />
                        <span className={`pill ${t.routeStatus === 'APPROVED' ? 'APPROVED' : t.routeStatus === 'PENDING_APPROVAL' ? 'PENDING' : 'DRAFT'}`} style={{ marginTop: '4px' }}>
                          {t.routeStatus === 'APPROVED' ? 'Tuyến đã duyệt' : t.routeStatus === 'PENDING_APPROVAL' ? 'Chờ duyệt' : 'Bản thảo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="stack">
            {/* Attention Card */}
            <div className="card pad">
              <div className="section-title">
                <h3 className="card-title">Cần chú ý</h3>
                <span className="pill NOT_READY">2 mục</span>
              </div>
              <div className="alerts">
                <button className="alert-row bad" onClick={() => setActiveNav('trips')}>
                  <span className="dot"></span>
                  <div>
                    <b>Bố trí 2 chặng đường bộ TRP-20261120-0003</b>
                    <span>Chặng VN và JP cần 3 nhân sự độc lập và xác nhận nguồn lực.</span>
                  </div>
                </button>
                <button className="alert-row" onClick={() => setActiveNav('fleet')}>
                  <span className="dot"></span>
                  <div>
                    <b>Xe 51E-992.11 đang bảo dưỡng</b>
                    <span>Dự kiến hoàn thành bảo dưỡng ngày 2026-10-30.</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Demo Controls Card (Matching reference fDemoCard) */}
            <div className="card demo">
              <div className="eyebrow">Demo Controls</div>
              <p className="hint">
                Mô phỏng quyết định của Logistics Manager để kiểm tra quy trình điều phối.
              </p>
              <div className="btn-row">
                <button className="btn ghost sm" onClick={handleDemoDeploy}>Manager duyệt triển khai</button>
                <button className="btn ghost sm" onClick={handleDemoApprove}>Manager phê duyệt tuyến</button>
                <button className="btn ghost sm" onClick={handleDemoReturn}>Manager trả về sửa tuyến</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // RENDER: INDEPENDENT GROUND LEGS (Hai Chặng Đường Bộ Độc Lập)
  // Matching lines 7961-8050 of reference HTML
  // --------------------------------------------------------------------------
  const renderGroundLegCard = (leg: 'outbound' | 'inbound') => {
    const isOutbound = leg === 'outbound';
    const legData = isOutbound ? curTrip.outboundLeg : curTrip.inboundLeg;
    const country = isOutbound ? 'VN' : 'JP';
    const legLabel = isOutbound ? 'ROAD VN' : 'ROAD JP';
    const legTitle = isOutbound ? 'CHẶNG 1 · PRE-FLIGHT ROAD' : 'CHẶNG 2 · POST-FLIGHT ROAD';
    const legDesc = isOutbound ? 'Vận chuyển trước chuyến bay' : 'Vận chuyển sau chuyến bay';
    const routeText = isOutbound ? 'Trang trại Bến Cát (Bình Dương) ➔ Sân bay Tân Sơn Nhất (SGN)' : 'Sân bay Quốc tế Narita (NRT) ➔ Trường đua Fuchu (Tokyo)';

    const availableVehicles = VEHICLES.filter((v) => v.country === country && v.status === 'READY');
    const availableStaff = (role: string) => EMPLOYEES.filter((e) => e.country === country && (role === 'VETERINARIAN' ? e.role === 'VETERINARIAN' : e.role === 'DRIVER'));

    const selectedVehicleObj = VEHICLES.find((v) => v.id === legData.vehicleId);
    const vehicleOk = selectedVehicleObj && selectedVehicleObj.stalls >= curTrip.horses;
    const crewOk = legData.mainDriver && legData.coDriver && legData.vet && legData.mainDriver !== legData.coDriver;
    const legOk = vehicleOk && crewOk;

    return (
      <section className="cbn-road-leg" key={leg}>
        <header className="cbn-road-head">
          <div>
            <div className="eyebrow">{legTitle}</div>
            <h3>{legLabel} – {legDesc}</h3>
            <div className="cbn-road-route">
              <span>{routeText}</span>
            </div>
            <p className="subtitle" style={{ fontSize: '11px', marginTop: '6px' }}>
              Quốc gia: <b>{country}</b> • Số ngựa: <b>{curTrip.horses} cá thể</b> • Hạn CCHN Bác sĩ thú y hợp lệ
            </p>
          </div>
          <span className={`pill ${legOk ? 'READY' : 'PENDING'}`}>
            {legOk ? 'Đã đủ nguồn lực' : 'Chưa đầy đủ nguồn lực'}
          </span>
        </header>

        <div className="cbn-road-grid">
          {/* Card Xe vận chuyển */}
          <div className="card cbn-road-card">
            <div className="section-title">
              <h4 className="card-title">Xe vận chuyển chuyên dụng</h4>
              <span className={`pill ${vehicleOk ? 'READY' : 'NOT_READY'}`}>
                {vehicleOk ? 'Hợp lệ' : 'Chưa đạt'}
              </span>
            </div>

            {selectedVehicleObj && (
              <div className="cbn-road-selected">
                <span>Xe đang phân công:</span>
                <b>{selectedVehicleObj.plate} ({selectedVehicleObj.model})</b>
                <small>{selectedVehicleObj.stalls} khoang stalls chuyên dụng • Đầy đủ đệm khí giảm chấn</small>
              </div>
            )}

            <div style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Chọn xe tại {country}:</span>
              {availableVehicles.map((v) => (
                <div key={v.id} className="cbn-road-vrow">
                  <div className="grow">
                    <b>{v.plate}</b>
                    <p>{v.model} • {v.stalls} ngăn • {v.base}</p>
                    <small>Sức chứa: {v.stalls >= curTrip.horses ? `Đủ cho ${curTrip.horses} ngựa` : `Không đủ (${v.stalls} ngăn)`}</small>
                  </div>
                  <button
                    className={`btn ${legData.vehicleId === v.id ? 'soft' : 'solid'} sm`}
                    disabled={legData.vehicleId === v.id}
                    onClick={() => handleSetGroundVehicle(leg, v.id)}
                  >
                    {legData.vehicleId === v.id ? 'Đang chọn' : 'Phân công'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Card Tổ nhân sự */}
          <div className="card cbn-road-card">
            <div className="section-title">
              <h4 className="card-title">Tổ nhân sự vận hành (3 vị trí bắt buộc)</h4>
              <span className={`pill ${crewOk ? 'READY' : 'NOT_READY'}`}>
                {crewOk ? 'Đủ 3 vị trí' : 'Chưa đủ'}
              </span>
            </div>
            <p className="subtitle" style={{ fontSize: '11px' }}>
              Ba nhân sự riêng biệt, đúng quốc gia, không trùng lịch; chứng chỉ thú y còn hiệu lực.
            </p>

            <div className="cbn-road-staff">
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                  Tài xế chính (Main Driver) *
                </label>
                <select
                  value={legData.mainDriver}
                  onChange={(e) => handleSetGroundCrew(leg, 'mainDriver', e.target.value)}
                >
                  <option value="">— Chọn tài xế chính —</option>
                  {availableStaff('DRIVER').map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                  Phụ lái kiêm Escort chăm sóc (Co-Driver) *
                </label>
                <select
                  value={legData.coDriver}
                  onChange={(e) => handleSetGroundCrew(leg, 'coDriver', e.target.value)}
                >
                  <option value="">— Chọn phụ lái —</option>
                  {availableStaff('DRIVER').map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                  {isOutbound ? 'Bác sĩ thú y A (Origin Vet) *' : 'Bác sĩ thú y B (Destination Vet) *'}
                </label>
                <select
                  value={legData.vet}
                  onChange={(e) => handleSetGroundCrew(leg, 'vet', e.target.value)}
                >
                  <option value="">— Chọn bác sĩ thú y —</option>
                  {availableStaff('VETERINARIAN').map((e) => (
                    <option key={e.id} value={e.id}>{e.name} (Hạn CCHN: {e.certExpiry})</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="cbn-road-note">
              {isOutbound
                ? 'Tại sân bay xuất phát, Bác sĩ thú y A phối hợp kiểm tra sức khỏe và bàn giao ngựa cùng hồ sơ kiểm dịch cho đơn vị hàng không.'
                : 'Sau khi máy bay hạ cánh và làm thủ tục kiểm dịch, Bác sĩ thú y B tiếp nhận ngựa và hồ sơ y tế từ đơn vị hàng không để chuyển lên xe về trường đua.'}
            </p>
          </div>
        </div>

        <details className="cbn-road-history">
          <summary>Lịch sử phân công chặng đường bộ ({country})</summary>
          <div className="cbn-road-log">
            <b>Khởi tạo dữ liệu chặng</b> • 2026-10-17 14:00 • Dang Minh Quan
            <p>Phương tiện và nhân sự được thiết lập tự động từ lịch điều phối dự kiến.</p>
          </div>
        </details>
      </section>
    );
  };

  // --------------------------------------------------------------------------
  // RENDER: TRIP PLANNING STUDIO (fTrip tabs)
  // --------------------------------------------------------------------------
  const renderTripStudio = () => {
    return (
      <div>
        <button className="link back" onClick={() => setSelectedTripId('')}>
          ← {lang === 'vi' ? 'Quay lại danh sách Trip Planning' : 'Back to Trip Planning'}
        </button>

        <div className="head">
          <div>
            <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {curTrip.id}
              <span className={`pill ${curTrip.deploymentStatus === 'CONFIRMED' ? 'READY' : 'PENDING'}`}>
                {curTrip.deploymentStatus}
              </span>
            </h2>
            <p className="subtitle">
              {curTrip.requestId} • {curTrip.origin} ➔ {curTrip.destination} • {curTrip.mode} • Khởi hành: {curTrip.plannedDepart}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span className={`pill ${curTrip.resourcesConfirmed ? 'READY' : 'NOT_READY'}`}>
              {curTrip.resourcesConfirmed ? '✓ Planning complete' : 'Chưa hoàn tất nguồn lực'}
            </span>
          </div>
        </div>

        {/* Tab switcher: Overview, Route, Vehicle & crew, Flight, Milestones */}
        <div className="rtabs">
          <button className={tripTab === 'overview' ? 'on' : ''} onClick={() => setTripTab('overview')}>
            Overview
          </button>
          <button className={tripTab === 'route' ? 'on' : ''} onClick={() => setTripTab('route')}>
            Route ({curTrip.stops.length} stops)
          </button>
          <button className={tripTab === 'resources' ? 'on' : ''} onClick={() => setTripTab('resources')}>
            Vehicle & crew (2 Chặng Độc Lập)
          </button>
          {curTrip.mode === 'AIR' && (
            <button className={tripTab === 'flight' ? 'on' : ''} onClick={() => setTripTab('flight')}>
              Flight Charter
            </button>
          )}
          <button className={tripTab === 'milestones' ? 'on' : ''} onClick={() => setTripTab('milestones')}>
            Milestones & Bản đồ
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {tripTab === 'overview' && (
          <div className="grid-main">
            <div className="stack">
              <div className="card pad">
                <h3 className="card-title" style={{ marginBottom: '16px' }}>Trip overview</h3>
                <div className="kv2">
                  <div className="kv-item"><span>Mã chuyến đi:</span><strong>{curTrip.id}</strong></div>
                  <div className="kv-item"><span>Yêu cầu vận chuyển:</span><strong>{curTrip.requestId}</strong></div>
                  <div className="kv-item"><span>Khách hàng:</span><strong>{curTrip.customer}</strong></div>
                  <div className="kv-item"><span>Phương thức:</span><strong>{curTrip.mode}</strong></div>
                  <div className="kv-item"><span>Số lượng ngựa:</span><strong>{curTrip.horses} cá thể</strong></div>
                  <div className="kv-item"><span>Ngày khởi hành:</span><strong>{curTrip.plannedDepart}</strong></div>
                  <div className="kv-item"><span>Dự kiến đến (ETA):</span><strong>{curTrip.eta}</strong></div>
                  <div className="kv-item"><span>Phê duyệt tuyến:</span><strong>{curTrip.routeStatus}</strong></div>
                </div>
              </div>

              <div className="card pad">
                <h3 className="card-title">Bước xử lý tiếp theo</h3>
                <p className="subtitle" style={{ margin: '8px 0 16px' }}>
                  {!curTrip.resourcesConfirmed
                    ? 'Coordinator cần kiểm tra xe và 3 nhân sự độc lập cho từng chặng, sau đó bấm Xác nhận nguồn lực.'
                    : curTrip.routeStatus === 'DRAFT'
                    ? 'Nguồn lực đã sẵn sàng. Hãy nộp tuyến đường cho Logistics Manager phê duyệt.'
                    : curTrip.routeStatus === 'PENDING_APPROVAL'
                    ? 'Tuyến đang chờ Logistics Manager phê duyệt.'
                    : 'Tuyến đã được phê duyệt! Sẵn sàng xuất phát khi đến ngày.'}
                </p>
                <div className="btn-row">
                  <button className="btn solid" onClick={() => setTripTab('resources')}>Mở tab Xe & Nhân sự</button>
                  <button className="btn ghost" onClick={() => setTripTab('route')}>Xem Lộ trình</button>
                </div>
              </div>
            </div>

            <div className="stack">
              <div className="card pad">
                <div className="eyebrow">Điểm nhận & Bàn giao</div>
                <div style={{ marginTop: '12px' }}>
                  <b style={{ color: 'var(--ink)' }}>Nơi xuất phát:</b>
                  <p style={{ margin: '4px 0 12px', color: 'var(--text)' }}>{curTrip.origin}</p>
                  <b style={{ color: 'var(--ink)' }}>Điểm đến:</b>
                  <p style={{ margin: '4px 0', color: 'var(--text)' }}>{curTrip.destination}</p>
                </div>
              </div>

              {/* Demo Controls Card */}
              <div className="card demo">
                <div className="eyebrow">Demo Controls</div>
                <div className="btn-row">
                  <button className="btn ghost sm" onClick={handleDemoDeploy}>Manager duyệt triển khai</button>
                  <button className="btn ghost sm" onClick={handleDemoApprove}>Manager duyệt tuyến</button>
                  <button className="btn ghost sm" onClick={handleDemoReturn}>Manager trả về sửa</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ROUTE */}
        {tripTab === 'route' && (
          <div className="grid-main">
            <div className="stack">
              <div className="card pad">
                <div className="section-title">
                  <h3 className="card-title">Lộ trình & Các trạm dừng (Route stops)</h3>
                  <span className={`pill ${curTrip.routeStatus === 'APPROVED' ? 'APPROVED' : 'DRAFT'}`}>
                    v1 • {curTrip.routeStatus}
                  </span>
                </div>

                <ul className="stop-list">
                  {curTrip.stops.map((stop, index) => (
                    <li key={stop.id}>
                      <span className="stop-badge" style={{ background: index === 0 ? '#16a34a' : index === curTrip.stops.length - 1 ? '#dc2626' : '#2563eb' }}>
                        {index + 1}
                      </span>
                      <div className="stop-edit">
                        <input value={stop.name} readOnly />
                        <select value={stop.type} disabled>
                          <option value="ORIGIN">Origin</option>
                          <option value="REST_STOP">Rest Stop</option>
                          <option value="CHECKPOINT">Checkpoint</option>
                          <option value="AIRPORT">Airport</option>
                          <option value="DESTINATION">Destination</option>
                        </select>
                        <input type="datetime-local" value={stop.plannedAt} readOnly />
                        <span style={{ fontSize: '11px', color: 'var(--muted)', alignSelf: 'center' }}>{stop.cp || 'Trạm thường'}</span>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="btn-row" style={{ marginTop: '16px' }}>
                  <button className="btn solid" disabled={curTrip.routeStatus === 'PENDING_APPROVAL' || curTrip.routeStatus === 'APPROVED'} onClick={handleSubmitRoute}>
                    {curTrip.routeStatus === 'PENDING_APPROVAL' ? '⏳ Đang chờ Manager phê duyệt' : curTrip.routeStatus === 'APPROVED' ? '✓ Tuyến đã được phê duyệt' : 'Nộp tuyến cho Manager phê duyệt'}
                  </button>
                </div>
              </div>
            </div>

            <div className="stack">
              <div className="card pad">
                <div className="eyebrow">Quy tắc lập lộ trình</div>
                <ul style={{ margin: '10px 0 0 16px', fontSize: '12px', lineHeight: '1.8', color: 'var(--muted)' }}>
                  <li>Điểm đầu tiên là Nơi nhận và điểm cuối là Điểm giao ngựa.</li>
                  <li>Thời gian các trạm dừng phải tăng dần theo chiều tiến của chuyến đi.</li>
                  <li>Đường hàng không: một chuyến bay thẳng, gồm đúng 2 trạm sân bay kết nối.</li>
                  <li>Mỗi chặng đường bộ dài trên 4 tiếng phải có trạm dừng nghỉ ngơi & tiếp nước.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VEHICLE & CREW (Hai chặng đường bộ độc lập) */}
        {tripTab === 'resources' && (
          <div>
            {curTrip.mode === 'AIR' && (
              <div className="cbn-air-strip">
                <b>Phương án B – Đường bộ trước/sau chuyến bay:</b> Mỗi chặng có một xe, tài xế chính, phụ lái kiêm Escort và bác sĩ thú y riêng. Bác sĩ A bàn giao tại sân bay đi; bác sĩ B nhận bàn giao tại sân bay đến. <b>Hãng hàng không thuê ngoài</b> bố trí nhân sự chăm sóc ngựa và phương án hỗ trợ thú y trên máy bay, không yêu cầu bác sĩ CBN bay cùng.
              </div>
            )}

            <div className="cbn-road-stack">
              {renderGroundLegCard('outbound')}
              {curTrip.mode === 'AIR' && renderGroundLegCard('inbound')}
            </div>

            {/* Khối Xác nhận điều phối Operations READY */}
            <div className="card pad" style={{ marginTop: '20px' }}>
              <div className="section-title">
                <h3 className="card-title">Xác nhận bố trí phương tiện & nhân sự</h3>
                <span className={`pill ${curTrip.resourcesConfirmed ? 'READY' : 'PENDING'}`}>
                  {curTrip.resourcesConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận'}
                </span>
              </div>
              <p className="subtitle">
                Coordinator chịu trách nhiệm chọn xe đủ chỗ và đủ 3 vị trí nhân sự cho mỗi chặng đường bộ. Logistics Manager sẽ kiểm tra chứng chỉ trước khi phê duyệt khởi hành.
              </p>

              <div className="btn-row" style={{ marginTop: '16px' }}>
                <button
                  className={`btn ${curTrip.resourcesConfirmed ? 'soft' : 'solid'}`}
                  disabled={curTrip.resourcesConfirmed}
                  onClick={handleConfirmResources}
                >
                  {curTrip.resourcesConfirmed ? '✓ Đã xác nhận nguồn lực (Operations READY)' : 'Xác nhận nguồn lực (Operations READY)'}
                </button>

                <button
                  className="btn solid"
                  disabled={!curTrip.resourcesConfirmed || curTrip.routeStatus !== 'DRAFT'}
                  onClick={handleSubmitRoute}
                >
                  Gửi Kế Hoạch Cho Logistics Manager Phê Duyệt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FLIGHT CHARTER */}
        {tripTab === 'flight' && curTrip.flight && (
          <div className="grid-main">
            <div className="stack">
              <div className="card pad">
                <div className="section-title">
                  <h3 className="card-title">Chi tiết chuyến bay thuê chuyến (Charter Flight)</h3>
                  <span className="pill READY">BOOKED</span>
                </div>
                <div className="kv2" style={{ marginTop: '12px' }}>
                  <div className="kv-item"><span>Hãng hàng không:</span><strong>{curTrip.flight.airline}</strong></div>
                  <div className="kv-item"><span>Số hiệu chuyến bay:</span><strong>{curTrip.flight.flightNo}</strong></div>
                  <div className="kv-item"><span>Sân bay đi:</span><strong>{curTrip.flight.fromAirport}</strong></div>
                  <div className="kv-item"><span>Sân bay đến:</span><strong>{curTrip.flight.toAirport}</strong></div>
                  <div className="kv-item"><span>Giờ cất cánh:</span><strong>{curTrip.flight.departAt}</strong></div>
                  <div className="kv-item"><span>Giờ hạ cánh:</span><strong>{curTrip.flight.arriveAt}</strong></div>
                  <div className="kv-item"><span>Chi phí thuê:</span><strong style={{ color: 'var(--orange-text)' }}>${curTrip.flight.cost.toLocaleString()} USD</strong></div>
                  <div className="kv-item"><span>Mã đặt chỗ:</span><strong>{curTrip.flight.bookingRef}</strong></div>
                </div>
              </div>
            </div>

            <div className="stack">
              <div className="card pad">
                <div className="eyebrow">Quy tắc hàng không</div>
                <p className="subtitle" style={{ fontSize: '12px', lineHeight: '1.7' }}>
                  Bay thẳng, không quá cảnh. Dịch vụ chuyên dụng của hãng bay bố trí chuồng bay (jet stalls) có điều áp, quạt thông gió và nhân viên chăm sóc đi cùng trên khoang hàng.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MILESTONES & LIVE MAP MONITORING */}
        {tripTab === 'milestones' && (
          <div className="card pad">
            <div className="section-title">
              <h3 className="card-title">Giám sát vị trí thời gian thực & Lộ trình (Live Map)</h3>
              <span className="pill IN_TRANSIT">● Live Telemetry</span>
            </div>
            <p className="subtitle">Mô phỏng dữ liệu tọa độ GPS phương tiện và trạm dừng từ Backend API.</p>

            <div className="map-layout">
              <div className="map-view">
                <div className="map-polyline"></div>

                {curTrip.stops.map((s, idx) => {
                  const leftPercent = 12 + (idx * 76) / (curTrip.stops.length - 1 || 1);
                  return (
                    <div key={s.id} className="map-marker" style={{ left: `${leftPercent}%` }}>
                      <div className="marker-icon" style={{ borderColor: idx === 0 ? '#16a34a' : idx === curTrip.stops.length - 1 ? '#dc2626' : '#2563eb' }}>
                        {idx === 0 ? '📍' : idx === curTrip.stops.length - 1 ? '🏁' : s.type === 'AIRPORT' ? '✈️' : '🅿️'}
                      </div>
                      <span className="marker-label">{s.name.split('(')[0].trim()}</span>
                    </div>
                  );
                })}

                <div className="map-truck" title="Xe đang di chuyển">
                  🚛
                </div>
              </div>

              <div className="map-data-panel">
                <div style={{ color: '#93c5fd', marginBottom: '8px', fontWeight: 600 }}>🛰️ GPS DATA STREAM</div>
                <pre style={{ margin: 0 }}>
{`vehiclePosition = {
  lat: ${truckPos.lat.toFixed(4)},
  lng: ${truckPos.lng.toFixed(4)},
  status: "Moving • 65 km/h",
  temp: "19.5°C (Chấn động êm)",
  tripId: "${curTrip.id}"
}`}
                </pre>
                <div style={{ color: '#fcd34d', margin: '14px 0 6px', fontWeight: 600 }}>MỐC HÀNH TRÌNH:</div>
                <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6' }}>
                  {curTrip.stops.map((s, i) => (
                    <div key={s.id}>
                      [{i + 1}] {s.plannedAt.replace('T', ' ')} • {s.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // RENDER: FLEET VIEW (fFleet)
  // --------------------------------------------------------------------------
  const renderFleetView = () => (
    <div>
      <div className="head">
        <div>
          <h2 className="page-title">Fleet</h2>
          <p className="subtitle">Phương tiện chuyên dụng vận chuyển ngựa đua, tính khả dụng và lịch bảo dưỡng.</p>
        </div>
      </div>

      <div className="card pad" style={{ marginTop: '16px' }}>
        <table>
          <thead>
            <tr>
              <th>Biển số xe</th>
              <th>Dòng xe / Cấu hình</th>
              <th>Số ngăn (Stalls)</th>
              <th>Quốc gia / Trạm đỗ</th>
              <th>Lịch bảo dưỡng tiếp theo</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {VEHICLES.map((v) => (
              <tr key={v.id}>
                <td><b style={{ color: 'var(--ink)' }}>{v.plate}</b></td>
                <td>{v.model}</td>
                <td><b style={{ color: 'var(--orange-text)' }}>{v.stalls} khoang</b></td>
                <td>{v.country} • {v.base}</td>
                <td>{v.nextService}</td>
                <td>
                  <span className={`pill ${v.status === 'READY' ? 'READY' : 'NOT_READY'}`}>
                    {v.status === 'READY' ? 'Khả dụng' : 'Bảo dưỡng'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // RENDER: CREW VIEW (fCrew)
  // --------------------------------------------------------------------------
  const renderCrewView = () => (
    <div>
      <div className="head">
        <div>
          <h2 className="page-title">Crew Assignments</h2>
          <p className="subtitle">Đội ngũ tài xế đường bộ và bác sĩ thú y hộ tống chuyên môn cao.</p>
        </div>
      </div>

      <div className="card pad" style={{ marginTop: '16px' }}>
        <table>
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Chức danh tác nghiệp</th>
              <th>Quốc gia</th>
              <th>Số điện thoại</th>
              <th>Thời hạn chứng chỉ hành nghề</th>
              <th>Tình trạng</th>
            </tr>
          </thead>
          <tbody>
            {EMPLOYEES.map((e) => (
              <tr key={e.id}>
                <td><b style={{ color: 'var(--ink)' }}>{e.name}</b></td>
                <td>
                  <span className={`pill ${e.role === 'VETERINARIAN' ? 'ok' : 'transit'}`}>
                    {e.role === 'VETERINARIAN' ? 'Bác sĩ thú y' : 'Tài xế quốc tế'}
                  </span>
                </td>
                <td>{e.country}</td>
                <td>{e.phone}</td>
                <td>{e.certExpiry}</td>
                <td><span className="pill READY">Sẵn sàng</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // RENDER: SIMPLE TAB (Flights / Active / Incidents)
  // --------------------------------------------------------------------------
  const renderIncidentsView = () => (
    <div>
      <div className="head">
        <div>
          <h2 className="page-title">Incidents & Adjustments</h2>
          <p className="subtitle">Báo cáo sự cố trên đường và đề xuất phương án đổi tuyến hoặc thay xe / nhân sự.</p>
        </div>
      </div>
      <div className="card pad" style={{ marginTop: '16px' }}>
        <table>
          <thead>
            <tr>
              <th>Mã sự cố</th>
              <th>Chuyến đi</th>
              <th>Loại sự cố</th>
              <th>Mức độ</th>
              <th>Phương án đề xuất</th>
              <th>Tình trạng</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>INC-2026-001</b></td>
              <td>TRP-20261125-0004</td>
              <td>Ùn tắc cửa khẩu Bavet</td>
              <td><span className="pill pending">MEDIUM</span></td>
              <td>Dời giờ đến thêm 2 tiếng</td>
              <td><span className="pill PENDING">Chờ Manager duyệt</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // MAIN LAYOUT
  // --------------------------------------------------------------------------
  return (
    <div className="cbn-coordinator-app">
      {/* SIDEBAR (208px fixed) */}
      <aside className="sidebar">
        <div className="brand" onClick={() => { setActiveNav('dashboard'); setSelectedTripId(''); }}>
          CBN Transport
        </div>
        <div className="role-chip">
          <b>Fleet &amp; Route Coordinator</b>
          <span>Hệ thống điều phối</span>
        </div>

        <nav className="nav">
          <button className={activeNav === 'dashboard' ? 'active' : ''} onClick={() => { setActiveNav('dashboard'); setSelectedTripId(''); }}>
            <Icon name="home" /> Dashboard
          </button>
          <button className={activeNav === 'trips' ? 'active' : ''} onClick={() => { setActiveNav('trips'); setSelectedTripId('TRP-20261120-0003'); }}>
            <Icon name="map" /> Trip Planning
            <span className="badge-count">2</span>
          </button>
          <button className={activeNav === 'fleet' ? 'active' : ''} onClick={() => { setActiveNav('fleet'); setSelectedTripId(''); }}>
            <Icon name="truck" /> Fleet
          </button>
          <button className={activeNav === 'crew' ? 'active' : ''} onClick={() => { setActiveNav('crew'); setSelectedTripId(''); }}>
            <Icon name="users" /> Crew Assignments
          </button>
          <button className={activeNav === 'flights' ? 'active' : ''} onClick={() => { setActiveNav('trips'); setTripTab('flight'); }}>
            <Icon name="plane" /> Flights
          </button>
          <button className={activeNav === 'active' ? 'active' : ''} onClick={() => { setActiveNav('active'); }}>
            <Icon name="pin" /> Active Trips
          </button>
          <button className={activeNav === 'incidents' ? 'active' : ''} onClick={() => { setActiveNav('incidents'); setSelectedTripId(''); }}>
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

            <button className="icon-btn" aria-label="Notifications" title="Thông báo hệ thống">
              <span className="bell dot">
                <svg className="i"><path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0" /></svg>
              </span>
            </button>

            <button className="icon-btn">
              <span className="avatar">DQ</span>
              <span className="user-name">Dang Minh Quan</span>
              <Icon name="chev" />
            </button>
          </div>
        </header>

        {/* NOTIFICATION TOAST */}
        {toastMsg && (
          <div style={{ position: 'fixed', top: '74px', right: '32px', zIndex: 999, background: 'var(--ink)', color: '#fff', padding: '12px 18px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '13px' }}>
            {toastMsg}
          </div>
        )}

        {/* VIEW AREA */}
        <main className="view">
          {activeNav === 'dashboard' && renderDashboardView()}
          {activeNav === 'trips' && renderTripStudio()}
          {activeNav === 'fleet' && renderFleetView()}
          {activeNav === 'crew' && renderCrewView()}
          {activeNav === 'active' && (
            <div className="card pad">
              <div className="section-title">
                <h3 className="card-title">Giám sát các chuyến đang trên đường (Active Trips)</h3>
              </div>
              <p className="subtitle">Theo dõi vị trí xe tải chuyên dụng và các mốc kiểm tra sinh hiệu.</p>
              <div style={{ marginTop: '16px' }}>
                {renderTripStudio()}
              </div>
            </div>
          )}
          {activeNav === 'incidents' && renderIncidentsView()}
        </main>
      </div>
    </div>
  );
};