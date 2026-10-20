import React, { useState } from 'react';
import type { IncidentDetail } from '../../types';
import './Modals.css';

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: IncidentDetail;
  onResolve: (action: string) => void;
}

export const IncidentModal: React.FC<IncidentModalProps> = ({
  isOpen,
  onClose,
  incident,
  onResolve
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('quarantine_24h');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage('Lựa chọn xử lý đã được gửi thành công đến Quản lý điều phối CBN Transport!');
      onResolve(selectedOption);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1500);
    }, 600);
  };

  return (
    <div className="cbn-modal-backdrop" onClick={onClose}>
      <div className="cbn-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cbn-modal-header">
          <div className="cbn-modal-title-box">
            <h3 className="cbn-modal-title">
              <span style={{ color: '#f87171' }}>⚠️</span>
              <span>Xử lý sự cố kiểm dịch — Flow 5</span>
            </h3>
            <p className="cbn-modal-subtitle">
              Mã chuyến: <b>{incident.tripId}</b> • Ngựa: <b style={{ color: '#f97316' }}>{incident.horseName}</b> • {incident.checkpointName}
            </p>
          </div>
          <button className="cbn-modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="cbn-modal-body">
          {successMessage ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
              <h4 style={{ color: '#4ade80', margin: '0 0 8px 0', fontSize: '16px' }}>Xác nhận thành công</h4>
              <p style={{ color: '#cbd5e1', fontSize: '13px', margin: 0 }}>{successMessage}</p>
            </div>
          ) : (
            <>
              {/* Alert Banner */}
              <div className="incident-alert-banner">
                <div className="incident-alert-icon">!</div>
                <div className="incident-alert-text">
                  <h4>{incident.title}</h4>
                  <p>{incident.description}</p>
                </div>
              </div>

              {/* Symptoms */}
              <div className="incident-symptoms-card">
                <div className="incident-symptoms-title">Ghi nhận lâm sàng từ Bác sĩ thú y kiểm dịch:</div>
                <ul className="incident-symptoms-list">
                  {incident.symptoms.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              {/* Action Options */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13.5px', color: '#f8fafc', fontWeight: 600 }}>
                  Khách hàng lựa chọn phương án xử lý (Flow 5):
                </h4>
                <div className="incident-options-group">
                  <label
                    className={`incident-option-item ${selectedOption === 'quarantine_24h' ? 'selected' : ''}`}
                    onClick={() => setSelectedOption('quarantine_24h')}
                  >
                    <input
                      type="radio"
                      name="incident-action"
                      checked={selectedOption === 'quarantine_24h'}
                      onChange={() => setSelectedOption('quarantine_24h')}
                      className="incident-radio"
                    />
                    <div className="incident-option-content">
                      <div className="incident-option-header">
                        <span>Đồng ý lưu trú kiểm dịch 24 giờ &amp; hỗ trợ thú y đặc biệt</span>
                        <span className="incident-option-fee">+$120 USD</span>
                      </div>
                      <span className="incident-option-desc">
                        Ngựa được chuyển vào khu cách ly tiện nghi tại Mộc Bài, được hạ sốt và bác sĩ thú y tái kiểm tra sau 24h để tiếp tục hành trình sang Campuchia.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`incident-option-item ${selectedOption === 'return_stable' ? 'selected' : ''}`}
                    onClick={() => setSelectedOption('return_stable')}
                  >
                    <input
                      type="radio"
                      name="incident-action"
                      checked={selectedOption === 'return_stable'}
                      onChange={() => setSelectedOption('return_stable')}
                      className="incident-radio"
                    />
                    <div className="incident-option-content">
                      <div className="incident-option-header">
                        <span>Hủy hành trình &amp; đưa ngựa về cơ sở nuôi xuất phát</span>
                        <span className="incident-option-fee">Phí hoàn chuyến theo hợp đồng</span>
                      </div>
                      <span className="incident-option-desc">
                        Xe vận chuyển chuyên dụng sẽ quay đầu đưa ngựa về lại trại nuôi TP.HCM an toàn trong ngày.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`incident-option-item ${selectedOption === 'contact_coordinator' ? 'selected' : ''}`}
                    onClick={() => setSelectedOption('contact_coordinator')}
                  >
                    <input
                      type="radio"
                      name="incident-action"
                      checked={selectedOption === 'contact_coordinator'}
                      onChange={() => setSelectedOption('contact_coordinator')}
                      className="incident-radio"
                    />
                    <div className="incident-option-content">
                      <div className="incident-option-header">
                        <span>Yêu cầu cuộc gọi khẩn cấp từ Quản lý CBN Transport</span>
                        <span className="incident-option-fee" style={{ color: '#38bdf8' }}>Miễn phí hỗ trợ</span>
                      </div>
                      <span className="incident-option-desc">
                        Điều phối viên và bác sĩ trưởng kíp sẽ gọi điện trực tiếp để giải trình chi tiết tình trạng ngựa.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!successMessage && (
          <div className="cbn-modal-footer">
            <button className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Đóng
            </button>
            <button className="btn-primary-orange" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi...' : 'Xác nhận phương án xử lý'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidentModal;
