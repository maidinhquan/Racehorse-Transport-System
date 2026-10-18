import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { flow1 } from '../../../flow1/api';
import { AddressAutocomplete, type AddressCandidate } from './AddressAutocomplete';

const candidate = (label: string, country = 'VN', lat = 10): AddressCandidate => ({
  label, point: { countryCode: country, latitude: lat, longitude: 106 }, attribution: 'Test geocoder',
});
function Harness() {
  const [value, setValue] = useState('');
  const [selected, setSelected] = useState<AddressCandidate | null>(null);
  const [country, setCountry] = useState('VN');
  return <><AddressAutocomplete key={country} id="address" label="Địa chỉ trại" country={country}
    value={value} selected={selected} onChange={s => { setValue(s); setSelected(null); }}
    onSelect={s => { setValue(s.label); setSelected(s); }} />
    <button onClick={() => { setCountry('JP'); setSelected(null); }}>Đổi quốc gia</button>
    <output data-testid="choice">{selected ? `${selected.label}:${selected.point.latitude}` : 'none'}</output></>;
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
async function query(value: string) {
  const input = screen.getByRole('combobox'); fireEvent.focus(input); fireEvent.change(input, { target: { value } });
  await act(() => vi.advanceTimersByTimeAsync(500)); return input;
}
test('debounces typing and selects the actual second result with the keyboard', async () => {
  const search = vi.spyOn(flow1, 'search').mockResolvedValue([candidate('Trại A'), candidate('Trại B', 'VN', 12)]);
  render(<Harness />); const input = screen.getByRole('combobox'); fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 'Tr' } }); await act(() => vi.advanceTimersByTimeAsync(500));
  expect(search).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: 'Tra' } }); await act(() => vi.advanceTimersByTimeAsync(200));
  fireEvent.change(input, { target: { value: 'Trai' } }); await act(() => vi.advanceTimersByTimeAsync(500));
  expect(search).toHaveBeenCalledExactlyOnceWith('Trai', 'VN');
  fireEvent.keyDown(input, { key: 'ArrowDown' }); fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.getByTestId('choice')).toHaveTextContent('Trại B:12'); expect(input).toHaveValue('Trại B');
  expect(input).toHaveAttribute('aria-expanded', 'false');
});
test('ignores stale responses and results from the wrong country', async () => {
  let finishOld!: (rows: AddressCandidate[]) => void;
  vi.spyOn(flow1, 'search').mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
    .mockResolvedValueOnce([candidate('New place'), candidate('Wrong country', 'JP')]);
  render(<Harness />); await query('Old query'); await query('New query');
  await act(async () => { finishOld([candidate('Stale place')]); });
  expect(screen.getByRole('option', { name: 'New place' })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Stale place' })).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Wrong country' })).not.toBeInTheDocument();
});
test('editing or changing country invalidates selection; one result is never silently selected', async () => {
  const search = vi.spyOn(flow1, 'search').mockResolvedValue([candidate('Confirmed place')]);
  render(<Harness />); const input = await query('Place');
  expect(screen.getByTestId('choice')).toHaveTextContent('none');
  fireEvent.click(screen.getByRole('option', { name: 'Confirmed place' }));
  expect(screen.getByTestId('choice')).toHaveTextContent('Confirmed place:10');
  fireEvent.change(input, { target: { value: 'Changed place' } });
  expect(screen.getByTestId('choice')).toHaveTextContent('none');
  await act(() => vi.advanceTimersByTimeAsync(500));
  fireEvent.click(screen.getByRole('option', { name: 'Confirmed place' }));
  fireEvent.click(screen.getByRole('button', { name: 'Đổi quốc gia' }));
  expect(screen.getByTestId('choice')).toHaveTextContent('none');
  await query('Japan place'); expect(search).toHaveBeenLastCalledWith('Japan place', 'JP');
});
test('reports empty results and provider errors without retaining a selection', async () => {
  vi.spyOn(flow1, 'search').mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('Provider unavailable'));
  render(<Harness />); await query('Unknown'); expect(screen.getByText(/Không tìm thấy/)).toBeInTheDocument();
  await query('Another query'); expect(screen.getByRole('alert')).toHaveTextContent('Provider unavailable');
  expect(screen.getByTestId('choice')).toHaveTextContent('none');
});
test('Escape closes suggestions and late requests after unmount cannot reopen them', async () => {
  let finish!: (rows: AddressCandidate[]) => void;
  vi.spyOn(flow1, 'search').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<Harness />); const input = await query('Pending');
  fireEvent.keyDown(input, { key: 'Escape' }); expect(input).toHaveAttribute('aria-expanded', 'false');
  view.unmount(); await act(async () => finish([candidate('Late result')]));
  expect(screen.queryByRole('option')).not.toBeInTheDocument();
});
