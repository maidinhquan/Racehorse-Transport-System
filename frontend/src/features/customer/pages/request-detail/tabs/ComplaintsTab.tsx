import React, { useState } from 'react';
import type { ComplaintStatus, TransportRequest } from '../../../types';
import { canComplain, fmtDateTime } from '../../../hooks/customerRules';
import { COMPLAINT_TYPE_LABEL, ComplaintModal } from '../../../components/Modals';
import { TripStatusBadge, type BadgeTone } from '../../../components/TripStatusBadge/TripStatusBadge';

const STATUS: Record<ComplaintStatus, [string, BadgeTone]> = {
  OPEN: ['Mới gửi', 'warn'], IN_PROGRESS: ['Đang xử lý', 'info'], RESOLVED: ['Đã giải quyết', 'ok'], CLOSED: ['Đã đóng', 'muted'],
};

/** Tab Khiếu nại của yêu cầu */
export const ComplaintsTab: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="cus-card">
      <h3 className="cus-card__title">
        Khiếu nại của yêu cầu
        {canComplain(r) && <button type="button" className="cus-btn cus-btn--solid cus-btn--sm" onClick={() => setOpen(true)}>Gửi khiếu nại</button>}
      </h3>
      {r.complaints.length === 0 ? (
        <p className="cus-empty">{canComplain(r) ? 'Bạn có thể gửi khiếu nại trong hạn chung 24 giờ kể từ khi bàn giao.' : 'Chưa có khiếu nại nào.'}</p>
      ) : (
        <ul className="cus-complaint-list">
          {[...r.complaints].reverse().map((c) => (
            <li key={c.id}>
              <div>
                <b>{c.id} • {c.title}</b>
                <small>{COMPLAINT_TYPE_LABEL[c.type]} • {fmtDateTime(c.createdAt)}</small>
                <p>{c.description}</p>
                {c.response && <p><b style={{ display: 'inline' }}>Phản hồi:</b> {c.response}</p>}
              </div>
              <TripStatusBadge label={STATUS[c.status][0]} tone={STATUS[c.status][1]} />
            </li>
          ))}
        </ul>
      )}
      <ComplaintModal open={open} requestId={r.id} onClose={() => setOpen(false)} />
    </div>
  );
};

export default ComplaintsTab;
