import React, { useState } from 'react';
import { StatusBadge } from '../../../components/StatusBadge/StatusBadge';
import { Note } from '../../../components/Common/Common';
import { DeployModal, ReasonModal } from '../../../components/Modals';
import { useManager } from '../../../hooks/useManager';
import type { Trip } from '../../../types';
import { fmtDateTime, staffName } from '../../../hooks/managerRules';
import { managerApi } from '../../../api/managerApi';
import { getDemoMode } from '../../../../../shared/context/DemoModeContext';

/** Bước 1: Manager chọn đích danh Specialist + Coordinator; có thể tạm dừng / tiếp tục */
export const AssignStage: React.FC<{ trip: Trip }> = ({ trip: t }) => {
  const { data, staff, actions } = useManager();
  const [dialog, setDialog] = useState<'' | 'deploy' | 'hold'>('');
  const d = t.deployment;
  return (
    <section className="mgr-card">
      <div className="mgr-between"><h3 className="mgr-card__title">Phân công người phụ trách</h3><StatusBadge kind="deployment" status={d.status} /></div>
      <p className="mgr-hint" style={{ marginTop: 0 }}>Phân công hai người phụ trách để triển khai hồ sơ và kế hoạch vận chuyển song song.</p>
      {d.status === 'ON_HOLD' && <Note tone="red" title="Chuyến đang tạm dừng">{d.holdReason}</Note>}
      <div className="mgr-td__roles">
        <div><span className="mgr-td__role-code">HS</span><div><h4>Phụ trách hồ sơ</h4><small>Transport Specialist</small><p>{d.specialistId ? staffName(data, d.specialistId) : 'Chưa phân công'}</p><span>Chuẩn bị giấy tờ, kiểm dịch và bảo hiểm.</span></div></div>
        <div><span className="mgr-td__role-code">ĐP</span><div><h4>Điều phối vận chuyển</h4><small>Fleet Coordinator</small><p>{d.coordinatorId ? staffName(data, d.coordinatorId) : 'Chưa phân công'}</p><span>Lập phương án tuyến, phương tiện và nhân sự.</span></div></div>
      </div>
      <div className="mgr-kv mgr-td__assignment-meta">
        <div><span>Giao việc lúc</span><b>{fmtDateTime(d.at)}</b></div>
        <div><span>Khóa phân công</span><b>{d.status === 'CONFIRMED' ? 'Đã khóa' : 'Chưa'}</b></div>
      </div>
      {['PLANNING', 'READY_TO_DEPART'].includes(t.status) && (
        <div className="mgr-actions">
          {d.status === 'NOT_CONFIRMED' && <button type="button" className="mgr-btn mgr-btn--solid" onClick={() => setDialog('deploy')}>Chọn người phụ trách & giao việc</button>}
          {d.status === 'ON_HOLD' && <button type="button" className="mgr-btn mgr-btn--solid" onClick={async () => { await actions.resumeTrip(t.id); }}>Tiếp tục chuẩn bị</button>}
          {d.status === 'CONFIRMED' && <button type="button" className="mgr-btn" onClick={() => setDialog('hold')}>Tạm dừng chuyến</button>}
        </div>
      )}
      <p className="mgr-hint">Nhân viên nhận chuyến ngay sau khi giao việc, không cần xác nhận nhận việc.</p>
      <DeployModal open={dialog === 'deploy'} tripId={t.id} staff={staff} loadStaff={getDemoMode('manager') ? undefined : managerApi.getStaff} onClose={() => setDialog('')} onSubmit={async (sp, co) => (await actions.confirmDeployment(t.id, sp, co)).ok} />
      <ReasonModal open={dialog === 'hold'} title={`Tạm dừng ${t.id}`} okText="Tạm dừng" danger minLength={10}
        intro={<p>Specialist và Coordinator ngừng chuẩn bị cho đến khi Manager cho tiếp tục.</p>}
        placeholder="VD: Khách hàng đang xin dời lịch, chờ xác nhận ngày mới." onClose={() => setDialog('')} onSubmit={async (x) => (await actions.holdTrip(t.id, x)).ok} />
    </section>
  );
};

export default AssignStage;
