import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ManagerLayout } from '../../components/ManagerLayout';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { BackLink, LockedCard } from '../../components/Common/Common';
import { useManager } from '../../hooks/useManager';
import { STAGE_KEYS, STAGE_LABELS, fmtDateTime, isReady, routeText, tripStage, type StageKey } from '../../hooks/managerRules';
import { AssignStage } from './stages/AssignStage';
import { PrepareStage } from './stages/PrepareStage';
import { DepartStage } from './stages/DepartStage';
import { ProgressStage } from './stages/ProgressStage';
import './TripDetailPage.css';

/** Chi tiết chuyến đi theo 4 bước: phân công → chuẩn bị → duyệt khởi hành → vận chuyển */
export const TripDetailPage: React.FC = () => {
  const { tripId, stage } = useParams();
  const { getTrip, data, customer } = useManager();
  const t = getTrip(tripId);
  if (!t) {
    return (
      <ManagerLayout title="Chuyến đi">
        <BackLink to="/manager/trips">Danh sách chuyến</BackLink>
        <LockedCard title="Không tìm thấy chuyến" text={`Không có chuyến ${tripId ?? ''}.`} icon="info" />
      </ManagerLayout>
    );
  }
  const r = data.requests.find((x) => x.id === t.requestId)!;
  const auto = tripStage(t);
  const progressOpen = t.status !== 'PLANNING';
  const current: StageKey = STAGE_KEYS.includes(stage as StageKey) && (stage !== 'progress' || progressOpen) ? (stage as StageKey) : STAGE_KEYS[auto];
  const done = [t.deployment.status === 'CONFIRMED' || t.status !== 'PLANNING', isReady(t) || t.status !== 'PLANNING', progressOpen, t.status === 'COMPLETED'];

  return (
    <ManagerLayout title="Chuyến đi">
      <BackLink to="/manager/trips">Danh sách chuyến</BackLink>
      <div className="mgr-head">
        <div>
          <h2 className="mgr-title mgr-td__title">{t.id} <StatusBadge kind="trip" status={t.status} /></h2>
          <p className="mgr-subtitle">{customer(r)?.company} • {routeText(r)} • Khởi hành {fmtDateTime(t.plannedDepart)}</p>
        </div>
        <div className="mgr-btn-row">
          <Link className="mgr-btn" to={`/manager/requests/${r.id}`}>Yêu cầu {r.id}</Link>
          <Link className="mgr-btn" to={`/manager/contracts/${r.id}`}>Hợp đồng</Link>
        </div>
      </div>
      <nav className="mgr-stepper" aria-label="Tiến trình chuyến đi">
        {STAGE_KEYS.map((k, i) => {
          const locked = k === 'progress' && !progressOpen;
          const cls = `${k === current ? 'on' : ''} ${done[i] ? 'done' : ''} ${locked ? 'locked' : ''}`;
          return locked
            ? <button key={k} type="button" className={cls} disabled title="Cần Manager duyệt khởi hành trước"><span>{i + 1}</span>{STAGE_LABELS[i]}</button>
            : <Link key={k} to={`/manager/trips/${t.id}/${k}`} className={cls} aria-current={k === current ? 'step' : undefined}><span>{done[i] ? '✓' : i + 1}</span>{STAGE_LABELS[i]}</Link>;
        })}
      </nav>
      {current === 'assign' && <AssignStage trip={t} />}
      {current === 'prepare' && <PrepareStage trip={t} />}
      {current === 'depart' && <DepartStage trip={t} />}
      {current === 'progress' && <ProgressStage trip={t} />}
    </ManagerLayout>
  );
};

export default TripDetailPage;
