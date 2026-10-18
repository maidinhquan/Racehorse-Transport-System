import React, { useState, type ChangeEvent } from 'react';
import type {
  JapanInternationalPermitsData,
  DocumentAttachment,
} from '../types/japanRoute.types';

interface JapanInternationalPermitsProps {
  data: JapanInternationalPermitsData;
  onChange: (updater: (prev: JapanInternationalPermitsData) => JapanInternationalPermitsData) => void;
  onOpenZoom: (url: string, title: string) => void;
  isReadOnly?: boolean;
}

export const JapanInternationalPermits: React.FC<JapanInternationalPermitsProps> = ({
  data,
  onChange,
  onOpenZoom,
  isReadOnly = false,
}) => {
  const [showAqsPermitPreview, setShowAqsPermitPreview] = useState(false);

  // Helper upload file
  const handleFileUpload = (
    sectionKey: 'temporaryImportPermit' | 'medicalAndTestingRequirements',
    fileListKey: 'permitFiles' | 'requirementFiles',
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: DocumentAttachment[] = Array.from(files).map((file, idx) => ({
      id: `${sectionKey}-${Date.now()}-${idx}`,
      name: file.name,
      url: URL.createObjectURL(file),
      size: `${(file.size / 1024).toFixed(1)} KB`,
      uploadedAt: new Date().toLocaleDateString('vi-VN'),
    }));

    onChange((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [fileListKey]: [...(prev[sectionKey] as any)[fileListKey], ...newAttachments],
      },
    }));
  };

  const handleRemoveFile = (
    sectionKey: 'temporaryImportPermit' | 'medicalAndTestingRequirements',
    fileListKey: 'permitFiles' | 'requirementFiles',
    fileId: string
  ) => {
    onChange((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [fileListKey]: (prev[sectionKey] as any)[fileListKey].filter((f: DocumentAttachment) => f.id !== fileId),
      },
    }));
  };

  const { temporaryImportPermit, medicalAndTestingRequirements } = data;

  return (
    <div className="jp-module-section">
      {/* Tiêu đề Phân hệ */}
      <div className="jp-section-header">
        <div className="jp-section-badge jp-badge-red">MỤC 2 - ĐẦU VÀO TỪ NHẬT BẢN</div>
        <h2 className="jp-section-title">
          🇯🇵 Giấy Tờ Quốc Tế (Cấp Bởi Nhật Bản - Khách Hàng Phải Có Sẵn Làm Đầu Vào)
        </h2>
        <p className="jp-section-desc">
          Các văn bản pháp lý tiên quyết do Bộ Nông Lâm Thủy Sản Nhật Bản (MAFF) và Cục Kiểm Dịch Động Vật Nhật Bản (AQS) ban hành. Đây là điều kiện bắt buộc mà chủ hàng phải cung cấp trước để Cơ quan Thú Y Việt Nam lấy mẫu máu chuẩn và Hải quan cấp phép tạm xuất.
        </p>
      </div>

      {/* Banner Xem trước Giấy phép AQS MAFF */}
      <div className="jp-action-banner-card jp-banner-dark">
        <div className="jp-action-banner-text">
          <span className="jp-banner-icon">⛩️</span>
          <div>
            <strong>Giấy Phép Nhập Khẩu Tạm Thời (Temporary Import Permit - AQS MAFF)</strong>
            <p>
              Mã hồ sơ AQS: <strong>{temporaryImportPermit.permitNumber || 'Chưa cập nhật mã'}</strong> | Cơ quan cấp: {temporaryImportPermit.issuingAgency}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="jp-btn-primary jp-btn-lg"
          onClick={() => setShowAqsPermitPreview(true)}
        >
          📄 Xem Giấy Phép Nhập Khẩu AQS Nhật Bản
        </button>
      </div>

      {/* 2.1. GIẤY PHÉP NHẬP KHẨU TẠM THỜI */}
      <div className="jp-card">
        <div className="jp-card-header-flex">
          <div>
            <h3 className="jp-card-title">
              <span className="jp-icon">📜</span> 2.1. Giấy Phép Nhập Khẩu Tạm Thời (Temporary Import Permit)
            </h3>
            <p className="jp-card-subtitle">
              Văn bản chấp thuận chính thức cho phép con ngựa nhập cảnh tạm thời vào Nhật Bản để thi đấu và cam kết đưa trở lại Việt Nam.
            </p>
          </div>
          <span className="jp-badge-mandatory">ĐẦU VÀO TIÊN QUYẾT</span>
        </div>

        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">Số Giấy phép AQS do Nhật cấp: <span className="jp-required">*</span></label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: AQS-MAFF-TIP-2026-JP9902"
              value={temporaryImportPermit.permitNumber}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  temporaryImportPermit: { ...prev.temporaryImportPermit, permitNumber: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Cơ quan Thẩm quyền Nhật Bản cấp:</label>
            <input
              type="text"
              className="jp-input jp-input-readonly"
              value={temporaryImportPermit.issuingAgency}
              readOnly
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Ngày cấp giấy phép: <span className="jp-required">*</span></label>
            <input
              type="date"
              className="jp-input"
              value={temporaryImportPermit.issueDate}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  temporaryImportPermit: { ...prev.temporaryImportPermit, issueDate: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">Thời hạn hiệu lực từ ngày: <span className="jp-required">*</span></label>
            <input
              type="date"
              className="jp-input"
              value={temporaryImportPermit.validFrom}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  temporaryImportPermit: { ...prev.temporaryImportPermit, validFrom: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Hiệu lực đến ngày (Thời hạn tái xuất bắt buộc): <span className="jp-required">*</span></label>
            <input
              type="date"
              className="jp-input"
              value={temporaryImportPermit.validUntil}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  temporaryImportPermit: { ...prev.temporaryImportPermit, validUntil: e.target.value },
                }))
              }
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Trạm kiểm dịch động vật đến tại Nhật:</label>
            <select
              className="jp-select"
              value={temporaryImportPermit.quarantineStationJP}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  temporaryImportPermit: { ...prev.temporaryImportPermit, quarantineStationJP: e.target.value },
                }))
              }
              disabled={isReadOnly}
            >
              <option value="AQS Narita Airport Sub-station (Tokyo)">AQS Narita Airport Sub-station (Tokyo)</option>
              <option value="AQS Kansai Airport Sub-station (Osaka)">AQS Kansai Airport Sub-station (Osaka)</option>
              <option value="AQS Haneda Airport Office (Tokyo)">AQS Haneda Airport Office (Tokyo)</option>
            </select>
          </div>
        </div>

        <div className="jp-form-group">
          <label className="jp-label">Mục đích nhập cảnh được MAFF chấp thuận:</label>
          <input
            type="text"
            className="jp-input"
            value={temporaryImportPermit.permittedPurpose}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                temporaryImportPermit: { ...prev.temporaryImportPermit, permittedPurpose: e.target.value },
              }))
            }
            disabled={isReadOnly}
          />
        </div>

        <div className="jp-form-group">
          <label className="jp-checkbox-label">
            <input
              type="checkbox"
              checked={temporaryImportPermit.complianceCommitmentAgreed}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  temporaryImportPermit: {
                    ...prev.temporaryImportPermit,
                    complianceCommitmentAgreed: e.target.checked,
                  },
                }))
              }
              disabled={isReadOnly}
            />
            <span>
              <strong>Cam kết pháp lý quốc tế:</strong> Chủ hàng và đơn vị vận chuyển cam kết con ngựa sẽ được vận chuyển khép kín, kiểm dịch nghiêm ngặt và bắt buộc tái xuất trở lại Việt Nam sau khi hoàn thành giải đấu, không chuyển giao hay lưu giữ quá hạn trên lãnh thổ Nhật Bản.
            </span>
          </label>
        </div>

        {/* Upload File Giấy phép nhập khẩu */}
        <div className="jp-subcard">
          <div className="jp-subcard-header">
            <h4>Bản scan Giấy phép Nhập khẩu Tạm thời AQS MAFF (PDF / Ảnh rõ nét)</h4>
            {!isReadOnly && (
              <label className="jp-btn-upload">
                📤 Tải lên bản scan Giấy phép Nhật Bản
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/*"
                  onChange={(e) => handleFileUpload('temporaryImportPermit', 'permitFiles', e)}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          {temporaryImportPermit.permitFiles.length === 0 ? (
            <div className="jp-empty-upload-box jp-empty-danger">
              ⚠️ Khách hàng bắt buộc phải tải lên Giấy phép nhập khẩu tạm thời từ Nhật Bản để làm đầu vào cho toàn bộ quy trình!
            </div>
          ) : (
            <div className="jp-tag-list">
              {temporaryImportPermit.permitFiles.map((doc) => (
                <span key={doc.id} className="jp-file-tag jp-file-tag-success" onClick={() => onOpenZoom(doc.url, doc.name)}>
                  📜 {doc.name} ({doc.size})
                  {!isReadOnly && (
                    <button
                      type="button"
                      className="jp-tag-close"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile('temporaryImportPermit', 'permitFiles', doc.id);
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2.2. HỒ SƠ Y TẾ / YÊU CẦU XÉT NGHIỆM TỪ NHẬT */}
      <div className="jp-card">
        <h3 className="jp-card-title">
          <span className="jp-icon">🔬</span> 2.2. Hồ Sơ Y Tế / Yêu Cầu Xét Nghiệm Từ Nhật Bản (MAFF Veterinary Health Protocol)
        </h3>
        <p className="jp-card-subtitle">
          Các chỉ tiêu bệnh mẫu máu/xét nghiệm cụ thể mà cơ quan thú y Nhật Bản bắt buộc con ngựa phải đạt được trước khi đặt chân đến lãnh thổ Nhật.
        </p>

        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">Mã quy chuẩn kiểm dịch y tế MAFF:</label>
            <input
              type="text"
              className="jp-input jp-input-readonly"
              value={medicalAndTestingRequirements.standardDocumentCode}
              readOnly
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Thời hạn lấy mẫu máu trước khi bay: <span className="jp-required">*</span></label>
            <div className="jp-input-stat">
              ⏱️ Trong vòng <strong>{medicalAndTestingRequirements.samplingWindowDays} ngày</strong> trước ngày khởi hành
            </div>
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Phòng xét nghiệm chuẩn OIE/MAFF chỉ định:</label>
            <input
              type="text"
              className="jp-input jp-input-readonly"
              value={medicalAndTestingRequirements.designatedLaboratories}
              readOnly
            />
          </div>
        </div>

        {/* Bảng Chi tiết 4 Bệnh Máu Bắt Buộc Theo Tiêu Chuẩn Nhật */}
        <div className="jp-subcard">
          <h4 style={{ marginBottom: '12px' }}>
            4 Bệnh máu bắt buộc theo quy chuẩn kiểm dịch Nhật Bản (MAFF Quarantine Criteria):
          </h4>
          <div className="jp-table-wrapper">
            <table className="jp-table">
              <thead>
                <tr>
                  <th>Mã bệnh</th>
                  <th>Tên bệnh (Tiếng Việt / Quốc Tế)</th>
                  <th>Phương pháp xét nghiệm yêu cầu</th>
                  <th>Tiêu chuẩn kết quả</th>
                  <th>Tuân thủ</th>
                </tr>
              </thead>
              <tbody>
                {medicalAndTestingRequirements.mandatoryDiseases.map((dis) => (
                  <tr key={dis.key}>
                    <td>
                      <span className="jp-badge-code">{dis.key}</span>
                    </td>
                    <td>
                      <strong>{dis.diseaseNameVi}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{dis.diseaseNameEn}</div>
                    </td>
                    <td>
                      <code>{dis.standardMethod}</code>
                    </td>
                    <td>
                      <span className="jp-status-pill status-negative">
                        {dis.requiredResult}
                      </span>
                    </td>
                    <td>
                      <span className="jp-check-icon">✅ Bắt buộc</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="jp-form-group" style={{ marginTop: '16px' }}>
          <label className="jp-label">Yêu cầu lâm sàng chung và điều kiện cách ly từ MAFF:</label>
          <textarea
            rows={3}
            className="jp-textarea"
            value={medicalAndTestingRequirements.generalHealthRequirements}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                medicalAndTestingRequirements: {
                  ...prev.medicalAndTestingRequirements,
                  generalHealthRequirements: e.target.value,
                },
              }))
            }
            disabled={isReadOnly}
          />
        </div>
      </div>

      {/* MODAL XEM TRƯỚC GIẤY PHÉP NHẬP KHẨU AQS MAFF NHẬT BẢN */}
      {showAqsPermitPreview && (
        <div className="jp-modal-overlay" onClick={() => setShowAqsPermitPreview(false)}>
          <div className="jp-modal-container jp-modal-printable" onClick={(e) => e.stopPropagation()}>
            <div className="jp-modal-header">
              <h3>BẢN XEM TRƯỚC: GIẤY PHÉP NHẬP KHẨU TẠM THỜI (AQS - MAFF JAPAN)</h3>
              <button
                type="button"
                className="jp-modal-close"
                onClick={() => setShowAqsPermitPreview(false)}
              >
                ✕
              </button>
            </div>

            <div className="jp-official-paper">
              <div className="jp-paper-header-grid">
                <div className="jp-paper-org">
                  <strong>MINISTRY OF AGRICULTURE, FORESTRY AND FISHERIES</strong>
                  <div style={{ fontWeight: 700 }}>ANIMAL QUARANTINE SERVICE (AQS) - JAPAN</div>
                  <div style={{ marginTop: '4px', fontSize: '11px' }}>
                    Permit No: <strong>{temporaryImportPermit.permitNumber || 'AQS-TEMP-DRAFT'}</strong>
                  </div>
                </div>
                <div className="jp-paper-motto">
                  <strong>TEMPORARY IMPORT PERMIT</strong>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>(For Sport Horses Participating in International Events)</div>
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>
                    Issue Date: {temporaryImportPermit.issueDate || 'YYYY-MM-DD'}
                  </div>
                </div>
              </div>

              <div className="jp-paper-body" style={{ marginTop: '16px' }}>
                <p>
                  <strong>To:</strong> Consignor / Racehorse Owner (Vietnam) & Authorized Equine Escort Team
                </p>
                <p>
                  This official document certifies that permission is granted for the temporary entry of the equine described below into Japan under strict veterinary quarantine supervision of the Animal Quarantine Service:
                </p>

                <div className="jp-grid-2" style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', margin: '12px 0' }}>
                  <div>
                    <strong>Purpose of Stay:</strong> {temporaryImportPermit.permittedPurpose}<br />
                    <strong>Designated Port of Entry:</strong> {temporaryImportPermit.quarantineStationJP}<br />
                    <strong>Validity Period:</strong> {temporaryImportPermit.validFrom || '...'} to {temporaryImportPermit.validUntil || '...'}
                  </div>
                  <div>
                    <strong>Reference Health Protocol:</strong> {medicalAndTestingRequirements.standardDocumentCode}<br />
                    <strong>Designated Laboratory:</strong> {medicalAndTestingRequirements.designatedLaboratories}<br />
                    <strong>Mandatory Blood Tests:</strong> EIA, EVA, Equine Piroplasmosis, WNV
                  </div>
                </div>

                <div style={{ borderLeft: '4px solid #b91c1c', paddingLeft: '12px', margin: '14px 0' }}>
                  <strong>MANDATORY RE-EXPORTATION CONDITION:</strong><br />
                  The equine subject to this permit must be kept isolated from Japanese native equine populations, transported solely in sanitized designated vehicles, and MUST be re-exported to Vietnam immediately upon the conclusion of the sporting event.
                </div>
              </div>

              <div className="jp-paper-signatures">
                <div className="jp-sig-box">
                  <strong>MINISTRY OF AGRICULTURE, FORESTRY AND FISHERIES</strong>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>Animal Quarantine Service Official Stamp</div>
                  <div className="jp-sig-stamp-simulated">
                    <span>MAFF JAPAN</span>
                    <span>★ AQS NARITA ★</span>
                    <span>PERMIT APPROVED</span>
                    <span>ANIMAL QUARANTINE</span>
                  </div>
                  <div>Chief Veterinary Quarantine Inspector (Narita/Kansai AQS)</div>
                </div>

                <div className="jp-sig-box">
                  <strong>IMPORTER / DESIGNATED RECEPTION PARTY</strong>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>(Japan Representative Acceptance)</div>
                  <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <em style={{ color: '#0369a1', fontFamily: 'cursive', fontSize: '18px' }}>AQS Liaison Tokyo</em>
                  </div>
                  <strong>Japan Racing Association / AQS Agent</strong>
                </div>
              </div>
            </div>

            <div className="jp-modal-footer">
              <button
                type="button"
                className="jp-btn-secondary"
                onClick={() => setShowAqsPermitPreview(false)}
              >
                Đóng lại
              </button>
              <button
                type="button"
                className="jp-btn-primary"
                onClick={() => window.print()}
              >
                🖨️ In Giấy Phép AQS Nhật Bản
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
