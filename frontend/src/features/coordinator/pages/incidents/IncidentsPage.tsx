// Sự cố & khiếu nại: danh sách sự cố trong chuyến (Flow 5) và khiếu nại liên quan (chỉ xem)
import { useEffect, useState } from 'react';
import { DataTable, Icon, Pill, PillT, Tabs, tabOn, resetTablePage } from '../../components/common/ui';
import { CoordinatorLayout } from '../../components/layout/CoordinatorLayout';
import { custOf, legOf, reqById, trip } from '../../domain/coordinatorRules';
import type { Any } from '../../store/coordinatorStore';
import {
  commit,
  db,
  nowStamp,
  parseIncidentTime,
  sortIncidentsLatestFirst,
  syncCoordinatorIncidents,
  useCoordinatorStore,
} from '../../store/coordinatorStore';
import { onSync } from '../../../../shared/utils/syncChannel';
import { dt, human, incTypeVi } from '../../utils/format';
import { CMP_VI, F5_DONE, F5_ST, F5_TYPES, cmpView, f5OnBehalf, f5Pill, f5Status, waitingFor } from '../../workflows/incidentOperations';

export function IncidentsPage() {
  useCoordinatorStore();

  useEffect(() => {
    void syncCoordinatorIncidents();

    const handleSync = (e?: Event) => {
      const custom = e as CustomEvent;
      if (custom?.detail?.id) {
        const inc = custom.detail;
        const cleanIncId = String(inc.id || '').replace(/-/g, '_');
        const idx = db.incidents.findIndex((x: Any) => String(x.id || '').replace(/-/g, '_') === cleanIncId);
        const now = nowStamp();

        if (idx >= 0) {
          const current = db.incidents[idx];
          const updated = {
            ...current,
            ...inc,
            updatedAt: inc.updatedAt || inc.at || now,
            vetStatus:
              inc.status === 'REFERRAL_REQUESTED' || inc.status === 'STABILIZED'
                ? inc.status
                : (inc.vetStatus || current.vetStatus),
            targetVetStation: inc.station || inc.targetVetStation || current.targetVetStation,
            vetResolutionNote: inc.reason || inc.note || inc.vetResolutionNote || current.vetResolutionNote,
          };
          db.incidents.splice(idx, 1);
          db.incidents.unshift(updated);
        } else {
          db.incidents.unshift({
            ...inc,
            at: inc.at || now,
            updatedAt: inc.updatedAt || inc.at || now,
            status: inc.status || 'REPORTED',
          });
        }
        db.incidents = sortIncidentsLatestFirst(db.incidents);
        resetTablePage('f5-inc-f');
        commit();
      }
      void syncCoordinatorIncidents();
    };

    const unsubSync = onSync(() => {
      void syncCoordinatorIncidents();
    });

    window.addEventListener('rts_incident_pins_changed', handleSync);
    window.addEventListener('rts_incident_created', handleSync);
    window.addEventListener('rts_vet_status_changed', handleSync);
    window.addEventListener('rts_incident_scene_ready', handleSync);
    window.addEventListener('rts_requests_updated', handleSync);

    // Cập nhật ngầm định kỳ mỗi 2 giây khi tab đang hiển thị
    const intervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void syncCoordinatorIncidents();
      }
    }, 2000);

    return () => {
      unsubSync();
      window.clearInterval(intervalId);
      window.removeEventListener('rts_incident_pins_changed', handleSync);
      window.removeEventListener('rts_incident_created', handleSync);
      window.removeEventListener('rts_vet_status_changed', handleSync);
      window.removeEventListener('rts_incident_scene_ready', handleSync);
      window.removeEventListener('rts_requests_updated', handleSync);
    };
  }, []);

  const [incRoleFilter, setIncRoleFilter] = useState<'ALL' | 'VET' | 'DRIVER'>('ALL');
  const on = tabOn('hub-f', 'incidents');
  const sortedIncidents = sortIncidentsLatestFirst(db.incidents);
  const rows = sortedIncidents.map((i: Any) => { f5Status(i); return i; });

  const isVetIncident = (i: Any) =>
    i.type === 'HORSE_HEALTH' ||
    i.reporterRole === 'VETERINARIAN' ||
    Boolean(i.horseId) ||
    Boolean(i.healthIssueType) ||
    /BS\.|Bác sĩ|thú y|escort|vet/i.test(i.reporterName || i.by || '');

  const openVetInc = rows.filter((i: Any) => !F5_DONE.includes(i.status) && isVetIncident(i)).length;
  const openDriverInc = rows.filter((i: Any) => !F5_DONE.includes(i.status) && !isVetIncident(i)).length;
  const openInc = rows.filter((i: Any) => !F5_DONE.includes(i.status)).length;
  const openCmp = db.complaints.filter((c: Any) => !['RESOLVED', 'CLOSED'].includes(c.status)).length;

  const displayRows = rows.filter((i: Any) => {
    if (incRoleFilter === 'VET') return isVetIncident(i);
    if (incRoleFilter === 'DRIVER') return !isVetIncident(i);
    return true;
  });

  return (
    <CoordinatorLayout title="Sự cố & khiếu nại">
      <div className="head"><div><h2 className="page-title">Sự cố &amp; khiếu nại</h2></div>
        <button type="button" className="btn danger-solid" onClick={f5OnBehalf}><Icon name="alert" />Ghi nhận sự cố thay tổ xe</button></div>
      <Tabs k="hub-f" fallback="incidents" items={[['incidents', 'Sự cố trong chuyến', openInc], ['complaints', 'Khiếu nại liên quan', openCmp]]} />
      {on === 'incidents' ? (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, marginBottom: 4, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn sm ${incRoleFilter === 'ALL' ? 'primary' : 'ghost'}`}
              onClick={() => setIncRoleFilter('ALL')}
            >
              Tất cả báo cáo ({rows.length})
            </button>
            <button
              type="button"
              className={`btn sm ${incRoleFilter === 'VET' ? 'primary' : 'ghost'}`}
              onClick={() => setIncRoleFilter('VET')}
              style={incRoleFilter === 'VET' ? { background: '#047857', borderColor: '#047857' } : {}}
            >
              Bác sĩ thú y (Y tế ngựa)
              {openVetInc > 0 && (
                <span style={{ marginLeft: 6, padding: '2px 7px', borderRadius: 10, background: incRoleFilter === 'VET' ? '#fff' : '#047857', color: incRoleFilter === 'VET' ? '#047857' : '#fff', fontSize: 11, fontWeight: 700 }}>
                  {openVetInc}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`btn sm ${incRoleFilter === 'DRIVER' ? 'primary' : 'ghost'}`}
              onClick={() => setIncRoleFilter('DRIVER')}
              style={incRoleFilter === 'DRIVER' ? { background: '#1d4ed8', borderColor: '#1d4ed8' } : {}}
            >
              Tài xế vận hành (Xe &amp; Tuyến đường)
              {openDriverInc > 0 && (
                <span style={{ marginLeft: 6, padding: '2px 7px', borderRadius: 10, background: incRoleFilter === 'DRIVER' ? '#fff' : '#1d4ed8', color: incRoleFilter === 'DRIVER' ? '#1d4ed8' : '#fff', fontSize: 11, fontWeight: 700 }}>
                  {openDriverInc}
                </span>
              )}
            </button>
          </div>

          <DataTable id="f5-inc-f" defaultSort={{ col: 0, dir: -1 }} rows={displayRows} go={(i: Any) => `f/incident/${i.id}`} style={{ marginTop: 10 }} search={(i: Any) => [i.id, i.tripId, i.description, i.location, i.reporterName, i.by].join(' ')}
          emptyTitle="Chưa có sự cố" empty="Sự cố trên các chuyến sẽ hiện ở đây."
          filters={[{ key: 's', label: 'Mọi trạng thái', options: Object.keys(F5_ST).map((k) => [k, F5_ST[k][1]] as [string, string]), test: (i: Any, v) => i.status === v }]}
          cols={[
            {
              label: 'Sự cố',
              sort: (i: Any) => Math.max(parseIncidentTime(i.at), parseIncidentTime(i.reportedAt), parseIncidentTime(i.updatedAt)),
              render: (i: Any) => {
                const vet = isVetIncident(i);
                return (
                  <>
                    <b style={{ color: 'var(--ink)' }}>{i.id}</b>
                    <span style={{ marginLeft: 6, fontSize: 11, padding: '1px 6px', borderRadius: 4, background: vet ? '#ecfdf5' : '#eff6ff', color: vet ? '#047857' : '#1d4ed8', fontWeight: 600 }}>
                      {vet ? 'Bác sĩ thú y' : 'Tài xế'}
                    </span>
                    <br />
                    <small className="muted">{dt(i.at || i.reportedAt || i.updatedAt)}</small>
                    {i.vetStatus === 'REFERRAL_REQUESTED' && (
                      <span style={{ display: 'block', color: '#b42318', fontWeight: 600, fontSize: 11, marginTop: 2 }}>
                        Yêu cầu chuyển viện
                      </span>
                    )}
                    {i.vetStatus === 'STABILIZED' && (
                      <span style={{ display: 'block', color: '#166534', fontWeight: 600, fontSize: 11, marginTop: 2 }}>
                        Bác sĩ báo ổn định
                      </span>
                    )}
                  </>
                );
              },
            },
            { label: 'Chuyến / chặng', render: (i: Any) => <>{i.tripId}<br /><small className="muted">{trip(i.tripId) ? legOf(trip(i.tripId), i.leg) : ''}</small></> },
            { label: 'Loại / mức độ', render: (i: Any) => <>{F5_TYPES[i.type] || incTypeVi(i.type)}<br /><Pill v={i.severity} /></> },
            { label: 'Trạng thái', render: (i: Any) => <><PillT p={f5Pill(i)} />{i.blocking && !i.continueAt && !F5_DONE.includes(i.status) ? <><br /><small style={{ color: '#b42318' }}>Chặng tạm dừng</small></> : null}</> },
            { label: 'Phụ trách', render: (i: Any) => i.owner || '—' },
            { label: 'Đang chờ', render: (i: Any) => (F5_DONE.includes(i.status) ? '—' : <b style={{ fontWeight: 600 }}>{waitingFor(i)}</b>) },
          ]} />
        </>
      ) : (<>
        <DataTable id="hub-cmp-f" rows={db.complaints} style={{ marginTop: 16 }} search={(c: Any) => [c.id, c.requestId, c.title].join(' ')} emptyTitle="Chưa có khiếu nại"
          cols={[
            { label: 'Khiếu nại', render: (c: Any) => <><b style={{ color: 'var(--ink)' }}>{c.id}</b><br /><small className="muted">{dt(c.at || c.createdAt)}</small></> },
            { label: 'Yêu cầu', render: (c: Any) => <>{c.requestId}<br /><small className="muted">{custOf(reqById(c.requestId)).company}</small></> },
            { label: 'Nội dung', render: (c: Any) => <span style={{ display: 'block', maxWidth: 300, whiteSpace: 'normal' }}>{c.title}</span> },
            { label: 'Trạng thái', render: (c: Any) => <Pill v={c.status} label={CMP_VI[c.status] || human(c.status)} /> },
            { label: '', render: (c: Any) => <button type="button" className="btn ghost sm" onClick={() => cmpView(c.id)}>Xem</button> },
          ]} />
      </>)}
    </CoordinatorLayout>
  );
}
export default IncidentsPage;
