import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../components/StatusBadge/StatusBadge';
import { CheckList, LockedCard, Note, openSampleFile } from '../../../components/Common/Common';
import { ActualCostModal, Modal, ReasonModal } from '../../../components/Modals';
import { DemoPanel } from '../../../components/DemoPanel/DemoPanel';
import { useManager } from '../../../hooks/useManager';
import type { TransportRequest } from '../../../types';
import {
  COMPLAINT_STATUS_LABEL,
  METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  arrived,
  balanceDue,
  closureChecks,
  fmtDateTime,
  fmtMoney,
  handoverChecks,
  horseName,
  isPast,
  outstanding,
  sumActual,
  timeLeft,
  verifiedBalance,
} from '../../../hooks/managerRules';
import { getDemoMode } from '../../../../../shared/context/DemoModeContext';
import { generateUuidV4 } from '../../../../../shared/utils/uuid';
import { flow6Api } from '../../../../aftercare/api/flow6Api';
import type * as T6 from '../../../../aftercare/types/flow6.types';

const CONDITION_VI = { NORMAL: 'Bình thường', MINOR_ISSUE: 'Có vấn đề nhỏ', INJURED: 'Bị thương' } as const;
type Dialog = '' | 'resolve' | 'collection' | 'close' | 'costs';

