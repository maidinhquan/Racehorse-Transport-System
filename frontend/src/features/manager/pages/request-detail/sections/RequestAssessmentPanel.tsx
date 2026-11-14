import { useEffect, useState } from 'react';
import { onSync } from '../../../../../shared/utils/syncChannel';
import type { FormEvent } from 'react';
import { apiMessage } from '../../../../../shared/api/contractClient';
import { requestReviewApi } from '../../../../../shared/api/requestReviewApi';
import type { ChangeReview, OptionKey, ScheduleOption } from '../../../../../shared/api/requestReviewApi';
import { itemStatus, reviewDay, reviewMode, reviewResult, reviewStatus, documentName } from '../../../../../shared/components/RequestReview/labels';
import { Icon } from '../../../components/ManagerLayout';
import './RequestAssessmentPanel.css';

type ManagerReview = Awaited<ReturnType<typeof requestReviewApi.manager>>;
interface Props {
  requestId: string;
  pending: boolean;
  accept: (key: OptionKey) => Promise<boolean>;
  changes: (text: string, key: ChangeReview) => Promise<boolean>;
  reject?: () => void;
}

import { getUserFullName, cleanStaffName } from '../../../../../shared/utils/userNameResolver';

function getInitials(name = ''): string {
  const cleaned = cleanStaffName(name);
  if (!cleaned) return '';
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function resolveStaffName(
  id?: string,
  directName?: string | null,
  staffList?: Array<{ id: string; name: string }>
): string {
  if (directName && directName.trim()) {
    return getUserFullName(directName);
  }
  if (!id) return 'Chưa phân công';
  const found = staffList?.find((x) => x.id === id);
  if (found?.name) {
    return getUserFullName(found.name);
  }
  return getUserFullName(id, id);
}

export function RequestAssessmentPanel({ requestId, pending, accept, changes, reject }: Props) {
  const [state, setState] = useState<ManagerReview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [action, setAction] = useState('');
  const [viewer, setViewer] = useState<'coord' | 'spec' | null>(null);

  const [coordinatorId, setCoordinatorId] = useState('');
  const [specialistId, setSpecialistId] = useState('');

  useEffect(() => {
    let current = true;
    const refresh = () =>
      requestReviewApi
        .manager(requestId)
        .then((value) => {
          if (current) setState(value);
        })
        .catch((error) => {
          if (current) setError(apiMessage(error));
        });
    void refresh();
    const timer = setInterval(refresh, 15000);
    const stopSync = onSync(() => void refresh());
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      current = false;
      clearInterval(timer);
      stopSync();
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [requestId, pending]);

  const review = state?.review;
  const coordDone = !!review?.options.length && review.options.every((o) => !!o.coordinatorResult);
  const feasible = review?.options.filter((o) => o.coordinatorResult === 'FEASIBLE') ?? [];
  const specDone = feasible.length > 0 && feasible.every((o) => !!o.specialistResult);
  const working =
    review?.status === 'MANAGER_PENDING' ||
    review?.status === 'CUSTOMER_ACCEPTED' ||
    review?.status === 'CUSTOMER_REJECTED';
  const canRequestChanges = pending && working;

  const selectedCoordinator = state?.coordinators.find((x) => x.id === coordinatorId);
  const selectedSpecialist = state?.specialists.find((x) => x.id === specialistId);
  const assignedCoordinator = state?.coordinators.find((x) => x.id === review?.coordinatorId);
  const assignedSpecialist = state?.specialists.find((x) => x.id === review?.specialistId);

  const coordinatorDisplayName = resolveStaffName(
    review?.coordinatorId,
    review?.coordinatorName || assignedCoordinator?.name,
    state?.coordinators
  );
  const specialistDisplayName = resolveStaffName(
    review?.specialistId,
    review?.specialistName || assignedSpecialist?.name,
    state?.specialists
  );

  async function run(command: () => Promise<boolean>) {
    setBusy(true);
    setError('');
    try {
      if (await command()) {
        setFeedback('');
        setAction('');
        setState(await requestReviewApi.manager(requestId));
      }
    } catch (error) {
      setError(apiMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state || !coordinatorId || !specialistId) return;
    void run(async () => {
      await requestReviewApi.assign(requestId, state.requestRevision, coordinatorId, specialistId);
      return true;
    });
  }

  function canApprove(option: ScheduleOption) {
    return (
      option.specialistResult === 'FEASIBLE' &&
      (option.isOriginal ||
        (review?.status === 'CUSTOMER_ACCEPTED' && review.selectedOptionId === option.scheduleOptionId))
    );
  }

  return (
    <section className="mgr-card request-assessment-card">
      <div className="request-assessment-card__header">
        <h3 className="request-assessment-card__title">
          <Icon name="file" /> Xét duyệt trước hợp đồng
        </h3>
        <p className="request-assessment-card__desc">
          Phân công Điều phối viên kiểm tra năng lực đội xe &amp; tuyến đường, và Chuyên viên kiểm dịch thẩm định trước khi chấp thuận yêu cầu.
        </p>
      </div>

      {error && <div className="mgr-assessment-alert" role="alert">{error}</div>}
      {!state && !error && <div className="mgr-assessment-loading">Đang tải phiên xét duyệt…</div>}

      {/* Form phân công (khi chưa có review và đang chờ duyệt) */}
      {state && !review && pending && (
        <form onSubmit={assign} className="mgr-assessment-form">
          {/* Nhóm chọn Điều phối viên */}
          <div className="mgr-assessment-field">
            <label className="mgr-assessment-label" htmlFor="mgr-select-coord">
              <span className="mgr-assessment-label__text">
                <Icon name="truck" /> Điều phối viên phụ trách
              </span>
              <span className="mgr-required-dot">*</span>
            </label>
            <div className="mgr-select-wrap">
              <select
                id="mgr-select-coord"
                name="coordinator"
                value={coordinatorId}
                onChange={(e) => setCoordinatorId(e.target.value)}
                className="mgr-select"
                required
              >
                <option value="" disabled>
                  — Chọn Điều phối viên —
                </option>
                {state.coordinators.map((x) => (
                  <option key={x.id} value={x.id}>
                    {getUserFullName(x.name || x.id)}
                  </option>
                ))}
              </select>
            </div>

            {selectedCoordinator && (
              <div className="mgr-assigned-person mgr-assigned-person--coord">
                <div className="mgr-assigned-person__avatar">
                  {getInitials(selectedCoordinator.name) || 'ĐP'}
                </div>
                <div className="mgr-assigned-person__info">
                  <div className="mgr-assigned-person__name">
                    {getUserFullName(selectedCoordinator.name || selectedCoordinator.id)}
                  </div>
                  <div className="mgr-assigned-person__meta">
                    <span className="mgr-assigned-person__role">Điều phối xe & tuyến</span>
                  </div>
                </div>
                <span className="mgr-assigned-person__badge">
                  <Icon name="check" /> Đã chọn
                </span>
              </div>
            )}
          </div>

          {/* Nhóm chọn Chuyên viên kiểm dịch */}
          <div className="mgr-assessment-field">
            <label className="mgr-assessment-label" htmlFor="mgr-select-spec">
              <span className="mgr-assessment-label__text">
                <Icon name="shield" /> Chuyên viên kiểm dịch thú y
              </span>
              <span className="mgr-required-dot">*</span>
            </label>
            <div className="mgr-select-wrap">
              <select
                id="mgr-select-spec"
                name="specialist"
                value={specialistId}
                onChange={(e) => setSpecialistId(e.target.value)}
                className="mgr-select"
                required
              >
                <option value="" disabled>
                  — Chọn Chuyên viên kiểm dịch —
                </option>
                {state.specialists.map((x) => (
                  <option key={x.id} value={x.id}>
                    {getUserFullName(x.name || x.id)}
                  </option>
                ))}
              </select>
            </div>

            {selectedSpecialist && (
              <div className="mgr-assigned-person mgr-assigned-person--spec">
                <div className="mgr-assigned-person__avatar">
                  {getInitials(selectedSpecialist.name) || 'CV'}
                </div>
                <div className="mgr-assigned-person__info">
                  <div className="mgr-assigned-person__name">
                    {getUserFullName(selectedSpecialist.name || selectedSpecialist.id)}
                  </div>
                  <div className="mgr-assigned-person__meta">
                    <span className="mgr-assigned-person__role">Chuyên viên kiểm dịch</span>
                  </div>
                </div>
                <span className="mgr-assigned-person__badge">
                  <Icon name="check" /> Đã chọn
                </span>
              </div>
            )}
          </div>

          {/* Hàng nút bấm hành động */}
          <div className="mgr-assessment-actions">
            <button
              type="submit"
              className="mgr-btn mgr-btn--solid mgr-btn--block"
              disabled={busy || !coordinatorId || !specialistId}
              title={busy ? 'Đang phân công' : undefined}
            >
              <Icon name="check" /> {busy ? 'Đang phân công…' : 'Giao xét duyệt'}
            </button>
            {reject && (
              <button
                type="button"
                className="mgr-btn mgr-btn--danger mgr-btn--block"
                onClick={reject}
                disabled={busy}
              >
                Từ chối yêu cầu
              </button>
            )}
          </div>
        </form>
      )}

      {/* Khi phiên xét duyệt đã được giao hoặc đang diễn ra */}
      {review && (
        <div className="mgr-review-status-box">
          <div className="mgr-review-status-header">
            <div className="mgr-review-status-tag">
              <span className={`mgr-status-pill status-${review.status}`}>
                {reviewStatus[review.status] || review.status}
              </span>
              {review.customerDeadlineUtc && (
                <span className="mgr-deadline-text">
                  <Icon name="clock" /> Hạn: {new Date(review.customerDeadlineUtc).toLocaleString('vi-VN')}
                </span>
              )}
            </div>
          </div>

          {/* 2 nhân sự đang phụ trách */}
          <div className="mgr-assigned-staff-grid">
            {([
              { key: 'coord', role: 'Điều phối viên', name: coordinatorDisplayName, sub: 'Điều phối xe & tuyến', fallback: 'ĐP', done: coordDone },
              { key: 'spec', role: 'Chuyên viên kiểm dịch', name: specialistDisplayName, sub: 'Kiểm dịch & thẩm định hồ sơ', fallback: 'CV', done: specDone },
            ] as const).map((p) => (
              <button
                key={p.key}
                type="button"
                className={`mgr-staff-assigned-card ${p.key}${viewer === p.key ? ' is-open' : ''}`}
                aria-expanded={viewer === p.key}
                title={p.done ? 'Đã thẩm định - bấm để xem kết quả' : 'Chưa có kết quả - bấm để xem'}
                onClick={() => setViewer(viewer === p.key ? null : p.key)}
              >
                <div className={`mgr-staff-avatar ${p.key}`}>{getInitials(p.name) || p.fallback}</div>
                <div className="mgr-staff-details">
                  <span className="mgr-staff-role">{p.role}</span>
                  <strong className="mgr-staff-name">{p.name}</strong>
                  <small className="mgr-staff-id">{p.sub}</small>
                </div>
                {p.done && (
                  <span className="mgr-staff-done" aria-label="Đã thẩm định">
                    <Icon name="check" />
                  </span>
                )}
              </button>
            ))}
          </div>

          {viewer && (
            <div className="mgr-staff-result">
              {!review.options.length && (
                <p style={{ margin: 0 }}>
                  {viewer === 'coord' ? 'Điều phối viên chưa gửi kết quả thẩm định.' : 'Chuyên viên chưa có kết quả thẩm định.'}
                </p>
              )}
              {review.options.map((option) => {
                const title = `${
                  option.isOriginal ? 'Lịch khách yêu cầu' : option.coordinatorResult === 'FEASIBLE' ? 'Lịch đề xuất' : 'Phương án đã loại'
                } · ${reviewMode(option.mode)}`;
                return (
                  <div key={option.scheduleOptionId} className="mgr-staff-result__item">
                    <b>{title}</b>
                    <p>
                      {reviewDay(option.expectedTransportDate)} → {reviewDay(option.expectedDeliveryDate)}
                    </p>
                    {viewer === 'coord' ? (
                      <p>
                        Điều phối: {reviewResult[option.coordinatorResult]} · {option.coordinatorReason}
                      </p>
                    ) : option.specialistResult ? (
                      <>
                        <p>
                          Chuyên viên: {reviewResult[option.specialistResult]}
                          {option.specialistNote ? ` · ${option.specialistNote}` : ''}
                        </p>
                        {!!option.assessment?.length && (
                          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                            {option.assessment.map((item) => {
                              const [horseId, type] = item.checklistItemId.split(':');
                              return (
                                <li key={item.checklistItemId}>
                                  {horseId} · {documentName[type]} · {itemStatus[item.status]}
                                  {item.reason ? ` · ${item.reason}` : ''}
                                  {item.requiredByDate ? ` · Hạn ${reviewDay(item.requiredByDate)}` : ''}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </>
                    ) : (
                      <p>Chưa có kết quả.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Danh sách phương án lịch trình */}
          <div className="mgr-review-options-list">
            {review.options.map((option) => (
              <div key={option.scheduleOptionId} className="mgr-review-option-card">
                <b>
                  {option.isOriginal
                    ? 'Lịch khách yêu cầu'
                    : option.coordinatorResult === 'FEASIBLE'
                    ? 'Lịch đề xuất'
                    : 'Phương án đã loại'}{' '}
                  · {reviewMode(option.mode)}
                </b>
                <p>
                  {reviewDay(option.expectedTransportDate)} → {reviewDay(option.expectedDeliveryDate)}
                </p>
                {pending && working && (
                  <div className="mgr-assessment-actions" style={{ marginTop: 12, flexDirection: 'row' }}>
                    {canApprove(option) && (
                      <button
                        type="button"
                        className="mgr-btn mgr-btn--solid"
                        disabled={busy}
                        title={busy ? 'Đang lưu quyết định' : undefined}
                        onClick={() =>
                          void run(() =>
                            accept({
                              reviewId: review.reviewId,
                              requestRevision: review.requestRevision,
                              scheduleOptionId: option.scheduleOptionId,
                            })
                          )
                        }
                      >
                        <Icon name="check" /> Chấp thuận lịch này
                      </button>
                    )}
                    {!option.isOriginal &&
                      review.status === 'MANAGER_PENDING' &&
                      option.specialistResult === 'FEASIBLE' && (
                        <button
                          type="button"
                          className="mgr-btn"
                          onClick={() => {
                            setAction(option.scheduleOptionId);
                            setFeedback('');
                          }}
                        >
                          Hỏi khách về lịch này
                        </button>
                      )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {canRequestChanges && (
            <button
              type="button"
              className="mgr-btn"
              style={{ marginTop: 12 }}
              onClick={() => {
                setAction('SUPPLEMENT_DOCUMENTS');
                setFeedback('');
              }}
            >
              Yêu cầu khách bổ sung
            </button>
          )}

          {canRequestChanges && action && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void run(() =>
                  changes(feedback, {
                    reviewId: review.reviewId,
                    requestRevision: review.requestRevision,
                    action: action === 'SUPPLEMENT_DOCUMENTS' ? 'SUPPLEMENT_DOCUMENTS' : 'CONFIRM_SCHEDULE',
                    ...(action === 'SUPPLEMENT_DOCUMENTS' ? {} : { scheduleOptionId: action }),
                  })
                );
              }}
              style={{ marginTop: 14 }}
            >
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                Nội dung gửi khách
                <textarea
                  required
                  minLength={10}
                  maxLength={2000}
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  style={{
                    width: '100%',
                    marginTop: 6,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--mgr-line)',
                    minHeight: 80,
                    boxSizing: 'border-box',
                    background: 'var(--mgr-input-bg, #ffffff)',
                    color: 'var(--mgr-ink, #0f172a)',
                  }}
                />
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="submit"
                  className="mgr-btn mgr-btn--solid"
                  disabled={busy}
                  title={busy ? 'Đang gửi' : undefined}
                >
                  Gửi yêu cầu
                </button>
                <button type="button" className="mgr-btn" onClick={() => setAction('')}>
                  Đóng
                </button>
              </div>
            </form>
          )}

          {reject && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--mgr-line)' }}>
              <button
                type="button"
                className="mgr-btn mgr-btn--danger mgr-btn--block"
                onClick={reject}
              >
                Từ chối yêu cầu
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
