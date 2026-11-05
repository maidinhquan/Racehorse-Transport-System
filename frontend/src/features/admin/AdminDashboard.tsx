import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../shared/api/apiClient";
import ThemeToggle from "../../shared/components/ThemeToggle/ThemeToggle";
import { DemoDataToggle } from "../../shared/components";
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

type RoleFilterKey =
  | "ALL"
  | "CUSTOMER"
  | "LOGISTICS_MANAGER"
  | "TRANSPORT_SPECIALIST"
  | "FLEET_ROUTE_COORDINATOR"
  | "DRIVER_ESCORT"
  | "ADMIN";

type StatusFilterKey = "ALL" | "ACTIVE" | "INACTIVE";

const ROLE_OPTIONS: { key: RoleFilterKey; label: string }[] = [
  { key: "ALL", label: "Tất cả vai trò" },
  { key: "CUSTOMER", label: "Khách hàng" },
  { key: "LOGISTICS_MANAGER", label: "Quản lý vận tải" },
  { key: "TRANSPORT_SPECIALIST", label: "Chuyên viên thẩm định" },
  { key: "FLEET_ROUTE_COORDINATOR", label: "Điều phối viên" },
  { key: "DRIVER_ESCORT", label: "Tài xế & Áp tải" },
  { key: "ADMIN", label: "Quản trị viên" },
];

const matchesRoleFilter = (userRole: string, filter: RoleFilterKey): boolean => {
  if (filter === "ALL") return true;
  const ur = (userRole || "").toUpperCase();
  switch (filter) {
    case "CUSTOMER":
      return ur.includes("CUSTOMER");
    case "LOGISTICS_MANAGER":
      return ur.includes("MANAGER");
    case "TRANSPORT_SPECIALIST":
      return ur.includes("SPECIALIST");
    case "FLEET_ROUTE_COORDINATOR":
      return ur.includes("COORDINATOR");
    case "DRIVER_ESCORT":
      return ur.includes("DRIVER") || ur.includes("ESCORT");
    case "ADMIN":
      return ur.includes("ADMIN");
    default:
      return ur === filter;
  }
};

const formatRoleName = (role: string): string => {
  const r = (role || "").toUpperCase();
  if (r.includes("ADMIN")) return "Quản trị viên";
  if (r.includes("MANAGER")) return "Quản lý vận tải";
  if (r.includes("SPECIALIST")) return "Chuyên viên thẩm định";
  if (r.includes("COORDINATOR")) return "Điều phối viên";
  if (r.includes("DRIVER") || r.includes("ESCORT")) return "Tài xế & Áp tải";
  if (r.includes("CUSTOMER")) return "Khách hàng";
  return role || "Chưa xác định";
};

