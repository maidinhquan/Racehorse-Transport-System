import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ManagerLayout, Icon } from '../../components/ManagerLayout';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { CustomerCell, Pager } from '../../components/Common/Common';
import { useManager } from '../../hooks/useManager';
import { useManagerFilter } from '../../hooks/useManagerFilter';
import type { ComplaintStatus, IncidentStatus, Severity } from '../../types';
import {
  COMPLAINT_STATUS_LABEL,
  COMPLAINT_TYPE_LABEL,
  INCIDENT_STATUS_LABEL,
  INCIDENT_TYPE_LABEL,
  SEVERITY_LABEL,
  customerOf,
  fmtDateTime,
} from '../../hooks/managerRules';

const SEV_ORDER: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/** Sự cố (theo chuyến) và khiếu nại (theo yêu cầu) */
export const IncidentsPage: React.FC = () => {
  const { data, incidents, complaints, getRequest } = useManager();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'complaints' ? 'complaints' : 'incidents';
  const incRows = [...incidents].sort((a, b) => Number(a.status === 'CLOSED') - Number(b.status === 'CLOSED') || SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity) || b.at.localeCompare(a.at));
  const cmpRows = [...complaints].sort((a, b) => Number(a.status === 'RESOLVED') - Number(b.status === 'RESOLVED') || b.createdAt.localeCompare(a.createdAt));
  const fi = useManagerFilter(incRows, (i) => [i.id, i.tripId, i.description, i.location].join(' '), { status: (i, v) => i.status === v, severity: (i, v) => i.severity === v }, 10);
  const fc = useManagerFilter(cmpRows, (c) => [c.id, c.requestId, c.title].join(' '), { status: (c, v) => c.status === v }, 10);
  const openInc = incidents.filter((i) => i.status !== 'CLOSED').length, openCmp = complaints.filter((c) => c.status !== 'RESOLVED').length;

  return (
    <ManagerLayout title="Sự cố & khiếu nại">
      <div className="mgr-head">
        <div><h2 className="mgr-title">Sự cố & khiếu nại</h2><p className="mgr-subtitle">Quyết định phương án xử lý sự cố và trả lời khiếu nại của khách hàng. Khiếu nại tách biệt với việc hoàn thành chuyến.</p></div>
      </div>
      <div className="mgr-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'incidents'} className={tab === 'incidents' ? 'on' : ''} onClick={() => setParams({})}>Sự cố ({openInc} đang mở)</button>
        <button type="button" role="tab" aria-selected={tab === 'complaints'} className={tab === 'complaints' ? 'on' : ''} onClick={() => setParams({ tab: 'complaints' })}>Khiếu nại ({openCmp} đang mở)</button>
      </div>

      {tab === 'incidents' ? (
        <>
          <div className="mgr-toolbar">
            <label className="mgr-search"><Icon name="search" /><input value={fi.search} onChange={(e) => fi.setSearch(e.target.value)} placeholder="Tìm mã sự cố, chuyến, mô tả…" /></label>
            <select className="mgr-select" aria-label="Trạng thái" value={fi.value('status')} onChange={(e) => fi.setValue('status', e.target.value)}>
              <option value="">Mọi trạng thái</option>{(Object.keys(INCIDENT_STATUS_LABEL) as IncidentStatus[]).map((s) => <option key={s} value={s}>{INCIDENT_STATUS_LABEL[s]}</option>)}
            </select>
            <select className="mgr-select" aria-label="Mức độ" value={fi.value('severity')} onChange={(e) => fi.setValue('severity', e.target.value)}>
              <option value="">Mọi mức độ</option>{SEV_ORDER.map((s) => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="mgr-card" style={{ padding: 0 }}>
            <div className="mgr-table-wrap">
              <table className="mgr-table">
                <thead><tr><th>Sự cố</th><th>Chuyến</th><th>Loại</th><th>Địa điểm</th><th>Mức độ</th><th>Cần quyết định</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {fi.rows.map((i) => {
                    const pending = i.plans.some((p) => p.status === 'PENDING_APPROVAL');
                    return (
                      <tr key={i.id} className={`clickable ${pending ? 'mgr-row-attn' : ''}`} onClick={() => navigate(`/manager/incidents/${i.id}`)}>
                        <td><b className="mgr-id">{i.id}</b><div className="mgr-muted">{fmtDateTime(i.at)}</div></td>
                        <td>{i.tripId}</td>
                        <td>{INCIDENT_TYPE_LABEL[i.type]}</td>
                        <td>{i.location}</td>
                        <td><StatusBadge kind="severity" status={i.severity} /></td>
                        <td>{pending ? <StatusBadge tone="warn" label="Có phương án chờ" /> : '—'}</td>
                        <td><StatusBadge kind="incident" status={i.status} /></td>
                      </tr>
                    );
                  })}
                  {!fi.rows.length && <tr><td colSpan={7} className="mgr-empty">Không có sự cố nào khớp bộ lọc.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <Pager total={fi.total} page={fi.page} pageCount={fi.pageCount} setPage={fi.setPage} unit="sự cố" />
        </>
      ) : (
        <>
          <div className="mgr-toolbar">
            <label className="mgr-search"><Icon name="search" /><input value={fc.search} onChange={(e) => fc.setSearch(e.target.value)} placeholder="Tìm mã khiếu nại, yêu cầu, tiêu đề…" /></label>
            <select className="mgr-select" aria-label="Trạng thái" value={fc.value('status')} onChange={(e) => fc.setValue('status', e.target.value)}>
              <option value="">Mọi trạng thái</option>{(Object.keys(COMPLAINT_STATUS_LABEL) as ComplaintStatus[]).map((s) => <option key={s} value={s}>{COMPLAINT_STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="mgr-card" style={{ padding: 0 }}>
            <div className="mgr-table-wrap">
              <table className="mgr-table">
                <thead><tr><th>Khiếu nại</th><th>Yêu cầu</th><th>Khách hàng</th><th>Loại</th><th>Tiêu đề</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {fc.rows.map((c) => (
                    <tr key={c.id} className={`clickable ${c.status === 'NEW' ? 'mgr-row-attn' : ''}`} onClick={() => navigate(`/manager/complaints/${c.id}`)}>
                      <td><b className="mgr-id">{c.id}</b><div className="mgr-muted">{fmtDateTime(c.createdAt)}</div></td>
                      <td>{c.requestId}</td>
                      <td><CustomerCell c={customerOf(data, getRequest(c.requestId))} /></td>
                      <td>{COMPLAINT_TYPE_LABEL[c.type]}</td>
                      <td><span className="mgr-wrap" style={{ maxWidth: 320 }}>{c.title}</span></td>
                      <td><StatusBadge kind="complaint" status={c.status} /></td>
                    </tr>
                  ))}
                  {!fc.rows.length && <tr><td colSpan={6} className="mgr-empty">Không có khiếu nại nào khớp bộ lọc.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <Pager total={fc.total} page={fc.page} pageCount={fc.pageCount} setPage={fc.setPage} unit="khiếu nại" />
        </>
      )}
    </ManagerLayout>
  );
};

export default IncidentsPage;
