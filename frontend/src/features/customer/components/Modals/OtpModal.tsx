import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { useClock, useCustomer } from '../../hooks/useCustomer';
import { ctRef, curVersion } from '../../hooks/customerRules';
import { DEMO_OTP } from '../../data/mockData';

interface OtpModalProps {
  open: boolean;
  requestId: string;
  onClose: () => void;
  onSigned: () => void;
}

/** Nhập mã OTP 6 số để ký hợp đồng (mã có hiệu lực 120 giây, sai tối đa 5 lần) */
export const OtpModal: React.FC<OtpModalProps> = ({ open, requestId, onClose, onSigned }) => {
  const { otp, profile, getRequest, actions } = useCustomer();
  const now = useClock(500);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const r = getRequest(requestId);
  const v = r ? curVersion(r) : undefined;

  useEffect(() => {
    if (!open) return;
    setDigits(Array(6).fill('')); setError(''); setSubmitting(false);
    setTimeout(() => refs.current[0]?.focus(), 30);
  }, [open, otp?.expiresAtMs]);

  if (!r || !v) return null;
  const left = otp && otp.requestId === requestId ? Math.max(0, Math.ceil((otp.expiresAtMs - now) / 1000)) : 0;
  const expired = left === 0;

  const setDigit = (i: number, val: string) => {
    const d = val.replace(/\D/g, '');
    if (d.length > 1) { // dán cả mã
      const all = d.slice(0, 6).split('');
      setDigits(Array.from({ length: 6 }, (_, k) => all[k] ?? ''));
      refs.current[Math.min(5, all.length)]?.focus();
      return;
    }
    setDigits((cur) => cur.map((x, k) => (k === i ? d : x)));
    setError('');
    if (d && i < 5) refs.current[i + 1]?.focus();
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await actions.verifyOtpAndSign(requestId, digits.join(''));
      if (!res.ok) {
        setError(res.message);
        return;
      }
      onSigned();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} title={`Ký ${ctRef(v)} bằng OTP`} okText={submitting ? "Đang xác thực..." : "Xác minh OTP & ký"} onClose={onClose} onOk={submit}
      okDisabled={expired || digits.join('').length < 6 || submitting} error={error}>
      <p>Mã OTP đã được gửi tới <b>{profile.email}</b>. Vui lòng kiểm tra hộp thư email của bạn (kể cả mục Spam / Thư rác).</p>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', marginBottom: '12px' }}>
        💡 Mã kiểm thử nhanh (dev bypass): <b>000000</b> hoặc <b>{DEMO_OTP}</b>.
      </p>
      <div className="cus-otp">
        {digits.map((d, i) => (
          <input key={i} ref={(el) => { refs.current[i] = el; }} inputMode="numeric" maxLength={6} value={d} disabled={expired}
            aria-label={`Chữ số ${i + 1}`} onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus(); if (e.key === 'Enter') submit(); }} />
        ))}
      </div>
      <p className="cus-otp__left">{expired ? 'Mã đã hết hạn. Hãy gửi lại mã mới.' : <>Mã hết hạn sau <b>{left}</b> giây.</>}</p>
      <div className="cus-btn-row" style={{ justifyContent: 'center' }}>
        <button type="button" className="cus-btn cus-btn--sm" onClick={() => actions.sendSignOtp(requestId)}>Gửi lại mã</button>
        <button type="button" className="cus-btn cus-btn--sm" onClick={actions.expireOtp}>Demo: cho mã hết hạn</button>
      </div>
    </Modal>
  );
};

export default OtpModal;
