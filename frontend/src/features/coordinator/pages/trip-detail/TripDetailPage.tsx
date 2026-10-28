// Chi tiết chuyến của Điều phối: Tổng quan • Tuyến đường (lập lộ trình) • Xe & nhân sự • Chuyến bay • Theo dõi hành trình
import { Navigate, useParams } from 'react-router-dom';
import { Icon, Pill } from '../../components/common/ui';
import { EmptyPlanPanel } from '../../components/demo/Demo';
import { CoordinatorLayout } from '../../components/layout/CoordinatorLayout';
import { deployed, planGaps, reqOfTrip, trip } from '../../domain/coordinatorRules';
import { go, useCoordinatorStore } from '../../store/coordinatorStore';
import { cityLabel, dt, human } from '../../utils/format';
import { EMPTY_PLAN_ID } from '../../workflows/coordinatorActions';
import { ResourcesTab } from './tabs/ResourcesTab';
import { RouteTab } from './tabs/RouteTab';

import { FlightTab } from './tabs/FlightTab';
import { OverviewTab } from './tabs/OverviewTab';
import { ProgressTab } from './tabs/ProgressTab';
const TAB_TITLES: Record<string, string> = { overview: 'Tổng quan', route: 'Tuyến đường', resources: 'Xe & nhân sự', flight: 'Chuyến bay', progress: 'Theo dõi hành trình' };
export function TripDetailPage() {
  useCoordinatorStore();
  const { tripId = '', tab = 'overview' } = useParams();
  const t = trip(tripId);
  if (!t) return <Navigate to="/coordinator/monitor" replace />;
  const r = reqOfTrip(t), on = TAB_TITLES[tab] && (tab !== 'flight' || t.mode === 'AIR') ? tab : 'overview';
  const tabs = ['overview', 'route', 'resources', ...(t.mode === 'AIR' ? ['flight'] : []), 'progress'];
  const gaps = planGaps(t);
  const dep = t.deployment.status;
  return (
    <CoordinatorLayout title={on === 'route' ? 'Lập lộ trình' : 'Giám sát hành trình'} active="/coordinator/monitor">
      <button type="button" className="link back" onClick={() => go('f/monitor')}>← Giám sát hành trình</button>
      <div className="head"><div><h2 className="page-title" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>{t.id} <Pill v={t.status} /></h2>
        <p className="subtitle">{r.id} • {cityLabel(r.origin)} → {cityLabel(r.destination)} • {human(t.mode)} • khởi hành {dt(t.plannedDepart)}</p></div>
        {deployed(t) && t.status === 'PLANNING' ? (gaps.length ? <Pill v="NOT_READY" label={`${gaps.length} việc còn mở`} /> : <Pill v="READY" label="Hoàn tất lập kế hoạch" />) : null}</div>
      {dep === 'CONFIRMED' ? null : <div className="note yellow"><Icon name="info" /><div><b>{dep === 'ON_HOLD' ? 'Tạm dừng triển khai' : 'Đang chờ xác nhận triển khai'}</b>{dep === 'ON_HOLD' ? `Lý do: ${String(t.deployment.holdReason || '—').replace(/\.$/, '')}. Các phiên bản tuyến và phân công hiện có chỉ được xem cho đến khi Quản lý tiếp tục triển khai.` : 'Lập tuyến và phân công chính thức bắt đầu sau khi quản lý xác nhận triển khai.'}</div></div>}
      {t.id === EMPTY_PLAN_ID ? <EmptyPlanPanel /> : null}
      <div className="rtabs">{tabs.map((k) => <button type="button" key={k} className={k === on ? 'on' : ''} onClick={() => go(`f/trip/${t.id}/${k}`)}>{TAB_TITLES[k]}</button>)}</div>
      {on === 'overview' ? <OverviewTab t={t} /> : null}
      {on === 'route' ? <RouteTab t={t} /> : null}
      {on === 'resources' ? <ResourcesTab t={t} /> : null}
      {on === 'flight' ? <FlightTab t={t} /> : null}
      {on === 'progress' ? <ProgressTab t={t} /> : null}
    </CoordinatorLayout>
  );
}
export default TripDetailPage;
