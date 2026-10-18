import React from 'react';
import type {
  LegVehicleInfo,
  LegCrewInfo,
} from '../types/japanRoute.types';

interface JapanLogisticsEscortProps {
  vehicles: {
    leg1: LegVehicleInfo;
    leg2: LegVehicleInfo;
    leg3: LegVehicleInfo;
    leg4: LegVehicleInfo;
  };
  onVehicleChange: (
    legKey: 'leg1' | 'leg2' | 'leg3' | 'leg4',
    field: keyof LegVehicleInfo,
    value: string
  ) => void;

  crews: {
    leg1Crew: LegCrewInfo;
    flightCrew: LegCrewInfo;
    leg4Crew: LegCrewInfo;
  };
  onCrewChange: (
    crewKey: 'leg1Crew' | 'flightCrew' | 'leg4Crew',
    field: keyof LegCrewInfo,
    value: string
  ) => void;
}

export const JapanLogisticsEscort: React.FC<JapanLogisticsEscortProps> = ({
  vehicles,
  onVehicleChange,
  crews,
  onCrewChange,
}) => {
  return (
    <div className="jp-module-section">
      <div className="jp-section-header">
        <div className="jp-section-badge jp-badge-blue">Phân hệ 3</div>
        <h2 className="jp-section-title">Điều phối Vận chuyển & Nhân sự Hộ tống (Logistics & Escort Tracking)</h2>
        <p className="jp-section-desc">
          Quản lý chi tiết phương tiện chuyên dụng và nhân sự theo dõi sức khỏe cá thể ngựa qua 4 chặng di chuyển từ Việt Nam sang Nhật Bản.
        </p>
      </div>

      {/* 1. Khối Quản lý Phương tiện theo 4 Chặng */}
      <div className="jp-card">
        <h3 className="jp-card-title">
          <span className="jp-icon">🚚</span> Khối Quản lý Phương tiện theo chặng (Transport Vehicles)
        </h3>

        {/* Chặng 1 */}
        <div className="jp-leg-box">
          <div className="jp-leg-header">
            <span className="jp-leg-num">Chặng 1</span>
            <h4 className="jp-leg-title">Nội địa xuất phát (Từ nơi cách ly ra Sân bay Việt Nam)</h4>
          </div>
          <div className="jp-grid-3">
            <div className="jp-form-group">
              <label className="jp-label">Biển số xe chuyên dụng:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="VD: 51C-982.34"
                value={vehicles.leg1.vehiclePlateOrFlight}
                onChange={(e) =>
                  onVehicleChange('leg1', 'vehiclePlateOrFlight', e.target.value)
                }
              />
            </div>
            <div className="jp-form-group">
              <label className="jp-label">Loại xe thùng chuyên dụng:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="VD: Xe thùng đệm hơi 2 ngựa, kiểm soát nhiệt"
                value={vehicles.leg1.vehicleTypeOrContainer}
                onChange={(e) =>
                  onVehicleChange('leg1', 'vehicleTypeOrContainer', e.target.value)
                }
              />
            </div>
            <div className="jp-form-group">
              <label className="jp-label">Giờ xe xuất phát dự kiến:</label>
              <input
                type="time"
                className="jp-input"
                value={vehicles.leg1.departureTime}
                onChange={(e) =>
                  onVehicleChange('leg1', 'departureTime', e.target.value)
                }
              />
            </div>
          </div>
        </div>

        {/* Chặng 2 */}
        <div className="jp-leg-box">
          <div className="jp-leg-header">
            <span className="jp-leg-num jp-leg-sky">Chặng 2</span>
            <h4 className="jp-leg-title">Đường hàng không (Chuyến bay từ Việt Nam sang Nhật Bản)</h4>
          </div>
          <div className="jp-grid-3">
            <div className="jp-form-group">
              <label className="jp-label">Mã số chuyến bay:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="VD: JL752 (Japan Airlines)"
                value={vehicles.leg2.vehiclePlateOrFlight}
                onChange={(e) =>
                  onVehicleChange('leg2', 'vehiclePlateOrFlight', e.target.value)
                }
              />
            </div>
            <div className="jp-form-group">
              <label className="jp-label">Mã chuồng bay / Khoang hàng:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="VD: Air Stall K-Box A350"
                value={vehicles.leg2.vehicleTypeOrContainer}
                onChange={(e) =>
                  onVehicleChange('leg2', 'vehicleTypeOrContainer', e.target.value)
                }
              />
            </div>
            <div className="jp-form-group">
              <label className="jp-label">Giờ cất cánh ➔ Giờ hạ cánh:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="VD: 23:30 (SGN) ➔ 07:15 (NRT)"
                value={vehicles.leg2.departureTime}
                onChange={(e) =>
                  onVehicleChange('leg2', 'departureTime', e.target.value)
                }
              />
            </div>
          </div>
        </div>

        {/* Chặng 3 */}
        <div className="jp-leg-box">
          <div className="jp-leg-header">
            <span className="jp-leg-num jp-leg-purple">Chặng 3</span>
            <h4 className="jp-leg-title">Đón tại Sân bay đến (Từ Sân bay về Khu cách ly AQS tại Nhật)</h4>
          </div>
          <div className="jp-grid-2">
            <div className="jp-form-group">
              <label className="jp-label">Đơn vị xe hộ tống tại Nhật tiếp nhận:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="VD: Narita Horse Transport Co., Ltd"
                value={vehicles.leg3.vehicleTypeOrContainer}
                onChange={(e) =>
                  onVehicleChange('leg3', 'vehicleTypeOrContainer', e.target.value)
                }
              />
            </div>
            <div className="jp-form-group">
              <label className="jp-label">Biển số xe vận chuyển tại Nhật:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="VD: Chiba 800-Ka-5921"
                value={vehicles.leg3.vehiclePlateOrFlight}
                onChange={(e) =>
                  onVehicleChange('leg3', 'vehiclePlateOrFlight', e.target.value)
                }
              />
            </div>
          </div>
        </div>

        {/* Chặng 4 */}
        <div className="jp-leg-box">
          <div className="jp-leg-header">
            <span className="jp-leg-num jp-leg-green">Chặng 4</span>
            <h4 className="jp-leg-title">Giao hàng cuối (Từ Trạm cách ly Nhật đến Trang trại đích cuối cùng)</h4>
          </div>
          <div className="jp-grid-2">
            <div className="jp-form-group">
              <label className="jp-label">Biển số xe chở chặng cuối:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="VD: Tokyo 100-Ta-8832"
                value={vehicles.leg4.vehiclePlateOrFlight}
                onChange={(e) =>
                  onVehicleChange('leg4', 'vehiclePlateOrFlight', e.target.value)
                }
              />
            </div>
            <div className="jp-form-group">
              <label className="jp-label">Tên trang trại / Địa điểm đích cuối cùng:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="VD: Northern Farm Hokkaido / Miho Training Center"
                value={vehicles.leg4.destinationDetails}
                onChange={(e) =>
                  onVehicleChange('leg4', 'destinationDetails', e.target.value)
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Khối Quản lý Nhân sự & Hộ tống */}
      <div className="jp-card">
        <h3 className="jp-card-title">
          <span className="jp-icon">👥</span> Khối Quản lý Đội ngũ Nhân sự Hộ tống (Transport Crew & Health Escort)
        </h3>

        {/* Nhân sự chặng VN ra sân bay */}
        <div className="jp-subcard">
          <h4 className="jp-subcard-title">1. Chặng ra Sân bay (Việt Nam)</h4>
          <div className="jp-grid-3">
            <div className="jp-form-group">
              <label className="jp-label">Tài xế lái xe ra sân bay:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="Họ tên tài xế"
                value={crews.leg1Crew.driverName}
                onChange={(e) =>
                  onCrewChange('leg1Crew', 'driverName', e.target.value)
                }
              />
            </div>
            <div className="jp-form-group">
              <label className="jp-label">Số điện thoại tài xế:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="SĐT liên hệ"
                value={crews.leg1Crew.driverPhone}
                onChange={(e) =>
                  onCrewChange('leg1Crew', 'driverPhone', e.target.value)
                }
              />
            </div>
            <div className="jp-form-group">
              <label className="jp-label">Số CCCD / Số bằng lái hạng FC:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="CCCD hoặc Giấy phép lái xe"
                value={crews.leg1Crew.driverLicense}
                onChange={(e) =>
                  onCrewChange('leg1Crew', 'driverLicense', e.target.value)
                }
              />
            </div>
          </div>
          <div className="jp-grid-2">
            <div className="jp-form-group">
              <label className="jp-label">Nhân viên theo dõi sức khỏe trên xe:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="Họ tên kỹ thuật viên / Bác sĩ thú y đi kèm"
                value={crews.leg1Crew.healthEscortName}
                onChange={(e) =>
                  onCrewChange('leg1Crew', 'healthEscortName', e.target.value)
                }
              />
            </div>
            <div className="jp-form-group">
              <label className="jp-label">SĐT nhân viên theo dõi SK:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="Số điện thoại gọi khẩn cấp"
                value={crews.leg1Crew.healthEscortPhone}
                onChange={(e) =>
                  onCrewChange('leg1Crew', 'healthEscortPhone', e.target.value)
                }
              />
            </div>
          </div>
        </div>

        {/* Nhân sự chặng trên máy bay */}
        <div className="jp-subcard">
          <h4 className="jp-subcard-title">2. Chặng trên Máy bay (Flight Attendant Groom)</h4>
          <div className="jp-grid-3">
            <div className="jp-form-group">
              <label className="jp-label">Chuyên viên áp tải đi cùng trên máy bay:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="Họ tên Groomer / Bác sĩ thú y quốc tế"
                value={crews.flightCrew.flightEscortName}
                onChange={(e) =>
                  onCrewChange('flightCrew', 'flightEscortName', e.target.value)
                }
              />
            </div>
            <div className="jp-form-group">
              <label className="jp-label">Số Hộ chiếu / Visa nhập cảnh Nhật:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="Số Passport"
                value={crews.flightCrew.flightEscortPassport}
                onChange={(e) =>
                  onCrewChange('flightCrew', 'flightEscortPassport', e.target.value)
                }
              />
            </div>
            <div className="jp-form-group">
              <label className="jp-label">SĐT quốc tế / Liên lạc khẩn:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="SĐT roaming / Quốc tế"
                value={crews.flightCrew.flightEscortPhone}
                onChange={(e) =>
                  onCrewChange('flightCrew', 'flightEscortPhone', e.target.value)
                }
              />
            </div>
          </div>
        </div>

        {/* Nhân sự chặng nội địa Nhật */}
        <div className="jp-subcard">
          <div className="jp-subcard-header-note">
            <h4 className="jp-subcard-title">3. Chặng nội địa tại Nhật (Từ Khu cách ly ➔ Điểm đến cuối)</h4>
            <span className="jp-note-badge">
              ℹ️ Đã lược bỏ chặng Sân bay ➔ Khu cách ly theo hướng dẫn
            </span>
          </div>
          <div className="jp-grid-2">
            <div className="jp-form-group">
              <label className="jp-label">Tài xế vận chuyển chặng cuối tại Nhật:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="Họ tên tài xế bên Nhật"
                value={crews.leg4Crew.driverName}
                onChange={(e) =>
                  onCrewChange('leg4Crew', 'driverName', e.target.value)
                }
              />
            </div>
            <div className="jp-form-group">
              <label className="jp-label">Nhân viên theo dõi sức khỏe chặng cuối:</label>
              <input
                type="text"
                className="jp-input"
                placeholder="Họ tên nhân viên áp tải tại Nhật"
                value={crews.leg4Crew.healthEscortName}
                onChange={(e) =>
                  onCrewChange('leg4Crew', 'healthEscortName', e.target.value)
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
