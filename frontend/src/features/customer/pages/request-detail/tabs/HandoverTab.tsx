import React, { useEffect, useState } from 'react';
import type { TransportRequest } from '../../../types';
import { useCustomer } from '../../../hooks/useCustomer';
import {
  balanceDue,
  balanceState,
  canComplain,
  closureChecks,
  cityLabel,
  contractTotal,
  depositPaidAmount,
  fmtDateTime,
  fmtMoney,
  handoverState,
  isPast,
  openComplaints,
  timeLeft,
} from '../../../hooks/customerRules';
import { Icon } from '../../../components/CustomerLayout';
import { DemoPanel } from '../../../components/DemoPanel/DemoPanel';
import { ComplaintModal } from '../../../components/Modals';
import { LockedCard, Note } from '../../../components/Common/Common';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import { getDemoMode } from '../../../../../shared/context/DemoModeContext';
import { generateUuidV4 } from '../../../../../shared/utils/uuid';
import { flow6Api } from '../../../../aftercare/api/flow6Api';
import type * as T6 from '../../../../aftercare/types/flow6.types';
import { onSync } from '../../../../../shared/utils/syncChannel';

const CONDITION_LABEL = { NORMAL: 'Bình thường', MONITOR: 'Cần theo dõi', ABNORMAL: 'Bất thường' } as const;

