import React, { useEffect, useState } from "react";
import { apiClient } from "../../shared/api/apiClient";
import ThemeToggle from "../../shared/components/ThemeToggle/ThemeToggle";
import { DemoDataToggle } from "../../shared/components";
import { cleanDisplayName } from "../../shared/utils/textUtils";
import "./AdminDashboard.css";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalHorses: number;
  totalRequests: number;
  totalVehicles: number;
  databaseStatus: string;
}

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
}

interface DashboardApiResponse {
  success: boolean;
  message: string;
  data: {
    stats: AdminStats;
    users: AdminUser[];
  };
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");

  const currentAdminName = cleanDisplayName(localStorage.getItem("userFullName")) || "Quản trị viên";

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await apiClient.get<DashboardApiResponse>("/admin/dashboard");
      if (response.data.success && response.data.data) {
        setStats(response.data.data.stats);
        setUsers(response.data.data.users);
      } else {
        setErrorMessage(response.data.message || "Không thể tải dữ liệu từ database.");
      }
    } catch (err: unknown) {
      console.error("Lỗi khi tải dữ liệu:", err);
      setErrorMessage("Không thể kết nối đến Backend hoặc Database SQL Server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole =
      selectedRole === "ALL" || u.role.toUpperCase() === selectedRole.toUpperCase();

    return matchesSearch && matchesRole;
  });

  return (
    <div className="admin-dashboard-container">
      {/* Top Header */}
      <header className="admin-header">
        <div className="admin-header-title">
          <div className="admin-badge">Dữ liệu thời gian thực từ Database</div>
          <h1>Bảng Điều Khiển Quản Trị Hệ Thống</h1>
          <p>Dữ liệu kết nối trực tiếp cơ sở dữ liệu SQL Server (HorseTransportDB)</p>
        </div>
        <div className="admin-header-actions">
          <DemoDataToggle role="admin" />
          <ThemeToggle />
          <span className="admin-user-info">👤 {currentAdminName}</span>
          <button className="admin-refresh-btn" onClick={fetchDashboardData} title="Làm mới dữ liệu">
            🔄 Làm mới
          </button>
          <button className="admin-logout-btn" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Trạng thái Loading hoặc Lỗi */}
      {isLoading && (
        <div className="admin-loading-card">
          <div className="admin-spinner"></div>
          <p>Đang truy vấn dữ liệu từ cơ sở dữ liệu SQL Server...</p>
        </div>
      )}

      {errorMessage && (
        <div className="admin-error-card">
          <p>⚠️ {errorMessage}</p>
          <button onClick={fetchDashboardData}>Thử lại</button>
        </div>
      )}

      {!isLoading && !errorMessage && stats && (
        <>
          {/* Thẻ thống kê thời gian thực từ DB */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-header">
                <span className="admin-stat-icon">👥</span>
                <span className="admin-stat-change positive">Hoạt động: {stats.activeUsers}</span>
              </div>
              <div className="admin-stat-body">
                <h3 className="admin-stat-count">{stats.totalUsers}</h3>
                <p className="admin-stat-title">Tổng số Người Dùng (USER)</p>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-header">
                <span className="admin-stat-icon">🐎</span>
                <span className="admin-stat-change positive">Trong hệ thống</span>
              </div>
              <div className="admin-stat-body">
                <h3 className="admin-stat-count">{stats.totalHorses}</h3>
                <p className="admin-stat-title">Tổng số Ngựa Đua (HORSE)</p>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-header">
                <span className="admin-stat-icon">📋</span>
                <span className="admin-stat-change positive">Hồ sơ đã tạo</span>
              </div>
              <div className="admin-stat-body">
                <h3 className="admin-stat-count">{stats.totalRequests}</h3>
                <p className="admin-stat-title">Yêu cầu Vận chuyển (REQUEST)</p>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-header">
                <span className="admin-stat-icon">🚛</span>
                <span className="admin-stat-change positive">Sẵn sàng</span>
              </div>
              <div className="admin-stat-body">
                <h3 className="admin-stat-count">{stats.totalVehicles}</h3>
                <p className="admin-stat-title">Phương tiện vận chuyển (VEHICLE)</p>
              </div>
            </div>
          </div>

          {/* Trạng thái DB Connection */}
          <div className="admin-db-status-bar">
            <span>🟢 Trạng thái cơ sở dữ liệu: <strong>{stats.databaseStatus}</strong></span>
            <span>Khóa / Vô hiệu hóa: <strong>{stats.inactiveUsers} tài khoản</strong></span>
          </div>

          {/* Bảng dữ liệu người dùng thực tế từ DB */}
          <section className="admin-section">
            <div className="admin-section-header">
              <div>
                <h2>Danh Sách Người Dùng (Bảng [USER])</h2>
                <p className="admin-section-subtitle">
                  Hiển thị {filteredUsers.length} / {users.length} tài khoản trong hệ thống
                </p>
              </div>

              {/* Bộ lọc và tìm kiếm */}
              <div className="admin-filter-bar">
                <input
                  type="text"
                  placeholder="🔍 Tìm tên, email, mã ND..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="admin-search-input"
                />

                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="admin-role-select"
                >
                  <option value="ALL">Tất cả vai trò</option>
                  <option value="ADMIN">Admin</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="COORDINATOR">Coordinator</option>
                  <option value="DRIVER">Driver</option>
                  <option value="ESCORT">Escort</option>
                  <option value="MANAGER">Manager</option>
                  <option value="SPECIALIST">Specialist</option>
                </select>
              </div>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Mã User (UserID)</th>
                    <th>Họ và Tên (FullName)</th>
                    <th>Email</th>
                    <th>Số Điện Thoại</th>
                    <th>Vai Trò (Role)</th>
                    <th>Trạng Thái (IsActive)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                        Không tìm thấy người dùng nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td className="user-id">{u.id}</td>
                        <td className="user-name">{u.fullName}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || "—"}</td>
                        <td>
                          <span className={`role-badge ${u.role.toLowerCase()}`}>{u.role}</span>
                        </td>
                        <td>
                          <span className={`status-badge ${u.isActive ? "active" : "inactive"}`}>
                            {u.isActive ? "Đang hoạt động" : "Bị khóa"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
