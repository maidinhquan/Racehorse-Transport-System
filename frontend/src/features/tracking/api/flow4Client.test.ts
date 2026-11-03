import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flow4Api } from './flow4Api';
import { Flow4ApiError } from './flow4Client';
import { apiClient } from '../../../shared/api/apiClient';

vi.mock('../../../shared/api/apiClient', () => ({
  apiClient: {
    request: vi.fn(),
  },
}));

const mockRequest = vi.mocked(apiClient.request);

describe('Flow 4 API Client', () => {
  const tripId = 'TRIP_001';
  const requestId = 'REQUEST_001';
  const idempotencyKey = '1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('F4-J01: calls getCapabilities and returns data', async () => {
    const mockData = {
      version: '1.1.0',
      implementationStatus: 'DESIGNED_NOT_IMPLEMENTED',
      persistenceAvailable: false,
      filesAvailable: false,
      notificationsAvailable: false,
      incidentIntegrationAvailable: false,
      gpsRealtime: false,
      timezone: 'Asia/Ho_Chi_Minh',
      policy: {
        version: 1,
        lateMilestoneMinutes: null,
        healthIntervalMinutes: null,
        minimumHealthPhotos: null,
        configured: false,
        note: 'Chưa chốt ngưỡng',
      },
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: mockData },
    });

    const result = await flow4Api.getCapabilities();
    expect(result.version).toBe('1.1.0');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'get',
        url: '/master/flow4-capabilities',
      }),
    );
  });

  it('F4-J03: validates path parameters', async () => {
    await expect(flow4Api.getTracking('invalid-trip-id')).rejects.toThrow(Flow4ApiError);
  });

  it('F4-J05: requires valid Idempotency-Key header on mutations', async () => {
    const body = {
      expectedVersion: 10,
      approvedPlanVersion: 1,
      assignmentVersion: 1,
      occurredAt: '2026-11-10 06:00',
      acknowledgements: ['HORSES_CHECKED' as const, 'VEHICLE_VERIFIED' as const],
      note: 'Xuất phát đúng giờ',
      evidenceFileIds: ['EVIDENCE_001'],
    };

    await expect(flow4Api.confirmDeparture(tripId, body, 'invalid-uuid')).rejects.toMatchObject({
      errorCode: 'CONTRACT_VALIDATION_ERROR',
    });
  });

  it('F4-J06: sends valid milestone completion with Idempotency-Key', async () => {
    const body = {
      expectedVersion: 10,
      occurredAt: '2026-11-10 08:30',
      note: 'Đến điểm dừng chân',
      evidenceFileIds: ['EVIDENCE_001'],
    };

    const mockMutation = {
      binding: { executionVersion: 11, approvedPlanVersion: 1, assignmentVersion: 1 },
      recordId: 'MILESTONE_001',
      trip: {
        tripId,
        requestId,
        mode: 'ROAD',
        tripStatus: 'IN_TRANSIT',
        requestStatus: 'IN_PROGRESS',
        phase: 'IN_PROGRESS',
        lastMilestoneId: 'MILESTONE_001',
        eta: { currentEta: '2026-11-10 18:00', deliveryDeadline: '2026-11-11 18:00', pendingProposalId: null, proposedEta: null, version: 1 },
      },
      blockers: [],
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: mockMutation },
    });

    const result = await flow4Api.completeMilestone(tripId, 'MILESTONE_001', body, idempotencyKey);
    expect(result.trip.tripStatus).toBe('IN_TRANSIT');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: `/driver/trips/${tripId}/milestones/MILESTONE_001/complete`,
        headers: expect.objectContaining({ 'Idempotency-Key': idempotencyKey }),
      }),
    );
  });

  it('F4-J30: rejects file upload without valid file', async () => {
    const invalidFile = new File(['hello'], 'doc.txt', { type: 'text/plain' });
    await expect(
      flow4Api.uploadExecutionFile(tripId, invalidFile, { purpose: 'MILESTONE' }, idempotencyKey),
    ).rejects.toMatchObject({ errorCode: 'INVALID_FILE' });
  });

  it('F4-J31: downloads execution file as Blob', async () => {
    const mockBlob = new Blob(['content'], { type: 'image/jpeg' });
    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: mockBlob,
    });

    const result = await flow4Api.downloadExecutionFile(tripId, 'EVIDENCE_001');
    expect(result).toBe(mockBlob);
  });

  it('handles server contract error envelope properly', async () => {
    mockRequest.mockResolvedValueOnce({
      status: 409,
      data: {
        success: false,
        message: 'Phiên bản không khớp, hãy tải lại',
        errorCode: 'STALE_VERSION',
        data: null,
        blockers: [{ code: 'STALE_VERSION', field: 'execution', message: 'Tải lại' }],
      },
    });

    await expect(
      flow4Api.acknowledgeAlert(tripId, 'ALERT_001', { expectedVersion: 1 }, idempotencyKey),
    ).rejects.toMatchObject({
      errorCode: 'STALE_VERSION',
      status: 409,
    });
  });

  it('prevents concurrent duplicate mutations with request lock', async () => {
    let resolver: (val: unknown) => void = () => {};
    mockRequest.mockReturnValueOnce(new Promise(res => { resolver = res; }));

    const body = { expectedVersion: 10 };
    const p1 = flow4Api.acknowledgeAlert(tripId, 'ALERT_001', body, idempotencyKey);
    const p2 = flow4Api.acknowledgeAlert(tripId, 'ALERT_001', body, idempotencyKey);

    await expect(p2).rejects.toMatchObject({ errorCode: 'REQUEST_IN_PROGRESS' });

    resolver({
      status: 200,
      data: {
        success: true,
        message: 'OK',
        data: {
          binding: { executionVersion: 11, approvedPlanVersion: 1, assignmentVersion: 1 },
          recordId: 'ALERT_001',
          trip: {
            tripId,
            requestId,
            mode: 'ROAD',
            tripStatus: 'IN_TRANSIT',
            requestStatus: 'IN_PROGRESS',
            phase: 'IN_PROGRESS',
            lastMilestoneId: null,
            eta: { currentEta: '2026-11-10 18:00', deliveryDeadline: '2026-11-11 18:00', pendingProposalId: null, proposedEta: null, version: 1 },
          },
          blockers: [],
        },
      },
    });
    await p1;
  });
});