/** Mục 3: Bàn giao, tất toán và đóng đơn (CHẾ ĐỘ MOCK của teammate) */
const MockClosureSection: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const { data, tripFor, actions } = useManager();
  const [dialog, setDialog] = useState<Dialog>('');
  const close = () => setDialog('');
  const t = tripFor(r.id);
  if (!t || !['IN_TRANSIT', 'COMPLETED'].includes(t.status)) {
    return <LockedCard title="Chưa đến giai đoạn bàn giao" text="Mục này mở khi chuyến đi đang vận chuyển hoặc đã đến điểm giao." />;
  }
  const h = t.handover, a = r.acceptance;
  const evidence = handoverChecks(r, t), closeChecks = closureChecks(data, r);
  const canClose = r.status === 'DELIVERED' && closeChecks.every((c) => c[1]);
  const balanceTx = data.transactions.filter((x) => x.requestId === r.id && x.type === 'BALANCE');
  const cmp = data.complaints.filter((c) => c.requestId === r.id);
  const overdue = !!a && isPast(a.dueAt) && outstanding(data, r) > 0;
  const cost = data.actualCosts.find((x) => x.tripId === t.id);
  const refusalOpen = !!t.refusal && !t.refusal.resolvedAt;

  return (
    <>
      {refusalOpen && (
        <Note tone="red" title={`Người nhận từ chối bàn giao • ${fmtDateTime(t.refusal!.at)}`}>
          {t.refusal!.reason} Chuyến vẫn ở trạng thái Đang vận chuyển; tổ xe chỉ được bàn giao lại sau khi Manager ghi quyết định.
          <div className="mgr-btn-row" style={{ marginTop: 10 }}><button type="button" className="mgr-btn mgr-btn--solid" onClick={() => setDialog('resolve')}>Ghi quyết định xử lý</button></div>
        </Note>
      )}
      {r.status === 'CLOSED' && <Note tone="green" title={`Đã đóng yêu cầu • ${fmtDateTime(r.closedAt)}`}>Hợp đồng đã hoàn thành.</Note>}

      <div className="mgr-grid-main">
        <div className="mgr-stack">
          <section className="mgr-card">
            <div className="mgr-between"><h3 className="mgr-card__title">1. Người nhận & bằng chứng bàn giao</h3>
              <StatusBadge tone={evidence.every((c) => c[1]) ? 'ok' : 'warn'} label={evidence.every((c) => c[1]) ? 'Đã xác minh' : h ? 'Cần kiểm tra' : arrived(t) ? 'Chờ bàn giao' : 'Chưa đến nơi'} /></div>
            <div className="mgr-kv">
              <div><span>Người nhận đăng ký</span><b>{r.delivery.contact}</b><div className="mgr-muted">{r.delivery.phone}</div></div>
              <div><span>Điểm giao</span><b>{r.delivery.name}</b><div className="mgr-muted">{r.delivery.address}</div></div>
              <div><span>Thời điểm bàn giao</span><b>{h ? fmtDateTime(h.completedAt) : 'Chưa hoàn tất'}</b></div>
              <div><span>Người nhận thực tế / giấy tờ</span><b>{h ? `${h.receiverName} • ${h.receiverId}` : '—'}</b></div>
            </div>
            <CheckList items={evidence} />
            {h && (
              <>
                <div className="mgr-section-title">Từng con ngựa</div>
                {h.horses.map((x) => (
                  <div key={x.horseId} className="mgr-row">
                    <div><b>{horseName(data, x.horseId)}</b><span>{x.horseId} • {x.microchipOk ? 'Microchip khớp' : 'Microchip KHÔNG khớp'}</span></div>
                    <StatusBadge tone={x.condition === 'NORMAL' ? 'ok' : x.condition === 'MINOR_ISSUE' ? 'warn' : 'bad'} label={CONDITION_VI[x.condition]} />
                  </div>
                ))}
                <div className="mgr-photos">{h.photos.map((p) => <button key={p} type="button" className="mgr-photo" onClick={() => openSampleFile(p)}>{p}</button>)}</div>
              </>
            )}
            {t.refusal?.resolvedAt && <p className="mgr-hint">Quyết định sau lần từ chối ({fmtDateTime(t.refusal.resolvedAt)}): {t.refusal.resolution}</p>}
          </section>

          <section className="mgr-card">
            <div className="mgr-between"><h3 className="mgr-card__title">2. Thanh toán số dư</h3>
              {a ? <StatusBadge tone={outstanding(data, r) === 0 ? 'ok' : overdue ? 'bad' : 'warn'} label={outstanding(data, r) === 0 ? 'Đã thanh toán đủ' : overdue ? 'Quá hạn chung 24 giờ' : 'Chờ thanh toán'} />
                : <StatusBadge tone="muted" label="Chưa đến hạn" />}</div>
            <div className="mgr-kv">
              <div><span>Số dư phải thu</span><b>{fmtMoney(balanceDue(r))}</b></div>
              <div><span>Đã xác minh</span><b>{fmtMoney(verifiedBalance(data, r))}</b></div>
              <div><span>Còn lại</span><b className={outstanding(data, r) ? 'mgr-bad' : 'mgr-ok'}>{fmtMoney(outstanding(data, r))}</b></div>
              <div><span>Hạn chung (nghiệm thu + thanh toán)</span><b>{a ? `${fmtDateTime(a.dueAt)} (${timeLeft(a.dueAt)})` : '—'}</b></div>
            </div>
            {balanceTx.map((x) => (
              <div key={x.id} className="mgr-row">
                <div><b>{x.id} • {fmtMoney(x.amount)}</b><span>{METHOD_LABEL[x.method]} • {fmtDateTime(x.createdAt)}</span></div>
                <StatusBadge kind="payment" status={x.status} label={PAYMENT_STATUS_LABEL[x.status]} />
              </div>
            ))}
            {overdue && (
              <Note tone="yellow" title="Quá hạn chung 24 giờ – chưa thanh toán đủ">
                Không tự động nghiệm thu hay đóng đơn, không giữ ngựa. Ghi nhận việc theo dõi công nợ theo hợp đồng.
                <div className="mgr-btn-row" style={{ marginTop: 10 }}><button type="button" className="mgr-btn" onClick={() => setDialog('collection')}>Ghi nhận theo dõi công nợ</button></div>
              </Note>
            )}
            {r.collection.length > 0 && (
              <ul className="mgr-timeline" style={{ marginTop: 12 }}>
                {[...r.collection].reverse().map((cn) => <li key={cn.at} className="done"><b>{cn.note}</b><span>{fmtDateTime(cn.at)} • {cn.by}</span></li>)}
              </ul>
            )}
          </section>

          <section className="mgr-card">
            <div className="mgr-between"><h3 className="mgr-card__title">3. Nghiệm thu & khiếu nại</h3>
              {a ? <StatusBadge tone={a.status === 'ACCEPTED' ? 'ok' : 'warn'} label={a.status === 'ACCEPTED' ? 'Đã nghiệm thu' : 'Chờ nghiệm thu'} /> : <StatusBadge tone="muted" label="Chưa bắt đầu" />}</div>
            <p className="mgr-hint" style={{ marginTop: 0 }}>Khách nghiệm thu trước, thanh toán sau, trong hạn chung 24 giờ kể từ bàn giao. Khiếu nại đang mở tạm dừng hạn này.</p>
            {a?.decidedAt && <p className="mgr-hint">Nghiệm thu lúc {fmtDateTime(a.decidedAt)}.</p>}
            {cmp.map((c) => (
              <div key={c.id} className="mgr-row">
                <div><b>{c.id} • {c.title}</b><span>{COMPLAINT_STATUS_LABEL[c.status]} • {fmtDateTime(c.createdAt)}</span></div>
                <Link className="mgr-btn mgr-btn--sm" to={`/manager/complaints/${c.id}`}>{c.status === 'RESOLVED' ? 'Xem' : 'Xử lý'}</Link>
              </div>
            ))}
            {!cmp.length && <p className="mgr-hint">Không có khiếu nại.</p>}
          </section>
        </div>

        <aside className="mgr-stack">
          <section className="mgr-card">
            <h3 className="mgr-card__title">4. Điều kiện đóng yêu cầu</h3>
            <CheckList items={closeChecks} />
            {r.status === 'DELIVERED' && (
              <button type="button" className="mgr-btn mgr-btn--solid mgr-btn--block" style={{ marginTop: 14 }} disabled={!canClose}
                title={canClose ? '' : 'Mọi điều kiện phải đạt'} onClick={() => setDialog('close')}>Đóng yêu cầu</button>
            )}
            <p className="mgr-hint">Không đóng tự động: Manager đóng khi đã nghiệm thu, đủ tiền được xác minh và không còn khiếu nại hay sự cố mở.</p>
          </section>
          <section className="mgr-card">
            <h3 className="mgr-card__title">Chi phí thực tế {t.id}</h3>
            <p className="mgr-hint" style={{ marginTop: 0 }}>{cost ? `Đã nhập ${fmtDateTime(cost.enteredAt)} • tổng ${fmtMoney(sumActual(cost))}` : 'Chưa nhập chi phí thực tế.'}</p>
            <button type="button" className="mgr-btn mgr-btn--sm" onClick={() => setDialog('costs')}>{cost ? 'Cập nhật chi phí' : 'Nhập chi phí thực tế'}</button>
          </section>
          <DemoPanel buttons={[
            { label: 'Tổ xe: hoàn tất bàn giao có xác minh', run: () => actions.demo.driverHandover(t.id), primary: true, hidden: !(t.status === 'IN_TRANSIT' && arrived(t) && !refusalOpen) },
            { label: 'Người nhận từ chối bàn giao', run: () => actions.demo.receiverRefuse(t.id), hidden: !(arrived(t) && !h && !refusalOpen) },
            { label: 'Khách hàng nghiệm thu', run: () => actions.demo.customerAccept(r.id), primary: true, hidden: !(r.status === 'DELIVERED' && a?.status === 'PENDING') },
            { label: 'Khách hàng thanh toán số dư (VNPay)', run: () => actions.demo.customerPayBalance(r.id), hidden: !(a?.status === 'ACCEPTED' && outstanding(data, r) > 0) },
            { label: 'Khách hàng gửi khiếu nại', run: () => actions.demo.customerComplaint(r.id), hidden: r.status !== 'DELIVERED' },
          ]} hint={!arrived(t) ? 'Chuyến chưa đến điểm giao – mở Chuyến đi để mô phỏng các mốc hành trình.' : undefined} />
          {!arrived(t) && <Link className="mgr-btn mgr-btn--sm" to={`/manager/trips/${t.id}/progress`}>Mở tiến độ hành trình</Link>}
        </aside>
      </div>

      <ReasonModal open={dialog === 'resolve'} title={`Xử lý từ chối bàn giao • ${t.id}`} okText="Ghi quyết định" minLength={10} label="Quyết định của Manager *"
        intro={<p>Ví dụ: xác nhận người nhận thay thế (họ tên, giấy tờ) với khách hàng, hoặc hẹn giao lại. Tổ xe chỉ bàn giao lại sau quyết định này.</p>}
        placeholder="VD: Khách hàng ủy quyền cho Kenji Watanabe (hộ chiếu TK1234567) nhận thay, giao lại lúc 15:00." onClose={close}
        onSubmit={(x) => actions.resolveRefusal(t.id, x).ok} />
      <ReasonModal open={dialog === 'collection'} title={`Theo dõi công nợ • ${r.id}`} okText="Ghi nhận" minLength={10} label="Nội dung *"
        placeholder="VD: Gọi khách lúc 10:00, khách hẹn thanh toán trước 17:00 hôm nay." onClose={close} onSubmit={(x) => actions.addCollectionNote(r.id, x).ok} />
      <Modal open={dialog === 'close'} title={`Đóng ${r.id}`} okText="Đóng yêu cầu" onClose={close} onOk={async () => { if ((await actions.closeRequest(r.id)).ok) close(); }}>
        <p>Mọi điều kiện đóng đã đạt. Sau khi đóng, hợp đồng chuyển sang <b>Đã hoàn thành</b> và yêu cầu không thể chỉnh sửa.</p>
      </Modal>
      <ActualCostModal open={dialog === 'costs'} tripId={t.id} current={cost} onClose={close} onSubmit={(c, e) => actions.saveActualCosts(t.id, c, e).ok} />
    </>
  );
};

