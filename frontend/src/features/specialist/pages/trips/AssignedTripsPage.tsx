import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SpecialistLayout, Icon } from '../../components/SpecialistLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { Pager } from '../../components/Common/Common';
import { DemoPanel } from '../../components/DemoPanel/DemoPanel';
import { useSpecialist } from '../../hooks/useSpecialist';
import { useSpecialistFilter } from '../../hooks/useSpecialistFilter';
import type { SpecTrip } from '../../types';
import { COUNTRY_VI, DEPLOYMENT_LABEL, MODE_VI, checklist, deployed, fmtDateTime, shortName, tripTotals, type SpecialistData } from '../../hooks/specialistRules';
import './AssignedTripsPage.css';

const ISSUES: Array<[string, string]> = [
  ['SUBMITTED', 'Có hồ sơ chờ duyệt'], ['MISSING', 'Thiếu giấy tờ'], ['REJECTED', 'Có giấy tờ bị từ chối / cần bổ sung'],
  ['EXPIRED', 'Có giấy tờ hết hạn'], ['REQUEST', 'Có yêu cầu bổ sung đang mở'], ['PREP', 'Cần chuẩn bị'],
];
function hasIssue(data: SpecialistData, t: SpecTrip, v: string) {
  const items = checklist(data, t).items, cds = data.customerDocs.filter((d) => d.tripId === t.id);
  switch (v) {
    case 'SUBMITTED': return items.some((i) => i.status === 'SUBMITTED') || cds.some((d) => d.status === 'SUBMITTED');
    case 'MISSING': return items.some((i) => i.counted && i.status === 'NOT_SUBMITTED') || cds.some((d) => d.status === 'MISSING');
    case 'REJECTED': return items.some((i) => i.status === 'REJECTED') || cds.some((d) => d.status === 'ACTION_REQUIRED');
    case 'EXPIRED': return items.some((i) => i.status === 'EXPIRED');
    case 'REQUEST': return data.requests.some((q) => q.tripId === t.id && q.status !== 'FULFILLED');
    case 'PREP': return deployed(t) && t.status === 'PLANNING' && !t.docsReady;
    default: return true;
  }
}

/** Danh sách chuyến được giao: bộ yêu cầu, tổng giấy tờ, trạng thái giao việc */
export const AssignedTripsPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data, trips } = useSpecialist();
  const f = useSpecialistFilter(trips, (t) => [t.id, t.requestId, t.origin, t.destination, ...t.horses.map((h) => h.name)].join(' '), {
    dep: (t, v) => t.deployment === v,
    check: (t, v) => (tripTotals(data, t).done === tripTotals(data, t).total ? 'READY' : 'NOT_READY') === v,
    issue: (t, v) => hasIssue(data, t, v),
  }, 10, { issue: params.get('issue') ?? '' });
  const issue = f.value('issue');
  const rows = f.rows;

  return (
    <SpecialistLayout title="Chuyến được giao">
      <div className="spc-head">
        <div>
          <h2 className="spc-title">Chuyến được giao</h2>
          <p className="spc-subtitle">Chọn một chuyến để xem giấy tờ khách hàng cung cấp, giấy tờ công ty phải làm và duyệt từng giấy tờ ngay trong chuyến. Muốn khách bổ sung giấy tờ nào thì bấm “Yêu cầu bổ sung” ngay tại giấy tờ đó.</p>
        </div>
      </div>
      <div className="spc-toolbar">
        <label className="spc-search"><Icon name="search" /><input value={f.search} onChange={(e) => f.setSearch(e.target.value)} placeholder="Tìm mã chuyến, mã yêu cầu, thành phố, tên ngựa…" /></label>
        <select className="spc-select" value={f.value('dep')} onChange={(e) => f.setValue('dep', e.target.value)} aria-label="Giao việc">
          <option value="">Mọi trạng thái giao việc</option>
          {Object.entries(DEPLOYMENT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select className="spc-select" value={f.value('check')} onChange={(e) => f.setValue('check', e.target.value)} aria-label="Tổng giấy tờ">
          <option value="">Mọi mức hồ sơ</option><option value="READY">Đủ giấy tờ</option><option value="NOT_READY">Chưa đủ</option>
        </select>
        <select className="spc-select" value={issue} onChange={(e) => f.setValue('issue', e.target.value)} aria-label="Vấn đề hồ sơ">
          <option value="">Mọi vấn đề hồ sơ</option>
          {ISSUES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="spc-card" style={{ padding: 0 }}>
        <div className="spc-table-wrap">
          <table className="spc-table">
            <thead><tr><th>Chuyến</th><th>Tuyến</th><th>Quốc gia</th><th>Phương thức</th><th>Khởi hành</th><th>Bộ yêu cầu</th><th>Tổng giấy tờ</th><th>Giao việc</th><th /></tr></thead>
            <tbody>
              {rows.map((t) => {
                const x = tripTotals(data, t);
                return (
                  <tr key={t.id} className="clickable" onClick={() => navigate(`/specialist/trips/${t.id}`)}>
                    <td><b>{t.id}</b><div className="spc-muted">{t.requestId}</div></td>
                    <td>{shortName(t.origin)} → {shortName(t.destination)}</td>
                    <td>{t.originCountry === t.destCountry ? COUNTRY_VI[t.originCountry] : `${COUNTRY_VI[t.originCountry]} → ${COUNTRY_VI[t.destCountry]}`}</td>
                    <td>{MODE_VI[t.mode]}</td>
                    <td>{fmtDateTime(t.plannedDepart)}</td>
                    <td>{t.reqSet ? <span className="spc-wrap">{t.reqSet.name} <span className="spc-muted">v{t.reqSet.pkgV}</span></span> : <TripStatusBadge label="Chưa áp dụng" tone="warn" />}</td>
                    <td>
                      {x.done}/{x.total} <TripStatusBadge label={x.done === x.total ? 'Đủ' : 'Chưa đủ'} tone={x.done === x.total ? 'ok' : 'warn'} />
                      <div className="spc-muted">Khách {x.cu.done}/{x.cu.total} • Công ty {x.coDone}/{x.coTotal}</div>
                    </td>
                    <td><TripStatusBadge kind="deployment" status={t.deployment} /><div style={{ marginTop: 4 }}><TripStatusBadge kind="trip" status={t.status} /></div></td>
                    <td><button type="button" className="spc-btn spc-btn--solid spc-btn--sm">Mở chuyến</button></td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={9} className="spc-empty">Không có chuyến nào khớp bộ lọc.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pager total={f.total} page={f.page} pageCount={f.pageCount} setPage={f.setPage} unit="chuyến" />
      <DemoPanel />
    </SpecialistLayout>
  );
};

export default AssignedTripsPage;
