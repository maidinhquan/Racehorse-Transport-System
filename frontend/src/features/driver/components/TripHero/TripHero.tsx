import React from 'react';
import type { Trip } from '../../types';
import { useDriver } from '../../hooks/useDriver';
import {
  MILESTONE_LABEL,
  cooldownLeft,
  fmtDateTime,
  handoverReady,
  lastMilestone,
  milestoneText,
  myPosition,
  nextMilestone,
} from '../../hooks/driverRules';
import { Icon } from '../DriverLayout';
import { RouteMap } from '../RouteMap/RouteMap';
import { TripStatusBadge } from '../TripStatusBadge/TripStatusBadge';
import './TripHero.css';

interface TripHeroProps {
  trip: Trip;
  /** Bản thu gọn: không bản đồ, không ghi chú mốc */
  compact?: boolean;
  actions?: React.ReactNode;
}

/** Thẻ lớn của "chuyến của tôi" – mỗi tài xế chỉ có một chuyến đang hoạt động */
export const TripHero: React.FC<TripHeroProps> = ({ trip, compact, actions }) => {
  const { userId, horse, lastRecordedMs } = useDriver();
  const m = lastMilestone(trip);
  const n = nextMilestone(trip);
  const wait = cooldownLeft(lastRecordedMs[trip.id]);
  const horseNames = trip.horses.map((h) => horse(h)?.name ?? h).join(', ');

  return (
    <div className="drv-card drv-hero">
      <div className="drv-hero__top">
        <div>
          <div className="drv-eyebrow">Chuyến của tôi • {myPosition(trip, userId)}</div>
          <h2 className="drv-hero__id">{trip.id}</h2>
        </div>
        <TripStatusBadge status={trip.status} />
      </div>
      <div className="drv-hero__route">{trip.origin} <span>→</span> {trip.destination}</div>

      {!compact && trip.stops.length > 0 && <RouteMap stops={trip.stops} current={m ? m.stopIndex : -1} height={260} compact />}

      <div className="drv-stats">
        <div className="drv-stat"><span>Khởi hành</span><b>{fmtDateTime(trip.plannedDepart)}</b><small>ETA {fmtDateTime(trip.eta)}</small></div>
        <div className="drv-stat"><span>Ngựa</span><b>{trip.horses.length}</b><small>{horseNames}</small></div>
        <div className="drv-stat"><span>Cập nhật gần nhất</span><b>{m ? MILESTONE_LABEL[m.type] : 'Chưa xuất phát'}</b><small>{m ? fmtDateTime(m.at) : ''}</small></div>
        <div className="drv-stat"><span>Xe</span><b>{trip.vehicle?.plate ?? '—'}</b><small>{trip.flight ? `${trip.flight.airline} ${trip.flight.flightNo}` : trip.vehicle?.model}</small></div>
      </div>

      {!compact && n && (
        <div className={`drv-note ${n.blocked ? 'drv-note--yellow' : 'drv-note--blue'}`}>
          <Icon name={n.blocked ? 'clock' : 'pin'} />
          <div>
            <b>Mốc tiếp theo: {milestoneText(trip, n)}</b>
            {n.blocked ? 'Đang chờ ghi nhận kết quả thông quan.'
              : wait ? `Có thể ghi mốc tiếp sau ${wait} giây.` : 'Ghi nhận khi sự kiện thực tế xảy ra.'}
          </div>
        </div>
      )}
      {!compact && handoverReady(trip) && (
        <div className="drv-note drv-note--blue"><Icon name="check" /><div><b>Sẵn sàng bàn giao</b>Xác minh người nhận và từng con ngựa.</div></div>
      )}
      {actions && <div className="drv-btn-row">{actions}</div>}
    </div>
  );
};

export default TripHero;
