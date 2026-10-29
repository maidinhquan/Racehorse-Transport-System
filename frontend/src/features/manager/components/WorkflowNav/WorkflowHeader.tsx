import React from 'react';
import type { CustomerInfo, TransportRequest, Trip } from '../../types';
import { BackLink } from '../Common/Common';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import { WorkflowNav } from './WorkflowNav';
import './WorkflowHeader.css';

interface Props {
  request: TransportRequest;
  trip?: Trip;
  customer?: CustomerInfo;
  current: 'request' | 'contract' | 'trip';
  actions?: React.ReactNode;
}

const sections = {
  request: { name: 'Yêu cầu vận chuyển', list: '/manager/requests', back: 'Danh sách yêu cầu' },
  contract: { name: 'Hợp đồng & giá', list: '/manager/contracts', back: 'Danh sách hợp đồng' },
  trip: { name: 'Điều hành chuyến đi', list: '/manager/trips', back: 'Danh sách chuyến' },
};

/** One persistent case header across request, contract and trip routes. */
export const WorkflowHeader: React.FC<Props> = ({ request: r, trip, customer, current, actions }) => {
  const section = sections[current];
  return (
    <header className="mgr-case">
      <BackLink to={section.list}>{section.back}</BackLink>
      <div className="mgr-case__panel">
        <div className="mgr-case__heading">
          <div>
            <p className="mgr-case__eyebrow">Hồ sơ vận chuyển <span>/ {section.name}</span></p>
            <div className="mgr-case__title"><h2>{r.id}</h2><StatusBadge status={r.status} /></div>
            <div className="mgr-case__meta">
              <span>{customer?.company || customer?.name || 'Khách hàng'}</span>
              <span>{r.horses.length} ngựa</span>
              {trip && <span>Mã chuyến: <b>{trip.id}</b></span>}
            </div>
          </div>
          {actions && <div className="mgr-btn-row mgr-case__actions">{actions}</div>}
        </div>
        <div className="mgr-case__route">
          <div><span>Điểm nhận</span><p>{r.pickup?.address || r.origin}</p></div>
          <span className="mgr-case__arrow" aria-hidden="true">→</span>
          <div><span>Điểm giao</span><p>{r.delivery?.address || r.destination}</p></div>
        </div>
        <WorkflowNav request={r} trip={trip} current={current} />
      </div>
    </header>
  );
};
