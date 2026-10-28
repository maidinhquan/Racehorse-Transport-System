import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import type { ActualCost, ActualKey, ExtraCost, Payer, Staff } from '../../types';
import {
  ACTUAL_LABEL,
  PAYER_LABEL,
} from '../../hooks/managerRules';

// ---------------------------------------------------------------------------
// Yêu cầu khách hàng chỉnh sửa
// ---------------------------------------------------------------------------
export const RevisionModal: React.FC<{ open: boolean; requestId: string; onClose: () => void; onSubmit: (feedback: string) => boolean | Promise<boolean> }> = ({ open, requestId, onClose, onSubmit }) => {
  const [text, setText] = useState(''); const [error, setError] = useState('');
  useEffect(() => { if (open) { setText(''); setError(''); } }, [open]);
  return <Modal open={open} title={`Yêu cầu chỉnh sửa • ${requestId}`} okText="Gửi yêu cầu chỉnh sửa" onClose={onClose} error={error} onOk={async () => {
    if (text.trim().length < 10) return setError('Nhập góp ý ít nhất 10 ký tự.');
    if (await onSubmit(text.trim())) onClose();
  }}><p>Ghi rõ nội dung cần khách bổ sung. Khách xem góp ý, cập nhật và gửi lại để xét duyệt.</p>
    <div className="mgr-field"><label htmlFor="mgr-rev-text">Góp ý gửi khách hàng *</label><textarea id="mgr-rev-text" className="mgr-textarea" rows={4} value={text} onChange={event => setText(event.target.value)} /></div>
  </Modal>;
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
        {staff.filter((s) => s.role === role).map((s) => <option key={s.id} value={s.id}>{s.name}{s.load != null ? ` • đang phụ trách ${s.load} chuyến` : ''}</option>)}
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
