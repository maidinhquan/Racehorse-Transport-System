import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';

interface ReasonModalProps {
  open: boolean;
  title: string;
  /** Đoạn mô tả phía trên ô nhập */
  intro?: React.ReactNode;
  label?: string;
  placeholder?: string;
  okText?: string;
  danger?: boolean;
  minLength?: number;
  /** Nếu có, người dùng phải tích ô xác nhận này */
  confirmText?: string;
  onClose: () => void;
  /** Trả về true để đóng modal */
  onSubmit: (reason: string) => boolean | Promise<boolean>;
}

/** Modal nhập lý do (hủy yêu cầu, từ chối, yêu cầu chỉnh sửa…) */
export const ReasonModal: React.FC<ReasonModalProps> = ({
  open, title, intro, label = 'Lý do *', placeholder, okText = 'Xác nhận', danger, minLength = 5, confirmText, onClose, onSubmit,
}) => {
  const [reason, setReason] = useState('');
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setReason(''); setChecked(false); setError(''); } }, [open]);

  const submit = async () => {
    if (reason.trim().length < minLength) return setError(`Nhập lý do (ít nhất ${minLength} ký tự).`);
    if (confirmText && !checked) return setError('Tích ô xác nhận để tiếp tục.');
    try {
      const res = await onSubmit(reason.trim());
      if (res) onClose();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi xử lý yêu cầu.');
    }
  };

  return (
    <Modal open={open} title={title} okText={okText} danger={danger} onClose={onClose} onOk={submit} error={error}>
      {intro}
      <div className="mgr-field">
        <label htmlFor="mgr-reason">{label}</label>
        <textarea id="mgr-reason" className="mgr-textarea" rows={3} value={reason} placeholder={placeholder}
          onChange={(e) => { setReason(e.target.value); setError(''); }} />
      </div>
      {confirmText && (
        <label className="mgr-check"><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /> {confirmText}</label>
      )}
    </Modal>
  );
};

export default ReasonModal;
