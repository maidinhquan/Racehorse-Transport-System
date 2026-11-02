import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flow6Api } from './flow6Api';
import { apiClient } from '../../../shared/api/apiClient';

vi.mock('../../../shared/api/apiClient', () => ({
  apiClient: {
    request: vi.fn(),
  },
}));

const mockRequest = vi.mocked(apiClient.request);

describe('Flow 6 API Client', () => {
  const tripId = 'TRIP_001';
  const revisionId = 'HANDOVER_REVISION_001';
  const invoiceId = 'INVOICE_001';
  const idempotencyKey = '3f9f71c4-118e-4a69-95a9-467389a9446d';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('F6-J01: calls getTrips and returns TripSummary array', async () => {
    const mockData = [
      {
        tripId: 'TRIP_001',
        requestId: 'REQUEST_001',
        status: 'IN_TRANSIT',
      },
    ];

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: mockData },
    });

    const result = await flow6Api.getTrips();
    expect(result).toHaveLength(1);
    expect(result[0].tripId).toBe('TRIP_001');
    expect(result[0].status).toBe('IN_TRANSIT');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/operations/flow6/trips',
      })
    );
  });

  it('F6-J02: calls getTripContext and returns valid Context', async () => {
    const mockContext = {
      tripId: 'TRIP_001',
      requestId: 'REQUEST_001',
      contractId: 'CONTRACT_001',
      contractVersionNo: 1,
      lifecycle: {
        tripStatus: 'IN_TRANSIT',
        requestStatus: 'IN_PROGRESS',
        contractStatus: 'EFFECTIVE',
      },
      pickupHandoverIds: [],
      horseIds: ['HORSE_001'],
      designatedReceiverName: 'Yuki Tanaka',
      designatedReceiverPhone: '+81312345678',
      deliveryId: null,
      warnings: [],
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: mockContext },
    });

    const result = await flow6Api.getTripContext(tripId);
    expect(result.tripId).toBe('TRIP_001');
    expect(result.lifecycle.requestStatus).toBe('IN_PROGRESS');
    expect(result.designatedReceiverName).toBe('Yuki Tanaka');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: `/operations/flow6/trips/${tripId}/context`,
      })
    );
  });

  it('F6-J07: sends OTP and validates idempotency key', async () => {
    const mockOtpState = {
      revisionId: 'HANDOVER_REVISION_001',
      expiresAtUtc: '2026-11-20T10:05:00Z',
      resendAfterUtc: '2026-11-20T10:01:00Z',
      attemptsRemaining: 5,
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: mockOtpState },
    });

    const result = await flow6Api.sendOtp(revisionId, idempotencyKey);
    expect(result.revisionId).toBe('HANDOVER_REVISION_001');
    expect(result.attemptsRemaining).toBe(5);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: `/operations/flow6/revisions/${revisionId}/otp`,
        headers: expect.objectContaining({ 'Idempotency-Key': idempotencyKey }),
      })
    );
  });

  it('F6-J09: confirms delivery revision with OTP and transitions lifecycle', async () => {
    const mockConfirmed = {
      revision: {
        id: 'HANDOVER_REVISION_001',
        handoverId: 'HANDOVER_001',
        number: 1,
        status: 'CONFIRMED',
        content: {
          location: 'Tokyo Racecourse',
          receiver: {
            name: 'Yuki Tanaka',
            phone: '+81312345678',
            authorized: true,
            otpEmail: 'receiver@example.com',
          },
          commonDocuments: null,
          items: [
            {
              horseId: 'HORSE_001',
              microchipVerified: true,
              condition: 'Tỉnh táo, không có vết thương mới.',
              assets: 'Một dây dắt',
              documents: null,
              documentsReceivedAtUtc: null,
              identity: {
                name: 'Thunderbolt',
                microchip: '985112004571029',
              },
            },
          ],
        },
        createdAtUtc: '2026-11-20T10:00:00Z',
        confirmedAtUtc: '2026-11-20T10:04:00Z',
        refusalReason: null,
        refusedAtUtc: null,
      },
      lifecycle: {
        tripStatus: 'COMPLETED',
        requestStatus: 'DELIVERED',
        contractStatus: 'EFFECTIVE',
      },
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: mockConfirmed },
    });

    const result = await flow6Api.confirmRevision(revisionId, { otp: '123456' }, idempotencyKey);
    expect(result.revision.status).toBe('CONFIRMED');
    expect(result.lifecycle.tripStatus).toBe('COMPLETED');
    expect(result.lifecycle.requestStatus).toBe('DELIVERED');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: `/operations/flow6/revisions/${revisionId}/confirm`,
        data: { otp: '123456' },
        headers: expect.objectContaining({ 'Idempotency-Key': idempotencyKey }),
      })
    );
  });

  it('F6-J24: creates VNPay payment session', async () => {
    const mockSession = {
      paymentId: 'PAYMENT_001',
      paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?example=1',
      expiresAtUtc: '2026-11-20T10:15:00Z',
    };

    mockRequest.mockResolvedValueOnce({
      status: 201,
      data: { success: true, message: 'OK', data: mockSession },
    });

    const result = await flow6Api.createPaymentSession(invoiceId, idempotencyKey);
    expect(result.paymentId).toBe('PAYMENT_001');
    expect(result.paymentUrl).toContain('sandbox.vnpayment.vn');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: `/customer/flow6/invoices/${invoiceId}/payment-session`,
      })
    );
  });

  it('F6-J45: downloads PDF as Blob', async () => {
    const mockBlob = new Blob(['%PDF-1.4 test content'], { type: 'application/pdf' });
    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: mockBlob,
    });

    const result = await flow6Api.downloadRevisionPdf(revisionId);
    expect(result).toBeInstanceOf(Blob);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: `/operations/flow6/revisions/${revisionId}/pdf`,
        responseType: 'blob',
      })
    );
  });

  it('rejects invalid Idempotency-Key format', async () => {
    await expect(
      flow6Api.sendOtp(revisionId, 'not-a-uuid')
    ).rejects.toMatchObject({
      errorCode: 'CONTRACT_VALIDATION_ERROR',
      message: 'Idempotency-Key phải đúng định dạng UUID v4.',
    });
  });

  it('prevents concurrent duplicate mutations with request lock', async () => {
    let resolver: (val: unknown) => void = () => {};
    mockRequest.mockReturnValueOnce(new Promise(res => { resolver = res; }));

    const p1 = flow6Api.sendOtp(revisionId, idempotencyKey);
    const p2 = flow6Api.sendOtp(revisionId, idempotencyKey);

    await expect(p2).rejects.toMatchObject({ errorCode: 'REQUEST_IN_PROGRESS' });

    resolver({
      status: 200,
      data: {
        success: true,
        message: 'OK',
        data: {
          revisionId: 'HANDOVER_REVISION_001',
          expiresAtUtc: '2026-11-20T10:05:00Z',
          resendAfterUtc: '2026-11-20T10:01:00Z',
          attemptsRemaining: 5,
        },
      },
    });
    await p1;
  });

  it('handles server contract error envelope properly', async () => {
    mockRequest.mockResolvedValueOnce({
      status: 409,
      data: {
        success: false,
        errorCode: 'OTP_EXPIRED',
        message: 'Mã OTP đã hết hạn.',
        data: null,
      },
    });

    await expect(
      flow6Api.confirmRevision(revisionId, { otp: '123456' }, idempotencyKey)
    ).rejects.toMatchObject({
      errorCode: 'OTP_EXPIRED',
      message: 'Mã OTP đã hết hạn.',
      status: 409,
    });
  });
});
