import React, { useState } from 'react';
import './Modals.css';

interface ModalProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  okText?: string;
  cancelText?: string;
  onOk?: () => void | Promise<void>;
  onClose: () => void;
  okDisabled?: boolean;
  danger?: boolean;
  wide?: boolean;
  /** Lỗi hiển thị phía trên nút (modal vẫn mở) */
  error?: string;
}

/** Khung dialog dùng chung cho các modal của trang Khách hàng */
export const Modal: React.FC<ModalProps> = ({
  open, title, children, okText = 'Xác nhận', cancelText = 'Hủy', onOk, onClose, okDisabled, danger, wide, error,
}) => {
  const [busy, setBusy] = useState(false);
  const submit = async () => { if (busy || !onOk) return; setBusy(true); try { await onOk(); } finally { setBusy(false); } };

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="cus-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="cus-modal__back" onClick={onClose} />
      <div className={`cus-modal__box ${wide ? 'cus-modal__box--wide' : ''}`}>
        <div className="cus-modal__header">
          <h3 className="cus-modal__title" style={{ margin: 0 }}>{title}</h3>
          <button type="button" className="cus-modal__close-btn" onClick={onClose} aria-label="Đóng (Esc)" title="Đóng (Esc)">✕</button>
        </div>
        <div className="cus-modal__body">{children}</div>
        {error && <p className="cus-modal__error" role="alert">{error}</p>}
        <div className="cus-modal__actions">
          <button type="button" className="cus-btn" onClick={onClose}>{cancelText}</button>
          {onOk && (
            <button type="button" className={`cus-btn ${danger ? 'cus-btn--danger-solid' : 'cus-btn--solid'}`} onClick={submit} disabled={okDisabled || busy}>
              {okText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
