import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CustomerLayout from "../../shared/layouts/CustomerLayout/CustomerLayout";
import { emptyTrip, estimateSeed, flow1, flow1Error, initialTrip, money } from "./api";
import type { Contact, Estimate, Horse, RequestView, Submission } from "./api";
import { TripFields, EstimateSummary, MapDataAttribution } from "./TripFields";
import { HorseForm } from "./HorseForm";
import { CustomerReviewPanel } from "./CustomerReviewPanel";
import { operationKey, reviewApi } from "./reviewApi";
import "./flow1.css";

export function PublicEstimatePage() {
  const navigate = useNavigate();
  const [trip, setTrip] = useState(() => structuredClone(emptyTrip));
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  return <main className="flow1-page"><h1>Dự toán vận chuyển ngựa</h1>
    <form onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError(""); setEstimate(null);
      try { setEstimate(await flow1.estimate(trip, true)); } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
    }}>
      <TripFields trip={trip} onChange={value => { setTrip(value); setEstimate(null); }} guest />
      <button disabled={busy || !trip.pickup.lat || !trip.delivery.lat}>Tính dự toán</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {estimate && <><EstimateSummary value={estimate} /><button type="button" onClick={() => {
      sessionStorage.setItem(estimateSeed, JSON.stringify(trip));
      navigate(localStorage.getItem("accessToken") ? "/customer/requests/new" : "/login?returnTo=transport-request");
    }}>Tiếp tục đặt chuyến</button></>}
    <Link to="/login">Đăng nhập</Link>
  </main>;
}

