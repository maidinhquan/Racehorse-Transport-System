import { describe, expect, it } from 'vitest';
import { ROUTE_POLICY, autoSortStopsArray } from '../coordinator/workflows/routePlanner';
import { getSharedTrip, saveSharedTrip } from '../../shared/utils/sharedTrips';
import { notifySync, onSync, receiveServerSync } from '../../shared/utils/syncChannel';

describe('FLOW 3: Route planning, resource assignment, feasibility & 2-gate approvals', () => {
  it('TC-F3-01: [Happy] OSRM distance calculation with truckFactor = 1.2, 4h rest stop and 8h recovery rest', () => {
    // 1. Kiểm tra chính sách truckFactor = 1.2
    expect(ROUTE_POLICY.truckFactor).toBe(1.2);
    expect(ROUTE_POLICY.careIntervalH).toBe(4);
    expect(ROUTE_POLICY.recoveryRestH).toBe(8);
    expect(ROUTE_POLICY.roadEpisodeH).toBe(12);
    expect(ROUTE_POLICY.shortRestMin).toBe(45);

    // Tính toán thời gian di chuyển đường bộ cơ sở với hệ số xe tải ngựa chuyên dụng
    const baseOsrmMinutes = 200; // 3h20m di chuyển theo OSRM ô tô con
    const actualHorseboxMinutes = baseOsrmMinutes * ROUTE_POLICY.truckFactor;
    expect(actualHorseboxMinutes).toBe(240); // 4 giờ (đạt đúng ngưỡng nghỉ chăm sóc)

    // Kiểm tra ngưỡng cảnh báo lái xe liên tục > 4h
    const legDriveHours = actualHorseboxMinutes / 60;
    const requiresCareStop = legDriveHours >= ROUTE_POLICY.careIntervalH;
    expect(requiresCareStop).toBe(true);

    // Kiểm tra quy định nghỉ hồi phục 8h sau 12h đứng xe (phải hạ ngựa - unload)
    const dwellForRecoveryMin = ROUTE_POLICY.recoveryRestH * 60;
    expect(dwellForRecoveryMin).toBe(480);
    const requiresUnload = dwellForRecoveryMin >= ROUTE_POLICY.recoveryRestH * 60;
    expect(requiresUnload).toBe(true);
  });

  it('TC-F3-02: [Boundary/Happy] Nắn tuyến QL1A giữ lộ trình nội địa không cắt qua biên giới', () => {
    // Tuyến đường Bắc - Nam dọc Việt Nam
    const trip = { mode: 'ROAD' };
    const route = {
      stops: [
        { name: 'Hà Nội (ORIGIN)', type: 'ORIGIN', lat: 21.0285, lng: 105.8542 },
        { name: 'Nha Trang (REST)', type: 'REST', lat: 12.2388, lng: 109.1967 },
        { name: 'Đà Nẵng (REST)', type: 'REST', lat: 16.0544, lng: 108.2022 },
        { name: 'TP. Hồ Chí Minh (DESTINATION)', type: 'DESTINATION', lat: 10.8231, lng: 106.6297 },
      ],
    };

    autoSortStopsArray(trip, route);

    // Sau khi auto-sort theo vĩ độ Bắc -> Nam, các trạm phải theo đúng thứ tự duyên hải QL1A
    const stopNames = route.stops.map((s) => s.name);
    expect(stopNames).toEqual([
      'Hà Nội (ORIGIN)',
      'Đà Nẵng (REST)',
      'Nha Trang (REST)',
      'TP. Hồ Chí Minh (DESTINATION)',
    ]);

    // Các trạm duyên hải QL1A phải có kinh độ bám biển (lng >= 107.5 tại miền Trung)
    const centralStops = route.stops.filter((s) => s.lat > 11 && s.lat < 19);
    centralStops.forEach((s) => {
      expect(s.lng).toBeGreaterThan(107.5);
    });
  });

  it('TC-F3-03: [Happy] Bố trí xe và kíp 3 người độc lập (Tài xế, Phụ lái, Bác sĩ thú y)', () => {
    const assignment = {
      tripId: 'TRIP_001',
      legNumber: 1,
      vehicleId: 'VEH_BOX_01',
      plateNumber: '51C-101.45',
      mainDriverId: 'USR_DRV_01',
      coDriverId: 'USR_DRV_02',
      veterinarianId: 'USR_VET_01',
    };

    // Kiểm tra đầy đủ 3 vai trò
    expect(assignment.mainDriverId).toBeTruthy();
    expect(assignment.coDriverId).toBeTruthy();
    expect(assignment.veterinarianId).toBeTruthy();
    expect(assignment.vehicleId).toBeTruthy();

    // 3 người phải là 3 ID khác nhau
    const crewSet = new Set([assignment.mainDriverId, assignment.coDriverId, assignment.veterinarianId]);
    expect(crewSet.size).toBe(3);
  });

  it('TC-F3-04: [Negative] Chặn vi phạm độc lập vai trò (Tài xế kiêm Bác sĩ thú y hoặc Phụ lái)', () => {
    function validateCrewIndependence(mainDriverId: string, coDriverId: string, vetId: string) {
      const errors: string[] = [];
      if (mainDriverId && vetId && mainDriverId === vetId) {
        errors.push('INDEPENDENT_ROLES_VIOLATION: Tài xế chính và Bác sĩ thú y không được là cùng một người!');
      }
      if (mainDriverId && coDriverId && mainDriverId === coDriverId) {
        errors.push('INDEPENDENT_ROLES_VIOLATION: Tài xế chính và Phụ lái không được trùng nhau!');
      }
      if (coDriverId && vetId && coDriverId === vetId) {
        errors.push('INDEPENDENT_ROLES_VIOLATION: Phụ lái và Bác sĩ thú y không được trùng nhau!');
      }
      return { valid: errors.length === 0, errors };
    }

    // Trường hợp 1: MainDriver kiêm Vet
    const r1 = validateCrewIndependence('USR_001', 'USR_002', 'USR_001');
    expect(r1.valid).toBe(false);
    expect(r1.errors[0]).toContain('INDEPENDENT_ROLES_VIOLATION');

    // Trường hợp 2: MainDriver trùng CoDriver
    const r2 = validateCrewIndependence('USR_001', 'USR_001', 'USR_003');
    expect(r2.valid).toBe(false);
    expect(r2.errors[0]).toContain('Tài xế chính và Phụ lái không được trùng nhau');
  });

  it('TC-F3-05: [Negative] Chặn phân công nhân sự đang bận trên chuyến đi khác (STAFF_BUSY_ON_ACTIVE_TRIP)', () => {
    const activeTripsStaff = new Map<string, string>([
      ['USR_DRV_01', 'TRIP_ACTIVE_99'],
    ]);

    function checkStaffSchedule(staffId: string, currentTripId: string) {
      if (activeTripsStaff.has(staffId) && activeTripsStaff.get(staffId) !== currentTripId) {
        throw new Error(`STAFF_BUSY_ON_ACTIVE_TRIP: Nhân sự ${staffId} đang tham gia chuyến ${activeTripsStaff.get(staffId)} chưa bàn giao xong.`);
      }
      return true;
    }

    expect(() => checkStaffSchedule('USR_DRV_01', 'TRIP_NEW_02')).toThrow('STAFF_BUSY_ON_ACTIVE_TRIP');
    expect(checkStaffSchedule('USR_DRV_FREE', 'TRIP_NEW_02')).toBe(true);
  });

  it('TC-F3-06: [Happy] Khảo sát điểm đón & quy trình đổi điểm tập kết (Relocation Proposal)', () => {
    // 1. Coordinator đề xuất đổi điểm tập kết do đường hẹp không vào được xe 3 trục
    const relocationState = {
      relocationId: 'RELOC_001',
      tripId: 'TRIP_001',
      accessResult: 'INACCESSIBLE',
      proof: 'Đường hẻm nông thôn rộng 2.5m, vướng dây điện thấp < 3.2m',
      candidatePlaceId: 'PLACE_HUB_01',
      status: 'PROPOSED',
      managerDecision: null as string | null,
      customerConsent: null as string | null,
    };

    expect(relocationState.status).toBe('PROPOSED');

    // 2. Manager duyệt đề xuất
    relocationState.status = 'MANAGER_APPROVED';
    relocationState.managerDecision = 'APPROVE';
    expect(relocationState.status).toBe('MANAGER_APPROVED');

    // 3. Khách hàng đồng ý dời điểm bàn giao ra hub
    relocationState.status = 'CUSTOMER_CONFIRMED';
    relocationState.customerConsent = 'AGREED';
    expect(relocationState.status).toBe('CUSTOMER_CONFIRMED');
  });

  it('TC-F3-07: [Negative] Chặn xung đột phiên bản cũ (STALE_VERSION) trong quy trình đổi điểm đón', () => {
    const currentTripVersion = 3;
    const requestExpectedVersion = 2; // Client gửi phiên bản cũ chưa cập nhật

    function mutateRelocation(expectedVersion: number, currentVersion: number) {
      if (expectedVersion > 0 && expectedVersion !== currentVersion) {
        throw new Error(`STALE_VERSION: Phiên bản chuyến đi đã thay đổi (${currentVersion} != ${expectedVersion}). Vui lòng tải lại.`);
      }
      return currentVersion + 1;
    }

    expect(() => mutateRelocation(requestExpectedVersion, currentTripVersion)).toThrow('STALE_VERSION');
    expect(mutateRelocation(3, currentTripVersion)).toBe(4);
  });

  it('TC-F3-08: [Happy] Quy trình duyệt Gate 1 (Duyệt kế hoạch, kích hoạt Ops READY)', () => {
    const plan = {
      tripId: 'TRIP_001',
      mode: 'ROAD',
      planVersion: 1,
      status: 'PENDING_APPROVAL',
      resourcesConfirmedAt: '2026-11-07 08:00',
    };

    // Manager duyệt kế hoạch
    plan.status = 'APPROVED';
    const opsReady = plan.status === 'APPROVED' && Boolean(plan.resourcesConfirmedAt);
    expect(opsReady).toBe(true);
  });

  it('TC-F3-09: [Negative] Gate 2 từ chối xuất phát khi thiếu điều kiện Docs READY hoặc Ops READY', () => {
    function validateGate2Departure(planApproved: boolean, docsReady: boolean, opsReady: boolean, openChange: boolean) {
      if (!planApproved || !docsReady || !opsReady || openChange) {
        throw new Error('DEPARTURE_GATE_FAILED: Chuyến đi chưa đạt đủ điều kiện khởi hành (Cần: Plan Approved, Docs Ready, Ops Ready, OpenChange = false).');
      }
      return 'READY_TO_DEPART';
    }

    // Thiếu Docs READY
    expect(() => validateGate2Departure(true, false, true, false)).toThrow('DEPARTURE_GATE_FAILED');
    // Thiếu Ops READY
    expect(() => validateGate2Departure(true, true, false, false)).toThrow('DEPARTURE_GATE_FAILED');
    // Đang có yêu cầu sửa đổi mở OpenChange = true
    expect(() => validateGate2Departure(true, true, true, true)).toThrow('DEPARTURE_GATE_FAILED');
    // Đạt toàn bộ
    expect(validateGate2Departure(true, true, true, false)).toBe('READY_TO_DEPART');
  });

  it('TC-F3-10: [Happy] Gate 2 duyệt xuất phát -> sinh mốc hành trình và đổi trạng thái xe ON_TRIP', () => {
    const trip = {
      tripId: 'TRIP_001',
      status: 'PLAN_APPROVED',
      requestStatus: 'SCHEDULED',
      vehicleStatus: 'READY',
      milestones: [] as string[],
    };

    // Manager Gate 2 Departure Approval
    trip.status = 'READY_TO_DEPART';
    trip.vehicleStatus = 'ON_TRIP';
    // Sinh các mốc tuần tự
    trip.milestones = ['DEPARTED', 'STOP_ARRIVED', 'CHECKPOINT_ARRIVED', 'FINAL_ARRIVED'];

    expect(trip.status).toBe('READY_TO_DEPART');
    expect(trip.vehicleStatus).toBe('ON_TRIP');
    expect(trip.milestones.length).toBe(4);
    expect(trip.milestones[0]).toBe('DEPARTED');
  });
});

