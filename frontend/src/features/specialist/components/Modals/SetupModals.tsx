import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useSpecialist } from '../../hooks/useSpecialist';
import type { CountryCode, Direction, DocGroup, DocScope, DocType, Provider, RegPackage, Regulation, RequirementLine, RequirementLevel, RequirementStage, TransportMode } from '../../types';
import { COUNTRY_VI, DIRECTION_VI, GROUP_VI, LEVEL_VI, MODE_VI, PROVIDER_VI, SCOPE_VI, STAGE_VI, pkgEnds, pkgName, regFor, ruleLabel, today } from '../../hooks/specialistRules';

const keys = <T extends string>(o: Record<T, string>) => Object.keys(o) as T[];

// ---------------------------------------------------------------------------
// Loại giấy tờ
// ---------------------------------------------------------------------------
export const DocTypeModal: React.FC<{ open: boolean; value?: DocType; onClose: () => void }> = ({ open, value, onClose }) => {
  const { actions } = useSpecialist();
  const blank: DocType = { id: '', name: '', group: 'CUSTOMS', scope: 'PER_TRIP', provider: 'CBN', validityDays: 30, status: 'ACTIVE' };
  const [f, setF] = useState<DocType>(blank);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setF(value ? { ...value } : blank); setError(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = () => { const r = actions.saveDocType(f); if (r.ok) onClose(); else setError(r.message); };
  return (
    <Modal open={open} title={value ? `Sửa loại giấy tờ ${value.id}` : 'Thêm loại giấy tờ'} okText="Lưu" onClose={onClose} onOk={submit} error={error}>
      <div className="spc-field"><label htmlFor="dt-name">Tên loại giấy tờ *</label><input id="dt-name" className="spc-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="spc-modal__grid">
        <div className="spc-field"><label htmlFor="dt-group">Nhóm</label>
          <select id="dt-group" className="spc-select" value={f.group} onChange={(e) => setF({ ...f, group: e.target.value as DocGroup })}>{keys(GROUP_VI).map((k) => <option key={k} value={k}>{GROUP_VI[k]}</option>)}</select></div>
        <div className="spc-field"><label htmlFor="dt-valid">Hiệu lực mặc định (ngày)</label>
          <input id="dt-valid" className="spc-input" type="number" min={0} value={f.validityDays ?? ''} placeholder="Theo hạn trên giấy tờ" onChange={(e) => setF({ ...f, validityDays: e.target.value ? Number(e.target.value) : null })} /></div>
        <div className="spc-field"><label htmlFor="dt-prov">Bên cung cấp mặc định</label>
          <select id="dt-prov" className="spc-select" value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value as Provider })}>{keys(PROVIDER_VI).map((k) => <option key={k} value={k}>{PROVIDER_VI[k]}</option>)}</select></div>
        <div className="spc-field"><label htmlFor="dt-scope">Phạm vi mặc định</label>
          <select id="dt-scope" className="spc-select" value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value as DocScope })}>{keys(SCOPE_VI).map((k) => <option key={k} value={k}>{SCOPE_VI[k]}</option>)}</select></div>
      </div>
      <p className="spc-muted">Bên cung cấp và phạm vi là giá trị mặc định khi thêm loại giấy tờ này vào một yêu cầu; có thể chỉnh trong từng yêu cầu.</p>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Yêu cầu theo quốc gia / hướng (danh sách dòng yêu cầu)
