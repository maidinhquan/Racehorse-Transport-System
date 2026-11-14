import { downloadFile } from '../../../../../shared/api/downloadFile';
import { RequestAssessmentPanel } from './RequestAssessmentPanel';
import { getDemoMode } from '../../../../../shared/context/DemoModeContext';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../components/StatusBadge/StatusBadge';
import { Note } from '../../../components/Common/Common';
import { Modal, ReasonModal, RevisionModal } from '../../../components/Modals';
import { DemoPanel } from '../../../components/DemoPanel/DemoPanel';
import { useManager } from '../../../hooks/useManager';
import type { TransportRequest } from '../../../types';
import {
  CANCELLABLE,
  REVISION_FIELD_LABEL,
  ROLE_LABEL,
  cityLabel,
  ctRef,
  curVersion,
  daysUntil,
  depositOf,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  isAccepted,
  isSigned,
  moneyHeld,
  shortLeadTime,
  timeLeft,
  versionState,
} from '../../../hooks/managerRules';
import { getUserFullName } from '../../../../../shared/utils/userNameResolver';
import '../RequestDetailPage.css';

type Dialog = '' | 'accept' | 'revise' | 'reject' | 'cancel' | 'cancel-ok' | 'cancel-no' | 'demo-cancel';

const SEX_LABEL: Record<string, string> = {
  STALLION: 'Ngựa đực giống',
  MARE: 'Ngựa cái',
  GELDING: 'Ngựa thiến',
  MALE: 'Ngựa đực',
  FEMALE: 'Ngựa cái',
};

const REPRODUCTIVE_LABEL: Record<string, string> = {
  INTACT: 'Chưa phối giống',
  PREGNANT: 'Đang mang thai',
  NOT_PREGNANT: 'Không mang thai',
  GELDED: 'Đã thiến',
};