function ContactFields({ label, value, change }: { label: string; value: Contact; change: (c: Contact) => void }) {
  return <fieldset><legend>{label}</legend><label>Họ tên<input required maxLength={100} value={value.name} onChange={e => change({ ...value, name: e.target.value })} /></label>
    <label>Số điện thoại<input required type="tel" minLength={7} maxLength={20} value={value.phone} onChange={e => change({ ...value, phone: e.target.value })} /></label></fieldset>;
}
export function RequestEditPage({ mode }: { mode: "revision" | "change-requests" }) {
  const { requestId = "" } = useParams(); const [value, setValue] = useState<RequestView | null>(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; flow1.detail(requestId).then(x => { if (active) setValue(x); }).catch(e => { if (active) setError(flow1Error(e)); });
    return () => { active = false; }; }, [requestId]);
  if (error) return <CustomerLayout pageTitle="Chỉnh sửa yêu cầu"><p role="alert">{error}</p></CustomerLayout>;
  return value ? <RequestWizardPage initial={value} mode={mode} /> : <p>Đang tải…</p>;
}
export function RequestWizardPage({ initial, mode }: { initial?: RequestView; mode?: "revision" | "change-requests" } = {}) {
  const navigate = useNavigate();
  const key = useRef(crypto.randomUUID());
  const [step, setStep] = useState(0);
  const original = initial?.snapshot?.input;
  const [trip, setTrip] = useState(() => original?.trip || initialTrip());
  const [deadline, setDeadline] = useState(original?.deliveryDeadline || ""); const [purpose, setPurpose] = useState(original?.purpose || "COMPETITION");
  const [pickup, setPickup] = useState<Contact>(original?.pickupContact || { name: "", phone: "" });
  const [receiver, setReceiver] = useState(original?.receiver || { name: "", phone: "", isProxy: false });
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [horses, setHorses] = useState<Horse[]>([]); const [selected, setSelected] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [changeReason, setChangeReason] = useState(""); const editKey = useRef({ hash: "", key: "" });
  const titles = ["Thông tin chuyến", "Giao nhận", "Ngựa và hồ sơ", "Kiểm tra và gửi"];
  function changed() { key.current = crypto.randomUUID(); }
  async function loadHorses() { const items = await flow1.horses(trip.desiredDepartureDate, deadline, initial?.requestId); setHorses(items); return items; }
  async function next(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      if (step === 0) {
        if (!trip.pickup.lat || !trip.delivery.lat) throw new Error("Hãy tìm và chọn cả hai địa điểm.");
        if (!deadline || deadline < trip.desiredDepartureDate) throw new Error("Hạn giao phải từ ngày khởi hành trở đi.");
        setEstimate(await flow1.estimate(trip));
      }
      if (step === 1) await loadHorses();
      if (step === 2 && Object.keys(selected).length !== trip.horseCount) throw new Error(`Hãy chọn đúng ${trip.horseCount} ngựa có hồ sơ hợp lệ.`);
      if (step < 3) setStep(step + 1);
      else {
        if (!confirmed) throw new Error("Vui lòng xác nhận thông tin trước khi gửi.");
        const payload: Submission = { trip, deliveryDeadline: deadline, purpose, pickupContact: pickup, receiver,
          horses: Object.entries(selected).map(([horseId, documentVersion]) => ({ horseId, documentVersion })) };
        if (initial && mode) {
          const body = { expectedVersion: initial.review?.version, request: payload, ...(mode === "change-requests" ? { reason: changeReason } : {}) };
          await reviewApi.actCustomer(initial.requestId, mode, body, operationKey(editKey, mode, body));
          navigate(`/customer/requests/${initial.requestId}`, { replace: true });
        } else {
          const saved = await flow1.submit(payload, key.current);
          sessionStorage.removeItem(estimateSeed); navigate(`/customer/requests/${saved.requestId}`, { replace: true });
        }
      }
    } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
  }
  return <CustomerLayout pageTitle="Tạo yêu cầu vận chuyển"><section className="flow1-page">
    <h1>{step + 1}. {titles[step]}</h1><p>{titles.join(" → ")}</p>
    {mode && <p>{mode === "revision" ? "Chỉnh sửa theo yêu cầu quản lý" : "Đề xuất thay đổi; yêu cầu gốc chỉ đổi sau khi được duyệt"}</p>}
    <form onSubmit={next} onChange={changed}>
      {step === 0 && <><TripFields trip={trip} onChange={t => { setTrip(t); setEstimate(null); setSelected({}); changed(); }} />
        {mode === "change-requests" && <label>Lý do đề xuất<textarea required maxLength={2000} value={changeReason} onChange={e => setChangeReason(e.target.value)} /></label>}
        <label>Hạn giao ngựa<input required type="date" min={trip.desiredDepartureDate} value={deadline} onChange={e => { setDeadline(e.target.value); setSelected({}); }} /></label>
        <label>Mục đích<input required maxLength={100} value={purpose} onChange={e => setPurpose(e.target.value)} /></label></>}
      {step === 1 && <><ContactFields label="Người giao ngựa" value={pickup} change={setPickup} />
        <ContactFields label="Người nhận ngựa" value={receiver} change={c => setReceiver({ ...receiver, ...c })} />
        <label><input type="checkbox" checked={receiver.isProxy} onChange={e => setReceiver({ ...receiver, isProxy: e.target.checked })} />Người nhận thay mặt chủ ngựa</label>
        {receiver.isProxy && <p>Người nhận thay sẽ được xác minh khi bàn giao; chưa được coi là đã xác minh.</p>}</>}
      {step === 2 && <><p>Chọn {trip.horseCount} ngựa. Ảnh và scan hộ chiếu là hai hồ sơ bắt buộc.</p>
        {!horses.length && <p>Chưa có ngựa. Bạn có thể thêm ngay bên dưới.</p>}
        {horses.map(h => <label key={h.horseId}><input type="checkbox" disabled={!h.selectable} checked={h.horseId in selected}
          onChange={e => setSelected(current => { const next = { ...current }; if (e.target.checked) next[h.horseId] = h.documentVersion; else delete next[h.horseId]; return next; })} />
          {h.name} · {h.microchipIso} · {h.selectable ? "Có thể chọn" : h.unavailableReason === "SCHEDULE_CONFLICT" ? "Trùng lịch" : "Cần bổ sung hồ sơ"}
        </label>)}
        <button type="button" onClick={() => setAdding(!adding)}>{adding ? "Đóng form thêm ngựa" : "Thêm ngựa tại đây"}</button></>}
      {step === 3 && <><dl><dt>Tuyến</dt><dd>{trip.pickup.address} → {trip.delivery.address}</dd>
        <dt>Khởi hành / hạn giao</dt><dd>{trip.desiredDepartureDate} / {deadline}</dd>
        <dt>Người giao</dt><dd>{pickup.name} · {pickup.phone}</dd><dt>Người nhận</dt><dd>{receiver.name} · {receiver.phone}</dd>
        <dt>Ngựa</dt><dd>{horses.filter(h => h.horseId in selected).map(h => h.name).join(", ")}</dd></dl>
        {estimate && <EstimateSummary value={estimate} />}
        <label><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Tôi xác nhận thông tin và gửi quản lý thẩm định.</label>
        <p>Gửi yêu cầu chưa tạo hợp đồng, chuyến vận chuyển hoặc nghĩa vụ thanh toán.</p></>}
      {error && <p role="alert">{error}</p>}
      <div className="flow1-actions">{step > 0 && <button type="button" disabled={busy} onClick={() => { setStep(step - 1); setError(""); setConfirmed(false); }}>Quay lại</button>}
        <button type="submit" disabled={busy || adding}>{busy ? "Đang xử lý…" : step === 3 ? "Gửi yêu cầu" : "Tiếp tục"}</button></div>
    </form>
    {step === 2 && adding && <HorseForm onCreated={async h => {
      try { await loadHorses(); if (h) setSelected(current => ({ ...current, [h.horseId]: h.documentVersion })); setAdding(false); changed(); }
      catch (e) { setError(flow1Error(e)); }
    }} />}
  </section></CustomerLayout>;
}

