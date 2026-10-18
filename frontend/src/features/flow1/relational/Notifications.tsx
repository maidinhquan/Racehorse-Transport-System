import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { get } from "../api";
import { relational } from "./api";
import { flow1Error } from "../api";

type Notice = { id: string; referenceId: string; type: string; title: string; message: string; sentAt: string; isRead: boolean };
export function Notifications({variant="customer"}:{variant?:"customer"|"manager"}) {
  const [items, setItems] = useState<Notice[]>([]); const [error, setError] = useState(""); const [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () => get<Notice[]>("/flow1/notifications").then(v => { if (active) { setItems(v); setError(""); } }).catch(e => { if (active) setError(flow1Error(e)); });
    void load(); const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  return <aside className="flow1-notifications"><button type="button" className={variant==="manager"?"navbar-bell-btn":"customer-notification-button"} aria-label={`Thông báo (${items.filter(x=>!x.isRead).length})`} aria-expanded={open} onClick={()=>setOpen(!open)}><span className="customer-notification-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span className={variant==="manager"?"bell-badge":"customer-notif-badge"}>{items.filter(x=>!x.isRead).length}</span></span></button>
    {open && <section><h2>Thông báo của tôi</h2>{error && <p role="alert">{error}</p>}{!error && !items.length && <p>Chưa có thông báo.</p>}
      {items.map(n => <article key={n.id}><h3>{n.title}</h3><p>{n.message}</p><small>{new Date(n.sentAt + (n.sentAt.endsWith("Z") ? "" : "Z")).toLocaleString("vi-VN")}</small>
        <Link to={n.type === "FLOW1_HANDOFF" ? (localStorage.getItem("userRole") === "TRANSPORT_SPECIALIST" ? "/specialist/flow1" : "/coordinator/flow1") : `/customer/requests/${encodeURIComponent(n.referenceId)}`}>Mở hồ sơ</Link>
        {!n.isRead && <button onClick={async () => { try { await relational.action(`/flow1/notifications/${n.id}/read`, {}); setItems(v => v.map(x => x.id === n.id ? { ...x, isRead: true } : x)); } catch (e) { setError(flow1Error(e)); } }}>Đánh dấu đã đọc</button>}
      </article>)}</section>}
  </aside>;
}
