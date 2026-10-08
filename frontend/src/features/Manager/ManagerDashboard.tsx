import { useState } from 'react';
import './ManagerDashboard.css';

function ManagerDashboard() {
  /*// Mock data: Số lượng đơn chờ duyệt
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
  ];*/

  return (
    <div className="manager-layout font-inter bg-[#F8F9FA]">
      {/* SIDEBAR */}
      <aside className="sidebar bg-white border-r border-[#E5E7EB]">
        <div className="sidebar-header">
          <h2 className="text-[#F57C00] font-bold text-xl">HorseTrans</h2>
          <p className="text-xs text-[#6B7280]">Logistics Manager</p>
        </div>
        
        <nav className="sidebar-nav">
          <a href="#" className="nav-item active">Dashboard</a>
          
          {/* Mục Yêu cầu vận chuyển có Badge thông báo */}
          <a href="#" className="nav-item flex-between">
            <span>Yêu cầu vận chuyển</span>
            {pendingRequestsCount > 0 && (
              <span className="badge-danger">{pendingRequestsCount}</span>
            )}
          </a>
          
          <a href="#" className="nav-item">Quản lý Chuyến đi (Trips)</a>
          <a href="#" className="nav-item">Xử lý Sự cố (Incidents)</a>
          <a href="#" className="nav-item">Quản lý Khách hàng</a>
          <a href="#" className="nav-item">Báo cáo & Thống kê</a>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="page-header mb-6">
          <h1 className="text-2xl font-semibold text-[#111827]">Tổng quan Điều hành</h1>
          <p className="text-[#6B7280]">Theo dõi toàn bộ hoạt động vận chuyển và phê duyệt yêu cầu.</p>
        </header>

        {/* THỐNG KÊ NHANH */}
        <div className="stats-grid mb-8">
          <div className="stat-card bg-white border border-[#E5E7EB] shadow-sm rounded-xl p-5">
            <h3 className="text-[#6B7280] text-sm font-medium">Yêu cầu chờ duyệt</h3>
            <p className="text-3xl font-bold text-[#dc2626] mt-2">{pendingRequestsCount}</p>
          </div>
          <div className="stat-card bg-white border border-[#E5E7EB] shadow-sm rounded-xl p-5">
            <h3 className="text-[#6B7280] text-sm font-medium">Chuyến đang chạy</h3>
            <p className="text-3xl font-bold text-[#F57C00] mt-2">{activeTrips.length}</p>
          </div>
          <div className="stat-card bg-white border border-[#E5E7EB] shadow-sm rounded-xl p-5">
            <h3 className="text-[#6B7280] text-sm font-medium">Sự cố khẩn cấp (Mới)</h3>
            <p className="text-3xl font-bold text-[#111827] mt-2">0</p>
          </div>
        </div>

        <div className="grid-layout">
          {/* DANH SÁCH YÊU CẦU CHỜ DUYỆT */}
          <section className="dashboard-section bg-white border border-[#E5E7EB] shadow-sm rounded-xl p-5">
            <div className="section-header flex-between mb-4">
              <h2 className="text-lg font-semibold text-[#111827]">Yêu cầu cần phê duyệt</h2>
              <button className="text-[#F57C00] text-sm font-medium hover:underline">Xem tất cả</button>
            </div>
            <div className="table-container">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-[#6B7280] text-sm">
                    <th className="pb-3 font-medium">Mã YC</th>
                    <th className="pb-3 font-medium">Khách hàng</th>
                    <th className="pb-3 font-medium">Tuyến đường</th>
                    <th className="pb-3 font-medium text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((req) => (
                    <tr key={req.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                      <td className="py-3 text-sm font-medium">{req.id}</td>
                      <td className="py-3 text-sm">{req.customer}</td>
                      <td className="py-3 text-sm">{req.route}</td>
                      <td className="py-3 text-right">
                        <button className="btn-approve">Duyệt / Từ chối</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* DANH SÁCH CHUYẾN ĐI (Bấm vào để xem Kế hoạch & Giấy tờ) */}
          <section className="dashboard-section bg-white border border-[#E5E7EB] shadow-sm rounded-xl p-5">
            <div className="section-header flex-between mb-4">
              <h2 className="text-lg font-semibold text-[#111827]">Chuyến đi đang hoạt động</h2>
              <button className="text-[#F57C00] text-sm font-medium hover:underline">Xem tất cả</button>
            </div>
            <div className="table-container">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-[#6B7280] text-sm">
                    <th className="pb-3 font-medium">Mã Chuyến</th>
                    <th className="pb-3 font-medium">Tuyến đường</th>
                    <th className="pb-3 font-medium">Trạng thái</th>
                    <th className="pb-3 font-medium text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTrips.map((trip) => (
                    <tr key={trip.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                      <td className="py-3 text-sm font-medium">{trip.id}</td>
                      <td className="py-3 text-sm">{trip.route}</td>
                      <td className="py-3 text-sm">
                        <span className="status-badge">{trip.status}</span>
                      </td>
                      <td className="py-3 text-right">
                        {/* Nút bấm chuyển hướng sang trang Chi tiết chuyến đi (chứa giấy tờ, kế hoạch) */}
                        <button className="btn-outline">Xem chi tiết</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default ManagerDashboard;