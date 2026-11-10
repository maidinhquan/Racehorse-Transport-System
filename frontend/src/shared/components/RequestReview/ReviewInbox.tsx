import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { apiMessage } from '../../api/contractClient';
import { requestReviewApi } from '../../api/requestReviewApi';
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

// SVG Icons
const IconCheck: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconAlert: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconArrowLeft: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const IconRefresh: React.FC<{ spinning?: boolean }> = ({ spinning }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transform: spinning ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s ease' }}
  >
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const IconDownload: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconTruck: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const IconPlane: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  </svg>
);

export function ReviewInbox({ role, button }: { role: Reviewer; button: string }) {
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [selected, setSelected] = useState<ReviewDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = () => {
    setBusy(true);
    return requestReviewApi
      .queue(role)
      .then(setQueue)
      .catch((err) => setError(apiMessage(err)))
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    let current = true;
    const load = () =>
      requestReviewApi
        .queue(role)
        .then((rows) => {
          if (current) setQueue(rows);
        })
        .catch((err) => {
          if (current) setError(apiMessage(err));
        });
    void load();
    const timer = setInterval(load, 20000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [role]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
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

  return (
    <div className="request-review-wrap">
      {/* Top Header */}
      <div className="rr-header">
        <div>
          <h2 className="rr-header__title">
            {isCoord ? 'Thẩm định yêu cầu vận chuyển (Điều phối)' : 'Thẩm định hồ sơ & y tế (Chuyên viên)'}
            {queue !== null && (
              <span className="rr-badge rr-badge--orange">
                {queue.length} yêu cầu chờ xử lý
              </span>
            )}
          </h2>
          <p className="rr-header__subtitle">
            {isCoord
              ? 'Thẩm định tính khả thi về xe chuyên dụng, tổ lái và chuyến bay trước khi Logistics Manager phát hành hợp đồng.'
              : 'Thẩm định hồ sơ nhận dạng, hộ chiếu FEI, chứng nhận tiêm phòng và kiểm dịch y tế cho từng cá thể ngựa.'}
          </p>
        </div>
        <div className="rr-header__actions">
          {selected ? (
            <>
              <button
                type="button"
                className="rr-btn rr-btn--outline"
                onClick={() => {
                  setSelected(null);
                  setError('');
                }}
              >
                <IconArrowLeft /> Quay lại danh sách
              </button>
              <button
                type="button"
                className="rr-btn rr-btn--outline"
                disabled={busy}
                onClick={() =>
                  void run(async () => setSelected(await requestReviewApi.detail(role, selected.reviewId)))
                }
              >
                <IconRefresh spinning={busy} /> Tải lại dữ liệu
              </button>
            </>
          ) : (
            <button
              type="button"
              className="rr-btn rr-btn--outline"
              disabled={busy}
              onClick={() => void refresh()}
            >
              <IconRefresh spinning={busy} /> Làm mới
            </button>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="rr-alert rr-alert--error" role="alert">
          <IconAlert />
          <span>{error}</span>
        </div>
      )}

      {/* List Queue View */}
      {!selected && (
        <div className="rr-card rr-card--table">
          <div className="rr-card__header">
            <h3 className="rr-card__title">
              Danh sách yêu cầu cần thẩm định
            </h3>
            {queue !== null && <span className="rr-badge rr-badge--neutral">{queue.length} bản ghi</span>}
          </div>

          {queue === null && !error && (
            <div className="rr-empty">
              <div className="rr-empty__icon">
                <IconRefresh spinning />
              </div>
              <p className="rr-empty__title">Đang tải danh sách yêu cầu…</p>
              <p className="rr-empty__text">Vui lòng chờ trong giây lát.</p>
            </div>
          )}

          {queue !== null && queue.length === 0 && (
            <div className="rr-empty">
              <div className="rr-empty__icon">
                <IconCheck />
              </div>
              <p className="rr-empty__title">Không có yêu cầu nào cần thẩm định</p>
              <p className="rr-empty__text">Mọi yêu cầu được giao đều đã được xử lý xong hoặc đang chờ khách hàng phản hồi.</p>
            </div>
          )}

          {queue !== null && queue.length > 0 && (
            <div className="rr-table-wrap">
              <table className="rr-table">
                <thead>
                  <tr>
                    <th>Mã yêu cầu</th>
                    <th>Tuyến vận chuyển</th>
                    <th>Ngày nhận ngựa dự kiến</th>
                    <th>Phiên bản</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((row) => (
                    <tr key={row.reviewId}>
                      <td>
                        <b style={{ color: '#0f172a' }}>{row.requestId}</b>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{row.origin}</span>
                          <span style={{ color: '#94a3b8' }}>→</span>
                          <b>{row.destination}</b>
                        </div>
                      </td>
                      <td>
                        <span className="rr-badge rr-badge--info">
                          {reviewDay(row.expectedTransportDate)}
                        </span>
                      </td>
                      <td>
                        <span className="rr-badge rr-badge--neutral">Rev {row.requestRevision}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="rr-btn rr-btn--primary rr-btn--sm"
                          disabled={busy}
                          onClick={() =>
                            void run(async () =>
                              setSelected(await requestReviewApi.detail(role, row.reviewId))
                            )
                          }
                        >
                          Mở thẩm định →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detail Review View */}
      {selected && (
        <>
          {/* Overview summary bar */}
          <div className="rr-card" style={{ padding: '20px 24px' }}>
            <h3 className="rr-card__title" style={{ marginBottom: 14 }}>
              Thông tin yêu cầu #{selected.requestId}
            </h3>
            <div className="rr-overview-bar">
              <div className="rr-overview-item">
                <span>Tuyến đường</span>
                <b>{selected.origin} → {selected.destination}</b>
              </div>
              <div className="rr-overview-item">
                <span>Số lượng ngựa</span>
                <b>{selected.horseCount} cá thể</b>
              </div>
              <div className="rr-overview-item">
                <span>Phương thức</span>
                <b>{reviewMode(selected.mode)}</b>
              </div>
              <div className="rr-overview-item">
                <span>Lịch nhận → giao</span>
                <b>{reviewDay(selected.expectedTransportDate)} → {reviewDay(selected.expectedDeliveryDate)}</b>
              </div>
              <div className="rr-overview-item">
                <span>Trạng thái</span>
                <div>
                  <span className="rr-badge rr-badge--warn">
                    {reviewStatus[selected.status] || selected.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Coordinator or Specialist Specific Forms */}
            {isCoord ? (
              <CoordinatorForm
                review={selected}
                button={button}
                busy={busy}
                submit={(action) => run(async () => completed(await action()))}
              />
            ) : (
              selected.options
                .filter((option) => option.coordinatorResult === 'FEASIBLE')
                .map((option) => (
                  <SpecialistForm
                    key={option.scheduleOptionId + option.checklistVersion}
                    review={selected}
                    option={option}
                    button={button}
                    busy={busy}
                    submit={(action) => run(async () => completed(await action()))}
                    download={(action) => run(action)}
                  />
                ))
            )}
          </div>
        </>
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

function CoordinatorForm({ review, button: _button, busy, submit }: FormProps) {
  const [alternative, setAlternative] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? '');
    void submit(() =>
      requestReviewApi.coordinator(
        review.reviewId,
        review.requestRevision,
        { result: value('originalResult') as Feasibility, reason: value('originalReason') },
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

  function fields(prefix: 'original' | 'alternative') {
    return (
      <div className="rr-grid-2">
        <div className="rr-form-group">
          <label>
            Kết luận thẩm định <span className="required">*</span>
          </label>
          <select className="rr-select" name={prefix + 'Result'} required defaultValue="">
            <option value="" disabled>
              Chọn kết luận thẩm định
            </option>
            <option value="FEASIBLE">{reviewResult.FEASIBLE}</option>
            <option value="NOT_FEASIBLE">{reviewResult.NOT_FEASIBLE}</option>
          </select>
        </div>
        <div className="rr-form-group" style={{ gridColumn: 'span 2' }}>
          <label>
            Căn cứ / Lý do đánh giá <span className="required">*</span>
          </label>
          <textarea
            className="rr-textarea"
            name={prefix + 'Reason'}
            required
            maxLength={2000}
            placeholder="Nêu rõ tình trạng xe, lịch trình hoặc năng lực đáp ứng của đội vận tải..."
          />
        </div>
      </div>
    );
  }

  const vehicles = review.resources?.vehicles || [];
  const flights = review.resources?.flights || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Resources Collapsible Cards */}
      <div className="rr-grid-2">
        <details className="rr-details" open={vehicles.length > 0}>
          <summary>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconTruck /> Xe chuyên dụng sẵn sàng ({vehicles.length})
            </span>
          </summary>
          <div className="rr-details__content">
            {vehicles.length ? (
              <ul className="rr-details__list">
                {vehicles.map((v) => (
                  <li key={v.id} className="rr-details__item">
                    <div>
                      <b>{v.plateNumber || v.id}</b>
                      <span style={{ color: '#64748b', marginLeft: 8 }}>• Khu vực: {v.operatingCountry}</span>
                    </div>
                    <span className="rr-badge rr-badge--ok">{v.capacityStalls} ô ngựa</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#64748b', margin: 0 }}>Chưa có xe chuyên dụng phù hợp trong danh mục.</p>
            )}
          </div>
        </details>

        <details className="rr-details" open={flights.length > 0}>
          <summary>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconPlane /> Danh mục chuyến bay khả dụng ({flights.length})
            </span>
          </summary>
          <div className="rr-details__content">
            {flights.length ? (
              <ul className="rr-details__list">
                {flights.map((f) => (
                  <li key={f.id} className="rr-details__item">
                    <div>
                      <b>{f.airline} {f.providerFlightCode}</b>
                      <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                        {f.originAirportPlaceId} ({f.departureDate || 'Ngày dự kiến'} {f.departureTime}) → {f.destinationAirportPlaceId} ({f.arrivalTime})
                      </div>
                    </div>
                    <span className="rr-badge rr-badge--info">{f.capacityHorses} ngựa</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#64748b', margin: 0 }}>Chưa có chuyến bay phù hợp trong danh mục.</p>
            )}
          </div>
        </details>
      </div>

      {/* Coordinator Evaluation Form */}
      {review.status === 'COORDINATOR_PENDING' ? (
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="rr-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: 15, color: '#0f172a' }}>
              1. Đánh giá theo lịch khách yêu cầu ({reviewMode(review.mode)})
            </h4>
            <div style={{ marginBottom: 12, fontSize: 13, color: '#475569' }}>
              Thời gian mong muốn: <b>{reviewDay(review.expectedTransportDate)}</b> → <b>{reviewDay(review.expectedDeliveryDate)}</b>
            </div>
            {fields('original')}
          </div>

          <div
            className="rr-card"
            style={{
              background: alternative ? '#fffbeb' : '#ffffff',
              border: alternative ? '1px solid #fde68a' : '1px solid #e2e8f0',
              transition: 'all 0.2s ease',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={alternative}
                onChange={(e) => setAlternative(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#f57c00' }}
              />
              <span>Đề xuất phương án vận chuyển khác (nếu lịch khách không khả thi)</span>
            </label>

            {alternative && (
              <div style={{ marginTop: 16 }}>
                <div className="rr-grid-3" style={{ marginBottom: 14 }}>
                  <div className="rr-form-group">
                    <label>Phương thức đề xuất <span className="required">*</span></label>
                    <select className="rr-select" name="mode" defaultValue={review.mode}>
                      <option value="ROAD">Đường bộ</option>
                      <option value="AIR">Hàng không</option>
                    </select>
                  </div>
                  <div className="rr-form-group">
                    <label>Ngày nhận ngựa mới <span className="required">*</span></label>
                    <input className="rr-input" type="date" name="pickup" required />
                  </div>
                  <div className="rr-form-group">
                    <label>Ngày giao ngựa mới <span className="required">*</span></label>
                    <input className="rr-input" type="date" name="delivery" required />
                  </div>
                </div>
                <div className="rr-form-group">
                  <label>Lý do đề xuất lịch thay thế <span className="required">*</span></label>
                  <textarea
                    className="rr-textarea"
                    name="alternativeReason"
                    required
                    maxLength={2000}
                    placeholder="Giải thích rõ vì sao đổi lịch (VD: Đợi chuyến bay nối chuyến, xe chuyên dụng trống từ ngày...)"
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6 }}>
            <button
              type="submit"
              className="rr-btn rr-btn--primary"
              disabled={busy}
              style={{ minWidth: 160 }}
            >
              {busy ? 'Đang gửi...' : 'Gửi kết quả thẩm định'}
            </button>
          </div>
        </form>
      ) : (
        <div className="rr-alert rr-alert--info">
          <span>Yêu cầu này đã được Điều phối gửi thẩm định. Đang chờ bước tiếp theo từ Chuyên viên hoặc Quản lý.</span>
        </div>
      )}
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
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({});
  const [result, setResult] = useState<SpecialistResult | ''>('');
  const sources = option.checklist ?? [];
  const title = option.isOriginal ? 'Phương án theo lịch khách yêu cầu' : 'Phương án theo lịch đề xuất';

  // Group checklist items by horse
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Option Banner */}
      <div className="rr-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
          <h4 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>
            {title} ({reviewMode(option.mode)})
          </h4>
          <span className={`rr-badge ${option.coordinatorResult === 'FEASIBLE' ? 'rr-badge--ok' : 'rr-badge--bad'}`}>
            Điều phối: {reviewResult[option.coordinatorResult] || option.coordinatorResult}
          </span>
        </div>
        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>
          Lịch trình: {reviewDay(option.expectedTransportDate)} → {reviewDay(option.expectedDeliveryDate)} • Ghi chú Điều phối: <i>{option.coordinatorReason || '—'}</i>
        </p>
      </div>

      {option.specialistResult ? (
        <div className="rr-alert rr-alert--ok">
          <IconCheck />
          <span>
            Chuyên viên đã gửi đánh giá: <b>{reviewResult[option.specialistResult] || option.specialistResult}</b>
            {option.specialistNote ? ` • Ghi chú: ${option.specialistNote}` : ''}
          </span>
        </div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Horse Document Checklists */}
          <div>
            <h4 style={{ fontSize: 15, color: '#0f172a', margin: '0 0 12px 0' }}>
              Danh mục hồ sơ y tế & kiểm dịch từng cá thể ngựa ({sources.length} giấy tờ)
            </h4>

            {Object.entries(groupedByHorse).map(([horseId, group]) => (
              <div key={horseId} className="rr-horse-block">
                <div className="rr-horse-block__head">
                  <div className="rr-horse-block__title">
                    <span>🐴 {group.horseName}</span>
                    <span className="rr-badge rr-badge--neutral">ID: {horseId}</span>
                  </div>
                  <span className="rr-badge rr-badge--orange">{group.items.length} tài liệu</span>
                </div>

                <div>
                  {group.items.map((source) => {
                    const id = source.checklistItemId;
                    const curStatus = statuses[id];
                    const needsPlan = curStatus === 'NEEDS_FOLLOW_UP' && source.stage === 'BEFORE_DEPARTURE';

                    return (
                      <div key={id} className="rr-doc-item">
                        <div className="rr-doc-item__top">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                            {source.fileAvailable ? (
                              <button
                                type="button"
                                className="rr-btn rr-btn--sm rr-btn--download"
                                onClick={() =>
                                  download(() =>
                                    requestReviewApi.file(review.reviewId, option.scheduleOptionId, source)
                                  )
                                }
                              >
                                <IconDownload /> Tải tệp tài liệu
                              </button>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: 12 }}>Chưa đính kèm tệp</span>
                            )}
                          </div>
                        </div>

                        {/* Status selection and reason */}
                        <div className="rr-grid-2">
                          <div className="rr-form-group" style={{ margin: 0 }}>
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
                          </div>

                          {curStatus && curStatus !== 'VERIFIED' && (
                            <div className="rr-form-group" style={{ margin: 0 }}>
                              <label>
                                Lý do chưa đạt / ghi chú <span className="required">*</span>
                              </label>
                              <input
                                className="rr-input"
                                name={id + ':reason'}
                                maxLength={2000}
                                placeholder="VD: Hết hạn, thông tin không khớp hộ chiếu..."
                                required={source.stage !== 'OPTIONAL'}
                              />
                            </div>
                          )}

                          {needsPlan && (
                            <div className="rr-form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
                              <label>
                                Hạn khách nộp lại giấy tờ <span className="required">*</span>
                              </label>
                              <input
                                className="rr-input"
                                type="date"
                                name={id + ':due'}
                                min={new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })}
                                max={option.expectedTransportDate}
                                required
                              />
                              <small style={{ color: '#64748b', marginTop: 4 }}>
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
          </div>

          {/* Overall Specialist Conclusion Card */}
          <div className="rr-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: 15, color: '#0f172a' }}>
              Kết luận tổng thể hồ sơ
            </h4>
            <div className="rr-grid-2">
              <div className="rr-form-group">
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

              <div className="rr-form-group">
                <label>
                  Ghi chú gửi Logistics Manager
                  {result && result !== 'FEASIBLE' && <span className="required"> *</span>}
                </label>
                <textarea
                  className="rr-textarea"
                  name="note"
                  required={!!result && result !== 'FEASIBLE'}
                  maxLength={2000}
                  placeholder="Ý kiến chuyên môn gửi Manager để xem xét khi phê duyệt hoặc yêu cầu khách hàng bổ sung..."
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="submit"
              className="rr-btn rr-btn--primary"
              disabled={busy}
              style={{ minWidth: 180 }}
            >
              {busy ? 'Đang gửi...' : 'Gửi đánh giá hồ sơ'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default ReviewInbox;
