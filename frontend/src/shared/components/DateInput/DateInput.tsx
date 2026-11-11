import React, { useEffect, useRef, useState } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');

/** '2026-11-19' → '19/11/2026' ('' nếu không đúng dạng) */
export const toDateDisplay = (value: string): string => {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

/** '19/11/2026' → '2026-11-19' ('' nếu không phải ngày hợp lệ) */
export const parseDateDisplay = (text: string): string => {
  const m = text.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!m) return '';
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const real = new Date(Date.UTC(year, month - 1, day));
  if (real.getUTCFullYear() !== year || real.getUTCMonth() !== month - 1 || real.getUTCDate() !== day) return '';
  return `${year}-${pad(month)}-${pad(day)}`;
};

interface DateInputProps {
  id?: string;
  /** Tên trường khi gửi form; giá trị gửi đi luôn là 'YYYY-MM-DD' */
  name?: string;
  className?: string;
  required?: boolean;
  /** Mốc sớm nhất / muộn nhất cho phép, dạng 'YYYY-MM-DD' */
  min?: string;
  max?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

/**
 * Ô nhập ngày theo ngày/tháng/năm (gõ trực tiếp), không phụ thuộc ngôn ngữ trình duyệt như ô type="date".
 * Dùng được trong form không điều khiển: giá trị ISO nằm ở input ẩn cùng `name`.
 */
export const DateInput: React.FC<DateInputProps> = ({ id, name, className, required, min, max, defaultValue = '', onChange }) => {
  const [text, setText] = useState(toDateDisplay(defaultValue));
  const ref = useRef<HTMLInputElement>(null);
  const iso = parseDateDisplay(text);
  const typed = text.trim().length > 0;

  let problem = '';
  if (typed && !iso) problem = 'Nhập theo dạng ngày/tháng/năm, ví dụ 19/11/2026.';
  else if (iso && min && iso < min) problem = `Không được sớm hơn ${toDateDisplay(min)}.`;
  else if (iso && max && iso > max) problem = `Không được muộn hơn ${toDateDisplay(max)}.`;

  useEffect(() => {
    ref.current?.setCustomValidity(problem);
  }, [problem]);

  const pickerRef = useRef<HTMLInputElement>(null);

  function applyText(next: string) {
    setText(next);
    onChange?.(parseDateDisplay(next));
  }

  function onType(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let out = digits;
    if (digits.length > 4) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    else if (digits.length === 2 && raw.length >= text.length) out = `${digits}/`;
    applyText(out);
  }

  function openPicker() {
    const picker = pickerRef.current;
    if (!picker) return;
    picker.value = iso;
    try {
      picker.showPicker();
    } catch {
      picker.focus();
    }
  }

  return (
    <>
      <span style={{ position: 'relative', display: 'block' }}>
        <input
          ref={ref}
          id={id}
          className={className}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/yyyy"
          maxLength={10}
          required={required}
          value={text}
          aria-invalid={!!problem || undefined}
          style={{ paddingRight: 38 }}
          onChange={onType}
        />
        <button
          type="button"
          aria-label="Chọn ngày từ lịch"
          title="Chọn ngày từ lịch"
          onClick={openPicker}
          style={{
            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
            width: 28, height: 28, display: 'grid', placeItems: 'center',
            background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--text-muted, #64748b)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          min={min}
          max={max}
          onChange={(event) => { if (event.target.value) applyText(toDateDisplay(event.target.value)); }}
          style={{ position: 'absolute', right: 0, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        />
      </span>
      {name ? <input type="hidden" name={name} value={iso} /> : null}
      {problem && (
        <small role="alert" style={{ display: 'block', color: 'var(--danger, #b91c1c)' }}>
          {problem}
        </small>
      )}
    </>
  );
};

export default DateInput;
