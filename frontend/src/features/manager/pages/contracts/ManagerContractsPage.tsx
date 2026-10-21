import React, { useState, useMemo } from 'react';
import type {
  ContractItem,
  TransportRequestItem,
  ManagerNav,
} from '../../types';
import './ManagerContractsPage.css';

interface ManagerContractsPageProps {
  contracts: ContractItem[];
  requests: TransportRequestItem[];
  onSaveContract?: (contract: ContractItem) => void;
  onSendContract?: (contractId: string, completionDeadline: string) => void;
  onNavigate?: (nav: ManagerNav, targetId?: string) => void;
  initialSelectedRequestId?: string;
}

export const ManagerContractsPage: React.FC<ManagerContractsPageProps> = ({
  contracts: initialContracts,
  requests: _requests,
  onSaveContract: _onSaveContract,
  onSendContract: _onSendContract,
  onNavigate: _onNavigate,
  initialSelectedRequestId: _initialSelectedRequestId,
}) => {
  // Local contracts state to allow real-time interactive demo simulation
  const [contractsList, setContractsList] = useState<ContractItem[]>(initialContracts);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination state (7 items per page to match 17 items -> 3 pages)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  // Selected contract for modal viewing
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null);

  // Demo Workflow Step State (starts at 2: Customer nộp tiền cọc)
  // Step 1: Phát hành hợp đồng (completed)
  // Step 2: Customer nộp tiền cọc (active)
  // Step 3: Xác minh tiền cọc
  // Step 4: Customer ký OTP -> tạo Trip
  // Step 5: Completed
  const [demoStep, setDemoStep] = useState<number>(2);

  // Handle Filter & Search logic
  const filteredContracts = useMemo(() => {
    return contractsList.filter((contract) => {
      // Search matches
      const query = searchTerm.toLowerCase().trim();
      const matchSearch =
        !query ||
        contract.id.toLowerCase().includes(query) ||
        contract.requestId.toLowerCase().includes(query) ||
        contract.customerName.toLowerCase().includes(query) ||
        (contract.contactPerson && contract.contactPerson.toLowerCase().includes(query));

      // Status dropdown matches
      let matchStatus = true;
      if (statusFilter === 'EFFECTIVE') {
        matchStatus = contract.status === 'EFFECTIVE' || contract.statusLabel.includes('Đã ký');
      } else if (statusFilter === 'PENDING') {
        matchStatus = contract.status === 'PENDING_SIGNATURE' || contract.statusLabel.includes('awaiting');
      } else if (statusFilter === 'REVISION') {
        matchStatus = contract.status === 'SIGN_DECLINED' || contract.statusLabel.includes('chỉnh sửa');
      } else if (statusFilter === 'EXPIRED') {
        matchStatus = contract.status === 'EXPIRED' || contract.statusLabel.includes('Hết hạn');
      }

      return matchSearch && matchStatus;
    });
  }, [contractsList, searchTerm, statusFilter]);

  // Pagination calculation
  const totalItems = filteredContracts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContracts.slice(start, start + pageSize);
  }, [filteredContracts, currentPage, pageSize]);

  // Demo Step Interactions
  const handleStep2Click = () => {
    if (demoStep === 2) {
      setDemoStep(3);
    }
  };

  const handleStep3Click = () => {
    if (demoStep === 3) {
      setDemoStep(4);
    }
  };

  const handleStep4Click = () => {
    if (demoStep === 4) {
      setDemoStep(5);
      // Dynamically activate CT-8928 v2 to 'Đã ký & có hiệu lực'
      setContractsList((prev) =>
        prev.map((c) =>
          c.id === 'CT-8928 v2'
            ? {
                ...c,
                status: 'EFFECTIVE',
                statusLabel: 'Đã ký & có hiệu lực',
                depositStatusLabel: 'Đã xác minh',
                depositDeadline: '—',
                depositDeadlineRemaining: undefined,
              }
            : c
        )
      );
    }
  };

  const handleResetDemo = () => {
    setDemoStep(2);
    setContractsList(initialContracts);
  };

  // Helper for Status Badge styling
  const renderStatusBadge = (contract: ContractItem) => {
    const label = contract.statusLabel;
    if (contract.status === 'EFFECTIVE' || label.includes('Đã ký & có hiệu lực')) {
      return <span className="badge-status-pill effective">{label}</span>;
    }
    if (contract.status === 'PENDING_SIGNATURE' || label.includes('awaiting deposit & OTP')) {
      return <span className="badge-status-pill awaiting">{label}</span>;
    }
    if (contract.status === 'SIGN_DECLINED' || label.includes('chỉnh sửa')) {
      return <span className="badge-status-pill revision">{label}</span>;
    }
    if (contract.status === 'EXPIRED' || label.includes('Hết hạn')) {
      return <span className="badge-status-pill expired">{label}</span>;
    }
    return <span className="badge-status-pill draft">{label}</span>;
  };

  // Helper for right-hand column (deposit / verification)
  const renderDepositStatus = (contract: ContractItem) => {
    const label = contract.depositStatusLabel;
    if (!label || label === '—') {
      return <span className="text-[#6b7280]">—</span>;
    }
    if (label === 'Đã xác minh') {
      return <span className="deposit-verified-text">Đã xác minh</span>;
    }
    if (label.includes('Đang xử lý') || label.includes('Cọc')) {
      return <span className="badge-status-pill processing">{label}</span>;
    }
    if (label.includes('Quá hạn')) {
      return <span className="badge-status-pill expired">{label}</span>;
    }
    return <span className="text-[#9ca3af] text-xs">{label}</span>;
  };

  return (
    <div className="contracts-page-container">
      {/* Module Header */}
      <div className="contracts-header-section">
        <h1 className="contracts-header-title">Hợp đồng & chi phí</h1>
        <p className="contracts-header-sub">
          Draft contracts with official pricing, change requests and payments. One automatic 24-hour deadline covers deposit submission, verification and OTP signing. The Manager can extend this common deadline; no separate deposit deadline is entered. Order: terms accepted → deposit verified → OTP signature → activation.
        </p>
      </div>

      {/* Search & Filters Row */}
      <div className="contracts-filters-row">
        <div className="contracts-search-box">
          <span className="contracts-search-icon">🔍</span>
          <input
            type="text"
            className="contracts-search-input"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <select
          className="contracts-status-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="ALL">Tất cả trạng thái hợp đồng</option>
          <option value="EFFECTIVE">Đã ký & có hiệu lực</option>
          <option value="PENDING">Phát hành – awaiting deposit & OTP</option>
          <option value="REVISION">Yêu cầu chỉnh sửa</option>
          <option value="EXPIRED">Hết hạn</option>
        </select>
      </div>

      {/* Contracts Table Card */}
      <div className="contracts-table-card">
        <div className="table-responsive">
          <table className="contracts-table">
            <thead>
              <tr>
                <th>HỢP ĐỒNG</th>
                <th>YÊU CẦU</th>
                <th>KHÁCH HÀNG</th>
                <th>GIÁ</th>
                <th>SHARED DEPOSIT / OTP DEADLINE</th>
                <th>TÌNH TRẠNG</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedContracts.map((contract) => (
                <tr
                  key={contract.id}
                  className="contracts-table-row"
                  onClick={() => setSelectedContract(contract)}
                >
                  {/* 1. Hợp đồng */}
                  <td>
                    <span className="contract-code-text">{contract.id}</span>
                  </td>

                  {/* 2. Yêu cầu */}
                  <td>
                    <span className="contract-request-code">{contract.requestId}</span>
                  </td>

                  {/* 3. Khách hàng */}
                  <td>
                    <div>
                      <div className="customer-name-text">{contract.customerName}</div>
                      <div className="contact-person-text">
                        {contract.contactPerson || 'Alex Equine'}
                      </div>
                    </div>
                  </td>

                  {/* 4. Giá */}
                  <td>
                    <span className="contract-price-text">
                      ${contract.price?.toLocaleString()}
                    </span>
                  </td>

                  {/* 5. Shared Deposit / OTP Deadline */}
                  <td>
                    {contract.depositDeadline && contract.depositDeadline !== '—' ? (
                      <div>
                        <div className="deadline-time-text">{contract.depositDeadline}</div>
                        <div
                          className={`deadline-subtext ${
                            contract.depositDeadlineRemaining === 'Hết hạn' ? 'expired' : ''
                          }`}
                        >
                          {contract.depositDeadlineRemaining}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[#6b7280]">—</span>
                    )}
                  </td>

                  {/* 6. Tình trạng */}
                  <td>{renderStatusBadge(contract)}</td>

                  {/* 7. Deposit Status Label */}
                  <td>{renderDepositStatus(contract)}</td>
                </tr>
              ))}

              {paginatedContracts.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#9ca3af' }}>
                    Không tìm thấy hợp đồng nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="contracts-table-footer">
          <div className="contracts-footer-info">
            {totalItems} bản ghi • trang {currentPage}/{totalPages}
          </div>

          <div className="contracts-pagination-group">
            <button
              type="button"
              className="contracts-page-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              &lt;
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                className={`contracts-page-btn ${currentPage === num ? 'active' : ''}`}
                onClick={() => setCurrentPage(num)}
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              className="contracts-page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* ==================== ĐIỀU KHIỂN DEMO CARD ==================== */}
      <div className="demo-workflow-card">
        <div className="demo-workflow-header">
          <span className="demo-workflow-title">Điều khiển Demo</span>
          <span className="demo-workflow-tag">Thao tác mô phỏng • 1 nhóm</span>
        </div>

        <div className="demo-workflow-subrow">
          <span className="demo-workflow-subtitle">
            Thứ tự Demo: Hợp đồng → Cọc → Xác minh → OTP
          </span>
          <span className="demo-workflow-reqid">TRN-8928</span>
        </div>

        <p className="demo-workflow-desc">
          Mỗi nút chỉ sáng khi bước trước đã hoàn thành. Thanh toán được xác minh KHÔNG tự tạo Trip; ký OTP mới kích hoạt đơn.
        </p>

        {/* 4 Interactive Workflow Buttons */}
        <div className="demo-workflow-steps">
          {/* Step 1 */}
          <button
            type="button"
            className="demo-step-btn completed"
            title="Đã phát hành hợp đồng cho TRN-8928"
          >
            ✓ 1. Phát hành hợp đồng
          </button>

          {/* Step 2 */}
          <button
            type="button"
            className={`demo-step-btn ${
              demoStep === 2 ? 'active' : demoStep > 2 ? 'completed' : 'disabled'
            }`}
            onClick={handleStep2Click}
            disabled={demoStep !== 2}
          >
            {demoStep > 2 && '✓ '}2. Customer nộp tiền cọc
          </button>

          {/* Step 3 */}
          <button
            type="button"
            className={`demo-step-btn ${
              demoStep === 3 ? 'active' : demoStep > 3 ? 'completed' : 'disabled'
            }`}
            onClick={handleStep3Click}
            disabled={demoStep !== 3}
          >
            {demoStep > 3 && '✓ '}3. Xác minh tiền cọc
          </button>

          {/* Step 4 */}
          <button
            type="button"
            className={`demo-step-btn ${
              demoStep === 4 ? 'active' : demoStep > 4 ? 'completed' : 'disabled'
            }`}
            onClick={handleStep4Click}
            disabled={demoStep !== 4}
          >
            {demoStep > 4 && '✓ '}4. Customer ký OTP → tạo Trip
          </button>
        </div>

        {/* Notification Banner below buttons */}
        <div className={`demo-workflow-banner ${demoStep === 5 ? 'success' : ''}`}>
          <span>
            {demoStep === 2 && 'Cần nộp/xác minh thêm $570 tiền cọc'}
            {demoStep === 3 &&
              'Khách hàng Alex Equine đã chuyển khoản $570. Nhấn "3. Xác minh tiền cọc" để đối soát.'}
            {demoStep === 4 &&
              'Đã xác minh tiền cọc $570 thành công! Nhấn "4. Customer ký OTP → tạo Trip" để kích hoạt.'}
            {demoStep === 5 &&
              '✓ Khách đã ký OTP! Kích hoạt hợp đồng CT-8928 v2 thành công và tự động tạo chuyến TRP-906.'}
          </span>
          {demoStep > 2 && (
            <button type="button" className="demo-reset-btn" onClick={handleResetDemo}>
              Đặt lại Demo
            </button>
          )}
        </div>
      </div>



      {/* Contract Detail Modal */}
      {selectedContract && (
        <div
          className="contract-modal-overlay"
          onClick={() => setSelectedContract(null)}
        >
          <div
            className="contract-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="contract-modal-header">
              <h3 className="contract-modal-title">
                Chi tiết hợp đồng {selectedContract.id}
              </h3>
              <button
                type="button"
                className="contract-modal-close"
                onClick={() => setSelectedContract(null)}
              >
                ✕
              </button>
            </div>

            <div className="contract-modal-body">
              <div className="contract-info-grid">
                <div className="contract-info-item">
                  <div className="contract-info-label">Mã yêu cầu</div>
                  <div className="contract-info-value">{selectedContract.requestId}</div>
                </div>
                <div className="contract-info-item">
                  <div className="contract-info-label">Khách hàng</div>
                  <div className="contract-info-value">{selectedContract.customerName}</div>
                </div>
                <div className="contract-info-item">
                  <div className="contract-info-label">Người liên hệ</div>
                  <div className="contract-info-value">
                    {selectedContract.contactPerson || 'Alex Equine'}
                  </div>
                </div>
                <div className="contract-info-item">
                  <div className="contract-info-label">Tổng giá trị hợp đồng</div>
                  <div className="contract-info-value" style={{ color: '#ea580c' }}>
                    ${selectedContract.price?.toLocaleString()} USD
                  </div>
                </div>
                <div className="contract-info-item">
                  <div className="contract-info-label">Hạn chót cọc / ký OTP (24h)</div>
                  <div className="contract-info-value">
                    {selectedContract.depositDeadline || '—'}
                  </div>
                </div>
                <div className="contract-info-item">
                  <div className="contract-info-label">Tình trạng hợp đồng</div>
                  <div className="contract-info-value">
                    {renderStatusBadge(selectedContract)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#121316',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #22232c',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#8e92a2',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}
                >
                  Điều khoản & Lộ trình tự động (Flow 2)
                </div>
                <p style={{ fontSize: '13px', color: '#d1d5db', margin: 0, lineHeight: 1.5 }}>
                  Một thời hạn tự động 24 giờ áp dụng chung cho việc nộp cọc, xác minh cọc và ký OTP điện tử. Quản lý có thể gia hạn thêm thời hạn này khi cần thiết.
                </p>
              </div>
            </div>

            <div className="contract-modal-actions">
              <button
                type="button"
                className="btn-secondary-dark"
                onClick={() => setSelectedContract(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn-primary-orange"
                onClick={() => {
                  alert(
                    `Đã gia hạn thêm 24 giờ thời hạn nộp cọc & ký OTP cho hợp đồng ${selectedContract.id}!`
                  );
                  setSelectedContract(null);
                }}
              >
                Gia hạn thời hạn (+24h)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerContractsPage;
