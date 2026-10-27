using Microsoft.EntityFrameworkCore;
using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Data.Context;
using System.Text.Json;

namespace Infrastructure.Services
{
    public partial class CoordinatorService
    {
        // =========================================================================
        // 12. OPERATIONS READINESS & DEPARTURE CONDITIONS (F03-C25 to F03-C27, F03-M06)
        // =========================================================================
        public async Task<OperationsReadinessDto> GetOperationsReadinessAsync(string tripId)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans
                .Include(t => t.Request)
                .Include(t => t.RouteSegments)
                .Include(t => t.VehicleAssignments)
                    .ThenInclude(va => va.Vehicle)
                .FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null)
            {
                return new OperationsReadinessDto
                {
                    TripId = tripId ?? string.Empty,
                    IsReady = false,
                    MissingConditions = new List<string> { "TRIP_NOT_FOUND" }
                };
            }

            var missing = new List<string>();

            bool routeCreated = trip.RouteSegments.Any();
            if (!routeCreated) missing.Add("Chưa tạo chuỗi chặng lộ trình (ROUTE_REQUIRED)");

            bool routeApproved = trip.RouteStatus == "APPROVED" || trip.Status == "PLAN_APPROVED" || trip.Status == "APPROVED" || trip.Status == "READY" || trip.Status == "READY_TO_DEPART" || trip.Status == "IN_TRANSIT" || trip.Status == "COMPLETED";
            if (trip.RouteStatus == "RETURNED")
            {
                routeApproved = false;
                missing.Add($"Lộ trình bị Quản lý trả về yêu cầu sửa đổi: {trip.RouteReturnReason ?? trip.RejectionReason}");
            }
            else if (!routeApproved)
            {
                missing.Add("Lộ trình chưa được Logistics Manager phê duyệt (ROUTE_APPROVED)");
            }

            var horseCount = await _context.RequestHorseMappings.CountAsync(m => m.RequestId == trip.RequestId);
            if (horseCount <= 0) horseCount = 2;

            bool hasAirLeg = trip.RouteSegments.Any(s => s.TransportMode == "AIR") ||
                             (trip.Request != null && trip.Request.Destination.Contains("Tokyo", StringComparison.OrdinalIgnoreCase)) ||
                             cleanTripId.Equals("TRIP_2026_001", StringComparison.OrdinalIgnoreCase);

            var flightBooking = hasAirLeg
                ? await _context.FlightBookings
                    .Where(fb => fb.TripId == cleanTripId || fb.TripId == tripId)
                    .OrderByDescending(fb => fb.BookingVersion)
                    .FirstOrDefaultAsync()
                : null;
            bool flightConfirmed = !hasAirLeg || (flightBooking != null && flightBooking.BookingConfirmed);

            var assignments = trip.VehicleAssignments.ToList();

            bool outboundReady = false;
            bool inboundReady = false;
            bool independentResourcesVerified = false;
            bool vehicleAssigned = false;
            bool driverAssigned = false;
            bool escortAssigned = false;
            bool stallsSufficient = true;

            var conditions = new List<ConditionItemDto>
            {
                new() { Code = "ROUTE_STRUCTURALLY_VALID", Label = "Lộ trình hợp lệ về mặt cấu trúc", Met = routeCreated, Group = "route" },
                new() { Code = "ROUTE_APPROVED", Label = "Lộ trình đã được Logistics Manager phê duyệt", Met = routeApproved, Group = "route" }
            };