/** Tab Bàn giao & nghiệm thu (CHẾ ĐỘ MOCK của teammate) */
const MockHandoverTab: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const { horses, actions } = useCustomer();
  const [complaintOpen, setComplaintOpen] = useState(false);
  const t = r.trip, h = t?.handover, ho = handoverState(t), acc = r.acceptance;
  if (!ho && !acc) return <LockedCard title="Chưa đến bước bàn giao" text="Bàn giao diễn ra khi tổ xe xác nhận đã đến điểm giao." />;
  const bs = balanceState(r), due = balanceDue(r);
  const pendingBalance = r.payments.find((p) => p.type === 'BALANCE' && p.status === 'PROCESSING');
  const lastBalance = [...r.payments].reverse().find((p) => p.type === 'BALANCE');
  const blocked = openComplaints(r).length > 0;

  return (
    <div className="cus-grid-main">
      <div className="cus-stack">
        <div className="cus-card">
          <h3 className="cus-card__title">Bàn giao <TripStatusBadge label={ho === 'COMPLETED' ? 'Hoàn tất' : 'Đang bàn giao'} tone={ho === 'COMPLETED' ? 'ok' : 'warn'} /></h3>
          <div className="cus-kv">
            <div><span>Chuyến</span><b>{t?.id ?? '—'}</b></div>
            <div><span>Tuyến</span><b>{cityLabel(r.origin)} → {cityLabel(r.destination)}</b></div>
            <div><span>Người nhận đăng ký</span><b>{r.delivery.contact || '—'}</b></div>
            <div><span>Điện thoại người nhận</span><b>{r.delivery.phone || '—'}</b></div>
            <div><span>Địa chỉ giao</span><b>{[r.delivery.name, r.delivery.address].filter(Boolean).join(', ') || '—'}</b></div>
            {h && <div><span>Bàn giao lúc</span><b>{fmtDateTime(h.completedAt)}</b></div>}
            {h && <div><span>Người nhận</span><b>{h.receiverName} • {h.receiverId}</b></div>}
          </div>
          {ho === 'PENDING' && (
            <Note tone="yellow" title="Đang bàn giao">Tổ xe đang xác minh người nhận, microchip và tình trạng từng ngựa, ảnh và chữ ký. Bạn không cần trực tuyến nếu người nhận đăng ký có mặt.</Note>
          )}
          {h && (
            <>
              <div className="cus-eyebrow" style={{ marginTop: 14 }}>Tình trạng ngựa khi giao</div>
              {h.horses.map((x) => {
                const hh = horses.find((y) => y.id === x.horseId);
                return (
                  <div key={x.horseId} className="cus-horse-line">
                    <div><b>{hh?.name ?? x.horseId}</b><small>Microchip {hh?.microchip || '—'} {x.microchipOk ? 'đã xác minh' : 'chưa xác minh'}{x.note ? ` • ${x.note}` : ''}</small></div>
                    <TripStatusBadge label={CONDITION_LABEL[x.condition]} tone={x.condition === 'NORMAL' ? 'ok' : x.condition === 'MONITOR' ? 'warn' : 'bad'} />
                  </div>
                );
              })}
              <div className="cus-eyebrow" style={{ marginTop: 12 }}>Bằng chứng</div>
              <div className="cus-photo-strip">{h.photos.map((p) => <span key={p}>{p}</span>)}<span>Chữ ký: {h.receiverName}</span></div>
            </>
          )}
        </div>

        {acc && (
          <div className="cus-card">
            <h3 className="cus-card__title">Nghiệm thu & thanh toán số dư <TripStatusBadge label={acc.status === 'ACCEPTED' ? 'Đã nghiệm thu' : 'Chờ nghiệm thu'} tone={acc.status === 'ACCEPTED' ? 'ok' : 'warn'} /></h3>
            <div className="cus-kv">
              <div><span>Giá hợp đồng</span><b>{fmtMoney(contractTotal(r))}</b></div>
              <div><span>Đã đặt cọc</span><b>{fmtMoney(depositPaidAmount(r))}</b></div>
              <div><span>Số dư còn lại</span><b className="cus-orange">{fmtMoney(due)}</b></div>
              <div><span>Hạn chung 24 giờ</span><b>{fmtDateTime(acc.dueAt)} <small className="cus-muted">({blocked ? 'tạm dừng do khiếu nại' : timeLeft(acc.dueAt)})</small></b></div>
              <div><span>Thanh toán (VNPay)</span><b>{bs === 'VERIFIED' ? 'Đã xác minh' : bs === 'PROCESSING' ? 'Đang xác minh' : bs === 'FAILED' ? 'Thất bại' : 'Chưa thanh toán'}</b></div>
              <div><span>Nghiệm thu</span><b>{acc.decidedAt ? `Đã xác nhận ${fmtDateTime(acc.decidedAt)}` : 'Chưa xác nhận'}</b></div>
            </div>
            {bs !== 'VERIFIED' && isPast(acc.dueAt) && !blocked && (
              <Note tone="yellow" title={`Quá hạn thanh toán từ ${fmtDateTime(acc.dueAt)}`}>{fmtMoney(due)} vẫn còn phải thanh toán theo hợp đồng. CBN Transport đã được thông báo; không có gì tự động đóng.</Note>
            )}
            {bs === 'FAILED' && lastBalance && <Note tone="red" title="Thanh toán VNPay gần nhất thất bại">{lastBalance.reason} Không có khoản tiền nào bị trừ, bạn có thể thanh toán lại.</Note>}
            <div className="cus-btn-row">
              {acc.status === 'PENDING' && (
                <button type="button" className="cus-btn cus-btn--solid" disabled={blocked} title={blocked ? 'Đang có khiếu nại chưa giải quyết' : ''} onClick={() => actions.confirmAcceptance(r.id)}>
                  <Icon name="check" />Xác nhận nghiệm thu
                </button>
              )}
              {acc.status === 'ACCEPTED' && due > 0 && !pendingBalance && (
                <button type="button" className="cus-btn cus-btn--solid" onClick={() => actions.payBalance(r.id)}><Icon name="card" />Thanh toán {fmtMoney(due)} qua VNPay</button>
              )}
              {pendingBalance && <span className="cus-muted" style={{ alignSelf: 'center' }}>Giao dịch {pendingBalance.id} đang được xác minh.</span>}
              {canComplain(r) && <button type="button" className="cus-btn" onClick={() => setComplaintOpen(true)}>Gửi khiếu nại</button>}
            </div>
            <p className="cus-muted" style={{ marginTop: 10 }}>Nghiệm thu trước rồi thanh toán và xác minh số dư trong hạn chung 24 giờ. Khiếu nại tạm dừng hạn; giải quyết xong được cấp lại 24 giờ.</p>
          </div>
        )}

        {['DELIVERED', 'CLOSED'].includes(r.status) && (
          <div className="cus-card">
            <h3 className="cus-card__title">Đóng yêu cầu <TripStatusBadge label={r.status === 'CLOSED' ? 'Đã đóng' : 'Đang mở'} tone={r.status === 'CLOSED' ? 'muted' : 'warn'} /></h3>
            <ul className="cus-check-list">
              {closureChecks(r).map(([label, done]) => <li key={label} className={done ? 'ok' : ''}><Icon name={done ? 'check' : 'clock'} /><span>{label}</span></li>)}
            </ul>
            <p className="cus-muted">{r.status === 'CLOSED' ? `Đã đóng ${fmtDateTime(r.closedAt)}.` : 'CBN Transport chỉ đóng yêu cầu khi đủ mọi điều kiện. Hoàn tất chuyến đi không tự đóng yêu cầu.'}</p>
          </div>
        )}
      </div>
      <DemoPanel request={r} />
      <ComplaintModal open={complaintOpen} requestId={r.id} onClose={() => setComplaintOpen(false)} />
    </div>
  );
};

