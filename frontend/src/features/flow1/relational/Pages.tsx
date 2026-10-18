import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { flow1Error, initialTrip, money } from "../api";
import type { Trip } from "../api";
import { TripFields, MapDataAttribution } from "../TripFields";
import { download, relational } from "./api";
import type { Contract, Handoff, Horse, Request, Submission } from "./api";
import "../flow1.css";
import { Notifications } from "./Notifications";

const date = (x: string | null | undefined) => x ? new Date(x).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
const localDateTime = (x: string | null | undefined) => x ? new Date(new Date(x).getTime() + 7 * 3600000).toISOString().slice(0, 16) : "";
export function RequestsPage({ manager = false }: { manager?: boolean }) {
  const [items, setItems] = useState<Request[]>([]); const [error, setError] = useState("");
  useEffect(() => { let active = true; relational.list(manager).then(v => { if (active) setItems(v); }).catch(e => { if (active) setError(flow1Error(e)); }); return () => { active = false; }; }, [manager]);
  return <main className="flow1-page"><h1>{manager ? "Duyệt yêu cầu vận chuyển" : "Yêu cầu vận chuyển"}</h1>
    {!manager && <nav><Link to="/customer/create-request">Tạo yêu cầu</Link> · <Link to="/customer/horses">Hồ sơ ngựa</Link> · <Link to="/estimate">Giá tham khảo</Link></nav>}
    {error && <p role="alert">{error}</p>}
    {items.length === 0 && <p>Chưa có yêu cầu.</p>}
    <ul>{items.map(r => <li key={r.requestId}><Link to={`/${manager ? "manager" : "customer"}/requests/${r.requestId}`}>{r.departure} → {r.destination}</Link> · {r.status} · {date(r.departureAt)}</li>)}</ul>
  </main>;
}

export function HorsesPage() {
  const [horses, setHorses] = useState<Horse[]>([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const key = useRef(crypto.randomUUID());
  useEffect(() => { relational.horses().then(setHorses).catch(e => setError(flow1Error(e))); }, []);
  return <main className="flow1-page"><Link to="/customer/requests">← Yêu cầu</Link><h1>Hồ sơ ngựa mới nhất</h1><p>Mỗi ngựa giữ một ảnh và một scan hộ chiếu hiện hành. Khi Manager trả đơn để sửa, khách có thể thay hai tệp; hợp đồng đã phát hành và yêu cầu khác đang mở vẫn khóa hồ sơ.</p>
    <ul>{horses.map(h => <li key={h.horseId}>{h.name} · {h.microchipIso} · {h.hasDocuments ? "Đủ hai tệp" : "Cần bổ sung"}
      {(["photo", "passport"] as const).map(kind => <button key={kind} onClick={() => download(`/customer/horses/${h.horseId}/files/${kind}`, kind).catch(e => setError(flow1Error(e)))}>Tải {kind}</button>)}
      <form onSubmit={async e => { e.preventDefault(); setError(""); setBusy(true); const f = new FormData(e.currentTarget); f.append("version", h.version);
        try { await relational.action(`/customer/horses/${h.horseId}/files`, f, key.current); setHorses(await relational.horses()); key.current = crypto.randomUUID(); } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); } }}>
        <label>Ảnh mới<input required type="file" name="photo" accept="image/png,image/jpeg" /></label><label>Scan mới<input required type="file" name="passportScan" accept="image/png,image/jpeg,application/pdf" /></label><button disabled={busy}>Cập nhật hai tệp</button>
      </form></li>)}</ul>
    <h2>Thêm ngựa</h2><form onChange={() => { key.current = crypto.randomUUID(); }} onSubmit={async e => {
      e.preventDefault(); const form = e.currentTarget; const fields = new FormData(form); const data = new FormData(); setBusy(true); setError("");
      data.append("photo", fields.get("photo") as File); data.append("passportScan", fields.get("passportScan") as File);
      data.append("payload", JSON.stringify({ name: fields.get("name"), microchipIso: fields.get("chip"), feiPassportNo: fields.get("passport"), breed: fields.get("breed"), sex: fields.get("sex"), weight: Number(fields.get("weight")), dob: fields.get("dob") }));
      try { await relational.horse(data, key.current); setHorses(await relational.horses()); form.reset(); key.current = crypto.randomUUID(); } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
    }}>
      <label>Tên ngựa<input name="name" required maxLength={100} /></label><label>Microchip ISO (15 số)<input name="chip" required pattern="[0-9]{15}" /></label>
      <label>Số hộ chiếu FEI<input name="passport" required maxLength={50} /></label><label>Giống<input name="breed" required maxLength={100} /></label>
      <label>Giới tính<select name="sex"><option value="STALLION">Đực</option><option value="MARE">Cái</option><option value="GELDING">Đực đã thiến</option></select></label>
      <label>Khối lượng kg<input name="weight" required type="number" min={1} max={2000} step="0.01" /></label><label>Ngày sinh<input name="dob" required type="date" /></label>
      <label>Ảnh PNG/JPEG ≤5 MB<input name="photo" type="file" required accept="image/png,image/jpeg" /></label><label>Scan hộ chiếu PNG/JPEG/PDF ≤5 MB<input name="passportScan" type="file" required accept="image/png,image/jpeg,application/pdf" /></label>
      <button disabled={busy}>Lưu hồ sơ ngựa</button>
    </form>{error && <p role="alert">{error}</p>}
  </main>;
}

