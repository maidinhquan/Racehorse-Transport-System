import React, { useState } from 'react';
import { TimedDocumentsCard } from '../../../../shared/components/TimedDocumentsCard/TimedDocumentsCard';
import { useNavigate, useParams } from 'react-router-dom';
import { SpecialistLayout, Icon } from '../../components/SpecialistLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { LockedCard, Note } from '../../components/Common/Common';
import { DemoPanel } from '../../components/DemoPanel/DemoPanel';
import { useSpecialist } from '../../hooks/useSpecialist';
import type { SpecTrip, TripDetailTab } from '../../types';
import { CHECKLIST_LABEL, CUSTOMER_DOC_LABEL, CUSTOMER_DOC_NAME, MODE_VI, checklist, fmtDateTime, horseName, itemName, tripTotals, type SpecialistData } from '../../hooks/specialistRules';
import { DocsReadyCard } from './sections/DocsReadyCard';
import { RequirementSetCard } from './sections/RequirementSetCard';
import { CustomerDocsTab } from './tabs/CustomerDocsTab';
import { CompanyDocsTab } from './tabs/CompanyDocsTab';
import { InsuranceTab } from './tabs/InsuranceTab';
import './TripDetailPage.css';

/** Tải danh mục hồ sơ đi đường (CSV) để in và bàn giao cho tổ xe */
function downloadManifest(data: SpecialistData, t: SpecTrip) {
  const rows: string[][] = [['Nhóm', 'Giấy tờ', 'Ngựa', 'Trạng thái', 'Tệp']];
  data.customerDocs.filter((d) => d.tripId === t.id && !d.optional).forEach((d) =>
    rows.push(['Khách hàng cung cấp', CUSTOMER_DOC_NAME[d.key], horseName(t, d.scope), CUSTOMER_DOC_LABEL[d.status], d.file ?? '']));
  checklist(data, t).items.filter((i) => i.provider === 'CBN').forEach((i) =>
    rows.push(['CBN Transport', itemName(data, t, i), horseName(t, i.horseId), CHECKLIST_LABEL[i.status], i.doc?.versions[i.doc.versions.length - 1]?.file ?? '']));
  const csv = '﻿' + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `${t.id}-danh-muc-ho-so.csv`;
  a.click();
}

/** Chi tiết chuyến: Docs READY, bộ yêu cầu hồ sơ và 3 nhóm giấy tờ (khách hàng / công ty / bảo hiểm) */
export const TripDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { tripId = '', tab = 'customer' } = useParams<{ tripId: string; tab: string }>();
  const { data, getTrip } = useSpecialist();
  const t = getTrip(tripId);
  const [canPrepare, setCanPrepare] = useState(false);

  if (!t) {
    return <SpecialistLayout title="Chuyến được giao"><Note tone="grey" title="Không tìm thấy chuyến">Chuyến {tripId} không có trong danh sách được giao.</Note></SpecialistLayout>;
  }
  const active: TripDetailTab = (['customer', 'required', 'insurance'] as const).includes(tab as TripDetailTab) ? (tab as TripDetailTab) : 'customer';
  const x = tripTotals(data, t);

  return (
    <SpecialistLayout title="Chuyến được giao">
      <button type="button" className="spc-back" onClick={() => navigate('/specialist/trips')}><Icon name="back" />Chuyến được giao</button>
      <div className="spc-head">
        <div>
          <h2 className="spc-title spc-trip__title">{t.id} <TripStatusBadge kind="trip" status={t.status} /> <TripStatusBadge kind="deployment" status={t.deployment} /></h2>
          <p className="spc-subtitle">{t.requestId} • {t.customerName} • {t.origin} → {t.destination} • {MODE_VI[t.mode]} • khởi hành {fmtDateTime(t.plannedDepart)} • dự kiến đến {fmtDateTime(t.eta)}</p>
          <p className="spc-muted" style={{ marginTop: 4 }}>Ngựa: {t.horses.map((h) => `${h.name} (${h.microchip || 'chưa có microchip'})`).join(', ')}</p>
        </div>
        <div className="spc-btn-row" style={{ margin: 0, alignItems: 'center' }}>
          <TripStatusBadge label={`Tổng giấy tờ ${x.done}/${x.total}`} tone={x.done === x.total ? 'ok' : 'warn'} />
          <button type="button" className="spc-btn spc-btn--sm" onClick={() => downloadManifest(data, t)}><Icon name="download" />Tải danh mục hồ sơ đi đường</button>
        </div>
      </div>

      {t.deployment !== 'CONFIRMED' ? (
        <div className="spc-trip__locked">
          <LockedCard title={t.deployment === 'ON_HOLD' ? 'Chuyến đang tạm dừng' : 'Chuyến chưa được Manager giao'}
            text="Khi Logistics Manager xác nhận giao việc, chuyến được gửi đến bạn; khi đó bạn chọn bộ yêu cầu hồ sơ và bắt đầu duyệt giấy tờ. Hiện chỉ xem được thông tin." />
          <DemoPanel trip={t} />
        </div>
      ) : (
        <>
          {canPrepare && <DocsReadyCard trip={t} active={active} onTab={(k) => navigate(`/specialist/trips/${t.id}/${k}`)} />}
          <RequirementSetCard trip={t} />
          <TimedDocumentsCard tripId={t.id} role="specialist" onAllowed={setCanPrepare} />
          <div className="spc-trip__body">
            <div>
              {active === 'customer' && <CustomerDocsTab trip={t} />}
              {active === 'required' && (canPrepare ? <CompanyDocsTab trip={t} /> : <Note tone="yellow" title="Chưa thể chuẩn bị hồ sơ có thời hạn">Gửi danh sách và chờ Coordinator chốt lịch khởi hành trước.</Note>)}
              {active === 'insurance' && <InsuranceTab trip={t} />}
            </div>
            <DemoPanel trip={t} />
          </div>
        </>
      )}
    </SpecialistLayout>
  );
};

export default TripDetailPage;
