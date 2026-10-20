import React from 'react';
import { TripStatusBadge, ContractStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import type { HistoryRequestItem } from '../../types';
import './HistoryDetailModal.css';

interface HistoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: HistoryRequestItem | null;
}

export const HistoryDetailModal: React.FC<HistoryDetailModalProps> = ({
  isOpen,
  onClose,
  request
}) => {
  if (!isOpen || !request) return null;

  const getDetailedNotes = (id: string) => {
    switch (id) {
      case 'TRN-8750':
        return {
          title: 'Đã đóng – Hợp đồng đã hoàn thành',
          summary: 'Mẫu yêu cầu đã giao, thanh toán đủ và hết 24 giờ phản hồi; hợp đồng không còn hiệu lực, chỉ xem.',
          timeline: [
            { time: '1/8/2026 09:30', title: 'Tạo yêu cầu vận chuyển', desc: 'Chủ ngựa Alex Equine tạo yêu cầu tuyến London → Dubai cho ngựa Bella.' },
            { time: '3/8/2026 14:00', title: 'Hợp đồng được ký & thanh toán cọc', desc: 'Đã hoàn tất thanh toán cọc 30% qua cổng giao dịch.' },
            { time: '10/8/2026 06:00', title: 'Khởi hành chuyến bay chuyên dụng', desc: 'Ngựa Bella được vận chuyển bằng chuyên cơ đạt chuẩn quốc tế IATA LAR.' },
            { time: '15/8/2026 16:30', title: 'Giao ngựa thành công tại Dubai', desc: 'Biên bản bàn giao đã được ký xác nhận bởi người nhận.' },
            { time: '17/8/2026 17:00', title: 'Hết 24h phản hồi – Hợp đồng hoàn tất', desc: 'Thanh toán đợt cuối đã được xác minh. Hợp đồng chính thức hết hiệu lực và chuyển vào lưu trữ lịch sử.' }
          ]
        };
      case 'TRN-8943':
        return {
          title: 'Đã hủy trước khi ký – Đã hoàn tiền cọc',
          summary: 'Đăng nhập Logistics Manager để bắt đầu xử lý hoàn tiền rồi ghi nhận đã hoàn tiền kèm mã giao dịch.',
          timeline: [
            { time: '29/9/2026 10:15', title: 'Tạo yêu cầu vận chuyển', desc: 'Yêu cầu vận chuyển ngựa Thunderbolt tuyến Da Nang → Tokyo.' },
            { time: '30/9/2026 09:00', title: 'Khách hàng gửi yêu cầu hủy', desc: 'Khách hàng thông báo thay đổi lịch thi đấu quốc tế.' },
            { time: '30/9/2026 11:30', title: 'Logistics Manager duyệt hoàn tiền', desc: 'Xác nhận hoàn trả 100% tiền đặt cọc vào thẻ tín dụng của khách hàng.' },
            { time: '1/10/2026 14:00', title: 'Giao dịch hoàn tiền hoàn tất', desc: 'Mã tham chiếu ngân hàng: REF-8943-SANDBOX-SUCCESS.' }
          ]
        };
      case 'TRN-8602':
        return {
          title: 'Đã hủy – Chưa ký hợp đồng',
          summary: 'Yêu cầu bị hủy, chưa có hợp đồng.',
          timeline: [
            { time: '28/6/2026 08:30', title: 'Tạo yêu cầu vận chuyển', desc: 'Tuyến nội địa HCMC → Hanoi cho ngựa Thunderbolt.' },
            { time: '29/6/2026 15:00', title: 'Yêu cầu bị hủy', desc: 'Chủ ngựa chủ động hủy yêu cầu trước khi phê duyệt phương án xe.' }
          ]
        };
      case 'TRN-8511':
        return {
          title: 'Bị từ chối bởi Quản lý',
          summary: 'Manager từ chối kèm lý do.',
          timeline: [
            { time: '22/5/2026 11:00', title: 'Tạo yêu cầu vận chuyển', desc: 'Tuyến quốc tế Bangkok → HCMC cho ngựa Apollo.' },
            { time: '23/5/2026 09:45', title: 'Quản lý từ chối yêu cầu', desc: 'Lý do: Không đủ đội xe kiểm soát nhiệt độ chuyên dụng khả dụng trong khung ngày yêu cầu 5/6/2026. Khuyến nghị dời lịch sang tháng sau.' }
          ]
        };
      default:
        return {
          title: request.statusText,
          summary: 'Bản ghi lịch sử vận chuyển đã lưu trữ.',
          timeline: [
            { time: request.requestedDate, title: 'Ngày tạo yêu cầu', desc: `Tuyến ${request.origin} → ${request.destination}` }
          ]
        };
    }
  };

  const details = getDetailedNotes(request.id);

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="history-modal-header">
          <div className="history-modal-header-info">
            <span className="history-modal-id">{request.id}</span>
            <span className="history-modal-divider">•</span>
            <TripStatusBadge status={request.statusKey} label={request.statusText} />
          </div>
          <button className="history-modal-close-btn" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="history-modal-body">
          {/* Summary Box */}
          <div className={`history-modal-summary-banner ${request.statusKey === 'rejected' ? 'rejected' : ''}`}>
            <h3 className="history-modal-banner-title">{details.title}</h3>
            <p className="history-modal-banner-desc">{details.summary}</p>
          </div>

          {/* Key Info Grid */}
          <div className="history-modal-info-grid">
            <div className="history-info-card">
              <span className="history-info-label">TUYẾN ĐƯỜNG</span>
              <span className="history-info-val bold">
                {request.origin} → {request.destination}
              </span>
            </div>
            <div className="history-info-card">
              <span className="history-info-label">NGỰA VẬN CHUYỂN</span>
              <span className="history-info-val bold">{request.horse}</span>
            </div>
            <div className="history-info-card">
              <span className="history-info-label">NGÀY YÊU CẦU</span>
              <span className="history-info-val">{request.requestedDate}</span>
            </div>
            <div className="history-info-card">
              <span className="history-info-label">NGÀY MONG MUỐN</span>
              <span className="history-info-val">{request.expectedDate}</span>
            </div>
            <div className="history-info-card">
              <span className="history-info-label">TÌNH TRẠNG HỢP ĐỒNG</span>
              <div className="history-info-val">
                <ContractStatusBadge
                  status={request.contractStatusKey}
                  text={request.contractStatusText}
                />
              </div>
            </div>
            <div className="history-info-card">
              <span className="history-info-label">CHẾ ĐỘ TRUY CẬP</span>
              <span className="history-info-val text-muted">Chỉ xem (Lưu trữ)</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="history-timeline-section">
            <h4 className="history-timeline-heading">Nhật ký tiến trình</h4>
            <div className="history-timeline-list">
              {details.timeline.map((step, idx) => (
                <div key={idx} className="history-timeline-item">
                  <div className="history-timeline-bullet" />
                  <div className="history-timeline-content">
                    <div className="history-timeline-meta">
                      <span className="history-timeline-title">{step.title}</span>
                      <span className="history-timeline-time">{step.time}</span>
                    </div>
                    <p className="history-timeline-desc">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="history-modal-footer">
          <span className="history-modal-footer-hint">
            Hợp đồng đã kết thúc hoặc bị hủy, không thể chỉnh sửa thông tin.
          </span>
          <button className="history-modal-btn-close" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryDetailModal;
