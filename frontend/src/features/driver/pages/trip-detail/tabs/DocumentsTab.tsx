import React from 'react';
import type { Trip } from '../../../types';
import { useDriver } from '../../../hooks/useDriver';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import { fmtDate, fmtDateTime } from '../../../hooks/driverRules';

/** Chỉ xem: đúng phiên bản hồ sơ Transport Specialist đã bàn giao cho tổ xe */
export const DocumentsTab: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { horse } = useDriver();
  return (
    <div className="drv-card">
      <h3 className="drv-card__title">Bộ hồ sơ mang theo</h3>
      {trip.documents.length ? trip.documents.map((k) => (
        <div key={k.id} className="drv-pkg">
          <div className="drv-pkg__head"><b>{k.title}</b><TripStatusBadge tone="ok" label="Tổ xe đang giữ" /></div>
          <p className="drv-hint" style={{ marginTop: 4 }}>{k.checkpoint ? `Dùng tại ${k.checkpoint}` : 'Dùng cho cả chuyến'} • bàn giao {fmtDateTime(k.releasedAt)} bởi {k.releasedBy}</p>
          {k.items.map((x, i) => (
            <div key={x.name + i} className="drv-row">
              <div className="drv-row__text">
                <b>{x.name}</b>
                <span>{x.horseId ? horse(x.horseId)?.name ?? x.horseId : 'Theo chuyến'} • v{x.version}{x.number ? ` • số ${x.number}` : ''}{x.expiry ? ` • hết hạn ${fmtDate(x.expiry)}` : ''}</span>
              </div>
              <TripStatusBadge tone="ok" label="Đã duyệt" />
            </div>
          ))}
        </div>
      )) : <div className="drv-empty"><b>Chưa có bộ hồ sơ</b>Transport Specialist bàn giao hồ sơ cho từng cửa khẩu / trạm trước khi xuất phát.</div>}
    </div>
  );
};

export default DocumentsTab;
