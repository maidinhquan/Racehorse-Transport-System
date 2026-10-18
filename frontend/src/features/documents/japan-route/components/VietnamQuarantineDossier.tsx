import React, { useState, type ChangeEvent } from 'react';
import type {
  VietnamQuarantineDossierData,
  DocumentAttachment,
} from '../types/japanRoute.types';

interface VietnamQuarantineDossierProps {
  data: VietnamQuarantineDossierData;
  onChange: (updater: (prev: VietnamQuarantineDossierData) => VietnamQuarantineDossierData) => void;
  onOpenZoom: (url: string, title: string) => void;
  isReadOnly?: boolean;
}

export const VietnamQuarantineDossier: React.FC<VietnamQuarantineDossierProps> = ({
  data,
  onChange,
  onOpenZoom,
  isReadOnly = false,
}) => {
  const [showPreviewForm01, setShowPreviewForm01] = useState(false);

  // Cập nhật thông tin Đơn kiểm dịch
  const handleAppChange = (field: keyof VietnamQuarantineDossierData['quarantineApplication'], value: unknown) => {
    onChange((prev) => ({
      ...prev,
      quarantineApplication: {
        ...prev.quarantineApplication,
        [field]: value,
      },
    }));
  };

  // Cập nhật thông tin Hộ chiếu & Vi mạch
  const handlePassportChange = (field: keyof VietnamQuarantineDossierData['passportAndVaccine'], value: unknown) => {
    onChange((prev) => ({
      ...prev,
      passportAndVaccine: {
        ...prev.passportAndVaccine,
        [field]: value,
      },
    }));
  };

  // Upload scan hộ chiếu ngựa
  const handlePassportUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: DocumentAttachment[] = Array.from(files).map((file, idx) => ({
      id: `pass-scan-${Date.now()}-${idx}`,
      name: file.name,
      url: URL.createObjectURL(file),
      size: `${(file.size / 1024).toFixed(1)} KB`,
      uploadedAt: new Date().toLocaleDateString('vi-VN'),
      pageDesc: `Trang hộ chiếu ${data.passportAndVaccine.passportScans.length + idx + 1}`,
    }));

    onChange((prev) => ({
      ...prev,
      passportAndVaccine: {
        ...prev.passportAndVaccine,
        passportScans: [...prev.passportAndVaccine.passportScans, ...newAttachments],
      },
    }));
  };

  const handleRemovePassportScan = (id: string) => {
    onChange((prev) => ({
      ...prev,
      passportAndVaccine: {
        ...prev.passportAndVaccine,
        passportScans: prev.passportAndVaccine.passportScans.filter((item) => item.id !== id),
      },
    }));
  };

  // Thêm dòng tiêm phòng
  const handleAddVaccine = () => {
    const newEntry = {
      id: `vac-${Date.now()}`,
      vaccineName: 'Equine Influenza (Cúm ngựa bắt buộc)',
      administeredDate: new Date().toISOString().split('T')[0],
      validUntil: '',
      batchNumber: '',
      veterinarian: 'BSTY. Kiểm dịch',
      clinicAuthority: 'Chi cục Thú y',
    };
    onChange((prev) => ({
      ...prev,
      passportAndVaccine: {
        ...prev.passportAndVaccine,
        vaccinationHistory: [...prev.passportAndVaccine.vaccinationHistory, newEntry],
      },
    }));
  };

  const handleVaccineEntryChange = (id: string, field: string, value: string) => {
    onChange((prev) => ({
      ...prev,
      passportAndVaccine: {
        ...prev.passportAndVaccine,
        vaccinationHistory: prev.passportAndVaccine.vaccinationHistory.map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const handleRemoveVaccine = (id: string) => {
    onChange((prev) => ({
      ...prev,
      passportAndVaccine: {
        ...prev.passportAndVaccine,
        vaccinationHistory: prev.passportAndVaccine.vaccinationHistory.filter((item) => item.id !== id),
      },
    }));
  };

  // Upload Sổ tiêm vắc xin
  const handleVaccineBookUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: DocumentAttachment[] = Array.from(files).map((file, idx) => ({
      id: `vac-book-${Date.now()}-${idx}`,
      name: file.name,
      url: URL.createObjectURL(file),
      size: `${(file.size / 1024).toFixed(1)} KB`,
      uploadedAt: new Date().toLocaleDateString('vi-VN'),
    }));

    onChange((prev) => ({
      ...prev,
      passportAndVaccine: {
        ...prev.passportAndVaccine,
        vaccinationBookScans: [...prev.passportAndVaccine.vaccinationBookScans, ...newAttachments],
      },
    }));
  };


  const { quarantineApplication, passportAndVaccine, japanQuarantineRegulations } = data;

  // Tính số ngày cách ly dự kiến
  const daysDiff = React.useMemo(() => {
    if (!quarantineApplication.quarantineStartDate || !quarantineApplication.quarantineEndDate) return 0;
    const start = new Date(quarantineApplication.quarantineStartDate).getTime();
    const end = new Date(quarantineApplication.quarantineEndDate).getTime();
    const days = Math.round((end - start) / (1000 * 3600 * 24));
    return days >= 0 ? days : 0;
  }, [quarantineApplication.quarantineStartDate, quarantineApplication.quarantineEndDate]);

  return (
    <div className="jp-module-section">
      {/* Tiêu đề Phân hệ */}
      <div className="jp-section-header">
        <div className="jp-section-badge jp-badge-red">MỤC 1.1 - NỘI ĐỊA VIỆT NAM</div>
        <h2 className="jp-section-title">
          🇻🇳 Hồ sơ Kiểm dịch Thú y Xuất khẩu (Cổng Một Cửa Quốc Gia & Bản Cứng)
        </h2>
        <p className="jp-section-desc">
          Xử lý toàn bộ giấy tờ kiểm dịch động vật phục vụ nộp điện tử qua Cổng Một cửa quốc gia (NSW) và xuất trình bản cứng tại Chi cục Thú y Vùng trước khi cá thể ngựa xuất cảnh đi Nhật Bản.
        </p>
      </div>

      {/* Thanh công cụ xem trước Mẫu 01 */}
      <div className="jp-action-banner-card">
        <div className="jp-action-banner-text">
          <span className="jp-banner-icon">📝</span>
          <div>
            <strong>Đơn Đăng Ký Kiểm Dịch Động Vật Xuất Khẩu (Mẫu số 01 / CCTY)</strong>
            <p>Hệ thống hỗ trợ điền tự động dữ liệu và trích xuất bản in chính thức đúng quy chuẩn Cục Thú y Việt Nam.</p>
          </div>
        </div>
        <button
          type="button"
          className="jp-btn-primary jp-btn-lg"
          onClick={() => setShowPreviewForm01(true)}
        >
          📄 Xem trước & In Mẫu Đơn 01 Cục Thú Y
        </button>
      </div>

      {/* 1.1.1. KHỐI ĐƠN ĐĂNG KÝ KIỂM DỊCH ĐỘNG VẬT XUẤT KHẨU */}
      <div className="jp-card">
        <div className="jp-card-header-flex">
          <h3 className="jp-card-title">
            <span className="jp-icon">📋</span> 1.1.1. Đơn Đăng Ký Kiểm Dịch Động Vật Xuất Khẩu
          </h3>
          <span className="jp-chip jp-chip-info">
            Kênh nộp: {quarantineApplication.submissionChannel === 'NSW_AND_HARDCOPY' ? 'Cổng NSW & Bản cứng' : quarantineApplication.submissionChannel}
          </span>
        </div>

        {/* Thông tin Cổng Một cửa quốc gia NSW */}
        <div className="jp-nsw-notice-box">
          <div className="jp-grid-2">
            <div className="jp-form-group">
              <label className="jp-label">
                Mã Hồ Sơ Cổng Một Cửa Quốc Gia (NSW Code):
              </label>
              <input
                type="text"
                className="jp-input"
                placeholder="VD: NSW-VET-2026-902188"
                value={quarantineApplication.nswApplicationCode}
                onChange={(e) => handleAppChange('nswApplicationCode', e.target.value)}
                disabled={isReadOnly}
              />
            </div>
            <div className="jp-form-group">
              <label className="jp-label">
                Hình thức nộp hồ sơ kiểm dịch:
              </label>
              <select
                className="jp-select"
                value={quarantineApplication.submissionChannel}
                onChange={(e) => handleAppChange('submissionChannel', e.target.value)}
                disabled={isReadOnly}
              >
                <option value="NSW_AND_HARDCOPY">Nộp Cổng Một cửa Quốc gia (NSW) & Bản cứng trực tiếp</option>
                <option value="NSW_ONLY">Chỉ nộp trực tuyến qua Cổng Một cửa Quốc gia</option>
                <option value="HARDCOPY_ONLY">Nộp bản cứng trực tiếp tại Chi cục Thú y</option>
              </select>
            </div>
          </div>
        </div>

        {/* Thông tin Chủ hàng */}
        <h4 className="jp-subcard-subtitle">A. Thông tin Chủ hàng / Đơn vị đăng ký</h4>
        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">
              Tên chủ hàng / Doanh nghiệp <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Công ty TNHH Thể Thao Đua Ngựa Sài Gòn"
              value={quarantineApplication.applicantName}
              onChange={(e) => handleAppChange('applicantName', e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Số điện thoại liên hệ <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="0918.xxx.xxx"
              value={quarantineApplication.applicantPhone}
              onChange={(e) => handleAppChange('applicantPhone', e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Mã số thuế / CCCD chủ hàng:
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="0312xxxxxx / 079xxxxxxxxx"
              value={quarantineApplication.applicantTaxOrId}
              onChange={(e) => handleAppChange('applicantTaxOrId', e.target.value)}
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="jp-form-group">
          <label className="jp-label">
            Địa chỉ trụ sở / Nơi cư trú của chủ hàng <span className="jp-required">*</span>
          </label>
          <input
            type="text"
            className="jp-input"
            placeholder="Địa chỉ số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
            value={quarantineApplication.applicantAddress}
            onChange={(e) => handleAppChange('applicantAddress', e.target.value)}
            disabled={isReadOnly}
          />
        </div>

        {/* Thông tin Động vật */}
        <h4 className="jp-subcard-subtitle" style={{ marginTop: '20px' }}>
          B. Thông tin Động vật & Mục đích xuất khẩu
        </h4>
        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">
              Tên loài động vật:
            </label>
            <input
              type="text"
              className="jp-input jp-input-readonly"
              value={quarantineApplication.animalSpecies}
              readOnly
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Tên cá thể ngựa:
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Thunderbolt King"
              value={quarantineApplication.horseName}
              onChange={(e) => handleAppChange('horseName', e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Số lượng:
            </label>
            <input
              type="text"
              className="jp-input jp-input-readonly"
              value={`${quarantineApplication.quantity} con`}
              readOnly
            />
          </div>
        </div>

        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">
              Giới tính cá thể:
            </label>
            <select
              className="jp-select"
              value={quarantineApplication.gender}
              onChange={(e) => handleAppChange('gender', e.target.value)}
              disabled={isReadOnly}
            >
              <option value="Thiến (Gelding)">Ngựa thiến (Gelding)</option>
              <option value="Đực (Stallion)">Ngựa đực giống (Stallion)</option>
              <option value="Cái (Mare)">Ngựa cái (Mare)</option>
            </select>
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Tuổi / Năm sinh:
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: 5 tuổi (Sinh năm 2021)"
              value={quarantineApplication.ageOrBirthYear}
              onChange={(e) => handleAppChange('ageOrBirthYear', e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Mục đích xuất khẩu <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              value={quarantineApplication.exportPurpose}
              onChange={(e) => handleAppChange('exportPurpose', e.target.value)}
              disabled={isReadOnly}
            />
            <span className="jp-field-note">
              Quy chuẩn: "Thi đấu thể thao, tái nhập" theo hình thức Tạm xuất - Tái nhập.
            </span>
          </div>
        </div>

        {/* Nơi xuất phát & Cửa khẩu */}
        <h4 className="jp-subcard-subtitle" style={{ marginTop: '20px' }}>
          C. Địa điểm kiểm dịch, Cửa khẩu xuất hàng & Nước đến
        </h4>
        <div className="jp-grid-2">
          <div className="jp-form-group">
            <label className="jp-label">
              Nơi xuất phát (Địa chỉ chuồng trại tại Việt Nam) <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="Địa chỉ trang trại / chuồng nuôi dưỡng ngựa tại Việt Nam"
              value={quarantineApplication.departureOrigin}
              onChange={(e) => handleAppChange('departureOrigin', e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Cơ sở cách ly kiểm dịch tiền xuất cảnh tại VN <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Trạm cách ly kiểm dịch động vật Củ Chi / Nội Bài"
              value={quarantineApplication.quarantineFacilityVN}
              onChange={(e) => handleAppChange('quarantineFacilityVN', e.target.value)}
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">
              Ngày bắt đầu cách ly tại VN:
            </label>
            <input
              type="date"
              className="jp-input"
              value={quarantineApplication.quarantineStartDate}
              onChange={(e) => handleAppChange('quarantineStartDate', e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Ngày kết thúc cách ly:
            </label>
            <input
              type="date"
              className="jp-input"
              value={quarantineApplication.quarantineEndDate}
              onChange={(e) => handleAppChange('quarantineEndDate', e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Thời gian cách ly tính toán:
            </label>
            <div className="jp-input-stat">
              ⏱️ <strong>{daysDiff} ngày</strong> (Yêu cầu MAFF Nhật Bản tối thiểu 14 ngày)
            </div>
          </div>
        </div>

        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">
              Cửa khẩu xuất hàng (Việt Nam) <span className="jp-required">*</span>
            </label>
            <select
              className="jp-select"
              value={quarantineApplication.exportPort}
              onChange={(e) => handleAppChange('exportPort', e.target.value)}
              disabled={isReadOnly}
            >
              <option value="Sân bay Quốc tế Tân Sơn Nhất (SGN)">Cửa khẩu Sân bay Quốc tế Tân Sơn Nhất (SGN)</option>
              <option value="Sân bay Quốc tế Nội Bài (HAN)">Cửa khẩu Sân bay Quốc tế Nội Bài (HAN)</option>
              <option value="Sân bay Quốc tế Đà Nẵng (DAD)">Cửa khẩu Sân bay Quốc tế Đà Nẵng (DAD)</option>
            </select>
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Nước đến:
            </label>
            <input
              type="text"
              className="jp-input jp-input-readonly"
              value={quarantineApplication.destinationCountry}
              readOnly
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Cửa khẩu đến tại Nhật Bản:
            </label>
            <select
              className="jp-select"
              value={quarantineApplication.destinationPort}
              onChange={(e) => handleAppChange('destinationPort', e.target.value)}
              disabled={isReadOnly}
            >
              <option value="Sân bay Quốc tế Narita (NRT)">Sân bay Quốc tế Narita (NRT) - Trạm AQS Tokyo</option>
              <option value="Sân bay Quốc tế Kansai (KIX)">Sân bay Quốc tế Kansai (KIX) - Osaka</option>
              <option value="Sân bay Quốc tế Haneda (HND)">Sân bay Quốc tế Haneda (HND)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 1.1.2. HỘ CHIẾU NGỰA (EQUINE PASSPORT) & SỔ TIÊM PHÒNG */}
      <div className="jp-card">
        <h3 className="jp-card-title">
          <span className="jp-icon">📖</span> 1.1.2. Hộ Chiếu Ngựa (Equine Passport) & Sổ Tiêm Phòng
        </h3>
        <p className="jp-card-subtitle">
          Chứng chỉ danh tính quốc tế của ngựa, mã số vi mạch nhận diện và lịch sử tiêm chủng vắc xin bắt buộc.
        </p>

        <div className="jp-grid-2">
          <div className="jp-form-group">
            <label className="jp-label">
              Số hiệu Microchip (Vi mạch 15 số ISO 11784/11785) <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              maxLength={15}
              className="jp-input"
              placeholder="VD: 982000123456789 (Chính xác 15 chữ số)"
              value={passportAndVaccine.microchipNumber}
              onChange={(e) => handlePassportChange('microchipNumber', e.target.value)}
              disabled={isReadOnly}
            />
            {passportAndVaccine.microchipNumber && passportAndVaccine.microchipNumber.length !== 15 && (
              <span className="jp-field-warning">
                ⚠️ Vi mạch phải có đúng 15 chữ số theo chuẩn ISO 11784/11785 (Hiện tại: {passportAndVaccine.microchipNumber.length}/15)
              </span>
            )}
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Vị trí cấy vi mạch trên ngựa:
            </label>
            <input
              type="text"
              className="jp-input"
              value={passportAndVaccine.microchipLocation}
              onChange={(e) => handlePassportChange('microchipLocation', e.target.value)}
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">
              Số Hộ chiếu ngựa (Passport Number):
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: VN-FEI-2022-0941"
              value={passportAndVaccine.passportNumber}
              onChange={(e) => handlePassportChange('passportNumber', e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Cơ quan / Hiệp hội cấp Hộ chiếu:
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Liên đoàn Thể thao Cưỡi ngựa Quốc tế FEI / VRA"
              value={passportAndVaccine.issuingOrganization}
              onChange={(e) => handlePassportChange('issuingOrganization', e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Ngày cấp Hộ chiếu:
            </label>
            <input
              type="date"
              className="jp-input"
              value={passportAndVaccine.issueDate}
              onChange={(e) => handlePassportChange('issueDate', e.target.value)}
              disabled={isReadOnly}
            />
          </div>
        </div>

        {/* Upload Scan Hộ chiếu */}
        <div className="jp-subcard">
          <div className="jp-subcard-header">
            <h4>Bản scan / Ảnh chụp Hộ chiếu ngựa (Equine Passport Scans)</h4>
            {!isReadOnly && (
              <label className="jp-btn-upload">
                📤 Tải lên trang hộ chiếu
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handlePassportUpload}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          {passportAndVaccine.passportScans.length === 0 ? (
            <div className="jp-empty-upload-box">
              Chưa có bản scan hộ chiếu nào. Vui lòng tải lên ảnh chụp trang bìa, trang đặc điểm nhận dạng và vi mạch.
            </div>
          ) : (
            <div className="jp-image-preview-grid">
              {passportAndVaccine.passportScans.map((scan) => (
                <div key={scan.id} className="jp-preview-card">
                  <div
                    className="jp-preview-thumbnail"
                    onClick={() => onOpenZoom(scan.url, scan.name)}
                    style={{ backgroundImage: `url(${scan.url})` }}
                  >
                    <span className="jp-zoom-hint">🔍 Xem chi tiết</span>
                  </div>
                  <div className="jp-preview-info">
                    <span className="jp-preview-name" title={scan.name}>{scan.name}</span>
                    <span className="jp-preview-size">{scan.size || 'Ảnh hộ chiếu'}</span>
                  </div>
                  {!isReadOnly && (
                    <button
                      type="button"
                      className="jp-btn-remove-sm"
                      onClick={() => handleRemovePassportScan(scan.id)}
                    >
                      Xóa
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lịch sử tiêm phòng vắc-xin */}
        <div className="jp-subcard" style={{ marginTop: '20px' }}>
          <div className="jp-subcard-header">
            <h4>Lịch sử tiêm chủng Vắc-xin bắt buộc (Cúm ngựa, U ván...)</h4>
            {!isReadOnly && (
              <button
                type="button"
                className="jp-btn-secondary jp-btn-sm"
                onClick={handleAddVaccine}
              >
                ➕ Thêm mũi tiêm
              </button>
            )}
          </div>

          <div className="jp-table-wrapper">
            <table className="jp-table">
              <thead>
                <tr>
                  <th>Tên Vắc-xin</th>
                  <th>Ngày tiêm</th>
                  <th>Hạn bảo hộ</th>
                  <th>Số lô (Batch/Lot)</th>
                  <th>Bác sĩ / Đơn vị thực hiện</th>
                  {!isReadOnly && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {passportAndVaccine.vaccinationHistory.map((vac) => (
                  <tr key={vac.id}>
                    <td>
                      <input
                        type="text"
                        className="jp-input-sm"
                        value={vac.vaccineName}
                        onChange={(e) => handleVaccineEntryChange(vac.id, 'vaccineName', e.target.value)}
                        disabled={isReadOnly}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        className="jp-input-sm"
                        value={vac.administeredDate}
                        onChange={(e) => handleVaccineEntryChange(vac.id, 'administeredDate', e.target.value)}
                        disabled={isReadOnly}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        className="jp-input-sm"
                        value={vac.validUntil}
                        onChange={(e) => handleVaccineEntryChange(vac.id, 'validUntil', e.target.value)}
                        disabled={isReadOnly}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="jp-input-sm"
                        placeholder="Số lô"
                        value={vac.batchNumber}
                        onChange={(e) => handleVaccineEntryChange(vac.id, 'batchNumber', e.target.value)}
                        disabled={isReadOnly}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="jp-input-sm"
                        placeholder="BSTY thực hiện"
                        value={vac.veterinarian}
                        onChange={(e) => handleVaccineEntryChange(vac.id, 'veterinarian', e.target.value)}
                        disabled={isReadOnly}
                      />
                    </td>
                    {!isReadOnly && (
                      <td>
                        <button
                          type="button"
                          className="jp-btn-remove-sm"
                          onClick={() => handleRemoveVaccine(vac.id)}
                        >
                          Xóa
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Upload file Sổ tiêm vắc xin */}
          <div style={{ marginTop: '16px' }}>
            <div className="jp-flex-between">
              <label className="jp-label">Đính kèm bản chụp Sổ tiêm phòng:</label>
              {!isReadOnly && (
                <label className="jp-btn-upload jp-btn-sm">
                  📤 Tải ảnh/scan Sổ tiêm
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleVaccineBookUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
            {passportAndVaccine.vaccinationBookScans.length > 0 && (
              <div className="jp-tag-list" style={{ marginTop: '8px' }}>
                {passportAndVaccine.vaccinationBookScans.map((doc) => (
                  <span key={doc.id} className="jp-file-tag" onClick={() => onOpenZoom(doc.url, doc.name)}>
                    📎 {doc.name} ({doc.size})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL XEM TRƯỚC MẪU ĐƠN 01 CỤC THÚ Y */}
      {showPreviewForm01 && (
        <div className="jp-modal-overlay" onClick={() => setShowPreviewForm01(false)}>
          <div className="jp-modal-container jp-modal-printable" onClick={(e) => e.stopPropagation()}>
            <div className="jp-modal-header">
              <h3>BẢN XEM TRƯỚC: ĐƠN ĐĂNG KÝ KIỂM DỊCH ĐỘNG VẬT XUẤT KHẨU (MẪU 01/CCTY)</h3>
              <button
                type="button"
                className="jp-modal-close"
                onClick={() => setShowPreviewForm01(false)}
              >
                ✕
              </button>
            </div>

            <div className="jp-official-paper">
              <div className="jp-paper-header-grid">
                <div className="jp-paper-org">
                  <strong>BỘ NÔNG NGHIỆP VÀ PHÁT TRIỂN NÔNG THÔN</strong>
                  <div style={{ textDecoration: 'underline' }}>CỤC THÚ Y VIỆT NAM</div>
                  <div style={{ marginTop: '4px', fontSize: '11px' }}>
                    Mã hồ sơ NSW: <strong>{quarantineApplication.nswApplicationCode || 'Chưa cấp'}</strong>
                  </div>
                </div>
                <div className="jp-paper-motto">
                  <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>
                  <div>Độc lập - Tự do - Hạnh phúc</div>
                  <div style={{ fontStyle: 'italic', fontSize: '11px', marginTop: '6px' }}>
                    Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                  </div>
                </div>
              </div>

              <div className="jp-paper-title">
                <h2>ĐƠN ĐĂNG KÝ KIỂM DỊCH ĐỘNG VẬT XUẤT KHẨU</h2>
                <div style={{ fontStyle: 'italic', fontSize: '13px' }}>
                  (Kèm theo Thông tư số 25/2016/TT-BNNPTNT & Cổng Một Cửa Quốc Gia)
                </div>
              </div>

              <div className="jp-paper-body">
                <p>
                  <strong>Kính gửi:</strong> Chi cục Thú y Vùng VI / Cục Thú y Việt Nam
                </p>
                <p>
                  <strong>1. Tên chủ hàng / Doanh nghiệp:</strong> {quarantineApplication.applicantName || '................................................'}
                </p>
                <p>
                  <strong>2. Địa chỉ liên lạc:</strong> {quarantineApplication.applicantAddress || '................................................'}
                </p>
                <p>
                  <strong>3. Số điện thoại:</strong> {quarantineApplication.applicantPhone || '.....................'} | <strong>Mã số thuế/CCCD:</strong> {quarantineApplication.applicantTaxOrId || '.....................'}
                </p>
                <p>
                  <strong>4. Đăng ký kiểm dịch động vật:</strong> Loài <strong>{quarantineApplication.animalSpecies}</strong> (Tên cá thể: <strong>{quarantineApplication.horseName || 'Ngựa đua'}</strong>)
                </p>
                <p>
                  <strong>5. Số lượng:</strong> {quarantineApplication.quantity} con | <strong>Giới tính:</strong> {quarantineApplication.gender} | <strong>Tuổi:</strong> {quarantineApplication.ageOrBirthYear}
                </p>
                <p>
                  <strong>6. Số Microchip nhận dạng:</strong> <code>{passportAndVaccine.microchipNumber || 'Chưa điền'}</code> (Vị trí cấy: {passportAndVaccine.microchipLocation})
                </p>
                <p>
                  <strong>7. Số Hộ chiếu ngựa (Equine Passport):</strong> {passportAndVaccine.passportNumber || 'Theo hồ sơ đính kèm'}
                </p>
                <p>
                  <strong>8. Mục đích xuất khẩu:</strong> <u>{quarantineApplication.exportPurpose}</u> (Tạm xuất tái nhập dự giải đua tại Nhật Bản)
                </p>
                <p>
                  <strong>9. Nơi xuất phát:</strong> {quarantineApplication.departureOrigin || 'Trại nuôi dưỡng tại VN'}
                </p>
                <p>
                  <strong>10. Cơ sở cách ly kiểm dịch:</strong> {quarantineApplication.quarantineFacilityVN || 'Trạm cách ly được phê duyệt'} (Từ {quarantineApplication.quarantineStartDate || '...'} đến {quarantineApplication.quarantineEndDate || '...'})
                </p>
                <p>
                  <strong>11. Cửa khẩu xuất hàng:</strong> {quarantineApplication.exportPort} ➔ <strong>Nước đến:</strong> {quarantineApplication.destinationCountry} ({quarantineApplication.destinationPort})
                </p>
                <p>
                  <strong>12. Căn cứ kiểm dịch nhập khẩu:</strong> Theo Văn bản quy định kiểm dịch & Giấy phép số <strong>{japanQuarantineRegulations.referenceTemporaryImportPermitNo || 'AQS MAFF Protocol'}</strong> do Cục Kiểm dịch Động vật Nhật Bản (AQS) cấp.
                </p>

                <p style={{ marginTop: '16px' }}>
                  Chúng tôi xin cam đoan các thông tin kê khai trên là hoàn toàn đúng sự thật, chấp hành nghiêm ngặt phác đồ lấy mẫu xét nghiệm máu và chịu trách nhiệm trước pháp luật.
                </p>
              </div>

              <div className="jp-paper-signatures">
                <div className="jp-sig-box">
                  <strong>XÁC NHẬN CỦA CƠ QUAN KIỂM DỊCH THÚ Y</strong>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>(Ký, đóng dấu tiếp nhận hồ sơ)</div>
                  <div className="jp-sig-stamp-simulated">
                    <span>BỘ NÔNG NGHIỆP & PTNT</span>
                    <span>★ CHI CỤC THÚ Y ★</span>
                    <span>VÙNG VI</span>
                    <span>ĐÃ TIẾP NHẬN</span>
                  </div>
                  <div>Kiểm dịch viên thụ lý: <strong>TS. BSTY. Trần Đình Quang</strong></div>
                </div>

                <div className="jp-sig-box">
                  <strong>CHỦ HÀNG / NGƯỜI ĐĂNG KÝ</strong>
                  <div style={{ fontStyle: 'italic', fontSize: '11px' }}>(Ký, ghi rõ họ tên và đóng dấu nếu có)</div>
                  <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <em style={{ color: '#0369a1', fontFamily: 'cursive', fontSize: '18px' }}>Trần Đình Quang</em>
                  </div>
                  <strong>{quarantineApplication.applicantName || 'Người đại diện'}</strong>
                </div>
              </div>
            </div>

            <div className="jp-modal-footer">
              <button
                type="button"
                className="jp-btn-secondary"
                onClick={() => setShowPreviewForm01(false)}
              >
                Đóng lại
              </button>
              <button
                type="button"
                className="jp-btn-primary"
                onClick={() => window.print()}
              >
                🖨️ In Mẫu Đơn 01 (Print)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
