import React from 'react';
import { useDemoMode, type DemoRole } from '../../context/DemoModeContext';
import './DemoDataToggle.css';

export interface DemoDataToggleProps {
  role: DemoRole;
  className?: string;
  compact?: boolean;
  onToggle?: (enabled: boolean) => void;
}

/**
 * Nút bật/tắt chế độ Dữ liệu mẫu trên thanh tiêu đề của từng vai trò (role)
 * - Khi BẬT: Nạp dữ liệu mẫu và hiển thị các nút demo để test luồng
 * - Khi TẮT: Xoá sạch dữ liệu demo về trạng thái trống và ẩn hoàn toàn các nút demo
 */
export const DemoDataToggle: React.FC<DemoDataToggleProps> = ({
  role,
  className = '',
  compact = false,
  onToggle,
}) => {
  const { enabled, toggle } = useDemoMode(role);

  const handleClick = () => {
    const next = toggle();
    onToggle?.(next);
  };

  const title = enabled
    ? 'Dữ liệu mẫu đang BẬT trên toàn hệ thống. Bấm để tắt và đồng bộ xoá dữ liệu demo ở tất cả các trang.'
    : 'Dữ liệu mẫu đang TẮT. Bấm để hiển thị lại dữ liệu mẫu và các nút demo trên tất cả các trang.';

  return (
    <button
      type="button"
      className={`demo-data-toggle ${enabled ? 'demo-data-toggle--active' : 'demo-data-toggle--inactive'} ${className}`}
      onClick={handleClick}
      title={title}
      aria-label={title}
      aria-pressed={enabled}
    >
      <span className="demo-data-toggle__dot" aria-hidden="true" />
      <span className="demo-data-toggle__text">
        {compact ? (
          <><b>Demo:</b> {enabled ? 'BẬT' : 'TẮT'}</>
        ) : (
          <>
            <span className="demo-data-toggle__label">Dữ liệu mẫu:</span>{' '}
            <b className="demo-data-toggle__state">{enabled ? 'BẬT' : 'TẮT'}</b>
          </>
        )}
      </span>
    </button>
  );
};

export default DemoDataToggle;
