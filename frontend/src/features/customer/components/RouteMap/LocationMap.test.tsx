import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocationMap } from './LocationMap';

const mock = vi.hoisted(() => {
  const map = { setView: vi.fn(), fitBounds: vi.fn(), invalidateSize: vi.fn(), remove: vi.fn() };
  const layer = { addTo: vi.fn(), bindTooltip: vi.fn() };
  return { map, layer, circleMarker: vi.fn(), polyline: vi.fn(), bounds: vi.fn(), disconnect: vi.fn() };
});
vi.mock('leaflet', () => ({ default: {
  map: () => mock.map, tileLayer: () => mock.layer,
  circleMarker: mock.circleMarker, polyline: mock.polyline, latLngBounds: mock.bounds,
} }));
beforeEach(() => {
  mock.map.setView.mockReturnValue(mock.map);
  mock.layer.addTo.mockReturnValue(mock.layer);
  mock.circleMarker.mockReturnValue(mock.layer);
  mock.polyline.mockReturnValue(mock.layer);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect = mock.disconnect; });
});

describe('Customer Leaflet map', () => {
  it('updates address pins and disposes the old map on changes and unmount', () => {
    const view = render(<LocationMap points={[{ latitude: 10, longitude: 106, label: 'Pickup' }]} />);
    expect(mock.circleMarker).toHaveBeenLastCalledWith([10, 106], expect.any(Object));
    view.rerender(<LocationMap points={[{ latitude: 21, longitude: 105, label: 'Delivery' }]} />);
    expect(mock.circleMarker).toHaveBeenLastCalledWith([21, 105], expect.any(Object));
    expect(mock.map.remove).toHaveBeenCalledOnce();
    view.unmount();
    expect(mock.map.remove).toHaveBeenCalledTimes(2);
    expect(mock.disconnect).toHaveBeenCalledTimes(2);
  });
  it('skips missing or invalid coordinates without joining gaps in the route', () => {
    render(<LocationMap route current={2} points={[
      { latitude: 10, longitude: 106, label: 'Start' },
      { label: 'Missing' },
      { latitude: 11, longitude: 107, label: '<img src=x onerror=alert(1)>' },
      { latitude: 91, longitude: 108, label: 'Invalid' },
    ]} />);
    expect(mock.circleMarker).toHaveBeenCalledTimes(2);
    expect(mock.polyline).not.toHaveBeenCalled();
    const tooltip = mock.layer.bindTooltip.mock.calls.at(-1)![0] as HTMLElement;
    expect(tooltip.querySelector('img')).toBeNull();
    expect(tooltip.textContent).toContain('<img');
  });
  it('distinguishes confirmed segments from planned segments', () => {
    render(<LocationMap route current={1} points={[
      { latitude: 10, longitude: 106, label: 'A' },
      { latitude: 11, longitude: 107, label: 'B' },
      { latitude: 12, longitude: 108, label: 'C' },
    ]} />);
    expect(mock.polyline.mock.calls[0][1]).toMatchObject({ color: '#f57c00', dashArray: undefined });
    expect(mock.polyline.mock.calls[1][1]).toMatchObject({ color: '#64748b', dashArray: '6 8' });
  });
});
