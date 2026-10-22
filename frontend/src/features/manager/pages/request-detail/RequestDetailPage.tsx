import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ManagerLayout } from '../../components/ManagerLayout';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { BackLink, LockedCard } from '../../components/Common/Common';
import { WorkflowNav } from '../../components/WorkflowNav/WorkflowNav';
import { useManager } from '../../hooks/useManager';
import { routeText } from '../../hooks/managerRules';
import { ReviewSection } from './sections/ReviewSection';
import { TripSection } from './sections/TripSection';
import { ClosureSection } from './sections/ClosureSection';
import './RequestDetailPage.css';

const SECTIONS: Array<[string, string]> = [['review', 'Thông tin & xét duyệt'], ['trip', 'Chuyến đi & sự cố'], ['closure', 'Bàn giao & đóng đơn']];

/** Chi tiết yêu cầu: xét duyệt → chuyến đi & sự cố → bàn giao, khiếu nại & đóng đơn */
export const RequestDetailPage: React.FC = () => {
  const { requestId, section = 'review' } = useParams();
  const { getRequest, tripFor, customer, data } = useManager();
  const r = getRequest(requestId);

  if (!r) {
    return (
      <ManagerLayout title="Yêu cầu vận chuyển">
        <BackLink to="/manager/requests">Danh sách yêu cầu</BackLink>
        <LockedCard title="Không tìm thấy yêu cầu" text={`Không có yêu cầu ${requestId ?? ''} trong dữ liệu.`} icon="info" />
      </ManagerLayout>
    );
  }
  const t = tripFor(r.id);
  const openInc = t ? data.incidents.some((i) => i.tripId === t.id && i.status !== 'CLOSED') : false;
  const openCmp = data.complaints.some((c) => c.requestId === r.id && c.status !== 'RESOLVED');
  const current = SECTIONS.some(([k]) => k === section) ? section : 'review';

  return (
    <ManagerLayout title="Yêu cầu vận chuyển">
      <BackLink to="/manager/requests">Danh sách yêu cầu</BackLink>
      <div className="mgr-head">
        <div>
          <h2 className="mgr-title mgr-rd__title">{r.id} <StatusBadge status={r.status} /></h2>
          <p className="mgr-subtitle">{customer(r)?.company} • {routeText(r)} • {r.horses.length} ngựa</p>
        </div>
      </div>
      <WorkflowNav request={r} trip={t} current="request" />
      <nav className="mgr-flowtabs" aria-label="Mục của yêu cầu">
        {SECTIONS.map(([k, label]) => (
          <Link key={k} to={`/manager/requests/${r.id}/${k}`} className={current === k ? 'on' : ''} aria-current={current === k ? 'page' : undefined}>
            {label}{((k === 'trip' && openInc) || (k === 'closure' && (openCmp || !!t?.refusal && !t.refusal.resolvedAt))) && <i className="mgr-dot" aria-label="Có việc cần xử lý" />}
          </Link>
        ))}
      </nav>
      {current === 'review' && <ReviewSection request={r} />}
      {current === 'trip' && <TripSection request={r} />}
      {current === 'closure' && <ClosureSection request={r} />}
    </ManagerLayout>
  );
};

export default RequestDetailPage;
