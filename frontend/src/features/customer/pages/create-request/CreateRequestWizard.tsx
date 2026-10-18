import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BrandLogo } from "../../../../shared/components/brand-logo/BrandLogo";
import { initialTrip, flow1Error, money, estimateSeed } from "../../../flow1/api";
import type { Trip } from "../../../flow1/api";
import { LocationField } from "../../../flow1/TripFields";
import { relational, download } from "../../../flow1/relational/api";
import type { Horse, Submission, Request } from "../../../flow1/relational/api";
import { demoPrice } from "../../../flow1/landingDraft";
import "./CreateRequestWizard.css";


const utc = (value: string) => new Date(value + ":00+07:00").toISOString();
export const CreateRequestWizard = ({revision=false}:{revision?:boolean}) => {
  const {requestId}=useParams();const [existing,setExisting]=useState<Request|null>(null);
  const navigate = useNavigate(); const key = useRef(crypto.randomUUID());
  const [step, setStep] = useState(1); const [trip, setTrip] = useState<Trip>(initialTrip);
  const [departure, setDeparture] = useState(""); const [delivery, setDelivery] = useState(""); const [purpose, setPurpose] = useState("");
  const [pickup, setPickup] = useState({ name: "", phone: "" }); const [receiver, setReceiver] = useState({ name: "", phone: "" });
  const [horses, setHorses] = useState<Horse[]>([]); const [selected, setSelected] = useState<string[]>([]);
  const [checkedRange, setCheckedRange] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(()=>{if(!revision||!requestId)return;let active=true;relational.detail(requestId).then(r=>{if(!active)return;setExisting(r);if(r.input){setTrip(r.input.trip);setDeparture(new Date(Date.parse(r.input.departureAt)+7*3600000).toISOString().slice(0,16));setDelivery(new Date(Date.parse(r.input.deliveryAt)+7*3600000).toISOString().slice(0,16));setPurpose(r.input.purpose);setPickup(r.input.pickupContact);setReceiver(r.input.receiver);setSelected(r.input.horses.map(h=>h.horseId));}}).catch(e=>{if(active)setError(flow1Error(e));});return()=>{active=false;};},[revision,requestId]);
  const range = departure + "|" + delivery;
  useEffect(() => {
    if (!departure || !delivery || delivery <= departure) return;
    let active = true;
    relational.horses(utc(departure), utc(delivery),revision?requestId:undefined).then(items => {
      if (!active) return;
      setHorses(items); setSelected(ids => ids.filter(id => items.some(h => h.horseId === id && h.hasDocuments && h.selectable))); setCheckedRange(range);
    }).catch(e => { if (active) setError(flow1Error(e)); });
    return () => { active = false; };
  }, [departure, delivery, range,revision,requestId]);
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
      const request = await relational.submit(input, key.current, revision?requestId:undefined, existing?.version); sessionStorage.removeItem(estimateSeed); navigate(`/customer/requests/${request.requestId}`);
    } catch (e) { setError(flow1Error(e)); } finally { setBusy(false); }
  }
  return <div className="customer-page"><div className="customer-topbar"><BrandLogo /><span className="customer-subtitle" style={{margin:0}}>Khách hàng: {localStorage.getItem("userFullName") || "Khách hàng"}</span></div>
    <div className="customer-card"><h1 className="customer-title">{revision?"Sửa và gửi lại yêu cầu":"Tạo Yêu Cầu Vận Chuyển Ngựa Đua"}</h1><p className="customer-subtitle">Hoàn tất 4 bước thông tin để gửi Logistics Manager xét duyệt và lập báo giá chính thức.</p>
      <nav className="wizard-steps" aria-label="Tiến trình tạo yêu cầu">{["1. Tuyến & Dự toán","2. Địa chỉ Giao/Nhận","3. Chọn Ngựa đua","4. Hồ sơ & Thương mại"].map((label,i)=><button key={label} type="button" disabled={busy||i+1>step} className={`wizard-step-btn ${step===i+1?"active":""}`} aria-current={step===i+1?"step":undefined} onClick={()=>{setError("");setStep(i+1);}}>{label}</button>)}</nav>
      {error&&<div role="alert" className="wizard-error">⚠️ {error}</div>}
      <form onChange={()=>{key.current=crypto.randomUUID();}} onSubmit={e=>{e.preventDefault();void next(e.currentTarget);}}>
        {step===1&&<><div className="form-grid-2">
          <label className="form-label">Quốc gia xuất phát<select className="form-select" value="VN" disabled><option value="VN">Việt Nam</option></select></label>
          <label className="form-label">Quốc gia đích đến<select className="form-select" aria-label="Tuyến vận chuyển" value={trip.delivery.country} onChange={e=>setTrip(t=>({...t,delivery:{address:"",lat:0,lng:0,country:e.target.value},preferredTransportMode:e.target.value==="JP"?"AIR":"ROAD"}))}><option value="VN">Việt Nam</option><option value="JP">Nhật Bản</option></select></label>
          <label className="form-label">Phương thức vận chuyển<select className="form-select" disabled value={trip.preferredTransportMode}><option value="AIR">Hàng không (Air Stall)</option><option value="ROAD">Đường bộ (Equine Truck)</option></select></label>
          <label className="form-label">Ngày khởi hành dự kiến<input aria-label="Khởi hành (giờ Việt Nam)" required type="datetime-local" className="form-input" value={departure} onChange={e=>setDeparture(e.target.value)}/></label>
          <label className="form-label form-full">Hạn chót bàn giao (Committed Deadline)<input aria-label="Hạn giao (giờ Việt Nam)" required type="datetime-local" className="form-input" value={delivery} onChange={e=>setDelivery(e.target.value)}/></label>
          <label className="form-label form-full">Mục đích<input required maxLength={100} className="form-input" value={purpose} onChange={e=>setPurpose(e.target.value)}/></label>
        </div><div className="estimate-banner"><div><p className="estimate-banner-title">Bảng Dự Toán Tạm Tính (Estimate)</p><p className="estimate-banner-sub">{trip.pickup.address} → {trip.delivery.address} • {selected.length||trip.horseCount} ngựa • Cọc40%</p></div><span className="estimate-price">{money(demoPrice(trip.delivery.country,selected.length||trip.horseCount))}</span></div>
          <p className="estimate-banner-sub">Giá demo tham khảo; Manager chốt giá trong hợp đồng. Giờ Việt Nam. Chuẩn bị {trip.delivery.country==="JP"?"7 ngày; sân bay → sân bay, chưa gồm đường bộ hai đầu.":"2 ngày (3 ngày nếu trên500km)."}</p></>}
        {step===2&&<div className="form-grid-2"><div className="form-full"><LocationField label={trip.delivery.country==="JP"?"Sân bay đi (Việt Nam)":"Điểm lấy ngựa (Việt Nam)"} value={trip.pickup} onChange={v=>setTrip(t=>({...t,pickup:v}))}/></div><div className="form-full"><LocationField label={trip.delivery.country==="JP"?"Sân bay đến (Nhật Bản)":"Điểm giao ngựa"} value={trip.delivery} onChange={v=>setTrip(t=>({...t,delivery:v}))}/></div>
          <label className="form-label">Họ tên Người nhận chỉ định<input aria-label="Người nhận" required maxLength={100} className="form-input" value={receiver.name} onChange={e=>setReceiver(v=>({...v,name:e.target.value}))}/></label>
          <label className="form-label">SĐT Người nhận<input aria-label="SĐT người nhận" required maxLength={20} className="form-input" type="tel" value={receiver.phone} onChange={e=>setReceiver(v=>({...v,phone:e.target.value}))}/></label>
          <label className="form-label">Người bàn giao<input required maxLength={100} className="form-input" value={pickup.name} onChange={e=>setPickup(v=>({...v,name:e.target.value}))}/></label>
          <label className="form-label">SĐT bàn giao<input required maxLength={20} className="form-input" type="tel" value={pickup.phone} onChange={e=>setPickup(v=>({...v,phone:e.target.value}))}/></label></div>}
        {step===3&&<div><div className="wizard-horse-toolbar"><Link to="/customer/horses" target="_blank">Thêm ngựa / cập nhật hồ sơ</Link><button type="button" className="btn-secondary" onClick={async()=>{try{const rows=await relational.horses(utc(departure),utc(delivery));setHorses(rows);setSelected(ids=>ids.filter(id=>rows.some(h=>h.horseId===id&&h.hasDocuments&&h.selectable)));setCheckedRange(range);}catch(e){setError(flow1Error(e));}}}>Tải lại hồ sơ ngựa</button></div>
          {checkedRange!==range&&<p>Đang kiểm tra hồ sơ và lịch ngựa…</p>}{checkedRange===range&&!horses.length&&<p>Chưa có ngựa. Thêm hồ sơ rồi tải lại danh sách.</p>}
          {horses.map(h=><label key={h.horseId} className={`horse-item ${selected.includes(h.horseId)?"selected":""}`}><input type="checkbox" checked={selected.includes(h.horseId)} disabled={checkedRange!==range||!h.hasDocuments||!h.selectable} onChange={e=>setSelected(ids=>e.target.checked?[...ids,h.horseId]:ids.filter(id=>id!==h.horseId))}/><div><strong>{h.name} ({h.breed||"—"})</strong><p className="estimate-banner-sub">Microchip ISO: {h.microchipIso} • Hộ chiếu: {h.passportNo||"—"}</p></div><span className={`horse-badge ${h.hasDocuments&&h.selectable?"ready":"busy"}`}>{!h.hasDocuments?"Thiếu ảnh / hộ chiếu":!h.selectable?"Không trống trong khoảng ngày này":selected.includes(h.horseId)?"Đã chọn ✓":"Sẵn sàng"}</span></label>)}</div>}
        {step===4&&<div><label className="form-label">Hồ sơ thương mại / bảo hiểm<input className="form-input" disabled placeholder="Chuyên viên hồ sơ hoàn thiện thông tin thương mại"/></label><div className="upload-box"><label className="form-label">Hồ sơ lý lịch & Y tế ban đầu (ảnh + scan hộ chiếu hiện hành)</label>{selected.map(id=><div key={id}><strong>{horses.find(h=>h.horseId===id)?.name}</strong>{["photo","passport"].map(kind=><button type="button" className="btn-secondary" key={kind} onClick={()=>download(`/customer/horses/${id}/files/${kind}`,kind).catch(e=>setError(flow1Error(e)))}>Xem {kind==="photo"?"ảnh ngựa":"hộ chiếu"}</button>)}</div>)}</div><p className="estimate-banner-sub">{trip.pickup.address} → {trip.delivery.address} • {departure.replace("T"," ")} → {delivery.replace("T"," ")} (giờ Việt Nam)</p><label className="wizard-agreement"><input type="checkbox" required/>Tôi xác nhận thông tin và hồ sơ đã chọn.</label></div>}
        <div className="wizard-footer"><button type="button" className="btn-secondary" disabled={step===1||busy} onClick={()=>{setError("");setStep(step-1);}}>Quay lại</button><button className="btn-primary" aria-label={step<4?"Tiếp tục":"Gửi yêu cầu"} disabled={busy||(step===3&&(checkedRange!==range||selected.length===0))||(revision&&(!existing||existing.status!=="CHANGES_REQUESTED"))}>{busy?"Đang gửi…":step<4?`Tiếp tục Bước ${step+1}`:"Gửi Yêu Cầu Vận Chuyển"}</button></div>
      </form></div></div>;
};
