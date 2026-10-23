import { downloadFile } from '../../../../shared/api/downloadFile';
import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import type { ActualCost, ActualKey, ExtraCost, Payer, RevisionField, Staff, Transaction, TransportRequest } from '../../types';
import {
  ACTUAL_LABEL,
  METHOD_LABEL,
  PAYER_LABEL,
  PAYMENT_TYPE_LABEL,
  REVISION_FIELD_LABEL,
  depositOf,
  fmtDateTime,
  fmtMoney,
} from '../../hooks/managerRules';
import type { PaymentConfirmation } from '../../../../shared/api/flow1';
import { DateTimeField } from '../DateField/DateTimeField';

// ---------------------------------------------------------------------------
// Yêu cầu khách hàng chỉnh sửa
// ---------------------------------------------------------------------------
export const RevisionModal: React.FC<{ open: boolean; requestId: string; onClose: () => void; onSubmit: (feedback: string, fields: RevisionField[]) => boolean | Promise<boolean> }> = ({ open, requestId, onClose, onSubmit }) => {
  const [text, setText] = useState('');
  const [fields, setFields] = useState<RevisionField[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setText(''); setFields([]); setError(''); } }, [open]);
  const toggle = (f: RevisionField) => setFields((x) => (x.includes(f) ? x.filter((y) => y !== f) : [...x, f]));
  const submit = async () => {
    if (!fields.length) return setError('Chọn ít nhất một mục cần sửa.');
    if (text.trim().length < 10) return setError('Nhập góp ý cho khách hàng (ít nhất 10 ký tự).');
    if (await onSubmit(text.trim(), fields)) onClose();
  };
  return (
    <Modal open={open} title={`Yêu cầu chỉnh sửa • ${requestId}`} okText="Gửi yêu cầu chỉnh sửa" onClose={onClose} onOk={submit} error={error}>
      <p>Khách hàng chỉ sửa được các mục được chọn. Sau khi khách gửi lại, yêu cầu quay về hàng chờ xét duyệt.</p>
      <div className="mgr-field">
        <label>Mục khách cần sửa *</label>
        <div className="mgr-chips">
          {(Object.keys(REVISION_FIELD_LABEL) as RevisionField[]).map((f) => (
            <button key={f} type="button" className={`mgr-chip ${fields.includes(f) ? 'on' : ''}`} aria-pressed={fields.includes(f)} onClick={() => toggle(f)}>{REVISION_FIELD_LABEL[f]}</button>
          ))}
        </div>
      </div>
      <div className="mgr-field">
        <label htmlFor="mgr-rev-text">Góp ý gửi khách hàng *</label>
        <textarea id="mgr-rev-text" className="mgr-textarea" rows={4} value={text} onChange={(e) => { setText(e.target.value); setError(''); }}
          placeholder="VD: Ngày 08/10 đội xe đã kín lịch, vui lòng chọn từ 12/10 trở đi…" />
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Phân công Specialist + Coordinator
// ---------------------------------------------------------------------------
export const DeployModal: React.FC<{ open: boolean; tripId: string; staff: Staff[]; onClose: () => void; onSubmit: (specialistId: string, coordinatorId: string) => boolean | Promise<boolean> }> = ({ open, tripId, staff, onClose, onSubmit }) => {
  const [sp, setSp] = useState('');
  const [co, setCo] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setSp(''); setCo(''); setConfirm(false); setError(''); } }, [open]);
  const pick = (role: Staff['role'], value: string, set: (v: string) => void, label: string, id: string) => (
    <div className="mgr-field">
      <label htmlFor={id}>{label} *</label>
      <select id={id} className="mgr-select" value={value} onChange={(e) => { set(e.target.value); setError(''); }}>
        <option value="">— Chọn —</option>
        {staff.filter((s) => s.role === role).map((s) => <option key={s.id} value={s.id}>{s.name} • đang phụ trách {s.load} chuyến</option>)}
      </select>
    </div>
  );
  const submit = async () => {
    if (!sp || !co) return setError('Chọn một Transport Specialist và một Fleet Coordinator.');
    if (!confirm) return setError('Tích ô xác nhận để khóa phân công.');
    if (await onSubmit(sp, co)) onClose();
  };
  return (
    <Modal open={open} title={`Phân công người phụ trách • ${tripId}`} okText="Giao việc & xác nhận triển khai" onClose={onClose} onOk={submit} error={error}>
      <p>Chuyến chỉ được triển khai chính thức sau khi Manager phân công. Nhân viên nhận chuyến ngay, không cần xác nhận nhận việc.</p>
      {pick('TRANSPORT_SPECIALIST', sp, setSp, 'Transport Specialist (hồ sơ, bảo hiểm, kiểm dịch)', 'mgr-dep-sp')}
      {pick('FLEET_ROUTE_COORDINATOR', co, setCo, 'Fleet Coordinator (tuyến, xe, nhân sự)', 'mgr-dep-co')}
      <label className="mgr-check"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} /> Tôi xác nhận triển khai chuyến và khóa phân công.</label>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Xác minh chuyển khoản
