import React from 'react';
import type { Trip } from '../../../types';
import { useDriver } from '../../../hooks/useDriver';
import { Icon } from '../../../components/DriverLayout';
import { SLOT_LABEL, crewList, fmtDateTime } from '../../../hooks/driverRules';

/** Ngựa, điểm nhận/giao, người nhận, tổ xe và phương tiện */
export const OverviewTab: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { horse, crewMember, userId } = useDriver();
  const receiver = trip.altReceiver ?? trip.receiver;

  return (
    <div className="drv-grid2">
      <div className="drv-card">
        <h3 className="drv-card__title">Ngựa trên chuyến</h3>
        {trip.horses.map((id) => {
          const h = horse(id);
          return (
            <div key={id} className="drv-horse">
              <span className="drv-horse__thumb">{(h?.name ?? id).slice(0, 1)}</span>
              <div className="drv-horse__text">
                <b>{h?.name ?? id}</b>
                <span>{h ? `${h.breed} • ${h.sex} • ${h.age} tuổi • ${h.color}` : ''}</span>
                <span>Microchip <b style={{ userSelect: 'all' }}>{h?.microchip ?? '—'}</b></span>
              </div>
            </div>
          );
        })}
        {trip.notes && <div className="drv-note drv-note--yellow"><Icon name="info" /><div><b>Yêu cầu đặc biệt</b>{trip.notes}</div></div>}
      </div>

      <div className="drv-card">
        <h3 className="drv-card__title">Điểm nhận &amp; giao</h3>
        <div className="drv-kv">
          <div><span>Điểm nhận</span><b>{trip.pickup.name}</b></div>
          <div><span>Địa chỉ</span><b>{trip.pickup.address || '—'}</b></div>
          <div><span>Điểm giao</span><b>{trip.delivery.name}</b></div>
          <div><span>Địa chỉ</span><b>{trip.delivery.address || '—'}</b></div>
          <div className="full"><span>Người nhận{trip.altReceiver ? ' (thay thế, Manager đã duyệt)' : ''}</span><b>{receiver.name} • <span style={{ display: 'inline', userSelect: 'all' }}>{receiver.phone}</span></b></div>
        </div>

        <h3 className="drv-card__title" style={{ marginTop: 20 }}>Tổ xe</h3>
        {crewList(trip).map(([slot, id]) => (
          <div key={slot} className="drv-row">
            <div className="drv-row__text">
              <b>{crewMember(id)?.name ?? id}{id === userId ? ' (bạn)' : ''}</b>
              <span>{SLOT_LABEL[slot]} • <a href={`tel:${crewMember(id)?.phone.replace(/\s/g, '') ?? ''}`}>{crewMember(id)?.phone}</a></span>
            </div>
          </div>
        ))}
        {trip.vehicle && <p className="drv-hint">Xe {trip.vehicle.plate} • {trip.vehicle.model}</p>}
        {trip.flight && <p className="drv-hint">Chuyến bay {trip.flight.airline} {trip.flight.flightNo} • {fmtDateTime(trip.flight.departAt)}</p>}
      </div>
    </div>
  );
};

export default OverviewTab;
