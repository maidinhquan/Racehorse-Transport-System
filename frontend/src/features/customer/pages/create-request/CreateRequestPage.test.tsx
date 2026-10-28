import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateRequestPage } from './CreateRequestPage';

const mocks = vi.hoisted(() => ({
  createDraft: vi.fn(), saveRequestDetails: vi.fn(), showToast: vi.fn(), getFormOptions: vi.fn(),
}));
vi.mock('../../hooks/useCustomer', () => ({ useCustomer: () => ({ getRequest: () => undefined, actions: mocks }) }));
vi.mock('../../api/customerApi', () => ({ customerApi: {
  getFormOptions: mocks.getFormOptions,
  getCities: vi.fn().mockImplementation(async (country: string) => [{ cityId: `0123456789abcdef012345${country}`, label: `Confirmed ${country}`, countryCode: country }]),
  searchLocations: vi.fn().mockImplementation(async (_q: string, country: string) => [{ label: `123 Main Street, ${country}`, point: { latitude: 10.8, longitude: 106.7, countryCode: country } }]),
} }));
vi.mock('../../components/CustomerLayout', () => ({ CustomerLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>, Icon: () => <span /> }));

function renderForm() {
  return render(<MemoryRouter initialEntries={['/customer/requests/new']}><Routes>
    <Route path="/customer/requests/new" element={<CreateRequestPage />} />
    <Route path="/customer/requests/:id/wizard/2" element={<p>Horse step reached</p>} />
  </Routes></MemoryRouter>);
}
async function fillForm() {
  const cities = screen.getAllByLabelText('Tỉnh/thành phố *');
  fireEvent.change(cities[0], { target: { value: 'Ho Chi Minh City' } });
  fireEvent.change(cities[1], { target: { value: 'Tokyo' } });
  await waitFor(() => expect(mocks.getFormOptions).toHaveBeenCalledWith('Ho Chi Minh City', 'Tokyo'));
  fireEvent.change(screen.getByLabelText('Ngày vận chuyển mong muốn'), { target: { value: '01/12/2099' } });
  fireEvent.change(screen.getByLabelText('Tên chuồng / câu lạc bộ *'), { target: { value: 'Pickup stable' } });
  fireEvent.change(screen.getByLabelText('Tên chuồng / trường đua *'), { target: { value: 'Tokyo stable' } });
  for (const input of screen.getAllByLabelText('Địa chỉ chi tiết *')) fireEvent.change(input, { target: { value: '123 Main Street' } });
  // City boundary IDs resolve automatically; search is enabled once both are known.
  await waitFor(() => screen.getAllByRole('button', { name: /Tìm vị trí/ }).forEach(button => expect((button as HTMLButtonElement).disabled).toBe(false)));
  for (const [index, country] of ['VN', 'JP'].entries()) {
    fireEvent.click(screen.getAllByRole('button', { name: /Tìm vị trí/ })[index]);
    fireEvent.click(await screen.findByRole('button', { name: `123 Main Street, ${country}` }));
  }
  for (const input of screen.getAllByLabelText('Họ và tên *')) fireEvent.change(input, { target: { value: 'Contact' } });
  for (const input of screen.getAllByLabelText('Số điện thoại *')) fireEvent.change(input, { target: { value: '+84901234567' } });
}

describe('merged request details step', () => {
  beforeEach(() => {
    mocks.createDraft.mockResolvedValue({ ok: true, id: 'REQ-1' });
    mocks.saveRequestDetails.mockResolvedValue({ ok: true, id: 'REQ-1' });
    mocks.getFormOptions.mockResolvedValue({ preparationDays: 3, supportedRoutes: [{ originCountry: 'VN', destinationCountry: 'JP', mode: 'AIR' }] });
  });
  it('keeps count and horse care out of the address step and validates before creating a draft', () => {
    renderForm();
    expect(screen.queryByLabelText(/Số lượng ngựa/)).toBeNull();
    expect(screen.queryByLabelText(/chăm sóc/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Lưu & tiếp tục/ }));
    expect(mocks.createDraft).not.toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalled();
    expect(screen.getByRole('list').children).toHaveLength(3);
  });
  it('saves route, date and both places before opening the horse step', async () => {
    renderForm(); await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /Lưu & tiếp tục/ }));
    await screen.findByText('Horse step reached');
    expect(mocks.createDraft).toHaveBeenCalledWith(expect.objectContaining({ origin: 'Ho Chi Minh City', destination: 'Tokyo', horseCount: 1, careNotes: '' }), expect.any(String));
    expect(mocks.saveRequestDetails).toHaveBeenCalledWith('REQ-1', expect.objectContaining({ date: '2099-12-01' }), expect.objectContaining({ name: 'Pickup stable', address: '123 Main Street, VN', cityId: '0123456789abcdef012345VN' }), expect.objectContaining({ name: 'Tokyo stable', phone: '+84901234567', cityId: '0123456789abcdef012345JP' }));
  });
  it('reuses a newly created draft if the details save fails and is retried', async () => {
    mocks.saveRequestDetails.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true });
    renderForm(); await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /Lưu & tiếp tục/ }));
    await waitFor(() => expect(mocks.saveRequestDetails).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: /Lưu & tiếp tục/ })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: /Lưu & tiếp tục/ }));
    await screen.findByText('Horse step reached');
    expect(mocks.createDraft).toHaveBeenCalledTimes(1);
    expect(mocks.saveRequestDetails).toHaveBeenCalledTimes(2);
  });
  it('keeps the same creation key when retrying an ambiguous draft creation failure', async () => {
    mocks.createDraft.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, id: 'REQ-1' });
    renderForm(); await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /Lưu & tiếp tục/ }));
    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: /Lưu & tiếp tục/ })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: /Lưu & tiếp tục/ }));
    await screen.findByText('Horse step reached');
    expect(mocks.createDraft.mock.calls[0][1]).toBe(mocks.createDraft.mock.calls[1][1]);
    expect(mocks.createDraft.mock.calls[0][1]).toMatch(/^[0-9a-f-]{36}$/i);
  });

});
