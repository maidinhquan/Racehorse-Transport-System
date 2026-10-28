// Sự cố & khiếu nại: danh sách sự cố trong chuyến (Flow 5) và khiếu nại liên quan (chỉ xem)
import { DataTable, Icon, Pill, PillT, Tabs, tabOn } from '../../components/common/ui';
import { CoordinatorLayout } from '../../components/layout/CoordinatorLayout';
import { custOf, legOf, reqById, trip } from '../../domain/coordinatorRules';
import type { Any } from '../../store/coordinatorStore';
import { db, useCoordinatorStore } from '../../store/coordinatorStore';
import { dt, human, incTypeVi } from '../../utils/format';
import { CMP_VI, F5_DONE, F5_ST, F5_TYPES, cmpView, f5OnBehalf, f5Pill, f5Status, waitingFor } from '../../workflows/incidentOperations';

export function IncidentsPage() {
  useCoordinatorStore();
  const on = tabOn('hub-f', 'incidents');
  const rows = db.incidents.map((i: Any) => { f5Status(i); return i; });
  const openInc = rows.filter((i: Any) => !F5_DONE.includes(i.status)).length;
  const openCmp = db.complaints.filter((c: Any) => !['RESOLVED', 'CLOSED'].includes(c.status)).length;
  return (
    <CoordinatorLayout title="Sự cố & khiếu nại">
      <div className="head"><div><h2 className="page-title">Sự cố &amp; khiếu nại</h2><p className="subtitle">Bạn là đầu mối từ tiếp nhận đến đóng sự cố: lập phương án, phối hợp nguồn lực, cho phép tiếp tục chặng và đóng sự cố.</p></div>
        <button type="button" className="btn danger-solid" onClick={f5OnBehalf}><Icon name="alert" />Ghi nhận sự cố thay tổ xe</button></div>
      <Tabs k="hub-f" fallback="incidents" items={[['incidents', 'Sự cố trong chuyến', openInc], ['complaints', 'Khiếu nại liên quan', openCmp]]} />
      {on === 'incidents' ? (
        <DataTable id="f5-inc-f" rows={rows} go={(i: Any) => `f/incident/${i.id}`} style={{ marginTop: 16 }} search={(i: Any) => [i.id, i.tripId, i.description, i.location].join(' ')}
          emptyTitle="Chưa có sự cố" empty="Sự cố trên các chuyến sẽ hiện ở đây."
          filters={[{ key: 's', label: 'Mọi trạng thái', options: Object.keys(F5_ST).map((k) => [k, F5_ST[k][1]] as [string, string]), test: (i: Any, v) => i.status === v }]}
          cols={[
            { label: 'Sự cố', sort: (i: Any) => i.at, render: (i: Any) => <><b style={{ color: 'var(--ink)' }}>{i.id}</b><br /><small className="muted">{dt(i.at)}</small></> },
            { label: 'Chuyến / chặng', render: (i: Any) => <>{i.tripId}<br /><small className="muted">{trip(i.tripId) ? legOf(trip(i.tripId), i.leg) : ''}</small></> },
            { label: 'Loại / mức độ', render: (i: Any) => <>{F5_TYPES[i.type] || incTypeVi(i.type)}<br /><Pill v={i.severity} /></> },
            { label: 'Trạng thái', render: (i: Any) => <><PillT p={f5Pill(i)} />{i.blocking && !i.continueAt && !F5_DONE.includes(i.status) ? <><br /><small style={{ color: '#b42318' }}>Chặng tạm dừng</small></> : null}</> },
            { label: 'Phụ trách', render: (i: Any) => i.owner || '—' },
            { label: 'Đang chờ', render: (i: Any) => (F5_DONE.includes(i.status) ? '—' : <b style={{ fontWeight: 600 }}>{waitingFor(i)}</b>) },
          ]} />
      ) : (<>
        <DataTable id="hub-cmp-f" rows={db.complaints} style={{ marginTop: 16 }} search={(c: Any) => [c.id, c.requestId, c.title].join(' ')} emptyTitle="Chưa có khiếu nại"
          cols={[
            { label: 'Khiếu nại', render: (c: Any) => <><b style={{ color: 'var(--ink)' }}>{c.id}</b><br /><small className="muted">{dt(c.at || c.createdAt)}</small></> },
            { label: 'Yêu cầu', render: (c: Any) => <>{c.requestId}<br /><small className="muted">{custOf(reqById(c.requestId)).company}</small></> },
            { label: 'Nội dung', render: (c: Any) => <span style={{ display: 'block', maxWidth: 300, whiteSpace: 'normal' }}>{c.title}</span> },
            { label: 'Trạng thái', render: (c: Any) => <Pill v={c.status} label={CMP_VI[c.status] || human(c.status)} /> },
            { label: '', render: (c: Any) => <button type="button" className="btn ghost sm" onClick={() => cmpView(c.id)}>Xem</button> },
          ]} />
        <p className="hint">Logistics Manager trả lời và giải quyết khiếu nại. Bạn có thể xem để phối hợp khi Manager cần thông tin.</p>
      </>)}
    </CoordinatorLayout>
  );
}
export default IncidentsPage;