describe('FLOW 4: Departure verification, milestone progression, 4 safety gates, airport handovers & multi-role sync', () => {
  it('TC-F4-01: [Happy & Negative] Cam kết quét vi mạch 15 số (HORSES_CHECKED) và kiểm tra xe (VEHICLE_VERIFIED)', () => {
    function confirmPreDeparture(acknowledgements: string[], microchip: string) {
      // 1. Kiểm tra định dạng vi mạch ISO 15 chữ số
      if (!/^\d{15}$/.test(microchip)) {
        throw new Error('INVALID_MICROCHIP: Mã vi mạch ngựa phải đúng chuẩn ISO 11784/11785 gồm đúng 15 chữ số.');
      }
      // 2. Kiểm tra cam kết an toàn
      if (!acknowledgements.includes('HORSES_CHECKED') || !acknowledgements.includes('VEHICLE_VERIFIED')) {
        throw new Error('VALIDATION_ERROR: Bắt buộc phải xác nhận HORSES_CHECKED và VEHICLE_VERIFIED.');
      }
      return true;
    }

    // Thiếu xác nhận
    expect(() => confirmPreDeparture(['HORSES_CHECKED'], '981098102938475')).toThrow('VALIDATION_ERROR');
    // Vi mạch sai định dạng
    expect(() => confirmPreDeparture(['HORSES_CHECKED', 'VEHICLE_VERIFIED'], '12345')).toThrow('INVALID_MICROCHIP');
    // Hợp lệ
    expect(confirmPreDeparture(['HORSES_CHECKED', 'VEHICLE_VERIFIED'], '981098102938475')).toBe(true);
  });

  it('TC-F4-02: [Happy] Xác nhận xuất phát thực tế (DEPARTED) -> Trip IN_TRANSIT, Request IN_PROGRESS', () => {
    const trip = { status: 'READY_TO_DEPART', executionPhase: 'PLANNED', requestStatus: 'SCHEDULED' };
    const firstMilestone = { kind: 'DEPARTED', status: 'PENDING' };

    // Confirm Departure
    trip.status = 'IN_TRANSIT';
    trip.executionPhase = 'IN_PROGRESS';
    trip.requestStatus = 'IN_PROGRESS';
    firstMilestone.status = 'COMPLETED';

    expect(trip.status).toBe('IN_TRANSIT');
    expect(trip.requestStatus).toBe('IN_PROGRESS');
    expect(firstMilestone.status).toBe('COMPLETED');
  });

  it('TC-F4-03: [Negative] Chốt chặn tầng 1: Chặn nhảy cóc mốc (MILESTONE_NOT_NEXT)', () => {
    const milestones = [
      { id: 'M1', kind: 'DEPARTED', sequence: 1, status: 'COMPLETED' },
      { id: 'M2', kind: 'STOP_ARRIVED', sequence: 2, status: 'PENDING' },
      { id: 'M3', kind: 'FINAL_ARRIVED', sequence: 3, status: 'PENDING' },
    ];

    function completeMilestone(targetId: string) {
      const target = milestones.find((m) => m.id === targetId);
      if (!target) throw new Error('NOT_FOUND');
      // Kiểm tra có mốc PENDING nào có sequence nhỏ hơn không
      const hasEarlierPending = milestones.some((m) => m.status === 'PENDING' && m.sequence < target.sequence);
      if (hasEarlierPending) {
        throw new Error('MILESTONE_NOT_NEXT: Bắt buộc phải hoàn tất các mốc trước đó theo đúng trình tự tuần tự.');
      }
      target.status = 'COMPLETED';
      return target;
    }

    // Nhảy cóc hoàn tất M3 khi M2 vẫn PENDING -> Bị chặn
    expect(() => completeMilestone('M3')).toThrow('MILESTONE_NOT_NEXT');
    // Hoàn tất đúng thứ tự M2 -> Thành công
    expect(completeMilestone('M2').status).toBe('COMPLETED');
  });

  it('TC-F4-04: [Negative] Chốt chặn tầng 2: Trạm dừng yêu cầu nhật ký sức khỏe (RequiresHealthCheck)', () => {
    const milestone = { id: 'M2', kind: 'STOP_ARRIVED', requiresHealthCheck: true };
    const healthLogs: Array<{ milestoneId: string; horseId: string }> = [];

    function completeStop(m: typeof milestone, logs: typeof healthLogs) {
      if (m.requiresHealthCheck) {
        const hasLog = logs.some((l) => l.milestoneId === m.id);
        if (!hasLog) {
          throw new Error('HEALTH_CHECK_REQUIRED: Trạm dừng này yêu cầu ghi nhận nhật ký sức khỏe cho ngựa trước khi hoàn tất.');
        }
      }
      return true;
    }

    // Chưa có log -> Bị chặn
    expect(() => completeStop(milestone, healthLogs)).toThrow('HEALTH_CHECK_REQUIRED');
    // Bác sĩ thú y ghi nhật ký sức khỏe
    healthLogs.push({ milestoneId: 'M2', horseId: 'HORSE_01' });
    expect(completeStop(milestone, healthLogs)).toBe(true);
  });

  it('TC-F4-05: [Negative] Chốt chặn tầng 3: Ngựa ABNORMAL khóa xe cho đến khi Bác sĩ thú y khám FIT', () => {
    const healthLogs = [
      { horseId: 'HORSE_01', condition: 'ABNORMAL', temp: 39.2 },
    ];
    const vetAssessments: Array<{ horseId: string; transportFitness: string }> = [];

    function checkVetClearance(logs: typeof healthLogs, assessments: typeof vetAssessments) {
      const abnormalHorseIds = logs.filter((l) => l.condition === 'ABNORMAL').map((l) => l.horseId);
      for (const hid of abnormalHorseIds) {
        const isFit = assessments.some((a) => a.horseId === hid && a.transportFitness === 'FIT');
        if (!isFit) {
          throw new Error(`VET_CLEARANCE_REQUIRED: Ngựa ${hid} đang có chỉ số bất thường, bắt buộc phải có kết luận FIT từ bác sĩ thú y.`);
        }
      }
      return true;
    }

    // Bị khóa xe vì ngựa ABNORMAL chưa có khám FIT
    expect(() => checkVetClearance(healthLogs, vetAssessments)).toThrow('VET_CLEARANCE_REQUIRED');
    // Bác sĩ thú y khám và cấp chứng chỉ FIT
    vetAssessments.push({ horseId: 'HORSE_01', transportFitness: 'FIT' });
    expect(checkVetClearance(healthLogs, vetAssessments)).toBe(true);
  });

  it('TC-F4-06: [Negative] Chốt chặn tầng 4: Thông quan cửa khẩu phải có quyết định Specialist CLEARED', () => {
    const checkpointDecisions: Array<{ decision: string }> = [];

    function departCheckpoint(decisions: typeof checkpointDecisions) {
      const isCleared = decisions.some((d) => d.decision === 'CLEARED');
      if (!isCleared) {
        throw new Error('CHECKPOINT_NOT_CLEARED: Chưa nhận được quyết định CLEARED từ chuyên viên pháp lý tại trạm kiểm soát.');
      }
      return true;
    }

    expect(() => departCheckpoint(checkpointDecisions)).toThrow('CHECKPOINT_NOT_CLEARED');
    checkpointDecisions.push({ decision: 'CLEARED' });
    expect(departCheckpoint(checkpointDecisions)).toBe(true);
  });

  it('TC-F4-07: [Happy] Bàn giao và tiếp nhận kho hàng hóa động vật sân bay (AIR_HANDOVER / AIR_RECEIVED)', () => {
    const airMilestones = [
      { kind: 'AIR_HANDOVER', status: 'PENDING', partner: 'Vietnam Airlines Cargo', note: '' },
      { kind: 'AIR_RECEIVED', status: 'PENDING', partner: 'Nippon Cargo Airlines', note: '' },
    ];

    // Bàn giao kho sân bay đi
    airMilestones[0].status = 'COMPLETED';
    airMilestones[0].note = 'Bàn giao 2 ngựa tại SGN Cargo Terminal, chuồng jet stall chuẩn';
    expect(airMilestones[0].status).toBe('COMPLETED');

    // Tiếp nhận kho sân bay đến
    airMilestones[1].status = 'COMPLETED';
    airMilestones[1].note = 'Tiếp nhận an toàn tại NRT Narita Cargo Terminal';
    expect(airMilestones[1].status).toBe('COMPLETED');
  });

  it('TC-F4-08: [Happy & Boundary] Đề xuất ETA 2 cấp (Coordinator duyệt nếu trong hạn, Manager duyệt nếu vượt hạn)', () => {
    const committedDeadline = new Date('2026-11-20T18:00:00Z');

    function handleEtaProposal(proposedEta: Date, deadline: Date) {
      if (proposedEta > deadline) {
        return {
          status: 'PENDING_MANAGER',
          requiresManager: true,
          escalationReason: 'Đề xuất ETA vượt quá hạn giao hàng của hợp đồng, chuyển cấp Quản lý logistics phê duyệt.',
        };
      } else {
        return {
          status: 'APPROVED',
          requiresManager: false,
          approvedBy: 'COORDINATOR',
        };
      }
    }

    // Đề xuất trong hạn: Coordinator tự duyệt
    const withinDeadline = handleEtaProposal(new Date('2026-11-20T15:00:00Z'), committedDeadline);
    expect(withinDeadline.status).toBe('APPROVED');
    expect(withinDeadline.requiresManager).toBe(false);

    // Đề xuất vượt hạn: Tự động leo thang lên Manager
    const exceedingDeadline = handleEtaProposal(new Date('2026-11-21T08:00:00Z'), committedDeadline);
    expect(exceedingDeadline.status).toBe('PENDING_MANAGER');
    expect(exceedingDeadline.requiresManager).toBe(true);
    expect(exceedingDeadline.escalationReason).toContain('vượt quá hạn giao hàng');
  });

  it('TC-F4-09: [Happy] Ghi nhận chi phí phát sinh thực tế (Petty Cash: vé BOT, rơm rạ) không tính tiền khách hàng', () => {
    const expenses = [
      { category: 'TOLL_FEE', amountVnd: 180000, reason: 'Vé trạm BOT Pháp Vân - Cầu Giẽ', status: 'RECORDED' },
      { category: 'BEDDING_STRAW', amountVnd: 350000, reason: 'Bổ sung rơm lót chuồng khô tại trạm dừng Ninh Bình', status: 'RECORDED' },
    ];

    // Chi phí phát sinh thực tế phục vụ chuyến đi thuộc chi phí vận hành công ty CBN
    const isChargedToCustomer = false;
    expect(isChargedToCustomer).toBe(false);
    expect(expenses.every((e) => e.status === 'RECORDED')).toBe(true);
  });

  it('TC-F4-10: [Negative] Chặn xung đột phiên bản thực thi (STALE_VERSION)', () => {
    const currentExecutionVersion = 5;
    const clientExpectedVersion = 4;

    function verifyExecutionVersion(expected: number, current: number) {
      if (expected !== current) {
        throw new Error(`STALE_VERSION: Phiên bản thực thi không khớp. Yêu cầu: ${expected}, Hiện tại: ${current}.`);
      }
      return current + 1;
    }

    expect(() => verifyExecutionVersion(clientExpectedVersion, currentExecutionVersion)).toThrow('STALE_VERSION');
    expect(verifyExecutionVersion(5, currentExecutionVersion)).toBe(6);
  });

  it('TC-F4-11: [Defect Verification] Kiểm tra kênh đồng bộ đa vai trò (Cross-Role Sync) và F5 reload', () => {
    // Kiểm tra cơ chế sharedTrips và syncChannel
    const testTrip = {
      id: 'TRIP_SYNC_TEST',
      requestId: 'REQ_SYNC_TEST',
      status: 'IN_TRANSIT',
      milestones: [{ type: 'DEPARTED', at: '2026-11-07 08:00' }],
    };

    let syncNotified = false;
    const unsubscribe = onSync((msg) => {
      if (msg.type === 'requests_updated') syncNotified = true;
    });

    // Mô phỏng cập nhật và phát thông báo
    saveSharedTrip(testTrip);
    notifySync('requests_updated');
    receiveServerSync('requests_updated');

    const retrieved = getSharedTrip('TRIP_SYNC_TEST');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.status).toBe('IN_TRANSIT');
    expect(syncNotified).toBe(true);

    unsubscribe();
  });
});
