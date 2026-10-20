import React, { useState, useEffect } from 'react';
import type { CustomerHorse } from '../../types';
import '../../components/Modals/Modals.css';

interface HorseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'view' | 'add' | 'edit';
  horse?: CustomerHorse | null;
  onSave: (horseData: CustomerHorse) => void;
}

export const HorseModal: React.FC<HorseModalProps> = ({
  isOpen,
  onClose,
  mode,
  horse,
  onSave,
}) => {
  const [formData, setFormData] = useState<CustomerHorse>({
    id: `HOR-${Math.floor(1000 + Math.random() * 9000)}`,
    name: '',
    breed: 'Thoroughbred',
    gender: 'Đực',
    age: 5,
    microchip: '',
    submissionStatus: 'submitted',
    submissionBadgeText: 'Đã nộp',
    profileStatus: 'Đã nộp',
    passportScanStatus: 'Đã nộp',
    medicalRecordStatus: 'Đã nộp',
    usageCount: 0,
    imageUrl: '',
  });

  useEffect(() => {
    if (horse && (mode === 'edit' || mode === 'view')) {
      setFormData(horse);
    } else if (mode === 'add') {
      setFormData({
        id: `HOR-${Math.floor(1000 + Math.random() * 9000)}`,
        name: '',
        breed: 'Thoroughbred',
        gender: 'Đực',
        age: 5,
        microchip: '',
        submissionStatus: 'submitted',
        submissionBadgeText: 'Đã nộp',
        profileStatus: 'Đã nộp',
        passportScanStatus: 'Đã nộp',
        medicalRecordStatus: 'Đã nộp',
        usageCount: 0,
        imageUrl: '',
      });
    }
  }, [horse, mode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave({
      ...formData,
      microchip: formData.microchip.trim() || 'Chưa cung cấp',
    });
    onClose();
  };

  return (
    <div className="cbn-modal-backdrop" onClick={onClose}>
      <div className="cbn-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cbn-modal-header">
          <div className="cbn-modal-title-box">
            <h3 className="cbn-modal-title">
              <span>
                {mode === 'add'
                  ? 'Thêm hồ sơ ngựa mới'
                  : mode === 'edit'
                  ? `Chỉnh sửa hồ sơ • ${formData.name}`
                  : `Hồ sơ chi tiết • ${formData.name}`}
              </span>
            </h3>
            <p className="cbn-modal-subtitle">
              Mã ngựa: <b>{formData.id}</b>
            </p>
          </div>
          <button className="cbn-modal-close-btn" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        {/* Body */}
        {mode === 'view' ? (
          <div className="cbn-modal-body">
            <div className="trip-overview-grid">
              <div className="overview-item">
                <span className="overview-label">Tên ngựa</span>
                <span className="overview-val">{formData.name}</span>
              </div>
              <div className="overview-item">
                <span className="overview-label">Giống loài</span>
                <span className="overview-val">{formData.breed}</span>
              </div>
              <div className="overview-item">
                <span className="overview-label">Giới tính &amp; Tuổi</span>
                <span className="overview-val">{formData.gender} • {formData.age} tuổi</span>
              </div>
              <div className="overview-item">
                <span className="overview-label">Số vi mạch ISO</span>
                <span className="overview-val highlight">{formData.microchip}</span>
              </div>
            </div>

            <div className="incident-symptoms-card">
              <div className="incident-symptoms-title">Hồ sơ pháp lý &amp; Thú y:</div>
              <ul className="incident-symptoms-list">
                <li>Hồ sơ nhận dạng đăng ký: <b>{formData.profileStatus}</b></li>
                <li>Bản quét hộ chiếu FEI / Quốc gia: <b>{formData.passportScanStatus}</b></li>
                <li>Giấy chứng nhận tiêm phòng thú y: <b>{formData.medicalRecordStatus}</b></li>
                <li>Lịch sử vận chuyển: <b>Đã dùng trong {formData.usageCount} chuyến đi</b></li>
                {formData.latestRoute && (
                  <li>Tuyến đường gần nhất: <b style={{ color: '#ea580c' }}>{formData.latestRoute}</b></li>
                )}
              </ul>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="cbn-modal-body" style={{ gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Tên ngựa *
                </label>
                <input
                  type="text"
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#191c22',
                    border: '1px solid #282c36',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#f8fafc',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                  placeholder="Ví dụ: Thunderbolt"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                    Giống loài
                  </label>
                  <select
                    style={{
                      width: '100%',
                      backgroundColor: '#191c22',
                      border: '1px solid #282c36',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#f8fafc',
                      fontSize: '13.5px',
                      outline: 'none',
                    }}
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                  >
                    <option value="Thoroughbred">Thoroughbred</option>
                    <option value="Arabian">Arabian</option>
                    <option value="Warmblood">Warmblood</option>
                    <option value="Andalusian">Andalusian</option>
                    <option value="Quarter Horse">Quarter Horse</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                    Giới tính
                  </label>
                  <select
                    style={{
                      width: '100%',
                      backgroundColor: '#191c22',
                      border: '1px solid #282c36',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#f8fafc',
                      fontSize: '13.5px',
                      outline: 'none',
                    }}
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="Đực">Đực</option>
                    <option value="Ngựa cái">Ngựa cái</option>
                    <option value="Ngựa thiến">Ngựa thiến</option>
                    <option value="Ngựa đực giống">Ngựa đực giống</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                    Tuổi
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    style={{
                      width: '100%',
                      backgroundColor: '#191c22',
                      border: '1px solid #282c36',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#f8fafc',
                      fontSize: '13.5px',
                      outline: 'none',
                    }}
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                    Số vi mạch ISO (15 chữ số)
                  </label>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      backgroundColor: '#191c22',
                      border: '1px solid #282c36',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#f8fafc',
                      fontSize: '13.5px',
                      outline: 'none',
                    }}
                    placeholder="985112004571xxx"
                    value={formData.microchip}
                    onChange={(e) => setFormData({ ...formData, microchip: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="cbn-modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Hủy
              </button>
              <button type="submit" className="btn-primary-orange">
                {mode === 'add' ? 'Lưu hồ sơ' : 'Cập nhật'}
              </button>
            </div>
          </form>
        )}

        {mode === 'view' && (
          <div className="cbn-modal-footer">
            <button className="btn-secondary" onClick={onClose}>
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
