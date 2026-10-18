import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../../../../shared/components/brand-logo/BrandLogo";
import { initialTrip, flow1Error, money, estimateSeed } from "../../../flow1/api";
import type { Trip } from "../../../flow1/api";
import { LocationField } from "../../../flow1/TripFields";
import { relational, download } from "../../../flow1/relational/api";
import type { Horse, Submission } from "../../../flow1/relational/api";
import { demoPrice } from "../../../flow1/landingDraft";
import "./CreateRequestWizard.css";
import "../../../flow1/flow1.css";

const utc = (value: string) => new Date(value + ":00+07:00").toISOString();
export const CreateRequestWizard = () => {
  const navigate = useNavigate(); const key = useRef(crypto.randomUUID());
  const [step, setStep] = useState(1); const [trip, setTrip] = useState<Trip>(initialTrip);
  const [departure, setDeparture] = useState(""); const [delivery, setDelivery] = useState(""); const [purpose, setPurpose] = useState("");
  const [pickup, setPickup] = useState({ name: "", phone: "" }); const [receiver, setReceiver] = useState({ name: "", phone: "" });
  const [horses, setHorses] = useState<Horse[]>([]); const [selected, setSelected] = useState<string[]>([]);
  const [checkedRange, setCheckedRange] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const range = departure + "|" + delivery;
  useEffect(() => {
    if (!departure || !delivery || delivery <= departure) return;
    let active = true;
    relational.horses(utc(departure), utc(delivery)).then(items => {
      if (!active) return;
      setHorses(items); setSelected(ids => ids.filter(id => items.some(h => h.horseId === id && h.hasDocuments && h.selectable))); setCheckedRange(range);
    }).catch(e => { if (active) setError(flow1Error(e)); });
    return () => { active = false; };
  }, [departure, delivery, range]);
  function validate(current: number) {
    if (current === 1 && (!departure || !delivery || delivery <= departure || !purpose.trim())) return "Chọn ngày giao sau ngày khởi hành và nhập mục đích.";
    if (current === 2 && (!trip.pickup.lat || !trip.delivery.lat || !pickup.name.trim() || !pickup.phone.trim() || !receiver.name.trim() || !receiver.phone.trim())) return "Chọn kết quả tìm địa điểm và điền đủ người giao/nhận.";
    if (current === 3 && (checkedRange !== range || !selected.length || selected.some(id => !horses.some(h => h.horseId === id && h.selectable && h.hasDocuments)))) return "Chọn ngựa đủ hồ sơ, trống trong khoảng ngày đã chọn.";
    return "";
  }
  async function next(form: HTMLFormElement) {
    if (!form.reportValidity()) return;
    const issue = validate(step); if (issue) { setError(issue); return; }
    if (step < 4) { setError(""); setStep(step + 1); return; }
    for (const s of [1, 2, 3]) { const message = validate(s); if (message) { setError(message); setStep(s); return; } }
    setBusy(true); setError("");
    try {
      const input: Submission = { trip: { ...trip, horseCount: selected.length, desiredDepartureDate: departure.slice(0, 10) }, departureAt: utc(departure), deliveryAt: utc(delivery), purpose,
        pickupContact: pickup, receiver, horses: selected.map(id => ({ horseId: id, version: horses.find(h => h.horseId === id)!.version })) };
      const request = await relational.submit(input, key.current); sessionStorage.removeItem(estimateSeed); navigate(`/customer/requests/${request.requestId}`);
    } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
  }
  return <div className="customer-page"><div className="customer-topbar"><BrandLogo /><Link to="/customer/requests">Yêu cầu của tôi</Link></div>
    <div className="customer-card"><h1 className="customer-title">Tạo Yêu Cầu Vận Chuyển Ngựa Đua</h1>
      <p className="customer-subtitle">Hoàn tất 4 bước để Manager xét duyệt và chốt giá trong hợp đồng.</p>
      <nav className="wizard-steps" aria-label="Tiến trình tạo yêu cầu">{["1. Tuyến & Dự toán", "2. Địa chỉ Giao/Nhận", "3. Chọn Ngựa đua", "4. Hồ sơ & Xác nhận"].map((label, i) =>
        <button key={label} type="button" disabled={i + 1 > step || busy} className={`wizard-step-btn ${step === i + 1 ? "active" : ""}`} aria-current={step === i + 1 ? "step" : undefined} onClick={() => { setError(""); setStep(i + 1); }}>{label}</button>)}</nav>
      {error && <p role="alert" className="wizard-error">{error}</p>}
      <form className="flow1-page wizard-live-form" onChange={() => { key.current = crypto.randomUUID(); }} onSubmit={e => { e.preventDefault(); void next(e.currentTarget); }}>
        {step === 1 && <><h2>Tuyến & Dự toán</h2><label>Tuyến vận chuyển<select value={trip.delivery.country} onChange={e => setTrip(t => ({ ...t, delivery: { address: "", lat: 0, lng: 0, country: e.target.value }, preferredTransportMode: e.target.value === "JP" ? "AIR" : "ROAD" }))}>
          <option value="VN">Việt Nam → Việt Nam · Đường bộ</option><option value="JP">Việt Nam → Nhật Bản · Hàng không</option></select></label>
          <p>{trip.pickup.address || "Chưa chọn điểm đi"} → {trip.delivery.address || "Chưa chọn điểm đến"}</p>
          <p>Giá demo tham khảo: {money(demoPrice(trip.delivery.country, trip.horseCount))} · Cọc dự kiến 40%. Manager chốt giá chính thức; giá demo không được gửi vào đơn.</p>
          {trip.delivery.country === "JP" && <p>Chặng sân bay → sân bay; chưa gồm đường bộ hai đầu.</p>}
          <p>Chuẩn bị tối thiểu {trip.delivery.country === "JP" ? "7 ngày" : "2 ngày (3 ngày nếu trên 500 km)"}; backend kiểm tra lại khi gửi.</p>
          <label>Khởi hành (giờ Việt Nam)<input type="datetime-local" required value={departure} onChange={e => setDeparture(e.target.value)} /></label>
          <label>Hạn giao (giờ Việt Nam)<input type="datetime-local" required value={delivery} onChange={e => setDelivery(e.target.value)} /></label>
          <label>Mục đích<input required maxLength={100} value={purpose} onChange={e => setPurpose(e.target.value)} /></label></>}
        {step === 2 && <><h2>Địa chỉ Giao/Nhận</h2>
          <LocationField label={trip.delivery.country === "JP" ? "Sân bay đi (Việt Nam)" : "Điểm lấy ngựa (Việt Nam)"} value={trip.pickup} onChange={v => setTrip(t => ({ ...t, pickup: v }))} />
          <LocationField label={trip.delivery.country === "JP" ? "Sân bay đến (Nhật Bản)" : "Điểm giao ngựa"} value={trip.delivery} onChange={v => setTrip(t => ({ ...t, delivery: v }))} />
          <label>Người bàn giao<input required maxLength={100} value={pickup.name} onChange={e => setPickup(x => ({ ...x, name: e.target.value }))} /></label>
          <label>SĐT bàn giao<input required maxLength={20} type="tel" value={pickup.phone} onChange={e => setPickup(x => ({ ...x, phone: e.target.value }))} /></label>
          <label>Người nhận<input required maxLength={100} value={receiver.name} onChange={e => setReceiver(x => ({ ...x, name: e.target.value }))} /></label>
          <label>SĐT người nhận<input required maxLength={20} type="tel" value={receiver.phone} onChange={e => setReceiver(x => ({ ...x, phone: e.target.value }))} /></label></>}
        {step === 3 && <><h2>Chọn Ngựa đua</h2><Link to="/customer/horses" target="_blank">Thêm ngựa / cập nhật ảnh và hộ chiếu</Link>
          <button type="button" onClick={async () => { setError(""); try { const items = await relational.horses(utc(departure), utc(delivery)); setHorses(items); setSelected(ids => ids.filter(id => items.some(h => h.horseId === id && h.selectable && h.hasDocuments))); setCheckedRange(range); } catch (e) { setError(flow1Error(e)); } }}>Tải lại hồ sơ ngựa</button>
          {checkedRange !== range && <p>Đang kiểm tra hồ sơ và lịch ngựa…</p>}
          {checkedRange === range && horses.length === 0 && <p>Chưa có ngựa. Thêm hồ sơ rồi tải lại danh sách.</p>}
          {horses.map(h => <label className="horse-select-card" key={h.horseId}><input type="checkbox" checked={selected.includes(h.horseId)} disabled={checkedRange !== range || !h.hasDocuments || !h.selectable} onChange={e => setSelected(ids => e.target.checked ? [...ids, h.horseId] : ids.filter(id => id !== h.horseId))} />{h.name} · {h.microchipIso} · {!h.hasDocuments ? "Thiếu ảnh / hộ chiếu" : !h.selectable ? "Không trống trong khoảng ngày này" : "Đủ hồ sơ"}</label>)}
          <p>Đã chọn {selected.length} ngựa.</p></>}
        {step === 4 && <><h2>Hồ sơ & Xác nhận</h2><p>{trip.pickup.address} → {trip.delivery.address}</p><p>{departure.replace("T", " ")} → {delivery.replace("T", " ")} (giờ Việt Nam)</p>
          <p>{purpose} · Bàn giao: {pickup.name} / {pickup.phone} · Nhận: {receiver.name} / {receiver.phone}</p>
          {selected.map(id => <section key={id}><h3>{horses.find(h => h.horseId === id)?.name}</h3>{["photo", "passport"].map(kind => <button type="button" key={kind} onClick={() => download(`/customer/horses/${id}/files/${kind}`, kind).catch(e => setError(flow1Error(e)))}>Xem {kind === "photo" ? "ảnh ngựa" : "hộ chiếu"}</button>)}</section>)}
          <p>Manager sẽ xét hồ sơ và phát hành PDF hợp đồng. Khách xem PDF, xác nhận OTP rồi thanh toán cọc 40% qua VNPay. Đủ cọc được xác minh mới kích hoạt chuyến.</p>
          <label><input type="checkbox" required />Tôi xác nhận thông tin và hồ sơ đã chọn.</label></>}
        <div className="wizard-actions">{step > 1 && <button type="button" disabled={busy} onClick={() => { setError(""); setStep(step - 1); }}>Quay lại</button>}
          <button className="btn-primary" disabled={busy}>{busy ? "Đang gửi…" : step === 4 ? "Gửi yêu cầu" : "Tiếp tục"}</button></div>
      </form></div></div>;
};