export function RequestWizardPage({ revision = false }: { revision?: boolean }) {
  const { requestId } = useParams(); const navigate = useNavigate(); const key = useRef(crypto.randomUUID());
  const [trip, setTrip] = useState<Trip>(initialTrip); const [horses, setHorses] = useState<Horse[]>([]); const [selected, setSelected] = useState<string[]>([]);
  const [existing, setExisting] = useState<Request | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [range,setRange]=useState({departure:"",delivery:""});const [checkedRange,setCheckedRange]=useState("");
  const rangeKey=range.departure+"|"+range.delivery;const checking=checkedRange!==rangeKey;
  useEffect(() => {let active=true;
    if(revision&&requestId)relational.detail(requestId).then(r=>{if(active){setExisting(r);if(r.input){setTrip(r.input.trip);setSelected(r.input.horses.map(h=>h.horseId));setRange({departure:localDateTime(r.input.departureAt),delivery:localDateTime(r.input.deliveryAt)});}}}).catch(e=>{if(active)setError(flow1Error(e));});
    return()=>{active=false;};
  },[revision,requestId]);
  useEffect(()=>{let active=true;
    const from=range.departure&&range.delivery?new Date(range.departure+":00+07:00").toISOString():undefined;
    const to=range.departure&&range.delivery?new Date(range.delivery+":00+07:00").toISOString():undefined;
    relational.horses(from,to,revision?requestId:undefined).then(v=>{if(active){setHorses(v);setSelected(s=>s.filter(id=>v.some(h=>h.horseId===id&&h.hasDocuments&&h.selectable)));setCheckedRange(rangeKey);}}).catch(e=>{if(active)setError(flow1Error(e));});
    return()=>{active=false;};
  },[range.departure,range.delivery,rangeKey,requestId,revision]);
  const seed = existing?.input;
  return <main className="flow1-page"><Link to="/customer/requests">← Yêu cầu</Link><h1>{revision ? "Sửa và gửi lại yêu cầu" : "Tạo yêu cầu vận chuyển"}</h1>
    {revision && existing && (existing.status !== "CHANGES_REQUESTED" || !existing.input) ? <p role="alert">Yêu cầu hiện không được phép sửa.</p> : <form key={existing?.version || "new"} onChange={() => { key.current = crypto.randomUUID(); }} onSubmit={async e => {
      e.preventDefault(); setError(""); setBusy(true); const f = new FormData(e.currentTarget);
      try {
        const input: Submission = { trip: { ...trip, horseCount: selected.length }, departureAt: new Date(String(f.get("departureAt")) + ":00+07:00").toISOString(), deliveryAt: new Date(String(f.get("deliveryAt")) + ":00+07:00").toISOString(), purpose: String(f.get("purpose")),
          pickupContact: { name: String(f.get("pickupName")), phone: String(f.get("pickupPhone")) }, receiver: { name: String(f.get("receiverName")), phone: String(f.get("receiverPhone")) },
          horses: selected.map(id => ({ horseId: id, version: horses.find(h => h.horseId === id)!.version })) };
        const r = await relational.submit(input, key.current, revision ? requestId : undefined, existing?.version); navigate(`/customer/requests/${r.requestId}`);
      } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
    }}>
      <TripFields trip={trip} onChange={setTrip} hideDepartureDate fixedHorseCount={selected.length} />
      <p>Giá cuối cùng do Manager chốt trong hợp đồng. Hệ thống kiểm lộ trình và thời gian chuẩn bị khi gửi.</p>
      <label>Khởi hành (giờ Việt Nam)<input type="datetime-local" name="departureAt" required onChange={e => {const v=e.target.value;setError("");setTrip(t=>({...t,desiredDepartureDate:v.slice(0,10)}));setRange(x=>({...x,departure:v}));}} value={range.departure} /></label>
      <label>Hạn giao (giờ Việt Nam)<input type="datetime-local" name="deliveryAt" required value={range.delivery} onChange={e=>{const v=e.target.value;setError("");setRange(x=>({...x,delivery:v}));}} /></label>
      <label>Mục đích<input name="purpose" required maxLength={100} defaultValue={seed?.purpose} /></label>
      <label>Người bàn giao<input name="pickupName" required maxLength={100} defaultValue={seed?.pickupContact.name} /></label><label>SĐT bàn giao<input name="pickupPhone" required maxLength={20} defaultValue={seed?.pickupContact.phone} /></label>
      <label>Người nhận<input name="receiverName" required maxLength={100} defaultValue={seed?.receiver.name} /></label><label>SĐT người nhận<input name="receiverPhone" required maxLength={20} defaultValue={seed?.receiver.phone} /></label>
      <fieldset><legend>Chọn ngựa (đã chọn {selected.length})</legend>{horses.map(h => <label key={h.horseId}><input type="checkbox" checked={selected.includes(h.horseId)} disabled={!h.hasDocuments || !h.selectable || checking} onChange={e => setSelected(s => e.target.checked ? [...s, h.horseId] : s.filter(x => x !== h.horseId))} />{h.name} · {h.microchipIso}{h.hasDocuments && !h.selectable && " · Không trống trong khoảng ngày này"}</label>)}</fieldset>
      {checking && <p>Đang kiểm tra hồ sơ và lịch ngựa…</p>}
      <button disabled={busy || checking || selected.length === 0 || revision && !existing}>Gửi yêu cầu</button>
    </form>}{error && <p role="alert">{error}</p>}
  </main>;
}

