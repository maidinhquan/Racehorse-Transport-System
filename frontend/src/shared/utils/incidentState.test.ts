import { describe, expect, it } from 'vitest';
import { incidentTime, sortIncidentsNewestFirst } from './incidentState';

describe('sortIncidentsNewestFirst', () => {
  it('puts the newest incident first without mutating the input', () => {
    const list = [
      { id: 'INCIDENT_002', at: '2026-11-12 08:01' },
      { id: 'INC_20261112_BE41FD', at: '2026-11-12 08:33' },
      { id: 'INC_20261111_CB3969', at: '2026-11-11 07:48' },
    ];
    expect(sortIncidentsNewestFirst(list).map((i) => i.id)).toEqual(['INC_20261112_BE41FD', 'INCIDENT_002', 'INC_20261111_CB3969']);
    expect(list[0].id).toBe('INCIDENT_002');
  });

  it('keeps the original order for equal times and falls back to the date in the id', () => {
    const same = [{ id: 'A', at: '2026-11-12 08:33' }, { id: 'B', at: '2026-11-12 08:33' }];
    expect(sortIncidentsNewestFirst(same).map((i) => i.id)).toEqual(['A', 'B']);
    expect(incidentTime({ id: 'INC_20261112_X' })).toBeGreaterThan(incidentTime({ id: 'INC_20261111_X' }));
    expect(incidentTime({ id: 'INCIDENT_002' })).toBe(0);
  });
});

import { getIncidentPins, saveIncidentPin } from './sharedIncidentPins';
import { rememberClosedIncident } from './incidentState';

describe('incident pins and closed incidents', () => {
  it('hides pins of closed incidents on route maps but keeps them when asked', () => {
    localStorage.clear();
    saveIncidentPin({ id: 'INC_1', tripId: 'TRIP_1', label: 'x', lat: 10, lng: 106, where: '', description: '', at: '' });
    saveIncidentPin({ id: 'INC_2', tripId: 'TRIP_1', label: 'y', lat: 11, lng: 107, where: '', description: '', at: '' });
    expect(getIncidentPins('TRIP_1').map((p) => p.id).sort()).toEqual(['INC_1', 'INC_2']);
    rememberClosedIncident('INC_1');
    expect(getIncidentPins('TRIP_1').map((p) => p.id)).toEqual(['INC_2']);
    expect(getIncidentPins('TRIP_1', true)).toHaveLength(2);
  });
});
