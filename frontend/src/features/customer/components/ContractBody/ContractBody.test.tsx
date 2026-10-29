import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContractBody } from './ContractBody';
import { canAcceptTerms, canSign, depositState } from '../../hooks/customerRules';
import spec from '../../../../contracts/flow1.openapi.json';
import type { ContractVersion, TransportRequest } from '../../types';
const sample = spec.paths['/customer/contracts/{contractId}/versions/{versionNo}'].get.responses['200'].content['application/json'].examples.case1.value.data;

describe('Published contract content', () => {
  it('counts only verified money for the current contract version', () => {
    const version = { ...sample, v: 2 } as unknown as ContractVersion;
    const payment = { id: 'PAYMENT_001', contractId: version.contractId, versionNo: 1, type: 'DEPOSIT', method: 'VNPAY', amount: 8000000, status: 'SUCCESS' };
    const request = { versions: [version], payments: [payment] } as unknown as TransportRequest;
    expect(depositState(request)).toBe('NONE');
    request.payments[0].versionNo = 2;
    request.payments[0].amount = 4000000;
    expect(depositState(request)).toBe('NONE');
    request.payments[0].amount = 8000000;
    expect(depositState(request)).toBe('VERIFIED');
  });
  it('uses actual bank receipts instead of the claimed amount', () => {
    const version = structuredClone(sample) as unknown as ContractVersion;
    const request = { versions: [version], payments: [{ id: 'PAYMENT_001', contractId: version.contractId, versionNo: version.v, type: 'DEPOSIT', method: 'BANK_TRANSFER', amount: 8000000, confirmedAmount: 4000000, status: 'SUCCESS' }] } as TransportRequest;
    expect(depositState(request)).toBe('NONE');
  });
  it('shows the frozen horse and manager terms after live data changes', () => {
    const version = structuredClone(sample) as unknown as ContractVersion;
    const request = { id: 'REQUEST_001', date: '2030-01-01', origin: 'Edited origin', horses: [] } as unknown as TransportRequest;
    render(<ContractBody request={request} v={version} horses={[]} />);
    expect(screen.getByText('Thunderbolt')).toBeTruthy();
    expect(screen.getByText(/Vận chuyển và chăm sóc theo nội dung/)).toBeTruthy();
    expect(screen.queryByText('Edited origin')).toBeNull();
    expect(screen.queryByText(/USD/)).toBeNull();
  });
  it('blocks consent and signing if snapshot content is missing', () => {
    const version = { ...sample, snapshot: undefined, validUntil: '2099-01-01 00:00' } as unknown as ContractVersion;
    const request = { status: 'CONTRACT_READY', versions: [version] } as TransportRequest;
    expect(canAcceptTerms(request)).toBe(false);
    expect(canSign({ ...request, status: 'DEPOSIT_VERIFIED' })).toBe(false);
    render(<ContractBody request={request} v={version} horses={[]} />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
