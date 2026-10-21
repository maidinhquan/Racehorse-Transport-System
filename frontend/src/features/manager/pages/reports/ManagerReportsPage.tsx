import React, { useState, useMemo } from 'react';
import type { ManagerNav, TripCostReportItem } from '../../types';
import { INITIAL_TRIP_COST_REPORTS } from '../../data/mockData';
import { PdfReportModal } from '../../components/Modals';
import './ManagerReportsPage.css';

interface ManagerReportsPageProps {
  onNavigate?: (nav: ManagerNav, targetId?: string) => void;
}

export const ManagerReportsPage: React.FC<ManagerReportsPageProps> = ({
  onNavigate: _onNavigate,
}) => {
  const [reports] = useState<TripCostReportItem[]>(INITIAL_TRIP_COST_REPORTS);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Calculate totals
  const totalRevenue = useMemo(
    () => reports.reduce((sum, r) => sum + r.revenue, 0),
    [reports]
  );
  const totalBudget = useMemo(
    () => reports.reduce((sum, r) => sum + r.budget, 0),
    [reports]
  );
  const totalActual = useMemo(
    () => reports.reduce((sum, r) => sum + r.actualCost, 0),
    [reports]
  );

  const variance = totalActual - totalBudget;
  const grossMargin = totalRevenue > 0
    ? Math.round(((totalRevenue - totalActual) / totalRevenue) * 100)
    : 0;

  const handleActionClick = (actionName: string) => {
    setToastMsg(`✓ Đã kích hoạt mô phỏng: "${actionName}"`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  return (
    <div className="reports-page-container">
      {/* Module Header */}
      <div className="reports-header-section">
        <div>
          <h1 className="reports-header-title">Chi phí vận hành & báo cáo</h1>
          <p className="reports-header-sub">
            Ngân sách từ kế hoạch sơ bộ so với chi phí thực tế đã ghi nhận.
          </p>
        </div>

        <button
          type="button"
          className="btn-preview-pdf-orange"
          onClick={() => setShowPdfModal(true)}
        >
          📄 Xem trước báo cáo PDF
        </button>
      </div>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="reports-toast">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 4 Financial Stat Cards */}
      <div className="cost-summary-cards-grid">
        <div className="cost-stat-card">
          <div className="cost-stat-label">Doanh thu</div>
          <div className="cost-stat-val">${totalRevenue.toLocaleString()}</div>
          <div className="cost-stat-sub">{reports.length} chuyến</div>
        </div>

        <div className="cost-stat-card">
          <div className="cost-stat-label">Chi phí dự toán</div>
          <div className="cost-stat-val">${totalBudget.toLocaleString()}</div>
        </div>

        <div className="cost-stat-card">
          <div className="cost-stat-label">Chi phí thực tế</div>
          <div className="cost-stat-val">${totalActual.toLocaleString()}</div>
          <div className="cost-stat-sub">
            {variance < 0 ? `$-${Math.abs(variance).toLocaleString()}` : `+$${variance.toLocaleString()}`} so với ngân sách
          </div>
        </div>

        <div className="cost-stat-card">
          <div className="cost-stat-label">Lợi nhuận gộp</div>
          <div className="cost-stat-val">{grossMargin}%</div>
        </div>
      </div>

      {/* Table: Chi phí và lợi nhuận theo chuyến */}
      <div className="trip-profits-container">
        <div className="trip-profits-table-card">
          <div className="table-header-title">Chi phí và lợi nhuận theo chuyến</div>

          <div className="table-responsive">
            <table className="trip-profits-table">
              <thead>
                <tr>
                  <th>CHUYẾN</th>
                  <th>TRẠNG THÁI</th>
                  <th>DOANH THU</th>
                  <th>NGÂN SÁCH</th>
                  <th>THỰC TẾ</th>
                  <th>CHÊNH LỆCH</th>
                  <th>CHI PHÍ PHÁT SINH</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((item) => {
                  const isPositiveVariance = item.variance > 0;
                  return (
                    <tr key={item.tripId} className="trip-profits-table-row">
                      {/* Chuyến */}
                      <td>
                        <div className="trip-code-text">{item.tripId}</div>
                        <div className="trip-sub-req">{item.requestId}</div>
                      </td>

                      {/* Trạng thái */}
                      <td>
                        <span
                          className={`badge-profit-status ${
                            item.status === 'Đang vận chuyển' ? 'in-transit' : 'completed'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Doanh thu */}
                      <td>
                        <span className="text-white font-medium">
                          ${item.revenue.toLocaleString()}
                        </span>
                      </td>

                      {/* Ngân sách */}
                      <td>
                        <span className="text-white font-medium">
                          ${item.budget.toLocaleString()}
                        </span>
                      </td>

                      {/* Thực tế */}
                      <td>
                        <span className="text-white font-medium">
                          ${item.actualCost.toLocaleString()}
                        </span>
                      </td>

                      {/* Chênh lệch */}
                      <td>
                        <span
                          className={`font-semibold ${
                            isPositiveVariance ? 'text-red-400' : 'text-green-400'
                          }`}
                        >
                          {isPositiveVariance
                            ? `+$${item.variance.toLocaleString()}`
                            : `$-${Math.abs(item.variance).toLocaleString()}`}
                        </span>
                      </td>

                      {/* Chi phí phát sinh */}
                      <td>
                        {item.incidentalCostText && item.incidentalCostText !== '—' ? (
                          <span className="text-[#d1d5db] text-xs">
                            {item.incidentalCostText}
                          </span>
                        ) : (
                          <span className="text-[#6b7280]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Demo Helper Section */}
      <div className="demo-helper-card">
        <div className="demo-helper-header">
          <span className="demo-helper-title">Điều khiển Demo</span>
          <span className="demo-helper-tag">Thao tác mô phỏng • 1 nhóm</span>
        </div>

        <div className="demo-helper-suggestion-label">Gợi ý bước tiếp theo</div>
        <p className="demo-helper-suggestion-desc">
          Chọn một Request/Trip để các bước Demo bám đúng dữ liệu đang kiểm tra. Demo mô phỏng đúng role, không thay thế quyết định chính thức của Manager.
        </p>

        <div className="demo-sub-group">
          <div className="demo-sub-header">
            <span className="demo-sub-title">Đóng yêu cầu</span>
            <span className="demo-sub-tag">4 thao tác bổ trợ</span>
          </div>

          <div className="demo-sub-pills">
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => handleActionClick('Tài xế hoàn tất bàn giao')}
            >
              Tài xế hoàn tất bàn giao
            </button>
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => handleActionClick('Người nhận từ chối bàn giao')}
            >
              Người nhận từ chối bàn giao
            </button>
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => handleActionClick('Khách hàng chấp nhận bàn giao')}
            >
              Khách hàng chấp nhận bàn giao
            </button>
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => handleActionClick('Xác minh thanh toán cuối')}
            >
              Xác minh thanh toán cuối
            </button>
          </div>
        </div>
      </div>

      <PdfReportModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        reports={reports}
        totalRevenue={totalRevenue}
        totalActual={totalActual}
      />
    </div>
  );
};

export default ManagerReportsPage;
