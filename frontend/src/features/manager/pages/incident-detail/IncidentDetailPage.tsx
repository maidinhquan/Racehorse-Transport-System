import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ManagerLayout } from '../../components/ManagerLayout';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { BackLink, LockedCard, Note, openSampleFile } from '../../components/Common/Common';
import { Modal, ReasonModal } from '../../components/Modals';
import { useManager } from '../../hooks/useManager';
import { INCIDENT_TYPE_LABEL, PAYER_LABEL, TRIP_STATUS_LABEL, fmtDateTime, fmtMoney, horseName, reqOfTrip, routeText } from '../../hooks/managerRules';

/** Chi tiết sự cố: mô tả, biện pháp an toàn, phương án xử lý chờ Manager quyết định, nhật ký */
export const IncidentDetailPage: React.FC = () => {
  const { incidentId } = useParams();
  const { data, incidents, getTrip, actions } = useManager();
  const [decision, setDecision] = useState<{ planId: string; approve: boolean } | null>(null);
  const [closing, setClosing] = useState(false);
  const i = incidents.find((x) => x.id === incidentId);
  if (!i) {
    return (
      <ManagerLayout title="Sự cố & khiếu nại">
        <BackLink to="/manager/incidents">Sự cố & khiếu nại</BackLink>
        <LockedCard title="Không tìm thấy sự cố" text={`Không có sự cố ${incidentId ?? ''}.`} icon="info" />
      </ManagerLayout>
    );
  }
  const t = getTrip(i.tripId)!, r = reqOfTrip(data, t);
  return (
    <ManagerLayout title="Sự cố & khiếu nại">
      <BackLink to="/manager/incidents">Sự cố & khiếu nại</BackLink>
      <div className="mgr-head">
        <div>
          <h2 className="mgr-title" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{i.id} <StatusBadge kind="incident" status={i.status} /> <StatusBadge kind="severity" status={i.severity} /></h2>
          <p className="mgr-subtitle">{INCIDENT_TYPE_LABEL[i.type]} • {i.tripId} • {routeText(r)}</p>
        </div>
        <div className="mgr-btn-row">
          {i.status === 'NEW' && <button type="button" className="mgr-btn" onClick={() => actions.ackIncident(i.id)}>Tiếp nhận xử lý</button>}
          {i.status !== 'CLOSED' && <button type="button" className="mgr-btn mgr-btn--solid" onClick={() => setClosing(true)}>Đóng sự cố</button>}
        </div>
      </div>
      <div className="mgr-grid-main">
        <div className="mgr-stack">
          <section className="mgr-card">
            <h3 className="mgr-card__title">Diễn biến</h3>
            <p style={{ lineHeight: 1.6, marginTop: 0 }}>{i.description}</p>
            <div className="mgr-kv">
              <div><span>Báo lúc</span><b>{fmtDateTime(i.at)}</b></div>
              <div><span>Người báo</span><b>{i.by}</b></div>
              <div><span>Địa điểm</span><b>{i.location}</b></div>
              <div><span>Ngựa liên quan</span><b>{i.horseId ? horseName(data, i.horseId) : r.horses.map((h) => horseName(data, h)).join(', ')}</b></div>
            </div>
            <Note tone={i.safety ? 'green' : 'grey'} title="Biện pháp an toàn tức thời">{i.safety || 'Người báo xác nhận người và ngựa an toàn. Chăm sóc khẩn cấp không cần chờ phê duyệt.'}</Note>
            {i.photos.length > 0 && <div className="mgr-photos">{i.photos.map((p) => <button key={p} type="button" className="mgr-photo" onClick={() => openSampleFile(p)}>{p}</button>)}</div>}
          </section>
          <section className="mgr-card">
            <h3 className="mgr-card__title">Phương án xử lý</h3>
            {i.plans.map((p) => (
              <div key={p.id} className="mgr-inner">
                <div className="mgr-between"><b>{p.kind} • {p.id}</b><StatusBadge kind="plan" status={p.status} /></div>
                <p style={{ margin: '8px 0', lineHeight: 1.6 }}>{p.desc}</p>
                <div className="mgr-kv">
                  <div><span>Chi phí phát sinh</span><b>{fmtMoney(p.cost)}</b></div>
                  <div><span>Bên chi trả</span><b>{PAYER_LABEL[p.payer]}</b></div>
                  <div><span>Đề xuất lúc</span><b>{fmtDateTime(p.at)}</b></div>
                </div>
                {p.decisionNote && <p className="mgr-hint">Ghi chú quyết định: {p.decisionNote}</p>}
                {p.status === 'PENDING_APPROVAL' && (
                  <div className="mgr-actions">
                    <button type="button" className="mgr-btn mgr-btn--solid mgr-btn--sm" onClick={() => setDecision({ planId: p.id, approve: true })}>Duyệt phương án</button>
                    <button type="button" className="mgr-btn mgr-btn--sm" onClick={() => setDecision({ planId: p.id, approve: false })}>Từ chối</button>
                  </div>
                )}
              </div>
            ))}
            {!i.plans.length && <p className="mgr-hint" style={{ marginTop: 0 }}>Chưa có phương án nào được đề xuất.</p>}
          </section>
        </div>
        <aside className="mgr-stack">
          <section className="mgr-card">
            <h3 className="mgr-card__title">Chuyến đi</h3>
            <div className="mgr-kv" style={{ gridTemplateColumns: '1fr' }}>
              <div><span>Chuyến</span><b>{t.id}</b></div>
              <div><span>Tuyến</span><b>{routeText(r)}</b></div>
              <div><span>Trạng thái</span><b>{TRIP_STATUS_LABEL[t.status]}</b></div>
              <div><span>ETA</span><b>{fmtDateTime(t.eta)}</b></div>
            </div>
            <div className="mgr-actions"><Link className="mgr-btn mgr-btn--sm" to={`/manager/trips/${t.id}/progress`}>Tiến độ chuyến</Link><Link className="mgr-btn mgr-btn--sm" to={`/manager/requests/${r.id}/trip`}>Yêu cầu {r.id}</Link></div>
          </section>
          <section className="mgr-card">
            <h3 className="mgr-card__title">Nhật ký</h3>
            <ul className="mgr-timeline">{[...i.log].reverse().map(([at, text], k) => <li key={`${at}-${k}`} className={k === 0 ? 'now' : 'done'}><b>{text}</b><span>{fmtDateTime(at)}</span></li>)}</ul>
          </section>
        </aside>
      </div>
      <ReasonModal open={!!decision} title={decision?.approve ? `Duyệt ${decision.planId}` : `Từ chối ${decision?.planId ?? ''}`}
        okText={decision?.approve ? 'Duyệt phương án' : 'Từ chối'} danger={!decision?.approve} minLength={decision?.approve ? 0 : 10}
        label={decision?.approve ? 'Ghi chú (không bắt buộc)' : 'Lý do từ chối *'}
        intro={decision?.approve ? <p>Chi phí do công ty chịu được cộng vào chi phí thực tế của chuyến.</p> : undefined}
        onClose={() => setDecision(null)} onSubmit={(x) => actions.decidePlan(i.id, decision!.planId, decision!.approve, x).ok} />
      <Modal open={closing} title={`Đóng ${i.id}`} okText="Đóng sự cố" onClose={() => setClosing(false)} onOk={() => { if (actions.closeIncident(i.id).ok) setClosing(false); }}>
        <p>Xác nhận sự cố đã được xử lý xong. Sự cố mở sẽ chặn việc đóng yêu cầu {r.id}.</p>
      </Modal>
    </ManagerLayout>
  );
};

export default IncidentDetailPage;
