import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { DemoGuide } from '../../components/DemoGuide/DemoGuide';
import { RouteText, horseNames } from '../../components/Common/Common';
import { useCustomer } from '../../hooks/useCustomer';
import { useCustomerFilter, type RequestStatusFilter } from '../../hooks/useCustomerFilter';
import './CustomerHistoryPage.css';
import { FINAL_STATUSES, REQUEST_STATUS_LABEL, contractTotal, curVersion, fmtDate, fmtDateTime, fmtMoney, isActive, versionState } from '../../hooks/customerRules';

/** Lịch sử: yêu cầu đã đóng, đã hủy hoặc bị từ chối (chỉ xem) */
export const CustomerHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { requests, horses } = useCustomer();
  const past = useMemo(() => requests.filter((r) => !isActive(r)).sort((a, b) => (b.closedAt ?? b.date).localeCompare(a.closedAt ?? a.date)), [requests]);
  const f = useCustomerFilter(past, horses, 10);

  return (
    <CustomerLayout title="Lịch sử">
      <div className="cus-head">
        <div>
          <h2 className="cus-title">Lịch sử vận chuyển</h2>
          <p className="cus-subtitle">
            Yêu cầu đã đóng, đã hủy và bị từ chối (chỉ xem). Yêu cầu đã giao chuyển vào đây khi số dư được xác minh, hết 24 giờ phản hồi và không còn khiếu nại.
          </p>
        </div>
      </div>
      <DemoGuide kind="history" />
      <div className="cus-toolbar">
        <label className="cus-search">
          <Icon name="search" />
          <input value={f.search} onChange={(e) => f.setSearch(e.target.value)} placeholder="Tìm mã yêu cầu, thành phố, tên ngựa…" />
        </label>
        <select className="cus-select" value={f.status} onChange={(e) => f.setStatus(e.target.value as RequestStatusFilter)} aria-label="Trạng thái">
          <option value="">Tất cả trạng thái</option>
          {FINAL_STATUSES.map((s) => <option key={s} value={s}>{REQUEST_STATUS_LABEL[s]}</option>)}
        </select>
        <select className="cus-select" value={f.year} onChange={(e) => f.setYear(e.target.value)} aria-label="Năm">
          <option value="">Tất cả các năm</option>
          {f.years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="cus-card" style={{ padding: 0 }}>
        <div className="cus-table-wrap">
          <table className="cus-table">
            <thead><tr><th>Mã yêu cầu</th><th>Tuyến</th><th>Ngựa</th><th>Ngày vận chuyển</th><th>Hợp đồng</th><th className="num">Giá trị</th><th>Kết thúc</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {f.rows.map((r) => {
                const v = curVersion(r);
                return (
                  <tr key={r.id} className="clickable" onClick={() => navigate(`/customer/requests/${r.id}`)}>
                    <td className="cus-id">{r.id}</td>
                    <td><RouteText r={r} /></td>
                    <td>{horseNames(r, horses)}</td>
                    <td>{fmtDate(r.date)}</td>
                    <td>{v ? <TripStatusBadge kind="contract" status={versionState(v)} /> : <span className="cus-muted">—</span>}</td>
                    <td className="num">{v ? fmtMoney(contractTotal(r)) : '—'}</td>
                    <td className="cus-history__closed">{r.closedAt ? fmtDateTime(r.closedAt) : <span className="cus-muted">{r.reason ?? '—'}</span>}</td>
                    <td><TripStatusBadge status={r.status} /></td>
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

export default CustomerHistoryPage;
