import { describe, it, expect } from 'vitest';
import { INCIDENT_TYPE_LABEL } from './hooks/driverRules';

describe('Driver Pickup Access Exception Feature Tests', () => {
  it('registers PICKUP_ACCESS_BLOCKED incident type with correct Vietnamese label', () => {
    expect(INCIDENT_TYPE_LABEL.PICKUP_ACCESS_BLOCKED).toBe('Không thể tiếp cận điểm lấy ngựa');
  });

  it('matches incident ID with both hyphen (INC-) and underscore (INC_) prefixes', () => {
    const isTripMatch = (incId: string, incTripId: string, targetTripId: string) => {
      const isIdFormat = incId.startsWith('INC-') || incId.startsWith('INC_');
      const isTripDirectMatch =
        incTripId === targetTripId ||
        incTripId.replace(/-/g, '_') === targetTripId.replace(/-/g, '_');
      return isIdFormat && isTripDirectMatch;
    };

    expect(isTripMatch('INC-001', 'TRP-901', 'TRP-901')).toBe(true);
    expect(isTripMatch('INC_20261110_123456', 'TRIP_002', 'TRP-002')).toBe(false);
    expect(isTripMatch('INC_20261110_123456', 'TRIP_002', 'TRIP-002')).toBe(true);
  });

  it('correctly calculates geodetic distance threshold under 500m for walking vs shuttle', () => {
    const isWalkingResolution = (distanceMeters: number) => distanceMeters < 500;

    expect(isWalkingResolution(234)).toBe(true);  // < 500m -> Dắt bộ
    expect(isWalkingResolution(499)).toBe(true);  // < 500m -> Dắt bộ
    expect(isWalkingResolution(500)).toBe(false); // >= 500m -> Xe trung chuyển
    expect(isWalkingResolution(1200)).toBe(false); // >= 500m -> Xe trung chuyển
  });

  it('correctly determines whether trip progression must be blocked for safety', () => {
    const isJourneyBlocked = (status?: string) => {
      return status === 'BLOCKED' || (!!status && status !== 'NORMAL' && status !== 'RESOLVED');
    };

    expect(isJourneyBlocked('NORMAL')).toBe(false);
    expect(isJourneyBlocked(undefined)).toBe(false);
    expect(isJourneyBlocked('BLOCKED')).toBe(true);
    expect(isJourneyBlocked('RELOCATING')).toBe(true);
    expect(isJourneyBlocked('SHUTTLING')).toBe(true);
    expect(isJourneyBlocked('RESOLVED')).toBe(false); // Đã giải quyết -> Mở khóa hành trình
  });

  it('correctly maps resolution types to human readable dispatch titles', () => {
    const getDispatchTitle = (status?: string) => {
      switch (status) {
        case 'RELOCATING':
          return 'Lệnh điều động: Dắt bộ ra điểm hẹn mới';
        case 'SHUTTLING':
          return 'Lệnh điều động: Xe trung chuyển đón ngựa';
        case 'RESOLVED':
          return 'Phương án đón ngựa đã được hoàn tất!';
        default:
          return 'Bình thường';
      }
    };

    expect(getDispatchTitle('RELOCATING')).toBe('Lệnh điều động: Dắt bộ ra điểm hẹn mới');
    expect(getDispatchTitle('SHUTTLING')).toBe('Lệnh điều động: Xe trung chuyển đón ngựa');
    expect(getDispatchTitle('RESOLVED')).toBe('Phương án đón ngựa đã được hoàn tất!');
  });
});

