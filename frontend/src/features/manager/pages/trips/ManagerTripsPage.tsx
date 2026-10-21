import React, { useState, useMemo } from 'react';
import type { ManagerTripItem, ManagerNav } from '../../types';
import { INITIAL_MANAGER_TRIPS } from '../../data/mockData';
import { TripDetailModal } from '../../components/Modals';
import './ManagerTripsPage.css';

interface ManagerTripsPageProps {
  onNavigate?: (nav: ManagerNav, targetId?: string) => void;
}

export const ManagerTripsPage: React.FC<ManagerTripsPageProps> = ({
  onNavigate: _onNavigate,
}) => {
  const [tripsList, setTripsList] = useState<ManagerTripItem[]>(INITIAL_MANAGER_TRIPS);

  // Filter states
  // 'ALL' | 'PENDING' (Chưa xác nhận) | 'CONFIRMED' (Đã xác nhận) | 'PAUSED' (Tạm dừng)
  const [activeCardFilter, setActiveCardFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'PAUSED'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusProgressFilter, setStatusProgressFilter] = useState('ALL');

  // Selected trip for modal inspection
  const [selectedTrip, setSelectedTrip] = useState<ManagerTripItem | null>(null);

  // Count metrics for the 3 stat cards
  const pendingCount = useMemo(
    () => tripsList.filter((t) => t.deploymentStatus === 'PENDING').length,
    [tripsList]
  );
  const confirmedCount = useMemo(
    () => tripsList.filter((t) => t.deploymentStatus === 'CONFIRMED').length,
    [tripsList]
  );
  const pausedCount = useMemo(
    () => tripsList.filter((t) => t.deploymentStatus === 'PAUSED').length,
    [tripsList]
  );

  // Handle card click toggle
  const handleCardToggle = (card: 'PENDING' | 'CONFIRMED' | 'PAUSED') => {
    if (activeCardFilter === card) {
      setActiveCardFilter('ALL');
    } else {
      setActiveCardFilter(card);
    }
  };

  // Filtered trips list
  const filteredTrips = useMemo(() => {
    return tripsList.filter((t) => {
      // Search matching
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.requestId.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.route.toLowerCase().includes(q) ||
        (t.contactPerson && t.contactPerson.toLowerCase().includes(q));

      // Deployment status matching
      let matchDeploy = true;
      if (activeCardFilter === 'PENDING') {
        matchDeploy = t.deploymentStatus === 'PENDING';
      } else if (activeCardFilter === 'CONFIRMED') {
        matchDeploy = t.deploymentStatus === 'CONFIRMED';
      } else if (activeCardFilter === 'PAUSED') {
        matchDeploy = t.deploymentStatus === 'PAUSED';
      }

      // Progress status matching
      const matchProgress =
        statusProgressFilter === 'ALL' ||
        t.tripStatus === statusProgressFilter;

      return matchSearch && matchDeploy && matchProgress;
    });
  }, [tripsList, searchTerm, activeCardFilter, statusProgressFilter]);

  // Handle Confirm deployment inside modal
  const handleConfirmDeployment = (tripId: string) => {
    setTripsList((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              deploymentStatus: 'CONFIRMED',
              routeApprovalStatus: 'APPROVED',
              routeApprovalLabel: 'v1 Đã duyệt',
              resourceStatus: '—',
              tripStatus: 'Đang vận chuyển',
            }
          : t
      )
    );
  };

  const renderRouteBadge = (status: string, label: string) => {
    if (status === 'APPROVED' || label.includes('Đã duyệt')) {
      return <span className="badge-trip-route approved">{label}</span>;
    }
    if (status === 'NOT_STARTED' || label.includes('Chưa bắt đầu')) {
      return <span className="badge-trip-route not-started">{label}</span>;
    }
    return <span className="badge-trip-route draft">{label}</span>;
  };

  return (
    <div className="trips-page-container">
      {/* Module Header */}
      <div className="trips-header-section">
        <h1 className="trips-header-title">Chuyến đi</h1>
        <p className="trips-header-sub">
          Mỗi yêu cầu đã kích hoạt có một chuyến. Xác nhận triển khai, duyệt tuyến và duyệt khởi hành. Chuyến chỉ chính thức được triển khai sau khi bạn xác nhận.
        </p>
      </div>

      {/* 3 Stat Cards with interactive toggle */}
      <div className="trip-stat-cards-grid">
        <div
          className={`trip-stat-card ${activeCardFilter === 'PENDING' ? 'active' : ''}`}
          onClick={() => handleCardToggle('PENDING')}
        >
          <div className="trip-stat-card-title">Chờ triển khai</div>
          <div className="trip-stat-card-number">{pendingCount}</div>
          <div className="trip-stat-card-sub">
            {activeCardFilter === 'PENDING' ? 'Đang lọc – bấm để bỏ lọc' : 'Bấm để lọc'}
          </div>
        </div>

        <div
          className={`trip-stat-card ${activeCardFilter === 'CONFIRMED' ? 'active' : ''}`}
          onClick={() => handleCardToggle('CONFIRMED')}
        >
          <div className="trip-stat-card-title">Đã xác nhận triển khai</div>
          <div className="trip-stat-card-number">{confirmedCount}</div>
          <div className="trip-stat-card-sub">
            {activeCardFilter === 'CONFIRMED' ? 'Đang lọc – bấm để bỏ lọc' : 'Bấm để lọc'}
          </div>
        </div>

        <div
          className={`trip-stat-card ${activeCardFilter === 'PAUSED' ? 'active' : ''}`}
          onClick={() => handleCardToggle('PAUSED')}
        >
          <div className="trip-stat-card-title">Tạm dừng triển khai</div>
          <div className="trip-stat-card-number">{pausedCount}</div>
          <div className="trip-stat-card-sub">
            {activeCardFilter === 'PAUSED' ? 'Đang lọc – bấm để bỏ lọc' : 'Bấm để lọc'}
          </div>
        </div>
      </div>

      {/* Search & Filters Row */}
      <div className="trips-filters-row">
        {/* Search */}
        <div className="trips-search-box">
          <span className="trips-search-icon">🔍</span>
          <input
            type="text"
            className="trips-search-input"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Dropdown 1: Mọi trạng thái chuyến */}
        <select
          className="trips-select"
          value={statusProgressFilter}
          onChange={(e) => setStatusProgressFilter(e.target.value)}
        >
          <option value="ALL">Mọi trạng thái chuyến</option>
          <option value="Chờ triển khai">Chờ triển khai</option>
          <option value="Đang vận chuyển">Đang vận chuyển</option>
          <option value="Lập kế hoạch">Lập kế hoạch</option>
          <option value="Sẵn sàng khởi hành">Sẵn sàng khởi hành</option>
        </select>

        {/* Dropdown 2: Deployment Status */}
        <select
          className="trips-select"
          value={
            activeCardFilter === 'PENDING'
              ? 'PENDING'
              : activeCardFilter === 'CONFIRMED'
              ? 'CONFIRMED'
              : activeCardFilter === 'PAUSED'
              ? 'PAUSED'
              : 'ALL'
          }
          onChange={(e) =>
            setActiveCardFilter(
              e.target.value as 'ALL' | 'PENDING' | 'CONFIRMED' | 'PAUSED'
            )
          }
        >
          <option value="ALL">Tất cả</option>
          <option value="PENDING">Chưa xác nhận</option>
          <option value="CONFIRMED">Đã xác nhận</option>
          <option value="PAUSED">Tạm dừng</option>
        </select>
      </div>

      {/* Trips Table */}
      <div className="trips-table-card">
        <div className="table-responsive">
          <table className="trips-table">
            <thead>
              <tr>
                <th>CHUYẾN</th>
                <th>KHÁCH HÀNG</th>
                <th>TUYẾN ĐƯỜNG</th>
                <th>PHƯƠNG THỨC</th>
                <th>NGỰA</th>
                <th>KHỞI HÀNH / DỰ KIẾN ĐẾN</th>
                <th>DUYỆT TUYẾN</th>
                <th>NGUỒN LỰC</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map((trip) => {
                const isPending = trip.deploymentStatus === 'PENDING';
                return (
                  <tr
                    key={trip.id}
                    className={`trips-table-row ${isPending ? 'pending-indicator' : ''}`}
                    onClick={() => setSelectedTrip(trip)}
                  >
                    {/* Chuyến */}
                    <td>
                      <div className="trip-code-text">{trip.id}</div>
                      <div className="trip-sub-req">{trip.requestId}</div>
                    </td>

                    {/* Khách hàng */}
                    <td>
                      <div className="trip-customer-name">{trip.customerName}</div>
                      <div className="trip-sub-contact">
                        {trip.contactPerson || 'Alex Equine'}
                      </div>
                    </td>

                    {/* Tuyến đường */}
                    <td>
                      <div className="trip-route-text">{trip.route}</div>
                    </td>

                    {/* Phương thức */}
                    <td>
                      <div className="trip-mode-text">{trip.transportMode}</div>
                    </td>

                    {/* Ngựa */}
                    <td>
                      <div className="trip-horses-count">{trip.horsesCount} con</div>
                    </td>

                    {/* Khởi hành / Dự kiến đến */}
                    <td>
                      <div className="trip-dep-time">{trip.departureTime}</div>
                      <div className="trip-sub-eta">Đến: {trip.eta}</div>
                    </td>

                    {/* Duyệt tuyến */}
                    <td>
                      {renderRouteBadge(trip.routeApprovalStatus, trip.routeApprovalLabel)}
                    </td>

                    {/* Nguồn lực */}
                    <td>
                      <span className="trip-resource-text">{trip.resourceStatus}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Helper Note matching screenshots */}
      <div className="trips-bottom-note">
        Để chạy Demo, mở Trip và chọn bước tương ứng trên timeline. Mỗi bước chỉ hiển thị thao tác dành cho giai đoạn đó.
      </div>

      {selectedTrip && (
        <TripDetailModal
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
          onConfirmDeployment={handleConfirmDeployment}
        />
      )}
    </div>
  );
};

export default ManagerTripsPage;
