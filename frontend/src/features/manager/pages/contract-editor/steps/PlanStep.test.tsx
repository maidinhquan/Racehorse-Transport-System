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
    const defaults = {
      preparationDays: 3,
      supportedRoutes: [{ originCountry: 'VN', destinationCountry: 'VN', mode: 'ROAD' as const }, { originCountry: 'VN', destinationCountry: 'VN', mode: 'AIR' as const }],
      selectedRoute: { originCountry: 'VN', destinationCountry: 'VN', mode: 'ROAD' as const },
    };
    render(<PlanStep request={request} draft={draft} set={set} horses={[]} defaults={defaults as any} policyReady={true} />);
    fireEvent.change(screen.getByLabelText('Phương thức vận chuyển *'), { target: { value: 'AIR' } });
    expect(set).toHaveBeenCalledWith({ mode: 'AIR' });
  });
  it('keeps the customer dates exactly, even when pickup and delivery are the same day or in the past', () => {
    const set = vi.fn();
    const sameDay = { ...request, pickupAt: '2026-11-14', date: '2026-11-14' } as unknown as TransportRequest;
    render(<PlanStep request={sameDay} draft={{ ...draft, departAt: '2026-11-20 08:00', arriveAt: '2026-11-21 18:00' }} set={set} horses={[]} defaults={{ preparationDays: 3 } as any} policyReady={true} />);
    expect(set).toHaveBeenCalledWith({ departAt: '2026-11-14 08:00', arriveAt: '2026-11-14 18:00' });
  });
  it('keeps the saved method when reopening the editor and requires a selection', () => {
    expect(initialDraft({ ...request, draft: { ...draft, mode: 'AIR' } }).mode).toBe('AIR');
    expect(draftError({ ...draft, mode: undefined })).toContain('Chọn phương thức');
  });
});
