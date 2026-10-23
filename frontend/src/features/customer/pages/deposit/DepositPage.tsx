import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { DemoPanel } from '../../components/DemoPanel/DemoPanel';
import { Note } from '../../components/Common/Common';
import { useClock, useCustomer } from '../../hooks/useCustomer';
import { customerApi } from '../../api/customerApi';
import {
  QR_MINUTES,
  canPayDeposit,
  clockMs,
  ctRef,
  curVersion,
  depositAmount,
  depositState,
  fmtDateTime,
  fmtMoney,
  timeLeft,
} from '../../hooks/customerRules';
import './DepositPage.css';

/** Mã QR minh họa (không mã hóa giao dịch thật) */
function QrPattern({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    const n = 25, out: Array<[number, number]> = [];
    let h = 7;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => (h = (h * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const corner = [[0, 0], [n - 7, 0], [0, n - 7]].find(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7);
        let on = rnd() > 0.5;
        if (corner) {
          const dx = x - corner[0], dy = y - corner[1], inside = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
          on = inside && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
        }
        if (on) out.push([x, y]);
      }
    }
    return out;
  }, [seed]);
  return (
    <svg viewBox="0 0 25 25" width={196} height={196} shapeRendering="crispEdges" fill="#0f172a" role="img" aria-label="Mã QR thanh toán minh họa">
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />)}
    </svg>
  );
}

