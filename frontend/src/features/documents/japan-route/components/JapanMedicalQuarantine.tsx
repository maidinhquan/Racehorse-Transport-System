import React, { ChangeEvent } from 'react';
import type {
  BloodTestItem,
  VaccinationEntry,
  MedicalApproval,
} from '../types/japanRoute.types';

interface JapanMedicalQuarantineProps {
  bloodTests: Record<'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV', BloodTestItem>;
  onBloodTestChange: (
    diseaseKey: 'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV',
    field: keyof BloodTestItem,
    value: unknown
  ) => void;
  onBloodTestImageUpload: (
    diseaseKey: 'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV',
    file: File | null
  ) => void;

  vaccinations: VaccinationEntry[];
  onAddVaccination: () => void;
  onVaccinationChange: (
    id: string,
    field: keyof VaccinationEntry,
    value: string
  ) => void;
  onRemoveVaccination: (id: string) => void;

  vaccinationBookImages: { id: string; url: string; name: string }[];
  onVaccinationBookUpload: (files: FileList | null) => void;
  onRemoveVaccineImage: (id: string) => void;

  medicalApproval: MedicalApproval;
  onMedicalApprovalChange: (field: keyof MedicalApproval, value: unknown) => void;
  onOfficialCertUpload: (file: File | null) => void;

  onOpenZoom: (url: string, title: string) => void;
}

