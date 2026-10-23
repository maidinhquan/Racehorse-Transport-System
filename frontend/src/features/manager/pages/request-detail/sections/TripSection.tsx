import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../components/StatusBadge/StatusBadge';
import { LockedCard } from '../../../components/Common/Common';
import { useManager } from '../../../hooks/useManager';
import type { TransportRequest } from '../../../types';
import { INCIDENT_TYPE_LABEL, MODE_LABEL, fmtDateTime, lastMilestone, milestoneText, staffName } from '../../../hooks/managerRules';

/** Mục 2: chuyến đi liên kết và các sự cố phát sinh */
export const TripSection: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const { data, tripFor } = useManager();
  const t = tripFor(r.id);
  if (!t) {
    return <LockedCard title="Chưa có chuyến đi" text="Chuyến đi chỉ được tạo sau khi tiền cọc được xác minh và khách hàng ký OTP hợp lệ." />;
  }
  const inc = data.incidents.filter((i) => i.tripId === t.id);
  const m = lastMilestone(t);
  return (
    <div className="mgr-grid-main">
      <div className="mgr-stack">
        <section className="mgr-card">
          <div className="mgr-between"><h3 className="mgr-card__title">Chuyến đi liên kết • {t.id}</h3><StatusBadge kind="trip" status={t.status} /></div>
          <div className="mgr-kv">
            <div><span>Phương thức</span><b>{MODE_LABEL[t.mode]}</b></div>
            <div><span>Phân công</span><b><StatusBadge kind="deployment" status={t.deployment.status} /></b></div>
            <div><span>Khởi hành dự kiến</span><b>{fmtDateTime(t.plannedDepart)}</b></div>
            <div><span>ETA</span><b>{fmtDateTime(t.eta)}</b></div>
            <div><span>Transport Specialist</span><b>{staffName(data, t.deployment.specialistId)}</b></div>
            <div><span>Fleet Coordinator</span><b>{staffName(data, t.deployment.coordinatorId)}</b></div>
            <div><span>Mốc gần nhất</span><b>{m ? `${milestoneText(t, m)} • ${fmtDateTime(m.at)}` : 'Chưa xuất phát'}</b></div>
          </div>
          <div className="mgr-actions">
            <Link className="mgr-btn mgr-btn--solid mgr-btn--sm" to={`/manager/trips/${t.id}`}>Quản lý chuyến đi</Link>
            {['IN_TRANSIT', 'COMPLETED'].includes(t.status) && <Link className="mgr-btn mgr-btn--sm" to={`/manager/trips/${t.id}/progress`}>Theo dõi hành trình</Link>}
          </div>
          <p className="mgr-hint">Phân công, hồ sơ, tuyến và phê duyệt khởi hành được xử lý trong Chuyến đi. Mốc hành trình do tổ xe cập nhật thủ công, không dùng GPS.</p>
        </section>
      </div>
      <aside className="mgr-stack">
        <section className="mgr-card">
          <div className="mgr-between"><h3 className="mgr-card__title">Sự cố trong chuyến ({inc.length})</h3>
            {inc.some((i) => i.status !== 'CLOSED') && <StatusBadge tone="warn" label={`${inc.filter((i) => i.status !== 'CLOSED').length} đang mở`} />}</div>
          {inc.map((i) => (
            <div key={i.id} className="mgr-row">
              <div><b>{i.id} • {INCIDENT_TYPE_LABEL[i.type]}</b><span>{i.description}</span></div>
              <Link className="mgr-btn mgr-btn--sm" to={`/manager/incidents/${i.id}`}>Xử lý</Link>
            </div>
          ))}
          {!inc.length && <p className="mgr-hint" style={{ marginTop: 0 }}>Không có sự cố nào được báo cho chuyến này.</p>}
        </section>
      </aside>
    </div>
  );
};

export default TripSection;
