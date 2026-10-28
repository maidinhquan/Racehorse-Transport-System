// Giám sát hành trình: chuyến đang chạy / chờ xuất phát và chuyến đang lập kế hoạch được giao cho Điều phối
import type { MouseEvent } from 'react';
import { Empty, Icon, Pill, PillT } from '../../components/common/ui';
import { EmptyPlanLaunch } from '../../components/demo/Demo';
import { CoordinatorLayout } from '../../components/layout/CoordinatorLayout';
import { agoText, coordTrips, deployed, healthFlag, horse, hoursSince, lastMilestone, legHolds, livePos, planPill, planState, reqOfTrip, resourceGaps, resourcePill, routePill, STALE_H, tripHorses, tripStops } from '../../domain/coordinatorRules';
import type { Any } from '../../store/coordinatorStore';
import { db, go, nowStamp, useCoordinatorStore } from '../../store/coordinatorStore';
import { cityLabel, dt, human, MILESTONE_LABEL, MS_VI, stampMs, STOP_COLOR } from '../../utils/format';
import { ALERT_CAUSE } from '../../workflows/coordinatorActions';

import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const open = (e: MouseEvent, to: string) => { e.preventDefault(); go(to); };

function LiveTrack({ t }: { t: Any }) {
  const stops = tripStops(t), p = livePos(t), n = stops.length;
  if (n < 2) return null;
  return (<>
    <div className="live-track"><div className="live-line"><span style={{ width: `${p.pct}%` }} /></div>
      {stops.map((s: Any, i: number) => <i key={i} className={`live-dot ${i <= p.idx ? 'done' : ''}`} style={{ left: `${i / (n - 1) * 100}%`, background: i <= p.idx ? STOP_COLOR[s.type] : undefined }} title={s.name} />)}
      <b className="live-truck" style={{ left: `${p.pct}%` }} title={p.text}><Icon name="truck" /></b></div>
    <div className="live-ends"><span>{stops[0].name}</span><span>{stops[n - 1].name}</span></div>
  </>);
}
function MonitorCard({ t }: { t: Any }) {
  const r = reqOfTrip(t), m = lastMilestone(t), p = livePos(t), age = hoursSince(m ? m.at : null), stale = t.status === 'IN_TRANSIT' && age != null && age > STALE_H;
  const late = t.etaOriginal && t.eta > t.etaOriginal ? Math.round((stampMs(t.eta) - stampMs(t.etaOriginal)) / 3600000 * 10) / 10 : 0;
  const inc = db.incidents.filter((i: Any) => i.tripId === t.id && i.status !== 'CLOSED'), hf = healthFlag(t), al = (t.alerts || []).slice(-1)[0];
  const flags = [
    stale ? <span key="s" className="mon-flag red"><Icon name="alert" />{STALE_H}+ giờ chưa cập nhật – liên hệ tổ xe, ghi mốc thay</span> : null,
    inc.length ? <span key="i" className="mon-flag red"><Icon name="alert" />{inc.length} sự cố đang mở{inc.some((i: Any) => i.status === 'REPORTED') ? ' • chưa tiếp nhận' : ''}{legHolds(t).length ? ' • chặng tạm dừng' : ''}</span> : null,
    hf ? <span key="h" className="mon-flag orange"><Icon name="alert" />Ngựa {horse(hf.horseId).name}: {hf.temp}°C, {human(hf.condition)}</span> : null,
    late ? <span key="l" className="mon-flag orange"><Icon name="clock" />ETA trễ {late} giờ</span> : null,
    al ? <span key="a" className="mon-flag grey"><Icon name="bell" />{ALERT_CAUSE[al.cause]} • {dt(al.at)}</span> : null,
  ].filter(Boolean);
  const to = `f/trip/${t.id}/progress`;
  return (
    <a className={`card mon-card mon-summary ${stale || inc.length ? 'warn' : ''}`} href={`/coordinator/trips/${t.id}/progress`} onClick={(e) => open(e, to)} aria-label={`Mở chi tiết hành trình ${t.id}`}>
      <div className="between"><div className="mon-open"><b className="mon-id">{t.id}</b> <Pill v={t.status} /><span className="muted">{r.id} • {cityLabel(r.origin)} → {cityLabel(r.destination)} • {human(t.mode)} • {tripHorses(t).length} ngựa</span></div>
        <div className="mon-eta"><span>Dự kiến đến</span><b>{dt(t.eta)}</b></div></div>
      <LiveTrack t={t} />
      <div className="mon-kv"><div><span>Vị trí ước tính</span><b>{p.text}</b></div><div><span>Cập nhật gần nhất</span><b>{m ? `${MS_VI[m.type] || MILESTONE_LABEL[m.type]} • ${agoText(age)}${m.manual ? ' (Coordinator ghi thay)' : ''}` : 'Chưa xuất phát'}</b></div></div>
      {flags.length ? <div className="mon-flags">{flags}</div> : null}
    </a>
  );
}
const NEXT: Record<string, string> = { AWAITING_DEPLOYMENT: 'Chờ Manager xác nhận triển khai.', ON_HOLD: 'Triển khai đang tạm dừng.', AWAITING_ROUTE: 'Lập lộ trình và gửi Manager duyệt.', ROUTE_PENDING: 'Lộ trình đang chờ Manager duyệt.', ROUTE_RETURNED: 'Manager trả lại lộ trình – tạo phiên bản điều chỉnh.', PLANNED: 'Đã lập xong – chờ Manager duyệt khởi hành.' };
function PlanCard({ t }: { t: Any }) {
  const r = reqOfTrip(t), gaps = resourceGaps(t), ps = planState(t);
  const next = ps === 'MISSING_RESOURCES' ? (gaps.length ? 'Còn thiếu: ' + gaps.slice(0, 3).join(', ') + (gaps.length > 3 ? '…' : '') : 'Xác nhận bố trí xe & nhân sự.') : NEXT[ps] || '';
  const to = `f/trip/${t.id}`;
  return (
    <a className="card mon-card mon-summary plan" href={`/coordinator/trips/${t.id}`} onClick={(e) => open(e, to)} aria-label={`Mở chi tiết kế hoạch ${t.id}`}>
      <div className="between"><div className="mon-open"><b className="mon-id">{t.id}</b> <PillT p={planPill(t)} /><span className="muted">{r.id} • {cityLabel(r.origin)} → {cityLabel(r.destination)} • {human(t.mode)} • {tripHorses(t).length} ngựa</span></div>
        <div className="mon-eta"><span>Khởi hành dự kiến</span><b>{dt(t.plannedDepart)}</b></div></div>
      <div className="mon-kv"><div><span>Lộ trình</span><b><PillT p={routePill(t)} /></b></div><div><span>Xe &amp; nhân sự</span><b>{deployed(t) ? <PillT p={resourcePill(t)} /> : '—'}</b></div></div>
      <p className="hint" style={{ margin: '8px 0 0' }}>{next}</p>
    </a>
  );
}

