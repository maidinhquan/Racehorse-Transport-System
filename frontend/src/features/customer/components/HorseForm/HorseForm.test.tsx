import { render, screen, within } from '@testing-library/react';
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
  it('does not render unsupported coat color and vaccination date fields', () => {
    render(<Form />);
    expect(screen.queryByLabelText('Màu lông')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ngày tiêm cúm gần nhất')).not.toBeInTheDocument();
    expect(screen.queryByText(/chưa thể lưu trực tuyến/)).not.toBeInTheDocument();
  });

  it('renders medical file upload fields in horse profile form', () => {
    render(<Form />);
    const section = screen.getByRole('heading', { name: '05 · Hồ sơ tiêm ngừa & sức khỏe' }).closest('section')!;
    expect(within(section).getByText(/Sổ tiêm ngừa/)).toBeInTheDocument();
    expect(within(section).queryByText('Giấy chứng nhận sức khỏe')).not.toBeInTheDocument();
    expect(within(section).getByLabelText('Ghi chú sức khỏe đặc biệt')).toBeEnabled();
  });
});
