import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CustomerLayout from '../../../../shared/layouts/CustomerLayout/CustomerLayout';
import { customerMockStore } from '../../services/customerMockStore';
import type { HorseProfile } from '../../types/customerTypes';
import './CustomerCreateRequestPage.css';

const VN_CITIES = ['Hồ Chí Minh', 'Bình Dương', 'Hà Nội', 'Đà Nẵng'];
const JP_CITIES = ['Tokyo', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka'];

export const CustomerCreateRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [originCity, setOriginCity] = useState('Bình Dương');
  const [destinationCountry, setDestinationCountry] = useState<'Việt Nam' | 'Nhật Bản'>('Nhật Bản');
  const [destinationCity, setDestinationCity] = useState('Tokyo');
  const [transportType, setTransportType] = useState<'Đường bộ' | 'Hàng không'>('Hàng không');
  const [expectedDate, setExpectedDate] = useState('2026-11-10');
  const [committedDeadline, setCommittedDeadline] = useState('2026-11-15');

  const [pickupAddress, setPickupAddress] = useState('Trường đua Đại Nam, Hiệp An, TP. Thủ Dầu Một, Bình Dương');
  const [deliveryAddress, setDeliveryAddress] = useState('Tokyo Racecourse, Fuchu, Tokyo, Japan');
  const [receiverName, setReceiverName] = useState('Kenji Takahashi');
  const [receiverPhone, setReceiverPhone] = useState('+81-90-1234-5678');
  const [receiverEmail, setReceiverEmail] = useState('kenji.takahashi@tokyoracing.jp');

  const [availableHorses, setAvailableHorses] = useState<HorseProfile[]>([]);
  const [selectedHorseIds, setSelectedHorseIds] = useState<string[]>(['HOR-1035']);
  const [commercialValueUsd, setCommercialValueUsd] = useState<number>(180000);
  const [specialCareNotes, setSpecialCareNotes] = useState('Cần bổ sung cỏ Alfalfa và nước điện giải định kỳ 3 tiếng/lần.');

  // Pre-load quote from landing page or existing edit request
  useEffect(() => {
    const horses = customerMockStore.getHorses();
    setAvailableHorses(horses);

    if (editId) {
      const existing = customerMockStore.getRequestById(editId);
      if (existing) {
        setOriginCity(existing.originCity);
        setDestinationCountry(existing.destinationCountry);
        setDestinationCity(existing.destinationCity);
        setTransportType(existing.transportType);
        setExpectedDate(existing.expectedDate);
        setCommittedDeadline(existing.committedDeadline);
        setPickupAddress(existing.pickupAddress);
        setDeliveryAddress(existing.deliveryAddress);
        setReceiverName(existing.receiverName);
        setReceiverPhone(existing.receiverPhone);
        setReceiverEmail(existing.receiverEmail);
        setSelectedHorseIds(existing.horseIds);
        setCommercialValueUsd(existing.commercialValueUsd);
        setSpecialCareNotes(existing.specialCareNotes || '');
        return;
      }
    }

    // Check preliminary quote from landing
    const quoteRaw = sessionStorage.getItem('preliminaryQuote');
    if (quoteRaw) {
      try {
        const quote = JSON.parse(quoteRaw);
        if (quote.origin) setOriginCity(quote.origin);
        if (quote.destination) {
          if (JP_CITIES.includes(quote.destination)) {
            setDestinationCountry('Nhật Bản');
            setDestinationCity(quote.destination);
            setTransportType('Hàng không');
          } else {
            setDestinationCountry('Việt Nam');
            setDestinationCity(quote.destination);
            setTransportType('Đường bộ');
          }
        }
      } catch {
        // ignore error
      }
    }
  }, [editId]);

  // Adjust transport type when destination changes
  const handleDestinationCountryChange = (country: 'Việt Nam' | 'Nhật Bản') => {
    setDestinationCountry(country);
    if (country === 'Nhật Bản') {
      setDestinationCity(JP_CITIES[0]);
      setTransportType('Hàng không');
    } else {
      setDestinationCity(VN_CITIES.filter((c) => c !== originCity)[0] || 'Hà Nội');
      setTransportType('Đường bộ');
    }
  };

  const toggleHorseSelection = (horseId: string) => {
    const horse = availableHorses.find((h) => h.id === horseId);
    if (horse?.status === 'InTransit') {
      setErrorMsg(`Ngựa "${horse.name}" đang trong chuyến vận chuyển khác.`);
      return;
    }
    setErrorMsg('');
    setSelectedHorseIds((prev) =>
      prev.includes(horseId) ? prev.filter((id) => id !== horseId) : [...prev, horseId]
    );
  };

  // Preliminary Estimate Calculation (for display only, not binding)
  const isInternational = destinationCountry === 'Nhật Bản';
  const pricePerHorse = isInternational ? 8500 : 2500;
  const estimatedTotal = pricePerHorse * Math.max(selectedHorseIds.length, 1) + (isInternational ? 3500 : 800);
  const estimatedDeposit = Math.round(estimatedTotal * 0.3);

  // Validate steps
  const handleNextStep = () => {
    setErrorMsg('');
    if (step === 1) {
      if (destinationCountry === 'Việt Nam' && originCity === destinationCity) {
        setErrorMsg('Điểm đến nội địa phải khác thành phố xuất phát.');
        return;
      }
      if (!expectedDate || !committedDeadline) {
        setErrorMsg('Vui lòng chọn ngày khởi hành dự kiến và hạn chót bàn giao.');
        return;
      }
      if (new Date(committedDeadline) <= new Date(expectedDate)) {
        setErrorMsg('Hạn chót bàn giao phải sau ngày khởi hành dự kiến.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!pickupAddress.trim() || !deliveryAddress.trim()) {
        setErrorMsg('Vui lòng nhập đầy đủ địa chỉ lấy ngựa và địa chỉ giao ngựa.');
        return;
      }
      if (!receiverName.trim() || !receiverPhone.trim() || !receiverEmail.trim()) {
        setErrorMsg('Vui lòng cung cấp đầy đủ thông tin Người nhận chỉ định (Tên, SĐT, Email nhận mã OTP bàn giao).');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (selectedHorseIds.length === 0) {
        setErrorMsg('Vui lòng chọn ít nhất 1 cá thể ngựa cho yêu cầu vận chuyển.');
        return;
      }
      setStep(4);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedHorseIds.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 con ngựa.');
      return;
    }

    const created = customerMockStore.createRequest({
      originCity,
      originCountry: 'Việt Nam',
      destinationCity,
      destinationCountry,
      transportType,
      expectedDate,
      committedDeadline,
      pickupAddress,
      deliveryAddress,
      receiverName,
      receiverPhone,
      receiverEmail,
      horseIds: selectedHorseIds,
      commercialValueUsd,
      specialCareNotes,
    });

    // Clear preliminary quote from session
    sessionStorage.removeItem('preliminaryQuote');
    navigate(`/customer/requests/${created.id}`);
  };

  return (
    <CustomerLayout pageTitle="Tạo Yêu Cầu Vận Chuyển">
      <div className="cr-wizard-container">
        {/* Header */}
        <div className="cr-wizard-head">
          <button className="cr-back-link" onClick={() => navigate('/customer/requests')}>
            ← Quay lại danh sách yêu cầu
          </button>
          <h2>{editId ? `Chỉnh sửa Yêu Cầu ${editId}` : 'Tạo Yêu Cầu Vận Chuyển Mới'}</h2>
          <p className="cr-subtitle">
            Hệ thống hỗ trợ tuyến <b>Nội địa Việt Nam (VN ➔ VN)</b> và <b>Việt Nam ➔ Nhật Bản (VN ➔ JP)</b>.
            Thông tin chuyến, người nhận chỉ định và hồ sơ baseline được thu thập trước khi gửi Logistics Manager duyệt.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="cr-steps-bar">
          {[
            { num: 1, label: '1. Tuyến & Thời gian' },
            { num: 2, label: '2. Địa chỉ & Người nhận' },
            { num: 3, label: '3. Chọn Ngựa đua' },
            { num: 4, label: '4. Hồ sơ baseline & Gửi duyệt' },
          ].map((item) => (
            <div
              key={item.num}
              className={`cr-step-pill ${step === item.num ? 'active' : ''} ${step > item.num ? 'completed' : ''}`}
              onClick={() => step > item.num && setStep(item.num as any)}
            >
              <span className="cr-step-num">{step > item.num ? '✓' : item.num}</span>
              <span className="cr-step-text">{item.label}</span>
            </div>
          ))}
        </div>

        {errorMsg && <div className="cr-error-box">⚠️ {errorMsg}</div>}

        <div className="cr-card">
          {/* STEP 1: Route & Schedule */}
          {step === 1 && (
            <div className="cr-form-section">
              <h3 className="cr-section-title">Thông tin Tuyến Vận Chuyển & Thời gian</h3>
              <div className="cr-grid-2">
                <div className="cr-field">
                  <label>Quốc gia xuất phát (Cố định)</label>
                  <input type="text" className="cr-input" value="Việt Nam" disabled />
                </div>

                <div className="cr-field">
                  <label>Thành phố / Tỉnh xuất phát *</label>
                  <select
                    className="cr-select"
                    value={originCity}
                    onChange={(e) => setOriginCity(e.target.value)}
                  >
                    {VN_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cr-field">
                  <label>Quốc gia đến * (Chỉ hỗ trợ VN và Nhật Bản)</label>
                  <select
                    className="cr-select"
                    value={destinationCountry}
                    onChange={(e) => handleDestinationCountryChange(e.target.value as any)}
                  >
                    <option value="Nhật Bản">Nhật Bản (Quốc tế VN ➔ JP)</option>
                    <option value="Việt Nam">Việt Nam (Nội địa VN ➔ VN)</option>
                  </select>
                </div>

                <div className="cr-field">
                  <label>Thành phố đến *</label>
                  <select
                    className="cr-select"
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                  >
                    {(destinationCountry === 'Nhật Bản' ? JP_CITIES : VN_CITIES).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cr-field">
                  <label>Phương thức vận chuyển *</label>
                  <select
                    className="cr-select"
                    value={transportType}
                    onChange={(e) => setTransportType(e.target.value as any)}
                  >
                    {isInternational ? (
                      <option value="Hàng không">Hàng không (Air Stall vận tải chuyên dụng)</option>
                    ) : (
                      <>
                        <option value="Đường bộ">Đường bộ (Equine Truck chuyên dụng)</option>
                        <option value="Hàng không">Hàng không (Air Stall nội địa)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="cr-field">
                  <label>Ngày xuất phát dự kiến *</label>
                  <input
                    type="date"
                    className="cr-input"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                  />
                </div>

                <div className="cr-field cr-col-span-2">
                  <label>Hạn chót bàn giao cam kết (Committed Delivery Deadline) *</label>
                  <input
                    type="date"
                    className="cr-input"
                    value={committedDeadline}
                    onChange={(e) => setCommittedDeadline(e.target.value)}
                  />
                  <small className="cr-hint">
                    Hạn chót tính chỉ số On-Time Delivery (OTD). Mọi giấy tờ thú y phải có hiệu lực qua mốc thời gian này.
                  </small>
                </div>
              </div>

              {/* Estimate banner */}
              <div className="cr-estimate-banner">
                <div>
                  <strong>Bảng dự toán sơ bộ tham khảo:</strong>
                  <p>
                    {isInternational ? 'Chặng Quốc tế Việt Nam ➔ Nhật Bản' : 'Chặng Nội địa Việt Nam'} • {selectedHorseIds.length} ngựa
                  </p>
                </div>
                <div className="cr-estimate-numbers">
                  <span className="cr-total-price">${estimatedTotal.toLocaleString()} USD</span>
                  <small>Cọc dự kiến 30%: ${estimatedDeposit.toLocaleString()} USD</small>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Addresses & Designated Receiver */}
          {step === 2 && (
            <div className="cr-form-section">
              <h3 className="cr-section-title">Địa điểm Giao Nhận & Người Nhận Chỉ Định</h3>
              <p className="cr-section-sub">
                Người nhận có thể là người khác khách hàng và sẽ xác nhận nhận bàn giao ngựa bằng mã OTP gửi về Email đã đăng ký.
              </p>

              <div className="cr-grid-2">
                <div className="cr-field cr-col-span-2">
                  <label>Địa chỉ lấy ngựa cụ thể (Trại / CLB xuất phát) *</label>
                  <input
                    type="text"
                    className="cr-input"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="VD: Trường đua Đại Nam, Bình Dương"
                  />
                </div>

                <div className="cr-field cr-col-span-2">
                  <label>Địa chỉ giao ngựa cụ thể (Trường đua / Chuồng đích đến) *</label>
                  <input
                    type="text"
                    className="cr-input"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="VD: Tokyo Racecourse, Fuchu, Tokyo"
                  />
                </div>

                <div className="cr-field">
                  <label>Họ và tên Người nhận chỉ định *</label>
                  <input
                    type="text"
                    className="cr-input"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="VD: Kenji Takahashi"
                  />
                </div>

                <div className="cr-field">
                  <label>Số điện thoại người nhận *</label>
                  <input
                    type="tel"
                    className="cr-input"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    placeholder="VD: +81-90-1234-5678"
                  />
                </div>

                <div className="cr-field cr-col-span-2">
                  <label>Email người nhận chỉ định * (Để nhận OTP ký nhận bàn giao)</label>
                  <input
                    type="email"
                    className="cr-input"
                    value={receiverEmail}
                    onChange={(e) => setReceiverEmail(e.target.value)}
                    placeholder="VD: receiver@example.com"
                  />
                  <small className="cr-hint">
                    Quan trọng: Mã OTP bàn giao hoàn tất Trip sẽ được gửi trực tiếp vào email này khi tới điểm giao cuối.
                  </small>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Horse Selection */}
          {step === 3 && (
            <div className="cr-form-section">
              <h3 className="cr-section-title">Chọn Ngựa Đua Vận Chuyển</h3>
              <p className="cr-section-sub">
                Chọn các cá thể ngựa của bạn tham gia chuyến vận chuyển. Mỗi ngựa phải có mã vi mạch ISO và hộ chiếu FEI.
              </p>

              <div className="cr-horses-list">
                {availableHorses.map((horse) => {
                  const isSelected = selectedHorseIds.includes(horse.id);
                  const isBusy = horse.status === 'InTransit';
                  return (
                    <div
                      key={horse.id}
                      className={`cr-horse-item ${isSelected ? 'selected' : ''} ${isBusy ? 'disabled' : ''}`}
                      onClick={() => !isBusy && toggleHorseSelection(horse.id)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isBusy}
                        readOnly
                        className="cr-horse-checkbox"
                      />
                      <div className="cr-horse-info">
                        <div className="cr-horse-name">
                          <strong>{horse.name}</strong>
                          <span className="cr-horse-breed">({horse.breed} • {horse.gender})</span>
                          <span className={`cr-horse-badge ${isBusy ? 'busy' : 'ready'}`}>
                            {isBusy ? 'Đang bận chuyến khác' : 'Sẵn sàng'}
                          </span>
                        </div>
                        <div className="cr-horse-meta">
                          <span>Vi mạch ISO: <b>{horse.microchipIso}</b></span>
                          <span>Hộ chiếu FEI: <b>{horse.feiPassportNo}</b></span>
                          <span>Cân nặng: {horse.weightKg} kg</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="cr-field cr-mt-4">
                <label>Ghi chú chăm sóc đặc biệt (Dinh dưỡng, thú y, thói quen trên đường)</label>
                <textarea
                  className="cr-textarea"
                  rows={3}
                  value={specialCareNotes}
                  onChange={(e) => setSpecialCareNotes(e.target.value)}
                  placeholder="Ghi rõ yêu cầu cỏ, nước uống, bổ sung thuốc hoặc tính khí của ngựa..."
                />
              </div>
            </div>
          )}

          {/* STEP 4: Baseline Documents & Commercial Valuation */}
          {step === 4 && (
            <div className="cr-form-section">
              <h3 className="cr-section-title">Hồ Sơ Baseline & Định Giá Thương Mại</h3>
              <p className="cr-section-sub">
                Thu thập hồ sơ baseline theo checklist bắt buộc của tuyến trước khi submit.
                Không tự biến mọi giấy tờ thành bắt buộc cho mọi tuyến.
              </p>

              <div className="cr-field">
                <label>Tổng định giá thương mại các cá thể ngựa (USD) *</label>
                <input
                  type="number"
                  className="cr-input"
                  value={commercialValueUsd}
                  onChange={(e) => setCommercialValueUsd(Number(e.target.value))}
                  min={1000}
                />
                <small className="cr-hint">
                  Dùng làm cơ sở tính bảo hiểm hàng hải/hàng không và thủ tục khai báo hải quan.
                </small>
              </div>

              <div className="cr-checklist-card">
                <h4>Checklist hồ sơ baseline áp dụng cho tuyến: {destinationCountry === 'Nhật Bản' ? 'Quốc tế (VN ➔ JP)' : 'Nội địa (VN ➔ VN)'}</h4>
                <ul className="cr-checklist">
                  {isInternational ? (
                    <>
                      <li>
                        <span className="cr-check-icon">✓</span>
                        <div>
                          <strong>Hộ chiếu FEI (FEI Passport) hợp lệ</strong>
                          <p>Bắt buộc cho từng cá thể ngựa xuất khẩu đi Nhật Bản.</p>
                        </div>
                        <span className="cr-doc-status">Đã tải lên hệ thống</span>
                      </li>
                      <li>
                        <span className="cr-check-icon">✓</span>
                        <div>
                          <strong>Giấy chứng nhận kiểm dịch xuất khẩu (Export Health Certificate)</strong>
                          <p>Do Cục Thú y cấp trước ngày khởi hành.</p>
                        </div>
                        <span className="cr-doc-status">Đã tải lên hệ thống</span>
                      </li>
                      <li>
                        <span className="cr-check-icon">✓</span>
                        <div>
                          <strong>Kết quả xét nghiệm Coggins (EIA Test) âm tính</strong>
                          <p>Có giá trị trong vòng 30 ngày trước khi bay.</p>
                        </div>
                        <span className="cr-doc-status">Đã tải lên hệ thống</span>
                      </li>
                    </>
                  ) : (
                    <li>
                      <span className="cr-check-icon">✓</span>
                      <div>
                        <strong>Giấy chứng nhận kiểm dịch động vật nội địa</strong>
                        <p>Áp dụng cho vận chuyển liên tỉnh trong nước Việt Nam.</p>
                      </div>
                      <span className="cr-doc-status">Đã tải lên hệ thống</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="cr-summary-review">
                <h4>Xác nhận tóm tắt yêu cầu vận chuyển:</h4>
                <div className="cr-summary-grid">
                  <div>Tuyến: <b>{originCity} (VN) ➔ {destinationCity} ({destinationCountry})</b></div>
                  <div>Phương thức: <b>{transportType}</b></div>
                  <div>Khởi hành: <b>{expectedDate}</b> | Hạn bàn giao: <b>{committedDeadline}</b></div>
                  <div>Người nhận: <b>{receiverName}</b> ({receiverEmail} - {receiverPhone})</div>
                  <div>Số ngựa: <b>{selectedHorseIds.length}</b> cá thể</div>
                  <div>Dự toán sơ bộ: <b>${estimatedTotal.toLocaleString()} USD</b></div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="cr-footer-actions">
            {step > 1 && (
              <button
                type="button"
                className="cr-btn cr-btn-secondary"
                onClick={() => setStep((s) => (s - 1) as any)}
              >
                Quay lại Bước {step - 1}
              </button>
            )}

            {step < 4 ? (
              <button type="button" className="cr-btn cr-btn-primary" onClick={handleNextStep}>
                Tiếp tục Bước {step + 1} ➔
              </button>
            ) : (
              <button type="button" className="cr-btn cr-btn-success" onClick={handleSubmit}>
                Gửi Yêu Cầu Cho Logistics Manager Xét Duyệt
              </button>
            )}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};
