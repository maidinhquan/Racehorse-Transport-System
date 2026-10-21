import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { TransportRequest } from '../../../types';
import { useCustomer } from '../../../hooks/useCustomer';
import {
  FIELD_LABEL,
  balanceState,
  cityLabel,
  curVersion,
  depositState,
  DEPOSIT_STATE_LABEL,
  fmtDate,
  fmtDateTime,
  horseLine,
  isInternational,
  passportStatus,
  PASSPORT_LABEL,
  pickedHorses,
  versionState,
} from '../../../hooks/customerRules';
import { Note, PlaceBlock, Timeline } from '../../../components/Common/Common';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import { DemoPanel } from '../../../components/DemoPanel/DemoPanel';
import { NextAction } from './NextAction';

/** Tab Tổng quan: xét duyệt, thông tin yêu cầu, khách hàng, điểm nhận/giao, ngựa, việc cần làm */
export const OverviewTab: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const navigate = useNavigate();
  const { profile, horses } = useCustomer();
  const v = curVersion(r);

  const review = r.status === 'DRAFT' ? ['NOT_SUBMITTED', 'Chưa gửi'] : r.status === 'PENDING_REVIEW' ? ['PENDING', 'Chờ xét duyệt']
    : r.status === 'CHANGES_REQUESTED' ? ['CHANGES', 'Yêu cầu chỉnh sửa'] : r.status === 'REJECTED' ? ['REJECTED', 'Bị từ chối']
    : r.status === 'CANCELLED' && !v ? ['CANCELLED', 'Đã hủy'] : ['ACCEPTED', 'Đã chấp nhận'];
  const reviewTone = { NOT_SUBMITTED: 'muted', PENDING: 'warn', CHANGES: 'bad', REJECTED: 'bad', CANCELLED: 'muted', ACCEPTED: 'ok' } as const;

  return (
    <div className="cus-grid-main">
      <div className="cus-stack">
        <div className="cus-card">
          <h3 className="cus-card__title">Manager xét duyệt <TripStatusBadge label={review[1]} tone={reviewTone[review[0] as keyof typeof reviewTone]} /></h3>
          {review[0] === 'NOT_SUBMITTED' && <p className="cus-subtitle">Yêu cầu đang là bản nháp. Hoàn tất các bước khai báo và gửi để xét duyệt.</p>}
          {review[0] === 'PENDING' && <p className="cus-subtitle">Yêu cầu đang chờ Logistics Manager xét duyệt. Hợp đồng với giá chính thức chỉ được soạn sau khi yêu cầu được chấp nhận.</p>}
          {review[0] === 'CHANGES' && (
            <>
              <Note tone="yellow" title="Góp ý của Manager">{r.feedback}</Note>
              {r.revisionFields?.length ? <p className="cus-muted" style={{ marginTop: 8 }}>Được phép sửa: {r.revisionFields.map((f) => FIELD_LABEL[f]).join(', ')}</p> : null}
              <button type="button" className="cus-btn cus-btn--solid" style={{ marginTop: 10 }} onClick={() => navigate(`/customer/requests/${r.id}/edit`)}>Sửa & gửi lại</button>
            </>
          )}
          {review[0] === 'REJECTED' && (
            <>
              <Note tone="red" title="Lý do từ chối">{r.reason}</Note>
              <p className="cus-muted" style={{ marginTop: 8 }}>Từ chối là quyết định cuối cùng; yêu cầu này không có hợp đồng và thanh toán. Bạn có thể tạo yêu cầu mới bất cứ lúc nào.</p>
              <button type="button" className="cus-btn" style={{ marginTop: 10 }} onClick={() => navigate('/customer/requests/new')}>Tạo yêu cầu mới</button>
            </>
          )}
          {review[0] === 'ACCEPTED' && <p className="cus-subtitle">{r.status === 'CONTRACT_PREPARATION' ? 'Yêu cầu đã được chấp nhận. Logistics Manager đang soạn hợp đồng.' : 'Yêu cầu đã được chấp nhận.'}</p>}
          {review[0] === 'CANCELLED' && <p className="cus-subtitle">{r.reason}</p>}
          {r.revisions.length > 0 && (
            <>
              <div className="cus-eyebrow" style={{ marginTop: 16 }}>Lịch sử gửi & chỉnh sửa</div>
              <Timeline items={[
                { key: 'cur', tone: 'now', title: `Lần gửi hiện tại • lần ${r.revisions.length + 1}`, sub: `${cityLabel(r.origin)} → ${cityLabel(r.destination)} • ${fmtDate(r.date)} • ${r.horseCount} ngựa` },
                ...[...r.revisions].reverse().map((x) => ({
                  key: `rv${x.v}`, title: `Lần ${x.v} • gửi ${fmtDateTime(x.at)}`,
                  sub: `${cityLabel(x.origin)} → ${cityLabel(x.destination)} • ${fmtDate(x.date)} • ${x.horseCount} ngựa${x.feedback ? ` • Góp ý: ${x.feedback}` : ''}`,
                })),
              ]} />
            </>
          )}
        </div>

        <div className="cus-card">
          <h3 className="cus-card__title">Thông tin yêu cầu</h3>
          <div className="cus-kv">
            <div><span>Mã yêu cầu</span><b>{r.id}</b></div>
            <div><span>Trạng thái</span><b><TripStatusBadge status={r.status} /></b></div>
            <div><span>Ngày tạo</span><b>{fmtDate(r.requestedAt)}</b></div>
            <div><span>Ngày gửi</span><b>{r.submittedAt ? fmtDateTime(r.submittedAt) : 'Chưa gửi'}</b></div>
            <div><span>Điểm đi</span><b>{cityLabel(r.origin)}</b></div>
            <div><span>Điểm đến</span><b>{cityLabel(r.destination)}</b></div>
            <div><span>Ngày vận chuyển mong muốn</span><b>{fmtDate(r.date)}</b></div>
            <div><span>Loại dịch vụ</span><b>{isInternational(r.origin, r.destination) ? 'Quốc tế' : 'Nội địa'} • {r.horseCount} ngựa</b></div>
          </div>
        </div>

        <div className="cus-card">
          <h3 className="cus-card__title">Thông tin khách hàng</h3>
          <div className="cus-kv">
            <div><span>Khách hàng</span><b>{profile.name}</b></div>
            <div><span>Công ty / trại ngựa</span><b>{profile.company}</b></div>
            <div><span>Email</span><b>{profile.email}</b></div>
            <div><span>Điện thoại</span><b>{profile.phone}</b></div>
          </div>
        </div>

        <div className="cus-card">
          <h3 className="cus-card__title">Điểm nhận & điểm giao</h3>
          <div className="cus-grid2">
            <div><div className="cus-eyebrow">Điểm nhận</div><PlaceBlock place={r.pickup} who="Người liên hệ" /></div>
            <div><div className="cus-eyebrow">Điểm giao</div><PlaceBlock place={r.delivery} who="Người nhận" /></div>
          </div>
        </div>

        <div className="cus-card">
          <h3 className="cus-card__title">Ngựa</h3>
          {pickedHorses(r).length === 0 && <p className="cus-subtitle">{r.horseCount} ngựa. Ngựa được chọn trong bước “Ngựa & hồ sơ”.</p>}
          {pickedHorses(r).map((id) => {
            const h = horses.find((x) => x.id === id);
            if (!h) return null;
            return (
              <div key={id} className="cus-horse-line">
                <div><b>{h.name}</b><small>{horseLine(h)} • Microchip {h.microchip || '—'}</small></div>
                <TripStatusBadge label={`Hộ chiếu: ${PASSPORT_LABEL[passportStatus(h)]}`} tone={passportStatus(h) === 'VALID' ? 'ok' : passportStatus(h) === 'EXPIRING_SOON' ? 'warn' : 'bad'} />
                <button type="button" className="cus-btn cus-btn--sm" onClick={() => navigate(`/customer/horses/${h.id}`)}>Xem ngựa</button>
              </div>
            );
          })}
        </div>

        <div className="cus-card">
          <h3 className="cus-card__title">Yêu cầu chăm sóc đặc biệt</h3>
          <p className="cus-lines">
            {[r.careNotes, ...Object.entries(r.horseNotes).filter(([id, n]) => n && r.horses.includes(id)).map(([id, n]) => `${horses.find((h) => h.id === id)?.name ?? id}: ${n}`)]
              .filter(Boolean).join('\n') || <span className="cus-muted">Không có.</span>}
          </p>
        </div>
      </div>

      <div className="cus-stack">
        <div className="cus-card cus-status-card">
          <div className="cus-eyebrow">Trạng thái hiện tại</div>
          <div style={{ margin: '8px 0 14px' }}><TripStatusBadge status={r.status} /></div>
          <NextAction request={r} />
          {(v || r.trip) && (
            <>
              <div className="cus-eyebrow" style={{ marginTop: 16 }}>Tổng hợp trạng thái</div>
              <div className="cus-matrix">
                {v && <><span>Hợp đồng</span><TripStatusBadge kind="contract" status={versionState(v)} /></>}
                {v && <><span>Tiền cọc</span><TripStatusBadge kind="deposit" status={depositState(r)} label={DEPOSIT_STATE_LABEL[depositState(r)]} /></>}
                {r.trip && <><span>Chuyến {r.trip.id}</span><TripStatusBadge kind="trip" status={r.trip.status} /></>}
                {r.acceptance && <><span>Nghiệm thu</span><TripStatusBadge label={r.acceptance.status === 'ACCEPTED' ? 'Đã nghiệm thu' : 'Chờ nghiệm thu'} tone={r.acceptance.status === 'ACCEPTED' ? 'ok' : 'warn'} /></>}
                {r.acceptance && <><span>Số dư</span><TripStatusBadge label={balanceState(r) === 'VERIFIED' ? 'Đã thanh toán' : balanceState(r) === 'PROCESSING' ? 'Đang xác minh' : 'Chưa thanh toán'} tone={balanceState(r) === 'VERIFIED' ? 'ok' : 'warn'} /></>}
              </div>
            </>
          )}
        </div>
        <DemoPanel request={r} />
      </div>
    </div>
  );
};

export default OverviewTab;
