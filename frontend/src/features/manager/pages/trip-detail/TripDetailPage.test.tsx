import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { TransportRequest, Trip } from '../../types';
import { WorkflowHeader } from '../../components/WorkflowNav/WorkflowHeader';
import { TripDetailPage } from './TripDetailPage';

const mock = vi.hoisted(() => ({ getTrip: vi.fn(), requests: [] as unknown[] }));
vi.mock('../../hooks/useManager', () => ({ useManager: () => ({
  getTrip: mock.getTrip, data: { requests: mock.requests }, customer: () => ({ name: 'Khách kiểm thử' }),
}) }));
vi.mock('../../components/ManagerLayout', () => ({
  ManagerLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  Icon: () => null,
}));
vi.mock('./stages/AssignStage', () => ({ AssignStage: () => <div>Nội dung phân công</div> }));
vi.mock('./stages/PrepareStage', () => ({ PrepareStage: () => <div>Nội dung chuẩn bị</div> }));
vi.mock('./stages/DepartStage', () => ({ DepartStage: () => <div>Nội dung duyệt khởi hành</div> }));
vi.mock('./stages/ProgressStage', () => ({ ProgressStage: () => <div>Nội dung vận chuyển</div> }));

const request = {
  id: 'REQUEST_011', status: 'ACTIVATED', horses: ['HORSE_010'],
  origin: 'Thủ Đức', destination: 'Hà Nội',
  pickup: { address: 'Địa chỉ nhận ngựa' }, delivery: { address: 'Địa chỉ giao ngựa' },
  versions: [{ signedAt: '2026-10-29 04:26' }],
} as unknown as TransportRequest;
const trip = {
  id: 'TRIP_004', requestId: request.id, status: 'PLANNING',
  plannedDepart: '2026-12-14 06:00', eta: '2026-12-18 18:00',
  deployment: { status: 'NOT_CONFIRMED' },
  readiness: { docsReady: 0, docsTotal: 1, insurance: 'MISSING', quarantineOk: false },
} as Trip;

function TestApp({ path }: { path: string }) {
  return <MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/manager/requests/:requestId" element={<WorkflowHeader request={request} trip={trip} current="request" />} />
    <Route path="/manager/trips/:tripId/:stage?" element={<TripDetailPage />} />
  </Routes></MemoryRouter>;
}
const open = (path: string) => render(<TestApp path={path} />);
beforeEach(() => { mock.getTrip.mockReturnValue(trip); mock.requests = [request]; });

describe('Manager case navigation', () => {
  it('keeps the complete case header when navigating from a request to its trip', () => {
    open('/manager/requests/REQUEST_011');
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Quy trình yêu cầu' })).getByRole('link', { name: /Chuyến đi/ }));
    const workflow = screen.getByRole('navigation', { name: 'Quy trình yêu cầu' });
    expect(within(workflow).getByRole('link', { name: /Yêu cầu & xét duyệt/ })).toHaveAttribute('href', '/manager/requests/REQUEST_011');
    expect(within(workflow).getByRole('link', { name: /Hợp đồng & giá/ })).toHaveAttribute('href', '/manager/contracts/REQUEST_011');
    expect(within(workflow).getByRole('link', { name: /Chuyến đi/ })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('heading', { name: request.id })).toBeTruthy();
    expect(screen.getByText('Địa chỉ nhận ngựa')).toBeTruthy();
    expect(screen.getByText('Nội dung phân công')).toBeTruthy();
    expect(screen.getByText('Chờ Coordinator lập phương án')).toBeTruthy();
  });
  it('retains case navigation while switching operational tabs and keeps transport locked', () => {
    open('/manager/trips/TRIP_004');
    const stages = screen.getByRole('navigation', { name: 'Tiến trình chuyến đi' });
    expect(within(stages).getByRole('button', { name: /Vận chuyển/ })).toBeDisabled();
    fireEvent.click(within(stages).getByRole('link', { name: /Chuẩn bị/ }));
    expect(screen.getByText('Nội dung chuẩn bị')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Quy trình yêu cầu' })).toBeTruthy();
    expect(within(screen.getByRole('navigation', { name: 'Tiến trình chuyến đi' })).getByRole('link', { name: /Chuẩn bị/ })).toHaveAttribute('aria-current', 'step');
  });
  it('handles a trip whose request has not loaded without crashing', () => {
    mock.requests = [];
    open('/manager/trips/TRIP_004');
    expect(screen.getByText('Đang tải hồ sơ yêu cầu')).toBeTruthy();
  });
  it('locks assignment and moves to preparation when deployment is confirmed', () => {
    const path = '/manager/trips/TRIP_004/assign';
    const view = open(path);
    expect(screen.getByText('Nội dung phân công')).toBeTruthy();
    mock.getTrip.mockReturnValue({ ...trip, deployment: { status: 'CONFIRMED' } });
    view.rerender(<TestApp path={path} />);
    const stages = screen.getByRole('navigation', { name: 'Tiến trình chuyến đi' });
    expect(within(stages).getByRole('button', { name: /Phân công/ })).toBeDisabled();
    expect(within(stages).queryByRole('link', { name: /Phân công/ })).toBeNull();
    expect(within(stages).getByRole('link', { name: /Chuẩn bị/ })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Nội dung chuẩn bị')).toBeTruthy();
    expect(screen.queryByText('Nội dung phân công')).toBeNull();
  });
  it.each(['CONFIRMED', 'ON_HOLD'])('keeps assignment locked when reopening an assigned trip (%s)', (status) => {
    mock.getTrip.mockReturnValue({ ...trip, deployment: { status } });
    open('/manager/trips/TRIP_004/assign');
    const stages = screen.getByRole('navigation', { name: 'Tiến trình chuyến đi' });
    expect(within(stages).getByRole('button', { name: /Phân công/ })).toBeDisabled();
    expect(screen.getByText('Nội dung chuẩn bị')).toBeTruthy();
  });
});
