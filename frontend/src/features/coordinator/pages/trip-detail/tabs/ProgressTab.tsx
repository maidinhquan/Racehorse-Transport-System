// Chi tiết chuyến của Điều phối: Tổng quan • Tuyến đường (lập lộ trình) • Xe & nhân sự • Chuyến bay • Theo dõi hành trình
import { Icon } from '../../../components/common/ui';
import { RouteMap } from '../../../components/maps/LeafletMaps';
import { agoText, emp, etaOverdue, handoverState, holdText, hoursSince, lastMilestone, legHolds, livePos, nextMilestone, tripStops } from '../../../domain/coordinatorRules';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import type { Any } from '../../../store/coordinatorStore';
import { db, go, ui } from '../../../store/coordinatorStore';
import { dt, human, incTypeVi, MILESTONE_LABEL, STOP_LABEL } from '../../../utils/format';
import { ALERT_CAUSE, etaUpdate, manualMilestone, manualSteps, scheduleAlert } from '../../../workflows/coordinatorActions';
import { f5Pill } from '../../../workflows/incidentOperations';

function ManualCard({ t }: { t: Any }) {
  if (t.status === 'COMPLETED') return null;
  const { n, why, steps } = manualSteps(t), s = n && tripStops(t)[n.stop];
  const manual = t.milestones.filter((m: Any) => m.manual).length;
  const MS: Record<string, string> = { DEPARTED: 'Khởi hành từ điểm nhận', LEFT_STOP: 'Rời điểm dừng', ARRIVED_STOP: 'Đến điểm dừng', ARRIVED_CHECKPOINT: 'Đến cửa khẩu / trạm', PASSED_CHECKPOINT: 'Đã thông quan', ARRIVED_DESTINATION: 'Đã giao đến điểm giao' };
  return (
    <div className="card pad fm-card" style={{ marginTop: 16 }}>
      <div className="between"><h3 className="card-title">Cập nhật tiến độ theo chặng</h3>{manual ? <span className="muted" style={{ fontSize: 12 }}>{manual} mốc cập nhật thủ công</span> : null}</div>
      <p className="subtitle">Dùng khi tổ xe mất sóng hoặc báo qua điện thoại. Mốc kế tiếp: <b>{n ? (MS[n.type] || MILESTONE_LABEL[n.type]) + (s ? ' – ' + s.name : '') : '—'}</b></p>
      <div className="fm-steps">{steps.map((x) => (
        <button type="button" key={x.k} className={`fm-step ${x.enabled ? 'on' : ''}`} disabled={!x.enabled} title={x.tip} onClick={() => manualMilestone(t.id, x.k)}><b>{x.l}</b><small>{x.enabled ? 'Ghi nhận ngay' : x.tip}</small></button>))}</div>
      {why ? <p className="hint">{why}</p> : null}
    </div>
  );
}
function AlertsCard({ t }: { t: Any }) {
  const list = (t && t.alerts) || []; if (!list.length) return null;
  const TO: Record<string, string> = { m: 'Quản lý', s: 'Chuyên viên', d: 'Tổ xe', c: 'Khách hàng' };
  return (
    <div className="card pad alert-card" style={{ marginTop: 16 }}><div className="between"><h3 className="card-title">Cảnh báo &amp; điều chỉnh lịch trình ({list.length})</h3></div>
      {[...list].reverse().map((a: Any) => (
        <div className="alert-item" key={a.id}><div className="between"><b><Icon name="alert" />{ALERT_CAUSE[a.cause]}{a.where ? ' • ' + a.where : ''}</b><small className="muted">{dt(a.at)}</small></div>
          <p>{a.message}</p><span className="muted">{a.delayH ? `Trễ dự kiến ${a.delayH} giờ • ETA mới ${dt(a.etaTo)}` : 'Không đổi ETA'}{a.shifted ? ` • dời ${a.shifted} điểm dừng còn lại` : ''} • gửi tới: {a.to.map((x: string) => TO[x]).join(', ')} • {a.by}</span></div>))}
    </div>
  );
}
const disclosure = (key: string) => !!ui.journeyDisclosures[key];
export function ProgressTab({ t }: { t: Any }) {
  useAutoRefresh();
  const stops = tripStops(t), m = lastMilestone(t), cur = m ? m.stop : -1;
  const next = t.status === 'IN_TRANSIT' && !handoverState(t) ? nextMilestone(t) : null, target = next && stops[next.stop];
  const active = db.incidents.filter((i: Any) => i.tripId === t.id && i.status !== 'CLOSED');
  const editable = t.status !== 'COMPLETED';
  const nextLabel = next ? (MILESTONE_LABEL[next.type] || human(next.type)) : t.status === 'READY_TO_DEPART' ? 'Chờ tổ xe xác nhận xuất phát' : t.status === 'COMPLETED' ? 'Hành trình đã hoàn tất' : handoverState(t) ? 'Đã đến điểm giao' : t.status === 'PLANNING' ? 'Chuyến đang lập kế hoạch' : 'Chưa có mốc tiếp theo';
  const late = etaOverdue(t);
  const reports = db.incidents.filter((i: Any) => i.tripId === t.id && !['CLOSED', 'HALTED'].includes(i.status) && ['ROAD_CLOSURE', 'TRAFFIC_ACCIDENT', 'BORDER_DELAY', 'OTHER', 'BAD_WEATHER'].includes(i.type));
  const toggle = (key: string) => (e: Any) => { ui.journeyDisclosures[key] = e.currentTarget.open; };
  return (
    <div className="journey-layout">
      <section className="card journey-map">
        <div className="journey-section-head"><div><h3 className="card-title">Vị trí &amp; tuyến đường</h3><p className="journey-position">{livePos(t).text}</p></div><span className="journey-update">{m ? `Cập nhật ${agoText(hoursSince(m.at))}` : 'Chưa có cập nhật'}</span></div>
        <div className="f-track-map">{stops.length ? <RouteMap t={t} stops={stops} current={cur} /> : <div className="journey-empty">Chưa có tuyến được duyệt.</div>}</div>
        {reports.length ? <div className="f3-driver-reports"><b>Tình trạng tuyến do tài xế báo</b>
          {reports.map((i: Any) => <p key={i.id}><button type="button" className="link" onClick={() => go(`f/incident/${i.id}`)}>{i.id} · {incTypeVi(i.type)}</button> · {i.location} · {dt(i.at)}</p>)}
          <small>Thông tin được cập nhật từ báo cáo và mốc hành trình, không theo dõi GPS.</small></div> : null}
        <p className="journey-footnote">Vị trí ước tính từ mốc tổ xe xác nhận, không có GPS trực tiếp. Tự làm mới mỗi 30 giây.</p>
      </section>
      <aside className="journey-side">
        <section className="card journey-next"><div className="eyebrow">Mốc tiếp theo</div><h3>{nextLabel}</h3>
          {target ? <><p className="journey-target">{target.name}</p>{target.plannedAt ? <p className="hint">Dự kiến {dt(target.plannedAt)}</p> : null}</> : null}
          {next?.blocked ? <p className="journey-blocked"><Icon name="alert" />{legHolds(t).length ? holdText(t) : 'Chặng chưa đủ điều kiện ghi nhận mốc tiếp theo.'}</p> : null}
          {editable ? <details className="journey-disclosure" open={disclosure(`${t.id}:manual`)} onToggle={toggle(`${t.id}:manual`)}><summary>Ghi nhận thay tổ xe</summary><p className="hint">Dùng khi tổ xe mất sóng hoặc báo qua điện thoại.</p><ManualCard t={t} /></details> : null}
        </section>
        <section className="card journey-incidents"><div className="journey-section-head"><h3 className="card-title">Sự cố cần theo dõi</h3><span className={`journey-count ${active.length ? 'has-issues' : ''}`}>{active.length}</span></div>
          {active.length ? active.map((i: Any) => (
            <a key={i.id} className="journey-incident" href={`/coordinator/incidents/${i.id}`} onClick={(e) => { e.preventDefault(); go(`f/incident/${i.id}`); }}>
              <div><b>{i.id} · {incTypeVi(i.type)}</b><span>{f5Pill(i)[1]}{i.blocking && !i.continueAt ? ' · Đang chặn chặng' : ''}</span></div><span className="journey-incident-arrow" aria-hidden="true">→</span></a>))
            : <p className="journey-calm">Không có sự cố đang mở.</p>}
        </section>
        <section className="card journey-schedule"><div className="journey-section-head"><h3 className="card-title">Thời gian giao dự kiến</h3>{editable ? <button type="button" className="link" onClick={() => etaUpdate(t.id)}>Cập nhật ETA</button> : null}</div>
          <div className={`journey-eta ${late ? 'is-late' : ''}`}>{dt(t.eta)}</div>
          {late ? <p className="journey-blocked">Đã quá ETA. Cần liên hệ tổ xe để cập nhật.</p> : null}
          <div className="journey-schedule-row"><span>Khởi hành dự kiến</span><b>{dt(t.plannedDepart)}</b></div>
          {(t.etaHistory || []).length ? <p className="hint">Đã cập nhật ETA {(t.etaHistory || []).length} lần</p> : null}
          {editable ? <button type="button" className="btn ghost sm journey-schedule-action" onClick={() => scheduleAlert(t.id)}><Icon name="bell" />Thông báo thay đổi lịch</button> : null}
          {(t.alerts || []).length ? <details className="journey-disclosure" open={disclosure(`${t.id}:alerts`)} onToggle={toggle(`${t.id}:alerts`)}><summary>Lịch sử thông báo ({t.alerts.length})</summary><AlertsCard t={t} /></details> : null}
        </section>
      </aside>
      <section className="card journey-stops"><div className="journey-section-head"><h3 className="card-title">Các điểm trên hành trình</h3><span className="muted">{t.milestones.length} mốc đã ghi nhận</span></div>
        {stops.length ? <ul className="timeline">{stops.map((s: Any, i: number) => {
          const ms = t.milestones.filter((x: Any) => x.stop === i);
          const done = ms.length && (i < cur || (i === cur && ms.some((x: Any) => /LEFT|DEPARTED|PASSED|DESTINATION/.test(x.type))));
          return (
            <li key={i} className={done ? 'green' : i === cur ? 'orange' : ''}><div className="journey-stop-heading"><b>{i + 1}. {s.name}</b>{i === cur && !done ? <span className="journey-here">Mốc hiện tại</span> : null}</div>
              <span className="muted">{STOP_LABEL[s.type] || human(s.type)}{s.plannedAt ? ' · Dự kiến ' + dt(s.plannedAt) : ''}</span>
              {ms.length ? ms.map((x: Any, k: number) => <span key={k}>{MILESTONE_LABEL[x.type] || human(x.type)} · {dt(x.at)} · {emp(x.by)?.name || x.by || ''}{x.manual ? ' · Ghi thay tổ xe' : ''}</span>) : <span className="muted">Chưa ghi nhận mốc</span>}
            </li>);
        })}</ul> : <p className="hint">Chưa có tuyến được duyệt.</p>}
      </section>
    </div>
  );
}
