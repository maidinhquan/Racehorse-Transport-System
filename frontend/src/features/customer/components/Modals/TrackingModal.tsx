import React from 'react';
import type { CurrentTrip } from '../../types';
import TripStatusBadge from '../TripStatusBadge/TripStatusBadge';
import './Modals.css';

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: CurrentTrip;
}

export const TrackingModal: React.FC<TrackingModalProps> = ({ isOpen, onClose, trip }) => {
  if (!isOpen) return null;

  return (
    <div className="cbn-modal-backdrop" onClick={onClose}>
      <div className="cbn-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cbn-modal-header">
          <div className="cbn-modal-title-box">
            <h3 className="cbn-modal-title">
              <span>Hành trình &amp; Trạm kiểm dịch</span>
              <TripStatusBadge status={trip.status} label={trip.statusText} />
            </h3>
            <p className="cbn-modal-subtitle">
              Mã yêu cầu: <b style={{ color: '#f8fafc' }}>{trip.requestId}</b> • Ngựa: <b style={{ color: '#f97316' }}>{trip.horse}</b>
            </p>
          </div>
          <button className="cbn-modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="cbn-modal-body">
          {/* Overview Grid */}
          <div className="trip-overview-grid">
            <div className="overview-item">
              <span className="overview-label">Tuyến đường</span>
              <span className="overview-val">{trip.origin} → {trip.destination}</span>
            </div>
            <div className="overview-item">
              <span className="overview-label">Tiến độ vận chuyển</span>
              <span className="overview-val highlight">{trip.progress}% hoàn thành</span>
            </div>
            <div className="overview-item">
              <span className="overview-label">Thời gian xuất phát</span>
              <span className="overview-val">{trip.departedDate}</span>
            </div>
            <div className="overview-item">
              <span className="overview-label">Dự kiến đến đích</span>
              <span className="overview-val highlight">{trip.eta}</span>
            </div>
          </div>

          {/* Telemetry info */}
          {trip.telemetry && (
            <div className="telemetry-row">
              <div className="telemetry-card">
                <span className="telemetry-icon">🌡️</span>
                <div className="telemetry-info">
                  <span className="telemetry-label">Thân nhiệt ngựa</span>
                  <span className="telemetry-value">{trip.telemetry.temperature}</span>
                </div>
              </div>
              <div className="telemetry-card">
                <span className="telemetry-icon">💓</span>
                <div className="telemetry-info">
                  <span className="telemetry-label">Nhịp tim</span>
                  <span className="telemetry-value">{trip.telemetry.heartRate}</span>
                </div>
              </div>
              <div className="telemetry-card">
                <span className="telemetry-icon">💧</span>
                <div className="telemetry-info">
                  <span className="telemetry-label">Tiêu thụ nước</span>
                  <span className="telemetry-value">{trip.telemetry.waterIntake}</span>
                </div>
              </div>
            </div>
          )}

          {/* Checkpoints Stepper */}
          <div>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#f8fafc', fontWeight: 600 }}>
              Lộ trình &amp; Nhật ký trạm kiểm dịch
            </h4>
            <div className="checkpoint-timeline">
              {trip.checkpoints?.map((cp) => (
                <div key={cp.id} className={`timeline-step ${cp.status}`}>
                  <div className="timeline-dot">
                    {cp.status === 'completed' ? '✓' : cp.status === 'current' ? '●' : '○'}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-step-header">
                      <span className="timeline-step-title">{cp.name}</span>
                      <span className="timeline-step-time">
                        {cp.time ? `Đã xác nhận: ${cp.time}` : cp.expectedTime ? `Dự kiến: ${cp.expectedTime}` : ''}
                      </span>
                    </div>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>📍 {cp.location}</span>
                    {cp.description && <p className="timeline-step-desc">{cp.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="cbn-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrackingModal;
