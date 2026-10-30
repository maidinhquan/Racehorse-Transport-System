import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlanStep } from './PlanStep';
import { draftError, initialDraft } from '../../../hooks/managerRules';
import type { ContractDraft, TransportRequest } from '../../../types';

vi.mock('../../../api/managerApi', () => ({ managerApi: {
  getContractEditor: vi.fn().mockResolvedValue({ defaults: { preparationDays: 3 } }),
} }));
const draft: ContractDraft = {
  mode: 'ROAD', departAt: '2026-12-09 06:00', arriveAt: '2026-12-15 18:00',
  budget: { TRANSPORT: 100000, PROCEDURE: 100000, VET: 100000, INSURANCE: 100000, STAFF: 100000 },
  items: [], depositPct: 30, note: '', exception: '', terms: [],
};
const request = { id: 'REQUEST_005', horses: [], versions: [], pickupAt: '2026-12-09', date: '2026-12-15' } as unknown as TransportRequest;

describe('Contract transport mode', () => {
  it('lets the Manager select the method while drafting the contract', async () => {
    const set = vi.fn();
    render(<PlanStep request={request} draft={draft} set={set} horses={[]} />);
    fireEvent.change(screen.getByLabelText('Phương thức vận chuyển *'), { target: { value: 'AIR' } });
    expect(set).toHaveBeenCalledWith({ mode: 'AIR' });
    expect(await screen.findByText(/Tuyến này cần dự phòng/)).toBeTruthy();
  });
  it('keeps the saved method when reopening the editor and requires a selection', () => {
    expect(initialDraft({ ...request, draft: { ...draft, mode: 'AIR' } }).mode).toBe('AIR');
    expect(draftError({ ...draft, mode: undefined })).toContain('Chọn phương thức');
  });
});
