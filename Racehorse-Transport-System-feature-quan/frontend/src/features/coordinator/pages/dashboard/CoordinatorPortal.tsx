import { useState } from 'react';
import { BrandLogo } from '../../../../shared/components/brand-logo/BrandLogo';
import './CoordinatorPortal.css';

const VEHICLES = [
  { vehicleId: 'VEH-01', name: 'Scania Equine Air-Ride 51C-889.12', capacityStalls: 2, maxRangeKm: 800 },
  { vehicleId: 'VEH-02', name: 'Volvo Pro Horse Carrier 51D-334.09', capacityStalls: 6, maxRangeKm: 1200 },
];

export const CoordinatorPortal = () => {
  const horsesCount = 3;
  const [selectedVehicleId, setSelectedVehicleId] = useState('VEH-02');
  const [tDrive, setTDrive] = useState(14);
  const [tRest, setTRest] = useState(4);
  const [tCustoms, setTCustoms] = useState(6);

  const selectedVehicle = VEHICLES.find((v) => v.vehicleId === selectedVehicleId)!;
  const isOverCapacity = horsesCount > selectedVehicle.capacityStalls;
  const tTotal = tDrive + tRest + tCustoms;

  return (
    <div className="coordinator-page">
      <div className="customer-topbar">
        <BrandLogo />
        <strong>Role: Fleet & Route Coordinator</strong>
      </div>

      <div className="coordinator-card">
        <h1 className="customer-title">Thiết kế Lộ trình & Điều phối Đội xe (TRIP_PLAN)</h1>
        <p className="customer-subtitle">
          Kiểm tra tải trọng Stalls, tính tổng thời gian dự kiến và đồng bộ lên Web App cho Tài xế.
        </p>

        <div>
          <label className="form-label">
            Chọn Phương tiện Chuyên dụng (Số ngựa cần chở: <strong>{horsesCount} cá thể</strong>)
          </label>
          <select
            className="form-select"
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
          >
            {VEHICLES.map((v) => (
              <option key={v.vehicleId} value={v.vehicleId}>
                {v.name} — Sức chứa: {v.capacityStalls} Stalls (Max Range: {v.maxRangeKm} km)
              </option>
            ))}
          </select>

          {isOverCapacity && (
            <p className="text-danger">
              ❌ Phương tiện chỉ có {selectedVehicle.capacityStalls} stalls, không đủ chở {horsesCount} cá thể ngựa!
            </p>
          )}
        </div>

        <div className="time-grid-3">
          <div>
            <label className="form-label">Giờ chạy xe (T_drive)</label>
            <input type="number" className="form-input" value={tDrive} onChange={(e) => setTDrive(Number(e.target.value))} />
          </div>
          <div>
            <label className="form-label">Giờ nghỉ chăm sóc (T_rest)</label>
            <input type="number" className="form-input" value={tRest} onChange={(e) => setTRest(Number(e.target.value))} />
          </div>
          <div>
            <label className="form-label">Giờ thông quan (T_customs)</label>
            <input type="number" className="form-input" value={tCustoms} onChange={(e) => setTCustoms(Number(e.target.value))} />
          </div>
        </div>

        <div className="estimate-banner">
          <span className="form-label" style={{ margin: 0 }}>
            Tổng thời gian hành trình (T_total = T_drive + T_rest + T_customs):
          </span>
          <span className="estimate-price" style={{ color: '#F57C00' }}>{tTotal} giờ</span>
        </div>

        <button
          type="button"
          className="btn-primary"
          style={{ width: '100%', marginTop: '20px' }}
          disabled={isOverCapacity}
          onClick={() => alert('Đã cập nhật lộ trình lên Web App và gửi thông báo Email/SMS cho Tài xế!')}
        >
          Lưu Lộ Trình & Gửi Thông Báo Cho Tài Xế
        </button>
      </div>
    </div>
  );
};