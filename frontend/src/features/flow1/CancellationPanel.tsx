import { useRef, useState } from "react";
import { flow1Error } from "./api";
import { cancellationApi } from "./cancellationApi";
import type { Cancellations } from "./cancellationApi";
import type { Payments } from "./paymentApi";
import { operationKey } from "./reviewApi";
export function CancellationPanel({ id, manager, payments, refresh }: { id: string; manager: boolean; payments: Payments; refresh: () => Promise<void> }) {
  const [view, setView] = useState<Cancellations | null>(null); const [reason, setReason] = useState(""); const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const key = useRef({ hash: "", key: "" });
  async function load() { setBusy(true); setError(""); try { setView(await cancellationApi.get(id, manager)); await refresh(); } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); } }
  async function act(cancellationId?: string, approve = false) {
    if (!view) return; setBusy(true); setError("");
    try {
      const body = { expectedVersion: view.version, reason };
      const decision = { ...body, expectedLedgerVersion: payments.ledgerVersion!, expectedDeadlineVersion: payments.deadlineVersion, reconciliationConfirmed: checked };
      const value = cancellationId ? await cancellationApi.decide(id, cancellationId, approve, decision, operationKey(key, approve ? "approve-cancellation" : "reject-cancellation", { id, cancellationId, decision }))
        : await cancellationApi.request(id, body, operationKey(key, "request-cancellation", { id, body }));
      setView(value); setReason(""); setChecked(false); key.current = { hash: "", key: "" }; await refresh();
    } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
  }
  const pending = view?.items.find(x => x.status === "PENDING");
  return <details><summary>Yêu cầu hủy sau ký</summary>
    <p>Đây là đề nghị để quản lý xét duyệt. Chữ ký, tiền đã nhận và lịch sử không bị xóa; không tự tính phí hoặc hoàn tiền.</p>
    {error && <p role="alert">{error}</p>}<button disabled={busy} onClick={load}>Tải yêu cầu hủy và số tiền mới nhất</button>
    {view && <><ul aria-label="Yêu cầu hủy sau ký">{view.items.map(x => <li key={x.id}>{x.status} · {x.customerReason}{x.decisionReason && ` · Quyết định: ${x.decisionReason}`}</li>)}</ul>
      {(view.canRequest || view.canReview) && <label>{manager ? "Lý do quyết định hủy (khách xem được)" : "Lý do đề nghị hủy"}<textarea maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></label>}
      {!manager && view.canRequest && <button disabled={busy || !reason.trim()} onClick={() => act()}>Gửi đề nghị hủy để quản lý xét duyệt</button>}
      {manager && view.canReview && pending && <><p>Chỉ duyệt khi không có tiền xác minh, giao dịch chờ hoặc sai lệch provider. Từ chối đề nghị sẽ mở lại thanh toán; tiền đã đủ có thể kích hoạt chuyến.</p>
        <label><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />Đã đối soát không có tiền và không còn giao dịch chờ</label>
        <button disabled={busy || !reason.trim() || !checked || payments.verifiedAmount > 0 || payments.payments.some(p => ["PENDING_CONFIRMATION", "PENDING_GATEWAY"].includes(p.status))} onClick={() => act(pending.id, true)}>Duyệt yêu cầu hủy sau ký</button>
        <button disabled={busy || !reason.trim()} onClick={() => act(pending.id, false)}>Từ chối yêu cầu hủy sau ký</button></>}
      {pending && !manager && <p>Đang chờ quản lý xét duyệt. Tạm khóa chứng từ và phiên thanh toán mới; khoản tiền thực nhận vẫn được đối soát.</p>}
    </>}
  </details>;
}
