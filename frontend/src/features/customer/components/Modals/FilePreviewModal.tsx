import React, { useEffect } from 'react';
import type { FileRef } from '../../types';
import { downloadFile } from '../../../../shared/api/downloadFile';
import { useAuthFileUrl } from '../../../../shared/api/useAuthFileUrl';
import { Icon } from '../CustomerLayout';
import './Modals.css';

interface FilePreviewModalProps {
  open: boolean;
  file: FileRef | null | undefined;
  onClose: () => void;
  title?: string;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ open, file, onClose, title }) => {
  const viewUrl = useAuthFileUrl(open ? file?.url : undefined);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !file) return null;

  const isImage = !!file.name?.match(/\.(png|jpe?g|webp|gif|svg)$/i) || !!file.file?.type?.startsWith('image/');
  const isPdf = !!file.name?.match(/\.pdf$/i) || file.file?.type === 'application/pdf';

  const handleDownload = async () => {
    if (!file.url) return;
    if (file.file && file.url.startsWith('blob:')) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      link.click();
      return;
    }
    await downloadFile(file.url, file.name);
  };

  const handleOpenNewTab = () => {
    if (file.url) {
      window.open(file.url, '_blank', 'noopener');
    }
  };

  return (
    <div className="cus-modal cus-preview-modal" role="dialog" aria-modal="true" aria-label={title || file.name}>
      <div className="cus-modal__back" onClick={onClose} />
      <div className="cus-modal__box cus-preview-modal__box">
        <div className="cus-preview-modal__header">
          <div className="cus-preview-modal__title-group">
            <span className="cus-preview-modal__icon">
              <Icon name={isImage ? 'image' : 'file'} />
            </span>
            <div>
              <h3 className="cus-modal__title" style={{ margin: 0 }}>{title || file.name}</h3>
              <span className="cus-preview-modal__subtitle">{file.name}</span>
            </div>
          </div>
          <button
            type="button"
            className="cus-modal__close-btn"
            onClick={onClose}
            title="Đóng / Thoát ra (Esc)"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="cus-preview-modal__body">
          {isImage && viewUrl ? (
            <div className="cus-preview-modal__image-wrapper">
              <img src={viewUrl} alt={file.name} className="cus-preview-modal__img" />
            </div>
          ) : isPdf && viewUrl ? (
            <div className="cus-preview-modal__pdf-wrapper">
              <iframe src={viewUrl} title={file.name} className="cus-preview-modal__iframe" />
            </div>
          ) : (
            <div className="cus-preview-modal__fallback">
              <Icon name="file" />
              <p>Tệp: <b>{file.name}</b></p>
              {file.url && (
                <button type="button" className="cus-btn cus-btn--solid" onClick={handleDownload}>
                  Tải tệp về máy để xem
                </button>
              )}
            </div>
          )}
        </div>

        <div className="cus-preview-modal__actions">
          {file.url && (
            <button type="button" className="cus-btn" onClick={handleOpenNewTab} title="Mở trong tab mới">
              Mở tab mới ↗
            </button>
          )}
          {file.url && (
            <button type="button" className="cus-btn" onClick={handleDownload}>
              Tải về
            </button>
          )}
          <button type="button" className="cus-btn cus-btn--solid cus-preview-modal__btn-exit" onClick={onClose}>
            ✕ Đóng (Thoát ra)
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
