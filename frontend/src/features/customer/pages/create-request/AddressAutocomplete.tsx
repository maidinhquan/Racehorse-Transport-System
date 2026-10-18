import { useEffect, useState } from 'react';
import { flow1, flow1Error } from '../../../flow1/api';
import './AddressAutocomplete.css';

export type AddressCandidate = Awaited<ReturnType<typeof flow1.search>>[number];
type Props = {
  id: string; label: string; country: string; value: string;
  selected: AddressCandidate | null;
  onChange: (value: string) => void;
  onSelect: (candidate: AddressCandidate) => void;
};
const empty = { key: '', items: [] as AddressCandidate[], loading: false, error: '' };

export function AddressAutocomplete({ id, label, country, value, selected, onChange, onSelect }: Props) {
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [response, setResponse] = useState(empty);
  const query = value.trim();
  const key = `${country}:${query}`;
  const confirmed = selected?.label === value && selected.point.countryCode === country;
  const current = response.key === key ? response : empty;
  const visible = focused && open && !confirmed && query.length >= 3 && !!country;

  useEffect(() => {
    if (!focused || !open || confirmed || query.length < 3 || !country) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setResponse({ key, items: [], loading: true, error: '' });
      try {
        const rows = await flow1.search(query, country);
        if (!cancelled) setResponse({ key, items: rows.filter(x => x.point.countryCode === country &&
          Number.isFinite(x.point.latitude) && Math.abs(x.point.latitude) <= 90 &&
          Number.isFinite(x.point.longitude) && Math.abs(x.point.longitude) <= 180), loading: false, error: '' });
      } catch (error) {
        if (!cancelled) setResponse({ key, items: [], loading: false, error: flow1Error(error) });
      }
    }, 450);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [country, confirmed, focused, key, open, query]);

  const choose = (candidate: AddressCandidate) => {
    onSelect(candidate); setOpen(false); setActive(-1);
  };
  return <div className="flow1-address">
    <label className="form-label" htmlFor={id}>{label}</label>
    <input id={id} className="form-input" type="text" role="combobox" autoComplete="off"
      maxLength={255} value={value} aria-autocomplete="list" aria-expanded={visible}
      aria-controls={`${id}-options`} aria-describedby={`${id}-hint`}
      aria-activedescendant={visible && active >= 0 && current.items[active] ? `${id}-option-${active}` : undefined}
      placeholder="Nhập tên trại, trường đua hoặc địa chỉ…"
      onChange={e => { onChange(e.target.value); setOpen(true); setActive(-1); setResponse(empty); }}
      onFocus={() => { setFocused(true); setOpen(true); }} onBlur={() => { setFocused(false); setOpen(false); }}
      onKeyDown={e => {
        if (e.key === 'Escape') { setOpen(false); setActive(-1); }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault(); setOpen(true);
          if (current.items.length) setActive(i => e.key === 'ArrowDown' ? (i + 1) % current.items.length :
            (i <= 0 ? current.items.length - 1 : i - 1));
        }
        if (e.key === 'Enter') {
          e.preventDefault(); if (visible && active >= 0 && current.items[active]) choose(current.items[active]);
        }
      }} />
    <small id={`${id}-hint`} className={`flow1-address-hint${confirmed ? ' confirmed' : ''}`}>
      {confirmed ? `✓ Đã chọn địa điểm · ${selected.attribution}` : 'Nhập ít nhất 3 ký tự, rồi chọn đúng địa điểm trong gợi ý.'}
    </small>
    {visible && <div className="flow1-address-dropdown">
      {current.loading || current.key !== key ? <div role="status">Đang tìm địa điểm…</div> :
        current.error ? <div role="alert">{current.error} Hãy sửa địa chỉ hoặc thử lại.</div> :
        current.items.length === 0 ? <div role="status">Không tìm thấy. Thêm xã/phường, tỉnh/thành hoặc số nhà, tên đường.</div> : null}
      <ul id={`${id}-options`} role="listbox" aria-label={`Gợi ý ${label}`}>
        {current.items.map((candidate, index) => <li key={`${candidate.label}:${candidate.point.latitude}:${candidate.point.longitude}`} role="presentation">
          <button type="button" role="option" tabIndex={-1} id={`${id}-option-${index}`}
            aria-selected={active === index} onMouseDown={e => e.preventDefault()}
            onMouseEnter={() => setActive(index)} onClick={() => choose(candidate)}>{candidate.label}</button>
        </li>)}
      </ul>
      {current.items.length > 0 && <small>{[...new Set(current.items.map(x => x.attribution))].join(' · ')}</small>}
    </div>}
  </div>;
}
