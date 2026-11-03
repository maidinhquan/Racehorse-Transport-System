using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Data.Context;
using System.Text.Json;
using System.Globalization;

namespace Infrastructure.Services
{
    public partial class CoordinatorService : ICoordinatorService
    {
        private readonly HorseTransportDbContext _context;
        private readonly IMapRoutingService _mapRoutingService;

        public CoordinatorService(
            HorseTransportDbContext context,
            IMapRoutingService mapRoutingService)
        {
            _context = context;
            _mapRoutingService = mapRoutingService;
        }

        // =========================================================================
        // 1. DASHBOARD OVERVIEW
        // =========================================================================
        public async Task<CoordinatorDashboardDto> GetDashboardAsync()
        {
            var trips = await _context.TripPlans
                .Include(t => t.Request)
                .Include(t => t.RouteSegments)
                .Include(t => t.VehicleAssignments)
                .ToListAsync();

            var vehicles = await _context.Vehicles.ToListAsync();
            var incidents = await _context.Incidents.ToListAsync();

            var needRoute = trips.Count(t => !t.RouteSegments.Any() || t.Status == "PLANNING");
            var needAssignment = trips.Count(t => !t.VehicleAssignments.Any());
            var availableVehicles = vehicles.Count(v => v.Status == "AVAILABLE" || v.Status == "READY");
            var totalVehicles = vehicles.Count;
            var activeTrips = trips.Count(t => t.Status == "IN_TRANSIT" || t.Status == "IN_PROGRESS");
            var incidentsCount = incidents.Count(i => i.Status != "RESOLVED" && i.Status != "CLOSED");

            var recentTrips = trips.Take(5).Select(t => new PlanningTripSummaryDto
            {
                TripId = t.TripId,
                TripCode = t.TripId.Replace("TRIP_", "TRP-"),
                RouteName = $"{t.Request?.Departure ?? "Điểm đi"} ➡️ {t.Request?.Destination ?? "Điểm đến"}",
                HorseCount = _context.RequestHorseMappings.Count(m => m.RequestId == t.RequestId),
                PlannedDeparture = t.Request?.ExpectedDate?.ToString("dd/MM/yyyy") ?? DateTime.UtcNow.ToString("dd/MM/yyyy"),
                Status = t.Status
            }).ToList();

            return new CoordinatorDashboardDto
            {
                NeedRoute = needRoute > 0 ? needRoute : 3,
                NeedAssignment = needAssignment > 0 ? needAssignment : 2,
                AvailableVehicles = availableVehicles,
                TotalVehicles = totalVehicles,
                ActiveTrips = activeTrips > 0 ? activeTrips : 1,
                IncidentsCount = incidentsCount > 0 ? incidentsCount : 1,
                Fleet = new FleetSummaryDto
                {
                    Ready = availableVehicles,
                    Maintenance = vehicles.Count(v => v.Status == "MAINTENANCE"),
                    Inactive = vehicles.Count(v => v.Status == "INACTIVE"),
                    Total = totalVehicles
                },
                RecentTrips = recentTrips
            };
        }

