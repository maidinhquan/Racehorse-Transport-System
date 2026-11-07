import React, { useEffect, useState } from 'react';
import customerApi from '../../api/customerApi';
import { fmtDateTime } from '../../hooks/customerRules';
import type { CustomerPickupProposal } from '../../../coordinator/types/flow3.types';

interface CustomerRelocationCardProps {
  tripId: string;
  onDecided?: () => void;
}

export const CustomerRelocationCard: React.FC<CustomerRelocationCardProps> = ({ tripId, onDecided }) => {
  const [proposal, setProposal] = useState<CustomerPickupProposal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProposal = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await customerApi.getPickupRelocation(tripId);
      if (data && (data.relocationId || data.data?.relocationId)) {
        setProposal(data.data ?? data);
      } else {
        setProposal(null);
      }
    } catch {
      // If 404 or no active proposal, simply don't show the card
      setProposal(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProposal();
  }, [tripId]);

  if (loading || !proposal) return null;

  const handleAccept = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await customerApi.decidePickupRelocation(tripId, {
        relocationId: proposal.relocationId,
        proposalVersion: proposal.proposalVersion || 1,
        decision: 'ACCEPT',
        note: 'Khách hàng đồng ý chuyển điểm đón ngựa theo đề xuất',
        acknowledged: true,
      });
      await fetchProposal();
      onDecided?.();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi xác nhận.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (rejectReason.trim().length < 5) {
      setError('Vui lòng nhập lý do từ chối (tối thiểu 5 ký tự).');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await customerApi.decidePickupRelocation(tripId, {
        relocationId: proposal.relocationId,
        proposalVersion: proposal.proposalVersion || 1,
        decision: 'REJECT',
        note: rejectReason.trim(),
        acknowledged: true,
      });
      setRejecting(false);
      await fetchProposal();
      onDecided?.();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi gửi phản hồi.');
    } finally {
      setSubmitting(false);
    }
  };

  const isAwaiting = proposal.status === 'AWAITING_CUSTOMER';

  return (
    <div
      style={{
        margin: '16px 0',
        padding: '18px 20px',
        borderRadius: 12,
        background: isAwaiting ? '#fffbeb' : proposal.status === 'CUSTOMER_CONFIRMED' ? '#f0fdf4' : '#fef2f2',
        border: `1.5px solid ${isAwaiting ? '#f59e0b' : proposal.status === 'CUSTOMER_CONFIRMED' ? '#22c55e' : '#ef4444'}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1f2937' }}>
          📍 Đề xuất đổi điểm đón ngựa (Phiên bản {proposal.proposalVersion || 1})
        </h4>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 9999,
            backgroundColor: isAwaiting ? '#fbbf24' : proposal.status === 'CUSTOMER_CONFIRMED' ? '#86efac' : '#fca5a5',
            color: '#1f2937',
          }}
        >
          {isAwaiting ? 'Chờ bạn xác nhận' : proposal.status === 'CUSTOMER_CONFIRMED' ? 'Đã chấp thuận' : 'Đã từ chối'}
        </span>
      </div>

      <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 14 }}>
        <div>
          <b>Điểm đón đề xuất mới:</b> {proposal.proposedPickup?.name || 'Điểm tập kết thay thế'}
        </div>
        {proposal.proposedPickup?.address && (
          <div style={{ color: '#4b5563' }}>Địa chỉ: {proposal.proposedPickup.address}</div>
        )}
        <div style={{ marginTop: 6 }}>
          <b>Lý do điều phối:</b> {proposal.reason}
        </div>
        {proposal.scheduleImpact && (
          <div style={{ marginTop: 4 }}>
            <b>Thời gian bàn giao dự kiến:</b> {fmtDateTime(proposal.handoverAt)} ({proposal.scheduleImpact})
          </div>
        )}
        {proposal.customerResponsibilities && (
          <div style={{ marginTop: 4, color: '#92400e', background: '#fef3c7', padding: '6px 10px', borderRadius: 6 }}>
            <b>Lưu ý dành cho khách hàng:</b> {proposal.customerResponsibilities}
          </div>
        )}
      </div>

      {proposal.customerReply && (
        <div style={{ fontSize: 13, color: '#4b5563', padding: '8px 12px', background: '#f3f4f6', borderRadius: 8, marginBottom: 12 }}>
          <b>Phản hồi của bạn:</b> {proposal.customerReply.decision === 'ACCEPT' ? 'Đã đồng ý' : 'Đã từ chối'}
          {proposal.customerReply.note ? ` — "${proposal.customerReply.note}"` : ''} ({proposal.customerReply.at})
        </div>
      )}

      {error && (
        <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 10, fontWeight: 500 }}>
          ⚠️ {error}
        </div>
      )}

      {isAwaiting && (
        <div>
          {!rejecting ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                disabled={submitting}
                onClick={handleAccept}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#059669',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {submitting ? 'Đang gửi...' : '✓ Đồng ý điểm đón mới'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setRejecting(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#f3f4f6',
                  color: '#dc2626',
                  border: '1px solid #d1d5db',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Từ chối đề xuất
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Lý do từ chối (bắt buộc, tối thiểu 5 ký tự):
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="VD: Khoảng cách quá xa, trang trại không có phương tiện đưa ngựa đến điểm tập kết..."
                rows={3}
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 13,
                  marginBottom: 8,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleReject}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {submitting ? 'Đang gửi...' : 'Gửi từ chối'}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => { setRejecting(false); setError(null); }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                    border: 'none',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerRelocationCard;
