import React, { useEffect } from 'react';
import './Modals.css';

interface ModalProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  okText?: string;
  onOk?: () => void;
  onClose: () => void;
  okDisabled?: boolean;
  danger?: boolean;
  /** Thông báo lỗi hiển thị trong dialog */
  error?: string;
}

/** Khung dialog dùng chung cho các modal của Tài xế */
export const Modal: React.FC<ModalProps> = ({ open, title, children, okText = 'Xác nhận', onOk, onClose, okDisabled, danger, error }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="drv-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="drv-modal__back" onClick={onClose} />
      <div className="drv-modal__box">
        <h3 className="drv-modal__title">{title}</h3>
        <div className="drv-modal__body">{children}</div>
        {error && <p className="drv-error" role="alert">{error}</p>}
        <div className="drv-modal__actions">
          <button type="button" className="drv-btn" onClick={onClose}>Huỷ</button>
          {onOk && (
            <button type="button" className={`drv-btn ${danger ? 'drv-btn--danger-solid' : 'drv-btn--solid'}`} onClick={onOk} disabled={okDisabled}>{okText}</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
