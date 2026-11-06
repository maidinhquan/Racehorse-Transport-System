import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '../../../../shared/context/ThemeContext';
import { SpecialistIncidentsPage } from './SpecialistIncidentsPage';
import { saveSharedIncident } from '../../../../shared/utils/sharedIncidents';

describe('SpecialistIncidentsPage Layout & Interaction', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders SpecialistIncidentsPage safely with empty state', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/specialist/incidents']}>
          <Routes>
            <Route path="/specialist/incidents" element={<SpecialistIncidentsPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByRole('heading', { level: 2, name: /Sự cố vận chuyển & Rà soát pháp lý/i })).toBeDefined();
    expect(screen.getByText('Tổng sự cố')).toBeDefined();
    expect(screen.getByText('Cần rà soát pháp lý')).toBeDefined();
  });

  it('renders incident card with two-column layout and metadata correctly', () => {
    const mockInc = {
      id: 'INC-7495',
      tripId: 'TRIP_003',
      type: 'BAD_WEATHER',
      severity: 'MEDIUM',
      status: 'NEW',
      at: '2026-11-06T23:56:00.000Z',
      by: 'USER_015',
      location: 'Tại điểm nhận trang trại Sóc Sơn',
      description: 'Mưa to ngập đường xe di chuyển chậm',
      photos: [],
    };

    saveSharedIncident(mockInc as any);

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/specialist/incidents']}>
          <Routes>
            <Route path="/specialist/incidents" element={<SpecialistIncidentsPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByText('INC-7495')).toBeDefined();
    expect(screen.getByText('Chuyến TRIP_003')).toBeDefined();
    expect(screen.getByText('Thời tiết xấu')).toBeDefined();
    expect(screen.getByText('Mưa to ngập đường xe di chuyển chậm')).toBeDefined();
    expect(screen.getByRole('button', { name: /Tiến hành rà soát pháp lý/i })).toBeDefined();
  });
});
