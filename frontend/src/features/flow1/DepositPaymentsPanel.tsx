import { useEffect, useRef, useState } from "react";
import { flow1Error, money } from "./api";
import { paymentApi } from "./paymentApi";
import type { Payment, Payments } from "./paymentApi";
import { operationKey } from "./reviewApi";
import { DeploymentPanel } from "./DeploymentPanel";
import { CancellationPanel } from "./CancellationPanel";

export function DepositPaymentsPanel({ id, manager = false, reload }: { id: string; manager?: boolean; reload?: () => Promise<void> }) {
  const [value, setValue] = useState<Payments | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState(""); const [memo, setMemo] = useState(""); const [proof, setProof] = useState<File | null>(null);
  const [fileVersion, setFileVersion] = useState(0); const key = useRef({ hash: "", key: "" });
  const gatewayKey = useRef({ hash: "", key: "" }); const [gatewayUrl, setGatewayUrl] = useState("");
  useEffect(() => { let active = true; paymentApi.get(id, manager).then(v => { if (active) { setValue(v); setError(""); } })
    .catch(e => { if (active) setError(flow1Error(e)); }); return () => { active = false; }; }, [id, manager]);
  async function changed(v: Payments) { setValue(v); await reload?.(); }
  async function submit() {
    if (!proof) return; setBusy(true); setError("");
    try {
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await proof.arrayBuffer()))).map(x => x.toString(16).padStart(2, "0")).join("");
      const body = { declaredAmount: Number(amount), memo }; const data = new FormData(); data.append("payload", JSON.stringify(body)); data.append("proof", proof);
      const v = await paymentApi.submit(id, data, operationKey(key, "proof", { id, body, digest }));
      setAmount(""); setMemo(""); setProof(null); setFileVersion(v => v + 1); key.current = { hash: "", key: "" }; await changed(v);
    } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
  }
  return <section aria-label="Thanh toán cọc"><h2>Thanh toán cọc 40%</h2>{error && <p role="alert">{error}</p>}
    {!value && !error && <p>Đang tải thanh toán…</p>}{value && <>
      <p>Cọc cần thu: {money(value.requiredDeposit)} · Đã xác minh: {money(value.verifiedAmount)} · Còn thiếu: {money(value.outstandingAmount)}</p>
      <p>Hạn thanh toán hiệu lực: {new Date(value.effectiveDeadline).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (giờ Việt Nam)</p>
      <p>Trạng thái thanh toán: {value.paymentStatus}</p>
      {value.bankName && <p>Ngân hàng: {value.bankName} · Tài khoản: {value.bankAccount} · Chủ tài khoản: {value.beneficiary}</p>}
      <p>Nội dung chuyển khoản: {value.transferContent}</p><p>Chứng từ chờ xác minh chưa được tính là tiền đã nhận.</p>
      {!manager && value.canSubmit && value.vnpayAvailable && <><button disabled={busy} onClick={async () => {
        setBusy(true); setError(""); try {
          const session = await paymentApi.session(id, operationKey(gatewayKey, "vnpay-session", { id }));
          const url = new URL(session.paymentUrl); if (url.origin !== "https://sandbox.vnpayment.vn" || url.pathname !== "/paymentv2/vpcpay.html") throw new Error("Địa chỉ thanh toán không hợp lệ.");
          setGatewayUrl(session.paymentUrl); gatewayKey.current = { hash: "", key: "" }; setValue(await paymentApi.get(id));
        } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
      }}>Chuẩn bị thanh toán VNPay Sandbox</button>{gatewayUrl && <a href={gatewayUrl}>Mở cổng thanh toán VNPay Sandbox</a>}</>}
      {value.financialReviewRequired && <p role="status">Cần quản lý đối soát tài chính. Tiền dư: {money(value.excessAmount)}. Hệ thống không tự hoàn tiền.</p>}
      {manager && value.financialReviewRequired && <FinancialReview id={id} value={value} changed={changed} />}
      {manager && <FinancialHistory id={id} />}
      {!value.financialReviewRequired && value.excessAmount > 0 && <p>Tiền dư đã được quản lý rà soát: {money(value.excessAmount)}. Chưa có thao tác hoàn tiền tự động.</p>}
      {value.activation && <p role="status">Đã kích hoạt chuyến {value.activation.tripId}. Chờ xác nhận triển khai vận hành.{value.activation.scheduleNeedsReview && " Cần rà soát lại tính khả thi của lịch."}</p>}
      {!manager && value.canSubmit && <form onSubmit={e => { e.preventDefault(); void submit(); }}>
        <label>Số tiền đã chuyển (VND)<input required type="number" min={1} max={9999999999} step={1} value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <label>Ghi chú chuyển khoản<textarea maxLength={1000} value={memo} onChange={e => setMemo(e.target.value)} /></label>
        <label>Chứng từ ngân hàng (PDF, JPG, PNG; tối đa 5 MB)<input key={fileVersion} required type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setProof(e.target.files?.[0] || null)} /></label>
        <button disabled={busy || !proof || proof.size > 5 * 1024 * 1024 || Number(amount) <= 0}>Gửi chứng từ để xác minh</button></form>}
      {!manager && !value.canSubmit && !value.activation && <p>Hiện không nhận chứng từ mới. Liên hệ quản lý để kiểm tra hạn và trạng thái hợp đồng.</p>}
      <ul aria-label="Giao dịch cọc">{value.payments.map(p => <li key={`${p.paymentId}-${p.version}`}><p>{p.paymentId} · {p.method} · {p.status}</p>
        <p>Khai báo: {money(p.declaredAmount)} · Thực nhận đã xác minh: {money(p.verifiedAmount)}{p.reference && ` · Mã ngân hàng: ${p.reference}`}</p>
        {p.memo && <p>Ghi chú: {p.memo}</p>}{p.reason && <p>Lý do từ chối: {p.reason}</p>}{p.late && <p>Tiền đến sau hạn thanh toán.</p>}
        {p.hasProof && <button onClick={() => paymentApi.proof(id, p.paymentId, manager).catch(e => setError(flow1Error(e)))}>Tải chứng từ {p.paymentId}</button>}
        {manager && p.status === "PENDING_CONFIRMATION" && p.method === "BANK_TRANSFER" && <BankReview id={id} payment={p} changed={changed} />}</li>)}</ul>
      <button disabled={busy} onClick={async () => { setError(""); try { await changed(await paymentApi.get(id, manager)); } catch (e) { setError(flow1Error(e)); } }}>Tải lại thanh toán</button>
      {manager && value.contractStatus === "SIGNED" && value.requestStatus === "AWAITING_DEPOSIT" && value.overdue && <CancelOverdue id={id} value={value} changed={changed} />}
      {value.activation && <DeploymentPanel id={id} manager={manager} />}
      <CancellationPanel id={id} manager={manager} payments={value} refresh={async () => changed(await paymentApi.get(id, manager))} />
    </>}</section>;
}
function FinancialHistory({ id }: { id: string }) {
  const [history, setHistory] = useState<Awaited<ReturnType<typeof paymentApi.reviewHistory>> | null>(null); const [error, setError] = useState("");
  return <details><summary>Lịch sử đối soát tài chính (nội bộ)</summary>{error && <p role="alert">{error}</p>}
    <button onClick={async () => { setError(""); try { setHistory(await paymentApi.reviewHistory(id)); } catch (e) { setError(flow1Error(e)); } }}>Tải lịch sử đối soát</button>
    {history && <ul>{history.items.map((h, i) => <li key={i}>{h.action} · {h.actor} · {new Date(h.atUtc).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}{h.reason && ` · ${h.reason}`}</li>)}</ul>}
  </details>;
}
function FinancialReview({ id, value, changed }: { id: string; value: Payments; changed: (v: Payments) => Promise<void> }) {
  const [reason, setReason] = useState(""); const [checked, setChecked] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const key = useRef({ hash: "", key: "" });
  return <fieldset><legend>Rà soát tài chính</legend>{error && <p role="alert">{error}</p>}
    <p>Ghi nhận quyết định trên đúng ledger hiện tại; không sửa số tiền, không tạo hoàn tiền. Sai lệch callback cần đối soát với nhà cung cấp.</p>
    <label>Quyết định tài chính (nội bộ)<textarea maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></label>
    <label><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />Tôi đã kiểm tra các khoản thực nhận</label>
    <button disabled={busy || !checked || !reason.trim()} onClick={async () => {
      const input = { expectedLedgerVersion: value.ledgerVersion!, expectedDeadlineVersion: value.deadlineVersion, reason, reviewedActualReceipts: checked };
      setBusy(true); setError(""); try { const v = await paymentApi.review(id, input, operationKey(key, "financial-review", { id, input })); setReason(""); setChecked(false); await changed(v); }
      catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
    }}>Lưu quyết định rà soát tài chính</button></fieldset>;
}
function CancelOverdue({ id, value, changed }: { id: string; value: Payments; changed: (v: Payments) => Promise<void> }) {
  const [reason, setReason] = useState(""); const [checked, setChecked] = useState(false); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const key = useRef({ hash: "", key: "" });
  return <details><summary>Hủy yêu cầu quá hạn sau đối soát</summary><p>Chỉ hủy khi không có tiền đã nhận và không còn giao dịch chờ. Tiền một phần cần xử lý tài chính riêng.</p>
    {error && <p role="alert">{error}</p>}<label>Lý do hủy sau đối soát<textarea maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
    <label><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />Tôi đã đối soát mọi kênh thanh toán</label>
    <button disabled={busy || !checked || !reason.trim() || value.verifiedAmount > 0 || value.payments.some(p => ["PENDING_CONFIRMATION", "PENDING_GATEWAY"].includes(p.status))} onClick={async () => {
      setBusy(true); setError(""); const input = { expectedDeadlineVersion: value.deadlineVersion, reason, reconciliationConfirmed: checked };
      try { const v = await paymentApi.cancel(id, input, operationKey(key, "cancel-overdue", { id, input })); setReason(""); setChecked(false); await changed(v); }
      catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
    }}>Xác nhận hủy yêu cầu quá hạn</button></details>;
}
function BankReview({ id, payment: p, changed }: { id: string; payment: Payment; changed: (v: Payments) => Promise<void> }) {
  const [amount, setAmount] = useState(""); const [reference, setReference] = useState(""); const [received, setReceived] = useState("");
  const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const key = useRef({ hash: "", key: "" });
  async function act(reject = false) {
    setBusy(true); setError("");
    try {
      const input = { expectedVersion: p.version, receivedAmount: Number(amount), bankReference: reference.trim(), receivedAtUtc: received ? new Date(received + ":00+07:00").toISOString() : "" };
      const rejection = { expectedVersion: p.version, reason };
      const v = reject ? await paymentApi.reject(id, p.paymentId, rejection, operationKey(key, "reject", { id, p: p.paymentId, rejection }))
        : await paymentApi.confirm(id, p.paymentId, input, operationKey(key, "confirm", { id, p: p.paymentId, input }));
      setAmount(""); setReference(""); setReceived(""); setReason(""); await changed(v);
    } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
  }
  return <fieldset disabled={busy}><legend>Đối chiếu sao kê {p.paymentId}</legend>{error && <p role="alert">{error}</p>}
    <form onSubmit={e => { e.preventDefault(); void act(); }}>
      <label>Số thực nhận (VND)<input required type="number" min={1} max={9999999999} step={1} value={amount} onChange={e => setAmount(e.target.value)} /></label>
      <label>Mã giao dịch ngân hàng<input required minLength={6} maxLength={100} value={reference} onChange={e => setReference(e.target.value)} /></label>
      <label>Thời điểm nhận (giờ Việt Nam UTC+7)<input required type="datetime-local" value={received} onChange={e => setReceived(e.target.value)} /></label>
      <button disabled={!amount || !reference.trim() || !received}>Xác nhận tiền thực nhận</button></form>
    <label>Lý do từ chối chứng từ (khách xem được)<textarea maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
    <button disabled={!reason.trim()} onClick={() => act(true)}>Từ chối chứng từ</button>
  </fieldset>;
}
