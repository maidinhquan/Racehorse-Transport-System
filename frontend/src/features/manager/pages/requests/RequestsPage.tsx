import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ManagerLayout, Icon } from '../../components/ManagerLayout';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { CustomerCell, Pager, RouteCell } from '../../components/Common/Common';
import { useManager } from '../../hooks/useManager';
import { useManagerFilter } from '../../hooks/useManagerFilter';
import type { RequestStatus } from '../../types';
import {
  REQUEST_STATUS_LABEL,
  curVersion,
  customerOf,
  daysUntil,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  nextStep,
  shortLeadTime,
} from '../../hooks/managerRules';

const GROUPS: Array<[string, string, RequestStatus[]]> = [
  ['', 'Tất cả', []],
  ['review', 'Chờ xét duyệt', ['PENDING_REVIEW', 'CHANGES_REQUESTED']],
  ['contract', 'Hợp đồng & cọc', ['CONTRACT_PREPARATION', 'CONTRACT_READY', 'CONTRACT_CHANGES_REQUESTED', 'DEPOSIT_VERIFIED', 'CANCELLATION_REQUESTED']],
  ['active', 'Đang thực hiện', ['ACTIVATED', 'SCHEDULED', 'IN_TRANSIT', 'DELIVERED']],
  ['done', 'Đã kết thúc', ['CLOSED', 'CANCELLED', 'REJECTED']],
];

/** Danh sách yêu cầu vận chuyển của mọi khách hàng */
export const RequestsPage: React.FC = () => {
  const { data, requests, customers } = useManager();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rows = [...requests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const f = useManagerFilter(
    rows,
    (r) => [r.id, r.origin, r.destination, customerOf(data, r)?.company ?? '', customerOf(data, r)?.name ?? ''].join(' '),
    {
      status: (r, v) => r.status === v,
      group: (r, v) => GROUPS.find((g) => g[0] === v)?.[2].includes(r.status) ?? true,
      customer: (r, v) => r.customerId === v,
    },
    10,
    { status: params.get('status') ?? '', group: params.get('group') ?? '' },
  );

  return (
    <ManagerLayout title="Yêu cầu vận chuyển">
      <div className="mgr-head">
        <div><h2 className="mgr-title">Yêu cầu vận chuyển</h2><p className="mgr-subtitle">Xét duyệt yêu cầu của khách hàng và theo dõi từng đơn từ hợp đồng đến khi đóng.</p></div>
      </div>
      <div className="mgr-chips" style={{ marginBottom: 14 }}>
        {GROUPS.map(([k, label, st]) => (
          <button key={k || 'all'} type="button" className={`mgr-chip ${f.value('group') === k && !f.value('status') ? 'on' : ''}`}
            onClick={() => { f.setValue('status', ''); f.setValue('group', k); }}>
            {label} ({st.length ? requests.filter((r) => st.includes(r.status)).length : requests.length})
          </button>
        ))}
      </div>
      <div className="mgr-toolbar">
        <label className="mgr-search"><Icon name="search" /><input value={f.search} onChange={(e) => f.setSearch(e.target.value)} placeholder="Tìm mã yêu cầu, khách hàng, thành phố…" /></label>
        <select className="mgr-select" aria-label="Trạng thái" value={f.value('status')} onChange={(e) => { f.setValue('group', ''); f.setValue('status', e.target.value); }}>
          <option value="">Mọi trạng thái</option>
          {(Object.keys(REQUEST_STATUS_LABEL) as RequestStatus[]).map((s) => <option key={s} value={s}>{REQUEST_STATUS_LABEL[s]}</option>)}
        </select>
        <select className="mgr-select" aria-label="Khách hàng" value={f.value('customer')} onChange={(e) => f.setValue('customer', e.target.value)}>
          <option value="">Mọi khách hàng</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
        </select>
      </div>
      <div className="mgr-card" style={{ padding: 0 }}>
        <div className="mgr-table-wrap">
          <table className="mgr-table">
            <thead><tr><th>Yêu cầu</th><th>Khách hàng</th><th>Tuyến</th><th>Ngày vận chuyển</th><th>Ngựa</th><th className="num">Giá hợp đồng</th><th>Trạng thái</th><th>Việc tiếp theo</th></tr></thead>
            <tbody>
              {f.rows.map((r) => {
                const v = curVersion(r);
                return (
                  <tr key={r.id} className={`clickable ${['PENDING_REVIEW', 'CANCELLATION_REQUESTED', 'CONTRACT_CHANGES_REQUESTED'].includes(r.status) ? 'mgr-row-attn' : ''}`}
                    onClick={() => navigate(`/manager/requests/${r.id}`)}>
                    <td><b className="mgr-id">{r.id}</b><div className="mgr-muted">Gửi {fmtDateTime(r.submittedAt)}</div></td>
                    <td><CustomerCell c={customerOf(data, r)} /></td>
                    <td><RouteCell r={r} /></td>
                    <td className="mgr-nowrap">{fmtDate(r.date)}
                      {r.status === 'PENDING_REVIEW' && shortLeadTime(r) && <div><StatusBadge tone="warn" label={`Gấp • ${Math.max(0, daysUntil(r.date))} ngày`} /></div>}
                    </td>
                    <td>{r.horses.length}</td>
                    <td className="num">{v ? fmtMoney(v.total) : '—'}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="mgr-muted">{nextStep(data, r)}</td>
                  </tr>
                );
              })}
              {!f.rows.length && <tr><td colSpan={8} className="mgr-empty">Không có yêu cầu nào khớp bộ lọc.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pager total={f.total} page={f.page} pageCount={f.pageCount} setPage={f.setPage} unit="yêu cầu" />
    </ManagerLayout>
  );
};

export default RequestsPage;
