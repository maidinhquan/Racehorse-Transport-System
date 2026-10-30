import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../ManagerLayout';
import { fmtDate, parseViDate } from '../../hooks/managerRules';
import './DateField.css';

interface DateFieldProps {
  id?: string;
  /** Giá trị 'YYYY-MM-DD' ('' = chưa chọn) */
  value: string;
  onChange: (iso: string) => void;
  /** Ngày nhỏ nhất được chọn ('YYYY-MM-DD') */
  min?: string;
  /** Ngày lớn nhất được chọn ('YYYY-MM-DD') */
  max?: string;
  disabled?: boolean;
  invalid?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/**
 * Ô ngày "gõ và chọn": gõ trực tiếp dd/mm/yyyy hoặc bấm biểu tượng lịch để chọn.
 * Dùng cho mọi ô chọn ngày trong trang Manager.
 */
export const DateField: React.FC<DateFieldProps> = ({ id, value, onChange, min, max, disabled, invalid }) => {
  const [text, setText] = useState(fmtDate(value) === '—' ? '' : fmtDate(value));
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<[number, number]>(() => {
    const base = value || min || new Date().toISOString().slice(0, 10);
    return [Number(base.slice(0, 4)), Number(base.slice(5, 7)) - 1];
  });
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setText(value ? fmtDate(value) : ''); }, [value]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const inRange = (iso: string) => (!min || iso >= min) && (!max || iso <= max);
  const typed = parseViDate(text);
  const badText = text.length >= 10 && (!typed || !inRange(typed));

  const onType = (s: string) => {
    setText(s);
    const iso = parseViDate(s);
    if (iso && inRange(iso)) onChange(iso);
    else if (!s) onChange('');
  };

  const [y, m] = month;
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
  const shift = (d: number) => {
    const dt = new Date(Date.UTC(y, m + d, 1));
    setMonth([dt.getUTCFullYear(), dt.getUTCMonth()]);
  };
  const prevDisabled = !!min && `${y}-${pad(m + 1)}` <= min.slice(0, 7);

  return (
    <div className="mgr-date" ref={boxRef}>
      <div className={`mgr-date__field ${invalid || badText ? 'invalid' : ''} ${disabled ? 'disabled' : ''}`}>
        <input id={id} type="text" inputMode="numeric" placeholder="dd/mm/yyyy" value={text} disabled={disabled}
          title={badText ? (typed ? `Chỉ chọn được từ ${fmtDate(min)}${max ? ` đến ${fmtDate(max)}` : ''}.` : 'Ngày không hợp lệ (dd/mm/yyyy).') : 'Gõ ngày dd/mm/yyyy hoặc bấm biểu tượng lịch'}
          onChange={(e) => onType(e.target.value)}
          onBlur={() => { if (value) setText(fmtDate(value)); }} />
        <button type="button" aria-label="Chọn ngày trên lịch" disabled={disabled} onClick={() => setOpen((v) => !v)}>
          <Icon name="calendar" />
        </button>
      </div>
      {badText && <p className="mgr-date__error">{typed ? `Chỉ chọn được từ ${fmtDate(min)}${max ? ` đến ${fmtDate(max)}` : ''}.` : 'Ngày không hợp lệ (dd/mm/yyyy).'}</p>}
      {open && (
        <div className="mgr-date__pop" role="dialog" aria-label="Chọn ngày">
          <div className="mgr-date__head">
            <button type="button" onClick={() => shift(-1)} disabled={prevDisabled} aria-label="Tháng trước">‹</button>
            <b>Tháng {m + 1}/{y}</b>
            <button type="button" onClick={() => shift(1)} aria-label="Tháng sau">›</button>
          </div>
          <div className="mgr-date__grid mgr-date__wd">{WEEKDAYS.map((d) => <span key={d}>{d}</span>)}</div>
          <div className="mgr-date__grid">
            {Array.from({ length: lead }, (_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: days }, (_, i) => {
              const iso = `${y}-${pad(m + 1)}-${pad(i + 1)}`;
              return (
                <button key={iso} type="button" className={iso === value ? 'on' : ''} disabled={!inRange(iso)}
                  onClick={() => { onChange(iso); setText(fmtDate(iso)); setOpen(false); }}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          {min && <p className="mgr-date__foot">Chỉ chọn được từ {fmtDate(min)} trở đi.</p>}
        </div>
      )}
    </div>
  );
};

export default DateField;
