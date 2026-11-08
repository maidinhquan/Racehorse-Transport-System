import React, { useState } from 'react';
import type { SpecTrip } from '../../../types';
import { fmtDate, fmtDateTime, insuranceState } from '../../../hooks/specialistRules';
import { InsuranceModal, VerifyInsuranceModal } from '../../../components/Modals';
import { Note } from '../../../components/Common/Common';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import { Icon } from '../../../components/SpecialistLayout';
import { useSharedIncidents } from '../../../../../shared/utils/sharedIncidents';

/** Bảo hiểm vận chuyển bắt buộc: Specialist ghi nhận và xác minh (không phải Logistics Manager) */
export const InsuranceTab: React.FC<{ trip: SpecTrip }> = ({ trip: t }) => {
  const [edit, setEdit] = useState(false);
  const [verify, setVerify] = useState(false);
  const incidents = useSharedIncidents(t.id);
  const hasIncident = (t.status as string) === 'INCIDENT' || incidents.length > 0;
  const isDocsLocked = Boolean(t.docsReady) && !hasIncident;
  const st = insuranceState(t), ins = t.insurance;
  const covers = !!ins && ins.validFrom <= t.plannedDepart.slice(0, 10) && ins.validTo >= t.eta.slice(0, 10);

  return (
    <div className="spc-card">
      <h3 className="spc-card__title">Bảo hiểm vận chuyển bắt buộc
        <TripStatusBadge label={st === 'VERIFIED' ? 'Đã xác minh' : st === 'PENDING' ? 'Chờ xác minh' : 'Chưa có'} tone={st === 'VERIFIED' ? 'ok' : st === 'PENDING' ? 'warn' : 'bad'} />
      </h3>

      {isDocsLocked && (
        <div className="spc-ready-locked-alert" style={{ margin: '10px 0 14px' }}>
          <Icon name="lock" />
          <div>
            <b>Bảo hiểm vận chuyển đã khoá.</b>
            <div>Chuyến đã được xác nhận Docs READY — bảo hiểm không thể chỉnh sửa hoặc xác minh lại trừ khi có sự cố vận chuyển phát sinh.</div>
          </div>
        </div>
      )}

      {t.docsReady && hasIncident && (
        <div className="spc-incident-unlocked-alert" style={{ margin: '10px 0 14px' }}>
          <Icon name="alert" />
          <div>
            <b>Mở quyền điều chỉnh bảo hiểm theo sự cố.</b>
            <div>Chuyến đang có sự cố vận chuyển (${incidents.length} sự cố) — cho phép Specialist cập nhật lại hợp đồng bảo hiểm hoặc xác minh bổ sung bồi thường.</div>
          </div>
        </div>
      )}

      {ins ? (
        <div className="spc-kv">
          <div><span>Hãng bảo hiểm</span><b>{ins.insurer}</b></div>
          <div><span>Số hợp đồng</span><b>{ins.policy}</b></div>
          <div><span>Hiệu lực</span><b>{fmtDate(ins.validFrom)} – {fmtDate(ins.validTo)}</b></div>
          <div><span>Số tiền bảo hiểm</span><b>${ins.coverage.toLocaleString('en-US')}</b></div>
          <div><span>Xác minh bởi</span><b>{ins.checkedBy ? `${ins.checkedBy} • ${fmtDateTime(ins.checkedAt)}` : 'Chưa xác minh'}</b></div>
        </div>
      ) : <p className="spc-subtitle">Chưa có hợp đồng bảo hiểm được ghi nhận.</p>}
      {ins && !covers && <Note tone="yellow" title="Thời hạn chưa bao phủ toàn chuyến">Bảo hiểm phải có hiệu lực từ {fmtDate(t.plannedDepart.slice(0, 10))} đến {fmtDate(t.eta.slice(0, 10))}.</Note>}
      {!isDocsLocked && t.status === 'PLANNING' ? (
        <div className="spc-btn-row">
          <button type="button" className="spc-btn" onClick={() => setEdit(true)}>{ins ? 'Sửa hợp đồng bảo hiểm' : 'Ghi nhận hợp đồng bảo hiểm'}</button>
          {ins && st !== 'VERIFIED' && <button type="button" className="spc-btn spc-btn--solid" onClick={() => setVerify(true)}>Xác minh bảo hiểm</button>}
        </div>
      ) : isDocsLocked ? (
        <p className="spc-muted" style={{ marginTop: 10 }}>Hồ sơ và bảo hiểm đã khoá cố định sau khi Docs READY.</p>
      ) : <p className="spc-muted" style={{ marginTop: 10 }}>Chuyến đã qua bước chuẩn bị – bảo hiểm chỉ xem.</p>}
      <InsuranceModal open={edit} trip={t} onClose={() => setEdit(false)} />
      <VerifyInsuranceModal open={verify} trip={t} onClose={() => setVerify(false)} />
    </div>
  );
};

export default InsuranceTab;
