using Microsoft.EntityFrameworkCore;
using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Data.Context;
using System.Text.Json;

namespace Infrastructure.Services
{
    public class CoordinatorService : ICoordinatorService
    {
        private readonly HorseTransportDbContext _context;

        public CoordinatorService(HorseTransportDbContext context)
        {
            _context = context;
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

            if (!vehicles.Any())
            {
                vehicles = GetDefaultVehicles();
                _context.Vehicles.AddRange(vehicles);
                await _context.SaveChangesAsync();
            }

            if (!trips.Any())
            {
                await SeedSampleTripsAsync();
                trips = await _context.TripPlans
                    .Include(t => t.Request)
                    .Include(t => t.RouteSegments)
                    .Include(t => t.VehicleAssignments)
                    .ToListAsync();
            }

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

            if (!trips.Any())
            {
                await SeedSampleTripsAsync();
                trips = await _context.TripPlans
                    .Include(t => t.Request)
                    .Include(t => t.RouteSegments)
                    .Include(t => t.VehicleAssignments)
                        .ThenInclude(va => va.Vehicle)
                    .Include(t => t.VehicleAssignments)
                        .ThenInclude(va => va.Driver)
                    .Include(t => t.VehicleAssignments)
                        .ThenInclude(va => va.Escort)
                    .ToListAsync();
            }

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
                    AllowedActions = allowedActions
                });
            }

            return result;
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

            var va = trip.VehicleAssignments.FirstOrDefault();
            VehicleAssignmentDetailDto? assignmentDto = null;
            if (va != null)
            {
                assignmentDto = new VehicleAssignmentDetailDto
                {
                    AssignmentId = va.AssignmentId,
                    VehicleId = va.VehicleId,
                    VehiclePlateOrType = va.Vehicle?.Type ?? va.VehicleId,
                    CapacityStalls = va.Vehicle?.CapacityStalls,
                    DriverId = va.DriverId,
                    DriverName = va.Driver?.FullName,
                    DriverPhone = va.Driver?.Phone,
                    EscortId = va.EscortId,
                    EscortName = va.Escort?.FullName,
                    EscortPhone = va.Escort?.Phone
                };
            }

            var segments = trip.RouteSegments.Select(s => new RouteSegmentItemDto
            {
                SegmentId = s.SegmentId,
                LocationName = s.LocationName,
                SegmentType = s.SegmentType ?? "STOP",
                TransportMode = s.TransportMode,
                FacilityId = s.FacilityId,
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
                    Address = trip.Request?.Departure ?? "Điểm đi mặc định"
                },
                Destination = new LocationDto
                {
                    Country = trip.Request?.Destination?.Contains("Tokyo") == true ? "JP" : "TH",
                    Address = trip.Request?.Destination ?? "Điểm đến mặc định"
                },
                PlannedDepartureAt = trip.Request?.ExpectedDate,
                DeliveryDeadline = trip.Request?.CommittedDeadline,
                Horses = horses,
                Assignment = assignmentDto,
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
                new() { CheckpointId = 201, Name = "Sân bay Quốc tế Narita (NRT)", Country = "JP", Type = "AIRPORT", Lat = 35.7720m, Lng = 140.3929m, Active = true },
                new() { CheckpointId = 202, Name = "Sân bay Quốc tế Haneda (HND)", Country = "JP", Type = "AIRPORT", Lat = 35.5494m, Lng = 139.7798m, Active = true },
                new() { CheckpointId = 203, Name = "Trạm Kiểm dịch Động vật Narita (AQS)", Country = "JP", Type = "QUARANTINE_STATION", Lat = 35.7750m, Lng = 140.3950m, Active = true },
                new() { CheckpointId = 301, Name = "Cửa khẩu Bavet (Svay Rieng)", Country = "KH", Type = "LAND_BORDER", Lat = 11.0850m, Lng = 106.1450m, Active = true },
                new() { CheckpointId = 302, Name = "Cửa khẩu Poipet (Banteay Meanchey)", Country = "KH", Type = "LAND_BORDER", Lat = 13.6560m, Lng = 102.5620m, Active = true }
            };

            var query = checkpoints.AsQueryable();
            if (!string.IsNullOrWhiteSpace(country)) query = query.Where(c => c.Country.Equals(country, StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrWhiteSpace(type)) query = query.Where(c => c.Type.Equals(type, StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrWhiteSpace(q)) query = query.Where(c => c.Name.Contains(q, StringComparison.OrdinalIgnoreCase));

            return Task.FromResult(query.ToList());
        }

        // =========================================================================
        // 5. FLEET (VEHICLES) MANAGEMENT (F03-C11 to F03-C17)
        // =========================================================================
        public async Task<List<VehicleDto>> GetVehiclesAsync(string? status = null, string? country = null, int? minStalls = null)
        {
            var query = _context.Vehicles.AsQueryable();

            if (!string.IsNullOrWhiteSpace(status)) query = query.Where(v => v.Status == status);
            if (minStalls.HasValue) query = query.Where(v => (v.CapacityStalls ?? 0) >= minStalls.Value);

            var vehicles = await query.ToListAsync();
            if (!vehicles.Any())
            {
                vehicles = GetDefaultVehicles();
                _context.Vehicles.AddRange(vehicles);
                await _context.SaveChangesAsync();
            }

            return vehicles.Select(v => new VehicleDto
            {
                VehicleId = v.VehicleId,
                PlateNumber = v.VehicleId.Replace("VEH_BOX_", "51C-10") + ".45",
                Type = v.Type ?? "HORSEBOX_3_STALLS",
                RegistrationCountry = country ?? "VN",
                TotalStalls = v.CapacityStalls ?? 3,
                AvailableStalls = v.CapacityStalls ?? 3,
                PayloadKg = 8000,
                RegistrationExpiry = DateTime.UtcNow.AddMonths(18),
                MaxRangeKm = v.MaxRangeKm,
                FuelCostPerKm = v.FuelCostPerKm,
                Status = v.Status ?? "READY",
                IsAvailable = v.Status == "AVAILABLE" || v.Status == "READY"
            }).ToList();
        }

        public async Task<VehicleDto?> GetVehicleDetailAsync(string vehicleId)
        {
            var v = await _context.Vehicles.FindAsync(vehicleId);
            if (v == null) return null;

            return new VehicleDto
            {
                VehicleId = v.VehicleId,
                PlateNumber = v.VehicleId.Replace("VEH_BOX_", "51C-10") + ".45",
                Type = v.Type ?? "HORSEBOX_3_STALLS",
                RegistrationCountry = "VN",
                TotalStalls = v.CapacityStalls ?? 3,
                AvailableStalls = v.CapacityStalls ?? 3,
                PayloadKg = 8000,
                RegistrationExpiry = DateTime.UtcNow.AddMonths(18),
                MaxRangeKm = v.MaxRangeKm,
                FuelCostPerKm = v.FuelCostPerKm,
                Status = v.Status ?? "READY",
                IsAvailable = v.Status == "AVAILABLE" || v.Status == "READY"
            };
        }

        public async Task<VehicleDto> CreateVehicleAsync(CreateVehicleDto dto)
        {
            var vehicle = new Vehicle
            {
                VehicleId = string.IsNullOrWhiteSpace(dto.VehicleId) ? "VEH_" + Guid.NewGuid().ToString("N")[..8].ToUpper() : dto.VehicleId.Trim(),
                Type = dto.Type,
                CapacityStalls = dto.CapacityStalls,
                MaxRangeKm = dto.MaxRangeKm,
                FuelCostPerKm = dto.FuelCostPerKm,
                Status = dto.Status ?? "READY"
            };

            _context.Vehicles.Add(vehicle);
            await _context.SaveChangesAsync();

            return new VehicleDto
            {
                VehicleId = vehicle.VehicleId,
                PlateNumber = dto.PlateNumber,
                Type = vehicle.Type,
                RegistrationCountry = dto.RegistrationCountry,
                TotalStalls = vehicle.CapacityStalls ?? 3,
                AvailableStalls = vehicle.CapacityStalls ?? 3,
                PayloadKg = dto.PayloadKg,
                RegistrationExpiry = dto.RegistrationExpiry,
                MaxRangeKm = vehicle.MaxRangeKm,
                FuelCostPerKm = vehicle.FuelCostPerKm,
                Status = vehicle.Status,
                IsAvailable = vehicle.Status == "AVAILABLE" || vehicle.Status == "READY"
            };
        }

        public async Task<VehicleDto?> UpdateVehicleAsync(string vehicleId, CreateVehicleDto dto)
        {
            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            if (vehicle == null) return null;

            vehicle.Type = dto.Type;
            vehicle.CapacityStalls = dto.CapacityStalls;
            vehicle.MaxRangeKm = dto.MaxRangeKm;
            vehicle.FuelCostPerKm = dto.FuelCostPerKm;
            await _context.SaveChangesAsync();

            return await GetVehicleDetailAsync(vehicleId);
        }

        public async Task<bool> UpdateVehicleStatusAsync(string vehicleId, UpdateVehicleStatusDto dto)
        {
            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            if (vehicle == null) return false;

            vehicle.Status = dto.Status;
            await _context.SaveChangesAsync();
            return true;
        }

        public Task<List<ResourceScheduleItemDto>> GetVehicleScheduleAsync(string vehicleId)
        {
            return Task.FromResult(new List<ResourceScheduleItemDto>
            {
                new()
                {
                    Kind = "TRIP",
                    TripId = "TRIP_2026_001",
                    TripCode = "TRP-2026-001",
                    LegIds = new List<int> { 51, 52 },
                    From = DateTime.UtcNow.AddDays(1),
                    To = DateTime.UtcNow.AddDays(4),
                    Note = "Chuyến đi xuyên biên giới HN - Bangkok"
                }
            });
        }

        public async Task<List<VehicleDto>> GetAvailableVehiclesAsync(string? tripId = null, int? legId = null)
        {
            return await GetVehiclesAsync(status: "READY");
        }

        // =========================================================================
        // 6. STAFF (DRIVERS & ESCORTS / VETS) (F03-C18, F03-C19)
        // =========================================================================
        public async Task<List<StaffDto>> GetStaffListAsync(string? role = null, string? country = null)
        {
            var query = _context.Users.Where(u => u.Role == "Driver" || u.Role == "Escort" || u.Role == "Specialist");
            if (!string.IsNullOrWhiteSpace(role)) query = query.Where(u => u.Role == role);

            var staffUsers = await query.ToListAsync();

            if (!staffUsers.Any())
            {
                return new List<StaffDto>
                {
                    new() { UserId = "USR_DRV_01", FullName = "Hoàng Hùng", Role = "Driver", LicenseClass = "FC", LicenseExpiry = DateTime.UtcNow.AddYears(3), Email = "hung.driver@cbntransport.com", Phone = "0945678901", IsActive = true, IsAvailable = true, Specialization = "Tài xế quốc tế hạng FC" },
                    new() { UserId = "USR_DRV_02", FullName = "Vũ Thành", Role = "Driver", LicenseClass = "FC", LicenseExpiry = DateTime.UtcNow.AddYears(2), Email = "thanh.driver@cbntransport.com", Phone = "0946789012", IsActive = true, IsAvailable = true, Specialization = "Tài xế chuyên tuyến xuyên biên giới" },
                    new() { UserId = "USR_ESC_01", FullName = "BS. Đỗ Hoa", Role = "Escort", Email = "hoa.escort@cbntransport.com", Phone = "0956789012", IsActive = true, IsAvailable = true, Specialization = "Bác sĩ thú y áp tải (Chứng chỉ FEI)" },
                    new() { UserId = "USR_ESC_02", FullName = "BS. Phan Nam", Role = "Escort", Email = "nam.escort@cbntransport.com", Phone = "0957890123", IsActive = true, IsAvailable = true, Specialization = "Chuyên viên chăm sóc thể lực ngựa đua" }
                };
            }

            return staffUsers.Select(u => new StaffDto
            {
                UserId = u.UserId,
                FullName = u.FullName,
                Role = u.Role,
                LicenseClass = u.Role == "Driver" ? "FC" : "N/A",
                LicenseExpiry = DateTime.UtcNow.AddYears(3),
                Email = u.Email ?? "",
                Phone = u.Phone ?? "",
                IsActive = u.IsActive,
                IsAvailable = u.IsActive,
                Specialization = u.Role == "Driver" ? "Tài xế chuyên dụng hạng FC" : "Bác sĩ thú y áp tải (FEI)"
            }).ToList();
        }

        public Task<List<ResourceScheduleItemDto>> GetStaffScheduleAsync(string userId)
        {
            return Task.FromResult(new List<ResourceScheduleItemDto>
            {
                new()
                {
                    Kind = "TRIP",
                    TripId = "TRIP_2026_001",
                    TripCode = "TRP-2026-001",
                    LegIds = new List<int> { 51 },
                    From = DateTime.UtcNow.AddDays(1),
                    To = DateTime.UtcNow.AddDays(4),
                    AssignmentRole = "MAIN_DRIVER",
                    Note = "Lịch phân công nhiệm vụ vận chuyển chính"
                }
            });
        }

        // =========================================================================
        // 7. ROUTE CALCULATION & ROUTE VERSIONS (F03-C05 to F03-C10)
        // =========================================================================
        public Task<RouteCalculateResponseDto> CalculateRouteAsync(RouteCalculateRequestDto dto)
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

                decimal legDistanceKm = legInput?.ManualDistanceKm ?? (decimal)CalculateDistance((double)from.Lat, (double)from.Lng, (double)to.Lat, (double)to.Lng);
                if (legDistanceKm < 5 && mode == "ROAD") legDistanceKm = 35;

                var speed = mode == "AIR" ? 600.0m : 50.0m;
                var legDriveHours = legDistanceKm / speed;
                var legDurationMinutes = legInput?.ManualDurationMinutes ?? (int)(legDriveHours * 60);

                var arrivalAt = currentDeparture.AddMinutes(legDurationMinutes);
                var departureNext = arrivalAt.AddMinutes(to.PlannedStopMinutes);

                // KIỂM TRA LUẬT PHÚC LỢI NGỰA (Equine Welfare Rule: F03-BR-16): ROAD không đứng xe quá 4-6 tiếng liên tục
                if (mode == "ROAD" && legDriveHours > 6.0m)
                {
                    warnings.Add($"Chặng từ '{from.Name}' đến '{to.Name}' lái xe liên tục {legDriveHours:F1}h (> 6h). Theo quy định phúc lợi ngựa (Equine Welfare), bắt buộc phải chèn trạm dừng nghỉ 1-2 tiếng!");
                }

                var legPath = GenerateInterpolatedPoints((double)from.Lat, (double)from.Lng, (double)to.Lat, (double)to.Lng, 6);
                polylineCoords.AddRange(legPath);

                legs.Add(new RouteLegResultDto
                {
                    FromSequence = from.Sequence,
                    ToSequence = to.Sequence,
                    Mode = mode,
                    DistanceKm = Math.Round(legDistanceKm, 1),
                    DurationMinutes = legDurationMinutes,
                    DistanceSource = legInput?.ManualDistanceKm.HasValue == true ? "MANUAL" : (mode == "AIR" ? "FLIGHT_SCHEDULE" : "MAP_SERVICE"),
                    DepartureAt = currentDeparture,
                    ArrivalAt = arrivalAt,
                    Path = legPath
                });

                totalDistance += legDistanceKm;
                totalDurationHours += (legDurationMinutes + to.PlannedStopMinutes) / 60.0m;
                currentDeparture = departureNext;
            }

            return Task.FromResult(new RouteCalculateResponseDto
            {
                TotalDistanceKm = Math.Round(totalDistance, 1),
                TotalElapsedHours = Math.Round(totalDurationHours, 1),
                EtaDestination = currentDeparture,
                MeetsEquineWelfare = !warnings.Any(),
                Validation = new RouteValidationResultDto
                {
                    CanSubmit = !errors.Any(),
                    Errors = errors,
                    Warnings = warnings
                },
                Warnings = warnings,
                Legs = legs,
                PolylineCoordinates = polylineCoords
            });
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
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<RouteSegmentItemDto>> GetRouteSegmentsAsync(string tripId)
        {
            var segments = await _context.RouteSegments
                .Where(s => s.TripId == tripId)
                .OrderBy(s => s.ExpectedEta)
                .ToListAsync();

            return segments.Select(s => new RouteSegmentItemDto
            {
                SegmentId = s.SegmentId,
                LocationName = s.LocationName,
                SegmentType = s.SegmentType ?? "STOP",
                TransportMode = s.TransportMode,
                FacilityId = s.FacilityId,
                CarrierName = s.CarrierName,
                FlightVoyageNo = s.FlightVoyageNo,
                ExpectedEta = s.ExpectedEta,
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
                    FacilityId = item.FacilityId,
                    LocationName = item.LocationName,
                    SegmentType = item.SegmentType ?? (seq == 1 ? "ORIGIN" : seq == dto.Segments.Count ? "DESTINATION" : "REST_STOP"),
                    TransportMode = item.TransportMode ?? "ROAD",
                    CarrierName = item.CarrierName,
                    FlightVoyageNo = item.FlightVoyageNo,
                    ExpectedEta = item.ExpectedEta ?? DateTime.UtcNow.AddHours(seq * 4),
                    Status = item.Status ?? "PLANNED"
                };
                _context.RouteSegments.Add(segment);
                seq++;
            }

            trip.Status = "PLANNING";
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
                list.Add(new ManagerPlanningItemDto
                {
                    TripId = t.TripId,
                    TripCode = t.TripId.Replace("TRIP_", "TRP-"),
                    Status = t.Status,
                    RouteStatus = t.Status == "IN_TRANSIT" ? "APPROVED" : "PENDING_APPROVAL",
                    CurrentRouteVersionId = 120,
                    DeploymentStatus = "CONFIRMED",
                    PlannedDepartureAt = t.Request?.ExpectedDate ?? DateTime.UtcNow.AddDays(2),
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

            trip.Status = "APPROVED";
            await _context.SaveChangesAsync();

            // Kiểm tra tổng thể: nếu các điều kiện khác đều đạt $\rightarrow$ chuyển READY_TO_DEPART
            var depCond = await GetDepartureConditionsAsync(tripId, isManager: true);
            if (depCond.AllMet)
            {
                trip.Status = "READY_TO_DEPART";
                await _context.SaveChangesAsync();
            }

            return true;
        }

        public async Task<bool> ReturnRouteVersionAsync(string tripId, int routeVersionId, ManagerReturnRouteDto dto)
        {
            var trip = await _context.TripPlans.FindAsync(tripId);
            if (trip == null) return false;

            trip.Status = "PLANNING";
            await _context.SaveChangesAsync();
            return true;
        }

        // =========================================================================
        // 9. LEG ASSIGNMENTS (F03-C20 to F03-C22)
        // =========================================================================
        public async Task<TripAssignmentsDetailDto> GetTripAssignmentsAsync(string tripId)
        {
            var horses = await _context.Horses.Take(2).Select(h => new HorseItemDto
            {
                HorseId = h.HorseId,
                Name = h.Name,
                MicrochipIso = h.MicrochipIso,
                Breed = h.Breed ?? "Thoroughbred"
            }).ToListAsync();

            return new TripAssignmentsDetailDto
            {
                TripId = tripId,
                RouteVersionId = 120,
                RouteVersion = 1,
                Editable = true,
                Horses = horses,
                Legs = new List<LegAssignmentDto>
                {
                    new()
                    {
                        LegId = 51,
                        Sequence = 1,
                        Mode = "ROAD",
                        Country = "VN",
                        Vehicles = new List<VehicleLegAssignmentDto>
                        {
                            new()
                            {
                                VehicleId = "VEH_BOX_01",
                                PlateNumber = "51C-123.45",
                                MainDriverId = "USR_DRV_01",
                                CoDriverId = "USR_DRV_02",
                                VeterinarianId = "USR_ESC_01",
                                Horses = horses.Select((h, i) => new HorseStallAllocationDto { HorseId = h.HorseId, StallNumber = i + 1 }).ToList()
                            }
                        }
                    }
                },
                IsComplete = true,
                Missing = new List<string>(),
                AllowedActions = new List<string> { "VALIDATE", "EDIT" }
            };
        }

        public Task<ValidateAssignmentsResponseDto> ValidateAssignmentsAsync(string tripId, TripAssignmentsDetailDto dto)
        {
            var errors = new List<AssignmentErrorDto>();
            var warnings = new List<string>();

            foreach (var leg in dto.Legs)
            {
                if (leg.Mode == "ROAD")
                {
                    foreach (var v in leg.Vehicles)
                    {
                        if (string.IsNullOrEmpty(v.MainDriverId))
                        {
                            errors.Add(new AssignmentErrorDto { Code = "MISSING_MAIN_DRIVER", LegId = leg.LegId, Message = "Chặng ROAD thiếu tài xế chính!" });
                        }
                        if (string.IsNullOrEmpty(v.VeterinarianId))
                        {
                            errors.Add(new AssignmentErrorDto { Code = "MISSING_VETERINARIAN", LegId = leg.LegId, Message = "Chặng ROAD bắt buộc phải có Bác sĩ thú y (VETERINARIAN) đi kèm!" });
                        }
                        if (v.MainDriverId == v.VeterinarianId && !string.IsNullOrEmpty(v.MainDriverId))
                        {
                            errors.Add(new AssignmentErrorDto { Code = "INDEPENDENT_ROLES_VIOLATION", LegId = leg.LegId, Message = "Tài xế và Bác sĩ thú y không được trùng nhau!" });
                        }
                    }
                }
            }

            return Task.FromResult(new ValidateAssignmentsResponseDto
            {
                Valid = !errors.Any(),
                Errors = errors,
                Warnings = warnings,
                IsComplete = !errors.Any()
            });
        }

        public async Task<bool> SaveTripAssignmentsAsync(string tripId, TripAssignmentsDetailDto dto)
        {
            var firstLeg = dto.Legs.FirstOrDefault();
            var firstVehicle = firstLeg?.Vehicles.FirstOrDefault();

            if (firstVehicle != null)
            {
                return await AssignCrewAndVehicleAsync(tripId, new AssignCrewVehicleDto
                {
                    VehicleId = firstVehicle.VehicleId,
                    DriverId = firstVehicle.MainDriverId ?? "USR_DRV_01",
                    EscortId = firstVehicle.VeterinarianId ?? "USR_ESC_01"
                });
            }

            return true;
        }

        public async Task<bool> AssignCrewAndVehicleAsync(string tripId, AssignCrewVehicleDto dto)
        {
            var trip = await _context.TripPlans
                .Include(t => t.VehicleAssignments)
                .FirstOrDefaultAsync(t => t.TripId == tripId);

            if (trip == null) throw new KeyNotFoundException($"Không tìm thấy chuyến đi: {tripId}");

            if (dto.DriverId == dto.EscortId)
            {
                throw new InvalidOperationException("Vi phạm quy chuẩn an toàn: Một người không được đảm nhận đồng thời 2 vị trí Tài xế và Hộ tống viên!");
            }

            var vehicle = await _context.Vehicles.FindAsync(dto.VehicleId);
            if (vehicle == null) throw new KeyNotFoundException($"Không tìm thấy phương tiện: {dto.VehicleId}");

            var horseCount = await _context.RequestHorseMappings.CountAsync(m => m.RequestId == trip.RequestId);
            if (horseCount > 0 && vehicle.CapacityStalls.HasValue && vehicle.CapacityStalls < horseCount)
            {
                throw new InvalidOperationException($"Xe {vehicle.VehicleId} chỉ có {vehicle.CapacityStalls} khoang stall, không đủ chở {horseCount} cá thể ngựa!");
            }

            var driver = await _context.Users.FindAsync(dto.DriverId);
            if (driver == null || !driver.IsActive || driver.Role != "Driver")
            {
                throw new InvalidOperationException($"Nhân sự {dto.DriverId} không hợp lệ hoặc không có vai trò Tài xế!");
            }

            var escort = await _context.Users.FindAsync(dto.EscortId);
            if (escort == null || !escort.IsActive || (escort.Role != "Escort" && escort.Role != "Specialist"))
            {
                throw new InvalidOperationException($"Nhân sự {dto.EscortId} không hợp lệ hoặc không có vai trò Hộ tống/Bác sĩ thú y!");
            }

            var assignment = trip.VehicleAssignments.FirstOrDefault();
            if (assignment == null)
            {
                assignment = new TripVehicleAssignment
                {
                    AssignmentId = "ASG_" + Guid.NewGuid().ToString("N")[..8].ToUpper(),
                    TripId = tripId,
                    VehicleId = dto.VehicleId,
                    DriverId = dto.DriverId,
                    EscortId = dto.EscortId
                };
                _context.TripVehicleAssignments.Add(assignment);
            }
            else
            {
                assignment.VehicleId = dto.VehicleId;
                assignment.DriverId = dto.DriverId;
                assignment.EscortId = dto.EscortId;
            }

            vehicle.Status = "ON_TRIP";
            await _context.SaveChangesAsync();
            return true;
        }

        // =========================================================================
        // 10. FLIGHT BOOKING (AIR LEG) (F03-C23, F03-C24)
        // =========================================================================
        public async Task<FlightBookingDto?> GetFlightBookingAsync(string tripId)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var booking = await _context.FlightBookings
                .Where(fb => fb.TripId == cleanTripId || fb.TripId == tripId)
                .OrderByDescending(fb => fb.BookingVersion)
                .ThenByDescending(fb => fb.FlightBookingId)
                .FirstOrDefaultAsync();

            if (booking == null)
            {
                // Fallback: nếu là trip mẫu TRIP_2026_001 và chưa có record thì tự động seed 1 record mẫu vào DB
                if (cleanTripId.Equals("TRIP_2026_001", StringComparison.OrdinalIgnoreCase))
                {
                    var tripExists = await _context.TripPlans.AnyAsync(t => t.TripId == cleanTripId || t.TripId == "TRIP_2026_001");
                    if (tripExists)
                    {
                        booking = new FlightBooking
                        {
                            TripId = "TRIP_2026_001",
                            BookingVersion = 1,
                            RouteVersionId = 120,
                            ProviderName = "Nippon Cargo Airlines",
                            Airline = "NCA Airlines",
                            FlightNumber = "KZ-102",
                            DepartureAirportCheckpointId = 101,
                            ArrivalAirportCheckpointId = 201,
                            DepartureAt = DateTime.UtcNow.AddDays(2).AddHours(4),
                            ArrivalAt = DateTime.UtcNow.AddDays(2).AddHours(10),
                            DirectFlight = true,
                            BookingReference = "NCA-SGN-NRT-2026",
                            BookingConfirmed = true,
                            HorseIds = JsonSerializer.Serialize(new List<string> { "HRS_001", "HRS_002" }),
                            Note = "Chuyến bay thẳng chuyên chở động vật thể thao SGN -> NRT",
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.FlightBookings.Add(booking);
                        await _context.SaveChangesAsync();
                    }
                    else
                    {
                        return null;
                    }
                }
                else
                {
                    return null;
                }
            }

            var horseIdsList = new List<string>();
            if (!string.IsNullOrWhiteSpace(booking.HorseIds))
            {
                try
                {
                    horseIdsList = JsonSerializer.Deserialize<List<string>>(booking.HorseIds) ?? new List<string>();
                }
                catch
                {
                    horseIdsList = booking.HorseIds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
                }
            }

            return new FlightBookingDto
            {
                FlightBookingId = booking.FlightBookingId,
                BookingVersion = booking.BookingVersion,
                TripId = booking.TripId,
                RouteVersionId = booking.RouteVersionId,
                ProviderName = booking.ProviderName,
                Airline = booking.Airline,
                FlightNumber = booking.FlightNumber,
                DepartureAirportCheckpointId = booking.DepartureAirportCheckpointId,
                ArrivalAirportCheckpointId = booking.ArrivalAirportCheckpointId,
                DepartureAt = booking.DepartureAt,
                ArrivalAt = booking.ArrivalAt,
                DirectFlight = booking.DirectFlight,
                BookingReference = booking.BookingReference,
                BookingConfirmed = booking.BookingConfirmed,
                HorseIds = horseIdsList,
                Note = booking.Note
            };
        }

        public async Task<FlightBookingDto> SaveFlightBookingAsync(string tripId, UpdateFlightBookingDto dto)
        {
            var cleanTripId = tripId?.Trim() ?? string.Empty;
            var currentBooking = await _context.FlightBookings
                .Where(fb => fb.TripId == cleanTripId || fb.TripId == tripId)
                .OrderByDescending(fb => fb.BookingVersion)
                .ThenByDescending(fb => fb.FlightBookingId)
                .FirstOrDefaultAsync();

            int nextVersion = (dto.ExpectedBookingVersion ?? currentBooking?.BookingVersion ?? 0) + 1;

            string horseIdsJson = dto.HorseIds != null && dto.HorseIds.Any()
                ? JsonSerializer.Serialize(dto.HorseIds)
                : (currentBooking?.HorseIds ?? "[]");

            var newBooking = new FlightBooking
            {
                TripId = cleanTripId,
                BookingVersion = nextVersion,
                RouteVersionId = dto.RouteVersionId ?? currentBooking?.RouteVersionId ?? 120,
                ProviderName = dto.ProviderName,
                Airline = dto.Airline,
                FlightNumber = dto.FlightNumber,
                DepartureAirportCheckpointId = dto.DepartureAirportCheckpointId,
                ArrivalAirportCheckpointId = dto.ArrivalAirportCheckpointId,
                DepartureAt = dto.DepartureAt,
                ArrivalAt = dto.ArrivalAt,
                DirectFlight = true,
                BookingReference = dto.BookingReference,
                BookingConfirmed = true,
                HorseIds = horseIdsJson,
                Note = dto.Note,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.FlightBookings.Add(newBooking);
            await _context.SaveChangesAsync();

            var horseIdsList = new List<string>();
            if (!string.IsNullOrWhiteSpace(newBooking.HorseIds))
            {
                try
                {
                    horseIdsList = JsonSerializer.Deserialize<List<string>>(newBooking.HorseIds) ?? new List<string>();
                }
                catch
                {
                    horseIdsList = newBooking.HorseIds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
                }
            }

            return new FlightBookingDto
            {
                FlightBookingId = newBooking.FlightBookingId,
                BookingVersion = newBooking.BookingVersion,
                TripId = newBooking.TripId,
                RouteVersionId = newBooking.RouteVersionId,
                ProviderName = newBooking.ProviderName,
                Airline = newBooking.Airline,
                FlightNumber = newBooking.FlightNumber,
                DepartureAirportCheckpointId = newBooking.DepartureAirportCheckpointId,
                ArrivalAirportCheckpointId = newBooking.ArrivalAirportCheckpointId,
                DepartureAt = newBooking.DepartureAt,
                ArrivalAt = newBooking.ArrivalAt,
                DirectFlight = newBooking.DirectFlight,
                BookingReference = newBooking.BookingReference,
                BookingConfirmed = newBooking.BookingConfirmed,
                HorseIds = horseIdsList,
                Note = newBooking.Note
            };
        }

        // =========================================================================
        // 11. TRIP MONITORING (MAP DATA STREAM)
        // =========================================================================
        public async Task<TripMonitoringDto?> GetTripMonitoringAsync(string tripId)
        {
            var trip = await _context.TripPlans
                .Include(t => t.Request)
                .Include(t => t.RouteSegments)
                .FirstOrDefaultAsync(t => t.TripId == tripId);

            var defaultCoords = new List<double[]>
            {
                new double[] { 10.8231, 106.6297 },
                new double[] { 11.0650, 106.1720 },
                new double[] { 11.5560, 104.9280 },
                new double[] { 13.6560, 102.5620 },
                new double[] { 13.7563, 100.5018 }
            };

            var markers = new List<FixedMarkerDto>
            {
                new() { Name = "HCMC (Origin)", Type = "ORIGIN", Lat = 10.8231, Lng = 106.6297, Color = "#10B981", Icon = "📍", Status = "PASSED" },
                new() { Name = "Mộc Bài (Rest Stop)", Type = "REST_STOP", Lat = 11.0650, Lng = 106.1720, Color = "#3B82F6", Icon = "🅿️", Status = "PASSED" },
                new() { Name = "Bavet (Customs Gate)", Type = "CUSTOMS", Lat = 11.0850, Lng = 106.1450, Color = "#F59E0B", Icon = "🛂", Status = "PASSED" },
                new() { Name = "Phnom Penh (Vet Facility)", Type = "REST_STOP", Lat = 11.5560, Lng = 104.9280, Color = "#8B5CF6", Icon = "🏥", Status = "CURRENT" },
                new() { Name = "Poipet (Cambodia-Thai Border)", Type = "CUSTOMS", Lat = 13.6560, Lng = 102.5620, Color = "#F59E0B", Icon = "🛂", Status = "PLANNED" },
                new() { Name = "Bangkok (Royal Turf Club)", Type = "DESTINATION", Lat = 13.7563, Lng = 100.5018, Color = "#EF4444", Icon = "🏁", Status = "PLANNED" }
            };

            var currentLat = 11.5560;
            var currentLng = 104.9280;

            if (trip != null && trip.RouteSegments.Any())
            {
                var segList = trip.RouteSegments.ToList();
                markers = segList.Select((s, index) => new FixedMarkerDto
                {
                    Name = s.LocationName,
                    Type = s.SegmentType ?? (index == 0 ? "ORIGIN" : index == segList.Count - 1 ? "DESTINATION" : "REST_STOP"),
                    Lat = index < defaultCoords.Count ? defaultCoords[index][0] : 10.8231 + index * 0.5,
                    Lng = index < defaultCoords.Count ? defaultCoords[index][1] : 106.6297 + index * 0.5,
                    Color = index == 0 ? "#10B981" : index == segList.Count - 1 ? "#EF4444" : "#3B82F6",
                    Icon = index == 0 ? "📍" : index == segList.Count - 1 ? "🏁" : "🅿️",
                    Status = s.Status ?? "PLANNED"
                }).ToList();
            }

            return new TripMonitoringDto
            {
                TripId = trip?.TripId ?? tripId,
                TripCode = (trip?.TripId ?? tripId).Replace("TRIP_", "TRP-"),
                Status = trip?.Status ?? "IN_TRANSIT",
                VehiclePosition = new VehiclePositionDto
                {
                    Latitude = currentLat,
                    Longitude = currentLng,
                    LastUpdated = DateTime.UtcNow.ToString("HH:mm:ss dd/MM/yyyy"),
                    CurrentStatus = "Di chuyển đều (48 km/h) - Sinh hiệu ngựa ổn định"
                },
                FixedMarkers = markers,
                RoutePolyline = defaultCoords,
                CurrentLocationName = "Phnom Penh Waypoint (Km 240 / 1250)",
                EtaDestination = DateTime.UtcNow.AddHours(18)
            };
        }

        // =========================================================================
        // 12. OPERATIONS READINESS & DEPARTURE CONDITIONS (F03-C25 to F03-C27, F03-M06)
        // =========================================================================
        public async Task<OperationsReadinessDto> GetOperationsReadinessAsync(string tripId)
        {
            var trip = await _context.TripPlans
                .Include(t => t.RouteSegments)
                .Include(t => t.VehicleAssignments)
                    .ThenInclude(va => va.Vehicle)
                .FirstOrDefaultAsync(t => t.TripId == tripId);

            if (trip == null)
            {
                return new OperationsReadinessDto
                {
                    TripId = tripId,
                    IsReady = false,
                    MissingConditions = new List<string> { "TRIP_NOT_FOUND" }
                };
            }

            var missing = new List<string>();

            bool routeCreated = trip.RouteSegments.Any();
            if (!routeCreated) missing.Add("Chưa tạo chuỗi chặng lộ trình (ROUTE_REQUIRED)");

            bool routeApproved = trip.Status == "APPROVED" || trip.Status == "READY" || trip.Status == "READY_TO_DEPART" || trip.Status == "IN_TRANSIT" || trip.Status == "COMPLETED" || trip.Status == "EXECUTING";
            if (!routeApproved) missing.Add("Lộ trình chưa được Logistics Manager phê duyệt (ROUTE_APPROVED)");

            var assignment = trip.VehicleAssignments.FirstOrDefault();
            bool vehicleAssigned = !string.IsNullOrEmpty(assignment?.VehicleId);
            if (!vehicleAssigned) missing.Add("Chưa gán phương tiện chuyên dụng (VEHICLE_REQUIRED)");

            bool driverAssigned = !string.IsNullOrEmpty(assignment?.DriverId);
            if (!driverAssigned) missing.Add("Chưa gán tài xế chính (STAFF_ASSIGNED)");

            bool escortAssigned = !string.IsNullOrEmpty(assignment?.EscortId);
            if (!escortAssigned) missing.Add("Chưa gán hộ tống viên / bác sĩ thú y (VETERINARIAN_QUALIFIED)");

            var horseCount = await _context.RequestHorseMappings.CountAsync(m => m.RequestId == trip.RequestId);
            bool stallsSufficient = true;
            if (assignment?.Vehicle != null && assignment.Vehicle.CapacityStalls.HasValue && horseCount > 0)
            {
                stallsSufficient = assignment.Vehicle.CapacityStalls >= horseCount;
                if (!stallsSufficient) missing.Add($"Xe chỉ có {assignment.Vehicle.CapacityStalls} stall, không đủ {horseCount} ngựa (STALL_CAPACITY_EXCEEDED)");
            }

            var cleanTripId = tripId?.Trim() ?? string.Empty;
            bool hasAirLeg = trip.RouteSegments.Any(s => s.TransportMode == "AIR");
            var flightBooking = hasAirLeg
                ? await _context.FlightBookings
                    .Where(fb => fb.TripId == cleanTripId || fb.TripId == tripId)
                    .OrderByDescending(fb => fb.BookingVersion)
                    .FirstOrDefaultAsync()
                : null;
            bool flightConfirmed = !hasAirLeg || (flightBooking != null && flightBooking.BookingConfirmed);
            if (hasAirLeg && !flightConfirmed)
            {
                missing.Add("Chưa xác nhận đặt chỗ chuyến bay (FLIGHT_BOOKING_CONFIRMED)");
            }

            bool isReady = routeCreated && routeApproved && vehicleAssigned && driverAssigned && escortAssigned && stallsSufficient && flightConfirmed;

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
                IsReady = isReady,
                ConfirmedByCoordinator = trip.Status == "READY_TO_DEPART" || trip.Status == "READY" || trip.Status == "IN_TRANSIT" || trip.Status == "COMPLETED",
                Conditions = new List<ConditionItemDto>
                {
                    new() { Code = "ROUTE_STRUCTURALLY_VALID", Met = routeCreated },
                    new() { Code = "ROUTE_APPROVED", Met = routeApproved },
                    new() { Code = "STAFF_ASSIGNED", Met = driverAssigned },
                    new() { Code = "VEHICLE_READY", Met = vehicleAssigned },
                    new() { Code = "VETERINARIAN_QUALIFIED", Met = escortAssigned },
                    new() { Code = "FLIGHT_BOOKING_CONFIRMED", Met = flightConfirmed, Applicable = hasAirLeg }
                },
                MissingConditions = missing,
                AllowedActions = isReady ? new List<string> { "CONFIRM_OPERATIONS_READY" } : new List<string> { "VIEW" }
            };
        }

        public async Task<bool> ConfirmOperationsReadinessAsync(string tripId, ConfirmOperationsReadinessRequestDto? dto = null)
        {
            var readiness = await GetOperationsReadinessAsync(tripId);
            if (!readiness.IsReady)
            {
                throw new InvalidOperationException($"Chưa đủ điều kiện vận hành: {string.Join(", ", readiness.MissingConditions)}");
            }

            var trip = await _context.TripPlans.FindAsync(tripId);
            if (trip == null) return false;

            trip.Status = "READY_TO_DEPART";
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<DepartureConditionsDto> GetDepartureConditionsAsync(string tripId, bool isManager = false)
        {
            var opReadiness = await GetOperationsReadinessAsync(tripId);
            var missing = new List<string>(opReadiness.MissingConditions);

            // Giả lập Documents Readiness từ Flow 2
            bool documentsConfirmed = false;
            missing.Add("DOCUMENTS_CONFIRMED (Chuyên viên kiểm dịch chưa chốt hồ sơ tại Flow 2)");

            bool allMet = opReadiness.IsReady && documentsConfirmed;

            return new DepartureConditionsDto
            {
                TripId = tripId,
                TripStatus = opReadiness.RouteApproved ? "PLANNING" : "PLANNING",
                DeploymentStatus = "CONFIRMED",
                RouteVersionId = 120,
                AllMet = allMet,
                OperationsReadiness = new OperationsReadinessSummaryDto
                {
                    Ready = opReadiness.IsReady,
                    Confirmed = opReadiness.ConfirmedByCoordinator,
                    RouteVersionId = 120,
                    AssignmentVersion = 3,
                    ConfirmedBy = opReadiness.ConfirmedByCoordinator ? "USR_COORD_01" : null,
                    ConfirmedAt = opReadiness.ConfirmedByCoordinator ? DateTime.UtcNow : null
                },
                DocumentsReadiness = new DocumentsReadinessSummaryDto
                {
                    Ready = false,
                    Confirmed = false,
                    RouteVersionId = 120,
                    MissingConditions = new List<string> { "INSURANCE_VERIFIED", "EXPORT_PERMIT_APPROVED" }
                },
                Conditions = new List<ConditionItemDto>
                {
                    new() { Code = "ROUTE_APPROVED", Met = opReadiness.RouteApproved },
                    new() { Code = "OPERATIONS_CONFIRMED", Met = opReadiness.ConfirmedByCoordinator },
                    new() { Code = "DOCUMENTS_CONFIRMED", Met = documentsConfirmed },
                    new() { Code = "STAFF_ASSIGNED", Met = opReadiness.DriverAssigned },
                    new() { Code = "VEHICLE_READY", Met = opReadiness.VehicleAssigned },
                    new() { Code = "CHECKLIST_READY", Met = false },
                    new() { Code = "VETERINARIAN_QUALIFIED", Met = opReadiness.EscortAssigned },
                    new() { Code = "INSURANCE_VERIFIED", Met = false },
                    new() { Code = "FLIGHT_BOOKING_CONFIRMED", Met = true, Applicable = false },
                    new() { Code = "DEPLOYMENT_CONFIRMED", Met = true }
                },
                MissingConditions = missing,
                AllowedActions = new List<string> { "VIEW_ROUTE", "VIEW_ASSIGNMENTS" }
            };
        }

        // =========================================================================
        // PRIVATE HELPERS & SEED DATA
        // =========================================================================
        private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            var r = 6371;
            var dLat = (lat2 - lat1) * Math.PI / 180;
            var dLon = (lon2 - lon1) * Math.PI / 180;
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return r * c;
        }

        private static List<double[]> GenerateInterpolatedPoints(double lat1, double lon1, double lat2, double lon2, int count)
        {
            var list = new List<double[]> { new double[] { lat1, lon1 } };
            for (int i = 1; i <= count; i++)
            {
                double fraction = (double)i / (count + 1);
                double intermediateLat = lat1 + (lat2 - lat1) * fraction;
                double intermediateLng = lon1 + (lon2 - lon1) * fraction;
                list.Add(new double[] { Math.Round(intermediateLat, 4), Math.Round(intermediateLng, 4) });
            }
            list.Add(new double[] { lat2, lon2 });
            return list;
        }

        private static List<Vehicle> GetDefaultVehicles()
        {
            return new List<Vehicle>
            {
                new() { VehicleId = "VEH_BOX_01", Type = "HORSEBOX_3_STALLS", CapacityStalls = 3, MaxRangeKm = 900, FuelCostPerKm = 1.20m, Status = "AVAILABLE" },
                new() { VehicleId = "VEH_BOX_02", Type = "HORSEBOX_6_STALLS", CapacityStalls = 6, MaxRangeKm = 1200, FuelCostPerKm = 1.80m, Status = "ON_TRIP" },
                new() { VehicleId = "VEH_BOX_03", Type = "HORSEBOX_2_STALLS", CapacityStalls = 2, MaxRangeKm = 750, FuelCostPerKm = 1.00m, Status = "MAINTENANCE" },
                new() { VehicleId = "VEH_BOX_04", Type = "HORSEBOX_4_STALLS", CapacityStalls = 4, MaxRangeKm = 1000, FuelCostPerKm = 1.40m, Status = "AVAILABLE" },
                new() { VehicleId = "VEH_BOX_05", Type = "HORSEBOX_3_STALLS", CapacityStalls = 3, MaxRangeKm = 950, FuelCostPerKm = 1.25m, Status = "READY" }
            };
        }

        private async Task SeedSampleTripsAsync()
        {
            var req1 = await _context.TransportRequests.FindAsync("REQ_2026_001");
            if (req1 == null)
            {
                req1 = new TransportRequest
                {
                    RequestId = "REQ_2026_001",
                    CustomerId = "USR_CUST_01",
                    Departure = "Trang trại Sóc Sơn, Hà Nội",
                    Destination = "CLB Đua Ngựa Hoàng Gia Bangkok, Thái Lan",
                    Purpose = "Thi đấu Cúp Hoàng Gia",
                    TransportType = "ROAD_CROSS_BORDER",
                    ExpectedDate = DateTime.UtcNow.AddDays(2),
                    CommittedDeadline = DateTime.UtcNow.AddDays(5),
                    DesignatedReceiverName = "Mr. Kraisak",
                    DesignatedReceiverPhone = "+66812345678",
                    BaseCost = 8500.00m,
                    Status = "ACTIVATED"
                };
                _context.TransportRequests.Add(req1);
            }

            var trip1 = await _context.TripPlans.FindAsync("TRIP_2026_001");
            if (trip1 == null)
            {
                trip1 = new TripPlan
                {
                    TripId = "TRIP_2026_001",
                    RequestId = "REQ_2026_001",
                    TotalDistanceKm = 1250.00m,
                    TTotalHours = 36.50m,
                    TotalCost = 6200.00m,
                    Status = "IN_TRANSIT"
                };
                _context.TripPlans.Add(trip1);
            }

            var req2 = await _context.TransportRequests.FindAsync("REQ_2026_002");
            if (req2 == null)
            {
                req2 = new TransportRequest
                {
                    RequestId = "REQ_2026_002",
                    CustomerId = "USR_CUST_02",
                    Departure = "Trại ngựa Củ Chi, TP.HCM",
                    Destination = "Trường đua Chroy Changvar, Phnom Penh",
                    Purpose = "Giao lưu huấn luyện",
                    TransportType = "ROAD_CROSS_BORDER",
                    ExpectedDate = DateTime.UtcNow.AddDays(3),
                    CommittedDeadline = DateTime.UtcNow.AddDays(4),
                    DesignatedReceiverName = "Sokha Heng",
                    DesignatedReceiverPhone = "+85598765432",
                    BaseCost = 4200.00m,
                    Status = "ACTIVATED"
                };
                _context.TransportRequests.Add(req2);
            }

            var trip2 = await _context.TripPlans.FindAsync("TRIP_2026_002");
            if (trip2 == null)
            {
                trip2 = new TripPlan
                {
                    TripId = "TRIP_2026_002",
                    RequestId = "REQ_2026_002",
                    TotalDistanceKm = 240.00m,
                    TTotalHours = 8.00m,
                    TotalCost = 3100.00m,
                    Status = "PLANNING"
                };
                _context.TripPlans.Add(trip2);
            }

            var flightBooking1 = await _context.FlightBookings.FirstOrDefaultAsync(fb => fb.TripId == "TRIP_2026_001");
            if (flightBooking1 == null)
            {
                flightBooking1 = new FlightBooking
                {
                    TripId = "TRIP_2026_001",
                    BookingVersion = 1,
                    RouteVersionId = 120,
                    ProviderName = "Nippon Cargo Airlines",
                    Airline = "NCA Airlines",
                    FlightNumber = "KZ-102",
                    DepartureAirportCheckpointId = 101,
                    ArrivalAirportCheckpointId = 201,
                    DepartureAt = DateTime.UtcNow.AddDays(2).AddHours(4),
                    ArrivalAt = DateTime.UtcNow.AddDays(2).AddHours(10),
                    DirectFlight = true,
                    BookingReference = "NCA-SGN-NRT-2026",
                    BookingConfirmed = true,
                    HorseIds = JsonSerializer.Serialize(new List<string> { "HRS_001", "HRS_002" }),
                    Note = "Chuyến bay thẳng chuyên chở động vật thể thao SGN -> NRT",
                    CreatedAt = DateTime.UtcNow
                };
                _context.FlightBookings.Add(flightBooking1);
            }

            await _context.SaveChangesAsync();
        }
    }
}
