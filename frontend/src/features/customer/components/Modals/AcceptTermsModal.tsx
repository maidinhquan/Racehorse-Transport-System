import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useCustomer } from '../../hooks/useCustomer';
import { ctRef, curVersion, depositAmount, fmtDateTime, fmtMoney, timeLeft } from '../../hooks/customerRules';

interface AcceptTermsModalProps {
  open: boolean;
  requestId: string;
  onClose: () => void;
  onAccepted: () => void;
}

/** Bước 1 của trình tự ký: đồng ý điều khoản phiên bản hiện hành (sau đó đặt cọc rồi ký OTP) */
export const AcceptTermsModal: React.FC<AcceptTermsModalProps> = ({ open, requestId, onClose, onAccepted }) => {
  const { getRequest, actions } = useCustomer();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setChecked(false); setError(''); } }, [open]);
  const r = getRequest(requestId);
  const v = r ? curVersion(r) : undefined;
  if (!r || !v) return null;

  const submit = () => {
    if (!checked) return setError('Tích ô xác nhận để đồng ý điều khoản.');
    const res = actions.acceptTerms(requestId);
    if (!res.ok) return setError(res.message);
    onAccepted();
  };

  return (
    <Modal open={open} title={`Đồng ý điều khoản ${ctRef(v)}?`} okText="Đồng ý điều khoản" onClose={onClose} onOk={submit} error={error}>
      <p>
        Tổng hợp đồng <b>{fmtMoney(v.total)} USD</b> • tiền cọc {v.depositPct}%: <b>{fmtMoney(depositAmount(r))}</b> •
        hạn chung <b>{fmtDateTime(v.validUntil)}</b> ({timeLeft(v.validUntil)}).
      </p>
      <ul className="cus-rule-list">
        <li>Tiếp theo, thanh toán tiền cọc. Tiền cọc được cổng thanh toán Sandbox xác minh.</li>
        <li>Nút ký OTP chỉ mở sau khi xác minh. Ký OTP thành công làm hợp đồng có hiệu lực và kích hoạt yêu cầu.</li>
      </ul>
      <label className="cus-check">
        <input type="checkbox" checked={checked} onChange={(e) => { setChecked(e.target.checked); setError(''); }} />
        Tôi đã đọc và đồng ý với giá chính thức và điều khoản của {ctRef(v)}.
      </label>
    </Modal>
  );
};

export default AcceptTermsModal;
