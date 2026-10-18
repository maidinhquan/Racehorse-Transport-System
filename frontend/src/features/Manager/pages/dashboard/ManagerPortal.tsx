import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ManagerRecords } from "../../../flow1/relational/PortalPages";
import { RequestDetailPage } from "../../../flow1/relational/Pages";
import { Notifications } from "../../../flow1/relational/Notifications";
import "./ManagerPortal.css";

type Nav = "overview" | "requests" | "contracts" | "payments";
const tabs: [Nav, string][] = [["overview", "Tổng quan"], ["requests", "Yêu cầu vận chuyển"], ["contracts", "Hợp đồng & chi phí"], ["payments", "Đặt cọc & thanh toán"]];
export function ManagerPortal({ initialNav = "overview", detail = false }: { initialNav?: Nav; detail?: boolean }) {
  const location = useLocation(); const navigate = useNavigate();
  const tab = tabs.find(([id]) => location.pathname.startsWith(`/manager/${id}`))?.[0] || initialNav;
  return <div className="manager-app-container"><aside className="manager-sidebar">
    <div className="sidebar-brand-box"><h1 className="brand-company-name">CBN Transport</h1><span className="brand-role-title">Quản lý vận hành</span></div>
    <nav className="sidebar-menu-list">{tabs.map(([id, label]) => <NavLink className={`menu-item-btn ${tab === id ? "active" : ""}`} key={id} to={`/manager/${id}`}>{label}</NavLink>)}</nav>
    </aside><div className="manager-content-area"><header className="manager-top-navbar"><h1 className="navbar-page-title">{tabs.find(([id]) => id === tab)?.[1]}</h1>
      <div className="navbar-right"><Notifications /><span>{localStorage.getItem("userFullName") || "Logistics Manager"}</span><button onClick={() => { for (const key of ["accessToken", "userRole", "userFullName"]) localStorage.removeItem(key); navigate("/login"); }}>Đăng xuất</button></div></header>
      <main className="manager-view-container">{detail ? <RequestDetailPage manager /> : <ManagerRecords tab={tab} />}</main></div></div>;
}
