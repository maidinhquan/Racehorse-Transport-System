import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { apiMessage } from '../../api/contractClient';
import { requestReviewApi } from '../../api/requestReviewApi';
import type { ChecklistAssessment, Feasibility, ItemStatus, Mode, QueueItem, ReviewDetail, Reviewer, ScheduleOption, SpecialistResult } from '../../api/requestReviewApi';
import { documentName, documentStage, itemStatus, reviewDay, reviewMode, reviewResult } from './labels';
import './RequestReview.css';

export function ReviewInbox({ role, button }: { role: Reviewer; button: string }) {
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [selected, setSelected] = useState<ReviewDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = () => requestReviewApi.queue(role).then(setQueue);
  useEffect(() => {
    let current = true;
    const load = () => requestReviewApi.queue(role).then(rows => { if (current) setQueue(rows); })
      .catch(error => { if (current) setError(apiMessage(error)); });
    void load();
    const timer = setInterval(load, 20000);
    return () => { current = false; clearInterval(timer); };
  }, [role]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try { await action(); } catch (error) { setError(apiMessage(error)); }
    finally { setBusy(false); }
  }

  async function completed(review: ReviewDetail) {
    setSelected(review.status === 'SPECIALIST_PENDING' && role === 'specialist' ? review : null);
    await refresh();
  }

  return <section className="request-review">
    <h3>Yêu cầu xét duyệt trước hợp đồng</h3>
    {error && <p role="alert">{error}</p>}
    {!selected && <>
      {queue === null && !error && <p>Đang tải yêu cầu…</p>}
      {queue?.length === 0 && <p>Chưa có yêu cầu được giao.</p>}
      {queue?.map(row => <div className="review-item" key={row.reviewId}>
        <b>{row.requestId}</b>
        <p>{row.origin} → {row.destination}</p>
        <div className="review-buttons">
          <span>Nhận ngựa {reviewDay(row.expectedTransportDate)}</span>
          <button type="button" className={button} disabled={busy} title={busy ? 'Đang tải yêu cầu' : undefined}
            onClick={() => void run(async () => setSelected(await requestReviewApi.detail(role, row.reviewId)))}>Mở xét duyệt</button>
        </div>
      </div>)}
    </>}
    {selected && <>
      <div className="review-buttons">
        <b>{selected.requestId}</b>
        <button type="button" className={button} onClick={() => { setSelected(null); setError(''); }}>Về danh sách</button>
        <button type="button" className={button} disabled={busy} title={busy ? 'Đang xử lý' : undefined}
          onClick={() => void run(async () => setSelected(await requestReviewApi.detail(role, selected.reviewId)))}>Tải lại</button>
      </div>
      <p>{selected.origin} → {selected.destination} · {selected.horseCount} ngựa</p>
      {role === 'coordinator'
        ? <CoordinatorForm review={selected} button={button} busy={busy} submit={action => run(async () => completed(await action()))} />
        : selected.options.filter(option => option.coordinatorResult === 'FEASIBLE').map(option =>
          <SpecialistForm key={option.scheduleOptionId + option.checklistVersion} review={selected} option={option} button={button}
            busy={busy} submit={action => run(async () => completed(await action()))} download={action => run(action)} />)}
    </>}
  </section>;
}

type Submit = (action: () => Promise<ReviewDetail>) => Promise<void>;
interface FormProps { review: ReviewDetail; button: string; busy: boolean; submit: Submit }

function CoordinatorForm({ review, button, busy, submit }: FormProps) {
  const [alternative, setAlternative] = useState(false);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? '');
    void submit(() => requestReviewApi.coordinator(review.reviewId, review.requestRevision,
      { result: value('originalResult') as Feasibility, reason: value('originalReason') },
      alternative ? {
        mode: value('mode') as Mode, expectedTransportDate: value('pickup'), expectedDeliveryDate: value('delivery'),
        result: 'FEASIBLE', reason: value('alternativeReason'),
      } : null));
  }

  function fields(prefix: 'original' | 'alternative') {
    return <>
      <label>Kết luận
        <select name={prefix + 'Result'} required defaultValue="">
          <option value="" disabled>Chọn kết luận</option>
          <option value="FEASIBLE">{reviewResult.FEASIBLE}</option><option value="NOT_FEASIBLE">{reviewResult.NOT_FEASIBLE}</option>
        </select>
      </label>
      <label>Lý do<textarea name={prefix + 'Reason'} required maxLength={2000} /></label>
    </>;
  }

  return <>
    <div className="review-columns">
      <details><summary>Xe sẵn sàng theo quốc gia và sức chứa ({review.resources?.vehicles.length ?? 0})</summary>
        {review.resources?.vehicles.length ? <ul>{review.resources.vehicles.map(vehicle =>
          <li key={vehicle.id}>{vehicle.plateNumber || vehicle.id} · {vehicle.operatingCountry} · {vehicle.capacityStalls} ô{vehicle.type ? ` · ${vehicle.type}` : ''}</li>)}</ul>
          : <p>Chưa có xe phù hợp trong danh mục.</p>}
      </details>
    </div>
    {review.status === 'COORDINATOR_PENDING' && <form onSubmit={onSubmit}>
      <fieldset disabled={busy}>
        <legend>Lịch khách yêu cầu</legend>
        <p>{reviewMode(review.mode)} · {reviewDay(review.expectedTransportDate)} → {reviewDay(review.expectedDeliveryDate)}</p>
        {fields('original')}
      </fieldset>
      <div className="review-buttons"><label><span><input type="checkbox" checked={alternative}
        onChange={event => setAlternative(event.target.checked)} /> Đề xuất lịch khác</span></label></div>
      {alternative && <fieldset disabled={busy}>
        <legend>Lịch đề xuất</legend>
        <div className="review-columns">
          <label>Phương thức<select name="mode" defaultValue={review.mode}><option value="ROAD">Đường bộ</option><option value="AIR">Hàng không</option></select></label>
          <label>Ngày nhận ngựa<input type="date" name="pickup" required /></label>
          <label>Ngày giao ngựa<input type="date" name="delivery" required /></label>
        </div>
        <p>Kết luận: Khả thi</p>
        <label>Lý do đề xuất<textarea name="alternativeReason" required maxLength={2000} /></label>
      </fieldset>}
      <div className="review-buttons"><button type="submit" className={button} disabled={busy} title={busy ? 'Đang lưu' : undefined}>Gửi đánh giá</button></div>
    </form>}
  </>;
}

