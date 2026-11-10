import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useSpecialist } from '../../hooks/useSpecialist';
import type { CountryCode, Direction, DocGroup, DocScope, DocType, Provider, RegPackage, Regulation, RequirementLine, TransportMode } from '../../types';
import {
  DIRECTION_VI,
  MODE_VI,
  PROVIDER_VI,
  SCOPE_VI,
  getAllCountries,
  getAllGroups,
  regFor,
  saveCustomCountry,
  saveCustomGroup,
  today,
} from '../../hooks/specialistRules';
import { TripStatusBadge } from '../TripStatusBadge/TripStatusBadge';

const keys = <T extends string>(o: Record<T, string>) => Object.keys(o) as T[];

// ---------------------------------------------------------------------------
// Thêm nhóm giấy tờ mới
// ---------------------------------------------------------------------------
export const DocGroupModal: React.FC<{ open: boolean; onClose: () => void; onSaved?: (key: string, name: string) => void }> = ({ open, onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [allGroups, setAllGroups] = useState(() => getAllGroups());

  useEffect(() => {
    if (open) {
      setName('');
      setError('');
      setAllGroups(getAllGroups());
    }
  }, [open]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Vui lòng nhập tên nhóm giấy tờ.');
      return;
    }
    const key = saveCustomGroup(trimmed);
    onSaved?.(key, trimmed);
    onClose();
  };

  return (
    <Modal open={open} title="Thêm nhóm giấy tờ mới" okText="Tạo nhóm" onClose={onClose} onOk={submit} error={error}>
      <div className="spc-field">
        <label htmlFor="dg-name">Tên nhóm giấy tờ *</label>
        <input
          id="dg-name"
          className="spc-input"
          placeholder="VD: Bảo hiểm, Giấy tờ xuất nhập cảnh, Vận tải…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div className="spc-field" style={{ marginTop: 12 }}>
        <label>Các nhóm hiện có ({Object.keys(allGroups).length}):</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {Object.values(allGroups).map((lbl) => (
            <span key={lbl} className="spc-badge spc-badge--muted" style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, background: '#f1f5f9' }}>
              {lbl}
            </span>
          ))}
        </div>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Thêm quốc gia mới