/** Tab Bàn giao & Nghiệm thu (CHẾ ĐỘ GỌI BACKEND FLOW 6 THỰC TẾ) */
const RealCustomerHandoverTab: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const { actions: customerActions } = useCustomer();
  const notify = (message: string) => customerActions.showToast(message);
  const [loading, setLoading] = useState(true);
  const [settlement, setSettlement] = useState<T6.Settlement | null>(null);
  const [delivery, setDelivery] = useState<T6.Revision | null>(null);
  const [balance, setBalance] = useState<T6.Balance | null>(null);
  const [invoice, setInvoice] = useState<T6.Invoice | null>(null);
  const [feedback, setFeedback] = useState<T6.Feedback | null>(null);
  const [paying, setPaying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Form feedback
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const settlements = await flow6Api.getCustomerSettlements();
      const tripId = r.trip?.id || (r as any).tripId;
      const contractId = (r as any).contractId || r.versions?.[0]?.contractId;
      const s = settlements.find((x) => (tripId && x.tripId === tripId) || (contractId && x.contractId === contractId)) || settlements[0];
      if (s) {
        setSettlement(s);
        // Load details in parallel
        const [delivRes, balRes, invRes, fbRes] = await Promise.allSettled([
          flow6Api.getCustomerDelivery(s.id),
          flow6Api.getCustomerBalance(s.id),
          flow6Api.getCustomerInvoice(s.id),
          flow6Api.getCustomerFeedback(s.id),
        ]);
        if (delivRes.status === 'fulfilled') setDelivery(delivRes.value);
        if (balRes.status === 'fulfilled') setBalance(balRes.value);
        if (invRes.status === 'fulfilled') setInvoice(invRes.value);
        if (fbRes.status === 'fulfilled') setFeedback(fbRes.value);
      }
    } catch (e) {
      console.warn('[RealCustomerHandoverTab] Failed to load Flow 6 backend data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // Tự làm mới để thấy hóa đơn cuối / kết quả thanh toán mà không cần tải lại trang
    const timer = setInterval(() => { void loadData(true); }, 10000);
    const stopSync = onSync(() => { void loadData(true); });
    return () => { clearInterval(timer); stopSync(); };
  }, [r.id]);

  const handlePayBalance = async () => {
    if (!invoice?.id) return;
    setPaying(true);
    try {
      const key = generateUuidV4();
      const session = await flow6Api.createPaymentSession(invoice.id, key);
      if (session?.paymentUrl) {
        sessionStorage.setItem('last_deposit_payment_id', session.paymentId);
        sessionStorage.setItem('last_payment_request_id', r.id);
        window.location.href = session.paymentUrl;
      }
    } catch (err: any) {
      notify(`Không thể tạo phiên thanh toán: ${err?.message || 'Lỗi kết nối'}`);
    } finally {
      setPaying(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!settlement?.id) return;
    setDownloading(true);
    try {
      const blob = await flow6Api.downloadCustomerDeliveryPdf(settlement.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BienBanGiaoNhan_${settlement.id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      notify(`Không tải được tệp PDF: ${err?.message || 'Biên bản chưa sẵn sàng'}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlement?.id) return;
    setSubmittingFeedback(true);
    try {
      const key = generateUuidV4();
      const res = await flow6Api.submitFeedback(settlement.id, { rating, comment }, key);
      setFeedback(res);
      notify('Cảm ơn quý khách đã gửi đánh giá chất lượng chuyến đi!');
    } catch (err: any) {
      notify(`Không thể gửi đánh giá: ${err?.message || 'Có lỗi xảy ra'}`);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return <div className="cus-card"><p className="cus-muted">Đang tải dữ liệu bàn giao từ hệ thống...</p></div>;
  }

  if (!settlement && !delivery) {
    return (
      <LockedCard
        title="Chưa đến bước bàn giao hoặc chưa lập hồ sơ"
        text="Biên bản bàn giao và tất toán sẽ được tạo khi chuyến đi đến điểm giao và tổ xe bắt đầu thủ tục bàn giao."
      />
    );
  }

  return (
    <div className="cus-grid-main">
      <div className="cus-stack">
        {/* 1. Biên bản giao nhận ngựa (Delivery & OTP) */}
        {delivery && (
          <div className="cus-card">
            <h3 className="cus-card__title">
              Biên bản giao nhận ngựa{' '}
              <TripStatusBadge
                label={
                  delivery.status === 'CONFIRMED'
                    ? 'Đã xác nhận nhận ngựa'
                    : delivery.status === 'AWAITING_OTP'
                    ? 'Chờ xác thực OTP'
                    : delivery.status === 'REFUSED'
                    ? 'Từ chối nhận'
                    : 'Bản nháp'
                }
                tone={
                  delivery.status === 'CONFIRMED'
                    ? 'ok'
                    : delivery.status === 'AWAITING_OTP'
                    ? 'warn'
                    : delivery.status === 'REFUSED'
                    ? 'bad'
                    : 'muted'
                }
              />
            </h3>

            <div className="cus-kv">
              <div><span>Mã biên bản</span><b>{delivery.handoverId} (Bản #{delivery.number})</b></div>
              <div><span>Địa điểm giao</span><b>{delivery.content.location}</b></div>
              <div><span>Người nhận thực tế</span><b>{delivery.content.receiver.name}</b></div>
              <div><span>SĐT người nhận</span><b>{delivery.content.receiver.phone}</b></div>
              <div><span>Email nhận OTP</span><b>{delivery.content.receiver.otpEmail}</b></div>
              <div><span>Quyền nhận</span><b>{delivery.content.receiver.authorized ? 'Hợp lệ' : 'Chưa xác nhận'}</b></div>
              {delivery.confirmedAtUtc && <div><span>Thời gian xác nhận</span><b>{fmtDateTime(delivery.confirmedAtUtc)}</b></div>}
            </div>

            {delivery.status === 'AWAITING_OTP' && (
              <Note tone="yellow" title="Mã OTP đã được gửi đến email người nhận">
                Hệ thống đã gửi mã xác thực 6 chữ số đến email: <b>{delivery.content.receiver.otpEmail}</b>.
                Người nhận vui lòng kiểm tra hộp thư (kể cả thư rác) và đọc mã OTP cho nhân viên giao nhận để hoàn tất bàn giao.
              </Note>
            )}

            {delivery.status === 'CONFIRMED' && (
              <Note tone="green" title="Bàn giao hoàn tất hợp lệ">
                Biên bản đã được xác nhận bằng mã OTP chính xác lúc {fmtDateTime(delivery.confirmedAtUtc || '')}.
                Chuyến đi đã hoàn tất. Quý khách vui lòng kiểm tra bảng kê tất toán và thanh toán số dư còn lại.
              </Note>
            )}

            {delivery.status === 'REFUSED' && (
              <Note tone="red" title="Bàn giao bị từ chối">
                Lý do: {delivery.refusalReason || 'Không xác định'}. Chuyến xe đang được giữ nguyên trạng và chờ xử lý.
              </Note>
            )}

            <div className="cus-eyebrow" style={{ marginTop: 14 }}>Tình trạng đối chiếu vi mạch & sức khỏe ngựa</div>
            {delivery.content.items.map((item) => (
              <div key={item.horseId} className="cus-horse-line">
                <div>
                  <b>{item.identity?.name || item.horseId}</b>
                  <small>
                    Mã chip: {item.identity?.microchip || '—'} •{' '}
                    {item.microchipVerified ? 'Đã đối chiếu vi mạch' : 'Chưa đối chiếu'} •{' '}
                    Tài sản: {item.assets || 'Không có'}
                    {item.documents ? ` • Giấy tờ: ${item.documents}` : ''}
                  </small>
                </div>
                <TripStatusBadge label={item.condition} tone="ok" />
              </div>
            ))}

            <div className="cus-btn-row" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="cus-btn"
                disabled={downloading}
                onClick={handleDownloadPdf}
              >
                <Icon name="doc" /> {downloading ? 'Đang tải PDF...' : 'Tải PDF biên bản bàn giao'}
              </button>
            </div>
          </div>
        )}

        {/* 2. Bảng kê tất toán & Thanh toán số dư */}
        {settlement && balance && (
          <div className="cus-card">
            <h3 className="cus-card__title">
              Nghĩa vụ tài chính & Tất toán hợp đồng{' '}
              <TripStatusBadge
                label={
                  settlement.status === 'CLOSED'
                    ? 'Hồ sơ đã đóng'
                    : settlement.status === 'SETTLED'
                    ? 'Đã tất toán'
                    : balance.remainingVnd <= 0
                    ? 'Đã thu đủ số dư'
                    : 'Chờ thanh toán số dư'
                }
                tone={
                  settlement.status === 'CLOSED'
                    ? 'muted'
                    : settlement.status === 'SETTLED' || balance.remainingVnd <= 0
                    ? 'ok'
                    : 'warn'
                }
              />
            </h3>

            <div className="cus-kv">
              <div><span>Hồ sơ tất toán</span><b>{settlement.id}</b></div>
              <div><span>Giá trị hợp đồng</span><b>{fmtMoney(balance.signedPriceVnd)}</b></div>
              <div><span>Đã đặt cọc</span><b>{fmtMoney(balance.depositPaidVnd)}</b></div>
              <div><span>Chi phí phát sinh</span><b>{fmtMoney(balance.chargesVnd)}</b></div>
              <div><span>Giảm giá / Miễn trừ</span><b>{fmtMoney(balance.discountsVnd)}</b></div>
              <div><span>Tổng số dư phải thu</span><b>{fmtMoney(balance.finalDueVnd)}</b></div>
              <div><span>Đã thanh toán</span><b>{fmtMoney(balance.finalPaidVnd)}</b></div>
              <div>
                <span>Số dư còn lại</span>
                <b className={balance.remainingVnd > 0 ? 'cus-orange' : ''}>
                  {fmtMoney(balance.remainingVnd)}
                </b>
              </div>
            </div>

            {balance.remainingVnd > 0 && invoice && (
              <div className="cus-btn-row" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="cus-btn cus-btn--solid"
                  disabled={paying}
                  onClick={handlePayBalance}
                >
                  <Icon name="card" /> {paying ? 'Đang kết nối VNPay...' : `Thanh toán số dư ${fmtMoney(balance.remainingVnd)} qua VNPay`}
                </button>
              </div>
            )}

            {balance.remainingVnd > 0 && !invoice && (
              <div style={{ marginTop: 12 }}>
                <Note tone="yellow" title="Chờ phát hành hóa đơn tất toán">
                  CBN Transport đang hoàn thiện bảng kê và phát hành hóa đơn cuối cùng (Final Invoice). Quý khách sẽ có thể thanh toán qua VNPay ngay khi hóa đơn được phát hành.
                </Note>
              </div>
            )}

            {balance.remainingVnd <= 0 && (
              <div style={{ marginTop: 12 }}>
                <Note tone="green" title="Đã hoàn tất thanh toán">
                  Quý khách đã hoàn thành toàn bộ nghĩa vụ tài chính cho chuyến vận chuyển này.
                </Note>
              </div>
            )}
          </div>
        )}

        {/* 3. Đánh giá chất lượng dịch vụ (Feedback) */}
        {settlement && ['SETTLED', 'CLOSED'].includes(settlement.status) && (
          <div className="cus-card">
            <h3 className="cus-card__title">Đánh giá dịch vụ sau bàn giao</h3>
            {feedback ? (
              <div className="cus-kv">
                <div><span>Đánh giá</span><b>{feedback.rating}/5 sao</b></div>
                <div><span>Ý kiến của bạn</span><b>{feedback.comment || 'Không có nhận xét'}</b></div>
                <div><span>Gửi lúc</span><b>{fmtDateTime(feedback.createdAtUtc)}</b></div>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label htmlFor="fb-rating" style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Số sao đánh giá (1 - 5 sao):</label>
                  <select
                    id="fb-rating"
                    className="cus-select"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
                  >
                    <option value={5}>5 sao - Rất hài lòng</option>
                    <option value={4}>4 sao - Hài lòng</option>
                    <option value={3}>3 sao - Bình thường</option>
                    <option value={2}>2 sao - Chưa hài lòng</option>
                    <option value={1}>1 sao - Rất không hài lòng</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="fb-comment" style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Ý kiến đóng góp:</label>
                  <textarea
                    id="fb-comment"
                    className="cus-input"
                    rows={3}
                    placeholder="Chia sẻ trải nghiệm của bạn về quy trình vận chuyển và chăm sóc ngựa..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    className="cus-btn cus-btn--solid"
                    disabled={submittingFeedback}
                  >
                    {submittingFeedback ? 'Đang gửi...' : 'Gửi đánh giá'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const HandoverTab: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const isDemo = getDemoMode('customer');
  if (isDemo) {
    return <MockHandoverTab request={r} />;
  }
  return <RealCustomerHandoverTab request={r} />;
};

export default HandoverTab;
