import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '../../../../shared/context/ThemeContext';
import { IncidentsPage as ManagerIncidentsPage } from './IncidentsPage';
import { IncidentDetailPage as ManagerIncidentDetailPage } from '../incident-detail/IncidentDetailPage';
import { ComplaintDetailPage as ManagerComplaintDetailPage } from '../complaint-detail/ComplaintDetailPage';
import { IncidentDetailPage as CoordinatorIncidentDetailPage } from '../../../coordinator/pages/incidents/IncidentDetailPage';
import { db } from '../../../coordinator/store/coordinatorStore';

describe('Incidents and Complaints rendering safe guards', () => {
  it('renders CoordinatorIncidentDetailPage safely when trip is missing', () => {
    db.incidents = [{ id: 'INC-ERR', tripId: 'TRIP_NOT_EXIST', status: 'REPORTED', plans: [], log: [] }];
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/coordinator/incidents/INC-ERR']}>
          <Routes>
            <Route path="/coordinator/incidents/:incidentId" element={<CoordinatorIncidentDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );
  });

  it('renders ManagerIncidentsPage safely', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/manager/incidents']}>
          <Routes>
            <Route path="/manager/incidents" element={<ManagerIncidentsPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );
  });

  it('renders ManagerIncidentDetailPage safely when trip is missing', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/manager/incidents/INC-901']}>
          <Routes>
            <Route path="/manager/incidents/:incidentId" element={<ManagerIncidentDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );
  });

  it('renders ManagerComplaintDetailPage safely when request is missing', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/manager/complaints/CMP-801']}>
          <Routes>
            <Route path="/manager/complaints/:complaintId" element={<ManagerComplaintDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );
  });
});
