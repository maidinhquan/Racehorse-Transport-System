import React, { useState } from 'react';
import type { SpecTrip } from '../../../types';
import { useSharedIncidents, updateSharedIncidentReview, type SharedIncident } from '../../../../../shared/utils/sharedIncidents';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import { fmtDateTime } from '../../../hooks/specialistRules';
import { apiClient } from '../../../../../shared/api/apiClient';
import { getUserFullName } from '../../../../../shared/utils/userNameResolver';
import './IncidentsTab.css';

const TYPE_LABELS: Record<string, string> = {
  VEHICLE_BREAKDOWN: 'Hỏng xe / Phương tiện',
  VEHICLE_RESOURCE: 'Hỏng xe / Tài nguyên xe',
  BORDER_DELAY: 'Chậm trễ tại cửa khẩu',
  BAD_WEATHER: 'Thời tiết xấu',
  TRAFFIC_ACCIDENT: 'Tai nạn giao thông',
  HORSE_HEALTH: 'Sức khỏe ngựa / Y tế khẩn cấp',
  CUSTOMS_HOLD: 'Hải quan tạm giữ',
  ROAD_CLOSURE: 'Cấm đường / Đóng tuyến',
  DELAY_AIR: 'Trễ chuyến bay',
  OTHER: 'Sự cố khác',
};

const SEVERITY_TONE: Record<string, 'ok' | 'warn' | 'bad'> = {
  LOW: 'ok',
  MEDIUM: 'warn',
  HIGH: 'bad',
  CRITICAL: 'bad',
};

const SEVERITY_LABELS: Record<string, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  CRITICAL: 'Nghiêm trọng',
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Mới báo cáo',
  REPORTED: 'Đã tiếp nhận',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã xử lý',
  CLOSED: 'Đã đóng',
};

