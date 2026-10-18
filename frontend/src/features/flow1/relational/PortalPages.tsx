import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CustomerLayout from "../../../shared/layouts/CustomerLayout/CustomerLayout";
import { relational } from "./api";
import type { Request } from "./api";
import { flow1Error, money } from "../api";
import { RequestsPage, OperationsInbox } from "./Pages";
import { Notifications } from "./Notifications";

export function CustomerRequests() { return <CustomerLayout pageTitle="Yêu cầu vận chuyển"><RequestsPage /></CustomerLayout>; }
export function CustomerFlowHome() { return <CustomerLayout pageTitle="Hành trình vận chuyển"><section className="flow1-page"><h1>Chào {localStorage.getItem("userFullName") || "khách hàng"}</h1>
  <p>Chọn tuyến và xem giá demo trên trang chủ, sau đó hoàn tất wizard 4 bước. Giá chính thức và cọc 40% được chốt trong hợp đồng.</p>
  <Link to="/">Chọn tuyến / xem giá demo</Link> · <Link to="/customer/create-request">Tạo yêu cầu</Link> · <Link to="/customer/requests">Theo dõi yêu cầu, hợp đồng và cọc</Link>
  </section><RequestsPage /></CustomerLayout>; }
export function OperationsFlowHome({ stream }: { stream: "ROUTING" | "DOCUMENTS" }) { return <div className="flow1-page"><header><h1>{stream === "ROUTING" ? "Điều phối · Flow 2" : "Hồ sơ · Flow 3"}</h1><Notifications />
  <Link to={stream === "ROUTING" ? "/coordinator/trips" : "/specialist/trips"}>Mở module {stream === "ROUTING" ? "điều phối" : "hồ sơ"}</Link></header><OperationsInbox stream={stream} /></div>; }

export function ManagerRecords({ tab }: { tab: "overview" | "requests" | "contracts" | "payments" }) {
  const [items, setItems] = useState<Request[]>([]); const [error, setError] = useState("");
  useEffect(() => { let active = true; relational.list(true).then(v => { if (active) setItems(v); }).catch(e => { if (active) setError(flow1Error(e)); }); return () => { active = false; }; }, [tab]);
  return <section className="flow1-page"><h1>{({ overview: "Tổng quan Flow 1", requests: "Duyệt yêu cầu vận chuyển", contracts: "Hợp đồng & giá chốt", payments: "Cọc VNPay & kích hoạt" })[tab]}</h1>
    <p>{items.length} yêu cầu · {items.filter(r => r.status === "PENDING").length} chờ duyệt · {items.filter(r => r.status === "ACTIVATED").length} đã kích hoạt</p>
    {error && <p role="alert">{error}</p>}<table><thead><tr><th>Yêu cầu / Tuyến</th><th>Trạng thái</th><th>Hợp đồng / Cọc VNPay</th><th>Thao tác</th></tr></thead><tbody>
      {items.filter(r => tab !== "contracts" && tab !== "payments" || r.contracts.length > 0).map(r => <tr key={r.requestId}><td>{r.requestId}<br />{r.departure} → {r.destination}</td><td>{r.status}</td><td>{r.contracts.length ? r.contracts.map(c => <p key={c.contractId}>{c.contractId} · {c.status}<br />{c.relationalTermsReady ? `${money(c.paidAmount)} / ${money(c.depositAmount)}` : "Hồ sơ cũ cần rà soát"}</p>) : "Chưa có hợp đồng"}</td><td><Link to={`/manager/requests/${r.requestId}`}>Xem / xử lý</Link></td></tr>)}
    </tbody></table>{!error && !items.length && <p>Chưa có yêu cầu.</p>}</section>;
}