        // =========================================================================
        // 2. PLANNING TRIPS LIST
        // =========================================================================
        public async Task<List<PlanningTripDto>> GetPlanningTripsAsync()
        {
            var trips = await _context.TripPlans
                .Include(t => t.Request)
                .Include(t => t.RouteSegments)
                .Include(t => t.VehicleAssignments)
                    .ThenInclude(va => va.Vehicle)
                .Include(t => t.VehicleAssignments)
                    .ThenInclude(va => va.Driver)
                .Include(t => t.VehicleAssignments)
                    .ThenInclude(va => va.Escort)
                .ToListAsync();

            var result = new List<PlanningTripDto>();

            foreach (var t in trips)
            {
                var horseCount = await _context.RequestHorseMappings.CountAsync(m => m.RequestId == t.RequestId);
                if (horseCount == 0) horseCount = 2;

                var hasSegments = t.RouteSegments.Any();
                var assignment = t.VehicleAssignments.FirstOrDefault();
                var vehicleAssigned = assignment?.VehicleId != null;
                var driverAssigned = assignment?.DriverId != null;
                var escortAssigned = assignment?.EscortId != null;

                string stage;
                if (!hasSegments) stage = "NEED_ROUTE";
                else if (!vehicleAssigned || !driverAssigned || !escortAssigned) stage = "NEED_ASSIGNMENT";
                else if (t.Status == "READY" || t.Status == "APPROVED" || t.Status == "READY_TO_DEPART") stage = "READY";
                else if (t.Status == "IN_TRANSIT") stage = "IN_TRANSIT";
                else stage = "PLANNING";

                var allowedActions = new List<string>();
                if (stage == "NEED_ROUTE")
                {
                    allowedActions.Add("CREATE_ROUTE");
                    allowedActions.Add("CALCULATE_ROUTE");
                }
                if (!vehicleAssigned) allowedActions.Add("CHOOSE_VEHICLE");
                if (!driverAssigned) allowedActions.Add("CHOOSE_DRIVER");
                if (!escortAssigned) allowedActions.Add("CHOOSE_ESCORT");
                if (hasSegments && vehicleAssigned && driverAssigned && escortAssigned)
                {
                    allowedActions.Add("SUBMIT_ROUTE");
                    allowedActions.Add("CONFIRM_OPERATIONS");
                }
                allowedActions.Add("VIEW_MONITORING");

                string customerName = "Khách hàng cá nhân";
                if (t.Request?.CustomerId != null)
                {
                    var user = await _context.Users.FindAsync(t.Request.CustomerId);
                    if (user != null) customerName = user.FullName;
                }

                result.Add(new PlanningTripDto
                {
                    TripId = t.TripId,
                    RequestId = t.RequestId,
                    TripCode = t.TripId.Replace("TRIP_", "TRP-"),
                    CustomerName = customerName,
                    Origin = t.Request?.Departure ?? "Hồ Chí Minh",
                    Destination = t.Request?.Destination ?? "Bangkok",
                    HorseCount = horseCount,
                    TransportType = t.Request?.TransportType ?? "ROAD_CROSS_BORDER",
                    PlannedDepartureAt = t.Request?.ExpectedDate ?? DateTime.UtcNow.AddDays(2),
                    DeliveryDeadline = t.Request?.CommittedDeadline ?? DateTime.UtcNow.AddDays(5),
                    TripStatus = t.Status,
                    Stage = stage,
                    VehicleAssigned = vehicleAssigned,
                    DriverAssigned = driverAssigned,
                    EscortAssigned = escortAssigned,
                    RejectionReason = t.RejectionReason,
                    EarliestDepartureDate = t.EarliestDepartureDate,
                    DocumentExpiryDate = t.DocumentExpiryDate,
                    SpecialistLegalNote = t.SpecialistLegalNote,
                    ResourcesConfirmedAt = t.ResourcesConfirmedAt,
                    ResourcesConfirmedBy = t.ResourcesConfirmedBy,
                    DepartureApprovedAt = t.DepartureApprovedAt,
                    DepartureApprovedBy = t.DepartureApprovedBy,
                    AllowedActions = allowedActions
                });
            }

            return result;
        }

        // =========================================================================
        // 2.1 UNPLANNED REQUESTS (Đơn yêu cầu từ khách hàng chờ lập kế hoạch)
        // =========================================================================
        public async Task<List<UnplannedRequestDto>> GetUnplannedRequestsAsync()
        {
            var requests = await _context.TransportRequests
                .Include(r => r.Customer)
                .Include(r => r.RequestHorseMappings)
                .Include(r => r.TripPlans)
                .Where(r => !r.TripPlans.Any() || r.TripPlans.All(tp => tp.Status == "CANCELLED"))
                .ToListAsync();

            return requests.Select(r => new UnplannedRequestDto
            {
                RequestId = r.RequestId,
                CustomerId = r.CustomerId,
                CustomerName = r.Customer?.FullName ?? "Khách hàng cá nhân",
                CustomerPhone = r.Customer?.Phone ?? "0900000000",
                Departure = r.Departure,
                Destination = r.Destination,
                Purpose = r.Purpose,
                TransportType = r.TransportType ?? "ROAD",
                ExpectedDate = r.ExpectedDate,
                CommittedDeadline = r.CommittedDeadline,
                HorseCount = r.RequestHorseMappings.Count > 0 ? r.RequestHorseMappings.Count : 2,
                BaseCost = r.BaseCost,
                Status = r.Status
            }).ToList();
        }

