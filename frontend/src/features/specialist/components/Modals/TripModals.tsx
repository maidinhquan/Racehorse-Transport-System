import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { DateField } from '../DateField/DateField';
import { Note } from '../Common/Common';
import { useSpecialist } from '../../hooks/useSpecialist';
import type { ClearanceResult, CustomerDocKey, SpecTrip } from '../../types';
import {
  CHECKLIST_LABEL,
  CUSTOMER_DOC_NAME,
  LEVEL_VI,
  STAGE_VI,
  addDays,
  checklist,
  fmtDate,
  horseName,
  itemName,
  pkgWhyNot,
  snapshot,
  suggestPackage,
  today,
  typeName,
} from '../../hooks/specialistRules';

// ---------------------------------------------------------------------------
// Yêu cầu khách bổ sung (kèm lý do, hạn nộp tùy chọn)
// ---------------------------------------------------------------------------
export const SupplementModal: React.FC<{ open: boolean; trip: SpecTrip; docKey: CustomerDocKey; scope: string; onClose: () => void }> = ({ open, trip, docKey, scope, onClose }) => {
  const { actions } = useSpecialist();
  const [reason, setReason] = useState('');
  const [due, setDue] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setReason(''); setDue(''); setError(''); } }, [open]);
  const submit = () => { const r = actions.requestCustomerDoc(trip.id, docKey, scope, reason, due); if (r.ok) onClose(); else setError(r.message); };
  return (
    <Modal open={open} title={`Yêu cầu bổ sung • ${CUSTOMER_DOC_NAME[docKey]}${scope !== 'request' ? ` – ${horseName(trip, scope)}` : ''}`} okText="Gửi yêu cầu cho khách" onClose={onClose} onOk={submit} error={error}>
      <p>Khách hàng thấy lý do này ngay trên giấy tờ trong cổng Khách hàng và tải lại tệp mới. Yêu cầu chỉ hoàn tất khi bạn duyệt bản mới.</p>
      <div className="spc-field">
        <label htmlFor="sup-reason">Lý do *</label>
        <textarea id="sup-reason" className="spc-textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="VD: Giấy chứng nhận sức khỏe phải cấp trong vòng 10 ngày trước khởi hành." />
      </div>
      <div className="spc-field">
        <label htmlFor="sup-due">Hạn nộp (không bắt buộc)</label>
        <DateField id="sup-due" value={due} min={today()} onChange={setDue} />
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Ghi nhận chứng từ CBN Transport (giấy phép, kiểm dịch, tờ khai…)
// ---------------------------------------------------------------------------
export const RecordDocModal: React.FC<{ open: boolean; trip: SpecTrip; typeId?: string; horseId?: string | null; onClose: () => void }> = ({ open, trip, typeId, horseId, onClose }) => {
  const { data, actions } = useSpecialist();
  const cbnItems = useMemo(() => checklist(data, trip).items.filter((i) => i.provider === 'CBN' && !i.missingRule), [data, trip]);
  const [key, setKey] = useState('');
  const [form, setForm] = useState({ number: '', issuer: '', issuedAt: '', expiry: '', file: '' });
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    const first = typeId ? `${typeId}|${horseId ?? ''}` : cbnItems[0] ? `${cbnItems[0].typeId}|${cbnItems[0].horseId ?? ''}` : '';
    setKey(first);
    setForm({ number: '', issuer: '', issuedAt: today(), expiry: addDays(trip.eta.slice(0, 10), 30), file: '' });
    setError('');
  }, [open, typeId, horseId, cbnItems, trip.eta]);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = () => {
    const [t, h] = key.split('|');
    if (!t) return setError('Chọn loại chứng từ.');
    const r = actions.recordDocument({ tripId: trip.id, typeId: t, horseId: h || null, ...form });
    if (r.ok) onClose(); else setError(r.message);
  };
  return (
    <Modal open={open} title={`Ghi nhận chứng từ CBN • ${trip.id}`} okText="Lưu & chờ duyệt" onClose={onClose} onOk={submit} error={error} wide>
      <p>Chứng từ ghi nhận là bản ghi những gì cơ quan chức năng đã cấp; bản ghi tự nó không chứng minh lô hàng đã được chấp thuận. Sau khi lưu, chứng từ ở trạng thái chờ duyệt.</p>
      <div className="spc-modal__grid">
        <div className="spc-field" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="rd-type">Loại chứng từ *</label>
          <select id="rd-type" className="spc-select" value={key} onChange={(e) => setKey(e.target.value)}>
            {cbnItems.map((i) => <option key={`${i.typeId}|${i.horseId ?? ''}`} value={`${i.typeId}|${i.horseId ?? ''}`}>{itemName(data, trip, i)} • {CHECKLIST_LABEL[i.status]}</option>)}
            {!cbnItems.length && <option value="">Checklist chưa có chứng từ CBN</option>}
          </select>
        </div>
        <div className="spc-field"><label htmlFor="rd-no">Số giấy tờ *</label><input id="rd-no" className="spc-input" value={form.number} onChange={(e) => set('number', e.target.value)} /></div>
        <div className="spc-field"><label htmlFor="rd-issuer">Cơ quan cấp *</label><input id="rd-issuer" className="spc-input" value={form.issuer} onChange={(e) => set('issuer', e.target.value)} placeholder="VD: Cục Thú y" /></div>
        <div className="spc-field"><label htmlFor="rd-issued">Ngày cấp *</label><DateField id="rd-issued" value={form.issuedAt} max={today()} onChange={(v) => set('issuedAt', v)} /></div>
        <div className="spc-field"><label htmlFor="rd-exp">Ngày hết hạn *</label><DateField id="rd-exp" value={form.expiry} min={form.issuedAt || undefined} onChange={(v) => set('expiry', v)} /></div>
        <div className="spc-field" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="rd-file">Tệp scan *</label>
          <div className="spc-file-row">
            <input id="rd-file" className="spc-input" value={form.file} onChange={(e) => set('file', e.target.value)} placeholder="ten-tep.pdf" />
            <label className="spc-btn spc-btn--sm">Chọn tệp<input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) set('file', f.name); e.target.value = ''; }} /></label>
          </div>
        </div>
      </div>
      {form.expiry && form.expiry < trip.eta.slice(0, 10) && <Note tone="yellow" title="Hết hạn trước khi chuyến đến nơi">Chứng từ này sẽ không duyệt được; cần bản có hiệu lực tới {fmtDate(trip.eta.slice(0, 10))}.</Note>}
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Bảo hiểm: ghi nhận + xác minh
// ---------------------------------------------------------------------------
export const InsuranceModal: React.FC<{ open: boolean; trip: SpecTrip; onClose: () => void }> = ({ open, trip, onClose }) => {
  const { actions } = useSpecialist();
  const [f, setF] = useState({ insurer: '', policy: '', validFrom: '', validTo: '', coverage: '100000' });
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    const i = trip.insurance;
    setF({ insurer: i?.insurer ?? 'Bảo hiểm Bảo Việt', policy: i?.policy ?? '', validFrom: i?.validFrom ?? trip.plannedDepart.slice(0, 10), validTo: i?.validTo ?? trip.eta.slice(0, 10), coverage: String(i?.coverage ?? 100000) });
    setError('');
  }, [open, trip]);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const submit = () => { const r = actions.saveInsurance(trip.id, { ...f, coverage: Number(f.coverage) }); if (r.ok) onClose(); else setError(r.message); };
  return (
    <Modal open={open} title={`Ghi nhận bảo hiểm • ${trip.id}`} okText="Lưu hợp đồng" onClose={onClose} onOk={submit} error={error}>
      <div className="spc-modal__grid">
        <div className="spc-field"><label htmlFor="in-co">Hãng bảo hiểm *</label><input id="in-co" className="spc-input" value={f.insurer} onChange={(e) => set('insurer', e.target.value)} /></div>
        <div className="spc-field"><label htmlFor="in-no">Số hợp đồng *</label><input id="in-no" className="spc-input" value={f.policy} onChange={(e) => set('policy', e.target.value)} /></div>
        <div className="spc-field"><label htmlFor="in-from">Hiệu lực từ *</label><DateField id="in-from" value={f.validFrom} onChange={(v) => set('validFrom', v)} /></div>
        <div className="spc-field"><label htmlFor="in-to">Hiệu lực đến *</label><DateField id="in-to" value={f.validTo} min={f.validFrom || undefined} onChange={(v) => set('validTo', v)} /></div>
        <div className="spc-field"><label htmlFor="in-cov">Số tiền bảo hiểm (USD) *</label><input id="in-cov" type="number" min={1} className="spc-input" value={f.coverage} onChange={(e) => set('coverage', e.target.value)} /></div>
      </div>
    </Modal>
  );
};

