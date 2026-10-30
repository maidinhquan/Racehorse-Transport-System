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
        // 7. ROUTE CALCULATION & ROUTE VERSIONS (F03-C05 to F03-C10)
        // =========================================================================
        public async Task<RouteCalculateResponseDto> CalculateRouteAsync(RouteCalculateRequestDto dto)
        {
            var points = dto.Points.OrderBy(p => p.Sequence).ToList();
            if (points.Count < 2)
            {
                throw new ArgumentException("Lộ trình cần ít nhất 2 điểm: Điểm xuất phát (Origin) và Điểm đích (Destination).");
            }

            decimal totalDistance = 0;
            decimal totalDurationHours = 0;
            var legs = new List<RouteLegResultDto>();
            var polylineCoords = new List<double[]>();
            var warnings = new List<string>();
            var errors = new List<string>();

            var currentDeparture = dto.PlannedDepartureAt;

            // 1. Xác định thông số xe tải chở ngựa chuyên dụng (Horsebox) để kiểm soát cầu hầm & tải trọng
            decimal weightTons = dto.VehicleWeightTons ?? 10.0m;
            decimal heightMeters = dto.VehicleHeightMeters ?? 3.8m;

            if (!string.IsNullOrEmpty(dto.TripId) && (!dto.VehicleWeightTons.HasValue || !dto.VehicleHeightMeters.HasValue))
            {
                var assignedVehicle = await _context.TripVehicleAssignments
                    .Where(a => a.TripId == dto.TripId)
                    .Include(a => a.Vehicle)
                    .Select(a => a.Vehicle)
                    .FirstOrDefaultAsync();

                if (assignedVehicle != null)
                {
                    if (assignedVehicle.Type?.Contains("LUXURY") == true || assignedVehicle.CapacityStalls >= 6)
                    {
                        weightTons = 16.0m;
                        heightMeters = 3.9m;
                    }
                    else if (assignedVehicle.CapacityStalls <= 2)
                    {
                        weightTons = 6.5m;
                        heightMeters = 3.4m;
                    }
                }
            }

            for (int i = 0; i < points.Count - 1; i++)
            {
                var from = points[i];
                var to = points[i + 1];

                // Ràng buộc chặng AIR: hai đầu phải là AIRPORT
                var legInput = dto.Legs.FirstOrDefault(l => l.FromSequence == from.Sequence && l.ToSequence == to.Sequence);
                var mode = legInput?.Mode ?? "ROAD";

                if (mode == "AIR" && (from.Type != "AIRPORT" || to.Type != "AIRPORT"))
                {
                    errors.Add($"Chặng AIR giữa Sequence {from.Sequence} và {to.Sequence} bắt buộc phải nối giữa 2 sân bay (AIRPORT)!");
                }

                decimal legDistanceKm;
                int legDurationMinutes;
                List<double[]> legPath;
                string distanceSource;

                if (mode == "AIR")
                {
                    legDistanceKm = (decimal)_mapRoutingService.CalculateDistance((double)from.Lat, (double)from.Lng, (double)to.Lat, (double)to.Lng);
                    var speed = 600.0m;
                    var legDriveHours = legDistanceKm / speed;
                    legDurationMinutes = legInput?.ManualDurationMinutes ?? (int)(legDriveHours * 60);
                    legPath = _mapRoutingService.GenerateInterpolatedPoints((double)from.Lat, (double)from.Lng, (double)to.Lat, (double)to.Lng, 6);
                    distanceSource = "FLIGHT_SCHEDULE";
                }
                else if (legInput?.ManualDistanceKm.HasValue == true && legInput.ManualDistanceKm.Value > 0)
                {
                    legDistanceKm = legInput.ManualDistanceKm.Value;
                    var speed = 50.0m;
                    var legDriveHours = legDistanceKm / speed;
                    legDurationMinutes = legInput.ManualDurationMinutes ?? (int)(legDriveHours * 60);
                    legPath = _mapRoutingService.GenerateInterpolatedPoints((double)from.Lat, (double)from.Lng, (double)to.Lat, (double)to.Lng, 6);
                    distanceSource = "MANUAL";
                }
                else
                {
                    // Lộ trình đường bộ ROAD: Gọi MapRoutingService chuyên biệt (kiểm soát tải trọng xe ngựa, cầu hầm & kẹt xe thời gian thực)
                    var mapResult = await _mapRoutingService.CalculateLegRoutingAsync(
                        (double)from.Lat, (double)from.Lng, (double)to.Lat, (double)to.Lng,
                        weightTons, heightMeters);
                    legDistanceKm = mapResult.distanceKm;
                    legDurationMinutes = legInput?.ManualDurationMinutes ?? mapResult.durationMinutes;
                    legPath = mapResult.path;
                    distanceSource = mapResult.source;

                    if (mapResult.trafficCondition == "SEVERE_CONGESTION" || mapResult.trafficCondition == "HEAVY_CONGESTION")
                    {
                        warnings.Add($"Cảnh báo giao thông thời gian thực: Đoạn đường từ '{from.Name}' đến '{to.Name}' đang ùn tắc nghiêm trọng ({mapResult.trafficCondition}). Thời gian di chuyển thực tế đã được tự động tính bù trễ do kẹt xe.");
                    }
                }

                var legDriveHoursTotal = legDurationMinutes / 60.0m;
                var arrivalAt = currentDeparture.AddMinutes(legDurationMinutes);
                var departureNext = arrivalAt.AddMinutes(to.PlannedStopMinutes);

                // KIỂM TRA LUẬT PHÚC LỢI NGỰA (Equine Welfare Rule: F03-BR-16): ROAD không đứng xe quá 4-6 tiếng liên tục
                if (mode == "ROAD" && legDriveHoursTotal > 6.0m)
                {
                    warnings.Add($"Chặng từ '{from.Name}' đến '{to.Name}' lái xe liên tục {legDriveHoursTotal:F1}h (> 6h). Theo quy định phúc lợi ngựa (Equine Welfare), bắt buộc phải chèn trạm dừng nghỉ 1-2 tiếng!");
                }

                polylineCoords.AddRange(legPath);

                legs.Add(new RouteLegResultDto
                {
                    FromSequence = from.Sequence,
                    ToSequence = to.Sequence,
                    Mode = mode,
                    DistanceKm = Math.Round(legDistanceKm, 1),
                    DurationMinutes = legDurationMinutes,
                    DistanceSource = distanceSource,
                    DepartureAt = currentDeparture,
                    ArrivalAt = arrivalAt,
                    Path = legPath,
                    TrafficCondition = mode == "ROAD" ? (distanceSource.Contains("TRUCK") || distanceSource.Contains("TRAFFIC") ? "FLOWING" : "NORMAL") : "AIR_CLEAR",
                    BridgeAndTunnelSafetyChecked = mode == "ROAD" && (distanceSource.Contains("TRUCK") || distanceSource.Contains("MAPBOX"))
                });

                totalDistance += legDistanceKm;
                totalDurationHours += (legDurationMinutes + to.PlannedStopMinutes) / 60.0m;
                currentDeparture = departureNext;
            }

            // =========================================================================
            // VALIDATION KHUNG THỜI GIAN PHÁP LÝ (SPECIALIST LEGAL WINDOW) & HẠN GIAO KHÁCH
            // =========================================================================
            if (!string.IsNullOrEmpty(dto.TripId))
            {
                var trip = await _context.TripPlans
                    .Include(t => t.Request)
                    .FirstOrDefaultAsync(t => t.TripId == dto.TripId);

                if (trip != null)
                {
                    // [FLOW 3 V2 RETIRED]: Gate ràng buộc lịch giấy tờ (timed-documents F3-J21/J22) và gate khảo sát khả thi (F3-J03)
                    // đã bãi bỏ hoàn toàn. Coordinator và Specialist chạy song song; giấy tờ được coi là ASSUMED_VALID_FOR_TRIP.
                    // Không chặn PlannedDepartureAt < EarliestDepartureDate hoặc ArrivalAt > DocumentExpiryDate ở bước tính tuyến.

                    // 3. ETA <= CommittedDeadline (Đảm bảo đúng hẹn với khách)
                    var deadline = trip.Request?.CommittedDeadline;
                    if (deadline.HasValue && currentDeparture > deadline.Value)
                    {
                        if (string.IsNullOrWhiteSpace(dto.DeadlineJustification))
                        {
                            errors.Add($"Dự kiến giao ngựa ({currentDeparture:dd/MM/yyyy HH:mm}) trễ hơn Hạn cam kết với khách hàng ({deadline.Value:dd/MM/yyyy HH:mm}). Bắt buộc nhập Giải trình trễ hạn (Deadline Justification)!");
                        }
                        else
                        {
                            warnings.Add($"Dự kiến giao trễ hạn ({currentDeparture:dd/MM/yyyy HH:mm} > {deadline.Value:dd/MM/yyyy HH:mm}), đã có giải trình: '{dto.DeadlineJustification}'.");
                        }
                    }

                    // 4. KIỂM TRA LEAD TIME SÂN BAY (4 - 6 tiếng trước giờ cất cánh - IATA LAR)
                    var airLegIndex = -1;
                    for (int lIdx = 0; lIdx < legs.Count; lIdx++)
                    {
                        if (legs[lIdx].Mode == "AIR")
                        {
                            airLegIndex = lIdx;
                            break;
                        }
                    }

                    if (airLegIndex > 0)
                    {
                        var groundLegBeforeAir = legs[airLegIndex - 1];
                        var airLeg = legs[airLegIndex];
                        var groundArrivalAtAirport = groundLegBeforeAir.ArrivalAt;
                        var flightDeparture = airLeg.DepartureAt;

                        var leadTimeHours = (flightDeparture - groundArrivalAtAirport).TotalHours;
                        if (leadTimeHours < 4.0)
                        {
                            errors.Add($"Thời gian xe đến sân bay ({groundArrivalAtAirport:dd/MM/yyyy HH:mm}) quá sát giờ bay ({flightDeparture:dd/MM/yyyy HH:mm}) - chỉ cách {leadTimeHours:F1}h. Quy định tiếp nhận động vật sống (IATA LAR) bắt buộc phải có mặt trước giờ bay tối thiểu từ 4 đến 6 tiếng để làm thủ tục hải quan và kiểm tra thú y.");
                        }
                    }

                    var flightBooking = await _context.FlightBookings
                        .Where(fb => fb.TripId == dto.TripId)
                        .OrderByDescending(fb => fb.BookingVersion)
                        .FirstOrDefaultAsync();

                    if (flightBooking != null && airLegIndex > 0)
                    {
                        var groundArrivalAtAirport = legs[airLegIndex - 1].ArrivalAt;
                        var leadTimeHours = (flightBooking.DepartureAt - groundArrivalAtAirport).TotalHours;
                        if (leadTimeHours < 4.0)
                        {
                            errors.Add($"Thời gian đến sân bay ({groundArrivalAtAirport:dd/MM/yyyy HH:mm}) trước giờ bay thực tế ({flightBooking.DepartureAt:dd/MM/yyyy HH:mm}) chưa đủ 4 tiếng (hiện tại: {leadTimeHours:F1}h). Cần bố trí đến trước ít nhất 4 - 6 tiếng.");
                        }
                    }
                }
            }

            return new RouteCalculateResponseDto
            {
                TotalDistanceKm = Math.Round(totalDistance, 1),
                TotalElapsedHours = Math.Round(totalDurationHours, 1),
                EtaDestination = currentDeparture,
                MeetsEquineWelfare = !warnings.Any(w => w.Contains("phúc lợi ngựa")),
                Validation = new RouteValidationResultDto
                {
                    CanSubmit = !errors.Any(),
                    Errors = errors,
                    Warnings = warnings
                },
                Warnings = warnings,
                Legs = legs,
                PolylineCoordinates = polylineCoords,
                HeavyVehicleVerified = true,
                VehicleWeightTons = weightTons,
                VehicleHeightMeters = heightMeters,
                TrafficCondition = legs.Any(l => l.TrafficCondition == "SEVERE_CONGESTION") ? "SEVERE_CONGESTION" :
                                   legs.Any(l => l.TrafficCondition == "HEAVY_CONGESTION") ? "HEAVY_CONGESTION" : "FLOWING"
            };
        }

        public Task<List<RouteVersionSummaryDto>> GetRouteVersionsAsync(string tripId)
        {
            return Task.FromResult(new List<RouteVersionSummaryDto>
            {
                new()
                {
                    RouteVersionId = 120,
                    TripId = tripId,
                    Version = 1,
                    Status = "PENDING_APPROVAL",
                    Source = "PLANNING",
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    SubmittedAt = DateTime.UtcNow.AddDays(-1),
                    EtaDestination = DateTime.UtcNow.AddDays(4),
                    AllowedActions = new List<string> { "VIEW", "SUBMIT" }
                }
            });
        }

        public async Task<RouteCalculateResponseDto?> GetRouteVersionDetailAsync(int routeVersionId)
        {
            var req = new RouteCalculateRequestDto
            {
                PlannedDepartureAt = DateTime.UtcNow.AddDays(2),
                Points = new List<RoutePointInputDto>
                {
                    new() { Sequence = 1, Type = "ORIGIN", Name = "Điểm đón Việt Nam", Lat = 10.8231m, Lng = 106.6297m, PlannedStopMinutes = 0 },
                    new() { Sequence = 2, Type = "REST_STOP", Name = "Trạm nghỉ Mộc Bài", Lat = 11.0650m, Lng = 106.1720m, PlannedStopMinutes = 90 },
                    new() { Sequence = 3, Type = "CHECKPOINT", Name = "Cửa khẩu Quốc tế Bavet", Lat = 11.0850m, Lng = 106.1450m, PlannedStopMinutes = 120 },
                    new() { Sequence = 4, Type = "DESTINATION", Name = "Trường đua Bangkok", Lat = 13.7563m, Lng = 100.5018m, PlannedStopMinutes = 0 }
                }
            };
            return await CalculateRouteAsync(req);
        }

        public async Task<RouteVersionSummaryDto> CreateRouteDraftAsync(string tripId, RouteDraftPayloadDto dto)
        {
            var segments = dto.Points.Select((p, idx) => new RouteSegmentItemDto
            {
                LocationName = p.Name,
                SegmentType = p.Type,
                TransportMode = idx < dto.Legs.Count ? dto.Legs[idx].Mode : "ROAD",
                Lat = p.Lat,
                Lng = p.Lng
            }).ToList();

            await SaveRouteSegmentsAsync(tripId, new SaveRouteSegmentsDto { Segments = segments });

            return new RouteVersionSummaryDto
            {
                RouteVersionId = 120,
                TripId = tripId,
                Version = 1,
                Status = "DRAFT",
                Source = "PLANNING",
                CreatedAt = DateTime.UtcNow,
                AllowedActions = new List<string> { "EDIT", "SUBMIT" }
            };
        }

        public async Task<RouteVersionSummaryDto> UpdateRouteDraftAsync(int routeVersionId, RouteDraftPayloadDto dto)
        {
            return new RouteVersionSummaryDto
            {
                RouteVersionId = routeVersionId,
                TripId = "TRIP_2026_001",
                Version = (dto.ExpectedVersion ?? 1) + 1,
                Status = "DRAFT",
                Source = "PLANNING",
                CreatedAt = DateTime.UtcNow,
                AllowedActions = new List<string> { "EDIT", "SUBMIT" }
            };
        }

        public Task<SubmitRouteResponseDto> SubmitRouteVersionAsync(int routeVersionId, SubmitRouteDto dto)
        {
            return Task.FromResult(new SubmitRouteResponseDto
            {
                RouteVersionId = routeVersionId,
                Version = dto.ExpectedVersion,
                Status = "PENDING_APPROVAL",
                SubmittedAt = DateTime.UtcNow,
                ManagerNotified = true
            });
        }

        public async Task<bool> SubmitRouteForApprovalAsync(string tripId)
        {
            var trip = await _context.TripPlans.FindAsync(tripId);
            if (trip == null) return false;

            trip.Status = "PENDING_APPROVAL";
            trip.RouteStatus = "PENDING_APPROVAL";
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<RouteSegmentItemDto>> GetRouteSegmentsAsync(string tripId)
        {
            var segments = await _context.RouteSegments
                .Where(s => s.TripId == tripId)
                .OrderBy(s => s.SequenceOrder)
                .ThenBy(s => s.ExpectedEta)
                .ToListAsync();

            return segments.Select(s => new RouteSegmentItemDto
            {
                SegmentId = s.SegmentId,
                SequenceOrder = s.SequenceOrder,
                LocationName = s.LocationName,
                SegmentType = s.SegmentType ?? "STOP",
                TransportMode = s.TransportMode,
                FacilityId = s.FacilityId,
                CarrierName = s.CarrierName,
                FlightVoyageNo = s.FlightVoyageNo,
                PlannedTime = s.PlannedTime,
                ExpectedEta = s.ExpectedEta,
                Lat = s.Latitude,
                Lng = s.Longitude,
                Status = s.Status
            }).ToList();
        }

        public async Task<bool> SaveRouteSegmentsAsync(string tripId, SaveRouteSegmentsDto dto)
        {
            var trip = await _context.TripPlans.FindAsync(tripId);
            if (trip == null) return false;

            var oldSegments = await _context.RouteSegments.Where(s => s.TripId == tripId).ToListAsync();
            _context.RouteSegments.RemoveRange(oldSegments);

            int seq = 1;
            foreach (var item in dto.Segments)
            {
                var segment = new RouteSegment
                {
                    SegmentId = "SEG_" + Guid.NewGuid().ToString("N")[..8].ToUpper(),
                    TripId = tripId,
                    SequenceOrder = item.SequenceOrder > 0 ? item.SequenceOrder : seq,
                    FacilityId = item.FacilityId,
                    LocationName = item.LocationName,
                    SegmentType = item.SegmentType ?? (seq == 1 ? "ORIGIN" : seq == dto.Segments.Count ? "DESTINATION" : "REST_STOP"),
                    TransportMode = item.TransportMode ?? "ROAD",
                    CarrierName = item.CarrierName,
                    FlightVoyageNo = item.FlightVoyageNo,
                    PlannedTime = item.PlannedTime ?? item.ExpectedEta ?? DateTime.UtcNow.AddHours(seq * 4),
                    ExpectedEta = item.ExpectedEta ?? item.PlannedTime ?? DateTime.UtcNow.AddHours(seq * 4),
                    Latitude = item.Lat,
                    Longitude = item.Lng,
                    Coordinates = (item.Lat.HasValue && item.Lng.HasValue ? $"{item.Lat},{item.Lng}" : null),
                    Status = item.Status ?? "PLANNED"
                };
                _context.RouteSegments.Add(segment);
                seq++;
            }

            trip.Status = "PLANNING";
            trip.RouteStatus = "DRAFT";
            await _context.SaveChangesAsync();
            return true;
        }

        // =========================================================================
        // 8. MANAGER PLANNING QUEUE & APPROVAL (F03-M01 to F03-M04)
        // =========================================================================
        public async Task<List<ManagerPlanningItemDto>> GetManagerPlanningTripsAsync()
        {
            var trips = await _context.TripPlans.Include(t => t.Request).ToListAsync();
            var list = new List<ManagerPlanningItemDto>();

            foreach (var t in trips)
            {
                var conditions = await GetDepartureConditionsAsync(t.TripId, isManager: true);
                var routeStatus = t.Status == "IN_TRANSIT" || t.Status == "PLAN_APPROVED" || t.Status == "READY_TO_DEPART"
                    ? "APPROVED"
                    : (t.Status == "RETURNED" ? "RETURNED" : "PENDING_APPROVAL");

                list.Add(new ManagerPlanningItemDto
                {
                    TripId = t.TripId,
                    TripCode = t.TripId.Replace("TRIP_", "TRP-"),
                    Status = t.Status,
                    RouteStatus = routeStatus,
                    CurrentRouteVersionId = 120,
                    DeploymentStatus = conditions.DeploymentStatus,
                    PlannedDepartureAt = t.Request?.ExpectedDate ?? DateTime.UtcNow.AddDays(2),
                    RejectionReason = t.RejectionReason,
                    EarliestDepartureDate = t.EarliestDepartureDate,
                    DocumentExpiryDate = t.DocumentExpiryDate,
                    SpecialistLegalNote = t.SpecialistLegalNote,
                    ResourcesConfirmedAt = t.ResourcesConfirmedAt,
                    ResourcesConfirmedBy = t.ResourcesConfirmedBy,
                    DepartureApprovedAt = t.DepartureApprovedAt,
                    DepartureApprovedBy = t.DepartureApprovedBy,
                    IsOperationsReady = conditions.IsOperationsReady,
                    IsLegalReady = conditions.IsLegalReady,
                    Conditions = conditions
                });
            }

            return list;
        }

        public async Task<RouteCalculateResponseDto?> GetManagerTripRouteAsync(string tripId)
        {
            return await GetRouteVersionDetailAsync(120);
        }

        public async Task<bool> ApproveRouteVersionAsync(string tripId, int routeVersionId, ManagerApproveRouteDto dto)
        {
            var trip = await _context.TripPlans.FindAsync(tripId);
            if (trip == null) return false;

            // Nấc 1 (Bước 4): Phê duyệt phương án lộ trình & dự toán (PLAN_APPROVED)
            // Không ép buộc phải có mã vé máy bay BOOKED tại bước này
            trip.Status = "PLAN_APPROVED";
            trip.RouteStatus = "APPROVED";
            trip.RouteApprovedAt = DateTime.UtcNow;
            trip.RouteApprovedBy = dto?.ApprovedBy ?? "USR_MGR_01";
            trip.RejectionReason = null;
            trip.RouteReturnReason = null;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ReturnRouteVersionAsync(string tripId, int routeVersionId, ManagerReturnRouteDto dto)
        {
            var trip = await _context.TripPlans.FindAsync(tripId);
            if (trip == null) return false;

            // Quản lý từ chối: Cập nhật trạng thái RETURNED và lưu vết lý do từ chối
            trip.Status = "RETURNED";
            trip.RouteStatus = "RETURNED";
            trip.RouteReturnReason = dto.Reason;
            trip.RejectionReason = dto.Reason;
            await _context.SaveChangesAsync();
            return true;
        }

    }
}