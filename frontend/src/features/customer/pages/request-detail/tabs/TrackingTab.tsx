import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { TransportRequest } from '../../../types';
import { fmtDateTime, tripSummary } from '../../../hooks/customerRules';
import { Icon } from '../../../components/CustomerLayout';
import { DemoPanel } from '../../../components/DemoPanel/DemoPanel';
import { LockedCard, Note } from '../../../components/Common/Common';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';

/** Tab Theo dõi: tóm tắt chuyến của yêu cầu, mở trang theo dõi đầy đủ */
export const TrackingTab: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const navigate = useNavigate();
  const t = r.trip;
  if (!t) return <LockedCard title="Chưa có chuyến" text="Chuyến đi được tạo khi hợp đồng được ký sau khi xác minh tiền cọc." />;
  const s = tripSummary(t);
  return (
    <div className="cus-grid-main">
      <div className="cus-card">
        <h3 className="cus-card__title">Chuyến {t.id} <TripStatusBadge kind="trip" status={t.status} /></h3>
        <div className="cus-kv">
          <div><span>Dự kiến xuất phát</span><b>{fmtDateTime(t.plannedDepart)}</b></div>
          <div><span>{s.adjusted ? 'ETA điều chỉnh' : 'ETA'}</span><b>{fmtDateTime(t.eta)}</b></div>
          <div><span>Phương thức</span><b>{t.mode === 'AIR' ? 'Hàng không + đường bộ' : t.mode === 'ROAD' ? 'Đường bộ' : 'Chờ Coordinator lập phương án'}</b></div>
          <div><span>Mốc xác nhận gần nhất</span><b>{s.m ? s.lastLabel : 'Chưa xuất phát'}</b></div>
          {s.m && <div><span>Xác nhận lúc</span><b>{fmtDateTime(s.m.at)}</b></div>}
          {s.adjusted && <div><span>ETA ban đầu</span><b><s>{fmtDateTime(t.etaOriginal)}</s></b></div>}
          <div><span>Tiến độ</span><b>{s.done}/{t.stops.length || '—'} điểm đã xác nhận</b></div>
        </div>
        {!t.routeApproved && <Note tone="grey" title="Tuyến chưa được duyệt">Tuyến chi tiết hiển thị khi CBN Transport duyệt lộ trình và lên lịch khởi hành.</Note>}
        {t.status !== 'PLANNING' && (
          <button type="button" className="cus-btn cus-btn--solid" style={{ marginTop: 14 }} onClick={() => navigate(`/customer/tracking/${r.id}`)}>
            <Icon name="pin" />Mở trang theo dõi chuyến
          </button>
        )}
        <p className="cus-muted" style={{ marginTop: 12 }}>Theo dõi hiển thị mốc cuối cùng do tổ xe xác nhận. Không có vị trí GPS trực tiếp giữa các mốc.</p>
      </div>
      <DemoPanel request={r} />
    </div>
  );
};

export default TrackingTab;
