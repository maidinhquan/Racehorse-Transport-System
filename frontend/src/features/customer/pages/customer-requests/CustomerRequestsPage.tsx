import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerLayout } from '../../components/CustomerLayout';
import { TripStatusBadge, ContractStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { mockTransportRequests } from '../../data/mockData';
import type { TransportRequestItem } from '../../types';
import './CustomerRequestsPage.css';

export const CustomerRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Filter requests by search term and status
  const filteredRequests = useMemo(() => {
    return mockTransportRequests.filter((item: TransportRequestItem) => {
      const matchSearch =
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.horse.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.destination.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        selectedStatus === 'all' ||
        item.status === selectedStatus ||
        item.statusText === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [searchTerm, selectedStatus]);

  const handleRowClick = (requestId: string) => {
    navigate(`/customer/requests/${requestId}`);
  };

  return (
    <CustomerLayout pageTitle="Yêu cầu vận chuyển" activeNav="requests">
      <div className="customer-requests-page">
        {/* ==================== PAGE HEADER ==================== */}
        <section className="requests-page-header">
          <div className="requests-page-titles">
            <h2 className="requests-title">Yêu cầu vận chuyển</h2>
            <p className="requests-subtitle">
              Theo dõi và quản lý các yêu cầu vận chuyển đang hoạt động.
            </p>
          </div>

          <button
            className="btn-create-new-request"
            onClick={() => navigate('/customer/create-request')}
          >
            <span>+ Tạo yêu cầu vận chuyển</span>
          </button>
        </section>

        {/* ==================== SEARCH & FILTER ROW ==================== */}
        <div className="requests-filter-row">
          <div className="search-input-box">
            <svg
              className="search-icon-svg"
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
              className="search-input-field"
              placeholder="Tìm theo mã yêu cầu, tuyến hoặc ngựa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="status-filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Đang vận chuyển">Đang vận chuyển</option>
            <option value="Đang xét duyệt hồ sơ">Đang xét duyệt hồ sơ</option>
            <option value="Hợp đồng sẵn sàng">Hợp đồng sẵn sàng</option>
            <option value="Chờ quản lý xét duyệt">Chờ quản lý xét duyệt</option>
            <option value="Đã giao">Đã giao</option>
            <option value="Yêu cầu sửa hợp đồng">Yêu cầu sửa hợp đồng</option>
            <option value="Yêu cầu chỉnh sửa">Yêu cầu chỉnh sửa</option>
          </select>
        </div>

        {/* ==================== MAIN REQUESTS TABLE ==================== */}
        <section className="requests-table-card">
          <table className="requests-main-table">
            <thead>
              <tr>
                <th>MÃ YÊU CẦU</th>
                <th>TUYẾN ĐƯỜNG</th>
                <th>NGỰA</th>
                <th>NGÀY YÊU CẦU</th>
                <th>NGÀY MONG MUỐN</th>
                <th>HỢP ĐỒNG</th>
                <th>TRẠNG THÁI YÊU CẦU</th>
                <th style={{ textAlign: 'right' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <tr key={req.id}>
                    <td className="col-request-id">{req.id}</td>
                    <td className="col-route">
                      {req.origin} → {req.destination}
                    </td>
                    <td className="col-horse">{req.horse}</td>
                    <td className="col-date">{req.requestedDate}</td>
                    <td className="col-date">{req.expectedDate}</td>
                    <td>
                      <ContractStatusBadge
                        status={req.contractStatus}
                        text={req.contractStatusText}
                      />
                    </td>
                    <td>
                      <TripStatusBadge status={req.status} label={req.statusText} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-detail-link"
                        onClick={() => handleRowClick(req.id)}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="empty-table-row">
                    Không tìm thấy yêu cầu vận chuyển phù hợp với từ khóa &quot;{searchTerm}&quot;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </CustomerLayout>
  );
};

export default CustomerRequestsPage;
