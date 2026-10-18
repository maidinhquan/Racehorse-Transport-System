import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { get } from "../api";
import { relational } from "./api";
import { flow1Error } from "../api";

type Notice = { id: string; referenceId: string; type: string; title: string; message: string; sentAt: string; isRead: boolean };
export function Notifications() {
  const [items, setItems] = useState<Notice[]>([]); const [error, setError] = useState(""); const [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () => get<Notice[]>("/flow1/notifications").then(v => { if (active) { setItems(v); setError(""); } }).catch(e => { if (active) setError(flow1Error(e)); });
    void load(); const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  return <aside className="flow1-notifications"><button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>Thông báo ({items.filter(x => !x.isRead).length})</button>
    {open && <section><h2>Thông báo của tôi</h2>{error && <p role="alert">{error}</p>}{!error && !items.length && <p>Chưa có thông báo.</p>}
      {items.map(n => <article key={n.id}><h3>{n.title}</h3><p>{n.message}</p><small>{new Date(n.sentAt + (n.sentAt.endsWith("Z") ? "" : "Z")).toLocaleString("vi-VN")}</small>
        <Link to={n.type === "FLOW1_HANDOFF" ? (localStorage.getItem("userRole") === "TRANSPORT_SPECIALIST" ? "/specialist/flow1" : "/coordinator/flow1") : `/customer/requests/${encodeURIComponent(n.referenceId)}`}>Mở hồ sơ</Link>
        {!n.isRead && <button onClick={async () => { try { await relational.action(`/flow1/notifications/${n.id}/read`, {}); setItems(v => v.map(x => x.id === n.id ? { ...x, isRead: true } : x)); } catch (e) { setError(flow1Error(e)); } }}>Đánh dấu đã đọc</button>}
      </article>)}</section>}
  </aside>;
}
