import React, { useState } from 'react';
import { StatusBadge } from '../../../components/StatusBadge/StatusBadge';
import { Note } from '../../../components/Common/Common';
import { DeployModal, ReasonModal } from '../../../components/Modals';
import { useManager } from '../../../hooks/useManager';
import type { Trip } from '../../../types';
import { fmtDateTime, staffName } from '../../../hooks/managerRules';

/** Bước 1: Manager chọn đích danh Specialist + Coordinator; có thể tạm dừng / tiếp tục */
export const AssignStage: React.FC<{ trip: Trip }> = ({ trip: t }) => {
  const { data, staff, actions } = useManager();
  const [dialog, setDialog] = useState<'' | 'deploy' | 'hold'>('');
  const d = t.deployment;
  return (
    <section className="mgr-card">
      <div className="mgr-between"><h3 className="mgr-card__title">Phân công người phụ trách</h3><StatusBadge kind="deployment" status={d.status} /></div>
      <p className="mgr-hint" style={{ marginTop: 0 }}>Manager chọn một Transport Specialist và một Fleet Coordinator. Chuyến chỉ được triển khai chính thức sau khi phân công.</p>
      {d.status === 'ON_HOLD' && <Note tone="red" title="Chuyến đang tạm dừng">{d.holdReason}</Note>}
      <div className="mgr-kv" style={{ marginTop: 12 }}>
        <div><span>Transport Specialist</span><b>{staffName(data, d.specialistId)}</b></div>
        <div><span>Fleet Coordinator</span><b>{staffName(data, d.coordinatorId)}</b></div>
        <div><span>Giao việc lúc</span><b>{fmtDateTime(d.at)}</b></div>
        <div><span>Khóa phân công</span><b>{d.status === 'CONFIRMED' ? 'Đã khóa' : 'Chưa'}</b></div>
      </div>
      {t.status === 'PLANNING' && (
        <div className="mgr-actions">
          {d.status === 'NOT_CONFIRMED' && <button type="button" className="mgr-btn mgr-btn--solid" onClick={() => setDialog('deploy')}>Chọn người phụ trách & giao việc</button>}
          {d.status === 'ON_HOLD' && <button type="button" className="mgr-btn mgr-btn--solid" disabled>Tiếp tục chuẩn bị (chưa khả dụng)</button>}
          {d.status !== 'ON_HOLD' && <button type="button" className="mgr-btn" disabled title="Chức năng chưa được hỗ trợ">Tạm dừng chuyến (chưa khả dụng)</button>}
        </div>
      )}
      <p className="mgr-hint">Nhân viên nhận chuyến ngay sau khi giao việc, không cần xác nhận nhận việc.</p>
      <DeployModal open={dialog === 'deploy'} tripId={t.id} staff={staff} onClose={() => setDialog('')} onSubmit={async (sp, co) => (await actions.confirmDeployment(t.id, sp, co)).ok} />
      <ReasonModal open={dialog === 'hold'} title={`Tạm dừng ${t.id}`} okText="Tạm dừng" danger minLength={10}
        intro={<p>Specialist và Coordinator ngừng chuẩn bị cho đến khi Manager cho tiếp tục.</p>}
        placeholder="VD: Khách hàng đang xin dời lịch, chờ xác nhận ngày mới." onClose={() => setDialog('')} onSubmit={(x) => actions.holdTrip(t.id, x).ok} />
    </section>
  );
};

export default AssignStage;
