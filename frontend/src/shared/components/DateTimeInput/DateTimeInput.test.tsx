import { describe, expect, it } from 'vitest';
import { parseDisplay, toDisplay } from './DateTimeInput';

describe('DateTimeInput helpers', () => {
  it('shows stored values as day/month/year hour:minute', () => {
    expect(toDisplay('2026-11-19T06:00')).toBe('19/11/2026 06:00');
    expect(toDisplay('2026-01-05 18:30')).toBe('05/01/2026 18:30');
    expect(toDisplay('')).toBe('');
    expect(toDisplay('19/11/2026')).toBe('');
  });

  it('parses typed day/month/year values into the stored format', () => {
    expect(parseDisplay('19/11/2026 06:00')).toBe('2026-11-19T06:00');
    expect(parseDisplay('5/1/2026 8:05')).toBe('2026-01-05T08:05');
    expect(parseDisplay(' 19-11-2026 06:00 ')).toBe('2026-11-19T06:00');
  });

  it('rejects impossible dates and times', () => {
    expect(parseDisplay('31/02/2026 06:00')).toBe('');
    expect(parseDisplay('19/13/2026 06:00')).toBe('');
    expect(parseDisplay('19/11/2026 24:00')).toBe('');
    expect(parseDisplay('19/11/2026 06:60')).toBe('');
    expect(parseDisplay('19/11/2026')).toBe('');
    expect(parseDisplay('11/19/2026 06:00')).toBe('');
  });

  it('round-trips a stored value', () => {
    expect(parseDisplay(toDisplay('2026-12-31T23:59'))).toBe('2026-12-31T23:59');
  });
});
