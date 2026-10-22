import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoordinatorLayout } from '../../components/CoordinatorLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { useCoordinator } from '../../hooks/useCoordinator';
import { ROLE_LABEL, SLOT_LABEL, countryName, fmtDate, isActiveTrip, tripPersonnelIds } from '../../hooks/coordinatorRules';
import type { CrewSlot, StaffRole, Trip } from '../../types';
import './CrewPage.css';

/** Vị trí của nhân sự trong chuyến (kể cả chặng xe của chuyến bay) */
const positionIn = (t: Trip, staffId: string): string => {
  const find = (crew: Trip['crew']) => (Object.entries(crew) as Array<[CrewSlot, string]>).find(([, id]) => id === staffId)?.[0];
  const direct = find(t.crew);
  if (direct) return SLOT_LABEL[direct];
  if (t.legs) {
    const o = t.legs.outbound?.crew ? find(t.legs.outbound.crew) : undefined; if (o) return `${SLOT_LABEL[o]} • chặng 1`;
    const i = t.legs.inbound?.crew ? find(t.legs.inbound.crew) : undefined; if (i) return `${SLOT_LABEL[i]} • chặng 2`;
  }
  return '';
};

export const CrewPage: React.FC = () => {
  const navigate = useNavigate();
  const { staff, trips } = useCoordinator();
  const [role, setRole] = useState<'all' | StaffRole>('all');
  const [q, setQ] = useState('');
  const list = staff.filter((s) => (role === 'all' || s.role === role) && (!q || s.name.toLowerCase().includes(q.toLowerCase())));

  return (
    <CoordinatorLayout title="Phân công nhân sự">
      <div className="crd-head">
        <div>
          <h2 className="crd-title">Phân công nhân sự</h2>
          <p className="crd-subtitle">Tài xế, phụ lái/áp tải và bác sĩ thú y. Mỗi người chỉ được gắn vào <b>một chuyến đang hoạt động</b>; phân công tại tab “Xe & nhân sự” của từng chuyến.</p>
        </div>
      </div>

      <div className="crd-card">
        <div className="crd-toolbar">
          <input className="crd-input crd-crew__search" placeholder="Tìm theo tên…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="crd-select" value={role} onChange={(e) => setRole(e.target.value as 'all' | StaffRole)}>
            <option value="all">Mọi vị trí</option>
            {(Object.keys(ROLE_LABEL) as StaffRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </div>
        <div className="crd-table-wrap">
          <table className="crd-table">
            <thead><tr><th>Nhân sự</th><th>Vị trí</th><th>Quốc gia</th><th>Bằng lái / chứng chỉ</th><th>Đang gắn với chuyến</th><th>Hiện tại</th></tr></thead>
            <tbody>
              {list.map((s) => {
                const t = trips.find((x) => isActiveTrip(x) && tripPersonnelIds(x).includes(s.id));
                return (
                  <tr key={s.id}>
                    <td><span className="crd-strong">{s.name}</span><div className="crd-muted">{s.phone}</div></td>
                    <td>{ROLE_LABEL[s.role]}</td>
                    <td>{countryName(s.country)}</td>
                    <td>{s.certExpiry ? <>Chứng chỉ thú y<div className="crd-muted">hiệu lực đến {fmtDate(s.certExpiry)}</div></> : s.licence ?? '—'}</td>
                    <td>{t ? <><button type="button" className="crd-link" onClick={() => navigate(`/coordinator/trips/${t.id}/resources`)}>{t.id}</button><div className="crd-muted">{positionIn(t, s.id)}</div></> : <span className="crd-muted">—</span>}</td>
                    <td>{t?.status === 'IN_TRANSIT' ? <TripStatusBadge tone="brand" label="Đang trên chuyến" /> : t ? <TripStatusBadge tone="info" label="Đã gắn chuyến" /> : <TripStatusBadge tone="ok" label="Sẵn sàng" />}</td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={6} className="crd-empty">Không có nhân sự phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </CoordinatorLayout>
  );
};

export default CrewPage;
