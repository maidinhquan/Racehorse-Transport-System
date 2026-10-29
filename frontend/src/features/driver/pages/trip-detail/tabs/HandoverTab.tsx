import React, { useState } from 'react';
import type { HorseCondition, ReceiverIdType, Trip } from '../../../types';
import { useDriver } from '../../../hooks/useDriver';
import { Icon } from '../../../components/DriverLayout';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import { PhotoPicker } from '../../../components/PhotoPicker/PhotoPicker';
import { SignaturePad } from '../../../components/SignaturePad/SignaturePad';
import { ConfirmModal, RefuseHandoverModal } from '../../../components/Modals';
import {
  CONDITION_LABEL,
  REFUSE_NEXT_LABEL,
  fmtDateTime,
  handoverCheck,
  handoverReady,
  sameName,
} from '../../../hooks/driverRules';

const ID_TYPES: ReceiverIdType[] = ['Căn cước công dân', 'Hộ chiếu', 'Giấy phép lái xe'];
const CONDITIONS: HorseCondition[] = ['NORMAL', 'MONITOR', 'ABNORMAL'];

/** Biên bản bàn giao đã hoàn tất (chỉ xem) */
const HandoverDone: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { horse } = useDriver();
  const h = trip.handover!;
  return (
    <div className="drv-card">
      <h3 className="drv-card__title">Đã bàn giao <TripStatusBadge status="COMPLETED" /></h3>
      <div className="drv-kv">
        <div><span>Hoàn tất lúc</span><b>{fmtDateTime(h.completedAt)}</b></div>
        <div><span>Người nhận</span><b>{h.receiver.name}</b></div>
        <div><span>Giấy tờ</span><b>{h.receiver.idType} {h.receiver.idNumber}</b></div>
        <div><span>Ảnh / chữ ký</span><b>{h.photos.length} ảnh • đã ký</b></div>
      </div>
      {h.horses.map((x) => (
        <div key={x.horseId} className="drv-row">
          <Icon name="check" />
          <div className="drv-row__text"><b>{horse(x.horseId)?.name ?? x.horseId}</b><span>Đã khớp microchip • {CONDITION_LABEL[x.condition]}{x.notes ? ' • ' + x.notes : ''}</span></div>
        </div>
      ))}
      <p className="drv-hint">Việc khách hàng xác nhận nhận ngựa, thanh toán phần còn lại và khiếu nại (nếu có) được xử lý riêng, không ảnh hưởng việc hoàn tất chuyến.</p>
    </div>
  );
};

