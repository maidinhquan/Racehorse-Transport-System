import React, { useEffect, useRef, useState } from 'react';
import type { Place, RequestField } from '../../types';
import { BOOKING_DESTINATIONS, BOOKING_ORIGINS, city, cityLabel, getCityId, getDefaultCoordinates } from '../../hooks/customerRules';
import { customerApi } from '../../api/customerApi';
import { Icon } from '../CustomerLayout';
import { getDemoMode } from '../../../../shared/context/DemoModeContext';
import { apiMessage } from '../../../../shared/api/apiError';

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

// City → boundary ID rarely changes; cache per page session so re-selecting a city costs no request.
const cityIdCache = new Map<string, Promise<string | undefined>>();
const resolveCityId = (country: string, name: string) => {
  const key = `${country}:${name}`;
  let hit = cityIdCache.get(key);
  if (!hit) {
    hit = customerApi.getCities(country, name).then(rows => rows[0]?.cityId);
    hit.catch(() => cityIdCache.delete(key)); // never cache failures
    cityIdCache.set(key, hit);
  }
  return hit;
};

/**
 * Resolves the selected city name to the provider's boundary ID (`cityId`) required by
 * `/locations/search` and request saves, so customers only pick a city and type an address.
 * Uses the first (best-ranked) match from `/locations/cities`; retries automatically on failure
 * (e.g. rate limiting) and renders only status or errors.
 */
