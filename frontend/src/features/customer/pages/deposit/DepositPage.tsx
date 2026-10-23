import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomerLayout } from '../../components/CustomerLayout';
import { Note } from '../../components/Common/Common';
import { useCustomer } from '../../hooks/useCustomer';
import { customerApi } from '../../api/customerApi';
import { canPayDeposit, curVersion, depositAmount, fmtMoney, fmtDateTime } from '../../hooks/customerRules';
import './DepositPage.css';
export const DepositPage: React.FC = () => {
  const { requestId = '' } = useParams(); const navigate = useNavigate();
  const { getRequest, actions } = useCustomer(); const [busy, setBusy] = useState(false);
  const r = getRequest(requestId), v = r && curVersion(r);
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
      <div className="cus-btn-row"><button className="cus-btn" onClick={() => navigate(`/customer/requests/${requestId}/payment`)}>Quay lại</button>
        <button className="cus-btn" onClick={() => actions.reload()}>Kiểm tra trạng thái</button>
        <button className="cus-btn cus-btn--solid" disabled={busy || !canPayDeposit(r)} onClick={pay}>{busy ? 'Đang tạo phiên…' : 'Thanh toán qua VNPay'}</button>
      </div>
    </div>}
  </CustomerLayout>;
};
export default DepositPage;