export const IncidentsTab: React.FC<{ trip: SpecTrip }> = ({ trip }) => {
  const incidents = useSharedIncidents(trip.id);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [status, setStatus] = useState<'VALID' | 'PERMIT_REISSUED' | 'REJECTED'>('VALID');
  const [findings, setFindings] = useState('');
  const [notes, setNotes] = useState('');
  const [requiresReissue, setRequiresReissue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  const storedName = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userFullName') : null)
    || (typeof localStorage !== 'undefined' ? localStorage.getItem('userFullName') : null)
    || 'Chuyên viên pháp lý';

  const handleSaveReview = async (incident: SharedIncident) => {
    if (!findings.trim()) {
      setFeedback({ id: incident.id, msg: 'Vui lòng nhập nhận định pháp lý / thú y.', ok: false });
      return;
    }
    setSubmitting(true);
    const reviewData = {
      reviewedAt: new Date().toISOString(),
      reviewedBy: storedName,
      note: `${findings.trim()}${notes.trim() ? ' — ' + notes.trim() : ''}`,
      impact: (status === 'VALID' ? 'NONE' : status === 'PERMIT_REISSUED' ? 'DOCS_DELAY' : 'CANCELLED') as any,
    };

    updateSharedIncidentReview(incident.id, reviewData);

    // Call backend F5-J21 if available
    try {
      await apiClient.post(`/specialist/incidents/${incident.id}/compliance-reviews`, {
        status,
        findings: findings.trim(),
        requiresPermitReissue: requiresReissue,
        notes: notes.trim() || undefined,
      });
    } catch {
      // Backend not running or demo mode — state already persisted in shared storage
    }

    setSubmitting(false);
    setReviewingId(null);
    setFindings('');
    setNotes('');
    setRequiresReissue(false);
    setFeedback({ id: incident.id, msg: 'Đã lưu kết quả rà soát pháp lý thành công.', ok: true });
  };

  return (
    <div className="spc-incidents-tab">
      <div className="spc-card" style={{ marginBottom: 14 }}>
        <h3 className="spc-card__title">
          <span>Sự cố vận chuyển trên chuyến {trip.id}</span>
          <TripStatusBadge
            label={incidents.length ? `${incidents.length} sự cố` : 'Bình thường'}
            tone={incidents.some((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH') ? 'bad' : incidents.length ? 'warn' : 'ok'}
          />
        </h3>
        <p className="spc-subtitle">
          Theo dõi các sự cố do tổ xe báo cáo khi đang di chuyển. Chuyên viên rà soát ảnh hưởng tới hiệu lực giấy tờ,
          thủ tục kiểm dịch và kích hoạt bảo hiểm nếu có thiệt hại.
        </p>
      </div>

      {!incidents.length ? (
        <div className="spc-card spc-empty">
          <b>Chưa ghi nhận sự cố nào trên chuyến này</b>
          <p className="spc-muted" style={{ marginTop: 6 }}>
            Khi tài xế báo cáo sự cố (hỏng xe, ngựa mệt/sốt, thời tiết, cửa khẩu), thông tin sẽ hiển thị tại đây để bạn rà soát pháp lý.
          </p>
        </div>
      ) : (
        incidents.map((inc) => {
          const isReviewing = reviewingId === inc.id;
          const review = inc.complianceReview;
          const sevTone = SEVERITY_TONE[inc.severity] || 'warn';
          return (
            <div key={inc.id} className="spc-card spc-incident-item">
              <div className="spc-incident-item__head">
                <div>
                  <div className="spc-incident-item__title">
                    <b>{inc.id}</b> • {TYPE_LABELS[inc.type] || inc.type}
                  </div>
                  <div className="spc-incident-item__meta">
                    Báo lúc: <b>{fmtDateTime(inc.at)}</b> • Bởi: <b>{getUserFullName(inc.by)}</b> • Vị trí: <b>{inc.location || 'Trên tuyến'}</b>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <TripStatusBadge label={`Mức độ: ${SEVERITY_LABELS[inc.severity] || inc.severity}`} tone={sevTone} />
                  <TripStatusBadge label={STATUS_LABELS[inc.status] || inc.status} tone={inc.status === 'CLOSED' ? 'ok' : 'warn'} />
                </div>
              </div>

              <div className="spc-incident-item__desc">
                <span className="spc-eyebrow">Mô tả sự việc từ tổ xe:</span>
                <p>{inc.description || 'Không có mô tả chi tiết.'}</p>
              </div>

              {inc.photos && inc.photos.length > 0 && (
                <div className="spc-incident-item__photos">
                  <span className="spc-eyebrow">Ảnh hiện trường ({inc.photos.length}):</span>
                  <div className="spc-incident-item__photo-list">
                    {inc.photos.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" className="spc-incident-item__photo-link">
                        Ảnh {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {inc.approvedPlan && (
                <div className="spc-note spc-note--green" style={{ marginTop: 10 }}>
                  <b>Phương án xử lý đã duyệt:</b> {inc.approvedPlan}
                </div>
              )}

              {/* Phần Rà soát pháp lý của chuyên viên */}
              <div className="spc-incident-item__compliance">
                <div className="spc-incident-item__compliance-header">
                  <b>Rà soát pháp lý &amp; kiểm dịch (Specialist Review)</b>
                  {review ? (
                    <TripStatusBadge label="Đã rà soát" tone="ok" />
                  ) : (
                    <TripStatusBadge label="Chưa rà soát" tone="bad" />
                  )}
                </div>

                {review ? (
                  <div className="spc-incident-item__compliance-done">
                    <p><b>Nhận định:</b> {review.note}</p>
                    <p className="spc-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                      Rà soát bởi: <b>{review.reviewedBy}</b> lúc {fmtDateTime(review.reviewedAt)}
                    </p>
                  </div>
                ) : isReviewing ? (
                  <div className="spc-incident-item__compliance-form">
                    <div className="spc-field">
                      <label>Kết luận tính hợp lệ hồ sơ *</label>
                      <select
                        className="spc-select"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                      >
                        <option value="VALID">Hồ sơ vẫn hợp lệ – Tiếp tục hành trình bình thường</option>
                        <option value="PERMIT_REISSUED">Ảnh hưởng thời gian – Cần xin gia hạn / cấp lại giấy phép</option>
                        <option value="REJECTED">Không đạt điều kiện – Cần dừng chặng hoặc kiểm dịch lại</option>
                      </select>
                    </div>

                    <div className="spc-field">
                      <label>Nhận định pháp lý &amp; thú y *</label>
                      <textarea
                        className="spc-textarea"
                        rows={2}
                        value={findings}
                        onChange={(e) => setFindings(e.target.value)}
                        placeholder="VD: Kiểm tra giấy chứng nhận sức khỏe số 24 còn hạn đến 20/11. Chậm 4 giờ không ảnh hưởng hạn kiểm dịch."
                      />
                    </div>

                    <div className="spc-field">
                      <label>Ghi chú bảo hiểm / khuyến nghị (không bắt buộc)</label>
                      <input
                        className="spc-input"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="VD: Lưu biên bản thú y để làm việc với đơn vị bảo hiểm nếu phát sinh viện phí"
                      />
                    </div>

                    <label className="spc-check" style={{ marginBottom: 10 }}>
                      <input
                        type="checkbox"
                        checked={requiresReissue}
                        onChange={(e) => setRequiresReissue(e.target.checked)}
                      />
                      Yêu cầu lập hồ sơ mới hoặc cấp lại giấy phép kiểm dịch
                    </label>

                    <div className="spc-btn-row">
                      <button
                        type="button"
                        className="spc-btn spc-btn--solid"
                        disabled={submitting}
                        onClick={() => handleSaveReview(inc)}
                      >
                        {submitting ? 'Đang lưu…' : 'Lưu rà soát pháp lý'}
                      </button>
                      <button
                        type="button"
                        className="spc-btn"
                        onClick={() => { setReviewingId(null); setFeedback(null); }}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="spc-btn spc-btn--sm spc-btn--solid"
                      onClick={() => {
                        setReviewingId(inc.id);
                        setFindings('');
                        setNotes('');
                        setStatus('VALID');
                        setRequiresReissue(false);
                      }}
                    >
                      Bắt đầu rà soát pháp lý sự cố này
                    </button>
                  </div>
                )}

                {feedback && feedback.id === inc.id && (
                  <p className={feedback.ok ? 'spc-hint spc-hint--ok' : 'spc-error'} style={{ marginTop: 8 }}>
                    {feedback.msg}
                  </p>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default IncidentsTab;
