import React, { useEffect, useRef, useState } from 'react';
import type { Place, RequestField } from '../../types';
import { BOOKING_DESTINATIONS, BOOKING_ORIGINS, city, cityLabel } from '../../hooks/customerRules';
import { customerApi } from '../../api/customerApi';
import { Icon } from '../CustomerLayout';

export type RequestPlaces = { pickup: Place; delivery: Place };
type PlaceKey = keyof RequestPlaces;
interface Props {
  places: RequestPlaces;
  origin: string;
  destination: string;
  onPlaceChange: (key: PlaceKey, place: Place) => void;
  onCityChange: (key: PlaceKey, value: string) => void;
  locked: (field: RequestField) => boolean;
  tried: boolean;
}
type Suggestion = Awaited<ReturnType<typeof customerApi.searchLocations>>[number];

/** Address and contact fields shared by request creation and revision. */
export const RequestPlacesFields: React.FC<Props> = ({ places, origin, destination, onPlaceChange, onCityChange, locked, tried }) => {
  const [search, setSearch] = useState<{ key: PlaceKey; text: string } | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const dropdown = useRef<HTMLDivElement>(null);
  const searchCountry = search ? city(search.key === 'pickup' ? origin : destination).country : '';

  useEffect(() => {
    if (!search || search.text.trim().length < 2 || !searchCountry) return;
    let active = true;
    const timeout = setTimeout(() => {
      customerApi.searchLocations(search.text.trim(), searchCountry)
        .then(rows => { if (active) setSuggestions(rows); })
        .catch(() => { if (active) setSuggestions([]); })
        .finally(() => { if (active) setSearching(false); });
    }, 350);
    return () => { active = false; clearTimeout(timeout); };
  }, [search, searchCountry]);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!dropdown.current?.contains(event.target as Node)) setSearch(null); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return <div className="cus-create__places">{(['pickup', 'delivery'] as const).map((key, index) => {
    const place = places[key], selectedCity = key === 'pickup' ? origin : destination;
    const cities = key === 'pickup' ? BOOKING_ORIGINS : BOOKING_DESTINATIONS;
    const set = (field: keyof Place, value: string) => onPlaceChange(key, { ...place, [field]: value });
    const missing = (field: keyof Place) => tried && !String(place[field] ?? '').trim();
    const input = (field: 'name' | 'postal' | 'contact' | 'phone', label: string, required = false, full = false) => <div className={`cus-field ${full ? 'cus-create__full' : ''}`}>
      <label htmlFor={`request-${key}-${field}`}>{label}{required && ' *'}</label>
      <input id={`request-${key}-${field}`} className={`cus-input ${required && missing(field) ? 'invalid' : ''}`} type={field === 'phone' ? 'tel' : 'text'}
        required={required} aria-invalid={required && missing(field)} disabled={locked('places')} value={place[field]} onChange={event => set(field, event.target.value)} />
    </div>;
    return <section key={key} className="cus-card cus-create__place">
      <div className="cus-create__place-heading"><span className={`cus-create__place-number ${key}`}>0{index + 1}</span><div>
        <h3>{key === 'pickup' ? 'Nhận ngựa' : 'Giao ngựa'}</h3>
        <p>{key === 'pickup' ? 'Địa điểm đón ngựa và người bàn giao.' : 'Địa điểm đến và người nhận ngựa.'}</p>
      </div></div>
      <div className="cus-create__grid">
        {input('name', key === 'pickup' ? 'Tên chuồng / câu lạc bộ' : 'Tên chuồng / trường đua', true, true)}
        <div className="cus-field cus-create__full"><label htmlFor={`request-${key}-city`}>Tỉnh/thành phố *</label>
          <select id={`request-${key}-city`} className={`cus-select ${tried && !selectedCity ? 'invalid' : ''}`} value={selectedCity} required disabled={locked('route')}
            onChange={event => { onCityChange(key, event.target.value); setSearch(null); setSuggestions([]); }}>
            <option value="">Chọn tỉnh/thành phố</option>
            {cities.map(c => <option key={c.name} value={c.name}>{cityLabel(c.name)}</option>)}
            {selectedCity && !cities.some(c => c.name === selectedCity) && <option value={selectedCity} disabled>{cityLabel(selectedCity)} – không còn nhận</option>}
          </select>
        </div>
        <div className="cus-field cus-create__full cus-create__address" ref={search?.key === key ? dropdown : undefined}>
          <label htmlFor={`request-${key}-address`}>Địa chỉ chi tiết *</label>
          <input id={`request-${key}-address`} className={`cus-input ${missing('address') ? 'invalid' : ''}`} required aria-invalid={missing('address')}
            disabled={locked('places')} autoComplete="off" placeholder="Số nhà, đường, phường/xã…" value={place.address}
            onChange={event => {
              const text = event.target.value;
              onPlaceChange(key, { ...place, address: text, latitude: undefined, longitude: undefined });
              setSuggestions([]); setSearching(text.trim().length >= 2 && !!selectedCity);
              setSearch(text.trim().length >= 2 && selectedCity ? { key, text } : null);
            }} />
          {search?.key === key && <div className="cus-create__suggestions" aria-label="Gợi ý địa chỉ">
            {searching ? <p>Đang tìm địa chỉ…</p> : suggestions.length ? suggestions.map((item, i) => <button type="button" key={`${item.label}-${i}`}
              onClick={() => { onPlaceChange(key, { ...place, address: item.label, latitude: item.point.latitude, longitude: item.point.longitude }); setSearch(null); }}>
              <Icon name="pin" />{item.label}
            </button>) : <p>Bạn có thể tiếp tục nhập địa chỉ thủ công.</p>}
          </div>}
          {place.latitude != null && place.longitude != null && <small className="cus-create__location-confirmed"><Icon name="check" />Đã xác định vị trí trên bản đồ</small>}
        </div>
        {input('postal', 'Mã bưu chính (không bắt buộc)', false, true)}
      </div>
      <div className="cus-create__contact"><h4>{key === 'pickup' ? 'Người bàn giao ngựa' : 'Người nhận ngựa'}</h4><div className="cus-create__grid">
        {input('contact', 'Họ và tên', true)}{input('phone', 'Số điện thoại', true)}
        <div className="cus-field cus-create__full"><label htmlFor={`request-${key}-notes`}>Ghi chú địa điểm (không bắt buộc)</label>
          <textarea id={`request-${key}-notes`} className="cus-textarea" rows={2} disabled={locked('places')} value={place.notes}
            placeholder="Giờ mở cửa, lối vào cho xe vận chuyển…" onChange={event => set('notes', event.target.value)} />
        </div>
      </div></div>
    </section>;
  })}</div>;
};
