// Quản lý nhân sự: tài xế, phụ lái, chuyên viên đi kèm và bác sĩ thú y (chỉ đổi trạng thái; hồ sơ do hệ thống nhân sự cung cấp)
import { DataTable, Pill } from '../../components/common/ui';
import { CoordinatorLayout } from '../../components/layout/CoordinatorLayout';
import { ACTIVE_TRIP, tripPersonnelIds } from '../../domain/coordinatorRules';
import type { Any } from '../../store/coordinatorStore';
import { db, go, useCoordinatorStore } from '../../store/coordinatorStore';
import { human } from '../../utils/format';
import { STAFF_LABELS, staffStatus } from '../../workflows/coordinatorActions';

export function CrewPage() {
  useCoordinatorStore();
  return (
    <CoordinatorLayout title="Phân công nhân sự">
      <div className="head"><div><h2 className="page-title">Quản lý nhân sự</h2><p className="subtitle">Tài xế, phụ lái, chuyên viên đi kèm và bác sĩ thú y. Hồ sơ do hệ thống nhân sự cung cấp; chỉ thay đổi trạng thái tại đây.</p></div></div>
      <DataTable id="f-crew" rows={db.employees} style={{ marginTop: 20 }} search={(e: Any) => [e.name, e.position, e.country].join(' ')}
        filters={[{ key: 's', label: 'Mọi trạng thái', options: Object.entries(STAFF_LABELS), test: (e: Any, v) => e.status === v }]}
        cols={[
          { label: 'Nhân viên', render: (e: Any) => <><b>{e.name}</b><br /><small className="muted">{e.phone || '—'}</small></> },
          { label: 'Vị trí', render: (e: Any) => human(e.position) },
          { label: 'Quốc gia', render: (e: Any) => e.country || '—' },
          { label: 'Chuyến đang được gán', render: (e: Any) => { const use = db.trips.filter((t: Any) => ACTIVE_TRIP.includes(t.status) && tripPersonnelIds(t).includes(e.id)); return use.length ? use.map((t: Any, k: number) => <span key={t.id}>{k ? <br /> : null}<button type="button" className="link" onClick={() => go(`f/trip/${t.id}/resources`)}>{t.id}</button></span>) : 'Chưa phân công'; } },
          { label: 'Trạng thái nhân sự', render: (e: Any) => <Pill v={e.status === 'ACTIVE' ? 'READY' : 'PENDING'} label={STAFF_LABELS[e.status] || e.status} /> },
          { label: '', render: (e: Any) => <button type="button" className="btn ghost sm" onClick={() => staffStatus(e.id)}>Đổi trạng thái</button> },
        ]} />
    </CoordinatorLayout>
  );
}
export default CrewPage;
