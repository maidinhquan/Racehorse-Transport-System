import React from 'react';
import './TripStatusBadge.css';

interface TripStatusBadgeProps {
  status: string;
  label?: string;
  variant?: 'orange' | 'blue' | 'teal' | 'amber' | 'red' | 'green' | 'gray';
  className?: string;
}

export const TripStatusBadge: React.FC<TripStatusBadgeProps> = ({
  status,
  label,
  variant,
  className = '',
}) => {
  const getBadgeClass = () => {
    if (variant) return `badge-${variant}`;
    const s = status.toLowerCase();
    if (s.includes('đã giao') || s.includes('delivered')) return 'badge-green';
    if (s.includes('đã đóng') || s.includes('đã hủy') || s.includes('closed') || s.includes('cancelled')) return 'badge-gray';
    if (s.includes('hợp đồng sẵn sàng') || s.includes('soạn hợp đồng') || s.includes('kế hoạch') || s.includes('chấp nhận')) return 'badge-blue';
    if (s.includes('vận chuyển') || s.includes('transit') || s.includes('đang chạy')) return 'badge-orange';
    if (s.includes('chờ') || s.includes('xét duyệt') || s.includes('sửa hợp đồng') || s.includes('điều chỉnh')) return 'badge-amber';
    if (s.includes('từ chối') || s.includes('quá hạn') || s.includes('hủy')) return 'badge-red';
    return 'badge-gray';
  };

  return (
    <span className={`mgr-status-badge ${getBadgeClass()} ${className}`}>
      {label || status}
    </span>
  );
};

export default TripStatusBadge;
