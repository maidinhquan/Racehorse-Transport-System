import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../shared/api/apiClient";
import ThemeToggle from "../../shared/components/ThemeToggle/ThemeToggle";
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

export interface AdminBusinessPolicy {
  policyId: string;
  code: string;
  valueType: string;
  numberValue: number | null;
  textValue: string | null;
  boolValue: boolean | null;
  unit: string | null;
  scopeType: string;
  scopeId: string | null;
  description: string;
  updatedBy: string | null;
  updatedAt: string;
  category: "PREPARATION_TRANSIT" | "CONTRACT_DEPOSIT" | "SECURITY_OTP" | "FEEDBACK" | "GENERAL";
}

type AdminTab = "USERS" | "POLICIES";

type PolicyCategoryFilter =
  | "ALL"
  | "PREPARATION_TRANSIT"
  | "CONTRACT_DEPOSIT"
  | "SECURITY_OTP"
  | "FEEDBACK";

const POLICY_CATEGORY_OPTIONS: { key: PolicyCategoryFilter; label: string }[] = [
  { key: "ALL", label: "Tất cả thông số" },
  { key: "PREPARATION_TRANSIT", label: "Chuẩn bị & Di chuyển" },
  { key: "CONTRACT_DEPOSIT", label: "Hợp đồng & Đặt cọc" },
  { key: "SECURITY_OTP", label: "Bảo mật OTP ký kết" },
  { key: "FEEDBACK", label: "Đánh giá & Khiếu nại" },
];

const POLICY_FRIENDLY_NAMES: Record<string, string> = {
  MIN_PREPARATION_DAYS: "Số ngày chuẩn bị tối thiểu mặc định",
  FLOW1_PREPARATION_DAYS: "Số ngày chuẩn bị theo phương thức vận chuyển",
  MIN_TRANSIT_DAYS: "Thời gian di chuyển tối thiểu của hành trình",
  DEFAULT_DEPOSIT_PERCENT: "Tỷ lệ tiền cọc hợp đồng mặc định",
  CONTRACT_DEADLINE_HOURS: "Thời hạn hiệu lực cọc & ký hợp đồng",
  FLOW1_REVIEW_BUFFER_DAYS: "Thời gian dự trù xét duyệt yêu cầu",
  FLOW1_SIGNING_BUFFER_DAYS: "Thời gian dự trù hoàn tất ký hợp đồng",
  FLOW1_CUSTOMER_RESPONSE_HOURS: "Hạn khách hàng phản hồi lịch trình",
  SIGN_OTP_TTL_MINUTES: "Thời gian hiệu lực của mã OTP ký hợp đồng",
  SIGN_OTP_RESEND_SECONDS: "Khoảng chờ tối thiểu trước khi gửi lại OTP",
  SIGN_OTP_MAX_ATTEMPTS: "Số lần nhập sai mã OTP tối đa",
  FEEDBACK_WINDOW_HOURS: "Thời hạn gửi đánh giá phản hồi sau chuyến",
};

const formatPolicyUnit = (unit: string | null): string => {
  if (!unit) return "";
  switch (unit.toUpperCase()) {
    case "DAY":
      return "ngày";
    case "HOUR":
      return "giờ";
    case "MINUTE":
      return "phút";
    case "SECOND":
      return "giây";
    case "PERCENT":
      return "%";
    case "ATTEMPT":
      return "lần";
    default:
      return unit.toLowerCase();
  }
};

