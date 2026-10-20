import React, { useState, useMemo } from 'react';
import { CustomerLayout } from '../../components/CustomerLayout';
import { TripStatusBadge, ContractStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { mockHistoryScenarios, mockHistoryRequests } from '../../data/mockData';
import type { HistoryRequestItem } from '../../types';
import { HistoryDetailModal } from './HistoryDetailModal';
import './CustomerHistoryPage.css';

export const CustomerHistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');

  // Modal detail state
  const [selectedRequest, setSelectedRequest] = useState<HistoryRequestItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Filter history requests based on search term, status and year
  const filteredHistory = useMemo(() => {
    return mockHistoryRequests.filter((item: HistoryRequestItem) => {
      const matchSearch =
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.horse.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.destination.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        selectedStatus === 'all' ||
        item.statusKey === selectedStatus ||
        item.statusText === selectedStatus;

      const matchYear =
        selectedYear === 'all' ||
        item.year === selectedYear ||
        item.requestedDate.includes(selectedYear);

      return matchSearch && matchStatus && matchYear;
    });
  }, [searchTerm, selectedStatus, selectedYear]);

  const handleOpenDetail = (item: HistoryRequestItem) => {
    setSelectedRequest(item);
    setIsDetailModalOpen(true);
  };

  const handleScenarioClick = (scenarioId: string) => {
    const found = mockHistoryRequests.find((r) => r.id === scenarioId);
    if (found) {
      handleOpenDetail(found);
    }
  };

  return (
    <CustomerLayout pageTitle="Lịch sử" activeNav="history">
      <div className="customer-history-page">
        {/* ==================== PAGE HEADER ==================== */}
        <section className="history-page-header">
          <h2 className="history-title">Lịch sử vận chuyển</h2>
          <p className="history-subtitle">
            Các yêu cầu đã đóng, đã hủy hoặc bị từ chối, chỉ xem. Yêu cầu đã giao sẽ chuyển sang đây khi thanh toán cuối được xác minh, hết 24 giờ phản hồi và không còn khiếu nại mở; khi đó hợp đồng đã hoàn thành và không còn hiệu lực.
          </p>
        </section>

        {/* ==================== SEARCH & FILTERS ROW ==================== */}
        <div className="history-filter-row">
          <div className="history-search-box">
            <svg
              className="history-search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="history-search-input"
              placeholder="Tìm mã yêu cầu, ngựa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="history-select-wrapper">
            <select
              className="history-select-dropdown"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="closed">Đã đóng</option>
              <option value="cancelled">Đã hủy</option>
              <option value="rejected">Bị từ chối</option>
            </select>
            <svg className="history-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>

          <div className="history-select-wrapper">
            <select
              className="history-select-dropdown"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="all">Tất cả các năm</option>
              <option value="2026">Năm 2026</option>
              <option value="2025">Năm 2025</option>
              <option value="2024">Năm 2024</option>
            </select>
            <svg className="history-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>

        {/* ==================== DEMO SCENARIOS CARD ==================== */}
        <section className="history-demo-card">
          <div className="history-demo-header">
            <div className="history-demo-header-left">
              <span className="history-demo-tag">DỮ LIỆU DEMO</span>
              <span className="history-demo-title">Gợi ý thử các tình huống</span>
            </div>
            <div className="history-demo-notice">
              Dữ liệu mẫu, không phải giao dịch thật
            </div>
          </div>

          <div className="history-demo-table-wrapper">
            <table className="history-demo-table">
              <tbody>
                {mockHistoryScenarios.map((scenario) => (
                  <tr
                    key={scenario.id}
                    onClick={() => handleScenarioClick(scenario.id)}
                    className="history-demo-clickable-row"
                    title={`Xem chi tiết ${scenario.id}`}
                  >
                    <td className="history-demo-id">{scenario.id}</td>
                    <td
                      className={`history-demo-scenario-title ${
                        scenario.statusKey === 'rejected' ? 'status-rejected-title' : ''
                      }`}
                    >
                      {scenario.title}
                    </td>
                    <td className="history-demo-desc">{scenario.description}</td>
                    <td className="history-demo-status-col">
                      <TripStatusBadge status={scenario.statusKey} label={scenario.statusText} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ==================== MAIN HISTORY TABLE ==================== */}
        <section className="history-table-card">
          <div className="history-table-responsive-wrapper">
            <table className="history-main-table">
              <thead>
                <tr>
                  <th>MÃ YÊU CẦU</th>
                  <th>TUYẾN ĐƯỜNG</th>
                  <th>NGỰA</th>
                  <th>NGÀY YÊU CẦU</th>
                  <th>NGÀY MONG MUỐN</th>
                  <th>HỢP ĐỒNG</th>
                  <th>TRẠNG THÁI YÊU CẦU</th>
                  <th style={{ textAlign: 'center' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenDetail(item)}
                      className="history-table-row-clickable"
                    >
                      <td className="col-hist-id">{item.id}</td>
                      <td className="col-hist-route">
                        {item.origin} → {item.destination}
                      </td>
                      <td className="col-hist-horse">{item.horse}</td>
                      <td className="col-hist-date">{item.requestedDate}</td>
                      <td className="col-hist-date">{item.expectedDate}</td>
                      <td className="col-hist-contract">
                        <ContractStatusBadge
                          status={item.contractStatusKey}
                          text={item.contractStatusText}
                        />
                      </td>
                      <td className="col-hist-status">
                        <TripStatusBadge status={item.statusKey} label={item.statusText} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-hist-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(item);
                          }}
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="history-empty-table">
                      Không tìm thấy bản ghi lịch sử vận chuyển nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Detail Modal */}
      <HistoryDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        request={selectedRequest}
      />
    </CustomerLayout>
  );
};

export default CustomerHistoryPage;
