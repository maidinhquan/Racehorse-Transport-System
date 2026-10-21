import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { ContractBody } from '../../components/ContractBody/ContractBody';
import { LockedCard, Note } from '../../components/Common/Common';
import { OtpModal, ReasonModal } from '../../components/Modals';
import { useClock, useCustomer } from '../../hooks/useCustomer';
import { canSign, ctRef, curVersion, depositAmount, fmtDateTime, fmtMoney, signBlock, timeLeft } from '../../hooks/customerRules';
import './ContractPages.css';

/** Xem lại toàn bộ trước khi ký (chỉ xem) → xác nhận lần cuối → gửi OTP → ký */
export const ReviewSignPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestId = '' } = useParams<{ requestId: string }>();
  const { horses, getRequest, actions } = useCustomer();
  useClock(30000);
  const [confirmed, setConfirmed] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const r = getRequest(requestId);
  const v = r ? curVersion(r) : undefined;
  const back = () => navigate(`/customer/requests/${requestId}/contract`);

  if (!r || !v || (!canSign(r) && !otpOpen)) {
    return (
      <CustomerLayout title="Ký hợp đồng">
        <button type="button" className="cus-back" onClick={back}><Icon name="back" />Hợp đồng & chi phí</button>
        <LockedCard title="Chưa thể ký" text={r ? signBlock(r) || 'Hợp đồng đã được ký hoặc không còn ở bước ký.' : 'Không tìm thấy yêu cầu.'} />
      </CustomerLayout>
    );
  }

  const sendOtp = () => {
    if (!confirmed) return actions.showToast('Vui lòng đọc hợp đồng và tích xác nhận lần cuối trước khi nhận OTP.');
    if (actions.sendSignOtp(r.id).ok) setOtpOpen(true);
  };

  return (
    <CustomerLayout title="Ký hợp đồng">
      <button type="button" className="cus-back" onClick={back}><Icon name="back" />Hợp đồng & chi phí</button>
      <div className="cus-head">
        <div>
          <h2 className="cus-title">Xem lại trước khi ký</h2>
          <p className="cus-subtitle">{ctRef(v)} • {r.id} • toàn bộ nội dung bạn sắp ký (chỉ xem)</p>
        </div>
      </div>
      <Note tone="blue" title="Không thể chỉnh sửa tại đây">Nếu có sai sót, hãy hủy bước ký và yêu cầu Manager sửa hợp đồng hiện hành.</Note>
      <Note tone="green" title={`Đã xác minh cọc • hạn ký ${fmtDateTime(v.validUntil)} (${timeLeft(v.validUntil)})`}>Ký bằng OTP làm {ctRef(v)} có hiệu lực và kích hoạt yêu cầu.</Note>

      <div className="cus-grid-main" style={{ marginTop: 16 }}>
        <ContractBody request={r} v={v} horses={horses} />
        <div className="cus-card cus-sign-side">
          <div className="cus-eyebrow">Tiền cọc & số dư</div>
          <div className="cus-summary" style={{ marginTop: 10 }}>
            <div className="hl"><span>Tổng hợp đồng</span><b>{fmtMoney(v.total)} USD</b></div>
            <div><span>Tiền cọc ({v.depositPct}%)</span><b>{fmtMoney(depositAmount(r))}</b></div>
            <div><span>Số dư</span><b>{fmtMoney(v.total - depositAmount(r))}</b></div>
            <div><span>Tiền cọc</span><b className="cus-ok">Đã xác minh</b></div>
            <div><span>Hạn ký</span><b>{fmtDateTime(v.validUntil)}</b></div>
          </div>
          <Note tone="blue" title="Xác nhận lần cuối trước khi ký">Kiểm tra bản hợp đồng hiện hành và đủ {12} điều khoản. Sau khi xác nhận bạn mới có thể nhận mã OTP.</Note>
          <label className="cus-check">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            Tôi đã đọc, kiểm tra và đồng ý toàn bộ nội dung {ctRef(v)}. Tôi hiểu rằng ký OTP sẽ làm hợp đồng có hiệu lực.
          </label>
          <button type="button" className="cus-btn cus-btn--solid cus-btn--block" style={{ marginTop: 14 }} disabled={!confirmed} onClick={sendOtp}>Gửi mã OTP để ký</button>
          <button type="button" className="cus-btn cus-btn--danger cus-btn--block" onClick={() => setCancelOpen(true)}>Hủy yêu cầu</button>
          <button type="button" className="cus-btn cus-btn--block" onClick={back}>Quay lại hợp đồng</button>
        </div>
      </div>

      <OtpModal open={otpOpen} requestId={r.id} onClose={() => setOtpOpen(false)}
        onSigned={() => { setOtpOpen(false); navigate(`/customer/requests/${r.id}`); }} />
      <ReasonModal open={cancelOpen} title={`Hủy ${r.id}?`} okText="Gửi yêu cầu hủy" danger confirmText="Tôi muốn hủy yêu cầu này"
        intro={<Note tone="yellow" title="Đã có thanh toán tiền cọc">CBN Transport đối soát khoản thanh toán và hoàn tiền trước khi hủy chính thức.</Note>}
        onClose={() => setCancelOpen(false)} onSubmit={(reason) => { const ok = actions.cancelRequest(r.id, reason).ok; if (ok) navigate(`/customer/requests/${r.id}`); return ok; }} />
    </CustomerLayout>
  );
};

export default ReviewSignPage;
