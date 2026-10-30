import React from 'react';
import { Link } from 'react-router-dom';
import type { TransportRequest, Trip } from '../../types';
import { isAccepted, isSigned } from '../../hooks/managerRules';

/**
 * Thanh quy trình thương mại: 1 Yêu cầu → 2 Hợp đồng & giá (mở khi đã chấp thuận) → 3 Chuyến đi (khi đã ký OTP).
 */
export const WorkflowNav: React.FC<{ request: TransportRequest; trip?: Trip; current: 'request' | 'contract' | 'trip' }> = ({ request, trip, current }) => {
  const steps: Array<{ key: typeof current; label: string; detail: string; to?: string; done: boolean }> = [
    { key: 'request', label: 'Yêu cầu & xét duyệt', detail: isAccepted(request) ? 'Đã chấp thuận' : 'Thông tin & hồ sơ', to: `/manager/requests/${request.id}`, done: isAccepted(request) },
    { key: 'contract', label: 'Hợp đồng & giá', detail: isSigned(request) ? 'Đã ký hợp đồng' : 'Thỏa thuận & ký kết', to: isAccepted(request) ? `/manager/contracts/${request.id}` : undefined, done: isSigned(request) },
    { key: 'trip', label: 'Chuyến đi', detail: trip?.id || 'Tạo sau khi ký hợp đồng', to: trip ? `/manager/trips/${trip.id}` : undefined, done: trip?.status === 'COMPLETED' },
  ];
  return (
    <nav className="mgr-workflow" aria-label="Quy trình yêu cầu">
      {steps.map((s, i) => {
        const cls = `mgr-workflow__step ${s.key === current ? 'on' : ''} ${s.done ? 'done' : ''} ${s.to ? '' : 'locked'}`;
        const inner = <><span className="mgr-workflow__number" aria-hidden="true">{s.done ? '✓' : i + 1}</span><span className="mgr-workflow__text"><b>{s.label}</b><small>{s.detail}</small></span></>;
        return s.to
          ? <Link key={s.key} to={s.to} className={cls} aria-current={s.key === current ? 'step' : undefined}>{inner}</Link>
          : <button key={s.key} type="button" className={cls} disabled title={i === 1 ? 'Mở sau khi Manager chấp thuận yêu cầu' : 'Tạo sau khi khách ký OTP'}>{inner}</button>;
      })}
    </nav>
  );
};

export default WorkflowNav;
