import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpecialistLayout, Icon } from '../../components/SpecialistLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { useSpecialist } from '../../hooks/useSpecialist';
import { useSharedIncidents, updateSharedIncidentReview, type SharedIncident } from '../../../../shared/utils/sharedIncidents';
import { fmtDateTime } from '../../hooks/specialistRules';
import { apiClient } from '../../../../shared/api/apiClient';
import './SpecialistIncidentsPage.css';

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

export const SpecialistIncidentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { trips } = useSpecialist();
  const allIncidents = useSharedIncidents();

  const [selectedTrip, setSelectedTrip] = useState<string>('ALL');
  const [filterReview, setFilterReview] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
  const [search, setSearch] = useState('');
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

  const clean = (x?: string) => (x || '').replace(/-/g, '_').toLowerCase();

  const filteredIncidents = useMemo(() => {
    return allIncidents.filter((inc) => {
      if (selectedTrip !== 'ALL' && clean(inc.tripId) !== clean(selectedTrip)) {
        return false;
      }
      if (filterReview === 'PENDING' && inc.complianceReview) return false;
      if (filterReview === 'DONE' && !inc.complianceReview) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const text = `${inc.id} ${inc.tripId} ${inc.description} ${inc.location} ${inc.by} ${TYPE_LABELS[inc.type] || inc.type}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [allIncidents, selectedTrip, filterReview, search]);

  const pendingCount = allIncidents.filter((i) => !i.complianceReview).length;
  const criticalCount = allIncidents.filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH').length;
  const doneCount = allIncidents.length - pendingCount;

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
      // Backend unavailable or offline — shared storage already updated
    }

    setSubmitting(false);
    setReviewingId(null);
    setFindings('');
    setNotes('');
    setRequiresReissue(false);
    setFeedback({ id: incident.id, msg: 'Đã lưu kết quả rà soát pháp lý thành công.', ok: true });
  };

  return (
    <SpecialistLayout title="Sự cố vận chuyển & Rà soát pháp lý">
      <div className="spc-incidents-page">
        {/* Tiêu đề trang */}
        <div className="spc-head" style={{ marginBottom: 4 }}>
          <div>
            <h2 className="spc-title">Sự cố vận chuyển &amp; Rà soát pháp lý</h2>
            <p className="spc-subtitle">
              Theo dõi sự cố do tổ xe báo cáo khi đang di chuyển trên đường. Rà soát ảnh hưởng tới hiệu lực giấy tờ và bảo hiểm.
            </p>
          </div>
        </div>

        {/* 1. Thẻ thống kê KPI */}
        <div className="spc-incidents-stats">
          <div className="spc-stat-card">
            <div className="spc-stat-card__icon">
              <Icon name="alert" />
            </div>
            <div className="spc-stat-card__info">
              <span className="spc-stat-card__val">{allIncidents.length}</span>
              <span className="spc-stat-card__label">Tổng sự cố</span>
              <span className="spc-stat-card__sub">Ghi nhận từ tổ xe</span>
            </div>
          </div>

          <div className={`spc-stat-card ${pendingCount > 0 ? 'spc-stat-card--bad' : ''}`}>
            <div className="spc-stat-card__icon">
              <Icon name="clock" />
            </div>
            <div className="spc-stat-card__info">
              <span className="spc-stat-card__val" style={pendingCount > 0 ? { color: '#dc2626' } : undefined}>{pendingCount}</span>
              <span className="spc-stat-card__label">Cần rà soát pháp lý</span>
              <span className="spc-stat-card__sub">{pendingCount > 0 ? 'Chưa có ý kiến chuyên viên' : 'Đã hoàn tất rà soát'}</span>
            </div>
          </div>

          <div className={`spc-stat-card ${criticalCount > 0 ? 'spc-stat-card--warn' : ''}`}>
            <div className="spc-stat-card__icon">
              <Icon name="shield" />
            </div>
            <div className="spc-stat-card__info">
              <span className="spc-stat-card__val" style={criticalCount > 0 ? { color: '#d97706' } : undefined}>{criticalCount}</span>
              <span className="spc-stat-card__label">Mức độ cao / khẩn</span>
              <span className="spc-stat-card__sub">Cần theo dõi sát</span>
            </div>
          </div>

          <div className="spc-stat-card spc-stat-card--ok">
            <div className="spc-stat-card__icon">
              <Icon name="check" />
            </div>
            <div className="spc-stat-card__info">
              <span className="spc-stat-card__val" style={{ color: '#16a34a' }}>{doneCount}</span>
              <span className="spc-stat-card__label">Đã rà soát</span>
              <span className="spc-stat-card__sub">Có biên bản chuyên viên</span>
            </div>
          </div>
        </div>

        {/* 2. Thanh bộ lọc hiện đại */}
        <div className="spc-incidents-filter">
          <div className="spc-filter-group">
            <label className="spc-filter-label" htmlFor="spc-trip-select">
              <Icon name="truck" />
              <span>Chuyến đi:</span>
            </label>
            <select
              id="spc-trip-select"
              className="spc-select"
              style={{ width: 'auto', minWidth: 220 }}
              value={selectedTrip}
              onChange={(e) => setSelectedTrip(e.target.value)}
            >
              <option value="ALL">Tất cả các chuyến ({trips.length})</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id}: {t.origin} → {t.destination}
                </option>
              ))}
            </select>

            <div className="spc-filter-search">
              <Icon name="search" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã sự cố, chuyến, vị trí…"
                aria-label="Tìm kiếm sự cố"
              />
            </div>
          </div>

          <div className="spc-filter-group">
            <span className="spc-filter-label">Trạng thái:</span>
            <div className="spc-segmented-control" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={filterReview === 'ALL'}
                className={`spc-segmented-btn ${filterReview === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilterReview('ALL')}
              >
                <span>Tất cả</span>
                <span className="spc-segmented-count">{allIncidents.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filterReview === 'PENDING'}
                className={`spc-segmented-btn ${filterReview === 'PENDING' ? 'active' : ''}`}
                onClick={() => setFilterReview('PENDING')}
              >
                <span>Cần rà soát</span>
                <span className="spc-segmented-count" style={pendingCount > 0 ? { background: '#fee2e2', color: '#b91c1c' } : undefined}>
                  {pendingCount}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filterReview === 'DONE'}
                className={`spc-segmented-btn ${filterReview === 'DONE' ? 'active' : ''}`}
                onClick={() => setFilterReview('DONE')}
              >
                <span>Đã rà soát</span>
                <span className="spc-segmented-count">{doneCount}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Danh sách sự cố */}
        <div className="spc-incidents-list">
          {!filteredIncidents.length ? (
            <div className="spc-card spc-empty" style={{ padding: '48px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <Icon name="check" />
              </div>
              <b style={{ fontSize: 16 }}>Không có sự cố nào khớp điều kiện lọc</b>
              <p className="spc-muted" style={{ marginTop: 6, maxWidth: 460, margin: '6px auto 0' }}>
                Khi tài xế hoặc tổ xe báo cáo sự cố trên đường, danh sách sẽ hiển thị ngay tại đây để chuyên viên kiểm tra hiệu lực giấy tờ và quy định kiểm dịch.
              </p>
            </div>
          ) : (
            filteredIncidents.map((inc) => {
              const isReviewing = reviewingId === inc.id;
              const review = inc.complianceReview;
              const sevTone = SEVERITY_TONE[inc.severity] || 'warn';
              const tripObj = trips.find(
                (t) => clean(t.id) === clean(inc.tripId)
              );

              return (
                <div key={inc.id} className="spc-incident-card">
                  {/* Header thẻ sự cố */}
                  <div className="spc-incident-card__header">
                    <div className="spc-incident-card__identity">
                      <div className="spc-incident-tags">
                        <span className="spc-incident-chip">{inc.id}</span>
                        <span className="spc-incident-chip spc-incident-chip--trip">Chuyến {inc.tripId}</span>
                        {tripObj && (
                          <span className="spc-incident-card__route">
                            {tripObj.origin} → {tripObj.destination}
                          </span>
                        )}
                      </div>
                      <h3 className="spc-incident-card__title">
                        {TYPE_LABELS[inc.type] || inc.type}
                      </h3>
                    </div>

                    <div className="spc-incident-card__badges">
                      <TripStatusBadge label={`Mức độ: ${SEVERITY_LABELS[inc.severity] || inc.severity}`} tone={sevTone} />
                      <TripStatusBadge label={STATUS_LABELS[inc.status] || inc.status} tone={inc.status === 'CLOSED' ? 'ok' : 'warn'} />
                      {tripObj && (
                        <button
                          type="button"
                          className="spc-btn spc-btn--sm"
                          onClick={() => navigate(`/specialist/trips/${tripObj.id}/incidents`)}
                          title="Mở hồ sơ kiểm dịch của chuyến này"
                        >
                          Hồ sơ chuyến
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Thân thẻ sự cố: Bố cục 2 cột chuyên nghiệp */}
                  <div className="spc-incident-card__content">
                    {/* Cột 1: Thông tin từ hiện trường */}
                    <div className="spc-incident-card__left">
                      {/* Bảng thông số hiện trường */}
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

                      {/* Khối mô tả chi tiết */}
                      <div className="spc-incident-desc-section">
                        <span className="spc-section-label">Mô tả sự việc từ tổ xe:</span>
                        <div className="spc-incident-desc-box">
                          {inc.description || 'Không có mô tả chi tiết từ người báo.'}
                        </div>
                      </div>

                      {/* Ảnh hiện trường */}
                      {inc.photos && inc.photos.length > 0 && (
                        <div className="spc-incident-photos">
                          <span className="spc-section-label">Ảnh hiện trường ({inc.photos.length}):</span>
                          <div className="spc-incident-photos-list">
                            {inc.photos.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="spc-photo-thumb-link"
                              >
                                <Icon name="file" />
                                <span>Ảnh đính kèm {idx + 1}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Phương án xử lý đã duyệt */}
                      {inc.approvedPlan && (
                        <div className="spc-approved-plan-box">
                          <b>Phương án xử lý đã duyệt:</b>
                          <div>{inc.approvedPlan}</div>
                        </div>
                      )}
                    </div>

                    {/* Cột 2: Bảng rà soát pháp lý của Specialist */}
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

                        {/* Trạng thái 1: Đã rà soát xong */}
                        {review && !isReviewing && (
                          <div className="spc-compliance-done-card">
                            <div className="spc-compliance-done-conclusion">
                              <span style={{ fontSize: 13, fontWeight: 700 }}>
                                Kết luận: {review.impact === 'NONE' ? 'Hồ sơ vẫn hợp lệ' : review.impact === 'DOCS_DELAY' ? 'Cần xin gia hạn / cấp lại giấy phép' : 'Không đạt điều kiện'}
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

                        {/* Trạng thái 2: Chưa rà soát */}
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

                        {/* Trạng thái 3: Đang mở Form rà soát */}
                        {isReviewing && (
                          <div className="spc-compliance-form">
                            <div className="spc-field">
                              <label htmlFor={`spc-status-${inc.id}`}>Kết luận tính hợp lệ hồ sơ *</label>
                              <select
                                id={`spc-status-${inc.id}`}
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
                              <label htmlFor={`spc-findings-${inc.id}`}>Nhận định pháp lý &amp; thú y *</label>
                              <textarea
                                id={`spc-findings-${inc.id}`}
                                className="spc-textarea"
                                rows={3}
                                value={findings}
                                onChange={(e) => setFindings(e.target.value)}
                                placeholder="Ghi nhận định: kiểm tra số giấy phép, thời hạn, điều kiện kiểm dịch..."
                              />
                            </div>

                            <div className="spc-field">
                              <label htmlFor={`spc-notes-${inc.id}`}>Ghi chú bảo hiểm / khuyến nghị</label>
                              <input
                                id={`spc-notes-${inc.id}`}
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

                        {/* Thông báo phản hồi */}
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
      </div>
    </SpecialistLayout>
  );
};

export default SpecialistIncidentsPage;