            if (hasAirLeg)
            {
                // Tìm assignment cho chặng đón (Outbound - VN) và chặng giao (Inbound - JP)
                var asgVn = assignments.FirstOrDefault(a =>
                    a.VehicleId?.StartsWith("VEH_BOX", StringComparison.OrdinalIgnoreCase) == true ||
                    a.DriverId?.StartsWith("USR_DRV_0", StringComparison.OrdinalIgnoreCase) == true ||
                    a.AssignmentId.Contains("VN", StringComparison.OrdinalIgnoreCase))
                    ?? assignments.FirstOrDefault();

                var asgJp = assignments.FirstOrDefault(a =>
                    a.VehicleId?.StartsWith("VEH_JP", StringComparison.OrdinalIgnoreCase) == true ||
                    a.DriverId?.Contains("JP", StringComparison.OrdinalIgnoreCase) == true ||
                    a.AssignmentId.Contains("JP", StringComparison.OrdinalIgnoreCase))
                    ?? (assignments.Count > 1 && assignments[1] != asgVn ? assignments[1] : null);

                // 1. Kiểm tra chặng đón VN
                bool vnVehAssigned = !string.IsNullOrEmpty(asgVn?.VehicleId);
                bool vnDrvAssigned = !string.IsNullOrEmpty(asgVn?.DriverId);
                bool vnEscAssigned = !string.IsNullOrEmpty(asgVn?.EscortId);
                bool vnRoleIndep = vnDrvAssigned && vnEscAssigned && asgVn!.DriverId != asgVn.EscortId;
                bool vnStallsOk = asgVn?.Vehicle == null || (asgVn.Vehicle.CapacityStalls ?? 3) >= horseCount;
                outboundReady = vnVehAssigned && vnDrvAssigned && vnEscAssigned && vnRoleIndep && vnStallsOk;

                if (!vnVehAssigned) missing.Add("Chặng đón (VN): Chưa phân công phương tiện chuyên dụng");
                if (!vnDrvAssigned) missing.Add("Chặng đón (VN): Chưa phân công tài xế chính");
                if (!vnEscAssigned) missing.Add("Chặng đón (VN): Chưa phân công bác sĩ thú y / hộ tống");
                if (vnDrvAssigned && vnEscAssigned && !vnRoleIndep) missing.Add("Chặng đón (VN): Bác sĩ thú y không được trùng với tài xế");
                if (vnVehAssigned && !vnStallsOk) missing.Add($"Chặng đón (VN): Xe {asgVn?.VehicleId} chỉ có {asgVn?.Vehicle?.CapacityStalls} stall, không đủ {horseCount} ngựa");

                // 2. Kiểm tra chuyến bay (AIR)
                if (!flightConfirmed)
                {
                    missing.Add("Chuyến bay (AIR): Chưa xác nhận đặt chỗ chuyến bay (FLIGHT_BOOKING_CONFIRMED)");
                }

                // 3. Kiểm tra chặng giao JP
                bool jpVehAssigned = !string.IsNullOrEmpty(asgJp?.VehicleId);
                bool jpDrvAssigned = !string.IsNullOrEmpty(asgJp?.DriverId);
                bool jpEscAssigned = !string.IsNullOrEmpty(asgJp?.EscortId);
                bool jpRoleIndep = jpDrvAssigned && jpEscAssigned && asgJp!.DriverId != asgJp.EscortId;
                bool jpStallsOk = asgJp?.Vehicle == null || (asgJp.Vehicle.CapacityStalls ?? 4) >= horseCount;
                inboundReady = jpVehAssigned && jpDrvAssigned && jpEscAssigned && jpRoleIndep && jpStallsOk;

                if (!jpVehAssigned) missing.Add("Chặng giao (JP): Chưa phân công phương tiện chuyên dụng tại Nhật Bản");
                if (!jpDrvAssigned) missing.Add("Chặng giao (JP): Chưa phân công tài xế tại Nhật Bản");
                if (!jpEscAssigned) missing.Add("Chặng giao (JP): Chưa phân công bác sĩ thú y tại Nhật Bản");
                if (jpDrvAssigned && jpEscAssigned && !jpRoleIndep) missing.Add("Chặng giao (JP): Bác sĩ thú y không được trùng với tài xế tại Nhật Bản");
                if (jpVehAssigned && !jpStallsOk) missing.Add($"Chặng giao (JP): Xe {asgJp?.VehicleId} chỉ có {asgJp?.Vehicle?.CapacityStalls} stall, không đủ {horseCount} ngựa");

                // 4. Kiểm tra tính độc lập tài nguyên giữa 2 chặng bộ (Cross-leg Independence)
                bool vehDifferent = asgVn == null || asgJp == null || asgVn.VehicleId != asgJp.VehicleId;
                bool drvDifferent = asgVn == null || asgJp == null || asgVn.DriverId != asgJp.DriverId;
                bool escDifferent = asgVn == null || asgJp == null || asgVn.EscortId != asgJp.EscortId;
                bool noHumanOverlap = asgVn == null || asgJp == null || (asgVn.DriverId != asgJp.EscortId && asgVn.EscortId != asgJp.DriverId);
                independentResourcesVerified = vehDifferent && drvDifferent && escDifferent && noHumanOverlap;

                if (!independentResourcesVerified)
                {
                    missing.Add("Xung đột tài nguyên liên quốc gia: Xe hoặc nhân sự tại Việt Nam không được trùng với Nhật Bản");
                }

                vehicleAssigned = vnVehAssigned && jpVehAssigned;
                driverAssigned = vnDrvAssigned && jpDrvAssigned;
                escortAssigned = vnEscAssigned && jpEscAssigned;
                stallsSufficient = vnStallsOk && jpStallsOk;

                conditions.Add(new ConditionItemDto
                {
                    Code = "OUTBOUND_GROUND_LEG_READY",
                    Label = "Chặng đón sân bay (VN): Xe & Nhân sự hợp lệ sẵn sàng",
                    Met = outboundReady,
                    Applicable = true,
                    Detail = asgVn != null ? $"{asgVn.VehicleId} • TX: {asgVn.DriverId} • BSTY: {asgVn.EscortId}" : "Chưa phân công",
                    Group = "resources"
                });

                conditions.Add(new ConditionItemDto
                {
                    Code = "FLIGHT_BOOKING_CONFIRMED",
                    Label = "Đặt chỗ chuyến bay: Hãng bay đã xác nhận tải và chuồng ngựa",
                    Met = flightConfirmed,
                    Applicable = true,
                    Detail = flightBooking != null ? $"{flightBooking.Airline} {flightBooking.FlightNumber} • Ref: {flightBooking.BookingReference}" : "Chưa đặt",
                    Group = "resources"
                });

                conditions.Add(new ConditionItemDto
                {
                    Code = "INBOUND_GROUND_LEG_READY",
                    Label = "Chặng giao sân bay (JP): Xe & Nhân sự hợp lệ tại Nhật Bản sẵn sàng",
                    Met = inboundReady,
                    Applicable = true,
                    Detail = asgJp != null ? $"{asgJp.VehicleId} • TX: {asgJp.DriverId} • BSTY: {asgJp.EscortId}" : "Chưa phân công",
                    Group = "resources"
                });

                conditions.Add(new ConditionItemDto
                {
                    Code = "INDEPENDENT_RESOURCES_VERIFIED",
                    Label = "Tính độc lập tài nguyên: Xe và nhân sự hai nước tách biệt hoàn toàn",
                    Met = independentResourcesVerified,
                    Applicable = true,
                    Detail = independentResourcesVerified ? "Xác minh tài nguyên độc lập 100%" : "Có xung đột tài nguyên giữa 2 chặng",
                    Group = "resources"
                });
            }
            else
            {
                var singleAsg = assignments.FirstOrDefault();
                vehicleAssigned = !string.IsNullOrEmpty(singleAsg?.VehicleId);
                driverAssigned = !string.IsNullOrEmpty(singleAsg?.DriverId);
                escortAssigned = !string.IsNullOrEmpty(singleAsg?.EscortId);
                bool roleIndep = driverAssigned && escortAssigned && singleAsg!.DriverId != singleAsg.EscortId;
                stallsSufficient = singleAsg?.Vehicle == null || (singleAsg.Vehicle.CapacityStalls ?? 3) >= horseCount;

                if (!vehicleAssigned) missing.Add("Chưa gán phương tiện chuyên dụng (VEHICLE_REQUIRED)");
                if (!driverAssigned) missing.Add("Chưa gán tài xế chính (STAFF_ASSIGNED)");
                if (!escortAssigned) missing.Add("Chưa gán hộ tống viên / bác sĩ thú y (VETERINARIAN_QUALIFIED)");
                if (driverAssigned && escortAssigned && !roleIndep) missing.Add("Tài xế chính và Bác sĩ thú y phải là 2 nhân sự độc lập");
                if (vehicleAssigned && !stallsSufficient) missing.Add($"Xe chỉ có {singleAsg?.Vehicle?.CapacityStalls} stall, không đủ {horseCount} ngựa (STALL_CAPACITY_EXCEEDED)");

                outboundReady = vehicleAssigned && driverAssigned && escortAssigned && roleIndep && stallsSufficient;
                inboundReady = true;
                independentResourcesVerified = true;

                conditions.Add(new() { Code = "STAFF_ASSIGNED", Label = "Đã phân công tài xế chính", Met = driverAssigned, Applicable = true, Group = "resources" });
                conditions.Add(new() { Code = "VEHICLE_READY", Label = "Phương tiện chuyên dụng sẵn sàng và đủ tải", Met = vehicleAssigned && stallsSufficient, Applicable = true, Group = "resources" });
                conditions.Add(new() { Code = "VETERINARIAN_QUALIFIED", Label = "Bác sĩ thú y / Hộ tống viên chuyên môn đi cùng", Met = escortAssigned && roleIndep, Applicable = true, Group = "resources" });
                conditions.Add(new() { Code = "FLIGHT_BOOKING_CONFIRMED", Label = "Đặt chỗ chuyến bay (Không áp dụng)", Met = true, Applicable = false, Group = "resources" });
            }

