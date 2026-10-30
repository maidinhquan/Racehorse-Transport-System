import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DriverLayout, Icon } from '../../components/DriverLayout';
import { TripHero } from '../../components/TripHero/TripHero';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { RouteMap } from '../../components/RouteMap/RouteMap';
import { DelayModal, MilestoneModal } from '../../components/Modals';
import { useDriver } from '../../hooks/useDriver';
import {
  CLEARANCE_LABEL,
  DELAY_LABEL,
  MILESTONE_LABEL,
  cooldownLeft,
  delayPending,
  fmtDateTime,
  handoverReady,
  lastMilestone,
  milestoneText,
  myPosition,
  nextMilestone,
} from '../../hooks/driverRules';
import type { Trip } from '../../types';
import './JourneyPage.css';

/** Đếm ngược thời gian chờ giữa 2 mốc, tự làm mới mỗi giây */
const useCooldown = (lastMs?: number) => {
  const [, tick] = useState(0);
  const left = cooldownLeft(lastMs);
  useEffect(() => {
    if (!left) return;
    const id = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [left]);
  return left;
};

// ---------------------------------------------------------------------------
// Ô ghi nhận mốc tiếp theo – nằm cạnh bản đồ
// ---------------------------------------------------------------------------
const RecordPanel: React.FC<{ trip: Trip }> = ({ trip }) => {
  const navigate = useNavigate();
  const { lastRecordedMs, actions } = useDriver();
  const [msOpen, setMsOpen] = useState(false);
  const [delayOpen, setDelayOpen] = useState(false);
  const n = nextMilestone(trip);
  const wait = useCooldown(lastRecordedMs[trip.id]);
  const delayed = delayPending(trip);

  return (
    <div className="drv-card">
      <h3 className="drv-card__title">Ghi nhận mốc tiếp theo</h3>
      <p className="drv-subtitle" style={{ marginTop: -6 }}>Ghi nhận từng sự kiện khi thực tế xảy ra. Cập nhật thủ công, không có GPS trực tiếp.</p>

      {trip.status === 'READY_TO_DEPART' && !trip.milestones.length && (
        <>
          <div className="drv-note drv-note--grey">
            <Icon name="clock" />
            <div><b>Lịch khởi hành: {fmtDateTime(trip.plannedDepart)}</b>Chỉ bấm xuất phát khi thực tế bắt đầu đi trong hoặc sau ngày đã lên lịch. Nếu không thể đi đúng ngày, hãy báo chậm khởi hành.</div>
          </div>
          <button type="button" className="drv-btn drv-btn--block" style={{ marginTop: 10 }} disabled={delayed} onClick={() => setDelayOpen(true)}>Báo chậm khởi hành</button>
        </>
      )}

      {n ? (
        <>
          <button type="button" className="drv-btn drv-btn--solid drv-btn--lg drv-btn--block drv-journey__record"
            disabled={!!n.blocked || !!wait || (n.type === 'DEPARTED' && delayed)} onClick={() => setMsOpen(true)}>
            {milestoneText(trip, n)}
          </button>
          {!n.blocked && wait > 0 && (
            <div className="drv-note drv-note--grey"><Icon name="clock" /><div><b>Vừa ghi nhận một mốc</b>Có thể ghi mốc tiếp theo sau {wait} giây, để tránh bấm nhầm liên tiếp.</div></div>
          )}
          {n.blocked && (
            <>
              <div className="drv-note drv-note--yellow">
                <Icon name="clock" />
                <div>
                  <b>Đang chờ thông quan</b>
                  {n.clearance ? `Kết quả: ${CLEARANCE_LABEL[n.clearance.result]} – ${n.clearance.notes}. Chờ hướng dẫn tiếp theo.` : 'Transport Specialist ghi nhận quyết định của cơ quan chức năng trước khi bạn đi tiếp.'}
                </div>
              </div>
              <button type="button" className="drv-btn drv-btn--block" style={{ marginTop: 10 }} onClick={() => void actions.remindClearance(trip.id)}>
                <Icon name="bell" /> Nhắc Specialist ghi kết quả thông quan
              </button>
              <p className="drv-hint">{trip.pingAt ? `Đã nhắc lúc ${fmtDateTime(trip.pingAt)}. ` : ''}Xe đang chờ ở cửa khẩu/trạm: chỉ khi Specialist ghi kết quả thông quan thì nút ghi mốc tiếp theo mới mở.</p>
            </>
          )}
        </>
      ) : handoverReady(trip) ? (
        <>
          <div className="drv-note drv-note--blue"><Icon name="check" /><div><b>Đã đến điểm giao</b>Hoàn tất thủ tục bàn giao ngựa.</div></div>
          <button type="button" className="drv-btn drv-btn--solid drv-btn--lg drv-btn--block" style={{ marginTop: 10 }} onClick={() => navigate(`/driver/trips/${trip.id}/handover`)}>Bắt đầu bàn giao</button>
        </>
      ) : (
        <p className="drv-hint">{trip.status === 'COMPLETED' ? 'Chuyến đã hoàn tất.' : trip.status === 'PLANNING' ? 'Chuyến chưa được Manager duyệt khởi hành.' : 'Không còn mốc cần ghi.'}</p>
      )}

      {trip.status === 'IN_TRANSIT' && (
        <>
          <button type="button" className="drv-btn drv-btn--danger-solid drv-btn--lg drv-btn--block" style={{ marginTop: 14 }} onClick={() => navigate(`/driver/incidents/${trip.id}`)}>
            <Icon name="alert" /> SOS – Báo sự cố
          </button>
          <p className="drv-hint">Cứu hộ khẩn cấp cho người và ngựa trước, không cần chờ duyệt; sau đó báo cáo để Coordinator lập phương án.</p>
        </>
      )}

      {msOpen && n && <MilestoneModal trip={trip} next={n} onClose={() => setMsOpen(false)} onSubmit={(at, note) => actions.recordMilestone(trip.id, at, note)} />}
      {delayOpen && <DelayModal trip={trip} onClose={() => setDelayOpen(false)} onSubmit={(reason) => actions.reportDepartureDelay(trip.id, reason)} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Lịch sử các mốc đã ghi
// ---------------------------------------------------------------------------
const MilestoneHistory: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { crewMember } = useDriver();
  return (
    <div className="drv-card">
      <h3 className="drv-card__title">Lịch sử mốc</h3>
      {trip.milestones.length ? (
        <ul className="drv-timeline">
          {[...trip.milestones].reverse().map((x, i) => (
            <li key={x.type + x.at + x.stopIndex} className={i ? 'green' : 'orange'}>
              <b>{MILESTONE_LABEL[x.type]}{trip.stops[x.stopIndex] ? ' – ' + trip.stops[x.stopIndex].name : ''}</b>
              <span>{fmtDateTime(x.at)} • {crewMember(x.by)?.name ?? x.by}{x.note ? ' • ' + x.note : ''}</span>
            </li>
          ))}
        </ul>
      ) : <p className="drv-hint">Chưa ghi nhận mốc nào.</p>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Trang Hành trình của một chuyến: bản đồ ôm trang + ghi nhận mốc
// ---------------------------------------------------------------------------
const Journey: React.FC<{ trip: Trip }> = ({ trip }) => {
  const navigate = useNavigate();
  const { userId, actions } = useDriver();
  const [full, setFull] = useState(false);
  const m = lastMilestone(trip);
  const n = nextMilestone(trip);

  useEffect(() => {
    document.body.classList.toggle('drv-map-lock', full);
    return () => document.body.classList.remove('drv-map-lock');
  }, [full]);

  return (
    <div className="drv-journey">
      <div className="drv-head">
        <div>
          <div className="drv-eyebrow">Hành trình • {myPosition(trip, userId)}</div>
          <h2 className="drv-title">{trip.id} <TripStatusBadge status={trip.status} /></h2>
          <p className="drv-subtitle">
            {trip.origin} → {trip.destination} • Khởi hành {fmtDateTime(trip.plannedDepart)} • ETA {fmtDateTime(trip.eta)}
            {m ? ` • Cập nhật gần nhất: ${MILESTONE_LABEL[m.type]} ${fmtDateTime(m.at)}` : ''}
          </p>
        </div>
        <button type="button" className="drv-btn" onClick={() => navigate(`/driver/trips/${trip.id}`)}>Thông tin chuyến đi →</button>
      </div>

      {trip.departureDelay && trip.departureDelay.status !== 'APPROVED' && (
        <div className="drv-note drv-note--yellow" style={{ marginTop: 0, marginBottom: 16 }}>
          <Icon name="clock" />
          <div><b>Đã báo chậm khởi hành • {DELAY_LABEL[trip.departureDelay.status]}</b>{trip.departureDelay.reason}</div>
        </div>
      )}

      <div className="drv-journey__body">
        <div className={`drv-card drv-journey__map ${full ? 'is-full' : ''}`}>
          <div className="drv-journey__mapbar">
            <b>{full ? `${trip.id} • ${trip.origin} → ${trip.destination}` : 'Bản đồ tuyến'}</b>
            <button type="button" className={`drv-btn drv-btn--sm ${full ? 'drv-btn--solid' : ''}`} onClick={() => setFull((v) => !v)}>
              <Icon name={full ? 'close' : 'expand'} />{full ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            </button>
          </div>
          {trip.stops.length
            ? <RouteMap stops={trip.stops} current={m ? m.stopIndex : -1} height={full ? window.innerHeight - 150 : 440} compact={full} />
            : <div className="drv-empty"><b>Chưa có tuyến</b>Điều phối viên chưa thêm điểm dừng.</div>}
          {full && (
            <div className="drv-journey__fullnext">
              {n ? <span>Mốc tiếp theo: <b>{milestoneText(trip, n)}</b></span> : <span>Không còn mốc cần ghi.</span>}
              <button type="button" className="drv-btn drv-btn--sm" onClick={() => setFull(false)}>Về ô ghi nhận mốc</button>
            </div>
          )}
        </div>
        <div className="drv-journey__side drv-stack">
          <RecordPanel trip={trip} />
          <MilestoneHistory trip={trip} />
        </div>
      </div>

      <div className="drv-demo">
        <div className="drv-demo__title">Điều khiển demo</div>
        <p>Giả lập thao tác của Specialist / Coordinator / Manager để trình bày luồng của tài xế.</p>
        <div className="drv-btn-row" style={{ marginTop: 0 }}>
          <button type="button" className="drv-btn drv-btn--sm" disabled={!n?.blocked} onClick={() => actions.demoClearance(trip.id)}>Demo: Specialist ghi thông quan đạt</button>
          <button type="button" className="drv-btn drv-btn--sm" disabled={!delayPending(trip)} onClick={() => actions.demoApproveDelay(trip.id)}>Demo: Manager duyệt lịch khởi hành mới</button>
          <button type="button" className="drv-btn drv-btn--sm" onClick={() => actions.demoFastForward()}>Demo: bỏ qua thời gian chờ giữa 2 mốc</button>
        </div>
      </div>
    </div>
  );
};

export const JourneyPage: React.FC = () => {
  const { tripId } = useParams<{ tripId?: string }>();
  const navigate = useNavigate();
  const { activeTrips, getTrip, loading } = useDriver();
  const picked = tripId ? getTrip(tripId) : activeTrips.length === 1 ? activeTrips[0] : undefined;

  if (picked && picked.status !== 'COMPLETED') {
    return <DriverLayout title="Hành trình"><Journey trip={picked} /></DriverLayout>;
  }

  return (
    <DriverLayout title="Hành trình">
      <div className="drv-head">
        <div>
          <h2 className="drv-title">Chuyến được giao</h2>
          <p className="drv-subtitle">Mỗi nhân sự chỉ gắn với một chuyến đang hoạt động. Chuyến đã hoàn tất nằm trong mục Lịch sử.</p>
        </div>
      </div>
      {activeTrips.length ? activeTrips.map((t) => (
        <TripHero key={t.id} trip={t} actions={<>
          <button type="button" className="drv-btn drv-btn--solid drv-btn--lg" onClick={() => navigate(`/driver/journey/${t.id}`)}>Hành trình</button>
          <button type="button" className="drv-btn drv-btn--lg" onClick={() => navigate(`/driver/trips/${t.id}`)}>Chuyến đi</button>
        </>} />
      )) : (
        <div className="drv-card drv-empty">
          <b>{loading ? 'Đang tải…' : 'Chưa có chuyến đang hoạt động'}</b>
          Chuyến Coordinator giao cho bạn sẽ hiện ở đây. Bật “Dữ liệu mẫu” ở thanh trên để xem demo.
        </div>
      )}
    </DriverLayout>
  );
};

export default JourneyPage;