const formatScopeLabel = (scopeType: string, scopeId: string | null): { label: string; className: string } => {
  switch (scopeType?.toUpperCase()) {
    case "GLOBAL":
      return { label: "Toàn hệ thống", className: "global" };
    case "COUNTRY":
      return { label: `Quốc gia: ${scopeId || "Tất cả"}`, className: "country" };
    case "TRANSPORT_MODE":
      return {
        label: scopeId === "AIR" ? "Đường hàng không" : scopeId === "ROAD" ? "Đường bộ" : `Phương thức: ${scopeId}`,
        className: "mode",
      };
    default:
      return { label: scopeId ? `${scopeType}: ${scopeId}` : scopeType, className: "default" };
  }
};

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

  const [activeTab, setActiveTab] = useState<AdminTab>("USERS");
  const [policies, setPolicies] = useState<AdminBusinessPolicy[]>([]);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState<boolean>(false);
  const [selectedPolicyCategory, setSelectedPolicyCategory] = useState<PolicyCategoryFilter>("ALL");
  const [policySearchTerm, setPolicySearchTerm] = useState<string>("");
  const [editingPolicy, setEditingPolicy] = useState<AdminBusinessPolicy | null>(null);
  const [editNumberValue, setEditNumberValue] = useState<number>(0);
  const [editTextValue, setEditTextValue] = useState<string>("");
  const [editBoolValue, setEditBoolValue] = useState<boolean>(false);
  const [editDescription, setEditDescription] = useState<string>("");
  const [isSavingPolicy, setIsSavingPolicy] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchPolicies = async () => {
    setIsLoadingPolicies(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: AdminBusinessPolicy[]; message?: string }>("/admin/business-policies");
      if (res.data.success && res.data.data) {
        setPolicies(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải thông số hệ thống:", err);
      showToast("Không thể tải danh sách thông số hệ thống.", "error");
    } finally {
      setIsLoadingPolicies(false);
    }
  };

  const openEditModal = (p: AdminBusinessPolicy) => {
    setEditingPolicy(p);
    setEditNumberValue(p.numberValue ?? 0);
    setEditTextValue(p.textValue ?? "");
    setEditBoolValue(p.boolValue ?? false);
    setEditDescription(p.description || "");
  };

  const closeEditModal = () => {
    setEditingPolicy(null);
  };

  const handleSavePolicy = async () => {
    if (!editingPolicy) return;
    setIsSavingPolicy(true);
    try {
      const payload: {
        numberValue?: number;
        textValue?: string;
        boolValue?: boolean;
        description?: string;
      } = {
        description: editDescription.trim(),
      };

      if (editingPolicy.valueType === "NUMBER") {
        if (editingPolicy.unit === "PERCENT" && (editNumberValue < 1 || editNumberValue > 100)) {
          showToast("Tỷ lệ cọc phải nằm trong khoảng 1% đến 100%.", "error");
          setIsSavingPolicy(false);
          return;
        }
        if (editNumberValue < 0) {
          showToast("Giá trị không được nhỏ hơn 0.", "error");
          setIsSavingPolicy(false);
          return;
        }
        payload.numberValue = Number(editNumberValue);
      } else if (editingPolicy.valueType === "TEXT") {
        payload.textValue = editTextValue;
      } else if (editingPolicy.valueType === "BOOLEAN") {
        payload.boolValue = editBoolValue;
      }

      const res = await apiClient.put<{ success: boolean; data: AdminBusinessPolicy; message?: string }>(
        `/admin/business-policies/${editingPolicy.policyId}`,
        payload
      );

      if (res.data.success && res.data.data) {
        setPolicies((prev) =>
          prev.map((item) => (item.policyId === editingPolicy.policyId ? res.data.data : item))
        );
        showToast(`Cập nhật thông số ${editingPolicy.code} thành công.`);
        closeEditModal();
      } else {
        showToast(res.data.message || "Cập nhật thất bại.", "error");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Lỗi khi cập nhật thông số hệ thống.";
      showToast(msg, "error");
    } finally {
      setIsSavingPolicy(false);
    }
  };

  // Tính số lượng theo từng nhóm thông số
  const policyCategoryCounts = useMemo(() => {
    const counts: Record<PolicyCategoryFilter, number> = {
      ALL: policies.length,
      PREPARATION_TRANSIT: 0,
      CONTRACT_DEPOSIT: 0,
      SECURITY_OTP: 0,
      FEEDBACK: 0,
    };
    for (const p of policies) {
      if (p.category in counts) {
        counts[p.category as keyof typeof counts]++;
      }
    }
    return counts;
  }, [policies]);

  // Lọc thông số theo danh mục và từ khóa tìm kiếm
  const filteredPolicies = useMemo(() => {
    const term = policySearchTerm.trim().toLowerCase();
    return policies.filter((p) => {
      const matchesCategory =
        selectedPolicyCategory === "ALL" || p.category === selectedPolicyCategory;
      const friendlyName = POLICY_FRIENDLY_NAMES[p.code] || "";
      const matchesSearch =
        !term ||
        p.code.toLowerCase().includes(term) ||
        p.policyId.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        friendlyName.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [policies, selectedPolicyCategory, policySearchTerm]);

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

          {/* Thanh chuyển đổi Tab Quản lý */}
          <div className="admin-nav-tabs">
            <button
              type="button"
              className={`admin-nav-tab ${activeTab === "USERS" ? "active" : ""}`}
              onClick={() => setActiveTab("USERS")}
            >
              Quản lý tài khoản ({users.length})
            </button>
            <button
              type="button"
              className={`admin-nav-tab ${activeTab === "POLICIES" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("POLICIES");
                if (policies.length === 0) fetchPolicies();
              }}
            >
              Thông số hệ thống (Business Rules) {policies.length > 0 ? `(${policies.length})` : ""}
            </button>
          </div>

          {/* TAB 1: Quản lý danh sách tài khoản */}
          {activeTab === "USERS" && (
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
          )}

          {/* TAB 2: Quản lý thông số hệ thống (Business Rules) */}
          {activeTab === "POLICIES" && (
            <section className="admin-section">
              <div className="admin-section-header">
                <div>
                  <h2>Cấu Hình Quy Tắc & Thông Số Vận Hành (Business Rules)</h2>
                  <p className="admin-section-subtitle">
                    Điều chỉnh các ngưỡng thời gian, tỷ lệ cọc và chính sách toàn hệ thống
                  </p>
                </div>

                <div className="admin-search-wrapper">
                  <input
                    type="text"
                    placeholder="Tìm theo mã, tên quy tắc, mô tả..."
                    value={policySearchTerm}
                    onChange={(e) => setPolicySearchTerm(e.target.value)}
                    className="admin-search-input"
                  />
                  {policySearchTerm && (
                    <button
                      type="button"
                      className="admin-search-clear"
                      onClick={() => setPolicySearchTerm("")}
                      title="Xóa tìm kiếm"
                    >
                      ✕
                    </button>
                  )}
                  {policySearchTerm && (
                    <button
                      type="button"
                      className="admin-reset-filter-btn"
                      onClick={() => setPolicySearchTerm("")}
                    >
                      Đặt lại
                    </button>
                  )}
                </div>
              </div>

              {/* Bộ lọc nhóm thông số */}
              <div className="admin-filter-group">
                <span className="admin-filter-label">Nhóm quy tắc:</span>
                <div className="admin-pills-row">
                  {POLICY_CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      className={`admin-filter-pill ${
                        selectedPolicyCategory === cat.key ? "active" : ""
                      }`}
                      onClick={() => setSelectedPolicyCategory(cat.key)}
                    >
                      <span>{cat.label}</span>
                      <span className="admin-pill-badge">
                        {policyCategoryCounts[cat.key]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bảng danh sách quy tắc */}
              <div className="admin-table-wrapper">
                {isLoadingPolicies ? (
                  <div className="admin-loading-card" style={{ padding: "40px" }}>
                    <div className="admin-spinner"></div>
                    <p>Đang tải thông số hệ thống...</p>
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Mã & Tên quy tắc</th>
                        <th>Phạm vi áp dụng</th>
                        <th>Giá trị cấu hình</th>
                        <th>Mô tả nghiệp vụ</th>
                        <th>Cập nhật gần nhất</th>
                        <th style={{ textAlign: "right" }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPolicies.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="admin-empty-cell">
                            Không tìm thấy quy tắc hệ thống nào phù hợp.
                          </td>
                        </tr>
                      ) : (
                        filteredPolicies.map((p) => {
                          const scope = formatScopeLabel(p.scopeType, p.scopeId);
                          const friendlyName = POLICY_FRIENDLY_NAMES[p.code] || p.code;
                          const displayValue =
                            p.valueType === "NUMBER"
                              ? p.numberValue ?? 0
                              : p.valueType === "BOOLEAN"
                              ? p.boolValue
                                ? "Bật"
                                : "Tắt"
                              : p.textValue || "—";
                          const unitLabel = formatPolicyUnit(p.unit);

                          return (
                            <tr key={p.policyId}>
                              <td>
                                <div className="admin-policy-name">{friendlyName}</div>
                                <div className="admin-policy-code">{p.code}</div>
                              </td>
                              <td>
                                <span className={`admin-scope-badge ${scope.className}`}>
                                  {scope.label}
                                </span>
                              </td>
                              <td>
                                <span className="admin-policy-value-tag">
                                  {displayValue}
                                  {unitLabel && (
                                    <span className="admin-policy-unit">{unitLabel}</span>
                                  )}
                                </span>
                              </td>
                              <td>
                                <div className="admin-policy-desc">{p.description}</div>
                              </td>
                              <td>
                                <div className="admin-policy-meta">
                                  {p.updatedBy ? `Bởi: ${p.updatedBy}` : "Mặc định"}
                                </div>
                                <div className="admin-policy-meta">
                                  {p.updatedAt
                                    ? new Date(p.updatedAt).toLocaleDateString("vi-VN", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "—"}
                                </div>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <button
                                  type="button"
                                  className="admin-policy-edit-btn"
                                  onClick={() => openEditModal(p)}
                                >
                                  Chỉnh sửa
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {/* Modal chỉnh sửa thông số */}
          {editingPolicy && (
            <div className="admin-modal-overlay" onClick={closeEditModal}>
              <div
                className="admin-modal-container"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="admin-modal-header">
                  <div>
                    <h3>Chỉnh Sửa Thông Số Hệ Thống</h3>
                  </div>
                  <button
                    type="button"
                    className="admin-modal-close"
                    onClick={closeEditModal}
                  >
                    ✕
                  </button>
                </div>

                <div className="admin-modal-body">
                  <div className="admin-form-group">
                    <span className="admin-form-label">Tên quy tắc:</span>
                    <div>
                      <strong>{POLICY_FRIENDLY_NAMES[editingPolicy.code] || editingPolicy.code}</strong>
                    </div>
                    <div className="admin-policy-code">{editingPolicy.code} ({editingPolicy.policyId})</div>
                  </div>

                  <div className="admin-form-group">
                    <span className="admin-form-label">Phạm vi áp dụng:</span>
                    <div>
                      <span className={`admin-scope-badge ${formatScopeLabel(editingPolicy.scopeType, editingPolicy.scopeId).className}`}>
                        {formatScopeLabel(editingPolicy.scopeType, editingPolicy.scopeId).label}
                      </span>
                    </div>
                  </div>

                  {editingPolicy.valueType === "NUMBER" && (
                    <div className="admin-form-group">
                      <label htmlFor="edit-policy-number" className="admin-form-label">
                        Giá trị cấu hình mới *
                      </label>
                      <div className="admin-input-group">
                        <input
                          id="edit-policy-number"
                          type="number"
                          step={editingPolicy.unit === "PERCENT" ? "1" : "1"}
                          min={editingPolicy.unit === "PERCENT" ? 1 : 0}
                          max={editingPolicy.unit === "PERCENT" ? 100 : undefined}
                          value={editNumberValue}
                          onChange={(e) => setEditNumberValue(Number(e.target.value))}
                          className="admin-form-input"
                          style={{ paddingRight: "60px" }}
                        />
                        {editingPolicy.unit && (
                          <span className="admin-input-unit-badge">
                            {formatPolicyUnit(editingPolicy.unit)}
                          </span>
                        )}
                      </div>
                      <span className="admin-form-hint">
                        {editingPolicy.unit === "PERCENT"
                          ? "Nhập giá trị tỷ lệ phần trăm từ 1 đến 100."
                          : "Nhập số nguyên không âm biểu thị thời lượng hoặc số lần."}
                      </span>
                    </div>
                  )}

                  {editingPolicy.valueType === "TEXT" && (
                    <div className="admin-form-group">
                      <label htmlFor="edit-policy-text" className="admin-form-label">
                        Giá trị dạng văn bản *
                      </label>
                      <input
                        id="edit-policy-text"
                        type="text"
                        value={editTextValue}
                        onChange={(e) => setEditTextValue(e.target.value)}
                        className="admin-form-input"
                      />
                    </div>
                  )}

                  {editingPolicy.valueType === "BOOLEAN" && (
                    <div className="admin-form-group">
                      <span className="admin-form-label">Trạng thái kích hoạt *</span>
                      <div className="admin-pills-row" style={{ marginTop: "4px" }}>
                        <button
                          type="button"
                          className={`admin-filter-pill ${editBoolValue ? "active" : ""}`}
                          onClick={() => setEditBoolValue(true)}
                        >
                          Bật (Kích hoạt)
                        </button>
                        <button
                          type="button"
                          className={`admin-filter-pill ${!editBoolValue ? "active" : ""}`}
                          onClick={() => setEditBoolValue(false)}
                        >
                          Tắt (Vô hiệu hóa)
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="admin-form-group">
                    <label htmlFor="edit-policy-desc" className="admin-form-label">
                      Mô tả nghiệp vụ
                    </label>
                    <textarea
                      id="edit-policy-desc"
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="admin-form-textarea"
                      placeholder="Nhập mô tả giải thích mục đích của quy tắc này..."
                    />
                  </div>
                </div>

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    onClick={closeEditModal}
                    disabled={isSavingPolicy}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    className="admin-btn-primary"
                    onClick={handleSavePolicy}
                    disabled={isSavingPolicy}
                  >
                    {isSavingPolicy ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toast thông báo */}
          {toastMessage && (
            <div className={`admin-toast ${toastMessage.type}`}>
              {toastMessage.message}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
