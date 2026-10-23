import React, { useState } from 'react';
import type { TransportRequest } from '../../../types';
import { useCustomer } from '../../../hooks/useCustomer';
import {
  balanceDue,
  balanceState,
  canComplain,
  closureChecks,
  cityLabel,
  contractTotal,
  depositPaidAmount,
  fmtDateTime,
  fmtMoney,
  handoverState,
  isPast,
  openComplaints,
  timeLeft,
} from '../../../hooks/customerRules';
import { Icon } from '../../../components/CustomerLayout';
import { DemoPanel } from '../../../components/DemoPanel/DemoPanel';
import { ComplaintModal } from '../../../components/Modals';
import { LockedCard, Note } from '../../../components/Common/Common';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';

const CONDITION_LABEL = { NORMAL: 'Bình thường', MONITOR: 'Cần theo dõi', ABNORMAL: 'Bất thường' } as const;

/** Tab Bàn giao & nghiệm thu: biên bản bàn giao, nghiệm thu, thanh toán số dư (VNPay), điều kiện đóng yêu cầu */
export const HandoverTab: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const { horses, actions } = useCustomer();
  const [complaintOpen, setComplaintOpen] = useState(false);
  const t = r.trip, h = t?.handover, ho = handoverState(t), acc = r.acceptance;
  if (!ho && !acc) return <LockedCard title="Chưa đến bước bàn giao" text="Bàn giao diễn ra khi tổ xe xác nhận đã đến điểm giao." />;
  const bs = balanceState(r), due = balanceDue(r);
  const pendingBalance = r.payments.find((p) => p.type === 'BALANCE' && p.status === 'PROCESSING');
  const lastBalance = [...r.payments].reverse().find((p) => p.type === 'BALANCE');
  const blocked = openComplaints(r).length > 0;

  return (
    <div className="cus-grid-main">
      <div className="cus-stack">
        <div className="cus-card">
          <h3 className="cus-card__title">Bàn giao <TripStatusBadge label={ho === 'COMPLETED' ? 'Hoàn tất' : 'Đang bàn giao'} tone={ho === 'COMPLETED' ? 'ok' : 'warn'} /></h3>
          <div className="cus-kv">
            <div><span>Chuyến</span><b>{t?.id ?? '—'}</b></div>
            <div><span>Tuyến</span><b>{cityLabel(r.origin)} → {cityLabel(r.destination)}</b></div>
            <div><span>Người nhận đăng ký</span><b>{r.delivery.contact || '—'}</b></div>
            <div><span>Điện thoại người nhận</span><b>{r.delivery.phone || '—'}</b></div>
            <div><span>Địa chỉ giao</span><b>{[r.delivery.name, r.delivery.address].filter(Boolean).join(', ') || '—'}</b></div>
            {h && <div><span>Bàn giao lúc</span><b>{fmtDateTime(h.completedAt)}</b></div>}
            {h && <div><span>Người nhận</span><b>{h.receiverName} • {h.receiverId}</b></div>}
          </div>
          {ho === 'PENDING' && (
            <Note tone="yellow" title="Đang bàn giao">Tổ xe đang xác minh người nhận, microchip và tình trạng từng ngựa, ảnh và chữ ký. Bạn không cần trực tuyến nếu người nhận đăng ký có mặt.</Note>
          )}
          {h && (
            <>
              <div className="cus-eyebrow" style={{ marginTop: 14 }}>Tình trạng ngựa khi giao</div>
              {h.horses.map((x) => {
                const hh = horses.find((y) => y.id === x.horseId);
                return (
                  <div key={x.horseId} className="cus-horse-line">
                    <div><b>{hh?.name ?? x.horseId}</b><small>Microchip {hh?.microchip || '—'} {x.microchipOk ? 'đã xác minh' : 'chưa xác minh'}{x.note ? ` • ${x.note}` : ''}</small></div>
                    <TripStatusBadge label={CONDITION_LABEL[x.condition]} tone={x.condition === 'NORMAL' ? 'ok' : x.condition === 'MONITOR' ? 'warn' : 'bad'} />
                  </div>
                );
              })}
              <div className="cus-eyebrow" style={{ marginTop: 12 }}>Bằng chứng</div>
              <div className="cus-photo-strip">{h.photos.map((p) => <span key={p}>{p}</span>)}<span>Chữ ký: {h.receiverName}</span></div>
            </>
          )}
        </div>

        {acc && (
          <div className="cus-card">
            <h3 className="cus-card__title">Nghiệm thu & thanh toán số dư <TripStatusBadge label={acc.status === 'ACCEPTED' ? 'Đã nghiệm thu' : 'Chờ nghiệm thu'} tone={acc.status === 'ACCEPTED' ? 'ok' : 'warn'} /></h3>
            <div className="cus-kv">
              <div><span>Giá hợp đồng</span><b>{fmtMoney(contractTotal(r))}</b></div>
              <div><span>Đã đặt cọc</span><b>{fmtMoney(depositPaidAmount(r))}</b></div>
              <div><span>Số dư còn lại</span><b className="cus-orange">{fmtMoney(due)}</b></div>
              <div><span>Hạn chung 24 giờ</span><b>{fmtDateTime(acc.dueAt)} <small className="cus-muted">({blocked ? 'tạm dừng do khiếu nại' : timeLeft(acc.dueAt)})</small></b></div>
              <div><span>Thanh toán (VNPay)</span><b>{bs === 'VERIFIED' ? 'Đã xác minh' : bs === 'PROCESSING' ? 'Đang xác minh' : bs === 'FAILED' ? 'Thất bại' : 'Chưa thanh toán'}</b></div>
              <div><span>Nghiệm thu</span><b>{acc.decidedAt ? `Đã xác nhận ${fmtDateTime(acc.decidedAt)}` : 'Chưa xác nhận'}</b></div>
            </div>
            {bs !== 'VERIFIED' && isPast(acc.dueAt) && !blocked && (
              <Note tone="yellow" title={`Quá hạn thanh toán từ ${fmtDateTime(acc.dueAt)}`}>{fmtMoney(due)} vẫn còn phải thanh toán theo hợp đồng. CBN Transport đã được thông báo; không có gì tự động đóng.</Note>
            )}
            {bs === 'FAILED' && lastBalance && <Note tone="red" title="Thanh toán VNPay gần nhất thất bại">{lastBalance.reason} Không có khoản tiền nào bị trừ, bạn có thể thanh toán lại.</Note>}
            <div className="cus-btn-row">
              {acc.status === 'PENDING' && (
                <button type="button" className="cus-btn cus-btn--solid" disabled={blocked} title={blocked ? 'Đang có khiếu nại chưa giải quyết' : ''} onClick={() => actions.confirmAcceptance(r.id)}>
                  <Icon name="check" />Xác nhận nghiệm thu
                </button>
              )}
              {acc.status === 'ACCEPTED' && due > 0 && !pendingBalance && (
                <button type="button" className="cus-btn cus-btn--solid" onClick={() => actions.payBalance(r.id)}><Icon name="card" />Thanh toán {fmtMoney(due)} qua VNPay</button>
              )}
              {pendingBalance && <span className="cus-muted" style={{ alignSelf: 'center' }}>Giao dịch {pendingBalance.id} đang được xác minh.</span>}
              {canComplain(r) && <button type="button" className="cus-btn" onClick={() => setComplaintOpen(true)}>Gửi khiếu nại</button>}
            </div>
            <p className="cus-muted" style={{ marginTop: 10 }}>Nghiệm thu trước rồi thanh toán và xác minh số dư trong hạn chung 24 giờ. Khiếu nại tạm dừng hạn; giải quyết xong được cấp lại 24 giờ.</p>
          </div>
        )}

        {['DELIVERED', 'CLOSED'].includes(r.status) && (
          <div className="cus-card">
            <h3 className="cus-card__title">Đóng yêu cầu <TripStatusBadge label={r.status === 'CLOSED' ? 'Đã đóng' : 'Đang mở'} tone={r.status === 'CLOSED' ? 'muted' : 'warn'} /></h3>
            <ul className="cus-check-list">
              {closureChecks(r).map(([label, done]) => <li key={label} className={done ? 'ok' : ''}><Icon name={done ? 'check' : 'clock'} /><span>{label}</span></li>)}
            </ul>
            <p className="cus-muted">{r.status === 'CLOSED' ? `Đã đóng ${fmtDateTime(r.closedAt)}.` : 'CBN Transport chỉ đóng yêu cầu khi đủ mọi điều kiện. Hoàn tất chuyến đi không tự đóng yêu cầu.'}</p>
          </div>
        )}
      </div>
      <DemoPanel request={r} />
      <ComplaintModal open={complaintOpen} requestId={r.id} onClose={() => setComplaintOpen(false)} />
    </div>
  );
};

export default HandoverTab;
