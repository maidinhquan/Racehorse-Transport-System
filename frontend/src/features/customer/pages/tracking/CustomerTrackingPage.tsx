import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { RouteMap } from '../../components/RouteMap/RouteMap';
import { DemoPanel } from '../../components/DemoPanel/DemoPanel';
import { LockedCard, Note } from '../../components/Common/Common';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { useCustomer } from '../../hooks/useCustomer';
import { MILESTONE_LABEL, STOP_LABEL, TRIP_STATUS_LABEL, cityLabel, shortCity, fmtDateTime, tripSummary } from '../../hooks/customerRules';
import type { Trip, TripStatus } from '../../types';
import { CustomerRelocationCard } from '../../components/RelocationProposal/CustomerRelocationCard';
import { flow4Api } from '../../../tracking/api/flow4Api';
import type * as T from '../../../tracking/types/flow4.types';
import { progressFromMilestones } from '../../../tracking/utils/progress';
import { getSharedTrips } from '../../../../shared/utils/sharedTrips';
import './CustomerTrackingPage.css';

const ORDER: Record<TripStatus, number> = { IN_TRANSIT: 0, READY_TO_DEPART: 1, PLANNING: 2, COMPLETED: 3 };
const cleanId = (x?: string) => (x || '').replace(/-/g, '_');

