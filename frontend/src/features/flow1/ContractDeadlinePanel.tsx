import { useEffect, useRef, useState } from "react";
import { deadlineApi } from "./deadlineApi";
import type { Deadlines } from "./deadlineApi";
import type { Publication } from "./publicationApi";
import { operationKey } from "./reviewApi";
import { flow1Error } from "./api";
const date = (value: string) => new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) + " (UTC+7)";
export function ContractDeadlinePanel({ publication, manager, readOnly = false, reload }: {
  publication: Publication; manager: boolean; readOnly?: boolean; reload: () => Promise<void>;
}) {
  const [view, setView] = useState<Deadlines | null>(null); const [next, setNext] = useState(""); const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const key = useRef({ hash: "", key: "" });
  useEffect(() => { let active = true;
    deadlineApi.get(publication.contractId, manager).then(v => { if (active) setView(v); }).catch(e => { if (active) setError(flow1Error(e)); });
    return () => { active = false; };
  }, [publication.contractId, publication.status, publication.deadlineVersion, publication.overdue, manager]);
  async function extend() {
    if (!view) return; setBusy(true); setError("");
    try {
      const input = { contractVersion: publication.version, documentHash: publication.documentHash, expectedExtensionVersion: view.version,
        newDeadline: new Date(next + "+07:00").toISOString(), reason };
      setView(await deadlineApi.extend(publication.contractId, input, operationKey(key, "extend-deadline", input)));
      setReason(""); setNext(""); await reload();
    } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
  }
  async function refresh() { setBusy(true); setError(""); try { setView(await deadlineApi.get(publication.contractId, manager)); await reload(); }
    catch (e) { setError(flow1Error(e)); } finally { setBusy(false); } }
  return <section><h3>Hạn hoàn tất ký và cọc</h3>{error && <p role="alert">{error}</p>}
    {view && <><p>Hạn hiệu lực: {date(view.effectiveCompletionDeadline)}</p><p>Hạn gốc trên PDF: {date(view.originalCompletionDeadline)}</p>
      {view.overdue && <p>Đã quá hạn thao tác mới. Yêu cầu và lịch ngựa vẫn được giữ để quản lý xử lý.</p>}
      <button disabled={busy} onClick={() => void refresh()}>Tải lại hạn hiệu lực</button>
      {!readOnly && manager && view.canExtend && <details><summary>Gia hạn hoàn tất ký và cọc</summary><form onSubmit={e => { e.preventDefault(); void extend(); }}>
        <label>Hạn mới (giờ Việt Nam UTC+7)<input required type="datetime-local" value={next} onChange={e => setNext(e.target.value)} /></label>
        <label>Lý do gia hạn (nội bộ)<textarea required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <p>Hạn mới phải muộn hơn hạn hiện tại và giữ đủ thời gian chuẩn bị trước khởi hành. PDF và chữ ký đã có được giữ nguyên.
          Mã OTP chưa sử dụng sẽ bị thu hồi; khách cần yêu cầu mã mới.</p>
        <button disabled={busy || !reason.trim() || !next}>Xác nhận gia hạn</button>
      </form></details>}
      {view.history.length > 0 && <ol aria-label="Lịch sử gia hạn">{view.history.map(e => <li key={e.version}>
        Gia hạn {e.version}: {date(e.previousDeadline)} → {date(e.newDeadline)} · {date(e.atUtc)}{e.reason && ` · ${e.reason}`}
      </li>)}</ol>}
    </>}
  </section>;
}
