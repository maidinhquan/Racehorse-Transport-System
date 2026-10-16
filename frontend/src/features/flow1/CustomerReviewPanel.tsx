import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { money, flow1Error } from "./api";
import { operationKey, reviewApi } from "./reviewApi";
import type { CustomerReview } from "./reviewApi";

export function CustomerReviewPanel({ id, value, reload }: { id: string; value: CustomerReview; reload: () => Promise<void> }) {
  const [answer, setAnswer] = useState<Record<string, string>>({}); const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const key = useRef({ hash: "", key: "" });
  async function act(action: string, fields: Record<string, unknown>) {
    const body = { expectedVersion: value.version, ...fields }; setBusy(true); setError("");
    try { await reviewApi.actCustomer(id, action, body, operationKey(key, action, body)); await reload(); }
    catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
  }
  return <section><h2>Thẩm định và phản hồi</h2>
    {value.feedback && <p>Phản hồi quản lý: {value.feedback}</p>}
    {value.revisionFields.length > 0 && <p>Nội dung cần sửa: {value.revisionFields.join(", ")}</p>}
    {value.recoveryRequired && <p role="alert">Có thao tác cần phục hồi. Thử lại thao tác vừa gửi hoặc liên hệ quản lý.</p>}
    {error && <p role="alert">{error}</p>}
    {value.allowedActions.includes("RESUBMIT") && <p><Link to={`/customer/requests/${id}/revision`}>Chỉnh sửa và gửi lại</Link></p>}
    {value.allowedActions.includes("PROPOSE_CHANGE") && <p><Link to={`/customer/requests/${id}/change`}>Đề xuất thay đổi yêu cầu</Link></p>}
    {value.questions.map(q => <article key={q.id}><p>Câu hỏi: {q.question}</p>{q.answer ? <p>Trả lời: {q.answer}</p> :
      <form onSubmit={e => { e.preventDefault(); void act("info-responses", { questionId: q.id, reason: answer[q.id] }); }}>
        <label>Câu trả lời<textarea required maxLength={2000} value={answer[q.id] || ""} onChange={e => setAnswer({ ...answer, [q.id]: e.target.value })} /></label>
        <button disabled={busy}>Gửi câu trả lời</button></form>}</article>)}
    {value.changes.map(c => <p key={c.id}>Đề xuất: {c.reason} · {c.status}{c.decisionReason && ` · ${c.decisionReason}`}</p>)}
    {value.contract && <aside><h3>Hợp đồng đang soạn</h3><p>{value.contract.contractId} · {value.contract.status}</p>
      {value.contract.lines.map((l, i) => <p key={i}>{l.description}: {money(l.quantity * l.unitPrice)}</p>)}
      <p>Tổng: {money(value.contract.total)} · Cọc 40%: {money(value.contract.deposit)}</p><p>Chưa phát hành để xác nhận.</p></aside>}
    {value.allowedActions.includes("CANCEL") && <details><summary>Hủy yêu cầu</summary><form onSubmit={e => { e.preventDefault(); void act("cancel", { reason }); }}>
      <label>Lý do hủy<textarea required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></label><button disabled={busy}>Xác nhận hủy yêu cầu</button>
    </form></details>}
    <ul aria-label="Thông báo yêu cầu">{value.notices.map(n => <li key={n.id}>{n.message}</li>)}</ul>
  </section>;
}
