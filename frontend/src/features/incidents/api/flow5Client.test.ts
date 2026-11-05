import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flow5Api } from './flow5Api';
import { apiClient } from '../../../shared/api/apiClient';

vi.mock('../../../shared/api/apiClient', () => ({
  apiClient: {
    request: vi.fn(),
  },
}));

const mockRequest = vi.mocked(apiClient.request);

describe('Flow 5 API Client — Incidents & Recovery (Full 43 Endpoints)', () => {
  const incidentId = 'INC_20261104_AB12CD';
  const tripId = 'TRIP_001';
  const requestId = 'REQ_001';
  const idempotencyKey = '1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Capabilities (F5-J01)
  it('F5-J01: calls getCapabilities and returns backend capability config', async () => {
    const mockData = {
      incidentCategories: ['VEHICLE_BREAKDOWN', 'DELAY_AIR', 'ROAD_CLOSURE', 'TRAFFIC_ACCIDENT', 'HORSE_HEALTH', 'DOCUMENT_CUSTOMS_HOLD', 'OTHER'],
      resolutionTypes: ['RESOLVED_CONTINUE_CURRENT', 'RESOLVED_REPLACED_VEHICLE', 'RESOLVED_REROUTED', 'RESOLVED_CHARTER_FLIGHT', 'TERMINATED_EARLY'],
      taskTypes: ['TECHNICAL_REPAIR', 'VETERINARY_CHECK', 'ROUTE_SURVEY', 'CUSTOMS_LIAISON', 'CUSTOMER_CARE', 'CHARTER_BOOKING'],
      impactScopes: ['VEHICLE', 'SCHEDULE', 'FLIGHT', 'PAPERWORK', 'INSURANCE', 'HORSE_HEALTH', 'DEADLINE', 'EXTRA_COST'],
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: mockData },
    });

    const result = await flow5Api.getCapabilities();
    expect(result.incidentCategories).toContain('VEHICLE_BREAKDOWN');
    expect(result.resolutionTypes).toContain('RESOLVED_CONTINUE_CURRENT');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/master/flow5-capabilities',
      }),
    );
  });

  // 2. Incident Reporting (F5-J03, F5-J44)
  it('F5-J03: reports incident via POST /incidents with ReportIncidentInput', async () => {
    const input = {
      tripId,
      category: 'VEHICLE_BREAKDOWN',
      description: 'Nổ lốp xe trên cao tốc, đã tấp vào làn khẩn cấp',
      immediateCare: 'Đã kiểm tra ngựa trong thùng xe an toàn và bật đèn ưu tiên',
      locationCoordinates: '10.7769,106.7009',
      imageUrl: 'https://example.com/incidents/img_001.jpg',
      occurredAt: '2026-11-04T10:00:00Z',
    };

    const mockResponseDto = {
      incidentId,
      tripId,
      category: 'VEHICLE_BREAKDOWN',
      status: 'REPORTED',
      description: input.description,
      locationCoordinates: input.locationCoordinates,
      imageUrl: input.imageUrl,
      coordinatorId: 'USER_COORD_001',
      reportedByUserId: 'USER_DRIVER_001',
      reportedByUserName: 'Nguyễn Văn Hùng',
      reportedAt: '2026-11-04T10:00:00Z',
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
      category: 'HORSE_HEALTH',
      description: 'Ngựa có dấu hiệu sốt nhẹ và bồn chồn',
      immediateCare: 'Đã bổ sung nước điện giải và bật quạt làm mát',
    };

    const mockResponseDto = {
      incidentId: 'INC_20261104_VET01',
      tripId,
      category: 'HORSE_HEALTH',
      status: 'REPORTED',
      description: input.description,
      locationCoordinates: null,
      imageUrl: null,
      coordinatorId: 'USER_COORD_001',
      reportedByUserId: 'USER_DRIVER_001',
      reportedByUserName: 'Nguyễn Văn Hùng',
      reportedAt: '2026-11-04T10:30:00Z',
      safetyBlockerActive: true,
    };

    mockRequest.mockResolvedValueOnce({
      status: 201,
      data: { success: true, message: 'Báo cáo sự cố theo chuyến thành công', data: mockResponseDto },
    });

    const result = await flow5Api.reportTripIncident(tripId, input, idempotencyKey);
    expect(result.incidentId).toBe('INC_20261104_VET01');
    expect(result.safetyBlockerActive).toBe(true);
  });

  // 3. Query & Details (F5-J02, F5-J04, F5-J05)
  it('F5-J02 & F5-J04 & F5-J05: queries incidents and gets details', async () => {
    const mockList = [
      {
        incidentId,
        tripId,
        category: 'VEHICLE_BREAKDOWN',
        status: 'REPORTED',
        reportedAt: '2026-11-04T10:00:00Z',
        safetyBlockerActive: true,
      },
    ];

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: mockList },
    });

    const list = await flow5Api.getIncidents({ status: 'REPORTED', tripId });
    expect(list).toHaveLength(1);
    expect(list[0].incidentId).toBe(incidentId);

    // Detail F5-J04
    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: mockList[0] },
    });
    const detail = await flow5Api.getIncidentDetail(incidentId);
    expect(detail.incidentId).toBe(incidentId);

    // Trip Incidents F5-J05
    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: mockList },
    });
    const tripIncidents = await flow5Api.getTripIncidents(tripId);
    expect(tripIncidents).toHaveLength(1);
  });

  // 4. Coordinator Accept (F5-J06)
  it('F5-J06: coordinator accepts incident and status changes to IN_PROGRESS', async () => {
    const acceptedDto = {
      incidentId,
      tripId,
      category: 'VEHICLE_BREAKDOWN',
      status: 'IN_PROGRESS',
      coordinatorId: 'USER_COORD_006',
      reportedAt: '2026-11-04T10:00:00Z',
      safetyBlockerActive: true,
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        message: 'Điều phối viên đã tiếp nhận sự cố thành công',
        data: acceptedDto,
      },
    });

    const result = await flow5Api.acceptIncident(incidentId);
    expect(result.status).toBe('IN_PROGRESS');
    expect(result.coordinatorId).toBe('USER_COORD_006');
  });

  // 5. Impact Assessment (F5-J07)
  it('F5-J07: assesses 8 impact scopes', async () => {
    const assessmentInput = {
      affectedVehicle: true,
      affectedSchedule: true,
      affectedFlight: false,
      affectedPaperwork: false,
      affectedInsurance: false,
      affectedHorseHealth: false,
      affectedDeadlines: true,
      estimatedExtraCost: 1500000,
      summary: 'Hỏng lốp xe kéo dài trễ 2 tiếng so với lịch hẹn',
    };

    const assessmentResult = {
      incidentId,
      ...assessmentInput,
      assessedByUserId: 'USER_COORD_006',
      assessedAt: '2026-11-04T10:15:00Z',
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: assessmentResult },
    });

    const result = await flow5Api.saveImpactAssessment(incidentId, assessmentInput);
    expect(result.affectedVehicle).toBe(true);
    expect(result.estimatedExtraCost).toBe(1500000);
    expect(result.assessedByUserId).toBe('USER_COORD_006');
  });

  // 6. Field Updates & Logs (F5-J08, F5-J09)
  it('F5-J08 & F5-J09: adds and retrieves field updates', async () => {
    const updateInput = {
      updateType: 'FIELD_LOG',
      notes: 'Xe cứu hộ đã đến hiện trường, đang tiến hành thay bánh dự phòng',
      locationCoordinates: '10.7769,106.7009',
    };

    const updateDto = {
      updateId: 'UPD_001',
      incidentId,
      updateType: 'FIELD_LOG',
      notes: updateInput.notes,
      locationCoordinates: updateInput.locationCoordinates,
      createdByUserId: 'USER_DRIVER_001',
      createdByUserName: 'Nguyễn Văn Hùng',
      createdAt: '2026-11-04T10:25:00Z',
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'Đã ghi nhận diễn biến sự cố mới', data: updateDto },
    });

    const created = await flow5Api.addIncidentUpdate(incidentId, updateInput);
    expect(created.updateId).toBe('UPD_001');

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: [updateDto] },
    });

    const list = await flow5Api.getIncidentUpdates(incidentId);
    expect(list).toHaveLength(1);
    expect(list[0].notes).toContain('Xe cứu hộ');
  });

  // 7. Tasks (F5-J10 - F5-J12)
  it('F5-J10 & F5-J12: assigns task and updates progress', async () => {
    const taskInput = {
      title: 'Thay lốp xe khẩn cấp',
      taskType: 'TECHNICAL_REPAIR',
      assignedToUserId: 'USER_DRIVER_001',
      priority: 'HIGH',
      notes: 'Liên hệ cứu hộ cao tốc',
    };

    const taskDto = {
      taskId: 'TASK_001',
      incidentId,
      title: taskInput.title,
      taskType: taskInput.taskType,
      assignedToUserId: taskInput.assignedToUserId,
      priority: 'HIGH',
      status: 'PENDING',
      createdAt: '2026-11-04T10:10:00Z',
    };

    mockRequest.mockResolvedValueOnce({
      status: 201,
      data: { success: true, message: 'Đã phân công nhiệm vụ', data: taskDto },
    });

    const task = await flow5Api.createTask(incidentId, taskInput);
    expect(task.taskId).toBe('TASK_001');

    // Progress F5-J12
    const progressInput = {
      status: 'COMPLETED',
      notes: 'Đã thay xong lốp xe dự phòng đạt tiêu chuẩn an toàn',
      completionProofUrl: 'https://example.com/proof_001.jpg',
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        message: 'Cập nhật tiến độ nhiệm vụ thành công',
        data: { ...taskDto, status: 'COMPLETED', completedAt: '2026-11-04T10:45:00Z' },
      },
    });

    const updatedTask = await flow5Api.updateTaskProgress(incidentId, 'TASK_001', progressInput);
    expect(updatedTask.status).toBe('COMPLETED');
  });

  // 8. Recovery Plan Lifecycle (F5-J13 - F5-J17, F5-J24)
  it('F5-J13 -> F5-J24: manages recovery context, draft, validate, submit, decision, and apply', async () => {
    // F5-J13 Context
    const contextDto = {
      incidentId,
      tripId,
      currentLocation: 'Cao tốc Long Thành - Dầu Giây Km 25',
      destinationLocation: 'Trang trại Đua ngựa Long Thành',
      safetyBlockerActive: true,
      impactedLegs: ['LEG_001'],
      pendingTasks: [],
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: contextDto },
    });
    const ctx = await flow5Api.getRecoveryContext(incidentId);
    expect(ctx.incidentId).toBe(incidentId);

    // F5-J14 Draft
    const recoveryInput = {
      planType: 'REPLACE_VEHICLE',
      summary: 'Điều động xe dự phòng VEH_RESERVE_01 đón ngựa và tiếp tục hành trình',
      newVehicleId: 'VEH_RESERVE_01',
      newDriverUserId: 'USR_DRIVER_02',
      estimatedDelayHours: 1.5,
      costEstimate: 2000000,
    };

    const planDto = {
      planId: 'PLAN_001',
      incidentId,
      version: 1,
      planType: recoveryInput.planType,
      summary: recoveryInput.summary,
      estimatedDelayHours: 1.5,
      costEstimate: 2000000,
      status: 'DRAFT',
      createdByUserId: 'USER_COORD_006',
      createdAt: '2026-11-04T10:30:00Z',
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'Đã lưu nháp', data: planDto },
    });
    const draft = await flow5Api.saveRecoveryDraft(incidentId, recoveryInput);
    expect(draft.planId).toBe('PLAN_001');

    // F5-J15 Validate
    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        message: 'OK',
        data: {
          isValid: true,
          validationErrors: [],
          warnings: [],
          resourceAvailable: true,
          safetyStandardMet: true,
        },
      },
    });
    const valid = await flow5Api.validateRecoveryPlan(incidentId, recoveryInput);
    expect(valid.isValid).toBe(true);

    // F5-J16 Submit
    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        message: 'Phương án khôi phục đã được trình lên Quản lý',
        data: { ...planDto, status: 'SUBMITTED' },
      },
    });
    const submitted = await flow5Api.submitRecoveryPlan(incidentId, recoveryInput);
    expect(submitted.status).toBe('SUBMITTED');

    // F5-J17 Manager Decision
    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        message: 'Quản lý đã ra quyết định: APPROVED',
        data: { ...planDto, status: 'APPROVED', managerDecision: 'APPROVED', decidedAt: '2026-11-04T10:40:00Z' },
      },
    });
    const approved = await flow5Api.decideRecoveryPlan(incidentId, { decision: 'APPROVED' });
    expect(approved.status).toBe('APPROVED');

    // F5-J24 Apply
    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        message: 'Phương án khôi phục đã được áp dụng vào lộ trình thực tế',
        data: {
          incidentId,
          appliedPlanId: 'PLAN_001',
          appliedSuccessfully: true,
          message: 'Thành công',
          appliedAt: '2026-11-04T10:45:00Z',
        },
      },
    });
    const applied = await flow5Api.applyRecoveryPlan(incidentId);
    expect(applied.appliedSuccessfully).toBe(true);
  });

  // 9. Continuation Readiness & Continue Trip (F5-J25, F5-J26)
  it('F5-J25 & F5-J26: checks readiness and continues trip (clearing SafetyBlocker)', async () => {
    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        message: 'OK',
        data: {
          incidentId,
          isReadyToContinue: true,
          vetCleared: true,
          complianceCleared: true,
          resourceReady: true,
          safetyBlockerCanBeRemoved: true,
          pendingBlockerReasons: [],
        },
      },
    });

    const readiness = await flow5Api.getContinuationReadiness(incidentId);
    expect(readiness.isReadyToContinue).toBe(true);

    // F5-J26 Continue
    const continuedDto = {
      incidentId,
      tripId,
      category: 'VEHICLE_BREAKDOWN',
      status: 'IN_TRANSIT',
      reportedAt: '2026-11-04T10:00:00Z',
      safetyBlockerActive: false,
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        message: 'Đã gỡ bỏ SafetyBlocker và cho phép xe tiếp tục hành trình',
        data: continuedDto,
      },
    });

    const continued = await flow5Api.continueTrip(incidentId, { notes: 'Xe và ngựa đều an toàn' });
    expect(continued.safetyBlockerActive).toBe(false);
    expect(continued.status).toBe('IN_TRANSIT');
  });

  // 10. Resolve Incident (F5-J27)
  it('F5-J27: resolves incident', async () => {
    const resolvedDto = {
      incidentId,
      tripId,
      category: 'VEHICLE_BREAKDOWN',
      status: 'RESOLVED',
      reportedAt: '2026-11-04T10:00:00Z',
      safetyBlockerActive: false,
    };

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        message: 'Sự cố đã được giải quyết và đóng lại thành công',
        data: resolvedDto,
      },
    });

    const result = await flow5Api.resolveIncident(incidentId, {
      resolutionType: 'RESOLVED_CONTINUE_CURRENT',
      notes: 'Đã hoàn tất thay bánh và tiếp tục giao ngựa đúng giờ',
      finalCost: 1500000,
    });
    expect(result.status).toBe('RESOLVED');
  });

  // 11. Customer Communications (F5-J29, F5-J31, F5-J32)
  it('F5-J29 & F5-J31 & F5-J32: manages customer communications and replies', async () => {
    // F5-J29 List
    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        message: 'OK',
        data: [
          {
            incidentId,
            requestId,
            title: 'Sự cố nổ lốp trên cao tốc',
            status: 'IN_PROGRESS',
            severity: 'MEDIUM',
            occurredAt: '2026-11-04T10:00:00Z',
            estimatedDelayNotice: 'Dự kiến chậm 1 giờ',
          },
        ],
      },
    });
    const customerIncidents = await flow5Api.getCustomerIncidents(requestId);
    expect(customerIncidents).toHaveLength(1);

    // F5-J31 Send communication
    const commInput = {
      title: 'Thông báo phương án điều động xe dự phòng',
      content: 'Do sự cố kỹ thuật, công ty điều xe dự phòng để đưa ngựa an toàn tới nơi',
      requiresCustomerApproval: true,
      proposedCostAdjustment: 0,
    };

    const commDto = {
      messageId: 'MSG_001',
      incidentId,
      title: commInput.title,
      content: commInput.content,
      requiresCustomerApproval: true,
      proposedCostAdjustment: 0,
      sentByUserId: 'USER_MANAGER_004',
      sentAt: '2026-11-04T10:35:00Z',
    };

    mockRequest.mockResolvedValueOnce({
      status: 201,
      data: { success: true, message: 'Đã gửi thông báo tới khách hàng', data: commDto },
    });
    const sent = await flow5Api.sendCustomerCommunication(incidentId, commInput);
    expect(sent.messageId).toBe('MSG_001');

    // F5-J32 Reply communication
    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        message: 'Đã gửi phản hồi của khách hàng thành công',
        data: { ...commDto, customerApproved: true, repliedAt: '2026-11-04T10:38:00Z' },
      },
    });
    const replied = await flow5Api.replyCustomerCommunication(requestId, incidentId, 'MSG_001', {
      approved: true,
      customerNotes: 'Đồng ý với phương án của công ty',
    });
    expect(replied.customerApproved).toBe(true);
  });

  // 12. File Upload & Retrieval (F5-J34, F5-J35)
  it('F5-J34 & F5-J35: uploads file metadata and retrieves evidence', async () => {
    const fileInput = {
      fileName: 'scene_tire_flat.jpg',
      fileUrl: 'https://blob.example.com/incidents/scene_tire_flat.jpg',
      fileType: 'SCENE_PHOTO',
      description: 'Ảnh hiện trường nổ lốp xe',
    };

    const fileDto = {
      fileId: 'FILE_001',
      incidentId,
      tripId,
      fileName: fileInput.fileName,
      fileUrl: fileInput.fileUrl,
      fileType: fileInput.fileType,
      isSharedWithCustomer: true,
      uploadedByUserId: 'USER_DRIVER_001',
      uploadedAt: '2026-11-04T10:05:00Z',
    };

    mockRequest.mockResolvedValueOnce({
      status: 201,
      data: { success: true, message: 'Tải lên tài liệu bằng chứng thành công', data: fileDto },
    });
    const uploaded = await flow5Api.uploadTripIncidentFile(tripId, fileInput, incidentId);
    expect(uploaded.fileId).toBe('FILE_001');

    // F5-J35
    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'OK', data: fileDto },
    });
    const retrieved = await flow5Api.getIncidentFile(incidentId, 'FILE_001');
    expect(retrieved.fileName).toBe('scene_tire_flat.jpg');
  });

  // 13. Concurrency Lock
  it('prevents concurrent duplicate mutations with request in-flight error', async () => {
    const acceptedDto = {
      incidentId,
      tripId,
      category: 'VEHICLE_BREAKDOWN',
      status: 'IN_PROGRESS',
      coordinatorId: 'USER_COORD_006',
      reportedAt: '2026-11-04T10:00:00Z',
      safetyBlockerActive: true,
    };

    mockRequest.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                status: 200,
                data: { success: true, message: 'OK', data: acceptedDto },
              }),
            50,
          ),
        ),
    );

    const p1 = flow5Api.acceptIncident(incidentId);
    await expect(flow5Api.acceptIncident(incidentId)).rejects.toMatchObject({
      errorCode: 'REQUEST_IN_PROGRESS',
    });
    await p1;
  });

  // 14. Server Error Envelope
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

    await expect(flow5Api.getIncidentDetail(incidentId)).rejects.toMatchObject({
      errorCode: 'INCIDENT_NOT_FOUND',
      status: 404,
    });
  });
});