export const JapanMedicalQuarantine: React.FC<JapanMedicalQuarantineProps> = ({
  bloodTests,
  onBloodTestChange,
  onBloodTestImageUpload,
  vaccinations,
  onAddVaccination,
  onVaccinationChange,
  onRemoveVaccination,
  vaccinationBookImages,
  onVaccinationBookUpload,
  onRemoveVaccineImage,
  medicalApproval,
  onMedicalApprovalChange,
  onOfficialCertUpload,
  onOpenZoom,
}) => {
  const diseases: Array<'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV'> = [
    'EIA',
    'EVA',
    'Piroplasmosis',
    'WNV',
  ];

  const hasAnyPositive = diseases.some((d) => bloodTests[d].status === 'Positive');
  const allNegative = diseases.every((d) => bloodTests[d].status === 'Negative');
  const allHaveImages = diseases.every((d) => !!bloodTests[d].filePreviewUrl);

  const handleTestFileInput = (
    key: 'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV',
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] || null;
    onBloodTestImageUpload(key, file);
  };

  const handleMultiVaccineUpload = (e: ChangeEvent<HTMLInputElement>) => {
    onVaccinationBookUpload(e.target.files);
  };

  const handleCertFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onOfficialCertUpload(file);
  };

  return (
    <div className="jp-module-section">
      <div className="jp-section-header">
        <div className="jp-section-badge jp-badge-red">Phân hệ 2</div>
        <h2 className="jp-section-title">Y tế & Kiểm dịch Xuất/Nhập cảnh (Medical & Quarantine)</h2>
        <p className="jp-section-desc">
          Kiểm soát nghiêm ngặt 4 bệnh truyền nhiễm bắt buộc đối với ngựa nhập cảnh Nhật Bản, đối chiếu hình ảnh phiếu xét nghiệm máu thực tế và cấp phép y tế xuất cảnh.
        </p>
      </div>

      {/* Cảnh báo cứng nếu có ca Dương Tính */}
      {hasAnyPositive && (
        <div className="jp-alert jp-alert-danger jp-alert-large">
          <div className="jp-alert-icon">🚫</div>
          <div>
            <h4 className="jp-alert-title">CẢNH BÁO TỪ CHỐI NHẬP CẢNH NHẬT BẢN</h4>
            <p>
              Phát hiện kết quả xét nghiệm <strong>DƯƠNG TÍNH</strong> với một trong các bệnh cấm. Theo quy định AQS Nhật Bản, cá thể này <strong>BỊ TỪ CHỐI XUẤT CẢNH</strong> ngay lập tức để tránh lây nhiễm dịch tễ.
            </p>
          </div>
        </div>
      )}

      {/* 1. Khối 4 Bệnh xét nghiệm máu */}
      <div className="jp-card">
        <div className="jp-card-header-flex">
          <h3 className="jp-card-title">
            <span className="jp-icon">🔬</span> Phiếu xét nghiệm máu & Khai báo kiểm dịch (4 Bệnh bắt buộc)
          </h3>
          <span className="jp-status-pill">
            {allNegative && allHaveImages
              ? '✅ 4/4 Bệnh Âm tính & Đủ ảnh'
              : hasAnyPositive
              ? '❌ Có bệnh Dương tính'
              : '⏳ Đang chờ hoàn thiện'}
          </span>
        </div>

        <p className="jp-card-subdesc">
          Quy chuẩn AQS Nhật Bản yêu cầu đầy đủ 4 xét nghiệm: EIA (Thiếu máu truyền nhiễm), EVA (Viêm động mạch), Piroplasmosis (Ký sinh trùng Babesia), WNV (Virus Tây Sông Nile). Đính kèm hình ảnh rõ nét để đối chiếu dấu mộc.
        </p>

        <div className="jp-disease-grid">
          {diseases.map((key) => {
            const item = bloodTests[key];
            return (
              <div
                key={key}
                className={`jp-disease-card ${
                  item.status === 'Positive'
                    ? 'jp-disease-positive'
                    : item.status === 'Negative'
                    ? 'jp-disease-negative'
                    : ''
                }`}
              >
                <div className="jp-disease-header">
                  <div>
                    <h4 className="jp-disease-name">{item.diseaseName}</h4>
                    <span className="jp-disease-code">Mã: {key}</span>
                  </div>
                  <span
                    className={`jp-status-tag ${
                      item.status === 'Negative'
                        ? 'tag-negative'
                        : item.status === 'Positive'
                        ? 'tag-positive'
                        : 'tag-pending'
                    }`}
                  >
                    {item.status === 'Negative'
                      ? 'Âm tính (Passed)'
                      : item.status === 'Positive'
                      ? 'Dương tính (Failed)'
                      : 'Đang chờ kết quả'}
                  </span>
                </div>

                <div className="jp-disease-body">
                  <div className="jp-form-group">
                    <label className="jp-label">Kết quả xét nghiệm:</label>
                    <select
                      className="jp-select"
                      value={item.status}
                      onChange={(e) =>
                        onBloodTestChange(key, 'status', e.target.value)
                      }
                    >
                      <option value="Pending">Đang chờ kết quả xét nghiệm</option>
                      <option value="Negative">Âm tính (Negative - Đạt)</option>
                      <option value="Positive">Dương tính (Positive - Không đạt)</option>
                    </select>
                  </div>

                  <div className="jp-form-group">
                    <label className="jp-label">Ngày lấy mẫu xét nghiệm:</label>
                    <input
                      type="date"
                      className="jp-input"
                      value={item.samplingDate}
                      onChange={(e) =>
                        onBloodTestChange(key, 'samplingDate', e.target.value)
                      }
                    />
                  </div>

                  <div className="jp-form-group">
                    <label className="jp-label">Cơ sở / Phòng xét nghiệm chỉ định:</label>
                    <input
                      type="text"
                      className="jp-input"
                      placeholder="VD: Trung tâm Chẩn đoán Thú y TW"
                      value={item.laboratoryName}
                      onChange={(e) =>
                        onBloodTestChange(key, 'laboratoryName', e.target.value)
                      }
                    />
                  </div>

                  {/* Khu vực Upload ảnh phiếu xét nghiệm */}
                  <div className="jp-upload-disease-box">
                    <label className="jp-label">
                      Ảnh chụp phiếu xét nghiệm máu thực tế: <span className="jp-required">*</span>
                    </label>

                    {item.filePreviewUrl ? (
                      <div className="jp-image-preview-card">
                        <img
                          src={item.filePreviewUrl}
                          alt={item.diseaseName}
                          className="jp-thumb-img"
                          onClick={() =>
                            onOpenZoom(item.filePreviewUrl!, `Phiếu xét nghiệm ${item.diseaseName}`)
                          }
                        />
                        <div className="jp-thumb-actions">
                          <button
                            type="button"
                            className="jp-btn-action jp-btn-zoom"
                            onClick={() =>
                              onOpenZoom(item.filePreviewUrl!, `Phiếu xét nghiệm ${item.diseaseName}`)
                            }
                            title="Phóng to xem chi tiết"
                          >
                            🔍 Phóng to
                          </button>
                          <label
                            htmlFor={`replace-file-${key}`}
                            className="jp-btn-action jp-btn-replace"
                            title="Tải lại ảnh mới"
                          >
                            🔄 Đổi ảnh
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            id={`replace-file-${key}`}
                            className="jp-file-hidden"
                            onChange={(e) => handleTestFileInput(key, e)}
                          />
                          <button
                            type="button"
                            className="jp-btn-action jp-btn-delete"
                            onClick={() => onBloodTestImageUpload(key, null)}
                            title="Xóa ảnh"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="jp-dropzone-box">
                        <input
                          type="file"
                          accept="image/*"
                          id={`upload-file-${key}`}
                          className="jp-file-hidden"
                          onChange={(e) => handleTestFileInput(key, e)}
                        />
                        <label htmlFor={`upload-file-${key}`} className="jp-dropzone-label">
                          📷 Tải lên ảnh phiếu xét nghiệm
                        </label>
                        <span className="jp-dropzone-hint">Định dạng JPG, PNG (Có dấu mộc rõ nét)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Khối Hồ sơ tiêm chủng */}
      <div className="jp-card">
        <div className="jp-card-header-flex">
          <h3 className="jp-card-title">
            <span className="jp-icon">💉</span> Khối Hồ sơ Tiêm chủng (Vaccination Record)
          </h3>
          <button
            type="button"
            className="jp-btn-add"
            onClick={onAddVaccination}
          >
            ➕ Thêm mũi tiêm
          </button>
        </div>

        {/* Bảng nhập danh sách mũi tiêm */}
        <div className="jp-table-wrapper">
          <table className="jp-table">
            <thead>
              <tr>
                <th>Tên Vaccine</th>
                <th>Ngày tiêm</th>
                <th>Số lô (Batch No.)</th>
                <th>Bác sĩ thú y tiêm</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {vaccinations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="jp-empty-cell">
                    Chưa có lịch sử tiêm chủng. Nhấp vào "Thêm mũi tiêm" để khai báo (Bắt buộc Cúm ngựa Equine Influenza).
                  </td>
                </tr>
              ) : (
                vaccinations.map((vac) => (
                  <tr key={vac.id}>
                    <td>
                      <input
                        type="text"
                        className="jp-table-input"
                        placeholder="VD: Equine Influenza"
                        value={vac.vaccineName}
                        onChange={(e) =>
                          onVaccinationChange(vac.id, 'vaccineName', e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        className="jp-table-input"
                        value={vac.administeredDate}
                        onChange={(e) =>
                          onVaccinationChange(vac.id, 'administeredDate', e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="jp-table-input"
                        placeholder="Số lô vaccine"
                        value={vac.batchNumber}
                        onChange={(e) =>
                          onVaccinationChange(vac.id, 'batchNumber', e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="jp-table-input"
                        placeholder="Tên bác sĩ"
                        value={vac.veterinarian}
                        onChange={(e) =>
                          onVaccinationChange(vac.id, 'veterinarian', e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="jp-btn-delete-row"
                        onClick={() => onRemoveVaccination(vac.id)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Tải nhiều ảnh chụp các trang sổ tiêm ngừa */}
        <div className="jp-multi-upload-box">
          <label className="jp-label">
            Ảnh chụp các trang sổ tiêm phòng thực tế (Multi-image Upload):
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            id="vaccine-multi-files"
            className="jp-file-hidden"
            onChange={handleMultiVaccineUpload}
          />
          <label htmlFor="vaccine-multi-files" className="jp-upload-btn">
            📚 Tải lên nhiều ảnh trang sổ tiêm ngừa
          </label>

          {vaccinationBookImages.length > 0 && (
            <div className="jp-image-gallery">
              {vaccinationBookImages.map((img) => (
                <div key={img.id} className="jp-gallery-item">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="jp-gallery-thumb"
                    onClick={() => onOpenZoom(img.url, img.name)}
                  />
                  <div className="jp-gallery-overlay">
                    <button
                      type="button"
                      className="jp-gallery-btn"
                      onClick={() => onOpenZoom(img.url, img.name)}
                    >
                      🔍
                    </button>
                    <button
                      type="button"
                      className="jp-gallery-btn btn-del"
                      onClick={() => onRemoveVaccineImage(img.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Khối Phê duyệt của Bên Y tế */}
      <div className="jp-card jp-card-approval">
        <h3 className="jp-card-title">
          <span className="jp-icon">👨‍⚕️</span> Khối Phê duyệt của Bên Y tế (Medical Authority Approval)
        </h3>
        <p className="jp-card-subdesc">
          Dành riêng cho Bác sĩ thú y / Chuyên viên kiểm dịch xác nhận đạt chuẩn xuất cảnh sang Nhật Bản.
        </p>

        <div className="jp-approval-checks">
          <label className="jp-checkbox-row">
            <input
              type="checkbox"
              checked={medicalApproval.isQuarantineEligible}
              onChange={(e) =>
                onMedicalApprovalChange('isQuarantineEligible', e.target.checked)
              }
            />
            <span>
              <strong>Xác nhận: Cách ly đủ điều kiện</strong> (Đã hoàn thành cách ly kiểm dịch nghiêm ngặt trước xuất cảnh).
            </span>
          </label>

          <label className="jp-checkbox-row">
            <input
              type="checkbox"
              checked={medicalApproval.allFourTestsPassed}
              onChange={(e) =>
                onMedicalApprovalChange('allFourTestsPassed', e.target.checked)
              }
            />
            <span>
              <strong>Xác nhận tổng hợp kết quả đạt chuẩn của 4 bệnh</strong> (EIA, EVA, Piroplasmosis, WNV đều Âm tính).
            </span>
          </label>
        </div>

        <div className="jp-grid-2" style={{ marginTop: '16px' }}>
          <div className="jp-form-group">
            <label className="jp-label">Bác sĩ / Chuyên viên ký duyệt:</label>
            <input
              type="text"
              className="jp-input"
              placeholder="Họ tên Bác sĩ thú y phụ trách kiểm dịch"
              value={medicalApproval.approvedByDoctor}
              onChange={(e) =>
                onMedicalApprovalChange('approvedByDoctor', e.target.value)
              }
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Số hiệu Giấy chứng nhận kiểm dịch xuất khẩu:</label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: CTY-KDDK-2026/089"
              value={medicalApproval.officialCertNumber}
              onChange={(e) =>
                onMedicalApprovalChange('officialCertNumber', e.target.value)
              }
            />
          </div>
        </div>

        {/* Cấp chứng nhận y tế có mộc đỏ */}
        <div className="jp-upload-box" style={{ marginTop: '12px' }}>
          <label className="jp-label">
            Tải lên bản scan Giấy chứng nhận y tế chính thức (Có mộc đỏ Cục Thú y):
          </label>
          <div className="jp-upload-area">
            <input
              type="file"
              accept="image/*,application/pdf"
              id="official-cert-file"
              className="jp-file-hidden"
              onChange={handleCertFileInput}
            />
            <label htmlFor="official-cert-file" className="jp-upload-btn">
              🏛️ Tải lên Giấy chứng nhận mộc đỏ
            </label>
            {medicalApproval.officialCertFileName && (
              <div className="jp-file-preview-row">
                <span className="jp-file-name">📄 {medicalApproval.officialCertFileName}</span>
                {medicalApproval.officialCertPreviewUrl && (
                  <button
                    type="button"
                    className="jp-btn-view"
                    onClick={() =>
                      onOpenZoom(
                        medicalApproval.officialCertPreviewUrl!,
                        'Giấy chứng nhận kiểm dịch mộc đỏ chính thức'
                      )
                    }
                  >
                    🔍 Xem mộc đỏ
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
