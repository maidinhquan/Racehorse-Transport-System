import { useState } from 'react';
import './ManagerDashboard.css';

function ManagerDashboard() {
  // Mock data: Số lượng đơn chờ duyệt
  const [pendingRequestsCount] = useState(3);

  // Mock data: Danh sách chuyến đi đang thực hiện
  const activeTrips = [
    { id: 'TRP-2026', route: 'Hồ Chí Minh - Tokyo', status: 'Đang di chuyển', horses: 4 },
    { id: 'TRP-2027', route: 'Hà Nội - Paris', status: 'Sẵn sàng khởi hành', horses: 2 },
  ];

  // Mock data: Danh sách yêu cầu vận chuyển chờ duyệt
  const pendingRequests = [
    { id: 'REQ-1001', customer: 'CLB Phù Đổng', date: '12/10/2026', route: 'Đà Lạt - HCM' },
    { id: 'REQ-1002', customer: 'Trại Ngựa ABC', date: '15/10/2026', route: 'HCM - Bangkok' },
    { id: 'REQ-1003', customer: 'Nguyễn Văn A', date: '16/10/2026', route: 'Hà Nội - Seoul' },
  ];

  return (
    <div className="manager-dashboard">
      <h1>Manager Dashboard</h1>

      <div className="dashboard-summary">
        <div className="summary-card">
          <h3>Yêu cầu chờ duyệt</h3>
          <p className="count">{pendingRequestsCount}</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="active-trips">
          <h2>Chuyến đi đang thực hiện</h2>
          <ul>
            {activeTrips.map(trip => (
              <li key={trip.id}>
                <strong>{trip.id}</strong>: {trip.route} - {trip.status} ({trip.horses} ngựa)
              </li>
            ))}
          </ul>
        </div>

        <div className="pending-requests">
          <h2>Yêu cầu vận chuyển</h2>
          <ul>
            {pendingRequests.map(req => (
              <li key={req.id}>
                <strong>{req.id}</strong>: {req.customer} ({req.date}) - {req.route}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
export default ManagerDashboard;
