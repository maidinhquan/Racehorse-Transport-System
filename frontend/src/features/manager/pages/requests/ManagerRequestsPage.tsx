import React, { useState, useMemo } from 'react';
import type {
  TransportRequestItem,
  ManagerNav,
} from '../../types';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { RequestDetailModal } from '../../components/Modals/RequestDetailModal';
import './ManagerRequestsPage.css';

interface ManagerRequestsPageProps {
  requests: TransportRequestItem[];
  onAcceptRequest: (requestId: string, note?: string) => void;
  onRequestRevision: (
    requestId: string,
    reason: string,
    suggestionDate?: string
  ) => void;
  onRejectRequest: (requestId: string, reasonGroup: string, reason: string) => void;
  onNavigate: (nav: ManagerNav, targetId?: string) => void;
  initialSelectedId?: string;
}

export const ManagerRequestsPage: React.FC<ManagerRequestsPageProps> = ({
  requests,
  onAcceptRequest,
  onRequestRevision,
  onRejectRequest,
  onNavigate: _onNavigate,
  initialSelectedId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  const [selectedRequest, setSelectedRequest] = useState<TransportRequestItem | null>(() => {
    if (initialSelectedId) {
      return requests.find((r) => r.id === initialSelectedId) || null;
    }
    return null;
  });

  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        const s = req.statusLabel.toLowerCase();
        const f = statusFilter.toLowerCase();
        if (!s.includes(f) && req.status !== statusFilter) {
          return false;
        }
      }

      // Customer filter
      if (customerFilter !== 'ALL') {
        if (!req.customerName.toLowerCase().includes(customerFilter.toLowerCase())) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchId = req.id.toLowerCase().includes(term);
        const matchCustomer = req.customerName.toLowerCase().includes(term);
        const matchPerson = req.contactPerson.toLowerCase().includes(term);
        const matchRoute = req.routeDisplay.toLowerCase().includes(term);
        const matchOrigin = req.originCity?.toLowerCase().includes(term);
        const matchDest = req.destinationCity?.toLowerCase().includes(term);

        if (!matchId && !matchCustomer && !matchPerson && !matchRoute && !matchOrigin && !matchDest) {
          return false;
        }
      }

      return true;
    });
  }, [requests, statusFilter, customerFilter, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  // Demo Action handlers
  const handleDemoAction = (actionName: string) => {
    setDemoNotice(`Đã kích hoạt mô phỏng: ${actionName}`);
    setTimeout(() => setDemoNotice(null), 3000);
  };

  return (
    <div className="requests-page-container animate-fadeIn">
      {/* Header */}
      <div className="req-header-section">
        <h1 className="req-header-title">Yêu cầu vận chuyển</h1>
        <p className="req-header-sub">
          Mở Request để quản lý xét duyệt, bàn giao, khiếu nại và đóng đơn cùng một nơi.
        </p>
      </div>

      {demoNotice && (
        <div className="mb-4 p-3 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-medium animate-fadeIn">
          ✓ {demoNotice}
        </div>
      )}

      {/* ==================== ĐIỀU KHIỂN DEMO ==================== */}
      <div className="demo-control-card">
        <div className="demo-control-top">
          <h3 className="demo-control-title">Điều khiển Demo</h3>
          <span className="demo-control-badge">Thao tác mô phỏng • 1 nhóm</span>
        </div>

        <div className="demo-suggestion-label">Gợi ý bước tiếp theo</div>
        <p className="demo-suggestion-desc">
          Chọn một Request/Trip để các bước Demo bám đúng dữ liệu đang kiểm tra. Demo mô phỏng đúng role, không thay thế quyết định chính thức của Manager.
        </p>

        <div className="demo-subaction-header">
          <span className="demo-subaction-title">Yêu cầu</span>
          <span className="demo-subaction-count">3 thao tác bổ trợ</span>
        </div>

        <div className="demo-pills-group">
          <button
            type="button"
            className="demo-pill-btn"
            onClick={() => handleDemoAction('Khách hàng gửi yêu cầu mới')}
          >
            Khách hàng gửi yêu cầu
          </button>
          <button
            type="button"
            className="demo-pill-btn"
            onClick={() => handleDemoAction('Khách hàng gửi lại yêu cầu đã sửa đổi')}
          >
            Khách hàng gửi lại yêu cầu
          </button>
          <button
            type="button"
            className="demo-pill-btn"
            onClick={() => handleDemoAction('Tạo tình huống chờ xét duyệt khẩn cấp')}
          >
            Tạo tình huống chờ xét duyệt
          </button>
        </div>
      </div>

      {/* ==================== SEARCH & FILTERS BAR ==================== */}
      <div className="req-filters-row">
        <div className="req-search-box">
          <span className="req-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Tìm yêu cầu, khách hàng hoặc thành phố..."
            className="req-search-input"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="req-select-wrap">
          <select
            className="req-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="Chờ quản lý xét duyệt">Chờ quản lý xét duyệt</option>
            <option value="Đang vận chuyển">Đang vận chuyển</option>
            <option value="Đang xét duyệt hồ sơ">Đang xét duyệt hồ sơ</option>
            <option value="Hợp đồng sẵn sàng">Hợp đồng sẵn sàng</option>
            <option value="Đã giao">Đã giao</option>
            <option value="Đã đóng">Đã đóng</option>
            <option value="Đã hủy">Đã hủy</option>
          </select>
        </div>

        <div className="req-select-wrap">
          <select
            className="req-select"
            value={customerFilter}
            onChange={(e) => {
              setCustomerFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">Tất cả khách hàng</option>
            <option value="Alex Equine Stables">Alex Equine Stables</option>
            <option value="Saigon Racing Stable">Saigon Racing Stable</option>
            <option value="Royal Turf Club Bangkok">Royal Turf Club Bangkok</option>
            <option value="Mekong Equestrian">Mekong Equestrian</option>
            <option value="Hanoi Royal Stables">Hanoi Royal Stables</option>
            <option value="Phu Quoc Turf & Polo">Phu Quoc Turf & Polo</option>
            <option value="Equine Heritage Club">Equine Heritage Club</option>
          </select>
        </div>
      </div>

      {/* ==================== MAIN TABLE ==================== */}
      <div className="req-table-card">
        <div className="req-table-wrap">
          <table className="req-table">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>YÊU CẦU</th>
                <th style={{ width: '22%' }}>KHÁCH HÀNG</th>
                <th style={{ width: '18%' }}>TUYẾN ĐƯỜNG</th>
                <th style={{ width: '8%' }}>NGỰA</th>
                <th style={{ width: '12%' }}>ĐÃ YÊU CẦU</th>
                <th style={{ width: '13%' }}>NGÀY VẬN CHUYỂN</th>
                <th style={{ width: '12%' }}>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRequests.map((req) => (
                <tr
                  key={req.id}
                  className="clickable-row"
                  onClick={() => setSelectedRequest(req)}
                >
                  <td>
                    <span className="table-id-text">{req.id}</span>
                  </td>
                  <td>
                    <div className="table-cust-title">{req.customerName}</div>
                    <div className="table-cust-sub">{req.contactPerson}</div>
                  </td>
                  <td>
                    <span className="table-route-text">{req.routeDisplay}</span>
                  </td>
                  <td>
                    <span className="table-horses-count">{req.horses?.length || 1}</span>
                  </td>
                  <td>
                    <span className="table-date-text">{req.createdAt}</span>
                  </td>
                  <td>
                    <span className="table-date-text">{req.departureDate}</span>
                  </td>
                  <td>
                    <TripStatusBadge status={req.statusLabel} />
                  </td>
                </tr>
              ))}
              {paginatedRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="req-empty-cell">
                    Không tìm thấy yêu cầu vận chuyển phù hợp điều kiện lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="req-table-footer">
          <span>
            {filteredRequests.length} bản ghi • trang {currentPage}/{totalPages}
          </span>
          <div className="pagination-controls">
            <button
              type="button"
              className="page-nav-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                className={`page-nav-btn ${currentPage === num ? 'active' : ''}`}
                onClick={() => setCurrentPage(num)}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              className="page-nav-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>



      <RequestDetailModal
        request={selectedRequest}
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onAccept={(id) => {
          onAcceptRequest(id);
          setSelectedRequest(null);
        }}
        onRequestRevision={(id) => {
          onRequestRevision(id, 'Yêu cầu điều chỉnh thông tin');
          setSelectedRequest(null);
        }}
        onReject={(id) => {
          onRejectRequest(id, 'CAPACITY', 'Không đáp ứng được lịch trình');
          setSelectedRequest(null);
        }}
      />
    </div>
  );
};

export default ManagerRequestsPage;
