import { apiRequest } from '../../../shared/api/apiRequest';

export interface PickupAccessResolutionRequest {
  resolutionType: 'RELOCATING' | 'SHUTTLING';
  meetingPointName?: string;
  meetingLatitude?: number;
  meetingLongitude?: number;
  shuttleVehicleId?: string;
  shuttleDriverId?: string;
  shuttleCostVnd?: number;
  notes?: string;
}

export interface PickupAccessStatusResponse {
  tripId: string;
  pickupAccessStatus: string; // 'NORMAL' | 'BLOCKED' | 'RELOCATING' | 'SHUTTLING' | 'RESOLVED'
  relocationMeetingPointName?: string;
  relocationLatitude?: number;
  relocationLongitude?: number;
  relocationDistanceMeters?: number;
  shuttleVehicleId?: string;
  shuttleDriverId?: string;
  shuttleCostVnd?: number;
  customerApprovalStatus?: string; // 'PENDING' | 'APPROVED' | 'REJECTED'
  customerApprovalAt?: string;
  blockedImageUrl?: string;
  relocationImageUrl?: string;
  safetyBlockerActive: boolean;
  message: string;
}

export const pickupAccessApi = {
  /**
   * Điều phối viên đề xuất phương án giải quyết (dắt bộ <500m hoặc xe trung chuyển >=500m)
   * POST /api/coordinator/trips/{tripId}/pickup-access-resolution
   */
  resolveAccess: async (
    tripId: string,
    payload: PickupAccessResolutionRequest
  ): Promise<PickupAccessStatusResponse> => {
    return await apiRequest<PickupAccessStatusResponse>(
      'post',
      `/coordinator/trips/${tripId}/pickup-access-resolution`,
      payload
    );
  },
};