function SpecialistForm({ review, option, button, busy, submit, download }: FormProps & { option: ScheduleOption; download: (action: () => Promise<void>) => void }) {
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({});
  const [result, setResult] = useState<SpecialistResult | ''>('');
  const sources = option.checklist ?? [];
  const title = option.isOriginal ? 'Lịch khách yêu cầu' : 'Lịch đề xuất';
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!result || !option.checklistVersion) return;
    const form = new FormData(event.currentTarget);
    const items: ChecklistAssessment[] = sources.map(source => {
      const id = source.checklistItemId;
      return {
        checklistItemId: id, status: statuses[id], reason: String(form.get(id + ':reason') || '') || null,
        requiredByDate: String(form.get(id + ':due') || '') || null,
        estimatedProcessingDays: null,
      };
    });
    void submit(() => requestReviewApi.specialist(review.reviewId, option.scheduleOptionId,
      { requestRevision: review.requestRevision, checklistVersion: option.checklistVersion!, result, note: String(form.get('note') || ''), items }));
  };

  return <div className="review-rows review-item">
    <h4>{title} · {reviewMode(option.mode)} · {reviewDay(option.expectedTransportDate)} → {reviewDay(option.expectedDeliveryDate)}</h4>
    <p>Điều phối: {option.coordinatorReason}</p>
    {option.specialistResult ? <p>Đã gửi đánh giá: {reviewResult[option.specialistResult]}</p> : <form onSubmit={onSubmit}>
      {sources.map(source => {
        const id = source.checklistItemId;
        const needsPlan = statuses[id] === 'NEEDS_FOLLOW_UP' && source.stage === 'BEFORE_DEPARTURE';
        return <fieldset key={id} disabled={busy}>
          <legend>{source.horseName} · {documentName[source.documentType]}</legend>
          {source.healthNotes && <p>Ghi chú sức khỏe: {source.healthNotes}</p>}
          <div className="review-buttons">
            <span>{documentStage[source.stage]}{source.expiryDate ? ` · Hạn ${reviewDay(source.expiryDate)}` : ''}</span>
            {source.fileAvailable ? <button type="button" className={button}
              onClick={() => download(() => requestReviewApi.file(review.reviewId, option.scheduleOptionId, source))}>Tải tệp</button> : <span>Chưa có tệp</span>}
          </div>
          <div className="review-columns">
            <label>Trạng thái giấy tờ
              <select required value={statuses[id] ?? ''} onChange={event => setStatuses({ ...statuses, [id]: event.target.value as ItemStatus })}>
                <option value="" disabled>Chọn trạng thái</option>
                {Object.entries(itemStatus).filter(([key]) => key !== 'NEEDS_FOLLOW_UP' || source.stage === 'BEFORE_DEPARTURE')
                  .map(([key, label]) => <option key={key} value={key} disabled={key === 'VERIFIED' && !source.usable}>{label}</option>)}
              </select>
            </label>
            {statuses[id] === 'NEEDS_FOLLOW_UP' && <p>Giấy tờ chưa đủ điều kiện xác minh. Nhập hạn khách nộp từ hôm nay đến hết ngày đi.</p>}
            {statuses[id] && statuses[id] !== 'VERIFIED' && <label>Lý do<input name={id + ':reason'} maxLength={2000} required={source.stage !== 'OPTIONAL'} /></label>}
            {needsPlan && <>
              <label>Hạn khách nộp giấy tờ<input type="date" name={id + ':due'} min={new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })}
                max={option.expectedTransportDate} required /></label>
            </>}
          </div>
        </fieldset>;
      })}
      <label>Kết luận hồ sơ
        <select required value={result} onChange={event => setResult(event.target.value as SpecialistResult)}>
          <option value="" disabled>Chọn kết luận</option>
          {Object.entries(reviewResult).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <label>Ghi chú gửi Quản lý<textarea name="note" required={!!result && result !== 'FEASIBLE'} maxLength={2000} /></label>
      <div className="review-buttons"><button type="submit" className={button} disabled={busy} title={busy ? 'Đang lưu' : undefined}>Gửi đánh giá hồ sơ</button></div>
    </form>}
  </div>;
}
