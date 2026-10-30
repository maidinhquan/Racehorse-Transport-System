import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { RouteMap } from '../../components/RouteMap/RouteMap';
import { DemoPanel } from '../../components/DemoPanel/DemoPanel';
import { LockedCard, Note, horseNames } from '../../components/Common/Common';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { useCustomer } from '../../hooks/useCustomer';
import { MILESTONE_LABEL, STOP_LABEL, TRIP_STATUS_LABEL, cityLabel, fmtDateTime, tripSummary } from '../../hooks/customerRules';
import type { TripStatus } from '../../types';
import './CustomerTrackingPage.css';

const ORDER: Record<TripStatus, number> = { IN_TRANSIT: 0, READY_TO_DEPART: 1, PLANNING: 2, COMPLETED: 3 };

/** Theo dõi chuyến: tuyến, các điểm dừng, mốc do tổ xe xác nhận và thay đổi ETA (không có GPS trực tiếp) */
export const CustomerTrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId: string }>();
  const { requests, horses, getRequest } = useCustomer();
  const list = requests.filter((r) => r.trip && r.trip.status !== 'PLANNING').sort((a, b) => ORDER[a.trip!.status] - ORDER[b.trip!.status]);
  const asked = requestId ? getRequest(requestId) : undefined;
  const r = asked ?? list[0];

  const head = (
    <div className="cus-head">
      <div>
        <h2 className="cus-title">Theo dõi chuyến</h2>
        <p className="cus-subtitle">Tiến độ dựa trên các mốc tổ xe xác nhận. Không có vị trí GPS trực tiếp.</p>
      </div>
      {list.length > 0 && (
        <label className="cus-track__pick">
          <span className="cus-eyebrow">Chọn chuyến</span>
          <select className="cus-select" value={r?.id ?? ''} onChange={(e) => navigate(`/customer/tracking/${e.target.value}`)}>
            {list.map((x) => <option key={x.id} value={x.id}>{x.id} • {x.trip!.id}: {horseNames(x, horses)} ({TRIP_STATUS_LABEL[x.trip!.status]})</option>)}
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
  const t = r.trip;
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
  const events = [
    ...t.milestones.map((m) => ({ at: m.at, title: `${MILESTONE_LABEL[m.type]} – ${t.stops[m.stopIndex]?.name ?? ''}`, note: m.note ?? '', tone: 'now' as const })),
    ...t.etaHistory.map((e) => ({ at: e.at, title: `ETA đổi thành ${fmtDateTime(e.to)}`, note: e.reason, tone: '' as const })),
    ...(t.handover ? [{ at: t.handover.completedAt, title: 'Hoàn tất bàn giao có xác minh', note: t.handover.receiverName, tone: 'done' as const }] : []),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <CustomerLayout title="Theo dõi chuyến">
      {head}
      <div className="cus-grid-main">
        <div className="cus-stack">
          <div className="cus-card">
            <h3 className="cus-card__title">
              <span>{t.id} • {r.id}<br /><small className="cus-muted">{cityLabel(r.origin)} → {cityLabel(r.destination)} • {t.mode === 'AIR' ? 'Hàng không + đường bộ' : t.mode === 'ROAD' ? 'Đường bộ' : 'Chờ Coordinator lập phương án'} • {horseNames(r, horses)}</small></span>
              <TripStatusBadge kind="trip" status={t.status} />
            </h3>
            {t.routeApproved ? <RouteMap stops={t.stops.map(stop => {
              const place = stop.type === 'ORIGIN' ? r.pickup : stop.type === 'DESTINATION' ? r.delivery : undefined;
              return { ...stop, latitude: stop.latitude ?? place?.latitude, longitude: stop.longitude ?? place?.longitude };
            })} current={current} /> : <Note tone="grey" title="Tuyến chưa được duyệt">Tuyến hiển thị khi CBN Transport duyệt lộ trình.</Note>}
            <div className="cus-track__progress">
              <span>Tiến độ hành trình</span><span>{s.done}/{t.stops.length} điểm đã xác nhận</span>
            </div>
            <div className={`cus-progress ${t.status === 'COMPLETED' ? 'cus-progress--ok' : ''}`}><i style={{ width: `${s.pct}%` }} /></div>
          </div>

          <div className="cus-card">
            <h3 className="cus-card__title">Các điểm dừng & cửa khẩu theo kế hoạch</h3>
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
              <div className="hl"><span>{s.adjusted ? 'ETA điều chỉnh' : 'ETA'}</span><b>{fmtDateTime(t.eta)}</b></div>
              {s.arr && <div><span>Đến thực tế</span><b>{fmtDateTime(s.arr.at)}</b></div>}
              {t.handover && <div><span>Bàn giao</span><b>{fmtDateTime(t.handover.completedAt)}</b></div>}
            </div>
            <p className="cus-muted" style={{ marginTop: 10 }}>ETA có thể thay đổi do thông quan và điều kiện đường sá.</p>
            <button type="button" className="cus-btn cus-btn--block" style={{ marginTop: 10 }} onClick={() => navigate(`/customer/requests/${r.id}`)}>Xem chi tiết yêu cầu</button>
            {t.handover && <button type="button" className="cus-btn cus-btn--solid cus-btn--block" onClick={() => navigate(`/customer/requests/${r.id}/handover`)}>Bàn giao & nghiệm thu</button>}
          </div>
          <div className="cus-card">
            <div className="cus-eyebrow">Sự kiện hành trình</div>
            {events.length ? (
              <ul className="cus-timeline" style={{ marginTop: 10 }}>
                {events.map((e, i) => <li key={`${e.at}-${i}`} className={e.tone}><b>{e.title}</b><span>{fmtDateTime(e.at)}{e.note ? ` • ${e.note}` : ''}</span></li>)}
              </ul>
            ) : <p className="cus-muted" style={{ marginTop: 8 }}>Chưa có sự kiện nào.</p>}
          </div>
          <DemoPanel request={r} />
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerTrackingPage;