export function RequestDetailPage({ manager = false }: { manager?: boolean }) {
  const { requestId } = useParams(); const [value, setValue] = useState<Request | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const draftKey = useRef(crypto.randomUUID());
  useEffect(() => { let active = true; relational.detail(requestId!, manager).then(v => { if (active) setValue(v); }).catch(e => { if (active) setError(flow1Error(e)); }); return () => { active = false; }; }, [requestId, manager]);
  async function act(url: string, input: object, key?: string) { setError(""); setBusy(true); try { await relational.action(url, input, key); setValue(await relational.detail(requestId!, manager)); } catch (e) { setError(flow1Error(e)); throw e; } finally { setBusy(false); } }
  if (!value) return <main className="flow1-page">{error ? <p role="alert">{error}</p> : "Đang tải…"}</main>;
  const r = value;
  return <main className="flow1-page"><Link to={`/${manager ? "manager" : "customer"}/requests`}>← Yêu cầu</Link><h1>{r.departure} → {r.destination}</h1>{!manager && <Notifications />}
    <p>{r.status} · Khởi hành {date(r.departureAt)} · Hạn giao {date(r.deliveryAt)}</p><p>{r.distanceKm != null ? `${r.distanceKm} km đường bộ` : "Sân bay → sân bay; không gồm đường bộ hai đầu"} · Chuẩn bị {r.preparationDays} ngày</p>
    <p>Bàn giao: {r.pickupContactName} · {r.pickupContactPhone}; Người nhận: {r.receiverName} · {r.receiverPhone}</p>{r.managerNotes && <p>Lời nhắn Manager: {r.managerNotes}</p>}
    {!manager && r.input && r.status === "CHANGES_REQUESTED" && <Link to={`/customer/requests/${r.requestId}/revision`}>Sửa rồi gửi lại</Link>}
    {r.input && <p>Mục đích: {r.input.purpose}</p>}<MapDataAttribution text={r.mapAttribution} />
    {!r.input && <p>Yêu cầu cũ cần rà soát dữ liệu trước khi mở quy trình mới.</p>}
    <ul>{r.horses.map(h => <li key={h.horseId}>{h.name} · {h.microchipIso}{["photo", "passport"].map(kind => <button key={kind} onClick={() => download(`/${manager ? "manager/requests/" + r.requestId : "customer"}/horses/${h.horseId}/files/${kind}`, kind).catch(e => setError(flow1Error(e)))}>Tải {kind}</button>)}</li>)}</ul>
    {manager && r.input && ["PENDING", "ACCEPTED", "CHANGES_REQUESTED"].includes(r.status) && <form onSubmit={e => e.preventDefault()}><label>Lý do quyết định<input name="reviewReason" id="review-reason" required maxLength={1000} /></label>{["accept", "reject", "request-changes"].map((a, n) => <button key={a} disabled={busy || r.status === "CHANGES_REQUESTED" && a !== "reject"} onClick={e => { const form = e.currentTarget.form!; if (!form.reportValidity()) return; const reason = String(new FormData(form).get("reviewReason")); void act(`/manager/requests/${r.requestId}/${a}`, { version: r.version, reason }).catch(() => {}); }}>{["Chấp nhận", "Từ chối", "Yêu cầu sửa"][n]}</button>)}</form>}
    {manager && r.input && r.status === "ACCEPTED" && <form onChange={() => { draftKey.current = crypto.randomUUID(); }} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void act(`/manager/requests/${r.requestId}/contracts`, { version: r.version, price: Number(f.get("price")), preparationDays: Number(f.get("prep")), deadline: new Date(String(f.get("deadline")) + ":00+07:00").toISOString() }, draftKey.current).catch(() => {}); }}>
      <h2>Chốt giá hợp đồng</h2><label>Tổng giá VND<input name="price" type="number" min={3} step={1} required /></label><label>Số ngày chuẩn bị<input name="prep" type="number" min={r.preparationDays || 2} defaultValue={r.preparationDays || 2} required /></label><label>Hạn xác nhận OTP (giờ Việt Nam)<input name="deadline" type="datetime-local" required /></label><button disabled={busy}>Tạo Draft</button>
    </form>}
    {r.contracts.map(c => <ContractPanel key={c.contractId} c={c} manager={manager} busy={busy} act={act} setError={setError} />)}
    <button disabled={busy} onClick={() => { setError(""); relational.detail(r.requestId, manager).then(setValue).catch(e => setError(flow1Error(e))); }}>Tải lại trạng thái</button>{error && <p role="alert">{error}</p>}
  </main>;
}

