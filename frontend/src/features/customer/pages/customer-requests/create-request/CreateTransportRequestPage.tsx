import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerLayout } from '../../../components/CustomerLayout';
import { useHorseProfiles } from '../../../data/horseProfileStorage';
import './CreateTransportRequestPage.css';

const CITIES = [
  'Ho Chi Minh City',
  'Hanoi',
  'Da Nang',
  'Bangkok',
  'Tokyo',
  'Singapore',
  'London',
  'Dubai',
  'Sydney',
  'Hong Kong',
  'Kuala Lumpur',
  'Seoul'
];

export const CreateTransportRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { horses, loading: horsesLoading, error: horsesError, refresh: refreshHorses } = useHorseProfiles();

  // Current wizard step (1 to 4)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State - Step 1: Trip Info
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [horseCount, setHorseCount] = useState('1 ngựa');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Form State - Step 2: Pickup & Delivery
  const [pickupAddress, setPickupAddress] = useState('Trang trại Saigon Riding Club, Quận 9, TP.HCM');
  const [pickupContact, setPickupContact] = useState('Nguyễn Văn Tuấn - 0912345678');
  const [deliveryAddress, setDeliveryAddress] = useState('Trung tâm Huấn luyện Đua ngựa Quốc tế Tokyo, Fuchu');
  const [deliveryContact, setDeliveryContact] = useState('Kenji Takahashi - +81 90 1234 5678');
  const [vehicleType, setVehicleType] = useState('Xe van chuyên dụng kiểm soát nhiệt độ (Euro 6)');

  // Form State - Step 3: Horses & Docs
  const [selectedHorseId, setSelectedHorseId] = useState('HOR-1029'); // Default Thunderbolt
  const [declaredValue, setDeclaredValue] = useState('150000');
  const [requireQuarantineDoc, setRequireQuarantineDoc] = useState(true);
  const [requireInsurance, setRequireInsurance] = useState(true);

  // Form State - Step 4: Submission State
  const [isAgreed, setIsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Price estimate calculation
  const hasEstimateData = origin && destination && expectedDate;
  const calculateEstimate = () => {
    if (!origin || !destination) return null;
    const isInternational =
      origin !== 'Ho Chi Minh City' && origin !== 'Hanoi' && origin !== 'Da Nang' ||
      destination !== 'Ho Chi Minh City' && destination !== 'Hanoi' && destination !== 'Da Nang';

    if (isInternational) {
      return {
        mode: 'Đường hàng không chuyên dụng (Air Cargo IATA LAR)',
        estDistance: '4,350 km',
        estPriceVnd: '98,000,000 VND',
        estPriceUsd: '$3,950 USD',
        transitTime: '2 - 3 ngày'
      };
    }
    return {
      mode: 'Xe chuyên dụng đường bộ CBN Express',
      estDistance: '1,150 km',
      estPriceVnd: '24,500,000 VND',
      estPriceUsd: '$980 USD',
      transitTime: '24 - 36 giờ'
    };
  };

  const estimate = calculateEstimate();

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/customer/requests');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setTimeout(() => {
        navigate('/customer/requests');
      }, 1800);
    }, 1000);
  };

  const selectedHorse = horses.find((h) => h.id === selectedHorseId);

  return (
    <CustomerLayout pageTitle="Yêu cầu vận chuyển" activeNav="requests">
      <div className="create-request-page">
        {/* ==================== TOP NAVIGATION BACK LINK ==================== */}
        <div className="create-req-back-bar">
          <button
            type="button"
            className="btn-back-to-requests"
            onClick={() => navigate('/customer/requests')}
          >
            ← Quay lại Yêu cầu vận chuyển
          </button>
        </div>

        {/* ==================== PAGE HEADER ==================== */}
        <section className="create-req-header">
          <h2 className="create-req-title">Tạo yêu cầu vận chuyển</h2>
          <p className="create-req-subtitle">
            Bước {currentStep}/4: {currentStep === 1 ? 'Thông tin chuyến đi' : currentStep === 2 ? 'Điểm nhận & giao' : currentStep === 3 ? 'Ngựa & hồ sơ' : 'Xem lại & gửi'}. Tiếp theo là điểm nhận/giao, ngựa &amp; hồ sơ, và xác nhận gửi Manager xét duyệt.
          </p>
        </section>

        {/* ==================== STEPPER / TIMELINE ==================== */}
        <div className="create-req-stepper">
          {/* Step 1 */}
          <div
            className={`step-item ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}
            onClick={() => setCurrentStep(1)}
          >
            <div className="step-circle">{currentStep > 1 ? '✓' : '1'}</div>
            <span className="step-label">Chuyến đi</span>
          </div>

          <div className={`step-connector ${currentStep > 1 ? 'completed' : ''}`} />

          {/* Step 2 */}
          <div
            className={`step-item ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}
            onClick={() => setCurrentStep(2)}
          >
            <div className="step-circle">{currentStep > 2 ? '✓' : '2'}</div>
            <span className="step-label">Nhận &amp; giao</span>
          </div>

          <div className={`step-connector ${currentStep > 2 ? 'completed' : ''}`} />

          {/* Step 3 */}
          <div
            className={`step-item ${currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : ''}`}
            onClick={() => setCurrentStep(3)}
          >
            <div className="step-circle">{currentStep > 3 ? '✓' : '3'}</div>
            <span className="step-label">Ngựa &amp; hồ sơ</span>
          </div>

          <div className={`step-connector ${currentStep > 3 ? 'completed' : ''}`} />

          {/* Step 4 */}
          <div
            className={`step-item ${currentStep === 4 ? 'active' : ''}`}
            onClick={() => setCurrentStep(4)}
          >
            <div className="step-circle">4</div>
            <span className="step-label">Xem lại &amp; gửi</span>
          </div>
        </div>

        {/* ==================== MAIN STEP CARD ==================== */}
        <div className="create-req-card">
          {/* ==================== STEP 1: THÔNG TIN CHUYẾN ĐI ==================== */}
          {currentStep === 1 && (
            <div className="step-content-section">
              <h3 className="step-card-title">Thông tin chuyến đi</h3>

              <div className="form-grid-two-col">
                <div className="form-field-group">
                  <label className="form-field-label">Điểm đi</label>
                  <div className="form-select-wrapper">
                    <select
                      className="form-select-input"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                    >
                      <option value="">Chọn thành phố</option>
                      {CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <svg className="select-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Điểm đến</label>
                  <div className="form-select-wrapper">
                    <select
                      className="form-select-input"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    >
                      <option value="">Chọn thành phố</option>
                      {CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <svg className="select-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="form-grid-two-col">
                <div className="form-field-group">
                  <label className="form-field-label">Ngày vận chuyển mong muốn</label>
                  <div className="form-date-wrapper">
                    <input
                      type="date"
                      className="form-date-input"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                      placeholder="dd/mm/yyyy"
                    />
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Số lượng ngựa</label>
                  <div className="form-select-wrapper">
                    <select
                      className="form-select-input"
                      value={horseCount}
                      onChange={(e) => setHorseCount(e.target.value)}
                    >
                      <option value="1 ngựa">1 ngựa</option>
                      <option value="2 ngựa">2 ngựa</option>
                      <option value="3 ngựa">3 ngựa</option>
                      <option value="4 ngựa">4 ngựa</option>
                      <option value="5+ ngựa">5+ ngựa (Đoàn thi đấu)</option>
                    </select>
                    <svg className="select-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="form-field-group full-width">
                <label className="form-field-label">Hướng dẫn chăm sóc đặc biệt (không bắt buộc)</label>
                <textarea
                  className="form-textarea-input"
                  rows={4}
                  placeholder="Cho ăn, cách dắt, ngựa đi kèm, tình trạng sức khỏe..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                />
              </div>

              {/* Estimation Box */}
              <div className="estimation-notice-box">
                <div className="estimation-icon-circle">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <div className="estimation-content">
                  <h4 className="estimation-title">Ước tính sơ bộ</h4>
                  {hasEstimateData && estimate ? (
                    <div className="estimation-details">
                      <p className="estimation-meta">
                        Phương án đề xuất: <b>{estimate.mode}</b> • Khoảng cách: <b>{estimate.estDistance}</b> • Thời gian dự kiến: <b>{estimate.transitTime}</b>
                      </p>
                      <p className="estimation-price">
                        Chi phí dự toán: <b>{estimate.estPriceVnd}</b> ({estimate.estPriceUsd})
                      </p>
                    </div>
                  ) : (
                    <p className="estimation-desc">
                      Nhập điểm đi, điểm đến, ngày và số ngựa để xem giá ước tính.
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="step-actions-footer">
                <button
                  type="button"
                  className="btn-step-cancel"
                  onClick={() => navigate('/customer/requests')}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn-step-continue"
                  onClick={handleNext}
                >
                  Lưu &amp; tiếp tục
                </button>
              </div>
            </div>
          )}

          {/* ==================== STEP 2: NHẬN & GIAO ==================== */}
          {currentStep === 2 && (
            <div className="step-content-section">
              <h3 className="step-card-title">Địa chỉ nhận và giao ngựa</h3>

              <div className="form-field-group full-width">
                <label className="form-field-label">Địa chỉ lấy ngựa (Nơi gửi) *</label>
                <input
                  type="text"
                  className="form-text-input"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Nhập địa chỉ chuồng trại / trường đua lấy ngựa..."
                />
              </div>

              <div className="form-field-group full-width">
                <label className="form-field-label">Người đại diện bàn giao tại điểm đi *</label>
                <input
                  type="text"
                  className="form-text-input"
                  value={pickupContact}
                  onChange={(e) => setPickupContact(e.target.value)}
                  placeholder="Họ tên và số điện thoại người giao..."
                />
              </div>

              <div className="form-field-group full-width">
                <label className="form-field-label">Địa chỉ trả ngựa (Nơi nhận) *</label>
                <input
                  type="text"
                  className="form-text-input"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Nhập địa chỉ trang trại / cơ sở nhận ngựa..."
                />
              </div>

              <div className="form-field-group full-width">
                <label className="form-field-label">Người đại diện tiếp nhận tại điểm đến *</label>
                <input
                  type="text"
                  className="form-text-input"
                  value={deliveryContact}
                  onChange={(e) => setDeliveryContact(e.target.value)}
                  placeholder="Họ tên và số điện thoại người nhận..."
                />
              </div>

              <div className="form-field-group full-width">
                <label className="form-field-label">Phương tiện chuyên dụng yêu cầu</label>
                <div className="form-select-wrapper">
                  <select
                    className="form-select-input"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                  >
                    <option value="Xe van chuyên dụng kiểm soát nhiệt độ (Euro 6)">Xe van chuyên dụng kiểm soát nhiệt độ (Euro 6)</option>
                    <option value="Xe tải đa chuồng đệm khí nén chuyên tuyến quốc lộ">Xe tải đa chuồng đệm khí nén chuyên tuyến quốc lộ</option>
                    <option value="Chuyên cơ vận tải hàng không IATA Live Animals (Quốc tế)">Chuyên cơ vận tải hàng không IATA Live Animals (Quốc tế)</option>
                  </select>
                  <svg className="select-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>

              <div className="step-actions-footer">
                <button
                  type="button"
                  className="btn-step-cancel"
                  onClick={handleBack}
                >
                  ← Quay lại
                </button>
                <button
                  type="button"
                  className="btn-step-continue"
                  onClick={handleNext}
                >
                  Lưu &amp; tiếp tục
                </button>
              </div>
            </div>
          )}

          {/* ==================== STEP 3: NGỰA & HỒ SƠ ==================== */}
          {currentStep === 3 && (
            <div className="step-content-section">
              <h3 className="step-card-title">Chọn ngựa &amp; hồ sơ gắn kèm</h3>
              {horsesError && <p role="alert">{horsesError} <button type="button" onClick={refreshHorses}>Thử lại</button></p>}
              {horsesLoading && <p role="status">Đang tải danh sách ngựa…</p>}

              <div className="form-field-group full-width">
                <label className="form-field-label">Chọn ngựa từ danh sách "Ngựa của tôi" *</label>
                <div className="form-select-wrapper">
                  <select
                    className="form-select-input"
                    value={selectedHorseId}
                    disabled={horsesLoading || Boolean(horsesError)}
                    onChange={(e) => setSelectedHorseId(e.target.value)}
                  >
                    <option value="">Chọn ngựa</option>
                    {horses.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.breed || 'Chưa cập nhật giống'} • Vi mạch: {h.microchip || 'Chưa cung cấp'})
                      </option>
                    ))}
                  </select>
                  <svg className="select-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>

              {/* Horse Info Summary Card */}
              {selectedHorse && (
                <div className="selected-horse-preview-card">
                  <div className="preview-badge-row">
                    <span className="preview-horse-name">{selectedHorse.name}</span>
                    <span className="preview-horse-id">Mã: {selectedHorse.id}</span>
                  </div>
                  <div className="preview-specs-grid">
                    <div>Giống loài: <b>{selectedHorse.breed}</b></div>
                    <div>Giới tính: <b>{selectedHorse.gender}</b></div>
                    <div>Độ tuổi: <b>{selectedHorse.age} tuổi</b></div>
                    <div>Vi mạch ISO: <b>{selectedHorse.microchip}</b></div>
                    <div>Hồ sơ đăng ký: <b>{selectedHorse.profileStatus}</b></div>
                    <div>Hộ chiếu: <b>{selectedHorse.passportScanStatus}</b></div>
                  </div>
                </div>
              )}

              <div className="form-field-group full-width" style={{ marginTop: '12px' }}>
                <label className="form-field-label">Giá trị thương mại bảo hiểm ước tính (USD) *</label>
                <input
                  type="number"
                  className="form-text-input"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(e.target.value)}
                  placeholder="Ví dụ: 150000"
                />
              </div>

              <div className="checkbox-group-wrapper">
                <label className="custom-checkbox-label">
                  <input
                    type="checkbox"
                    checked={requireQuarantineDoc}
                    onChange={(e) => setRequireQuarantineDoc(e.target.checked)}
                  />
                  <span>Ủy quyền cho CBN Transport thực hiện thủ tục kiểm dịch xuất/nhập khẩu và CITES.</span>
                </label>

                <label className="custom-checkbox-label">
                  <input
                    type="checkbox"
                    checked={requireInsurance}
                    onChange={(e) => setRequireInsurance(e.target.checked)}
                  />
                  <span>Đăng ký bảo hiểm hàng hải và rủi ro sinh học quốc tế 100% giá trị ngựa.</span>
                </label>
              </div>

              <div className="step-actions-footer">
                <button
                  type="button"
                  className="btn-step-cancel"
                  onClick={handleBack}
                >
                  ← Quay lại
                </button>
                <button
                  type="button"
                  className="btn-step-continue"
                  onClick={handleNext}
                >
                  Lưu &amp; tiếp tục
                </button>
              </div>
            </div>
          )}

          {/* ==================== STEP 4: XEM LẠI & GỬI ==================== */}
          {currentStep === 4 && (
            <div className="step-content-section">
              <h3 className="step-card-title">Xác nhận thông tin &amp; Gửi xét duyệt</h3>

              <div className="review-summary-container">
                <div className="review-item-row">
                  <span className="review-label">Tuyến đường:</span>
                  <span className="review-val bold">{origin || 'Chưa chọn'} → {destination || 'Chưa chọn'}</span>
                </div>
                <div className="review-item-row">
                  <span className="review-label">Ngày vận chuyển:</span>
                  <span className="review-val">{expectedDate || 'Chưa chọn'}</span>
                </div>
                <div className="review-item-row">
                  <span className="review-label">Ngựa vận chuyển:</span>
                  <span className="review-val bold">{selectedHorse?.name} ({selectedHorse?.breed})</span>
                </div>
                <div className="review-item-row">
                  <span className="review-label">Địa chỉ nhận:</span>
                  <span className="review-val">{pickupAddress}</span>
                </div>
                <div className="review-item-row">
                  <span className="review-label">Địa chỉ giao:</span>
                  <span className="review-val">{deliveryAddress}</span>
                </div>
                <div className="review-item-row">
                  <span className="review-label">Giá trị bảo hiểm:</span>
                  <span className="review-val">${Number(declaredValue).toLocaleString()} USD</span>
                </div>
                {specialInstructions && (
                  <div className="review-item-row">
                    <span className="review-label">Chăm sóc đặc biệt:</span>
                    <span className="review-val">{specialInstructions}</span>
                  </div>
                )}
              </div>

              <div className="review-notice-banner">
                <div className="review-notice-title">Quy trình xử lý yêu cầu:</div>
                <p className="review-notice-text">
                  Yêu cầu sau khi gửi sẽ chuyển đến Logistics Manager để kiểm tra lộ trình, xe chuyên dụng và tính toán chi phí chính xác. Hợp đồng chính thức sẽ được ban hành trong vòng 24 giờ.
                </p>
              </div>

              <div className="checkbox-agreement-box">
                <label className="custom-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isAgreed}
                    onChange={(e) => setIsAgreed(e.target.checked)}
                  />
                  <span>
                    Tôi xác nhận các thông tin trên là chính xác và đồng ý với Điều khoản Vận tải Đua ngựa Quốc tế của CBN Transport.
                  </span>
                </label>
              </div>

              {submitSuccess && (
                <div className="submit-success-alert">
                  ✓ Gửi yêu cầu vận chuyển thành công! Đang chuyển hướng về danh sách yêu cầu...
                </div>
              )}

              <div className="step-actions-footer">
                <button
                  type="button"
                  className="btn-step-cancel"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  ← Quay lại
                </button>
                <button
                  type="button"
                  className="btn-step-continue submit"
                  onClick={handleSubmit}
                  disabled={!isAgreed || isSubmitting}
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi Manager xét duyệt'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CreateTransportRequestPage;
