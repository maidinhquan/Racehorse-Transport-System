import { useEffect, useRef, useState } from "react";
import { flow1Error } from "./api";
import { lifecycleApi } from "./lifecycleApi";
import type { Lifecycle } from "./lifecycleApi";
import type { Publication } from "./publicationApi";
import { operationKey } from "./reviewApi";

export function ContractLifecyclePanel({ publication, manager, readOnly = false, reload }: {
  publication: Publication; manager: boolean; readOnly?: boolean; reload: () => Promise<void>;
}) {
  const [view, setView] = useState<Lifecycle | null>(null); const [reason, setReason] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const key = useRef({ hash: "", key: "" });
  useEffect(() => { let active = true; lifecycleApi.get(publication.contractId, manager)
    .then(v => { if (active) setView(v); }).catch(e => { if (active) setError(flow1Error(e)); });
    return () => { active = false; }; }, [publication.contractId, publication.status, manager]);
  async function close() {
    if (!view) return; setBusy(true); setError("");
    const input = { contractVersion: publication.version, documentHash: publication.documentHash, expectedLifecycleVersion: view.version, reason };
    try { setView(await lifecycleApi.close(publication.contractId, manager, input, operationKey(key, manager ? "expire" : "decline", input))); await reload(); }
    catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
  }
  return <section><h3>Tình trạng phiên bản hợp đồng</h3>{error && <p role="alert">{error}</p>}
    {view && <p>Phiên bản này: {view.status}</p>}
    {!readOnly && view && (manager ? view.canExpire : view.canDecline) && <details><summary>{manager ? "Xử lý phiên bản quá hạn" : "Từ chối phiên bản hợp đồng"}</summary>
      <form onSubmit={e => { e.preventDefault(); void close(); }}>
        <label>{manager ? "Lý do đánh dấu hết hạn" : "Lý do từ chối hợp đồng"}<textarea required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <p>Thao tác đóng phiên bản chưa ký. Yêu cầu vận chuyển vẫn được giữ để quản lý xử lý tiếp.</p>
        <button disabled={busy || !reason.trim()}>{manager ? "Đánh dấu hợp đồng hết hạn" : "Xác nhận từ chối hợp đồng"}</button>
      </form></details>}
    {!readOnly && manager && view?.canReissue && <p>Có thể tạo Draft mới để phát hành lại trong phần giá bán bên trên.</p>}
    {view?.history.map((event, i) => <p key={i}>{event.action} · {new Date(event.atUtc).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (UTC+7)
      {event.reason && ` · ${event.reason}`}{event.replacementContractId && ` · Draft mới: ${event.replacementContractId}`}</p>)}
  </section>;
}