function ContractPanel({ c, manager, busy, act, setError }: { c: Contract; manager: boolean; busy: boolean; act: (url: string, input: object, key?: string) => Promise<void>; setError: (s: string) => void }) {
  const [pdfViewed, setPdfViewed] = useState<string | null>(null); const [otp, setOtp] = useState(""); const paymentKey = useRef(crypto.randomUUID());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  const base = `/${manager ? "manager" : "customer"}/contracts/${c.contractId}`;
  const mutation = (action: string, input: object = {}) => void act(`${base}/${action}`, { version: c.version, ...input }).catch(() => {});
  const reasonForm = (label: string, action: string, input: object = {}) => <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); mutation(action, { reason: String(f.get("reason")), ...input }); }}><label>{label}<input required name="reason" maxLength={1000} /></label><button disabled={busy}>{label}</button></form>;
  if (!c.relationalTermsReady) return <section className="flow1-card"><h2>Hợp đồng {c.contractId}</h2><p>{c.status} · Hồ sơ cũ cần rà soát</p>
    <p>Chưa đủ chứng cứ để xác nhận PDF/OTP và mở quy trình cọc của bản này.</p>
    {c.pdfSha256 && <button onClick={() => download(`${base}/pdf`, `${c.contractId}.pdf`).catch(e => setError(flow1Error(e)))}>Tải PDF lưu trong hồ sơ</button>}
    {c.signedAt && <p>Thời điểm ký lưu trong hồ sơ cũ: {date(c.signedAt)}</p>}
    <ul>{c.payments.map(p => <li key={p.paymentId}>{p.paymentId} · {p.method || "Chưa xác định phương thức"} · Giá trị lưu: {p.amount.toLocaleString("vi-VN")} {p.currency} · {p.status} · {p.transactionCode}</li>)}</ul>
  </section>;
  return <section className="flow1-card"><h2>Hợp đồng {c.contractId}</h2><p>{c.status}{!c.isCurrent && " · Bản đã đóng"}</p><p>Giá chốt {money(c.totalPrice)} · Cọc 40%: {money(c.depositAmount)}</p>
    <p>Hạn ký: {date(c.signDeadline)} · Hạn cọc: {date(c.depositDeadline)}</p>
    {!c.signedAt && <p>Cọc đến hạn trong 24 giờ sau xác nhận, không muộn hơn mốc chuẩn bị {date(c.preparationCutoff)}. Hạn chính xác được ghi sau khi ký.</p>}
    {c.pdfSha256 && <><button disabled={busy} onClick={async () => { try { await download(`${base}/pdf`, `${c.contractId}.pdf`); setPdfViewed(c.pdfSha256); } catch (e) { setError(flow1Error(e)); } }}>Xem / tải đúng PDF</button><p>SHA-256: <code>{c.pdfSha256}</code></p></>}
    {manager && c.isCurrent && c.status === "DRAFT" && <button disabled={busy} onClick={() => mutation("publish")}>Phát hành PDF</button>}
    {!manager && c.isCurrent && c.status === "PENDING_SIGNATURE" && <>
      <button disabled={busy || pdfViewed !== c.pdfSha256} onClick={() => mutation("otp", { pdfSha256: c.pdfSha256 })}>Gửi OTP qua email</button>
      <form onSubmit={e => { e.preventDefault(); mutation("sign", { otp, pdfSha256: c.pdfSha256 }); setOtp(""); }}><label>OTP xác nhận<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required value={otp} onChange={e => setOtp(e.target.value)} /></label><button disabled={busy || pdfViewed !== c.pdfSha256}>Xác nhận hợp đồng</button></form>
      {reasonForm("Từ chối hợp đồng", "decline")}
    </>}
    {c.signedAt && c.hasAcceptanceEvidence && <p role="status">Biên nhận xác nhận OTP: {date(c.signedAt)} · Contract {c.contractId} · SHA-256 {c.pdfSha256}</p>}
    {manager && c.isCurrent && ["DRAFT", "PENDING_SIGNATURE"].includes(c.status) && <>{reasonForm("Đóng bản chưa ký để chỉnh sửa", "withdraw")}{reasonForm("Xác nhận hết hạn ký", "expire")}</>}
    {manager && c.isCurrent && ["PENDING_SIGNATURE", "SIGNED"].includes(c.status) && <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); mutation("extend", { target: c.signedAt ? "DEPOSIT" : "SIGN", deadline: new Date(String(f.get("deadline")) + ":00+07:00").toISOString(), reason: String(f.get("reason")) }); }}><label>Hạn mới (giờ Việt Nam)<input type="datetime-local" name="deadline" required /></label><label>Lý do gia hạn<input name="reason" required maxLength={1000} /></label><button disabled={busy}>Gia hạn {c.signedAt ? "cọc" : "ký"}</button></form>}
    {c.extensionReason && <p>Gia hạn gần nhất ({c.extensionTarget}): {c.extensionReason}</p>}
    {manager && c.isCurrent && c.status === "SIGNED" && c.depositDeadline && now > new Date(c.depositDeadline).getTime() && reasonForm("Hủy yêu cầu quá hạn sau đối soát", "cancel-overdue")}
    {c.signedAt && <><h3>Thanh toán cọc</h3><p>Đã xác minh: {money(c.paidAmount)} / {money(c.depositAmount)} · {c.invoiceStatus}</p>
      {!manager && c.isCurrent && c.status === "SIGNED" && c.cancellationStatus !== "PENDING" && c.paidAmount < c.depositAmount && <button disabled={busy || c.payments.some(p => p.reviewRequired)} onClick={async () => {
        try { const v = await relational.action<{ paymentUrl: string }>(`${base}/vnpay`, {}, paymentKey.current); const u = new URL(v.paymentUrl); if (u.origin !== "https://sandbox.vnpayment.vn") throw new Error("Địa chỉ thanh toán không hợp lệ."); window.location.assign(u.href); } catch (e) { setError(flow1Error(e)); }
      }}>Thanh toán qua VNPay</button>}
      <ul>{c.payments.map(p => <li key={p.paymentId}>{p.paymentId}: {p.status} · Yêu cầu {money(p.amount)} · {p.receivedAmount != null && `Callback có chữ ký ${money(p.receivedAmount)}`} · {p.transactionCode}
        {p.reviewRequired && <p>Cần đối soát: {p.reviewReason}</p>}
        {manager && p.method === "VNPAY" && <form onSubmit={e => { e.preventDefault(); void act(`${base}/payments/${p.paymentId}/query`, { version: p.version, reason: String(new FormData(e.currentTarget).get("reason")) }).catch(() => {}); }}><label>Lý do truy vấn VNPay<input name="reason" required maxLength={1000} /></label><button disabled={busy}>Truy vấn kết quả từ VNPay</button></form>}
        {manager && p.reviewRequired && p.status === "SUCCESS" && <form onSubmit={e => { e.preventDefault(); void act(`${base}/payments/${p.paymentId}/review`, { version: p.version, reason: String(new FormData(e.currentTarget).get("reason")) }).catch(() => {}); }}><label>Kết quả đối soát<input name="reason" required /></label><button disabled={busy}>Xác nhận đã xử lý</button></form>}
      </li>)}</ul>
    </>}
    {c.cancellationStatus && <p>Đề nghị hủy: {c.cancellationStatus} · {c.cancellationReason} · {c.cancellationDecision}</p>}
    {!manager && c.isCurrent && c.status === "SIGNED" && !c.trip && c.cancellationStatus !== "PENDING" && reasonForm("Đề nghị hủy", "cancellation/request")}
    {manager && c.cancellationStatus === "PENDING" && <>{reasonForm("Chấp thuận hủy khi không có tiền / attempt chưa đối soát", "cancellation/approve", { cancellationId: c.cancellationId })}{reasonForm("Từ chối đề nghị hủy", "cancellation/reject", { cancellationId: c.cancellationId })}</>}
    {c.trip && <><h3>Chuyến {c.trip.tripId}</h3><p>{c.trip.status} · {c.trip.deploymentStatus} · {c.trip.reason}</p><p>Coordinator: {c.trip.routingAcknowledgedBy || "Chưa nhận"} · Specialist: {c.trip.documentsAcknowledgedBy || "Chưa nhận"}</p>
      {manager && <form onSubmit={e => e.preventDefault()}><label>Lý do vận hành<input name="reason" required /></label>{["confirm", "hold", "resume"].map(action => <button key={action} disabled={busy || action === "confirm" && c.trip!.deploymentStatus !== "PENDING" || action === "resume" && c.trip!.deploymentStatus !== "ON_HOLD" || action === "hold" && c.trip!.deploymentStatus === "ON_HOLD"} onClick={e => { if (!e.currentTarget.form!.reportValidity()) return; const reason = String(new FormData(e.currentTarget.form!).get("reason")); void act(`${base}/deployment/${action}`, { version: c.trip!.version, reason }).catch(() => {}); }}>{action}</button>)}</form>}
    </>}
  </section>;
}