/** Thanh toán tiền cọc bằng QR Sandbox: mã QR có hiệu lực 5 phút, chỉ kết quả từ Sandbox mới được tính là đã thanh toán */
export const DepositPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestId = '' } = useParams<{ requestId: string }>();
  const { getRequest, actions } = useCustomer();
  const now = useClock(1000);
  const [session, setSession] = useState(() => ({ id: `${requestId}-QR-${Date.now()}`, expiresAtMs: clockMs() + QR_MINUTES * 60000 }));
  const [vnpayLoading, setVnpayLoading] = useState(false);
  const r = getRequest(requestId);
  const v = r ? curVersion(r) : undefined;

  if (!r || !v) {
    return <CustomerLayout title="Thanh toán cọc"><Note tone="grey" title="Không tìm thấy hợp đồng">Yêu cầu {requestId} chưa có hợp đồng.</Note></CustomerLayout>;
  }
  const ds = depositState(r);
  const back = () => navigate(`/customer/requests/${r.id}/payment`);

  if (!canPayDeposit(r)) {
    return (
      <CustomerLayout title="Thanh toán cọc">
        <button type="button" className="cus-back" onClick={back}><Icon name="back" />Quay lại {r.id}</button>
        <h2 className="cus-title">Thanh toán tiền cọc</h2>
        <div className="cus-grid-main" style={{ marginTop: 16 }}>
          <div>
            {ds === 'PENDING' && <Note tone="yellow" title="Đang chờ Sandbox xác minh giao dịch">Giao dịch chỉ thành công khi có kết quả xác minh từ Sandbox, không phải khi bấm nút thanh toán.</Note>}
            {ds === 'VERIFIED' && <Note tone="green" title="Tiền cọc đã được xác minh">Bạn có thể xem lại và ký hợp đồng bằng OTP.</Note>}
            {ds === 'NONE' && <Note tone="grey" title="Chưa thể thanh toán">{v.termsAcceptedAt ? 'Phiên bản hợp đồng không còn hiệu lực thanh toán.' : 'Hãy đồng ý điều khoản hợp đồng trước khi thanh toán cọc.'}</Note>}
            <div className="cus-btn-row">
              <button type="button" className="cus-btn" onClick={back}>Xem tab Thanh toán</button>
              {ds === 'VERIFIED' && <button type="button" className="cus-btn cus-btn--solid" onClick={() => navigate(`/customer/requests/${r.id}/sign`)}>Xem lại & ký OTP</button>}
              {ds === 'NONE' && !v.termsAcceptedAt && <button type="button" className="cus-btn cus-btn--solid" onClick={() => navigate(`/customer/requests/${r.id}/contract`)}>Xem hợp đồng</button>}
            </div>
          </div>
          <DemoPanel request={r} />
        </div>
      </CustomerLayout>
    );
  }

  const leftSec = Math.max(0, Math.ceil((session.expiresAtMs - now) / 1000));
  const expired = leftSec === 0;
  const amount = depositAmount(r);
  const retry = () => setSession({ id: `${r.id}-QR-${Date.now()}`, expiresAtMs: clockMs() + QR_MINUTES * 60000 });
  const confirm = () => { const res = actions.confirmDepositTransfer(r.id, session.expiresAtMs); if (res.ok) back(); };

  const handleVnpay = async () => {
    const cId = v.contractId || r.versions?.[0]?.contractId || r.id;
    setVnpayLoading(true);
    sessionStorage.setItem('last_deposit_contract_id', cId);
    sessionStorage.setItem('last_deposit_request_id', r.id);
    const res = await customerApi.payDeposit(cId);
    setVnpayLoading(false);
    if (res.ok && res.paymentUrl) {
      window.location.href = res.paymentUrl;
    } else {
      actions.showToast(res.message || 'Không thể tạo phiên thanh toán VNPay');
    }
  };

  return (
    <CustomerLayout title="Thanh toán cọc">
      <button type="button" className="cus-back" onClick={() => navigate(`/customer/requests/${r.id}/contract`)}><Icon name="back" />Quay lại {r.id}</button>
      <h2 className="cus-title">Thanh toán tiền cọc</h2>
      <p className="cus-subtitle">Hợp đồng {ctRef(v)} • {r.id} • hạn chung cọc / ký OTP {fmtDateTime(v.validUntil)} ({timeLeft(v.validUntil)})</p>
      {ds === 'FAILED' && <Note tone="red" title="Lần thanh toán trước chưa thành công">Mã QR mới có hiệu lực {QR_MINUTES} phút. Tạo mã mới không gia hạn hợp đồng.</Note>}
      {expired && <Note tone="red" title="Mã QR đã hết hạn">Bấm “Thử lại” để tạo mã QR mới có hiệu lực {QR_MINUTES} phút.</Note>}

      <div className="cus-card cus-deposit">
        <div className="cus-kv">
          <div><span>Tổng giá trị hợp đồng</span><b>{fmtMoney(v.total)}</b></div>
          <div><span>Tỷ lệ cọc</span><b>{v.depositPct}%</b></div>
          <div><span>Số tiền cọc</span><b className="cus-orange cus-deposit__amount">{fmtMoney(amount)}</b></div>
          <div><span>Số dư còn lại</span><b>{fmtMoney(v.total - amount)}</b></div>
        </div>
        <div className="cus-deposit__qr">
          <div className={`cus-deposit__code ${expired ? 'expired' : ''}`}><QrPattern seed={session.id} /></div>
          <div>
            <div className="cus-eyebrow">Mã QR thanh toán • Sandbox</div>
            <div className="cus-deposit__timer">Còn hiệu lực <b>{expired ? 'Đã hết hạn' : `${String(Math.floor(leftSec / 60)).padStart(2, '0')}:${String(leftSec % 60).padStart(2, '0')}`}</b></div>
            <div className="cus-summary" style={{ marginTop: 10 }}>
              <div><span>Người thụ hưởng</span><b>CBN Transport</b></div>
              <div><span>Số tiền</span><b>{fmtMoney(amount)}</b></div>
              <div><span>Nội dung chuyển khoản</span><b>{r.id}-DEPOSIT</b></div>
            </div>
            <p className="cus-muted" style={{ marginTop: 10 }}>Đây là mã QR minh họa, không chuyển tiền thật. Chỉ xác nhận thành công từ Sandbox mới được tính là đã thanh toán.</p>
          </div>
        </div>
        <Note tone="grey" title="Cách xác minh">Cổng thanh toán Sandbox kiểm tra và xác nhận giao dịch. Bấm nút không phải là xác minh. Nút ký OTP chỉ mở sau khi xác minh; ký OTP mới kích hoạt yêu cầu.</Note>
        <div className="cus-btn-row" style={{ justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" className="cus-btn cus-btn--lg" onClick={back}>Để sau</button>
          <button
            type="button"
            className="cus-btn cus-btn--lg"
            style={{ background: '#005baa', color: '#fff' }}
            disabled={vnpayLoading}
            onClick={handleVnpay}
          >
            {vnpayLoading ? 'Đang tạo giao dịch...' : 'Thanh toán qua Cổng VNPay'}
          </button>
          {expired
            ? <button type="button" className="cus-btn cus-btn--solid cus-btn--lg" onClick={retry}>Thử lại – tạo QR mới</button>
            : <button type="button" className="cus-btn cus-btn--solid cus-btn--lg" onClick={confirm}>Tôi đã quét mã & thanh toán (Sandbox)</button>}
        </div>
      </div>
    </CustomerLayout>
  );
};

export default DepositPage;
