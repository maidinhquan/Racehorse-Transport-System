import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Place, TransportRequest } from '../../../types';
import { useCustomer } from '../../../hooks/useCustomer';
import { cityLabel } from '../../../hooks/customerRules';
import { Note } from '../../../components/Common/Common';

type PlaceKey = 'pickup' | 'delivery';
const LABELS: Record<PlaceKey, { name: string; contact: string; address: string; phone: string }> = {
  pickup: { name: 'Tên địa điểm nhận *', contact: 'Người liên hệ *', address: 'Địa chỉ nhận *', phone: 'Số điện thoại *' },
  delivery: { name: 'Tên địa điểm giao *', contact: 'Người nhận *', address: 'Địa chỉ giao *', phone: 'Số điện thoại người nhận *' },
};

/** Bước 2/4 – điểm nhận và điểm giao */
export const PlacesStep: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const navigate = useNavigate();
  const { actions } = useCustomer();
  const [places, setPlaces] = useState<Record<PlaceKey, Place>>({ pickup: { ...r.pickup }, delivery: { ...r.delivery } });
  const [tried, setTried] = useState(false);

  const set = (k: PlaceKey, f: keyof Place, v: string) => setPlaces((p) => ({ ...p, [k]: { ...p[k], [f]: v } }));
  const missing = (k: PlaceKey, f: keyof Place) => tried && ['name', 'address', 'contact', 'phone'].includes(f) && !places[k][f].trim();
  const missingCount = (['pickup', 'delivery'] as PlaceKey[])
    .reduce((n, k) => n + (['name', 'address', 'contact', 'phone'] as const).filter((f) => !places[k][f].trim()).length, 0);

  const save = () => {
    setTried(true);
    const res = actions.savePlaces(r.id, places.pickup, places.delivery);
    if (res.ok) navigate(`/customer/requests/${r.id}/wizard/2`);
  };

  const block = (k: PlaceKey, title: string) => {
    const L = LABELS[k], p = places[k];
    const input = (f: keyof Place, label: string, type = 'text', full = false) => (
      <div className={`cus-field ${full ? 'cus-wizard__full' : ''}`}>
        <label htmlFor={`${k}-${f}`}>{label}</label>
        <input id={`${k}-${f}`} type={type} className={`cus-input ${missing(k, f) ? 'invalid' : ''}`} value={p[f]} onChange={(e) => set(k, f, e.target.value)} />
      </div>
    );
    return (
      <div className="cus-card">
        <h3 className="cus-card__title">{title}</h3>
        <div className="cus-wizard__grid">
          {input('name', L.name)}
          {input('contact', L.contact)}
          {input('address', L.address, 'text', true)}
          {input('postal', 'Mã bưu chính')}
          {input('phone', L.phone, 'tel')}
          <div className="cus-field cus-wizard__full">
            <label htmlFor={`${k}-notes`}>Hướng dẫn thêm</label>
            <textarea id={`${k}-notes`} className="cus-textarea" rows={2} value={p.notes} placeholder="Giờ mở cổng, lối vào, lưu ý khi tiếp cận…"
              onChange={(e) => set(k, 'notes', e.target.value)} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="cus-stack">
      {tried && missingCount > 0 && <Note tone="red" title={`Còn ${missingCount} thông tin bắt buộc chưa điền`}>Các ô cần bổ sung được tô đỏ bên dưới.</Note>}
      {block('pickup', `Điểm nhận — ${cityLabel(r.origin)}`)}
      {block('delivery', `Điểm giao — ${cityLabel(r.destination)}`)}
      <div className="cus-wizard__actions">
        <button type="button" className="cus-btn cus-btn--lg" onClick={() => navigate(`/customer/requests/${r.id}/edit`)}>Quay lại</button>
        <button type="button" className="cus-btn cus-btn--solid cus-btn--lg" onClick={save}>Lưu & tiếp tục</button>
      </div>
    </div>
  );
};

export default PlacesStep;
