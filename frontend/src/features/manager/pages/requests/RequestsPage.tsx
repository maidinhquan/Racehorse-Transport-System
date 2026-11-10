import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ManagerLayout, Icon } from '../../components/ManagerLayout';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { Pager, RouteCell } from '../../components/Common/Common';
import { useManager } from '../../hooks/useManager';
import { useManagerFilter } from '../../hooks/useManagerFilter';
import type { RequestStatus, TransportRequest } from '../../types';
import {
  REQUEST_STATUS_LABEL,
  curVersion,
  customerOf,
  daysUntil,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  shortLeadTime,
} from '../../hooks/managerRules';
import './RequestsPage.css';

/** Kiểm tra yêu cầu cần xử lý gấp hoặc có chú ý đặc biệt */
const isAttentionReq = (r: TransportRequest) =>
  (r.status === 'PENDING_REVIEW' && shortLeadTime(r)) ||
  r.status === 'CANCELLATION_REQUESTED' ||
  r.status === 'CONTRACT_CHANGES_REQUESTED' ||
  r.status === 'CHANGES_REQUESTED';

const GROUPS: Array<[string, string, RequestStatus[]]> = [
  ['', 'Tất cả', []],
  ['review', 'Chờ xét duyệt', ['PENDING_REVIEW', 'CHANGES_REQUESTED']],
  ['contract', 'Hợp đồng & cọc', ['CONTRACT_PREPARATION', 'CONTRACT_READY', 'CONTRACT_CHANGES_REQUESTED', 'AWAITING_DEPOSIT', 'DEPOSIT_VERIFIED']],
  ['active', 'Đang thực hiện', ['ACTIVATED', 'SCHEDULED', 'IN_TRANSIT', 'DELIVERED']],
  ['done', 'Đã kết thúc', ['CLOSED', 'CANCELLED', 'REJECTED']],
  ['attention', 'Cần chú ý gấp', []],
];

/**
 * Trang danh sách Yêu cầu vận chuyển dành cho Logistics Manager
 * Thiết kế tinh gọn, thoáng đãng, tập trung vào thông tin cốt lõi
 */
