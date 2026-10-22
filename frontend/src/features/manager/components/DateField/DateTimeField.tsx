import React from 'react';
import { DateField } from './DateField';

interface DateTimeFieldProps {
  id?: string;
  /** Giá trị 'YYYY-MM-DD HH:mm' ('' = chưa chọn) */
  value: string;
  onChange: (stamp: string) => void;
  min?: string;
  disabled?: boolean;
}

/** Ngày (gõ dd/mm/yyyy hoặc chọn lịch) + giờ (HH:mm) */
export const DateTimeField: React.FC<DateTimeFieldProps> = ({ id, value, onChange, min, disabled }) => {
  const date = value.slice(0, 10), time = value.slice(11, 16) || '06:00';
  return (
    <div className="mgr-datetime">
      <DateField id={id} value={date} min={min} disabled={disabled} onChange={(d) => onChange(d ? `${d} ${time}` : '')} />
      <input className="mgr-input" type="time" aria-label="Giờ" value={time} disabled={disabled || !date}
        onChange={(e) => onChange(date ? `${date} ${e.target.value || '00:00'}` : '')} />
    </div>
  );
};

export default DateTimeField;
