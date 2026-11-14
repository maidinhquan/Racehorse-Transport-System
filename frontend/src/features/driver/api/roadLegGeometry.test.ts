import axios from 'axios';
import { afterEach, expect, it, vi } from 'vitest';
import { roadLegGeometry } from './driverApi';

afterEach(() => vi.restoreAllMocks());

it('draws OSRM road geometry in latitude-longitude order and reuses it for the same stops', async () => {
  const request = vi.spyOn(axios, 'get').mockResolvedValue({ data: { code: 'Ok', routes: [{ legs: [{ steps: [
    { geometry: { coordinates: [[106, 10], [107, 10.5], [108, 11]] } },
  ] }] }] } });
  const points: Array<[number, number]> = [[10, 106], [11, 108]];

  expect(await roadLegGeometry(points)).toEqual([[[10, 106], [10.5, 107], [11, 108]]]);
  expect(await roadLegGeometry(points)).toEqual([[[10, 106], [10.5, 107], [11, 108]]]);
  expect(request).toHaveBeenCalledOnce();
  expect(request.mock.calls[0][0]).toContain('106,10;108,11');
});
