import React, { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { apiMessage } from '../../api/contractClient';
import { requestReviewApi } from '../../api/requestReviewApi';
import { notifySync } from '../../utils/syncChannel';
import { DateInput } from '../DateInput/DateInput';
import type {
  ChecklistAssessment,
  ChecklistSource,
  Feasibility,
  ItemStatus,
  Mode,
  QueueItem,
  ReviewDetail,
  Reviewer,
  ScheduleOption,
  SpecialistResult,
} from '../../api/requestReviewApi';
import { documentName, documentStage, itemStatus, reviewDay, reviewMode, reviewResult, reviewStatus } from './labels';
import './RequestReview.css';

// ============================================================================
// SVG Icons
// ============================================================================
const IconCheck: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconAlert: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconArrowRight: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconRefresh: React.FC<{ spinning?: boolean }> = ({ spinning }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={spinning ? 'rr-spin' : ''}
  >
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const IconDownload: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconEye: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconTruck: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const IconSearch: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconX: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ============================================================================
// Helper: Tách địa chỉ thành Thành phố và Chi tiết ngắn gọn
// ============================================================================
export function parseLocation(addr: string | null | undefined): { city: string; detail: string } {
  if (!addr) return { city: 'Chưa xác định', detail: '—' };
  const raw = addr.trim();

  if (/hồ chí minh|tp\.?\s*hcm|sài gòn/i.test(raw)) {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    const detail = parts.slice(0, Math.min(2, parts.length - 1)).join(', ');
    return { city: 'TP. Hồ Chí Minh', detail: detail || raw };
  }
  if (/đà nẵng/i.test(raw)) {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    const detail = parts.slice(0, Math.min(2, parts.length - 1)).join(', ');
    return { city: 'Đà Nẵng', detail: detail || raw };
  }
  if (/hà nội/i.test(raw)) {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    const detail = parts.slice(0, Math.min(2, parts.length - 1)).join(', ');
    return { city: 'Hà Nội', detail: detail || raw };
  }
  if (/cần thơ/i.test(raw)) {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    return { city: 'Cần Thơ', detail: parts.slice(0, 2).join(', ') };
  }
  if (/hải phòng/i.test(raw)) {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    return { city: 'Hải Phòng', detail: parts.slice(0, 2).join(', ') };
  }
  if (/narita|chiba|tokyo/i.test(raw)) {
    return { city: 'Tokyo / Narita, JP', detail: raw.split(',')[0] || raw };
  }
  if (/johor|kuala lumpur|malaysia/i.test(raw)) {
    return { city: 'Malaysia (MY)', detail: raw.split(',')[0] || raw };
  }
  if (/phnom penh|cambodia/i.test(raw)) {
    return { city: 'Campuchia (KH)', detail: raw.split(',')[0] || raw };
  }

  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const last = parts[parts.length - 1];
    const prev = parts[parts.length - 2];
    const cityPart = /việt nam|vietnam/i.test(last) ? prev : last;
    const detail = parts.slice(0, 2).join(', ');
    return { city: cityPart.replace(/^(tỉnh|thành phố|tp\.?)\s+/i, ''), detail: detail || raw };
  }
  return { city: raw, detail: '' };
}

function statusBadgeTone(status: string): string {
  if (status === 'APPROVED' || status === 'CUSTOMER_ACCEPTED') return 'rr-badge--ok';
  if (status === 'CUSTOMER_REJECTED') return 'rr-badge--bad';
  return 'rr-badge--warn';
}

// ============================================================================
// Main Component
// ============================================================================
export function ReviewInbox({ role, button }: { role: Reviewer; button: string }) {
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [selected, setSelected] = useState<ReviewDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  const refresh = () => {
    setBusy(true);
    return requestReviewApi
      .queue(role)
      .then((rows) => {
        setQueue(Array.isArray(rows) ? rows : []);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('rts_requests_updated'));
        }
      })
      .catch((err) => setError(apiMessage(err)))
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    let current = true;
    const load = () =>
      requestReviewApi
        .queue(role)
        .then((rows) => {
          if (current) setQueue(Array.isArray(rows) ? rows : []);
        })
        .catch((err) => {
          if (current) setError(apiMessage(err));
        });
    void load();
    const timer = setInterval(load, 15000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [role]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function completed(review: ReviewDetail) {
    setSelected(review.status === 'SPECIALIST_PENDING' && role === 'specialist' ? review : null);
    await refresh();
  }

  const isCoord = role === 'coordinator';

  const filteredQueue = useMemo(() => {
    if (!queue) return [];
    const q = search.trim().toLowerCase();
    if (!q) return queue;
    return queue.filter((item) => {
      const matchId = item.requestId.toLowerCase().includes(q);
      const matchOrigin = item.origin.toLowerCase().includes(q);
      const matchDest = item.destination.toLowerCase().includes(q);
      const matchRev = `rev ${item.requestRevision}`.toLowerCase().includes(q);
      return matchId || matchOrigin || matchDest || matchRev;
    });
  }, [queue, search]);

  return (
    <div className="request-review-wrap">
      {selected ? (
        <button
          type="button"
          className="rr-back"
          onClick={() => {
            setSelected(null);
            setError('');
          }}
        >
          ← Quay lại danh sách thẩm định
        </button>
      ) : null}

      <div className="rr-header">
        <div>
          {selected ? (
            <>
              <h2 className="rr-header__title">
                <span>{selected.requestId}</span>
                <span className={`rr-badge ${statusBadgeTone(selected.status)}`}>
                  {reviewStatus[selected.status] || selected.status}
                </span>
              </h2>
              <p className="rr-header__subtitle">
                Rev {selected.requestRevision} • {parseLocation(selected.origin).city} → {parseLocation(selected.destination).city} • {reviewMode(selected.mode)} • {selected.horseCount} cá thể • Lịch dự kiến {reviewDay(selected.expectedTransportDate)} → {reviewDay(selected.expectedDeliveryDate)}
              </p>
            </>
          ) : (
            <>
              <h2 className="rr-header__title">
                <span>{isCoord ? 'Thẩm định yêu cầu vận chuyển' : 'Thẩm định hồ sơ & y tế'}</span>
                {queue !== null && queue.length > 0 && (
                  <span className="rr-badge rr-badge--warn">{queue.length} chờ xử lý</span>
                )}
              </h2>
              <p className="rr-header__subtitle">
                {isCoord
                  ? 'Kiểm tra năng lực phương tiện, lịch trình và đề xuất phương án vận chuyển trước khi ký hợp đồng.'
                  : 'Xác minh danh mục hồ sơ y tế và kiểm dịch từng cá thể ngựa trước khi ký hợp đồng.'}
              </p>
            </>
          )}
        </div>

        <div className="rr-header__actions">
          {selected ? (
            <button
              type="button"
              className="rr-btn rr-btn--outline"
              disabled={busy}
              title={busy ? 'Đang tải dữ liệu' : undefined}
              onClick={() =>
                void run(async () => setSelected(await requestReviewApi.detail(role, selected.reviewId)))
              }
            >
              <IconRefresh spinning={busy} /> <span>Tải lại dữ liệu</span>
            </button>
          ) : (
            <button
              type="button"
              className="rr-btn rr-btn--outline"
              disabled={busy}
              title={busy ? 'Đang tải dữ liệu' : undefined}
              onClick={() => void refresh()}
            >
              <IconRefresh spinning={busy} /> <span>Làm mới</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rr-note rr-note--error" role="alert">
          <IconAlert />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="rr-note rr-note--ok" role="status">
          <IconCheck />
          <span>{notice}</span>
        </div>
      )}

      {/* List Queue View */}
      {!selected && (
        <div className="rr-card rr-card--table">
          <div className="rr-t-tools">
            <h3 className="rr-card__title">Danh sách chờ thẩm định</h3>
            {queue !== null && queue.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <label className="rr-search">
                  <IconSearch />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm mã yêu cầu, địa điểm..."
                  />
                  {search && (
                    <button
                      type="button"
                      className="rr-search-clear"
                      onClick={() => setSearch('')}
                      aria-label="Xóa tìm kiếm"
                    >
                      <IconX />
                    </button>
                  )}
                </label>
                <span style={{ fontSize: 12, color: 'var(--text-muted, #64748b)' }}>
                  {filteredQueue.length} / {queue.length}
                </span>
              </div>
            )}
          </div>

          {queue === null && !error && (
            <div className="rr-empty">
              <b>Đang tải danh sách yêu cầu…</b>
            </div>
          )}

          {queue !== null && queue.length === 0 && (
            <div className="rr-empty">
              <b>Không có yêu cầu nào cần thẩm định</b>
              <span>Các yêu cầu mới được Quản lý giao sẽ hiển thị tại đây.</span>
            </div>
          )}

          {queue !== null && queue.length > 0 && filteredQueue.length === 0 && (
            <div className="rr-empty">
              <b>Không tìm thấy yêu cầu phù hợp với "{search}"</b>
              <div style={{ marginTop: 12 }}>
                <button type="button" className="rr-btn rr-btn--outline rr-btn--sm" onClick={() => setSearch('')}>
                  Xóa tìm kiếm
                </button>
              </div>
            </div>
          )}

          {queue !== null && filteredQueue.length > 0 && (
            <div className="rr-table-wrap">
              <table className="rr-table">
                <thead>
                  <tr>
                    <th>Mã yêu cầu</th>
                    <th>Tuyến vận chuyển</th>
                    <th>Ngày nhận ngựa</th>
                    <th>Trạng thái</th>
                    <th aria-label="Thao tác" />
                  </tr>
                </thead>
                <tbody>
                  {filteredQueue.map((row) => {
                    const origLoc = parseLocation(row.origin);
                    const destLoc = parseLocation(row.destination);
                    const open = () =>
                      void run(async () => setSelected(await requestReviewApi.detail(role, row.reviewId)));

                    return (
                      <tr key={row.reviewId} className="rr-inbox-row" onClick={busy ? undefined : open}>
                        <td>
                          <b style={{ color: 'var(--text-primary, #0f172a)' }}>{row.requestId}</b>
                          <small className="rr-inbox-sub">Rev {row.requestRevision}</small>
                        </td>
                        <td>
                          <div className="rr-inbox-route">
                            <b>{origLoc.city}</b>
                            <span className="rr-inbox-route__arrow">→</span>
                            <b>{destLoc.city}</b>
                          </div>
                          <small className="rr-inbox-sub" title={`${row.origin} → ${row.destination}`}>
                            {[origLoc.detail, destLoc.detail].filter(Boolean).join(' → ')}
                          </small>
                        </td>
                        <td>{reviewDay(row.expectedTransportDate)}</td>
                        <td>
                          <span className="rr-badge rr-badge--warn">
                            {isCoord ? 'Chờ Điều phối' : 'Chờ Chuyên viên'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="rr-btn rr-btn--outline rr-btn--sm"
                            disabled={busy}
                            title={busy ? 'Đang tải dữ liệu' : undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                              open();
                            }}
                          >
                            <span>Thẩm định</span>
                            <IconArrowRight />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detail Review View */}
      {selected && (
        isCoord ? (
          <CoordinatorDetailView
            review={selected}
            button={button}
            busy={busy}
            submit={(action) =>
              run(async () => {
                const done = await action();
                await completed(done);
                notifySync();
                setNotice(`Đã gửi kết quả thẩm định yêu cầu ${done.requestId} thành công.`);
              })
            }
          />
        ) : (
          <SpecialistDetailView
            review={selected}
            button={button}
            busy={busy}
            submit={(action) =>
              run(async () => {
                const done = await action();
                await completed(done);
                notifySync();
                setNotice(`Đã gửi đánh giá hồ sơ yêu cầu ${done.requestId} thành công.`);
              })
            }
            download={(action) => run(action)}
          />
        )
      )}
    </div>
  );
}

type Submit = (action: () => Promise<ReviewDetail>) => Promise<void>;
interface FormProps {
  review: ReviewDetail;
  button: string;
  busy: boolean;
  submit: Submit;
}

function OverviewInfoCard({ review }: { review: ReviewDetail }) {
  const orig = parseLocation(review.origin);
  const dest = parseLocation(review.destination);

  return (
    <div className="rr-card">
      <div className="rr-card__head">
        <h3 className="rr-card__title">Thông tin hồ sơ yêu cầu</h3>
        <span className="rr-badge rr-badge--neutral">Rev {review.requestRevision}</span>
      </div>

      <div className="rr-route">
        <div className="rr-address-box">
          <div className="rr-address-box__tag">
            <span className="rr-address-box__dot" />
            Điểm nhận (Điểm đi)
          </div>
          <div className="rr-address-box__city">{orig.city}</div>
          <div className="rr-address-box__detail">{review.origin}</div>
        </div>

        <div className="rr-route__link" aria-hidden="true">
          <span className="rr-route__line" />
          <span className="rr-route__mode">{reviewMode(review.mode)}</span>
          <span className="rr-route__line" />
        </div>

        <div className="rr-address-box">
          <div className="rr-address-box__tag">
            <span className="rr-address-box__dot rr-address-box__dot--to" />
            Điểm giao (Điểm đến)
          </div>
          <div className="rr-address-box__city">{dest.city}</div>
          <div className="rr-address-box__detail">{review.destination}</div>
        </div>
      </div>

      <div className="rr-kv-grid">
        <div className="rr-kv-cell">
          <div className="rr-kv-cell__label">Mã yêu cầu</div>
          <div className="rr-kv-cell__value">{review.requestId}</div>
        </div>
        <div className="rr-kv-cell">
          <div className="rr-kv-cell__label">Phương thức vận chuyển</div>
          <div className="rr-kv-cell__value">{reviewMode(review.mode)}</div>
        </div>
        <div className="rr-kv-cell">
          <div className="rr-kv-cell__label">Số lượng ngựa</div>
          <div className="rr-kv-cell__value">{review.horseCount} cá thể</div>
        </div>
        <div className="rr-kv-cell">
          <div className="rr-kv-cell__label">Ngày nhận ngựa dự kiến</div>
          <div className="rr-kv-cell__value">{reviewDay(review.expectedTransportDate)}</div>
        </div>
        <div className="rr-kv-cell">
          <div className="rr-kv-cell__label">Ngày giao ngựa dự kiến</div>
          <div className="rr-kv-cell__value">{reviewDay(review.expectedDeliveryDate)}</div>
        </div>
      </div>
    </div>
  );
}

function CoordinatorDetailView({ review, button: _button, busy, submit }: FormProps) {
  const [alternative, setAlternative] = useState(false);
  const [originalResult, setOriginalResult] = useState<Feasibility | ''>('');

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? '');
    const res = originalResult || (value('originalResult') as Feasibility);
    if (!res) return;

    void submit(() =>
      requestReviewApi.coordinator(
        review.reviewId,
        review.requestRevision,
        { result: res, reason: value('originalReason') },
        alternative
          ? {
              mode: value('mode') as Mode,
              expectedTransportDate: value('pickup'),
              expectedDeliveryDate: value('delivery'),
              result: 'FEASIBLE',
              reason: value('alternativeReason'),
            }
          : null
      )
    );
  }

  const vehicles = review.resources?.vehicles || [];

  return (
    <div className="rr-main-grid">
      <div className="rr-stack">
        <OverviewInfoCard review={review} />

        {review.status === 'COORDINATOR_PENDING' ? (
          <form onSubmit={onSubmit} className="rr-stack">
            <div className="rr-card">
              <div className="rr-card__head">
                <h3 className="rr-card__title">
                  Đánh giá tính khả thi theo lịch khách yêu cầu ({reviewMode(review.mode)})
                </h3>
              </div>
              <div className="rr-schedule">
                <span>Lịch trình mong muốn</span>
                <b>{reviewDay(review.expectedTransportDate)}</b>
                <span aria-hidden="true">→</span>
                <b>{reviewDay(review.expectedDeliveryDate)}</b>
              </div>

              <div className="rr-field">
                <span className="rr-field-label rr-step">
                  <i>1</i>Kết luận thẩm định của Điều phối <span className="required">*</span>
                </span>
                <div className="rr-pick-grid">
                  <label className={`rr-pick ${originalResult === 'FEASIBLE' ? 'selected ok' : ''}`}>
                    <input
                      type="radio"
                      name="originalResult"
                      value="FEASIBLE"
                      checked={originalResult === 'FEASIBLE'}
                      onChange={() => {
                        setOriginalResult('FEASIBLE');
                        setAlternative(false);
                      }}
                      required
                    />
                    <div className="rr-pick__body">
                      <b>Khả thi – Đủ năng lực đáp ứng</b>
                      <span>Đội xe chuyên dụng và tổ lái sẵn sàng theo đúng lịch trình khách yêu cầu.</span>
                    </div>
                  </label>

                  <label className={`rr-pick ${originalResult === 'NOT_FEASIBLE' ? 'selected bad' : ''}`}>
                    <input
                      type="radio"
                      name="originalResult"
                      value="NOT_FEASIBLE"
                      checked={originalResult === 'NOT_FEASIBLE'}
                      onChange={() => {
                        setOriginalResult('NOT_FEASIBLE');
                        setAlternative(true);
                      }}
                      required
                    />
                    <div className="rr-pick__body">
                      <b>Không khả thi – Cần đổi lịch / phương án</b>
                      <span>Thiếu xe chuyên dụng, tổ lái chưa kịp phân bổ hoặc lịch trình giao nhận quá gấp.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="rr-field rr-section">
                <label htmlFor="rr-orig-reason" className="rr-step">
                  <i>2</i>Căn cứ &amp; lý do đánh giá <span className="required">*</span>
                </label>
                <textarea
                  id="rr-orig-reason"
                  className="rr-textarea"
                  name="originalReason"
                  required
                  maxLength={2000}
                  placeholder="Nêu rõ tình trạng xe, lịch trình hoặc năng lực đáp ứng của đội vận tải..."
                />
              </div>

              <div className="rr-section rr-section--divided">
                <label className="rr-check-line">
                  <input
                    type="checkbox"
                    checked={alternative}
                    onChange={(e) => setAlternative(e.target.checked)}
                  />
                  <span><i className="rr-step-num">3</i>Đề xuất phương án vận chuyển thay thế (nếu lịch ban đầu không khả thi)</span>
                </label>

                {alternative && (
                  <div className="rr-alt-body">
                    <div className="rr-grid-3">
                      <div className="rr-field">
                        <label htmlFor="rr-alt-mode">Phương thức đề xuất <span className="required">*</span></label>
                        <select id="rr-alt-mode" className="rr-select" name="mode" defaultValue={review.mode}>
                          <option value="ROAD">Đường bộ</option>
                          <option value="AIR">Hàng không</option>
                        </select>
                      </div>
                      <div className="rr-field">
                        <label htmlFor="rr-alt-pickup">Ngày nhận ngựa mới <span className="required">*</span></label>
                        <DateInput id="rr-alt-pickup" className="rr-input" name="pickup" required />
                      </div>
                      <div className="rr-field">
                        <label htmlFor="rr-alt-delivery">Ngày giao ngựa mới <span className="required">*</span></label>
                        <DateInput id="rr-alt-delivery" className="rr-input" name="delivery" required />
                      </div>
                    </div>
                    <div className="rr-field">
                      <label htmlFor="rr-alt-reason">Lý do đề xuất phương án thay thế <span className="required">*</span></label>
                      <textarea
                        id="rr-alt-reason"
                        className="rr-textarea"
                        name="alternativeReason"
                        required
                        maxLength={2000}
                        placeholder="Giải thích vì sao đổi lịch..."
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="rr-form-actions">
                <button
                  type="submit"
                  className="rr-btn rr-btn--primary"
                  disabled={busy || !originalResult}
                  title={!originalResult ? 'Vui lòng chọn kết luận thẩm định trước khi gửi' : busy ? 'Đang gửi kết quả' : undefined}
                >
                  <span>{busy ? 'Đang gửi kết quả...' : 'Hoàn tất & Gửi kết quả thẩm định'}</span>
                  <IconArrowRight />
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="rr-note rr-note--info">
            <span>Yêu cầu này đã được Điều phối gửi thẩm định. Đang chờ bước tiếp theo từ Chuyên viên hoặc Quản lý.</span>
          </div>
        )}
      </div>

      {/* Right Column: Available Resources */}
      <div className="rr-stack rr-aside">
        <div className="rr-card">
          <div className="rr-card__head">
            <h3 className="rr-card__title">
              <IconTruck /> Xe chuyên dụng sẵn sàng
            </h3>
            <span className="rr-badge rr-badge--neutral">{vehicles.length}</span>
          </div>
          {vehicles.length ? (
            <ul className="rr-res-list">
              {vehicles.map((v) => (
                <li key={v.id} className="rr-res-item">
                  <div>
                    <b>{v.plateNumber || v.id}</b>
                    <small>Khu vực: {v.operatingCountry}</small>
                  </div>
                  <span className="rr-badge rr-badge--ok">{v.capacityStalls} ô ngựa</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rr-muted">
              Chưa có xe chuyên dụng phù hợp trong danh mục.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SpecialistDetailView({
  review,
  button,
  busy,
  submit,
  download,
}: FormProps & { download: (action: () => Promise<void>) => void }) {
  const feasibleOptions = review.options.filter((option) => option.coordinatorResult === 'FEASIBLE');

  return (
    <div className="rr-stack">
      <OverviewInfoCard review={review} />
      {feasibleOptions.map((option) => (
        <SpecialistForm
          key={option.scheduleOptionId + option.checklistVersion}
          review={review}
          option={option}
          button={button}
          busy={busy}
          submit={submit}
          download={download}
        />
      ))}
    </div>
  );
}

function DocumentViewer({
  review,
  option,
  source,
  onClose,
  download,
}: {
  review: ReviewDetail;
  option: ScheduleOption;
  source: ChecklistSource;
  onClose: () => void;
  download: (action: () => Promise<void>) => void;
}) {
  const [file, setFile] = useState<{ url: string; type: string }>();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let created: string | undefined;
    setFile(undefined);
    setError('');
    requestReviewApi
      .preview(review.reviewId, option.scheduleOptionId, source)
      .then(({ blob, type }) => {
        if (!active) return;
        created = URL.createObjectURL(blob);
        setFile({ url: created, type });
      })
      .catch((e) => active && setError(apiMessage(e)));
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [review.reviewId, option.scheduleOptionId, source]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const title = documentName[source.documentType] || source.documentType;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Xem ${title}`}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 12, width: 'min(960px, 100%)', height: 'min(88vh, 100%)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <strong style={{ flex: 1 }}>{title} • {source.horseName}</strong>
          <button type="button" className="rr-btn rr-btn--outline rr-btn--sm" disabled={!file} onClick={() => download(() => requestReviewApi.file(review.reviewId, option.scheduleOptionId, source))}>
            <IconDownload /> Tải về
          </button>
          <button type="button" className="rr-btn rr-btn--outline rr-btn--sm" onClick={onClose}>Đóng</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', overflow: 'auto' }}>
          {error ? (
            <span role="alert" style={{ color: '#b91c1c' }}>{error}</span>
          ) : !file ? (
            <span>Đang tải tài liệu...</span>
          ) : file.type === 'application/pdf' ? (
            <iframe title={title} src={file.url} style={{ width: '100%', height: '100%', border: 0 }} />
          ) : (
            <img alt={title} src={file.url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          )}
        </div>
      </div>
    </div>
  );
}

function SpecialistForm({
  review,
  option,
  button: _button,
  busy,
  submit,
  download,
}: FormProps & { option: ScheduleOption; download: (action: () => Promise<void>) => void }) {
  const [viewing, setViewing] = useState<ChecklistSource | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({});
  const [result, setResult] = useState<SpecialistResult | ''>('');
  const sources = option.checklist ?? [];
  const title = option.isOriginal ? 'Phương án theo lịch khách yêu cầu' : 'Phương án theo lịch đề xuất';

  const groupedByHorse: Record<string, { horseName: string; items: ChecklistSource[] }> = {};
  for (const s of sources) {
    if (!groupedByHorse[s.horseId]) {
      groupedByHorse[s.horseId] = { horseName: s.horseName, items: [] };
    }
    groupedByHorse[s.horseId].items.push(s);
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!result || !option.checklistVersion) return;
    const form = new FormData(event.currentTarget);
    const items: ChecklistAssessment[] = sources.map((source) => {
      const id = source.checklistItemId;
      return {
        checklistItemId: id,
        status: statuses[id],
        reason: String(form.get(id + ':reason') || '') || null,
        requiredByDate: String(form.get(id + ':due') || '') || null,
        estimatedProcessingDays: null,
      };
    });
    void submit(() =>
      requestReviewApi.specialist(review.reviewId, option.scheduleOptionId, {
        requestRevision: review.requestRevision,
        checklistVersion: option.checklistVersion!,
        result,
        note: String(form.get('note') || ''),
        items,
      })
    );
  };

  return (
    <div className="rr-stack">
      <div className="rr-card">
        <div className="rr-card__head" style={{ marginBottom: 6 }}>
          <h3 className="rr-card__title">
            {title} ({reviewMode(option.mode)})
          </h3>
          <span className={`rr-badge ${option.coordinatorResult === 'FEASIBLE' ? 'rr-badge--ok' : 'rr-badge--bad'}`}>
            Điều phối: {reviewResult[option.coordinatorResult] || option.coordinatorResult}
          </span>
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: 12.5 }}>
          Lịch trình: <b>{reviewDay(option.expectedTransportDate)}</b> → <b>{reviewDay(option.expectedDeliveryDate)}</b> • Ghi chú Điều phối: {option.coordinatorReason || '—'}
        </p>
      </div>

      {option.specialistResult ? (
        <div className="rr-note rr-note--ok">
          <IconCheck />
          <span>
            Chuyên viên đã gửi đánh giá: <b>{reviewResult[option.specialistResult] || option.specialistResult}</b>
            {option.specialistNote ? ` • Ghi chú: ${option.specialistNote}` : ''}
          </span>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="rr-stack">
          {Object.entries(groupedByHorse).map(([horseId, group]) => (
            <div key={horseId} className="rr-card rr-horse-card">
              <div className="rr-horse-card__head">
                <div className="rr-horse-card__title">
                  <span>Ngựa: {group.horseName}</span>
                  <span className="rr-badge rr-badge--neutral">Mã: {horseId}</span>
                </div>
                <span className="rr-badge rr-badge--info">{group.items.length} tài liệu</span>
              </div>

              <div>
                {group.items.map((source) => {
                  const id = source.checklistItemId;
                  const curStatus = statuses[id];
                  const needsPlan = curStatus === 'NEEDS_FOLLOW_UP' && source.stage === 'BEFORE_DEPARTURE';

                  return (
                    <div key={id} className="rr-doc-item">
                      <div className="rr-doc-item__top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span className="rr-doc-item__name">
                            {documentName[source.documentType] || source.documentType}
                          </span>
                          <span className="rr-badge rr-badge--info">
                            {documentStage[source.stage] || source.stage}
                          </span>
                          {source.expiryDate && (
                            <span className="rr-badge rr-badge--warn">
                              Hạn {reviewDay(source.expiryDate)}
                            </span>
                          )}
                        </div>

                        <div>
                          <button
                            type="button"
                            className="rr-btn rr-btn--outline rr-btn--sm"
                            disabled={!source.fileAvailable}
                            title={source.fileAvailable ? undefined : 'Khách chưa tải tệp lên'}
                            onClick={() => setViewing(source)}
                          >
                            <IconEye /> Xem tài liệu
                          </button>
                        </div>
                      </div>
                      {source.healthNotes && (
                        <p style={{ margin: '6px 0 10px', fontSize: 13, color: 'var(--text-secondary, #475569)' }}>
                          <b>Ghi chú sức khỏe:</b> {source.healthNotes}
                        </p>
                      )}

                      <div className="rr-grid-2">
                        <div className="rr-field">
                          <label>Trạng thái thẩm định <span className="required">*</span></label>
                          <select
                            className="rr-select"
                            required
                            value={statuses[id] ?? ''}
                            onChange={(e) => setStatuses({ ...statuses, [id]: e.target.value as ItemStatus })}
                          >
                            <option value="" disabled>Chọn trạng thái</option>
                            {Object.entries(itemStatus)
                              .filter(([key]) => key !== 'NEEDS_FOLLOW_UP' || source.stage === 'BEFORE_DEPARTURE')
                              .map(([key, label]) => (
                                <option key={key} value={key} disabled={key === 'VERIFIED' && !source.usable}>
                                  {label}
                                </option>
                              ))}
                          </select>
                          {!source.usable && (
                            <small style={{ color: 'var(--text-muted, #64748b)' }}>
                              {source.fileAvailable
                                ? 'Không chọn được "Đã xác minh" vì giấy tờ không còn hiệu lực.'
                                : 'Không chọn được "Đã xác minh" vì khách chưa tải tệp lên.'}
                            </small>
                          )}
                        </div>

                        {curStatus && curStatus !== 'VERIFIED' && (
                          <div className="rr-field">
                            <label>
                              Lý do chưa đạt / ghi chú <span className="required">*</span>
                            </label>
                            <input
                              className="rr-input"
                              name={id + ':reason'}
                              maxLength={2000}
                              placeholder="Nêu rõ lý do chưa đạt..."
                              required={source.stage !== 'OPTIONAL'}
                            />
                          </div>
                        )}

                        {needsPlan && (
                          <div className="rr-field" style={{ gridColumn: '1 / -1' }}>
                            <label>
                              Hạn khách nộp lại giấy tờ <span className="required">*</span>
                            </label>
                            <DateInput
                              className="rr-input"
                              name={id + ':due'}
                              min={new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })}
                              max={option.expectedTransportDate}
                              required
                            />
                            <small style={{ color: 'var(--text-muted, #64748b)' }}>
                              Giấy tờ chưa đủ điều kiện. Khách hàng phải bổ sung muộn nhất trước ngày nhận ngựa ({reviewDay(option.expectedTransportDate)}).
                            </small>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {viewing && (
            <DocumentViewer
              review={review}
              option={option}
              source={viewing}
              onClose={() => setViewing(null)}
              download={download}
            />
          )}

          <div className="rr-card">
            <div className="rr-card__head">
              <h3 className="rr-card__title">Kết luận tổng thể hồ sơ</h3>
            </div>
            <div className="rr-grid-2">
              <div className="rr-field">
                <label>Kết luận hồ sơ <span className="required">*</span></label>
                <select
                  className="rr-select"
                  required
                  value={result}
                  onChange={(e) => setResult(e.target.value as SpecialistResult)}
                >
                  <option value="" disabled>Chọn kết luận tổng thể</option>
                  {Object.entries(reviewResult).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rr-field">
                <label>
                  Ghi chú gửi Quản lý
                  {result && result !== 'FEASIBLE' && <span className="required"> *</span>}
                </label>
                <textarea
                  className="rr-textarea"
                  name="note"
                  required={!!result && result !== 'FEASIBLE'}
                  maxLength={2000}
                  placeholder="Ý kiến chuyên môn gửi Quản lý xem xét..."
                />
              </div>
            </div>

            <div className="rr-form-actions">
              <button
                type="submit"
                className="rr-btn rr-btn--primary"
                disabled={busy || !result}
                title={!result ? 'Vui lòng chọn kết luận tổng thể trước khi gửi' : busy ? 'Đang gửi đánh giá' : undefined}
              >
                {busy ? 'Đang gửi...' : 'Gửi đánh giá hồ sơ'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default ReviewInbox;
