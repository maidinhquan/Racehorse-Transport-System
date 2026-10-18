import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { CustomerCreateRequestPage } from './CustomerCreateRequestPage';
import { customerMockStore } from '../../services/customerMockStore';
import type { HorseProfile } from '../../types/customerTypes';

vi.mock('../../../../shared/layouts/CustomerLayout/CustomerLayout', () => ({ default: ({ children }: { children: ReactNode }) => <main>{children}</main> }));

const fixtures = vi.hoisted(() => ({ horses: [] as HorseProfile[], requests: new Map<string, Record<string, unknown>>() }));
vi.mock('../../services/customerMockStore', () => ({ customerMockStore: {
  getHorses: vi.fn(() => [...fixtures.horses]),
  getRequests: vi.fn(() => Array.from(fixtures.requests.values())),
  getRequestById: vi.fn((id: string) => fixtures.requests.get(id)),
  addHorse: vi.fn((data: Omit<HorseProfile, 'id'>) => {
    const horse = { ...data, id: `HOR-${fixtures.horses.length + 1}` }; fixtures.horses.push(horse); return horse;
  }),
  updateHorse: vi.fn(),
  createRequest: vi.fn((data: Record<string, unknown>, id?: string) => {
    const request = { ...data, id: id || 'TR-TEST' }; fixtures.requests.set(request.id, request); return request;
  }),
} }));

const field = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Lưu & tiếp tục' }));
function mount() {
  render(<MemoryRouter initialEntries={['/customer/requests/new']}><Routes>
    <Route path="/customer/requests/new" element={<CustomerCreateRequestPage />} />
    <Route path="/customer/requests/:id" element={<div>Chi tiết đã gửi</div>} />
  </Routes></MemoryRouter>);
}
function fillTrip(count = '1') {
  field('Điểm đi', 'Hồ Chí Minh'); field('Điểm đến', 'Tokyo'); field('Ngày vận chuyển mong muốn', '2099-11-10'); field('Số lượng ngựa', count); next();
}
function fillPlaces() {
  for (const prefix of ['Điểm nhận', 'Điểm giao']) {
    field(`${prefix} — Tên trại / chuồng *`, `${prefix} Stable`);
    field(`${prefix} — Người liên hệ *`, `${prefix} Contact`);
    field(`${prefix} — Địa chỉ *`, `${prefix} Address`);
    field(`${prefix} — Số điện thoại *`, '+84901234567');
  }
  next();
}
async function upload(label: string, name: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { files: [new File(['test document'], name, { type: 'application/pdf' })] } });
  await screen.findByText(name);
}

describe('Customer request wizard from HTML', () => {
  beforeEach(() => {
    fixtures.horses = []; fixtures.requests.clear(); sessionStorage.clear(); vi.clearAllMocks();
  });

  it('shows four trip inputs and prevents opening later steps before saving', () => {
    mount();
    expect(screen.getAllByRole('combobox')).toHaveLength(3);
    expect(screen.getByLabelText('Ngày vận chuyển mong muốn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ngựa & hồ sơ/ })).toBeDisabled();
    expect(screen.queryByText(/Demo Controls|Cọc dự kiến|Quốc gia xuất phát|Phương thức vận chuyển/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu & tiếp tục' })).toBeDisabled();
    expect(customerMockStore.createRequest).not.toHaveBeenCalled();
  });

  it('adds a horse with the six HTML sections, persists actual files, and submits the same draft', async () => {
    mount(); fillTrip(); fillPlaces();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm ngựa mới' }));
    expect(screen.getByText('06 · Bác sĩ thú y riêng')).toBeInTheDocument();
    field('Tên ngựa *', 'New Star'); field('Số Microchip', 'TEST-100'); field('Số hộ chiếu', 'PASS-100');
    field('Giá trị khai báo', '18000'); field('Tên bác sĩ', 'Dr Linh');
    await upload('Bản scan hộ chiếu', 'passport.pdf'); await upload('Chứng nhận sở hữu ngựa', 'ownership.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ ngựa' }));
    expect(customerMockStore.addHorse).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Star', dossier: expect.objectContaining({ vetName: 'Dr Linh', value: 18000 }) }));
    expect(screen.getByText('1/1 ngựa')).toBeInTheDocument();
    next(); fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu để xét duyệt' }));
    await screen.findByText('Chi tiết đã gửi');
    const request = fixtures.requests.get('TR-TEST');
    expect(fixtures.requests.size).toBe(1);
    expect(request).toMatchObject({ status: 'Pending', horseIds: ['HOR-1'], commercialValueUsd: 18000, receiverEmail: '', transportType: 'Hàng không', delivery: { contact: 'Điểm giao Contact' } });
    const docs = request?.documents as { name: string; status: string; fileUrl?: string }[];
    expect(docs.filter(d => d.status === 'Submitted')).toHaveLength(2);
    expect(docs.filter(d => d.status === 'Submitted').every(d => d.fileUrl?.startsWith('data:application/pdf;base64,'))).toBe(true);
    expect(docs.some(d => d.name.includes('Coggins') || d.status === 'Approved')).toBe(false);
  });

  it('allows an incomplete personal profile but blocks sending without its identity documents', () => {
    mount(); fillTrip(); fillPlaces(); fireEvent.click(screen.getByRole('button', { name: 'Thêm ngựa mới' }));
    field('Tên ngựa *', 'Incomplete Star'); fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ ngựa' }));
    next(); expect(screen.getByRole('alert')).toHaveTextContent('cần tên, số Microchip và số hộ chiếu');
    expect(screen.queryByRole('button', { name: 'Gửi yêu cầu để xét duyệt' })).not.toBeInTheDocument();
    expect(fixtures.requests.get('TR-TEST')?.status).toBe('Draft');
  });

  it('does not permit the same horse in two slots or skip the declared horse count', () => {
    fixtures.horses = [{ id: 'HOR-1', name: 'Saved Star', breed: 'Arabian', microchipIso: 'CHIP-1', feiPassportNo: 'PASS-1', gender: 'Cái', weightKg: 400, status: 'Ready' }];
    mount(); fillTrip('2'); fillPlaces();
    fireEvent.click(screen.getByRole('radio', { name: /Saved Star/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ngựa 2' }));
    expect(screen.getByRole('radio', { name: /Saved Star/ })).toBeDisabled();
    next(); expect(screen.getByRole('alert')).toHaveTextContent('chọn đủ 2 ngựa');
  });

  it('blocks missing identity scans instead of generating demo documents', async () => {
    fixtures.horses = [{ id: 'HOR-1', name: 'Saved Star', breed: '', microchipIso: 'CHIP-1', feiPassportNo: 'PASS-1', gender: 'Cái', weightKg: 400, status: 'Ready' }];
    mount(); fillTrip(); fillPlaces(); fireEvent.click(screen.getByRole('radio', { name: /Saved Star/ }));
    next(); expect(screen.getByRole('alert')).toHaveTextContent('bản scan hộ chiếu và chứng nhận sở hữu');
    await upload('Hộ chiếu ngựa', 'passport.pdf');
    next(); expect(screen.getByRole('alert')).toHaveTextContent('chứng nhận sở hữu');
    expect(fixtures.requests.get('TR-TEST')?.status).toBe('Draft');
  });
});
