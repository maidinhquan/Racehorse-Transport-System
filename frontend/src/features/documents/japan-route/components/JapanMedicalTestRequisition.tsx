import React, { useState } from 'react';
import type {
  VeterinaryAgency,
  HorseMedicalProfile,
  MedicalTestRequisition,
} from '../types/japanRoute.types';

interface JapanMedicalTestRequisitionProps {
  agency: VeterinaryAgency;
  onAgencyChange: (field: keyof VeterinaryAgency, value: string) => void;

  horseProfile: HorseMedicalProfile;
  onHorseProfileChange: (field: keyof HorseMedicalProfile, value: string) => void;

  requisition: MedicalTestRequisition;
  onRequisitionChange: (field: keyof MedicalTestRequisition, value: unknown) => void;
  onDiseaseToggle: (diseaseKey: 'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV') => void;
}

export const JapanMedicalTestRequisition: React.FC<JapanMedicalTestRequisitionProps> = ({
  agency,
  onAgencyChange,
  horseProfile,
  onHorseProfileChange,
  requisition,
  onRequisitionChange,
  onDiseaseToggle,
}) => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const diseasesList: Array<{
    key: 'EIA' | 'EVA' | 'Piroplasmosis' | 'WNV';
    name: string;
    method: string;
    standard: string;
  }> = [
    {
      key: 'EIA',
      name: 'Thiếu máu truyền nhiễm ở ngựa (Equine Infectious Anemia)',
      method: 'Coggins test (AGID) hoặc cELISA',
      standard: 'Quy chuẩn OIE Terrestrial Manual / MAFF Nhật Bản',
    },
    {
      key: 'EVA',
      name: 'Viêm động mạch ở ngựa (Equine Viral Arteritis)',
      method: 'Xét nghiệm trung hòa virus (Virus Neutralization - VN)',
      standard: 'Yêu cầu hiệu giá kháng thể âm tính hoặc theo phác đồ AQS',
    },
    {
      key: 'Piroplasmosis',
      name: 'Ký sinh trùng đường máu (Equine Piroplasmosis: Babesia / Theileria)',
      method: 'Kỹ thuật cELISA cạnh tranh & IFAT',
      standard: 'Cả 2 chủng Babesia caballi và Theileria equi',
    },
    {
      key: 'WNV',
      name: 'Virus Tây Sông Nile (West Nile Virus)',
      method: 'IgM Capture ELISA hoặc PRNT',
      standard: 'Xác nhận không nhiễm virus cấp tính trong 30 ngày',
    },
  ];

  const selectedCount = Object.values(requisition.selectedDiseases).filter(Boolean).length;

  return (
    <div className="jp-module-section">
      {/* Tiêu đề Phân hệ */}
      <div className="jp-section-header">
        <div className="jp-section-badge jp-badge-red">BƯỚC 1 (TIÊN QUYẾT)</div>
        <h2 className="jp-section-title">
          Thông tin Đơn Xét nghiệm Y tế Thú y (Veterinary Medical Test Requisition)
        </h2>
        <p className="jp-section-desc">
          Thu thập đầy đủ thông tin của <strong>Bên Y Tế (Đội ngũ thú y được thuê)</strong>, hồ sơ lâm sàng của 
          <strong> Cá thể ngựa</strong> và chi tiết <strong>Phiếu chỉ định gửi Lab</strong> cho 4 bệnh máu bắt buộc 
          theo quy định nghiêm ngặt của Cục Kiểm dịch Động vật Nhật Bản (AQS - MAFF).
        </p>
      </div>

      {/* Thanh điều hướng thao tác nhanh */}
      <div className="jp-requisition-toolbar">
        <div className="jp-requisition-status-summary">
          <span className="jp-chip jp-chip-info">
            📋 Mã đơn: <strong>{requisition.requisitionId || 'Chưa tạo'}</strong>
          </span>
          <span className={`jp-chip ${selectedCount === 4 ? 'jp-chip-success' : 'jp-chip-warning'}`}>
            🔬 Chỉ định: <strong>{selectedCount}/4 Bệnh bắt buộc</strong>
          </span>
          <span className="jp-chip jp-chip-neutral">
            🏥 Phòng Lab: <strong>{requisition.designatedLab || 'Chưa chọn'}</strong>
          </span>
        </div>

        <button
          type="button"
          className="jp-btn-preview-doc"
          onClick={() => setShowPreviewModal(true)}
        >
          📄 Xem trước & In Đơn Xét Nghiệm (Form Preview)
        </button>
      </div>

      {/* KHỐI 1: THÔNG TIN ĐƠN VỊ THÚ Y (BÊN Y TẾ) */}
      <div className="jp-card">
        <div className="jp-card-header-flex">
          <h3 className="jp-card-title">
            <span className="jp-icon">🏥</span> 1. Thông tin Đội thuê Bên Thú Y (Bên Y Tế)
          </h3>
          <span className="jp-status-pill">Đơn vị lấy mẫu & chỉ định xét nghiệm</span>
        </div>
        <p className="jp-card-subdesc">
          Thông tin cơ sở thú y được cấp phép hành nghề, chịu trách nhiệm thăm khám ban đầu, lấy mẫu bệnh phẩm và niêm phong gửi phòng thí nghiệm chẩn đoán.
        </p>

        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">
              Tên cơ sở / Bệnh viện Thú y <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Chi cục Thú y Vùng VI / BV Thú y Saigon Vet"
              value={agency.agencyName}
              onChange={(e) => onAgencyChange('agencyName', e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Bác sĩ thú y phụ trách lấy mẫu <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: TS. BSTY. Trần Đình Quang"
              value={agency.veterinarianName}
              onChange={(e) => onAgencyChange('veterinarianName', e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Số chứng chỉ hành nghề thú y <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: CCHN-TY-2024/0984-CCTY"
              value={agency.licenseNumber}
              onChange={(e) => onAgencyChange('licenseNumber', e.target.value)}
            />
          </div>
        </div>

        <div className="jp-grid-3" style={{ marginTop: '14px' }}>
          <div className="jp-form-group">
            <label className="jp-label">
              Số điện thoại liên hệ khẩn cấp <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: 0918.234.567"
              value={agency.phone}
              onChange={(e) => onAgencyChange('phone', e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Email cơ sở thú y <span className="jp-required">*</span>
            </label>
            <input
              type="email"
              className="jp-input"
              placeholder="VD: quarantine.dept@saigonvet.vn"
              value={agency.email}
              onChange={(e) => onAgencyChange('email', e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Địa chỉ cơ sở / Phòng khám <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: 521 Hoàng Văn Thụ, P.4, Q. Tân Bình, TP.HCM"
              value={agency.clinicAddress}
              onChange={(e) => onAgencyChange('clinicAddress', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* KHỐI 2: THÔNG TIN ĐỐI TƯỢNG XÉT NGHIỆM (CÁ THỂ NGỰA) */}
      <div className="jp-card">
        <div className="jp-card-header-flex">
          <h3 className="jp-card-title">
            <span className="jp-icon">🐴</span> 2. Thông tin Cá thể Ngựa làm Xét nghiệm
          </h3>
          <span className="jp-status-pill">Đối tượng lấy mẫu & thẩm định lâm sàng</span>
        </div>
        <p className="jp-card-subdesc">
          Thông tin chi tiết nhận dạng cá thể theo hộ chiếu ngựa và tình trạng lâm sàng thực tế khi bác sĩ thú y tiến hành rút máu lấy mẫu.
        </p>

        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">
              Tên ngựa đăng ký <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Pegasus Thunder"
              value={horseProfile.horseName}
              onChange={(e) => onHorseProfileChange('horseName', e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Số Microchip định danh (15 số ISO) <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: 985141001289456"
              value={horseProfile.microchipNumber}
              onChange={(e) => onHorseProfileChange('microchipNumber', e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Vị trí cấy chip trên thân ngựa
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Bờ trên dây chằng cổ trái (Nuchal ligament)"
              value={horseProfile.microchipLocation}
              onChange={(e) => onHorseProfileChange('microchipLocation', e.target.value)}
            />
          </div>
        </div>

        <div className="jp-grid-4" style={{ marginTop: '14px' }}>
          <div className="jp-form-group">
            <label className="jp-label">Giống ngựa (Breed):</label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Thoroughbred (Ngựa đua thuần chủng)"
              value={horseProfile.breed}
              onChange={(e) => onHorseProfileChange('breed', e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Giới tính:</label>
            <select
              className="jp-select"
              value={horseProfile.gender}
              onChange={(e) => onHorseProfileChange('gender', e.target.value)}
            >
              <option value="">-- Chọn giới tính --</option>
              <option value="Gelding">Đực thiến (Gelding)</option>
              <option value="Stallion">Ngựa đực nguyên (Stallion)</option>
              <option value="Mare">Ngựa cái (Mare)</option>
            </select>
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Năm sinh / Tuổi:</label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: 2021 (5 tuổi)"
              value={horseProfile.ageOrYob}
              onChange={(e) => onHorseProfileChange('ageOrYob', e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Thân nhiệt lúc lấy mẫu:</label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: 37.8 °C (Bình thường: 37.2-38.3)"
              value={horseProfile.bodyTemperature}
              onChange={(e) => onHorseProfileChange('bodyTemperature', e.target.value)}
            />
          </div>
        </div>

        <div className="jp-grid-2" style={{ marginTop: '14px' }}>
          <div className="jp-form-group">
            <label className="jp-label">Màu lông & Dấu hiệu nhận dạng đặc biệt:</label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Nâu sẫm (Bay), xoáy trán hình thoi, cổ chân sau bên trái màu trắng"
              value={horseProfile.coatColorMarkings}
              onChange={(e) => onHorseProfileChange('coatColorMarkings', e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Tình trạng lâm sàng ban đầu khi khám:</label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Tỉnh táo, mắt niêm mạc hồng hào, không có dịch mũi hoặc vết loét"
              value={horseProfile.clinicalSigns}
              onChange={(e) => onHorseProfileChange('clinicalSigns', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* KHỐI 3: CHI TIẾT ĐƠN YÊU CẦU & PHÒNG LAB TIẾP NHẬN */}
      <div className="jp-card">
        <div className="jp-card-header-flex">
          <h3 className="jp-card-title">
            <span className="jp-icon">🧪</span> 3. Chi tiết Phiếu Đề nghị & Phòng Lab Tiếp Nhận Mẫu
          </h3>
          <span className="jp-status-pill">Chỉ định phương pháp & bảo quản mẫu</span>
        </div>
        <p className="jp-card-subdesc">
          Thông tin chỉ định kiểm nghiệm được gửi trực tiếp đến Phòng xét nghiệm chẩn đoán thú y quốc gia được chỉ định.
        </p>

        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">
              Mã số Đơn xét nghiệm (Order ID) <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: REQ-LAB-2026-JP01"
              value={requisition.requisitionId}
              onChange={(e) => onRequisitionChange('requisitionId', e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Ngày lấy mẫu xét nghiệm <span className="jp-required">*</span>
            </label>
            <input
              type="date"
              className="jp-input"
              value={requisition.samplingDate}
              onChange={(e) => onRequisitionChange('samplingDate', e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Giờ lấy mẫu & niêm phong:</label>
            <input
              type="time"
              className="jp-input"
              value={requisition.samplingTime}
              onChange={(e) => onRequisitionChange('samplingTime', e.target.value)}
            />
          </div>
        </div>

        <div className="jp-grid-3" style={{ marginTop: '14px' }}>
          <div className="jp-form-group">
            <label className="jp-label">
              Loại mẫu bệnh phẩm <span className="jp-required">*</span>
            </label>
            <select
              className="jp-select"
              value={requisition.sampleType}
              onChange={(e) => onRequisitionChange('sampleType', e.target.value)}
            >
              <option value="Huyết thanh (Serum) tách ly tâm">Huyết thanh (Serum) tách ly tâm - Khuyến nghị AQS</option>
              <option value="Máu toàn phần chống đông EDTA">Máu toàn phần chống đông EDTA</option>
              <option value="Huyết thanh (Serum) + Máu toàn phần EDTA">Bộ đôi: Huyết thanh + Máu toàn phần EDTA</option>
            </select>
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Phòng Xét nghiệm chỉ định tiếp nhận <span className="jp-required">*</span>
            </label>
            <select
              className="jp-select"
              value={requisition.designatedLab}
              onChange={(e) => onRequisitionChange('designatedLab', e.target.value)}
            >
              <option value="Trung tâm Chẩn đoán Thú y Trung ương (NCVD - Hà Nội)">
                Trung tâm Chẩn đoán Thú y Trung ương (NCVD - Hà Nội)
              </option>
              <option value="Chi cục Thú y Vùng VI - Phòng Chẩn đoán xét nghiệm (TP.HCM)">
                Chi cục Thú y Vùng VI - Phòng Chẩn đoán xét nghiệm (TP.HCM)
              </option>
              <option value="Viện Thú Y Quốc Gia (NIVR)">
                Viện Thú Y Quốc Gia (NIVR)
              </option>
              <option value="Japan Animal Quarantine Service (AQS Designated Lab)">
                Phòng Lab Quốc tế được AQS Nhật Bản ủy quyền
              </option>
            </select>
          </div>

          <div className="jp-form-group">
            <label className="jp-label">Mục đích xét nghiệm:</label>
            <input
              type="text"
              className="jp-input"
              value={requisition.testPurpose}
              onChange={(e) => onRequisitionChange('testPurpose', e.target.value)}
            />
          </div>
        </div>

        <div className="jp-form-group" style={{ marginTop: '14px' }}>
          <label className="jp-label">Yêu cầu bảo quản & vận chuyển mẫu đến Lab:</label>
          <input
            type="text"
            className="jp-input"
            value={requisition.specialInstructions}
            onChange={(e) => onRequisitionChange('specialInstructions', e.target.value)}
          />
        </div>
      </div>

      {/* KHỐI 4: DANH MỤC 4 BỆNH MÁU BẮT BUỘC ĐĂNG KÝ XÉT NGHIỆM */}
      <div className="jp-card">
        <div className="jp-card-header-flex">
          <h3 className="jp-card-title">
            <span className="jp-icon">🔬</span> 4. Danh mục 4 Bệnh Máu Bắt Buộc Đăng Ký Trong Đơn
          </h3>
          <span className={`jp-status-pill ${selectedCount === 4 ? 'pill-success' : 'pill-warning'}`}>
            {selectedCount === 4 ? 'Đã đăng ký đủ 4 bệnh đi Nhật' : 'Cần chọn đủ cả 4 bệnh'}
          </span>
        </div>
        <p className="jp-card-subdesc">
          Tất cả các bệnh sau đây là điều kiện tiên quyết bắt buộc phải có trong đơn yêu cầu xét nghiệm theo nghị định kiểm dịch thú y giữa Việt Nam và Nhật Bản:
        </p>

        <div className="jp-requisition-diseases-grid">
          {diseasesList.map((disease) => {
            const isChecked = Boolean(requisition.selectedDiseases[disease.key]);
            return (
              <div
                key={disease.key}
                className={`jp-req-disease-card ${isChecked ? 'active' : ''}`}
                onClick={() => onDiseaseToggle(disease.key)}
              >
                <div className="jp-req-disease-top">
                  <input
                    type="checkbox"
                    className="jp-checkbox"
                    checked={isChecked}
                    onChange={() => {}} // handled by parent onClick
                  />
                  <div>
                    <h4 className="jp-req-disease-title">
                      {disease.key} - {disease.name}
                    </h4>
                    <span className="jp-req-disease-method">
                      Phương pháp yêu cầu: <strong>{disease.method}</strong>
                    </span>
                  </div>
                </div>
                <div className="jp-req-disease-bottom">
                  <span className="jp-req-badge-law">📜 {disease.standard}</span>
                  <span className="jp-req-badge-mand">Bắt buộc 100%</span>
                </div>
              </div>
            );
          })}
        </div>

        {selectedCount < 4 && (
          <div className="jp-alert jp-alert-warning" style={{ marginTop: '16px' }}>
            <span>
              ⚠️ <strong>Lưu ý quan trọng:</strong> Nếu thiếu bất kỳ chỉ định xét nghiệm nào trong 4 bệnh trên, phòng Lab sẽ không thể xuất phiếu kết quả hợp lệ để làm hồ sơ kiểm dịch xuất cảnh sang Nhật Bản.
            </span>
          </div>
        )}
      </div>

      {/* ROADMAP PREVIEW: CÁC PHẦN TIẾP THEO THEO HƯỚNG DẪN CỦA BẠN */}
      <div className="jp-roadmap-card">
        <h3 className="jp-roadmap-title">
          📌 Lộ trình các bước tiếp theo (Đang chờ lệnh chỉ đạo từ bạn)
        </h3>
        <p className="jp-roadmap-desc">
          Hệ thống đã xây dựng xong toàn bộ thành phần cần thiết để lập <strong>Đơn xét nghiệm y tế</strong>. Các bước tiếp theo sẽ được hoàn thiện theo đúng trình tự bạn yêu cầu:
        </p>

        <div className="jp-roadmap-grid">
          <div className="jp-roadmap-step current">
            <div className="jp-step-badge">Bước 1 (Đang làm)</div>
            <h4>Kiểm tra Y tế & Cấp chứng nhận</h4>
            <p>Đã hoàn thành Đơn yêu cầu xét nghiệm. Sẵn sàng tích hợp Sổ tiêm ngừa và Kết quả Lab khi có lệnh.</p>
          </div>

          <div className="jp-roadmap-step locked">
            <div className="jp-step-badge">Bước 2 (Chờ chỉ tiếp)</div>
            <h4>Sắp xếp Phương tiện & Đội ngũ Vận chuyển</h4>
            <p>Phân công 4 chặng xe và nhân sự đi kèm (Tài xế + Người theo dõi sức khỏe từng chặng).</p>
          </div>

          <div className="jp-roadmap-step locked">
            <div className="jp-step-badge">Bước 3 (Chờ chỉ tiếp)</div>
            <h4>Tính toán Thời gian & Hồ sơ Cách ly</h4>
            <p>Kiểm tra cách ly tại VN &ge; 7 ngày và xác nhận đặt trạm kiểm dịch AQS tại Nhật.</p>
          </div>

          <div className="jp-roadmap-step locked">
            <div className="jp-step-badge">Bước 4 (Chờ chỉ tiếp)</div>
            <h4>Điền Form Khai báo trước khi đi</h4>
            <p>Form tổng hợp gửi AQS Nhật Bản, tự động đính kèm kết quả y tế và lộ trình vận chuyển.</p>
          </div>
        </div>
      </div>

      {/* MODAL XEM TRƯỚC VÀ IN ĐƠN XÉT NGHIỆM Y TẾ CHUẨN A4 */}
      {showPreviewModal && (
        <div className="jp-modal-backdrop" onClick={() => setShowPreviewModal(false)}>
          <div
            className="jp-modal-content jp-requisition-preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="jp-modal-header">
              <h3>📄 BẢN IN: ĐƠN ĐỀ NGHỊ XÉT NGHIỆM BỆNH ĐỘNG VẬT XUẤT CẢNH</h3>
              <button
                type="button"
                className="jp-modal-close"
                onClick={() => setShowPreviewModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="jp-requisition-paper">
              {/* Tiêu đề Quốc gia & Cơ quan */}
              <div className="jp-paper-header">
                <div className="jp-paper-left">
                  <strong>BỘ NÔNG NGHIỆP VÀ PHÁT TRIỂN NÔNG THÔN</strong>
                  <br />
                  <span>CỤC THÚ Y - ĐƠN VỊ THẨM ĐỊNH KIỂM DỊCH</span>
                  <br />
                  <span className="jp-paper-sub">Cơ sở chỉ định: {agency.agencyName || '................................'}</span>
                </div>
                <div className="jp-paper-right">
                  <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>
                  <br />
                  <span>Độc lập - Tự do - Hạnh phúc</span>
                  <br />
                  <span className="jp-paper-date">
                    Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                  </span>
                </div>
              </div>

              <div className="jp-paper-title-block">
                <h2>PHIẾU YÊU CẦU XÉT NGHIỆM BỆNH NGỰA XUẤT KHẨU</h2>
                <div className="jp-paper-sub-en">
                  (EQUINE VETERINARY LABORATORY DIAGNOSTIC REQUISITION FORM - JAPAN PROTOCOL)
                </div>
                <div className="jp-paper-barcode">
                  |||||||||||||||||||||||||||||||||||||||||||||
                  <br />
                  <span>MÃ ĐƠN: {requisition.requisitionId || 'MED-REQ-2026-JP01'}</span>
                </div>
              </div>

              {/* Bảng thông tin */}
              <table className="jp-paper-table">
                <tbody>
                  <tr>
                    <th colSpan={4} className="jp-table-section-title">
                      I. THÔNG TIN BÊN Y TẾ & BÁC SĨ THÚ Y LẤY MẪU
                    </th>
                  </tr>
                  <tr>
                    <td className="field-lbl">Cơ sở Thú y:</td>
                    <td className="field-val">{agency.agencyName || 'Chưa điền'}</td>
                    <td className="field-lbl">Bác sĩ phụ trách:</td>
                    <td className="field-val">{agency.veterinarianName || 'Chưa điền'}</td>
                  </tr>
                  <tr>
                    <td className="field-lbl">Số CCHN Thú y:</td>
                    <td className="field-val">{agency.licenseNumber || 'Chưa điền'}</td>
                    <td className="field-lbl">Hotline liên hệ:</td>
                    <td className="field-val">{agency.phone || 'Chưa điền'}</td>
                  </tr>
                  <tr>
                    <td className="field-lbl">Địa chỉ cơ sở:</td>
                    <td colSpan={3} className="field-val">{agency.clinicAddress || 'Chưa điền'}</td>
                  </tr>

                  <tr>
                    <th colSpan={4} className="jp-table-section-title">
                      II. THÔNG TIN ĐỐI TƯỢNG CÁ THỂ NGỰA
                    </th>
                  </tr>
                  <tr>
                    <td className="field-lbl">Tên ngựa:</td>
                    <td className="field-val"><strong>{horseProfile.horseName || 'Chưa điền'}</strong></td>
                    <td className="field-lbl">Mã Microchip (ISO):</td>
                    <td className="field-val"><strong>{horseProfile.microchipNumber || 'Chưa điền'}</strong></td>
                  </tr>
                  <tr>
                    <td className="field-lbl">Giống (Breed):</td>
                    <td className="field-val">{horseProfile.breed || 'Chưa điền'}</td>
                    <td className="field-lbl">Giới tính & Tuổi:</td>
                    <td className="field-val">{horseProfile.gender || '---'} | {horseProfile.ageOrYob || '---'}</td>
                  </tr>
                  <tr>
                    <td className="field-lbl">Thân nhiệt lúc lấy mẫu:</td>
                    <td className="field-val">{horseProfile.bodyTemperature || '---'}</td>
                    <td className="field-lbl">Vị trí cấy chip:</td>
                    <td className="field-val">{horseProfile.microchipLocation || 'Bờ bờm trái'}</td>
                  </tr>
                  <tr>
                    <td className="field-lbl">Nhận dạng & Màu lông:</td>
                    <td colSpan={3} className="field-val">{horseProfile.coatColorMarkings || 'Chưa điền'}</td>
                  </tr>
                  <tr>
                    <td className="field-lbl">Tình trạng lâm sàng:</td>
                    <td colSpan={3} className="field-val">{horseProfile.clinicalSigns || 'Không phát hiện bất thường'}</td>
                  </tr>

                  <tr>
                    <th colSpan={4} className="jp-table-section-title">
                      III. CHỈ ĐỊNH XÉT NGHIỆM LAB (QUY CHUẨN AQS NHẬT BẢN)
                    </th>
                  </tr>
                  <tr>
                    <td className="field-lbl">Phòng Lab tiếp nhận:</td>
                    <td colSpan={3} className="field-val"><strong>{requisition.designatedLab}</strong></td>
                  </tr>
                  <tr>
                    <td className="field-lbl">Loại mẫu & Thời gian:</td>
                    <td colSpan={3} className="field-val">
                      {requisition.sampleType} | Lấy lúc: {requisition.samplingTime || '--:--'} ngày {requisition.samplingDate || '---'}
                    </td>
                  </tr>
                  <tr>
                    <td className="field-lbl">Danh mục 4 bệnh:</td>
                    <td colSpan={3} className="field-val">
                      <div className="jp-paper-check-list">
                        <div>
                          {requisition.selectedDiseases.EIA ? '☑' : '☐'} 1. Thiếu máu truyền nhiễm ở ngựa (EIA - AGID / Coggins)
                        </div>
                        <div>
                          {requisition.selectedDiseases.EVA ? '☑' : '☐'} 2. Viêm động mạch ở ngựa (EVA - Virus Neutralization)
                        </div>
                        <div>
                          {requisition.selectedDiseases.Piroplasmosis ? '☑' : '☐'} 3. Ký sinh trùng Babesia & Theileria (Piroplasmosis - cELISA)
                        </div>
                        <div>
                          {requisition.selectedDiseases.WNV ? '☑' : '☐'} 4. Virus Tây Sông Nile (WNV - IgM Capture ELISA)
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Chữ ký hai bên */}
              <div className="jp-paper-signatures">
                <div className="jp-sig-box">
                  <strong>ĐẠI DIỆN CHỦ NGỰA / XUẤT CẢNH</strong>
                  <br />
                  <span>(Ký, ghi rõ họ tên)</span>
                  <div className="jp-sig-space" />
                </div>
                <div className="jp-sig-box">
                  <strong>BÁC SĨ THÚ Y LẤY MẪU CHỈ ĐỊNH</strong>
                  <br />
                  <span>(Ký tên và đóng dấu cơ sở)</span>
                  <div className="jp-sig-space" />
                  <strong>{agency.veterinarianName || 'BSTY. Phụ trách'}</strong>
                </div>
              </div>
            </div>

            <div className="jp-modal-footer">
              <button
                type="button"
                className="jp-btn-secondary"
                onClick={() => setShowPreviewModal(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="jp-btn-primary"
                onClick={() => window.print()}
              >
                🖨️ In Phiếu / Xuất PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
