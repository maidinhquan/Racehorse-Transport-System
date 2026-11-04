import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flow5Api } from './flow5Api';
import { apiClient } from '../../../shared/api/apiClient';

vi.mock('../../../shared/api/apiClient', () => ({
  apiClient: {
    request: vi.fn(),
  },
}));

const mockRequest = vi.mocked(apiClient.request);

describe('Flow 5 API Client — Incident Management & Recovery (FLOW5_capnhat.md)', () => {
  const incidentId = 'INC_20261103_AB12CD';
  const tripId = 'TRIP_001';
  const idempotencyKey = '1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('F5-J01: calls getCapabilities and returns capability config', async () => {
    const mockData = {
      version: '1.0.0',
      implementationStatus: 'AVAILABLE',
      persistenceAvailable: true,
      filesAvailable: true,
      notificationsAvailable: true,
      recoveryApplyAvailable: true,
      terminationSettlementAvailable: true,
      currency: 'VND',
      timezone: 'Asia/Ho_Chi_Minh',
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: mockData },
    });

    const result = await flow5Api.getCapabilities();
    expect(result.version).toBe('1.0.0');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/master/flow5-capabilities',
      }),
    );
  });

  it('F5-J03: reports incident via POST /incidents with ReportIncidentInput', async () => {
    const input = {
      tripId,
      category: 'VEHICLE_RESOURCE' as const,
      description: 'Nổ lốp xe trên cao tốc, đã tấp vào làn khẩn cấp',
      immediateCare: 'Đã kiểm tra ngựa trong thùng xe an toàn và bật đèn ưu tiên',
      locationCoordinates: '10.7769,106.7009',
      imageUrl: '/uploads/incidents/img_001.jpg',
      occurredAt: '2026-11-03T10:00:00Z',
    };

    const mockResponseDto = {
      incidentId,
      tripId,
      category: 'VEHICLE_RESOURCE',
      status: 'REPORTED',
      description: input.description,
      locationCoordinates: input.locationCoordinates,
      imageUrl: input.imageUrl,
      coordinatorId: 'USER_COORD_001',
      reportedByUserId: 'USER_DRIVER_001',
      reportedByUserName: 'Nguyễn Văn Hùng',
      reportedAt: '2026-11-03T10:00:00Z',
      safetyBlockerActive: true,
    };

    mockRequest.mockResolvedValueOnce({
      status: 201,
      data: {
        success: true,
        message: 'Báo cáo sự cố thành công và đã thông báo tới Điều phối viên',
        data: mockResponseDto,
      },
    });

    const result = await flow5Api.reportIncident(input, idempotencyKey);
    expect(result.incidentId).toBe(incidentId);
    expect(result.safetyBlockerActive).toBe(true);
    expect(result.status).toBe('REPORTED');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/incidents',
        data: input,
        headers: expect.objectContaining({ 'Idempotency-Key': idempotencyKey }),
      }),
    );
  });

  it('F5-J44: reports trip incident via POST /driver/trips/{tripId}/incidents', async () => {
    const input = {
      category: 'HORSE_HEALTH' as const,
      description: 'Ngựa Red Rum có dấu hiệu sốt và nhịp thở nhanh',
      immediateCare: 'Đã dừng xe cho uống nước điện giải và đo thân nhiệt 39.2C',
      locationCoordinates: 'Km 120 Quốc lộ 1A',
    };

    const mockResponseDto = {
      incidentId: 'INC_20261103_HEALTH',
      tripId,
      category: 'HORSE_HEALTH',
      status: 'REPORTED',
      description: input.description,
      locationCoordinates: input.locationCoordinates,
      imageUrl: null,
      coordinatorId: 'USER_COORD_001',
      reportedByUserId: 'USER_DRIVER_001',
      reportedByUserName: 'Nguyễn Văn Hùng',
      reportedAt: '2026-11-03T11:00:00Z',
      safetyBlockerActive: true,
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        message: 'Báo cáo sự cố thành công và đã thông báo tới Điều phối viên',
        data: mockResponseDto,
      },
    });

    const result = await flow5Api.reportTripIncident(tripId, input);
    expect(result.incidentId).toBe('INC_20261103_HEALTH');
    expect(result.safetyBlockerActive).toBe(true);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: `/driver/trips/${tripId}/incidents`,
        data: input,
      }),
    );
  });

  it('F5-J02: queries incidents list with filters (tripId, status)', async () => {
    const mockList = [
      {
        incidentId,
        tripId,
        category: 'VEHICLE_RESOURCE',
        status: 'REPORTED',
        description: 'Nổ lốp xe',
        locationCoordinates: '10.7769,106.7009',
        imageUrl: null,
        coordinatorId: 'USER_COORD_001',
        reportedByUserId: 'USER_DRIVER_001',
        reportedByUserName: 'Nguyễn Văn Hùng',
        reportedAt: '2026-11-03T10:00:00Z',
        safetyBlockerActive: true,
      },
    ];

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: mockList },
    });

    const result = await flow5Api.getIncidents({ tripId, status: 'REPORTED' });
    expect(result).toHaveLength(1);
    expect(result[0].incidentId).toBe(incidentId);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/incidents',
        params: { tripId, status: 'REPORTED' },
      }),
    );
  });

  it('F5-J04: gets incident detail by incidentId', async () => {
    const mockDetail = {
      incidentId,
      tripId,
      category: 'VEHICLE_RESOURCE',
      status: 'REPORTED',
      description: 'Nổ lốp xe',
      locationCoordinates: '10.7769,106.7009',
      imageUrl: null,
      coordinatorId: 'USER_COORD_001',
      reportedByUserId: 'USER_DRIVER_001',
      reportedByUserName: 'Nguyễn Văn Hùng',
      reportedAt: '2026-11-03T10:00:00Z',
      safetyBlockerActive: true,
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: mockDetail },
    });

    const result = await flow5Api.getIncidentDetail(incidentId);
    expect(result.incidentId).toBe(incidentId);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: `/incidents/${incidentId}`,
      }),
    );
  });

  it('F5-J05: gets trip incidents by tripId', async () => {
    const mockList = [
      {
        incidentId,
        tripId,
        category: 'VEHICLE_RESOURCE',
        status: 'REPORTED',
        description: 'Nổ lốp xe',
        locationCoordinates: null,
        imageUrl: null,
        coordinatorId: 'USER_COORD_001',
        reportedByUserId: 'USER_DRIVER_001',
        reportedByUserName: 'Nguyễn Văn Hùng',
        reportedAt: '2026-11-03T10:00:00Z',
        safetyBlockerActive: true,
      },
    ];

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: mockList },
    });

    const result = await flow5Api.getTripIncidents(tripId);
    expect(result).toHaveLength(1);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: `/trips/${tripId}/incidents`,
      }),
    );
  });

  it('F5-J06: coordinator accepts incident and transitions status to IN_PROGRESS', async () => {
    const mockAccepted = {
      incidentId,
      tripId,
      category: 'VEHICLE_RESOURCE',
      status: 'IN_PROGRESS',
      description: 'Nổ lốp xe',
      locationCoordinates: null,
      imageUrl: null,
      coordinatorId: 'USER_COORD_001',
      reportedByUserId: 'USER_DRIVER_001',
      reportedByUserName: 'Nguyễn Văn Hùng',
      reportedAt: '2026-11-03T10:00:00Z',
      safetyBlockerActive: true,
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        message: 'Điều phối viên đã tiếp nhận sự cố thành công',
        data: mockAccepted,
      },
    });

    const result = await flow5Api.acceptIncident(incidentId);
    expect(result.status).toBe('IN_PROGRESS');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: `/coordinator/incidents/${incidentId}/accept`,
      }),
    );
  });

  it('prevents concurrent duplicate mutations with request lock', async () => {
    let resolver: (val: unknown) => void = () => {};
    mockRequest.mockReturnValueOnce(new Promise(res => { resolver = res; }));

    const p1 = flow5Api.acceptIncident(incidentId);
    const p2 = flow5Api.acceptIncident(incidentId);

    await expect(p2).rejects.toMatchObject({ errorCode: 'REQUEST_IN_PROGRESS' });

    resolver({
      status: 200,
      data: {
        success: true,
        message: 'OK',
        data: {
          incidentId,
          tripId,
          category: 'VEHICLE_RESOURCE',
          status: 'IN_PROGRESS',
          reportedAt: '2026-11-03T10:00:00Z',
          safetyBlockerActive: true,
        },
      },
    });
    await p1;
  });

  it('handles server contract error envelope properly', async () => {
    mockRequest.mockResolvedValueOnce({
      status: 404,
      data: {
        success: false,
        message: 'Không tìm thấy sự cố.',
        errorCode: 'INCIDENT_NOT_FOUND',
        data: null,
      },
    });

    await expect(flow5Api.getIncidentDetail('INC_NOT_EXIST')).rejects.toMatchObject({
      errorCode: 'INCIDENT_NOT_FOUND',
      status: 404,
    });
  });
});
