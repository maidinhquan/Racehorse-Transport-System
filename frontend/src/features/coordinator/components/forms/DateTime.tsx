// Bộ chọn ngày / ngày + giờ giống bản HTML (gõ dd/mm/yyyy hoặc bấm biểu tượng lịch; giờ theo bước 30 phút)
import { useEffect, useRef, useState } from 'react';
import { today } from '../../store/coordinatorStore';
import { Icon, useForm } from '../common/ui';

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: string) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '');
function parse(s: string) {
  const m = s.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!m) return '';
  const d = +m[1], mo = +m[2], y = +m[3], x = new Date(Date.UTC(y, mo - 1, d));
  return x.getUTCMonth() === mo - 1 && x.getUTCDate() === d ? `${y}-${pad(mo)}-${pad(d)}` : '';
}

/** ô ngày: giá trị YYYY-MM-DD */
export function DatePicker({ value, onChange, anyDate = false, disabled = false }: { value: string; onChange: (v: string) => void; anyDate?: boolean; disabled?: boolean }) {
  const [text, setText] = useState(fmt(value));
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<[number, number]>([2026, 9]);
  const box = useRef<HTMLDivElement>(null);
  const TODAY = today();
  useEffect(() => { setText(fmt(value)); }, [value]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const iso = parse(text), ok = !!iso && (anyDate || iso >= TODAY), bad = text.trim().length >= 10 && !ok;
  const toggle = () => {
    if (disabled) return;
    if (open) { setOpen(false); return; }
    const base = value || TODAY; setMonth([Number(base.slice(0, 4)), Number(base.slice(5, 7)) - 1]); setOpen(true);
  };
  const [y, m] = month, first = new Date(Date.UTC(y, m, 1)), days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), lead = (first.getUTCDay() + 6) % 7;
  const thisMonth = `${y}-${pad(m + 1)}`, minMonth = TODAY.slice(0, 7);
  const nav = (k: number) => { const d = new Date(Date.UTC(y, m + k, 1)); setMonth([d.getUTCFullYear(), d.getUTCMonth()]); };
  return (
    <div className="cbn-dp" ref={box}>
      <div className="cbn-dp-btn cbn-dp-field">
        <input type="text" className={`cbn-dp-text ${bad ? 'dp-bad' : ''}`} placeholder="dd/mm/yyyy" value={text} autoComplete="off" inputMode="numeric" disabled={disabled}
          title={bad ? (iso ? `Chỉ chọn được từ ${fmt(TODAY)} trở đi.` : 'Ngày không hợp lệ (dd/mm/yyyy).') : 'Gõ ngày dd/mm/yyyy hoặc bấm biểu tượng lịch'}
          onChange={(e) => {
            const s = e.target.value; setText(s);
            const i = parse(s), good = !!i && (anyDate || i >= TODAY), next = good ? i : '';
            if (next !== value && (good || s.trim().length >= 10 || !s.trim())) onChange(next);
          }}
          onBlur={() => { if (value) setText(fmt(value)); }} />
        <button type="button" className="cbn-dp-icon" aria-label="Chọn ngày trên lịch" title="Chọn ngày trên lịch" disabled={disabled} onClick={toggle}><Icon name="calendar" /></button>
      </div>
      {open ? (
        <div className="cbn-dp-pop">
          <div className="cbn-dp-head">
            <button type="button" disabled={!anyDate && thisMonth <= minMonth} aria-label="Tháng trước" onClick={() => nav(-1)}>‹</button>
            <b>Tháng {m + 1}/{y}</b>
            <button type="button" aria-label="Tháng sau" onClick={() => nav(1)}>›</button>
          </div>
          <div className="cbn-dp-grid cbn-dp-wd"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span></div>
          <div className="cbn-dp-grid">
            {Array.from({ length: lead }, (_, i) => <span key={'l' + i} />)}
            {Array.from({ length: days }, (_, i) => {
              const d = `${y}-${pad(m + 1)}-${pad(i + 1)}`;
              return <button type="button" key={d} className={`${d === value ? 'on' : ''} ${d === TODAY ? 'today' : ''}`} disabled={!anyDate && d < TODAY}
                onClick={() => { onChange(d); setText(fmt(d)); setOpen(false); }}>{i + 1}</button>;
            })}
          </div>
          {anyDate ? null : <p className="cbn-dp-foot">Chỉ chọn được từ {fmt(TODAY)} trở đi.</p>}
        </div>
      ) : null}
    </div>
  );
}

const TIMES = (() => { const t: string[] = []; for (let h = 0; h < 24; h++) for (const mm of ['00', '30']) t.push(`${pad(h)}:${mm}`); return t; })();

/** ngày + giờ: giá trị YYYY-MM-DDTHH:MM (hoặc 'YYYY-MM-DD HH:MM') */
export function DateTimePicker({ value, onChange, anyDate = false, disabled = false }: { value: string; onChange: (v: string) => void; anyDate?: boolean; disabled?: boolean }) {
  const v = String(value || '').replace(' ', 'T'), d = v.slice(0, 10), tm = v.slice(11, 16) || '08:00';
  const times = TIMES.includes(tm) ? TIMES : [...TIMES, tm].sort();
  return (
    <div className="cbn-dt">
      <DatePicker value={d} anyDate={anyDate} disabled={disabled} onChange={(nd) => onChange(nd ? `${nd}T${tm}` : '')} />
      <select className="cbn-dt-time" aria-label="Giờ" value={tm} disabled={disabled} onChange={(e) => onChange(d ? `${d}T${e.target.value}` : '')}>
        {times.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </div>
  );
}

/** gắn vào form của hộp thoại */
export function DateTimeInput({ name, anyDate = true }: { name: string; anyDate?: boolean }) {
  const f = useForm();
  return <DateTimePicker value={String(f.v[name] || '')} anyDate={anyDate} onChange={(x) => f.set(name, x)} />;
}
export function DateInput({ name, anyDate = false }: { name: string; anyDate?: boolean }) {
  const f = useForm();
  return <DatePicker value={String(f.v[name] || '')} anyDate={anyDate} onChange={(x) => f.set(name, x)} />;
}
