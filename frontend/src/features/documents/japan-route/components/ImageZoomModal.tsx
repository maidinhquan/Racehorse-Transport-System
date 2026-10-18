import React, { useState } from 'react';

interface ImageZoomModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageTitle: string;
  onClose: () => void;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
  isOpen,
  imageUrl,
  imageTitle,
  onClose,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  return (
    <div className="jp-modal-overlay" onClick={onClose}>
      <div
        className="jp-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="jp-modal-header">
          <div className="jp-modal-title">
            <span className="jp-modal-icon">🔍</span>
            <span>{imageTitle || 'Chi tiết minh chứng tài liệu'}</span>
          </div>
          <div className="jp-modal-controls">
            <button
              type="button"
              className="jp-btn-control"
              onClick={handleZoomIn}
              title="Phóng to"
            >
              ➕ Phóng to
            </button>
            <button
              type="button"
              className="jp-btn-control"
              onClick={handleZoomOut}
              title="Thu nhỏ"
            >
              ➖ Thu nhỏ
            </button>
            <button
              type="button"
              className="jp-btn-control"
              onClick={handleRotate}
              title="Xoay 90 độ"
            >
              🔄 Xoay
            </button>
            <button
              type="button"
              className="jp-btn-control"
              onClick={handleReset}
              title="Khôi phục gốc"
            >
              ⏹️ 100%
            </button>
            <button
              type="button"
              className="jp-btn-close"
              onClick={onClose}
              title="Đóng modal"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="jp-modal-body">
          <div className="jp-image-viewport">
            <img
              src={imageUrl}
              alt={imageTitle}
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-in-out',
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
        <div className="jp-modal-footer">
          <p className="jp-modal-tip">
            💡 Mẹo: Dùng các nút điều khiển phía trên để phóng to kiểm tra con dấu mộc, chữ ký bác sĩ và thông số chỉ số xét nghiệm.
          </p>
        </div>
      </div>
    </div>
  );
};
