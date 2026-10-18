import React from 'react';
import { EMPLOYEES } from './coordinator.types';

export const RenderCrewPage: React.FC = () => {
  return (
    <div className="render-crew-page">
      <div className="head">
        <div>
          <h2 className="page-title">Crew Assignments</h2>
          <p className="subtitle">
            Đội ngũ tài xế đường bộ và bác sĩ thú y hộ tống chuyên môn cao.
          </p>
        </div>
      </div>

      <div className="card pad" style={{ marginTop: '16px' }}>
        <table>
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Chức danh tác nghiệp</th>
              <th>Quốc gia</th>
              <th>Số điện thoại</th>
              <th>Thời hạn chứng chỉ hành nghề</th>
              <th>Tình trạng</th>
            </tr>
          </thead>
          <tbody>
            {EMPLOYEES.map((e) => (
              <tr key={e.id}>
                <td><b style={{ color: 'var(--ink)' }}>{e.name}</b></td>
                <td>
                  <span className={`pill ${e.role === 'VETERINARIAN' ? 'ok' : 'transit'}`}>
                    {e.role === 'VETERINARIAN' ? 'Bác sĩ thú y' : 'Tài xế quốc tế'}
                  </span>
                </td>
                <td>{e.country}</td>
                <td>{e.phone}</td>
                <td>{e.certExpiry}</td>
                <td><span className="pill READY">Sẵn sàng</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
