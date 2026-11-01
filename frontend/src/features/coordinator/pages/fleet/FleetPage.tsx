// Đội xe (phương tiện chuyên dụng) và chi tiết từng xe
import { DataTable, Icon, Pill } from '../../components/common/ui';
import { CoordinatorLayout } from '../../components/layout/CoordinatorLayout';
import { ACTIVE_TRIP, fleetCountry, tripVehicleIds, tripWindow } from '../../domain/coordinatorRules';
import type { Any } from '../../store/coordinatorStore';
import { db, ui, useCoordinatorStore } from '../../store/coordinatorStore';
import { date, human } from '../../utils/format';
import { vehicleDelete, vehicleEdit, vehicleStatusModal } from '../../workflows/coordinatorActions';

export function FleetPage() {
  useCoordinatorStore();
  const bases = [...new Set(db.vehicles.map((v: Any) => v.base))] as string[];

  // Ưu tiên xếp xe mới thêm hoặc mới sửa lên đầu
  const sortedVehicles = [...db.vehicles].sort((a: Any, b: Any) => {
    // 1. Xe vừa được lưu / thêm mới trong phiên hiện tại
    if (ui.lastSavedVehicleId) {
      if (a.id === ui.lastSavedVehicleId) return -1;
      if (b.id === ui.lastSavedVehicleId) return 1;
    }

    // 2. Điểm có đánh dấu lastModified (thời gian thực ms)
    const modA = a.lastModified || 0;
    const modB = b.lastModified || 0;
    if (modA !== modB) return modB - modA;

    // 3. Chuỗi thời gian updatedAt (ISO hoặc YYYY-MM-DD HH:mm)
    const timeA = String(a.updatedAt || '');
    const timeB = String(b.updatedAt || '');
    if (timeA !== timeB) return timeB.localeCompare(timeA);

    // 4. Ưu tiên xe do người dùng thêm (sample === false) trước xe mẫu hệ thống
    const sampleA = a.sample ? 1 : 0;
    const sampleB = b.sample ? 1 : 0;
    if (sampleA !== sampleB) return sampleA - sampleB;

    // 5. Thứ tự ID số tự tăng (ID lớn hơn là tạo sau)
    const numA = parseInt(String(a.id || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(String(b.id || '').replace(/\D/g, ''), 10) || 0;
    if (numA !== numB) return numB - numA;

    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  return (
    <CoordinatorLayout title="Đội xe">
      <div className="head"><div><h2 className="page-title">Phương tiện chuyên dụng</h2><p className="subtitle">Xe tải chở ngựa: tình trạng, bảo dưỡng và chuyến đang sử dụng. Với chuyến bay, khoang máy bay và thùng vận chuyển do bên dịch vụ thuê máy bay lo; CBN chỉ bố trí xe cho 2 chặng tới/từ sân bay.</p></div>
        <button type="button" className="btn solid" onClick={() => vehicleEdit('')}><Icon name="plus" />Thêm phương tiện</button></div>
      <DataTable id="f-fleet" rows={sortedVehicles} go={(v: Any) => `f/vehicle/${v.id}`} style={{ marginTop: 20 }} search={(v: Any) => [v.plate, v.model, v.base].join(' ')}
        filters={[{ key: 's', label: 'Tất cả trạng thái', options: ['READY', 'MAINTENANCE', 'INACTIVE'].map((x) => [x, human(x)] as [string, string]), test: (v: Any, x) => v.status === x },
          { key: 'b', label: 'Tất cả căn cứ', options: bases.map((b) => [b, b] as [string, string]), test: (v: Any, x) => v.base === x }]}
        cols={[
          { label: 'Xe', sort: (v: Any) => v.plate, render: (v: Any) => <><b style={{ color: 'var(--ink)' }}>{v.plate}</b>{v.id === ui.lastSavedVehicleId ? <span className="pill green sm" style={{ marginLeft: 6, fontSize: 11, padding: '1px 6px' }}>Vừa lưu</span> : null}<br /><small className="muted">{v.model}</small></> },
          { label: 'Số ngăn', sort: (v: Any) => v.stalls, render: (v: Any) => v.stalls },
          { label: 'Quốc gia', render: (v: Any) => fleetCountry(v) },
          { label: 'Căn cứ', render: (v: Any) => v.base },
          { label: 'Bảo dưỡng tiếp theo', sort: (v: Any) => v.nextService, render: (v: Any) => (v.nextService === '—' ? '—' : date(v.nextService)) },
          { label: 'Phân công hiện tại', render: (v: Any) => { const u = db.trips.filter((t: Any) => tripVehicleIds(t).includes(v.id) && ACTIVE_TRIP.includes(t.status)); return u.length ? u.map((t: Any, k: number) => <span key={t.id}>{k ? <br /> : null}{t.id} ({date(tripWindow(t)[0])}–{date(tripWindow(t)[1])})</span>) : <span className="muted">Trống</span>; } },
          { label: 'Trạng thái', render: (v: Any) => <Pill v={v.status} /> },
          { label: '', render: (v: Any) => {
            const isUsed = db.trips.some((t: Any) => tripVehicleIds(t).includes(v.id) && ACTIVE_TRIP.includes(t.status));
            return (
              <span className="btn-row" style={{ margin: 0, flexWrap: 'nowrap', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                <button type="button" className="btn ghost sm" onClick={() => vehicleEdit(v.id)}>Xem/sửa</button>
                <button type="button" className="btn ghost sm" onClick={() => vehicleStatusModal(v.id)}>Trạng thái</button>
                {isUsed ? null : <button type="button" className="btn danger sm" onClick={() => vehicleDelete(v.id)}>Xóa</button>}
              </span>
            );
          } },
        ]} />
    </CoordinatorLayout>
  );
}
export default FleetPage;
