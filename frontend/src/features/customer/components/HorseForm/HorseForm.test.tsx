import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { emptyHorse } from '../../hooks/customerRules';
import { HorseForm } from './HorseForm';

vi.mock('../../../../shared/context/DemoModeContext', () => ({ getDemoMode: () => true }));

vi.mock('../../hooks/useCustomer', () => ({ useCustomer: () => ({ actions: { showToast: vi.fn() } }) }));

function Form() {
  const [horse, setHorse] = useState(emptyHorse);
  return <HorseForm value={horse} onChange={setHorse} />;
}

describe('Horse profile fields from the reference form', () => {
  it('allows entering coat color, vaccination date and private veterinarian details', () => {
    render(<Form />);
    for (const [label, value] of [['Màu lông', 'Nâu'], ['Tên bác sĩ', 'Nguyễn An'], ['Số điện thoại', '0901234567']]) {
      const input = screen.getByLabelText(label);
      expect(input).toBeEnabled();
      fireEvent.change(input, { target: { value } });
      expect(input).toHaveValue(value);
    }
    expect(screen.getByLabelText('Ngày tiêm cúm gần nhất')).toBeEnabled();
    expect(screen.queryByText(/chưa thể lưu trực tuyến/)).not.toBeInTheDocument();
  });

  it.each(['Sổ tiêm ngừa', 'Giấy chứng nhận sức khỏe'])('supports selecting, replacing and removing %s', (label) => {
    render(<Form />);
    const section = screen.getByRole('heading', { name: '05 · Hồ sơ tiêm ngừa & sức khỏe' }).closest('section')!;
    const group = within(section).getByText(label).parentElement!;
    expect(within(group).getByRole('button', { name: 'Tải tệp' })).toBeEnabled();
    const input = group.querySelector('input[type="file"]')!;
    const first = new File(['vaccination'], 'record.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [first] } });
    expect(within(group).getByText('record.pdf')).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Xem' })).toBeEnabled();
    const next = new File(['updated'], 'updated.pdf', { type: 'application/pdf' });
    fireEvent.change(group.querySelector('input[type="file"]')!, { target: { files: [next] } });
    expect(within(group).getByText('updated.pdf')).toBeInTheDocument();
    fireEvent.click(within(group).getByRole('button', { name: 'Xóa' }));
    expect(within(group).getByRole('button', { name: 'Tải tệp' })).toBeEnabled();
    expect(within(group).queryByText('updated.pdf')).not.toBeInTheDocument();
  });
});