// ---------------------------------------------------------------------------
export const VerifyPaymentModal: React.FC<{
  tx?: Transaction; request?: TransportRequest; onClose: () => void;
  onVerify: (id: string, body: PaymentConfirmation) => Promise<boolean>; onReject: (id: string, reason: string) => Promise<boolean>;
}> = ({ tx, request, onClose, onVerify, onReject }) => {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [receivedAt, setReceivedAt] = useState('');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<'view' | 'reject'>('view');
  const [checked, setChecked] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setAmount(''); setReference(''); setReceivedAt(''); setNote(''); setMode('view'); setChecked(false); setReason(''); setError(''); }, [tx?.id]);
  if (!tx || !request) return null;
  const expected = tx.type === 'DEPOSIT' ? depositOf(request) : tx.amount;
  const mismatch = tx.amount !== expected;
  return (
    <Modal open title={`Xác minh chuyển khoản • ${tx.id}`} wide onClose={onClose}
      okText={mode === 'view' ? 'Xác nhận đã nhận đủ tiền' : 'Từ chối chứng từ'} danger={mode === 'reject'}
      onOk={async () => {
        if (mode === 'reject') { if (reason.trim().length < 10) return setError('Nhập lý do từ chối (ít nhất 10 ký tự).'); if (await onReject(tx.id, reason)) onClose(); return; }
        if (!checked) return setError('Tích ô xác nhận đã đối chiếu sao kê ngân hàng.');
        if (!Number.isInteger(Number(amount)) || Number(amount) <= 0 || !reference.trim() || !receivedAt) return setError('Điền số tiền thực nhận, mã giao dịch và thời điểm nhận tiền.');
        if (await onVerify(tx.id, { confirmedAmount: Number(amount), transactionCode: reference.trim(), receivedAt, note: note.trim() })) onClose();
      }} error={error}>
      <div className="mgr-kv" style={{ marginBottom: 14 }}>
        <div><span>Yêu cầu</span><b>{tx.requestId}</b></div>
        <div><span>Loại</span><b>{PAYMENT_TYPE_LABEL[tx.type]} • {METHOD_LABEL[tx.method]}</b></div>
        <div><span>Khách khai báo</span><b>{fmtMoney(tx.amount)}</b></div>
        <div><span>Số tiền phải thu</span><b className={mismatch ? 'mgr-bad' : ''}>{fmtMoney(expected)}</b></div>
        <div><span>Mã tham chiếu</span><b>{tx.ref ?? '—'}</b></div>
        <div><span>Thời điểm khai báo</span><b>{fmtDateTime(tx.createdAt)}</b></div>
      </div>
      {tx.receipt && <p>Chứng từ: <button type="button" className="mgr-link" onClick={() => downloadFile(tx.receipt!).catch(error => setError(error.message))}>{tx.receipt}</button></p>}
      {mismatch && <p className="mgr-bad">Số tiền khai báo khác số tiền phải thu – kiểm tra kỹ sao kê trước khi xác nhận.</p>}
      <div className="mgr-tabs" style={{ marginBottom: 10 }}>
        <button type="button" className={mode === 'view' ? 'on' : ''} onClick={() => { setMode('view'); setError(''); }}>Xác nhận</button>
        <button type="button" className={mode === 'reject' ? 'on' : ''} onClick={() => { setMode('reject'); setError(''); }}>Từ chối</button>
      </div>
      {mode === 'view' && <div className="mgr-form-grid">
        <div className="mgr-field"><label htmlFor="received-amount">Số tiền thực nhận (VND) *</label><input id="received-amount" className="mgr-input" type="number" min={1} step={1} value={amount} onChange={e => setAmount(e.target.value)} /></div>
        <div className="mgr-field"><label htmlFor="received-reference">Mã giao dịch ngân hàng *</label><input id="received-reference" className="mgr-input" value={reference} onChange={e => setReference(e.target.value)} /></div>
        <div className="mgr-field"><label htmlFor="received-at">Thời điểm nhận tiền *</label><DateTimeField id="received-at" value={receivedAt} onChange={setReceivedAt} /></div>
        <div className="mgr-field"><label htmlFor="received-note">Ghi chú đối soát</label><input id="received-note" className="mgr-input" value={note} onChange={e => setNote(e.target.value)} /></div>
      </div>}
      {mode === 'view'
        ? <label className="mgr-check"><input type="checkbox" checked={checked} onChange={(e) => { setChecked(e.target.checked); setError(''); }} /> Tôi đã đối chiếu sao kê ngân hàng: tiền đã về tài khoản CBN Transport với đúng mã tham chiếu.</label>
        : (
          <div className="mgr-field">
            <label htmlFor="mgr-tx-reason">Lý do từ chối *</label>
            <textarea id="mgr-tx-reason" className="mgr-textarea" rows={3} value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }}
              placeholder="VD: Chưa thấy giao dịch trên sao kê ngày 04/10; vui lòng gửi lại ủy nhiệm chi rõ nét." />
          </div>
        )}
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Nhập chi phí thực tế của chuyến
// ---------------------------------------------------------------------------
const KEYS = Object.keys(ACTUAL_LABEL) as ActualKey[];
const emptyCosts = (): Record<ActualKey, number> => Object.fromEntries(KEYS.map((k) => [k, 0])) as Record<ActualKey, number>;

