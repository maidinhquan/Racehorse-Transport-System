import { it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '../../../../shared/context/ThemeContext';
import { IncidentsPage } from './IncidentsPage';

(globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

it('does not loop forever when the page renders (regression: sortedList effect)', async () => {
  render(<ThemeProvider><MemoryRouter initialEntries={['/driver/incidents']}><Routes><Route path="/driver/incidents" element={<IncidentsPage />} /></Routes></MemoryRouter></ThemeProvider>);
  await act(async () => { await new Promise((r) => setTimeout(r, 1500)); });
  expect(document.body.textContent?.length).toBeGreaterThan(0);
}, 20000);
