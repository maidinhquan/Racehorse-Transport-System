import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flow5Api } from './flow5Api';
import { Flow5ApiError } from './flow5Client';
import { apiClient } from '../../../shared/api/apiClient';

vi.mock('../../../shared/api/apiClient', () => ({
  apiClient: {
    request: vi.fn(),
  },
}));

const mockRequest = vi.mocked(apiClient.request);

describe('Flow 5 API Client', () => {
  const incidentId = 'INCIDENT_001';
  const tripId = 'TRIP_001';
  const idempotencyKey = '1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('F5-J01: calls getCapabilities and returns data', async () => {
    const mockData = {
      version: '1.0.0',
      implementationStatus: 'DESIGNED_NOT_IMPLEMENTED',
      persistenceAvailable: false,
      filesAvailable: false,
      notificationsAvailable: false,
      recoveryApplyAvailable: false,
      terminationSettlementAvailable: false,
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
        method: 'get',
        url: '/master/flow5-capabilities',
      }),
    );
  });

  it('F5-J04: validates path parameters', async () => {
    await expect(flow5Api.getIncidentDetail('invalid-incident-id')).rejects.toThrow(Flow5ApiError);
  });

  it('F5-J03: reports an incident with Idempotency-Key header', async () => {
    const body = {
      tripId,
      expectedExecutionVersion: 11,
      category: 'VEHICLE_RESOURCE' as const,
      scope: {
        leg: 'road' as const,
        horseIds: ['HORSE_001'],
        milestoneIds: ['MILESTONE_002'],
      },
      occurredAt: '2026-11-10 08:00',
      description: 'Xe bị nổ lốp trên đường cao tốc',
      immediateCare: 'Tấp xe vào làn khẩn cấp, bật đèn cảnh báo và kiểm tra ngựa',
      evidenceFileIds: ['EVIDENCE_001'],
      healthLogIds: ['HEALTH_001'],
    };

    const mockMutation = {
      binding: { incidentVersion: 1, recoveryVersion: null, approvedPlanVersion: 1, executionVersion: 11, assignmentVersion: 1 },
      incident: {
        id: incidentId,
        tripId,
        requestId: 'REQUEST_001',
        category: 'VEHICLE_RESOURCE',
        status: 'REPORTED',
        scope: body.scope,
        description: body.description,
        occurredAt: body.occurredAt,
        reportedAt: '2026-11-10 08:05',
        reportedBy: { userId: 'USER_006', name: 'Phạm Hải', role: 'DRIVER_ESCORT', crewDuty: 'MAIN_DRIVER' },
        coordinatorId: 'USER_006',
        hasBlockingScope: true,
        resolutionOutcome: null,
        resolvedAt: null,
      },
      recordId: incidentId,
      blockers: [],
    };

    mockRequest.mockResolvedValueOnce({
      status: 201,
      data: { success: true, message: 'OK', data: mockMutation },
    });

    const result = await flow5Api.reportIncident(body, idempotencyKey);
    expect(result.incident.id).toBe(incidentId);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: '/incidents',
        headers: expect.objectContaining({ 'Idempotency-Key': idempotencyKey }),
      }),
    );
  });

  it('F5-J34: rejects file upload with unsupported file type', async () => {
    const invalidFile = new File(['code'], 'script.sh', { type: 'application/x-sh' });
    await expect(
      flow5Api.uploadIncidentFile(tripId, invalidFile, { purpose: 'INCIDENT_FIELD' }, idempotencyKey),
    ).rejects.toMatchObject({ errorCode: 'INVALID_FILE' });
  });

  it('F5-J35: downloads incident file as Blob', async () => {
    const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: mockBlob,
    });

    const result = await flow5Api.downloadIncidentFile(incidentId, 'FILE_001');
    expect(result).toBe(mockBlob);
  });

  it('handles server contract error envelope properly', async () => {
    mockRequest.mockResolvedValueOnce({
      status: 409,
      data: {
        success: false,
        message: 'Phương án chưa được duyệt',
        errorCode: 'RECOVERY_NOT_APPROVED',
        data: null,
        blockers: [{ code: 'RECOVERY_NOT_APPROVED', field: 'recovery', message: 'Chờ duyệt' }],
      },
    });

    const body = {
      expectedVersion: 1,
      recoveryVersion: 1,
      readinessVersion: 'CHECK_001',
      scope: { leg: 'road' as const, horseIds: ['HORSE_001'], milestoneIds: ['MILESTONE_002'] },
      reason: 'Đã chuẩn bị xe thay thế',
    };

    await expect(flow5Api.applyRecovery(incidentId, body, idempotencyKey)).rejects.toMatchObject({
      errorCode: 'RECOVERY_NOT_APPROVED',
      status: 409,
    });
  });

  it('prevents concurrent duplicate mutations with request lock', async () => {
    let resolver: (val: unknown) => void = () => {};
    mockRequest.mockReturnValueOnce(new Promise(res => { resolver = res; }));

    const body = { expectedVersion: 1, reason: 'Tiếp nhận xử lý sự cố' };
    const p1 = flow5Api.acceptIncident(incidentId, body, idempotencyKey);
    const p2 = flow5Api.acceptIncident(incidentId, body, idempotencyKey);

    await expect(p2).rejects.toMatchObject({ errorCode: 'REQUEST_IN_PROGRESS' });

    resolver({
      status: 200,
      data: {
        success: true,
        message: 'OK',
        data: {
          binding: { incidentVersion: 2, recoveryVersion: null, approvedPlanVersion: 1, executionVersion: 11, assignmentVersion: 1 },
          incident: {
            id: incidentId,
            tripId,
            requestId: 'REQUEST_001',
            category: 'VEHICLE_RESOURCE',
            status: 'IN_PROGRESS',
            scope: { leg: 'road', horseIds: ['HORSE_001'], milestoneIds: ['MILESTONE_002'] },
            description: 'Đang xử lý',
            occurredAt: '2026-11-10 08:00',
            reportedAt: '2026-11-10 08:05',
            reportedBy: { userId: 'USER_006', name: 'Phạm Hải', role: 'FLEET_ROUTE_COORDINATOR', crewDuty: null },
            coordinatorId: 'USER_006',
            hasBlockingScope: true,
            resolutionOutcome: null,
            resolvedAt: null,
          },
          recordId: incidentId,
          blockers: [],
        },
      },
    });
    await p1;
  });
});

