import { downloadFile } from '../../../../../shared/api/downloadFile';
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
  horseName,
  isAccepted,
  moneyHeld,
  shortLeadTime,
  timeLeft,
  versionState,
} from '../../../hooks/managerRules';

type Dialog = '' | 'accept' | 'revise' | 'reject' | 'cancel' | 'cancel-ok' | 'cancel-no' | 'demo-cancel';

/** Mục 1: thông tin yêu cầu, hồ sơ (chỉ xem), quyết định của Manager, lịch sử */
const HorseIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 17a3 3 0 0 1-3 3H8a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h2.5a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 1.5 1.5H16a2 2 0 0 1 2 2v2" />
    <circle cx="10" cy="8" r="1" />
    <path d="M18 13l4 4" />
  </svg>
);

export const ReviewSection: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const { data, horses, customer, actions } = useManager();
  const [dialog, setDialog] = useState<Dialog>('');
  const close = () => setDialog('');
  const c = customer(r), v = curVersion(r), held = moneyHeld(data, r);
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const horseInfo = (id: string) => horses.find((h) => h.id === id || h.id.replace(/-/g, '_') === id.replace(/-/g, '_'));
  const selectedHorse = selectedHorseId ? horseInfo(selectedHorseId) : null;
  const dossierScopes = Array.from(new Set((r.dossier ?? []).map((d) => d.scope)));

  return (
    <>
      {r.status === 'PENDING_REVIEW' && shortLeadTime(r) && (
        <Note tone="yellow" title={`Đơn gấp: còn ${Math.max(0, daysUntil(r.date))} ngày tới ngày vận chuyển`}>
          Thời gian chuẩn bị ngắn hơn 7 ngày. Kiểm tra năng lực đội xe và thời hạn giấy tờ trước khi chấp thuận.
        </Note>
      )}
      {r.status === 'CHANGES_REQUESTED' && (
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
              <div><span>Khách hàng</span><b>{c?.company}</b><div className="mgr-muted">{c?.name} • {c?.email} • {c?.phone}</div></div>
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
            <h3 className="mgr-card__title">
              <span>Ngựa ({r.horses.length})</span>
            </h3>
            <div className="mgr-horse-btn-list">
              {r.horses.map((id) => {
                const h = horseInfo(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className="mgr-horse-btn-card"
                    onClick={() => setSelectedHorseId(id)}
                    title="Bấm để xem thông tin chi tiết cá thể ngựa"
                  >
                    <div className="mgr-horse-btn-left">
                      <div className="mgr-horse-avatar" aria-hidden="true"><HorseIcon size={20} /></div>
                      <div className="mgr-horse-info">
                        <div className="mgr-horse-name-row">
                          <span className="mgr-horse-name">{h?.name ?? id}</span>
                          <span className="mgr-horse-id-pill">{id}</span>
                          {!h?.microchip && <StatusBadge tone="warn" label="Thiếu microchip" />}
                        </div>
                        <div className="mgr-horse-meta">
                          {h?.breed && (
                            <span className="mgr-horse-meta-item">
                              <b>Giống:</b> {h.breed}
                            </span>
                          )}
                          <span className="mgr-horse-meta-item">
                            <b>Microchip:</b> {h?.microchip || <span style={{ color: '#d97706' }}>Chưa khai báo</span>}
                          </span>
                          {h?.passportNo && (
                            <span className="mgr-horse-meta-item">
                              <b>Hộ chiếu:</b> {h.passportNo}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mgr-horse-btn-right">
                      <span className="mgr-horse-cta">
                        Xem chi tiết ↗
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mgr-card">
            <div className="mgr-between"><h3 className="mgr-card__title">Hồ sơ khách hàng</h3><StatusBadge tone="muted" label="Chỉ xem" /></div>
            {dossierScopes.map((scope) => (
              <div key={scope}>
                <div className="mgr-section-title">{horseName(data, scope)}</div>
                {(r.dossier ?? []).filter((d) => d.scope === scope).map((d) => {
                  const fileName = typeof d.file === 'object' && d.file ? ((d.file as any).name || '') : (d.file || '');
                  return (
                    <div key={d.name} className="mgr-row">
                      <div>
                        <b>{d.name}</b>
                        <span>{fileName ? <button type="button" className="mgr-link" onClick={() => downloadFile(fileName).catch(error => actions.showToast(error.message))}>{fileName}</button> : 'Chưa có tệp'}{d.note ? ` • ${d.note}` : ''}</span>
                      </div>
                      <StatusBadge kind="dossier" status={d.status} />
                    </div>
                  );
                })}
              </div>
            ))}
          </section>
        </div>

        <aside className="mgr-stack">
          {r.status === 'PENDING_REVIEW' && (
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
              {CANCELLABLE.includes(r.status) && <button type="button" className="mgr-btn mgr-btn--sm mgr-btn--danger" onClick={() => setDialog('cancel')}>Hủy yêu cầu</button>}
            </div>
          </section>

          <section className="mgr-card">
            <h3 className="mgr-card__title">Lịch sử xử lý</h3>
            <ul className="mgr-timeline">
              {[...r.history].reverse().map((h, i) => (
                <li key={`${h.at}-${i}`} className={i === 0 ? 'now' : 'done'}>
                  <b>{h.action}</b>{h.detail && <span>{h.detail}</span>}<span>{fmtDateTime(h.at)} • {h.actor} ({ROLE_LABEL[h.role]})</span>
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

      {selectedHorseId && (
        <Modal
          open={!!selectedHorseId}
          title={`Thông tin cá thể ngựa: ${selectedHorse?.name || selectedHorseId}`}
          onClose={() => setSelectedHorseId(null)}
          cancelText="Đóng"
          wide
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: '#ffedd5', border: '1.5px solid #fdba74', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <HorseIcon size={30} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{selectedHorse?.name || selectedHorseId}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                  Mã cá thể: <b>{selectedHorseId}</b> • Giống: <b>{selectedHorse?.breed || 'Chưa rõ'}</b>
                </div>
              </div>
            </div>

            <div className="mgr-kv" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div><span>Số Microchip ISO</span><b>{selectedHorse?.microchip || 'Chưa khai báo'}</b></div>
              <div><span>Số hộ chiếu FEI</span><b>{selectedHorse?.passportNo || 'Chưa khai báo'}</b></div>
              <div><span>Giống loài</span><b>{selectedHorse?.breed || '—'}</b></div>
              <div><span>Yêu cầu vận chuyển</span><b>{r.id} ({cityLabel(r.origin)} → {cityLabel(r.destination)})</b></div>
            </div>

            {((r as any).horseNotes?.[selectedHorseId] || r.careNotes) && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                <b style={{ color: '#b45309' }}>Ghi chú chăm sóc: </b>
                {(r as any).horseNotes?.[selectedHorseId] || r.careNotes}
              </div>
            )}

            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, margin: '8px 0 8px', color: '#334155' }}>Hồ sơ & chứng từ của ngựa này</h4>
              {((r.dossier ?? []).filter((d) => d.scope === selectedHorseId)).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(r.dossier ?? []).filter((d) => d.scope === selectedHorseId).map((d) => {
                    const fileName = typeof d.file === 'object' && d.file ? ((d.file as any).name || '') : (d.file || '');
                    return (
                      <div key={d.name} className="mgr-row" style={{ padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                        <div>
                          <b>{d.name}</b>
                          <span>{fileName ? <button type="button" className="mgr-link" onClick={() => downloadFile(fileName).catch(err => actions.showToast(err.message))}>{fileName}</button> : 'Chưa có tệp'}{d.note ? ` • ${d.note}` : ''}</span>
                        </div>
                        <StatusBadge kind="dossier" status={d.status} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mgr-hint" style={{ margin: 0 }}>Chưa có hồ sơ riêng cho ngựa này.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ReviewSection;
