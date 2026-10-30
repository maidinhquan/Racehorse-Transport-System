import L from 'leaflet';
import { apiClient } from '../../../../shared/api/apiClient';

/** Fetch through the authenticated backend so the Geoapify key never reaches the browser. */
export function addGeoapifyTiles(map: L.Map, onError: () => void) {
  const pending = new Map<HTMLElement, AbortController>();
  class Tiles extends L.TileLayer {
    createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
      const img = document.createElement('img');
      img.alt = '';
      const abort = new AbortController();
      pending.set(img, abort);
      void apiClient.get<Blob>(`/locations/tiles/${coords.z}/${coords.x}/${coords.y}.png`, {
        responseType: 'blob', signal: abort.signal,
      }).then(({ data }) => {
        if (abort.signal.aborted) return;
        const url = URL.createObjectURL(data);
        img.onload = () => { URL.revokeObjectURL(url); done(undefined, img); };
        img.onerror = () => { URL.revokeObjectURL(url); onError(); done(new Error('Map image failed'), img); };
        img.src = url;
      }).catch(() => {
        if (!abort.signal.aborted) { onError(); done(new Error('Map background unavailable'), img); }
      });
      return img;
    }
  }
  const tiles = new Tiles('', {
    maxZoom: 19,
    attribution: 'Powered by <a href="https://www.geoapify.com/">Geoapify</a> | <a href="https://openmaptiles.org/">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a> contributors',
  });
  tiles.on('tileunload', event => { pending.get(event.tile)?.abort(); pending.delete(event.tile); });
  tiles.addTo(map);
  return () => { pending.forEach(abort => abort.abort()); pending.clear(); };
}