/** Mục 3: Bàn giao, tất toán và đóng đơn (CHẾ ĐỘ BACKEND FLOW 6 THỰC TẾ) */
const RealManagerClosureSection: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const { tripFor } = useManager();
  const t = tripFor(r.id);
  const [loading, setLoading] = useState(true);
  const [settlement, setSettlement] = useState<T6.Settlement | null>(null);
  const [balance, setBalance] = useState<T6.Balance | null>(null);
  const [delivery, setDelivery] = useState<T6.Revision | null>(null);
  const [adjustments, setAdjustments] = useState<Array<T6.Adjustment>>([]);
  const [cases, setCases] = useState<Array<T6.Case>>([]);
  const [payments, setPayments] = useState<Array<T6.Payment>>([]);
  const [feedback, setFeedback] = useState<T6.Feedback | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Modals / forms
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjType, setAdjType] = useState<'CHARGE' | 'DISCOUNT' | 'REFUND'>('CHARGE');
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjReason, setAdjReason] = useState('');

  const [activeCase, setActiveCase] = useState<T6.Case | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  const [reviewPaymentId, setReviewPaymentId] = useState('');
  const [reviewReason, setReviewReason] = useState('');

  const loadFlow6Data = async () => {
    setLoading(true);
    try {
      const list = await flow6Api.getManagerSettlements();
      const s = list.find((x) => x.tripId === t?.id || x.contractId === r.contractId) || list[0];
      if (s) {
        setSettlement(s);
        const [balRes, delivRes, adjRes, caseRes, payRes, fbRes] = await Promise.allSettled([
          flow6Api.getManagerBalance(s.id),
          flow6Api.getManagerDelivery(s.id),
          flow6Api.getManagerAdjustments(s.id),
          flow6Api.getManagerCases(),
          flow6Api.getManagerPayments(s.id),
          flow6Api.getManagerFeedback(s.id),
        ]);
        if (balRes.status === 'fulfilled') setBalance(balRes.value);
        if (delivRes.status === 'fulfilled') setDelivery(delivRes.value);
        if (adjRes.status === 'fulfilled') setAdjustments(adjRes.value);
        if (caseRes.status === 'fulfilled') {
          setCases(caseRes.value.filter((c) => c.settlementId === s.id));
        }
        if (payRes.status === 'fulfilled') setPayments(payRes.value);
        if (fbRes.status === 'fulfilled') setFeedback(fbRes.value);
      }
    } catch (e) {
      console.warn('[RealManagerClosureSection] Failed to load data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFlow6Data();
  }, [r.id]);

  // F6-J15: Chuẩn bị tất toán DRAFT
  const handlePrepareSettlement = async () => {
    if (!t?.id) return;
    setSubmitting(true);
    try {
      const key = generateUuidV4();
      const s = await flow6Api.prepareSettlement(t.id, key);
      setSettlement(s);
      await loadFlow6Data();
      alert('Đã chuẩn bị hồ sơ tất toán DRAFT!');
    } catch (err: any) {
      alert(`Không thể tạo hồ sơ tất toán: ${err?.message || 'Có lỗi xảy ra'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // F6-J19: Thêm điều chỉnh cước phí
  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlement) return;
    if (adjAmount <= 0) {
      alert('Số tiền điều chỉnh phải lớn hơn 0.');
      return;
    }
    if (adjReason.trim().length < 5) {
      alert('Lý do điều chỉnh phải từ 5 ký tự trở lên.');
      return;
    }
    setSubmitting(true);
    try {
      const key = generateUuidV4();
      await flow6Api.createAdjustment(
        settlement.id,
        {
          type: adjType,
          amountVnd: adjAmount,
          reason: adjReason.trim(),
          decisionReason: 'Manager phê duyệt điều chỉnh chi phí phát sinh thực tế',
        },
        key
      );
      setShowAdjModal(false);
      setAdjAmount(0);
      setAdjReason('');
      await loadFlow6Data();
      alert('Đã thêm khoản điều chỉnh chi phí thành công!');
    } catch (err: any) {
      alert(`Không thể thêm điều chỉnh: ${err?.message || 'Có lỗi xảy ra'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // F6-J22: Phát hành hóa đơn cuối
  const handleIssueInvoice = async () => {
    if (!settlement) return;
    setSubmitting(true);
    try {
      const key = generateUuidV4();
      const dueAtUtc = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      await flow6Api.issueFinalInvoice(settlement.id, { dueAtUtc }, key);
      await loadFlow6Data();
      alert('Đã phát hành hóa đơn cuối (Final Invoice) thành công!');
    } catch (err: any) {
      alert(`Không thể phát hành hóa đơn: ${err?.message || 'Có lỗi xảy ra'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // F6-J26: Nghiệm thu & Tất toán hợp đồng
  const handleSettle = async () => {
    if (!settlement) return;
    setSubmitting(true);
    try {
      const key = generateUuidV4();
      await flow6Api.settleSettlement(settlement.id, key);
      await loadFlow6Data();
      alert('Nghiệm thu và tất toán thành công! Trạng thái hồ sơ chuyển sang SETTLED, mở thời hạn phản hồi.');
    } catch (err: any) {
      alert(`Không thể tất toán: ${err?.message || 'Biên bản chưa CONFIRMED hoặc chưa thanh toán đủ tiền'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // F6-J36: Khởi động lại hạn phản hồi 24h
  const handleRestartFeedback = async () => {
    if (!settlement) return;
    setSubmitting(true);
    try {
      const key = generateUuidV4();
      await flow6Api.restartFeedbackWindow(settlement.id, key);
      await loadFlow6Data();
      alert('Đã khởi động lại thời hạn phản hồi 24 giờ sau khi giải quyết khiếu nại!');
    } catch (err: any) {
      alert(`Không thể khởi động lại hạn phản hồi: ${err?.message || 'Có lỗi xảy ra'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // F6-J37: Đóng hồ sơ tất toán (Cho phép đóng sớm allowEarlyClose theo backend)
  const handleCloseSettlement = async () => {
    if (!settlement) return;
    if (!window.confirm('Xác nhận đóng hồ sơ tất toán này? Yêu cầu và hợp đồng sẽ chuyển sang CLOSED.')) return;
    setSubmitting(true);
    try {
      const key = generateUuidV4();
      await flow6Api.closeSettlement(settlement.id, key);
      await loadFlow6Data();
      alert('Hồ sơ tất toán, Yêu cầu và Hợp đồng đã được đóng hoàn tất (CLOSED)!');
    } catch (err: any) {
      alert(`Không thể đóng hồ sơ: ${err?.message || 'Còn khiếu nại chưa xử lý hoặc nghĩa vụ tiền chưa thanh toán'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // F6-J32 & F6-J33: Xử lý khiếu nại
  const handleStartCase = async (caseId: string) => {
    setSubmitting(true);
    try {
      const key = generateUuidV4();
      await flow6Api.startCaseProcessing(caseId, key);
      await loadFlow6Data();
    } catch (err: any) {
      alert(`Lỗi: ${err?.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;
    if (resolutionText.trim().length < 5) {
      alert('Nhập phương án giải quyết (ít nhất 5 ký tự).');
      return;
    }
    setSubmitting(true);
    try {
      const key = generateUuidV4();
      await flow6Api.resolveCase(activeCase.id, { resolution: resolutionText.trim() }, key);
      setActiveCase(null);
      setResolutionText('');
      await loadFlow6Data();
      alert('Đã ghi nhận giải quyết khiếu nại thành công!');
    } catch (err: any) {
      alert(`Lỗi: ${err?.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // F6-J27: Bắt đầu xử lý hoàn tiền
  const handleStartRefund = async (adjustmentId: string) => {
    setSubmitting(true);
    try {
      const key = generateUuidV4();
      await flow6Api.startRefundProcessing(adjustmentId, key);
      await loadFlow6Data();
      alert('Đã bắt đầu xử lý hoàn tiền (F6-J27)!');
    } catch (err: any) {
      alert(`Lỗi: ${err?.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // F6-J28: Hoàn tất hoàn tiền
  const handleCompleteRefund = async (adjustmentId: string) => {
    const ref = window.prompt('Nhập mã giao dịch / ủy nhiệm chi hoàn tiền (ít nhất 5 ký tự):');
    if (!ref || ref.trim().length < 5) return;
    setSubmitting(true);
    try {
      const key = generateUuidV4();
      const nowUtc = new Date().toISOString();
      await flow6Api.completeRefund(adjustmentId, { reference: ref.trim(), refundedAtUtc: nowUtc }, key);
      await loadFlow6Data();
      alert('Đã xác nhận hoàn tiền thành công (F6-J28)!');
    } catch (err: any) {
      alert(`Lỗi: ${err?.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // F6-J48: Duyệt đối soát thanh toán
  const handleReviewPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewPaymentId) return;
    if (reviewReason.trim().length < 5) {
      alert('Nhập lý do đối soát (ít nhất 5 ký tự).');
      return;
    }
    setSubmitting(true);
    try {
      await flow6Api.reviewPayment(reviewPaymentId, { reason: reviewReason.trim() });
      setReviewPaymentId('');
      setReviewReason('');
      await loadFlow6Data();
      alert('Đã duyệt đối soát thanh toán thành công!');
    } catch (err: any) {
      alert(`Lỗi đối soát: ${err?.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // F6-J47: Tải PDF biên bản nghiệm thu
  const handleDownloadPdf = async () => {
    if (!settlement) return;
    try {
      const blob = await flow6Api.downloadManagerDeliveryPdf(settlement.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BienBanNghiemThu_${settlement.id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Không tải được tệp PDF: ${err?.message}`);
    }
  };

  if (loading) {
    return <div className="mgr-card"><p className="mgr-hint">Đang tải dữ liệu hồ sơ tất toán từ Backend Flow 6...</p></div>;
  }

  const openCases = cases.filter((c) => c.status !== 'RESOLVED');

  return (
    <>
      <div className="mgr-grid-main">
        <div className="mgr-stack">
          {/* 1. Hồ sơ tất toán & Biên bản bàn giao */}
          <section className="mgr-card">
            <div className="mgr-between">
              <h3 className="mgr-card__title">1. Hồ sơ tất toán & Bàn giao</h3>
              {settlement ? (
                <StatusBadge
                  label={
                    settlement.status === 'CLOSED'
                      ? 'Đã đóng (CLOSED)'
                      : settlement.status === 'SETTLED'
                      ? 'Đã tất toán (SETTLED)'
                      : settlement.status === 'AWAITING_PAYMENT'
                      ? 'Chờ thanh toán (AWAITING_PAYMENT)'
                      : 'Bản nháp (DRAFT)'
                  }
                  tone={
                    settlement.status === 'CLOSED'
                      ? 'muted'
                      : settlement.status === 'SETTLED'
                      ? 'ok'
                      : 'warn'
                  }
                />
              ) : (
                <StatusBadge tone="muted" label="Chưa lập hồ sơ" />
              )}
            </div>

            {!settlement && t && (
              <div style={{ marginTop: 12 }}>
                <p className="mgr-hint">Chưa có hồ sơ tất toán. Bấm để tạo hồ sơ DRAFT theo chuyến đi.</p>
                <button
                  type="button"
                  className="mgr-btn mgr-btn--solid"
                  disabled={submitting}
                  onClick={handlePrepareSettlement}
                >
                  Chuẩn bị hồ sơ tất toán (DRAFT)
                </button>
              </div>
            )}

            {settlement && (
              <div className="mgr-kv" style={{ marginTop: 12 }}>
                <div><span>Mã hồ sơ</span><b>{settlement.id}</b></div>
                <div><span>Chuyến vận chuyển</span><b>{settlement.tripId}</b></div>
                <div><span>Hợp đồng</span><b>{settlement.contractId} (v{settlement.contractVersionNo})</b></div>
                <div><span>Biên bản nghiệm thu</span><b>{delivery ? `${delivery.handoverId} (${delivery.status})` : 'Chưa có'}</b></div>
                {settlement.settledAtUtc && <div><span>Tất toán lúc</span><b>{fmtDateTime(settlement.settledAtUtc)}</b></div>}
                {settlement.closedAtUtc && <div><span>Đóng hồ sơ lúc</span><b>{fmtDateTime(settlement.closedAtUtc)}</b></div>}
              </div>
            )}

            {delivery && (
              <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #eee' }}>
                <div className="mgr-between">
                  <b>Chi tiết bàn giao ngựa (Mã vi mạch & Người nhận)</b>
                  <button type="button" className="mgr-btn mgr-btn--sm" onClick={handleDownloadPdf}>
                    Tải PDF biên bản
                  </button>
                </div>
                <div className="mgr-kv" style={{ marginTop: 8 }}>
                  <div><span>Người nhận</span><b>{delivery.content.receiver.name}</b></div>
                  <div><span>SĐT</span><b>{delivery.content.receiver.phone}</b></div>
                  <div><span>Email nhận OTP</span><b>{delivery.content.receiver.otpEmail}</b></div>
                  <div><span>Xác thực OTP</span><b>{delivery.confirmedAtUtc ? `Đã xác thực ${fmtDateTime(delivery.confirmedAtUtc)}` : 'Chưa xác thực'}</b></div>
                </div>
              </div>
            )}
          </section>

          {/* 2. Nghĩa vụ tài chính & Thu số dư */}
          {settlement && balance && (
            <section className="mgr-card">
              <div className="mgr-between">
                <h3 className="mgr-card__title">2. Nghĩa vụ tài chính & Thanh toán</h3>
                <StatusBadge
                  label={balance.remainingVnd <= 0 ? 'Đã thu đủ' : 'Còn phải thu'}
                  tone={balance.remainingVnd <= 0 ? 'ok' : 'warn'}
                />
              </div>

              <div className="mgr-kv" style={{ marginTop: 12 }}>
                <div><span>Giá trị hợp đồng</span><b>{fmtMoney(balance.signedPriceVnd)}</b></div>
                <div><span>Tiền cọc đã thu</span><b>{fmtMoney(balance.depositPaidVnd)}</b></div>
                <div><span>Phụ phí phát sinh</span><b>{fmtMoney(balance.chargesVnd)}</b></div>
                <div><span>Giảm giá / Miễn trừ</span><b>{fmtMoney(balance.discountsVnd)}</b></div>
                <div><span>Tổng số dư phải thu</span><b>{fmtMoney(balance.finalDueVnd)}</b></div>
                <div><span>Đã thanh toán thực tế</span><b>{fmtMoney(balance.finalPaidVnd)}</b></div>
                <div>
                  <span>Số dư còn lại</span>
                  <b className={balance.remainingVnd > 0 ? 'mgr-bad' : 'mgr-ok'}>
                    {fmtMoney(balance.remainingVnd)}
                  </b>
                </div>
              </div>

              {/* Danh sách điều chỉnh cước phí */}
              {adjustments.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <b>Các khoản điều chỉnh chi phí (F6-J20):</b>
                  {adjustments.map((adj) => (
                    <div key={adj.id} className="mgr-row" style={{ marginTop: 6, alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <b>{adj.type === 'CHARGE' ? '+' : '-'}{fmtMoney(adj.amountVnd)} ({adj.type})</b>
                        <span>Lý do: {adj.reason}</span>
                        {adj.type === 'REFUND' && adj.refundStatus && (
                          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: 2 }}>
                            Trạng thái hoàn tiền: <b>{adj.refundStatus}</b>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <StatusBadge
                          tone={adj.type === 'DISCOUNT' ? 'ok' : adj.type === 'REFUND' ? 'warn' : 'muted'}
                          label={adj.type}
                        />
                        {adj.type === 'REFUND' && (!adj.refundStatus || adj.refundStatus === 'REQUESTED') && (
                          <button
                            type="button"
                            className="mgr-btn mgr-btn--sm"
                            disabled={submitting}
                            onClick={() => handleStartRefund(adj.id)}
                          >
                            Bắt đầu hoàn tiền (F6-J27)
                          </button>
                        )}
                        {adj.type === 'REFUND' && adj.refundStatus === 'PROCESSING' && (
                          <button
                            type="button"
                            className="mgr-btn mgr-btn--sm mgr-btn--solid"
                            disabled={submitting}
                            onClick={() => handleCompleteRefund(adj.id)}
                          >
                            Xác nhận hoàn tiền (F6-J28)
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(settlement.status === 'DRAFT' || (settlement.status === 'AWAITING_PAYMENT' && (balance?.finalPaidVnd ?? 0) === 0)) && (
                <div style={{ marginTop: 14 }}>
                  <div className="mgr-btn-row">
                    <button
                      type="button"
                      className="mgr-btn"
                      disabled={!settlement.finalInvoiceId}
                      title={!settlement.finalInvoiceId ? 'Cần phát hành hóa đơn cơ sở (Base Invoice) trước khi ghi nhận điều chỉnh phát sinh.' : ''}
                      onClick={() => setShowAdjModal(true)}
                    >
                      + Thêm điều chỉnh phí / phạt / bồi thường
                    </button>
                    <button
                      type="button"
                      className="mgr-btn mgr-btn--solid"
                      disabled={submitting}
                      onClick={handleIssueInvoice}
                    >
                      {settlement.status === 'AWAITING_PAYMENT'
                        ? 'Cập nhật lại hóa đơn cuối cùng (Re-issue Invoice)'
                        : 'Phát hành hóa đơn cuối cùng (Issue Final Invoice)'}
                    </button>
                  </div>
                  {!settlement.finalInvoiceId && (
                    <p className="mgr-hint" style={{ marginTop: 8, fontSize: '0.85rem' }}>
                      * Quy trình: Bấm <b>Phát hành hóa đơn cuối cùng</b> trước để tạo hóa đơn cơ sở (Base Invoice), sau đó mới có thể thêm điều chỉnh phụ phí hoặc giảm giá.
                    </p>
                  )}
                </div>
              )}

              {/* Danh sách giao dịch thanh toán */}
              {payments.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <b>Các giao dịch thanh toán số dư:</b>
                  {payments.map((p) => (
                    <div key={p.id} className="mgr-row" style={{ marginTop: 6 }}>
                      <div>
                        <b>{p.id} • {fmtMoney(p.amountVnd)}</b>
                        <span>Trạng thái: {p.status}</span>
                      </div>
                      {p.financialReviewRequired ? (
                        <button
                          type="button"
                          className="mgr-btn mgr-btn--sm mgr-btn--solid"
                          onClick={() => setReviewPaymentId(p.id)}
                        >
                          Duyệt đối soát (F6-J48)
                        </button>
                      ) : (
                        <StatusBadge tone={p.status === 'SUCCESS' ? 'ok' : 'warn'} label={p.status} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 3. Khiếu nại & Hỗ trợ sau bàn giao */}
          {settlement && (
            <section className="mgr-card">
              <div className="mgr-between">
                <h3 className="mgr-card__title">3. Hàng đợi khiếu nại & Hỗ trợ</h3>
                <StatusBadge
                  label={openCases.length === 0 ? 'Không có khiếu nại treo' : `${openCases.length} khiếu nại đang mở`}
                  tone={openCases.length === 0 ? 'ok' : 'bad'}
                />
              </div>

              {cases.length === 0 ? (
                <p className="mgr-hint" style={{ marginTop: 10 }}>Chưa có khiếu nại nào từ khách hàng.</p>
              ) : (
                <div style={{ marginTop: 12 }}>
                  {cases.map((c) => (
                    <div key={c.id} className="mgr-row" style={{ marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <b>{c.id} • {c.subject} ({c.type})</b>
                        <span>{c.description}</span>
                        {c.resolution && (
                          <p style={{ margin: '4px 0 0', color: '#059669', fontSize: '0.85rem' }}>
                            <b>Đã xử lý:</b> {c.resolution}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <StatusBadge
                          label={c.status === 'RESOLVED' ? 'Đã xong' : c.status === 'IN_PROGRESS' ? 'Đang xử lý' : 'Mới'}
                          tone={c.status === 'RESOLVED' ? 'ok' : c.status === 'IN_PROGRESS' ? 'info' : 'warn'}
                        />
                        {c.status === 'OPEN' && (
                          <button
                            type="button"
                            className="mgr-btn mgr-btn--sm"
                            disabled={submitting}
                            onClick={() => handleStartCase(c.id)}
                          >
                            Bắt đầu xử lý
                          </button>
                        )}
                        {c.status === 'IN_PROGRESS' && (
                          <button
                            type="button"
                            className="mgr-btn mgr-btn--sm mgr-btn--solid"
                            onClick={() => setActiveCase(c)}
                          >
                            Ghi kết quả giải quyết
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {settlement.status === 'SETTLED' && openCases.length === 0 && (
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="mgr-btn mgr-btn--sm"
                    disabled={submitting}
                    onClick={handleRestartFeedback}
                  >
                    Khởi động lại thời hạn phản hồi 24 giờ (Restart Window)
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Cột phải: Các nút hành động chính */}
        <aside className="mgr-stack">
          {settlement && (
            <section className="mgr-card">
              <h3 className="mgr-card__title">4. Nghiệm thu & Đóng hồ sơ</h3>

              {/* Nút Nghiệm thu & Tất toán (F6-J26) */}
              {settlement.status === 'AWAITING_PAYMENT' && (
                <div style={{ marginBottom: 16 }}>
                  <p className="mgr-hint" style={{ marginTop: 0 }}>
                    Khi biên bản đã bàn giao (CONFIRMED) và khách đã thanh toán đủ tiền, bấm Tất toán để chuyển hợp đồng sang SETTLED.
                  </p>
                  <button
                    type="button"
                    className="mgr-btn mgr-btn--solid mgr-btn--block"
                    disabled={submitting || (balance?.remainingVnd ?? 0) > 0 || delivery?.status !== 'CONFIRMED'}
                    title={
                      delivery?.status !== 'CONFIRMED'
                        ? 'Biên bản bàn giao chưa CONFIRMED'
                        : (balance?.remainingVnd ?? 0) > 0
                        ? 'Chưa thanh toán đủ số dư'
                        : ''
                    }
                    onClick={handleSettle}
                  >
                    Nghiệm thu & Tất toán hợp đồng (F6-J26)
                  </button>
                </div>
              )}

              {/* Nút Đóng hồ sơ (F6-J37) */}
              {settlement.status === 'SETTLED' && (
                <div>
                  <p className="mgr-hint" style={{ marginTop: 0 }}>
                    Hồ sơ đã tất toán. Manager có thể đóng hồ sơ (CLOSED) sớm hoặc khi hết thời hạn phản hồi nếu không còn khiếu nại treo.
                  </p>
                  <button
                    type="button"
                    className="mgr-btn mgr-btn--solid mgr-btn--block"
                    disabled={submitting || openCases.length > 0}
                    title={openCases.length > 0 ? 'Vẫn còn khiếu nại đang mở' : ''}
                    onClick={handleCloseSettlement}
                  >
                    Đóng hồ sơ tất toán (F6-J37)
                  </button>
                </div>
              )}

              {settlement.status === 'CLOSED' && (
                <Note tone="green" title="Hồ sơ đã đóng hoàn tất">
                  Hồ sơ tất toán, Yêu cầu và Hợp đồng đã hoàn thành trọn vẹn chu kỳ Flow 6.
                </Note>
              )}
            </section>
          )}

          {/* Đánh giá của khách hàng */}
          {feedback && (
            <section className="mgr-card">
              <h3 className="mgr-card__title">Đánh giá của khách</h3>
              <div className="mgr-kv" style={{ marginTop: 8 }}>
                <div><span>Xếp hạng</span><b>{feedback.rating}/5 sao</b></div>
                <div><span>Nhận xét</span><b>{feedback.comment || 'Không có nhận xét'}</b></div>
                <div><span>Gửi lúc</span><b>{fmtDateTime(feedback.createdAtUtc)}</b></div>
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* Modal thêm điều chỉnh phí */}
      {showAdjModal && (
        <div className="mgr-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 20, width: 440, maxWidth: '90%' }}>
            <h3 style={{ margin: '0 0 12px' }}>Thêm điều chỉnh chi phí (F6-J19)</h3>
            <form onSubmit={handleCreateAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Loại điều chỉnh:</label>
                <select
                  className="mgr-select"
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as any)}
                  style={{ width: '100%', padding: '8px 12px' }}
                >
                  <option value="CHARGE">CHARGE - Phụ phí phát sinh thêm</option>
                  <option value="DISCOUNT">DISCOUNT - Giảm giá / Miễn trừ</option>
                  <option value="REFUND">REFUND - Hoàn tiền bồi thường</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Số tiền (VNĐ):</label>
                <input
                  type="number"
                  className="mgr-input"
                  min={1000}
                  step={1000}
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Lý do điều chỉnh *:</label>
                <input
                  type="text"
                  className="mgr-input"
                  placeholder="VD: Phí chăm sóc y tế tăng cường do thời tiết xấu"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px' }}
                />
              </div>
              <div className="mgr-btn-row" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" className="mgr-btn" onClick={() => setShowAdjModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="mgr-btn mgr-btn--solid" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : 'Lưu điều chỉnh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal giải quyết khiếu nại */}
      {activeCase && (
        <div className="mgr-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 20, width: 440, maxWidth: '90%' }}>
            <h3 style={{ margin: '0 0 12px' }}>Giải quyết khiếu nại {activeCase.id}</h3>
            <form onSubmit={handleResolveCase} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p><b>Tiêu đề:</b> {activeCase.subject}</p>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Phương án giải quyết (F6-J33) *:</label>
                <textarea
                  className="mgr-input"
                  rows={3}
                  placeholder="Nhập nội dung phản hồi và phương án đã thống nhất với khách hàng..."
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px' }}
                />
              </div>
              <div className="mgr-btn-row" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" className="mgr-btn" onClick={() => setActiveCase(null)}>
                  Hủy
                </button>
                <button type="submit" className="mgr-btn mgr-btn--solid" disabled={submitting}>
                  {submitting ? 'Đang gửi...' : 'Đóng phiếu bằng RESOLVED'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal duyệt đối soát thanh toán (F6-J48) */}
      {reviewPaymentId && (
        <div className="mgr-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 20, width: 440, maxWidth: '90%' }}>
            <h3 style={{ margin: '0 0 12px' }}>Duyệt đối soát thanh toán {reviewPaymentId} (F6-J48)</h3>
            <form onSubmit={handleReviewPayment} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Lý do duyệt đối soát *:</label>
                <input
                  type="text"
                  className="mgr-input"
                  placeholder="VD: Đã kiểm tra sao kê ngân hàng và khớp số tiền"
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px' }}
                />
              </div>
              <div className="mgr-btn-row" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" className="mgr-btn" onClick={() => setReviewPaymentId('')}>
                  Hủy
                </button>
                <button type="submit" className="mgr-btn mgr-btn--solid" disabled={submitting}>
                  {submitting ? 'Đang duyệt...' : 'Xác nhận duyệt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export const ClosureSection: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const isDemo = getDemoMode('manager');
  if (isDemo) {
    return <MockClosureSection request={r} />;
  }
  return <RealManagerClosureSection request={r} />;
};

export default ClosureSection;
