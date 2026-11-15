import React, { useEffect, useState } from 'react';
import type { Trip } from '../../../types';
import { useDriver } from '../../../hooks/useDriver';
import { Icon } from '../../../components/DriverLayout';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import {
  fmtDateTime,
  handoverReady,
} from '../../../hooks/driverRules';
import { generateUuidV4 } from '../../../../../shared/utils/uuid';
import { flow6Api } from '../../../../aftercare/api/flow6Api';
import type * as T6 from '../../../../aftercare/types/flow6.types';


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
    let ctx: T6.Context | null = null;
    try {
      ctx = await flow6Api.getTripContext(trip.id);
      setContext(ctx);
    } catch (e) {
      console.warn('[RealDriverHandoverTab] Could not load trip context:', e);
    }

    const fallbackHorseIds = (ctx?.horseIds && ctx.horseIds.length > 0)
      ? ctx.horseIds
      : (trip.horses && trip.horses.length > 0
          ? trip.horses
          : (trip.id === 'TRIP_001' ? ['HORSE_001', 'HORSE_002'] : (trip.id === 'TRIP_806' ? ['HORSE_803'] : ['HORSE_001'])));

    // Fallback baseline items
    let loadedItems: Array<{
      horseId: string;
      microchipVerified: boolean;
      condition: string;
      assets: string;
      documents: string | null;
    }> = fallbackHorseIds.map((hid) => ({
      horseId: hid,
      microchipVerified: false,
      condition: 'Tỉnh táo, sức khỏe bình thường.',
      assets: '1 dây dắt, 1 chăn ngựa',
      documents: null,
    }));

    setReceiverName(ctx?.designatedReceiverName || trip?.receiver?.name || '');
    setReceiverPhone(ctx?.designatedReceiverPhone || trip?.receiver?.phone || '');
    const fixedEmail = ctx?.designatedReceiverEmail || (trip as any)?.receiver?.email || (trip as any)?.customer?.email || '';
    if (fixedEmail) setOtpEmail(fixedEmail);
    setLocation(trip?.delivery?.name || trip?.delivery?.address || 'Điểm giao thực tế');

    const handoverId = ctx?.deliveryHandoverId || (ctx as any)?.deliveryId;
    if (handoverId) {
      try {
        const deliv = await flow6Api.getHandover(handoverId);
        setDelivery(deliv);
        if (deliv.currentRevisionId) {
          try {
            const rev = await flow6Api.getRevision(deliv.currentRevisionId);
            setRevision(rev);
            if (rev.content?.receiver?.name) setReceiverName(rev.content.receiver.name);
            if (rev.content?.receiver?.phone) setReceiverPhone(rev.content.receiver.phone);
            if (rev.content?.receiver?.otpEmail) setOtpEmail(rev.content.receiver.otpEmail);
            if (typeof rev.content?.receiver?.authorized === 'boolean') setAuthorized(rev.content.receiver.authorized);
            if (rev.content?.location) setLocation(rev.content.location);
            if (rev.content?.commonDocuments) setCommonDocs(rev.content.commonDocuments);
            if (Array.isArray(rev.content?.items) && rev.content.items.length > 0) {
              loadedItems = rev.content.items.map((it) => ({
                horseId: it.horseId,
                microchipVerified: it.microchipVerified,
                condition: it.condition || 'Tỉnh táo, sức khỏe bình thường.',
                assets: it.assets || '1 dây dắt, 1 chăn ngựa',
                documents: it.documents ?? null,
              }));
            }
          } catch (revErr) {
            console.warn('[RealDriverHandoverTab] Failed to read revision, fallback to baseline horses', revErr);
          }
        }
      } catch (delivErr) {
        console.warn('[RealDriverHandoverTab] Failed to read handover, fallback to baseline horses', delivErr);
      }
    }

    setHorseItems(loadedItems);
    if (!silent) setLoading(false);
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
        {context ? (
          <div className="drv-kv" style={{ marginTop: 8 }}>
            <div><span>Chuyến</span><b>{context.tripId}</b></div>
            <div><span>Hợp đồng</span><b>{context.contractId}</b></div>
            <div><span>Trạng thái chuyến</span><b>{context.lifecycle.tripStatus}</b></div>
            <div><span>Số ngựa bàn giao</span><b>{context.horseIds.length} con</b></div>
          </div>
        ) : (
          <div className="drv-note drv-note--yellow" style={{ marginTop: 8 }}>
            <Icon name="alert" />
            <div>
              <b>Chưa kết nối dữ liệu bối cảnh máy chủ</b>
              Đang sử dụng dữ liệu hành trình nội bộ. Để kết nối trực tiếp Flow 6, vui lòng đăng nhập tài khoản tài xế được phân công (VD: hung.driver@cbntransport.com / Password123!).
            </div>
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
              readOnly
              disabled
              value={otpEmail}
              placeholder="Email người nhận từ hợp đồng..."
              style={{ backgroundColor: 'var(--bg-page, #f8fafc)', cursor: 'not-allowed', color: 'var(--text-secondary, #475569)' }}
            />
            <small style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>
              Email này được khóa cố định theo thông tin người nhận đã đăng ký ở Flow 1.
            </small>
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
        {horseItems.length === 0 ? (
          <div className="drv-empty" style={{ padding: 16, textAlign: 'center' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary, #64748b)' }}>
              Chưa có danh sách ngựa trong chuyến đi này. Vui lòng kiểm tra lại điều phối chuyến.
            </p>
          </div>
        ) : (
          horseItems.map((item, idx) => (
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
          ))
        )}
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
  return <RealDriverHandoverTab trip={trip} />;
};

export default HandoverTab;
