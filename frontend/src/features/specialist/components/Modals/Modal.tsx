import React from 'react';
import './Modals.css';

interface ModalProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  okText?: string;
  cancelText?: string;
  onOk?: () => void;
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
  if (!open) return null;
  return (
    <div className="spc-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="spc-modal__back" onClick={onClose} />
      <div className={`spc-modal__box ${wide ? 'spc-modal__box--wide' : ''}`}>
        <h3 className="spc-modal__title">{title}</h3>
        <div className="spc-modal__body">{children}</div>
        {error && <p className="spc-modal__error" role="alert">{error}</p>}
        <div className="spc-modal__actions">
          <button type="button" className="spc-btn" onClick={onClose}>{cancelText}</button>
          {onOk && (
            <button type="button" className={`spc-btn ${danger ? 'spc-btn--danger-solid' : 'spc-btn--solid'}`} onClick={onOk} disabled={okDisabled}>
              {okText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
