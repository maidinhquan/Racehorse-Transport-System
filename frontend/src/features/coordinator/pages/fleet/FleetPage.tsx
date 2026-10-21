import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoordinatorLayout } from '../../components/CoordinatorLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { useCoordinator } from '../../hooks/useCoordinator';
import { countryName, fmtDate, isActiveTrip, tripVehicleIds } from '../../hooks/coordinatorRules';
import { DEMO_TODAY } from '../../data/mockData';
import './FleetPage.css';

export const FleetPage: React.FC = () => {
  const navigate = useNavigate();
  const { vehicles, trips } = useCoordinator();
  const [country, setCountry] = useState('all');
  const countries = useMemo(() => [...new Set(vehicles.map((v) => v.country))], [vehicles]);
  const list = vehicles.filter((v) => country === 'all' || v.country === country);
  const tripOf = (id: string) => trips.find((t) => isActiveTrip(t) && tripVehicleIds(t).includes(id));

  return (
    <CoordinatorLayout title="Đội xe">
      <div className="crd-head">
        <div>
          <h2 className="crd-title">Đội xe</h2>
          <p className="crd-subtitle">Xe vận chuyển ngựa theo quốc gia. Mỗi xe chỉ phục vụ một chuyến đang hoạt động; xe bảo dưỡng không được phân công.</p>
        </div>
        <select className="crd-select" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="all">Mọi quốc gia</option>
          {countries.map((c) => <option key={c} value={c}>{countryName(c)}</option>)}
        </select>
      </div>

      <div className="crd-fleet-grid">
        {list.map((v) => {
          const t = tripOf(v.id);
          const serviceSoon = v.nextService <= DEMO_TODAY.slice(0, 8) + '31';
          return (
            <div key={v.id} className="crd-card crd-fleet-card">
              <div className="crd-fleet-card__top">
                <div><b>{v.plate}</b><div className="crd-muted">{v.model}</div></div>
                <TripStatusBadge status={v.status} />
              </div>
              <div className="crd-kv">
                <div><span>Sức chứa</span><b>{v.stalls} ngăn</b></div>
                <div><span>Quốc gia / bãi</span><b>{countryName(v.country)} • {v.base}</b></div>
                <div><span>Bảo dưỡng kế tiếp</span><b style={serviceSoon ? { color: '#b45309' } : undefined}>{fmtDate(v.nextService)}</b></div>
                <div><span>Đang phục vụ</span><b>{t ? <button type="button" className="crd-link" onClick={() => navigate(`/coordinator/trips/${t.id}`)}>{t.id}</button> : 'Trống'}</b></div>
              </div>
              <p className="crd-muted" style={{ marginTop: 10 }}>{v.features}</p>
            </div>
          );
        })}
      </div>
    </CoordinatorLayout>
  );
};

export default FleetPage;
