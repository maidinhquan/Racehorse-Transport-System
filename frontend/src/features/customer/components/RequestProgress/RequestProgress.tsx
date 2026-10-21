import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { TransportRequest } from '../../types';
import { STAGES, lifecycle, tabVisible } from '../../hooks/customerRules';
import { Icon } from '../CustomerLayout';
import './RequestProgress.css';

/** Thanh tiến độ 10 giai đoạn của một yêu cầu; giai đoạn đã qua mở lại thông tin ở chế độ chỉ xem */
export const RequestProgress: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const navigate = useNavigate();
  const { at, exc, note } = lifecycle(r);
  return (
    <div className="cus-card cus-life">
      <div className="cus-life__steps" role="list">
        {STAGES.map(([label, tab], i) => {
          const cls = i < at ? 'done' : i === at ? (exc === 'fail' ? 'failed' : exc === 'warn' ? 'warn' : 'current') : '';
          const reachable = i <= at && tabVisible(r, tab);
          return (
            <button key={label} type="button" role="listitem" className={`cus-life__step ${cls}`} disabled={!reachable}
              onClick={() => navigate(`/customer/requests/${r.id}${tab === 'overview' ? '' : `/${tab}`}`)}>
              <span className="cus-life__num">{cls === 'done' ? <Icon name="check" /> : cls === 'failed' ? '✕' : cls === 'warn' ? '!' : i + 1}</span>
              <span className="cus-life__label">{label}</span>
              {i === at && note && <small>{note}</small>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RequestProgress;
