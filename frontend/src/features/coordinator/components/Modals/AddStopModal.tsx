import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import type { RouteStop, StopType } from '../../types';
import { STOP_LABEL } from '../../hooks/coordinatorRules';
import { COUNTRY_NAME } from '../../data/mockData';
import { isGeoPoint, loadCheckpointCatalog, nearbyCheckpoints } from '../../api/checkpointCatalog';
import type { CheckpointDto, GeoPoint } from '../../api/checkpointCatalog';

interface AddStopModalProps {
  open: boolean; defaultCountry: string; defaultTime: string;
  hasOrigin: boolean; hasDestination: boolean; initialPoint?: GeoPoint | null;
  onClose: () => void; onSubmit: (stop: Omit<RouteStop, 'id'>) => boolean;
}

// Mount một form mới mỗi lần mở để không giữ lựa chọn của lần trước.
export function AddStopModal(props: AddStopModalProps) {
  return props.open ? <StopForm {...props} /> : null;
}

function StopForm({ defaultCountry, defaultTime, hasOrigin, hasDestination, initialPoint, onClose, onSubmit }: AddStopModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<StopType>(hasOrigin ? 'REST_STOP' : 'ORIGIN');
  const [country, setCountry] = useState(defaultCountry);
  const [plannedAt, setPlannedAt] = useState(defaultTime.replace(' ', 'T'));
  const [lat, setLat] = useState(initialPoint ? String(initialPoint.lat) : '');
  const [lng, setLng] = useState(initialPoint ? String(initialPoint.lng) : '');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<CheckpointDto[]>([]);
  const [status, setStatus] = useState('Đang tải danh mục...');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    loadCheckpointCatalog().then(result => {
      if (cancelled) return;
      setCatalog(result.items);
      setStatus(result.source === 'demo' ? 'Dữ liệu mẫu để thử giao diện; chưa đọc database.' : 'Danh mục từ API backend.');
    }).catch(() => {
      if (!cancelled) setStatus('Không tải được danh mục. Kiểm tra backend, đăng nhập và VITE_API_URL.');
    });
    return () => { cancelled = true; };
  }, [retry]);

  const point = { lat: lat.trim() ? Number(lat) : NaN, lng: lng.trim() ? Number(lng) : NaN };
  const validPoint = isGeoPoint(point);
  const requiresCatalog = type !== 'ORIGIN' && type !== 'DESTINATION';
  const nearby = nearbyCheckpoints(catalog, point, country, type);
  const selected = nearby.find(result => result.item.checkpointId === selectedId)?.item;
  const valid = validPoint && !!plannedAt && (requiresCatalog ? !!selected : name.trim().length >= 3);
  const types = (Object.keys(STOP_LABEL) as StopType[]).filter(t => !(t === 'ORIGIN' && hasOrigin) && !(t === 'DESTINATION' && hasDestination));

  const submit = () => {
    if (!valid) return;
    // Khi xác nhận một cơ sở, lưu tọa độ cơ sở thay vì vị trí đã bấm.
    const stop: Omit<RouteStop, 'id'> = {
      name: requiresCatalog ? selected!.name : name.trim(), type, country,
      plannedAt: plannedAt.replace('T', ' '),
      lat: requiresCatalog ? selected!.lat : point.lat,
      lng: requiresCatalog ? selected!.lng : point.lng,
      ...(requiresCatalog ? { checkpointId: selected!.checkpointId } : {}),
    };
    if (onSubmit(stop)) onClose();
  };

  return <Modal open title="Thêm điểm dừng" okText="Thêm vào tuyến" onOk={submit} onClose={onClose} okDisabled={!valid}>
    <div className="crd-modal__grid">
      <div className="crd-field"><label htmlFor="crd-stop-type">Loại điểm *</label>
        <select id="crd-stop-type" className="crd-select" value={type} onChange={e => { setType(e.target.value as StopType); setSelectedId(null); }}>
          {types.map(t => <option key={t} value={t}>{STOP_LABEL[t]}</option>)}
        </select></div>
      <div className="crd-field"><label htmlFor="crd-stop-country">Quốc gia *</label>
        <select id="crd-stop-country" className="crd-select" value={country} onChange={e => { setCountry(e.target.value); setSelectedId(null); }}>
          {Object.entries(COUNTRY_NAME).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
        </select></div>
      <div className="crd-field"><label htmlFor="crd-stop-lat">Vĩ độ (lat) *</label>
        <input id="crd-stop-lat" className="crd-input" type="number" min="-90" max="90" step="any" value={lat} onChange={e => { setLat(e.target.value); setSelectedId(null); }} /></div>
      <div className="crd-field"><label htmlFor="crd-stop-lng">Kinh độ (lng) *</label>
        <input id="crd-stop-lng" className="crd-input" type="number" min="-180" max="180" step="any" value={lng} onChange={e => { setLng(e.target.value); setSelectedId(null); }} /></div>
    </div>
    {!validPoint && <p role="status">Bấm bản đồ trước khi mở form hoặc nhập tọa độ hợp lệ.</p>}
    {requiresCatalog ? <fieldset style={{ margin: '12px 0', padding: 12 }}>
      <legend>Chọn cơ sở gần vị trí đã bấm</legend>
      <p role="status">{status}</p>
      <button type="button" className="crd-btn crd-btn--sm" onClick={() => { setCatalog([]); setSelectedId(null); setStatus('Đang tải danh mục...'); setRetry(value => value + 1); }}>Tải lại danh mục</button>
      {nearby.map(({ item, distance }) => <label key={item.checkpointId} style={{ display: 'block', margin: '12px 0' }}>
        <input type="radio" name="crd-checkpoint" checked={selectedId === item.checkpointId} onChange={() => setSelectedId(item.checkpointId)} />
        {' '}{item.name} — cách vị trí bấm {(distance / 1000).toFixed(2)} km
      </label>)}
      {validPoint && !nearby.length && <p>Không có cơ sở phù hợp trong 5 km. Chọn lại vị trí, loại điểm hoặc quốc gia. Cơ sở mới cần được bổ sung vào danh mục trước.</p>}
      <small>Khoảng cách địa lý để gợi ý; cần xác nhận cơ sở trước khi thêm.</small>
    </fieldset> : <div className="crd-field"><label htmlFor="crd-stop-name">Tên điểm dừng *</label>
      <input id="crd-stop-name" className="crd-input" value={name} onChange={e => setName(e.target.value)} /></div>}
    <div className="crd-field"><label htmlFor="crd-stop-time">Thời gian dự kiến *</label>
      <input id="crd-stop-time" className="crd-input" type="datetime-local" value={plannedAt} onChange={e => setPlannedAt(e.target.value)} /></div>
  </Modal>;
}

export default AddStopModal;