export const ActualCostModal: React.FC<{ open: boolean; tripId: string; current?: ActualCost; onClose: () => void; onSubmit: (c: ActualCost['costs'], extra: ExtraCost[]) => boolean | Promise<boolean> }> = ({ open, tripId, current, onClose, onSubmit }) => {
  const [costs, setCosts] = useState<Record<ActualKey, number>>(emptyCosts());
  const [extra, setExtra] = useState<ExtraCost[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setCosts(current ? { ...current.costs } : emptyCosts());
    setExtra(current ? current.extra.map((e) => ({ ...e })) : []);
    setError('');
  }, [open, current]);
  const setExtraAt = (i: number, patch: Partial<ExtraCost>) => setExtra((x) => x.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const submit = async () => {
    if (KEYS.some((k) => !(costs[k] >= 0))) return setError('Chi phí phải là số không âm.');
    if (extra.some((e) => !e.label.trim() || !(e.amount > 0))) return setError('Khoản phát sinh cần tên và số tiền lớn hơn 0.');
    if (onSubmit(costs, extra)) onClose();
  };
  return (
    <Modal open={open} title={`Chi phí thực tế • ${tripId}`} wide okText="Lưu chi phí" onClose={onClose} onOk={submit} error={error}>
      <p>Nhập chi phí thực tế (USD) từ hóa đơn của chuyến. Khoản phát sinh do khách hàng hoặc bảo hiểm chi trả không tính vào chi phí của công ty.</p>
      <div className="mgr-modal__grid">
        {KEYS.map((k) => (
          <div className="mgr-field" key={k}>
            <label htmlFor={`mgr-ac-${k}`}>{ACTUAL_LABEL[k]}</label>
            <input id={`mgr-ac-${k}`} className="mgr-input" type="number" min={0} step={10} value={costs[k]}
              onChange={(e) => { setCosts((c) => ({ ...c, [k]: Number(e.target.value) })); setError(''); }} />
          </div>
        ))}
      </div>
      <div className="mgr-between" style={{ marginTop: 6 }}>
        <b>Khoản phát sinh</b>
        <button type="button" className="mgr-btn mgr-btn--sm" onClick={() => setExtra((x) => [...x, { label: '', amount: 0, payer: 'COMPANY' }])}>＋ Thêm khoản</button>
      </div>
      {extra.map((e, i) => (
        <div key={i} className="mgr-form-grid" style={{ gridTemplateColumns: '2fr 1fr 1fr auto', marginTop: 8, alignItems: 'center' }}>
          <input className="mgr-input" aria-label="Tên khoản" placeholder="VD: Phí lưu bãi" value={e.label} onChange={(ev) => setExtraAt(i, { label: ev.target.value })} />
          <input className="mgr-input" aria-label="Số tiền" type="number" min={0} value={e.amount} onChange={(ev) => setExtraAt(i, { amount: Number(ev.target.value) })} />
          <select className="mgr-select" aria-label="Bên chi trả" value={e.payer} onChange={(ev) => setExtraAt(i, { payer: ev.target.value as Payer })}>
            {(Object.keys(PAYER_LABEL) as Payer[]).map((p) => <option key={p} value={p}>{PAYER_LABEL[p]}</option>)}
          </select>
          <button type="button" className="mgr-link" onClick={() => setExtra((x) => x.filter((_, j) => j !== i))}>Xóa</button>
        </div>
      ))}
    </Modal>
  );
};
