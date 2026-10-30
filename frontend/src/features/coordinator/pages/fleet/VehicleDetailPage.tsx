// Đội xe (phương tiện chuyên dụng) và chi tiết từng xe
import { Navigate, useParams } from 'react-router-dom';
import { Cell, Pill, RouteText } from '../../components/common/ui';
import { CoordinatorLayout } from '../../components/layout/CoordinatorLayout';
import { reqOfTrip, tripVehicleIds, tripWindow, vehicle } from '../../domain/coordinatorRules';
import type { Any } from '../../store/coordinatorStore';
import { db, go, useCoordinatorStore } from '../../store/coordinatorStore';
import { date } from '../../utils/format';
import { vehicleStatusModal } from '../../workflows/coordinatorActions';

export function VehicleDetailPage() {
  useCoordinatorStore();
  const { vehicleId = '' } = useParams();
  const v = vehicle(vehicleId);
  if (!v) return <Navigate to="/coordinator/fleet" replace />;
  const list = db.trips.filter((t: Any) => tripVehicleIds(t).includes(v.id)).sort((a: Any, b: Any) => b.plannedDepart.localeCompare(a.plannedDepart));
  return (
    <CoordinatorLayout title="Đội xe" active="/coordinator/fleet">
      <button type="button" className="link back" onClick={() => go('f/fleet')}>← Quay lại Đội xe</button>
      <div className="head"><div><h2 className="page-title" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>{v.plate} <Pill v={v.status} /></h2><p className="subtitle">{v.model} • đặt tại {v.base}</p></div>
        <button type="button" className="btn ghost" onClick={() => vehicleStatusModal(v.id)}>Đổi trạng thái</button></div>
      <div className="grid-main">
        <div className="card"><h3 className="card-title">Thông tin xe</h3>
          <div className="kv2"><Cell label="Số ngăn">{v.stalls}</Cell><Cell label="Số km đã chạy">{Number(v.odometer || 0).toLocaleString('en-US')} km</Cell><Cell label="Bảo dưỡng tiếp theo">{v.nextService === '—' ? '—' : date(v.nextService)}</Cell>
            <Cell label="Tính năng" cls="sm normal">{v.features}</Cell>{v.note ? <Cell label="Ghi chú trạng thái" cls="sm normal">{v.note}</Cell> : null}</div></div>
        <div className="card"><div className="eyebrow">Lịch trình</div>
          {list.length ? list.map((t: Any) => <div className="chk-row" key={t.id}><div className="doc-text"><b>{t.id}</b><span>{date(tripWindow(t)[0])} – {date(tripWindow(t)[1])} • <RouteText r={reqOfTrip(t)} /></span></div><Pill v={t.status} /></div>)
            : <p className="hint">Chưa được phân chuyến nào.</p>}</div>
      </div>
    </CoordinatorLayout>
  );
}
export default VehicleDetailPage;