/** Mục 1: thông tin yêu cầu, hồ sơ (chỉ xem), quyết định của Manager, lịch sử */
export const ReviewSection: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const { data, horses, customer, actions } = useManager();
  const demo = getDemoMode('manager');
  const [dialog, setDialog] = useState<Dialog>('');
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const close = () => setDialog('');
  const c = customer(r), v = curVersion(r), held = moneyHeld(data, r);
  const horseInfo = (id: string) => horses.find((h) => h.id === id || h.id.replace(/-/g, '_') === id.replace(/-/g, '_'));
  const viewingHorse = selectedHorseId ? horseInfo(selectedHorseId) : null;

  const renderHorseFileRow = (label: string, fileRef: any, fallbackName: string) => {
    const dossierItem = (r.dossier ?? []).find(
      (d) => (d.scope === selectedHorseId || d.scope === viewingHorse?.id) && (d.name === fallbackName || d.name.toLowerCase().includes(fallbackName.toLowerCase()))
    );
    const fileName =
      fileRef?.name ||
      (typeof fileRef === 'string' ? fileRef : '') ||
      (typeof dossierItem?.file === 'object' && dossierItem?.file ? (dossierItem.file as any).name : dossierItem?.file) ||
      '';
    const fileUrl = fileRef?.url;

    return (
      <div className="mgr-horse-file-row">
        <span>{label}:</span>
        {fileUrl ? (
          <button
            type="button"
            className="mgr-link"
            onClick={() => window.open(fileUrl, '_blank')}
          >
            Tải / Xem tệp
          </button>
        ) : fileName ? (
          <button
            type="button"
            className="mgr-link"
            onClick={() => downloadFile(fileName).catch((err) => actions.showToast(err.message))}
          >
            Tải tệp ({fileName})
          </button>
        ) : (
          <span className="mgr-muted">Chưa có tệp</span>
        )}
      </div>
    );
  };

  return (
    <>
      {demo && r.status === 'PENDING_REVIEW' && shortLeadTime(r) && (
        <Note tone="yellow" title={`Đơn gấp: còn ${Math.max(0, daysUntil(r.date))} ngày tới ngày vận chuyển`}>
          Thời gian chuẩn bị ngắn hơn 7 ngày. Kiểm tra năng lực đội xe và thời hạn giấy tờ trước khi chấp thuận.
        </Note>
      )}
      {demo && r.status === 'CHANGES_REQUESTED' && (
        <Note tone="blue" title="Đang chờ khách hàng chỉnh sửa">
          {r.feedback}<div className="mgr-hint">Mục cần sửa: {(r.revisionFields ?? []).map((f) => REVISION_FIELD_LABEL[f]).join(', ')}</div>
        </Note>
      )}
      {['REJECTED', 'CANCELLED'].includes(r.status) && r.reason && <Note tone="grey" title={r.status === 'REJECTED' ? 'Đã từ chối' : 'Đã hủy'}>{r.reason}</Note>}
      {r.status === 'CANCELLATION_REQUESTED' && r.cancellation && (
        <Note tone="red" title={`Khách hàng yêu cầu hủy • ${fmtDateTime(r.cancellation.at)}`}>
          {r.cancellation.reason}
          <div className="mgr-hint">Tiền khách đã trả và được xác minh: <b>{fmtMoney(held)}</b>. Nếu duyệt hủy, hệ thống tạo lệnh hoàn tiền tại Tiền cọc & thanh toán.</div>
          <div className="mgr-btn-row" style={{ marginTop: 10 }}>
            <button type="button" className="mgr-btn mgr-btn--danger" onClick={() => setDialog('cancel-ok')}>Duyệt hủy & hoàn tiền</button>
            <button type="button" className="mgr-btn" onClick={() => setDialog('cancel-no')}>Từ chối yêu cầu hủy</button>
          </div>
        </Note>
      )}

      <div className="mgr-grid-main">
        <div className="mgr-stack">
          <section className="mgr-card">
            <h3 className="mgr-card__title">Thông tin vận chuyển</h3>
            <div className="mgr-kv">
              <div><span>Khách hàng</span><b>{c?.company}</b><div className="mgr-muted">{[c?.name, c?.email, c?.phone].filter(Boolean).join(' • ') || 'Chưa có'}</div></div>
              <div><span>Tuyến</span><b>{cityLabel(r.origin)} → {cityLabel(r.destination)}</b></div>
              <div><span>Ngày vận chuyển mong muốn</span><b>{fmtDate(r.date)}</b></div>
              <div><span>Gửi lúc</span><b>{fmtDateTime(r.submittedAt)}</b></div>
            </div>
            <div className="mgr-rd__places">
              <div className="mgr-rd__place"><span>Điểm nhận</span><b>{r.pickup.name}</b><span>{r.pickup.address}</span><span>Liên hệ: {r.pickup.contact} • {r.pickup.phone}</span></div>
              <div className="mgr-rd__place"><span>Điểm giao (người nhận đăng ký)</span><b>{r.delivery.name}</b><span>{r.delivery.address}</span><span>Người nhận: {r.delivery.contact} • {r.delivery.phone}</span></div>
            </div>
            <p className="mgr-hint"><b>Ghi chú chăm sóc:</b> {r.careNotes || 'Không có.'}</p>
          </section>

          <section className="mgr-card">
            <div className="mgr-between">
              <h3 className="mgr-card__title">Ngựa ({r.horses.length})</h3>
              <span className="mgr-hint" style={{ margin: 0, fontSize: 12 }}>Bấm vào để xem hồ sơ chi tiết</span>
            </div>
            {r.horses.map((id) => {
              const h = horseInfo(id);
              return (
                <div
                  key={id}
                  className="mgr-row mgr-horse-row-clickable"
                  onClick={() => setSelectedHorseId(id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedHorseId(id);
                    }
                  }}
                  title={`Bấm để xem hồ sơ chi tiết ngựa: ${h?.name ?? id}`}
                >
                  <div className="mgr-horse-row-content">
                    <div className="mgr-horse-row-title-line">
                      <b className="mgr-horse-row-name">{h?.name ?? id}</b>
                      <span className="mgr-horse-row-badge">Xem chi tiết ↗</span>
                    </div>
                    <span className="mgr-horse-row-meta">
                      {id} • {h?.breed || 'Chưa rõ giống'} • Microchip {h?.microchip || 'chưa khai báo'} • Hộ chiếu {h?.passportNo || (h as any)?.passport?.number || 'chưa khai báo'}
                    </span>
                  </div>
                  {!h?.microchip ? (
                    <StatusBadge tone="warn" label="Thiếu microchip" />
                  ) : (
                    <span className="mgr-horse-row-arrow">›</span>
                  )}
                </div>
              );
            })}
          </section>
        </div>

        <aside className="mgr-stack">
          {!demo && ['PENDING_REVIEW', 'CHANGES_REQUESTED', 'CONTRACT_PREPARATION', 'CONTRACT_READY', 'CONTRACT_CHANGES_REQUESTED'].includes(r.status) && (
            <RequestAssessmentPanel key={r.id} requestId={r.id} pending={r.status === 'PENDING_REVIEW'}
              accept={async key => (await actions.acceptRequest(r.id, key)).ok}
              changes={async (feedback, key) => (await actions.requestRevision(r.id, feedback, key)).ok}
              reject={r.status === 'PENDING_REVIEW' || r.status === 'CHANGES_REQUESTED' ? () => setDialog('reject') : undefined} />
          )}
          {demo && r.status === 'PENDING_REVIEW' && (
            <section className="mgr-card mgr-rd__decision">
              <h3 className="mgr-card__title">Quyết định của Manager</h3>
              <p className="mgr-hint" style={{ marginTop: 0, marginBottom: 12 }}>Chấp thuận để mở bước soạn hợp đồng và giá bán.</p>
              <button type="button" className="mgr-btn mgr-btn--solid" onClick={() => setDialog('accept')}>Chấp thuận yêu cầu</button>
              <button type="button" className="mgr-btn" onClick={() => setDialog('revise')}>Yêu cầu khách chỉnh sửa</button>
              <button type="button" className="mgr-btn mgr-btn--danger" onClick={() => setDialog('reject')}>Từ chối yêu cầu</button>
            </section>
          )}

          <section className="mgr-card">
            <h3 className="mgr-card__title">Hợp đồng & thanh toán</h3>
            {v ? (
              <div className="mgr-kv" style={{ gridTemplateColumns: '1fr' }}>
                <div><span>Phiên bản hiện hành</span><b>{ctRef(v)}</b> <StatusBadge kind="contract" status={versionState(v)} /></div>
                <div><span>Giá hợp đồng • cọc {v.depositPct}%</span><b>{fmtMoney(v.total)} • {fmtMoney(depositOf(r))}</b></div>
                {!v.signedAt && ['ISSUED', 'EXPIRED'].includes(versionState(v)) && <div><span>Hạn chung</span><b>{fmtDateTime(v.validUntil)} ({timeLeft(v.validUntil)})</b></div>}
                {v.signedAt && <div><span>Ký OTP</span><b>{fmtDateTime(v.signedAt)}</b></div>}
              </div>
            ) : <p className="mgr-hint" style={{ marginTop: 0 }}>{isAccepted(r) ? 'Chưa phát hành hợp đồng.' : 'Hợp đồng mở sau khi Manager chấp thuận yêu cầu.'}</p>}
            <div className="mgr-actions">
              {isAccepted(r) && r.status !== 'CANCELLED' && (
                <Link className="mgr-btn mgr-btn--sm mgr-btn--solid" to={`/manager/contracts/${r.id}`}>
                  {v && versionState(v) !== 'VOID' ? 'Mở hợp đồng' : 'Soạn hợp đồng mới'}
                </Link>
              )}
              {CANCELLABLE.includes(r.status) && !isSigned(r) && <button type="button" className="mgr-btn mgr-btn--sm mgr-btn--danger" onClick={() => setDialog('cancel')}>Hủy yêu cầu</button>}
            </div>
          </section>

          <section className="mgr-card">
            <h3 className="mgr-card__title">Lịch sử xử lý</h3>
            <ul className="mgr-timeline">
              {[...r.history].reverse().map((h, i) => (
                <li key={`${h.at}-${i}`} className={i === 0 ? 'now' : 'done'}>
                  <b>{h.action}</b>{h.detail && <span>{h.detail}</span>}<span>{fmtDateTime(h.at)} • {getUserFullName(h.actor)} ({ROLE_LABEL[h.role]})</span>
                </li>
              ))}
            </ul>
          </section>

          <DemoPanel buttons={[
            { label: `Khách hàng gửi lại ${r.id} sau chỉnh sửa`, run: () => actions.demo.customerResubmit(r.id), hidden: r.status !== 'CHANGES_REQUESTED', primary: true },
            { label: `Khách hàng yêu cầu hủy ${r.id}`, run: () => setDialog('demo-cancel'), hidden: !['CONTRACT_READY', 'DEPOSIT_VERIFIED'].includes(r.status) },
          ]} />
        </aside>
      </div>

      <Modal open={dialog === 'accept'} title={`Chấp thuận ${r.id}`} okText="Chấp thuận" onClose={close}
        onOk={async () => { if ((await actions.acceptRequest(r.id)).ok) close(); }}>
        <p>Yêu cầu chuyển sang <b>Đang soạn hợp đồng</b>. Bạn sẽ lập phương án, giá bán và điều khoản ở bước Hợp đồng & giá.</p>
        {r.dossier.some((d) => d.status !== 'APPROVED') && <p className="mgr-muted">Lưu ý: một số giấy tờ chưa được Specialist duyệt. Việc này không chặn chấp thuận nhưng phải hoàn tất trước khi khởi hành.</p>}
      </Modal>
      <RevisionModal open={dialog === 'revise'} requestId={r.id} onClose={close} onSubmit={async (fb) => (await actions.requestRevision(r.id, fb)).ok} />
      <ReasonModal open={dialog === 'reject'} title={`Từ chối ${r.id}`} okText="Từ chối yêu cầu" danger minLength={10}
        intro={<p>Khách hàng nhận được lý do từ chối. Yêu cầu bị từ chối không thể mở lại.</p>}
        placeholder="VD: Không thể bố trí phương tiện cho ngày vận chuyển đã chọn." onClose={close} onSubmit={async (x) => (await actions.rejectRequest(r.id, x)).ok} />
      <ReasonModal open={dialog === 'cancel'} title={`Thu hồi / Hủy ${r.id}`} okText="Xác nhận" danger minLength={10}
        intro={<p>{held > 0 ? `Khách đã trả ${fmtMoney(held)} được xác minh – hệ thống tạo lệnh hoàn tiền.` : 'Chưa có khoản thanh toán nào được xác minh.'} Hợp đồng chưa ký (nếu có) bị hủy.</p>}
        confirmText="Tôi hiểu thao tác này không thể hoàn tác." onClose={close} onSubmit={async (x) => {
          const res = await actions.cancelRequest(r.id, x);
          return res.ok;
        }} />
      <ReasonModal open={dialog === 'cancel-ok'} title={`Duyệt yêu cầu hủy ${r.id}`} okText="Duyệt hủy" danger minLength={5} label="Ghi chú quyết định *"
        placeholder="VD: Hoàn toàn bộ tiền cọc đã xác minh." onClose={close} onSubmit={async (x) => {
          const res = await actions.decideCancellation(r.id, true, x);
          return res.ok;
        }} />
      <ReasonModal open={dialog === 'cancel-no'} title={`Từ chối yêu cầu hủy ${r.id}`} okText="Từ chối hủy" minLength={5} label="Lý do gửi khách hàng *"
        placeholder="VD: Đã đặt chỗ chuyến bay không hoàn được; đề nghị dời ngày thay vì hủy." onClose={close} onSubmit={async (x) => {
          const res = await actions.decideCancellation(r.id, false, x);
          return res.ok;
        }} />
      <ReasonModal open={dialog === 'demo-cancel'} title={`Demo: Khách hàng yêu cầu hủy ${r.id}`} okText="Gửi yêu cầu hủy" danger minLength={5}
        label="Lý do hủy yêu cầu *" placeholder="VD: Kế hoạch thi đấu thay đổi, không còn nhu cầu vận chuyển." onClose={close} onSubmit={async (reason) => {
          actions.demo.customerRequestCancel(r.id, reason);
          close();
          return true;
        }} />

      {viewingHorse && (
        <Modal
          open={!!viewingHorse}
          title={`Hồ sơ cá thể ngựa: ${viewingHorse.name || selectedHorseId}`}
          onClose={() => setSelectedHorseId(null)}
          cancelText="Đóng"
          wide
        >
          <div className="mgr-horse-modal-layout">
            <div className="mgr-horse-modal-header-banner">
              <div className="mgr-horse-avatar">
                {(viewingHorse.name || 'H').slice(0, 2).toUpperCase()}
              </div>
              <div className="mgr-horse-summary">
                <h4>{viewingHorse.name || viewingHorse.id}</h4>
                <p>
                  <span className="mgr-id-pill">{viewingHorse.id}</span>
                  {viewingHorse.breed && <span> • {viewingHorse.breed}</span>}
                  {viewingHorse.sex && <span> • {SEX_LABEL[viewingHorse.sex as string] || viewingHorse.sex}</span>}
                  {viewingHorse.microchip ? (
                    <span className="mgr-chip-pill">Microchip: {viewingHorse.microchip}</span>
                  ) : (
                    <span className="mgr-chip-pill warn">Chưa có Microchip</span>
                  )}
                </p>
              </div>
            </div>

            <div className="mgr-horse-modal-grid">
              {/* Thẻ 1: Thông tin sinh học & Nhận dạng */}
              <div className="mgr-horse-detail-card">
                <h5>Thông tin sinh học & Định danh</h5>
                <div className="mgr-horse-kv-list">
                  <div className="mgr-horse-kv-item"><span>Mã ngựa (ID)</span><b>{viewingHorse.id}</b></div>
                  <div className="mgr-horse-kv-item"><span>Tên ngựa</span><b>{viewingHorse.name || '—'}</b></div>
                  <div className="mgr-horse-kv-item"><span>Giống loài</span><b>{viewingHorse.breed || '—'}</b></div>
                  <div className="mgr-horse-kv-item"><span>Giới tính</span><b>{SEX_LABEL[viewingHorse.sex as string] || viewingHorse.sex || '—'}</b></div>
                  <div className="mgr-horse-kv-item"><span>Ngày sinh</span><b>{viewingHorse.dob ? fmtDate(viewingHorse.dob) : '—'}</b></div>
                  <div className="mgr-horse-kv-item"><span>Cân nặng</span><b>{viewingHorse.weight ? `${viewingHorse.weight} kg` : '—'}</b></div>
                  <div className="mgr-horse-kv-item"><span>Tình trạng sinh sản</span><b>{REPRODUCTIVE_LABEL[viewingHorse.reproductiveStatus as string] || viewingHorse.reproductiveStatus || '—'}</b></div>
                  <div className="mgr-horse-kv-item"><span>Mã vi mạch (ISO)</span><b>{viewingHorse.microchip || <span className="mgr-bad">Chưa khai báo</span>}</b></div>
                </div>
              </div>

              {/* Thẻ 2: Hộ chiếu FEI */}
              <div className="mgr-horse-detail-card">
                <h5>Hộ chiếu ngựa (FEI Passport)</h5>
                <div className="mgr-horse-kv-list">
                  <div className="mgr-horse-kv-item"><span>Số hộ chiếu</span><b>{viewingHorse.passportNo || viewingHorse.passport?.number || '—'}</b></div>
                  <div className="mgr-horse-kv-item"><span>Cơ quan cấp</span><b>{viewingHorse.passport?.authority || '—'}</b></div>
                  <div className="mgr-horse-kv-item"><span>Ngày cấp</span><b>{viewingHorse.passport?.issueDate ? fmtDate(viewingHorse.passport.issueDate) : '—'}</b></div>
                  <div className="mgr-horse-kv-item"><span>Ngày hết hạn</span><b>{viewingHorse.passport?.expiryDate ? fmtDate(viewingHorse.passport.expiryDate) : '—'}</b></div>
                </div>
                {renderHorseFileRow('Bản scan hộ chiếu', viewingHorse.passport?.scan, 'passport')}
              </div>

              {/* Thẻ 3: Sở hữu & Giá trị thương mại */}
              <div className="mgr-horse-detail-card">
                <h5>Sở hữu & Giá trị thương mại</h5>
                <div className="mgr-horse-kv-list">
                  <div className="mgr-horse-kv-item"><span>Giá trị khai báo</span><b>{viewingHorse.value ? `${Number(viewingHorse.value).toLocaleString('vi-VN')} ${viewingHorse.currency || 'VND'}` : '—'}</b></div>
                </div>
                {renderHorseFileRow('Ảnh nhận dạng', viewingHorse.photo, 'photo')}
                {renderHorseFileRow('Giấy chứng nhận sở hữu', viewingHorse.ownership, 'ownership')}
                {renderHorseFileRow('Chứng từ định giá / hóa đơn', viewingHorse.valueProof, 'valueProof')}
              </div>

              {/* Thẻ 4: Sức khỏe & Lưu ý vận chuyển */}
              <div className="mgr-horse-detail-card">
                <h5>Sức khỏe & Lưu ý vận chuyển</h5>
                <div className="mgr-horse-kv-list">
                  <div className="mgr-horse-kv-item">
                    <span>Ghi chú sức khỏe cá thể</span>
                    <b>{viewingHorse.healthNotes || 'Không có ghi chú bất thường.'}</b>
                  </div>
                  <div className="mgr-horse-kv-item">
                    <span>Yêu cầu chăm sóc theo đơn</span>
                    <b>{r.careNotes || 'Không có.'}</b>
                  </div>
                </div>
                {(r.dossier ?? []).filter((d) => d.scope === selectedHorseId || d.scope === viewingHorse.id).length > 0 && (
                  <div className="mgr-horse-dossier-sublist">
                    <span className="mgr-horse-dossier-sublist-title">Giấy tờ đính kèm trong đơn:</span>
                    {(r.dossier ?? []).filter((d) => d.scope === selectedHorseId || d.scope === viewingHorse.id).map((d) => {
                      const fileName = typeof d.file === 'object' && d.file ? ((d.file as any).name || '') : (d.file || '');
                      return (
                        <div key={d.name} className="mgr-horse-dossier-row">
                          <span>{{ photo: 'Ảnh nhận dạng', passport: 'Hộ chiếu FEI', ownership: 'Giấy chứng nhận sở hữu', valueProof: 'Chứng từ giá trị' }[d.name] || d.name}</span>
                          {fileName ? (
                            <button
                              type="button"
                              className="mgr-link"
                              onClick={() => downloadFile(fileName).catch((err) => actions.showToast(err.message))}
                            >
                              Tải tệp ({fileName})
                            </button>
                          ) : (
                            <span className="mgr-muted">Chưa có tệp</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ReviewSection;
