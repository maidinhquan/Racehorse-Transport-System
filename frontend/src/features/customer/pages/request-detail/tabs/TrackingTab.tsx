import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TransportRequest, Trip, TripStatus } from '../../../types';
import { cityLabel, fmtDateTime, tripSummary } from '../../../hooks/customerRules';
import { Icon } from '../../../components/CustomerLayout';
import { DemoPanel } from '../../../components/DemoPanel/DemoPanel';
import { LockedCard, Note } from '../../../components/Common/Common';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import { CustomerRelocationCard } from '../../../components/RelocationProposal/CustomerRelocationCard';
import { RouteMap } from '../../../components/RouteMap/RouteMap';
import { flow4Api } from '../../../../tracking/api/flow4Api';
import type * as T from '../../../../tracking/types/flow4.types';
import { progressFromMilestones } from '../../../../tracking/utils/progress';
import { getSharedTrips } from '../../../../../shared/utils/sharedTrips';

const cleanId = (x?: string) => (x || '').replace(/-/g, '_');

/** Tab Theo dõi: hiển thị bản đồ lộ trình, tiến độ và liên kết theo dõi đầy đủ */
export const TrackingTab: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [liveTracking, setLiveTracking] = useState<T.PublicTracking | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    flow4Api.getCustomerTracking(r.id)
      .then((res) => {
        if (active && res) setLiveTracking(res);
      })
      .catch(() => {
        if (active) setLiveTracking(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [r.id]);

  const sharedTrips = getSharedTrips();
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

  if (loading && !t) {
    return (
      <div className="cus-card">
        <p className="cus-muted">Đang tải dữ liệu hành trình chuyến...</p>
      </div>
    );
  }

  if (!t) {
    return (
      <LockedCard
        title="Chưa có chuyến"
        text="Chuyến đi được tạo khi hợp đồng được ký sau khi xác minh tiền cọc."
      />
    );
  }

  const s = tripSummary(t);
  const current = t.status === 'COMPLETED' ? t.stops.length - 1 : s.at;

  return (
    <div className="cus-grid-main">
      <div className="cus-stack">
        <div className="cus-card">
          <h3 className="cus-card__title">
            <span>Chuyến {t.id} <small className="cus-muted">({cityLabel(r.origin)} → {cityLabel(r.destination)})</small></span>
            <TripStatusBadge kind="trip" status={t.status} />
          </h3>
          <CustomerRelocationCard tripId={t.id} />

          {/* Bản đồ tuyến đường */}
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
            <Note tone="grey" title="Tuyến chưa được duyệt">Tuyến chi tiết hiển thị khi CBN Transport duyệt lộ trình và lên lịch khởi hành.</Note>
          )}

          <div className="cus-track__progress" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13, color: '#64748b' }}>
            <span>Tiến độ hành trình</span>
            <b>{s.done}/{t.stops.length || '—'} điểm đã xác nhận</b>
          </div>
          <div className={`cus-progress ${t.status === 'COMPLETED' ? 'cus-progress--ok' : ''}`} style={{ margin: '8px 0 16px' }}>
            <i style={{ width: `${s.pct}%` }} />
          </div>

          <div className="cus-kv">
            <div><span>Dự kiến xuất phát</span><b>{fmtDateTime(t.plannedDepart)}</b></div>
            <div><span>{s.adjusted ? 'ETA điều chỉnh' : 'ETA'}</span><b>{fmtDateTime(t.eta)}</b></div>
            <div><span>Phương thức</span><b>{t.mode === 'AIR' ? 'Hàng không + đường bộ' : t.mode === 'ROAD' ? 'Đường bộ' : 'Chờ Coordinator lập phương án'}</b></div>
            <div><span>Mốc xác nhận gần nhất</span><b>{s.m ? s.lastLabel : 'Chưa xuất phát'}</b></div>
            {s.m && <div><span>Xác nhận lúc</span><b>{fmtDateTime(s.m.at)}</b></div>}
            {s.adjusted && <div><span>ETA ban đầu</span><b><s>{fmtDateTime(t.etaOriginal)}</s></b></div>}
          </div>

          <div className="cus-btn-row" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="cus-btn cus-btn--solid"
              onClick={() => navigate(`/customer/tracking/${r.id}`)}
            >
              <Icon name="pin" /> Mở trang theo dõi chi tiết (Toàn màn hình)
            </button>
          </div>
          <p className="cus-muted" style={{ marginTop: 12 }}>Theo dõi hiển thị mốc cuối cùng do tổ xe xác nhận. Không có vị trí GPS trực tiếp giữa các mốc.</p>
        </div>
      </div>
      <DemoPanel request={r} />
    </div>
  );
};

export default TrackingTab;