const CityBoundaryResolver: React.FC<{ name: string; country: string; value?: string; onResolve: (id: string) => void }> = ({ name, country, value, onResolve }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const resolve = useRef(onResolve);
  resolve.current = onResolve;
  useEffect(() => { setAttempt(0); }, [name, country]);
  useEffect(() => {
    setError('');
    if (!name || value) { setLoading(false); return; }
    let active = true, retry: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    resolveCityId(country, name)
      .then(id => {
        if (!active) return;
        if (id) resolve.current(id);
        else setError('Không xác định được tỉnh/thành phố này trên bản đồ.');
      })
      .catch(e => {
        if (!active) return;
        const limited = /too many requests|RATE_LIMITED|429/i.test(`${apiMessage(e)} ${(e as { code?: string })?.code ?? ''}`);
        setError(limited ? 'Hệ thống đang bận, sẽ tự thử lại sau ít giây…' : `${apiMessage(e)} Đang thử lại…`);
        if (attempt < 5) retry = setTimeout(() => setAttempt(a => a + 1), limited ? 20000 : 5000);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; if (retry) clearTimeout(retry); };
  }, [name, country, value, attempt]);
  if (loading) return <p className="cus-create__full hint">Đang xác định tỉnh/thành phố trên bản đồ…</p>;
  return error ? <span className="cus-create__full" role="alert">{error}</span> : null;
};

/** Address and contact fields shared by request creation and revision. */
export const RequestPlacesFields: React.FC<Props> = ({ places, origin, destination, onPlaceChange, onCityChange, locked, tried }) => {
  const [search, setSearch] = useState<{ key: PlaceKey; text: string } | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const dropdown = useRef<HTMLDivElement>(null);

  const activeCity = search ? (search.key === 'pickup' ? origin : destination) : '';
  const searchCountry = search ? city(activeCity).country : 'VN';
  const activePlace = search ? places[search.key] : null;
  const demo = getDemoMode('customer');
  const searchCityId = activePlace?.cityId || (demo ? getCityId(activeCity) : '');

  useEffect(() => {
    if (!search || !searchCityId || search.text.trim().length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    let active = true;
    setSearching(true);
    const timeout = setTimeout(() => {
      customerApi.searchLocations(search.text.trim(), searchCountry, activeCity, searchCityId)
        .then(rows => { if (active) setSuggestions(rows); })
        .catch(() => { if (active) setSuggestions([]); })
        .finally(() => { if (active) setSearching(false); });
    }, 900); // Each backend search is rate-limited (~1 req/s plus boundary checks); avoid one per keystroke.
    return () => { active = false; clearTimeout(timeout); };
  }, [search, searchCountry, activeCity, searchCityId]);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!dropdown.current?.contains(event.target as Node)) setSearch(null); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return <div className="cus-create__places">{(['pickup', 'delivery'] as const).map((key, index) => {
    const place = places[key], selectedCity = key === 'pickup' ? origin : destination;
    const cities = key === 'pickup' ? BOOKING_ORIGINS : BOOKING_DESTINATIONS;
    const itemCountry = city(selectedCity).country;
    const itemCityId = place.cityId || (demo ? getCityId(selectedCity) : '');
    const set = (field: keyof Place, value: string) => onPlaceChange(key, { ...place, [field]: value });
    const missing = (field: keyof Place) => tried && !String(place[field] ?? '').trim();
    const input = (field: 'name' | 'postal' | 'contact' | 'phone', label: string, required = false, full = false, placeholder = '') => <div className={`cus-field ${full ? 'cus-create__full' : ''}`}>
      <label htmlFor={`request-${key}-${field}`}>{label}{required && ' *'}</label>
      <input id={`request-${key}-${field}`} className={`cus-input ${required && missing(field) ? 'invalid' : ''}`} type={field === 'phone' ? 'tel' : 'text'}
        placeholder={placeholder} required={required} aria-invalid={required && missing(field)} disabled={locked('places')} value={place[field]} onChange={event => set(field, event.target.value)} />
    </div>;
    return <section key={key} className="cus-card cus-create__place">
      <div className="cus-create__place-heading"><span className={`cus-create__place-number ${key}`}>0{index + 1}</span><div>
        <h3>{key === 'pickup' ? 'Nhận ngựa' : 'Giao ngựa'}</h3>
        <p>{key === 'pickup' ? 'Nơi CBN đón ngựa và người bàn giao.' : 'Nơi CBN đưa ngựa đến và người nhận.'}</p>
      </div></div>
      <div className="cus-create__grid">
        {input('name', key === 'pickup' ? 'Tên chuồng / câu lạc bộ' : 'Tên chuồng / trường đua', true, true)}
        <div className="cus-field cus-create__full"><label htmlFor={`request-${key}-city`}>Tỉnh/thành phố *</label>
          <select id={`request-${key}-city`} className={`cus-select ${tried && !selectedCity ? 'invalid' : ''}`} value={selectedCity} required disabled={locked('route')}
            onChange={event => {
              const newCity = event.target.value;
              onCityChange(key, newCity);
              onPlaceChange(key, {
                ...place,
                cityId: demo ? getCityId(newCity) : '',
                cityName: newCity,
                latitude: undefined, longitude: undefined,
              });
              setSearch(null);
              setSuggestions([]);
            }}>
            <option value="">Chọn tỉnh/thành phố</option>
            {cities.map(c => <option key={c.name} value={c.name}>{cityLabel(c.name)}</option>)}
            {selectedCity && !cities.some(c => c.name === selectedCity) && <option value={selectedCity} disabled>{cityLabel(selectedCity)} – không còn nhận</option>}
          </select>
        </div>
        {!demo && <CityBoundaryResolver name={selectedCity} country={itemCountry} value={place.cityId}
          onResolve={cityId => onPlaceChange(key, { ...place, cityId, latitude: undefined, longitude: undefined })} />}
        <div className="cus-field cus-create__full cus-create__address" ref={search?.key === key ? dropdown : undefined}>
          <label htmlFor={`request-${key}-address`}>Địa chỉ chi tiết *</label>
          <div className="cus-create__address-input-group">
            <input
              id={`request-${key}-address`}
              className={`cus-input ${missing('address') ? 'invalid' : ''}`}
              required
              aria-invalid={missing('address')}
              disabled={locked('places')}
              autoComplete="off"
              placeholder="VD: S1.07 Vinhomes Grand Park"
              value={place.address}
              onFocus={() => {
                setSearch({ key, text: place.address || '' });
              }}
              onChange={event => {
                const text = event.target.value;
                onPlaceChange(key, {
                  ...place,
                  address: text,
                  latitude: undefined,
                  longitude: undefined,
                  cityId: itemCityId,
                  cityName: selectedCity,
                });
                setSearch({ key, text });
              }}
              onBlur={() => {
                if (demo && place.address.trim() && (!place.latitude || !place.longitude)) {
                  const coords = getDefaultCoordinates(selectedCity);
                  onPlaceChange(key, {
                    ...place,
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    cityId: place.cityId || getCityId(selectedCity),
                    cityName: selectedCity,
                  });
                }
              }}
            />
            <button
              type="button"
              className="cus-btn-find-loc"
              disabled={locked('places') || !place.address.trim() || !itemCityId}
              onClick={() => {
                const text = place.address.trim();
                if (!text) return;
                setSearch({ key, text });
                setSearching(true);
                customerApi.searchLocations(text, itemCountry, selectedCity, itemCityId)
                  .then(rows => setSuggestions(rows))
                  .catch(() => setSuggestions([]))
                  .finally(() => setSearching(false));
              }}
            >
              <Icon name="pin" /> Tìm vị trí
            </button>
          </div>
          <p className="cus-create__address-hint">
            Nhập số nhà, toà / căn hộ hoặc tên địa điểm (VD: S1.07 Vinhomes Grand Park) rồi bấm Tìm vị trí. Hệ thống tìm trong tỉnh/thành phố bạn chọn ở trên và trả về địa chỉ chính xác kèm toạ độ.
          </p>
          {search?.key === key && <div className="cus-create__suggestions" aria-label="Gợi ý địa chỉ">
            {searching ? <p>Đang tìm địa chỉ…</p> : suggestions.length ? suggestions.map((item, i) => (
              <button
                type="button"
                key={`${item.label}-${i}`}
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  onPlaceChange(key, {
                    ...place,
                    address: item.label,
                    latitude: item.point.latitude,
                    longitude: item.point.longitude,
                    cityId: itemCityId,
                    cityName: selectedCity,
                  });
                  setSearch(null);
                  setSuggestions([]);
                }}
              >
                <Icon name="pin" />{item.label}
              </button>
            )) : <p>Không tìm thấy. Thử nhập số nhà và tên đường (VD: 12 Nguyễn Huệ, Quận 1) thay vì tên quán/cửa hàng.</p>}
          </div>}
          {place.latitude != null && place.longitude != null && (
            <small className="cus-create__location-confirmed">
              <Icon name="check" />Đã xác định vị trí trên bản đồ
            </small>
          )}
        </div>
        {input('postal', 'Mã bưu chính (không bắt buộc)', false, true)}
      </div>
      <div className="cus-create__contact"><h4>{key === 'pickup' ? 'Người bàn giao ngựa' : 'Người nhận ngựa'}</h4><div className="cus-create__grid">
        {input('contact', 'Họ và tên', true)}{input('phone', 'Số điện thoại', true, false, '+84...')}
        <div className="cus-field cus-create__full"><label htmlFor={`request-${key}-notes`}>Ghi chú về địa điểm (không bắt buộc)</label>
          <textarea id={`request-${key}-notes`} className="cus-textarea" rows={2} disabled={locked('places')} value={place.notes}
            placeholder="Giờ mở cửa, lối vào cho xe vận chuyển…" onChange={event => set('notes', event.target.value)} />
        </div>
      </div></div>
    </section>;
  })}</div>;
};
