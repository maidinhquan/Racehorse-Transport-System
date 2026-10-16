import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { flow1Error } from "./api";
import { deploymentApi } from "./deploymentApi";
import type { Deployment, Handoff } from "./deploymentApi";
import { operationKey } from "./reviewApi";
import "./flow1.css";
export function OperationsInbox({ stream }: { stream: "ROUTING" | "DOCUMENTS" }) {
  const [queue, setQueue] = useState<Deployment[]>([]); const [value, setValue] = useState<Handoff | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const key = useRef({ hash: "", key: "" });
  useEffect(() => { let active = true; deploymentApi.queue().then(v => { if (active) setQueue(v); }).catch(e => { if (active) setError(flow1Error(e)); });
    return () => { active = false; }; }, []);
  async function refresh() { setError(""); setValue(null); try { setQueue(await deploymentApi.queue()); } catch (e) { setError(flow1Error(e)); } }
  async function ack() {
    const row = queue.find(x => x.tripId === value?.tripId); if (!row || !value) return; setBusy(true); setError("");
    const input = { expectedVersion: row.version, eventId: value.eventId, stream };
    try { setValue(await deploymentApi.ack(row.tripId, input, operationKey(key, "handoff-ack", { trip: row.tripId, input }))); setQueue(await deploymentApi.queue()); }
    catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
  }
  return <main className="flow1-page"><Link to={stream === "ROUTING" ? "/coordinator/dashboard" : "/specialist/dashboard"}>← Dashboard</Link>
    <h1>Tiếp nhận chuyến từ Flow 1</h1><p>{stream === "ROUTING" ? "Điều phối tuyến và nguồn lực" : "Chuyên viên hồ sơ và thủ tục"}</p>
    {error && <p role="alert">{error}</p>}<button disabled={busy} onClick={refresh}>Tải lại hàng đợi bàn giao</button>
    {!queue.length && <p>Chưa có chuyến đã kích hoạt trong hàng đợi.</p>}
    <ul aria-label="Hàng đợi bàn giao">{queue.map(q => <li key={q.tripId}>{q.requestId} · {q.tripId} · {q.status}
      <button disabled={busy || q.status !== "CONFIRMED"} onClick={async () => { setBusy(true); setError(""); setValue(null);
        try { setValue(await deploymentApi.handoff(q.tripId)); } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
      }}>Xem bàn giao {q.tripId}</button></li>)}</ul>
    {value && <section aria-label="Gói bàn giao"><h2>{value.tripId}</h2><p>Mã bàn giao: {value.eventId} · v{value.schemaVersion}</p>
      <p>{value.request.trip.pickup.address} → {value.request.trip.delivery.address}</p>
      <p>Khởi hành: {value.plan.departureDate} · Hạn giao: {value.plan.deliveryDate} · Chuẩn bị: {value.plan.preparationDays} ngày</p>
      <p>{value.plan.vehicleCount} xe · {value.plan.stallsRequired} stall · {value.plan.resources}</p>
      {value.plan.departureGateway && <p>{value.plan.departureGateway} → {value.plan.arrivalGateway} · Phạm vi chặng đất liền: {value.plan.groundLegScope}</p>}
      <p>Người giao: {value.request.pickupContact.name} · {value.request.pickupContact.phone}</p>
      <p>Người nhận: {value.request.receiver.name} · {value.request.receiver.phone}{value.request.receiver.isProxy && " · cần xác minh người nhận thay"}</p>
      <p>Hợp đồng {value.contractId}, bản {value.contractVersion}; kế hoạch bản {value.planVersion}.</p>
      <p>Hồ sơ cần chuyên viên kiểm tra; tiếp nhận không tự phê duyệt giấy tờ hoặc đánh dấu đã mua bảo hiểm.</p>
      <ul>{value.request.horses.map(h => <li key={h.horseId}>{h.horseId} · Hồ sơ v{h.documentVersion}
        {["photo", "passport"].map(kind => <button key={kind} onClick={() => deploymentApi.document(value.tripId, h.horseId, h.documentVersion, kind).catch(e => setError(flow1Error(e)))}>
          Tải {kind === "photo" ? "ảnh" : "hộ chiếu"} {h.horseId}</button>)}</li>)}</ul>
      {value.acknowledgements.some(a => a.stream === stream) ? <p role="status">Đã tiếp nhận bàn giao {stream}.</p>
        : <button disabled={busy} onClick={ack}>Xác nhận tiếp nhận {stream}</button>}
    </section>}
  </main>;
}
