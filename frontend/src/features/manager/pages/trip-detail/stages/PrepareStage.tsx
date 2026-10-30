import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../components/StatusBadge/StatusBadge';
import { LockedCard, MiniProgress, Note } from '../../../components/Common/Common';
import { Modal, ReasonModal } from '../../../components/Modals';
import { DemoPanel } from '../../../components/DemoPanel/DemoPanel';
import { AssignStage } from './AssignStage';
import { useManager } from '../../../hooks/useManager';
import type { Trip } from '../../../types';
import { STOP_TYPE_LABEL, fmtDateTime, fmtMoney, isReady, readinessChecks, staffName } from '../../../hooks/managerRules';

type Dialog = '' | 'approve' | 'return' | 'flight-ok' | 'flight-no';

/** Bước 2: theo dõi hồ sơ/bảo hiểm (Specialist) và duyệt phương án tuyến + xe + nhân sự + ngân sách bay (Coordinator) */
export const PrepareStage: React.FC<{ trip: Trip }> = ({ trip: t }) => {
  const { data, actions } = useManager();
  const [dialog, setDialog] = useState<Dialog>('');
  const close = () => setDialog('');
  if (t.deployment.status === 'NOT_CONFIRMED') return <LockedCard title="Chưa phân công" text="Phân công Specialist và Coordinator ở bước 1 để bắt đầu chuẩn bị." />;
  const rd = t.readiness, rt = t.route, checks = readinessChecks(t);
  const docsOk = checks.filter((c) => ['docs', 'insurance', 'quarantine'].includes(c.key)).every((c) => c.ok);
  const routeOk = checks.filter((c) => ['route', 'resources', 'flight'].includes(c.key)).every((c) => c.ok);
  const planning = t.status === 'PLANNING';

  return (
    <>
      <AssignStage trip={t} />
      <div className="mgr-grid-main">
        <div className="mgr-stack">
          <details className="mgr-acc" open={!docsOk}>
            <summary>
              <div><b>Hồ sơ, kiểm dịch & bảo hiểm</b><small>Specialist {staffName(data, t.deployment.specialistId)} phụ trách • Manager theo dõi</small></div>
              <StatusBadge tone={docsOk ? 'ok' : 'warn'} label={docsOk ? 'Hoàn tất' : 'Đang xử lý'} />
            </summary>
            <div className="mgr-acc__body">
              <div className="mgr-kv">
                <div><span>Chứng từ hợp lệ</span><b><MiniProgress done={rd.docsReady} total={rd.docsTotal} /></b></div>
                <div><span>Specialist xác nhận READY</span><b>{rd.docsReadyAt ? fmtDateTime(rd.docsReadyAt) : 'Chưa'}</b></div>
                <div><span>Bảo hiểm</span><b><StatusBadge tone={rd.insurance === 'VERIFIED' ? 'ok' : rd.insurance === 'PENDING' ? 'warn' : 'bad'} label={rd.insurance === 'VERIFIED' ? 'Đã xác minh' : rd.insurance === 'PENDING' ? 'Chờ xác minh' : 'Chưa có'} /></b></div>
                <div><span>Lịch kiểm dịch</span><b>{rd.quarantineOk ? 'Đã xác nhận' : 'Chưa xác nhận'}</b></div>
              </div>
              <p className="mgr-hint">Chỉ Transport Specialist được duyệt chứng từ và xác minh bảo hiểm.</p>
            </div>
          </details>

          <details className="mgr-acc" open={!routeOk || rt?.status === 'PENDING_APPROVAL' || t.flight?.status === 'BUDGET_PENDING'}>
            <summary>
              <div><b>Phương án tuyến, xe & nhân sự</b><small>Coordinator {staffName(data, t.deployment.coordinatorId)} gửi • Manager duyệt</small></div>
              <StatusBadge tone={routeOk ? 'ok' : rt?.status === 'PENDING_APPROVAL' ? 'warn' : 'muted'} label={routeOk ? 'Hoàn tất' : rt ? `Tuyến v${rt.v} • ${rt.status === 'PENDING_APPROVAL' ? 'chờ duyệt' : rt.status === 'APPROVED' ? 'đã duyệt' : 'làm lại'}` : 'Chưa gửi'} />
            </summary>
            <div className="mgr-acc__body">
              {!rt && <p className="mgr-hint" style={{ marginTop: 0 }}>Coordinator chưa gửi phương án tuyến.</p>}
              {rt && (
                <>
                  {rt.status === 'CHANGES_REQUESTED' && <Note tone="yellow" title="Đã yêu cầu Coordinator làm lại">{rt.decisionNote}</Note>}
                  <div className="mgr-td__grid">
                    <div className="mgr-inner">
                      <h4>1. Lộ trình (gửi {fmtDateTime(rt.submittedAt)})</h4>
                      {rt.stops.map((s, i) => (
                        <div key={`${s.name}-${i}`} className="mgr-stop"><i>{i + 1}</i><div><b>{s.name}</b><span>{STOP_TYPE_LABEL[s.type]}</span></div><small>{fmtDateTime(s.plannedAt)}</small></div>
                      ))}
                      {rt.note && <p className="mgr-hint">Ghi chú: {rt.note}</p>}
                    </div>
                    <div className="mgr-inner">
                      <h4>2. Phương tiện & nhân sự</h4>
                      <div className="mgr-row"><div><b>Xe</b><span>{rt.vehicle ?? 'Do đơn vị hàng không bố trí'}</span></div></div>
                      {rt.crew.map(([role, name]) => <div key={role} className="mgr-row"><div><b>{role}</b><span>{name}</span></div></div>)}
                      <div className="mgr-row"><div><b>Coordinator xác nhận bố trí</b><span>{rt.resourcesConfirmed ? 'Đã xác nhận' : 'Chưa xác nhận'}</span></div>
                        <StatusBadge tone={rt.resourcesConfirmed ? 'ok' : 'warn'} label={rt.resourcesConfirmed ? 'Đạt' : 'Chưa'} /></div>
                    </div>
                  </div>
                  {rt.status === 'PENDING_APPROVAL' && planning && (
                    <div className="mgr-actions">
                      <button type="button" className="mgr-btn mgr-btn--solid" disabled={!rt.resourcesConfirmed || t.deployment.status !== 'CONFIRMED'} onClick={() => setDialog('approve')}>Chấp thuận phương án v{rt.v}</button>
                      <button type="button" className="mgr-btn" onClick={() => setDialog('return')}>Yêu cầu làm lại</button>
                    </div>
                  )}
                  {rt.status === 'APPROVED' && <p className="mgr-hint">Tuyến v{rt.v} được duyệt lúc {fmtDateTime(rt.decidedAt)}. Xe và nhân sự phải duy trì điều kiện đạt đến lúc khởi hành.</p>}
                </>
              )}
              {t.mode === 'AIR' && (
                <div className="mgr-inner" style={{ marginTop: 12 }}>
                  <div className="mgr-between"><h4>3. Chuyến bay</h4>{t.flight && <StatusBadge kind="flight" status={t.flight.status} />}</div>
                  {t.flight ? (
                    <>
                      <div className="mgr-kv">
                        <div><span>Hãng / số hiệu</span><b>{t.flight.airline} • {t.flight.flightNo}</b></div>
                        <div><span>Ngân sách đề xuất</span><b>{fmtMoney(t.flight.budget)}</b></div>
                      </div>
                      {t.flight.status === 'BUDGET_PENDING' && planning && (
                        <div className="mgr-actions">
                          <button type="button" className="mgr-btn mgr-btn--solid mgr-btn--sm" onClick={() => setDialog('flight-ok')}>Duyệt ngân sách bay</button>
                          <button type="button" className="mgr-btn mgr-btn--sm" onClick={() => setDialog('flight-no')}>Từ chối ngân sách</button>
                        </div>
                      )}
                      {t.flight.status === 'APPROVED' && <p className="mgr-hint">Đã duyệt ngân sách – chờ Coordinator đặt chỗ.</p>}
                    </>
                  ) : <p className="mgr-hint" style={{ marginTop: 0 }}>Coordinator chưa đề xuất chuyến bay.</p>}
                </div>
              )}
            </div>
          </details>
        </div>

        <aside className="mgr-stack">
          <section className="mgr-card">
            <h3 className="mgr-card__title">Điều kiện khởi hành</h3>
            <div className="mgr-td__ready">
              {checks.map((c) => <div key={c.key} className={c.ok ? 'ok' : ''}><span>{c.label}</span><StatusBadge tone={c.ok ? 'ok' : 'warn'} label={c.ok ? 'Đạt' : 'Chưa'} /></div>)}
            </div>
            {planning && <Link className={`mgr-btn mgr-btn--block ${isReady(t) ? 'mgr-btn--solid' : ''}`} style={{ marginTop: 12 }} to={`/manager/trips/${t.id}/depart`}>Đến bước Duyệt khởi hành →</Link>}
          </section>
          {planning && t.deployment.status === 'CONFIRMED' && (
            <DemoPanel buttons={[
              { label: 'Specialist: hoàn tất hồ sơ, bảo hiểm & kiểm dịch', run: () => actions.demo.specialistPrepare(t.id), hidden: docsOk },
              { label: `Coordinator: gửi phương án tuyến${t.mode === 'AIR' ? ' & ngân sách bay' : ''}`, run: () => actions.demo.coordinatorSubmitRoute(t.id), hidden: !!rt && rt.status !== 'CHANGES_REQUESTED' },
              { label: 'Coordinator: đặt chỗ chuyến bay', run: () => actions.demo.coordinatorBookFlight(t.id), hidden: t.flight?.status !== 'APPROVED' },
            ]} hint="Giả lập thao tác của Specialist và Coordinator. Quyết định duyệt luôn thuộc về Manager." />
          )}
        </aside>
      </div>

      <Modal open={dialog === 'approve'} title={`Chấp thuận phương án tuyến v${rt?.v ?? ''}`} okText="Chấp thuận" onClose={close} onOk={() => { if (actions.approveRoute(t.id).ok) close(); }}>
        <p>Phương án gồm lộ trình, xe và nhân sự được dùng cho chuyến {t.id}. Manager không có bước duyệt nhân sự riêng.</p>
      </Modal>
      <ReasonModal open={dialog === 'return'} title="Yêu cầu Coordinator làm lại phương án" okText="Gửi yêu cầu" minLength={10}
        placeholder="VD: Trạm nghỉ Quy Nhơn không có chuồng tạm – đổi sang Tuy Hòa." onClose={close} onSubmit={(x) => actions.returnRoute(t.id, x).ok} />
      <Modal open={dialog === 'flight-ok'} title="Duyệt ngân sách chuyến bay" okText="Duyệt ngân sách" onClose={close} onOk={() => { if (actions.decideFlight(t.id, true).ok) close(); }}>
        <p>{t.flight?.airline} {t.flight?.flightNo} • <b>{t.flight ? fmtMoney(t.flight.budget) : ''}</b>. Sau khi duyệt, Coordinator tiến hành đặt chỗ.</p>
      </Modal>
      <ReasonModal open={dialog === 'flight-no'} title="Từ chối ngân sách chuyến bay" okText="Từ chối" danger minLength={10}
        placeholder="VD: Vượt dự toán trong hợp đồng – tìm hãng khác dưới 6.000 USD." onClose={close} onSubmit={(x) => actions.decideFlight(t.id, false, x).ok} />
    </>
  );
};

export default PrepareStage;
