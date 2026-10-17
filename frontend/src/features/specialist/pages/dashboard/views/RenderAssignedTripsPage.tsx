import React, { useState } from 'react';
import type { SpecialistTrip } from './specialist.types';
import { Icon } from './specialist.types';

interface RenderAssignedTripsPageProps {
  trips: SpecialistTrip[];
  lang: 'vi' | 'en';
  onSelectTrip: (tripId: string) => void;
}

export const RenderAssignedTripsPage: React.FC<RenderAssignedTripsPageProps> = ({
  trips,
  lang,
  onSelectTrip
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDeployment, setFilterDeployment] = useState('ALL');
  const [filterChecklist, setFilterChecklist] = useState('ALL');

  const filteredTrips = trips.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.destination.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDeployment =
      filterDeployment === 'ALL' || t.deploymentStatus === filterDeployment;

    const matchesChecklist =
      filterChecklist === 'ALL' || t.checklist.status === filterChecklist;

    return matchesSearch && matchesDeployment && matchesChecklist;
  });

  return (
    <div className="render-assigned-trips-page fade-in">
      <div className="page-head">
        <div>
          <h2 className="page-title">
            {lang === 'vi' ? 'Chuyến vận chuyển được phân công' : 'Assigned Trips'}
          </h2>
          <p className="subtitle">
            {lang === 'vi'
              ? 'Yêu cầu pháp lý và danh mục chứng từ được tổng hợp tự động theo quy định của nước xuất khẩu, quá cảnh và nhập khẩu.'
              : 'Regulatory checklists compiled according to departure, transit and destination laws.'}
          </p>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="card pad filter-toolbar-card">
        <div className="filter-toolbar-row">
          <div className="search-box-wrap">
            <Icon name="search" />
            <input
              type="text"
              className="search-input"
              placeholder={lang === 'vi' ? 'Tìm theo mã chuyến, mã yêu cầu, khách hàng, lộ trình...' : 'Search trip, request, customer or route...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-select-group">
            <select
              className="custom-select"
              value={filterDeployment}
              onChange={(e) => setFilterDeployment(e.target.value)}
            >
              <option value="ALL">{lang === 'vi' ? 'Tất cả trạng thái triển khai' : 'All Deployment States'}</option>
              <option value="CONFIRMED">{lang === 'vi' ? 'Đã duyệt triển khai (CONFIRMED)' : 'Confirmed'}</option>
              <option value="NOT_CONFIRMED">{lang === 'vi' ? 'Chưa kích hoạt (DRAFT)' : 'Not Confirmed'}</option>
              <option value="ON_HOLD">{lang === 'vi' ? 'Tạm giữ (ON_HOLD)' : 'On Hold'}</option>
            </select>

            <select
              className="custom-select"
              value={filterChecklist}
              onChange={(e) => setFilterChecklist(e.target.value)}
            >
              <option value="ALL">{lang === 'vi' ? 'Tất cả tiến độ Checklist' : 'All Checklist States'}</option>
              <option value="READY">{lang === 'vi' ? 'Đã hoàn tất 100% (READY)' : 'Ready'}</option>
              <option value="NOT_READY">{lang === 'vi' ? 'Chưa đủ hồ sơ (INCOMPLETE)' : 'Incomplete'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* TRIPS TABLE */}
      <div className="card table-card" style={{ marginTop: '16px' }}>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{lang === 'vi' ? 'MÃ CHUYẾN' : 'TRIP'}</th>
                <th>{lang === 'vi' ? 'KHÁCH HÀNG & LỘ TRÌNH' : 'CUSTOMER & ROUTE'}</th>
                <th>{lang === 'vi' ? 'QUỐC GIA ĐI QUA' : 'COUNTRIES'}</th>
                <th>{lang === 'vi' ? 'PHƯƠNG THỨC' : 'MODE'}</th>
                <th>{lang === 'vi' ? 'KHỞI HÀNH & ĐẾN' : 'DEPART & ETA'}</th>
                <th>{lang === 'vi' ? 'TIẾN ĐỘ CHECKLIST' : 'CHECKLIST PROGRESS'}</th>
                <th>{lang === 'vi' ? 'TRIỂN KHAI' : 'DEPLOYMENT'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'vi' ? 'THAO TÁC' : 'ACTION'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                    {lang === 'vi' ? 'Không tìm thấy chuyến nào phù hợp bộ lọc.' : 'No matching trips found.'}
                  </td>
                </tr>
              ) : (
                filteredTrips.map((t) => {
                  const isOk = t.checklist.status === 'READY';
                  const pct = Math.round((t.checklist.ready / t.checklist.total) * 100);
                  const horseNames = t.horses.map((h) => h.name).join(', ');

                  return (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTrip(t.id)}
                      className="clickable-row"
                    >
                      <td>
                        <b className="primary-id-text">{t.id}</b>
                        <div className="cell-sub-muted">{t.requestId}</div>
                      </td>
                      <td>
                        <div className="fw-600">{t.customerName}</div>
                        <div className="cell-sub-muted">
                          {t.origin} → {t.destination}
                        </div>
                        <div className="cell-sub-muted font-11">
                          🐴 {horseNames} ({t.horses.length} cá thể)
                        </div>
                      </td>
                      <td>
                        <span className="country-route-pill">
                          {t.origin.includes('Ho Chi Minh') || t.origin.includes('Hanoi') || t.origin.includes('Da Nang') ? 'Việt Nam' : t.origin}
                          {t.transit && t.transit.length > 0 && ` → ${t.transit.join(' → ')}`}
                          {` → ${t.destination}`}
                        </span>
                      </td>
                      <td>
                        <span className="mode-badge">
                          {t.mode === 'AIR' ? '✈️ Hàng không' : '🚛 Đường bộ'}
                        </span>
                      </td>
                      <td>
                        <div className="fw-600">{t.plannedDepart.slice(0, 10)}</div>
                        <div className="cell-sub-muted">ETA: {t.eta.slice(0, 10)}</div>
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
                            {isOk ? 'READY' : 'INCOMPLETE'}
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
                            ? (lang === 'vi' ? 'Đã duyệt' : 'Confirmed')
                            : (lang === 'vi' ? 'Chờ kích hoạt' : 'Draft')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-sm btn-solid-orange"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTrip(t.id);
                          }}
                        >
                          {lang === 'vi' ? 'Thẩm định' : 'Review'}
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
          {filteredTrips.length} {lang === 'vi' ? 'chuyến hiển thị' : 'trips shown'}
        </div>
      </div>
    </div>
  );
};
