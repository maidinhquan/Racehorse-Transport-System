import React, { useState, useMemo } from 'react';
import { download } from '../../../../flow1/relational/api';
import { flow1Error } from '../../../../flow1/api';
import type {
  TransportRequestItem,
  ManagerNav,
} from './manager.types';

interface RenderRequestsPageProps {
  requests: TransportRequestItem[];
  onAcceptRequest: (requestId: string, note?: string) => Promise<void>;
  onRequestRevision: (
    requestId: string,
    reason: string,
    suggestionDate?: string
  ) => Promise<void>;
  onRejectRequest: (requestId: string, reasonGroup: string, reason: string) => Promise<void>;
  onNavigate: (nav: ManagerNav, targetId?: string) => void;
  initialSelectedId?: string;
}

export const RenderRequestsPage: React.FC<RenderRequestsPageProps> = ({
  requests,
  onAcceptRequest,
  onRequestRevision,
  onRejectRequest,
  onNavigate,
  initialSelectedId,
}) => {
  const [documentError,setDocumentError]=useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState<string>('ALL');
  const [routeFilter, setRouteFilter] = useState<string>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<TransportRequestItem | null>(
    () => {
      if (initialSelectedId) {
        return requests.find((r) => r.id === initialSelectedId) || null;
      }
      return null;
    }
  );

  // Decision Modal mode
  const [decisionMode, setDecisionMode] = useState<
    'NONE' | 'ACCEPT' | 'REVISION' | 'REJECT'
  >('NONE');
  const [acceptNote, setAcceptNote] = useState('');
  const [revisionReason, setRevisionReason] = useState(
    'Thời gian chuẩn bị vận chuyển quá gấp, đề nghị dời ngày khởi hành.'
  );
  const [revisionDate, setRevisionDate] = useState('');
  const [rejectReasonGroup, setRejectReasonGroup] = useState('DEADLINE_NOT_FEASIBLE');
  const [rejectReason, setRejectReason] = useState(
    'Không thể bố trí khoang chuyên dụng đáp ứng kịp lịch khởi hành yêu cầu.'
  );

  // Counts
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const changesCount = requests.filter((r) => r.status === 'CHANGES_REQUESTED').length;
  const acceptedCount = requests.filter((r) => r.status === 'ACCEPTED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Status filter
      if (statusTab !== 'ALL' && req.status !== statusTab) {
        return false;
      }
      // Route filter
      if (routeFilter === 'VN-VN' && (req.originCountry !== 'VN' || req.destinationCountry !== 'VN')) {
        return false;
      }
      if (routeFilter === 'VN-JP' && (req.originCountry !== 'VN' || req.destinationCountry !== 'JP')) {
        return false;
      }
      // Search keyword
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchId = req.id.toLowerCase().includes(term);
        const matchCustomer = req.customerName.toLowerCase().includes(term);
        const matchPerson = req.contactPerson.toLowerCase().includes(term);
        const matchRoute = req.routeDisplay.toLowerCase().includes(term);
        if (!matchId && !matchCustomer && !matchPerson && !matchRoute) {
          return false;
        }
      }
      return true;
    });
  }, [requests, statusTab, routeFilter, searchTerm]);

  const handleOpenReview = (req: TransportRequestItem) => {
    setSelectedRequest(req);
    setDecisionMode('NONE');
  };

  const handleCloseReview = () => {
    setSelectedRequest(null);
    setDecisionMode('NONE');
  };

  const handleConfirmAccept = async () => {
    if (!selectedRequest) return;
    try{await onAcceptRequest(selectedRequest.id, acceptNote);handleCloseReview();}catch{/* Error is displayed by the portal. */}
  };

  const handleConfirmRevision = async () => {
    if (!selectedRequest) return;
    try{await onRequestRevision(selectedRequest.id, revisionReason, revisionDate);handleCloseReview();}catch{/* Portal error. */}
  };

  const handleConfirmReject = async () => {
    if (!selectedRequest) return;
    try{await onRejectRequest(selectedRequest.id, rejectReasonGroup, rejectReason);handleCloseReview();}catch{/* Portal error. */}
  };

  return (
    <div className="requests-page fade-in">
      {/* Page Header */}
      <div className="module-header">
        <div>
          <h1 className="module-title">Yêu cầu Vận chuyển</h1>
          <p className="module-subtitle">
            Xét duyệt tính khả thi, thẩm định hồ sơ từng cá thể ngựa và ra quyết định phê duyệt (Flow 1: UC-LM-01)
          </p>
        </div>
        <div className="header-stat-badges">
          <div className="stat-pill-item">
            <span className="stat-pill-label">Chờ duyệt:</span>
            <span className="stat-pill-val text-amber-600">{pendingCount}</span>
          </div>
          <div className="stat-pill-item">
            <span className="stat-pill-label">Đã duyệt:</span>
            <span className="stat-pill-val text-blue-600">{acceptedCount}</span>
          </div>
          <div className="stat-pill-item">
            <span className="stat-pill-label">Cần sửa:</span>
            <span className="stat-pill-val text-purple-600">{changesCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="table-controls-card">
        <div className="status-tabs-row">
          <button
            type="button"
            className={`tab-btn ${statusTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusTab('ALL')}
          >
            Tất cả ({requests.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${statusTab === 'PENDING' ? 'active' : ''}`}
            onClick={() => setStatusTab('PENDING')}
          >
            Chờ xét duyệt ({pendingCount})
          </button>
          <button
            type="button"
            className={`tab-btn ${statusTab === 'CHANGES_REQUESTED' ? 'active' : ''}`}
            onClick={() => setStatusTab('CHANGES_REQUESTED')}
          >
            Yêu cầu điều chỉnh ({changesCount})
          </button>
          <button
            type="button"
            className={`tab-btn ${statusTab === 'ACCEPTED' ? 'active' : ''}`}
            onClick={() => setStatusTab('ACCEPTED')}
          >
            Đã chấp nhận ({acceptedCount})
          </button>
          <button
            type="button"
            className={`tab-btn ${statusTab === 'REJECTED' ? 'active' : ''}`}
            onClick={() => setStatusTab('REJECTED')}
          >
            Đã từ chối ({rejectedCount})
          </button>
        </div>

        <div className="filter-inputs-row">
          <div className="search-input-wrap">
            <svg
              className="search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã yêu cầu, khách hàng, tuyến đường..."
              className="text-input search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="select-wrap">
            <select
              className="select-input"
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
            >
              <option value="ALL">Mọi tuyến đường</option>
              <option value="VN-VN">Nội địa (VN → VN)</option>
              <option value="VN-JP">Quốc tế (VN → JP)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="dash-card">
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th style={{ width: '13%' }}>MÃ YÊU CẦU</th>
                <th style={{ width: '22%' }}>KHÁCH HÀNG</th>
                <th style={{ width: '16%' }}>TUYẾN ĐƯỜNG</th>
                <th style={{ width: '12%' }}>SỐ LƯỢNG NGỰA</th>
                <th style={{ width: '15%' }}>KHỞI HÀNH</th>
                <th style={{ width: '12%' }}>TRẠNG THÁI</th>
                <th style={{ width: '10%', textAlign: 'right' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hoverable-row">
                  <td className="font-semibold text-primary-dark">{req.id}</td>
                  <td>
                    <div className="customer-cell-main">{req.customerName}</div>
                    <div className="customer-cell-sub">
                      {req.contactPerson} • {req.phone}
                    </div>
                  </td>
                  <td>
                    <div className="route-cell">{req.routeDisplay}</div>
                    <span className="text-xs text-muted">
                      {req.transportMode === 'AIR' ? '✈️ Đường hàng không' : '🚛 Đường bộ'}
                    </span>
                  </td>
                  <td>
                    <div className="font-medium text-slate-800">
                      {req.horses.length} cá thể
                    </div>
                    <div className="text-xs text-muted">
                      {req.horses.map((h) => h.name).join(', ')}
                    </div>
                  </td>
                  <td>
                    <div className="date-cell-main">{req.departureDate}</div>
                    <div className="date-cell-sub">{req.daysRemainingText}</div>
                  </td>
                  <td>
                    {req.status === 'PENDING' && (
                      <span className="badge-status-yellow">Chờ xét duyệt</span>
                    )}
                    {req.status === 'CHANGES_REQUESTED' && (
                      <span className="badge-status-purple">Yêu cầu điều chỉnh</span>
                    )}
                    {req.status === 'ACCEPTED' && (
                      <span className="badge-status-blue">Đã chấp nhận</span>
                    )}
                    {req.status === 'AWAITING_DEPOSIT' && (
                      <span className="badge-status-orange">Chờ đặt cọc</span>
                    )}
                    {req.status === 'REJECTED' && (
                      <span className="badge-status-red">Đã từ chối</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn-action-view"
                      onClick={() => handleOpenReview(req)}
                    >
                      Xem & Duyệt
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    Không tìm thấy yêu cầu vận chuyển phù hợp điều kiện lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="dash-card-footer">
          <span>Hiển thị {filteredRequests.length} trên tổng {requests.length} yêu cầu</span>
        </div>
      </div>

      {/* Review Modal / Drawer */}
      {selectedRequest && (
        <div className="modal-backdrop fade-in" onClick={handleCloseReview}>
          <div
            className="modal-box modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <div className="flex-row-center gap-2">
                  <h2 className="modal-title">Chi tiết Yêu cầu: {selectedRequest.id}</h2>
                  {selectedRequest.status === 'PENDING' && (
                    <span className="badge-status-yellow">Chờ xét duyệt</span>
                  )}
                  {selectedRequest.status === 'ACCEPTED' && (
                    <span className="badge-status-blue">Đã chấp nhận</span>
                  )}
                  {selectedRequest.status === 'CHANGES_REQUESTED' && (
                    <span className="badge-status-purple">Yêu cầu điều chỉnh</span>
                  )}
                  {selectedRequest.status === 'REJECTED' && (
                    <span className="badge-status-red">Đã từ chối</span>
                  )}
                </div>
                <p className="modal-sub">
                  Ngày gửi: {selectedRequest.createdAt} • Khách hàng: {selectedRequest.customerName}
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseReview}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {/* Route & Contact Section */}
              <div className="detail-section-grid">
                <div className="detail-card">
                  <h3 className="section-label">Thông tin Tuyến đường & Thời gian</h3>
                  <div className="info-kv-row">
                    <span className="kv-label">Tuyến đường:</span>
                    <span className="kv-val font-semibold">{selectedRequest.routeDisplay}</span>
                  </div>
                  <div className="info-kv-row">
                    <span className="kv-label">Hình thức:</span>
                    <span className="kv-val">
                      {selectedRequest.transportMode === 'AIR' ? '✈️ Hàng không chuyên dụng (Air Cargo)' : '🚛 Xe chuyên dùng đệm khí (Road)'}
                    </span>
                  </div>
                  <div className="info-kv-row">
                    <span className="kv-label">Ngày khởi hành dự kiến:</span>
                    <span className="kv-val font-semibold text-primary">
                      {selectedRequest.departureDate} ({selectedRequest.daysRemainingText})
                    </span>
                  </div>
                  <div className="info-kv-row">
                    <span className="kv-label">Hạn bàn giao (Deadline):</span>
                    <span className="kv-val">{selectedRequest.deliveryDeadline}</span>
                  </div>
                </div>

                <div className="detail-card">
                  <h3 className="section-label">Thông tin Liên hệ & Giao nhận</h3>
                  <div className="info-kv-row">
                    <span className="kv-label">Khách hàng:</span>
                    <span className="kv-val font-semibold">{selectedRequest.customerName}</span>
                  </div>
                  <div className="info-kv-row">
                    <span className="kv-label">Đại diện liên hệ:</span>
                    <span className="kv-val">{selectedRequest.contactPerson}</span>
                  </div>
                  <div className="info-kv-row">
                    <span className="kv-label">Số điện thoại:</span>
                    <span className="kv-val">{selectedRequest.phone}</span>
                  </div>
                  <div className="info-kv-row">
                    <span className="kv-label">Email:</span>
                    <span className="kv-val">{selectedRequest.email}</span>
                  </div>
                </div>
              </div>

              {documentError&&<p role="alert">{documentError}</p>}
              {/* Special requirements */}
              {selectedRequest.specialRequirements && (
                <div className="special-req-box">
                  <span className="font-semibold text-amber-800">📌 Ghi chú & Yêu cầu riêng của khách: </span>
                  <span className="text-slate-700">{selectedRequest.specialRequirements}</span>
                </div>
              )}

              {/* Horses & Checklist Section */}
              <div className="detail-section">
                <h3 className="section-label">
                  Danh sách Ngựa ({selectedRequest.horses.length} cá thể) & Thẩm định Hồ sơ PER_HORSE
                </h3>
                <div className="horses-table-wrap">
                  <table className="sub-table">
                    <thead>
                      <tr>
                        <th>TÊN NGỰA</th>
                        <th>GIỐNG / TUỔI</th>
                        <th>MÃ MICROCHIP</th>
                        <th>HỘ CHIẾU</th>
                        <th>KIỂM DỊCH</th>
                        <th>XÉT NGHIỆM MÁU</th>
                        <th>SỞ HỮU</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRequest.horses.map((horse) => (
                        <tr key={horse.id}>
                          <td className="font-semibold">{horse.name}<div className="flow1-action-row">{["photo","passport"].map(kind=><button className="text-link-action" type="button" key={kind} onClick={()=>download(`/manager/requests/${selectedRequest.id}/horses/${horse.id}/files/${kind}`,kind).catch(e=>setDocumentError(flow1Error(e)))}>{kind==="photo"?"Xem ảnh":"Xem scan"}</button>)}</div></td>
                          <td>
                            {horse.breed} • {horse.age ?? "—"} tuổi
                          </td>
                          <td className="font-mono text-xs">{horse.microchipId}</td>
                          <td>
                            {horse.documents.passport ? (
                              <span className="doc-check-ok">✓ Đã nộp</span>
                            ) : (
                              <span className="doc-check-missing">— Chưa có dữ liệu</span>
                            )}
                          </td>
                          <td>
                            {horse.documents.quarantineCert ? (
                              <span className="doc-check-ok">✓ Đã nộp</span>
                            ) : (
                              <span className="doc-check-missing">— Chưa có dữ liệu</span>
                            )}
                          </td>
                          <td>
                            {horse.documents.bloodTest ? (
                              <span className="doc-check-ok">✓ Đã nộp</span>
                            ) : (
                              <span className="doc-check-missing">— Chưa có dữ liệu</span>
                            )}
                          </td>
                          <td>
                            {horse.documents.ownershipCert ? (
                              <span className="doc-check-ok">✓ Đã nộp</span>
                            ) : (
                              <span className="doc-check-missing">— Chưa có dữ liệu</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DECISION PANELS */}
              {selectedRequest.status === 'PENDING' && (
                <div className="decision-wrapper">
                  <h3 className="section-label">Quyết định Phê duyệt của Quản lý Vận hành</h3>

                  {decisionMode === 'NONE' && (
                    <div className="action-buttons-group">
                      <button
                        type="button"
                        className="btn-decision btn-accept"
                        disabled={!['PENDING','ACCEPTED'].includes(selectedRequest.status)} onClick={() => setDecisionMode('ACCEPT')}
                      >
                        ✓ Chấp nhận (Accept)
                      </button>
                      <button
                        type="button"
                        className="btn-decision btn-revision"
                        disabled={!['PENDING','ACCEPTED'].includes(selectedRequest.status)} onClick={() => setDecisionMode('REVISION')}
                      >
                        ✎ Yêu cầu điều chỉnh (Request Changes)
                      </button>
                      <button
                        type="button"
                        className="btn-decision btn-reject"
                        disabled={!['PENDING','ACCEPTED','CHANGES_REQUESTED'].includes(selectedRequest.status)} onClick={() => setDecisionMode('REJECT')}
                      >
                        ✕ Từ chối đơn (Reject)
                      </button>
                    </div>
                  )}

                  {/* Accept Subform */}
                  {decisionMode === 'ACCEPT' && (
                    <div className="decision-subform border-green">
                      <h4 className="subform-title text-green-700">
                        Xác nhận Chấp thuận yêu cầu vận chuyển {selectedRequest.id}
                      </h4>
                      <p className="text-sm text-slate-600 mb-3">
                        Sau khi chấp nhận, yêu cầu sẽ chuyển sang trạng thái <strong>ACCEPTED</strong> để tiến hành lập Hợp đồng nháp & phát hành báo giá chính thức.
                      </p>
                      <label className="form-label">Ghi chú phê duyệt (Không bắt buộc):</label>
                      <input
                        type="text"
                        className="text-input mb-3"
                        placeholder="VD: Tuyến khả thi, điều động chuồng bay chuẩn bị soạn thảo hợp đồng"
                        value={acceptNote}
                        onChange={(e) => setAcceptNote(e.target.value)}
                      />
                      <div className="subform-actions">
                        <button
                          type="button"
                          className="btn-primary btn-green"
                          onClick={handleConfirmAccept}
                        >
                          Xác nhận Chấp thuận
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setDecisionMode('NONE')}
                        >
                          Quay lại
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Revision Subform */}
                  {decisionMode === 'REVISION' && (
                    <div className="decision-subform border-purple">
                      <h4 className="subform-title text-purple-700">
                        Yêu cầu khách hàng điều chỉnh thông tin (Flow 1: F01-M04)
                      </h4>
                      <div className="form-group mb-3">
                        <label className="form-label">Lý do yêu cầu điều chỉnh (Bắt buộc):</label>
                        <textarea
                          rows={2}
                          className="textarea-input"
                          value={revisionReason}
                          onChange={(e) => setRevisionReason(e.target.value)}
                        />
                      </div>
                      <div className="form-group mb-3">
                        <label className="form-label">Đề xuất ngày khởi hành mới khả thi:</label>
                        <input
                          type="date"
                          className="text-input"
                          value={revisionDate}
                          onChange={(e) => setRevisionDate(e.target.value)}
                        />
                      </div>
                      <div className="subform-actions">
                        <button
                          type="button"
                          className="btn-primary btn-purple"
                          onClick={handleConfirmRevision}
                        >
                          Gửi yêu cầu điều chỉnh
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setDecisionMode('NONE')}
                        >
                          Quay lại
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reject Subform */}
                  {decisionMode === 'REJECT' && (
                    <div className="decision-subform border-red">
                      <h4 className="subform-title text-red-700">
                        Từ chối yêu cầu vận chuyển (Flow 1: F01-M03)
                      </h4>
                      <div className="form-group mb-3">
                        <label className="form-label">Nhóm lý do từ chối:</label>
                        <select
                          className="select-input"
                          value={rejectReasonGroup}
                          onChange={(e) => setRejectReasonGroup(e.target.value)}
                        >
                          <option value="DEADLINE_NOT_FEASIBLE">DEADLINE_NOT_FEASIBLE (Không kịp thời gian chuẩn bị)</option>
                          <option value="INSUFFICIENT_CAPACITY">INSUFFICIENT_CAPACITY (Hết slot chuồng bay / xe tải)</option>
                          <option value="ROUTE_NOT_FEASIBLE">ROUTE_NOT_FEASIBLE (Tuyến đường không khả thi)</option>
                          <option value="OTHER">OTHER (Lý do khác)</option>
                        </select>
                      </div>
                      <div className="form-group mb-3">
                        <label className="form-label">Chi tiết lý do từ chối gửi khách hàng:</label>
                        <textarea
                          rows={2}
                          className="textarea-input"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                      </div>
                      <div className="subform-actions">
                        <button
                          type="button"
                          className="btn-primary btn-red"
                          onClick={handleConfirmReject}
                        >
                          Xác nhận Từ chối
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setDecisionMode('NONE')}
                        >
                          Quay lại
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Already Accepted banner */}
              {selectedRequest.status === 'ACCEPTED' && (
                <div className="accepted-banner">
                  <div className="flex-row-center justify-between">
                    <div>
                      <span className="font-semibold text-blue-900">
                        ✓ Yêu cầu này đã được chấp thuận và đang chờ soạn hợp đồng.
                      </span>
                      <p className="text-xs text-blue-700 mt-1">
                        Chuyển sang màn hình "Hợp đồng & chi phí" để thiết lập giá, định mức cọc và phát hành hợp đồng.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        handleCloseReview();
                        onNavigate('contracts', selectedRequest.id);
                      }}
                    >
                      Soạn hợp đồng ngay →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCloseReview}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
