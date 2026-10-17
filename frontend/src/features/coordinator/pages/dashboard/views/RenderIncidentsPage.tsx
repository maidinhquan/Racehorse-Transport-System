import React from 'react';

export const RenderIncidentsPage: React.FC = () => {
  return (
    <div className="render-incidents-page">
      <div className="head">
        <div>
          <h2 className="page-title">Incidents &amp; Adjustments</h2>
          <p className="subtitle">
            Báo cáo sự cố trên đường và đề xuất phương án đổi tuyến hoặc thay xe / nhân sự.
          </p>
        </div>
      </div>
      <div className="card pad" style={{ marginTop: '16px' }}>
        <table>
          <thead>
            <tr>
              <th>Mã sự cố</th>
              <th>Chuyến đi</th>
              <th>Loại sự cố</th>
              <th>Mức độ</th>
              <th>Phương án đề xuất</th>
              <th>Tình trạng</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>INC-2026-001</b></td>
              <td>TRP-20261125-0004</td>
              <td>Ùn tắc cửa khẩu Bavet</td>
              <td><span className="pill pending">MEDIUM</span></td>
              <td>Dời giờ đến thêm 2 tiếng</td>
              <td><span className="pill PENDING">Chờ Manager duyệt</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
