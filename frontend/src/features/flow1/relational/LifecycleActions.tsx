import { useEffect, useState } from "react";
import type { Contract } from "./api";
import { relational } from "./api";
import { flow1Error } from "../api";
import { date } from "./presentation";

export function LifecycleActions({ c, manager = false, reload }: { c: Contract; manager?: boolean; reload: () => Promise<void> }) {
  const [selected, setSelected] = useState<{ label: string; action: string; trip?: boolean; target?: string } | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),30000);return()=>window.clearInterval(timer);},[]);
  const choices: { label: string; action: string; trip?: boolean; target?: string }[] = [];
  if (c.relationalTermsReady && c.isCurrent) {
    if (!manager && c.status === "PENDING_SIGNATURE") choices.push({ label: "Từ chối hợp đồng", action: "decline" });
    if (!manager && c.status === "SIGNED" && !c.trip && c.cancellationStatus !== "PENDING") choices.push({ label: "Đề nghị hủy", action: "cancellation/request" });
    if (manager && ["DRAFT", "PENDING_SIGNATURE"].includes(c.status)) choices.push({ label: "Đóng bản chưa ký để chỉnh sửa", action: "withdraw" }, { label: "Xác nhận hết hạn ký", action: "expire" });
    if (manager && ["PENDING_SIGNATURE", "SIGNED"].includes(c.status)) choices.push({ label: c.signedAt ? "Gia hạn cọc" : "Gia hạn ký", action: "extend", target: c.signedAt ? "DEPOSIT" : "SIGN" });
    if (manager && c.cancellationStatus === "PENDING") choices.push({ label: "Chấp thuận đề nghị hủy", action: "cancellation/approve" }, { label: "Từ chối đề nghị hủy", action: "cancellation/reject" });
    if (manager && c.status === "SIGNED" && c.depositDeadline && now > Date.parse(c.depositDeadline)) choices.push({ label: "Hủy yêu cầu quá hạn sau đối soát", action: "cancel-overdue" });
    if (manager && c.trip && ["PLANNING", "READY_TO_DEPART"].includes(c.trip.status)) {
      if (c.trip.deploymentStatus === "PENDING") choices.push({ label: "confirm", action: "deployment/confirm", trip: true });
      if (c.trip.deploymentStatus !== "ON_HOLD") choices.push({ label: "hold", action: "deployment/hold", trip: true });
      else choices.push({ label: "resume", action: "deployment/resume", trip: true });
    }
  }
  return <div className="flow1-lifecycle"><p>Hạn ký: {date(c.signDeadline)} · Hạn cọc: {date(c.depositDeadline)}</p>
    {c.extensionReason && <p>Gia hạn gần nhất ({c.extensionTarget}): {c.extensionReason}</p>}
    {c.cancellationStatus && <p>Đề nghị hủy: {c.cancellationStatus} · {c.cancellationReason} · {c.cancellationDecision}</p>}
    {c.trip && <div className="info-kv-box"><h3>Chuyến {c.trip.tripId}</h3><p>{c.trip.status} · {c.trip.deploymentStatus} · {c.trip.reason}</p><p>Coordinator: {c.trip.routingAcknowledgedBy || "Chưa nhận"} · Specialist: {c.trip.documentsAcknowledgedBy || "Chưa nhận"}</p></div>}
    <div className="flow1-action-row">{choices.map(x => <button className="btn-secondary" key={x.action} disabled={busy} onClick={() => { setError(""); setSelected(x); }}>{x.label}</button>)}</div>
    {selected && <div className="customer-modal-overlay"><div className="customer-modal-card"><div className="modal-header"><h3>{selected.label}</h3><button type="button" className="modal-close" disabled={busy} onClick={() => setSelected(null)}>✕</button></div>
      <form className="flow1-dialog-form" onSubmit={async e => { e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setError("");
        try { await relational.action(`/${manager ? "manager" : "customer"}/contracts/${c.contractId}/${selected.action}`, { version: selected.trip ? c.trip!.version : c.version, reason: String(f.get("reason")), ...(selected.target ? { target: selected.target, deadline: new Date(String(f.get("deadline")) + ":00+07:00").toISOString() } : {}), ...(c.cancellationId ? { cancellationId: c.cancellationId } : {}) }); await reload(); setSelected(null); } catch (err) { setError(flow1Error(err)); } finally { setBusy(false); }
      }}><div className="modal-body">{selected.target && <label className="form-label">Hạn mới (giờ Việt Nam)<input required className="text-input" name="deadline" type="datetime-local" /></label>}<label className="form-label">Lý do<input required maxLength={1000} className="text-input" name="reason" /></label>{error && <p role="alert">{error}</p>}</div><div className="modal-footer"><button className="btn-primary" disabled={busy}>{busy ? "Đang xử lý…" : "Xác nhận"}</button></div></form>
    </div></div>}
  </div>;
}
