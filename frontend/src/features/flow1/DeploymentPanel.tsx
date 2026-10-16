import { useEffect, useRef, useState } from "react";
import { flow1Error } from "./api";
import { deploymentApi } from "./deploymentApi";
import type { Deployment } from "./deploymentApi";
import { operationKey } from "./reviewApi";
export function DeploymentPanel({ id, manager = false }: { id: string; manager?: boolean }) {
  const [value, setValue] = useState<Deployment | null>(null); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const key = useRef({ hash: "", key: "" });
  useEffect(() => { let active = true; deploymentApi.get(id, manager).then(v => { if (active) { setValue(v); setError(""); } })
    .catch(e => { if (active) setError(flow1Error(e)); }); return () => { active = false; }; }, [id, manager]);
  async function act(action: string) {
    if (!value) return; setBusy(true); setError(""); const input = { expectedVersion: value.version, reason };
    try { setValue(await deploymentApi.act(id, action, input, operationKey(key, action, { id, input }))); setReason(""); key.current = { hash: "", key: "" }; }
    catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
  }
  return <section aria-label="Bàn giao vận hành"><h2>Xác nhận triển khai chuyến</h2>{error && <p role="alert">{error}</p>}
    {value && <><p>Triển khai: {value.status} · Trạng thái chuyến: {value.tripStatus}</p>
      <p>Chuyến {value.tripId}. Điều phối và chuyên viên chỉ nhận bàn giao khi triển khai đã xác nhận.</p>
      {manager && <><label>Lý do quyết định triển khai (nội bộ)<textarea maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></label>
        {value.canConfirm && <button disabled={busy || !reason.trim()} onClick={() => act("confirm")}>Xác nhận bàn giao vận hành</button>}
        {value.canHold && <button disabled={busy || !reason.trim()} onClick={() => act("hold")}>Tạm giữ triển khai</button>}
        {value.canResume && <button disabled={busy || !reason.trim()} onClick={() => act("resume")}>Tiếp tục chờ xác nhận</button>}
        {!value.canConfirm && value.status === "PENDING" && <p>Cần kiểm tra lịch chuẩn bị, đối soát tài chính và hồ sơ trước khi xác nhận.</p>}</>}
      <ul aria-label="Lịch sử triển khai">{value.history.map((h, i) => <li key={i}>{h.action} · {new Date(h.atUtc).toLocaleString("vi-VN")}{h.reason && ` · ${h.reason}`}</li>)}</ul>
      <p>Đã nhận bàn giao: {value.acknowledgements.map(a => a.stream).join(", ") || "Chưa có"}</p></>}
    <button disabled={busy} onClick={async () => { setError(""); try { setValue(await deploymentApi.get(id, manager)); } catch (e) { setError(flow1Error(e)); } }}>Tải lại triển khai</button>
  </section>;
}
