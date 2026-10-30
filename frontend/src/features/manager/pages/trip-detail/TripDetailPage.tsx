import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ManagerLayout } from '../../components/ManagerLayout';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { BackLink, LockedCard } from '../../components/Common/Common';
import { useManager } from '../../hooks/useManager';
import { WorkflowHeader } from '../../components/WorkflowNav/WorkflowHeader';
import { STAGE_KEYS, STAGE_LABELS, MODE_LABEL, fmtDateTime, isReady, tripStage, type StageKey } from '../../hooks/managerRules';
import { AssignStage } from './stages/AssignStage';
import { PrepareStage } from './stages/PrepareStage';
import { DepartStage } from './stages/DepartStage';
import { ProgressStage } from './stages/ProgressStage';
import './TripDetailPage.css';

const STAGE_DESCRIPTIONS = {
  assign: 'Chọn người phụ trách hồ sơ và kế hoạch vận chuyển để bắt đầu chuẩn bị chuyến.',
  prepare: 'Theo dõi hồ sơ và xem xét phương án vận chuyển do nhân viên gửi lên.',
  depart: 'Kiểm tra các điều kiện sẵn sàng trước khi cho phép chuyến khởi hành.',
  progress: 'Theo dõi hành trình, các mốc vận chuyển và những việc cần xử lý.',
};

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
  const r = data.requests.find((x) => x.id === t.requestId);
  if (!r) return (
    <ManagerLayout title="Chuyến đi">
      <BackLink to="/manager/trips">Danh sách chuyến</BackLink>
      <LockedCard title="Đang tải hồ sơ yêu cầu" text="Thông tin yêu cầu liên kết với chuyến chưa được tải đầy đủ." icon="info" />
    </ManagerLayout>
  );
  const assignmentLocked = t.deployment.status !== 'NOT_CONFIRMED' || t.status !== 'PLANNING';
  const auto = Math.max(assignmentLocked ? 1 : 0, tripStage(t));
  const progressOpen = t.status !== 'PLANNING';
  const current: StageKey = STAGE_KEYS.includes(stage as StageKey) && (stage !== 'progress' || progressOpen) ? (stage as StageKey) : STAGE_KEYS[auto];
  const done = [assignmentLocked, isReady(t) || t.status !== 'PLANNING', progressOpen, t.status === 'COMPLETED'];

  if (stage === 'assign' && assignmentLocked) {
    return <Navigate to={`/manager/trips/${t.id}/${STAGE_KEYS[auto]}`} replace />;
  }

  return (
    <ManagerLayout title="Chuyến đi">
      <WorkflowHeader request={r} trip={t} customer={customer(r)} current="trip" />
      <section className="mgr-td__workspace" aria-label={`Điều hành chuyến ${t.id}`}>
        <div className="mgr-td__workspace-head">
          <div><p className="mgr-case__eyebrow">Điều hành chuyến đi</p><h2>{t.id}</h2></div>
          <StatusBadge kind="trip" status={t.status} />
        </div>
      <nav className="mgr-td__tabs" aria-label="Tiến trình chuyến đi">
        {STAGE_KEYS.map((k, i) => {
          const locked = (k === 'assign' && assignmentLocked) || (k === 'progress' && !progressOpen);
          const cls = `${k === current ? 'on' : ''} ${done[i] ? 'done' : ''} ${locked ? 'locked' : ''}`;
          return locked
            ? <button key={k} type="button" className={cls} disabled title={k === 'assign' ? 'Đã giao việc và khóa phân công' : 'Cần Manager duyệt khởi hành trước'}><span>{done[i] ? '✓' : i + 1}</span>{STAGE_LABELS[i]}</button>
            : <Link key={k} to={`/manager/trips/${t.id}/${k}`} className={cls} aria-current={k === current ? 'step' : undefined}><span>{done[i] ? '✓' : i + 1}</span>{STAGE_LABELS[i]}</Link>;
        })}
      </nav>
      <div className="mgr-td__body">
        <div className="mgr-td__content">
          <div className="mgr-td__intro"><h3>{STAGE_LABELS[STAGE_KEYS.indexOf(current)]}</h3><p>{STAGE_DESCRIPTIONS[current]}</p></div>
          {current === 'assign' && <AssignStage trip={t} />}
          {current === 'prepare' && <PrepareStage trip={t} />}
          {current === 'depart' && <DepartStage trip={t} />}
          {current === 'progress' && <ProgressStage trip={t} />}
        </div>
        <aside className="mgr-td__summary">
          <h3>Thông tin chuyến</h3>
          <dl>
            <div><dt>Khởi hành dự kiến</dt><dd>{fmtDateTime(t.plannedDepart)}</dd></div>
            <div><dt>Đến dự kiến</dt><dd>{fmtDateTime(t.eta)}</dd></div>
            <div><dt>Phương thức vận chuyển</dt><dd>{t.mode ? MODE_LABEL[t.mode] : 'Chờ Coordinator lập phương án'}</dd></div>
            <div><dt>Số ngựa</dt><dd>{r.horses.length} ngựa</dd></div>
          </dl>
          <div className="mgr-td__summary-note"><b>Giai đoạn hiện tại</b><p>{STAGE_LABELS[auto]}</p></div>
        </aside>
      </div>
      </section>
    </ManagerLayout>
  );
};

export default TripDetailPage;
