import { useNavigate } from "react-router-dom";
import { flow1, get, flow1Error, initialTrip } from "../../../flow1/api";
import { relational } from "../../../flow1/relational/api";
import { useEffect, useState } from 'react';
import { BrandLogo } from '../../../../shared/components/brand-logo/BrandLogo';
import './CreateRequestWizard.css';

const COUNTRIES = [
  'Việt Nam', 'Trung Quốc', 'Lào', 'Campuchia', 'Thái Lan',
  'Singapore', 'Nhật Bản', 'Hàn Quốc', 'UAE', 'Hồng Kông'
];

interface HorseItem {
  horseId: string;
  name: string;
  breed: string;
  microchipIso: string;
  feiPassportNo: string;
  status: 'Ready' | 'InTransit';
  version: string;
}

export const CreateRequestWizard = () => {
  const navigate = useNavigate();
  const [seed] = useState(initialTrip);
  const [MY_HORSES, setHorses] = useState<HorseItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [attribution, setAttribution] = useState('');
  const [keys] = useState(() => new Map<string, string>());
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [departure, setDeparture] = useState('Việt Nam');
  const [destination, setDestination] = useState(seed.delivery.country === 'VN' ? 'Việt Nam' : 'Nhật Bản');
  const [transportType, setTransportType] = useState<'Đường bộ' | 'Hàng không'>(seed.preferredTransportMode === 'ROAD' ? 'Đường bộ' : 'Hàng không');
  const [expectedDate, setExpectedDate] = useState('');
  const [committedDeadline, setCommittedDeadline] = useState('');
  const [pickupAddress, setPickupAddress] = useState(seed.pickup.address);
  const [deliveryAddress, setDeliveryAddress] = useState(seed.delivery.address);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [commercialValue, setCommercialValue] = useState<number | ''>('');
  const [baselineFiles, setBaselineFiles] = useState<{ id: string; file: File; horseId: string }[]>([]);
  const [selectedHorses, setSelectedHorses] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const estimatedTotal = (destination === 'Nhật Bản' ? 46250000 : 16250000) * Math.max(selectedHorses.length, 1);
  useEffect(() => {
    let active = true;
    const from = expectedDate ? new Date(expectedDate + 'T00:00:00+07:00').toISOString() : undefined;
    const to = committedDeadline ? new Date(committedDeadline + 'T23:59:00+07:00').toISOString() : undefined;
    relational.horses(from, to).then(rows => { if (active) setHorses(rows.map(h => ({ horseId: h.horseId, name: h.name, breed: h.breed || '—', microchipIso: h.microchipIso, feiPassportNo: h.passportNo || '—', status: h.selectable && h.hasDocuments ? 'Ready' : 'InTransit', version: h.version }))); }).catch(e => { if (active) setErrorMsg(flow1Error(e)); });
    return () => { active = false; };
  }, [expectedDate, committedDeadline]);
  const submit = async () => {
    if (submitting) return;
    setSubmitting(true); setErrorMsg('');
    try {
      if (!expectedDate || !committedDeadline || !selectedHorses.length || !receiverName.trim() || !receiverPhone.trim()) throw new Error('Vui lòng hoàn tất ngày, ngựa và người nhận.');
      if (commercialValue !== '' && (!Number.isFinite(commercialValue) || commercialValue <= 0 || Math.abs(commercialValue * 100 - Math.round(commercialValue * 100)) > 0.0001)) throw new Error('Giá trị tổng cả đơn phải lớn hơn 0 USD và có tối đa 2 chữ số thập phân; có thể để trống.');
      if (baselineFiles.some(x => !selectedHorses.includes(x.horseId))) throw new Error('Chọn ngựa tương ứng cho từng hồ sơ; ngựa phải nằm trong yêu cầu.');
      if (departure !== 'Việt Nam' || !['Việt Nam', 'Nhật Bản'].includes(destination)) throw new Error('MVP hỗ trợ VN→VN đường bộ và VN→JP hàng không.');
      if ((destination === 'Nhật Bản') !== (transportType === 'Hàng không')) throw new Error('Phương thức vận chuyển không phù hợp tuyến.');
      const country = destination === 'Nhật Bản' ? 'JP' : 'VN';
      const [pickup, delivery, owner] = await Promise.all([flow1.search(pickupAddress, 'VN'), flow1.search(deliveryAddress, country), get<{ fullName: string; phoneNumber?: string }>('/auth/me')]);
      if (pickup.length !== 1 || delivery.length !== 1) throw new Error('Địa chỉ chưa rõ hoặc có nhiều kết quả. Vui lòng nhập địa chỉ cụ thể hơn; chưa gửi yêu cầu.');
      if (!owner.phoneNumber) throw new Error('Hồ sơ tài khoản thiếu SĐT người bàn giao; cần bổ sung trước khi gửi.');
      const input = { trip: { pickup: { address: pickup[0].label, lat: pickup[0].point.latitude, lng: pickup[0].point.longitude, country: 'VN' }, delivery: { address: delivery[0].label, lat: delivery[0].point.latitude, lng: delivery[0].point.longitude, country }, preferredTransportMode: country === 'JP' ? 'AIR' : 'ROAD', horseCount: selectedHorses.length, desiredDepartureDate: expectedDate }, departureAt: new Date(expectedDate + 'T00:00:00+07:00').toISOString(), deliveryAt: new Date(committedDeadline + 'T23:59:00+07:00').toISOString(), purpose: 'Vận chuyển ngựa', pickupContact: { name: owner.fullName, phone: owner.phoneNumber }, receiver: { name: receiverName, phone: receiverPhone }, horses: selectedHorses.map(id => { const h = MY_HORSES.find(x => x.horseId === id); if (!h || h.status !== 'Ready') throw new Error('Ngựa không còn khả dụng.'); return { horseId: id, version: h.version }; }) };
      setAttribution([...new Set([pickup[0].attribution, delivery[0].attribution])].join(' · '));
      const submission = { ...input, declaredValueUsd: commercialValue === '' ? null : commercialValue };
      const signature = JSON.stringify({ submission, documents: baselineFiles.map(x => ({ id: x.id, horseId: x.horseId })) }); let key = keys.get(signature); if (!key) { key = crypto.randomUUID(); keys.set(signature, key); }
      const saved = baselineFiles.length || commercialValue !== '' ? await relational.submitDocuments(submission, baselineFiles, key) : await relational.submit(submission, key);
      navigate('/customer/requests/' + saved.requestId);
    } catch (e) { setErrorMsg(flow1Error(e)); } finally { setSubmitting(false); }
  };

  const toggleHorse = (horse: HorseItem) => {
    if (horse.status === 'InTransit') {
      setErrorMsg(`Ngựa "${horse.name}" đang trong một đơn vận chuyển hiệu lực khác.`);
      return;
    }
    setErrorMsg('');
    setSelectedHorses((prev) =>
      prev.includes(horse.horseId) ? prev.filter((id) => id !== horse.horseId) : [...prev, horse.horseId]
    );
  };

  const addBaselineFiles = (chosen: FileList | null) => {
    const files = Array.from(chosen || []);
    if (baselineFiles.length + files.length > 10 || files.some(f => f.size < 16 || f.size > 5 * 1024 * 1024 || !/\.(pdf|png|jpe?g)$/i.test(f.name))) {
      setErrorMsg('Tối đa 10 hồ sơ PDF/JPG/PNG, mỗi file từ 16 byte đến 5 MB.'); return;
    }
    setErrorMsg('');
    setBaselineFiles(previous => [...previous, ...files.map(file => ({ id: crypto.randomUUID(), file, horseId: selectedHorses.length === 1 ? selectedHorses[0] : '' }))]);
  };

  return (
    <div className="customer-page">
      <div className="customer-topbar">
        <BrandLogo />
        <span className="customer-subtitle" style={{ margin: 0 }}>Khách hàng: {localStorage.getItem("userFullName") || "—"}</span>
      </div>

      <div className="customer-card">
        <h1 className="customer-title">Tạo Yêu Cầu Vận Chuyển Ngựa Đua</h1>
        <p className="customer-subtitle">
          Hoàn tất 4 bước thông tin để gửi Logistics Manager xét duyệt và lập báo giá chính thức.
        </p>

        <div className="wizard-steps">
          {[
            { num: 1, label: '1. Tuyến & Dự toán' },
            { num: 2, label: '2. Địa chỉ Giao/Nhận' },
            { num: 3, label: '3. Chọn Ngựa đua' },
            { num: 4, label: '4. Hồ sơ & Thương mại' },
          ].map((item) => (
            <button
              key={item.num}
              type="button"
              onClick={() => setStep(item.num as 1 | 2 | 3 | 4)}
              className={`wizard-step-btn ${step === item.num ? 'active' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {errorMsg && <div className="wizard-error">⚠️ {errorMsg}</div>}

        {step === 1 && (
          <div>
            <div className="form-grid-2">
              <div>
                <label className="form-label">Quốc gia xuất phát</label>
                <select className="form-select" value={departure} onChange={(e) => setDeparture(e.target.value)}>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Quốc gia đích đến</label>
                <select className="form-select" value={destination} onChange={(e) => setDestination(e.target.value)}>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Phương thức vận chuyển</label>
                <select
                  className="form-select"
                  value={transportType}
                  onChange={(e) => setTransportType(e.target.value as 'Đường bộ' | 'Hàng không')}
                >
                  <option value="Hàng không">Hàng không (Air Stall)</option>
                  <option value="Đường bộ">Đường bộ (Equine Truck)</option>
                </select>
              </div>
              <div>
                <label className="form-label">Ngày khởi hành dự kiến</label>
                <input type="date" className="form-input" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
              </div>
              <div className="form-full">
                <label className="form-label">Hạn chót bàn giao (Committed Deadline)</label>
                <input type="date" className="form-input" value={committedDeadline} onChange={(e) => setCommittedDeadline(e.target.value)} />
              </div>
            </div>

            <div className="estimate-banner">
              <div>
                <p className="estimate-banner-title">Bảng Dự Toán Tạm Tính (Estimate)</p>
                <p className="estimate-banner-sub">
                  Phương thức: {transportType} • Số ngựa: {selectedHorses.length} cá thể {attribution}
                </p>
              </div>
              <span className="estimate-price">{estimatedTotal.toLocaleString()} VND</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="form-grid-2">
            <div className="form-full">
              <label className="form-label">Địa chỉ Trại / CLB lấy ngựa</label>
              <input type="text" className="form-input" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
            </div>
            <div className="form-full">
              <label className="form-label">Địa chỉ Trường đua / Trại nhận ngựa</label>
              <input type="text" className="form-input" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Họ tên Người nhận chỉ định</label>
              <input type="text" className="form-input" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
            </div>
            <div>
              <label className="form-label">SĐT Người nhận (Nhận OTP bàn giao)</label>
              <input type="text" className="form-input" value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            {MY_HORSES.map((horse) => {
              const isSelected = selectedHorses.includes(horse.horseId);
              return (
                <div
                  key={horse.horseId}
                  onClick={() => toggleHorse(horse)}
                  className={`horse-item ${isSelected ? 'selected' : ''}`}
                >
                  <div>
                    <strong>{horse.name} ({horse.breed})</strong>
                    <p className="estimate-banner-sub">
                      Microchip ISO: {horse.microchipIso} • Hộ chiếu: {horse.feiPassportNo}
                    </p>
                  </div>
                  <span className={`horse-badge ${horse.status === 'Ready' ? 'ready' : 'busy'}`}>
                    {horse.status === 'Ready' ? (isSelected ? 'Đã chọn ✓' : 'Sẵn sàng') : 'Đang bận chuyến khác'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {step === 4 && (
          <div>
            <label className="form-label" htmlFor="declared-value-usd">Định giá thương mại (USD) phục vụ bảo hiểm & hải quan</label>
            <input
              type="number"
              id="declared-value-usd" min="0.01" step="0.01" title="Tổng giá trị khai báo của toàn bộ ngựa trong đơn; có thể để trống"
              className="form-input"
              value={commercialValue}
              onChange={(e) => { setErrorMsg(''); setCommercialValue(e.target.value === '' ? '' : Number(e.target.value)); }}
            />
            <div className="upload-box">
              <label className="form-label">Tải lên Hồ sơ lý lịch & Y tế ban đầu (PDF, JPG, PNG)</label>
              <input type="file" aria-label="Hồ sơ lý lịch và y tế bổ sung" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={e => { addBaselineFiles(e.target.files); e.target.value = ''; }} />
              <div data-flow1-baseline-files>
                {baselineFiles.map(document => (
                  <div key={document.id}>
                    <p className="form-label">{document.file.name}</p>
                    <select className="form-select" aria-label={`Ngựa của hồ sơ ${document.file.name}`} value={document.horseId}
                      onChange={e => { setErrorMsg(''); setBaselineFiles(previous => previous.map(x => x.id === document.id ? { ...x, horseId: e.target.value } : x)); }}>
                      <option value="">— Chọn ngựa tương ứng —</option>
                      {MY_HORSES.filter(h => selectedHorses.includes(h.horseId)).map(h => <option key={h.horseId} value={h.horseId}>{h.name}</option>)}
                    </select>
                    <button type="button" className="btn-secondary" aria-label={`Bỏ hồ sơ ${document.file.name}`} onClick={() => { setErrorMsg(''); setBaselineFiles(previous => previous.filter(x => x.id !== document.id)); }}>Bỏ hồ sơ</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="wizard-footer">
          <button
            type="button"
            className="btn-secondary"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)}
          >
            Quay lại
          </button>
          {step < 4 ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4)}
            >
              Tiếp tục Bước {step + 1}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={submitting} onClick={() => void submit()}
            >
              Gửi Yêu Cầu Vận Chuyển
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
