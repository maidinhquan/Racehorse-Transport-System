import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../../../../shared/components/brand-logo/BrandLogo';
import { createRequest } from '../../../user-dashboard/data/transportRequestStorage';
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
  { horseId: 'HRS-03', name: 'Golden Pegasus', breed: 'Thoroughbred', microchipIso: '981020000777888', feiPassportNo: 'FEI-VN-7744', status: 'Ready' },
];

export const CreateRequestWizard = () => {
  const navigate = useNavigate();
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
  const [submittedRequest, setSubmittedRequest] = useState<any | null>(null);

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

  const handleSendRequest = () => {
    if (selectedHorses.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 ngựa đua cần vận chuyển.');
      setStep(3);
      return;
    }

    const chosenHorses = MY_HORSES.filter((h) => selectedHorses.includes(h.horseId));
    const isJP = destination === 'Nhật Bản';

    // Tạo đơn hàng thực tế và lưu vào hệ thống chung
    const newReq = createRequest({
      origin: departure,
      destination: destination,
      preferredDate: expectedDate,
      horseCount: chosenHorses.length,
      estimatedPrice: estimatedTotal,
      horses: chosenHorses.map((h) => h.name),
      customerName: 'Nguyễn Thanh Quốc Linh',
      phone: '+84 909 888 999',
      email: 'linh.nguyen@equine.vn',
      transportMode: transportType === 'Hàng không' ? 'AIR' : 'ROAD',
      destinationCountry: isJP ? 'JP' : 'OTHER',
      originCountry: 'VN',
      specialRequirements: `Nơi nhận: ${deliveryAddress}. Người nhận: ${receiverName} (${receiverPhone}). Định giá: $${commercialValue.toLocaleString()} USD.`,
    });

    setSubmittedRequest(newReq);
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
          Hoàn tất 4 bước thông tin để gửi trực tiếp tới Logistics Manager xét duyệt và lập hợp đồng vận tải chính thức.
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
            </div>

            <div className="form-grid-2">
              <div>
                <label className="form-label">Phương thức vận chuyển</label>
                <select
                  className="form-select"
                  value={transportType}
                  onChange={(e) => setTransportType(e.target.value as 'Đường bộ' | 'Hàng không')}
                >
                  <option value="Hàng không">Hàng không (Khuyên dùng cho tuyến quốc tế)</option>
                  <option value="Đường bộ">Đường bộ (Chuyên dụng xe Stallion VIP)</option>
                </select>
              </div>
              <div>
                <label className="form-label">Ngày dự kiến xuất phát</label>
                <input
                  type="date"
                  className="form-input"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="estimate-banner">
              <strong>Ước tính chi phí sơ bộ: ${estimatedTotal.toLocaleString()} USD</strong>
              <p className="estimate-banner-sub">
                Đã bao gồm cước vận chuyển {transportType.toLowerCase()}, chăm sóc thú y theo chặng và phí kiểm dịch hải quan ban đầu.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="form-grid-2">
              <div>
                <label className="form-label">Địa chỉ nhận ngựa (Pick-up Address)</label>
                <input
                  type="text"
                  className="form-input"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Địa chỉ giao ngựa (Delivery Destination)</label>
                <input
                  type="text"
                  className="form-input"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>
            </div>
            <div className="form-grid-2">
              <div>
                <label className="form-label">Thời hạn cam kết giao ngựa</label>
                <input
                  type="date"
                  className="form-input"
                  value={committedDeadline}
                  onChange={(e) => setCommittedDeadline(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Người nhận đại diện tại điểm đích</label>
                <input
                  type="text"
                  className="form-input"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <label className="form-label">Số điện thoại người nhận</label>
              <input
                type="text"
                className="form-input"
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
              />
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
              onClick={handleSendRequest}
            >
              Gửi Yêu Cầu Vận Chuyển
            </button>
          )}
        </div>
      </div>

      {/* Success Modal hiển thị khi gửi thành công */}
      {submittedRequest && (
        <div className="jp-modal-overlay">
          <div className="jp-modal-card" style={{ maxWidth: '580px', textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>✅</div>
            <h2 style={{ color: '#0f172a', margin: '0 0 0.5rem 0', fontWeight: 800 }}>
              Gửi Yêu Cầu Vận Chuyển Thành Công!
            </h2>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1rem',
              margin: '1.25rem 0',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>Mã yêu cầu:</span>
                <strong style={{ color: '#0284c7', fontFamily: 'monospace', fontSize: '1.1rem' }}>{submittedRequest.id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>Tuyến đường:</span>
                <strong style={{ color: '#1e293b' }}>{departure} ➔ {destination}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>Số lượng ngựa:</span>
                <strong style={{ color: '#1e293b' }}>{submittedRequest.horseCount} cá thể</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Trạng thái tiếp nhận:</span>
                <span style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}>
                  Chờ Logistics Manager xét duyệt
                </span>
              </div>
            </div>

            <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
              Đơn hàng của quý khách đã được chuyển thẳng đến bàn làm việc của <strong>Logistics Manager</strong>.
              Bạn có thể theo dõi tiến độ hoặc chuyển sang giao diện quản lý để kiểm tra.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/customer/requests')}
                style={{ padding: '0.65rem 1.25rem' }}
              >
                Quản lý đơn của tôi
              </button>

              {destination === 'Nhật Bản' && (
                <button
                  type="button"
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.65rem 1.25rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                  onClick={() => navigate('/japan-route')}
                >
                  Hồ sơ Tuyến Nhật Bản 🇯🇵
                </button>
              )}

              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate('/manager/requests')}
                style={{ padding: '0.65rem 1.25rem' }}
              >
                Đến Cổng Nhân Viên (Kiểm tra) ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};