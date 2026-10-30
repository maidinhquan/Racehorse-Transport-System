import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { managerApi, type ContractEditorData } from '../../api/managerApi';
import type { ContractDraft, TransportRequest } from '../../types';
import { initialDraft } from '../../hooks/managerRules';
import { ContractWizard } from './ContractWizard';

vi.mock('../../api/managerApi', () => ({ managerApi: { getContractEditor: vi.fn() } }));

const request = {
  id: 'REQUEST_001', customerId: 'USER_001', origin: 'Hanoi', destination: 'Ho Chi Minh City', mode: 'ROAD',
  pickupAt: '2099-01-10', date: '2099-01-12', status: 'CONTRACT_PREPARATION', horses: [],
  pickup: { name: 'Stable A', address: 'A', contact: 'Sender', phone: '0901112233' },
  delivery: { name: 'Stable B', address: 'B', contact: 'Receiver', phone: '0901112234' },
  careNotes: '', submittedAt: '', versions: [], dossier: [], collection: [], history: [],
} satisfies TransportRequest;
const road = { id: 'ROUTE_001', originCountry: 'VN', destinationCountry: 'VN', mode: 'ROAD' as const };
const air = { ...road, id: 'ROUTE_002', mode: 'AIR' as const };
const editor = (mode: 'ROAD' | 'AIR' = 'ROAD'): ContractEditorData => ({
  request, customer: { id: 'USER_001', name: 'Customer', company: '', email: '', phone: '' }, horses: [],
  draft: null, currentContract: null, versions: [],
  defaults: { currency: 'VND', supportedRoutes: [road, air], selectedRoute: mode === 'AIR' ? air : road,
    preparationDays: mode === 'AIR' ? 7 : 2, defaultDepositPct: 40, contractDeadlineHours: 24,
    terms: [{ title: 'Payment', text: 'Deposit before signature' }] },
});

beforeEach(() => vi.mocked(managerApi.getContractEditor).mockReset());

describe('contract transport mode', () => {
  it('keeps the mode when reopening drafts and creating a replacement version', () => {
    const draft = { ...initialDraft(request), mode: 'AIR' as const };
    expect(initialDraft({ ...request, draft }).mode).toBe('AIR');
    expect(initialDraft({ ...request, versions: [{ ...draft, v: 1, issuedAt: '2098-12-01', state: 'ISSUED' } as never] }).mode).toBe('AIR');
  });

  it('loads mode-specific policies, saves the selected mode and previews it before issuing', async () => {
    let resolvePolicy!: (data: ContractEditorData) => void;
    vi.mocked(managerApi.getContractEditor).mockResolvedValueOnce(editor())
      .mockImplementationOnce(() => new Promise(resolve => { resolvePolicy = resolve; }));
    const onSave = vi.fn(), onIssue = vi.fn();
    render(<ContractWizard request={request} horses={[]} onSave={onSave} onIssue={onIssue} />);
    const select = await screen.findByLabelText('Phương thức vận chuyển *');
    expect(select).toHaveValue('ROAD');
    fireEvent.change(select, { target: { value: 'AIR' } });
    await waitFor(() => expect(managerApi.getContractEditor).toHaveBeenLastCalledWith(request.id, 'AIR'));
    expect(screen.getByRole('button', { name: 'Lưu bản nháp' })).toBeDisabled();
    await act(async () => resolvePolicy(editor('AIR')));
    expect(await screen.findByText(/Hàng không cần 7 ngày chuẩn bị/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ mode: 'AIR' })));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục →' }));
    for (const input of screen.getAllByPlaceholderText('Nhập giá bán...')) fireEvent.change(input, { target: { value: '1000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục →' }));
    expect(screen.getByText('Hàng không', { selector: 'b' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Phát hành hợp đồng' }));
    await waitFor(() => expect(onIssue).toHaveBeenCalledWith(expect.objectContaining({ mode: 'AIR' })));
  });

  it('only offers supported modes and preserves the saved selection', async () => {
    const data = editor('AIR');
    data.defaults.supportedRoutes = [air];
    data.draft = { ...initialDraft(request), mode: 'AIR' } as ContractDraft;
    vi.mocked(managerApi.getContractEditor).mockResolvedValue(data);
    render(<ContractWizard request={request} horses={[]} onSave={vi.fn()} onIssue={vi.fn()} />);
    expect(await screen.findByLabelText('Phương thức vận chuyển *')).toHaveValue('AIR');
    expect(screen.queryByRole('option', { name: 'Đường bộ' })).not.toBeInTheDocument();
  });

  it('ignores a late policy response after switching back to the previous mode', async () => {
    let resolvePolicy!: (data: ContractEditorData) => void;
    vi.mocked(managerApi.getContractEditor).mockResolvedValueOnce(editor())
      .mockImplementationOnce(() => new Promise(resolve => { resolvePolicy = resolve; }));
    const onSave = vi.fn();
    render(<ContractWizard request={request} horses={[]} onSave={onSave} onIssue={vi.fn()} />);
    const select = await screen.findByLabelText('Phương thức vận chuyển *');
    fireEvent.change(select, { target: { value: 'AIR' } });
    await waitFor(() => expect(managerApi.getContractEditor).toHaveBeenLastCalledWith(request.id, 'AIR'));
    fireEvent.change(select, { target: { value: 'ROAD' } });
    await act(async () => resolvePolicy(editor('AIR')));
    expect(select).toHaveValue('ROAD');
    expect(screen.getByText(/Đường bộ cần 2 ngày chuẩn bị/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ mode: 'ROAD' })));
  });
});
