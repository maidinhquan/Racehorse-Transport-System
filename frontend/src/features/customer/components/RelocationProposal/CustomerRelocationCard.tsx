import React, { useEffect, useState } from 'react';
import customerApi from '../../api/customerApi';
import { fmtDateTime } from '../../hooks/customerRules';

interface CustomerRelocationCardProps {
  tripId: string;
  onDecided?: () => void;
}

export const CustomerRelocationCard: React.FC<CustomerRelocationCardProps> = ({ tripId, onDecided }) => {
  const [accessData, setAccessData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [rejecting, setRejecting] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await customerApi.getPickupAccessStatus(tripId);
      const data = res?.data ?? res;
      if (data && data.pickupAccessStatus && data.pickupAccessStatus !== 'NORMAL') {
        setAccessData(data);
      } else {
        setAccessData(null);
      }
    } catch {
      // 404 hoặc không có sự cố điểm đón
      setAccessData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStatus();
  }, [tripId]);

  if (loading || !accessData) return null;

  const isRelocating = accessData.pickupAccessStatus === 'RELOCATING';
  const isShuttling = accessData.pickupAccessStatus === 'SHUTTLING';
  const isBlocked = accessData.pickupAccessStatus === 'BLOCKED';
  const approvalStatus = accessData.customerApprovalStatus; // 'PENDING' | 'APPROVED' | 'REJECTED'

  // Nếu trạng thái BLOCKED nhưng Điều phối chưa lập phương án
  if (isBlocked && !isRelocating && !isShuttling) {
    return (
      <div
        style={{
          margin: '16px 0',
          padding: '16px 18px',
          borderRadius: '10px',
          background: 'var(--bg-elevated, #fef2f2)',
          border: '1px solid #fca5a5',
          color: 'var(--text-primary, #0f172a)',
        }}
      >
        <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '4px', fontSize: '14px' }}>
          Thông báo từ hiện trường: Xe lớn chưa thể tiếp cận điểm lấy ngựa
        </div>
        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary, #475569)' }}>
          Tài xế đã đến gần trang trại nhưng đường vào bị giới hạn kích thước xe hoặc địa hình hẹp. Điều phối viên đang khảo sát bản đồ để đề xuất điểm hẹn tập kết mới hoặc điều xe trung chuyển phù hợp cho bạn.
        </p>
      </div>
    );
  }

  // Khách hàng bấm Phê duyệt phương án
  const handleApprove = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await customerApi.decidePickupAccess(tripId, {
        decision: 'APPROVED',
      });
      await fetchStatus();
      onDecided?.();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi xác nhận phê duyệt.');
    } finally {
      setSubmitting(false);
    }
  };

  // Khách hàng bấm Từ chối phương án
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Vui lòng nhập lý do từ chối để Điều phối viên điều chỉnh phương án.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await customerApi.decidePickupAccess(tripId, {
        decision: 'REJECTED',
        rejectionReason: rejectReason.trim(),
      });
      setRejecting(false);
      setRejectReason('');
      await fetchStatus();
      onDecided?.();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi gửi phản hồi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        margin: '16px 0',
        padding: '18px 20px',
        borderRadius: '12px',
        background: approvalStatus === 'APPROVED' ? '#f0fdf4' : approvalStatus === 'REJECTED' ? '#fef2f2' : 'var(--bg-surface, #ffffff)',
        border: `1.5px solid ${approvalStatus === 'APPROVED' ? '#22c55e' : approvalStatus === 'REJECTED' ? '#ef4444' : 'var(--accent-primary, #f57c00)'}`,
        boxShadow: 'var(--card-shadow, 0 4px 6px -1px rgba(0, 0, 0, 0.05))',
        color: 'var(--text-primary, #0f172a)',
      }}
    >
      {/* Tiêu đề thông báo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
            {isRelocating
              ? 'Đề xuất đổi điểm đón: Dắt bộ ra điểm hẹn mới'
              : 'Đề xuất phương án: Điều xe nhỏ trung chuyển đón ngựa'}
          </h4>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
            Mã chuyến: <b>{tripId}</b>
          </span>
        </div>

        <div>
          {approvalStatus === 'PENDING' && (
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '3px 10px', borderRadius: '4px' }}>
              Chờ bạn phản hồi
            </span>
          )}
          {approvalStatus === 'APPROVED' && (
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '3px 10px', borderRadius: '4px' }}>
              Đã chấp thuận
            </span>
          )}
          {approvalStatus === 'REJECTED' && (
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '3px 10px', borderRadius: '4px' }}>
              Đã từ chối phương án
            </span>
          )}
        </div>
      </div>

      {/* Chi tiết nội dung đề xuất */}
      {isRelocating && (
        <div style={{ fontSize: '13px', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary, #475569)' }}>
            Do lối vào trang trại bị giới hạn kích thước, xe tải chuyên dụng đang dừng chờ ở đường lớn bên ngoài. Điều phối viên đề xuất dắt bộ ngựa ra điểm tập kết gần nhất:
          </p>

          <div style={{ background: 'var(--bg-elevated, #f8fafc)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
            <div>
              <span style={{ color: 'var(--text-secondary, #475569)' }}>Điểm hẹn đón ngựa mới: </span>
              <b>{accessData.relocationMeetingPointName || 'Bãi tập kết ngã ba'}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary, #475569)' }}>Quãng đường đi bộ: </span>
              <b>{accessData.relocationDistanceMeters ?? 320} mét</b> (trong bán kính an toàn &lt; 500m)
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary, #475569)' }}>Chi phí phát sinh: </span>
              <b style={{ color: '#16a34a' }}>0 VNĐ (CBN Transport hỗ trợ miễn phí)</b>
            </div>
          </div>
        </div>
      )}

      {isShuttling && (
        <div style={{ fontSize: '13px', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary, #475569)' }}>
            Do khoảng cách từ điểm xe tải lớn dừng tới cổng trang trại là <b>{accessData.relocationDistanceMeters ?? 650}m</b> (&ge; 500m, không đảm bảo an toàn nếu dắt bộ), Điều phối viên đã bố trí xe thùng nhỏ 2 chỗ chuyên dụng để vào tận nơi đón ngựa và chuyển ra xe lớn:
          </p>

          <div style={{ background: 'var(--bg-elevated, #f8fafc)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
            <div>
              <span style={{ color: 'var(--text-secondary, #475569)' }}>Phương tiện trung chuyển: </span>
              <b>Xe thùng nhỏ 2 chỗ ({accessData.shuttleVehicleId || 'Xe trung chuyển CBN'})</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary, #475569)' }}>Tài xế phụ trách: </span>
              <b>{accessData.shuttleDriverId || 'Tài xế đội xe CBN'}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary, #475569)' }}>Phụ phí trung chuyển: </span>
              <b style={{ color: '#d97706', fontSize: '14px' }}>
                {(Number(accessData.shuttleCostVnd || 0)).toLocaleString('vi-VN')} VNĐ
              </b>
            </div>
          </div>
        </div>
      )}

      {/* Bằng chứng hình ảnh do tài xế cung cấp */}
      {(accessData.blockedImageUrl || accessData.relocationImageUrl) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '10px' }}>
          {accessData.blockedImageUrl && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '6px', padding: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '11px', color: '#9f1239', marginBottom: '4px' }}>
                Ảnh hiện trường không thể vào:
              </div>
              <img
                src={accessData.blockedImageUrl}
                alt="Ảnh hiện trường không thể vào"
                style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '4px' }}
              />
            </div>
          )}
          {accessData.relocationImageUrl && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '11px', color: '#166534', marginBottom: '4px' }}>
                Ảnh điểm hẹn đón đề xuất:
              </div>
              <img
                src={accessData.relocationImageUrl}
                alt="Ảnh điểm hẹn đón đề xuất"
                style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '4px' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Hiển thị kết quả nếu đã duyệt */}
      {approvalStatus === 'APPROVED' && (
        <div style={{ marginTop: '12px', fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>
          Bạn đã phê duyệt phương án lúc {fmtDateTime(accessData.customerApprovalAt || new Date().toISOString())}. Xe vận chuyển đã được mở khóa để tiếp tục hành trình đón ngựa.
        </div>
      )}

      {/* Hiển thị kết quả nếu từ chối */}
      {approvalStatus === 'REJECTED' && (
        <div style={{ marginTop: '12px', fontSize: '13px', color: '#dc2626' }}>
          Bạn đã từ chối phương án này. Điều phối viên đang liên hệ để trao đổi giải pháp thay thế.
        </div>
      )}

      {/* Ô nhập lý do từ chối nếu đang mở form từ chối */}
      {rejecting && approvalStatus === 'PENDING' && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>
            Lý do bạn không đồng ý phương án này:
          </label>
          <textarea
            rows={2}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="VD: Điểm hẹn quá xa chuồng ngựa, hoặc tôi không đồng ý mức phí trung chuyển..."
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--bg-input, #ffffff)',
              color: 'var(--text-primary, #0f172a)',
              fontSize: '13px',
            }}
          />
        </div>
      )}

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div style={{ marginTop: '10px', color: '#dc2626', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {/* Nút thao tác khi đang chờ duyệt (PENDING) */}
      {approvalStatus === 'PENDING' && (
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {rejecting ? (
            <>
              <button
                type="button"
                onClick={() => setRejecting(false)}
                disabled={submitting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  background: 'transparent',
                  color: 'var(--text-primary, #0f172a)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={submitting}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {submitting ? 'Đang gửi...' : 'Xác nhận từ chối'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setRejecting(true)}
                disabled={submitting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #fca5a5',
                  background: 'transparent',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Từ chối phương án
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={submitting}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isRelocating ? '#16a34a' : 'var(--accent-primary, #f57c00)',
                  color: '#ffffff',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {submitting
                  ? 'Đang xử lý...'
                  : isRelocating
                  ? 'Tôi đồng ý dắt ngựa ra điểm hẹn (Miễn phí)'
                  : 'Đồng ý chi phí & Điều xe trung chuyển'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
