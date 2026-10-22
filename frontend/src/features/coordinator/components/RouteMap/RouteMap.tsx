import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RouteMap.css';
import type { GeoPoint } from '../../api/checkpointCatalog';
import type { RouteStop } from '../../types';
import { STOP_COLOR, STOP_LABEL } from '../../hooks/coordinatorRules';

interface RouteMapProps {
  stops: RouteStop[];
  current?: number;
  height?: number;
  onPick?: (point: GeoPoint) => void;
}

const BASEMAPS = {
  esri: {
    label: 'Esri Streets',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Sources: <a href="https://www.arcgis.com/home/item.html?id=3b93337983e9436f8db950e38a8629af">Esri</a>, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, &copy; OpenStreetMap contributors, and the GIS User Community',
  },
  osm: {
    label: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

function hasCoordinates(stop: RouteStop) {
  return typeof stop.lat === 'number' && Number.isFinite(stop.lat)
    && stop.lat >= -90 && stop.lat <= 90
    && typeof stop.lng === 'number' && Number.isFinite(stop.lng)
    && stop.lng >= -180 && stop.lng <= 180;
}

export function RouteMap({ stops, current = -1, height = 560, onPick }: RouteMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const lastBounds = useRef('');
  const [tileError, setTileError] = useState(false);
  const [basemap, setBasemap] = useState<keyof typeof BASEMAPS>('esri');
  const [tileRetry, setTileRetry] = useState(0);
  const [sizeMode, setSizeMode] = useState<'standard' | 'large' | 'fullscreen'>('standard');
  const missing = stops.filter(stop => !hasCoordinates(stop));

  useEffect(() => {
    if (!container.current) return;
    if ((container.current as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (container.current as unknown as { _leaflet_id?: number })._leaflet_id;
    }
    const map = L.map(container.current, { scrollWheelZoom: true }).setView([13, 106], 5);
    mapRef.current = map;
    layersRef.current = L.layerGroup().addTo(map);
    const resize = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
      lastBounds.current = '';
    };
  }, []);

  // Listen for Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sizeMode === 'fullscreen') {
        setSizeMode('standard');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sizeMode]);

  // When sizeMode changes, recalculate map dimensions and center
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize({ pan: false });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [sizeMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = BASEMAPS[basemap];
    const tiles = L.tileLayer(source.url, { maxZoom: 19, attribution: source.attribution });
    let failedTiles = 0;
    tiles.on('loading', () => { failedTiles = 0; setTileError(false); });
    tiles.on('tileerror', () => { failedTiles += 1; setTileError(true); });
    tiles.on('load', () => setTileError(failedTiles > 0));
    tiles.addTo(map);
    return () => { tiles.off(); tiles.remove(); };
  }, [basemap, tileRetry]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onPick) return;
    const handleClick = (event: L.LeafletMouseEvent) => {
      const point = event.latlng.wrap();
      onPick({ lat: point.lat, lng: point.lng });
    };
    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [onPick]);

  const fitRoute = () => {
    const map = mapRef.current;
    if (!map) return;
    const located = stops.flatMap((stop) => hasCoordinates(stop) ? [[stop.lat!, stop.lng!] as L.LatLngTuple] : []);
    if (located.length) {
      map.fitBounds(L.latLngBounds(located), { padding: [45, 45], maxZoom: 13 });
    } else {
      map.setView([13, 106], 5);
    }
  };

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;
    layers.clearLayers();
    const located = stops.flatMap((stop, index) => hasCoordinates(stop)
      ? [{ stop, index, position: [stop.lat!, stop.lng!] as L.LatLngTuple }] : []);
    const lastConfirmed = Number.isInteger(current) && current >= 0 && current < stops.length ? current : -1;

    // Never connect across a stop whose coordinates are missing.
    for (let i = 1; i < located.length; i++) {
      const previous = located[i - 1], next = located[i];
      if (next.index !== previous.index + 1) continue;
      const confirmed = next.index <= lastConfirmed;
      L.polyline([previous.position, next.position], {
        color: confirmed ? '#f57c00' : '#64748b', weight: 4,
        dashArray: confirmed ? undefined : '7 8', interactive: false,
      }).addTo(layers);
    }

    located.forEach(({ stop, index, position }) => {
      const latest = index === lastConfirmed;
      const marker = L.circleMarker(position, {
        bubblingMouseEvents: false, radius: latest ? 12 : 9, color: '#fff', weight: 3,
        fillColor: latest ? '#f57c00' : (STOP_COLOR[stop.type] ?? '#64748b'), fillOpacity: 1,
      }).addTo(layers);
      // Use text nodes, so names entered by users are not treated as HTML.
      const tooltip = document.createElement('span');
      tooltip.textContent = `${index + 1}. ${stop.name}`;
      marker.bindTooltip(tooltip, { direction: 'top' });
      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `${index + 1}. ${stop.name}`;
      const details = document.createElement('p');
      details.textContent = `${STOP_LABEL[stop.type] ?? stop.type} • ${stop.country} • dự kiến ${stop.plannedAt || 'Chưa cập nhật'}`;
      popup.append(title, details);
      if (latest) {
        const status = document.createElement('p');
        status.textContent = 'Mốc xác nhận gần nhất';
        popup.append(status);
      }
      marker.bindPopup(popup);
    });

    const boundsKey = JSON.stringify(located.map(point => [point.stop.id, ...point.position]));
    if (boundsKey !== lastBounds.current) {
      if (located.length) map.fitBounds(L.latLngBounds(located.map(point => point.position)), { padding: [45, 45], maxZoom: 13 });
      else map.setView([13, 106], 5);
      lastBounds.current = boundsKey;
    }
  }, [stops, current]);

  const canvasHeight = sizeMode === 'fullscreen' ? '100%' : sizeMode === 'large' ? 760 : Math.max(540, height);

  return (
    <div className={`crd-geo-map ${sizeMode === 'fullscreen' ? 'crd-geo-map--fullscreen' : ''}`}>
      <div className="crd-geo-map__toolbar">
        <div className="crd-geo-map__toolbar-group">
          <label>
            <b>Nền bản đồ:</b>{' '}
            <select value={basemap} onChange={event => setBasemap(event.target.value as keyof typeof BASEMAPS)}>
              {Object.entries(BASEMAPS).map(([key, source]) => <option key={key} value={key}>{source.label}</option>)}
            </select>
          </label>
          <button type="button" className="crd-geo-map__btn" onClick={fitRoute} title="Thu phóng vừa toàn bộ tuyến đường">
            🎯 Vừa tuyến
          </button>
        </div>

        <div className="crd-geo-map__toolbar-group">
          <span className="crd-geo-map__toolbar-label">Kích thước:</span>
          <button
            type="button"
            className={`crd-geo-map__btn ${sizeMode === 'standard' ? 'active' : ''}`}
            onClick={() => setSizeMode('standard')}
            title="Kích thước tiêu chuẩn (560px)"
          >
            Chuẩn (560px)
          </button>
          <button
            type="button"
            className={`crd-geo-map__btn ${sizeMode === 'large' ? 'active' : ''}`}
            onClick={() => setSizeMode('large')}
            title="Kích thước mở rộng lớn (760px)"
          >
            Lớn (760px)
          </button>
          <button
            type="button"
            className={`crd-geo-map__btn crd-geo-map__btn--primary ${sizeMode === 'fullscreen' ? 'active' : ''}`}
            onClick={() => setSizeMode(sizeMode === 'fullscreen' ? 'standard' : 'fullscreen')}
            title={sizeMode === 'fullscreen' ? 'Thoát toàn màn hình (Esc)' : 'Mở rộng toàn màn hình'}
          >
            {sizeMode === 'fullscreen' ? '✕ Thu nhỏ' : '⛶ Toàn màn hình'}
          </button>
        </div>
      </div>

      <div
        ref={container}
        className="crd-geo-map__canvas"
        style={{ height: canvasHeight }}
        role="region"
        aria-label={`Bản đồ tuyến gồm ${stops.length} điểm dừng`}
      />

      {!stops.length && <p className="crd-geo-map__notice">Chưa có điểm dừng nào trên tuyến.</p>}
      {missing.length > 0 && (
        <p className="crd-geo-map__notice" role="status">
          Chưa có tọa độ hợp lệ cho {missing.length} điểm: {missing.map(stop => stop.name).join(', ')}.
        </p>
      )}
      {tileError && (
        <div className="crd-geo-map__notice" role="status">
          Chưa tải được một phần hoặc toàn bộ nền {BASEMAPS[basemap].label}. Thử lại hoặc chọn nguồn nền khác.{' '}
          <button type="button" className="crd-btn crd-btn--sm" onClick={() => setTileRetry(value => value + 1)}>
            Thử lại
          </button>
        </div>
      )}
      <div className="crd-geo-map__legend">
        {[...new Set(stops.map(stop => stop.type))].map(type => (
          <span key={type}>
            <i style={{ background: STOP_COLOR[type] ?? '#64748b' }} />
            {STOP_LABEL[type] ?? type}
          </span>
        ))}
        <span>
          <i style={{ background: '#f57c00' }} />
          Mốc xác nhận gần nhất
        </span>
      </div>
      <p className="crd-geo-map__caption">
        Đường nối các điểm dừng theo thứ tự, chưa tính tuyến theo đường bộ. Vị trí dựa trên mốc xác nhận, không có GPS trực tiếp.
      </p>
    </div>
  );
}

export default RouteMap;
