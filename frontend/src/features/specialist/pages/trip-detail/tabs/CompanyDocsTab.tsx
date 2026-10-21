import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SpecTrip } from '../../../types';
import { useSpecialist } from '../../../hooks/useSpecialist';
import {
  CUSTOMER_DOC_NAME,
  LEVEL_VI,
  STAGE_VI,
  checklist,
  fmtDate,
  fmtDateTime,
  horseName,
  itemName,
  latestVersion,
} from '../../../hooks/specialistRules';
import { BookingModal, ClearanceModal, InputModal, RecordDocModal } from '../../../components/Modals';
import { Icon } from '../../../components/SpecialistLayout';
import { openSampleFile } from '../../../components/Common/Common';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';

/** Giấy tờ công ty phải làm (giấy phép, kiểm dịch, tờ khai), lịch kiểm dịch, điểm kiểm tra và yêu cầu bổ sung */
export const CompanyDocsTab: React.FC<{ trip: SpecTrip }> = ({ trip: t }) => {
  const navigate = useNavigate();
  const { data, bookings, requests, actions } = useSpecialist();
  const [record, setRecord] = useState<{ typeId?: string; horseId?: string | null } | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [confirmId, setConfirmId] = useState('');
  const [clearIdx, setClearIdx] = useState(-1);
  const items = checklist(data, t).items.filter((i) => i.provider === 'CBN');
  const done = items.filter((i) => i.counted && i.status === 'APPROVED').length, total = items.filter((i) => i.counted).length;
  const editable = t.status !== 'COMPLETED';

  return (
    <div className="spc-stack">
      <div className="spc-card" style={{ padding: 0 }}>
        <h3 className="spc-card__title" style={{ padding: '16px 18px 0' }}>
          <span>Hồ sơ công ty phải làm <span className="spc-muted">{done}/{total}</span></span>
          {editable && <button type="button" className="spc-btn spc-btn--sm" onClick={() => setRecord({})}><Icon name="plus" />Ghi nhận chứng từ</button>}
        </h3>
        <p className="spc-subtitle" style={{ padding: '0 18px' }}>CBN Transport làm thủ tục với cơ quan chức năng: giấy phép xuất/nhập khẩu, kiểm dịch, tờ khai hải quan. Giấy tờ của ngựa do khách cung cấp nằm ở ô “Giấy tờ khách hàng cung cấp”.</p>
        <div className="spc-table-wrap">
          <table className="spc-table">
            <thead><tr><th>Giấy tờ</th><th>Ngựa</th><th>Tệp</th><th>Cấp / hết hạn</th><th>Trạng thái</th><th>Ghi chú duyệt</th><th>Bản cứng gốc</th><th /></tr></thead>
            <tbody>
              {items.map((i) => {
                const d = i.doc, v = latestVersion(d), rv = d?.reviews[d.reviews.length - 1];
                return (
                  <tr key={`${i.typeId}-${i.horseId ?? ''}`}>
                    <td>
                      <b>{itemName(data, t, i)}</b>
                      {d && <div><button type="button" className="spc-link" onClick={() => navigate(`/specialist/documents/${d.id}`)}>{d.id}</button></div>}
                      <div className="spc-muted">{LEVEL_VI[i.level]} • {STAGE_VI[i.stage]}{i.condition ? ` • ${i.condition}` : ''}{!i.counted ? ' • không tính vào mục bắt buộc' : ''}</div>
                    </td>
                    <td>{horseName(t, i.horseId)}</td>
                    <td>{v ? <><button type="button" className="spc-link" onClick={() => openSampleFile(v.file)}>{v.file}</button><div className="spc-muted">v{v.v}</div></> : '—'}</td>
                    <td>{d ? <>Cấp {fmtDate(d.issuedAt)}<br />Hết hạn {fmtDate(d.expiry)}</> : '—'}</td>
                    <td><TripStatusBadge kind="check" status={i.status} /></td>
                    <td><span className="spc-wrap">{d?.status === 'REJECTED' ? d.rejectReason : rv?.remark || '—'}</span>{rv && <div className="spc-muted">{rv.by} • {fmtDateTime(rv.at)}</div>}</td>
                    <td>{d ? <button type="button" className={`spc-phys ${d.physicalCopy ? 'on' : ''}`} onClick={() => actions.togglePhysicalCopy(d.id)}>{d.physicalCopy ? '✓ Đã nhận' : 'Chưa nhận'}</button> : '—'}</td>
                    <td>
                      {i.missingRule ? <button type="button" className="spc-btn spc-btn--sm" onClick={() => navigate('/specialist/regulations/regs')}>Quy định & thiết lập</button>
                        : d?.status === 'SUBMITTED' ? <button type="button" className="spc-btn spc-btn--solid spc-btn--sm" onClick={() => navigate(`/specialist/documents/${d.id}`)}>Xét duyệt</button>
                        : editable && i.status !== 'APPROVED' ? <button type="button" className="spc-btn spc-btn--sm" onClick={() => setRecord({ typeId: i.typeId, horseId: i.horseId })}>{d ? 'Ghi nhận bản mới' : 'Ghi nhận'}</button> : null}
                    </td>
                  </tr>
                );
              })}
              {!items.length && <tr><td colSpan={8} className="spc-empty">Bộ yêu cầu không có chứng từ do CBN Transport làm.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="spc-grid2">
        <div className="spc-card">
          <h3 className="spc-card__title">Lịch kiểm dịch {editable && <button type="button" className="spc-btn spc-btn--sm" onClick={() => setBookingOpen(true)}><Icon name="plus" />Đặt lịch</button>}</h3>
          {bookings.filter((b) => b.tripId === t.id).map((b) => (
            <div key={b.id} className="spc-row">
              <div><b>{b.station}</b><span>{fmtDate(b.slot)}{b.ref ? ` • mã ${b.ref}` : ''}{b.notes ? ` • ${b.notes}` : ''}</span></div>
              <TripStatusBadge label={b.status === 'BOOKED' ? 'Đã xác nhận' : 'Đã gửi yêu cầu'} tone={b.status === 'BOOKED' ? 'ok' : 'warn'} />
              {b.status === 'REQUESTED' && <button type="button" className="spc-btn spc-btn--sm" onClick={() => setConfirmId(b.id)}>Ghi nhận xác nhận</button>}
            </div>
          ))}
          {!bookings.some((b) => b.tripId === t.id) && <p className="spc-muted">Chưa có lịch kiểm dịch.</p>}
          <div className="spc-eyebrow" style={{ marginTop: 14 }}>Điểm kiểm tra trên tuyến</div>
          {t.checkpoints.map((c, i) => (
            <div key={c.name} className="spc-row">
              <div><b>{c.name}</b><span>{fmtDateTime(c.plannedAt)}{c.clearance ? ` • ${c.clearance.ref}` : ''}</span></div>
              {c.clearance ? <TripStatusBadge label={c.clearance.result === 'PASSED' ? 'Đạt' : c.clearance.result === 'HELD' ? 'Bị giữ' : 'Không đạt'} tone={c.clearance.result === 'PASSED' ? 'ok' : 'bad'} />
                : c.arrivedAt ? <TripStatusBadge label="Đã đến" tone="warn" /> : <TripStatusBadge label="Theo kế hoạch" tone="muted" />}
              {t.status === 'IN_TRANSIT' && c.arrivedAt && c.clearance?.result !== 'PASSED' && (
                <button type="button" className={`spc-btn spc-btn--sm ${c.clearance ? '' : 'spc-btn--solid'}`} onClick={() => setClearIdx(i)}>{c.clearance ? 'Ghi quyết định mới' : 'Ghi kết quả'}</button>
              )}
            </div>
          ))}
          {!t.checkpoints.length && <p className="spc-muted">Tuyến chưa có điểm kiểm tra (lấy từ tuyến hiện hành của Điều phối viên).</p>}
        </div>
        <div className="spc-card">
          <h3 className="spc-card__title">Yêu cầu bổ sung đã gửi khách</h3>
          {requests.filter((q) => q.tripId === t.id).map((q) => (
            <div key={q.id} className="spc-row">
              <div><b>{q.id} • {CUSTOMER_DOC_NAME[q.key]}{q.scope !== 'request' ? ` – ${horseName(t, q.scope)}` : ''}</b><span>{q.reason}{q.dueAt ? ` • hạn ${fmtDate(q.dueAt)}` : ''}</span></div>
              <TripStatusBadge kind="request" status={q.status} />
              {q.status !== 'FULFILLED' && <button type="button" className="spc-btn spc-btn--sm" onClick={() => actions.markRequestFulfilled(q.id)}>Hoàn tất</button>}
            </div>
          ))}
          {!requests.some((q) => q.tripId === t.id) && <p className="spc-muted">Chưa có yêu cầu bổ sung.</p>}
        </div>
      </div>

      {record && <RecordDocModal open trip={t} typeId={record.typeId} horseId={record.horseId} onClose={() => setRecord(null)} />}
      <BookingModal open={bookingOpen} trip={t} onClose={() => setBookingOpen(false)} />
      <InputModal open={!!confirmId} title="Ghi nhận xác nhận lịch kiểm dịch" label="Mã xác nhận của trạm *" okText="Lưu"
        onClose={() => setConfirmId('')} onSubmit={(v) => actions.confirmBooking(confirmId, v)} />
      {clearIdx >= 0 && <ClearanceModal open trip={t} index={clearIdx} onClose={() => setClearIdx(-1)} />}
    </div>
  );
};

export default CompanyDocsTab;
