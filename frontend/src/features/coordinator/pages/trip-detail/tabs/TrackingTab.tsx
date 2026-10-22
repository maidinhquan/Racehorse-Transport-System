import React, { useState } from 'react';
import type { Trip } from '../../../types';
import { useCoordinator } from '../../../hooks/useCoordinator';
import {
  MILESTONE_LABEL,
  STOP_LABEL,
  fmtDateTime,
  lastMilestone,
  milestoneText,
  nextMilestone,
} from '../../../hooks/coordinatorRules';
import { RouteMap } from '../../../components/RouteMap/RouteMap';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import { UpdateEtaModal } from '../../../components/Modals';

/** Theo dõi hành trình: bản đồ ở trên, các mốc ở dưới, kèm nút demo tài xế cập nhật mốc */
export const TrackingTab: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { actions } = useCoordinator();
  const [etaOpen, setEtaOpen] = useState(false);
  const stops = trip.route.stops;
  const m = lastMilestone(trip);
  const n = nextMilestone(trip);
  const cur = m ? m.stopIndex : -1;

  return (
    <>
      <div className="crd-card">
        <h3 className="crd-card__title"><span>Theo dõi hành trình</span><TripStatusBadge status={trip.status} /></h3>
        <p className="crd-muted" style={{ marginTop: -6 }}>Vị trí dựa trên các mốc tổ xe xác nhận trên ứng dụng tài xế; không có GPS trực tiếp.</p>
        <RouteMap stops={stops} current={cur} height={540} />
        <div className="crd-track-stats">
          <div className="crd-stat"><span>Mốc gần nhất</span><b>{m ? milestoneText(trip, m) : 'Chưa xuất phát'}</b><small>{m ? fmtDateTime(m.at) : ''}</small></div>
          <div className="crd-stat"><span>Mốc kế tiếp</span><b>{n ? milestoneText(trip, n) : '—'}</b><small>{n && stops[n.stopIndex] ? `dự kiến ${fmtDateTime(stops[n.stopIndex].plannedAt)}` : ''}</small></div>
          <div className="crd-stat"><span>Khởi hành dự kiến</span><b>{fmtDateTime(trip.plannedDepart)}</b><small>{trip.milestones.length} mốc đã ghi</small></div>
          <div className="crd-stat"><span>ETA hiện tại</span><b>{fmtDateTime(trip.eta)}</b><small>{trip.etaHistory.length} lần cập nhật</small></div>
        </div>
        {trip.status !== 'COMPLETED' && (
          <div className="crd-btn-row"><button type="button" className="crd-btn crd-btn--sm" onClick={() => setEtaOpen(true)}>Cập nhật ETA</button></div>
        )}
      </div>

      <div className="crd-card">
        <h3 className="crd-card__title">Các mốc hành trình</h3>
        {stops.length ? (
          <ul className="crd-timeline">
            {stops.map((s, i) => {
              const ms = trip.milestones.filter((x) => x.stopIndex === i);
              const done = ms.length > 0 && (i < cur || (i === cur && ms.some((x) => ['DEPARTED', 'LEFT_STOP', 'PASSED_CHECKPOINT', 'ARRIVED_DESTINATION'].includes(x.type))));
              const here = i === cur && !done;
              return (
                <li key={s.id} className={done ? 'done' : here ? 'now' : ''}>
                  <b>{i + 1}. {s.name}</b> <small className="crd-muted">• {STOP_LABEL[s.type]} • dự kiến {fmtDateTime(s.plannedAt)}</small>
                  {ms.length ? ms.map((x) => <span key={x.type + x.at}>{MILESTONE_LABEL[x.type]} • {fmtDateTime(x.at)} • {x.by}</span>) : <span>Chưa đến</span>}
                </li>
              );
            })}
          </ul>
        ) : <p className="crd-muted">Chưa có tuyến được duyệt.</p>}
        {trip.etaHistory.length > 0 && (
          <>
            <h3 className="crd-card__title" style={{ marginTop: 16 }}>Lịch sử thay đổi ETA</h3>
            <ul className="crd-timeline">
              {[...trip.etaHistory].reverse().map((h) => (
                <li key={h.at + h.to} className="now"><b>{fmtDateTime(h.from)} → {fmtDateTime(h.to)}</b><span>{fmtDateTime(h.at)} • {h.by} • {h.reason}</span></li>
              ))}
            </ul>
          </>
        )}
      </div>

      {trip.status !== 'COMPLETED' && trip.status !== 'PLANNING' && (
        <div className="crd-demo">
          <div className="crd-demo__title">Điều khiển demo • tài xế cập nhật mốc</div>
          <p>Giả lập thao tác tài xế ghi nhận trên ứng dụng tài xế.{n ? ` Mốc kế tiếp: ${milestoneText(trip, n)}.` : ''}</p>
          <div className="crd-btn-row" style={{ marginTop: 0 }}>
            <button type="button" className={`crd-btn crd-btn--sm ${trip.status === 'READY_TO_DEPART' ? 'crd-btn--solid' : ''}`} disabled={trip.status !== 'READY_TO_DEPART'} onClick={() => actions.demoMilestone(trip.id, 'depart')}>Demo: Tài xế xuất phát</button>
            <button type="button" className={`crd-btn crd-btn--sm ${n && n.type !== 'ARRIVED_DESTINATION' && trip.status === 'IN_TRANSIT' ? 'crd-btn--solid' : ''}`} disabled={trip.status !== 'IN_TRANSIT' || !n} onClick={() => actions.demoMilestone(trip.id, 'next')}>Demo: Tài xế ghi nhận mốc tiếp theo</button>
            <button type="button" className="crd-btn crd-btn--sm" disabled={trip.status !== 'IN_TRANSIT' || !n} onClick={() => actions.demoMilestone(trip.id, 'arrive')}>Demo: Tài xế đến điểm giao</button>
          </div>
        </div>
      )}

      {etaOpen && (
        <UpdateEtaModal trip={trip} open onClose={() => setEtaOpen(false)} onSubmit={async (eta, reason) => (await actions.updateEta(trip.id, eta, reason)).ok} />
      )}
    </>
  );
};

export default TrackingTab;
