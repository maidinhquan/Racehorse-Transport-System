import React, { useState } from 'react';
import type { ManagerTripItem } from '../../types';
import './TripDetailModal.css';

interface TripDetailModalProps {
  trip: ManagerTripItem;
  onClose: () => void;
  onConfirmDeployment: (tripId: string) => void;
}

export const TripDetailModal: React.FC<TripDetailModalProps> = ({
  trip,
  onClose,
  onConfirmDeployment,
}) => {
  const [currentStage, setCurrentStage] = useState<number>(() => {
    if (trip.deploymentStatus === 'PENDING') return 1;
    if (trip.routeApprovalStatus !== 'APPROVED') return 2;
    if (trip.resourceStatus !== '—') return 3;
    if (trip.tripStatus === 'Sẵn sàng khởi hành') return 4;
    return 5;
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const stages = [
    { id: 1, label: '1. Xác nhận triển khai' },
    { id: 2, label: '2. Duyệt tuyến đường' },
    { id: 3, label: '3. Phân bổ nguồn lực' },
    { id: 4, label: '4. Duyệt khởi hành' },
    { id: 5, label: '5. Vận chuyển & Checkpoint' },
    { id: 6, label: '6. Bàn giao & Đóng đơn' },
  ];

  return (
    <div className="trip-modal-overlay" onClick={onClose}>
      <div className="trip-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="trip-modal-header">
          <div>
            <h3 className="trip-modal-title">
              Điều hành chuyến {trip.id} ({trip.requestId})
            </h3>
            <div className="trip-modal-sub">
              {trip.customerName} • {trip.route} • {trip.transportMode}
            </div>
          </div>
          <button type="button" className="trip-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="trip-modal-body">
          {toastMsg && (
            <div className="trip-modal-toast">
              <span>{toastMsg}</span>
            </div>
          )}

          {/* Timeline Navigation */}
          <div className="trip-timeline-nav">
            {stages.map((st) => (
              <button
                key={st.id}
                type="button"
                className={`trip-timeline-step-btn ${
                  currentStage === st.id ? 'active' : currentStage > st.id ? 'done' : ''
                }`}
                onClick={() => setCurrentStage(st.id)}
              >
                {currentStage > st.id ? '✓ ' : ''}{st.label}
              </button>
            ))}
          </div>

          {/* Stage Content */}
          <div className="trip-stage-content-box">
            {currentStage === 1 && (
              <div>
                <div className="stage-title">Giai đoạn 1: Xác nhận triển khai chuyến</div>
                <p className="stage-desc">
                  Sau khi hợp đồng được kích hoạt và cọc được xác minh, chuyến được tạo ở trạng thái Chờ triển khai. Quản lý cần bấm "Xác nhận triển khai" để bắt đầu lập kế hoạch tuyến và điều phối tài nguyên.
                </p>
                <div className="trip-overview-grid">
                  <div className="trip-stat-field">
                    <span className="field-label">Trạng thái triển khai</span>
                    <span className="field-val" style={{ color: trip.deploymentStatus === 'CONFIRMED' ? '#22c55e' : '#ea580c' }}>
                      {trip.deploymentStatus === 'CONFIRMED' ? 'Đã xác nhận triển khai' : 'Chờ triển khai'}
                    </span>
                  </div>
                  <div className="trip-stat-field">
                    <span className="field-label">Khởi hành dự kiến</span>
                    <span className="field-val">{trip.departureTime}</span>
                  </div>
                  <div className="trip-stat-field">
                    <span className="field-label">Thời gian đến dự kiến</span>
                    <span className="field-val">{trip.eta}</span>
                  </div>
                  <div className="trip-stat-field">
                    <span className="field-label">Số lượng ngựa</span>
                    <span className="field-val">{trip.horsesCount} con</span>
                  </div>
                </div>

                {trip.deploymentStatus === 'PENDING' ? (
                  <button
                    type="button"
                    className="btn-primary-orange"
                    style={{ marginTop: '16px' }}
                    onClick={() => {
                      onConfirmDeployment(trip.id);
                      setToastMsg(`✓ Đã xác nhận triển khai chuyến ${trip.id}! Chuyển sang duyệt tuyến.`);
                      setCurrentStage(2);
                    }}
                  >
                    Xác nhận triển khai chuyến này
                  </button>
                ) : (
                  <div className="stage-status-done">
                    ✓ Chuyến đã được xác nhận triển khai thành công.
                  </div>
                )}
              </div>
            )}

            {currentStage === 2 && (
              <div>
                <div className="stage-title">Giai đoạn 2: Phê duyệt tuyến đường & Lịch trình</div>
                <p className="stage-desc">
                  Kiểm tra các trạm dừng nghỉ ngơi cho ngựa, trạm kiểm dịch và lịch trình bay/xe.
                </p>
                <div className="trip-overview-grid">
                  <div className="trip-stat-field">
                    <span className="field-label">Trạng thái tuyến</span>
                    <span className="field-val" style={{ color: '#22c55e' }}>{trip.routeApprovalLabel}</span>
                  </div>
                  <div className="trip-stat-field">
                    <span className="field-label">Lộ trình được chọn</span>
                    <span className="field-val">{trip.route}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary-orange"
                  style={{ marginTop: '16px' }}
                  onClick={() => {
                    setToastMsg(`✓ Đã phê duyệt phương án tuyến đường cho ${trip.id}.`);
                    setCurrentStage(3);
                  }}
                >
                  Phê duyệt tuyến đường chính thức
                </button>
              </div>
            )}

            {currentStage === 3 && (
              <div>
                <div className="stage-title">Giai đoạn 3: Phân bổ nguồn lực & Nhân sự</div>
                <p className="stage-desc">
                  Phân bổ tài xế chuyên dụng, bác sĩ thú y áp tải và phương tiện chuyên dụng có điều hòa nhiệt độ.
                </p>
                <div className="trip-overview-grid">
                  <div className="trip-stat-field">
                    <span className="field-label">Phương tiện</span>
                    <span className="field-val">Xe chuyên dụng 29C-982.11 (Euro 6)</span>
                  </div>
                  <div className="trip-stat-field">
                    <span className="field-label">Tài xế / Cơ trưởng</span>
                    <span className="field-val">Capt. Somchai / Nguyễn Văn Nam</span>
                  </div>
                  <div className="trip-stat-field">
                    <span className="field-label">Bác sĩ thú y áp tải</span>
                    <span className="field-val">Dr. Lê Văn Bác (Chứng chỉ Equine Cert)</span>
                  </div>
                  <div className="trip-stat-field">
                    <span className="field-label">Tình trạng việc mở</span>
                    <span className="field-val" style={{ color: '#d97706' }}>{trip.resourceStatus}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary-orange"
                  style={{ marginTop: '16px' }}
                  onClick={() => {
                    setToastMsg(`✓ Đã phân bổ đầy đủ nguồn lực cho chuyến ${trip.id}.`);
                    setCurrentStage(4);
                  }}
                >
                  Xác nhận phân bổ nguồn lực
                </button>
              </div>
            )}

            {currentStage >= 4 && (
              <div>
                <div className="stage-title">
                  {currentStage === 4 ? 'Giai đoạn 4: Phê duyệt lệnh khởi hành' : currentStage === 5 ? 'Giai đoạn 5: Vận chuyển & Checkpoint' : 'Giai đoạn 6: Bàn giao'}
                </div>
                <p className="stage-desc">
                  Giám sát thời gian thực lộ trình, nhiệt độ khoang xe, nhịp tim và sinh hiệu ngựa qua cảm biến IoT.
                </p>
                <div className="stage-status-done">
                  Đang đồng bộ dữ liệu viễn thông từ trạm kiểm soát GPS...
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="trip-modal-actions">
          <button type="button" className="btn-secondary-dark" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default TripDetailModal;
