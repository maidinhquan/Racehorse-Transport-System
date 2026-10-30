import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ManagerLayout, Icon } from '../../components/ManagerLayout';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { CustomerCell, Note, Pager } from '../../components/Common/Common';
import { Modal, ReasonModal } from '../../components/Modals';
import { useManager } from '../../hooks/useManager';
import { useManagerFilter } from '../../hooks/useManagerFilter';
import type { PaymentMethod, PaymentStatus, PaymentType, TransportRequest } from '../../types';
import {
  METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_TYPE_LABEL,
  awaitingDeposit,
  ctRef,
  curVersion,
  customerOf,
  depositOf,
  fmtDateTime,
  fmtMoney,
  pendingTx,
  timeLeft,
  versionState,
} from '../../hooks/managerRules';

type Tab = 'verify' | 'overdue' | 'all';

/** VNPAY status, outstanding deposits, and manual refund-status bookkeeping. */
export const PaymentsPage: React.FC = () => {
  const { tab = 'verify' } = useParams();
  const navigate = useNavigate();
  const { data, transactions, requests, getRequest, actions } = useManager();
  const [refund, setRefund] = useState<TransportRequest | null>(null);
  const [cancelId, setCancelId] = useState('');
  const on: Tab = (['verify', 'overdue', 'all'] as Tab[]).includes(tab as Tab) ? (tab as Tab) : 'verify';

  const refunds = requests.filter(r => r.refund && ['REQUESTED', 'PROCESSING'].includes(r.refund.status));
  // In flight at VNPay vs. funds VNPay confirmed that could not be applied (reconcile / refund).
  const gateway = transactions.filter((x) => x.status === 'PROCESSING' && !x.reviewRequired);
  const review = transactions.filter((x) => x.reviewRequired);
  const [checking, setChecking] = useState('');
  const [cancelPaymentId, setCancelPaymentId] = useState('');
  const reconcile = async (id: string) => { setChecking(id); try { await actions.reconcilePayment(id); } finally { setChecking(''); } };
  const nowMs = Date.now();
  const cancels = requests.filter((r) => r.status === 'CANCELLATION_REQUESTED');
  const outstandingDeposits = awaitingDeposit(data);
  const all = [...transactions].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  const f = useManagerFilter(all, (x) => [x.id, x.requestId, x.ref ?? '', customerOf(data, getRequest(x.requestId))?.company ?? ''].join(' '), {
    status: (x, v) => x.status === v, type: (x, v) => x.type === v, method: (x, v) => x.method === v,
  }, 12);

  const TABS: Array<[Tab, string, number?]> = [['verify', 'Cần xử lý', refunds.length + cancels.length], ['overdue', 'Cọc chưa thanh toán', outstandingDeposits.length], ['all', 'Tất cả giao dịch']];

  return (
    <ManagerLayout title="Tiền cọc & thanh toán">
      <div className="mgr-head">
        <div><h2 className="mgr-title">Tiền cọc & thanh toán</h2><p className="mgr-subtitle">Theo dõi giao dịch VNPAY, tiền cọc và trạng thái hoàn tiền. Thanh toán được backend xác minh qua IPN.</p></div>
      </div>
      <div className="mgr-tabs" role="tablist">
        {TABS.map(([k, label, n]) => (
          <button key={k} type="button" role="tab" aria-selected={on === k} className={on === k ? 'on' : ''} onClick={() => navigate(`/manager/payments/${k}`)}>{label}{n ? ` (${n})` : ''}</button>
        ))}
      </div>

      {on === 'verify' && (
        <>
          {cancels.length > 0 && (
            <section className="mgr-card">
              <h3 className="mgr-card__title">Yêu cầu hủy có tiền đã chuyển ({cancels.length})</h3>
              {cancels.map((r) => (
                <div key={r.id} className="mgr-row">
                  <div><b>{r.id} • {customerOf(data, r)?.company}</b><span>{r.cancellation?.reason}</span></div>
                  <Link className="mgr-btn mgr-btn--sm" to={`/manager/requests/${r.id}`}>Quyết định</Link>
                </div>
              ))}
            </section>
          )}
          <section className="mgr-card">
            <h3 className="mgr-card__title">Lệnh hoàn tiền chờ thực hiện ({refunds.length})</h3>
            {refunds.map(r => <div key={r.id} className="mgr-row">
              <div><b>{r.id} • {r.refund?.amount != null ? fmtMoney(r.refund.amount) : 'Số tiền theo đối soát'}</b><span>{customerOf(data, r)?.company} • {r.refund?.status}</span></div>
              <button type="button" className="mgr-btn mgr-btn--sm" onClick={() => setRefund(r)}>Ghi nhận trạng thái hoàn tiền</button>
            </div>)}
            {!refunds.length && <p className="mgr-hint" style={{ marginTop: 0 }}>Không có lệnh hoàn tiền nào.</p>}
          </section>
          {gateway.length > 0 && (
            <section className="mgr-card">
              <h3 className="mgr-card__title">Cổng thanh toán đang xử lý ({gateway.length})</h3>
              <p className="mgr-hint" style={{ marginTop: 0 }}>
                Kết quả về qua IPN của VNPAY. Nếu IPN bị lỡ (VNPAY lỗi, mất kết nối), hệ thống tự hỏi lại VNPAY mỗi 5 phút; bấm <b>Kiểm tra với VNPay</b> để đối soát ngay.
                Đã trừ tiền → ghi nhận cọc; thất bại hoặc phiên hết hạn mà VNPAY không có giao dịch → đánh dấu thất bại và khách thanh toán lại.
              </p>
              {gateway.map((x) => {
                const expired = !!x.qrExpiresAtMs && nowMs >= x.qrExpiresAtMs;
                return (
                  <div key={x.id} className="mgr-row">
                    <div>
                      <b>{x.id} • {fmtMoney(x.amount)}</b>
                      <span>
                        {x.requestId ? <Link className="mgr-link" to={`/manager/requests/${x.requestId}`}>{x.requestId}</Link> : '—'} • {METHOD_LABEL[x.method]}
                        {x.createdAt ? ` • tạo ${fmtDateTime(x.createdAt)}` : ''}
                        {x.qrExpiresAtMs ? ` • ${expired ? 'phiên đã hết hạn' : `hết hạn sau ${Math.max(1, Math.ceil((x.qrExpiresAtMs - nowMs) / 60000))} phút`}` : ''}
                      </span>
                    </div>
                    <div className="mgr-btn-row" style={{ alignItems: 'center' }}>
                      <StatusBadge tone={expired ? 'warn' : 'brand'} label={expired ? 'Quá hạn – chờ đối soát' : 'Khách đang thanh toán'} />
                      <button type="button" className="mgr-btn mgr-btn--sm" disabled={checking === x.id} onClick={() => void reconcile(x.id)}>
                        {checking === x.id ? 'Đang hỏi VNPay…' : 'Kiểm tra với VNPay'}
                      </button>
                      {expired && (
                        <button type="button" className="mgr-btn mgr-btn--sm mgr-btn--danger" onClick={() => setCancelPaymentId(x.id)}>Huỷ giao dịch</button>
                      )}
                    </div>
                  </div>
                );
              })}

            </section>
          )}
          {review.length > 0 && (
            <section className="mgr-card">
              <h3 className="mgr-card__title">Cần đối soát / hoàn tiền ({review.length})</h3>
              <p className="mgr-hint" style={{ marginTop: 0 }}>VNPAY xác nhận khách đã bị trừ tiền nhưng khoản này không áp được vào cọc hiện hành (đã đổi phiên bản hợp đồng, quá hạn, đã đủ cọc…). Liên hệ khách để hoàn tiền hoặc xử lý theo hợp đồng.</p>
              {review.map((x) => (
                <div key={x.id} className="mgr-row">
                  <div>
                    <b>{x.id} • {fmtMoney(x.confirmedAmount ?? x.amount)}</b>
                    <span>{x.requestId ? <Link className="mgr-link" to={`/manager/requests/${x.requestId}`}>{x.requestId}</Link> : '—'} • {x.reviewReason ?? 'Cần đối soát'}</span>
                  </div>
                  <StatusBadge tone="bad" label="Đã trừ tiền – cần xử lý" />
                </div>
              ))}
            </section>
          )}
          <Note tone="grey" title="Thanh toán qua VNPAY">
            Khách chỉ ký OTP sau khi backend xác minh đủ cọc đúng phiên bản hợp đồng. Manager không xác nhận hoặc từ chối thanh toán thủ công.
          </Note>
        </>
      )}

      {on === 'overdue' && (
        <>
          <Note tone="blue" title="Quy tắc cọc">Khách có 24 giờ kể từ khi phát hành để thanh toán cọc, chờ xác minh và ký OTP. Không tự động hủy khi quá hạn: Manager gia hạn, nhắc khách hoặc hủy có lý do.</Note>
          <section className="mgr-card" style={{ padding: 0, marginTop: 14 }}>
            <div className="mgr-table-wrap">
              <table className="mgr-table">
                <thead><tr><th>Yêu cầu</th><th>Khách hàng</th><th>Hợp đồng</th><th className="num">Tiền cọc</th><th>Hạn chung</th><th>Thanh toán</th><th /></tr></thead>
                <tbody>
                  {outstandingDeposits.map((r) => {
                    const v = curVersion(r)!, st = versionState(v), p = pendingTx(data, r);
                    return (
                      <tr key={r.id} className={st === 'EXPIRED' ? 'mgr-row-attn' : ''}>
                        <td><Link className="mgr-link" to={`/manager/contracts/${r.id}`}><b>{r.id}</b></Link></td>
                        <td><CustomerCell c={customerOf(data, r)} /></td>
                        <td>{ctRef(v)}<div><StatusBadge kind="contract" status={st} /></div></td>
                        <td className="num">{fmtMoney(depositOf(r))}</td>
                        <td className="mgr-nowrap">{fmtDateTime(v.validUntil)}<div className={st === 'EXPIRED' ? 'mgr-bad' : 'mgr-muted'}>{timeLeft(v.validUntil)}</div></td>
                        <td>{p ? <StatusBadge kind="payment" status={p.status} /> : v.termsAcceptedAt ? 'Đã đồng ý điều khoản' : 'Chưa đồng ý điều khoản'}</td>
                        <td><div className="mgr-btn-row" style={{ flexWrap: 'nowrap' }}>
                          <button type="button" className="mgr-btn mgr-btn--sm" onClick={() => actions.remindSign(r.id)}>Nhắc</button>
                          <Link className="mgr-btn mgr-btn--sm" to={`/manager/requests/${r.id}/contract`}>Gia hạn hợp đồng</Link>
                          <button type="button" className="mgr-btn mgr-btn--sm mgr-btn--danger" onClick={() => setCancelId(r.id)}>Hủy</button>
                        </div></td>
                      </tr>
                    );
                  })}
                  {!outstandingDeposits.length && <tr><td colSpan={7} className="mgr-empty">Không có khoản cọc nào đang chờ.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {on === 'all' && (
        <>
          <div className="mgr-toolbar">
            <label className="mgr-search"><Icon name="search" /><input value={f.search} onChange={(e) => f.setSearch(e.target.value)} placeholder="Tìm mã giao dịch, yêu cầu, tham chiếu…" /></label>
            <select className="mgr-select" aria-label="Trạng thái" value={f.value('status')} onChange={(e) => f.setValue('status', e.target.value)}>
              <option value="">Mọi trạng thái</option>{(Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[]).map((s) => <option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>)}
            </select>
            <select className="mgr-select" aria-label="Loại" value={f.value('type')} onChange={(e) => f.setValue('type', e.target.value)}>
              <option value="">Mọi loại</option>{(Object.keys(PAYMENT_TYPE_LABEL) as PaymentType[]).map((s) => <option key={s} value={s}>{PAYMENT_TYPE_LABEL[s]}</option>)}
            </select>
            <select className="mgr-select" aria-label="Phương thức" value={f.value('method')} onChange={(e) => f.setValue('method', e.target.value)}>
              <option value="">Mọi phương thức</option>{(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((s) => <option key={s} value={s}>{METHOD_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="mgr-card" style={{ padding: 0 }}>
            <div className="mgr-table-wrap">
              <table className="mgr-table">
                <thead><tr><th>Giao dịch</th><th>Yêu cầu / khách hàng</th><th>Loại</th><th>Phương thức</th><th className="num">Số tiền</th><th>Tham chiếu</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {f.rows.map((x) => (
                    <tr key={x.id}>
                      <td><b className="mgr-id">{x.id}</b><div className="mgr-muted">{fmtDateTime(x.createdAt)}</div></td>
                      <td><Link className="mgr-link" to={`/manager/requests/${x.requestId}`}>{x.requestId}</Link><div className="mgr-muted">{customerOf(data, getRequest(x.requestId))?.company}</div></td>
                      <td>{PAYMENT_TYPE_LABEL[x.type]}</td>
                      <td>{METHOD_LABEL[x.method]}</td>
                      <td className="num">{x.type === 'REFUND' ? '−' : ''}{fmtMoney(x.amount)}</td>
                      <td>{x.ref ?? '—'}</td>
                      <td><StatusBadge kind="payment" status={x.status} />{x.confirmedAt && <div className="mgr-muted">{fmtDateTime(x.confirmedAt)}</div>}{x.rejectReason && <div className="mgr-bad mgr-wrap">{x.rejectReason}</div>}</td>
                    </tr>
                  ))}
                  {!f.rows.length && <tr><td colSpan={7} className="mgr-empty">Không có giao dịch nào khớp bộ lọc.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <Pager total={f.total} page={f.page} pageCount={f.pageCount} setPage={f.setPage} unit="giao dịch" />
        </>
      )}

      <Modal open={!!refund} title={`Ghi nhận hoàn tiền • ${refund?.id ?? ''}`} okText="Ghi nhận đã hoàn tất" onClose={() => setRefund(null)}
        onOk={async () => { if (refund && (await actions.confirmRefund(refund.id)).ok) setRefund(null); }}>
        <p>Chỉ cập nhật trạng thái hoàn tiền sau khi hoàn tất xử lý bên ngoài hệ thống. Thao tác này không chuyển tiền.</p>
      </Modal>
      <ReasonModal open={!!cancelPaymentId} title={`Huỷ giao dịch ${cancelPaymentId}`} okText="Huỷ giao dịch" danger minLength={5}
        intro={<p>Hệ thống sẽ <b>hỏi VNPay trước</b>: nếu khách đã bị trừ tiền thì ghi nhận cọc thay vì huỷ. Nếu không, giao dịch chuyển <b>thất bại</b> và khách có thể thanh toán lại. Tiền VNPay báo muộn (nếu có) sẽ vào mục đối soát/hoàn tiền.</p>}
        placeholder="VD: Khách xác nhận không thanh toán; phiên VNPay đã hết hạn." onClose={() => setCancelPaymentId('')}
        onSubmit={async (x) => (await actions.cancelPayment(cancelPaymentId, x)).ok} />
      <ReasonModal open={!!cancelId} title={`Hủy ${cancelId}`} okText="Hủy yêu cầu" danger minLength={10} confirmText="Tôi hiểu thao tác này không thể hoàn tác."
        placeholder="VD: Khách không phản hồi sau 3 lần nhắc và hạn chung đã hết." onClose={() => setCancelId('')} onSubmit={async (x) => (await actions.cancelRequest(cancelId, x)).ok} />
    </ManagerLayout>
  );
};

export default PaymentsPage;
