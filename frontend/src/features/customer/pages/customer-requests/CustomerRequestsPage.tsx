import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { DemoGuide } from '../../components/DemoGuide/DemoGuide';
import { RouteText, horseNames } from '../../components/Common/Common';
import { needsCustomerAction, useCustomer } from '../../hooks/useCustomer';
import { useCustomerFilter, type RequestStatusFilter } from '../../hooks/useCustomerFilter';
import { ALL_STATUSES, FINAL_STATUSES, REQUEST_STATUS_LABEL, curVersion, fmtDate, isActive, versionState } from '../../hooks/customerRules';
import './CustomerRequestsPage.css';

/** Danh sách yêu cầu vận chuyển đang xử lý */
export const CustomerRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { requests, horses } = useCustomer();
  const active = useMemo(() => requests.filter(isActive), [requests]);
  const f = useCustomerFilter(active, horses, 10, needsCustomerAction, params.get('filter') === 'action' ? 'NEEDS_ACTION' : '');

  return (
    <CustomerLayout title="Yêu cầu vận chuyển">
      <div className="cus-head">
        <div>
          <h2 className="cus-title">Yêu cầu vận chuyển</h2>
          <p className="cus-subtitle">Theo dõi và xử lý các yêu cầu đang hoạt động. Yêu cầu đã đóng, đã hủy hoặc bị từ chối nằm trong Lịch sử.</p>
        </div>
        <button type="button" className="cus-btn cus-btn--solid cus-btn--lg" onClick={() => navigate('/customer/requests/new')}>
          <Icon name="plus" />Tạo yêu cầu vận chuyển
        </button>
      </div>

      <DemoGuide kind="active" />

      <div className="cus-toolbar">
        <label className="cus-search">
          <Icon name="search" />
          <input value={f.search} onChange={(e) => f.setSearch(e.target.value)} placeholder="Tìm theo mã yêu cầu, thành phố hoặc tên ngựa…" />
        </label>
        <select className="cus-select" value={f.status} onChange={(e) => f.setStatus(e.target.value as RequestStatusFilter)} aria-label="Trạng thái">
          <option value="">Tất cả trạng thái</option>
          <option value="NEEDS_ACTION">Cần bạn xử lý</option>
          {ALL_STATUSES.filter((s) => !FINAL_STATUSES.includes(s)).map((s) => <option key={s} value={s}>{REQUEST_STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      <div className="cus-card" style={{ padding: 0 }}>
        <div className="cus-table-wrap">
          <table className="cus-table">
            <thead>
              <tr><th>Mã yêu cầu</th><th>Tuyến</th><th>Ngựa</th><th>Ngày tạo</th><th>Ngày vận chuyển</th><th>Hợp đồng</th><th>Trạng thái</th><th /></tr>
            </thead>
            <tbody>
              {f.rows.map((r) => {
                const v = curVersion(r);
                return (
                  <tr key={r.id} className="clickable" onClick={() => navigate(`/customer/requests/${r.id}`)}>
                    <td className="cus-id">{r.id}{needsCustomerAction(r) && <span className="cus-req__dot" title="Cần bạn xử lý" />}</td>
                    <td><RouteText r={r} /></td>
                    <td>{horseNames(r, horses)}</td>
                    <td>{fmtDate(r.requestedAt)}</td>
                    <td>{fmtDate(r.date)}</td>
                    <td>{v ? <TripStatusBadge kind="contract" status={versionState(v)} /> : <span className="cus-muted">—</span>}</td>
                    <td><TripStatusBadge status={r.status} /></td>
                    <td><button type="button" className="cus-btn cus-btn--sm">Xem chi tiết</button></td>
                  </tr>
                );
              })}
              {!f.rows.length && <tr><td colSpan={8} className="cus-empty">Không có yêu cầu nào khớp bộ lọc.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="cus-pager">
        <span>{f.total} yêu cầu</span>
        <div>
          <button type="button" className="cus-btn cus-btn--sm" disabled={f.page <= 1} onClick={() => f.setPage(f.page - 1)}>Trước</button>
          <span>Trang {f.page}/{f.pageCount}</span>
          <button type="button" className="cus-btn cus-btn--sm" disabled={f.page >= f.pageCount} onClick={() => f.setPage(f.page + 1)}>Sau</button>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerRequestsPage;
