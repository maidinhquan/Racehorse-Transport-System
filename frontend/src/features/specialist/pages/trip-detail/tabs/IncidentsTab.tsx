import React, { useState } from 'react';
import type { SpecTrip } from '../../../types';
import { useSharedIncidents, updateSharedIncidentReview, type SharedIncident } from '../../../../../shared/utils/sharedIncidents';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import { Icon } from '../../../components/SpecialistLayout';
import { fmtDateTime } from '../../../hooks/specialistRules';
import { apiClient } from '../../../../../shared/api/apiClient';
import '../../incidents/SpecialistIncidentsPage.css';
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

  const handleStartReview = (inc: SharedIncident) => {
    setReviewingId(inc.id);
    if (inc.complianceReview) {
      const imp = inc.complianceReview.impact;
      setStatus(imp === 'DOCS_DELAY' ? 'PERMIT_REISSUED' : imp === 'CANCELLED' ? 'REJECTED' : 'VALID');
      setFindings(inc.complianceReview.note.split(' — ')[0] || inc.complianceReview.note);
      setNotes(inc.complianceReview.note.includes(' — ') ? inc.complianceReview.note.split(' — ')[1] : '');
      setRequiresReissue(imp === 'DOCS_DELAY');
    } else {
      setStatus('VALID');
      setFindings('');
      setNotes('');
      setRequiresReissue(false);
    }
    setFeedback(null);
  };

  const handleSaveReview = async (incident: SharedIncident) => {
    if (!findings.trim()) {
      setFeedback({ id: incident.id, msg: 'Vui lòng nhập nhận định pháp lý & thú y.', ok: false });
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

    try {
      await apiClient.post(`/specialist/incidents/${incident.id}/compliance-reviews`, {
        status,
        findings: findings.trim(),
        requiresPermitReissue: requiresReissue,
        notes: notes.trim() || undefined,
      });
    } catch {
      // Backend unavailable or offline
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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <Icon name="check" />
          </div>
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
            <div key={inc.id} className="spc-incident-card">
              <div className="spc-incident-card__header">
                <div className="spc-incident-card__identity">
                  <div className="spc-incident-tags">
                    <span className="spc-incident-chip">{inc.id}</span>
                    <span className="spc-incident-chip spc-incident-chip--trip">Chuyến {inc.tripId}</span>
                  </div>
                  <h4 className="spc-incident-card__title" style={{ fontSize: 16 }}>
                    {TYPE_LABELS[inc.type] || inc.type}
                  </h4>
                </div>

                <div className="spc-incident-card__badges">
                  <TripStatusBadge label={`Mức độ: ${SEVERITY_LABELS[inc.severity] || inc.severity}`} tone={sevTone} />
                  <TripStatusBadge label={STATUS_LABELS[inc.status] || inc.status} tone={inc.status === 'CLOSED' ? 'ok' : 'warn'} />
                </div>
              </div>

              <div className="spc-incident-card__content">
                {/* Cột 1: Thông tin từ hiện trường */}
                <div className="spc-incident-card__left">
                  <div className="spc-incident-meta-grid">
                    <div className="spc-incident-meta-item">
                      <span>Thời điểm báo</span>
                      <b>{fmtDateTime(inc.at)}</b>
                    </div>
                    <div className="spc-incident-meta-item">
                      <span>Người báo</span>
                      <b>{inc.by}</b>
                    </div>
                    <div className="spc-incident-meta-item" style={{ gridColumn: 'span 2' }}>
                      <span>Địa điểm ghi nhận</span>
                      <b>{inc.location || 'Trên tuyến vận chuyển'}</b>
                    </div>
                  </div>

                  <div className="spc-incident-desc-section">
                    <span className="spc-section-label">Mô tả sự việc từ tổ xe:</span>
                    <div className="spc-incident-desc-box">
                      {inc.description || 'Không có mô tả chi tiết từ người báo.'}
                    </div>
                  </div>

                  {inc.photos && inc.photos.length > 0 && (
                    <div className="spc-incident-photos">
                      <span className="spc-section-label">Ảnh hiện trường ({inc.photos.length}):</span>
                      <div className="spc-incident-photos-list">
                        {inc.photos.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noreferrer" className="spc-photo-thumb-link">
                            <Icon name="file" />
                            <span>Ảnh {idx + 1}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {inc.approvedPlan && (
                    <div className="spc-approved-plan-box">
                      <b>Phương án xử lý đã duyệt:</b>
                      <div>{inc.approvedPlan}</div>
                    </div>
                  )}
                </div>

                {/* Cột 2: Rà soát pháp lý của chuyên viên */}
                <div className="spc-incident-card__right">
                  <div className="spc-compliance-box">
                    <div className="spc-compliance-box__header">
                      <h4>Rà soát pháp lý &amp; kiểm dịch</h4>
                      {review ? (
                        <TripStatusBadge label="Đã rà soát" tone="ok" />
                      ) : (
                        <TripStatusBadge label="Cần rà soát" tone="bad" />
                      )}
                    </div>

                    {review && !isReviewing && (
                      <div className="spc-compliance-done-card">
                        <div className="spc-compliance-done-conclusion">
                          <span style={{ fontSize: 13, fontWeight: 700 }}>
                            {review.impact === 'NONE' ? 'Hồ sơ vẫn hợp lệ' : review.impact === 'DOCS_DELAY' ? 'Cần xin gia hạn / cấp lại giấy phép' : 'Không đạt điều kiện'}
                          </span>
                          <button
                            type="button"
                            className="spc-btn spc-btn--sm"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => handleStartReview(inc)}
                          >
                            Cập nhật lại
                          </button>
                        </div>
                        <div className="spc-compliance-done-text">
                          <b>Nhận định:</b> {review.note}
                        </div>
                        <div className="spc-compliance-done-meta">
                          Thẩm định bởi <b>{review.reviewedBy}</b> • {fmtDateTime(review.reviewedAt)}
                        </div>
                      </div>
                    )}

                    {!review && !isReviewing && (
                      <div className="spc-compliance-empty-state">
                        <p>
                          Chưa có ý kiến chuyên viên. Hãy rà soát xem sự cố có ảnh hưởng tới hiệu lực giấy chứng nhận kiểm dịch hoặc yêu cầu bảo hiểm hay không.
                        </p>
                        <button
                          type="button"
                          className="spc-btn spc-btn--solid spc-btn--sm"
                          onClick={() => handleStartReview(inc)}
                        >
                          Tiến hành rà soát pháp lý
                        </button>
                      </div>
                    )}

                    {isReviewing && (
                      <div className="spc-compliance-form">
                        <div className="spc-field">
                          <label htmlFor={`tab-status-${inc.id}`}>Kết luận tính hợp lệ hồ sơ *</label>
                          <select
                            id={`tab-status-${inc.id}`}
                            className="spc-select"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                          >
                            <option value="VALID">Hồ sơ vẫn hợp lệ – Tiếp tục hành trình</option>
                            <option value="PERMIT_REISSUED">Ảnh hưởng thời gian – Cần xin gia hạn / cấp lại</option>
                            <option value="REJECTED">Không đạt – Dừng chặng kiểm dịch lại</option>
                          </select>
                        </div>

                        <div className="spc-field">
                          <label htmlFor={`tab-findings-${inc.id}`}>Nhận định pháp lý &amp; thú y *</label>
                          <textarea
                            id={`tab-findings-${inc.id}`}
                            className="spc-textarea"
                            rows={3}
                            value={findings}
                            onChange={(e) => setFindings(e.target.value)}
                            placeholder="Ghi nhận định: kiểm tra số giấy phép, thời hạn, điều kiện kiểm dịch..."
                          />
                        </div>

                        <div className="spc-field">
                          <label htmlFor={`tab-notes-${inc.id}`}>Ghi chú bảo hiểm / khuyến nghị</label>
                          <input
                            id={`tab-notes-${inc.id}`}
                            className="spc-input"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="VD: Lập biên bản hiện trường gửi bảo hiểm"
                          />
                        </div>

                        <label className="spc-check" style={{ fontSize: 12.5 }}>
                          <input
                            type="checkbox"
                            checked={requiresReissue}
                            onChange={(e) => setRequiresReissue(e.target.checked)}
                          />
                          Yêu cầu lập hồ sơ mới hoặc cấp lại giấy phép kiểm dịch
                        </label>

                        <div className="spc-btn-row" style={{ marginTop: 4 }}>
                          <button
                            type="button"
                            className="spc-btn spc-btn--solid spc-btn--sm"
                            disabled={submitting}
                            onClick={() => handleSaveReview(inc)}
                          >
                            {submitting ? 'Đang lưu…' : 'Lưu rà soát pháp lý'}
                          </button>
                          <button
                            type="button"
                            className="spc-btn spc-btn--sm"
                            onClick={() => { setReviewingId(null); setFeedback(null); }}
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    )}

                    {feedback && feedback.id === inc.id && (
                      <p className={feedback.ok ? 'spc-hint spc-hint--ok' : 'spc-error'} style={{ margin: '4px 0 0', fontSize: 12.5 }}>
                        {feedback.msg}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default IncidentsTab;
