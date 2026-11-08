import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { apiMessage } from '../../../../../shared/api/contractClient';
import { requestReviewApi } from '../../../../../shared/api/requestReviewApi';
import type { ChangeReview, OptionKey, ScheduleOption } from '../../../../../shared/api/requestReviewApi';
import { itemStatus, reviewDay, reviewMode, reviewResult, reviewStatus, documentName } from '../../../../../shared/components/RequestReview/labels';
import '../../../../../shared/components/RequestReview/RequestReview.css';

type ManagerReview = Awaited<ReturnType<typeof requestReviewApi.manager>>;
interface Props {
  requestId: string;
  pending: boolean;
  accept: (key: OptionKey) => Promise<boolean>;
  changes: (text: string, key: ChangeReview) => Promise<boolean>;
  reject?: () => void;
}

export function RequestAssessmentPanel({ requestId, pending, accept, changes, reject }: Props) {
  const [state, setState] = useState<ManagerReview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [action, setAction] = useState('');
  useEffect(() => {
    let current = true;
    const refresh = () => requestReviewApi.manager(requestId).then(value => { if (current) setState(value); })
      .catch(error => { if (current) setError(apiMessage(error)); });
    void refresh();
    const timer = setInterval(refresh, 15000);
    return () => { current = false; clearInterval(timer); };
  }, [requestId, pending]);

  const review = state?.review;
  const working = review?.status === 'MANAGER_PENDING' || review?.status === 'CUSTOMER_ACCEPTED' || review?.status === 'CUSTOMER_REJECTED';
  const canRequestChanges = pending && working;

  async function run(command: () => Promise<boolean>) {
    setBusy(true);
    setError('');
    try {
      if (await command()) {
        setFeedback('');
        setAction('');
        setState(await requestReviewApi.manager(requestId));
      }
    } catch (error) { setError(apiMessage(error)); }
    finally { setBusy(false); }
  }

  function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    if (!state) return;
    void run(async () => {
      await requestReviewApi.assign(requestId, state.requestRevision, String(fields.get('coordinator')), String(fields.get('specialist')));
      return true;
    });
  }

  function canApprove(option: ScheduleOption) {
    return option.specialistResult === 'FEASIBLE' && (option.isOriginal ||
      (review?.status === 'CUSTOMER_ACCEPTED' && review.selectedOptionId === option.scheduleOptionId));
  }

  return <section className="request-review">
    <h3>Xét duyệt trước hợp đồng</h3>
    {error && <p role="alert">{error}</p>}
    {!state && !error && <p>Đang tải phiên xét duyệt…</p>}
    {state && !review && pending && <form onSubmit={assign}>
      <label>Điều phối<select name="coordinator" defaultValue="" required>
        <option value="" disabled>Chọn Điều phối</option>{state.coordinators.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
      </select></label>
      <label>Chuyên viên kiểm dịch<select name="specialist" defaultValue="" required>
        <option value="" disabled>Chọn Chuyên viên</option>{state.specialists.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
      </select></label>
      <div className="review-buttons"><button type="submit" className="mgr-btn mgr-btn--solid" disabled={busy}
        title={busy ? 'Đang phân công' : undefined}>Giao xét duyệt</button></div>
    </form>}
    {review && <>
      <p aria-live="polite">{reviewStatus[review.status]}{review.customerDeadlineUtc ? ` · Hạn ${new Date(review.customerDeadlineUtc).toLocaleString('vi-VN')}` : ''}</p>
      {review.options.map(option => <div key={option.scheduleOptionId} className="review-item review-rows">
        <b>{option.isOriginal ? 'Lịch khách yêu cầu' : option.coordinatorResult === 'FEASIBLE' ? 'Lịch đề xuất' : 'Phương án đã loại'} · {reviewMode(option.mode)}</b>
        <p>{reviewDay(option.expectedTransportDate)} → {reviewDay(option.expectedDeliveryDate)}</p>
        <p>Điều phối: {reviewResult[option.coordinatorResult]} · {option.coordinatorReason}</p>
        {option.specialistResult && <p>Chuyên viên: {reviewResult[option.specialistResult]}{option.specialistNote ? ` · ${option.specialistNote}` : ''}</p>}
        {!!option.assessment?.length && <div>
          <b>Kết quả thẩm định giấy tờ</b>
          <ul>{option.assessment.map(item => {
            const [horseId, type] = item.checklistItemId.split(':');
            return <li key={item.checklistItemId}>{horseId} · {documentName[type]} · {itemStatus[item.status]}
              {item.reason ? ` · ${item.reason}` : ''}{item.requiredByDate ? ` · Hạn ${reviewDay(item.requiredByDate)}` : ''}
              </li>;
          })}</ul>
        </div>}
        {pending && working && <div className="review-buttons">
          {canApprove(option) && <button type="button" className="mgr-btn mgr-btn--solid" disabled={busy}
            title={busy ? 'Đang lưu quyết định' : undefined}
            onClick={() => void run(() => accept({ reviewId: review.reviewId, requestRevision: review.requestRevision, scheduleOptionId: option.scheduleOptionId }))}>
            Chấp thuận lịch này</button>}
          {!option.isOriginal && review.status === 'MANAGER_PENDING' && option.specialistResult === 'FEASIBLE' &&
            <button type="button" className="mgr-btn" onClick={() => { setAction(option.scheduleOptionId); setFeedback(''); }}>Hỏi khách về lịch này</button>}
        </div>}
      </div>)}
      {canRequestChanges && <button type="button" className="mgr-btn"
        onClick={() => { setAction('SUPPLEMENT_DOCUMENTS'); setFeedback(''); }}>
        Yêu cầu khách bổ sung
      </button>}
      {canRequestChanges && action && <form onSubmit={event => {
        event.preventDefault();
        void run(() => changes(feedback, {
          reviewId: review.reviewId, requestRevision: review.requestRevision,
          action: action === 'SUPPLEMENT_DOCUMENTS' ? 'SUPPLEMENT_DOCUMENTS' : 'CONFIRM_SCHEDULE',
          ...(action === 'SUPPLEMENT_DOCUMENTS' ? {} : { scheduleOptionId: action }),
        }));
      }}>
        <label>Nội dung gửi khách<textarea required minLength={10} maxLength={2000} value={feedback} onChange={event => setFeedback(event.target.value)} /></label>
        <div className="review-buttons">
          <button type="submit" className="mgr-btn mgr-btn--solid" disabled={busy} title={busy ? 'Đang gửi' : undefined}>Gửi yêu cầu</button>
          <button type="button" className="mgr-btn" onClick={() => setAction('')}>Đóng</button>
        </div>
      </form>}
    </>}
    {reject && <div><button type="button" className="mgr-btn mgr-btn--danger" onClick={reject}>Từ chối yêu cầu</button></div>}
  </section>;
}