// ---------------------------------------------------------------------------
export const RegulationModal: React.FC<{ open: boolean; value?: Regulation; onClose: () => void }> = ({ open, value, onClose }) => {
  const { docTypes, actions } = useSpecialist();
  const blank: Regulation = { id: '', country: 'VN', direction: 'EXPORT', lines: [], note: '', v: 1, effectiveFrom: today(), status: 'ACTIVE' };
  const [f, setF] = useState<Regulation>(blank);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setF(value ? JSON.parse(JSON.stringify(value)) : blank); setError(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeTypes = docTypes.filter((d) => d.status === 'ACTIVE');
  const setLine = (i: number, patch: Partial<RequirementLine>) => setF((x) => ({ ...x, lines: x.lines.map((l, k) => (k === i ? { ...l, ...patch } : l)) }));
  const addLine = () => {
    const t = activeTypes.find((d) => !f.lines.some((l) => l.typeId === d.id));
    if (!t) return setError('Đã thêm mọi loại giấy tờ.');
    setF((x) => ({ ...x, lines: [...x.lines, { typeId: t.id, provider: t.provider, scope: t.scope, level: 'REQUIRED', stage: t.group === 'IDENTITY' ? 'BEFORE_SUBMIT' : 'BEFORE_DEPART', condition: '' }] }));
  };
  const submit = () => { const r = actions.saveRegulation(f); if (r.ok) onClose(); else setError(r.message); };
  return (
    <Modal open={open} title={value ? `Sửa yêu cầu ${value.id} (v${value.v})` : 'Thêm yêu cầu theo quốc gia/tuyến'} okText="Lưu yêu cầu" onClose={onClose} onOk={submit} error={error} wide>
      <div className="spc-modal__grid">
        <div className="spc-field"><label htmlFor="rg-c">Quốc gia</label>
          <select id="rg-c" className="spc-select" value={f.country} disabled={!!value} onChange={(e) => setF({ ...f, country: e.target.value as CountryCode })}>{keys(COUNTRY_VI).map((k) => <option key={k} value={k}>{COUNTRY_VI[k]}</option>)}</select></div>
        <div className="spc-field"><label htmlFor="rg-d">Hướng</label>
          <select id="rg-d" className="spc-select" value={f.direction} disabled={!!value} onChange={(e) => setF({ ...f, direction: e.target.value as Direction })}>{keys(DIRECTION_VI).map((k) => <option key={k} value={k}>{DIRECTION_VI[k]}</option>)}</select></div>
      </div>
      <div className="spc-field"><label htmlFor="rg-note">Ghi chú</label><textarea id="rg-note" className="spc-textarea" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
      <div className="spc-eyebrow">Giấy tờ yêu cầu</div>
      <div className="spc-lines">
        {f.lines.map((l, i) => (
          <div key={i} className="spc-line">
            <select className="spc-select" value={l.typeId} aria-label="Loại giấy tờ" onChange={(e) => setLine(i, { typeId: e.target.value })}>
              {docTypes.map((d) => <option key={d.id} value={d.id} disabled={d.status !== 'ACTIVE' && d.id !== l.typeId}>{d.name}</option>)}
            </select>
            <select className="spc-select" value={l.provider} aria-label="Bên cung cấp" onChange={(e) => setLine(i, { provider: e.target.value as Provider })}>{keys(PROVIDER_VI).map((k) => <option key={k} value={k}>{PROVIDER_VI[k]}</option>)}</select>
            <select className="spc-select" value={l.scope} aria-label="Phạm vi" onChange={(e) => setLine(i, { scope: e.target.value as DocScope })}>{keys(SCOPE_VI).map((k) => <option key={k} value={k}>{SCOPE_VI[k]}</option>)}</select>
            <select className="spc-select" value={l.level} aria-label="Mức độ" onChange={(e) => setLine(i, { level: e.target.value as RequirementLevel })}>{keys(LEVEL_VI).map((k) => <option key={k} value={k}>{LEVEL_VI[k]}</option>)}</select>
            <select className="spc-select" value={l.stage} aria-label="Giai đoạn" onChange={(e) => setLine(i, { stage: e.target.value as RequirementStage })}>{keys(STAGE_VI).map((k) => <option key={k} value={k}>{STAGE_VI[k]}</option>)}</select>
            <input className="spc-input" value={l.condition} placeholder="Điều kiện áp dụng" aria-label="Điều kiện" onChange={(e) => setLine(i, { condition: e.target.value })} />
            <button type="button" className="spc-btn spc-btn--sm spc-btn--danger" onClick={() => setF((x) => ({ ...x, lines: x.lines.filter((_, k) => k !== i) }))}>Bỏ</button>
          </div>
        ))}
        {!f.lines.length && <p className="spc-muted">Chưa có giấy tờ nào.</p>}
      </div>
      <button type="button" className="spc-btn spc-btn--sm" style={{ marginTop: 8 }} onClick={addLine}>+ Thêm giấy tờ</button>
      {value && <p className="spc-muted" style={{ marginTop: 10 }}>Nếu yêu cầu đã được chuyến nào áp dụng, lưu sẽ tạo phiên bản mới; chuyến cũ giữ phiên bản đã chụp.</p>}
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Bộ yêu cầu hồ sơ
// ---------------------------------------------------------------------------
const ALL_RULES: Array<[CountryCode, Direction]> = (Object.keys(COUNTRY_VI) as CountryCode[]).flatMap((c) => (['EXPORT', 'IMPORT', 'DOMESTIC'] as Direction[]).map((d) => [c, d] as [CountryCode, Direction]));

export const PackageModal: React.FC<{ open: boolean; value?: RegPackage; onClose: () => void }> = ({ open, value, onClose }) => {
  const { data, actions } = useSpecialist();
  const blank: RegPackage = { id: '', name: '', items: [], origin: 'VN', dest: 'VN', modes: ['ROAD'], note: '', v: 1, effectiveFrom: today(), status: 'ACTIVE' };
  const [f, setF] = useState<RegPackage>(blank);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setF(value ? JSON.parse(JSON.stringify(value)) : blank); setError(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const has = (x: [CountryCode, Direction]) => f.items.some((y) => y[0] === x[0] && y[1] === x[1]);
  const toggle = (x: [CountryCode, Direction]) => setF((p) => {
    const items = has(x) ? p.items.filter((y) => !(y[0] === x[0] && y[1] === x[1])) : [...p.items, x];
    const [o, d] = pkgEnds(items);
    return { ...p, items, origin: o, dest: d, name: p.name && value ? p.name : pkgName(items) };
  });
  const options = ALL_RULES.filter((x) => regFor(data, x[0], x[1]) || has(x));
  const submit = () => { const r = actions.savePackage(f); if (r.ok) onClose(); else setError(r.message); };
  return (
    <Modal open={open} title={value ? `Sửa bộ yêu cầu ${value.id} (v${value.v})` : 'Thêm bộ yêu cầu hồ sơ'} okText="Lưu bộ yêu cầu" onClose={onClose} onOk={submit} error={error} wide>
      <div className="spc-field"><label htmlFor="rp-name">Tên bộ *</label><input id="rp-name" className="spc-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="spc-eyebrow">Yêu cầu trong bộ (theo quốc gia/hướng đã cấu hình)</div>
      <div className="spc-chips">
        {options.map((x) => (
          <button key={x.join('-')} type="button" className={`spc-chip ${has(x) ? 'on' : ''}`} onClick={() => toggle(x)}>{ruleLabel(x[0], x[1])}{regFor(data, x[0], x[1]) ? ` v${regFor(data, x[0], x[1])!.v}` : ''}</button>
        ))}
      </div>
      <p className="spc-muted" style={{ marginTop: 6 }}>Tuyến: {COUNTRY_VI[f.origin]} → {COUNTRY_VI[f.dest]}</p>
      <div className="spc-eyebrow" style={{ marginTop: 12 }}>Phương thức áp dụng</div>
      <div className="spc-chips">
        {(['ROAD', 'AIR'] as TransportMode[]).map((m) => (
          <button key={m} type="button" className={`spc-chip ${f.modes.includes(m) ? 'on' : ''}`}
            onClick={() => setF((p) => ({ ...p, modes: p.modes.includes(m) ? p.modes.filter((x) => x !== m) : [...p.modes, m] }))}>{MODE_VI[m]}</button>
        ))}
      </div>
      <div className="spc-field" style={{ marginTop: 12 }}><label htmlFor="rp-note">Ghi chú</label><textarea id="rp-note" className="spc-textarea" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
    </Modal>
  );
};
