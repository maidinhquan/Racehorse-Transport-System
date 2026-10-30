import React from 'react';
import type { ActorRole, TransportRequest } from '../../../types';
import { fmtDateTime } from '../../../hooks/customerRules';

const ROLE_LABEL: Record<ActorRole, string> = {
  CUSTOMER: 'Khách hàng', LOGISTICS_MANAGER: 'Logistics Manager', TRANSPORT_SPECIALIST: 'Transport Specialist',
  FLEET_ROUTE_COORDINATOR: 'Điều phối viên', DRIVER_ESCORT: 'Tổ xe', SYSTEM: 'Hệ thống',
};

/** Tab Lịch sử: mọi thao tác trên yêu cầu, mới nhất trước (dùng chung với nhân viên CBN Transport) */
export const HistoryTab: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const rows = [...r.history].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <div className="cus-card">
      <h3 className="cus-card__title">Lịch sử yêu cầu <span className="cus-muted">Mới nhất trước</span></h3>
      {rows.length === 0 ? <p className="cus-empty">Chưa có hoạt động nào.</p> : (
        <ul className="cus-timeline">
          {rows.map((x, i) => (
            <li key={`${x.at}-${i}`} className={x.role === 'CUSTOMER' ? 'now' : 'done'}>
              <b>{x.action}</b>
              <span>{fmtDateTime(x.at)} • {x.actor} ({ROLE_LABEL[x.role]})</span>
              {x.detail && <span>{x.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HistoryTab;
