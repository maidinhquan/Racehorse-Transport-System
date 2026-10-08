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
    // ... phần JSX giữ nguyên
  );
}