import React, { useEffect, useState } from 'react';
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
import { getDemoMode } from '../../../../../shared/context/DemoModeContext';
import { generateUuidV4 } from '../../../../../shared/utils/uuid';
import { flow6Api } from '../../../../aftercare/api/flow6Api';
import type * as T6 from '../../../../aftercare/types/flow6.types';

const ID_TYPES: ReceiverIdType[] = ['Căn cước công dân', 'Hộ chiếu', 'Giấy phép lái xe'];
const CONDITIONS: HorseCondition[] = ['NORMAL', 'MONITOR', 'ABNORMAL'];

/** Biên bản bàn giao đã hoàn tất (chỉ xem trong chế độ mock) */
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

/** Tab Bàn giao của tài xế (CHẾ ĐỘ MOCK của teammate) */
const MockDriverHandoverTab: React.FC<{ trip: Trip }> = ({ trip }) => {
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

/** Tab Bàn giao thực tế của tài xế (CHẾ ĐỘ BACKEND FLOW 6 - OTP & MICROCHIP) */
const RealDriverHandoverTab: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { actions: driverActions, horse } = useDriver();
  const notify = (message: string) => driverActions.showToast(message);
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<T6.Context | null>(null);
  const [delivery, setDelivery] = useState<T6.Delivery | null>(null);
  const [revision, setRevision] = useState<T6.Revision | null>(null);

  // Form input states
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [authorized, setAuthorized] = useState(true);
  const [location, setLocation] = useState('');
  const [commonDocs, setCommonDocs] = useState('');
  const [horseItems, setHorseItems] = useState<Array<{
    horseId: string;
    microchipVerified: boolean;
    condition: string;
    assets: string;
    documents: string | null;
  }>>([]);

  const [otpCode, setOtpCode] = useState('');
  const [refuseReason, setRefuseReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadBackendData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const ctx = await flow6Api.getTripContext(trip.id);
      setContext(ctx);
      setReceiverName(ctx.designatedReceiverName || trip.receiver.name || '');
      setReceiverPhone(ctx.designatedReceiverPhone || trip.receiver.phone || '');
      setLocation(trip.delivery.name || trip.delivery.address || 'Điểm giao thực tế');

      const handoverId = ctx.deliveryHandoverId || ctx.deliveryId;
      if (handoverId) {
        const deliv = await flow6Api.getHandover(handoverId);
        setDelivery(deliv);
        if (deliv.currentRevisionId) {
          const rev = await flow6Api.getRevision(deliv.currentRevisionId);
          setRevision(rev);
          setReceiverName(rev.content.receiver.name);
          setReceiverPhone(rev.content.receiver.phone);
          setOtpEmail(rev.content.receiver.otpEmail);
          setAuthorized(rev.content.receiver.authorized);
          setLocation(rev.content.location);
          setCommonDocs(rev.content.commonDocuments || '');
          setHorseItems(rev.content.items.map((it) => ({
            horseId: it.horseId,
            microchipVerified: it.microchipVerified,
            condition: it.condition,
            assets: it.assets,
            documents: it.documents,
          })));
        }
      } else {
        // Initialize default horse items from context
        setHorseItems((ctx.horseIds || trip.horses || []).map((hid) => ({
          horseId: hid,
          microchipVerified: false,
          condition: 'Tỉnh táo, sức khỏe bình thường.',
          assets: '1 dây dắt, 1 chăn ngựa',
          documents: null,
        })));
      }
    } catch (e) {
      console.warn('[RealDriverHandoverTab] Error loading baseline', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void loadBackendData(false);
  }, [trip.id]);

  const buildContent = (): T6.DeliveryContent => ({
    location: location.trim() || 'Điểm giao',
    receiver: {
      name: receiverName.trim(),
      phone: receiverPhone.trim(),
      authorized,
      otpEmail: otpEmail.trim(),
    },
    commonDocuments: commonDocs.trim() || null,
    items: horseItems.map((h) => ({
      horseId: h.horseId,
      microchipVerified: h.microchipVerified,
      condition: h.condition.trim() || 'Bình thường',
      assets: h.assets.trim() || 'Không có',
      documents: h.documents?.trim() || null,
      documentsReceivedAtUtc: null,
    })),
  });

  // F6-J03: Tạo delivery draft
  const handleCreateDraft = async () => {
    if (!receiverName || !receiverPhone || !otpEmail) {
      notify('Vui lòng nhập đầy đủ họ tên, SĐT và email nhận OTP của người nhận!');
      return;
    }
    setSubmitting(true);
    try {
      const key = generateUuidV4();
      const deliv = await flow6Api.createDelivery(trip.id, buildContent(), key);
      setDelivery(deliv);
      if (deliv.currentRevisionId) {
        const rev = await flow6Api.getRevision(deliv.currentRevisionId);
        setRevision(rev);
      } else {
        await loadBackendData(true);
      }
      notify('Đã tạo biên bản bàn giao bản nháp thành công!');
    } catch (err: any) {
      notify(`Không thể tạo biên bản: ${err?.message || 'Có lỗi xảy ra'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // F6-J06: Lưu thay đổi nháp
  const handleUpdateDraft = async () => {
    if (!revision?.id) return;
    setSubmitting(true);
    try {
      const key = generateUuidV4();
      const updated = await flow6Api.updateRevision(revision.id, buildContent(), key);
      setRevision(updated);
      notify('Đã lưu nội dung bản nháp!');
    } catch (err: any) {
      notify(`Không thể lưu bản nháp: ${err?.message || 'Có lỗi xảy ra'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // F6-J07: Gửi OTP
  const handleSendOtp = async () => {
    if (!revision?.id) return;
    if (!otpEmail) {
      notify('Vui lòng nhập email người nhận để gửi mã OTP!');
      return;
    }
    if (!authorized) {
      notify('Vui lòng đối chiếu giấy tờ và tích xác nhận quyền của người nhận ở Mục 1!');
      return;
    }
    if (!horseItems.every((h) => h.microchipVerified)) {
      notify('Vui lòng quét vi mạch và tích chọn "Đã quét khớp vi mạch" cho tất cả các con ngựa ở Mục 2!');
      return;
    }
    setSubmitting(true);
    try {
      // Tự động lưu bản nháp mới nhất lên máy chủ trước khi gửi OTP
      const updatedRev = await flow6Api.updateRevision(revision.id, buildContent(), generateUuidV4());
      setRevision(updatedRev);

      const otpRes = await flow6Api.sendOtp(revision.id, generateUuidV4());
      setRevision((prev) => prev ? { ...prev, status: 'AWAITING_OTP' } : prev);
      setDelivery((prev) => prev ? { ...prev, status: 'AWAITING_OTP' } : prev);
      notify(`Mã OTP đã được gửi đến: ${otpEmail}. Mã có hiệu lực đến: ${fmtDateTime(otpRes.expiresAtUtc)}`);
    } catch (err: any) {
      notify(`Không gửi được OTP: ${err?.message || 'Có lỗi xảy ra'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // F6-J08: Thu hồi OTP để sửa nháp
  const handleInvalidateOtp = async () => {
    if (!revision?.id) return;
    setSubmitting(true);
    try {
      const key = generateUuidV4();
      const updated = await flow6Api.invalidateOtp(revision.id, key);
      setRevision(updated);
      setDelivery((prev) => prev ? { ...prev, status: 'DRAFT' } : prev);
      notify('Đã thu hồi OTP. Biên bản chuyển về DRAFT để chỉnh sửa.');
    } catch (err: any) {
      notify(`Không thu hồi được OTP: ${err?.message || 'Có lỗi xảy ra'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // F6-J09: Xác nhận OTP
  const handleConfirmOtp = async () => {
    if (!revision?.id) return;
    if (otpCode.trim().length !== 6) {
      notify('Vui lòng nhập đúng 6 chữ số OTP!');
      return;
    }
    setSubmitting(true);
    try {
      const key = generateUuidV4();
      const res = await flow6Api.confirmRevision(revision.id, { otp: otpCode.trim() }, key);
      setRevision(res.revision);
      setDelivery((prev) => prev ? { ...prev, status: 'CONFIRMED' } : prev);
      setContext((prev) => prev ? { ...prev, lifecycle: res.lifecycle } : prev);
      notify('Xác nhận nhận ngựa thành công! Chuyến đi đã hoàn tất.');
    } catch (err: any) {
      notify(`Xác nhận OTP thất bại: ${err?.message || 'Mã OTP không đúng hoặc đã hết hạn'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // F6-J10: Từ chối bàn giao
  const handleRefuse = async () => {
    if (!revision?.id) return;
    if (refuseReason.trim().length < 5) {
      notify('Vui lòng nhập lý do từ chối (ít nhất 5 ký tự).');
      return;
    }
    setSubmitting(true);
    try {
      const key = generateUuidV4();
      const updated = await flow6Api.refuseRevision(revision.id, { reason: refuseReason.trim() }, key);
      setRevision(updated);
      setDelivery((prev) => prev ? { ...prev, status: 'REFUSED' } : prev);
      setRefuseReason('');
      notify('Đã ghi nhận từ chối bàn giao. Chuyến tiếp tục ở trạng thái Đang vận chuyển.');
    } catch (err: any) {
      notify(`Không thể ghi nhận từ chối: ${err?.message || 'Có lỗi xảy ra'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // F6-J11: Lập bản giao lại kế tiếp
  const handleCreateRedelivery = async () => {
    if (!delivery?.id) return;
    setSubmitting(true);
    try {
      const key = generateUuidV4();
      const nextRev = await flow6Api.createRedeliveryRevision(delivery.id, buildContent(), key);
      setRevision(nextRev);
      setDelivery((prev) => prev ? { ...prev, status: 'DRAFT', currentRevisionId: nextRev.id } : prev);
      notify('Đã tạo phiên bản giao lại mới (DRAFT). Bạn có thể chỉnh sửa và gửi lại OTP.');
    } catch (err: any) {
      notify(`Không thể lập bản giao lại: ${err?.message || 'Có lỗi xảy ra'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // F6-J45: Tải PDF biên bản
  const handleDownloadPdf = async () => {
    if (!revision?.id) return;
    try {
      const blob = await flow6Api.downloadRevisionPdf(revision.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BienBan_${revision.id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      notify(`Không tải được PDF: ${err?.message || 'Lỗi tải tệp'}`);
    }
  };

  if (loading) {
    return <div className="drv-card drv-empty">Đang kiểm tra bối cảnh bàn giao từ máy chủ...</div>;
  }

  const status = revision?.status || delivery?.status || 'DRAFT';

  return (
    <div className="drv-stack">
      {/* Thẻ trạng thái */}
      <div className="drv-card">
        <h3 className="drv-card__title">
          Quy trình bàn giao ngựa (OTP & Vi mạch){' '}
          <TripStatusBadge
            tone={
              status === 'CONFIRMED'
                ? 'ok'
                : status === 'AWAITING_OTP'
                ? 'warn'
                : status === 'REFUSED'
                ? 'bad'
                : delivery
                ? 'info'
                : 'muted'
            }
            label={
              status === 'CONFIRMED'
                ? 'Đã hoàn tất bàn giao'
                : status === 'AWAITING_OTP'
                ? 'Chờ xác thực OTP'
                : status === 'REFUSED'
                ? 'Bị từ chối'
                : delivery
                ? 'Bản nháp (DRAFT)'
                : 'Chưa lập biên bản'
            }
          />
        </h3>
        {context && (
          <div className="drv-kv" style={{ marginTop: 8 }}>
            <div><span>Chuyến</span><b>{context.tripId}</b></div>
            <div><span>Hợp đồng</span><b>{context.contractId}</b></div>
            <div><span>Trạng thái chuyến</span><b>{context.lifecycle.tripStatus}</b></div>
            <div><span>Số ngựa bàn giao</span><b>{context.horseIds.length} con</b></div>
          </div>
        )}
      </div>

      {/* Form thông tin người nhận */}
      <div className="drv-card">
        <h3 className="drv-card__title">1. Thông tin người nhận tại chỗ</h3>
        <div className="drv-form-grid">
          <div className="drv-field">
            <label htmlFor="r-name">Họ và tên người nhận *</label>
            <input
              id="r-name"
              className="drv-input"
              readOnly
              title="Thông tin người nhận đã đăng ký, không thể thay đổi"
              value={receiverName}
            />
          </div>
          <div className="drv-field">
            <label htmlFor="r-phone">Số điện thoại *</label>
            <input
              id="r-phone"
              className="drv-input"
              readOnly
              title="Thông tin người nhận đã đăng ký, không thể thay đổi"
              value={receiverPhone}
            />
          </div>
          <div className="drv-field">
            <label htmlFor="r-email">Email nhận mã OTP *</label>
            <input
              id="r-email"
              className="drv-input"
              type="email"
              disabled={status === 'CONFIRMED' || status === 'AWAITING_OTP'}
              value={otpEmail}
              onChange={(e) => setOtpEmail(e.target.value)}
              placeholder="VD: receiver@example.com"
            />
          </div>
          <div className="drv-field">
            <label htmlFor="r-loc">Điểm giao thực tế *</label>
            <input
              id="r-loc"
              className="drv-input"
              readOnly
              title="Điểm giao theo hợp đồng, không thể thay đổi"
              value={location}
            />
          </div>
        </div>
        <label className="drv-check" style={{ marginTop: 10 }}>
          <input
            type="checkbox"
            disabled={status === 'CONFIRMED' || status === 'AWAITING_OTP'}
            checked={authorized}
            onChange={(e) => setAuthorized(e.target.checked)}
          />
          Tôi đã đối chiếu giấy tờ và xác nhận người nhận có đủ thẩm quyền nhận các con ngựa này.
        </label>
      </div>

      {/* Kiểm tra vi mạch & tình trạng từng ngựa */}
      <div className="drv-card">
        <h3 className="drv-card__title">2. Đối chiếu vi mạch & Sức khỏe ngựa</h3>
        {horseItems.map((item, idx) => (
          <div key={item.horseId} className="drv-verify" style={{ marginBottom: 12 }}>
            <div className="drv-card__title" style={{ marginBottom: 6 }}>
              <span>
                Ngựa: <b>{horse(item.horseId)?.name ?? item.horseId}</b>
                <small style={{ marginLeft: 8, fontWeight: 400 }}>
                  {horse(item.horseId)?.microchip ? `Vi mạch: ${horse(item.horseId)?.microchip}` : ''}
                </small>
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  disabled={status === 'CONFIRMED' || status === 'AWAITING_OTP'}
                  checked={item.microchipVerified}
                  onChange={(e) => {
                    const next = [...horseItems];
                    next[idx] = { ...next[idx], microchipVerified: e.target.checked };
                    setHorseItems(next);
                  }}
                />
                Đã quét khớp vi mạch
              </label>
            </div>
            <div className="drv-form-grid">
              <div className="drv-field">
                <label>Tình trạng sức khỏe *</label>
                <input
                  className="drv-input"
                  disabled={status === 'CONFIRMED' || status === 'AWAITING_OTP'}
                  value={item.condition}
                  onChange={(e) => {
                    const next = [...horseItems];
                    next[idx] = { ...next[idx], condition: e.target.value };
                    setHorseItems(next);
                  }}
                />
              </div>
              <div className="drv-field">
                <label>Tài sản đi kèm *</label>
                <input
                  className="drv-input"
                  disabled={status === 'CONFIRMED' || status === 'AWAITING_OTP'}
                  value={item.assets}
                  onChange={(e) => {
                    const next = [...horseItems];
                    next[idx] = { ...next[idx], assets: e.target.value };
                    setHorseItems(next);
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Thao tác giao hàng */}
      <div className="drv-card">
        <h3 className="drv-card__title">3. Thao tác hoàn tất bàn giao</h3>

        {!delivery && (
          <div>
            <button
              type="button"
              className="drv-btn drv-btn--solid drv-btn--lg"
              disabled={submitting}
              onClick={handleCreateDraft}
            >
              {submitting ? 'Đang tạo...' : 'Lập biên bản bàn giao (DRAFT)'}
            </button>
            <p className="drv-hint">Lập biên bản bản nháp đầu tiên cho chuyến đi này.</p>
          </div>
        )}

        {delivery && status === 'DRAFT' && (
          <div className="drv-btn-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="drv-btn"
              disabled={submitting}
              onClick={handleUpdateDraft}
            >
              Lưu thay đổi bản nháp
            </button>
            <button
              type="button"
              className="drv-btn drv-btn--solid"
              disabled={submitting || !horseItems.every((h) => h.microchipVerified)}
              title={!horseItems.every((h) => h.microchipVerified) ? 'Cần quét khớp vi mạch cho tất cả ngựa' : ''}
              onClick={handleSendOtp}
            >
              Gửi mã OTP cho người nhận
            </button>
          </div>
        )}

        {status === 'AWAITING_OTP' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="drv-note drv-note--yellow">
              <Icon name="clock" />
              <div>
                <b>Đang chờ mã xác nhận OTP</b>
                Mã OTP 6 chữ số đã được gửi đến email <b>{otpEmail}</b>. Đề nghị người nhận cung cấp mã để hoàn tất.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                className="drv-input"
                style={{ width: 180, fontSize: '1.2rem', textAlign: 'center', letterSpacing: 4 }}
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
              <button
                type="button"
                className="drv-btn drv-btn--solid drv-btn--lg"
                disabled={submitting || otpCode.trim().length !== 6}
                onClick={handleConfirmOtp}
              >
                Xác nhận nhận ngựa bằng OTP
              </button>
              <button
                type="button"
                className="drv-btn"
                disabled={submitting}
                onClick={handleInvalidateOtp}
              >
                Thu hồi OTP để sửa nháp
              </button>
            </div>
          </div>
        )}

        {status === 'CONFIRMED' && (
          <div className="drv-note" style={{ background: '#ecfdf5', borderColor: '#10b981' }}>
            <Icon name="check" />
            <div>
              <b style={{ color: '#065f46' }}>Bàn giao hoàn tất thành công!</b>
              Chuyến đi đã hoàn tất (COMPLETED). Bạn có thể tải tệp PDF biên bản để lưu trữ.
            </div>
          </div>
        )}

        {status === 'REFUSED' && (
          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              className="drv-btn drv-btn--solid"
              disabled={submitting}
              onClick={handleCreateRedelivery}
            >
              Lập biên bản giao lại kế tiếp (F6-J11)
            </button>
            <p className="drv-hint">Tạo phiên bản DRAFT mới cho lần giao lại tiếp theo khi người nhận hợp lệ đã sẵn sàng.</p>
          </div>
        )}

        {/* Nút từ chối bàn giao */}
        {status !== 'CONFIRMED' && (
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #eee' }}>
            <div className="drv-eyebrow">Trường hợp người nhận từ chối nhận ngựa</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <input
                className="drv-input"
                placeholder="Nhập lý do từ chối bàn giao (vắng mặt, ngựa bị thương, sai thông tin...)"
                value={refuseReason}
                onChange={(e) => setRefuseReason(e.target.value)}
              />
              <button
                type="button"
                className="drv-btn drv-btn--danger"
                disabled={submitting || refuseReason.trim().length < 5}
                onClick={handleRefuse}
              >
                Ghi nhận từ chối
              </button>
            </div>
          </div>
        )}

        {revision && (
          <div style={{ marginTop: 16 }}>
            <button type="button" className="drv-btn" onClick={handleDownloadPdf}>
              Tải PDF biên bản bàn giao
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const HandoverTab: React.FC<{ trip: Trip }> = ({ trip }) => {
  const isDone = trip.status === 'COMPLETED' || !!trip.handover;
  if (!isDone && !handoverReady(trip)) {
    return (
      <div className="drv-card drv-empty">
        <b>Chưa đến điểm đích</b>
        Thủ tục bàn giao chỉ mở khi tài xế đã ghi nhận mốc “Đến điểm giao”. Vui lòng cập nhật hành trình tại mục Hành trình trước khi thực hiện bàn giao.
      </div>
    );
  }
  const isDemo = getDemoMode('driver');
  if (isDemo) {
    return <MockDriverHandoverTab trip={trip} />;
  }
  return <RealDriverHandoverTab trip={trip} />;
};

export default HandoverTab;
