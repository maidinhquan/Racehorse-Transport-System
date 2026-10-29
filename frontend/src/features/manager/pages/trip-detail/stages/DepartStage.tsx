import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../components/ManagerLayout';
import { StatusBadge } from '../../../components/StatusBadge/StatusBadge';
import { Note } from '../../../components/Common/Common';
import { Modal } from '../../../components/Modals';
import { DemoPanel } from '../../../components/DemoPanel/DemoPanel';
import { useManager } from '../../../hooks/useManager';
import type { Trip } from '../../../types';
import { fmtDateTime, readinessChecks } from '../../../hooks/managerRules';

const TARGET: Record<string, string> = { deploy: 'assign', docs: 'prepare', insurance: 'prepare', quarantine: 'prepare', route: 'prepare', resources: 'prepare', flight: 'prepare' };

/** Bước 3: Manager duyệt khởi hành khi mọi điều kiện đạt; tài xế tự xác nhận xuất phát thực tế */
export const DepartStage: React.FC<{ trip: Trip }> = ({ trip: t }) => {
  const { actions } = useManager();
  const [confirm, setConfirm] = useState(false);
  const checks = readinessChecks(t), missing = checks.filter((c) => !c.ok);
  return (
    <div className="mgr-grid-main">
      <section className="mgr-card">
        <div className="mgr-between"><h3 className="mgr-card__title">Duyệt khởi hành</h3>
          <StatusBadge tone={t.status !== 'PLANNING' ? 'ok' : missing.length ? 'warn' : 'info'} label={t.status !== 'PLANNING' ? 'Đã duyệt' : missing.length ? `${missing.length} điều kiện chưa đạt` : 'Đủ điều kiện'} /></div>
        <p className="mgr-hint" style={{ marginTop: 0 }}>Manager phê duyệt khi mọi điều kiện đạt. Tài xế tự xác nhận lúc thực tế xuất phát; Manager không cần duyệt thêm.</p>
        <div className="mgr-td__ready">
          {checks.map((c) => (
            <div key={c.key} className={c.ok ? 'ok' : ''}>
              <Icon name={c.ok ? 'check' : 'alert'} /><span>{c.label}</span>
              {!c.ok && <Link className="mgr-link" to={`/manager/trips/${t.id}/${TARGET[c.key]}`}>Xem</Link>}
            </div>
          ))}
        </div>
        {t.status === 'PLANNING' ? (
          <div className="mgr-actions">
            <button type="button" className="mgr-btn mgr-btn--solid" disabled={!!missing.length} title={missing.length ? 'Chưa hoàn thành các điều kiện chuẩn bị' : ''} onClick={() => setConfirm(true)}>Duyệt khởi hành</button>
          </div>
        ) : <Note tone="green" title={`Đã duyệt khởi hành • ${fmtDateTime(t.departureApprovedAt)}`}>{t.status === 'READY_TO_DEPART' ? 'Chờ tài xế xác nhận xuất phát thực tế.' : 'Chuyến đã xuất phát.'}</Note>}
      </section>
      <aside className="mgr-stack">
        <DemoPanel buttons={[{ label: 'Tài xế xác nhận khởi hành', run: () => actions.demo.driverDepart(t.id), primary: true, hidden: t.status !== 'READY_TO_DEPART' }]}
          hint="Giả lập tài xế xác nhận xuất phát; chuyến chuyển sang Đang vận chuyển." />
        {['IN_TRANSIT', 'COMPLETED'].includes(t.status) && <Link className="mgr-btn mgr-btn--solid" to={`/manager/trips/${t.id}/progress`}>Xem tiến độ hành trình →</Link>}
      </aside>
      <Modal open={confirm} title={`Duyệt khởi hành ${t.id}`} okText="Duyệt khởi hành" onClose={() => setConfirm(false)} onOk={() => { if (actions.approveDeparture(t.id).ok) setConfirm(false); }}>
        <p>Mọi điều kiện đã đạt. Chuyến chuyển sang <b>Sẵn sàng khởi hành</b> (khởi hành dự kiến {fmtDateTime(t.plannedDepart)}) và yêu cầu của khách chuyển sang Sẵn sàng khởi hành.</p>
      </Modal>
    </div>
  );
};

export default DepartStage;
