import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Place, TransportRequest } from '../../../types';
import { useCustomer } from '../../../hooks/useCustomer';
import { city, cityLabel } from '../../../hooks/customerRules';
import { customerApi } from '../../../api/customerApi';
import { Note } from '../../../components/Common/Common';

type PlaceKey = 'pickup' | 'delivery';
const LABELS: Record<PlaceKey, { name: string; contact: string; address: string; phone: string }> = {
  pickup: { name: 'Tên địa điểm nhận *', contact: 'Người liên hệ *', address: 'Địa chỉ nhận *', phone: 'Số điện thoại *' },
  delivery: { name: 'Tên địa điểm giao *', contact: 'Người nhận *', address: 'Địa chỉ giao *', phone: 'Số điện thoại người nhận *' },
};

interface LocationSuggestion {
  label: string;
  point: {
    longitude: number;
    latitude: number;
    countryCode: string;
  };
  attribution?: string;
  provider?: string;
}

/** Bước 2/4 – điểm nhận và điểm giao */
export const PlacesStep: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const navigate = useNavigate();
  const { actions } = useCustomer();
  const [places, setPlaces] = useState<Record<PlaceKey, Place>>({ pickup: { ...r.pickup }, delivery: { ...r.delivery } });
  const [tried, setTried] = useState(false);

  // State quản lý autocomplete dropdown gợi ý vị trí
  const [activeSearchKey, setActiveSearchKey] = useState<PlaceKey | null>(null);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const set = (k: PlaceKey, f: keyof Place, v: any) => setPlaces((p) => ({ ...p, [k]: { ...p[k], [f]: v } }));
  const missing = (k: PlaceKey, f: keyof Place) => tried && ['name', 'address', 'contact', 'phone'].includes(f) && !String(places[k][f] || '').trim();
  const missingCount = (['pickup', 'delivery'] as PlaceKey[])
    .reduce((n, k) => n + (['name', 'address', 'contact', 'phone'] as const).filter((f) => !String(places[k][f] || '').trim()).length, 0);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveSearchKey(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddressChange = (k: PlaceKey, text: string) => {
    set(k, 'address', text);
    // Xóa tọa độ cũ nếu khách chỉnh sửa lại text
    set(k, 'latitude', undefined);
    set(k, 'longitude', undefined);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setActiveSearchKey(null);
      setSearching(false);
      return;
    }

    setActiveSearchKey(k);
    setSearching(true);

    const country = k === 'pickup' ? (city(r.origin).country || 'VN') : (city(r.destination).country || 'VN');

    searchTimeoutRef.current = setTimeout(async () => {
      const results = await customerApi.searchLocations(trimmed, country);
      setSuggestions(results || []);
      setSearching(false);
    }, 350);
  };

  const handleSelectSuggestion = (k: PlaceKey, item: LocationSuggestion) => {
    setPlaces((prev) => ({
      ...prev,
      [k]: {
        ...prev[k],
        address: item.label,
        latitude: item.point.latitude,
        longitude: item.point.longitude,
      },
    }));
    setActiveSearchKey(null);
    setSuggestions([]);
  };

  const save = () => {
    setTried(true);
    const res = actions.savePlaces(r.id, places.pickup, places.delivery);
    if (res.ok) navigate(`/customer/requests/${r.id}/wizard/2`);
  };

  const block = (k: PlaceKey, title: string) => {
    const L = LABELS[k], p = places[k];
    const isSearchingThis = activeSearchKey === k;
    const hasCoordinates = typeof p.latitude === 'number' && typeof p.longitude === 'number';

    const input = (f: keyof Place, label: string, type = 'text', full = false) => (
      <div className={`cus-field ${full ? 'cus-wizard__full' : ''}`}>
        <label htmlFor={`${k}-${f}`}>{label}</label>
        <input id={`${k}-${f}`} type={type} className={`cus-input ${missing(k, f) ? 'invalid' : ''}`} value={String(p[f] || '')} onChange={(e) => set(k, f, e.target.value)} />
      </div>
    );

    return (
      <div className="cus-card">
        <h3 className="cus-card__title">{title}</h3>
        <div className="cus-wizard__grid">
          {input('name', L.name)}
          {input('contact', L.contact)}

          {/* Ô nhập Địa chỉ có gợi ý vị trí Mapbox */}
          <div className="cus-field cus-wizard__full cus-autocomplete-wrapper" ref={isSearchingThis ? dropdownRef : undefined}>
            <label htmlFor={`${k}-address`}>{L.address}</label>
            <input
              id={`${k}-address`}
              type="text"
              autoComplete="off"
              className={`cus-input ${missing(k, 'address') ? 'invalid' : ''}`}
              placeholder="Nhập số nhà, tên đường, khu đô thị (gợi ý tự động qua Mapbox)..."
              value={p.address || ''}
              onChange={(e) => handleAddressChange(k, e.target.value)}
              onFocus={() => {
                if (p.address && p.address.length >= 2 && suggestions.length > 0) {
                  setActiveSearchKey(k);
                }
              }}
            />

            {/* Trạng thái xác thực tọa độ */}
            {hasCoordinates && (
              <div className="cus-location-badge">
                <span>📍</span>
                <span>Đã xác định vị trí: <b>{p.latitude?.toFixed(4)}, {p.longitude?.toFixed(4)}</b> (Mapbox)</span>
              </div>
            )}

            {/* Dropdown danh sách gợi ý địa chỉ */}
            {isSearchingThis && (
              <div className="cus-autocomplete-dropdown">
                {searching ? (
                  <div style={{ padding: '10px 14px', fontSize: 13, color: '#64748b' }}>
                    🔍 Đang tìm kiếm địa chỉ qua Mapbox...
                  </div>
                ) : suggestions.length > 0 ? (
                  <>
                    {suggestions.map((item, idx) => (
                      <button
                        key={`${item.label}-${idx}`}
                        type="button"
                        className="cus-autocomplete-item"
                        onClick={() => handleSelectSuggestion(k, item)}
                      >
                        <span className="cus-autocomplete-icon">📍</span>
                        <div className="cus-autocomplete-text">
                          <b>{item.label.split(',')[0]}</b>
                          <small>{item.label}</small>
                        </div>
                      </button>
                    ))}
                    <div className="cus-autocomplete-footer">
                      <span>Gợi ý bản đồ Mapbox</span>
                      <span>{suggestions.length} kết quả</span>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '10px 14px', fontSize: 13, color: '#94a3b8' }}>
                    Không tìm thấy địa chỉ phù hợp. Đại ca có thể tiếp tục nhập thủ công.
                  </div>
                )}
              </div>
            )}
          </div>

          {input('postal', 'Mã bưu chính')}
          {input('phone', L.phone, 'tel')}

          <div className="cus-field cus-wizard__full">
            <label htmlFor={`${k}-notes`}>Hướng dẫn thêm</label>
            <textarea
              id={`${k}-notes`}
              className="cus-textarea"
              rows={2}
              value={p.notes || ''}
              placeholder="Giờ mở cổng, lối vào, lưu ý khi tiếp cận…"
              onChange={(e) => set(k, 'notes', e.target.value)}
            />
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
