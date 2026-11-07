import React from 'react';
import type { DemoRole } from '../../context/DemoModeContext';

export interface DemoDataToggleProps {
  role?: DemoRole;
  className?: string;
  compact?: boolean;
  onToggle?: (enabled: boolean) => void;
}

/**
 * Đã vô hiệu hóa nút bật/tắt dữ liệu demo theo yêu cầu nghiệp vụ
 */
export const DemoDataToggle: React.FC<DemoDataToggleProps> = () => {
  return null;
};

export default DemoDataToggle;
