import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeployModal } from './ManagerModals';
import type { Staff } from '../../types';

const rows: Staff[] = [
  { id: 'OTHER_SP', name: 'Chuyên viên khác', role: 'TRANSPORT_SPECIALIST' },
  { id: 'USER_005', name: 'Lê Tuấn', role: 'TRANSPORT_SPECIALIST' },
  { id: 'OTHER_CO', name: 'Điều phối khác', role: 'FLEET_ROUTE_COORDINATOR' },
  { id: 'USER_006', name: 'Phạm Hải', role: 'FLEET_ROUTE_COORDINATOR' },
];

describe('Database staff assignment', () => {
  it('shows every returned member, recommends the quick-login accounts and submits the selected IDs', async () => {
    const submit = vi.fn().mockResolvedValue(true);
    const close = vi.fn();
    const loadStaff = vi.fn().mockResolvedValue(rows);
    render(<DeployModal open tripId="TRIP_004" staff={[]} loadStaff={loadStaff} onClose={close} onSubmit={submit} />);
    expect(await screen.findByRole('option', { name: /Lê Tuấn.*\(Recommend\)$/ })).toHaveValue('USER_005');
    expect(screen.getByRole('option', { name: /Phạm Hải.*\(Recommend\)$/ })).toHaveValue('USER_006');
    expect(screen.getByRole('option', { name: /Chuyên viên khác/ })).toHaveValue('OTHER_SP');
    expect(screen.getByRole('option', { name: /Điều phối khác/ })).toHaveValue('OTHER_CO');
    expect(submit).not.toHaveBeenCalled();
    const selects = screen.getAllByRole('combobox');
    expect(selects[0]).toHaveValue('');
    fireEvent.change(selects[0], { target: { value: 'USER_005' } });
    fireEvent.change(selects[1], { target: { value: 'OTHER_CO' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Giao việc & xác nhận triển khai' }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith('USER_005', 'OTHER_CO'));
    expect(close).toHaveBeenCalledOnce();
  });
  it('does not fall back to cached names when the database request fails and supports retry', async () => {
    const loadStaff = vi.fn().mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce(rows);
    render(<DeployModal open tripId="TRIP_004" staff={rows} loadStaff={loadStaff} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được danh sách nhân sự');
    expect(screen.queryByRole('option', { name: /Lê Tuấn/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Giao việc & xác nhận triển khai' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('option', { name: /Lê Tuấn/ })).toBeTruthy();
    expect(loadStaff).toHaveBeenCalledTimes(2);
  });
  it('refreshes members on reopen and never inserts quick-login users absent from the database', async () => {
    const loadStaff = vi.fn().mockResolvedValueOnce(rows).mockResolvedValueOnce([rows[0], rows[2]]);
    const props = { tripId: 'TRIP_004', staff: [], loadStaff, onClose: vi.fn(), onSubmit: vi.fn() };
    const view = render(<DeployModal {...props} open />);
    await screen.findByRole('option', { name: /Lê Tuấn/ });
    view.rerender(<DeployModal {...props} open={false} />);
    view.rerender(<DeployModal {...props} open />);
    await screen.findByRole('option', { name: /Chuyên viên khác/ });
    expect(screen.queryByRole('option', { name: /Recommend/ })).toBeNull();
    expect(loadStaff).toHaveBeenCalledTimes(2);
  });
});
