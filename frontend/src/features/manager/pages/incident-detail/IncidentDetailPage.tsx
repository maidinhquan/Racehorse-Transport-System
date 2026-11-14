import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ManagerLayout } from '../../components/ManagerLayout';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { BackLink, LockedCard, Note, openSampleFile } from '../../components/Common/Common';
import { ReasonModal } from '../../components/Modals';
import { useManager } from '../../hooks/useManager';
import { INCIDENT_TYPE_LABEL, PAYER_LABEL, TRIP_STATUS_LABEL, fmtDateTime, fmtMoney, horseName, reqOfTrip, routeText } from '../../hooks/managerRules';
import { humanizeLocation, locationBadgeInfo } from '../../../../shared/utils/locationResolver';

/** Chi tiết sự cố: mô tả, biện pháp an toàn, phương án xử lý chờ Manager quyết định, nhật ký */
export const IncidentDetailPage: React.FC = () => {
  const { incidentId } = useParams();
  const { data, incidents, getTrip, actions } = useManager();
  const [decision, setDecision] = useState<{ planId: string; approve: boolean } | null>(null);
  const i = incidents.find((x) => x.id === incidentId);
  if (!i) {
    return (
      <ManagerLayout title="Sự cố & khiếu nại">
        <BackLink to="/manager/incidents">Sự cố & khiếu nại</BackLink>
        <LockedCard title="Không tìm thấy sự cố" text={`Không có sự cố ${incidentId ?? ''}.`} icon="info" />
      </ManagerLayout>
    );
  }
  const t = i.tripId ? getTrip(i.tripId) : undefined;
  const r = t ? reqOfTrip(data, t) : undefined;
  return (
    <ManagerLayout title="Sự cố & khiếu nại">
      <BackLink to="/manager/incidents">Sự cố & khiếu nại</BackLink>
      <div className="mgr-head">
        <div>
          <h2 className="mgr-title" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{i.id} <StatusBadge kind="incident" status={i.status} /> <StatusBadge kind="severity" status={i.severity} /></h2>
          <p className="mgr-subtitle">{INCIDENT_TYPE_LABEL[i.type] || i.type} • {i.tripId || '—'}{r ? ` • ${routeText(r)}` : ''}</p>
        </div>
        <div className="mgr-btn-row">
          {i.status !== 'CLOSED' && <span className="mgr-hint">Chỉ xem: Điều phối viên tiếp nhận và đóng sự cố khi xử lý xong.</span>}
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
              <div>
                <span>Địa điểm</span>
                {(() => {
                  const locText = humanizeLocation(i.location, (i as any).locationCoordinates, t);
                  const { badgeLabel, isStop, cleanText } = locationBadgeInfo(locText);
                  return (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                      <span className={`mgr-badge ${isStop ? 'mgr-badge--ok' : 'mgr-badge--info'}`} style={{ fontSize: 11 }}>
                        {badgeLabel}
                      </span>
                      <b>{cleanText}</b>
                    </div>
                  );
                })()}
              </div>
              <div><span>Ngựa liên quan</span><b>{i.horseId ? horseName(data, i.horseId) : (r?.horses || []).map((h) => horseName(data, h)).join(', ') || 'Không'}</b></div>
            </div>
            <Note tone={i.safety ? 'green' : 'grey'} title="Biện pháp an toàn tức thời">{i.safety || 'Người báo xác nhận người và ngựa an toàn. Chăm sóc khẩn cấp không cần chờ phê duyệt.'}</Note>
            {(i.photos || []).length > 0 && <div className="mgr-photos">{(i.photos || []).map((p) => <button key={p} type="button" className="mgr-photo" onClick={() => openSampleFile(p)}>{p}</button>)}</div>}
          </section>
          <section className="mgr-card">
            <h3 className="mgr-card__title">Phương án xử lý</h3>
            {(i.plans || []).map((p) => (
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
              <div><span>Chuyến</span><b>{t?.id || i.tripId || '—'}</b></div>
              <div><span>Tuyến</span><b>{r ? routeText(r) : '—'}</b></div>
              <div><span>Trạng thái</span><b>{t ? TRIP_STATUS_LABEL[t.status] : '—'}</b></div>
              <div><span>ETA</span><b>{t ? fmtDateTime(t.eta) : '—'}</b></div>
            </div>
            <div className="mgr-actions">
              {t && <Link className="mgr-btn mgr-btn--sm" to={`/manager/trips/${t.id}/progress`}>Tiến độ chuyến</Link>}
              {r && <Link className="mgr-btn mgr-btn--sm" to={`/manager/requests/${r.id}/trip`}>Yêu cầu {r.id}</Link>}
            </div>
          </section>
          <section className="mgr-card">
            <h3 className="mgr-card__title">Nhật ký</h3>
            <ul className="mgr-timeline">{[...(i.log || [])].reverse().map(([at, text], k) => <li key={`${at}-${k}`} className={k === 0 ? 'now' : 'done'}><b>{text}</b><span>{fmtDateTime(at)}</span></li>)}</ul>
          </section>
        </aside>
      </div>
      <ReasonModal open={!!decision} title={decision?.approve ? `Duyệt ${decision.planId}` : `Từ chối ${decision?.planId ?? ''}`}
        okText={decision?.approve ? 'Duyệt phương án' : 'Từ chối'} danger={!decision?.approve} minLength={decision?.approve ? 0 : 10}
        label={decision?.approve ? 'Ghi chú (không bắt buộc)' : 'Lý do từ chối *'}
        intro={decision?.approve ? <p>Chi phí do công ty chịu được cộng vào chi phí thực tế của chuyến.</p> : undefined}
        onClose={() => setDecision(null)} onSubmit={(x) => actions.decidePlan(i.id, decision!.planId, decision!.approve, x).ok} />
    </ManagerLayout>
  );
};

export default IncidentDetailPage;
