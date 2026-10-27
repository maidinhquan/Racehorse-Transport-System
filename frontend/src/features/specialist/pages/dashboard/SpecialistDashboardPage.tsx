import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SpecialistLayout, Icon } from '../../components/SpecialistLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { MiniProgress } from '../../components/Common/Common';
import { DemoPanel } from '../../components/DemoPanel/DemoPanel';
import { useSpecialist } from '../../hooks/useSpecialist';
import { CUSTOMER_DOC_NAME, docEffective, fmtDate, fmtDateTime, horseName, shortName, tripTotals, typeName } from '../../hooks/specialistRules';
import './SpecialistDashboardPage.css';

type Alert = { tone: 'bad' | 'warn' | 'info'; title: string; sub: string; to: string };

/** Tổng quan của Transport Specialist: số liệu, mức sẵn sàng hồ sơ từng chuyến và việc cần làm */
export const SpecialistDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, trips, documents, customerDocs, requests, stats } = useSpecialist();
  const active = trips.filter((t) => t.status !== 'COMPLETED');

  const alerts: Alert[] = [];
  trips.filter((t) => t.deployment === 'NOT_CONFIRMED').forEach((t) => alerts.push({ tone: 'info', title: `${t.id} chờ Manager giao`, sub: `${t.requestId} • khởi hành ${fmtDateTime(t.plannedDepart)}`, to: `/specialist/trips/${t.id}` }));
  trips.filter((t) => t.deployment === 'CONFIRMED' && t.status === 'PLANNING' && !t.reqSet).forEach((t) => alerts.push({ tone: 'warn', title: `${t.id}: chưa áp dụng bộ yêu cầu hồ sơ`, sub: `${t.origin} → ${t.destination}`, to: `/specialist/trips/${t.id}` }));
  customerDocs.filter((d) => d.status === 'SUBMITTED').forEach((d) => {
    const t = trips.find((x) => x.id === d.tripId);
    if (!t || t.deployment !== 'CONFIRMED') return;
    alerts.push({ tone: 'warn', title: `${CUSTOMER_DOC_NAME[d.key]} chờ duyệt`, sub: `${t.id} • ${d.scope === 'request' ? 'Giấy tờ chung' : horseName(t, d.scope)}`, to: `/specialist/trips/${t.id}/customer` });
  });
  documents.filter((d) => d.status === 'SUBMITTED').forEach((d) => alerts.push({ tone: 'warn', title: `${typeName(data, d.typeId)} chờ duyệt`, sub: `${d.tripId} • ${d.id} v${d.versions?.length ?? 1}`, to: `/specialist/documents/${d.id}` }));
  documents.filter((d) => d.status === 'REJECTED').forEach((d) => alerts.push({ tone: 'bad', title: `${typeName(data, d.typeId)} bị từ chối – cần bản mới`, sub: `${d.tripId} • ${d.rejectReason ?? ''}`, to: `/specialist/documents/${d.id}` }));
  documents.filter((d) => docEffective(d) === 'EXPIRED' && active.some((t) => t.id === d.tripId)).forEach((d) => alerts.push({ tone: 'bad', title: `${typeName(data, d.typeId)} đã hết hạn`, sub: `${d.tripId} • hết hạn ${fmtDate(d.expiry)}`, to: `/specialist/documents/${d.id}` }));
  requests.filter((q) => q.status === 'SUBMITTED').forEach((q) => alerts.push({ tone: 'info', title: `Khách đã phản hồi ${q.id}`, sub: `${CUSTOMER_DOC_NAME[q.key]} • ${q.tripId}`, to: `/specialist/trips/${q.tripId}/customer` }));

  const card = (to: string, icon: string, label: string, n: number, small: string, cls: 'warn' | 'bad' | '' = 'warn') => (
    <button type="button" className={`spc-stat ${n ? cls : ''}`} onClick={() => navigate(to)}>
      <span><Icon name={icon} />{label}</span><b>{n}</b><small>{small}</small>
    </button>
  );

  return (
    <SpecialistLayout title="Tổng quan">
      <div className="spc-head">
        <div>
          <h2 className="spc-title">Xin chào, Hà</h2>
          <p className="spc-subtitle">Yêu cầu pháp lý và hồ sơ của mọi chuyến đã được giao.</p>
        </div>
      </div>
      <div className="spc-stats six">
        {card('/specialist/trips?issue=SUBMITTED', 'file', 'Chờ duyệt', stats.awaiting, stats.awaiting ? 'Giấy tờ đã nộp cần kiểm tra' : 'Không có gì để duyệt')}
        {card('/specialist/trips?issue=MISSING', 'alert', 'Giấy tờ còn thiếu', stats.missing, stats.missing ? 'Trên các chuyến đã giao' : 'Không thiếu mục bắt buộc', 'bad')}
        {card('/specialist/trips?issue=REJECTED', 'alert', 'Bị từ chối – cần bản mới', stats.rejected, stats.rejected ? 'Đang chờ phiên bản mới' : 'Không có', 'bad')}
        {card('/specialist/trips?issue=EXPIRED', 'clock', 'Sắp hết hạn / đã hết hạn', stats.expiring, 'Trong 30 ngày hoặc đã hết hạn')}
        {card('/specialist/trips?issue=REQUEST', 'file', 'Yêu cầu bổ sung đang mở', stats.openRequests, stats.answered ? `${stats.answered} phản hồi của khách cần kiểm tra` : 'Đang chờ khách hàng', '')}
        {card('/specialist/trips?issue=PREP', 'truck', 'Chuyến cần chuẩn bị', stats.prep, `${stats.waitingDeploy} chuyến chờ Manager giao`, '')}
      </div>

      <div className="spc-dash">
        <div className="spc-card" style={{ padding: 0 }}>
          <h3 className="spc-card__title" style={{ padding: '16px 18px 0' }}>
            Mức sẵn sàng hồ sơ <button type="button" className="spc-link" onClick={() => navigate('/specialist/trips')}>Xem tất cả</button>
          </h3>
          <div className="spc-table-wrap">
            <table className="spc-table">
              <thead><tr><th>Chuyến</th><th>Tuyến</th><th>Khởi hành</th><th>Tổng giấy tờ</th><th>Giao việc</th></tr></thead>
              <tbody>
                {active.map((t) => {
                  const x = tripTotals(data, t);
                  return (
                    <tr key={t.id} className="clickable" onClick={() => navigate(`/specialist/trips/${t.id}`)}>
                      <td><b>{t.id}</b><div className="spc-muted">{t.requestId}</div></td>
                      <td>{shortName(t.origin)} → {shortName(t.destination)}</td>
                      <td>{fmtDateTime(t.plannedDepart)}</td>
                      <td><MiniProgress done={x.done} total={x.total} /></td>
                      <td><TripStatusBadge kind="deployment" status={t.deployment} /></td>
                    </tr>
                  );
                })}
                {!active.length && (
                  <tr>
                    <td colSpan={5} className="spc-empty" style={{ textAlign: 'center', padding: '24px' }}>
                      Chưa có chuyến vận chuyển nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="spc-card spc-dash__todo">
          <h3 className="spc-card__title">Việc cần làm <span className="spc-muted">{alerts.length}</span></h3>
          <div className="spc-dash__scroll">
            {alerts.map((a, i) => (
              <button key={`${a.to}-${i}`} type="button" className={`spc-alert spc-alert--${a.tone}`} onClick={() => navigate(a.to)}>
                <b>{a.title}</b><span>{a.sub}</span>
              </button>
            ))}
            {!alerts.length && <p className="spc-muted">Không có việc nào.</p>}
          </div>
        </div>
      </div>
      <DemoPanel />
    </SpecialistLayout>
  );
};

export default SpecialistDashboardPage;
