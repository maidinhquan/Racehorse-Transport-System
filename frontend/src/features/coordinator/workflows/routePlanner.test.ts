import { describe, expect, it } from 'vitest';
import { autoSortStopsArray } from './routePlanner';

describe('Route stop ordering and auto-sort', () => {
  it('sorts intermediate stops along the route progression from North to South (ROAD)', () => {
    const t = { mode: 'ROAD' };
    const rt = {
      stops: [
        { name: 'Hà Nội (ORIGIN)', type: 'ORIGIN', lat: 21.0285, lng: 105.8542 },
        // Lộn xộn: Nha Trang, Ninh Bình, Đà Nẵng, Thanh Hóa
        { name: 'Nha Trang', type: 'REST', lat: 12.2388, lng: 109.1967 },
        { name: 'Ninh Bình', type: 'REST', lat: 20.2506, lng: 105.9744 },
        { name: 'Đà Nẵng', type: 'REST', lat: 16.0544, lng: 108.2022 },
        { name: 'Thanh Hóa', type: 'REST', lat: 19.8067, lng: 105.7852 },
        { name: 'TP. Hồ Chí Minh (DESTINATION)', type: 'DESTINATION', lat: 10.8231, lng: 106.6297 },
      ],
    };

    autoSortStopsArray(t, rt);

    const names = rt.stops.map((s) => s.name);
    expect(names).toEqual([
      'Hà Nội (ORIGIN)',
      'Ninh Bình',
      'Thanh Hóa',
      'Đà Nẵng',
      'Nha Trang',
      'TP. Hồ Chí Minh (DESTINATION)',
    ]);
  });

  it('sorts intermediate stops along the route progression from South to North (ROAD)', () => {
    const t = { mode: 'ROAD' };
    const rt = {
      stops: [
        { name: 'TP. Hồ Chí Minh (ORIGIN)', type: 'ORIGIN', lat: 10.8231, lng: 106.6297 },
        // Lộn xộn: Hà Nội, Huế, Phan Thiết
        { name: 'Huế', type: 'REST', lat: 16.4637, lng: 107.5909 },
        { name: 'Phan Thiết', type: 'REST', lat: 10.9298, lng: 108.1021 },
        { name: 'Ninh Bình', type: 'REST', lat: 20.2506, lng: 105.9744 },
        { name: 'Hà Nội (DESTINATION)', type: 'DESTINATION', lat: 21.0285, lng: 105.8542 },
      ],
    };

    autoSortStopsArray(t, rt);

    const names = rt.stops.map((s) => s.name);
    expect(names).toEqual([
      'TP. Hồ Chí Minh (ORIGIN)',
      'Phan Thiết',
      'Huế',
      'Ninh Bình',
      'Hà Nội (DESTINATION)',
    ]);
  });

  it('preserves airports in AIR mode and sorts outbound and inbound ground legs independently', () => {
    const t = { mode: 'AIR' };
    const rt = {
      stops: [
        { name: 'Trang trại Củ Chi (ORIGIN)', type: 'ORIGIN', lat: 11.0058, lng: 106.5133 },
        // Outbound lộn xộn
        { name: 'Trạm dừng sát sân bay TSN', type: 'REST', lat: 10.8200, lng: 106.6500 },
        { name: 'Trạm kiểm tra Hóc Môn', type: 'REST', lat: 10.8850, lng: 106.5920 },
        // Sân bay cố định
        { name: 'Sân bay Tân Sơn Nhất (SGN)', type: 'AIRPORT', lat: 10.8188, lng: 106.6519 },
        { name: 'Sân bay Narita (NRT)', type: 'AIRPORT', lat: 35.7720, lng: 140.3929 },
        // Inbound lộn xộn
        { name: 'Trạm nghỉ Tokyo Suburb', type: 'REST', lat: 35.6895, lng: 139.7500 },
        { name: 'Trạm kiểm dịch Chiba', type: 'QUARANTINE', lat: 35.7500, lng: 140.2000 },
        { name: 'CLB Ngựa Tokyo (DESTINATION)', type: 'DESTINATION', lat: 35.6500, lng: 139.7000 },
      ],
    };

    autoSortStopsArray(t, rt);

    const names = rt.stops.map((s) => s.name);
    expect(names).toEqual([
      'Trang trại Củ Chi (ORIGIN)',
      'Trạm kiểm tra Hóc Môn',
      'Trạm dừng sát sân bay TSN',
      'Sân bay Tân Sơn Nhất (SGN)',
      'Sân bay Narita (NRT)',
      'Trạm kiểm dịch Chiba',
      'Trạm nghỉ Tokyo Suburb',
      'CLB Ngựa Tokyo (DESTINATION)',
    ]);
  });
});

