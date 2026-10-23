import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ManagerLayout, Icon } from '../../components/ManagerLayout';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { CustomerCell, Pager, RouteCell } from '../../components/Common/Common';
import { useManager } from '../../hooks/useManager';
import { useManagerFilter } from '../../hooks/useManagerFilter';
import type { TransportRequest } from '../../types';
import {
  ctRef,
  curVersion,
  customerOf,
  depositOf,
  depositPaid,
  fmtDateTime,
  fmtMoney,
  isAccepted,
  isSigned,
  pendingTx,
  timeLeft,
  versionState,
  type ManagerData,
} from '../../hooks/managerRules';

type Group = 'draft' | 'changes' | 'sign' | 'expired' | 'signed' | 'closed';
const GROUP_LABEL: Record<Group, string> = {
  draft: 'Cần soạn', changes: 'Khách yêu cầu sửa', sign: 'Chờ cọc & ký', expired: 'Quá hạn chung', signed: 'Đã ký – có hiệu lực', closed: 'Đã hủy / hoàn thành',
};
function groupOf(r: TransportRequest): Group {
  const v = curVersion(r);
  if (r.status === 'CONTRACT_PREPARATION') return 'draft';
  if (r.status === 'CONTRACT_CHANGES_REQUESTED') return 'changes';
  if (v && !v.signedAt && versionState(v) === 'EXPIRED' && ['CONTRACT_READY', 'DEPOSIT_VERIFIED'].includes(r.status)) return 'expired';
  if (['CONTRACT_READY', 'DEPOSIT_VERIFIED', 'CANCELLATION_REQUESTED'].includes(r.status)) return 'sign';
  if (isSigned(r) && r.status !== 'CLOSED') return 'signed';
  return 'closed';
}
function payState(d: ManagerData, r: TransportRequest) {
  const v = curVersion(r);
  if (!v) return '—';
  if (v.signedAt) return `Đã ký ${fmtDateTime(v.signedAt)}`;
  if (depositPaid(d, r)) return 'Cọc đã xác minh – chờ ký';
  const p = pendingTx(d, r);
  if (p) return p.status === 'PROCESSING' ? 'Cổng thanh toán đang xử lý' : 'Chuyển khoản chờ xác minh';
  return v.termsAcceptedAt ? 'Đã đồng ý điều khoản – chưa cọc' : 'Chưa đồng ý điều khoản';
}

/** Danh sách hợp đồng & giá của các yêu cầu đã được chấp thuận */
export const ContractsPage: React.FC = () => {
  const { data, requests } = useManager();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rows = requests.filter((r) => isAccepted(r) && (r.versions.length || r.status === 'CONTRACT_PREPARATION'))
    .sort((a, b) => (curVersion(b)?.issuedAt ?? b.submittedAt).localeCompare(curVersion(a)?.issuedAt ?? a.submittedAt));
  const f = useManagerFilter(rows, (r) => [r.id, customerOf(data, r)?.company ?? '', curVersion(r)?.number ?? ''].join(' '),
    { group: (r, v) => groupOf(r) === v }, 10, { group: params.get('group') ?? '' });

  return (
    <ManagerLayout title="Hợp đồng & giá">
      <div className="mgr-head">
        <div><h2 className="mgr-title">Hợp đồng & giá</h2><p className="mgr-subtitle">Soạn phương án, giá bán và điều khoản; phát hành, phản hồi yêu cầu sửa và theo dõi hạn chung 24 giờ.</p></div>
      </div>
      <div className="mgr-chips" style={{ marginBottom: 14 }}>
        <button type="button" className={`mgr-chip ${!f.value('group') ? 'on' : ''}`} onClick={() => f.setValue('group', '')}>Tất cả ({rows.length})</button>
        {(Object.keys(GROUP_LABEL) as Group[]).map((g) => (
          <button key={g} type="button" className={`mgr-chip ${f.value('group') === g ? 'on' : ''}`} onClick={() => f.setValue('group', g)}>
            {GROUP_LABEL[g]} ({rows.filter((r) => groupOf(r) === g).length})
          </button>
        ))}
      </div>
      <div className="mgr-toolbar">
        <label className="mgr-search"><Icon name="search" /><input value={f.search} onChange={(e) => f.setSearch(e.target.value)} placeholder="Tìm mã yêu cầu, số hợp đồng, khách hàng…" /></label>
      </div>
      <div className="mgr-card" style={{ padding: 0 }}>
        <div className="mgr-table-wrap">
          <table className="mgr-table">
            <thead><tr><th>Yêu cầu</th><th>Khách hàng</th><th>Tuyến</th><th>Phiên bản</th><th className="num">Giá • cọc</th><th>Hạn chung</th><th>Cọc & ký</th><th /></tr></thead>
            <tbody>
              {f.rows.map((r) => {
                const v = curVersion(r), g = groupOf(r);
                return (
                  <tr key={r.id} className={`clickable ${['draft', 'changes', 'expired'].includes(g) ? 'mgr-row-attn' : ''}`} onClick={() => navigate(`/manager/contracts/${r.id}`)}>
                    <td><b className="mgr-id">{r.id}</b><div><StatusBadge status={r.status} /></div></td>
                    <td><CustomerCell c={customerOf(data, r)} /></td>
                    <td><RouteCell r={r} /></td>
                    <td className="mgr-nowrap">{v ? <>{ctRef(v)}<div><StatusBadge kind="contract" status={versionState(v)} /></div></> : <span className="mgr-muted">{r.draft ? 'Có bản nháp' : 'Chưa soạn'}</span>}</td>
                    <td className="num">{v ? <>{fmtMoney(v.total)}<div className="mgr-muted">{v.depositPct}% • {fmtMoney(depositOf(r))}</div></> : '—'}</td>
                    <td className="mgr-nowrap">{v && !v.signedAt && ['ISSUED', 'EXPIRED'].includes(versionState(v))
                      ? <>{fmtDateTime(v.validUntil)}<div className={versionState(v) === 'EXPIRED' ? 'mgr-bad' : 'mgr-muted'}>{timeLeft(v.validUntil)}</div></> : '—'}</td>
                    <td className="mgr-muted">{payState(data, r)}</td>
                    <td><span className="mgr-link">{g === 'draft' ? 'Soạn' : g === 'changes' ? 'Phản hồi' : 'Mở'}</span></td>
                  </tr>
                );
              })}
              {!f.rows.length && <tr><td colSpan={8} className="mgr-empty">Không có hợp đồng nào khớp bộ lọc.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pager total={f.total} page={f.page} pageCount={f.pageCount} setPage={f.setPage} unit="hợp đồng" />
    </ManagerLayout>
  );
};

export default ContractsPage;
