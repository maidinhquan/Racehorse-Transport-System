import { useEffect, useRef, useState } from "react";
import { acceptanceApi } from "./acceptanceApi";
import type { Acceptance, OtpChallenge } from "./acceptanceApi";
import type { Publication } from "./publicationApi";
import { flow1Error } from "./api";
import { operationKey } from "./reviewApi";

const date = (value: string) => new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
export function ContractAcceptancePanel({ publication, manager, pdfViewed, reload }: {
  publication: Publication; manager: boolean; pdfViewed: boolean; reload: () => Promise<void>;
}) {
  const [view, setView] = useState<Acceptance | null>(null); const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [accepted, setAccepted] = useState(false); const [otp, setOtp] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [now, setNow] = useState(Date.now);
  const key = useRef({ hash: "", key: "" });
  useEffect(() => { let active = true;
    acceptanceApi.get(publication.contractId, manager).then(x => { if (active) setView(x); }).catch(e => { if (active) setError(flow1Error(e)); });
    return () => { active = false; };
  }, [publication.contractId, publication.status, manager]);
  useEffect(() => { if (!challenge) return; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [challenge]);
  const bound = { contractVersion: publication.version, documentHash: publication.documentHash };
  async function act(action: "otp" | "sign" | "refresh") {
    setBusy(true); setError("");
    try {
      if (action === "otp") { setChallenge(await acceptanceApi.otp(publication.contractId, bound)); setOtp(""); setNow(Date.now()); }
      else if (action === "sign") {
        const input = { ...bound, challengeId: challenge!.challengeId, otp, acceptedTerms: accepted };
        setView(await acceptanceApi.sign(publication.contractId, input, operationKey(key, "sign", input)));
        setOtp(""); setChallenge(null); key.current = { hash: "", key: "" }; await reload();
      } else {
        setView(await acceptanceApi.get(publication.contractId, manager));
        await reload();
      }
    } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
  }
  const cooldown = challenge ? Math.max(0, Math.ceil((new Date(challenge.resendAt).getTime() - now) / 1000)) : 0;
  const expired = challenge !== null && new Date(challenge.expiresAt).getTime() <= now;
  return <section><h3>Xác nhận hợp đồng bằng OTP</h3>{error && <p role="alert">{error}</p>}
    <button disabled={busy} onClick={() => act("refresh")}>Tải lại trạng thái xác nhận</button>
    {!manager && publication.status === "PENDING_SIGNATURE" && view?.status === "PENDING_SIGNATURE" && !view.recoveryRequired && !view.overdue && <>
      <p>Mã gửi đến email tài khoản và chỉ dùng cho phiên bản {publication.version} cùng SHA-256 ở trên.</p>
      {!pdfViewed && <p>Mở PDF trước khi xác nhận nội dung.</p>}
      <label><input type="checkbox" checked={accepted} disabled={!pdfViewed || busy} onChange={e => setAccepted(e.target.checked)} />Tôi đã đọc và đồng ý với đúng bản PDF này</label>
      <button disabled={busy || !accepted || !pdfViewed || cooldown > 0} onClick={() => act("otp")}>{cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : challenge ? "Gửi lại mã OTP" : "Gửi mã OTP"}</button>
      {challenge && <form onSubmit={e => { e.preventDefault(); void act("sign"); }}>
        <p>Mã hết hạn lúc {date(challenge.expiresAt)} (UTC+7). Tối đa 5 lần nhập sai.</p>{expired && <p role="alert">Mã đã hết hạn, hãy yêu cầu mã mới.</p>}
        <label>Mã OTP<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} /></label>
        <button disabled={busy || expired || otp.length !== 6 || !accepted || !pdfViewed}>Xác nhận ký hợp đồng</button>
      </form>}
    </>}
    {view?.overdue && !view.receipt && <p>Đã quá hạn ký. Liên hệ Manager; yêu cầu không tự hủy.</p>}
    {view?.receipt && <><p role="status">Đã xác nhận bằng OTP email lúc {date(view.receipt.signedAtUtc)} (UTC+7).</p>
      <p>Biên nhận gắn với phiên bản {view.receipt.contractVersion}, SHA-256 <code style={{ overflowWrap: "anywhere" }}>{view.receipt.documentHash}</code>.</p>
      {view.invoice && <p>Hóa đơn cọc {view.invoice.invoiceId}: {view.invoice.amount.toLocaleString("vi-VN")} VND (40%) · {view.invoice.status}.</p>}
      <p>PDF đã phát hành giữ nguyên nội dung. Chuyến chỉ được tạo sau khi đủ cọc đã xác minh.</p></>}
  </section>;
}
