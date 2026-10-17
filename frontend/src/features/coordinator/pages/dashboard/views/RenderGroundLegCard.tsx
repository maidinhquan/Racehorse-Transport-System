import React from 'react';
import type { MockTrip } from './coordinator.types';
import { VEHICLES, EMPLOYEES } from './coordinator.types';

interface RenderGroundLegCardProps {
  leg: 'outbound' | 'inbound';
  curTrip: MockTrip;
  onSetGroundVehicle: (leg: 'outbound' | 'inbound', vehicleId: string) => void;
  onSetGroundCrew: (leg: 'outbound' | 'inbound', role: 'mainDriver' | 'coDriver' | 'vet', staffId: string) => void;
}

export const RenderGroundLegCard: React.FC<RenderGroundLegCardProps> = ({
  leg,
  curTrip,
  onSetGroundVehicle,
  onSetGroundCrew,
}) => {
  const isOutbound = leg === 'outbound';
  const legData = isOutbound ? curTrip.outboundLeg : curTrip.inboundLeg;
  const country = isOutbound ? 'VN' : 'JP';
  const legLabel = isOutbound ? 'ROAD VN' : 'ROAD JP';
  const legTitle = isOutbound ? 'CHẶNG 1 · PRE-FLIGHT ROAD' : 'CHẶNG 2 · POST-FLIGHT ROAD';
  const legDesc = isOutbound ? 'Vận chuyển trước chuyến bay' : 'Vận chuyển sau chuyến bay';
  const routeText = isOutbound
    ? 'Trang trại Bến Cát (Bình Dương) ➔ Sân bay Tân Sơn Nhất (SGN)'
    : 'Sân bay Quốc tế Narita (NRT) ➔ Trường đua Fuchu (Tokyo)';

  const availableVehicles = VEHICLES.filter((v) => v.country === country && v.status === 'READY');
  const availableStaff = (role: string) =>
    EMPLOYEES.filter(
      (e) => e.country === country && (role === 'VETERINARIAN' ? e.role === 'VETERINARIAN' : e.role === 'DRIVER')
    );

  const selectedVehicleObj = VEHICLES.find((v) => v.id === legData.vehicleId);
  const vehicleOk = selectedVehicleObj && selectedVehicleObj.stalls >= curTrip.horses;
  const crewOk = legData.mainDriver && legData.coDriver && legData.vet && legData.mainDriver !== legData.coDriver;
  const legOk = vehicleOk && crewOk;

  return (
    <section className="cbn-road-leg" key={leg}>
      <header className="cbn-road-head">
        <div>
          <div className="eyebrow">{legTitle}</div>
          <h3>{legLabel} – {legDesc}</h3>
          <div className="cbn-road-route">
            <span>{routeText}</span>
          </div>
          <p className="subtitle" style={{ fontSize: '11px', marginTop: '6px' }}>
            Quốc gia: <b>{country}</b> • Số ngựa: <b>{curTrip.horses} cá thể</b> • Hạn CCHN Bác sĩ thú y hợp lệ
          </p>
        </div>
        <span className={`pill ${legOk ? 'READY' : 'PENDING'}`}>
          {legOk ? 'Đã đủ nguồn lực' : 'Chưa đầy đủ nguồn lực'}
        </span>
      </header>

      <div className="cbn-road-grid">
        {/* Card Xe vận chuyển */}
        <div className="card cbn-road-card">
          <div className="section-title">
            <h4 className="card-title">Xe vận chuyển chuyên dụng</h4>
            <span className={`pill ${vehicleOk ? 'READY' : 'NOT_READY'}`}>
              {vehicleOk ? 'Hợp lệ' : 'Chưa đạt'}
            </span>
          </div>

          {selectedVehicleObj && (
            <div className="cbn-road-selected">
              <span>Xe đang phân công:</span>
              <b>{selectedVehicleObj.plate} ({selectedVehicleObj.model})</b>
              <small>{selectedVehicleObj.stalls} khoang stalls chuyên dụng • Đầy đủ đệm khí giảm chấn</small>
            </div>
          )}

          <div style={{ marginTop: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Chọn xe tại {country}:</span>
            {availableVehicles.map((v) => (
              <div key={v.id} className="cbn-road-vrow">
                <div className="grow">
                  <b>{v.plate}</b>
                  <p>{v.model} • {v.stalls} ngăn • {v.base}</p>
                  <small>
                    Sức chứa: {v.stalls >= curTrip.horses ? `Đủ cho ${curTrip.horses} ngựa` : `Không đủ (${v.stalls} ngăn)`}
                  </small>
                </div>
                <button
                  className={`btn ${legData.vehicleId === v.id ? 'soft' : 'solid'} sm`}
                  disabled={legData.vehicleId === v.id}
                  onClick={() => onSetGroundVehicle(leg, v.id)}
                >
                  {legData.vehicleId === v.id ? 'Đang chọn' : 'Phân công'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Card Tổ nhân sự */}
        <div className="card cbn-road-card">
          <div className="section-title">
            <h4 className="card-title">Tổ nhân sự vận hành (3 vị trí bắt buộc)</h4>
            <span className={`pill ${crewOk ? 'READY' : 'NOT_READY'}`}>
              {crewOk ? 'Đủ 3 vị trí' : 'Chưa đủ'}
            </span>
          </div>
          <p className="subtitle" style={{ fontSize: '11px' }}>
            Ba nhân sự riêng biệt, đúng quốc gia, không trùng lịch; chứng chỉ thú y còn hiệu lực.
          </p>

          <div className="cbn-road-staff">
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                Tài xế chính (Main Driver) *
              </label>
              <select
                value={legData.mainDriver}
                onChange={(e) => onSetGroundCrew(leg, 'mainDriver', e.target.value)}
              >
                <option value="">— Chọn tài xế chính —</option>
                {availableStaff('DRIVER').map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.phone})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                Phụ lái kiêm Escort chăm sóc (Co-Driver) *
              </label>
              <select
                value={legData.coDriver}
                onChange={(e) => onSetGroundCrew(leg, 'coDriver', e.target.value)}
              >
                <option value="">— Chọn phụ lái —</option>
                {availableStaff('DRIVER').map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.phone})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                {isOutbound ? 'Bác sĩ thú y A (Origin Vet) *' : 'Bác sĩ thú y B (Destination Vet) *'}
              </label>
              <select
                value={legData.vet}
                onChange={(e) => onSetGroundCrew(leg, 'vet', e.target.value)}
              >
                <option value="">— Chọn bác sĩ thú y —</option>
                {availableStaff('VETERINARIAN').map((e) => (
                  <option key={e.id} value={e.id}>{e.name} (Hạn CCHN: {e.certExpiry})</option>
                ))}
              </select>
            </div>
          </div>

          <p className="cbn-road-note">
            {isOutbound
              ? 'Tại sân bay xuất phát, Bác sĩ thú y A phối hợp kiểm tra sức khỏe và bàn giao ngựa cùng hồ sơ kiểm dịch cho đơn vị hàng không.'
              : 'Sau khi máy bay hạ cánh và làm thủ tục kiểm dịch, Bác sĩ thú y B tiếp nhận ngựa và hồ sơ y tế từ đơn vị hàng không để chuyển lên xe về trường đua.'}
          </p>
        </div>
      </div>

      <details className="cbn-road-history">
        <summary>Lịch sử phân công chặng đường bộ ({country})</summary>
        <div className="cbn-road-log">
          <b>Khởi tạo dữ liệu chặng</b> • 2026-10-17 14:00 • Dang Minh Quan
          <p>Phương tiện và nhân sự được thiết lập tự động từ lịch điều phối dự kiến.</p>
        </div>
      </details>
    </section>
  );
};
