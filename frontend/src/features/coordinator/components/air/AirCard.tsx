// Thẻ dịch vụ bay của một chuyến (dùng ở trang Dịch vụ bay & đối tác và tab Chuyến bay của chuyến)
import { curRoute, reqOfTrip } from '../../domain/coordinatorRules';
import type { Any } from '../../store/coordinatorStore';
import { cityLabel, dt, human, MILESTONE_LABEL, usd } from '../../utils/format';
import { AIR_STATUS, airportLabel, checkDraft, countHorses, editableTrip, flightBook, flightMilestone, LocalTime, resolved, serviceRevision, serviceSelect, serviceSend } from '../../workflows/airOperations';
import { Pill } from '../common/ui';

export function AirCard({ t }: { t: Any }) {
  const f = t.flight, snap = f?.serviceSnapshot, r = reqOfTrip(t), editable = !editableTrip(t);
  const rt = curRoute(t), canChoose = editable && !checkDraft(t);
  const canBook = editable && f?.status === 'BUDGET_APPROVED' && rt?.status === 'APPROVED';
  const catalog: Any = f?.serviceId && resolved(f.serviceId);
  const altered = catalog && snap && (catalog.schedule.cost !== snap.cost || catalog.schedule.airline !== snap.airline || catalog.schedule.departLocal !== snap.departLocal || catalog.schedule.arriveLocal !== snap.arriveLocal);
  const departed = f?.milestones?.some((m: Any) => m.type === 'FLIGHT_DEPARTED'), arrived = f?.milestones?.some((m: Any) => m.type === 'FLIGHT_ARRIVED');
  return (
    <section className="card fa-trip-card">
      <div className="between"><div><div className="eyebrow">{t.id} · {r.id} · {countHorses(t)} ngựa</div><h3 className="card-title">{cityLabel(r.origin)} → {cityLabel(r.destination)}</h3></div>
        <Pill v={f?.status || 'DRAFT'} label={f ? AIR_STATUS[f.status] || human(f.status) : 'Chưa chọn dịch vụ'} /></div>
      <div className="fa-trip-grid">
        <div><small>Đối tác / hãng khai thác</small><b>{snap?.partnerName || f?.airline || 'Chưa chọn'}</b><span>{f?.flightNo || '—'}{snap?.airline ? ' · ' + snap.airline : ''}</span></div>
        <div><small>Sân bay đi</small><b>{snap?.fromName || (f ? airportLabel(f.from) : '—')}</b><span>{snap ? <LocalTime value={snap.departLocal} zone={snap.departZone} /> : f ? dt(f.departAt) + ' (giờ hệ thống Việt Nam)' : 'Chưa có lịch'}</span></div>
        <div><small>Sân bay đến</small><b>{snap?.toName || (f ? airportLabel(f.to) : '—')}</b><span>{snap ? <LocalTime value={snap.arriveLocal} zone={snap.arriveZone} /> : f ? dt(f.arriveAt) + ' (giờ hệ thống Việt Nam)' : 'Chưa có lịch'}</span></div>
        <div><small>Chi phí thuê dịch vụ</small><b>{f ? usd(f.cost) : '—'}</b><span>Chi phí vận hành, không tự đổi giá hợp đồng</span></div>
      </div>
      {f ? <div className="fa-booking-line"><span><b>{f.bookingRef ? 'Booking: ' + f.bookingRef : 'Chưa có mã xác nhận đặt chỗ'}</b>{f.confirmedHorses ? ' · ' + f.confirmedHorses + ' ngựa được xác nhận' : ''}</span><small>{f.bookedAt ? 'Ghi nhận ' + dt(f.bookedAt) : 'Danh mục và phê duyệt nội bộ chưa thay thế booking'}</small></div> : null}
      {altered ? <p className="fa-warning">Danh mục đối tác đã thay đổi so với bản phương án này. Thông tin đã duyệt vẫn giữ nguyên; cần đối chiếu khi đặt dịch vụ.</p> : null}
      {f?.status === 'BUDGET_APPROVED' && rt?.status !== 'APPROVED' ? <p className="hint">Chi phí đã được duyệt; hoàn thiện tuyến và xe/người dự kiến để Manager duyệt phương án tổng thể trước khi chốt đặt.</p> : null}
      {t.flightSupplyIssue ? <p className="fa-warning">Chưa bố trí được dịch vụ: {t.flightSupplyIssue.reason} · đã báo Manager {dt(t.flightSupplyIssue.at)}.</p> : null}
      <div className="btn-row">
        {canChoose ? <button type="button" className="btn solid" onClick={() => serviceSelect(t.id)}>{f ? 'Chọn lại trong bản nháp' : 'Chọn dịch vụ từ danh mục'}</button> : null}
        {editable && f?.status === 'DRAFT' ? <button type="button" className="btn ghost" onClick={() => serviceSend(t.id)}>Gửi duyệt chi phí</button> : null}
        {canBook ? <button type="button" className="btn solid" onClick={() => flightBook(t.id)}>Ghi nhận xác nhận đặt chỗ</button> : null}
        {editable && f && ['BUDGET_PENDING', 'BUDGET_APPROVED'].includes(f.status) ? <button type="button" className="btn ghost" onClick={() => serviceRevision(t.id)}>Lập bản điều chỉnh</button> : null}
        {snap?.email || snap?.phone ? <span className="hint">Liên hệ: {snap.contact} · {snap.email || snap.phone}</span> : null}
        {f?.bookingEvidence?.url ? <a className="btn ghost" href={f.bookingEvidence.url} target="_blank" rel="noopener noreferrer">Xem tệp xác nhận</a> : null}
      </div>
      {f?.status === 'BOOKED' ? <div className="fa-operational"><small>Booking đã có; vẫn cần xác nhận nguồn lực thực tế và Manager duyệt khởi hành. Mốc cất/hạ cánh được ghi ở theo dõi hành trình.</small>
        {t.status === 'IN_TRANSIT' && !departed ? <button type="button" className="btn ghost sm" onClick={() => flightMilestone(t.id, 'FLIGHT_DEPARTED')}>Ghi nhận cất cánh</button> : null}
        {t.status === 'IN_TRANSIT' && departed && !arrived ? <button type="button" className="btn ghost sm" onClick={() => flightMilestone(t.id, 'FLIGHT_ARRIVED')}>Ghi nhận hạ cánh</button> : null}
      </div> : null}
      {f?.milestones?.length ? <details><summary>Lịch sử mốc chuyến bay</summary>{f.milestones.map((m: Any, k: number) => <p key={k}>{MILESTONE_LABEL[m.type] || m.type} · {dt(m.at)}</p>)}</details> : null}
    </section>
  );
}
