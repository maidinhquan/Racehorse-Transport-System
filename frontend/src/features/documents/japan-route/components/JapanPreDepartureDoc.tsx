import React, { type ChangeEvent } from 'react';
import type {
  FlightDetails,
  AnimalProfile,
  Stakeholders,
  QuarantineBooking,
} from '../types/japanRoute.types';

interface JapanPreDepartureDocProps {
  flight: FlightDetails;
  onFlightChange: (field: keyof FlightDetails, value: string) => void;

  animal: AnimalProfile;
  onAnimalChange: (field: keyof AnimalProfile, value: string | number) => void;

  stakeholders: Stakeholders;
  onStakeholderChange: (
    party: 'exporterVN' | 'importerJP' | 'thirdPartyAgent',
    field: 'name' | 'address' | 'contactPerson' | 'phone',
    value: string
  ) => void;

  quarantine: QuarantineBooking;
  onQuarantineChange: (field: keyof QuarantineBooking, value: string) => void;
  onQuarantineFileUpload: (
    type: 'vnCert' | 'jpBooking',
    file: File | null
  ) => void;
  onOpenZoom: (url: string, title: string) => void;
}

export const JapanPreDepartureDoc: React.FC<JapanPreDepartureDocProps> = ({
  flight,
  onFlightChange,
  animal,
  onAnimalChange,
  stakeholders,
  onStakeholderChange,
  quarantine,
  onQuarantineChange,
  onQuarantineFileUpload,
  onOpenZoom,
}) => {
  const handleVnCertFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onQuarantineFileUpload('vnCert', file);
  };

  const handleJpBookingFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onQuarantineFileUpload('jpBooking', file);
  };

  // Tính số ngày cách ly thực tế tại VN
  const calculateVnQuarantineDays = (): number | null => {
    if (!quarantine.vnQuarantineStartDate || !quarantine.vnQuarantineEndDate) return null;
    const start = new Date(quarantine.vnQuarantineStartDate).getTime();
    const end = new Date(quarantine.vnQuarantineEndDate).getTime();
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : null;
  };

  const quarantineDays = calculateVnQuarantineDays();

  return (
    <div className="jp-module-section">
      <div className="jp-section-header">
        <div className="jp-section-badge">Phân hệ 1</div>
        <h2 className="jp-section-title">Hồ sơ & Giấy tờ Khai báo đi Nhật (Pre-departure Documentation)</h2>
        <p className="jp-section-desc">
          Thu thập toàn bộ thông tin hành chính, danh tính cá thể và chứng nhận kiểm dịch trước chuyến bay theo tiêu chuẩn Cục Kiểm dịch Động vật Nhật Bản (AQS - MAFF).
        </p>
      </div>

      {/* 1. Khối Thông tin chuyến bay */}
      <div className="jp-card">
        <h3 className="jp-card-title">
          <span className="jp-icon">✈️</span> Khối Thông tin chuyến bay (Flight Details)
        </h3>
        <div className="jp-grid-2">
          <div className="jp-form-group">
            <label className="jp-label">
              Ngày hạ cánh dự kiến tại Nhật <span className="jp-required">*</span>
            </label>
            <input
              type="date"
              className="jp-input"
              value={flight.arrivalDate}
              onChange={(e) => onFlightChange('arrivalDate', e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Số hiệu chuyến bay <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: JL752, NH834, VN300"
              value={flight.flightNumber}
              onChange={(e) => onFlightChange('flightNumber', e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Sân bay khởi hành (Việt Nam) <span className="jp-required">*</span>
            </label>
            <select
              className="jp-select"
              value={flight.departureAirport}
              onChange={(e) => onFlightChange('departureAirport', e.target.value)}
            >
              <option value="">-- Chọn sân bay đi --</option>
              <option value="SGN">Sân bay Tân Sơn Nhất (SGN) - TP.HCM</option>
              <option value="HAN">Sân bay Nội Bài (HAN) - Hà Nội</option>
              <option value="DAD">Sân bay Đà Nẵng (DAD)</option>
            </select>
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Sân bay hạ cánh (Nhật Bản) <span className="jp-required">*</span>
            </label>
            <select
              className="jp-select"
              value={flight.arrivalAirport}
              onChange={(e) => onFlightChange('arrivalAirport', e.target.value)}
            >
              <option value="">-- Chọn sân bay đến tại Nhật --</option>
              <option value="NRT">Sân bay Quốc tế Narita (NRT) - Trạm AQS Tokyo</option>
              <option value="HND">Sân bay Quốc tế Haneda (HND) - Tokyo</option>
              <option value="KIX">Sân bay Quốc tế Kansai (KIX) - Osaka</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Khối Thông tin Hàng hóa / Cá thể */}
      <div className="jp-card">
        <h3 className="jp-card-title">
          <span className="jp-icon">🐎</span> Khối Thông tin cá thể ngựa (Cargo / Animal Profile)
        </h3>
        <div className="jp-grid-3">
          <div className="jp-form-group">
            <label className="jp-label">
              Giống loài / Chủng loại <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Thoroughbred (Thuần chủng), Arabian"
              value={animal.breed}
              onChange={(e) => onAnimalChange('breed', e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Mục đích nhập khẩu <span className="jp-required">*</span>
            </label>
            <select
              className="jp-select"
              value={animal.purpose}
              onChange={(e) => onAnimalChange('purpose', e.target.value)}
            >
              <option value="Racing">Đua ngựa / Thi đấu thể thao (Racing)</option>
              <option value="Breeding">Nhân giống di truyền (Breeding)</option>
              <option value="Commercial">Thương mại / Triển lãm (Commercial)</option>
              <option value="Other">Mục đích khác</option>
            </select>
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Số lượng cá thể <span className="jp-required">*</span>
            </label>
            <input
              type="number"
              min={1}
              className="jp-input"
              value={animal.quantity}
              onChange={(e) => onAnimalChange('quantity', Number(e.target.value) || 1)}
            />
          </div>
        </div>

        <div className="jp-grid-2">
          <div className="jp-form-group">
            <label className="jp-label">
              Mã số Chip điện tử (Microchip ISO 11784/11785) <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              maxLength={15}
              className="jp-input"
              placeholder="Chuỗi 15 chữ số định danh (VD: 982000123456789)"
              value={animal.microchipNumber}
              onChange={(e) => onAnimalChange('microchipNumber', e.target.value)}
            />
            {animal.microchipNumber && animal.microchipNumber.length !== 15 && (
              <span className="jp-field-warning">
                ⚠️ Mã chip chuẩn ISO Nhật Bản yêu cầu chính xác 15 chữ số. (Hiện có: {animal.microchipNumber.length}/15)
              </span>
            )}
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Vị trí cấy chip trên cá thể <span className="jp-required">*</span>
            </label>
            <select
              className="jp-select"
              value={animal.microchipLocation}
              onChange={(e) => onAnimalChange('microchipLocation', e.target.value)}
            >
              <option value="">-- Chọn vị trí cấy chip --</option>
              <option value="Nuchal Ligament Left">Bờ trên cơ cổ trái (Dây chằng gáy nuchal - Chuẩn quốc tế)</option>
              <option value="Nuchal Ligament Right">Bờ trên cơ cổ phải</option>
              <option value="Shoulder Left">Khối cơ vai trái</option>
            </select>
          </div>
        </div>

        <div className="jp-form-group">
          <label className="jp-label">
            Đặc điểm nhận dạng / Sơ đồ vệt lông (Silhouette & Markings) <span className="jp-required">*</span>
          </label>
          <textarea
            rows={2}
            className="jp-textarea"
            placeholder="Mô tả màu lông, các xoáy lông (whorls), đốm trắng ở trán/mũi, tất trắng ở các chân..."
            value={animal.identificationMarkings}
            onChange={(e) => onAnimalChange('identificationMarkings', e.target.value)}
          />
        </div>
      </div>

      {/* 3. Khối Thông tin các bên liên quan */}
      <div className="jp-card">
        <h3 className="jp-card-title">
          <span className="jp-icon">🏢</span> Khối Thông tin các bên liên quan (Stakeholders)
        </h3>
        
        {/* Bên VN */}
        <div className="jp-subcard">
          <h4 className="jp-subcard-title">1. Đơn vị Xuất khẩu tại Việt Nam (Consignor / Exporter)</h4>
          <div className="jp-grid-2">
            <div className="jp-form-group">
              <label className="jp-label">Tên công ty / Chủ sở hữu <span className="jp-required">*</span></label>
              <input
                type="text"
                className="jp-input"
                placeholder="VD: Cty TNHH Vận tải Ngựa Đua Sài Gòn"
                value={stakeholders.exporterVN.name}
                onChange={(e) => onStakeholderChange('exporterVN', 'name', e.target.value)}
              />
            </div>
            <div className="jp-form-group">
              <label className="jp-label">Người liên hệ & Số điện thoại <span className="jp-required">*</span></label>
              <input
                type="text"
                className="jp-input"
                placeholder="Họ tên - SĐT liên lạc"
                value={stakeholders.exporterVN.phone}
                onChange={(e) => onStakeholderChange('exporterVN', 'phone', e.target.value)}
              />
            </div>
          </div>
          <div className="jp-form-group">
            <label className="jp-label">Địa chỉ trụ sở / Trại xuất phát tại VN <span className="jp-required">*</span></label>
            <input
              type="text"
              className="jp-input"
              placeholder="Địa chỉ chi tiết cơ sở tại Việt Nam"
              value={stakeholders.exporterVN.address}
              onChange={(e) => onStakeholderChange('exporterVN', 'address', e.target.value)}
            />
          </div>
        </div>

        {/* Bên Nhật */}
        <div className="jp-subcard">
          <h4 className="jp-subcard-title">2. Đơn vị Tiếp nhận tại Nhật Bản (Consignee / Importer)</h4>
          <div className="jp-grid-2">
            <div className="jp-form-group">
              <label className="jp-label">Tên công ty / Trang trại nhận tại Nhật <span className="jp-required">*</span></label>
              <input
                type="text"
                className="jp-input"
                placeholder="VD: Japan Horse Racing Association / Trang trại Hokkaido"
                value={stakeholders.importerJP.name}
                onChange={(e) => onStakeholderChange('importerJP', 'name', e.target.value)}
              />
            </div>
            <div className="jp-form-group">
              <label className="jp-label">Người đại diện & SĐT tại Nhật <span className="jp-required">*</span></label>
              <input
                type="text"
                className="jp-input"
                placeholder="Người liên hệ tại Nhật (+81...)"
                value={stakeholders.importerJP.phone}
                onChange={(e) => onStakeholderChange('importerJP', 'phone', e.target.value)}
              />
            </div>
          </div>
          <div className="jp-form-group">
            <label className="jp-label">Địa chỉ giao hàng / Trang trại đích tại Nhật Bản <span className="jp-required">*</span></label>
            <input
              type="text"
              className="jp-input"
              placeholder="Địa chỉ chi tiết cơ sở tiếp nhận tại Nhật"
              value={stakeholders.importerJP.address}
              onChange={(e) => onStakeholderChange('importerJP', 'address', e.target.value)}
            />
          </div>
        </div>

        {/* Đơn vị FWD trung gian */}
        <div className="jp-subcard">
          <h4 className="jp-subcard-title">3. Đơn vị Dịch vụ hỗ trợ bên thứ 3 (Logistics Forwarder)</h4>
          <div className="jp-grid-2">
            <div className="jp-form-group">
              <label className="jp-label">Tên đại lý giao nhận hàng không</label>
              <input
                type="text"
                className="jp-input"
                placeholder="VD: Nippon Express / DHL Global Forwarding"
                value={stakeholders.thirdPartyAgent.name}
                onChange={(e) => onStakeholderChange('thirdPartyAgent', 'name', e.target.value)}
              />
            </div>
            <div className="jp-form-group">
              <label className="jp-label">Hotline hỗ trợ khẩn cấp 24/7</label>
              <input
                type="text"
                className="jp-input"
                placeholder="Số điện thoại tổng đài hỗ trợ chuyến bay"
                value={stakeholders.thirdPartyAgent.phone}
                onChange={(e) => onStakeholderChange('thirdPartyAgent', 'phone', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Khối Thông tin & Chứng nhận Cách ly */}
      <div className="jp-card">
        <h3 className="jp-card-title">
          <span className="jp-icon">🏥</span> Khối Thông tin & Chứng nhận Cách ly (Quarantine Booking)
        </h3>
        
        <div className="jp-grid-2">
          <div className="jp-form-group">
            <label className="jp-label">
              Cơ sở trạm cách ly tại Việt Nam <span className="jp-required">*</span>
            </label>
            <input
              type="text"
              className="jp-input"
              placeholder="VD: Trạm Kiểm dịch Động vật Vùng VI / Khu cách ly Tân Cảng"
              value={quarantine.vnQuarantineFacility}
              onChange={(e) => onQuarantineChange('vnQuarantineFacility', e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Trạm kiểm dịch cách ly tại Nhật Bản <span className="jp-required">*</span>
            </label>
            <select
              className="jp-select"
              value={quarantine.jpQuarantineStation}
              onChange={(e) => onQuarantineChange('jpQuarantineStation', e.target.value)}
            >
              <option value="">-- Chọn trạm cách ly tại Nhật --</option>
              <option value="AQS Narita Airport Sub-station">Trạm Kiểm dịch Động vật Sân bay Narita (AQS)</option>
              <option value="AQS Kansai Airport Sub-station">Trạm Kiểm dịch Động vật Sân bay Kansai (AQS)</option>
              <option value="AQS Haneda Airport Center">Trạm Kiểm dịch Động vật Sân bay Haneda (AQS)</option>
            </select>
          </div>
        </div>

        <div className="jp-grid-2">
          <div className="jp-form-group">
            <label className="jp-label">
              Ngày bắt đầu cách ly tại VN <span className="jp-required">*</span>
            </label>
            <input
              type="date"
              className="jp-input"
              value={quarantine.vnQuarantineStartDate}
              onChange={(e) => onQuarantineChange('vnQuarantineStartDate', e.target.value)}
            />
          </div>

          <div className="jp-form-group">
            <label className="jp-label">
              Ngày kết thúc cách ly tại VN <span className="jp-required">*</span>
            </label>
            <input
              type="date"
              className="jp-input"
              value={quarantine.vnQuarantineEndDate}
              onChange={(e) => onQuarantineChange('vnQuarantineEndDate', e.target.value)}
            />
          </div>
        </div>

        {quarantineDays !== null && (
          <div className={`jp-alert ${quarantineDays >= 7 ? 'jp-alert-success' : 'jp-alert-danger'}`}>
            <span>
              {quarantineDays >= 7
                ? `✅ Đạt điều kiện: Đã hoàn thành cách ly tại VN ${quarantineDays} ngày (Quy định tối thiểu: 7 ngày).`
                : `❌ Chưa đạt: Thời gian cách ly hiện mới được ${quarantineDays} ngày (Phải đạt tối thiểu 7 ngày trước khi xuất cảnh).`}
            </span>
          </div>
        )}

        {/* Upload giấy tờ cách ly VN & Xác nhận đặt chỗ Nhật */}
        <div className="jp-grid-2" style={{ marginTop: '16px' }}>
          <div className="jp-upload-box">
            <label className="jp-label">
              1. Chứng nhận đã cách ly tại VN (Tối thiểu 7 ngày) <span className="jp-required">*</span>
            </label>
            <div className="jp-upload-area">
              <input
                type="file"
                accept="image/*,application/pdf"
                id="vn-cert-file"
                className="jp-file-hidden"
                onChange={handleVnCertFile}
              />
              <label htmlFor="vn-cert-file" className="jp-upload-btn">
                📎 Chọn tệp / Chụp ảnh chứng nhận
              </label>
              {quarantine.vnCertificateFileName && (
                <div className="jp-file-preview-row">
                  <span className="jp-file-name">📄 {quarantine.vnCertificateFileName}</span>
                  {quarantine.vnCertificatePreviewUrl && (
                    <button
                      type="button"
                      className="jp-btn-view"
                      onClick={() => onOpenZoom(quarantine.vnCertificatePreviewUrl!, 'Chứng nhận cách ly tại VN')}
                    >
                      🔍 Xem ảnh
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="jp-upload-box">
            <label className="jp-label">
              2. Xác nhận đặt chỗ Trạm cách ly Nhật Bản (AQS Booking) <span className="jp-required">*</span>
            </label>
            <div className="jp-upload-area">
              <input
                type="file"
                accept="image/*,application/pdf"
                id="jp-booking-file"
                className="jp-file-hidden"
                onChange={handleJpBookingFile}
              />
              <label htmlFor="jp-booking-file" className="jp-upload-btn">
                📎 Chọn tệp / Xác nhận đặt chỗ AQS
              </label>
              {quarantine.jpBookingConfirmationFileName && (
                <div className="jp-file-preview-row">
                  <span className="jp-file-name">📄 {quarantine.jpBookingConfirmationFileName}</span>
                  {quarantine.jpBookingConfirmationPreviewUrl && (
                    <button
                      type="button"
                      className="jp-btn-view"
                      onClick={() => onOpenZoom(quarantine.jpBookingConfirmationPreviewUrl!, 'Xác nhận đặt chỗ kiểm dịch tại Nhật')}
                    >
                      🔍 Xem ảnh
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
