import React from 'react';
import type { TripCostReportItem } from '../../types';
import './PdfReportModal.css';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: TripCostReportItem[];
  totalRevenue: number;
  totalActual: number;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  reports,
  totalRevenue,
  totalActual,
}) => {
  if (!isOpen) return null;

  const grossMargin = totalRevenue > 0
    ? Math.round(((totalRevenue - totalActual) / totalRevenue) * 100)
    : 0;

  return (
    <div className="pdf-modal-overlay" onClick={onClose}>
      <div className="pdf-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="pdf-modal-header">
          <h3 className="pdf-modal-title">Báo cáo chi phí vận hành</h3>
          <button type="button" className="pdf-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Modal Body / Sheet */}
        <div className="pdf-modal-body">
          <div className="pdf-sheet-container">
            {/* Header info */}
            <div className="pdf-sheet-top">
              <div className="pdf-brand-name">CBN Transport</div>
              <div className="pdf-sheet-meta">
                <div>Tạo lúc 4/10/2026</div>
                <div>Chỉ xem trước</div>
              </div>
            </div>

            <h2 className="pdf-doc-title">Chi phí vận hành và lợi nhuận theo chuyến</h2>
            <div className="pdf-doc-sub">Kỳ 1/8 – 4/10/2026 • Lập bởi Linh Pham</div>

            <div className="pdf-divider-line" />

            {/* Summary Row */}
            <div className="pdf-stats-row">
              <div className="pdf-stat-col">
                <span className="pdf-stat-label">Chuyến đi</span>
                <span className="pdf-stat-number">{reports.length}</span>
              </div>
              <div className="pdf-stat-col">
                <span className="pdf-stat-label">Doanh thu</span>
                <span className="pdf-stat-number">${totalRevenue.toLocaleString()}</span>
              </div>
              <div className="pdf-stat-col">
                <span className="pdf-stat-label">Chi phí thực tế</span>
                <span className="pdf-stat-number">${totalActual.toLocaleString()}</span>
              </div>
              <div className="pdf-stat-col">
                <span className="pdf-stat-label">Biên lợi nhuận</span>
                <span className="pdf-stat-number">{grossMargin}%</span>
              </div>
            </div>

            {/* Table */}
            <table className="pdf-table">
              <thead>
                <tr>
                  <th>CHUYẾN</th>
                  <th>YÊU CẦU</th>
                  <th>DOANH THU</th>
                  <th>NGÂN SÁCH</th>
                  <th>THỰC TẾ</th>
                  <th>CHÊNH LỆCH</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const isPositive = r.variance > 0;
                  return (
                    <tr key={r.tripId}>
                      <td>{r.tripId}</td>
                      <td>{r.requestId}</td>
                      <td>${r.revenue.toLocaleString()}</td>
                      <td>${r.budget.toLocaleString()}</td>
                      <td>${r.actualCost.toLocaleString()}</td>
                      <td style={{ color: isPositive ? '#f87171' : '#4ade80' }}>
                        {isPositive
                          ? `+$${r.variance.toLocaleString()}`
                          : `$-${Math.abs(r.variance).toLocaleString()}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="pdf-demo-note">
              Số liệu từ dữ liệu demo. Bản mẫu này chưa kết nối xuất PDF thật.
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pdf-modal-actions">
          <button type="button" className="btn-modal-close-dark" onClick={onClose}>
            Đóng
          </button>
          <button
            type="button"
            className="btn-modal-generate-pdf"
            onClick={() => {
              alert('Đã tạo bản PDF báo cáo chi phí vận hành thành công!');
              onClose();
            }}
          >
            Tạo PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfReportModal;
