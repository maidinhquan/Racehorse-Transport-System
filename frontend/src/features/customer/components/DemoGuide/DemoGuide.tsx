import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from '../../hooks/useCustomer';
import { DEMO_GUIDE } from '../../hooks/customerRules';
import { TripStatusBadge } from '../TripStatusBadge/TripStatusBadge';
import './DemoGuide.css';

/** Gợi ý thử các tình huống bằng dữ liệu mẫu (trang Yêu cầu và Lịch sử) */
export const DemoGuide: React.FC<{ kind: 'active' | 'history' }> = ({ kind }) => {
  const navigate = useNavigate();
  const { getRequest } = useCustomer();
  const rows = DEMO_GUIDE[kind].filter(([id]) => getRequest(id));
  if (!rows.length) return null;
  return (
    <details className="cus-card cus-guide">
      <summary><span className="cus-eyebrow">Dữ liệu demo</span><b>Gợi ý thử các tình huống</b><small>Dữ liệu mẫu, không phải giao dịch thật</small></summary>
      <div className="cus-guide__list">
        {rows.map(([id, label, tip]) => (
          <button key={id} type="button" className="cus-guide__row" onClick={() => navigate(`/customer/requests/${id}`)}>
            <span className="cus-guide__id">{id}</span>
            <span className="cus-guide__label">{label}</span>
            <span className="cus-guide__tip">{tip}</span>
            <TripStatusBadge status={getRequest(id)!.status} />
          </button>
        ))}
      </div>
    </details>
  );
};

export default DemoGuide;
