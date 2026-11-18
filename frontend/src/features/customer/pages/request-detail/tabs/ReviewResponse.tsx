import { useEffect, useState } from 'react';
import { onSync } from '../../../../../shared/utils/syncChannel';
import { apiMessage } from '../../../../../shared/api/contracts/contractClient';
import { requestReviewApi } from '../../../../../shared/api/reviews/requestReviewApi';
import type { CustomerReview } from '../../../../../shared/api/reviews/requestReviewApi';
import { reviewDay, reviewMode } from '../../../../../shared/components/RequestReview/labels';
import { useCustomer } from '../../../hooks/useCustomer';
import { Link } from 'react-router-dom';

export function ReviewResponse({ requestId }: { requestId: string }) {
  const { actions } = useCustomer();
  const [proposal, setProposal] = useState<CustomerReview | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    const refresh = () => requestReviewApi.customer(requestId)
      .then(({ proposal }) => { if (current) setProposal(proposal); })
      .catch(error => { if (current) setError(apiMessage(error)); });
    void refresh();
    const timer = setInterval(refresh, 15000);
    const stopSync = onSync(() => void refresh());
    return () => { current = false; clearInterval(timer); stopSync(); };
  }, [requestId]);

  async function respond(decision: 'ACCEPTED' | 'REJECTED') {
    if (proposal?.action !== 'CONFIRM_SCHEDULE') return;
    setBusy(true);
    setError('');
    try {
      const { reviewId, requestRevision, scheduleOptionId } = proposal;
      await requestReviewApi.respond(requestId, { reviewId, requestRevision, scheduleOptionId }, decision);
      await actions.loadRequest(requestId);
    } catch (error) { setError(apiMessage(error)); }
    finally { setBusy(false); }
  }

  const expired = !!proposal && Date.parse(proposal.customerDeadlineUtc) <= Date.now();
  return <>
    {error && <p role="alert">{error}</p>}
    {proposal && <p>Hạn phản hồi <b>{new Date(proposal.customerDeadlineUtc).toLocaleString('vi-VN')}</b></p>}
    {proposal?.action === 'CONFIRM_SCHEDULE' && <>
      <p><b>{reviewMode(proposal.mode)}</b> · Nhận {reviewDay(proposal.expectedTransportDate)} · Giao {reviewDay(proposal.expectedDeliveryDate)}</p>
      <p>{proposal.feedback}</p>
      {expired && <p>Đã hết hạn phản hồi.</p>}
      <button type="button" className="cus-btn cus-btn--block cus-btn--solid" disabled={busy || expired}
        title={expired ? 'Đã hết hạn phản hồi' : busy ? 'Đang gửi phản hồi' : undefined}
        onClick={() => void respond('ACCEPTED')}>Đồng ý lịch đề xuất</button>
      <button type="button" className="cus-btn cus-btn--block" disabled={busy || expired}
        title={expired ? 'Đã hết hạn phản hồi' : busy ? 'Đang gửi phản hồi' : undefined}
        onClick={() => void respond('REJECTED')}>Từ chối lịch đề xuất</button>
    </>}
    {(proposal === null || (proposal?.action === 'SUPPLEMENT_DOCUMENTS' && !expired)) &&
      <Link to={`/customer/requests/${requestId}/edit`} className="cus-btn cus-btn--block cus-btn--solid">Sửa và gửi lại</Link>}
    {proposal?.action === 'SUPPLEMENT_DOCUMENTS' && expired && <p>Đã hết hạn chỉnh sửa.</p>}
    {proposal === undefined && !error && <p>Đang tải yêu cầu phản hồi…</p>}
  </>;
}
