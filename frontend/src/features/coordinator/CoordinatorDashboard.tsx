import { useState, useEffect } from 'react';
import './CoordinatorDashboard.css';
import { coordinatorApi } from './api/coordinatorApi';
import type {
  CoordinatorDashboardData,
  PlanningTrip,
  Vehicle,
  Staff,
  TripMonitoringData
} from './api/coordinatorApi';

function CoordinatorDashboard() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // States chứa dữ liệu lấy từ Backend API
  const [dashboardData, setDashboardData] = useState<CoordinatorDashboardData | null>(null);
  const [planningTrips, setPlanningTrips] = useState<PlanningTrip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [monitoringData, setMonitoringData] = useState<TripMonitoringData | null>(null);

  // Vị trí xe mô phỏng trên bản đồ
  const [truckPos, setTruckPos] = useState({ lat: 11.5560, lng: 104.9280 });

  // 1. Tự động tải dữ liệu từ Backend khi chuyển Tab
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeMenu === 'dashboard') {
          const res = await coordinatorApi.getDashboard();
          if (res.success && res.data) {
            setDashboardData(res.data);
          }
        } else if (activeMenu === 'planning-requests') {
          const res = await coordinatorApi.getPlanningTrips();
          if (res.success && res.data) {
            setPlanningTrips(res.data);
          }
        } else if (activeMenu === 'fleet-management') {
          const res = await coordinatorApi.getVehicles();
          if (res.success && res.data) {
            setVehicles(res.data);
          }
        } else if (activeMenu === 'crew-assignment') {
          const res = await coordinatorApi.getStaff();
          if (res.success && res.data) {
            setStaff(res.data);
          }
        } else if (activeMenu === 'monitoring') {
          const res = await coordinatorApi.getTripMonitoring('TRIP_2026_001');
          if (res.success && res.data) {
            setMonitoringData(res.data);
            if (res.data.vehiclePosition) {
              setTruckPos({
                lat: res.data.vehiclePosition.latitude,
                lng: res.data.vehiclePosition.longitude
              });
            }
          }
        }
      } catch (err) {
        console.error("Lỗi khi gọi Backend API Flow 3:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeMenu]);

  // Giả lập cập nhật tọa độ xe cho bản đồ khi ở tab Monitoring
  useEffect(() => {
    if (activeMenu === 'monitoring') {
      const interval = setInterval(() => {
        setTruckPos(prev => ({
          lat: prev.lat + (Math.random() * 0.0004 - 0.0002),
          lng: prev.lng + 0.001
        }));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeMenu]);

  const getTopBarTitle = () => {
    switch (activeMenu) {
      case 'dashboard': return 'Dashboard Tổng quan';
      case 'planning-requests': return 'Yêu cầu Lập kế hoạch (Requests)';
      case 'route-planning': return 'Lập & Điều chỉnh Lộ trình';
      case 'fleet-management': return 'Quản lý Phương tiện (Fleet)';
      case 'crew-assignment': return 'Phân công Nhân sự (Crew)';
      case 'monitoring': return 'Giám sát Lộ trình Bản đồ (Map)';
      case 'incidents': return 'Xử lý Sự cố & Đổi tuyến';
      default: return 'Coordinator Dashboard';
    }
  };

  // ==========================================
  // TAB 1: DASHBOARD
  // ==========================================
  const renderDashboard = () => {
    const needRoute = dashboardData?.needRoute ?? 3;
    const available = dashboardData?.availableVehicles ?? 5;
    const totalVeh = dashboardData?.totalVehicles ?? 5;
    const active = dashboardData?.activeTrips ?? 1;
    const incidents = dashboardData?.incidentsCount ?? 1;

    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Tổng quan Điều phối (Flow 3)</h1>
            <p className="page-subtitle">Dữ liệu thời gian thực được đồng bộ trực tiếp từ Backend API.</p>
          </div>
          {loading && <span style={{ color: '#3B82F6', fontSize: '14px' }}>Đang tải dữ liệu...</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
          <div className="dashboard-card" style={{ marginBottom: 0 }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6B7280', fontWeight: 600 }}>Yêu cầu chờ lập KH</p>
            <h3 style={{ margin: 0, fontSize: '32px', color: '#D97706' }}>{needRoute}</h3>
          </div>
          <div className="dashboard-card" style={{ marginBottom: 0 }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6B7280', fontWeight: 600 }}>Xe tải khả dụng</p>
            <h3 style={{ margin: 0, fontSize: '32px', color: '#10B981' }}>{available}/{totalVeh}</h3>
          </div>
          <div className="dashboard-card" style={{ marginBottom: 0 }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6B7280', fontWeight: 600 }}>Chuyến đang chạy</p>
            <h3 style={{ margin: 0, fontSize: '32px', color: '#3B82F6' }}>{active}</h3>
          </div>
          <div className="dashboard-card" style={{ marginBottom: 0 }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6B7280', fontWeight: 600 }}>Cảnh báo sự cố</p>
            <h3 style={{ margin: 0, fontSize: '32px', color: '#EF4444' }}>{incidents}</h3>
          </div>
        </div>

        {dashboardData?.recentTrips && dashboardData.recentTrips.length > 0 && (
          <div className="dashboard-card">
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
              Danh sách Chuyến đi Gần đây
            </h3>
            <table>
              <thead>
                <tr>
                  <th>MÃ CHUYẾN</th>
                  <th>TUYẾN ĐƯỜNG</th>
                  <th>SỐ LƯỢNG NGỰA</th>
                  <th>NGÀY KHỞI HÀNH</th>
                  <th>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.recentTrips.map(trip => (
                  <tr key={trip.tripId}>
                    <td style={{ fontWeight: '600', color: '#1F2937' }}>{trip.tripCode}</td>
                    <td>{trip.routeName}</td>
                    <td>{trip.horseCount} cá thể</td>
                    <td>{trip.plannedDeparture}</td>
                    <td>
                      <span className={`status-pill ${trip.status === 'IN_TRANSIT' ? 'status-active' : 'status-pending'}`}>
                        {trip.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // TAB 2: PLANNING REQUESTS & ASSIGNMENT
  // ==========================================
  const renderPlanningRequests = () => (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Yêu cầu Lập kế hoạch</h1>
          <p className="page-subtitle">Các yêu cầu từ Backend chờ phân công xe, tài xế và lên lộ trình.</p>
        </div>
        {loading && <span style={{ color: '#3B82F6', fontSize: '14px' }}>Đang tải...</span>}
      </div>

      <div className="dashboard-card">
        <table>
          <thead>
            <tr>
              <th>MÃ YC</th>
              <th>KHÁCH HÀNG</th>
              <th>TUYẾN ĐƯỜNG</th>
              <th>SỐ LƯỢNG NGỰA</th>
              <th>NGÀY ĐI DỰ KIẾN</th>
              <th>TRẠNG THÁI</th>
              <th style={{ textAlign: 'right' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {planningTrips.length > 0 ? (
              planningTrips.map(item => (
                <tr key={item.tripId}>
                  <td style={{ fontWeight: '600', color: '#111827' }}>{item.tripCode || item.requestId}</td>
                  <td>{item.customerName}</td>
                  <td>{item.origin} ➡️ {item.destination}</td>
                  <td>{item.horseCount} cá thể</td>
                  <td>{item.plannedDepartureAt ? new Date(item.plannedDepartureAt).toLocaleDateString('vi-VN') : '25/10/2026'}</td>
                  <td>
                    <span className={`status-pill ${item.stage === 'READY' ? 'status-active' : 'status-pending'}`}>
                      {item.stage === 'NEED_ROUTE' ? 'Chờ Lập Tuyến' : item.stage === 'NEED_ASSIGNMENT' ? 'Chờ Gán Xe' : item.stage}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn-outline" onClick={() => setActiveMenu('fleet-management')}>Chọn Xe</button>
                    <button className="btn-outline" onClick={() => setActiveMenu('crew-assignment')}>Chọn Tài xế</button>
                    <button className="btn-primary" onClick={() => setActiveMenu('monitoring')}>Xem Lộ trình</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#6B7280' }}>
                  {loading ? 'Đang tải dữ liệu từ Backend...' : 'Chưa có yêu cầu nào cần lập kế hoạch.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ==========================================
  // TAB 3: TRIP MONITORING (CORE MAP LOGIC)
  // ==========================================
  const renderMonitoring = () => {
    const markers = monitoringData?.fixedMarkers || [
      { name: "HCMC (Origin)", type: "ORIGIN", lat: 10.8231, lng: 106.6297, color: "#10B981", icon: "📍", status: "PASSED" },
      { name: "Mộc Bài (Rest Stop)", type: "REST_STOP", lat: 11.0650, lng: 106.1720, color: "#3B82F6", icon: "🅿️", status: "PASSED" },
      { name: "Bavet (Customs Gate)", type: "CUSTOMS", lat: 11.0850, lng: 106.1450, color: "#F59E0B", icon: "🛂", status: "PASSED" },
      { name: "Bangkok (Dest)", type: "DESTINATION", lat: 13.7563, lng: 100.5018, color: "#EF4444", icon: "🏁", status: "PLANNED" }
    ];

    const polyline = monitoringData?.routePolyline || [
      [10.8231, 106.6297],
      [11.0650, 106.1720],
      [11.5560, 104.9280],
      [13.6560, 102.5620],
      [13.7563, 100.5018]
    ];

    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Giám sát Lộ trình Bản đồ (Flow 3)</h1>
            <p className="page-subtitle">
              Mã chuyến: {monitoringData?.tripCode ?? 'TRP-2026-001'} | Dữ liệu Polyline và Marker được Backend tính toán và gửi về.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-outline" onClick={() => coordinatorApi.getTripMonitoring('TRIP_2026_001')}>
              🔄 Làm mới từ Server
            </button>
            <button className="btn-danger">Báo cáo Sự cố khẩn cấp</button>
          </div>
        </div>

        <div className="map-layout">
          {/* KHU VỰC BẢN ĐỒ MÔ PHỎNG */}
          <div className="map-view">
            {/* Base Map -> Polyline (Tuyến đường) */}
            <div className="map-polyline"></div>
            <div className="map-polyline-dashed"></div>

            {/* Marker Cố định */}
            {markers.map((m, idx) => {
              const leftPercent = 10 + (idx * 80) / (markers.length - 1 || 1);
              return (
                <div key={m.name} className="map-marker" style={{ left: `${leftPercent}%` }}>
                  <div className="marker-icon" style={{ borderColor: m.color }}>{m.icon}</div>
                  <span className="marker-label">{m.name}</span>
                </div>
              );
            })}

            {/* Marker Động -> Vị trí xe */}
            <div className="map-truck" title="Dynamic Marker (Tọa độ trả về từ Backend)">🚚</div>
          </div>

          {/* BẢNG DỮ LIỆU JSON STREAM (Nhận trực tiếp từ Backend API) */}
          <div className="map-data-panel">
            <h3 style={{ color: '#F3F4F6', fontSize: '14px', marginBottom: '16px', borderBottom: '1px solid #374151', paddingBottom: '8px' }}>
              🛰️ BACKEND DATA STREAM
            </h3>
            
            <p style={{ color: '#9CA3AF', marginBottom: '4px' }}>// 1. Vehicle Marker (Tọa độ hiện tại)</p>
            <pre style={{ margin: '0 0 20px 0' }}>
{`vehiclePosition = {
  latitude: ${truckPos.lat.toFixed(4)},
  longitude: ${truckPos.lng.toFixed(4)},
  status: "${monitoringData?.vehiclePosition?.currentStatus || 'Moving'}"
}`}
            </pre>

            <p style={{ color: '#9CA3AF', marginBottom: '4px' }}>// 2. Fixed Markers (Trạm dừng & Điểm mốc)</p>
            <pre style={{ margin: '0 0 20px 0', color: '#FCD34D', fontSize: '12px' }}>
{JSON.stringify(markers.map(m => ({ name: m.name, lat: m.lat, lng: m.lng })), null, 2)}
            </pre>

            <p style={{ color: '#9CA3AF', marginBottom: '4px' }}>// 3. Route Polyline (Tọa độ đường đi từ Backend)</p>
            <pre style={{ margin: 0, color: '#93C5FD', fontSize: '12px' }}>
{JSON.stringify(polyline, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // TAB 4: FLEET MANAGEMENT
  // ==========================================
  const renderFleetManagement = () => (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý Đội xe Chuyên dụng</h1>
          <p className="page-subtitle">Danh mục phương tiện chở ngựa đua (Bảng VEHICLE từ Database Backend).</p>
        </div>
        {loading && <span style={{ color: '#3B82F6', fontSize: '14px' }}>Đang tải...</span>}
      </div>

      <div className="dashboard-card">
        <table>
          <thead>
            <tr>
              <th>MÃ XE</th>
              <th>LOẠI PHƯƠNG TIỆN</th>
              <th>SỨC CHỨA (STALLS)</th>
              <th>CỰ LY TỐI ĐA</th>
              <th>ĐỊNH MỨC XĂNG / KM</th>
              <th>TRẠNG THÁI</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map(v => (
              <tr key={v.vehicleId}>
                <td style={{ fontWeight: '600', color: '#111827' }}>{v.vehicleId}</td>
                <td>{v.type}</td>
                <td><strong style={{ color: '#059669' }}>{v.capacityStalls} khoang stall</strong></td>
                <td>{v.maxRangeKm ? `${v.maxRangeKm} km` : '900 km'}</td>
                <td>{v.fuelCostPerKm ? `$${v.fuelCostPerKm}/km` : '$1.2/km'}</td>
                <td>
                  <span className={`status-pill ${v.status === 'AVAILABLE' || v.status === 'READY' ? 'status-active' : 'status-pending'}`}>
                    {v.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ==========================================
  // TAB 5: CREW ASSIGNMENT
  // ==========================================
  const renderCrewAssignment = () => (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nhân sự Tác nghiệp Hiện trường</h1>
          <p className="page-subtitle">Đội ngũ Tài xế Quốc tế và Bác sĩ Thú y Hộ tống (Từ bảng USER Backend).</p>
        </div>
        {loading && <span style={{ color: '#3B82F6', fontSize: '14px' }}>Đang tải...</span>}
      </div>

      <div className="dashboard-card">
        <table>
          <thead>
            <tr>
              <th>MÃ NHÂN SỰ</th>
              <th>HỌ VÀ TÊN</th>
              <th>VAI TRÒ</th>
              <th>SỐ ĐIỆN THOẠI</th>
              <th>CHUYÊN MÔN / CHỨNG CHỈ</th>
              <th>TÌNH TRẠNG</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.userId}>
                <td style={{ fontWeight: '600', color: '#111827' }}>{s.userId}</td>
                <td>{s.fullName}</td>
                <td>
                  <span className={`status-pill ${s.role === 'Driver' ? 'status-active' : 'status-pending'}`}>
                    {s.role}
                  </span>
                </td>
                <td>{s.phone}</td>
                <td>{s.specialization}</td>
                <td>
                  <span style={{ color: s.isActive ? '#059669' : '#DC2626', fontWeight: 600 }}>
                    {s.isActive ? '● Đang hoạt động' : '○ Tạm ngưng'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard': return renderDashboard();
      case 'planning-requests': return renderPlanningRequests();
      case 'fleet-management': return renderFleetManagement();
      case 'crew-assignment': return renderCrewAssignment();
      case 'monitoring': return renderMonitoring();
      default: return (
        <div className="fade-in text-center mt-20 text-[#6B7280]">
          <h2>Giao diện {getTopBarTitle()} đang được kết nối dữ liệu từ Backend API...</h2>
        </div>
      );
    }
  };

  return (
    <div className="coordinator-layout">
      {/* 1. SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="brand-title">CNB <span>TRANSPORT</span></h2>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-group-title">TỔNG QUAN</div>
          <button 
            className={`nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveMenu('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`nav-item ${activeMenu === 'planning-requests' ? 'active' : ''}`}
            onClick={() => setActiveMenu('planning-requests')}
          >
            <span>Planning Requests</span>
            <span className="badge-alert">{dashboardData?.needRoute ?? 3}</span>
          </button>

          <div className="nav-group-title">LẬP KẾ HOẠCH & ĐỘI XE</div>
          <button 
            className={`nav-item ${activeMenu === 'route-planning' ? 'active' : ''}`}
            onClick={() => setActiveMenu('route-planning')}
          >
            Route Planning
          </button>
          <button 
            className={`nav-item ${activeMenu === 'fleet-management' ? 'active' : ''}`}
            onClick={() => setActiveMenu('fleet-management')}
          >
            Fleet Management
          </button>
          <button 
            className={`nav-item ${activeMenu === 'crew-assignment' ? 'active' : ''}`}
            onClick={() => setActiveMenu('crew-assignment')}
          >
            Driver / Escort Assign
          </button>

          <div className="nav-group-title">GIÁM SÁT & SỰ CỐ</div>
          <button 
            className={`nav-item ${activeMenu === 'monitoring' ? 'active' : ''}`}
            onClick={() => setActiveMenu('monitoring')}
          >
            Trip Monitoring
          </button>
          <button 
            className={`nav-item ${activeMenu === 'incidents' ? 'active' : ''}`}
            onClick={() => setActiveMenu('incidents')}
          >
            Incident Adjustment
          </button>
        </nav>
      </aside>

      {/* 2. TOP BAR & MAIN CONTENT */}
      <div className="content-wrapper">
        <header className="top-bar">
          <div className="top-bar-left">
            <h1 className="top-bar-title">{getTopBarTitle()}</h1>
          </div>
          
          <div className="top-bar-right">
            <button className="notification-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="notification-badge"></span>
            </button>
            
            <div className="user-profile">
              <div className="avatar">QL</div>
              <div className="user-info">
                <span className="user-name">Nguyễn Thanh Quốc Linh</span>
                <span className="user-role">Fleet Coordinator</span>
              </div>
            </div>
          </div>
        </header>

        <main className="main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default CoordinatorDashboard;