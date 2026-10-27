import React, { useState } from 'react';
import type { DocKey, RequestField, TransportRequest } from '../../types';
import { useCustomer } from '../../hooks/useCustomer';
import {
  DOC_NAME,
  FIELD_LABEL,
  FILE_DOC_KEYS,
  curVersion,
  depositPayments,
  openComplaints,
  pickedHorses,
  qrExpired,
  versionState,
} from '../../hooks/customerRules';
import { useDemoMode } from '../../../../shared/context/DemoModeContext';
import { Modal, ReasonModal } from '../Modals';
import './DemoPanel.css';

type Dialog = '' | 'changes' | 'reject' | 'supplement';

/**
 * Nút demo: giả lập thao tác của nhân viên CBN Transport (Manager, Specialist, tổ xe, cổng thanh toán Sandbox)
 * để đi hết luồng của khách hàng. Không thuộc cổng khách hàng thật.
 */
export const DemoPanel: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const { enabled: isDemoMode } = useDemoMode('customer');
  const { horses, actions } = useCustomer();
  const d = actions.demo;
  const [dialog, setDialog] = useState<Dialog>('');
  const [feedback, setFeedback] = useState('');
  const [fields, setFields] = useState<RequestField[]>(['date']);
  const [supKey, setSupKey] = useState<DocKey>('health');
  const [supHorse, setSupHorse] = useState('');
  const [supReason, setSupReason] = useState('');
  const [error, setError] = useState('');

  if (!isDemoMode) return null;

  const v = curVersion(r), vs = v ? versionState(v) : undefined;
  const pendingDeposit = [...depositPayments(r)].reverse().find((p) => p.status === 'PROCESSING');
  const pendingBalance = r.payments.find((p) => p.type === 'BALANCE' && p.status === 'PROCESSING');
  const lastMs = r.trip?.milestones[r.trip.milestones.length - 1];
  const btns: Array<[string, () => unknown, boolean?]> = [];

  switch (r.status) {
    case 'PENDING_REVIEW':
      btns.push(['Manager: Chấp nhận yêu cầu', () => d.managerAccept(r.id), true],
        ['Manager: Yêu cầu chỉnh sửa', () => { setFeedback(''); setError(''); setDialog('changes'); }],
        ['Manager: Từ chối yêu cầu', () => setDialog('reject')]);
      break;
    case 'CONTRACT_PREPARATION':
      btns.push(['Manager: Phát hành hợp đồng v1', () => d.issueContract(r.id), true]);
      break;
    case 'CONTRACT_CHANGES_REQUESTED':
      btns.push(['Manager: Phát hành phiên bản sửa đổi', () => d.reviseContract(r.id), true],
        ['Manager: Trả lời & giữ phiên bản', () => d.keepVersion(r.id)]);
      break;
    case 'CONTRACT_READY':
      if (vs === 'EXPIRED') btns.push(['Manager: Phát hành phiên bản mới', () => d.reviseContract(r.id), true], ['Manager: Gia hạn thêm 24 giờ', () => d.extendDeadline(r.id)]);
      else btns.push(['Manager: Gia hạn thêm 24 giờ', () => d.extendDeadline(r.id)], ['Demo: cho phiên bản hết hạn', () => d.expireVersion(r.id)]);
      break;
    case 'DEPOSIT_VERIFIED':
      btns.push(['Manager: Gia hạn thêm 24 giờ', () => d.extendDeadline(r.id)]);
      if (vs === 'ISSUED') btns.push(['Demo: cho phiên bản hết hạn', () => d.expireVersion(r.id)]);
      break;
    case 'CANCELLATION_REQUESTED':
      btns.push(['Manager: Duyệt hủy & hoàn cọc', () => d.approveCancellation(r.id), true]);
      break;
    case 'ACTIVATED':
      btns.push(['Specialist: Duyệt giấy tờ đang chờ', () => d.specialistApproveAll(r.id), true],
        ['Specialist: Từ chối 1 giấy tờ', () => d.specialistRejectOne(r.id)],
        ['Specialist: Yêu cầu bổ sung giấy tờ', () => { setSupReason(''); setSupHorse(pickedHorses(r)[0] ?? ''); setError(''); setDialog('supplement'); }],
        ['Manager: Duyệt tuyến & lên lịch khởi hành', () => d.scheduleTrip(r.id)]);
      break;
    case 'SCHEDULED':
      btns.push(['Tổ xe: Xác nhận xuất phát', () => d.crewDepart(r.id), true]);
      break;
    case 'IN_TRANSIT':
      if (lastMs?.type === 'ARRIVED_DESTINATION') btns.push(['Tổ xe: Hoàn tất bàn giao có xác minh', () => d.crewHandover(r.id), true]);
      else btns.push(['Tổ xe: Xác nhận mốc tiếp theo', () => d.crewNextMilestone(r.id), true]);
      break;
    case 'DELIVERED':
      openComplaints(r).forEach((c) => btns.push([`Manager: Giải quyết ${c.id}`, () => d.resolveComplaint(r.id, c.id)]));
      btns.push(['Demo: hết hạn 24 giờ nghiệm thu', () => d.endAcceptanceWindow(r.id)], ['Manager: Đóng yêu cầu', () => d.closeRequest(r.id), true]);
      break;
    case 'CANCELLED':
      if (r.refund && r.refund.status !== 'REFUNDED') btns.push([r.refund.status === 'REQUESTED' ? 'Manager: Bắt đầu xử lý hoàn tiền' : 'Manager: Ghi nhận đã hoàn tiền', () => d.advanceRefund(r.id), true]);
      break;
    default:
      break;
  }
  const sandbox = pendingDeposit && !qrExpired(pendingDeposit);
  if (!btns.length && !sandbox && !pendingBalance) return null;

  const toggleField = (f: RequestField) => setFields((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  return (
    <div className="cus-demo">
      <div className="cus-demo__title">Nút demo</div>
      <p>Giả lập thao tác của nhân viên CBN Transport để đi hết luồng. Không thuộc cổng khách hàng.</p>
      {sandbox && (
        <>
          <p className="cus-demo__hint">Sự kiện từ cổng thanh toán Sandbox (callback tin cậy):</p>
          <button type="button" className="cus-btn cus-btn--sm cus-btn--solid cus-btn--block" onClick={() => d.sandboxDeposit(r.id, true)}>Sandbox: Thanh toán thành công</button>
          <button type="button" className="cus-btn cus-btn--sm cus-btn--block" onClick={() => d.sandboxDeposit(r.id, false)}>Sandbox: Thanh toán thất bại</button>
        </>
      )}
      {pendingBalance && (
        <>
          <p className="cus-demo__hint">Sự kiện từ VNPay Sandbox:</p>
          <button type="button" className="cus-btn cus-btn--sm cus-btn--solid cus-btn--block" onClick={() => d.sandboxBalance(r.id, true)}>VNPay: Thanh toán thành công</button>
          <button type="button" className="cus-btn cus-btn--sm cus-btn--block" onClick={() => d.sandboxBalance(r.id, false)}>VNPay: Thanh toán thất bại</button>
        </>
      )}
      {btns.map(([label, run, primary]) => (
        <button key={label} type="button" className={`cus-btn cus-btn--sm cus-btn--block ${primary ? 'cus-btn--solid' : ''}`} onClick={() => { run(); }}>{label}</button>
      ))}

      <Modal open={dialog === 'changes'} title={`Manager yêu cầu chỉnh sửa ${r.id}`} okText="Gửi yêu cầu chỉnh sửa" error={error}
        onClose={() => setDialog('')}
        onOk={() => { const res = d.managerRequestChanges(r.id, feedback, fields); if (res.ok) setDialog(''); else setError(res.message); }}>
        <div className="cus-field">
          <label htmlFor="demo-fb">Góp ý cho khách hàng *</label>
          <textarea id="demo-fb" className="cus-textarea" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="VD: Ngày đã chọn đội xe kín lịch, vui lòng chọn ngày khác." />
        </div>
        <span className="cus-eyebrow">Khách hàng được sửa</span>
        <div className="cus-btn-row" style={{ marginTop: 6 }}>
          {(Object.keys(FIELD_LABEL) as RequestField[]).map((f) => (
            <button key={f} type="button" className={`cus-chip ${fields.includes(f) ? 'on' : ''}`} onClick={() => toggleField(f)}>{FIELD_LABEL[f]}</button>
          ))}
        </div>
      </Modal>

      <ReasonModal open={dialog === 'reject'} title={`Manager từ chối ${r.id}`} okText="Từ chối" danger label="Lý do từ chối *"
        onClose={() => setDialog('')} onSubmit={(reason) => d.managerReject(r.id, reason).ok} />

      <Modal open={dialog === 'supplement'} title={`Specialist yêu cầu bổ sung • ${r.id}`} okText="Gửi yêu cầu bổ sung" error={error}
        onClose={() => setDialog('')}
        onOk={() => {
          const scope = ['invite', 'raceReg', 'ataCarnet'].includes(supKey) ? '' : supHorse;
          const res = d.specialistAskSupplement(r.id, scope, supKey, supReason);
          if (res.ok) setDialog(''); else setError(res.message);
        }}>
        <div className="cus-field">
          <label htmlFor="demo-sup-key">Giấy tờ cần bổ sung</label>
          <select id="demo-sup-key" className="cus-select" value={supKey} onChange={(e) => setSupKey(e.target.value as DocKey)}>
            {FILE_DOC_KEYS.map((k) => <option key={k} value={k}>{DOC_NAME[k]}</option>)}
          </select>
        </div>
        {!['invite', 'raceReg', 'ataCarnet'].includes(supKey) && (
          <div className="cus-field">
            <label htmlFor="demo-sup-horse">Ngựa</label>
            <select id="demo-sup-horse" className="cus-select" value={supHorse} onChange={(e) => setSupHorse(e.target.value)}>
              {pickedHorses(r).map((id) => <option key={id} value={id}>{horses.find((h) => h.id === id)?.name ?? id}</option>)}
            </select>
          </div>
        )}
        <div className="cus-field">
          <label htmlFor="demo-sup-reason">Lý do *</label>
          <textarea id="demo-sup-reason" className="cus-textarea" rows={3} value={supReason} onChange={(e) => setSupReason(e.target.value)}
            placeholder="VD: Giấy chứng nhận sức khỏe phải cấp trong vòng 7 ngày trước khởi hành." />
        </div>
      </Modal>
    </div>
  );
};

export default DemoPanel;
