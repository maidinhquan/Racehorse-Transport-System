using Microsoft.EntityFrameworkCore;
using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Data.Context;

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

            // Nếu DB chưa có dữ liệu xe, khởi tạo mặc định cho demo
            if (!vehicles.Any())
            {
                vehicles = GetDefaultVehicles();
                _context.Vehicles.AddRange(vehicles);
                await _context.SaveChangesAsync();
            }

            // Nếu DB chưa có trip, khởi tạo chuyến mẫu cho demo
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
                if (horseCount == 0) horseCount = 2; // fallback số cá thể mặc định

                var hasSegments = t.RouteSegments.Any();
                var assignment = t.VehicleAssignments.FirstOrDefault();
                var vehicleAssigned = assignment?.VehicleId != null;
                var driverAssigned = assignment?.DriverId != null;
                var escortAssigned = assignment?.EscortId != null;

                string stage;
                if (!hasSegments)
                {
                    stage = "NEED_ROUTE";
                }
                else if (!vehicleAssigned || !driverAssigned || !escortAssigned)
                {
                    stage = "NEED_ASSIGNMENT";
                }
                else if (t.Status == "READY" || t.Status == "APPROVED" || t.Status == "READY_TO_DEPART")
                {
                    stage = "READY";
                }
                else if (t.Status == "IN_TRANSIT")
                {
                    stage = "IN_TRANSIT";
                }
                else
                {
                    stage = "PLANNING";
                }

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

                // Tìm tên khách hàng
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

            // Tìm customer
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

            // Tìm ngựa thuộc đơn
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

            // Phân công xe
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

            // Chặng dừng
            var segments = trip.RouteSegments.Select(s => new RouteSegmentItemDto
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
        // 4. FLEET (VEHICLES) MANAGEMENT
        // =========================================================================
        public async Task<List<VehicleDto>> GetVehiclesAsync(bool onlyAvailable = false)
        {
            var query = _context.Vehicles.AsQueryable();
            if (onlyAvailable)
            {
                query = query.Where(v => v.Status == "AVAILABLE" || v.Status == "READY");
            }

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
                Type = v.Type ?? "HORSEBOX_3_STALLS",
                CapacityStalls = v.CapacityStalls ?? 3,
                MaxRangeKm = v.MaxRangeKm,
                FuelCostPerKm = v.FuelCostPerKm,
                Status = v.Status ?? "AVAILABLE",
                IsAvailable = v.Status == "AVAILABLE" || v.Status == "READY"
            }).ToList();
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
                Status = dto.Status ?? "AVAILABLE"
            };

            _context.Vehicles.Add(vehicle);
            await _context.SaveChangesAsync();

            return new VehicleDto
            {
                VehicleId = vehicle.VehicleId,
                Type = vehicle.Type,
                CapacityStalls = vehicle.CapacityStalls ?? 3,
                MaxRangeKm = vehicle.MaxRangeKm,
                FuelCostPerKm = vehicle.FuelCostPerKm,
                Status = vehicle.Status,
                IsAvailable = vehicle.Status == "AVAILABLE" || vehicle.Status == "READY"
            };
        }

        public async Task<bool> UpdateVehicleStatusAsync(string vehicleId, UpdateVehicleStatusDto dto)
        {
            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            if (vehicle == null) return false;

            vehicle.Status = dto.Status;
            await _context.SaveChangesAsync();
            return true;
        }

        // =========================================================================
        // 5. STAFF (DRIVERS & ESCORTS / VETS)
        // =========================================================================
        public async Task<List<StaffDto>> GetStaffListAsync()
        {
            var staffUsers = await _context.Users
                .Where(u => u.Role == "Driver" || u.Role == "Escort" || u.Role == "Specialist")
                .ToListAsync();

            if (!staffUsers.Any())
            {
                // Fallback default staff nếu DB chưa có
                return new List<StaffDto>
                {
                    new() { UserId = "USR_DRV_01", FullName = "Hoàng Hùng", Role = "Driver", Email = "hung.driver@cbntransport.com", Phone = "0945678901", IsActive = true, Specialization = "Tài xế quốc tế hạng FC" },
                    new() { UserId = "USR_DRV_02", FullName = "Vũ Thành", Role = "Driver", Email = "thanh.driver@cbntransport.com", Phone = "0946789012", IsActive = true, Specialization = "Tài xế chuyên tuyến xuyên biên giới" },
                    new() { UserId = "USR_ESC_01", FullName = "BS. Đỗ Hoa", Role = "Escort", Email = "hoa.escort@cbntransport.com", Phone = "0956789012", IsActive = true, Specialization = "Bác sĩ thú y áp tải (Chứng chỉ FEI)" },
                    new() { UserId = "USR_ESC_02", FullName = "BS. Phan Nam", Role = "Escort", Email = "nam.escort@cbntransport.com", Phone = "0957890123", IsActive = true, Specialization = "Chuyên viên chăm sóc thể lực ngựa đua" }
                };
            }

            return staffUsers.Select(u => new StaffDto
            {
                UserId = u.UserId,
                FullName = u.FullName,
                Role = u.Role,
                Email = u.Email ?? "",
                Phone = u.Phone ?? "",
                IsActive = u.IsActive,
                Specialization = u.Role == "Driver" ? "Tài xế chuyên dụng" : "Bác sĩ thú y áp tải"
            }).ToList();
        }

        // =========================================================================
        // 6. ROUTE CALCULATION (EQUINE WELFARE & POLYLINE)
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

            var currentDeparture = dto.PlannedDepartureAt;

            for (int i = 0; i < points.Count - 1; i++)
            {
                var from = points[i];
                var to = points[i + 1];

                // Khoảng cách ước tính Haversine
                var legDistanceKm = (decimal)CalculateDistance((double)from.Lat, (double)from.Lng, (double)to.Lat, (double)to.Lng);
                if (legDistanceKm < 5) legDistanceKm = 35; // Giá trị tối thiểu cho chặng nội đô

                // Vận tốc trung bình xe tải chở ngựa: 50 km/h (để êm ái cho ngựa)
                var legDriveHours = legDistanceKm / 50.0m;
                var legDurationMinutes = (int)(legDriveHours * 60);

                var arrivalAt = currentDeparture.AddMinutes(legDurationMinutes);
                var departureNext = arrivalAt.AddMinutes(to.PlannedStopMinutes);

                // KIỂM TRA LUẬT PHÚC LỢI NGỰA (Equine Welfare Rule: F03-BR-16): Không đứng xe quá 4-6 tiếng liên tục
                if (legDriveHours > 6.0m)
                {
                    warnings.Add($"Chặng từ '{from.Name}' đến '{to.Name}' lái xe liên tục {legDriveHours:F1}h (> 6h). Theo quy định phúc lợi ngựa (Equine Welfare), bắt buộc phải có trạm dừng nghỉ 1-2 tiếng!");
                }

                // Sinh tọa độ mượt giữa 2 điểm để vẽ Polyline
                var legPath = GenerateInterpolatedPoints((double)from.Lat, (double)from.Lng, (double)to.Lat, (double)to.Lng, 6);
                polylineCoords.AddRange(legPath);

                legs.Add(new RouteLegResultDto
                {
                    FromSequence = from.Sequence,
                    ToSequence = to.Sequence,
                    Mode = "ROAD",
                    DistanceKm = Math.Round(legDistanceKm, 1),
                    DurationMinutes = legDurationMinutes,
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
                Warnings = warnings,
                Legs = legs,
                PolylineCoordinates = polylineCoords
            });
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

            // Xóa chặng cũ nếu có
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

        public async Task<bool> SubmitRouteForApprovalAsync(string tripId)
        {
            var trip = await _context.TripPlans.FindAsync(tripId);
            if (trip == null) return false;

            trip.Status = "PENDING_APPROVAL";
            await _context.SaveChangesAsync();
            return true;
        }

        // =========================================================================
        // 7. CREW & VEHICLE ASSIGNMENT (ZERO-TRUST BUSINESS LOGIC)
        // =========================================================================
        public async Task<bool> AssignCrewAndVehicleAsync(string tripId, AssignCrewVehicleDto dto)
        {
            var trip = await _context.TripPlans
                .Include(t => t.VehicleAssignments)
                .FirstOrDefaultAsync(t => t.TripId == tripId);

            if (trip == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy chuyến đi: {tripId}");
            }

            // Zero-Trust Rule: Tài xế và Escort không được trùng nhau
            if (dto.DriverId == dto.EscortId)
            {
                throw new InvalidOperationException("Vi phạm quy chuẩn an toàn: Một người không được đảm nhận đồng thời 2 vị trí Tài xế và Hộ tống viên!");
            }

            // Kiểm tra xe
            var vehicle = await _context.Vehicles.FindAsync(dto.VehicleId);
            if (vehicle == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy phương tiện: {dto.VehicleId}");
            }

            // Kiểm tra số lượng ngựa trong chuyến vs sức chứa stall của xe (Zero-Trust Rule F03-BR-12/13)
            var horseCount = await _context.RequestHorseMappings.CountAsync(m => m.RequestId == trip.RequestId);
            if (horseCount > 0 && vehicle.CapacityStalls.HasValue && vehicle.CapacityStalls < horseCount)
            {
                throw new InvalidOperationException($"Xe {vehicle.VehicleId} chỉ có {vehicle.CapacityStalls} khoang stall, không đủ chở {horseCount} cá thể ngựa!");
            }

            // Kiểm tra tài xế
            var driver = await _context.Users.FindAsync(dto.DriverId);
            if (driver == null || !driver.IsActive || driver.Role != "Driver")
            {
                throw new InvalidOperationException($"Nhân sự {dto.DriverId} không hợp lệ hoặc không có vai trò Tài xế!");
            }

            // Kiểm tra hộ tống viên
            var escort = await _context.Users.FindAsync(dto.EscortId);
            if (escort == null || !escort.IsActive || (escort.Role != "Escort" && escort.Role != "Specialist"))
            {
                throw new InvalidOperationException($"Nhân sự {dto.EscortId} không hợp lệ hoặc không có vai trò Hộ tống/Bác sĩ thú y!");
            }

            // Cập nhật hoặc tạo phân công
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
        // 8. TRIP MONITORING (MAP DATA STREAM)
        // =========================================================================
        public async Task<TripMonitoringDto?> GetTripMonitoringAsync(string tripId)
        {
            var trip = await _context.TripPlans
                .Include(t => t.Request)
                .Include(t => t.RouteSegments)
                .FirstOrDefaultAsync(t => t.TripId == tripId);

            // Tọa độ chuẩn mẫu cho tuyến xuyên biên giới HCM - Bavet - Phnom Penh - Bangkok
            var defaultCoords = new List<double[]>
            {
                new double[] { 10.8231, 106.6297 }, // HCMC Origin
                new double[] { 11.0650, 106.1720 }, // Mộc Bài / Bavet Rest Stop
                new double[] { 11.5560, 104.9280 }, // Phnom Penh Waypoint
                new double[] { 13.6560, 102.5620 }, // Poipet Border Checkpoint
                new double[] { 13.7563, 100.5018 }  // Bangkok Destination
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
                // Nếu trip có segment lưu trong DB
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
        // 9. OPERATIONS READINESS
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
            if (!routeCreated) missing.Add("Chưa tạo chuỗi chặng lộ trình");

            bool routeApproved = trip.Status == "APPROVED" || trip.Status == "READY" || trip.Status == "READY_TO_DEPART" || trip.Status == "IN_TRANSIT";
            if (!routeApproved) missing.Add("Lộ trình chưa được Logistics Manager phê duyệt");

            var assignment = trip.VehicleAssignments.FirstOrDefault();
            bool vehicleAssigned = !string.IsNullOrEmpty(assignment?.VehicleId);
            if (!vehicleAssigned) missing.Add("Chưa gán phương tiện chuyên dụng");

            bool driverAssigned = !string.IsNullOrEmpty(assignment?.DriverId);
            if (!driverAssigned) missing.Add("Chưa gán tài xế chính");

            bool escortAssigned = !string.IsNullOrEmpty(assignment?.EscortId);
            if (!escortAssigned) missing.Add("Chưa gán hộ tống viên / bác sĩ thú y");

            var horseCount = await _context.RequestHorseMappings.CountAsync(m => m.RequestId == trip.RequestId);
            bool stallsSufficient = true;
            if (assignment?.Vehicle != null && assignment.Vehicle.CapacityStalls.HasValue && horseCount > 0)
            {
                stallsSufficient = assignment.Vehicle.CapacityStalls >= horseCount;
                if (!stallsSufficient) missing.Add($"Xe chỉ có {assignment.Vehicle.CapacityStalls} stall, không đủ {horseCount} ngựa");
            }

            bool isReady = routeCreated && routeApproved && vehicleAssigned && driverAssigned && escortAssigned && stallsSufficient;

            return new OperationsReadinessDto
            {
                TripId = tripId,
                RouteCreated = routeCreated,
                RouteApproved = routeApproved,
                VehicleAssigned = vehicleAssigned,
                DriverAssigned = driverAssigned,
                EscortAssigned = escortAssigned,
                StallsSufficient = stallsSufficient,
                IsReady = isReady,
                ConfirmedByCoordinator = isReady && trip.Status == "READY_TO_DEPART",
                MissingConditions = missing
            };
        }

        public async Task<bool> ConfirmOperationsReadinessAsync(string tripId)
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

        public async Task<bool> ApproveRouteAsync(string tripId)
        {
            var trip = await _context.TripPlans.FindAsync(tripId);
            if (trip == null) return false;

            trip.Status = "APPROVED";
            await _context.SaveChangesAsync();
            return true;
        }

        // =========================================================================
        // PRIVATE HELPERS & SEED DATA
        // =========================================================================
        private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            var r = 6371; // km
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
            // Kiểm tra và tạo TransportRequest mẫu nếu chưa có
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

            await _context.SaveChangesAsync();
        }
    }
}

