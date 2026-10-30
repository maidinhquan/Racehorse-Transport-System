// Đội xe (phương tiện chuyên dụng) và chi tiết từng xe
import { DataTable, Icon, Pill } from '../../components/common/ui';
import { CoordinatorLayout } from '../../components/layout/CoordinatorLayout';
import { ACTIVE_TRIP, fleetCountry, tripVehicleIds, tripWindow } from '../../domain/coordinatorRules';
import type { Any } from '../../store/coordinatorStore';
import { db, useCoordinatorStore } from '../../store/coordinatorStore';
import { date, human } from '../../utils/format';
import { equipmentAdd } from '../../workflows/coordinatorActions';

export function FleetPage() {
  useCoordinatorStore();
  const bases = [...new Set(db.vehicles.map((v: Any) => v.base))] as string[];
  return (
    <CoordinatorLayout title="Đội xe">
      <div className="head"><div><h2 className="page-title">Phương tiện chuyên dụng</h2><p className="subtitle">Xe tải chở ngựa: tình trạng, bảo dưỡng và chuyến đang sử dụng. Với chuyến bay, khoang máy bay và thùng vận chuyển do bên dịch vụ thuê máy bay lo; CBN chỉ bố trí xe cho 2 chặng tới/từ sân bay.</p></div>
        <button type="button" className="btn solid" onClick={equipmentAdd}><Icon name="plus" />Thêm phương tiện</button></div>
      <DataTable id="f-fleet" rows={db.vehicles} go={(v: Any) => `f/vehicle/${v.id}`} style={{ marginTop: 20 }} search={(v: Any) => [v.plate, v.model, v.base].join(' ')}
        filters={[{ key: 's', label: 'Tất cả trạng thái', options: ['READY', 'MAINTENANCE', 'INACTIVE'].map((x) => [x, human(x)] as [string, string]), test: (v: Any, x) => v.status === x },
          { key: 'b', label: 'Tất cả căn cứ', options: bases.map((b) => [b, b] as [string, string]), test: (v: Any, x) => v.base === x }]}
        cols={[
          { label: 'Xe', sort: (v: Any) => v.plate, render: (v: Any) => <><b style={{ color: 'var(--ink)' }}>{v.plate}</b><br /><small className="muted">{v.model}</small></> },
          { label: 'Số ngăn', sort: (v: Any) => v.stalls, render: (v: Any) => v.stalls },
          { label: 'Quốc gia', render: (v: Any) => fleetCountry(v) },
          { label: 'Căn cứ', render: (v: Any) => v.base },
          { label: 'Bảo dưỡng tiếp theo', sort: (v: Any) => v.nextService, render: (v: Any) => (v.nextService === '—' ? '—' : date(v.nextService)) },
          { label: 'Phân công hiện tại', render: (v: Any) => { const u = db.trips.filter((t: Any) => tripVehicleIds(t).includes(v.id) && ACTIVE_TRIP.includes(t.status)); return u.length ? u.map((t: Any, k: number) => <span key={t.id}>{k ? <br /> : null}{t.id} ({date(tripWindow(t)[0])}–{date(tripWindow(t)[1])})</span>) : <span className="muted">Trống</span>; } },
          { label: 'Trạng thái', render: (v: Any) => <Pill v={v.status} /> },
        ]} />
    </CoordinatorLayout>
  );
}
export default FleetPage;
