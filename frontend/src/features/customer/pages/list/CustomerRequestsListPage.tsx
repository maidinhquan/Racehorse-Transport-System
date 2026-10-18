import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '../../../../shared/layouts/CustomerLayout/CustomerLayout';
import { customerMockStore } from '../../services/customerMockStore';
import type { CustomerTransportRequest } from '../../types/customerTypes';
import './CustomerRequestsListPage.css';

export const CustomerRequestsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [requests] = useState<CustomerTransportRequest[]>(() => customerMockStore.getRequests());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchSearch =
        search.trim() === '' ||
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.originCity.toLowerCase().includes(search.toLowerCase()) ||
        r.destinationCity.toLowerCase().includes(search.toLowerCase()) ||
        r.horses.some((h) => h.name.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === '' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [requests, search, statusFilter]);

  const renderBadge = (status: CustomerTransportRequest['status']) => {
    switch (status) {
      case 'Pending':
        return <span className="crl-badge yellow">Chờ duyệt</span>;
      case 'Changes Requested':
        return <span className="crl-badge orange">Yêu cầu sửa</span>;
      case 'Rejected':
        return <span className="crl-badge red">Bị từ chối</span>;
      case 'Contract Review':
        return <span className="crl-badge blue">Hợp đồng & Cọc</span>;
      case 'Deposit Verified – Awaiting Signature':
        return <span className="crl-badge green">Đã cọc — Chờ ký OTP</span>;
      case 'Activated':
        return <span className="crl-badge green">Đã kích hoạt</span>;
      case 'In Transit':
        return <span className="crl-badge transit">Đang vận chuyển</span>;
      case 'Delivered':
        return <span className="crl-badge orange">Đã giao — Chờ tất toán</span>;
      case 'Acceptance':
        return <span className="crl-badge purple">Nghiệm thu (24h)</span>;
      case 'Closed':
        return <span className="crl-badge green">Đã đóng đơn</span>;
      case 'Cancelled':
        return <span className="crl-badge grey">Đã hủy</span>;
      default:
        return <span className="crl-badge grey">{status}</span>;
    }
  };

  return (
    <CustomerLayout pageTitle="Yêu Cầu Vận Chuyển">
      <div className="crl-container">
        {/* Header */}
        <div className="crl-header">
          <div>
            <h2>Danh Sách Yêu Cầu Vận Chuyển</h2>
            <p className="crl-sub">Theo dõi tiến độ từ xét duyệt, hợp đồng, đặt cọc đến bàn giao và nghiệm thu.</p>
          </div>
          <button className="crl-btn-create" onClick={() => navigate('/customer/create-request')}>
            + Tạo Yêu Cầu Vận Chuyển
          </button>
        </div>

        {/* Filters */}
        <div className="crl-filters-bar">
          <input
            type="text"
            className="crl-search-input"
            placeholder="Tìm theo mã đơn, thành phố, tên ngựa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="crl-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">-- Tất cả trạng thái --</option>
            <option value="Pending">Chờ Quản lý duyệt</option>
            <option value="Changes Requested">Yêu cầu chỉnh sửa</option>
            <option value="Contract Review">Hợp đồng & Cọc</option>
            <option value="Deposit Verified – Awaiting Signature">Đã cọc — Chờ ký OTP</option>
            <option value="Activated">Đã kích hoạt</option>
            <option value="In Transit">Đang vận chuyển</option>
            <option value="Delivered">Đã giao — Chờ tất toán</option>
            <option value="Acceptance">Nghiệm thu (24h feedback)</option>
            <option value="Closed">Đã hoàn thành</option>
            <option value="Cancelled">Đã hủy</option>
          </select>
        </div>

        {/* Table */}
        <div className="crl-card">
          <div className="crl-table-wrapper">
            <table className="crl-table">
              <thead>
                <tr>
                  <th>Mã Yêu Cầu</th>
                  <th>Lộ Trình</th>
                  <th>Số Ngựa</th>
                  <th>Khởi Hành</th>
                  <th>Hạn Bàn Giao</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      Không tìm thấy yêu cầu vận chuyển phù hợp.
                    </td>
                  </tr>
                ) : (
                  filtered.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <strong className="crl-req-id" onClick={() => navigate(`/customer/requests/${req.id}`)}>
                          {req.id}
                        </strong>
                      </td>
                      <td>
                        <div className="crl-route">
                          {req.originCity} ({req.originCountry}) ➔ {req.destinationCity} ({req.destinationCountry})
                        </div>
                        <small className="crl-transport-type">{req.transportType}</small>
                      </td>
                      <td>
                        <div className="crl-horses-preview">
                          {req.horses.map((h) => h.name).join(', ')}
                        </div>
                      </td>
                      <td>{req.expectedDate}</td>
                      <td>{req.committedDeadline}</td>
                      <td>{renderBadge(req.status)}</td>
                      <td>
                        <button
                          className="crl-action-btn"
                          onClick={() => navigate(`/customer/requests/${req.id}`)}
                        >
                          Xem chi tiết ➔
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};
