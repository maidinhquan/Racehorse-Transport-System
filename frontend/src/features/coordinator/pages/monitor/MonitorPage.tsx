import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CoordinatorLayout, Icon } from '../../components/CoordinatorLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { RouteMap } from '../../components/RouteMap/RouteMap';
import { useCoordinator } from '../../hooks/useCoordinator';
import {
  DELAY_LABEL,
  MILESTONE_LABEL,
  delayPending,
  etaSlipped,
  fmtDateTime,
  isOpenIncident,
  lastMilestone,
  modeLabel,
  nextMilestone,
  planGaps,
  whereNow,
} from '../../hooks/coordinatorRules';
import type { Trip } from '../../types';
import './MonitorPage.css';

/** Giám sát hành trình: chuyến đang chạy / chờ xuất phát và chuyến đang lập kế hoạch */
export const MonitorPage: React.FC = () => {
  const navigate = useNavigate();
  const { trips, vehicles, staff, incidents } = useCoordinator();
  const mine = trips.filter((t) => t.status !== 'COMPLETED' && t.deploymentStatus === 'CONFIRMED');
  const live = mine.filter((t) => ['IN_TRANSIT', 'READY_TO_DEPART'].includes(t.status))
    .sort((a, b) => Number(b.status === 'IN_TRANSIT') - Number(a.status === 'IN_TRANSIT'));
  const planning = mine.filter((t) => t.status === 'PLANNING');
  const openInc = (t: Trip) => incidents.filter((i) => i.tripId === t.id && isOpenIncident(i));
  const driverName = (t: Trip) => staff.find((s) => s.id === (t.crew.MAIN_DRIVER || t.legs?.outbound.crew.MAIN_DRIVER))?.name ?? '—';

  const stats: Array<[string, number, boolean?]> = [
    ['Đang chạy / chờ xuất phát', live.length],
    ['Đang lập kế hoạch', planning.length],
    ['ETA đã lùi so với ban đầu', live.filter(etaSlipped).length, true],
    ['Báo chậm khởi hành', live.filter(delayPending).length, true],
    ['Sự cố đang mở', live.reduce((n, t) => n + openInc(t).length, 0), true],
  ];

  return (
    <CoordinatorLayout title="Giám sát hành trình">
      <div className="crd-head">
        <div>
          <h2 className="crd-title">Giám sát hành trình</h2>
          <p className="crd-subtitle">Các chuyến được giao cho bạn: theo dõi chuyến đang chạy, lập lộ trình và bố trí xe/nhân sự cho chuyến đang chuẩn bị. Bấm vào thẻ để xem đầy đủ và thao tác.</p>
        </div>
      </div>

      <div className="crd-stats crd-mon-stats">
        {stats.map(([label, value, warn]) => (
          <div key={label} className="crd-stat"><span>{label}</span><b className={warn && value ? 'crd-mon-bad' : ''}>{value}</b></div>
        ))}
      </div>

      <h3 className="crd-mon-sec">Đang chạy &amp; chờ xuất phát ({live.length})</h3>
      {live.length ? (
        <div className="crd-mon-grid">
          {live.map((t) => {
            const m = lastMilestone(t); const n = nextMilestone(t); const inc = openInc(t);
            return (
              <button key={t.id} type="button" className="crd-card crd-mon-card" onClick={() => navigate(`/coordinator/trips/${t.id}/tracking`)}>
                <div className="crd-mon-card__top"><b>{t.id}</b><TripStatusBadge status={t.status} /></div>
                <div className="crd-mon-card__route">{t.origin} → {t.destination} <span className="crd-muted">• {modeLabel(t.mode)}</span></div>
                <div className="crd-kv crd-mon-kv">
                  <div><span>Vị trí ước tính</span><b>{whereNow(t)}</b></div>
                  <div><span>Mốc gần nhất</span><b>{m ? `${MILESTONE_LABEL[m.type]} • ${fmtDateTime(m.at)}` : 'Chưa xuất phát'}</b></div>
                  <div><span>Điểm kế tiếp</span><b>{n && t.route.stops[n.stopIndex] ? t.route.stops[n.stopIndex].name : '—'}</b></div>
                  <div><span>ETA</span><b className={etaSlipped(t) ? 'crd-mon-bad' : ''}>{fmtDateTime(t.eta)}</b></div>
                  <div><span>Tài xế</span><b>{driverName(t)}</b></div>
                  <div><span>Sự cố mở</span><b className={inc.length ? 'crd-mon-bad' : ''}>{inc.length || 'Không'}</b></div>
                </div>
                {t.departureDelay && delayPending(t) && (
                  <div className="crd-note crd-note--yellow"><Icon name="clock" /><div><b>{DELAY_LABEL[t.departureDelay.status]}</b>{t.departureDelay.reason}</div></div>
                )}
                {t.route.stops.length > 0 && <div className="crd-mon-map" onClick={(e) => e.stopPropagation()}><RouteMap stops={t.route.stops} current={m ? m.stopIndex : -1} height={200} /></div>}
              </button>
            );
          })}
        </div>
      ) : <div className="crd-card crd-empty">Không có chuyến đang chạy. Chuyến được Manager duyệt khởi hành sẽ hiện ở đây.</div>}

      <h3 className="crd-mon-sec">Đang lập kế hoạch ({planning.length})</h3>
      {planning.length ? (
        <div className="crd-mon-grid">
          {planning.map((t) => {
            const gaps = planGaps(t, vehicles, staff, trips);
            return (
              <button key={t.id} type="button" className="crd-card crd-mon-card" onClick={() => navigate(`/coordinator/trips/${t.id}`)}>
                <div className="crd-mon-card__top"><b>{t.id}</b>{gaps.length ? <TripStatusBadge tone="warn" label={`${gaps.length} việc còn mở`} /> : <TripStatusBadge tone="ok" label="Đã lập kế hoạch xong" />}</div>
                <div className="crd-mon-card__route">{t.origin} → {t.destination} <span className="crd-muted">• {modeLabel(t.mode)} • khởi hành {fmtDateTime(t.plannedDepart)}</span></div>
                {gaps.length > 0 && <ul className="crd-mon-gaps">{gaps.slice(0, 4).map((g) => <li key={g}>{g}</li>)}{gaps.length > 4 && <li>+{gaps.length - 4} mục khác</li>}</ul>}
              </button>
            );
          })}
        </div>
      ) : <div className="crd-card crd-empty">Không có chuyến đang lập kế hoạch.</div>}

      <p className="crd-muted" style={{ marginTop: 16 }}>Không có GPS trực tiếp: vị trí là ước tính từ mốc tổ xe xác nhận gần nhất.</p>
    </CoordinatorLayout>
  );
};

export default MonitorPage;
