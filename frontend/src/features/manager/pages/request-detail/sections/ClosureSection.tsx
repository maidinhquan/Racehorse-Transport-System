import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../components/StatusBadge/StatusBadge';
import { CheckList, LockedCard, Note, openSampleFile } from '../../../components/Common/Common';
import { ActualCostModal, Modal, ReasonModal } from '../../../components/Modals';
import { DemoPanel } from '../../../components/DemoPanel/DemoPanel';
import { useManager } from '../../../hooks/useManager';
import type { TransportRequest } from '../../../types';
import {
  COMPLAINT_STATUS_LABEL,
  METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  arrived,
  balanceDue,
  closureChecks,
  fmtDateTime,
  fmtMoney,
  handoverChecks,
  horseName,
  isPast,
  outstanding,
  sumActual,
  timeLeft,
  verifiedBalance,
} from '../../../hooks/managerRules';

const CONDITION_VI = { NORMAL: 'Bình thường', MINOR_ISSUE: 'Có vấn đề nhỏ', INJURED: 'Bị thương' } as const;
type Dialog = '' | 'resolve' | 'collection' | 'close' | 'costs';

/** Mục 3: bàn giao có xác minh, thanh toán số dư, nghiệm thu, khiếu nại và đóng đơn */
export const ClosureSection: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const { data, tripFor, actions } = useManager();
  const [dialog, setDialog] = useState<Dialog>('');
  const close = () => setDialog('');
  const t = tripFor(r.id);
  if (!t || !['IN_TRANSIT', 'COMPLETED'].includes(t.status)) {
    return <LockedCard title="Chưa đến giai đoạn bàn giao" text="Mục này mở khi chuyến đi đang vận chuyển hoặc đã đến điểm giao." />;
  }
  const h = t.handover, a = r.acceptance;
  const evidence = handoverChecks(r, t), closeChecks = closureChecks(data, r);
  const canClose = r.status === 'DELIVERED' && closeChecks.every((c) => c[1]);
  const balanceTx = data.transactions.filter((x) => x.requestId === r.id && x.type === 'BALANCE');
  const cmp = data.complaints.filter((c) => c.requestId === r.id);
  const overdue = !!a && isPast(a.dueAt) && outstanding(data, r) > 0;
  const cost = data.actualCosts.find((x) => x.tripId === t.id);
  const refusalOpen = !!t.refusal && !t.refusal.resolvedAt;

  return (
    <>
      {refusalOpen && (
        <Note tone="red" title={`Người nhận từ chối bàn giao • ${fmtDateTime(t.refusal!.at)}`}>
          {t.refusal!.reason} Chuyến vẫn ở trạng thái Đang vận chuyển; tổ xe chỉ được bàn giao lại sau khi Manager ghi quyết định.
          <div className="mgr-btn-row" style={{ marginTop: 10 }}><button type="button" className="mgr-btn mgr-btn--solid" onClick={() => setDialog('resolve')}>Ghi quyết định xử lý</button></div>
        </Note>
      )}
      {r.status === 'CLOSED' && <Note tone="green" title={`Đã đóng yêu cầu • ${fmtDateTime(r.closedAt)}`}>Hợp đồng đã hoàn thành.</Note>}

      <div className="mgr-grid-main">
        <div className="mgr-stack">
          <section className="mgr-card">
            <div className="mgr-between"><h3 className="mgr-card__title">1. Người nhận & bằng chứng bàn giao</h3>
              <StatusBadge tone={evidence.every((c) => c[1]) ? 'ok' : 'warn'} label={evidence.every((c) => c[1]) ? 'Đã xác minh' : h ? 'Cần kiểm tra' : arrived(t) ? 'Chờ bàn giao' : 'Chưa đến nơi'} /></div>
            <div className="mgr-kv">
              <div><span>Người nhận đăng ký</span><b>{r.delivery.contact}</b><div className="mgr-muted">{r.delivery.phone}</div></div>
              <div><span>Điểm giao</span><b>{r.delivery.name}</b><div className="mgr-muted">{r.delivery.address}</div></div>
              <div><span>Thời điểm bàn giao</span><b>{h ? fmtDateTime(h.completedAt) : 'Chưa hoàn tất'}</b></div>
              <div><span>Người nhận thực tế / giấy tờ</span><b>{h ? `${h.receiverName} • ${h.receiverId}` : '—'}</b></div>
            </div>
            <CheckList items={evidence} />
            {h && (
              <>
                <div className="mgr-section-title">Từng con ngựa</div>
                {h.horses.map((x) => (
                  <div key={x.horseId} className="mgr-row">
                    <div><b>{horseName(data, x.horseId)}</b><span>{x.horseId} • {x.microchipOk ? 'Microchip khớp' : 'Microchip KHÔNG khớp'}</span></div>
                    <StatusBadge tone={x.condition === 'NORMAL' ? 'ok' : x.condition === 'MINOR_ISSUE' ? 'warn' : 'bad'} label={CONDITION_VI[x.condition]} />
                  </div>
                ))}
                <div className="mgr-photos">{h.photos.map((p) => <button key={p} type="button" className="mgr-photo" onClick={() => openSampleFile(p)}>{p}</button>)}</div>
              </>
            )}
            {t.refusal?.resolvedAt && <p className="mgr-hint">Quyết định sau lần từ chối ({fmtDateTime(t.refusal.resolvedAt)}): {t.refusal.resolution}</p>}
          </section>

          <section className="mgr-card">
            <div className="mgr-between"><h3 className="mgr-card__title">2. Thanh toán số dư</h3>
              {a ? <StatusBadge tone={outstanding(data, r) === 0 ? 'ok' : overdue ? 'bad' : 'warn'} label={outstanding(data, r) === 0 ? 'Đã thanh toán đủ' : overdue ? 'Quá hạn chung 24 giờ' : 'Chờ thanh toán'} />
                : <StatusBadge tone="muted" label="Chưa đến hạn" />}</div>
            <div className="mgr-kv">
              <div><span>Số dư phải thu</span><b>{fmtMoney(balanceDue(r))}</b></div>
              <div><span>Đã xác minh</span><b>{fmtMoney(verifiedBalance(data, r))}</b></div>
              <div><span>Còn lại</span><b className={outstanding(data, r) ? 'mgr-bad' : 'mgr-ok'}>{fmtMoney(outstanding(data, r))}</b></div>
              <div><span>Hạn chung (nghiệm thu + thanh toán)</span><b>{a ? `${fmtDateTime(a.dueAt)} (${timeLeft(a.dueAt)})` : '—'}</b></div>
            </div>
            {balanceTx.map((x) => (
              <div key={x.id} className="mgr-row">
                <div><b>{x.id} • {fmtMoney(x.amount)}</b><span>{METHOD_LABEL[x.method]} • {fmtDateTime(x.createdAt)}</span></div>
                <StatusBadge kind="payment" status={x.status} label={PAYMENT_STATUS_LABEL[x.status]} />
              </div>
            ))}
            {overdue && (
              <Note tone="yellow" title="Quá hạn chung 24 giờ – chưa thanh toán đủ">
                Không tự động nghiệm thu hay đóng đơn, không giữ ngựa. Ghi nhận việc theo dõi công nợ theo hợp đồng.
                <div className="mgr-btn-row" style={{ marginTop: 10 }}><button type="button" className="mgr-btn" onClick={() => setDialog('collection')}>Ghi nhận theo dõi công nợ</button></div>
              </Note>
            )}
            {r.collection.length > 0 && (
              <ul className="mgr-timeline" style={{ marginTop: 12 }}>
                {[...r.collection].reverse().map((cn) => <li key={cn.at} className="done"><b>{cn.note}</b><span>{fmtDateTime(cn.at)} • {cn.by}</span></li>)}
              </ul>
            )}
          </section>

          <section className="mgr-card">
            <div className="mgr-between"><h3 className="mgr-card__title">3. Nghiệm thu & khiếu nại</h3>
              {a ? <StatusBadge tone={a.status === 'ACCEPTED' ? 'ok' : 'warn'} label={a.status === 'ACCEPTED' ? 'Đã nghiệm thu' : 'Chờ nghiệm thu'} /> : <StatusBadge tone="muted" label="Chưa bắt đầu" />}</div>
            <p className="mgr-hint" style={{ marginTop: 0 }}>Khách nghiệm thu trước, thanh toán sau, trong hạn chung 24 giờ kể từ bàn giao. Khiếu nại đang mở tạm dừng hạn này.</p>
            {a?.decidedAt && <p className="mgr-hint">Nghiệm thu lúc {fmtDateTime(a.decidedAt)}.</p>}
            {cmp.map((c) => (
              <div key={c.id} className="mgr-row">
                <div><b>{c.id} • {c.title}</b><span>{COMPLAINT_STATUS_LABEL[c.status]} • {fmtDateTime(c.createdAt)}</span></div>
                <Link className="mgr-btn mgr-btn--sm" to={`/manager/complaints/${c.id}`}>{c.status === 'RESOLVED' ? 'Xem' : 'Xử lý'}</Link>
              </div>
            ))}
            {!cmp.length && <p className="mgr-hint">Không có khiếu nại.</p>}
          </section>
        </div>

        <aside className="mgr-stack">
          <section className="mgr-card">
            <h3 className="mgr-card__title">4. Điều kiện đóng yêu cầu</h3>
            <CheckList items={closeChecks} />
            {r.status === 'DELIVERED' && (
              <button type="button" className="mgr-btn mgr-btn--solid mgr-btn--block" style={{ marginTop: 14 }} disabled={!canClose}
                title={canClose ? '' : 'Mọi điều kiện phải đạt'} onClick={() => setDialog('close')}>Đóng yêu cầu</button>
            )}
            <p className="mgr-hint">Không đóng tự động: Manager đóng khi đã nghiệm thu, đủ tiền được xác minh và không còn khiếu nại hay sự cố mở.</p>
          </section>
          <section className="mgr-card">
            <h3 className="mgr-card__title">Chi phí thực tế {t.id}</h3>
            <p className="mgr-hint" style={{ marginTop: 0 }}>{cost ? `Đã nhập ${fmtDateTime(cost.enteredAt)} • tổng ${fmtMoney(sumActual(cost))}` : 'Chưa nhập chi phí thực tế.'}</p>
            <button type="button" className="mgr-btn mgr-btn--sm" onClick={() => setDialog('costs')}>{cost ? 'Cập nhật chi phí' : 'Nhập chi phí thực tế'}</button>
          </section>
          <DemoPanel buttons={[
            { label: 'Tổ xe: hoàn tất bàn giao có xác minh', run: () => actions.demo.driverHandover(t.id), primary: true, hidden: !(t.status === 'IN_TRANSIT' && arrived(t) && !refusalOpen) },
            { label: 'Người nhận từ chối bàn giao', run: () => actions.demo.receiverRefuse(t.id), hidden: !(arrived(t) && !h && !refusalOpen) },
            { label: 'Khách hàng nghiệm thu', run: () => actions.demo.customerAccept(r.id), primary: true, hidden: !(r.status === 'DELIVERED' && a?.status === 'PENDING') },
            { label: 'Khách hàng thanh toán số dư (VNPay)', run: () => actions.demo.customerPayBalance(r.id), hidden: !(a?.status === 'ACCEPTED' && outstanding(data, r) > 0) },
            { label: 'Khách hàng gửi khiếu nại', run: () => actions.demo.customerComplaint(r.id), hidden: r.status !== 'DELIVERED' },
          ]} hint={!arrived(t) ? 'Chuyến chưa đến điểm giao – mở Chuyến đi để mô phỏng các mốc hành trình.' : undefined} />
          {!arrived(t) && <Link className="mgr-btn mgr-btn--sm" to={`/manager/trips/${t.id}/progress`}>Mở tiến độ hành trình</Link>}
        </aside>
      </div>

      <ReasonModal open={dialog === 'resolve'} title={`Xử lý từ chối bàn giao • ${t.id}`} okText="Ghi quyết định" minLength={10} label="Quyết định của Manager *"
        intro={<p>Ví dụ: xác nhận người nhận thay thế (họ tên, giấy tờ) với khách hàng, hoặc hẹn giao lại. Tổ xe chỉ bàn giao lại sau quyết định này.</p>}
        placeholder="VD: Khách hàng ủy quyền cho Kenji Watanabe (hộ chiếu TK1234567) nhận thay, giao lại lúc 15:00." onClose={close}
        onSubmit={(x) => actions.resolveRefusal(t.id, x).ok} />
      <ReasonModal open={dialog === 'collection'} title={`Theo dõi công nợ • ${r.id}`} okText="Ghi nhận" minLength={10} label="Nội dung *"
        placeholder="VD: Gọi khách lúc 10:00, khách hẹn thanh toán trước 17:00 hôm nay." onClose={close} onSubmit={(x) => actions.addCollectionNote(r.id, x).ok} />
      <Modal open={dialog === 'close'} title={`Đóng ${r.id}`} okText="Đóng yêu cầu" onClose={close} onOk={() => { if (actions.closeRequest(r.id).ok) close(); }}>
        <p>Mọi điều kiện đóng đã đạt. Sau khi đóng, hợp đồng chuyển sang <b>Đã hoàn thành</b> và yêu cầu không thể chỉnh sửa.</p>
      </Modal>
      <ActualCostModal open={dialog === 'costs'} tripId={t.id} current={cost} onClose={close} onSubmit={(c, e) => actions.saveActualCosts(t.id, c, e).ok} />
    </>
  );
};

export default ClosureSection;
