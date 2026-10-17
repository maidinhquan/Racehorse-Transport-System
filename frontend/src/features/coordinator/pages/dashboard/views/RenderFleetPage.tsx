import React from 'react';
import { VEHICLES } from './coordinator.types';

export const RenderFleetPage: React.FC = () => {
  return (
    <div className="render-fleet-page">
      <div className="head">
        <div>
          <h2 className="page-title">Fleet</h2>
          <p className="subtitle">
            Phương tiện chuyên dụng vận chuyển ngựa đua, tính khả dụng và lịch bảo dưỡng.
          </p>
        </div>
      </div>

      <div className="card pad" style={{ marginTop: '16px' }}>
        <table>
          <thead>
            <tr>
              <th>Biển số xe</th>
              <th>Dòng xe / Cấu hình</th>
              <th>Số ngăn (Stalls)</th>
              <th>Quốc gia / Trạm đỗ</th>
              <th>Lịch bảo dưỡng tiếp theo</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {VEHICLES.map((v) => (
              <tr key={v.id}>
                <td><b style={{ color: 'var(--ink)' }}>{v.plate}</b></td>
                <td>{v.model}</td>
                <td><b style={{ color: 'var(--orange-text)' }}>{v.stalls} khoang</b></td>
                <td>{v.country} • {v.base}</td>
                <td>{v.nextService}</td>
                <td>
                  <span className={`pill ${v.status === 'READY' ? 'READY' : 'NOT_READY'}`}>
                    {v.status === 'READY' ? 'Khả dụng' : 'Bảo dưỡng'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