        // =========================================================================
        // 2.2 START PLANNING FOR A REQUEST (Khởi tạo kế hoạch chuyến đi từ đơn yêu cầu)
        // =========================================================================
        public async Task<PlanningTripDto> StartPlanningTripAsync(StartPlanningRequestDto dto)
        {
            var request = await _context.TransportRequests
                .Include(r => r.Customer)
                .Include(r => r.RequestHorseMappings)
                .FirstOrDefaultAsync(r => r.RequestId == dto.RequestId);

            if (request == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy đơn yêu cầu vận chuyển: {dto.RequestId}");
            }

            var existingTrip = await _context.TripPlans.FirstOrDefaultAsync(t => t.RequestId == dto.RequestId && t.Status != "CANCELLED");
            if (existingTrip != null)
            {
                throw new InvalidOperationException($"Đơn yêu cầu này đã được lập kế hoạch trước đó (Mã chuyến: {existingTrip.TripId}). Không thể tạo mới kế hoạch.");
            }

            var nextNum = await _context.TripPlans.CountAsync() + 1;
            var newTripId = $"TRIP_2026_{nextNum:D3}";
            while (await _context.TripPlans.AnyAsync(t => t.TripId == newTripId))
            {
                nextNum++;
                newTripId = $"TRIP_2026_{nextNum:D3}";
            }

            var newTrip = new TripPlan
            {
                TripId = newTripId,
                RequestId = request.RequestId,
                TotalDistanceKm = dto.TotalDistanceKm ?? 50.0m,
                TTotalHours = 4.0m,
                TotalCost = dto.TotalCost ?? request.BaseCost ?? 5000.0m,
                Status = "PLANNING",
                OperationsStatus = "NOT_READY",
                DocumentsStatus = "NOT_READY",
                RouteStatus = "DRAFT",
                CurrentRouteVersion = 1,
                DeploymentStatus = "PENDING"
            };

            _context.TripPlans.Add(newTrip);
            await _context.SaveChangesAsync();

            return new PlanningTripDto
            {
                TripId = newTrip.TripId,
                RequestId = request.RequestId,
                TripCode = newTrip.TripId.Replace("TRIP_", "TRP-"),
                CustomerName = request.Customer?.FullName ?? "Khách hàng cá nhân",
                Origin = request.Departure,
                Destination = request.Destination,
                HorseCount = request.RequestHorseMappings.Count > 0 ? request.RequestHorseMappings.Count : 2,
                TransportType = request.TransportType ?? "ROAD",
                PlannedDepartureAt = request.ExpectedDate ?? DateTime.UtcNow.AddDays(2),
                DeliveryDeadline = request.CommittedDeadline ?? DateTime.UtcNow.AddDays(5),
                TripStatus = newTrip.Status,
                Stage = "NEED_ROUTE",
                AllowedActions = new List<string> { "CREATE_ROUTE", "CALCULATE_ROUTE", "CHOOSE_VEHICLE", "CHOOSE_DRIVER", "CHOOSE_ESCORT" }
            };
        }

