import { useState } from 'react';
import { BrandLogo } from '../../../../shared/components/brand-logo/BrandLogo';
import './HandoverPage.css';

export const HandoverPage = () => {
  const [microchipVerified, setMicrochipVerified] = useState(false);
  const [documentsReturned, setDocumentsReturned] = useState(false);
  const [conditionOk, setConditionOk] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const isFormValid = microchipVerified && documentsReturned && conditionOk && otpCode.length === 6;

  const handleCompleteHandover = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    // Giả lập gọi API xác nhận bàn giao (HANDOVER & HANDOVER_ITEM)
    setIsSuccess(true);
  };

  return (
    <div className="handover-page">
      <div style={{ marginBottom: '16px' }}>
        <BrandLogo compact />
      </div>

      <div className="handover-card">
        <h1 className="handover-title">Biên bản Bàn giao Điểm đích</h1>
        <p className="handover-subtitle">Chuyến: TRP-2026 • Cá thể: Thunder Strike</p>

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#15803D' }}>Bàn giao thành công!</h2>
            <p className="handover-subtitle" style={{ marginTop: '4px' }}>
              Trạng thái đơn hàng đã được cập nhật thành "Hoàn thành" (Completed).
            </p>
          </div>
        ) : (
          <form onSubmit={handleCompleteHandover}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={microchipVerified}
                onChange={(e) => setMicrochipVerified(e.target.checked)}
              />
              <span>Đã quét và đối chiếu khớp mã Microchip ISO (981020000123456)</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={documentsReturned}
                onChange={(e) => setDocumentsReturned(e.target.checked)}
              />
              <span>Đã bàn giao đầy đủ túi hồ sơ gốc (Flight Bag) cho người nhận</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={conditionOk}
                onChange={(e) => setConditionOk(e.target.checked)}
              />
              <span>Xác nhận tình trạng ngựa khỏe mạnh, không phát sinh thương tích</span>
            </label>

            <div style={{ marginTop: '16px' }}>
              <label className="form-label">Nhập mã OTP xác nhận từ Người nhận (SĐT Chủ ngựa)</label>
              <input
                type="text"
                className="otp-input"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="------"
              />
            </div>

            <button
              type="submit"
              className="btn-submit-handover"
              disabled={!isFormValid}
            >
              Xác Nhận Hoàn Tất Bàn Giao
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default HandoverPage;