const getRoleBadgeClass = (role: string): string => {
  const r = (role || "").toUpperCase();
  if (r.includes("ADMIN")) return "role-admin";
  if (r.includes("MANAGER")) return "role-manager";
  if (r.includes("SPECIALIST")) return "role-specialist";
  if (r.includes("COORDINATOR")) return "role-coordinator";
  if (r.includes("DRIVER") || r.includes("ESCORT")) return "role-driver";
  if (r.includes("CUSTOMER")) return "role-customer";
  return "role-default";
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<RoleFilterKey>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilterKey>("ALL");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const currentAdminName = localStorage.getItem("userFullName") || "Quản trị viên";

  const fetchDashboardData = async (showRefreshState = false) => {
    if (showRefreshState) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage("");

    try {
      const response = await apiClient.get<DashboardApiResponse>("/admin/dashboard");
      if (response.data.success && response.data.data) {
        setStats(response.data.data.stats);
        setUsers(response.data.data.users || []);
        setLastUpdated(new Date().toLocaleTimeString("vi-VN"));
      } else {
        setErrorMessage(response.data.message || "Không thể tải dữ liệu từ máy chủ.");
      }
    } catch (err: unknown) {
      console.error("Lỗi khi tải dữ liệu:", err);
      setErrorMessage("Không thể kết nối đến hệ thống máy chủ hoặc cơ sở dữ liệu.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userFullName");
    sessionStorage.removeItem("userEmail");
    sessionStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userFullName");
    localStorage.removeItem("userEmail");
    navigate("/login");
  };

  // Tính số lượng tài khoản theo từng bộ lọc vai trò
  const roleCounts = useMemo(() => {
    const counts: Record<RoleFilterKey, number> = {
      ALL: users.length,
      CUSTOMER: 0,
      LOGISTICS_MANAGER: 0,
      TRANSPORT_SPECIALIST: 0,
      FLEET_ROUTE_COORDINATOR: 0,
      DRIVER_ESCORT: 0,
      ADMIN: 0,
    };
    for (const u of users) {
      if (matchesRoleFilter(u.role, "CUSTOMER")) counts.CUSTOMER++;
      if (matchesRoleFilter(u.role, "LOGISTICS_MANAGER")) counts.LOGISTICS_MANAGER++;
      if (matchesRoleFilter(u.role, "TRANSPORT_SPECIALIST")) counts.TRANSPORT_SPECIALIST++;
      if (matchesRoleFilter(u.role, "FLEET_ROUTE_COORDINATOR")) counts.FLEET_ROUTE_COORDINATOR++;
      if (matchesRoleFilter(u.role, "DRIVER_ESCORT")) counts.DRIVER_ESCORT++;
      if (matchesRoleFilter(u.role, "ADMIN")) counts.ADMIN++;
    }
    return counts;
  }, [users]);

  // Tính số lượng theo trạng thái
  const statusCounts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const u of users) {
      if (u.isActive) {
        active++;
      } else {
        inactive++;
      }
    }
    return {
      ALL: users.length,
      ACTIVE: active,
      INACTIVE: inactive,
    };
  }, [users]);

  // Danh sách tài khoản đã qua bộ lọc
  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        !term ||
        u.fullName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.id.toLowerCase().includes(term) ||
        (u.phone && u.phone.toLowerCase().includes(term));

      const matchesRole = matchesRoleFilter(u.role, selectedRole);

      const matchesStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "ACTIVE" && u.isActive) ||
        (selectedStatus === "INACTIVE" && !u.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, selectedRole, selectedStatus]);

  const hasActiveFilters =
    selectedRole !== "ALL" || selectedStatus !== "ALL" || searchTerm.trim() !== "";

  const handleResetFilters = () => {
    setSelectedRole("ALL");
    setSelectedStatus("ALL");
    setSearchTerm("");
  };

  return (
    <div className="admin-dashboard-container">
      {/* Thanh tiêu đề quản trị */}
      <header className="admin-header">
        <div className="admin-header-title">
          <h1>Hệ Thống Quản Trị Vận Hành</h1>
          <p>Quản lý tài nguyên, giám sát hoạt động và điều phối người dùng</p>
        </div>
        <div className="admin-header-actions">
          <DemoDataToggle role="admin" />
          <ThemeToggle />
          <span className="admin-user-info">
            Tài khoản: <strong>{currentAdminName}</strong>
          </span>
          <button
            type="button"
            className="admin-refresh-btn"
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing || isLoading}
            title="Tải lại dữ liệu mới nhất từ cơ sở dữ liệu"
          >
            {isRefreshing ? "Đang cập nhật..." : "Làm mới dữ liệu"}
          </button>
          <button type="button" className="admin-logout-btn" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Trạng thái Loading hoặc Thông báo lỗi */}
      {isLoading && (
        <div className="admin-loading-card">
          <div className="admin-spinner"></div>
          <p>Đang tải dữ liệu từ hệ thống cơ sở dữ liệu...</p>
        </div>
      )}

      {errorMessage && (
        <div className="admin-error-card">
          <div className="admin-error-text">
            <strong>Thông báo lỗi:</strong> {errorMessage}
          </div>
          <button type="button" onClick={() => fetchDashboardData()}>
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && stats && (
        <>
          {/* Khối thẻ thống kê tổng quan */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-header">
                <span className="admin-stat-label">Tài khoản</span>
                <span className="admin-stat-badge success">
                  Hoạt động: {stats.activeUsers}
                </span>
              </div>
              <div className="admin-stat-body">
                <h3 className="admin-stat-count">{stats.totalUsers}</h3>
                <p className="admin-stat-title">Tổng số tài khoản hệ thống</p>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-header">
                <span className="admin-stat-label">Ngựa vận chuyển</span>
                <span className="admin-stat-badge neutral">Hồ sơ đã tạo</span>
              </div>
              <div className="admin-stat-body">
                <h3 className="admin-stat-count">{stats.totalHorses}</h3>
                <p className="admin-stat-title">Ngựa đua trong cơ sở dữ liệu</p>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-header">
                <span className="admin-stat-label">Yêu cầu</span>
                <span className="admin-stat-badge neutral">Tổng hồ sơ</span>
              </div>
              <div className="admin-stat-body">
                <h3 className="admin-stat-count">{stats.totalRequests}</h3>
                <p className="admin-stat-title">Yêu cầu vận chuyển đã gửi</p>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-header">
                <span className="admin-stat-label">Phương tiện</span>
                <span className="admin-stat-badge success">Sẵn sàng điều phối</span>
              </div>
              <div className="admin-stat-body">
                <h3 className="admin-stat-count">{stats.totalVehicles}</h3>
                <p className="admin-stat-title">Phương tiện vận tải chuyên dụng</p>
              </div>
            </div>
          </div>

          {/* Thanh thông tin trạng thái hệ thống */}
          <div className="admin-db-status-bar">
            <div className="admin-status-item">
              <span className="admin-status-dot"></span>
              <span>Cơ sở dữ liệu: Hoạt động bình thường</span>
            </div>
            <div className="admin-status-item">
              <span>Tài khoản bị khóa: <strong>{stats.inactiveUsers}</strong></span>
              {lastUpdated && (
                <span className="admin-status-time">Cập nhật lúc: {lastUpdated}</span>
              )}
            </div>
          </div>

          {/* Khu vực quản lý danh sách tài khoản */}
          <section className="admin-section">
            <div className="admin-section-header">
              <div>
                <h2>Danh Sách Tài Khoản Trong Cơ Sở Dữ Liệu</h2>
                <p className="admin-section-subtitle">
                  Hiển thị {filteredUsers.length} trên tổng số {users.length} tài khoản
                </p>
              </div>

              {/* Ô tìm kiếm và nút đặt lại bộ lọc */}
              <div className="admin-search-wrapper">
                <input
                  type="text"
                  placeholder="Tìm theo mã, tên, email, SĐT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="admin-search-input"
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="admin-search-clear"
                    onClick={() => setSearchTerm("")}
                    title="Xóa tìm kiếm"
                  >
                    ✕
                  </button>
                )}
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="admin-reset-filter-btn"
                    onClick={handleResetFilters}
                    title="Xóa tất cả bộ lọc hiện tại"
                  >
                    Đặt lại bộ lọc
                  </button>
                )}
              </div>
            </div>

            {/* BỘ LỌC TÀI KHOẢN: Nút lọc theo vai trò (Role Filter Pills) */}
            <div className="admin-filter-group">
              <span className="admin-filter-label">Lọc theo vai trò:</span>
              <div className="admin-pills-row">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`admin-filter-pill ${
                      selectedRole === opt.key ? "active" : ""
                    }`}
                    onClick={() => setSelectedRole(opt.key)}
                  >
                    <span>{opt.label}</span>
                    <span className="admin-pill-badge">{roleCounts[opt.key]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* BỘ LỌC TÀI KHOẢN: Nút lọc theo trạng thái hoạt động (Status Filter Pills) */}
            <div className="admin-filter-group">
              <span className="admin-filter-label">Trạng thái:</span>
              <div className="admin-pills-row">
                <button
                  type="button"
                  className={`admin-filter-pill ${
                    selectedStatus === "ALL" ? "active" : ""
                  }`}
                  onClick={() => setSelectedStatus("ALL")}
                >
                  <span>Tất cả</span>
                  <span className="admin-pill-badge">{statusCounts.ALL}</span>
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill ${
                    selectedStatus === "ACTIVE" ? "active" : ""
                  }`}
                  onClick={() => setSelectedStatus("ACTIVE")}
                >
                  <span>Đang hoạt động</span>
                  <span className="admin-pill-badge status-active-count">
                    {statusCounts.ACTIVE}
                  </span>
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill ${
                    selectedStatus === "INACTIVE" ? "active" : ""
                  }`}
                  onClick={() => setSelectedStatus("INACTIVE")}
                >
                  <span>Bị khóa</span>
                  <span className="admin-pill-badge status-inactive-count">
                    {statusCounts.INACTIVE}
                  </span>
                </button>
              </div>
            </div>

            {/* Bảng danh sách tài khoản */}
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Mã tài khoản</th>
                    <th>Họ và tên</th>
                    <th>Email</th>
                    <th>Số điện thoại</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="admin-empty-cell">
                        Không tìm thấy tài khoản nào phù hợp với điều kiện lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td className="user-id">{u.id}</td>
                        <td className="user-name">{u.fullName}</td>
                        <td className="user-email">{u.email || "Chưa có"}</td>
                        <td className="user-phone">{u.phone || "Chưa có"}</td>
                        <td>
                          <span className={`role-badge ${getRoleBadgeClass(u.role)}`}>
                            {formatRoleName(u.role)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              u.isActive ? "active" : "inactive"
                            }`}
                          >
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
