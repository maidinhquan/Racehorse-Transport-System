// Chi tiết chuyến của Điều phối: Tổng quan • Tuyến đường (lập lộ trình) • Xe & nhân sự • Chuyến bay • Theo dõi hành trình
import { Cell, PillT } from '../../../components/common/ui';
import { DemoCard } from '../../../components/demo/Demo';
import { curRoute, custOf, deployed, deployPill, planPill, planState, reqOfTrip, resourceGaps, resourcePill, routePill, tripHorses, tripNextAction } from '../../../domain/coordinatorRules';
import type { Any } from '../../../store/coordinatorStore';
import { go } from '../../../store/coordinatorStore';
import { cityLabel, date, dt } from '../../../utils/format';

const NEXT_STEP: Record<string, (t: Any) => string> = {
  AWAITING_DEPLOYMENT: () => 'Đang chờ Quản lý vận hành xác nhận triển khai. Việc lập kế hoạch chính thức bắt đầu sau đó.',
  ON_HOLD: () => 'Triển khai đang tạm dừng. Kế hoạch hiện có được giữ ở chế độ chỉ xem cho đến khi Quản lý tiếp tục triển khai.',
  AWAITING_ROUTE: (t) => (curRoute(t) ? `Hoàn tất tuyến phiên bản ${curRoute(t).v} và gửi Quản lý duyệt.` : 'Bắt đầu lập tuyến.'),
  ROUTE_PENDING: (t) => `Tuyến phiên bản ${curRoute(t) ? curRoute(t).v : ''} đang chờ Quản lý quyết định.`,
  ROUTE_RETURNED: () => 'Quản lý đã trả lại tuyến. Hãy đọc nhận xét và tạo phiên bản chỉnh sửa.',
  MISSING_RESOURCES: (t) => `Phân công nguồn lực còn thiếu: ${resourceGaps(t).join(', ')}.`,
  PLANNED: () => 'Tuyến đã được duyệt và nguồn lực đã được phân công. Việc duyệt khởi hành do Quản lý quyết định.',
};

export function OverviewTab({ t }: { t: Any }) {
  const r = reqOfTrip(t), ps = planState(t);
  return (
    <div className="grid-main">
      <div className="stack">
        <div className="card"><h3 className="card-title">Tổng quan chuyến</h3>
          <div className="kv2">
            <Cell label="Chuyến">{t.id}</Cell><Cell label="Yêu cầu">{r.id}</Cell><Cell label="Khách hàng">{custOf(r).company}</Cell><Cell label="Điểm đi">{cityLabel(r.origin)}</Cell><Cell label="Điểm đến">{cityLabel(r.destination)}</Cell>
            <Cell label="Phương thức vận chuyển">{t.mode}</Cell><Cell label="Lấy ngựa mong muốn">{r.pickupAt ? date(r.pickupAt.slice(0, 10)) : '—'}</Cell><Cell label="Ngày vận chuyển">{date(r.date)}</Cell>
            <Cell label="Ngựa">{tripHorses(t).length}</Cell><Cell label="Khởi hành dự kiến">{dt(t.plannedDepart)}</Cell><Cell label="Dự kiến đến">{dt(t.eta)}</Cell>
          </div>
          <div className="kv2" style={{ marginTop: 16 }}>
            <Cell label="Triển khai"><PillT p={deployPill(t)} /></Cell><Cell label="Duyệt tuyến"><PillT p={routePill(t)} /></Cell>
            <Cell label="Nguồn lực">{deployed(t) ? <PillT p={resourcePill(t)} /> : <span className="muted">Sau khi triển khai</span>}</Cell><Cell label="Lập kế hoạch"><PillT p={planPill(t)} /></Cell>
          </div>
        </div>
        <div className="card"><h3 className="card-title">Bước tiếp theo</h3><p className="subtitle">{NEXT_STEP[ps] ? NEXT_STEP[ps](t) : tripNextAction(t)}</p>
          <div className="btn-row">
            {['AWAITING_ROUTE', 'ROUTE_PENDING', 'ROUTE_RETURNED'].includes(ps) ? <button type="button" className="btn solid" onClick={() => go(`f/trip/${t.id}/route`)}>Mở tuyến</button> : null}
            {ps === 'MISSING_RESOURCES' ? <button type="button" className="btn solid" onClick={() => go(`f/trip/${t.id}/resources`)}>Phân công nguồn lực</button> : null}
          </div>
        </div>
      </div>
      <div className="stack">
        <div className="card"><div className="eyebrow">Đón &amp; giao</div>
          <div className="lines" style={{ marginTop: 10 }}><b>{r.pickup.name || r.origin}</b><br />{r.pickup.address || ''}</div>
          <div className="lines" style={{ marginTop: 10 }}><b>{r.delivery.name || r.destination}</b><br />{r.delivery.address || ''}</div>
        </div>
        {t.demoFlow3 ? null : <DemoCard current={t.id} />}
      </div>
    </div>
  );
}
