import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomerLayout } from '../../components/CustomerLayout';
import { Note } from '../../components/Common/Common';
import { useCustomer } from '../../hooks/useCustomer';
import { customerApi } from '../../api/customerApi';
import { canPayDeposit, curVersion, depositAmount, fmtMoney, fmtDateTime, resumableDepositPayment, depositPayments } from '../../hooks/customerRules';
import './DepositPage.css';
import { onSync } from '../../../../shared/utils/syncChannel';
export const DepositPage: React.FC = () => {
  const { requestId = '' } = useParams(); const navigate = useNavigate();
  const { getRequest, actions } = useCustomer(requestId); const [busy, setBusy] = useState(false);
  const r = getRequest(requestId), v = r && curVersion(r);
  const resume = r && resumableDepositPayment(r);
  const pending = r && depositPayments(r).find(p => p.status === 'PROCESSING');
  useEffect(() => {
    const reload = () => { void actions.loadRequest(requestId); };
    window.addEventListener('pageshow', reload);
    const timer = window.setInterval(reload, 15000);
    const stopSync = onSync(reload);
    return () => { window.removeEventListener('pageshow', reload); window.clearInterval(timer); stopSync(); };
  }, [requestId, actions]);
  const check = async () => {
    if (busy || !pending) return;
    setBusy(true);
    try {
      const result = await customerApi.getPayment(pending.id, true);
      await actions.loadRequest(requestId);
      actions.showToast(result.status === 'SUCCESS' ? 'Đã xác minh tiền cọc.'
        : ['FAILED', 'REJECTED'].includes(result.status) ? 'Giao dịch không thành công. Bạn có thể thanh toán lại.'
        : result.reviewReason || 'VNPay chưa xác nhận kết quả. Hệ thống sẽ tiếp tục đối soát.');
    } catch (error) { actions.showToast(error instanceof Error ? error.message : 'Chưa kiểm tra được trạng thái.'); }
    finally { setBusy(false); }
  };
  const pay = async () => {
    if (busy) return; setBusy(true);
    const result = await customerApi.payDeposit(requestId); setBusy(false);
    if (result.ok && result.paymentUrl) {
      sessionStorage.setItem('last_deposit_request_id', requestId);
      window.location.assign(result.paymentUrl);
    } else actions.showToast(result.message || 'Chưa tạo được phiên thanh toán.');
  };
  return <CustomerLayout title="Thanh toán cọc">
    <h2 className="cus-title">Thanh toán tiền cọc</h2>
    {!r || !v ? <Note tone="grey" title="Chưa có hợp đồng">Tải lại yêu cầu để kiểm tra hợp đồng.</Note> : <div className="cus-card">
      <p>Hợp đồng {v.number} v{v.v} • Cọc {v.depositPct}%: <b>{fmtMoney(v.depositAmount ?? depositAmount(r))}</b></p>
      <p>Hạn hoàn tất: {fmtDateTime(v.validUntil)}.</p>
      <Note tone="grey" title="Xác minh thanh toán">Trạng thái được cập nhật sau khi máy chủ xác minh tiền. Sau khi cọc được xác minh đủ, bạn có thể ký hợp đồng bằng OTP.</Note>
      {pending && <Note tone="yellow" title={resume ? 'Có thể tiếp tục phiên thanh toán hiện tại' : 'Chờ đối soát giao dịch'}>
        {pending.reviewReason || (resume ? 'Nút Tiếp tục thanh toán mở lại cùng giao dịch và giữ nguyên hạn phiên.'
          : 'Phiên chưa có kết quả cuối cùng. Cần VNPay xác nhận trước khi thanh toán lại.')}
        {' '}Nếu đối soát gặp lỗi, hệ thống tự thử lại sau 5 phút. Bạn có thể bấm Kiểm tra trạng thái.
      </Note>}
      <div className="cus-btn-row"><button className="cus-btn" onClick={() => navigate(`/customer/requests/${requestId}/payment`)}>Quay lại</button>
        <button className="cus-btn" disabled={busy || !pending} title={!pending ? 'Chưa có giao dịch cần đối soát' : busy ? 'Đang kiểm tra' : undefined} onClick={check}>Kiểm tra trạng thái</button>
        <button className="cus-btn cus-btn--solid" disabled={busy || (!canPayDeposit(r) && !resume)}
          title={busy ? 'Đang xử lý' : !canPayDeposit(r) && !resume ? 'Cần đối soát giao dịch cũ trước khi thanh toán lại' : undefined}
          onClick={pay}>{busy ? 'Đang mở phiên…' : resume ? 'Tiếp tục thanh toán qua VNPay' : 'Thanh toán qua VNPay'}</button>
      </div>
    </div>}
  </CustomerLayout>;
};
export default DepositPage;
