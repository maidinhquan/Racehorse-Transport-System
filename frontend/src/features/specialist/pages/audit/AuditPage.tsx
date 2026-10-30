import React from 'react';
import { SpecialistLayout, Icon } from '../../components/SpecialistLayout';
import { Pager } from '../../components/Common/Common';
import { useSpecialist } from '../../hooks/useSpecialist';
import { useSpecialistFilter } from '../../hooks/useSpecialistFilter';
import { ROLE_LABEL, fmtDateTime } from '../../hooks/specialistRules';
import './AuditPage.css';

/** Lịch sử thao tác của mọi vai trò trên hồ sơ, mới nhất trước */
export const AuditPage: React.FC = () => {
  const { audit } = useSpecialist();
  const rows = [...audit].sort((a, b) => b.at.localeCompare(a.at));
  const f = useSpecialistFilter(rows, (x) => [x.actor, x.action, x.entity, x.detail ?? ''].join(' '), { role: (x, v) => x.role === v }, 12);
  return (
    <SpecialistLayout title="Lịch sử thao tác">
      <div className="spc-head">
        <div><h2 className="spc-title">Lịch sử thao tác</h2><p className="spc-subtitle">Mọi thao tác đã ghi nhận trên hồ sơ của các vai trò, mới nhất trước.</p></div>
      </div>
      <div className="spc-toolbar">
        <label className="spc-search"><Icon name="search" /><input value={f.search} onChange={(e) => f.setSearch(e.target.value)} placeholder="Tìm người thực hiện, thao tác, chuyến hoặc chứng từ…" /></label>
        <select className="spc-select" value={f.value('role')} onChange={(e) => f.setValue('role', e.target.value)} aria-label="Vai trò">
          <option value="">Mọi vai trò</option>{Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="spc-card" style={{ padding: 0 }}>
        <div className="spc-table-wrap">
          <table className="spc-table">
            <thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Thao tác</th><th>Bản ghi</th><th>Chi tiết</th></tr></thead>
            <tbody>
              {f.rows.map((x, i) => (
                <tr key={`${x.at}-${i}`}>
                  <td className="spc-audit__time">{fmtDateTime(x.at)}</td>
                  <td><b>{x.actor}</b><div className="spc-muted">{ROLE_LABEL[x.role]}</div></td>
                  <td>{x.action}</td>
                  <td>{x.entity}</td>
                  <td><span className="spc-wrap" style={{ maxWidth: 340 }}>{x.detail || '—'}</span></td>
                </tr>
              ))}
              {!f.rows.length && <tr><td colSpan={5} className="spc-empty">Không có thao tác nào khớp bộ lọc.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pager total={f.total} page={f.page} pageCount={f.pageCount} setPage={f.setPage} unit="thao tác" />
    </SpecialistLayout>
  );
};

export default AuditPage;
