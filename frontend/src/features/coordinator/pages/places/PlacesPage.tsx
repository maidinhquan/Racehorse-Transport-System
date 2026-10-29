import React, { useEffect, useMemo, useState } from 'react';
import { CoordinatorLayout } from '../../components/CoordinatorLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { loadCheckpointCatalog, type CheckpointDto } from '../../api/checkpointCatalog';
import { PLACE_TYPE_LABEL, countryName } from '../../hooks/coordinatorRules';
import './PlacesPage.css';

/** Quản lý địa điểm: cửa khẩu, sân bay, trạm kiểm dịch, điểm nghỉ dùng khi lập tuyến */
export const PlacesPage: React.FC = () => {
  const [items, setItems] = useState<CheckpointDto[]>([]);
  const [source, setSource] = useState<'demo' | 'api' | ''>('');
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('all');
  const [type, setType] = useState('all');

  useEffect(() => {
    let alive = true;
    void loadCheckpointCatalog().then((r) => { if (alive) { setItems(r.items); setSource(r.source); } });
    return () => { alive = false; };
  }, []);

  const countries = useMemo(() => [...new Set(items.map((x) => x.country))].sort(), [items]);
  const types = useMemo(() => [...new Set(items.map((x) => x.type))].sort(), [items]);
  const rows = items.filter((x) =>
    (country === 'all' || x.country === country) && (type === 'all' || x.type === type)
    && (!q.trim() || x.name.toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <CoordinatorLayout title="Quản lý địa điểm">
      <div className="crd-head">
        <div>
          <h2 className="crd-title">Quản lý địa điểm</h2>
          <p className="crd-subtitle">Danh mục cửa khẩu, sân bay, trạm kiểm dịch và điểm nghỉ dùng khi lập tuyến. Điểm có toạ độ sẽ được gợi ý khi bạn chấm điểm dừng trên bản đồ.</p>
        </div>
        {source && <TripStatusBadge tone={source === 'api' ? 'ok' : 'muted'} label={source === 'api' ? 'Dữ liệu hệ thống' : 'Dữ liệu mẫu'} />}
      </div>

      <div className="crd-toolbar">
        <input className="crd-input crd-places__search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên địa điểm…" aria-label="Tìm địa điểm" />
        <select className="crd-select" value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Quốc gia">
          <option value="all">Tất cả quốc gia</option>
          {countries.map((c) => <option key={c} value={c}>{countryName(c)}</option>)}
        </select>
        <select className="crd-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Loại địa điểm">
          <option value="all">Tất cả loại</option>
          {types.map((t) => <option key={t} value={t}>{PLACE_TYPE_LABEL[t] ?? t}</option>)}
        </select>
      </div>

      <div className="crd-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="crd-table-wrap">
          <table className="crd-table">
            <thead><tr><th>Mã</th><th>Tên địa điểm</th><th>Loại</th><th>Quốc gia</th><th>Toạ độ</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.checkpointId}>
                  <td className="crd-strong">{x.checkpointId}</td>
                  <td>{x.name}</td>
                  <td>{PLACE_TYPE_LABEL[x.type] ?? x.type}</td>
                  <td>{countryName(x.country)}</td>
                  <td className="crd-muted">{x.lat != null && x.lng != null ? `${x.lat.toFixed(4)}, ${x.lng.toFixed(4)}` : 'Chưa có'}</td>
                  <td><TripStatusBadge tone={x.active ? 'ok' : 'muted'} label={x.active ? 'Đang dùng' : 'Ngừng dùng'} /></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="crd-empty">{items.length ? 'Không có địa điểm phù hợp.' : 'Đang tải danh mục…'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </CoordinatorLayout>
  );
};

export default PlacesPage;
