import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SpecialistLayout, Icon } from '../../components/SpecialistLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { DocTypeModal, PackageModal, RegulationModal } from '../../components/Modals';
import { useSpecialist } from '../../hooks/useSpecialist';
import { useSpecialistFilter } from '../../hooks/useSpecialistFilter';
import type { ConfigStatus, DocType, RegPackage, Regulation, SetupTab } from '../../types';
import { COUNTRY_VI, DIRECTION_VI, GROUP_VI, LEVEL_VI, MODE_VI, PROVIDER_VI, SCOPE_VI, STAGE_VI, fmtDate, regFor, ruleLabel, typeName } from '../../hooks/specialistRules';
import './RegulationsPage.css';

const StatusBadge: React.FC<{ s: ConfigStatus }> = ({ s }) => <TripStatusBadge label={s === 'ACTIVE' ? 'Đang áp dụng' : 'Ngừng áp dụng'} tone={s === 'ACTIVE' ? 'ok' : 'muted'} />;

/** Quy định & thiết lập: danh mục giấy tờ, yêu cầu theo quốc gia/tuyến, bộ yêu cầu hồ sơ */
export const RegulationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { tab = 'types' } = useParams<{ tab: string }>();
  const { data, docTypes, regulations, packages, trips, actions } = useSpecialist();
  const active: SetupTab = (['types', 'regs', 'sets'] as const).includes(tab as SetupTab) ? (tab as SetupTab) : 'types';
  const [editType, setEditType] = useState<DocType | 'new' | null>(null);
  const [editReg, setEditReg] = useState<Regulation | 'new' | null>(null);
  const [editPkg, setEditPkg] = useState<RegPackage | 'new' | null>(null);

  const typeFilter = useSpecialistFilter(docTypes, (d) => [d.id, d.name, GROUP_VI[d.group]].join(' '), {}, 20);
  const regFilter = useSpecialistFilter(regulations, (g) => [g.id, COUNTRY_VI[g.country], DIRECTION_VI[g.direction], g.note].join(' '), {
    dir: (g, v) => g.direction === v, status: (g, v) => g.status === v,
  }, 20);
  const pkgFilter = useSpecialistFilter(packages, (p) => [p.id, p.name, p.note].join(' '), {}, 20);

  const usedByReg = (id: string) => trips.filter((t) => t.reqSet?.rules.some((r) => r.regId === id)).map((t) => t.id);
  const usedByPkg = (id: string) => trips.filter((t) => t.reqSet?.pkgId === id).map((t) => t.id);
  const usedByType = (id: string) => regulations.filter((g) => g.lines.some((l) => l.typeId === id)).map((g) => g.id);
  const tripLinks = (ids: string[]) => ids.length ? ids.map((id, i) => <React.Fragment key={id}>{i ? ', ' : ''}<button type="button" className="spc-link" onClick={() => navigate(`/specialist/trips/${id}`)}>{id}</button></React.Fragment>) : <span className="spc-muted">—</span>;
  const actionsCell = (kind: 'type' | 'reg' | 'pkg', id: string, status: ConfigStatus, onEdit: () => void, used: number) => (
    <div className="spc-btn-row" style={{ margin: 0, flexWrap: 'nowrap' }}>
      <button type="button" className="spc-btn spc-btn--sm" onClick={onEdit}>Sửa</button>
      <button type="button" className="spc-btn spc-btn--sm" title={used ? 'Đang được dùng – chỉ ngừng áp dụng, lịch sử được giữ' : ''} onClick={() => actions.toggleConfigStatus(kind, id)}>
        {status === 'ACTIVE' ? 'Ngừng áp dụng' : 'Áp dụng lại'}
      </button>
    </div>
  );

  return (
    <SpecialistLayout title="Quy định & thiết lập">
      <div className="spc-head">
        <div>
          <h2 className="spc-title">Quy định & thiết lập</h2>
          <p className="spc-subtitle">Thêm và quản lý loại giấy tờ, yêu cầu theo quốc gia/tuyến và bộ yêu cầu hồ sơ dùng để lập checklist cho chuyến. Dữ liệu là cấu hình mẫu của bản demo.</p>
        </div>
      </div>
      <div className="spc-legend">
        <div><b>Loại giấy tờ</b><span>Định nghĩa tài liệu (tên, nhóm, hiệu lực mặc định).</span></div>
        <div><b>Yêu cầu</b><span>Khi nào cần, ai cung cấp, theo từng ngựa hay toàn chuyến – theo quốc gia/hướng.</span></div>
        <div><b>Bộ yêu cầu</b><span>Tập hợp yêu cầu áp dụng cho một chuyến (nơi đi, nơi đến, phương thức).</span></div>
        <div><b>Chứng từ</b><span>Tệp / bằng chứng thực tế đã nộp cho chuyến.</span></div>
      </div>
      <div className="spc-tabs">
        {([['types', 'Danh mục giấy tờ', docTypes.length], ['regs', 'Yêu cầu theo quốc gia/tuyến', regulations.length], ['sets', 'Bộ yêu cầu hồ sơ', packages.length]] as const).map(([k, l, n]) => (
          <button key={k} type="button" className={active === k ? 'on' : ''} onClick={() => navigate(`/specialist/regulations/${k}`)}>{l} <span className="spc-muted">{n}</span></button>
        ))}
      </div>

      {active === 'types' && (
        <>
          <div className="spc-toolbar">
            <label className="spc-search"><Icon name="search" /><input value={typeFilter.search} onChange={(e) => typeFilter.setSearch(e.target.value)} placeholder="Tìm loại giấy tờ…" /></label>
            <button type="button" className="spc-btn spc-btn--solid" onClick={() => setEditType('new')}><Icon name="plus" />Thêm loại giấy tờ</button>
          </div>
          <div className="spc-card" style={{ padding: 0 }}>
            <div className="spc-table-wrap">
              <table className="spc-table">
                <thead><tr><th>Loại giấy tờ</th><th>Nhóm</th><th>Hiệu lực mặc định</th><th>Mặc định khi thêm vào yêu cầu</th><th>Dùng trong yêu cầu</th><th>Trạng thái</th><th /></tr></thead>
                <tbody>
                  {typeFilter.rows.map((d) => (
                    <tr key={d.id}>
                      <td><b>{d.name}</b><div className="spc-muted">{d.id}</div></td>
                      <td>{GROUP_VI[d.group]}</td>
                      <td>{d.validityDays ? `${d.validityDays} ngày` : 'Theo hạn trên giấy tờ'}</td>
                      <td>{PROVIDER_VI[d.provider]} • {SCOPE_VI[d.scope]}</td>
                      <td>{usedByType(d.id).join(', ') || <span className="spc-muted">—</span>}</td>
                      <td><StatusBadge s={d.status} /></td>
                      <td>{actionsCell('type', d.id, d.status, () => setEditType(d), usedByType(d.id).length)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {active === 'regs' && (
        <>
          {(['VN:DOMESTIC', 'VN:EXPORT', 'JP:IMPORT'] as const).filter((k) => { const [c, d] = k.split(':'); return !regFor(data, c as 'VN', d as 'EXPORT'); }).length > 0 && (
            <div className="spc-note spc-note--yellow"><div><b>Thiếu cấu hình cho tuyến nhận đơn mới</b>Checklist của các chuyến liên quan sẽ chưa đạt cho tới khi bổ sung yêu cầu.</div></div>
          )}
          <div className="spc-toolbar" style={{ marginTop: 12 }}>
            <label className="spc-search"><Icon name="search" /><input value={regFilter.search} onChange={(e) => regFilter.setSearch(e.target.value)} placeholder="Tìm quốc gia, hướng, ghi chú…" /></label>
            <select className="spc-select" value={regFilter.value('dir')} onChange={(e) => regFilter.setValue('dir', e.target.value)} aria-label="Hướng">
              <option value="">Mọi hướng</option>{Object.entries(DIRECTION_VI).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <select className="spc-select" value={regFilter.value('status')} onChange={(e) => regFilter.setValue('status', e.target.value)} aria-label="Trạng thái">
              <option value="">Mọi trạng thái</option><option value="ACTIVE">Đang áp dụng</option><option value="RETIRED">Ngừng áp dụng</option>
            </select>
            <button type="button" className="spc-btn spc-btn--solid" onClick={() => setEditReg('new')}><Icon name="plus" />Thêm yêu cầu</button>
          </div>
          <div className="spc-card" style={{ padding: 0 }}>
            <div className="spc-table-wrap">
              <table className="spc-table">
                <thead><tr><th>Quốc gia • Hướng</th><th>Yêu cầu</th><th>Phiên bản</th><th>Chuyến đang dùng</th><th>Trạng thái</th><th /></tr></thead>
                <tbody>
                  {regFilter.rows.map((g) => {
                    const n = (k: keyof typeof LEVEL_VI) => g.lines.filter((l) => l.level === k).length;
                    return (
                      <tr key={g.id}>
                        <td><b>{ruleLabel(g.country, g.direction)}</b><div className="spc-muted">{g.id}</div></td>
                        <td>
                          {g.lines.length} giấy tờ: {n('REQUIRED')} bắt buộc{n('CONDITIONAL') ? `, ${n('CONDITIONAL')} có điều kiện` : ''}{n('OPTIONAL') ? `, ${n('OPTIONAL')} tùy chọn` : ''}
                          <div className="spc-muted spc-wrap" style={{ maxWidth: 420 }}>{g.lines.map((l) => `${typeName(data, l.typeId)} (${PROVIDER_VI[l.provider]}, ${STAGE_VI[l.stage]})`).join('; ')}</div>
                          {g.note && <div className="spc-muted spc-wrap" style={{ maxWidth: 420 }}>{g.note}</div>}
                        </td>
                        <td><b>v{g.v}</b><div className="spc-muted">hiệu lực {fmtDate(g.effectiveFrom)}</div></td>
                        <td>{tripLinks(usedByReg(g.id))}</td>
                        <td><StatusBadge s={g.status} /></td>
                        <td>{actionsCell('reg', g.id, g.status, () => setEditReg(g), usedByReg(g.id).length)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {active === 'sets' && (
        <>
          <p className="spc-muted">Mỗi bộ gom các yêu cầu theo quốc gia/hướng cho một tuyến và phương thức. Khi áp dụng, chuyến giữ bản chụp của bộ và phiên bản từng yêu cầu; sửa bộ đã dùng sẽ tạo phiên bản mới, chuyến cũ không tự thay đổi.</p>
          <div className="spc-toolbar" style={{ marginTop: 12 }}>
            <label className="spc-search"><Icon name="search" /><input value={pkgFilter.search} onChange={(e) => pkgFilter.setSearch(e.target.value)} placeholder="Tìm bộ yêu cầu…" /></label>
            <button type="button" className="spc-btn spc-btn--solid" onClick={() => setEditPkg('new')}><Icon name="plus" />Thêm bộ yêu cầu</button>
          </div>
          <div className="spc-card" style={{ padding: 0 }}>
            <div className="spc-table-wrap">
              <table className="spc-table">
                <thead><tr><th>Bộ yêu cầu hồ sơ</th><th>Tuyến & phương thức</th><th>Yêu cầu trong bộ</th><th>Phiên bản</th><th>Chuyến đang dùng</th><th>Trạng thái</th><th /></tr></thead>
                <tbody>
                  {pkgFilter.rows.map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.name}</b><div className="spc-muted spc-wrap">{p.id}{p.note ? ` • ${p.note}` : ''}</div></td>
                      <td>{COUNTRY_VI[p.origin]} → {COUNTRY_VI[p.dest]}<div className="spc-muted">{p.modes.map((m) => MODE_VI[m]).join(', ')}</div></td>
                      <td><div className="spc-chips" style={{ margin: 0 }}>{p.items.map(([c, d]) => {
                        const g = regFor(data, c, d);
                        return <span key={`${c}${d}`} className={`spc-rp__chip ${g ? '' : 'bad'}`} title={g ? `${g.id} v${g.v}` : 'Chưa cấu hình'}>{ruleLabel(c, d)}{g ? ` v${g.v}` : ''}</span>;
                      })}</div></td>
                      <td><b>v{p.v}</b><div className="spc-muted">hiệu lực {fmtDate(p.effectiveFrom)}</div></td>
                      <td>{tripLinks(usedByPkg(p.id))}</td>
                      <td><StatusBadge s={p.status} /></td>
                      <td>{actionsCell('pkg', p.id, p.status, () => setEditPkg(p), usedByPkg(p.id).length)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <DocTypeModal open={!!editType} value={editType && editType !== 'new' ? editType : undefined} onClose={() => setEditType(null)} />
      <RegulationModal open={!!editReg} value={editReg && editReg !== 'new' ? editReg : undefined} onClose={() => setEditReg(null)} />
      <PackageModal open={!!editPkg} value={editPkg && editPkg !== 'new' ? editPkg : undefined} onClose={() => setEditPkg(null)} />
    </SpecialistLayout>
  );
};

export default RegulationsPage;
