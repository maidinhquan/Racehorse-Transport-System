import React from 'react';
import type { SpecialistTrip, SpecialistDoc, DocRequest, SpecialistNav } from './specialist.types';
import { Icon } from './specialist.types';

interface RenderDashboardPageProps {
  trips: SpecialistTrip[];
  docs: SpecialistDoc[];
  requests: DocRequest[];
  lang: 'vi' | 'en';
  onNavigate: (nav: SpecialistNav) => void;
  onSelectTrip: (tripId: string) => void;
  onSelectDoc: (docId: string) => void;
  onOpenDocReviewModal: (docId: string) => void;
}

export const RenderDashboardPage: React.FC<RenderDashboardPageProps> = ({
  trips,
  docs,
  requests,
  lang,
  onNavigate,
  onSelectTrip,
  onSelectDoc: _onSelectDoc,
  onOpenDocReviewModal
}) => {
  // Metric counts
  const awaitingReviewDocs = docs.filter((d) => d.status === 'SUBMITTED');
  const rejectedDocs = docs.filter((d) => d.status === 'REJECTED');
  const expiredDocs = docs.filter((d) => d.status === 'EXPIRED');
  const openRequests = requests.filter((r) => r.status === 'OPEN');
  const submittedRequests = requests.filter((r) => r.status === 'SUBMITTED');
  const prepTrips = trips.filter((t) => t.status === 'PLANNING' && t.checklist.status !== 'READY');

  return (
    <div className="render-dashboard-page fade-in">
      {/* HEADER SECTION */}
      <div className="page-head">
        <div>
          <h2 className="page-title">
            {lang === 'vi' ? 'Xin chào, Thu Hà' : 'Hello, Thu Ha'}
          </h2>
          <p className="subtitle">
            {lang === 'vi'
              ? 'Thẩm định hồ sơ pháp lý, chứng từ kiểm dịch & thủ tục thông quan cho các chuyến vận chuyển.'
              : 'Regulatory requirements, quarantine certifications and legal documents for every deployed trip.'}
          </p>
        </div>
      </div>

      {/* 6 TOP STATS CARDS */}
      <div className="stats-grid six">
        <button
          type="button"
          className={`stat-card ${awaitingReviewDocs.length ? 'warn' : ''}`}
          onClick={() => onNavigate('queue')}
        >
          <div className="stat-label">
            <Icon name="doc" />
            <span>{lang === 'vi' ? 'Chờ thẩm định' : 'Awaiting Review'}</span>
          </div>
          <div className="stat-value">{awaitingReviewDocs.length}</div>
          <div className="stat-sub">
            {awaitingReviewDocs.length
              ? (lang === 'vi' ? `${awaitingReviewDocs.length} chứng từ cần duyệt` : `${awaitingReviewDocs.length} documents to check`)
              : (lang === 'vi' ? 'Không có hồ sơ chờ' : 'Nothing to review')}
          </div>
        </button>

        <button
          type="button"
          className={`stat-card ${prepTrips.length ? 'bad' : ''}`}
          onClick={() => onNavigate('trips')}
        >
          <div className="stat-label">
            <Icon name="file" />
            <span>{lang === 'vi' ? 'Hồ sơ còn thiếu' : 'Missing Docs'}</span>
          </div>
          <div className="stat-value">{prepTrips.length}</div>
          <div className="stat-sub">
            {lang === 'vi' ? `Trên ${prepTrips.length} chuyến đang chuẩn bị` : `On ${prepTrips.length} active trips`}
          </div>
        </button>

        <button
          type="button"
          className={`stat-card ${rejectedDocs.length ? 'bad' : ''}`}
          onClick={() => onNavigate('queue')}
        >
          <div className="stat-label">
            <Icon name="alert" />
            <span>{lang === 'vi' ? 'Cần bổ sung mới' : 'Needs Replacement'}</span>
          </div>
          <div className="stat-value">{rejectedDocs.length}</div>
          <div className="stat-sub">
            {lang === 'vi' ? 'Đang chờ khách nộp lại' : 'Waiting for new version'}
          </div>
        </button>

        <button
          type="button"
          className={`stat-card ${expiredDocs.length ? 'bad' : ''}`}
          onClick={() => onNavigate('queue')}
        >
          <div className="stat-label">
            <Icon name="clock" />
            <span>{lang === 'vi' ? 'Sắp hết / Hết hạn' : 'Expiring / Expired'}</span>
          </div>
          <div className="stat-value">{expiredDocs.length}</div>
          <div className="stat-sub">
            {lang === 'vi' ? 'Cần gia hạn trước ngày đi' : 'Must renew before depart'}
          </div>
        </button>

        <button
          type="button"
          className={`stat-card ${submittedRequests.length ? 'blue' : ''}`}
          onClick={() => onNavigate('requests')}
        >
          <div className="stat-label">
            <Icon name="upload" />
            <span>{lang === 'vi' ? 'Khách đã nộp bổ sung' : 'Customer Answered'}</span>
          </div>
          <div className="stat-value">{submittedRequests.length}</div>
          <div className="stat-sub">
            {submittedRequests.length
              ? (lang === 'vi' ? `${submittedRequests.length} bản v2 chờ duyệt lại (${openRequests.length} chờ khách)` : `${submittedRequests.length} v2 uploads (${openRequests.length} open)`)
              : (lang === 'vi' ? `${openRequests.length} đang chờ khách gửi` : `${openRequests.length} waiting for customer`)}
          </div>
        </button>

        <button
          type="button"
          className="stat-card"
          onClick={() => onNavigate('packages')}
        >
          <div className="stat-label">
            <Icon name="book" />
            <span>{lang === 'vi' ? 'Gói hồ sơ đi đường' : 'Doc Packages'}</span>
          </div>
          <div className="stat-value">3</div>
          <div className="stat-sub">
            {lang === 'vi' ? '1 đã bàn giao cho tổ xe' : '1 handed over to crew'}
          </div>
        </button>
      </div>

      {/* 2-COLUMN MAIN CONTENT (Matching Image 2 layout) */}
      <div className="grid-main-two-col">
        {/* LEFT COLUMN: 3 TABLES */}
        <div className="main-tables-stack">
          {/* Table 1: Trip Readiness */}
          <div className="card table-card">
            <div className="card-header-between">
              <div>
                <h3 className="card-heading">
                  {lang === 'vi' ? 'Tiến độ sẵn sàng hồ sơ các chuyến' : 'Trip Readiness & Checklist'}
                </h3>
                <span className="card-sub-count">
                  {trips.length} {lang === 'vi' ? 'chuyến đang phụ trách' : 'assigned trips'}
                </span>
              </div>
              <button
                type="button"
                className="link-btn"
                onClick={() => onNavigate('trips')}
              >
                {lang === 'vi' ? 'Xem tất cả' : 'View all'}
              </button>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>{lang === 'vi' ? 'CHUYẾN ĐI' : 'TRIP'}</th>
                    <th>{lang === 'vi' ? 'KHÁCH HÀNG & TUYẾN ĐƯỜNG' : 'CUSTOMER & ROUTE'}</th>
                    <th>{lang === 'vi' ? 'KHỞI HÀNH' : 'DEPARTS'}</th>
                    <th>{lang === 'vi' ? 'CHECKLIST PHÁP LÝ' : 'CHECKLIST'}</th>
                    <th>{lang === 'vi' ? 'TRIỂN KHAI' : 'DEPLOYMENT'}</th>
                    <th style={{ textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((t) => {
                    const isOk = t.checklist.status === 'READY';
                    const pct = Math.round((t.checklist.ready / t.checklist.total) * 100);
                    return (
                      <tr key={t.id} onClick={() => onSelectTrip(t.id)} className="clickable-row">
                        <td>
                          <b className="primary-id-text">{t.id}</b>
                          <div className="cell-sub-muted">{t.requestId}</div>
                        </td>
                        <td>
                          <div className="fw-600">{t.customerName}</div>
                          <div className="cell-sub-muted">
                            {t.origin} → {t.destination}
                            {t.transit && t.transit.length > 0 && ` (Quá cảnh ${t.transit.join(', ')})`}
                          </div>
                        </td>
                        <td>
                          <div className="fw-600">{t.plannedDepart.slice(0, 10)}</div>
                          <div className="cell-sub-muted">{t.plannedDepart.slice(11)}</div>
                        </td>
                        <td>
                          <div className="progress-cell">
                            <div className={`progress-bar-wrap ${isOk ? 'is-ready' : ''}`}>
                              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="progress-text">
                              {t.checklist.ready}/{t.checklist.total}
                            </span>
                            <span className={`pill-badge ${isOk ? 'pill-green' : 'pill-amber'}`}>
                              {isOk ? (lang === 'vi' ? 'Đạt chuẩn' : 'Ready') : (lang === 'vi' ? 'Chưa đủ' : 'Incomplete')}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`pill-badge ${
                              t.deploymentStatus === 'CONFIRMED'
                                ? 'pill-blue'
                                : t.deploymentStatus === 'ON_HOLD'
                                ? 'pill-red'
                                : 'pill-gray'
                            }`}
                          >
                            {t.deploymentStatus === 'CONFIRMED'
                              ? (lang === 'vi' ? 'Đã duyệt chạy' : 'Confirmed')
                              : (lang === 'vi' ? 'Chờ kích hoạt' : 'Draft')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn-sm btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTrip(t.id);
                            }}
                          >
                            {lang === 'vi' ? 'Chi tiết' : 'Review'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="card-footer-records">
              {trips.length} {lang === 'vi' ? 'bản ghi' : 'records'}
            </div>
          </div>

          {/* Table 2: Awaiting Review Documents (Review Queue urgency) */}
          <div className="card table-card">
            <div className="card-header-between">
              <div>
                <h3 className="card-heading">
                  {lang === 'vi' ? 'Hồ sơ chờ thẩm định & Duyệt lại' : 'Documents Awaiting Review'}
                </h3>
                <span className="card-sub-count">
                  {awaitingReviewDocs.length} {lang === 'vi' ? 'chứng từ cần thẩm định ngay' : 'pending inspection'}
                </span>
              </div>
              <button
                type="button"
                className="link-btn"
                onClick={() => onNavigate('queue')}
              >
                {lang === 'vi' ? 'Xem tất cả' : 'View all'}
              </button>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>{lang === 'vi' ? 'CHỨNG TỪ & ĐỐI TƯỢNG' : 'DOCUMENT & SUBJECT'}</th>
                    <th>{lang === 'vi' ? 'MÃ CHUYẾN' : 'TRIP'}</th>
                    <th>{lang === 'vi' ? 'NGUỒN CUNG CẤP' : 'PROVIDER'}</th>
                    <th>{lang === 'vi' ? 'PHIÊN BẢN' : 'VERSION'}</th>
                    <th>{lang === 'vi' ? 'THỜI ĐIỂM GỬI' : 'SUBMITTED'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'THAO TÁC' : 'ACTION'}</th>
                  </tr>
                </thead>
                <tbody>
                  {awaitingReviewDocs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                        {lang === 'vi' ? '✅ Không có hồ sơ nào đang tồn đọng chờ thẩm định!' : 'No documents pending review.'}
                      </td>
                    </tr>
                  ) : (
                    awaitingReviewDocs.map((doc) => {
                      const latest = doc.versions[doc.versions.length - 1];
                      const isV2 = doc.versions.length > 1;
                      return (
                        <tr key={doc.id} onClick={() => onOpenDocReviewModal(doc.id)} className="clickable-row">
                          <td>
                            <div className="fw-600 doc-title-row">
                              {doc.typeName}
                              {isV2 && (
                                <span className="pill-badge pill-purple" title="Khách hàng vừa nộp lại bản mới sau khi bị từ chối">
                                  {lang === 'vi' ? 'Bổ sung v2' : 'v2 Re-upload'}
                                </span>
                              )}
                            </div>
                            <div className="cell-sub-muted">
                              {doc.horseName ? `Ngựa: ${doc.horseName}` : 'Hồ sơ chung chuyến'} • {doc.id}
                            </div>
                          </td>
                          <td>
                            <b className="primary-id-text">{doc.tripId}</b>
                          </td>
                          <td>
                            <span className={`pill-badge ${doc.provider === 'CUSTOMER' ? 'pill-gray' : 'pill-blue'}`}>
                              {doc.provider === 'CUSTOMER' ? 'Khách hàng' : 'CBN nội bộ'}
                            </span>
                          </td>
                          <td>
                            <span className="badge-version">v{doc.versions.length}</span>
                          </td>
                          <td>
                            <div>{latest ? latest.at.slice(0, 10) : '—'}</div>
                            <div className="cell-sub-muted">{latest ? latest.at.slice(11) : ''}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn-sm btn-solid-orange"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenDocReviewModal(doc.id);
                              }}
                            >
                              {lang === 'vi' ? 'Thẩm định' : 'Inspect'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="card-footer-records">
              {awaitingReviewDocs.length} {lang === 'vi' ? 'bản ghi' : 'records'}
            </div>
          </div>

          {/* Table 3: Active Document Requests sent to customer */}
          <div className="card table-card">
            <div className="card-header-between">
              <div>
                <h3 className="card-heading">
                  {lang === 'vi' ? 'Yêu cầu bổ sung hồ sơ đã gửi khách' : 'Active Supplement Requests'}
                </h3>
                <span className="card-sub-count">
                  {requests.length} {lang === 'vi' ? 'yêu cầu bổ sung' : 'requests'}
                </span>
              </div>
              <button
                type="button"
                className="link-btn"
                onClick={() => onNavigate('requests')}
              >
                {lang === 'vi' ? 'Xem tất cả' : 'View all'}
              </button>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>{lang === 'vi' ? 'MÃ YÊU CẦU' : 'REQUEST ID'}</th>
                    <th>{lang === 'vi' ? 'CHỨNG TỪ & CHUYẾN' : 'DOCUMENT & TRIP'}</th>
                    <th>{lang === 'vi' ? 'LÝ DO YÊU CẦU BỔ SUNG' : 'REASON'}</th>
                    <th>{lang === 'vi' ? 'HẠN CHÓT' : 'DUE DATE'}</th>
                    <th>{lang === 'vi' ? 'TRẠNG THÁI' : 'STATUS'}</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((rq) => {
                    const isSubmitted = rq.status === 'SUBMITTED';
                    const isFulfilled = rq.status === 'FULFILLED';
                    return (
                      <tr key={rq.id} onClick={() => onNavigate('requests')} className="clickable-row">
                        <td>
                          <b className="primary-id-text">{rq.id}</b>
                          <div className="cell-sub-muted">{rq.createdAt.slice(0, 10)}</div>
                        </td>
                        <td>
                          <div className="fw-600">{rq.typeName}</div>
                          <div className="cell-sub-muted">
                            {rq.tripId} {rq.horseName && `• ${rq.horseName}`}
                          </div>
                        </td>
                        <td>
                          <div className="truncate-text" title={rq.reason}>
                            {rq.reason}
                          </div>
                        </td>
                        <td>
                          <div className="fw-600">{rq.dueAt}</div>
                        </td>
                        <td>
                          <span
                            className={`pill-badge ${
                              isFulfilled
                                ? 'pill-green'
                                : isSubmitted
                                ? 'pill-purple'
                                : 'pill-amber'
                            }`}
                          >
                            {isFulfilled
                              ? (lang === 'vi' ? 'Đã hoàn tất' : 'Fulfilled')
                              : isSubmitted
                              ? (lang === 'vi' ? 'Khách đã nộp lại' : 'Submitted v2')
                              : (lang === 'vi' ? 'Chờ khách nộp' : 'Pending Customer')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="card-footer-records">
              {requests.length} {lang === 'vi' ? 'bản ghi' : 'records'}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CẢNH BÁO / ALERTS PANEL (Identical layout to Image 2) */}
        <aside className="alerts-side-panel">
          <div className="card pad alerts-card">
            <div className="alerts-header">
              <h3 className="alerts-title">
                {lang === 'vi' ? 'Cảnh báo & Việc cần làm' : 'Alerts & Action Items'}
              </h3>
              <span className="alerts-badge-pill">6</span>
            </div>

            <div className="alerts-list">
              {/* Alert 1 */}
              <div className="alert-item" onClick={() => onSelectTrip('TRP-902')}>
                <div className="alert-dot red-dot" />
                <div className="alert-content">
                  <div className="alert-item-title">
                    TRP-902: Khách đã nộp bổ sung Giấy kiểm dịch v2
                  </div>
                  <div className="alert-item-desc">
                    Khách hàng Trần Minh Khoa đã tải lên bản scan có mộc đỏ chính quyền cho ngựa Shadowfax. Chờ chuyên viên duyệt lại.
                  </div>
                  <div className="alert-item-meta">Chuyến bay ngày 18/10 • Cần duyệt sớm</div>
                </div>
              </div>

              {/* Alert 2 */}
              <div className="alert-item" onClick={() => onSelectTrip('TRP-902')}>
                <div className="alert-dot red-dot" />
                <div className="alert-content">
                  <div className="alert-item-title">
                    Sổ tiêm vắc xin Shadowfax đã hết hạn
                  </div>
                  <div className="alert-item-desc">
                    Hết hạn ngày 20/09/2026. Đã mở yêu cầu bổ sung DR-41 gửi khách hàng tiêm phòng nhắc lại.
                  </div>
                  <div className="alert-item-meta">Hạn bổ sung: 12/10/2026</div>
                </div>
              </div>

              {/* Alert 3 */}
              <div className="alert-item" onClick={() => onSelectTrip('TRP-904')}>
                <div className="alert-dot orange-dot" />
                <div className="alert-content">
                  <div className="alert-item-title">
                    TRP-904 khởi hành sau 3 ngày (Bangkok → Singapore)
                  </div>
                  <div className="alert-item-desc">
                    Checklist mới đạt 3/6 hồ sơ. Cần kiểm tra gấp Hộ chiếu FEI và Giấy kiểm dịch DLD của Lanna Spirit.
                  </div>
                  <div className="alert-item-meta">Khởi hành 20/10/2026 • 05:00</div>
                </div>
              </div>

              {/* Alert 4 */}
              <div className="alert-item" onClick={() => onNavigate('checkpoints')}>
                <div className="alert-dot orange-dot" />
                <div className="alert-content">
                  <div className="alert-item-title">
                    Đặt chỗ trạm kiểm dịch Sembawang chưa có số booking
                  </div>
                  <div className="alert-item-desc">
                    Chuyến TRP-904: Đã gửi hồ sơ đặt chỗ trực tuyến qua cổng AVS Singapore, cần theo dõi cập nhật xác nhận.
                  </div>
                  <div className="alert-item-meta">Trạm cách ly SAQS Singapore</div>
                </div>
              </div>

              {/* Alert 5 */}
              <div className="alert-item" onClick={() => onSelectTrip('TRP-901')}>
                <div className="alert-dot green-dot" />
                <div className="alert-content">
                  <div className="alert-item-title">
                    TRP-901 thông quan xuất cảnh Mộc Bài thành công
                  </div>
                  <div className="alert-item-desc">
                    Xe VH-12 và ngựa Thunderbolt đã qua cổng hải quan Tây Ninh lúc 10:35. Tiếp tục di chuyển đến Cửa khẩu Bavet.
                  </div>
                  <div className="alert-item-meta">Hôm nay, 10:35 • Hồ sơ hợp lệ</div>
                </div>
              </div>

              {/* Alert 6 */}
              <div className="alert-item" onClick={() => onNavigate('packages')}>
                <div className="alert-dot blue-dot" />
                <div className="alert-content">
                  <div className="alert-item-title">
                    Gói hồ sơ nội địa PKG-903 đã sẵn sàng
                  </div>
                  <div className="alert-item-desc">
                    Chuyến Đà Nẵng → TP. Hồ Chí Minh đã tập hợp đủ 4 chứng từ gốc. Sẵn sàng bàn giao cho tài xế Nguyễn Văn Hùng.
                  </div>
                  <div className="alert-item-meta">Chuyến TRP-903 • Xuất bến 09/10</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
