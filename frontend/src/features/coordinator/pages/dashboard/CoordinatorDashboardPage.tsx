// Tổng quan của Điều phối: số liệu lập kế hoạch, bảng phân công, cảnh báo cần chú ý, thông báo gần đây
import { DataTable, Empty, Icon, PillT, RouteCell } from '../../components/common/ui';
import { DemoCard, EmptyPlanLaunch } from '../../components/demo/Demo';
import { CoordinatorLayout, myNotifs } from '../../components/layout/CoordinatorLayout';
import { ACTIVE_TRIP, coordTrips, curRoute, deployed, emp, etaOverdue, planPill, planState, reqOfTrip, resourceGaps, tripVehicleIds } from '../../domain/coordinatorRules';
import type { Any } from '../../store/coordinatorStore';
import { db, go, me, useCoordinatorStore } from '../../store/coordinatorStore';
import { date, dt, human, incTypeVi } from '../../utils/format';
import { notifOpen } from '../../workflows/coordinatorActions';

export function CoordinatorDashboardPage() {
  useCoordinatorStore();
  const trips = db.trips;
  const planning = trips.filter((t: Any) => t.status === 'PLANNING');
  const toRoute = planning.filter((t: Any) => planState(t) === 'AWAITING_ROUTE');
  const pending = planning.filter((t: Any) => planState(t) === 'ROUTE_PENDING');
  const returned = planning.filter((t: Any) => planState(t) === 'ROUTE_RETURNED');
  const missing = planning.filter((t: Any) => deployed(t) && resourceGaps(t).length);
  const active = coordTrips();
  const a: Array<[string, string, string, string]> = [];
  trips.filter(etaOverdue).forEach((t: Any) => a.push(['bad', `Quá giờ dự kiến đến mà chưa xác nhận đã tới • ${t.id}`, `Dự kiến đến ${dt(t.eta)} • liên hệ đội vận chuyển và xác nhận giờ đến điều chỉnh`, `f/trip/${t.id}/progress`]));
  returned.forEach((t: Any) => a.push(['bad', `Tuyến ${t.id} bị trả lại`, curRoute(t)?.note || '', `f/trip/${t.id}/route`]));
  planning.filter((t: Any) => t.deployment?.status === 'ON_HOLD').forEach((t: Any) => a.push(['', `Tạm dừng triển khai ${t.id}`, String(t.deployment?.holdReason || ''), `f/trip/${t.id}`]));
  active.forEach((t: Any) => { const v = emp((t.crew || {}).VETERINARIAN); if (v && v.certExpiry < (t.eta || '').slice(0, 10)) a.push(['bad', `Chứng chỉ của ${v.name} hết hạn trước khi ${t.id} kết thúc`, `Hiệu lực đến ${date(v.certExpiry)}`, `f/trip/${t.id}/resources`]); });
  db.vehicles.filter((v: Any) => v.status !== 'READY').forEach((v: Any) => { const u = trips.find((t: Any) => tripVehicleIds(t).includes(v.id) && ACTIVE_TRIP.includes(t.status)); if (u) a.push(['bad', `${v.plate} đang ${human(v.status).toLowerCase()} nhưng được phân cho ${u.id}`, 'Hãy phân xe khác.', `f/trip/${u.id}/resources`]); });
  trips.filter((t: Any) => t.flight && t.flight.status === 'BUDGET_APPROVED').forEach((t: Any) => a.push(['blue', `Đặt chuyến bay cho ${t.id}`, `Đã duyệt ngân sách ${t.flight.airline} ${t.flight.flightNo}`, `f/trip/${t.id}/flight`]));
  db.incidents.filter((i: Any) => i.status !== 'CLOSED' && !i.plans.length).forEach((i: Any) => a.push(['', `${i.id} có thể cần điều chỉnh tuyến`, `${incTypeVi(i.type)} • ${i.tripId}`, `f/incident/${i.id}`]));
  const notes = myNotifs().slice(0, 5);
  const card = (ic: string, label: string, list: Any[], small: string, cls = 'warn') => (
    <button type="button" className={`stat card ${list.length ? cls : ''}`} onClick={() => go('f/monitor')}>
      <span className="label"><Icon name={ic} />{label}</span><b>{list.length}</b><small>{small}</small>
    </button>
  );
  const first = (me()?.name || 'Quân').split(' ').pop();
  return (
    <CoordinatorLayout title="Tổng quan">
      <EmptyPlanLaunch />
      <div className="head"><div><h2 className="page-title">Xin chào, {first === 'Quan' ? 'Quân' : first}</h2><p className="subtitle">Tuyến, xe và nhân sự cho các chuyến đã triển khai.</p></div></div>
      <div className="stats six">
        {card('map', 'Chờ lập tuyến', toRoute, toRoute.length ? `${toRoute.filter((t: Any) => curRoute(t)).length} đang có bản nháp` : 'Không có chuyến cần lập kế hoạch')}
        {card('clock', 'Tuyến chờ duyệt', pending, 'Đang chờ Quản lý', '')}
        {card('alert', 'Tuyến bị trả lại', returned, returned.length ? 'Tạo phiên bản chỉnh sửa' : 'Không có tuyến bị trả lại', 'bad')}
        {card('truck', 'Thiếu nguồn lực', missing, missing.length ? 'Chưa phân công xe, tổ lái hoặc chuyến bay' : 'Mọi chuyến đã triển khai đều đủ nguồn lực')}
        {card('pin', 'Chuyến đang chạy', active, `${trips.filter((t: Any) => t.status === 'IN_TRANSIT').length} đang vận chuyển • ${trips.filter((t: Any) => t.status === 'READY_TO_DEPART').length} sẵn sàng khởi hành`, '')}
        <button type="button" className="stat card" onClick={() => go('f/fleet')}><span className="label"><Icon name="truck" />Xe sẵn sàng</span>
          <b>{db.vehicles.filter((v: Any) => v.status === 'READY').length}/{db.vehicles.length}</b><small>{db.vehicles.filter((v: Any) => v.status === 'MAINTENANCE').length} đang bảo dưỡng</small></button>
      </div>
      <div className="grid-main">
        <div className="stack">
          <DataTable id="f-dash" rows={planning} pageSize={6} emptyTitle="Không có chuyến đang lập kế hoạch" go={(t: Any) => `f/trip/${t.id}`}
            title="Phân công lập kế hoạch" titleRight={<button type="button" className="link" onClick={() => go('f/monitor')}>Xem tất cả</button>}
            cols={[
              { label: 'Chuyến', render: (t: Any) => <><b style={{ color: 'var(--ink)' }}>{t.id}</b><br /><small className="muted">{human(t.mode)}</small></> },
              { label: 'Tuyến đường', render: (t: Any) => <RouteCell r={reqOfTrip(t)} /> },
              { label: 'Khởi hành', render: (t: Any) => dt(t.plannedDepart) },
              { label: 'Lập kế hoạch', render: (t: Any) => <><PillT p={planPill(t)} />{deployed(t) && (resourceGaps(t) || []).length && planState(t) !== 'MISSING_RESOURCES' ? <><br /><small className="muted" style={{ whiteSpace: 'normal' }}>{(resourceGaps(t) || []).join(', ')}</small></> : null}</> },
            ]} />
        </div>
        <div className="stack">
          <div className="card pad"><div className="section-title"><h3 className="card-title">Cần chú ý</h3><span className="label">{a.length}</span></div>
            {a.length ? <div className="alerts">{a.map(([c, t, s, g], k) => (
              <button type="button" key={k} className={`alert-row ${c}`} onClick={() => go(g)}><span className="dot" /><div><b>{t}</b><span>{s}</span></div></button>))}</div>
              : <Empty title="Không có cảnh báo" text="Mọi việc đều đúng tiến độ." />}
          </div>
          <div className="card pad"><div className="section-title"><h3 className="card-title">Thông báo gần đây</h3><button type="button" className="link" onClick={() => go('f/notifications')}>Xem tất cả</button></div>
            {notes.length ? <div className="alerts">{notes.map((n: Any) => (
              <button type="button" key={n.id} className={`alert-row ${n.read ? '' : 'blue'}`} onClick={() => notifOpen(n.id)}>
                <span className="dot" style={n.read ? { background: 'var(--line)' } : undefined} />
                <div><b>{n.title}</b>{n.body ? <span>{n.body}</span> : null}<span>{dt(n.at)}{n.read ? '' : <> • <i style={{ fontStyle: 'normal' }}>Chưa đọc</i></>}</span></div>
              </button>))}</div>
              : <Empty title="Không có thông báo" text="Quyết định triển khai và tuyến đường sẽ hiển thị tại đây." />}
          </div>
          <DemoCard />
        </div>
      </div>
    </CoordinatorLayout>
  );
}
export default CoordinatorDashboardPage;
