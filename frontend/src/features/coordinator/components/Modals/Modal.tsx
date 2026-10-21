import React from 'react';
import './Modals.css';

interface ModalProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  okText?: string;
  onOk?: () => void;
  onClose: () => void;
  okDisabled?: boolean;
  wide?: boolean;
}

/** Khung dialog dùng chung cho các modal của Coordinator */
export const Modal: React.FC<ModalProps> = ({ open, title, children, okText = 'Xác nhận', onOk, onClose, okDisabled, wide }) => {
  if (!open) return null;
  return (
    <div className="crd-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="crd-modal__back" onClick={onClose} />
      <div className={`crd-modal__box ${wide ? 'crd-modal__box--wide' : ''}`}>
        <h3 className="crd-modal__title">{title}</h3>
        <div className="crd-modal__body">{children}</div>
        <div className="crd-modal__actions">
          <button type="button" className="crd-btn" onClick={onClose}>Hủy</button>
          {onOk && <button type="button" className="crd-btn crd-btn--solid" onClick={onOk} disabled={okDisabled}>{okText}</button>}
        </div>
      </div>
    </div>
  );
};

export default Modal;
