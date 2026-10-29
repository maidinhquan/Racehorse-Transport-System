import React from 'react';
import { Link } from 'react-router-dom';
import type { TransportRequest, Trip } from '../../types';
import { isAccepted, isSigned } from '../../hooks/managerRules';

/**
 * Thanh quy trình thương mại: 1 Yêu cầu → 2 Hợp đồng & giá (mở khi đã chấp thuận) → 3 Chuyến đi (khi đã ký OTP).
 */
export const WorkflowNav: React.FC<{ request: TransportRequest; trip?: Trip; current: 'request' | 'contract' | 'trip' }> = ({ request, trip, current }) => {
  const steps: Array<{ key: typeof current; label: string; to?: string; done: boolean }> = [
    { key: 'request', label: 'Yêu cầu & xét duyệt', to: `/manager/requests/${request.id}`, done: isAccepted(request) },
    { key: 'contract', label: 'Hợp đồng & giá', to: isAccepted(request) ? `/manager/contracts/${request.id}` : undefined, done: isSigned(request) },
    { key: 'trip', label: trip ? `Chuyến đi ${trip.id}` : 'Chuyến đi', to: trip ? `/manager/trips/${trip.id}` : undefined, done: trip?.status === 'COMPLETED' },
  ];
  return (
    <nav className="mgr-stepper mgr-stepper--3" aria-label="Quy trình yêu cầu">
      {steps.map((s, i) => {
        const cls = `${s.key === current ? 'on' : ''} ${s.done ? 'done' : ''} ${s.to ? '' : 'locked'}`;
        const inner = <><span>{s.done ? '✓' : i + 1}</span>{s.label}</>;
        return s.to
          ? <Link key={s.key} to={s.to} className={cls} aria-current={s.key === current ? 'step' : undefined}>{inner}</Link>
          : <button key={s.key} type="button" className={cls} disabled title={i === 1 ? 'Mở sau khi Manager chấp thuận yêu cầu' : 'Tạo sau khi khách ký OTP'}>{inner}</button>;
      })}
    </nav>
  );
};

export default WorkflowNav;