export const VerifyInsuranceModal: React.FC<{ open: boolean; trip: SpecTrip; onClose: () => void }> = ({ open, trip, onClose }) => {
  const { actions } = useSpecialist();
  const [checks, setChecks] = useState([false, false, false]);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setChecks([false, false, false]); setError(''); } }, [open]);
  const labels = ['Tất cả ngựa trong chuyến đều được bảo hiểm', 'Thời hạn bao phủ từ khi nhận ngựa đến khi bàn giao', 'Phạm vi và điều kiện bảo hiểm phù hợp'];
  const submit = () => {
    if (checks.some((c) => !c)) return setError('Phải kiểm tra đủ ba điều kiện.');
    const r = actions.verifyInsurance(trip.id); if (r.ok) onClose(); else setError(r.message);
  };
  return (
    <Modal open={open} title={`Xác minh bảo hiểm • ${trip.id}`} okText="Xác minh" onClose={onClose} onOk={submit} error={error}>
      <p>{trip.insurance?.insurer} • {trip.insurance?.policy} • {fmtDate(trip.insurance?.validFrom)} – {fmtDate(trip.insurance?.validTo)}</p>
      {labels.map((l, i) => (
        <label key={l} className="spc-check"><input type="checkbox" checked={checks[i]} onChange={(e) => setChecks((c) => c.map((x, k) => (k === i ? e.target.checked : x)))} /> {l}</label>
      ))}
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Áp dụng / cập nhật bộ yêu cầu hồ sơ (xem trước thay đổi checklist)
// ---------------------------------------------------------------------------
export const ApplySetModal: React.FC<{ open: boolean; trip: SpecTrip; onClose: () => void }> = ({ open, trip, onClose }) => {
  const { data, actions } = useSpecialist();
  const fit = data.packages.filter((p) => !pkgWhyNot(p, trip));
  const [pkgId, setPkgId] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setPkgId(suggestPackage(data, trip)?.id ?? fit[0]?.id ?? ''); setError(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const p = data.packages.find((x) => x.id === pkgId);
  const diff = useMemo(() => {
    if (!p) return [];
    const before = checklist(data, trip).items, after = checklist(data, { ...trip, reqSet: snapshot(data, p, '') }).items;
    const k = (i: { typeId: string; horseId: string | null }) => `${i.typeId}|${i.horseId ?? ''}`;
    const bm = new Map(before.map((i) => [k(i), i])), rows: Array<[string, string, string]> = [];
    after.forEach((a) => {
      const b = bm.get(k(a));
      if (!b) rows.push(['Thêm', itemName(data, trip, a), `${LEVEL_VI[a.level]} • ${STAGE_VI[a.stage]}`]);
      else if (a.level !== b.level || a.stage !== b.stage) rows.push(['Thay đổi', itemName(data, trip, a), `${LEVEL_VI[b.level]} → ${LEVEL_VI[a.level]} • ${STAGE_VI[b.stage]} → ${STAGE_VI[a.stage]}`]);
      bm.delete(k(a));
    });
    bm.forEach((b) => rows.push(['Bỏ', itemName(data, trip, b), `${LEVEL_VI[b.level]} • ${STAGE_VI[b.stage]}`]));
    return rows;
  }, [p, data, trip]);
  const submit = () => { if (!pkgId) return setError('Chọn bộ yêu cầu.'); const r = actions.applyRequirementSet(trip.id, pkgId); if (r.ok) onClose(); else setError(r.message); };
  return (
    <Modal open={open} title={`${trip.reqSet ? 'Cập nhật' : 'Áp dụng'} bộ yêu cầu hồ sơ • ${trip.id}`} okText="Áp dụng bộ này" onClose={onClose} onOk={submit} error={error} wide>
      {!fit.length ? <Note tone="yellow" title="Chưa có bộ phù hợp">Tạo bộ yêu cầu cho tuyến và phương thức của chuyến trong Quy định & thiết lập.</Note> : (
        <>
          <div className="spc-field">
            <label htmlFor="ap-pkg">Bộ yêu cầu phù hợp với tuyến & phương thức</label>
            <select id="ap-pkg" className="spc-select" value={pkgId} onChange={(e) => setPkgId(e.target.value)}>
              {fit.map((x) => <option key={x.id} value={x.id}>{x.id} • {x.name} • v{x.v}{suggestPackage(data, trip)?.id === x.id ? ' (gợi ý)' : ''}</option>)}
            </select>
          </div>
          <div className="spc-eyebrow">Thay đổi checklist khi áp dụng</div>
          {diff.length ? (
            <table className="spc-table" style={{ marginTop: 6 }}>
              <thead><tr><th>Thay đổi</th><th>Mục</th><th>Chi tiết</th></tr></thead>
              <tbody>{diff.map(([a, n, d]) => <tr key={`${a}-${n}`}><td><b>{a}</b></td><td>{n}</td><td>{d}</td></tr>)}</tbody>
            </table>
          ) : <p className="spc-muted" style={{ marginTop: 6 }}>Không thay đổi mục nào so với checklist hiện tại.</p>}
          <p className="spc-muted" style={{ marginTop: 10 }}>Chuyến giữ bản chụp của bộ và phiên bản từng yêu cầu. Sửa bộ sau này không tự thay đổi chuyến.</p>
        </>
      )}
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Lịch kiểm dịch & kết quả thông quan
// ---------------------------------------------------------------------------
export const BookingModal: React.FC<{ open: boolean; trip: SpecTrip; onClose: () => void }> = ({ open, trip, onClose }) => {
  const { actions } = useSpecialist();
  const stations = trip.checkpoints.filter((c) => c.type === 'QUARANTINE_STATION').map((c) => c.name);
  const [station, setStation] = useState('');
  const [slot, setSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setStation(stations[0] ?? ''); setSlot(trip.plannedDepart.slice(0, 10)); setNotes(''); setError(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = () => { const r = actions.createBooking(trip.id, station, slot, notes); if (r.ok) onClose(); else setError(r.message); };
  return (
    <Modal open={open} title={`Đặt lịch kiểm dịch • ${trip.id}`} okText="Gửi yêu cầu đặt lịch" onClose={onClose} onOk={submit} error={error}>
      <div className="spc-field">
        <label htmlFor="bk-st">Trạm kiểm dịch *</label>
        <input id="bk-st" className="spc-input" list="bk-stations" value={station} onChange={(e) => setStation(e.target.value)} />
        <datalist id="bk-stations">{stations.map((s) => <option key={s} value={s} />)}</datalist>
      </div>
      <div className="spc-field"><label htmlFor="bk-slot">Ngày dự kiến *</label><DateField id="bk-slot" value={slot} min={today()} onChange={setSlot} /></div>
      <div className="spc-field"><label htmlFor="bk-notes">Ghi chú</label><textarea id="bk-notes" className="spc-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
    </Modal>
  );
};

export const ClearanceModal: React.FC<{ open: boolean; trip: SpecTrip; index: number; onClose: () => void }> = ({ open, trip, index, onClose }) => {
  const { actions } = useSpecialist();
  const [result, setResult] = useState<ClearanceResult>('PASSED');
  const [ref, setRef] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setResult('PASSED'); setRef(''); setError(''); } }, [open]);
  const submit = () => { const r = actions.recordClearance(trip.id, index, result, ref); if (r.ok) onClose(); else setError(r.message); };
  return (
    <Modal open={open} title={`Kết quả thông quan • ${trip.checkpoints[index]?.name ?? ''}`} okText="Ghi nhận kết quả" onClose={onClose} onOk={submit} error={error}>
      <p>Kết quả được nhập thủ công theo quyết định của cơ quan chức năng; bản demo chưa kết nối hệ thống hải quan / kiểm dịch.</p>
      <div className="spc-field">
        <label htmlFor="cl-res">Kết quả</label>
        <select id="cl-res" className="spc-select" value={result} onChange={(e) => setResult(e.target.value as ClearanceResult)}>
          <option value="PASSED">Đạt</option><option value="HELD">Bị giữ lại</option><option value="FAILED">Không đạt</option>
        </select>
      </div>
      <div className="spc-field"><label htmlFor="cl-ref">Số biên bản / mã quyết định *</label><input id="cl-ref" className="spc-input" value={ref} onChange={(e) => setRef(e.target.value)} /></div>
    </Modal>
  );
};

/** Modal một ô nhập (VD: mã xác nhận lịch kiểm dịch) */
export const InputModal: React.FC<{ open: boolean; title: string; label: string; okText?: string; onClose: () => void; onSubmit: (v: string) => { ok: boolean; message: string } }> = ({ open, title, label, okText, onClose, onSubmit }) => {
  const [v, setV] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setV(''); setError(''); } }, [open]);
  return (
    <Modal open={open} title={title} okText={okText} onClose={onClose} error={error} onOk={() => { const r = onSubmit(v); if (r.ok) onClose(); else setError(r.message); }}>
      <div className="spc-field"><label htmlFor="in-modal">{label}</label><input id="in-modal" className="spc-input" value={v} onChange={(e) => setV(e.target.value)} /></div>
    </Modal>
  );
};

/** Tên chứng từ dùng trong tiêu đề */
export const docTitle = (data: Parameters<typeof typeName>[0], trip: SpecTrip, typeId: string, horseId: string | null) =>
  `${typeName(data, typeId)}${horseId ? ` – ${horseName(trip, horseId)}` : ''}`;