export const HandoverTab: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { draft, horse, actions } = useDriver();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refuseOpen, setRefuseOpen] = useState(false);

  if (trip.handover) return <HandoverDone trip={trip} />;
  if (!handoverReady(trip)) {
    return (
      <div className="drv-card drv-empty">
        <b>Bàn giao mở khi đến nơi</b>
        Ghi mốc “Đến điểm giao” trước. Sau đó bạn xác minh người nhận, từng con ngựa, chụp ảnh và lấy chữ ký.
      </div>
    );
  }

  const d = draft(trip);
  const chk = handoverCheck(trip, d);
  const auth = trip.altReceiver ?? trip.receiver;
  const last = trip.handoverAttempts[trip.handoverAttempts.length - 1];
  const refused = last?.status === 'REFUSED';
  const update = actions.updateDraft.bind(null, trip.id);
  const wrongPerson = !!d.receiver.name && !!auth.name && !sameName(d.receiver.name, auth.name);

  return (
    <div className="drv-stack">
      <div className={`drv-note ${refused ? 'drv-note--red' : 'drv-note--yellow'}`} style={{ marginTop: 0 }}>
        <Icon name={refused ? 'alert' : 'clock'} />
        <div>
          <b>{refused ? `Bàn giao bị từ chối lúc ${fmtDateTime(last.at)}` : 'Đang chờ bàn giao'}</b>
          {refused
            ? `${last.reason} • bước tiếp theo: ${last.next ? REFUSE_NEXT_LABEL[last.next] : '—'}${last.note ? ' – ' + last.note : ''}. ${trip.handoverStatus === 'REFUSED' ? 'Chờ Manager xử lý trước khi bàn giao lại.' : 'Có thể thực hiện lần bàn giao mới bên dưới.'}`
            : 'Chuyến chỉ hoàn tất sau khi bàn giao đầy đủ và đã xác minh.'}
          {trip.handoverStatus === 'REFUSED' && (
            <div className="drv-btn-row"><button type="button" className="drv-btn drv-btn--sm" onClick={() => actions.demoResolveRefusal(trip.id)}>Demo: Manager xử lý xong lần từ chối</button></div>
          )}
        </div>
      </div>

      {/* 1. Người nhận */}
      <div className="drv-card">
        <h3 className="drv-card__title">1. Người nhận <TripStatusBadge tone={chk.receiver ? 'ok' : 'warn'} label={chk.receiver ? 'Đã xác minh' : 'Cần xác minh'} /></h3>
        <div className="drv-kv" style={{ marginBottom: 14 }}>
          <div><span>Người nhận {trip.altReceiver ? 'thay thế (Manager duyệt)' : 'đã đăng ký'}</span><b>{auth.name}</b></div>
          <div><span>Số điện thoại</span><b>{auth.phone}</b></div>
          <div className="full"><span>Địa chỉ giao</span><b>{[trip.delivery.name, trip.delivery.address].filter(Boolean).join(', ')}</b></div>
        </div>
        <div className="drv-form-grid">
          <div className="drv-field">
            <label htmlFor="ho-name">Họ tên người nhận *</label>
            <input id="ho-name" className="drv-input" value={d.receiver.name} onChange={(e) => update((x) => ({ ...x, receiver: { ...x.receiver, name: e.target.value } }))} />
          </div>
          <div className="drv-field">
            <label htmlFor="ho-idtype">Loại giấy tờ *</label>
            <select id="ho-idtype" className="drv-select" value={d.receiver.idType} onChange={(e) => update((x) => ({ ...x, receiver: { ...x.receiver, idType: e.target.value as ReceiverIdType } }))}>
              {ID_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="drv-field">
            <label htmlFor="ho-idno">Số giấy tờ *</label>
            <input id="ho-idno" className="drv-input" value={d.receiver.idNumber} onChange={(e) => update((x) => ({ ...x, receiver: { ...x.receiver, idNumber: e.target.value } }))} />
          </div>
        </div>
        <label className="drv-check">
          <input type="checkbox" checked={d.receiver.checked} onChange={(e) => update((x) => ({ ...x, receiver: { ...x.receiver, checked: e.target.checked } }))} />
          Tôi đã đối chiếu giấy tờ của người nhận với {trip.altReceiver ? 'người nhận thay thế Manager đã duyệt' : 'người nhận đăng ký trong yêu cầu vận chuyển'}
        </label>
        <label className="drv-check">
          <input type="checkbox" checked={d.receiver.authorized} onChange={(e) => update((x) => ({ ...x, receiver: { ...x.receiver, authorized: e.target.checked } }))} />
          Người nhận có quyền nhận các con ngựa này
        </label>
        {wrongPerson && (
          <div className="drv-note drv-note--red">
            <Icon name="alert" />
            <div><b>Không phải người được uỷ quyền nhận</b>Không bàn giao. Gọi khách hàng theo số đã đăng ký; nếu không xác lập được uỷ quyền, hãy ghi nhận từ chối bàn giao (lý do danh tính / uỷ quyền) để Manager bố trí người nhận hợp lệ. Giữ ngựa an toàn.</div>
          </div>
        )}
      </div>

      {/* 2. Ngựa */}
      <div className="drv-card">
        <h3 className="drv-card__title">2. Ngựa <TripStatusBadge tone={chk.horses ? 'ok' : 'warn'} label={`${chk.verified}/${trip.horses.length} đã xác minh`} /></h3>
        {trip.horses.map((h) => {
          const v = d.horses[h] ?? { chip: '', condition: 'NORMAL' as HorseCondition, notes: '', ok: false, err: '' };
          const set = (patch: Partial<typeof v>) => update((x) => ({ ...x, horses: { ...x.horses, [h]: { ...v, ...patch, ok: false } } }));
          return (
            <div key={h} className={`drv-verify ${v.ok ? 'ok' : ''}`}>
              <div className="drv-card__title" style={{ marginBottom: 8 }}><span>{horse(h)?.name ?? h}</span>{v.ok && <TripStatusBadge tone="ok" label="Đã xác minh" />}</div>
              <div className="drv-form-grid">
                <div className="drv-field">
                  <label htmlFor={`chip-${h}`}>Quét hoặc nhập microchip *</label>
                  <input id={`chip-${h}`} className="drv-input" inputMode="numeric" placeholder="15 chữ số" value={v.chip} onChange={(e) => set({ chip: e.target.value })} />
                </div>
                <div className="drv-field">
                  <label htmlFor={`cond-${h}`}>Tình trạng *</label>
                  <select id={`cond-${h}`} className="drv-select" value={v.condition} onChange={(e) => set({ condition: e.target.value as HorseCondition })}>
                    {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}
                  </select>
                </div>
              </div>
              <div className="drv-field">
                <label htmlFor={`note-${h}`}>Ghi chú</label>
                <input id={`note-${h}`} className="drv-input" value={v.notes} onChange={(e) => set({ notes: e.target.value })} />
              </div>
              {v.err && <p className="drv-error" role="alert">{v.err}</p>}
              <button type="button" className={`drv-btn drv-btn--sm ${v.ok ? '' : 'drv-btn--solid'}`} style={{ marginTop: 6 }} onClick={() => actions.verifyHorse(trip.id, h)}>
                {v.ok ? 'Đã xác minh – kiểm tra lại' : 'Xác minh ngựa'}
              </button>
            </div>
          );
        })}
        <p className="drv-hint">Demo: số microchip có ở tab Tổng quan.</p>
      </div>

      {/* 3. Ảnh */}
      <div className="drv-card">
        <h3 className="drv-card__title">3. Ảnh bàn giao <TripStatusBadge tone={d.photos.length ? 'ok' : 'warn'} label={d.photos.length ? `${d.photos.length} ảnh` : 'Bắt buộc'} /></h3>
        <PhotoPicker photos={d.photos}
          onAdd={(p) => update((x) => ({ ...x, photos: [...x.photos, p] }))}
          onRemove={(i) => update((x) => ({ ...x, photos: x.photos.filter((_, k) => k !== i) }))} />
      </div>

      {/* 4. Chữ ký */}
      <div className="drv-card">
        <h3 className="drv-card__title">4. Chữ ký người nhận <TripStatusBadge tone={d.signature ? 'ok' : 'warn'} label={d.signature ? 'Đã ký' : 'Bắt buộc'} /></h3>
        <SignaturePad value={d.signature} onChange={(sig) => update((x) => ({ ...x, signature: sig }))} />
      </div>

      {/* Kiểm tra cuối */}
      <div className="drv-card">
        <div className="drv-eyebrow">Bắt buộc trước khi hoàn tất</div>
        <ul className="drv-checklist">
          {chk.list.map(([label, okItem]) => (
            <li key={label} className={okItem ? 'ok' : ''}><Icon name={okItem ? 'check' : 'clock'} /><span>{label}</span></li>
          ))}
        </ul>
        <div className="drv-two">
          <div>
            <button type="button" className="drv-btn drv-btn--solid drv-btn--lg drv-btn--block" disabled={chk.errors.length > 0} onClick={() => setConfirmOpen(true)}>Hoàn tất bàn giao</button>
            <p className="drv-hint">{chk.errors.length ? 'Cần đủ tất cả mục ở trên.' : 'Hoàn tất bàn giao và kết thúc chuyến.'}</p>
          </div>
          <div>
            <button type="button" className="drv-btn drv-btn--danger drv-btn--lg drv-btn--block" disabled={trip.handoverStatus === 'REFUSED'} onClick={() => setRefuseOpen(true)}>Ghi nhận từ chối bàn giao</button>
            <p className="drv-hint">Người nhận từ chối, vắng mặt hoặc không xác minh được. Chuyến chưa hoàn tất, hạn thanh toán chưa bắt đầu.</p>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <ConfirmModal title="Hoàn tất bàn giao?" okText="Hoàn tất bàn giao" onClose={() => setConfirmOpen(false)}
          message={`Đã xác minh cả ${trip.horses.length} con ngựa và người nhận đã ký. Chuyến sẽ được đánh dấu hoàn tất.`}
          onConfirm={() => actions.completeHandover(trip.id)} />
      )}
      {refuseOpen && <RefuseHandoverModal photoCount={d.photos.length} onClose={() => setRefuseOpen(false)} onSubmit={(body) => actions.refuseHandover(trip.id, body)} />}
    </div>
  );
};

export default HandoverTab;
