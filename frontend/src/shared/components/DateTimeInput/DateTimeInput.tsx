import React, { useEffect, useState } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');

/** '2026-11-19T06:00' → '19/11/2026 06:00' ('' nếu không đúng dạng) */
export const toDisplay = (value: string): string => {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : '';
};

/** '19/11/2026 06:00' → '2026-11-19T06:00' ('' nếu không phải ngày giờ hợp lệ) */
export const parseDisplay = (text: string): string => {
  const m = text.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!m) return '';
  const [day, month, year, hour, minute] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])];
  const real = new Date(Date.UTC(year, month - 1, day));
  if (real.getUTCFullYear() !== year || real.getUTCMonth() !== month - 1 || real.getUTCDate() !== day || hour > 23 || minute > 59) return '';
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
};

interface DateTimeInputProps {
  id?: string;
  /** Giá trị 'YYYY-MM-DDTHH:mm' ('' = chưa chọn hoặc chưa hợp lệ) */
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Mốc sớm nhất cho phép, cùng dạng với value */
  min?: string;
  disabled?: boolean;
}

/**
 * Ô nhập ngày giờ theo ngày/tháng/năm giờ:phút (gõ trực tiếp), không phụ thuộc ngôn ngữ của trình duyệt như ô datetime-local.
 * Chỉ báo giá trị khi người dùng đã gõ đủ và hợp lệ.
 */
export const DateTimeInput: React.FC<DateTimeInputProps> = ({ id, value, onChange, className, min, disabled }) => {
  const [text, setText] = useState(toDisplay(value));
  useEffect(() => { if (parseDisplay(text) !== value) setText(toDisplay(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const parsed = parseDisplay(text);
  const typed = text.trim().length > 0;
  const invalid = typed && !parsed;
  const tooEarly = !!parsed && !!min && parsed < min.replace(' ', 'T');
  return (
    <>
      <input
        id={id}
        className={className}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/yyyy hh:mm"
        maxLength={16}
        disabled={disabled}
        value={text}
        aria-invalid={invalid || tooEarly || undefined}
        onChange={(event) => { const next = event.target.value; setText(next); onChange(parseDisplay(next)); }}
      />
      {(invalid || tooEarly) && (
        <small role="alert" style={{ display: 'block', color: 'var(--danger, #b91c1c)' }}>
          {invalid ? 'Nhập theo dạng ngày/tháng/năm giờ:phút, ví dụ 19/11/2026 06:00.' : `Không được sớm hơn ${toDisplay(min!)}.`}
        </small>
      )}
    </>
  );
};

export default DateTimeInput;
