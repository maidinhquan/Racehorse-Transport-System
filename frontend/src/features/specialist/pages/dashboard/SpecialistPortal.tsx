import { useState } from 'react';
import { BrandLogo } from '../../../../shared/components/brand-logo/BrandLogo';
import './SpecialistPortal.css';

export const SpecialistPortal = () => {
  const committedDeadline = '2026-11-05';
  const [records, setRecords] = useState([
    {
      recordId: 'REC-01',
      documentType: 'FEI Passport',
      documentStatus: 'Approved',
      expiryDate: '2028-05-20',
      physicalCopyReceived: true,
    },
    {
      recordId: 'REC-02',
      documentType: 'Coggins Test (EIA) & Kiểm dịch PEQ',
      documentStatus: 'Pending',
      expiryDate: '2026-11-20',
      physicalCopyReceived: false,
    },
  ]);

  const togglePhysical = (id: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.recordId === id ? { ...r, physicalCopyReceived: !r.physicalCopyReceived } : r))
    );
  };

  const approveDoc = (id: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.recordId === id ? { ...r, documentStatus: 'Approved' } : r))
    );
  };

  return (
    <div className="specialist-page">
      <div className="customer-topbar" style={{ maxWidth: '1000px' }}>
        <BrandLogo />
        <strong>Role: Transport Specialist</strong>
      </div>

      <div className="specialist-container">
        <div className="specialist-header-row">
          <div>
            <h1 className="customer-title">Thẩm định Hồ sơ Pháp lý & Kiểm dịch (LEGAL_MEDICAL_RECORD)</h1>
            <p className="customer-subtitle" style={{ margin: 0 }}>
              Hạn chót chuyến đi: <strong>{committedDeadline}</strong>
            </p>
          </div>
          <button type="button" className="btn-export">
            ⬇ Xuất gói ZIP/PDF đi đường
          </button>
        </div>

        {records.map((rec) => (
          <div key={rec.recordId} className="doc-item">
            <div>
              <strong>{rec.documentType}</strong>
              <p className="estimate-banner-sub">
                Ngày hết hạn: {rec.expiryDate} • Trạng thái: <strong>{rec.documentStatus}</strong>
              </p>
              {!rec.physicalCopyReceived && (
                <p className="text-danger">
                  🚨 Chưa nhận bản cứng gốc để bàn giao cho Tài xế/Escort!
                </p>
              )}
            </div>

            <div className="doc-actions">
              <label className="physical-check-label">
                <input
                  type="checkbox"
                  checked={rec.physicalCopyReceived}
                  onChange={() => togglePhysical(rec.recordId)}
                />
                Đã nhận bản gốc
              </label>
              <button type="button" className="btn-primary" onClick={() => approveDoc(rec.recordId)}>
                Duyệt chứng từ
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};