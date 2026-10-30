import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DriverLayout } from '../../components/DriverLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { useDriver } from '../../hooks/useDriver';
import { fmtDateTime, myPosition } from '../../hooks/driverRules';
import './HistoryPage.css';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { completedTrips, me, userId } = useDriver();
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...completedTrips]
      .filter((t) => !s || [t.id, t.requestId, t.origin, t.destination, t.customer].some((x) => x.toLowerCase().includes(s)))
      .sort((a, b) => b.plannedDepart.localeCompare(a.plannedDepart));
  }, [completedTrips, q]);

  return (
    <DriverLayout title="Lịch sử">
      <div className="drv-head">
        <div>
          <h2 className="drv-title">Lịch sử chuyến</h2>
          <p className="drv-subtitle">{me?.name ?? ''} • các chuyến đã hoàn tất</p>
        </div>
        <input className="drv-input drv-history__search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm chuyến, tuyến, khách hàng…" aria-label="Tìm chuyến" />
      </div>
      <div className="drv-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="drv-table-wrap">
          <table className="drv-table">
            <thead><tr><th>Chuyến</th><th>Tuyến</th><th>Vai trò</th><th>Khởi hành</th><th>Đến nơi</th><th>Số mốc</th><th>Bàn giao</th></tr></thead>
            <tbody>
              {rows.map((t) => {
                const arrived = t.milestones.find((x) => x.type === 'ARRIVED_DESTINATION');
                return (
                  <tr key={t.id} className="clickable" onClick={() => navigate(`/driver/trips/${t.id}`)}>
                    <td><span className="drv-strong">{t.id}</span><div className="drv-muted">{t.requestId}</div></td>
                    <td>{t.origin} → {t.destination}</td>
                    <td>{myPosition(t, userId)}</td>
                    <td>{fmtDateTime(t.milestones[0]?.at ?? t.plannedDepart)}</td>
                    <td>{arrived ? fmtDateTime(arrived.at) : '—'}</td>
                    <td>{t.milestones.length}</td>
                    <td>{t.handover ? <TripStatusBadge tone="ok" label="Đã bàn giao" /> : '—'}</td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={7} className="drv-empty"><b>Chưa có chuyến hoàn tất</b></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DriverLayout>
  );
};

export default HistoryPage;