export function RequestsPage() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Awaited<ReturnType<typeof flow1.list>> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; flow1.list(page).then(r => { if (active) { setResult(r); setError(""); } }).catch(e => { if (active) setError(flow1Error(e)); });
    return () => { active = false; }; }, [page]);
  return <CustomerLayout pageTitle="Yêu cầu vận chuyển"><section className="flow1-page"><h1>Yêu cầu của tôi</h1>
    <Link to="/customer/requests/new">Tạo yêu cầu</Link> · <Link to="/estimate">Xem dự toán</Link>
    {error && <p role="alert">{error}</p>}{!result && !error && <p>Đang tải…</p>}
    {result && <><p>{result.totalCount} yêu cầu</p><ul>{result.items.map(r => <li key={r.requestId}>
      <Link to={`/customer/requests/${r.requestId}`}>{r.departure} → {r.destination}</Link> · {r.status} · {r.expectedDate?.slice(0, 10)}</li>)}</ul>
      <MapDataAttribution text="Geoapify" />
      <button disabled={page === 1} onClick={() => setPage(page - 1)}>Trang trước</button>
      <span> Trang {page} </span><button disabled={page * result.pageSize >= result.totalCount} onClick={() => setPage(page + 1)}>Trang sau</button></>}
  </section></CustomerLayout>;
}
export function RequestDetailPage() {
  const { requestId } = useParams(); const [request, setRequest] = useState<RequestView | null>(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; flow1.detail(requestId || "").then(r => { if (active) setRequest(r); }).catch(e => { if (active) setError(flow1Error(e)); });
    return () => { active = false; }; }, [requestId]);
  return <CustomerLayout pageTitle="Chi tiết yêu cầu"><section className="flow1-page"><Link to="/customer/requests">← Danh sách yêu cầu</Link>
    {error && <p role="alert">{error}</p>}{request && <><h1>{request.departure} → {request.destination}</h1><p>Trạng thái: {request.status}</p>
      <p>Khởi hành: {request.expectedDate?.slice(0, 10)} · Hạn giao: {request.committedDeadline?.slice(0, 10)}</p>
      {request.snapshot && <><p>Người giao: {request.snapshot.input.pickupContact.name} · {request.snapshot.input.pickupContact.phone}</p>
        <p>Người nhận: {request.snapshot.input.receiver.name} · {request.snapshot.input.receiver.phone}</p>
        <p>{request.snapshot.input.horses.length} ngựa · Giá tham khảo: {money(request.snapshot.estimate.estimatedPrice)}</p>
        <MapDataAttribution text={request.snapshot.estimate.attribution || request.snapshot.estimate.locationAttribution} />
        {request.review && <CustomerReviewPanel id={request.requestId} value={request.review} reload={async () => setRequest(await flow1.detail(request.requestId))} />}
        {request.snapshot.input.receiver.isProxy && <p>Người nhận thay cần được xác minh trước bàn giao.</p>}</>}
      {request.status === "PENDING" && <p>Đã gửi quản lý thẩm định. Chưa có hợp đồng hoặc chuyến vận chuyển.</p>}
    </>}
  </section></CustomerLayout>;
}
export function HorsesPage() {
  const [horses, setHorses] = useState<Horse[]>([]); const [error, setError] = useState(""); const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<Horse | null>(null);
  useEffect(() => { let active = true; flow1.horses().then(items => { if (active) setHorses(items); }).catch(e => { if (active) setError(flow1Error(e)); });
    return () => { active = false; }; }, [refresh]);
  return <CustomerLayout pageTitle="Ngựa của tôi"><section className="flow1-page"><h1>Ngựa và hồ sơ</h1>{error && <p role="alert">{error}</p>}
    <ul>{horses.map(h => <li key={h.horseId}>{h.name} · {h.microchipIso} · {h.status}
      <button onClick={() => setEditing(h)}>Cập nhật ảnh / hộ chiếu</button>
      {h.documentVersion > 0 && <button onClick={() => { flow1.download(h.horseId, h.documentVersion, "passport").catch(e => setError(flow1Error(e))); }}>Tải hộ chiếu</button>}
    </li>)}</ul>
    <HorseForm key={editing?.horseId ?? "new"} horse={editing ?? undefined} onCreated={() => { setEditing(null); setRefresh(x => x + 1); }} />
    {editing && <button onClick={() => setEditing(null)}>Thêm ngựa mới</button>}
  </section></CustomerLayout>;
}
