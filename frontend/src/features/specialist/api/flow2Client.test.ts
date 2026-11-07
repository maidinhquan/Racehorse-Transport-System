import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flow2Api } from './flow2Api';
import { apiClient } from '../../../shared/api/apiClient';

vi.mock('../../../shared/api/apiClient', () => ({
  apiClient: {
    request: vi.fn(),
  },
}));

const mockRequest = vi.mocked(apiClient.request);

describe('Flow 2 API Client — Transport Specialist', () => {
  const tripId = 'TRIP_001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('F2-J01: calls getCapabilities and returns capability config', async () => {
    const mockCaps = {
      version: '1.0.0',
      role: 'TRANSPORT_SPECIALIST',
      insuranceSupported: true,
      clearanceSupported: true,
      docsReadyGate: 'GATE_1',
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: mockCaps },
    });

    const result = await flow2Api.getCapabilities();
    expect(result.role).toBe('TRANSPORT_SPECIALIST');
    expect(result.insuranceSupported).toBe(true);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/master/flow2-capabilities',
      })
    );
  });

  it('F2-J02: calls getTrips and returns SpecTrip list', async () => {
    const mockTrips = [
      {
        id: 'TRIP_001',
        requestId: 'REQ_001',
        customerName: 'Nguyễn Văn A',
        origin: 'Hà Nội',
        destination: 'TP. Hồ Chí Minh',
        originCountry: 'VN',
        destCountry: 'VN',
        mode: 'ROAD',
        status: 'PLANNING',
        deployment: 'CONFIRMED',
        plannedDepart: '2026-11-10T08:00:00Z',
        eta: '2026-11-11T18:00:00Z',
        horses: [
          {
            id: 'H1',
            name: 'Red Rum',
            microchip: '985141001234567',
            passportNo: 'VN-2024-001',
          },
        ],
        checkpoints: [
          {
            name: 'Trạm kiểm dịch Đắk Lắk',
            type: 'QUARANTINE_STATION',
            country: 'VN',
            plannedAt: '2026-11-10T14:00:00Z',
            arrivedAt: null,
          },
        ],
        docsReady: null,
      },
    ];

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: mockTrips },
    });

    const result = await flow2Api.getTrips();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('TRIP_001');
    expect(result[0].mode).toBe('ROAD');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/specialist/trips',
      })
    );
  });

  it('F2-J11: calls getTripDetail with tripId', async () => {
    const mockDetail = {
      id: 'TRIP_001',
      requestId: 'REQ_001',
      customerName: 'Nguyễn Văn A',
      origin: 'Hà Nội',
      destination: 'TP. Hồ Chí Minh',
      originCountry: 'VN',
      destCountry: 'VN',
      mode: 'ROAD',
      status: 'READY_TO_DEPART',
      deployment: 'CONFIRMED',
      plannedDepart: '2026-11-10T08:00:00Z',
      eta: '2026-11-11T18:00:00Z',
      horses: [
        {
          id: 'H1',
          name: 'Red Rum',
          microchip: '985141001234567',
          passportNo: 'VN-2024-001',
        },
      ],
      checkpoints: [],
      docsReady: {
        at: '2026-11-09T17:00:00Z',
        by: 'USER_005',
      },
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: mockDetail },
    });

    const result = await flow2Api.getTripDetail(tripId);
    expect(result.id).toBe('TRIP_001');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: `/specialist/trips/${tripId}`,
      })
    );
  });

  it('F2-J15: reviews customer document (APPROVED/REJECTED)', async () => {
    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'Duyệt giấy tờ khách hàng thành công', data: null },
    });

    await flow2Api.reviewCustomerDoc(tripId, {
      key: 'passport',
      scope: 'HORSE_001',
      decision: 'APPROVED',
      reason: 'Hồ sơ đạt tiêu chuẩn',
    });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: `/specialist/trips/${tripId}/customer-documents/review`,
        data: {
          key: 'passport',
          scope: 'HORSE_001',
          decision: 'APPROVED',
          reason: 'Hồ sơ đạt tiêu chuẩn',
        },
      })
    );
  });

  it('F2-J24 & F2-J25: saves and verifies insurance', async () => {
    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'Lưu thông tin bảo hiểm thành công', data: null },
    });

    await flow2Api.saveInsurance(tripId, {
      insurer: 'Bảo Việt Insurance',
      policy: 'BV-HORSE-2026-8888',
      validFrom: '2026-11-01',
      validTo: '2026-11-30',
      coverage: 500000000,
    });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PUT',
        url: `/specialist/trips/${tripId}/insurance`,
        data: expect.objectContaining({
          insurer: 'Bảo Việt Insurance',
          policy: 'BV-HORSE-2026-8888',
        }),
      })
    );

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'Xác minh bảo hiểm thành công', data: null },
    });

    await flow2Api.verifyInsurance(tripId);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: `/specialist/trips/${tripId}/insurance/verify`,
      })
    );
  });

  it('F2-J28: confirms Docs READY for trip departure gate', async () => {
    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'Đã xác nhận hồ sơ đầy đủ (Docs READY)', data: null },
    });

    await flow2Api.confirmDocsReady(tripId);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: `/specialist/trips/${tripId}/docs-ready`,
      })
    );
  });

  it('F2-J17: records checkpoint clearance result', async () => {
    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'Ghi nhận thông quan trạm thành công', data: null },
    });

    await flow2Api.recordClearance(tripId, {
      checkpointIndex: 0,
      result: 'PASSED',
      ref: 'CLR-TSN-2026-001',
      by: 'USER_005',
    });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: `/specialist/trips/${tripId}/clearances`,
        data: expect.objectContaining({
          checkpointIndex: 0,
          result: 'PASSED',
        }),
      })
    );
  });

  it('prevents concurrent duplicate mutations with request lock', async () => {
    let resolver: (val: unknown) => void = () => {};
    mockRequest.mockReturnValueOnce(new Promise(res => { resolver = res; }));

    const p1 = flow2Api.confirmDocsReady(tripId);
    const p2 = flow2Api.confirmDocsReady(tripId);

    await expect(p2).rejects.toMatchObject({ errorCode: 'REQUEST_IN_PROGRESS' });

    resolver({
      status: 200,
      data: {
        success: true,
        message: 'OK',
        data: null,
      },
    });
    await p1;
  });

  it('handles server contract error envelope properly', async () => {
    mockRequest.mockResolvedValueOnce({
      status: 400,
      data: {
        success: false,
        errorCode: 'INSURANCE_NOT_VERIFIED',
        message: 'Bảo hiểm chuyến đi chưa được xác minh.',
        data: null,
      },
    });

    await expect(
      flow2Api.confirmDocsReady(tripId)
    ).rejects.toMatchObject({
      errorCode: 'INSURANCE_NOT_VERIFIED',
      message: 'Bảo hiểm chuyến đi chưa được xác minh.',
      status: 400,
    });
  });
});
