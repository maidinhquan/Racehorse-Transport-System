import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ManagerLayout, Icon } from '../../components/ManagerLayout';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { CustomerCell, MiniProgress, Pager, RouteCell } from '../../components/Common/Common';
import { useManager } from '../../hooks/useManager';
import { useManagerFilter } from '../../hooks/useManagerFilter';
import type { DeploymentStatus, Trip, TripStatus } from '../../types';
import {
  DEPLOYMENT_LABEL,
  MILESTONE_LABEL,
  MODE_LABEL,
  TRIP_STATUS_LABEL,
  customerOf,
  fmtDateTime,
  isReady,
  lastMilestone,
  readinessChecks,
  reqOfTrip,
} from '../../hooks/managerRules';

/** Chuyến cần Manager quyết định: phân công, duyệt tuyến, ngân sách bay, duyệt khởi hành */
const needsDecision = (t: Trip) => t.deployment.status === 'NOT_CONFIRMED' || t.route?.status === 'PENDING_APPROVAL' || t.flight?.status === 'BUDGET_PENDING'
  || (t.status === 'PLANNING' && t.deployment.status === 'CONFIRMED' && isReady(t));

/** Danh sách chuyến đi – mỗi yêu cầu đã kích hoạt có đúng một chuyến */
export const TripsPage: React.FC = () => {
  const { data, trips } = useManager();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rows = [...trips].sort((a, b) => b.plannedDepart.localeCompare(a.plannedDepart));
  const f = useManagerFilter(rows, (t) => [t.id, t.requestId, customerOf(data, reqOfTrip(data, t))?.company ?? ''].join(' '), {
    status: (t, v) => t.status === v, deployment: (t, v) => t.deployment.status === v, attention: (t) => needsDecision(t),
  }, 10, { status: params.get('status') ?? '', attention: params.get('attention') ?? '' });
  const n = (k: DeploymentStatus) => trips.filter((t) => t.deployment.status === k).length;

  return (
    <ManagerLayout title="Chuyến đi">
      <div className="mgr-head">
        <div><h2 className="mgr-title">Chuyến đi</h2><p className="mgr-subtitle">Phân công người phụ trách, duyệt phương án tuyến và ngân sách bay, duyệt khởi hành và theo dõi hành trình.</p></div>
      </div>
      <div className="mgr-stats">
        <button type="button" className={`mgr-stat ${f.value('attention') ? 'on' : ''} ${trips.some(needsDecision) ? 'warn' : ''}`} onClick={() => f.setValue('attention', f.value('attention') ? '' : '1')}>
          <span>Cần Manager quyết định</span><b>{trips.filter(needsDecision).length}</b><small>{f.value('attention') ? 'Đang lọc – bấm để bỏ' : 'Bấm để lọc'}</small>
        </button>
        {(['NOT_CONFIRMED', 'CONFIRMED', 'ON_HOLD'] as DeploymentStatus[]).map((k) => (
          <button key={k} type="button" className={`mgr-stat ${f.value('deployment') === k ? 'on' : ''} ${k === 'NOT_CONFIRMED' && n(k) ? 'warn' : ''}`}
            onClick={() => f.setValue('deployment', f.value('deployment') === k ? '' : k)}>
            <span>{DEPLOYMENT_LABEL[k]}</span><b>{n(k)}</b><small>{f.value('deployment') === k ? 'Đang lọc – bấm để bỏ' : 'Bấm để lọc'}</small>
          </button>
        ))}
      </div>
      <div className="mgr-toolbar" style={{ marginTop: 16 }}>
        <label className="mgr-search"><Icon name="search" /><input value={f.search} onChange={(e) => f.setSearch(e.target.value)} placeholder="Tìm mã chuyến, mã yêu cầu, khách hàng…" /></label>
        <select className="mgr-select" aria-label="Trạng thái chuyến" value={f.value('status')} onChange={(e) => f.setValue('status', e.target.value)}>
          <option value="">Mọi trạng thái chuyến</option>{(Object.keys(TRIP_STATUS_LABEL) as TripStatus[]).map((s) => <option key={s} value={s}>{TRIP_STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      <div className="mgr-card" style={{ padding: 0 }}>
        <div className="mgr-table-wrap">
          <table className="mgr-table">
            <thead><tr><th>Chuyến</th><th>Khách hàng</th><th>Tuyến</th><th>Phương thức</th><th>Khởi hành / ETA</th><th>Tuyến được duyệt</th><th>Điều kiện</th><th>Phân công</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {f.rows.map((t) => {
                const r = reqOfTrip(data, t), checks = readinessChecks(t), m = lastMilestone(t);
                return (
                  <tr key={t.id} className={`clickable ${needsDecision(t) ? 'mgr-row-attn' : ''}`} onClick={() => navigate(`/manager/trips/${t.id}`)}>
                    <td><b className="mgr-id">{t.id}</b><div className="mgr-muted">{t.requestId}</div></td>
                    <td><CustomerCell c={customerOf(data, r)} /></td>
                    <td><RouteCell r={r} /></td>
                    <td>{MODE_LABEL[t.mode]}<div className="mgr-muted">{r.horses.length} ngựa</div></td>
                    <td className="mgr-nowrap">{fmtDateTime(t.plannedDepart)}<div className="mgr-muted">ETA {fmtDateTime(t.eta)}</div></td>
                    <td>{t.route ? <StatusBadge kind="route" status={t.route.status} label={`v${t.route.v} • ${t.route.status === 'APPROVED' ? 'Đã duyệt' : t.route.status === 'PENDING_APPROVAL' ? 'Chờ duyệt' : 'Làm lại'}`} /> : <StatusBadge tone="muted" label="Chưa gửi" />}</td>
                    <td>{t.status === 'PLANNING' ? <MiniProgress done={checks.filter((c) => c.ok).length} total={checks.length} /> : <span className="mgr-muted">—</span>}</td>
                    <td><StatusBadge kind="deployment" status={t.deployment.status} /></td>
                    <td><StatusBadge kind="trip" status={t.status} />{m && t.status === 'IN_TRANSIT' && <div className="mgr-muted">{MILESTONE_LABEL[m.type]}</div>}</td>
                  </tr>
                );
              })}
              {!f.rows.length && <tr><td colSpan={9} className="mgr-empty">Không có chuyến nào khớp bộ lọc.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pager total={f.total} page={f.page} pageCount={f.pageCount} setPage={f.setPage} unit="chuyến" />
    </ManagerLayout>
  );
};

export default TripsPage;
