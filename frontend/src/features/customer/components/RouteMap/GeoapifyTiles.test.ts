import L from 'leaflet';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addGeoapifyTiles } from './GeoapifyTiles';
import { apiClient } from '../../../../shared/api/apiClient';

vi.mock('../../../../shared/api/apiClient', () => ({ apiClient: { get: vi.fn() } }));
let layer: { createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement };
beforeEach(() => {
  vi.spyOn(L.TileLayer.prototype, 'addTo').mockImplementation(function (this: L.TileLayer) {
    layer = this as unknown as typeof layer;
    return this;
  });
  vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:test'), revokeObjectURL: vi.fn() });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Authenticated Geoapify tiles', () => {
  it('loads images from the backend and releases the image URL', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: new Blob(['png']) });
    addGeoapifyTiles({} as L.Map, vi.fn());
    const done = vi.fn();
    const tile = layer.createTile({ x: 8, y: 7, z: 4 } as L.Coords, done) as HTMLImageElement;
    await vi.waitFor(() => expect(tile.src).toBe('blob:test'));
    expect(apiClient.get).toHaveBeenCalledWith('/locations/tiles/4/8/7.png', expect.objectContaining({ responseType: 'blob' }));
    tile.dispatchEvent(new Event('load'));
    expect(done).toHaveBeenCalledWith(undefined, tile);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
  it('reports failed requests and cancels pending tiles when disposed', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('503'));
    const failed = vi.fn();
    const cancel = addGeoapifyTiles({} as L.Map, failed);
    const done = vi.fn();
    layer.createTile({ x: 8, y: 7, z: 4 } as L.Coords, done);
    await vi.waitFor(() => expect(failed).toHaveBeenCalledOnce());
    expect(done).toHaveBeenCalledWith(expect.any(Error), expect.any(HTMLImageElement));
    cancel();
    const options = vi.mocked(apiClient.get).mock.calls.at(-1)![1];
    expect(options!.signal!.aborted).toBe(true);
  });
});
