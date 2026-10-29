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

/** Khung dialog dùng chung cho các modal của trang Manager */
export const Modal: React.FC<ModalProps> = ({
  open, title, children, okText = 'Xác nhận', cancelText = 'Hủy', onOk, onClose, okDisabled, danger, wide, error,
}) => {
  const [busy, setBusy] = useState(false);
  const submit = async () => { if (busy || !onOk) return; setBusy(true); try { await onOk(); } finally { setBusy(false); } };
  if (!open) return null;
  return (
    <div className="mgr-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="mgr-modal__back" onClick={onClose} />
      <div className={`mgr-modal__box ${wide ? 'mgr-modal__box--wide' : ''}`}>
        <h3 className="mgr-modal__title">{title}</h3>
        <div className="mgr-modal__body">{children}</div>
        {error && <p className="mgr-modal__error" role="alert">{error}</p>}
        <div className="mgr-modal__actions">
          <button type="button" className="mgr-btn" onClick={onClose}>{cancelText}</button>
          {onOk && (
            <button type="button" className={`mgr-btn ${danger ? 'mgr-btn--danger-solid' : 'mgr-btn--solid'}`} onClick={submit} disabled={okDisabled || busy}>
              {okText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
