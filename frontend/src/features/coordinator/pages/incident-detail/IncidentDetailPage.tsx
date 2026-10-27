import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CoordinatorLayout, Icon } from '../../components/CoordinatorLayout';
import { TripStatusBadge, type BadgeTone } from '../../components/TripStatusBadge/TripStatusBadge';
import { RescuePlanModal, ResolveIncidentModal } from '../../components/Modals';
import { useCoordinator } from '../../hooks/useCoordinator';
import {
  INCIDENT_TYPE_LABEL,
  PAYER_LABEL,
  RESCUE_KIND_LABEL,
  SEVERITY_LABEL,
  backupVehicles,
  fmtDateTime,
  fmtUsd,
  isOpenIncident,
  planNeedsApproval,
  whereNow,
} from '../../hooks/coordinatorRules';
import type { IncidentSeverity } from '../../types';
import './IncidentDetailPage.css';

const SEVERITY_TONE: Record<IncidentSeverity, BadgeTone> = { LOW: 'muted', MEDIUM: 'warn', HIGH: 'bad', CRITICAL: 'bad' };

export const IncidentDetailPage: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const { incidents, trips, vehicles, actions } = useCoordinator();
  const [planOpen, setPlanOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const i = incidents.find((x) => x.id === incidentId);
  const t = i && trips.find((x) => x.id === i.tripId);

  if (!i || !t) {
    return (
      <CoordinatorLayout title="Sự cố">
        <div className="crd-card crd-empty">Không tìm thấy sự cố {incidentId}.
          <div className="crd-btn-row" style={{ justifyContent: 'center' }}><button type="button" className="crd-btn" onClick={() => navigate('/coordinator/incidents')}>Về danh sách sự cố</button></div>
        </div>
      </CoordinatorLayout>
    );
  }

  const plans = i.plans ?? [];
  const open = isOpenIncident(i);

  return (
    <CoordinatorLayout title="Sự cố">
      <button type="button" className="crd-back" onClick={() => navigate('/coordinator/incidents')}><Icon name="back" /> Quay lại Sự cố</button>
      <div className="crd-head">
        <div>
          <h2 className="crd-title crd-detail__title">{i.id} <TripStatusBadge status={i.status} /></h2>
          <p className="crd-subtitle">{INCIDENT_TYPE_LABEL[i.type] ?? i.type} • {t.id} • {t.origin} → {t.destination}</p>
        </div>
        {open && (
          <div className="crd-btn-row" style={{ marginTop: 0 }}>
            {i.status === 'NEW'
              ? <button type="button" className="crd-btn crd-btn--danger" onClick={() => void actions.acknowledgeIncident(i.id)}>Tiếp nhận sự cố</button>
              : <button type="button" className="crd-btn" onClick={() => setResolveOpen(true)}>Báo đã khắc phục</button>}
            <button type="button" className="crd-btn crd-btn--solid" onClick={() => setPlanOpen(true)}>Lập phương án giải cứu / thay thế</button>
          </div>
        )}
      </div>

      {i.status === 'RESOLVED' && (
        <div className="crd-note crd-note--green" style={{ marginTop: 0, marginBottom: 16 }}>
          <Icon name="check" />
          <div>
            <b>Đã báo khắc phục • {fmtDateTime(i.resolvedAt)}</b>{i.resolveNote} Chờ Manager đóng sự cố.
            <div className="crd-btn-row"><button type="button" className="crd-btn crd-btn--sm" onClick={() => actions.demoCloseIncident(i.id)}>Demo: Manager đóng sự cố</button></div>
          </div>
        </div>
      )}

      <div className="crd-inc-grid">
        <div className="crd-stack">
          <div className="crd-card">
            <h3 className="crd-card__title">Chuyện gì đã xảy ra</h3>
            <p style={{ margin: '0 0 14px', lineHeight: 1.6 }}>{i.description}</p>
            <div className="crd-kv">
              <div><span>Báo lúc</span><b>{fmtDateTime(i.reportedAt)}</b></div>
              <div><span>Người báo</span><b>{i.reportedBy}</b></div>
              <div><span>Vị trí</span><b>{i.location ?? '—'}</b></div>
              <div><span>Mức độ</span><b><TripStatusBadge tone={SEVERITY_TONE[i.severity]} label={SEVERITY_LABEL[i.severity]} /></b></div>
              {i.ackBy && <div><span>Tiếp nhận</span><b>{i.ackBy} • {fmtDateTime(i.ackAt)}</b></div>}
            </div>
            <div className="crd-note crd-note--grey"><Icon name="alert" /><div><b>Biện pháp an toàn tức thời</b>Tổ xe xác nhận người và ngựa đã an toàn hoặc đã bắt đầu sơ cứu. Cứu hộ khẩn cấp không chờ phê duyệt.</div></div>
          </div>

          <div className="crd-card">
            <h3 className="crd-card__title">Phương án xử lý</h3>
            {plans.length ? plans.map((p) => (
              <div key={p.id} className={`crd-inc-plan ${['APPROVED', 'APPLIED'].includes(p.status) ? 'ok' : ''}`}>
                <div className="crd-card__title" style={{ marginBottom: 6 }}><span>{RESCUE_KIND_LABEL[p.kind]} • {p.id}</span><TripStatusBadge status={p.status} /></div>
                <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.6 }}>{p.desc}</p>
                <div className="crd-kv">
                  <div><span>Chi phí phát sinh</span><b>{fmtUsd(p.cost)}</b></div>
                  <div><span>Bên chi trả</span><b>{PAYER_LABEL[p.payer]}</b></div>
                  <div><span>Trễ ETA</span><b>{p.etaHours ? `+${p.etaHours} giờ` : '—'}</b></div>
                  <div><span>Đề xuất</span><b>{fmtDateTime(p.at)}</b></div>
                  <div><span>Phê duyệt</span><b>{planNeedsApproval(p) ? 'Cần Manager duyệt' : 'Không cần duyệt'}</b></div>
                </div>
                {p.decisionNote && <p className="crd-muted" style={{ marginTop: 8 }}>{p.decisionNote}</p>}
                {p.status === 'PENDING_APPROVAL' && (
                  <div className="crd-btn-row">
                    <button type="button" className="crd-btn crd-btn--sm" onClick={() => actions.demoDecidePlan(i.id, p.id, false)}>Demo: Manager từ chối</button>
                    <button type="button" className="crd-btn crd-btn--sm" onClick={() => actions.demoDecidePlan(i.id, p.id, true)}>Demo: Manager duyệt phương án</button>
                  </div>
                )}
              </div>
            )) : <p className="crd-muted">Chưa có phương án nào. {open ? 'Bấm “Lập phương án giải cứu / thay thế”.' : ''}</p>}
          </div>
        </div>

        <div className="crd-stack">
          <div className="crd-card">
            <h3 className="crd-card__title">Chuyến</h3>
            <div className="crd-kv" style={{ gridTemplateColumns: '1fr' }}>
              <div><span>Chuyến</span><b>{t.id} • <TripStatusBadge status={t.status} /></b></div>
              <div><span>Vị trí ước tính</span><b>{whereNow(t)}</b></div>
              <div><span>ETA</span><b>{fmtDateTime(t.eta)}</b></div>
            </div>
            <div className="crd-btn-row"><button type="button" className="crd-btn crd-btn--sm" onClick={() => navigate(`/coordinator/trips/${t.id}/tracking`)}>Mở theo dõi hành trình</button></div>
          </div>
          <div className="crd-card">
            <h3 className="crd-card__title">Nhật ký</h3>
            {(i.log ?? []).length ? (
              <ul className="crd-timeline">
                {[...(i.log ?? [])].reverse().map((l) => <li key={l.at + l.text} className="done"><b>{l.text}</b><span>{fmtDateTime(l.at)}</span></li>)}
              </ul>
            ) : <p className="crd-muted">Chưa có ghi nhận.</p>}
          </div>
        </div>
      </div>

      {planOpen && (
        <RescuePlanModal incident={i} trip={t} backups={backupVehicles(t, vehicles, trips)}
          onClose={() => setPlanOpen(false)} onSubmit={(body) => actions.proposeRescuePlan(i.id, body)} />
      )}
      {resolveOpen && <ResolveIncidentModal incident={i} onClose={() => setResolveOpen(false)} onSubmit={(note) => actions.resolveIncident(i.id, note)} />}
    </CoordinatorLayout>
  );
};

export default IncidentDetailPage;
