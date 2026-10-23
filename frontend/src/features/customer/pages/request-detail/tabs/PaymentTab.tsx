import { downloadFile } from '../../../../../shared/api/downloadFile';
import { useCustomer } from '../../../hooks/useCustomer';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { TransportRequest } from '../../../types';
import {
  canPayDeposit,
  canSign,
  cityLabel,
  ctRef,
  curVersion,
  depositAmount,
  depositState,
  fmtDateTime,
  fmtMoney,
  isSigned,
  qrExpired,
  signedVersion,
  versionState,
} from '../../../hooks/customerRules';
import { Icon } from '../../../components/CustomerLayout';
import { DemoPanel } from '../../../components/DemoPanel/DemoPanel';
import { LockedCard, Note } from '../../../components/Common/Common';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';

const REFUND_LABEL = { REQUESTED: 'Đã yêu cầu hoàn', PROCESSING: 'Đang xử lý', REFUNDED: 'Đã hoàn tiền' } as const;

/** Tab Thanh toán: tiền cọc, các giao dịch của yêu cầu, hoàn tiền và thanh toán số dư */
export const PaymentTab: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const navigate = useNavigate();
  const { actions } = useCustomer();
  const v = curVersion(r);
  if (!v || (!v.termsAcceptedAt && !r.payments.length)) {
    return (
      <LockedCard title="Chưa thể thanh toán"
        text={r.status === 'REJECTED' ? 'Yêu cầu bị từ chối.' : r.status === 'CANCELLED' ? 'Yêu cầu đã hủy.' : 'Thanh toán cọc mở sau khi bạn đồng ý điều khoản của phiên bản hợp đồng hiện hành.'} />
    );
  }
  const sv = signedVersion(r) ?? v;
  const ds = depositState(r);
  const last = [...r.payments].reverse().find((p) => p.type === 'DEPOSIT');
  const note: Record<typeof ds, ['blue' | 'yellow' | 'green' | 'red' | 'grey', string, string]> = {
    NONE: ['blue', 'Chờ thanh toán', `Thanh toán và xác minh tiền cọc ${fmtMoney(depositAmount(r))}, rồi ký OTP trước ${fmtDateTime(v.validUntil)}.`],
    PENDING: ['yellow', 'Đang xử lý / chờ xác minh', 'Cổng thanh toán chưa xác nhận giao dịch. Bấm nút không đồng nghĩa đã thanh toán.'],
    VERIFIED: r.status === 'CANCELLED' || r.status === 'CANCELLATION_REQUESTED'
      ? ['grey', 'Đã xác minh cọc – yêu cầu hủy trước khi ký', 'Hợp đồng chưa ký nên chưa có hiệu lực. Tiền cọc được hoàn đầy đủ; trạng thái hoàn tiền hiển thị bên dưới.']
      : isSigned(r) ? ['green', 'Thanh toán thành công', `Tiền cọc đã xác minh. Hợp đồng ${ctRef(sv)} có hiệu lực.`]
      : ['green', 'Đã xác minh cọc – chờ ký', versionState(v) === 'EXPIRED' ? 'Đã quá hạn ký – CBN Transport sẽ gia hạn hoặc hoàn tiền. Khoản tiền của bạn được giữ.' : `Ký ${ctRef(v)} bằng OTP trước ${fmtDateTime(v.validUntil)} để kích hoạt yêu cầu.`],
    FAILED: ['red', 'Thanh toán thất bại', `${last?.reason ?? (qrExpired(last) ? 'Mã QR đã hết hạn.' : '')} Không có khoản tiền nào bị trừ. Bạn có thể thanh toán lại; yêu cầu vẫn còn hiệu lực.`],
  };
  const [tone, title, msg] = note[ds];

  return (
    <>
      <Note tone={tone} title={title}>{msg}</Note>
      <div className="cus-grid-main" style={{ marginTop: 16 }}>
        <div className="cus-stack">
          {r.refund && (
            <div className="cus-card">
              <h3 className="cus-card__title">Hoàn tiền cọc <TripStatusBadge label={REFUND_LABEL[r.refund.status]} tone={r.refund.status === 'REFUNDED' ? 'ok' : 'warn'} /></h3>
              <ul className="cus-check-list">
                <li className="ok"><Icon name="check" /><span>Đã yêu cầu hoàn {fmtMoney(r.refund.amount)} • {fmtDateTime(r.refund.at)}</span></li>
                <li className={r.refund.status !== 'REQUESTED' ? 'ok' : ''}><Icon name={r.refund.status !== 'REQUESTED' ? 'check' : 'clock'} /><span>Đang xử lý hoàn tiền</span></li>
                <li className={r.refund.status === 'REFUNDED' ? 'ok' : ''}><Icon name={r.refund.status === 'REFUNDED' ? 'check' : 'clock'} />
                  <span>Đã hoàn tiền{r.refund.refundedAt ? ` ${fmtDateTime(r.refund.refundedAt)} • mã ${r.refund.reference}` : ''}</span></li>
              </ul>
            </div>
          )}
          <div className="cus-card">
            <h3 className="cus-card__title">{isSigned(r) ? 'Tiền cọc của hợp đồng đã ký' : 'Tiền cọc của hợp đồng'} <TripStatusBadge kind="deposit" status={ds} /></h3>
            <div className="cus-kv">
              <div><span>Hợp đồng</span><b>{ctRef(sv)}</b></div>
              <div><span>Ngày ký</span><b>{sv.signedAt ? fmtDateTime(sv.signedAt) : 'Chưa ký'}</b></div>
              <div><span>Tổng hợp đồng</span><b>{fmtMoney(sv.total)}</b></div>
              <div><span>Tiền cọc phải trả</span><b className="cus-orange">{fmtMoney(depositAmount(r))}</b></div>
              <div><span>Số dư còn lại</span><b>{fmtMoney(sv.total - depositAmount(r))}</b></div>
              <div><span>Hạn chung cọc / ký OTP</span><b>{sv.signedAt ? 'Đã hoàn tất' : fmtDateTime(sv.validUntil)}</b></div>
            </div>
            {canSign(r) && <Note tone="green" title="Sandbox đã xác minh tiền cọc">Hãy xem lại toàn bộ hợp đồng và xác nhận lần cuối trước khi nhập OTP.</Note>}
            <div className="cus-btn-row">
              <button type="button" className="cus-btn" onClick={() => navigate(`/customer/requests/${r.id}/contract/v/${sv.v}`)}><Icon name="file" />Xem hợp đồng</button>
              {canSign(r) && <button type="button" className="cus-btn cus-btn--solid" onClick={() => navigate(`/customer/requests/${r.id}/sign`)}>Xem lại & ký OTP</button>}
              {canPayDeposit(r) && <button type="button" className="cus-btn cus-btn--solid" onClick={() => navigate(`/customer/requests/${r.id}/deposit`)}>{ds === 'FAILED' ? 'Thử lại – tạo QR mới' : 'Thanh toán tiền cọc'}</button>}
            </div>
          </div>

          <div className="cus-card" style={{ padding: 0 }}>
            <h3 className="cus-card__title" style={{ padding: '16px 18px 0' }}>Các giao dịch của yêu cầu</h3>
            <div className="cus-table-wrap">
              <table className="cus-table">
                <thead><tr><th>Mã giao dịch</th><th>Loại</th><th>Phương thức</th><th className="num">Số tiền</th><th>Trạng thái</th><th>Thời gian</th></tr></thead>
                <tbody>
                  {[...r.payments].reverse().map((p) => (
                    <tr key={p.id}>
                      <td className="cus-id">{p.id}{p.status === 'SUCCESS' && <div><button type="button" className="cus-link" onClick={() => downloadFile(`/customer/payments/${p.id}/receipt`, `${p.id}.pdf`).catch(error => actions.showToast(error.message))}>Biên nhận</button></div>}</td>
                      <td>{p.type === 'DEPOSIT' ? 'Tiền cọc' : 'Số dư'}</td>
                      <td>{p.method === 'QR_SANDBOX' ? 'QR Sandbox' : 'VNPay'}</td>
                      <td className="num">{fmtMoney(p.amount)}</td>
                      <td><TripStatusBadge kind="payment" status={qrExpired(p) ? 'FAILED' : p.status} label={qrExpired(p) ? 'QR hết hạn' : undefined} />{p.reason && <div className="cus-muted">{p.reason}</div>}</td>
                      <td>{fmtDateTime(p.createdAt)}{p.confirmedAt && <div className="cus-muted">Xác minh {fmtDateTime(p.confirmedAt)}</div>}</td>
                    </tr>
                  ))}
                  {!r.payments.length && <tr><td colSpan={6} className="cus-empty">Chưa có giao dịch nào.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {r.acceptance && (
            <div className="cus-card">
              <h3 className="cus-card__title">Thanh toán số dư</h3>
              <p className="cus-subtitle">Nghiệm thu trước rồi thanh toán số dư trong hạn chung 24 giờ kể từ bàn giao (hoặc hạn mới sau khiếu nại).</p>
              <button type="button" className="cus-btn cus-btn--solid" style={{ marginTop: 10 }} onClick={() => navigate(`/customer/requests/${r.id}/handover`)}>Bàn giao & nghiệm thu</button>
            </div>
          )}
        </div>
        <div className="cus-stack">
          <div className="cus-card">
            <div className="cus-eyebrow">Tóm tắt hợp đồng</div>
            <div className="cus-summary" style={{ marginTop: 10 }}>
              <div><span>Hợp đồng</span><b>{ctRef(sv)}</b></div>
              <div><span>Trạng thái</span><TripStatusBadge kind="contract" status={versionState(sv)} /></div>
              <div><span>Tuyến</span><b>{cityLabel(r.origin)} → {cityLabel(r.destination)}</b></div>
              <div><span>Số ngựa</span><b>{r.horseCount}</b></div>
            </div>
          </div>
          <DemoPanel request={r} />
        </div>
      </div>
    </>
  );
};

export default PaymentTab;