export function MonitorPage() {
  useCoordinatorStore(); useAutoRefresh();
  const mine = coordTrips(), planning = mine.filter((t: Any) => t.status === 'PLANNING');
  const live = mine.filter((t: Any) => ['IN_TRANSIT', 'READY_TO_DEPART'].includes(t.status)).sort((a: Any, b: Any) => Number(b.status === 'IN_TRANSIT') - Number(a.status === 'IN_TRANSIT'));
  const stale = live.filter((t: Any) => t.status === 'IN_TRANSIT' && (hoursSince((lastMilestone(t) || {}).at) as number) > STALE_H).length;
  const late = live.filter((t: Any) => t.etaOriginal && t.eta > t.etaOriginal).length;
  const openInc = db.incidents.filter((i: Any) => i.status !== 'CLOSED' && live.some((t: Any) => t.id === i.tripId)).length;
  const stat = (l: string, v: number, bad = false) => <div className="dr-stat" style={{ cursor: 'default' }}><span>{l}</span><b className={bad && v ? 't-bad' : ''}>{v}</b></div>;
  return (
    <CoordinatorLayout title="Giám sát hành trình">
      <EmptyPlanLaunch />
      <div className="head"><div><h2 className="page-title">Giám sát hành trình</h2><p className="subtitle">Các chuyến được giao cho bạn: theo dõi chuyến đang chạy, lập lộ trình và bố trí xe/nhân sự cho chuyến đang chuẩn bị. Bấm vào thẻ chuyến để xem đầy đủ thông tin và các thao tác. Tự làm mới mỗi 30 giây • {dt(nowStamp())}</p></div></div>
      <div className="dr-stats" style={{ gridTemplateColumns: 'repeat(5,minmax(0,1fr))', marginTop: 16 }}>
        {stat('Đang chạy / chờ xuất phát', live.length)}{stat('Đang lập kế hoạch', planning.length)}{stat('Trễ so với ETA ban đầu', late, true)}{stat(`Quá ${STALE_H} giờ chưa cập nhật`, stale, true)}{stat('Sự cố đang mở', openInc, true)}
      </div>
      <h3 className="card-title mon-sec">Đang chạy &amp; chờ xuất phát ({live.length})</h3>
      {live.length ? <div className="mon-grid">{live.map((t: Any) => <MonitorCard key={t.id} t={t} />)}</div> : <div className="card" style={{ marginTop: 12 }}><Empty title="Không có chuyến đang chạy" text="Chuyến được Manager duyệt khởi hành sẽ hiện ở đây." /></div>}
      <h3 className="card-title mon-sec">Đang lập kế hoạch ({planning.length})</h3>
      {planning.length ? <div className="mon-grid">{planning.map((t: Any) => <PlanCard key={t.id} t={t} />)}</div> : <div className="card" style={{ marginTop: 12 }}><Empty title="Không có chuyến đang lập kế hoạch" text="Chuyến được Manager giao cho bạn sẽ hiện ở đây." /></div>}
      <p className="hint">Không có GPS trực tiếp: vị trí là ước tính từ mốc gần nhất và giờ dự kiến của điểm dừng kế tiếp.</p>
    </CoordinatorLayout>
  );
}
export default MonitorPage;
