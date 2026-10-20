import React from 'react';
import type { TripStatus, StatusDisplayType } from '../../types';
import './TripStatusBadge.css';

interface TripStatusBadgeProps {
  status: TripStatus | StatusDisplayType | string;
  label?: string;
  className?: string;
}

export const TripStatusBadge: React.FC<TripStatusBadgeProps> = ({ status, label, className = '' }) => {
  const normalizeStatus = (val: string): { key: string; text: string } => {
    switch (val) {
      case 'in_transit':
      case 'Đang vận chuyển':
      case 'In Transit':
        return { key: 'in_transit', text: 'Đang vận chuyển' };

      case 'reviewing':
      case 'Đang xét duyệt hồ sơ':
      case 'Documents Under Review':
        return { key: 'reviewing', text: 'Đang xét duyệt hồ sơ' };

      case 'contract_ready':
      case 'Hợp đồng sẵn sàng':
      case 'Contract Ready':
        return { key: 'contract_ready', text: 'Hợp đồng sẵn sàng' };

      case 'waiting_manager':
      case 'Chờ quản lý xét duyệt':
      case 'Chờ Manager xét duyệt':
      case 'Waiting for Manager Review':
        return { key: 'waiting_manager', text: 'Chờ quản lý xét duyệt' };

      case 'revision_requested':
      case 'Yêu cầu chỉnh sửa':
      case 'Manager yêu cầu sửa yêu cầu':
        return { key: 'revision_requested', text: 'Yêu cầu chỉnh sửa' };

      case 'contract_revision_requested':
      case 'Yêu cầu sửa hợp đồng':
      case 'Đã gửi yêu cầu sửa hợp đồng':
        return { key: 'contract_revision_requested', text: 'Yêu cầu sửa hợp đồng' };

      case 'deposit_verified':
      case 'Đã xác minh cọc – Chờ ký':
      case 'Đã xác minh cọc – chờ ký OTP':
        return { key: 'deposit_verified', text: 'Đã xác minh cọc – Chờ ký' };

      case 'delivered':
      case 'Đã giao':
        return { key: 'delivered', text: 'Đã giao' };

      case 'scheduled':
      case 'Đã lên lịch':
      case 'Scheduled':
        return { key: 'scheduled', text: 'Đã lên lịch' };

      case 'completed':
      case 'Đã hoàn thành':
      case 'Completed':
        return { key: 'completed', text: 'Đã hoàn thành' };

      case 'closed':
      case 'Đã đóng':
        return { key: 'closed', text: 'Đã đóng' };

      case 'cancelled':
      case 'Đã hủy':
        return { key: 'cancelled', text: 'Đã hủy' };

      case 'rejected':
      case 'Bị từ chối':
        return { key: 'rejected', text: 'Bị từ chối' };

      case 'incident':
      case 'Sự cố kiểm dịch':
        return { key: 'incident', text: 'Sự cố kiểm dịch' };

      default:
        return { key: 'default', text: val };
    }
  };

  const { key, text } = normalizeStatus(status);

  return (
    <span className={`cbn-status-badge ${key} ${className}`}>
      {label || text}
    </span>
  );
};

export const ContractStatusBadge: React.FC<{
  status?: string;
  text?: string;
}> = ({ status, text }) => {
  if (text?.includes('Đã hoàn thành') || text?.includes('Không còn hiệu lực')) {
    return (
      <span className="cbn-contract-badge completed-box">
        Đã hoàn thành –<br />
        Không còn hiệu lực thực hiện
      </span>
    );
  }
  if (status === 'active' || text === 'Có hiệu lực') {
    return <span className="cbn-contract-badge active">{text || 'Có hiệu lực'}</span>;
  }
  if (status === 'ready' || text === 'Sẵn sàng') {
    return <span className="cbn-contract-badge ready">{text || 'Sẵn sàng'}</span>;
  }
  if (status === 'cancelled' || text === 'Đã hủy') {
    return <span className="cbn-contract-badge cancelled">{text || 'Đã hủy'}</span>;
  }
  return <span className="cbn-contract-badge none">{text || '—'}</span>;
};

export default TripStatusBadge;