// ---------------------------------------------------------------------------
export const CountryModal: React.FC<{
  open: boolean;
  zIndex?: number;
  onClose: () => void;
  onSaved?: (code: string, name: string) => void;
}> = ({ open, zIndex, onClose, onSaved }) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [allCountries, setAllCountries] = useState<Record<string, string>>(() => getAllCountries());

  useEffect(() => {
    if (open) {
      setCode('');
      setName('');
      setError('');
      setAllCountries(getAllCountries());
    }
  }, [open]);

  const submit = () => {
    const cCode = code.trim().toUpperCase();
    const cName = name.trim();
    if (!cCode) {
      setError('Vui lòng nhập mã quốc gia (2-4 ký tự, VD: FR, US, AU).');
      return;
    }
    if (!cName) {
      setError('Vui lòng nhập tên quốc gia (tiếng Việt, VD: Pháp, Hoa Kỳ, Úc).');
      return;
    }
    const savedCode = saveCustomCountry(cCode, cName);
    onSaved?.(savedCode, cName);
    onClose();
  };

  const quickPicks = [
    { code: 'FR', name: 'Pháp' },
    { code: 'US', name: 'Hoa Kỳ (Mỹ)' },
    { code: 'AU', name: 'Úc (Australia)' },
    { code: 'DE', name: 'Đức' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'IE', name: 'Ireland' },
    { code: 'HK', name: 'Hồng Kông' },
    { code: 'KR', name: 'Hàn Quốc' },
    { code: 'CN', name: 'Trung Quốc' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'QA', name: 'Qatar' },
    { code: 'SA', name: 'Ả Rập Xê Út' },
  ].filter((p) => !allCountries[p.code]);

  return (
    <Modal open={open} title="Thêm quốc gia mới" okText="Thêm quốc gia" onClose={onClose} onOk={submit} error={error} zIndex={zIndex}>
      <div className="spc-modal__grid">
        <div className="spc-field">
          <label htmlFor="c-code">Mã quốc gia (Alpha-2/3) *</label>
          <input
            id="c-code"
            className="spc-input"
            placeholder="VD: FR, US, AU…"
            maxLength={5}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoFocus
          />
        </div>
        <div className="spc-field">
          <label htmlFor="c-name">Tên quốc gia (tiếng Việt) *</label>
          <input
            id="c-name"
            className="spc-input"
            placeholder="VD: Pháp, Hoa Kỳ, Úc…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      {quickPicks.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
            Gợi ý thêm nhanh các nước vận chuyển ngựa phổ biến:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {quickPicks.slice(0, 8).map((p) => (
              <button
                key={p.code}
                type="button"
                className="spc-btn spc-btn--sm"
                style={{ fontSize: 12, padding: '4px 8px' }}
                onClick={() => {
                  setCode(p.code);
                  setName(p.name);
                }}
              >
                + {p.name} ({p.code})
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Loại giấy tờ
// ---------------------------------------------------------------------------
export const DocTypeModal: React.FC<{ open: boolean; value?: DocType; onClose: () => void; onSaved?: (id: string) => void }> = ({ open, value, onClose, onSaved }) => {
  const { actions } = useSpecialist();
  const blank: DocType = { id: '', name: '', group: 'CUSTOMS', scope: 'PER_TRIP', provider: 'CBN', validityDays: 30, status: 'ACTIVE', note: '' };
  const [f, setF] = useState<DocType>(blank);
  const [error, setError] = useState('');
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [allGroups, setAllGroups] = useState(() => getAllGroups());

  useEffect(() => {
    if (open) {
      setAllGroups(getAllGroups());
      setF(value ? { ...value } : blank);
      setError('');
      setIsNewGroup(false);
      setNewGroupName('');
    }
  }, [open]);

  const submit = () => {
    let targetGroup = f.group;
    if (isNewGroup) {
      if (!newGroupName.trim()) {
        setError('Vui lòng nhập tên nhóm giấy tờ mới.');
        return;
      }
      targetGroup = saveCustomGroup(newGroupName.trim());
    }
    const r = actions.saveDocType({ ...f, group: targetGroup, note: f.note?.trim() || undefined });
    if (r.ok) {
      onSaved?.(r.id!);
      onClose();
    } else {
      setError(r.message);
    }
  };

  return (
    <Modal open={open} title={value ? `Sửa loại giấy tờ ${value.id}` : 'Thêm loại giấy tờ'} okText="Lưu" onClose={onClose} onOk={submit} error={error}>
      <div className="spc-field"><label htmlFor="dt-name">Tên loại giấy tờ *</label><input id="dt-name" className="spc-input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="spc-modal__grid">
        <div className="spc-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="dt-group">Nhóm</label>
            <button
              type="button"
              className="spc-link"
              style={{ fontSize: 12, padding: 0, textDecoration: 'underline' }}
              onClick={() => {
                setIsNewGroup(!isNewGroup);
                setNewGroupName('');
              }}
            >
              {isNewGroup ? 'Chọn nhóm có sẵn' : '+ Nhóm mới'}
            </button>
          </div>
          {isNewGroup ? (
            <input
              id="dt-new-group"
              className="spc-input"
              placeholder="Nhập tên nhóm giấy tờ mới…"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              autoFocus
            />
          ) : (
            <select
              id="dt-group"
              className="spc-select"
              value={f.group}
              onChange={(e) => {
                if (e.target.value === '__NEW__') {
                  setIsNewGroup(true);
                  setNewGroupName('');
                } else {
                  setF({ ...f, group: e.target.value as DocGroup });
                }
              }}
            >
              {Object.entries(allGroups).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
              <option value="__NEW__">+ Thêm nhóm khác…</option>
            </select>
          )}
        </div>
        <div className="spc-field"><label htmlFor="dt-valid">Hiệu lực mặc định (ngày)</label>
          <input id="dt-valid" className="spc-input" type="number" min={0} value={f.validityDays ?? ''} placeholder="Theo hạn trên giấy tờ" onChange={(e) => setF({ ...f, validityDays: e.target.value ? Number(e.target.value) : null })} /></div>
        <div className="spc-field"><label htmlFor="dt-prov">Bên cung cấp mặc định</label>
          <select id="dt-prov" className="spc-select" value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value as Provider })}>{keys(PROVIDER_VI).map((k) => <option key={k} value={k}>{PROVIDER_VI[k]}</option>)}</select></div>
        <div className="spc-field"><label htmlFor="dt-scope">Phạm vi mặc định</label>
          <select id="dt-scope" className="spc-select" value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value as DocScope })}>{keys(SCOPE_VI).map((k) => <option key={k} value={k}>{SCOPE_VI[k]}</option>)}</select></div>
      </div>
      <div className="spc-field" style={{ marginTop: 12 }}>
        <label htmlFor="dt-note">Ghi chú / chú thích loại giấy tờ (tùy chọn)</label>
        <input
          id="dt-note"
          className="spc-input"
          placeholder="Ghi chú thêm về loại giấy tờ nếu có…"
          value={f.note || ''}
          onChange={(e) => setF({ ...f, note: e.target.value })}
        />
      </div>
      <p className="spc-muted">Bên cung cấp và phạm vi là giá trị mặc định khi thêm loại giấy tờ này vào một yêu cầu; có thể chỉnh trong từng yêu cầu.</p>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Yêu cầu theo quốc gia / hướng (danh sách dòng yêu cầu)
// ---------------------------------------------------------------------------
export const RegulationModal: React.FC<{
  open: boolean;
  value?: Regulation;
  initialCountry?: string;
  initialDirection?: Direction;
  zIndex?: number;
  onClose: () => void;
  onSaved?: (id: string) => void;
}> = ({ open, value, initialCountry, initialDirection, zIndex, onClose, onSaved }) => {
  const { docTypes, actions } = useSpecialist();
  const blank: Regulation = { id: '', country: 'VN', direction: 'EXPORT', lines: [], note: '', v: 1, effectiveFrom: today(), status: 'ACTIVE' };
  const [f, setF] = useState<Regulation>(blank);
  const [error, setError] = useState('');
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [allCountries, setAllCountries] = useState(() => getAllCountries());


  useEffect(() => {
    if (open) {
      setAllCountries(getAllCountries());
      if (value) {
        const cloned: Regulation = JSON.parse(JSON.stringify(value));
        const seen = new Set<string>();
        cloned.lines = (cloned.lines || [])
          .filter((l) => l.provider !== 'CUSTOMER')
          .filter((l) => {
            if (seen.has(l.typeId)) return false;
            seen.add(l.typeId);
            return true;
          });
        if (cloned.note && cloned.note.includes('Giấy chứng nhận sức khỏe do Cục Thú y cấp')) {
          cloned.note = '';
        }
        setF(cloned);
      } else {
        setF({
          ...blank,
          country: (initialCountry as CountryCode) || 'VN',
          direction: initialDirection || 'EXPORT',
        });
      }
      setError('');
    }
  }, [open, value, initialCountry, initialDirection]);

  const companyTypes = docTypes.filter((d) => d.status === 'ACTIVE' && d.provider !== 'CUSTOMER' && !['DT-1', 'DT-2', 'DT-3'].includes(d.id));
  const canAddLine = companyTypes.some((d) => !f.lines.some((l) => l.typeId === d.id));
  const setLine = (i: number, patch: Partial<RequirementLine>) => setF((x) => ({ ...x, lines: x.lines.map((l, k) => (k === i ? { ...l, ...patch } : l)) }));
  const addLine = () => {
    const t = companyTypes.find((d) => !f.lines.some((l) => l.typeId === d.id));
    if (!t) return setError('Đã thêm mọi loại giấy tờ của công ty.');
    setF((x) => ({
      ...x,
      lines: [
        ...x.lines,
        {
          typeId: t.id,
          provider: 'CBN',
          scope: t.scope ?? 'PER_TRIP',
          level: 'REQUIRED',
          stage: t.group === 'QUARANTINE' ? 'AT_CHECKPOINT' : 'BEFORE_DEPART',
          condition: '',
        },
      ],
    }));
  };
  const submit = () => {
    const seen = new Set<string>();
    const cleaned: Regulation = {
      ...f,
      lines: f.lines
        .filter((l) => l.provider !== 'CUSTOMER')
        .filter((l) => {
          if (seen.has(l.typeId)) return false;
          seen.add(l.typeId);
          return true;
        })
        .map((l) => {
          const dt = docTypes.find((d) => d.id === l.typeId);
          return {
            ...l,
            provider: 'CBN' as const,
            scope: dt?.scope ?? l.scope ?? 'PER_TRIP',
            level: l.level || 'REQUIRED',
            stage: l.stage || (dt?.group === 'QUARANTINE' ? 'AT_CHECKPOINT' : 'BEFORE_DEPART'),
            condition: l.condition || '',
          };
        }),
    };
    const r = actions.saveRegulation(cleaned);
    if (r.ok) {
      onSaved?.(r.id!);
      onClose();
    } else {
      setError(r.message);
    }
  };

  return (
    <Modal open={open} title={value ? `Sửa yêu cầu ${value.id} (v${value.v})` : 'Thêm yêu cầu theo quốc gia/tuyến'} okText="Lưu yêu cầu" onClose={onClose} onOk={submit} error={error} wide zIndex={zIndex}>
      <div className="spc-modal__grid">
        <div className="spc-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="rg-c">Quốc gia</label>
            {!value && (
              <button type="button" className="spc-link" style={{ fontSize: 12 }} onClick={() => setCountryModalOpen(true)}>
                + Nước mới
              </button>
            )}
          </div>
          <select
            id="rg-c"
            className="spc-select"
            value={f.country}
            disabled={!!value}
            onChange={(e) => {
              if (e.target.value === '__NEW__') {
                setCountryModalOpen(true);
              } else {
                setF({ ...f, country: e.target.value });
              }
            }}
          >
            {Object.entries(allCountries).map(([k, name]: [string, string]) => (
              <option key={k} value={k}>{name} ({k})</option>
            ))}
            {!value && <option value="__NEW__">+ Thêm quốc gia khác…</option>}
          </select>
        </div>
        <div className="spc-field"><label htmlFor="rg-d">Hướng</label>
          <select id="rg-d" className="spc-select" value={f.direction} disabled={!!value} onChange={(e) => setF({ ...f, direction: e.target.value as Direction })}>{keys(DIRECTION_VI).map((k) => <option key={k} value={k}>{DIRECTION_VI[k]}</option>)}</select></div>
      </div>
      <div className="spc-field"><label htmlFor="rg-note">Ghi chú</label><textarea id="rg-note" className="spc-textarea" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
      <div style={{ marginTop: 14 }}>
        <div className="spc-eyebrow" style={{ marginBottom: 4 }}>Giấy tờ công ty phải làm</div>
        <p className="spc-muted" style={{ fontSize: 13, margin: '0 0 10px' }}>
          Hồ sơ của cá thể ngựa do khách hàng cung cấp khi tạo đơn. Quy định này chỉ cấu hình các giấy tờ do công ty thực hiện cho quốc gia/hướng này.
        </p>
      </div>
      <div className="spc-lines">
        {f.lines.map((l, i) => {
          const usedElsewhere = new Set(f.lines.filter((_, idx) => idx !== i).map((item) => item.typeId));
          const availableTypes = companyTypes.filter((d) => d.id === l.typeId || !usedElsewhere.has(d.id));

          return (
            <div key={i} className="spc-line">
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600, minWidth: 22 }}>{i + 1}.</span>
              <select
                className="spc-select"
                value={l.typeId}
                aria-label="Loại giấy tờ"
                onChange={(e) => {
                  const dt = companyTypes.find((d) => d.id === e.target.value);
                  setLine(i, {
                    typeId: e.target.value,
                    scope: dt?.scope ?? 'PER_TRIP',
                    provider: 'CBN',
                    level: 'REQUIRED',
                    stage: dt?.group === 'QUARANTINE' ? 'AT_CHECKPOINT' : 'BEFORE_DEPART',
                    condition: '',
                  });
                }}
              >
                {availableTypes.map((d) => (
                  <option key={d.id} value={d.id} disabled={d.status !== 'ACTIVE' && d.id !== l.typeId}>
                    {d.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="spc-btn spc-btn--sm spc-btn--danger"
                onClick={() => setF((x) => ({ ...x, lines: x.lines.filter((_, k) => k !== i) }))}
              >
                Bỏ
              </button>
            </div>
          );
        })}
        {!f.lines.length && <p className="spc-muted">Chưa có giấy tờ công ty nào được cấu hình.</p>}
      </div>
      <button
        type="button"
        className="spc-btn spc-btn--sm"
        style={{ marginTop: 8 }}
        disabled={!canAddLine}
        title={!canAddLine ? 'Đã thêm tất cả loại giấy tờ của công ty' : undefined}
        onClick={addLine}
      >
        + Thêm giấy tờ
      </button>
      {value && <p className="spc-muted" style={{ marginTop: 10 }}>Nếu yêu cầu đã được chuyến nào áp dụng, lưu sẽ tạo phiên bản mới; chuyến cũ giữ phiên bản đã chụp.</p>}

      <CountryModal
        open={countryModalOpen}
        zIndex={zIndex ? zIndex + 20 : 240}
        onClose={() => setCountryModalOpen(false)}
        onSaved={(newCode) => {
          setAllCountries(getAllCountries());
          setF((prev) => ({ ...prev, country: newCode }));
        }}
      />
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Bộ yêu cầu hồ sơ theo tuyến
// ---------------------------------------------------------------------------
export const PackageModal: React.FC<{ open: boolean; value?: RegPackage; onClose: () => void; onSaved?: (id: string) => void }> = ({ open, value, onClose, onSaved }) => {
  const { data, actions } = useSpecialist();
  const blank: RegPackage = {
    id: '',
    name: '',
    items: [['VN', 'EXPORT'], ['JP', 'IMPORT']],
    origin: 'VN',
    dest: 'JP',
    modes: ['AIR'],
    note: '',
    v: 1,
    effectiveFrom: today(),
    status: 'ACTIVE',
  };
  const [f, setF] = useState<RegPackage>(blank);
  const [error, setError] = useState('');
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [countryModalTarget, setCountryModalTarget] = useState<'origin' | 'dest' | null>(null);
  const [allCountries, setAllCountries] = useState(() => getAllCountries());
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [editingReg, setEditingReg] = useState<Regulation | undefined>(undefined);
  const [regInitialCountry, setRegInitialCountry] = useState<string>('VN');
  const [regInitialDir, setRegInitialDir] = useState<Direction>('EXPORT');

  const handleOpenReg = (rule?: Regulation, country?: string, direction?: Direction) => {
    setEditingReg(rule);
    setRegInitialCountry(country || f.origin);
    setRegInitialDir(direction || 'EXPORT');
    setRegModalOpen(true);
  };

  const computePackageName = (orig: string, dst: string, list: Record<string, string> = allCountries) => {
    const origLabel = list[orig] || orig;
    const dstLabel = list[dst] || dst;
    return orig === dst ? `Nội địa ${origLabel}` : `Tuyến ${origLabel} → ${dstLabel}`;
  };

  useEffect(() => {
    if (open) {
      const currentCountries = getAllCountries();
      setAllCountries(currentCountries);
      if (value) {
        setF({
          ...JSON.parse(JSON.stringify(value)),
          name: computePackageName(value.origin, value.dest, currentCountries),
        });
      } else {
        const defaultOrig = 'VN';
        const defaultDest = 'JP';
        setF({
          ...blank,
          origin: defaultOrig,
          dest: defaultDest,
          name: computePackageName(defaultOrig, defaultDest, currentCountries),
        });
      }
      setError('');
    }
  }, [open]);

  const updateRoute = (orig: string, dst: string) => {
    const isDomestic = orig === dst;
    const items: Array<[CountryCode, Direction]> = isDomestic
      ? [[orig, 'DOMESTIC']]
      : [[orig, 'EXPORT'], [dst, 'IMPORT']];
    const autoName = computePackageName(orig, dst);
    setF((prev) => ({
      ...prev,
      origin: orig,
      dest: dst,
      items,
      name: autoName,
    }));
  };

  const handleOriginChange = (orig: string) => {
    if (orig === '__NEW__') {
      setCountryModalTarget('origin');
      setCountryModalOpen(true);
      return;
    }
    updateRoute(orig, f.dest);
  };

  const handleDestChange = (dst: string) => {
    if (dst === '__NEW__') {
      setCountryModalTarget('dest');
      setCountryModalOpen(true);
      return;
    }
    updateRoute(f.origin, dst);
  };

  const handleSwap = () => {
    updateRoute(f.dest, f.origin);
  };

  const handleSetDomestic = () => {
    updateRoute(f.origin, f.origin);
  };

  const toggleItem = (item: [CountryCode, Direction]) => {
    setF((prev) => {
      const exists = prev.items.some((x) => x[0] === item[0] && x[1] === item[1]);
      const nextItems = exists
        ? prev.items.filter((x) => !(x[0] === item[0] && x[1] === item[1]))
        : [...prev.items, item];
      return { ...prev, items: nextItems };
    });
  };

  const submit = () => {
    const finalName = computePackageName(f.origin, f.dest);
    if (!finalName.trim()) return setError('Không thể xác định tên bộ yêu cầu.');
    if (!f.origin || !f.dest) return setError('Vui lòng chọn nơi đi và nơi đến.');
    if (!f.modes.length) return setError('Chọn ít nhất một phương thức vận chuyển.');
    if (!f.items.length) return setError('Bộ yêu cầu phải có ít nhất một quy định áp dụng.');
    const r = actions.savePackage({ ...f, name: finalName });
    if (r.ok) {
      onSaved?.(r.id!);
      onClose();
    } else {
      setError(r.message);
    }
  };

  return (
    <Modal open={open} title={value ? `Sửa bộ yêu cầu ${value.id} (v${value.v})` : 'Thêm bộ yêu cầu hồ sơ'} okText="Lưu bộ yêu cầu" onClose={onClose} onOk={submit} error={error} wide>
      {/* 1. Tuyến nơi đi và nơi đến */}
      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
          Lộ trình tuyến vận chuyển
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
          <div className="spc-field" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label htmlFor="rp-origin" style={{ margin: 0 }}>Quốc gia đi (Nơi đi) *</label>
              <button type="button" className="spc-link" style={{ fontSize: 11 }} onClick={() => { setCountryModalTarget('origin'); setCountryModalOpen(true); }}>
                + Nước mới
              </button>
            </div>
            <select id="rp-origin" className="spc-select" value={f.origin} onChange={(e) => handleOriginChange(e.target.value)}>
              {Object.entries(allCountries).map(([k, name]: [string, string]) => (
                <option key={k} value={k}>{name} ({k})</option>
              ))}
              <option value="__NEW__">+ Thêm quốc gia khác…</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', paddingTop: 14 }}>
            <button type="button" className="spc-btn spc-btn--sm" title="Đổi chiều đi/đến" onClick={handleSwap}>⇄ Đổi</button>
            <button type="button" className="spc-btn spc-btn--sm" title="Tuyến nội địa trong cùng 1 nước" onClick={handleSetDomestic}>Nội địa</button>
          </div>

          <div className="spc-field" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label htmlFor="rp-dest" style={{ margin: 0 }}>Quốc gia đến (Nơi đến) *</label>
              <button type="button" className="spc-link" style={{ fontSize: 11 }} onClick={() => { setCountryModalTarget('dest'); setCountryModalOpen(true); }}>
                + Nước mới
              </button>
            </div>
            <select id="rp-dest" className="spc-select" value={f.dest} onChange={(e) => handleDestChange(e.target.value)}>
              {Object.entries(allCountries).map(([k, name]: [string, string]) => (
                <option key={k} value={k}>{name} ({k})</option>
              ))}
              <option value="__NEW__">+ Thêm quốc gia khác…</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Tên bộ */}
      <div className="spc-field">
        <label htmlFor="rp-name">Tên bộ yêu cầu (Tự động theo tuyến) *</label>
        <input
          id="rp-name"
          className="spc-input"
          value={f.name}
          readOnly
          disabled
          style={{ background: '#f8fafc', cursor: 'not-allowed', color: '#334155', fontWeight: 600 }}
        />
        <small className="spc-muted" style={{ display: 'block', marginTop: 4 }}>
          Tên bộ yêu cầu được hệ thống tự động sinh theo điểm đi và điểm đến của tuyến (không cho phép sửa thủ công).
        </small>
      </div>

      {/* 3. Phương thức vận chuyển */}
      <div className="spc-field" style={{ marginTop: 12 }}>
        <label>Phương thức áp dụng *</label>
        <div className="spc-chips" style={{ margin: '6px 0 0' }}>
          {(['ROAD', 'AIR'] as TransportMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`spc-chip ${f.modes.includes(m) ? 'on' : ''}`}
              onClick={() => setF((p) => ({ ...p, modes: p.modes.includes(m) ? p.modes.filter((x) => x !== m) : [...p.modes, m] }))}
            >
              {MODE_VI[m]}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Quy định cấu thành theo tuyến */}
      <div style={{ marginTop: 16 }}>
        <div className="spc-eyebrow">
          Quy định áp dụng cho tuyến ({f.origin === f.dest ? 'Nội địa' : `Xuất/Nhập khẩu giữa ${allCountries[f.origin] || f.origin} và ${allCountries[f.dest] || f.dest}`})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {f.origin === f.dest ? (
            (() => {
              const rule = regFor(data, f.origin, 'DOMESTIC');
              const isChecked = f.items.some((x) => x[0] === f.origin && x[1] === 'DOMESTIC');
              return (
                <div className="spc-row" style={{ padding: '10px 14px', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', margin: 0, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, margin: 0 }}>
                    <input type="checkbox" checked={isChecked} onChange={() => toggleItem([f.origin, 'DOMESTIC'])} />
                    <div>
                      <b>Quy định nội địa: {allCountries[f.origin] || f.origin} [DOMESTIC]</b>
                      <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginTop: 2 }}>
                        {rule ? `${rule.id} (v${rule.v}) • ${rule.lines.length} loại giấy tờ yêu cầu` : `Chưa cấu hình quy định nội địa cho ${allCountries[f.origin] || f.origin}`}
                      </span>
                    </div>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TripStatusBadge label={rule ? 'Đã cấu hình' : 'Chưa cấu hình'} tone={rule ? 'ok' : 'warn'} />
                    {rule ? (
                      <button
                        type="button"
                        className="spc-btn spc-btn--sm"
                        style={{ fontSize: 12 }}
                        onClick={(e) => {
                          e.preventDefault();
                          handleOpenReg(rule, f.origin, 'DOMESTIC');
                        }}
                      >
                        Sửa quy định
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="spc-btn spc-btn--sm spc-btn--solid"
                        style={{ fontSize: 12 }}
                        onClick={(e) => {
                          e.preventDefault();
                          handleOpenReg(undefined, f.origin, 'DOMESTIC');
                        }}
                      >
                        + Cấu hình ngay
                      </button>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <>
              {(() => {
                const ruleEx = regFor(data, f.origin, 'EXPORT');
                const isCheckedEx = f.items.some((x) => x[0] === f.origin && x[1] === 'EXPORT');
                return (
                  <div className="spc-row" style={{ padding: '10px 14px', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', margin: 0, alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, margin: 0 }}>
                      <input type="checkbox" checked={isCheckedEx} onChange={() => toggleItem([f.origin, 'EXPORT'])} />
                      <div>
                        <b>1. Chặng xuất khẩu: {allCountries[f.origin] || f.origin} [EXPORT]</b>
                        <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginTop: 2 }}>
                          {ruleEx ? `${ruleEx.id} (v${ruleEx.v}) • ${ruleEx.lines.length} loại giấy tờ yêu cầu` : `Chưa cấu hình quy định xuất khẩu cho ${allCountries[f.origin] || f.origin}`}
                        </span>
                      </div>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TripStatusBadge label={ruleEx ? 'Đã cấu hình' : 'Chưa cấu hình'} tone={ruleEx ? 'ok' : 'warn'} />
                      {ruleEx ? (
                        <button
                          type="button"
                          className="spc-btn spc-btn--sm"
                          style={{ fontSize: 12 }}
                          onClick={(e) => {
                            e.preventDefault();
                            handleOpenReg(ruleEx, f.origin, 'EXPORT');
                          }}
                        >
                          Sửa quy định
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="spc-btn spc-btn--sm spc-btn--solid"
                          style={{ fontSize: 12 }}
                          onClick={(e) => {
                            e.preventDefault();
                            handleOpenReg(undefined, f.origin, 'EXPORT');
                          }}
                        >
                          + Cấu hình ngay
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const ruleIm = regFor(data, f.dest, 'IMPORT');
                const isCheckedIm = f.items.some((x) => x[0] === f.dest && x[1] === 'IMPORT');
                return (
                  <div className="spc-row" style={{ padding: '10px 14px', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', margin: 0, alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, margin: 0 }}>
                      <input type="checkbox" checked={isCheckedIm} onChange={() => toggleItem([f.dest, 'IMPORT'])} />
                      <div>
                        <b>2. Chặng nhập khẩu: {allCountries[f.dest] || f.dest} [IMPORT]</b>
                        <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginTop: 2 }}>
                          {ruleIm ? `${ruleIm.id} (v${ruleIm.v}) • ${ruleIm.lines.length} loại giấy tờ yêu cầu` : `Chưa cấu hình quy định nhập khẩu cho ${allCountries[f.dest] || f.dest}`}
                        </span>
                      </div>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TripStatusBadge label={ruleIm ? 'Đã cấu hình' : 'Chưa cấu hình'} tone={ruleIm ? 'ok' : 'warn'} />
                      {ruleIm ? (
                        <button
                          type="button"
                          className="spc-btn spc-btn--sm"
                          style={{ fontSize: 12 }}
                          onClick={(e) => {
                            e.preventDefault();
                            handleOpenReg(ruleIm, f.dest, 'IMPORT');
                          }}
                        >
                          Sửa quy định
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="spc-btn spc-btn--sm spc-btn--solid"
                          style={{ fontSize: 12 }}
                          onClick={(e) => {
                            e.preventDefault();
                            handleOpenReg(undefined, f.dest, 'IMPORT');
                          }}
                        >
                          + Cấu hình ngay
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* 5. Ghi chú */}
      <div className="spc-field" style={{ marginTop: 14 }}>
        <label htmlFor="rp-note">Ghi chú (tùy chọn)</label>
        <textarea id="rp-note" className="spc-textarea" rows={2} value={f.note} placeholder="Ghi chú thêm về bộ yêu cầu…" onChange={(e) => setF({ ...f, note: e.target.value })} />
      </div>

      <CountryModal
        open={countryModalOpen}
        zIndex={230}
        onClose={() => { setCountryModalOpen(false); setCountryModalTarget(null); }}
        onSaved={(newCode) => {
          const freshCountries = getAllCountries();
          setAllCountries(freshCountries);
          const nextOrig = countryModalTarget === 'origin' ? newCode : f.origin;
          const nextDest = countryModalTarget === 'dest' ? newCode : f.dest;
          const isDomestic = nextOrig === nextDest;
          const items: Array<[CountryCode, Direction]> = isDomestic
            ? [[nextOrig, 'DOMESTIC']]
            : [[nextOrig, 'EXPORT'], [nextDest, 'IMPORT']];
          setF((prev) => ({
            ...prev,
            origin: nextOrig,
            dest: nextDest,
            items,
            name: computePackageName(nextOrig, nextDest, freshCountries),
          }));
          setCountryModalTarget(null);
        }}
      />

      <RegulationModal
        open={regModalOpen}
        value={editingReg}
        initialCountry={regInitialCountry}
        initialDirection={regInitialDir}
        zIndex={220}
        onClose={() => {
          setRegModalOpen(false);
          setEditingReg(undefined);
        }}
        onSaved={() => {
          setF((prev) => {
            const item = [regInitialCountry as CountryCode, regInitialDir] as [CountryCode, Direction];
            const exists = prev.items.some((x) => x[0] === item[0] && x[1] === item[1]);
            return exists ? prev : { ...prev, items: [...prev.items, item] };
          });
          setRegModalOpen(false);
          setEditingReg(undefined);
        }}
      />
    </Modal>
  );
};
