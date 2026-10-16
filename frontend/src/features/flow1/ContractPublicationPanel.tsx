import { useEffect, useRef, useState } from "react";
import { flow1Error } from "./api";
import { operationKey } from "./reviewApi";
import { publicationApi } from "./publicationApi";
import type { Publication } from "./publicationApi";
export function ContractPublicationPanel({ id, manager = false, reviewVersion = 0, status, reload }: {
  id: string; manager?: boolean; reviewVersion?: number; status: string; reload: () => Promise<void> }) {
  const [publication, setPublication] = useState<Publication | null>(null); const [error, setError] = useState("");
  const [deadline, setDeadline] = useState(""); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(""); const key = useRef({ hash: "", key: "" });
  useEffect(() => { let active = true; if (manager || status !== "DRAFT") publicationApi.get(id, manager)
    .then(x => { if (active) setPublication(x); }).catch(e => { if (active) setError(flow1Error(e)); });
    return () => { active = false; }; }, [id, manager, status, reviewVersion]);
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);
  async function act(operation: "send" | "recover" | "discard") {
    setBusy(true); setError("");
    try {
      if (operation === "send") {
        const input = { expectedReviewVersion: reviewVersion, completionDeadline: new Date(deadline + "+07:00").toISOString() };
        setPublication(await publicationApi.send(id, input, operationKey(key, "publish", input)));
      } else if (operation === "recover") setPublication(await publicationApi.recover(id));
      else { await publicationApi.discard(id, reason); setPublication(null); key.current = { hash: "", key: "" }; }
      await reload();
    } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
  }
  return <section><h3>PDF hợp đồng</h3>{error && <p role="alert">{error}</p>}
    {manager && status === "DRAFT" && !publication && <form onSubmit={e => { e.preventDefault(); void act("send"); }}>
      <label>Hạn hoàn tất ký và cọc (giờ Việt Nam UTC+7)<input required type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} /></label>
      <p>Phát hành sẽ cố định nội dung, PDF và hạn gốc. Backend kiểm tra thời gian chuẩn bị trước khởi hành.</p>
      <button disabled={busy}>Phát hành PDF hợp đồng</button></form>}
    {publication?.recoveryRequired && <><p role="alert">Phát hành cần phục hồi. PDF chưa được mở cho khách.</p>{manager && <>
      <button disabled={busy} onClick={() => act("recover")}>Phục hồi phát hành</button>
      <label>Lý do bỏ bản chuẩn bị<textarea maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <button disabled={busy || !reason.trim()} onClick={() => act("discard")}>Bỏ bản phát hành chuẩn bị</button></>}</>}
    {publication && !publication.recoveryRequired && <><p>Phiên bản {publication.version} · {publication.templateVersion} · {publication.status}</p>
      <p>Hạn gốc: {new Date(publication.originalCompletionDeadline).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (UTC+7)</p>
      <p>SHA-256: <code style={{ overflowWrap: "anywhere" }}>{publication.documentHash}</code></p>
      {publication.overdue && <p>Đã quá hạn thao tác mới. Yêu cầu không tự hủy.</p>}
      <button disabled={busy} onClick={async () => { setBusy(true); try { setPdfUrl(await publicationApi.pdf(id, manager)); } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); } }}>Xem PDF đã phát hành</button>
      {pdfUrl && <><p><a href={pdfUrl} download={`${id}.pdf`}>Tải đúng bản PDF này</a></p><iframe title="PDF hợp đồng đã phát hành" src={pdfUrl} style={{ width: "100%", height: 720 }} /></>}
    </>}
  </section>;
}