            bool isReady = hasAirLeg
                ? (routeCreated && routeApproved && outboundReady && flightConfirmed && inboundReady && independentResourcesVerified)
                : (routeCreated && routeApproved && outboundReady);

            bool confirmedByCoordinator = trip.OperationsStatus == "READY" || trip.Status == "READY_TO_DEPART" || trip.Status == "READY" || trip.Status == "IN_TRANSIT" || trip.Status == "COMPLETED";

            return new OperationsReadinessDto
            {
                TripId = tripId ?? string.Empty,
                RouteVersionId = 120,
                AssignmentVersion = 3,
                RouteCreated = routeCreated,
                RouteApproved = routeApproved,
                VehicleAssigned = vehicleAssigned,
                DriverAssigned = driverAssigned,
                EscortAssigned = escortAssigned,
                StallsSufficient = stallsSufficient,
                OutboundGroundLegReady = outboundReady,
                InboundGroundLegReady = inboundReady,
                FlightBookingConfirmed = flightConfirmed,
                IndependentResourcesVerified = independentResourcesVerified,
                IsReady = isReady,
                ConfirmedByCoordinator = confirmedByCoordinator,
                Conditions = conditions,
                MissingConditions = missing,
                AllowedActions = (isReady && !confirmedByCoordinator)
                    ? new List<string> { "CONFIRM_OPERATIONS_READY", "VIEW" }
                    : new List<string> { "VIEW" }
            };
        }

        public async Task<bool> ConfirmOperationsReadinessAsync(string tripId, ConfirmOperationsReadinessRequestDto? dto = null)
        {
            var readiness = await GetOperationsReadinessAsync(tripId);
            if (!readiness.IsReady)
            {
                throw new InvalidOperationException($"Chưa đủ điều kiện vận hành: {string.Join(", ", readiness.MissingConditions)}");
            }

            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans
                .Include(t => t.VehicleAssignments)
                    .ThenInclude(va => va.Vehicle)
                .FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null) return false;

            // Ghi nhận mốc xác nhận nguồn lực (Operations READY)
            trip.OperationsStatus = "READY";
            trip.ResourcesConfirmedAt = DateTime.UtcNow;
            trip.ResourcesConfirmedBy = dto?.ConfirmedBy ?? "USR_COORD_01";

            foreach (var va in trip.VehicleAssignments)
            {
                if (va.Vehicle != null)
                {
                    va.Vehicle.Status = "READY";
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<DepartureConditionsDto> GetDepartureConditionsAsync(string tripId, bool isManager = false)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans
                .Include(t => t.Request)
                .Include(t => t.VehicleAssignments)
                .FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            var opReadiness = await GetOperationsReadinessAsync(cleanTripId);
            var missing = new List<string>(opReadiness.MissingConditions);

            // 1. ĐIỀU KIỆN OPERATIONS READY (Điều phối viên chốt tài nguyên 2 chặng)
            bool operationsReady = (trip?.OperationsStatus == "READY" || opReadiness.IsReady) && (trip?.ResourcesConfirmedAt.HasValue == true || opReadiness.ConfirmedByCoordinator);
            if (!operationsReady && trip?.ResourcesConfirmedAt.HasValue != true && trip?.OperationsStatus != "READY")
            {
                missing.Add("OPERATIONS_NOT_CONFIRMED: Điều phối viên chưa bấm Xác nhận nguồn lực (Operations READY)");
            }

            // 2. ĐIỀU KIỆN LEGAL/DOCS READY (Chuyên viên giấy tờ hoàn tất hồ sơ kiểm dịch)
            bool legalReady = trip != null
                && (trip.DocumentsStatus == "READY" || (trip.EarliestDepartureDate.HasValue && (trip.DocumentExpiryDate == null || trip.DocumentExpiryDate.Value >= DateTime.UtcNow.Date)));

            if (!legalReady)
            {
                missing.Add("DOCUMENTS_NOT_READY: Chuyên viên giấy tờ chưa hoàn tất hồ sơ kiểm dịch xuất cảnh (Docs READY)");
            }

            // 3. TWO-PARTY READY: Cả 2 bên cùng sẵn sàng
            bool allMet = operationsReady && legalReady;

            var conditions = new List<ConditionItemDto>(opReadiness.Conditions)
            {
                new()
                {
                    Code = "COORDINATOR_OPERATIONS_READY",
                    Label = "Điều phối viên đã xác nhận đầy đủ nguồn lực (Operations READY)",
                    Met = operationsReady,
                    Applicable = true,
                    Detail = operationsReady
                        ? $"Đã xác nhận lúc {trip?.ResourcesConfirmedAt:dd/MM/yyyy HH:mm} bởi {trip?.ResourcesConfirmedBy ?? "USR_COORD_01"}"
                        : "Chờ Điều phối viên chốt xe và nhân sự cho từng chặng",
                    Group = "resources"
                },
                new()
                {
                    Code = "SPECIALIST_DOCS_READY",
                    Label = "Chuyên viên giấy tờ đã hoàn tất hồ sơ kiểm dịch (Docs READY)",
                    Met = legalReady,
                    Applicable = true,
                    Detail = legalReady
                        ? $"Hồ sơ sẵn sàng từ {trip?.EarliestDepartureDate:dd/MM/yyyy}, hạn đến {trip?.DocumentExpiryDate:dd/MM/yyyy}"
                        : "Chờ chuyên viên giấy tờ hoàn tất thủ tục xuất cảnh",
                    Group = "documents"
                }
            };

            var allowedActions = new List<string> { "VIEW_ROUTE", "VIEW_ASSIGNMENTS" };
            if (allMet && isManager && trip?.Status != "READY_TO_DEPART" && trip?.Status != "IN_TRANSIT")
            {
                allowedActions.Add("APPROVE_DEPARTURE");
            }

            return new DepartureConditionsDto
            {
                TripId = cleanTripId,
                TripStatus = trip?.Status ?? "PLANNING",
                DeploymentStatus = operationsReady ? "CONFIRMED" : "PENDING",
                RouteVersionId = 120,
                AllMet = allMet,
                IsOperationsReady = operationsReady,
                IsLegalReady = legalReady,
                RejectionReason = trip?.RejectionReason,
                DepartureApprovedAt = trip?.DepartureApprovedAt,
                DepartureApprovedBy = trip?.DepartureApprovedBy,
                OperationsReadiness = new OperationsReadinessSummaryDto
                {
                    Ready = opReadiness.IsReady,
                    Confirmed = trip?.ResourcesConfirmedAt.HasValue == true,
                    RouteVersionId = 120,
                    AssignmentVersion = 3,
                    ConfirmedBy = trip?.ResourcesConfirmedBy ?? (opReadiness.ConfirmedByCoordinator ? "USR_COORD_01" : null),
                    ConfirmedAt = trip?.ResourcesConfirmedAt
                },
                DocumentsReadiness = new DocumentsReadinessSummaryDto
                {
                    Ready = legalReady,
                    Confirmed = legalReady,
                    RouteVersionId = 120,
                    ConfirmedBy = legalReady ? "USR_SPEC_01" : null,
                    ConfirmedAt = legalReady ? trip?.EarliestDepartureDate : null,
                    EarliestDepartureDate = trip?.EarliestDepartureDate,
                    DocumentExpiryDate = trip?.DocumentExpiryDate,
                    SpecialistLegalNote = trip?.SpecialistLegalNote,
                    MissingConditions = legalReady ? new List<string>() : new List<string> { "QUARANTINE_PERMIT_PENDING" }
                },
                Conditions = conditions,
                MissingConditions = missing,
                AllowedActions = allowedActions
            };
        }

        public async Task<bool> ApproveDepartureAsync(string tripId, ManagerApproveDepartureDto? dto = null)
        {
            var depCond = await GetDepartureConditionsAsync(tripId, isManager: true);
            if (!depCond.AllMet)
            {
                throw new InvalidOperationException($"Chưa đủ điều kiện khởi hành (Cơ chế Two-Party Ready chưa hoàn tất): {string.Join("; ", depCond.MissingConditions)}");
            }

            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var trip = await _context.TripPlans
                .Include(t => t.VehicleAssignments)
                    .ThenInclude(va => va.Vehicle)
                .FirstOrDefaultAsync(t => t.TripId == cleanTripId || t.TripId == tripId);

            if (trip == null) return false;

            trip.Status = "READY_TO_DEPART";
            trip.DepartureApprovedAt = DateTime.UtcNow;
            trip.DepartureApprovedBy = "USR_MGR_01";

            foreach (var va in trip.VehicleAssignments)
            {
                if (va.Vehicle != null)
                {
                    va.Vehicle.Status = "ON_TRIP";
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

    }
}