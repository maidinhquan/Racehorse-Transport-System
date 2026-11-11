import React, { useState } from 'react';
import { Icon } from './DriverLayout';
import type { Trip } from '../types';

interface PickupAccessOrderBannerProps {
  trip: Trip;
  onAcknowledge: () => void;
  onConfirmResolved: () => void;
}

export const PickupAccessOrderBanner: React.FC<PickupAccessOrderBannerProps> = ({
  trip,
  onAcknowledge,
  onConfirmResolved,
}) => {
  const [driverAcked, setDriverAcked] = useState<boolean>(() => {
    try {
      const cleanId = trip.id.replace(/-/g, '_');
      return !!(
        localStorage.getItem(`rts_driver_pickup_ack_${cleanId}`) ||
        localStorage.getItem(`rts_driver_pickup_ack_${trip.id}`)
      );
    } catch {
      return false;
    }
  });

  const handleAck = () => {
    onAcknowledge();
    setDriverAcked(true);
  };

  if (!trip.pickupAccessStatus || trip.pickupAccessStatus === 'NORMAL') {
    return null;
  }

  if (trip.pickupAccessStatus === 'BLOCKED') {
    return (
      <div className="drv-note drv-note--red" style={{ marginBottom: 12 }}>
        <Icon name="alert" />
        <div>
          <b>Xe không thể vào điểm lấy ngựa</b>
          Chuyến đi đang tạm dừng (Safety Blocker kích hoạt). Đang chờ Điều phối viên và Khách hàng thống nhất điểm hẹn mới hoặc xe trung chuyển.
        </div>
      </div>
    );
  }

  if (trip.pickupAccessStatus === 'RELOCATING') {
    return (
      <div className="drv-note drv-note--blue" style={{ marginBottom: 12 }}>
        <Icon name="clock" />
        <div style={{ width: '100%' }}>
          <b>Lệnh điều động: Dắt bộ ra điểm hẹn mới</b>
          <div>
            Điểm hẹn đón ngựa: <b>{trip.relocationMeetingPointName || 'Bãi tập kết'}</b> ({trip.relocationDistanceMeters ?? 320}m).
          </div>
          <div style={{ marginTop: 4 }}>
            {trip.customerApprovalStatus === 'APPROVED'
              ? 'Khách hàng đã duyệt.'
              : 'Đang chờ Khách hàng xác nhận chi phí/địa điểm.'}
          </div>
          <button
            type="button"
            className="drv-btn drv-btn--block"
            style={{ marginTop: 8 }}
            onClick={handleAck}
          >
            {driverAcked ? 'Đã xác nhận tiếp nhận điểm hẹn mới' : 'Xác nhận tiếp nhận điểm hẹn mới'}
          </button>
        </div>
      </div>
    );
  }

  if (trip.pickupAccessStatus === 'SHUTTLING') {
    return (
      <div className="drv-note drv-note--yellow" style={{ marginBottom: 12 }}>
        <Icon name="clock" />
        <div style={{ width: '100%' }}>
          <b>Lệnh điều động: Xe trung chuyển đón ngựa</b>
          <div>
            Xe trung chuyển: <b>{trip.shuttleVehicleId || 'Xe 2 chỗ'}</b> đón từ trại chuyển ra xe lớn.
          </div>
          <div style={{ marginTop: 4 }}>
            {trip.customerApprovalStatus === 'APPROVED'
              ? 'Khách hàng đã duyệt.'
              : 'Đang chờ Khách hàng xác nhận chi phí.'}
          </div>
          <button
            type="button"
            className="drv-btn drv-btn--block"
            style={{ marginTop: 8 }}
            onClick={handleAck}
          >
            {driverAcked
              ? 'Đã xác nhận sẵn sàng phối hợp xe trung chuyển'
              : 'Xác nhận sẵn sàng đón xe trung chuyển'}
          </button>
        </div>
      </div>
    );
  }

  if (trip.pickupAccessStatus === 'RESOLVED') {
    return (
      <div className="drv-note drv-note--green" style={{ marginBottom: 12 }}>
        <Icon name="check" />
        <div style={{ width: '100%' }}>
          <b>Phương án đón ngựa đã được hoàn tất!</b>
          <div>
            {trip.relocationMeetingPointName
              ? `Hãy đón ngựa tại điểm hẹn mới: ${trip.relocationMeetingPointName}.`
              : 'Xe trung chuyển chuyên dụng đã sẵn sàng bàn giao ngựa ra xe của bạn.'}
          </div>
          <button
            type="button"
            className="drv-btn drv-btn--solid drv-btn--block"
            style={{ marginTop: 8 }}
            onClick={onConfirmResolved}
          >
            Đã nhận ngựa thành công • Tiếp tục hành trình
          </button>
        </div>
      </div>
    );
  }

  return null;
};