export const RequestsPage: React.FC = () => {
  const { data, requests, customers } = useManager();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const rows = [...requests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const f = useManagerFilter(
    rows,
    (r) => [r.id, r.origin, r.destination, customerOf(data, r)?.company ?? '', customerOf(data, r)?.name ?? '', ...r.horses].join(' '),
    {
      status: (r, v) => r.status === v,
      group: (r, v) => {
        if (v === 'attention') return isAttentionReq(r);
        const target = GROUPS.find((g) => g[0] === v);
        return target && target[2].length ? target[2].includes(r.status) : true;
      },
      customer: (r, v) => r.customerId === v,
      urgentOnly: (r, v) => v !== '1' || isAttentionReq(r),
    },
    10,
    {
      status: params.get('status') ?? '',
      group: params.get('group') ?? '',
      customer: params.get('customer') ?? '',
      urgentOnly: params.get('urgent') ?? '',
    },
  );

  // Thống kê đếm số lượng cho KPI cards
  const pendingReviewCount = requests.filter((r) => ['PENDING_REVIEW', 'CHANGES_REQUESTED'].includes(r.status)).length;
  const contractCount = requests.filter((r) =>
    ['CONTRACT_PREPARATION', 'CONTRACT_READY', 'CONTRACT_CHANGES_REQUESTED', 'AWAITING_DEPOSIT', 'DEPOSIT_VERIFIED'].includes(r.status)
  ).length;
  const activeCount = requests.filter((r) => ['ACTIVATED', 'SCHEDULED', 'IN_TRANSIT', 'DELIVERED'].includes(r.status)).length;
  const attentionCount = requests.filter(isAttentionReq).length;

  const hasFilterActive = Boolean(f.search || f.value('status') || f.value('customer') || f.value('group') || f.value('urgentOnly'));

  const handleResetFilters = () => {
    f.setSearch('');
    f.setValue('status', '');
    f.setValue('customer', '');
    f.setValue('group', '');
    f.setValue('urgentOnly', '');
  };

  return (
    <ManagerLayout title="Yêu cầu vận chuyển">
      <div className="mgr-requests-view">
        {/* Header */}
        <div className="mgr-head">
          <div>
            <h2 className="mgr-title">Yêu cầu vận chuyển</h2>
            <p className="mgr-subtitle">
              Tiếp nhận, xét duyệt yêu cầu từ khách hàng và quản lý phương án hợp đồng vận chuyển ngựa đua.
            </p>
          </div>
        </div>

        {/* 5 Thẻ thống kê nghiệp vụ chính (KPI Cards) */}
        <div className="mgr-req-stats" role="region" aria-label="Thống kê yêu cầu vận chuyển">
          <button
            type="button"
            className={`mgr-req-stat ${!f.value('group') && !f.value('status') && !f.value('urgentOnly') ? 'on' : ''}`}
            onClick={() => {
              f.setValue('status', '');
              f.setValue('urgentOnly', '');
              f.setValue('group', '');
            }}
          >
            <div className="mgr-req-stat__label">
              <span>Tất cả yêu cầu</span>
              <Icon name="file" />
            </div>
            <div className="mgr-req-stat__num">{requests.length}</div>
            <div className="mgr-req-stat__sub">Toàn bộ hồ sơ trong hệ thống</div>
          </button>

          <button
            type="button"
            className={`mgr-req-stat ${pendingReviewCount > 0 ? 'warn' : ''} ${f.value('group') === 'review' ? 'on' : ''}`}
            onClick={() => {
              f.setValue('status', '');
              f.setValue('urgentOnly', '');
              f.setValue('group', f.value('group') === 'review' ? '' : 'review');
            }}
          >
            <div className="mgr-req-stat__label">
              <span>Chờ xét duyệt</span>
              <Icon name="clock" />
            </div>
            <div className="mgr-req-stat__num">{pendingReviewCount}</div>
            <div className="mgr-req-stat__sub">
              {pendingReviewCount > 0 ? 'Cần Manager duyệt phương án' : 'Đã duyệt xong'}
            </div>
          </button>

          <button
            type="button"
            className={`mgr-req-stat ${f.value('group') === 'contract' ? 'on' : ''}`}
            onClick={() => {
              f.setValue('status', '');
              f.setValue('urgentOnly', '');
              f.setValue('group', f.value('group') === 'contract' ? '' : 'contract');
            }}
          >
            <div className="mgr-req-stat__label">
              <span>Hợp đồng & Cọc</span>
              <Icon name="card" />
            </div>
            <div className="mgr-req-stat__num">{contractCount}</div>
            <div className="mgr-req-stat__sub">Soạn thảo, ký kết & cọc</div>
          </button>

          <button
            type="button"
            className={`mgr-req-stat ${f.value('group') === 'active' ? 'on' : ''}`}
            onClick={() => {
              f.setValue('status', '');
              f.setValue('urgentOnly', '');
              f.setValue('group', f.value('group') === 'active' ? '' : 'active');
            }}
          >
            <div className="mgr-req-stat__label">
              <span>Đang thực hiện</span>
              <Icon name="truck" />
            </div>
            <div className="mgr-req-stat__num">{activeCount}</div>
            <div className="mgr-req-stat__sub">Đang điều phối & vận chuyển</div>
          </button>

          <button
            type="button"
            className={`mgr-req-stat ${attentionCount > 0 ? 'alert' : ''} ${f.value('group') === 'attention' ? 'on' : ''}`}
            onClick={() => {
              f.setValue('status', '');
              f.setValue('urgentOnly', '');
              f.setValue('group', f.value('group') === 'attention' ? '' : 'attention');
            }}
          >
            <div className="mgr-req-stat__label">
              <span>Cần chú ý gấp</span>
              <Icon name="alert" />
            </div>
            <div className="mgr-req-stat__num">{attentionCount}</div>
            <div className="mgr-req-stat__sub">
              {attentionCount > 0 ? 'Khởi hành < 7 ngày / Yêu cầu hủy' : 'Không có việc khẩn'}
            </div>
          </button>
        </div>



        {/* Thanh công cụ tìm kiếm và bộ lọc */}
        <div className="mgr-req-toolbar">
          <label className="mgr-req-search">
            <Icon name="search" />
            <input
              value={f.search}
              onChange={(e) => f.setSearch(e.target.value)}
              placeholder="Tìm mã yêu cầu, khách hàng, tuyến đường, ngựa…"
            />
            {f.search && (
              <button
                type="button"
                className="mgr-req-clear-btn"
                onClick={() => f.setSearch('')}
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </label>

          <select
            className="mgr-req-select"
            aria-label="Trạng thái chi tiết"
            value={f.value('status')}
            onChange={(e) => {
              f.setValue('group', '');
              f.setValue('status', e.target.value);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {(Object.keys(REQUEST_STATUS_LABEL) as RequestStatus[]).map((s) => (
              <option key={s} value={s}>
                {REQUEST_STATUS_LABEL[s]}
              </option>
            ))}
          </select>

          <select
            className="mgr-req-select"
            aria-label="Khách hàng"
            value={f.value('customer')}
            onChange={(e) => f.setValue('customer', e.target.value)}
          >
            <option value="">Tất cả khách hàng</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company || c.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={`mgr-req-urgent-toggle ${f.value('urgentOnly') === '1' ? 'on' : ''}`}
            onClick={() => {
              f.setValue('group', '');
              f.setValue('urgentOnly', f.value('urgentOnly') === '1' ? '' : '1');
            }}
            title="Lọc các yêu cầu có hạn khởi hành dưới 7 ngày hoặc có yêu cầu hủy/sửa"
          >
            <Icon name="alert" />
            <span>Đơn khẩn cấp</span>
          </button>

          {hasFilterActive && (
            <button
              type="button"
              className="mgr-req-reset-btn"
              onClick={handleResetFilters}
              title="Khôi phục về trạng thái mặc định"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>

        {/* Bảng danh sách yêu cầu vận chuyển */}
        <div className="mgr-req-table-card">
          <div className="mgr-req-table-wrap">
            <table className="mgr-req-table">
              <thead>
                <tr>
                  <th className="col-id">Mã yêu cầu</th>
                  <th className="col-customer">Khách hàng</th>
                  <th className="col-route">Lộ trình</th>
                  <th className="col-date">Ngày vận chuyển</th>
                  <th className="col-price">Giá hợp đồng</th>
                  <th className="col-status">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {f.rows.map((r) => {
                  const v = curVersion(r);
                  const cust = customerOf(data, r);
                  const urgent = shortLeadTime(r) && r.status === 'PENDING_REVIEW';
                  const daysLeft = daysUntil(r.date);

                  return (
                    <tr
                      key={r.id}
                      className={`clickable ${isAttentionReq(r) ? 'mgr-row-attn' : ''}`}
                      onClick={() => navigate(`/manager/requests/${r.id}`)}
                    >
                      {/* Mã yêu cầu & thời gian gửi */}
                      <td className="col-id">
                        <span className="col-id__code">{r.id}</span>
                        <div className="col-id__time">Gửi {fmtDateTime(r.submittedAt)}</div>
                        {urgent && (
                          <div>
                            <span className="mgr-urgent-tag">
                              Gấp • {daysLeft > 0 ? `còn ${daysLeft} ngày` : 'hôm nay'}
                            </span>
                          </div>
                        )}
                        {r.status === 'CANCELLATION_REQUESTED' && (
                          <div>
                            <span className="mgr-cancel-tag">Khách xin hủy</span>
                          </div>
                        )}
                      </td>

                      {/* Khách hàng: tinh gọn kèm email */}
                      <td className="col-customer">
                        <span
                          className="col-customer__name"
                          title={cust?.name || cust?.company || 'Khách vãng lai'}
                        >
                          {cust?.name || cust?.company || 'Khách vãng lai'}
                        </span>
                        {cust?.email && (
                          <span className="col-customer__email" title={cust.email}>
                            {cust.email}
                          </span>
                        )}
                      </td>

                      {/* Tuyến đường với tên thành phố và subtitle chi tiết */}
                      <td className="col-route">
                        <RouteCell r={r} detailed={true} />
                      </td>

                      {/* Ngày vận chuyển */}
                      <td className="col-date">
                        <div className="col-date__main">{fmtDate(r.date)}</div>
                        <div className="col-date__sub">
                          {daysLeft > 0 ? `Còn ${daysLeft} ngày` : daysLeft === 0 ? 'Khởi hành hôm nay' : 'Đã qua hạn'}
                        </div>
                      </td>

                      {/* Giá hợp đồng */}
                      <td className="col-price">
                        {v ? (
                          <span className="col-price__val">{fmtMoney(v.total)}</span>
                        ) : (
                          <span className="mgr-muted">Chưa báo giá</span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="col-status">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  );
                })}

                {!f.rows.length && (
                  <tr>
                    <td colSpan={6}>
                      <div className="mgr-req-empty">
                        <div className="mgr-req-empty__icon">
                          <Icon name="search" />
                        </div>
                        <h4 className="mgr-req-empty__title">Không tìm thấy yêu cầu phù hợp</h4>
                        <p className="mgr-req-empty__desc">
                          Không có yêu cầu vận chuyển nào khớp với điều kiện tìm kiếm hoặc bộ lọc hiện tại.
                        </p>
                        {hasFilterActive && (
                          <button
                            type="button"
                            className="mgr-btn mgr-btn--sm"
                            onClick={handleResetFilters}
                          >
                            Xóa toàn bộ bộ lọc
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Phân trang */}
        <Pager total={f.total} page={f.page} pageCount={f.pageCount} setPage={f.setPage} unit="yêu cầu" />
      </div>
    </ManagerLayout>
  );
};

export default RequestsPage;
