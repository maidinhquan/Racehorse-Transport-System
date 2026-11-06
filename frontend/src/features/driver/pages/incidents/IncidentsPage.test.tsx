import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '../../../../shared/context/ThemeContext';
import { IncidentsPage } from './IncidentsPage';
import { saveSharedIncident, getSharedIncidents } from '../../../../shared/utils/sharedIncidents';
import { driverApi } from '../../api/driverApi';

describe('Driver Incidents Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists reported incidents in shared storage and retrieves them', async () => {
    const mockInc = {
      id: 'INC_TEST_001',
      tripId: 'TRIP_001',
      type: 'VEHICLE_BREAKDOWN',
      severity: 'HIGH',
      status: 'NEW',
      at: new Date().toISOString(),
      by: 'Driver 1',
      location: 'Km 50 QL1A',
      description: 'Lốp xe bị xì hơi, đang thay lốp dự phòng',
      photos: [],
    };

    saveSharedIncident(mockInc as any);
    const stored = getSharedIncidents();
    expect(stored.some((i) => i.id === 'INC_TEST_001')).toBe(true);

    const merged = await driverApi.getIncidents();
    expect(merged.some((i) => i.id === 'INC_TEST_001')).toBe(true);
  });

  it('renders IncidentsPage safely', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/driver/incidents']}>
          <Routes>
            <Route path="/driver/incidents" element={<IncidentsPage />} />
            <Route path="/driver/incidents/:tripId" element={<IncidentsPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByRole('heading', { name: /Báo cáo sự cố/i })).toBeDefined();
  });
});