export function OperationsInbox({ stream, portal=false }: { stream: "ROUTING" | "DOCUMENTS"; portal?:boolean }) {
  const [items, setItems] = useState<Handoff[]>([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { relational.queue().then(setItems).catch(e => setError(flow1Error(e))); }, []);
  return <main className={portal?"flow1-handoff-portal":"flow1-page"}><h1>Bàn giao {stream === "ROUTING" ? "điều phối" : "hồ sơ"}</h1><p>Chỉ hiện lần bàn giao đang được xác nhận. Hold hoặc resume thu hồi lần nhận cũ.</p>
    <button onClick={() => relational.queue().then(setItems).catch(e => setError(flow1Error(e)))}>Tải lại bàn giao</button>{items.map(x => <section className={portal?"dash-card":undefined} key={x.trip.tripId}><h2>{x.departure} → {x.destination}</h2><p>{date(x.departureAt)} · {x.trip.tripId} · {x.trip.eventId}</p>
      <button onClick={() => download(`/operations/flow1/trips/${x.trip.tripId}/pdf?eventId=${x.trip.eventId}`, "contract.pdf").catch(e => setError(flow1Error(e)))}>PDF hợp đồng · {x.pdfSha256}</button>
      {x.horses.map(h => <p key={h.horseId}>{h.name} · {h.microchipIso}{["photo", "passport"].map(kind => <button key={kind} onClick={() => download(`/operations/flow1/trips/${x.trip.tripId}/horses/${h.horseId}/files/${kind}?eventId=${x.trip.eventId}`, kind).catch(e => setError(flow1Error(e)))}>Tải {kind} hiện hành</button>)}</p>)}
      <button disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await relational.action(`/operations/flow1/trips/${x.trip.tripId}/ack`, { version: x.trip.version, eventId: x.trip.eventId }); setItems(await relational.queue()); } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); } }}>Xác nhận nhận bàn giao</button>
      <p>Coordinator: {x.trip.routingAcknowledgedBy || "Chưa nhận"} · Specialist: {x.trip.documentsAcknowledgedBy || "Chưa nhận"}</p>
    </section>)}{error && <p role="alert">{error}</p>}
  </main>;
}
export function CustomerVnpayReturnPage() {
  const [params] = useSearchParams(); const [value, setValue] = useState<{ requestId: string; contract: Contract } | null>(null); const [error, setError] = useState("");
  const id = params.get("vnp_TxnRef");
  useEffect(() => { if (!id) return; relational.returned(id).then(setValue).catch(e => setError(flow1Error(e))); }, [id]);
  return <main className="flow1-page"><h1>Kết quả thanh toán</h1><p>Trạng thái lấy từ backend sau IPN xác thực. Các tham số trên địa chỉ trả về không xác nhận tiền.</p>{value ? <><p>Đã xác minh {money(value.contract.paidAmount)} · {value.contract.invoiceStatus}</p><Link to={`/customer/requests/${value.requestId}`}>Xem / tải lại trạng thái yêu cầu</Link></> : <p>{id ? "Đang kiểm tra…" : "Thiếu mã tham chiếu thanh toán."}</p>}{error && <p role="alert">{error}</p>}</main>;
}
