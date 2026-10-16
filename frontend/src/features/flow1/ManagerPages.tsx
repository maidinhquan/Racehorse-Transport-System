import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { flow1Error, money } from "./api";
import { operationKey, reviewApi } from "./reviewApi";
import type { ManagerReview, PlanInput, Line } from "./reviewApi";
import { MapDataAttribution } from "./TripFields";
import "./flow1.css";
import { ContractPublicationPanel } from "./ContractPublicationPanel";

export function ManagerRequestsPage() {
  const [status, setStatus] = useState("PENDING"); const [page, setPage] = useState(1);
  const [value, setValue] = useState<Awaited<ReturnType<typeof reviewApi.list>> | null>(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; reviewApi.list(status, page).then(x => { if (active) { setValue(x); setError(""); } }).catch(e => { if (active) setError(flow1Error(e)); });
    return () => { active = false; }; }, [status, page]);
  return <main className="flow1-page"><h1>Thẩm định yêu cầu vận chuyển</h1><Link to="/login">Đổi tài khoản</Link>
    <label>Trạng thái lọc<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
      {["", "PENDING", "CHANGES_REQUESTED", "ACCEPTED", "REJECTED", "CANCELLED"].map(s => <option key={s} value={s}>{s || "Tất cả"}</option>)}
    </select></label>{error && <p role="alert">{error}</p>}
    {!value && !error && <p>Đang tải…</p>}
    {value && <><p>{value.totalCount} yêu cầu</p><ul>{value.items.map(r => <li key={r.requestId}><Link to={`/manager/requests/${r.requestId}`}>
      {r.departure} → {r.destination}</Link> · {r.status}</li>)}</ul><MapDataAttribution text="Geoapify" />
      <button disabled={page === 1} onClick={() => setPage(page - 1)}>Trang trước</button><span> Trang {page} </span>
      <button disabled={page * value.pageSize >= value.totalCount} onClick={() => setPage(page + 1)}>Trang sau</button></>}
  </main>;
}
export function ManagerRequestPage() {
  const { requestId = "" } = useParams(); const [value, setValue] = useState<ManagerReview | null>(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; reviewApi.manager(requestId).then(v => { if (active) setValue(v); }).catch(e => { if (active) setError(flow1Error(e)); });
    return () => { active = false; }; }, [requestId]);
  return <main className="flow1-page"><Link to="/manager/requests">← Yêu cầu vận chuyển</Link>
    {error && <p role="alert">{error}</p>}{value && <ManagerWork key={value.version} value={value} update={setValue} />}</main>;
}
function Lines({ title, value, change }: { title: string; value: Line[]; change: (value: Line[]) => void }) {
  return <fieldset><legend>{title}</legend>{value.map((l, i) => <div key={i}>
    <label>Nhóm khoản {i + 1}<select value={l.category} onChange={e => change(value.map((x, j) => j === i ? { ...x, category: e.target.value } : x))}>
      {["TRANSPORT", "PROCEDURE", "VETERINARY_CARE", "INSURANCE"].map(c => <option key={c}>{c}</option>)}</select></label>
    <label>Mô tả khoản {i + 1}<input required maxLength={200} value={l.description} onChange={e => change(value.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} /></label>
    <label>Số lượng khoản {i + 1}<input required type="number" min={0.001} max={1000} step="0.001" value={l.quantity} onChange={e => change(value.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) } : x))} /></label>
    <label>Đơn giá VND khoản {i + 1}<input required type="number" min={1} max={9999999999} step={1} value={l.unitPrice} onChange={e => change(value.map((x, j) => j === i ? { ...x, unitPrice: Number(e.target.value) } : x))} /></label>
    <button type="button" onClick={() => change(value.filter((_, j) => j !== i))}>Xóa khoản {i + 1}</button>
  </div>)}<button type="button" disabled={value.length >= 20} onClick={() => change([...value, { category: "TRANSPORT", description: "", quantity: 1, unitPrice: 1 }])}>Thêm khoản</button></fieldset>;
}
function ManagerWork({ value: v, update }: { value: ManagerReview; update: (v: ManagerReview) => void }) {
  const input = v.request.snapshot!.input; const estimate = v.request.snapshot!.estimate;
  const [reason, setReason] = useState(""); const [fields, setFields] = useState(["CONTACTS"]);
  const [plan, setPlan] = useState<PlanInput>(v.plan?.input || { departureDate: input.trip.desiredDepartureDate, deliveryDate: input.deliveryDeadline,
    preparationDays: estimate.minimumPreparationDays, vehicleCount: input.trip.preferredTransportMode === "AIR" ? 0 : input.trip.horseCount,
    stallsRequired: input.trip.horseCount, resources: "", departureGateway: null, arrivalGateway: null, groundLegScope: "EXCLUDED", additionalCosts: [] });
  const [costs, setCosts] = useState<Line[]>((v.plan?.input.additionalCosts || []).map(l => ({ ...l, unitPrice: l.unitCost })));
  const [lines, setLines] = useState<Line[]>(v.contract?.lines || [{ category: "TRANSPORT", description: "Gói vận chuyển theo kế hoạch", quantity: 1, unitPrice: v.plan?.suggested || 1 }]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const key = useRef({ hash: "", key: "" });
  const can = (action: string) => v.allowedActions.includes(action);
  async function act(action: string, payload: Record<string, unknown> = {}) {
    const body = { expectedVersion: v.version, ...payload }; setBusy(true); setError("");
    try { update(await reviewApi.actManager(v.request.requestId, action, body, operationKey(key, action, body))); }
    catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
  }
  return <><h1>{v.request.departure} → {v.request.destination}</h1><p>Trạng thái: {v.request.status} · Phiên bản thẩm định: {v.version}</p>
    <p>Khởi hành: {input.trip.desiredDepartureDate} · Hạn giao: {input.deliveryDeadline} · {input.trip.horseCount} ngựa</p>
    <p>Người giao: {input.pickupContact.name} · {input.pickupContact.phone}</p><p>Người nhận: {input.receiver.name} · {input.receiver.phone}{input.receiver.isProxy && " · cần xác minh người nhận thay"}</p>
    <ul>{input.horses.map(h => <li key={h.horseId}>{h.horseId} · Hồ sơ v{h.documentVersion}
      {["photo", "passport"].map(kind => <button key={kind} onClick={() => reviewApi.document(v.request.requestId, h.horseId, h.documentVersion, kind).catch(e => setError(flow1Error(e)))}>
        Tải {kind === "photo" ? "ảnh" : "hộ chiếu"}</button>)}</li>)}</ul>
    <MapDataAttribution text={estimate.attribution || estimate.locationAttribution} />
    {error && <p role="alert">{error}</p>}{v.review.feedback && <p>Phản hồi: {v.review.feedback}</p>}
    {v.review.pending && <p role="alert">Có thao tác {v.review.pending.operation.action} cần phục hồi. Thử lại thao tác đã gửi hoặc loại bỏ bản chuẩn bị nếu SQL chưa commit.</p>}
    <label>Lý do hoặc câu hỏi<textarea maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></label>
    {can("ACCEPT") && <button disabled={busy} onClick={() => act("accept")}>Chấp nhận yêu cầu</button>}
    {can("REJECT") && <button disabled={busy || !reason.trim()} onClick={() => act("reject", { reason })}>Từ chối yêu cầu</button>}
    {can("ASK_INFO") && <button disabled={busy || !reason.trim()} onClick={() => act("info-requests", { reason })}>Hỏi bổ sung</button>}
    {can("DISCARD_PREPARED") && <button disabled={busy || !reason.trim()} onClick={() => act("discard-prepared", { reason })}>Loại bỏ thao tác chuẩn bị</button>}
    {can("REQUEST_REVISION") && <fieldset><legend>Nội dung cần chỉnh sửa</legend>{["ROUTE", "DATES", "CONTACTS", "HORSES", "DOCUMENTS", "PURPOSE"].map(f => <label key={f}>
      <input type="checkbox" checked={fields.includes(f)} onChange={e => setFields(e.target.checked ? [...fields, f] : fields.filter(x => x !== f))} />{f}</label>)}
      <button disabled={busy || !reason.trim() || !fields.length} onClick={() => act("request-revision", { reason, fields })}>Yêu cầu chỉnh sửa</button></fieldset>}
    {v.review.questions.map(q => <p key={q.id}>Hỏi: {q.question} · Trả lời: {q.answer || "Chưa trả lời"}</p>)}
    {v.review.changes.map(c => <article key={c.id}><p>Đề xuất: {c.reason} · {c.status}</p><p>{c.proposal.trip.pickup.address} → {c.proposal.trip.delivery.address} · {c.proposal.trip.desiredDepartureDate} → {c.proposal.deliveryDeadline}</p>
      <p>Phương thức: {c.proposal.trip.preferredTransportMode} · Mục đích: {c.proposal.purpose}</p>
      <p>Người giao đề xuất: {c.proposal.pickupContact.name} · {c.proposal.pickupContact.phone}</p>
      <p>Người nhận: {c.proposal.receiver.name} · {c.proposal.receiver.phone} · {c.proposal.horses.length} ngựa{c.proposal.receiver.isProxy && " · cần xác minh người nhận thay"}</p>
      <ul>{c.proposal.horses.map(h => <li key={h.horseId}>Ngựa đề xuất: {h.horseId} · Hồ sơ v{h.documentVersion}
        {c.status === "PENDING" && ["photo", "passport"].map(kind => <button key={kind} onClick={() => reviewApi.document(v.request.requestId, h.horseId, h.documentVersion, kind).catch(e => setError(flow1Error(e)))}>
          Tải {kind === "photo" ? "ảnh" : "hộ chiếu"} đề xuất</button>)}</li>)}</ul>
      {c.status === "PENDING" && can("APPROVE_CHANGE") && <><button disabled={busy} onClick={() => act(`change-requests/${c.id}/approve`, { reason: reason || "Chấp nhận đề xuất" })}>Duyệt thay đổi</button>
        <button disabled={busy || !reason.trim()} onClick={() => act(`change-requests/${c.id}/reject`, { reason })}>Từ chối thay đổi</button></>}</article>)}
    {can("SAVE_PLAN") && <form onSubmit={e => { e.preventDefault(); void act("preliminary-plan", { plan: { ...plan, additionalCosts: costs.map(l => ({ category: l.category, description: l.description, quantity: l.quantity, unitCost: l.unitPrice })) } }); }}>
      <h2>Kế hoạch sơ bộ và ngân sách</h2><p>Lịch theo yêu cầu đã được khách xác nhận. Đổi lịch cần duyệt đề xuất thay đổi trước.</p>
      <label>Số ngày chuẩn bị<input required type="number" min={estimate.minimumPreparationDays} max={90} value={plan.preparationDays} onChange={e => setPlan({ ...plan, preparationDays: Number(e.target.value) })} /></label>
      <label>Số xe sơ bộ<input required type="number" min={0} max={100} value={plan.vehicleCount} onChange={e => setPlan({ ...plan, vehicleCount: Number(e.target.value) })} /></label>
      <label>Số stall sơ bộ<input required type="number" min={input.trip.horseCount} max={100} value={plan.stallsRequired} onChange={e => setPlan({ ...plan, stallsRequired: Number(e.target.value) })} /></label>
      <label>Nguồn lực dự kiến<input required maxLength={100} value={plan.resources} onChange={e => setPlan({ ...plan, resources: e.target.value })} /></label>
      {input.trip.preferredTransportMode === "AIR" && <><label>Mã sân bay đi<input required pattern="[A-Z]{3}" maxLength={3} value={plan.departureGateway || ""} onChange={e => setPlan({ ...plan, departureGateway: e.target.value.toUpperCase() })} /></label>
        <label>Mã sân bay đến<input required pattern="[A-Z]{3}" maxLength={3} value={plan.arrivalGateway || ""} onChange={e => setPlan({ ...plan, arrivalGateway: e.target.value.toUpperCase() })} /></label><p>Phạm vi sân bay → sân bay, chưa bao gồm chặng đường bộ hai đầu.</p></>}
      <Lines title="Chi phí bổ sung dự kiến" value={costs} change={setCosts} /><button disabled={busy}>Lưu kế hoạch sơ bộ</button></form>}
    {v.plan && <aside><h2>Đề xuất báo giá nội bộ</h2><p>Chi phí: {money(v.plan.estimatedCost)} · Giá sàn: {money(v.plan.floor)} · Giá đề xuất: {money(v.plan.suggested)}</p>
      <p>{v.plan.input.preparationDays} ngày chuẩn bị · {v.plan.input.vehicleCount} xe · {v.plan.input.stallsRequired} stall</p><MapDataAttribution text={v.plan.attribution} /></aside>}
    {(can("CREATE_DRAFT") || can("REPLACE_DRAFT")) && <form onSubmit={e => { e.preventDefault(); void act(can("CREATE_DRAFT") ? "contracts" : "contract-versions", { lines, reason }); }}>
      <h2>Giá bán và hợp đồng Draft</h2><Lines title="Các khoản giá bán" value={lines} change={setLines} />
      <p>Backend tính tổng và cọc 40%. Giá dưới sàn cần lý do ở ô phía trên. Thay phiên bản sẽ vô hiệu Draft cũ.</p>
      <button disabled={busy || !lines.length}>{can("CREATE_DRAFT") ? "Tạo hợp đồng Draft" : "Tạo phiên bản Draft mới"}</button></form>}
    {v.contract && <aside><h2>{v.contract.status === "DRAFT" ? "Hợp đồng Draft hiện hành" : "Hợp đồng hiện hành"}</h2><p>{v.contract.contractId} · {v.contract.status}</p><p>Tổng: {money(v.contract.total)} · Cọc 40%: {money(v.contract.deposit)}</p>
      {v.belowFloorReason && <p>Lý do giá dưới sàn (nội bộ): {v.belowFloorReason}</p>}
      {v.contract.status === "DRAFT" && <p>Chưa phát hành để ký, chưa tạo chuyến vận chuyển.</p>}
      <ContractPublicationPanel id={v.contract.contractId} manager reviewVersion={v.version} status={v.contract.status}
        reload={async () => update(await reviewApi.manager(v.request.requestId))} /></aside>}
  </>;
}
