import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoordinatorLayout } from '../../components/CoordinatorLayout';
import { TripStatusBadge, type BadgeTone } from '../../components/TripStatusBadge/TripStatusBadge';
import { useCoordinator } from '../../hooks/useCoordinator';
import { SEVERITY_LABEL, fmtDateTime } from '../../hooks/coordinatorRules';
import type { IncidentSeverity } from '../../types';
import './IncidentsPage.css';

const SEVERITY_TONE: Record<IncidentSeverity, BadgeTone> = { LOW: 'muted', MEDIUM: 'warn', HIGH: 'bad', CRITICAL: 'bad' };

export const IncidentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { incidents } = useCoordinator();
  const [onlyOpen, setOnlyOpen] = useState(true);
  const list = incidents.filter((i) => !onlyOpen || !['RESOLVED', 'CLOSED'].includes(i.status));

  return (
    <CoordinatorLayout title="Sự cố">
      <div className="crd-head">
        <div>
          <h2 className="crd-title">Sự cố</h2>
          <p className="crd-subtitle">Sự cố do tổ xe báo trên đường. Coordinator theo dõi và điều chỉnh ETA; Manager quyết định phương án xử lý.</p>
        </div>
        <label className="crd-incident__toggle"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> Chỉ hiện sự cố đang mở</label>
      </div>

      <div className="crd-card">
        <div className="crd-table-wrap">
          <table className="crd-table">
            <thead><tr><th>Sự cố</th><th>Chuyến</th><th>Mô tả</th><th>Mức độ</th><th>Báo lúc</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id} className="clickable" onClick={() => navigate(`/coordinator/trips/${i.tripId}/tracking`)}>
                  <td><span className="crd-strong">{i.id}</span><div className="crd-muted">{i.type.replace(/_/g, ' ').toLowerCase()}</div></td>
                  <td>{i.tripId}</td>
                  <td className="crd-incident__desc">{i.description}</td>
                  <td><TripStatusBadge tone={SEVERITY_TONE[i.severity]} label={SEVERITY_LABEL[i.severity]} /></td>
                  <td>{fmtDateTime(i.reportedAt)}<div className="crd-muted">{i.reportedBy}</div></td>
                  <td><TripStatusBadge status={i.status} /></td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={6} className="crd-empty">Không có sự cố.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </CoordinatorLayout>
  );
};

export default IncidentsPage;
