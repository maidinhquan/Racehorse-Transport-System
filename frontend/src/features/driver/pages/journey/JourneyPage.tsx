import React, { useState } from 'react';
import { useIncidentPins } from '../../../../shared/utils/sharedIncidentPins';
import { getUserFullName } from '../../../../shared/utils/userNameResolver';
import { useNavigate, useParams } from 'react-router-dom';
import { DriverLayout, Icon } from '../../components/DriverLayout';
import { TripHero } from '../../components/TripHero/TripHero';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { RouteMap } from '../../components/RouteMap/RouteMap';
import { MilestoneModal, HorseDetailModal } from '../../components/Modals';
import { useDriver } from '../../hooks/useDriver';
import {
  CLEARANCE_LABEL,
  DELAY_LABEL,
  MILESTONE_LABEL,
  delayPending,
  fmtDateTime,
  handoverReady,
  horsesMissingHealth,
  lastMilestone,
  milestoneText,
  myPosition,
  nextMilestone,
} from '../../hooks/driverRules';
import { cleanStopName } from '../../../tracking/utils/progress';
import type { Horse, Trip } from '../../types';
import './JourneyPage.css';

// ---------------------------------------------------------------------------
// Ô ghi nhận mốc tiếp theo – nằm cạnh bản đồ
// ---------------------------------------------------------------------------
/** Kiểm tra sức khỏe bắt buộc trước khi xuất phát và trước khi rời mỗi điểm dừng: hiện từng ngựa đã/chưa kiểm tra */
const HealthCheckCard: React.FC<{ trip: Trip; canRecord: boolean }> = ({ trip, canRecord }) => {
  const navigate = useNavigate();
  const { horse } = useDriver();
  const n = nextMilestone(trip);
  if (!n || (n.type !== 'DEPARTED' && n.type !== 'LEFT_STOP')) return null;
  const since = n.type === 'DEPARTED' ? '' : lastMilestone(trip)?.at ?? '';
  const missing = horsesMissingHealth(trip, since);
  const title = n.type === 'DEPARTED' ? 'Kiểm tra sức khỏe trước khi xuất phát' : 'Kiểm tra sức khỏe trước khi rời điểm dừng';
  return (
    <div className="drv-note drv-note--yellow" style={{ marginBottom: 12, flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Icon name={missing.length ? 'clock' : 'check'} />
        <b>{title}</b>
      </div>
      <ul style={{ listStyle: 'none', margin: '8px 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {trip.horses.map((id) => {
          const done = !missing.includes(id);
          return (
            <li key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span>{horse(id)?.name ?? id}</span>
              <span className={`drv-badge drv-badge--${done ? 'ok' : 'warn'}`}>{done ? 'Đã kiểm tra' : 'Chưa kiểm tra'}</span>
            </li>
          );
        })}
      </ul>
      {missing.length > 0 && (canRecord
        ? <button type="button" className="drv-btn drv-btn--solid drv-btn--block" onClick={() => navigate(`/driver/trips/${trip.id}?tab=health`)}>Báo sức khỏe ngựa</button>
        : <small>Chờ bác sĩ thú y báo sức khỏe cho các ngựa còn lại; sau đó mới ghi được mốc.</small>)}
    </div>
  );
};

const RecordPanel: React.FC<{ trip: Trip }> = ({ trip }) => {
  const navigate = useNavigate();
  const { actions, isEscort } = useDriver();
  const [msOpen, setMsOpen] = useState(false);
  const delayed = delayPending(trip);
  const n = nextMilestone(trip);

  return (
    <div className="drv-card">
      <h3 className="drv-card__title">Ghi nhận mốc tiếp theo</h3>

      {!isEscort && trip.status === 'READY_TO_DEPART' && !trip.milestones.length && (
        <>
          <div className="drv-note drv-note--grey">
            <Icon name="clock" />
            <div><b>Lịch khởi hành: {fmtDateTime(trip.plannedDepart)}</b>Chỉ bấm xuất phát khi thực tế bắt đầu đi trong hoặc sau ngày đã lên lịch.</div>
          </div>
        </>
      )}

      {trip.status !== 'COMPLETED' && <HealthCheckCard trip={trip} canRecord={isEscort} />}

      {isEscort ? (
        <div className="drv-note drv-note--grey"><Icon name="check" /><div><b>Bác sĩ thú y không ghi mốc hành trình</b>Mốc hành trình do tài xế cập nhật. Bạn ghi nhật ký sức khỏe ngựa ở mục Chuyến đi, thẻ Sức khỏe.</div></div>
      ) : n ? (
        <>
          <button type="button" className="drv-btn drv-btn--solid drv-btn--lg drv-btn--block drv-journey__record"
            disabled={!!n.blocked || (n.type === 'DEPARTED' && delayed)} title={n.healthCheckRequired ? (n.type === 'DEPARTED' ? 'Cần kiểm tra sức khỏe toàn bộ ngựa trước khi xuất phát' : 'Cần kiểm tra sức khỏe toàn bộ ngựa trước khi rời điểm dừng') : undefined} onClick={() => setMsOpen(true)}>
            {milestoneText(trip, n)}
          </button>
          {n.blocked && n.healthCheckRequired && (
            <>
              <div className="drv-note drv-note--yellow" style={{ marginTop: 10 }}>
                <Icon name="clock" />
                <div>
                  <b>Yêu cầu kiểm tra sức khỏe ngựa</b>
                  {n.type === 'DEPARTED' ? 'Phải ghi nhật ký sức khỏe cho toàn bộ ngựa trước khi xuất phát. Nút xuất phát sẽ mở sau khi hoàn tất kiểm tra.' : 'Phải ghi nhật ký sức khỏe cho toàn bộ ngựa trước khi rời điểm dừng. Nút rời điểm dừng sẽ mở sau khi hoàn tất kiểm tra.'}
                </div>
              </div>
              <button
                type="button"
                className="drv-btn drv-btn--block"
                style={{ marginTop: 10 }}
                onClick={() => navigate(`/driver/trips/${trip.id}?tab=health`)}
              >
                Ghi nhật ký sức khỏe
              </button>
            </>
          )}
          {n.blocked && !n.healthCheckRequired && (
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
          <div className="drv-note drv-note--blue"><Icon name="check" /><div><b>Bàn giao ngựa (Flow 6)</b>Kiểm tra vi mạch, tạo biên bản và xác thực OTP.</div></div>
          <button type="button" className="drv-btn drv-btn--solid drv-btn--lg drv-btn--block" style={{ marginTop: 10 }} onClick={() => navigate(`/driver/trips/${trip.id}/handover`)}>Bắt đầu bàn giao (Flow 6)</button>
        </>
      ) : (
        <p className="drv-hint">{trip.status === 'COMPLETED' ? 'Chuyến đã hoàn tất.' : trip.status === 'PLANNING' ? 'Chuyến chưa được Manager duyệt khởi hành.' : 'Không còn mốc cần ghi.'}</p>
      )}

      {trip.status === 'IN_TRANSIT' && (
        <button type="button" className="drv-btn drv-btn--danger-solid drv-btn--lg drv-btn--block" style={{ marginTop: 14 }} onClick={() => navigate(`/driver/incidents/${trip.id}`)}>
          <Icon name="alert" /> SOS – Báo sự cố
        </button>
      )}

      {msOpen && n && <MilestoneModal trip={trip} next={n} onClose={() => setMsOpen(false)} onSubmit={(at, note) => actions.recordMilestone(trip.id, at, note)} />}
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
              <b>{MILESTONE_LABEL[x.type]}{trip.stops[x.stopIndex] ? ' – ' + cleanStopName(trip.stops[x.stopIndex].name) : ''}</b>
              <span>{fmtDateTime(x.at)} • {getUserFullName(crewMember(x.by)?.name || x.by)}{x.note ? ' • ' + x.note : ''}</span>
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

// ---------------------------------------------------------------------------
// Thẻ thông tin ngựa trên chuyến – tài xế có thể xem trực tiếp thông tin cá thể
// ---------------------------------------------------------------------------
const TripHorsesCard: React.FC<{ trip: Trip; onSelectHorse: (h: Horse) => void }> = ({ trip, onSelectHorse }) => {
  const { horse } = useDriver();

  return (
    <div className="drv-card">
      <h3 className="drv-card__title">Ngựa trên chuyến ({trip.horses.length})</h3>
      <div>
        {trip.horses.map((id) => {
          const h = horse(id);
          const latestHealth = [...trip.health].reverse().find((hl) => hl.horseId === id);

          return (
            <div
              key={id}
              className="drv-horse"
              style={{ cursor: 'pointer' }}
              onClick={() => h && onSelectHorse(h)}
              role="button"
              tabIndex={0}
              title="Bấm để xem chi tiết thông tin ngựa"
            >
              <span className="drv-horse__thumb">{(h?.name ?? id).slice(0, 1)}</span>
              <div className="drv-horse__text" style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b>{h?.name ?? id}</b>
                  {latestHealth && (
                    <span
                      className={`drv-badge drv-badge--${
                        latestHealth.condition === 'NORMAL'
                          ? 'ok'
                          : latestHealth.condition === 'MONITOR'
                          ? 'warn'
                          : 'bad'
                      }`}
                    >
                      {latestHealth.condition === 'NORMAL' ? 'Bình thường' : latestHealth.condition === 'MONITOR' ? 'Theo dõi' : 'Bất thường'}
                    </span>
                  )}
                </div>
                <span>{h ? [h.breed, h.sex, h.age ? `${h.age} tuổi` : '', h.color].filter(Boolean).join(' • ') : ''}</span>
                <span>Microchip <b style={{ userSelect: 'all' }}>{h?.microchip ?? '—'}</b></span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="drv-hint" style={{ marginTop: 8, marginBottom: 0 }}>Bấm vào từng cá thể ngựa để xem chi tiết thông tin và chỉ số sức khỏe.</p>
    </div>
  );
};

const Journey: React.FC<{ trip: Trip }> = ({ trip }) => {
  const navigate = useNavigate();
  const { userId } = useDriver();
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  const m = lastMilestone(trip);
  const pins = useIncidentPins(trip.id);


  return (
    <div className="drv-journey">
      <div className="drv-head">
        <div>
          <div className="drv-eyebrow">Hành trình • {myPosition(trip, userId)}</div>
          <h2 className="drv-title">{trip.id} <TripStatusBadge status={trip.status} /></h2>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="drv-btn drv-btn--solid"
            disabled={!handoverReady(trip)}
            title={handoverReady(trip) ? undefined : 'Chỉ mở khi đã đến mốc cuối cùng (điểm giao)'}
            onClick={() => navigate(`/driver/trips/${trip.id}/handover`)}
          >
            Thủ tục bàn giao (Flow 6) →
          </button>
          <button type="button" className="drv-btn" onClick={() => navigate(`/driver/trips/${trip.id}`)}>
            Thông tin chuyến đi →
          </button>
        </div>
      </div>

      {trip.departureDelay && trip.departureDelay.status !== 'APPROVED' && (
        <div className="drv-note drv-note--yellow" style={{ marginTop: 0, marginBottom: 16 }}>
          <Icon name="clock" />
          <div><b>Đã báo chậm khởi hành • {DELAY_LABEL[trip.departureDelay.status]}</b>{trip.departureDelay.reason}</div>
        </div>
      )}

      <div className="drv-journey__body">
        <div className="drv-card drv-journey__map">
          <div className="drv-journey__mapbar">
            <b>{`${trip.id} • ${trip.origin} → ${trip.destination}`}</b>
          </div>
          {trip.stops.length
            ? <RouteMap stops={trip.stops} current={m ? m.stopIndex : -1} height={440} pins={pins} />
            : <div className="drv-empty"><b>Chưa có tuyến</b>Điều phối viên chưa thêm điểm dừng.</div>}
        </div>
        <div className="drv-journey__side drv-stack">
          <RecordPanel trip={trip} />
          <TripHorsesCard trip={trip} onSelectHorse={(h) => setSelectedHorse(h)} />
          <MilestoneHistory trip={trip} />
        </div>
      </div>

      {selectedHorse && (
        <HorseDetailModal
          horse={selectedHorse}
          trip={trip}
          onClose={() => setSelectedHorse(null)}
          onOpenHealth={() => {
            setSelectedHorse(null);
            navigate(`/driver/trips/${trip.id}?tab=health`);
          }}
        />
      )}
    </div>
  );
};

export const JourneyPage: React.FC = () => {
  const { tripId } = useParams<{ tripId?: string }>();
  const navigate = useNavigate();
  const { activeTrips, getTrip, loading } = useDriver();
  const picked = tripId ? getTrip(tripId) : activeTrips.length === 1 ? activeTrips[0] : undefined;

  if (loading && !picked) {
    return (
      <DriverLayout title="Hành trình">
        <div className="drv-card drv-empty">
          <b>Đang tải dữ liệu chuyến từ máy chủ…</b>
        </div>
      </DriverLayout>
    );
  }

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
          <button type="button" className="drv-btn drv-btn--solid drv-btn--lg" disabled={!handoverReady(t)} title={handoverReady(t) ? undefined : 'Chỉ mở khi đã đến mốc cuối cùng (điểm giao)'} onClick={() => navigate(`/driver/trips/${t.id}/handover`)}>Thủ tục bàn giao (Flow 6)</button>
          <button type="button" className="drv-btn drv-btn--lg" onClick={() => navigate(`/driver/trips/${t.id}`)}>Chuyến đi</button>
        </>} />
      )) : (
        <div className="drv-card drv-empty">
          <b>{loading ? 'Đang tải…' : 'Chưa có chuyến đang hoạt động'}</b>
          Chuyến Coordinator giao cho bạn sẽ hiện ở đây.
        </div>
      )}
    </DriverLayout>
  );
};

export default JourneyPage;
