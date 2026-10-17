import { useState } from 'react';
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
}

const MY_HORSES: HorseItem[] = [
  { horseId: 'HRS-01', name: 'Thunder Strike', breed: 'Thoroughbred', microchipIso: '981020000123456', feiPassportNo: 'FEI-VN-8821', status: 'Ready' },
  { horseId: 'HRS-02', name: 'Saigon Star', breed: 'Arabian', microchipIso: '981020000654321', feiPassportNo: 'FEI-VN-9910', status: 'InTransit' },
];

export const CreateRequestWizard = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [departure, setDeparture] = useState('Việt Nam');
  const [destination, setDestination] = useState('Nhật Bản');
  const [transportType, setTransportType] = useState<'Đường bộ' | 'Hàng không'>('Hàng không');
  const [expectedDate, setExpectedDate] = useState('2026-11-01');
  const [committedDeadline, setCommittedDeadline] = useState('2026-11-05');
  const [pickupAddress, setPickupAddress] = useState('Trường đua Đại Nam, Bình Dương');
  const [deliveryAddress, setDeliveryAddress] = useState('Tokyo Racecourse, Fuchu, Tokyo');
  const [receiverName, setReceiverName] = useState('Kenji Takahashi');
  const [receiverPhone, setReceiverPhone] = useState('+81-90-1234-5678');
  const [commercialValue, setCommercialValue] = useState(150000);
  const [selectedHorses, setSelectedHorses] = useState<string[]>(['HRS-01']);
  const [errorMsg, setErrorMsg] = useState('');

  const baseFee = transportType === 'Hàng không' ? 8500 : 3200;
  const estimatedTotal = (baseFee + 1200) * Math.max(selectedHorses.length, 1);

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

  return (
    <div className="customer-page">
      <div className="customer-topbar">
        <BrandLogo />
        <span className="customer-subtitle" style={{ margin: 0 }}>Khách hàng: Nguyễn Thanh Quốc Linh</span>
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
                  Phương thức: {transportType} • Số ngựa: {selectedHorses.length} cá thể
                </p>
              </div>
              <span className="estimate-price">${estimatedTotal.toLocaleString()} USD</span>
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
            <label className="form-label">Định giá thương mại (USD) phục vụ bảo hiểm & hải quan</label>
            <input
              type="number"
              className="form-input"
              value={commercialValue}
              onChange={(e) => setCommercialValue(Number(e.target.value))}
            />
            <div className="upload-box">
              <label className="form-label">Tải lên Hồ sơ lý lịch & Y tế ban đầu (PDF, JPG, PNG)</label>
              <input type="file" accept=".pdf,.jpg,.png" multiple />
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
              onClick={() => alert('Đã gửi yêu cầu vận chuyển REQ-2026-089 sang Logistics Manager!')}
            >
              Gửi Yêu Cầu Vận Chuyển
            </button>
          )}
        </div>
      </div>
    </div>
  );
};