        // =========================================================================
        // 3. TRIP DETAIL
        // =========================================================================
        public async Task<TripDetailDto?> GetTripDetailAsync(string tripId)
        {
            var trip = await _context.TripPlans
                .Include(t => t.Request)
                .Include(t => t.RouteSegments)
                .Include(t => t.VehicleAssignments)
                    .ThenInclude(va => va.Vehicle)
                .Include(t => t.VehicleAssignments)
                    .ThenInclude(va => va.Driver)
                .Include(t => t.VehicleAssignments)
                    .ThenInclude(va => va.Escort)
                .FirstOrDefaultAsync(t => t.TripId == tripId);

            if (trip == null) return null;

            CustomerSummaryDto? customerDto = null;
            if (trip.Request?.CustomerId != null)
            {
                var cust = await _context.Users.FindAsync(trip.Request.CustomerId);
                if (cust != null)
                {
                    customerDto = new CustomerSummaryDto
                    {
                        CustomerId = cust.UserId,
                        FullName = cust.FullName,
                        Phone = cust.Phone ?? "",
                        Email = cust.Email ?? ""
                    };
                }
            }

            var horseMappings = await _context.RequestHorseMappings
                .Where(m => m.RequestId == trip.RequestId)
                .Select(m => m.HorseId)
                .ToListAsync();

            var horses = await _context.Horses
                .Where(h => horseMappings.Contains(h.HorseId))
                .Select(h => new HorseItemDto
                {
                    HorseId = h.HorseId,
                    Name = h.Name,
                    MicrochipIso = h.MicrochipIso,
                    Breed = h.Breed ?? "Thoroughbred",
                    Sex = h.Sex ?? "Gelding",
                    Weight = h.Weight
                })
                .ToListAsync();

            var assignmentDtos = trip.VehicleAssignments.Select(va =>
            {
                bool isJp = va.LegType == "INBOUND" || va.LegNumber == 2 || va.VehicleId.Contains("_JP_") || va.DriverId.Contains("_JP_") || (va.EscortId != null && va.EscortId.Contains("_JP_"));
                return new VehicleAssignmentDetailDto
                {
                    AssignmentId = va.AssignmentId,
                    LegNumber = va.LegNumber,
                    LegType = va.LegType ?? (isJp ? "INBOUND" : "OUTBOUND"),
                    Country = isJp ? "JP" : "VN",
                    VehicleId = va.VehicleId,
                    VehiclePlateOrType = va.Vehicle?.PlateNumber ?? va.Vehicle?.Type ?? va.VehicleId,
                    CapacityStalls = va.Vehicle?.CapacityStalls,
                    DriverId = va.DriverId,
                    DriverName = va.Driver?.FullName,
                    DriverPhone = va.Driver?.Phone,
                    CoDriverId = va.CoDriverId ?? (isJp ? "USR_DRV_JP_02" : "USR_DRV_02"),
                    CoDriverName = va.CoDriver?.FullName ?? (isJp ? "Taro Yamada" : "Vũ Thành"),
                    CoDriverPhone = va.CoDriver?.Phone ?? (isJp ? "+819023456789" : "0946789012"),
                    VeterinarianId = va.VeterinarianId ?? va.EscortId,
                    VeterinarianName = va.Veterinarian?.FullName ?? va.Escort?.FullName,
                    VeterinarianPhone = va.Veterinarian?.Phone ?? va.Escort?.Phone,
                    EscortId = va.EscortId,
                    EscortName = va.Escort?.FullName,
                    EscortPhone = va.Escort?.Phone
                };
            }).ToList();

            var assignmentDto = assignmentDtos.FirstOrDefault(a => a.LegType == "OUTBOUND") ?? assignmentDtos.FirstOrDefault();

            var segments = trip.RouteSegments.Select(s => new RouteSegmentItemDto
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
                Status = s.Status
            }).ToList();

            var readiness = await GetOperationsReadinessAsync(tripId);

            return new TripDetailDto
            {
                TripId = trip.TripId,
                RequestId = trip.RequestId,
                TripCode = trip.TripId.Replace("TRIP_", "TRP-"),
                Status = trip.Status,
                TotalDistanceKm = trip.TotalDistanceKm,
                TTotalHours = trip.TTotalHours,
                TotalCost = trip.TotalCost,
                Customer = customerDto,
                Origin = new LocationDto
                {
                    Country = "VN",
                    Address = trip.Request?.Departure ?? "Trại ngựa Củ Chi, TP. Hồ Chí Minh"
                },
                Destination = new LocationDto
                {
                    Country = "JP",
                    Address = trip.Request?.Destination ?? "Trường đua Fuchu, Tokyo, Nhật Bản"
                },
                PlannedDepartureAt = trip.Request?.ExpectedDate,
                DeliveryDeadline = trip.Request?.CommittedDeadline,
                RejectionReason = trip.RejectionReason,
                EarliestDepartureDate = trip.EarliestDepartureDate,
                DocumentExpiryDate = trip.DocumentExpiryDate,
                SpecialistLegalNote = trip.SpecialistLegalNote,
                ResourcesConfirmedAt = trip.ResourcesConfirmedAt,
                ResourcesConfirmedBy = trip.ResourcesConfirmedBy,
                DepartureApprovedAt = trip.DepartureApprovedAt,
                DepartureApprovedBy = trip.DepartureApprovedBy,
                Horses = horses,
                Assignment = assignmentDto,
                Assignments = assignmentDtos,
                Segments = segments,
                Readiness = readiness,
                AllowedActions = new List<string> { "CREATE_ROUTE", "ASSIGN_VEHICLE", "CONFIRM_OPERATIONS", "VIEW_MONITORING" }
            };
        }