/** Theo dõi chuyến: tuyến, các điểm dừng, mốc do tổ xe xác nhận và thay đổi ETA (kết nối Flow 4 Backend) */
export const CustomerTrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId: string }>();
  const [selectedId, setSelectedId] = useState<string | undefined>(requestId);
  const { requests, getRequest } = useCustomer(selectedId || requestId);

  useEffect(() => {
    if (requestId) {
      setSelectedId(requestId);
    }
  }, [requestId]);

  const sharedTrips = getSharedTrips();
  // Yêu cầu đã lên lịch hoặc đang vận chuyển (chuyến thật nằm ở Flow 4, không nhất thiết có `trip` cục bộ)
  const tracked = (x: (typeof requests)[number]) => {
    if (x.trip && x.trip.status !== 'PLANNING') return true;
    const st = Object.values(sharedTrips).find(
      (s) => cleanId(s.requestId) === cleanId(x.id) || cleanId(s.id) === cleanId(x.id)
    );
    if (st && st.status !== 'PLANNING') return true;
    return ['ACTIVATED', 'SCHEDULED', 'IN_TRANSIT', 'DELIVERED'].includes(x.status);
  };
  const orderOf = (x: (typeof requests)[number]) => {
    const st = Object.values(sharedTrips).find((s) => cleanId(s.requestId) === cleanId(x.id) || cleanId(s.id) === cleanId(x.id));
    const stStatus = st?.status as TripStatus | undefined;
    if (x.trip) return ORDER[x.trip.status];
    if (stStatus && ORDER[stStatus] !== undefined) return ORDER[stStatus];
    return x.status === 'IN_TRANSIT' ? 0 : x.status === 'SCHEDULED' ? 1 : 3;
  };
  const list = requests.filter(tracked).sort((a, b) => orderOf(a) - orderOf(b));

  const activeId = selectedId || requestId;
  const asked = activeId
    ? list.find((x) => x.id === activeId || cleanId(x.id) === cleanId(activeId) || (x.trip && cleanId(x.trip.id) === cleanId(activeId)))
      || getRequest(activeId)
      || requests.find((x) => cleanId(x.id) === cleanId(activeId) || (x.trip && cleanId(x.trip.id) === cleanId(activeId)))
    : undefined;
  const r = asked ?? list[0];

  const [liveTracking, setLiveTracking] = useState<T.PublicTracking | null>(null);
  const [liveHealth, setLiveHealth] = useState<T.PublicHealth[]>([]);
  const [activityTab, setActivityTab] = useState<'health' | 'events'>('events');

  useEffect(() => {
    setLiveTracking(null);
    setLiveHealth([]);
    if (!r?.id) return;
    let active = true;
    // Lịch trình và mốc check-in của tài xế tự cập nhật mỗi 15 giây khi đang mở trang
    const load = () => {
      if (document.visibilityState !== 'visible') return;
      flow4Api.getCustomerTracking(r.id).then((res) => {
        if (active && res) setLiveTracking(res);
      }).catch(() => {
        if (active) setLiveTracking(null);
      });
      flow4Api.getCustomerHealthLogs(r.id).then((logs) => {
        if (active && Array.isArray(logs)) setLiveHealth(logs);
      }).catch(() => {
        if (active) setLiveHealth([]);
      });
    };
    load();
    const timer = window.setInterval(load, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [r?.id]);

  const head = (
    <div className="cus-head">
      <div>
        <h2 className="cus-title">Theo dõi chuyến</h2>
      </div>
      {list.length > 0 && (
        <label className="cus-track__pick">
          <span className="cus-eyebrow">Chọn chuyến</span>
          <select
            className="cus-select"
            value={r?.id ?? ''}
            onChange={(e) => {
              const nextId = e.target.value;
              setSelectedId(nextId);
              setLiveTracking(null);
              setLiveHealth([]);
              navigate(`/customer/tracking/${nextId}`);
            }}
          >
            {list.map((x) => {
              const st = Object.values(sharedTrips).find(
                (s) => cleanId(s.requestId) === cleanId(x.id) || cleanId(s.id) === cleanId(x.id)
              );
              const tripId = x.trip?.id || st?.id;
              const tripStatus = (x.trip?.status || st?.status) as TripStatus | undefined;
              const route = x.origin && x.destination ? `${shortCity(x.origin)} → ${shortCity(x.destination)}` : (x.origin || x.destination || "");
              const statusText = tripStatus && TRIP_STATUS_LABEL[tripStatus] ? ` (${TRIP_STATUS_LABEL[tripStatus]})` : "";
              return (
                <option key={x.id} value={x.id}>
                  {x.id}{tripId ? ` • ${tripId}` : ""}{route ? `: ${route}` : ""}{statusText}
                </option>
              );
            })}
          </select>
        </label>
      )}
    </div>
  );

  if (!r) {
    return (
      <CustomerLayout title="Theo dõi chuyến">
        {head}
        <div className="cus-card cus-empty">Bạn chưa có chuyến nào để theo dõi.<br /><br />
          <button type="button" className="cus-btn" onClick={() => navigate('/customer/requests')}>Xem yêu cầu vận chuyển</button>
        </div>
      </CustomerLayout>
    );
  }

  // Khớp dữ liệu tracking Flow 4 với đơn hiện tại
  const isMatchingLive = Boolean(liveTracking && (
    (liveTracking.trip?.requestId && cleanId(liveTracking.trip.requestId) === cleanId(r.id)) ||
    (r.trip?.id && liveTracking.trip?.tripId && cleanId(liveTracking.trip.tripId) === cleanId(r.trip.id)) ||
    (liveTracking.trip?.tripId && cleanId(liveTracking.trip.tripId) === cleanId(r.id))
  ));
  const effectiveLive = isMatchingLive && liveTracking?.milestones?.length
    ? progressFromMilestones(liveTracking.milestones, liveTracking.map?.routePoints ?? [])
    : null;

  const sharedTrip = Object.values(sharedTrips).find(
    (st) => cleanId(st.requestId) === cleanId(r.id) || cleanId(st.id) === cleanId(r.id) || (r.trip && cleanId(st.id) === cleanId(r.trip.id))
  );

  let baseTrip: Trip | undefined = r.trip;
  if (!baseTrip && sharedTrip) {
    baseTrip = {
      id: sharedTrip.id,
      status: (sharedTrip.status || 'IN_TRANSIT') as TripStatus,
      mode: (sharedTrip.mode || 'ROAD') as any,
      plannedDepart: sharedTrip.plannedDepart || '',
      eta: sharedTrip.eta || '',
      routeApproved: sharedTrip.route?.status === 'APPROVED',
      stops: (sharedTrip.route?.stops || []).map((s) => ({
        name: s.name,
        type: s.type as any,
        plannedAt: s.plannedAt,
        lat: s.lat,
        lng: s.lng,
        latitude: s.lat,
        longitude: s.lng,
      })),
      milestones: [],
      etaHistory: [],
    };
  }
  if (!baseTrip && isMatchingLive && liveTracking?.trip) {
    baseTrip = {
      id: liveTracking.trip.tripId,
      status: liveTracking.trip.tripStatus,
      mode: liveTracking.trip.mode,
      plannedDepart: liveTracking.milestones[0]?.plannedAt ?? '',
      eta: liveTracking.trip.eta?.currentEta ?? '',
      routeApproved: true,
      stops: [],
      milestones: [],
      etaHistory: [],
    };
  }

  const t: Trip | undefined = baseTrip && effectiveLive
    ? {
        ...baseTrip,
        routeApproved: true,
        stops: effectiveLive.stops.map((s) => ({
          name: s.name,
          plannedAt: s.plannedAt,
          lat: s.lat,
          lng: s.lng,
          latitude: s.lat,
          longitude: s.lng,
          type: s.type === 'FUEL_STOP' ? ('REST_STOP' as const) : s.type === 'QUARANTINE_STATION' ? ('CHECKPOINT' as const) : s.type,
        })),
        milestones: effectiveLive.milestones.map((m) => ({ ...m, note: m.note ?? '' })),
      }
    : baseTrip;

  if (!t || t.status === 'PLANNING') {
    return (
      <CustomerLayout title="Theo dõi chuyến">
        {head}
        <LockedCard title={`Chưa thể theo dõi ${r.id}`} text={t ? 'Chuyến đang được lập kế hoạch. Theo dõi bắt đầu khi CBN Transport duyệt tuyến và lên lịch.' : 'Chuyến được tạo khi hợp đồng được ký sau khi xác minh tiền cọc.'} />
        <button type="button" className="cus-btn" style={{ marginTop: 12 }} onClick={() => navigate(`/customer/requests/${r.id}`)}>Xem chi tiết yêu cầu</button>
      </CustomerLayout>
    );
  }

  const s = tripSummary(t);
  const current = t.status === 'COMPLETED' ? t.stops.length - 1 : s.at;
  const stopState = (i: number) => (t.status === 'COMPLETED' || i < s.at || (i === s.at && s.m && ['LEFT_STOP', 'DEPARTED'].includes(s.m.type)) ? 'done'
    : i === s.at ? 'current' : i === s.at + 1 && t.status === 'IN_TRANSIT' ? 'next' : 'planned');
  const confirmedAt = (i: number) => t.milestones.find((m) => m.stopIndex === i && ['ARRIVED_STOP', 'ARRIVED_DESTINATION', 'DEPARTED'].includes(m.type))?.at;

  const liveEvents = (effectiveLive ? [] : (isMatchingLive ? liveTracking?.milestones : []) || []).map((m) => ({
    at: m.occurredAt || m.plannedAt || '',
    title: `${m.label || m.kind}`,
    note: m.status === 'COMPLETED' ? 'Đã hoàn tất' : 'Theo kế hoạch',
    tone: (m.status === 'COMPLETED' ? 'now' : '') as 'now' | '',
  }));

  const events = [
    ...liveEvents,
    ...t.milestones.map((m) => ({ at: m.at, title: `${MILESTONE_LABEL[m.type]} – ${t.stops[m.stopIndex]?.name ?? ''}`, note: m.note ?? '', tone: 'now' as const })),
    ...t.etaHistory.map((e) => ({ at: e.at, title: `ETA đổi thành ${fmtDateTime(e.to)}`, note: e.reason, tone: '' as const })),
    ...(t.handover ? [{ at: t.handover.completedAt, title: 'Hoàn tất bàn giao có xác minh', note: t.handover.receiverName, tone: 'done' as const }] : []),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <CustomerLayout title="Theo dõi chuyến">
      {head}
      <div className="cus-grid-main cus-track__layout">
        <div className="cus-stack">
          <div className="cus-card">
            <h3 className="cus-card__title">
              <span>{t.id} • {r.id}<br /><small className="cus-muted">{cityLabel(r.origin)} → {cityLabel(r.destination)}</small></span>
              <TripStatusBadge kind="trip" status={t.status} />
            </h3>
            <CustomerRelocationCard tripId={t.id} />
            {t.routeApproved ? (
              <RouteMap
                key={`${t.id}-${r.id}`}
                stops={t.stops.map(stop => {
                  const place = stop.type === 'ORIGIN' ? r.pickup : stop.type === 'DESTINATION' ? r.delivery : undefined;
                  return { ...stop, latitude: stop.latitude ?? place?.latitude, longitude: stop.longitude ?? place?.longitude };
                })}
                current={current}
                tripId={t.id}
              />
            ) : (
              <Note tone="grey" title="Tuyến chưa được duyệt">Tuyến hiển thị khi CBN Transport duyệt lộ trình.</Note>
            )}
            <div className="cus-track__progress">
              <span>Tiến độ hành trình</span><span>{s.done}/{t.stops.length} điểm đã xác nhận</span>
            </div>
            <div className={`cus-progress ${t.status === 'COMPLETED' ? 'cus-progress--ok' : ''}`}><i style={{ width: `${s.pct}%` }} /></div>
          </div>

          <div className="cus-card">
            <h3 className="cus-card__title">Các điểm dừng & cửa khẩu theo kế hoạch</h3>
            <div className="cus-track__stops-list">
            {t.stops.map((x, i) => {
              const st = stopState(i), at = confirmedAt(i);
              return (
                <div key={`${x.name}-${i}`} className="cus-track__stop">
                  <span className={`cus-track__no ${st}`}>{i + 1}</span>
                  <div><b>{x.name}</b><small>{STOP_LABEL[x.type]} • dự kiến {fmtDateTime(x.plannedAt)}{at ? ` • xác nhận ${fmtDateTime(at)}` : ''}</small></div>
                  <TripStatusBadge label={st === 'done' ? 'Đã xác nhận' : st === 'current' ? 'Mốc gần nhất' : st === 'next' ? 'Tiếp theo' : 'Theo kế hoạch'}
                    tone={st === 'done' ? 'ok' : st === 'current' ? 'brand' : st === 'next' ? 'info' : 'muted'} />
                </div>
              );
            })}
            </div>
          </div>
        </div>

        <div className="cus-stack">
          <div className="cus-card">
            <div className="cus-eyebrow">Mốc xác nhận gần nhất</div>
            {s.m ? (
              <div className="cus-track__status"><span><Icon name="pin" /></span><div><b>{s.lastLabel}</b><small>Xác nhận {fmtDateTime(s.m.at)}{s.m.by ? ` bởi ${s.m.by}` : ''}</small></div></div>
            ) : <p className="cus-subtitle">Chưa xuất phát.</p>}
            <div className="cus-summary" style={{ marginTop: 12 }}>
              <div><span>Dự kiến xuất phát</span><b>{fmtDateTime(t.plannedDepart)}</b></div>
              {s.dep && <div><span>Xuất phát thực tế</span><b>{fmtDateTime(s.dep.at)}</b></div>}
              {s.adjusted && <div><span>ETA ban đầu</span><b><s>{fmtDateTime(t.etaOriginal)}</s></b></div>}
              <div className="hl"><span>{s.adjusted ? 'ETA điều chỉnh' : 'ETA'}</span><b>{fmtDateTime((isMatchingLive && liveTracking?.trip?.eta?.currentEta) || t.eta)}</b></div>
              {s.arr && <div><span>Đến thực tế</span><b>{fmtDateTime(s.arr.at)}</b></div>}
              {t.handover && <div><span>Bàn giao</span><b>{fmtDateTime(t.handover.completedAt)}</b></div>}
            </div>
            <p className="cus-muted" style={{ marginTop: 10 }}>ETA có thể thay đổi do thông quan và điều kiện đường sá.</p>
            <button type="button" className="cus-btn cus-btn--block" style={{ marginTop: 10 }} onClick={() => navigate(`/customer/requests/${r.id}`)}>Xem chi tiết yêu cầu</button>
            {t.handover && <button type="button" className="cus-btn cus-btn--solid cus-btn--block" onClick={() => navigate(`/customer/requests/${r.id}/handover`)}>Bàn giao & nghiệm thu</button>}
          </div>

          <div className="cus-card cus-track__activity">
            <div className="cus-track__tabs" role="group" aria-label="Chọn thông tin hành trình">
              <button type="button" className={activityTab === 'health' ? 'active' : ''} aria-pressed={activityTab === 'health'} onClick={() => setActivityTab('health')}>Nhật ký sức khỏe</button>
              <button type="button" className={activityTab === 'events' ? 'active' : ''} aria-pressed={activityTab === 'events'} onClick={() => setActivityTab('events')}>Sự kiện lịch trình</button>
            </div>
            {activityTab === 'health' ? (
              <div className="cus-track__activity-panel" tabIndex={0} aria-label="Nhật ký sức khỏe">
                {liveHealth.length ? (
                  <ul className="cus-timeline">
                    {liveHealth.map((h, i) => (
                      <li key={`${h.id || i}`} className={h.condition === 'ABNORMAL' ? 'now' : ''}>
                        <b>Ngựa {h.horseId}: {h.condition === 'NORMAL' ? 'Bình thường' : 'Cần theo dõi'} {h.temperatureC ? `• ${h.temperatureC}°C` : ''}</b>
                        <span>{fmtDateTime(h.observedAt)}{h.observation ? ` • ${h.observation}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="cus-muted">Chưa có nhật ký sức khỏe.</p>}
              </div>
            ) : (
              <div className="cus-track__activity-panel" tabIndex={0} aria-label="Sự kiện lịch trình">
                {events.length ? (
                  <ul className="cus-timeline">
                    {events.map((e, i) => <li key={`${e.at}-${i}`} className={e.tone}><b>{e.title}</b><span>{fmtDateTime(e.at)}{e.note ? ` • ${e.note}` : ''}</span></li>)}
                  </ul>
                ) : <p className="cus-muted">Chưa có sự kiện nào.</p>}
              </div>
            )}
          </div>

          <DemoPanel request={r} />
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerTrackingPage;