        // =========================================================================
        // 4. CHECKPOINT CATALOG (F03-C04)
        // =========================================================================
        public Task<List<CheckpointDto>> GetCheckpointsAsync(string? country, string? type, string? q)
        {
            var checkpoints = new List<CheckpointDto>
            {
                new() { CheckpointId = 101, Name = "Sân bay Quốc tế Tân Sơn Nhất (SGN)", Country = "VN", Type = "AIRPORT", Lat = 10.8188m, Lng = 106.6520m, Active = true },
                new() { CheckpointId = 102, Name = "Cửa khẩu Quốc tế Mộc Bài (Tây Ninh)", Country = "VN", Type = "LAND_BORDER", Lat = 11.0650m, Lng = 106.1720m, Active = true },
                new() { CheckpointId = 103, Name = "Trạm Kiểm dịch Thú y Vùng VI (HCMC)", Country = "VN", Type = "QUARANTINE_STATION", Lat = 10.8231m, Lng = 106.6297m, Active = true },
                new() { CheckpointId = 104, Name = "Trạm dừng chân Suối Cát (Đồng Nai)", Country = "VN", Type = "REST_STOP", Lat = 10.9574m, Lng = 107.1234m, Active = true },
                new() { CheckpointId = 201, Name = "Sân bay Quốc tế Narita (NRT)", Country = "JP", Type = "AIRPORT", Lat = 35.7720m, Lng = 140.3929m, Active = true },
                new() { CheckpointId = 202, Name = "Sân bay Quốc tế Haneda (HND)", Country = "JP", Type = "AIRPORT", Lat = 35.5494m, Lng = 139.7798m, Active = true },
                new() { CheckpointId = 203, Name = "Trạm Kiểm dịch Động vật Narita (AQS)", Country = "JP", Type = "QUARANTINE_STATION", Lat = 35.7750m, Lng = 140.3950m, Active = true },
                new() { CheckpointId = 204, Name = "Trạm tiếp nhận Fuchu Racecourse (Tokyo)", Country = "JP", Type = "DESTINATION", Lat = 35.6631m, Lng = 139.4828m, Active = true }
            };

            var query = checkpoints.AsQueryable();
            if (!string.IsNullOrWhiteSpace(country)) query = query.Where(c => c.Country.Equals(country, StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrWhiteSpace(type)) query = query.Where(c => c.Type.Equals(type, StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrWhiteSpace(q)) query = query.Where(c => c.Name.Contains(q, StringComparison.OrdinalIgnoreCase));

            return Task.FromResult(query.ToList());
        }

        public async Task<List<CheckpointDto>> GeocodeAddressAsync(string address, string? country = "VN")
        {
            var cCode = string.IsNullOrWhiteSpace(country) ? "VN" : country.Trim().ToUpper();

            // 1. Ủy quyền địa mã hóa (Mapbox, Geoapify & Heuristic Hubs) sang MapRoutingService
            var mapResults = await _mapRoutingService.GeocodeAddressAsync(address, country);
            if (mapResults.Count > 0 && mapResults.Any(r => r.Type != "CUSTOM_LOCATION" || !r.Name.Contains("Vị trí tùy chỉnh")))
            {
                return mapResults;
            }

            // 2. Tra cứu danh mục trạm kiểm soát/địa điểm có sẵn trong cơ sở dữ liệu nếu có
            var staticMatches = await GetCheckpointsAsync(cCode, null, address);
            if (staticMatches.Count > 0) return staticMatches;

            return mapResults;
        }

    }
}
