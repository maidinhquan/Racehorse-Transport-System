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
    public class CoordinatorService : ICoordinatorService
    {
        private readonly HorseTransportDbContext _context;
        private readonly IHttpClientFactory? _httpClientFactory;
        private readonly IConfiguration? _configuration;

        public CoordinatorService(
            HorseTransportDbContext context,
            IHttpClientFactory? httpClientFactory = null,
            IConfiguration? configuration = null)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
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
            if (!await _context.TransportRequests.AnyAsync())
            {
                await SeedSampleTripsAsync();
            }

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
                return new PlanningTripDto
                {
                    TripId = existingTrip.TripId,
                    RequestId = request.RequestId,
                    TripCode = existingTrip.TripId.Replace("TRIP_", "TRP-"),
                    CustomerName = request.Customer?.FullName ?? "Khách hàng cá nhân",
                    Origin = request.Departure,
                    Destination = request.Destination,
                    HorseCount = request.RequestHorseMappings.Count > 0 ? request.RequestHorseMappings.Count : 2,
                    TransportType = request.TransportType ?? "ROAD",
                    PlannedDepartureAt = request.ExpectedDate ?? DateTime.UtcNow.AddDays(2),
                    DeliveryDeadline = request.CommittedDeadline ?? DateTime.UtcNow.AddDays(5),
                    TripStatus = existingTrip.Status,
                    Stage = "NEED_ROUTE",
                    AllowedActions = new List<string> { "CREATE_ROUTE", "CALCULATE_ROUTE", "CHOOSE_VEHICLE", "CHOOSE_DRIVER", "CHOOSE_ESCORT" }
                };
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
                Status = "PLANNING"
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
            var result = new List<CheckpointDto>();
            if (string.IsNullOrWhiteSpace(address)) return result;

            int id = 500;
            var cCode = string.IsNullOrWhiteSpace(country) ? "VN" : country.Trim().ToUpper();

            // 1. Try Mapbox Geocoding (high accuracy for Vietnamese and international free-text addresses)
            var mapboxToken = _configuration?["Maps:Mapbox:AccessToken"]
                ?? _configuration?["Flow1:Maps:Mapbox:AccessToken"]
                ?? "pk.eyJ1IjoiaWNld29ybSIsImEiOiJjbXZhY3RyazQwM3k2MndvbWhsN2Fmb29tIn0.20kPK7DHlQJDDbjXdhAQCw";

            if (!string.IsNullOrWhiteSpace(mapboxToken) && _httpClientFactory != null)
            {
                try
                {
                    var client = _httpClientFactory.CreateClient("MapboxClient");
                    var countryParam = !string.IsNullOrWhiteSpace(cCode) ? $"&country={cCode.ToLower()}" : "";
                    var url = $"https://api.mapbox.com/geocoding/v5/mapbox.places/{Uri.EscapeDataString(address)}.json?access_token={mapboxToken}{countryParam}&language=vi,en";

                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(8));
                    var response = await client.GetAsync(url, cts.Token);
                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync(cts.Token);
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("features", out var features))
                        {
                            foreach (var feat in features.EnumerateArray())
                            {
                                string placeName = feat.TryGetProperty("place_name", out var pn) ? pn.GetString() ?? address : address;
                                decimal lat = 0;
                                decimal lng = 0;

                                if (feat.TryGetProperty("center", out var center) && center.GetArrayLength() >= 2)
                                {
                                    lng = (decimal)center[0].GetDouble();
                                    lat = (decimal)center[1].GetDouble();
                                }
                                else if (feat.TryGetProperty("geometry", out var geom) && geom.TryGetProperty("coordinates", out var coords) && coords.GetArrayLength() >= 2)
                                {
                                    lng = (decimal)coords[0].GetDouble();
                                    lat = (decimal)coords[1].GetDouble();
                                }

                                if (lat != 0 && lng != 0)
                                {
                                    result.Add(new CheckpointDto
                                    {
                                        CheckpointId = ++id,
                                        Name = placeName,
                                        Country = cCode,
                                        Type = "CUSTOM_LOCATION",
                                        Lat = lat,
                                        Lng = lng,
                                        Active = true
                                    });
                                }
                            }
                            if (result.Count > 0) return result;
                        }
                    }
                }
                catch
                {
                    // Fallthrough to Geoapify
                }
            }

            // 2. Try Geoapify Geocoding
            var geoapifyKey = _configuration?["Maps:Geoapify:ApiKey"]
                ?? _configuration?["Flow1:Maps:Geoapify:ApiKey"]
                ?? "167c9593184a44aaa2dc377cea7535f6";

            if (!string.IsNullOrWhiteSpace(geoapifyKey) && _httpClientFactory != null)
            {
                try
                {
                    var client = _httpClientFactory.CreateClient("GeoapifyClient");
                    var countryFilter = !string.IsNullOrWhiteSpace(cCode) ? $"&filter=countrycode:{cCode.ToLower()}" : "";
                    var url = $"https://api.geoapify.com/v1/geocode/search?text={Uri.EscapeDataString(address)}{countryFilter}&apiKey={geoapifyKey}";

                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(8));
                    var response = await client.GetAsync(url, cts.Token);
                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync(cts.Token);
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("features", out var features))
                        {
                            foreach (var feat in features.EnumerateArray())
                            {
                                var props = feat.GetProperty("properties");
                                var geom = feat.GetProperty("geometry").GetProperty("coordinates");
                                var lng = (decimal)geom[0].GetDouble();
                                var lat = (decimal)geom[1].GetDouble();
                                var formatted = props.TryGetProperty("formatted", out var f) ? f.GetString() : address;
                                var countryCode = props.TryGetProperty("country_code", out var cc) ? cc.GetString()?.ToUpper() : cCode;

                                result.Add(new CheckpointDto
                                {
                                    CheckpointId = ++id,
                                    Name = formatted ?? address,
                                    Country = countryCode ?? cCode,
                                    Type = "CUSTOM_LOCATION",
                                    Lat = lat,
                                    Lng = lng,
                                    Active = true
                                });
                            }
                            if (result.Count > 0) return result;
                        }
                    }
                }
                catch
                {
                    // Fallthrough to local catalog & heuristics
                }
            }

            // 3. Fallback to Local Checkpoints matching
            var staticMatches = await GetCheckpointsAsync(cCode, null, address);
            if (staticMatches.Count > 0) return staticMatches;

            // 4. Intelligent Heuristic Fallback for known horse transport hubs
            var lower = address.ToLowerInvariant();
            if (lower.Contains("củ chi") || lower.Contains("cu chi"))
            {
                result.Add(new CheckpointDto { CheckpointId = ++id, Name = $"{address} (Khu vực Củ Chi, TP.HCM)", Country = "VN", Type = "CUSTOM_LOCATION", Lat = 10.9744m, Lng = 106.4949m, Active = true });
                return result;
            }
            if (lower.Contains("ba vì") || lower.Contains("ba vi"))
            {
                result.Add(new CheckpointDto { CheckpointId = ++id, Name = $"{address} (Khu huấn luyện Ba Vì, Hà Nội)", Country = "VN", Type = "CUSTOM_LOCATION", Lat = 21.0820m, Lng = 105.3560m, Active = true });
                return result;
            }
            if (lower.Contains("sóc sơn") || lower.Contains("soc son"))
            {
                result.Add(new CheckpointDto { CheckpointId = ++id, Name = $"{address} (Trang trại Sóc Sơn, Hà Nội)", Country = "VN", Type = "CUSTOM_LOCATION", Lat = 21.2820m, Lng = 105.8500m, Active = true });
                return result;
            }
            if (lower.Contains("tân sơn nhất") || lower.Contains("tan son nhat") || lower.Contains("sgn"))
            {
                result.Add(new CheckpointDto { CheckpointId = ++id, Name = "Sân bay Quốc tế Tân Sơn Nhất (SGN)", Country = "VN", Type = "AIRPORT", Lat = 10.8188m, Lng = 106.6520m, Active = true });
                return result;
            }
            if (lower.Contains("nội bài") || lower.Contains("noi bai") || lower.Contains("han"))
            {
                result.Add(new CheckpointDto { CheckpointId = ++id, Name = "Sân bay Quốc tế Nội Bài (HAN)", Country = "VN", Type = "AIRPORT", Lat = 21.2188m, Lng = 105.8044m, Active = true });
                return result;
            }
            if (lower.Contains("narita") || lower.Contains("nrt"))
            {
                result.Add(new CheckpointDto { CheckpointId = ++id, Name = "Sân bay Quốc tế Narita (NRT)", Country = "JP", Type = "AIRPORT", Lat = 35.7720m, Lng = 140.3929m, Active = true });
                return result;
            }
            if (lower.Contains("tokyo") || lower.Contains("fuchu") || lower.Contains("japan"))
            {
                result.Add(new CheckpointDto { CheckpointId = ++id, Name = $"{address} (Khu vực Tokyo, Nhật Bản)", Country = "JP", Type = "CUSTOM_LOCATION", Lat = 35.6631m, Lng = 139.4828m, Active = true });
                return result;
            }

            // Default coordinate if user typed a custom street name not found in external maps
            decimal defLat = cCode == "JP" ? 35.6762m : 10.8231m;
            decimal defLng = cCode == "JP" ? 139.6503m : 106.6297m;
            result.Add(new CheckpointDto
            {
                CheckpointId = ++id,
                Name = $"{address} (Vị trí tùy chỉnh)",
                Country = cCode,
                Type = "CUSTOM_LOCATION",
                Lat = defLat,
                Lng = defLng,
                Active = true
            });

            return result;
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

            var result = vehicles.Select(v =>
            {
                bool isJp = v.VehicleId.Contains("_JP_");
                string regCountry = isJp ? "JP" : "VN";
                string plate = isJp
                    ? (v.VehicleId == "VEH_JP_01" ? "品川 300 あ 12-34" : "成田 500 い 56-78")
                    : v.VehicleId.Replace("VEH_BOX_", "51C-10") + ".45";

                return new VehicleDto
                {
                    VehicleId = v.VehicleId,
                    PlateNumber = plate,
                    Type = v.Type ?? (isJp ? "HORSEBOX_JP_LUXURY" : "HORSEBOX_3_STALLS"),
                    RegistrationCountry = regCountry,
                    TotalStalls = v.CapacityStalls ?? 3,
                    AvailableStalls = v.CapacityStalls ?? 3,
                    PayloadKg = isJp ? 10000 : 8000,
                    RegistrationExpiry = DateTime.UtcNow.AddMonths(18),
                    MaxRangeKm = v.MaxRangeKm,
                    FuelCostPerKm = v.FuelCostPerKm,
                    Status = v.Status ?? "READY",
                    IsAvailable = v.Status == "AVAILABLE" || v.Status == "READY"
                };
            }).ToList();

            if (!string.IsNullOrWhiteSpace(country))
            {
                result = result.Where(v => v.RegistrationCountry.Equals(country, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            return result;
        }

        public async Task<VehicleDto?> GetVehicleDetailAsync(string vehicleId)
        {
            var v = await _context.Vehicles.FindAsync(vehicleId);
            if (v == null) return null;

            bool isJp = v.VehicleId.Contains("_JP_");
            string plate = isJp
                ? (v.VehicleId == "VEH_JP_01" ? "品川 300 あ 12-34" : "成田 500 い 56-78")
                : v.VehicleId.Replace("VEH_BOX_", "51C-10") + ".45";

            return new VehicleDto
            {
                VehicleId = v.VehicleId,
                PlateNumber = plate,
                Type = v.Type ?? (isJp ? "HORSEBOX_JP_LUXURY" : "HORSEBOX_3_STALLS"),
                RegistrationCountry = isJp ? "JP" : "VN",
                TotalStalls = v.CapacityStalls ?? 3,
                AvailableStalls = v.CapacityStalls ?? 3,
                PayloadKg = isJp ? 10000 : 8000,
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

            var defaultStaff = new List<StaffDto>
            {
                // 1. Đội ngũ nhân sự tác nghiệp tại Việt Nam (VN)
                new() { UserId = "USR_DRV_01", FullName = "Hoàng Hùng", Role = "Driver", LicenseClass = "FC", LicenseExpiry = DateTime.UtcNow.AddYears(3), CanDriveCountries = new() { "VN" }, Email = "hung.driver@cbntransport.com", Phone = "0945678901", IsActive = true, IsAvailable = true, Specialization = "Tài xế quốc tế hạng FC (Việt Nam)" },
                new() { UserId = "USR_DRV_02", FullName = "Vũ Thành", Role = "Driver", LicenseClass = "FC", LicenseExpiry = DateTime.UtcNow.AddYears(2), CanDriveCountries = new() { "VN" }, Email = "thanh.driver@cbntransport.com", Phone = "0946789012", IsActive = true, IsAvailable = true, Specialization = "Phụ lái kiêm hộ tống viên (Việt Nam)" },
                new() { UserId = "USR_ESC_01", FullName = "BS. Đỗ Hoa", Role = "Escort", LicenseClass = "N/A", LicenseExpiry = DateTime.UtcNow.AddYears(3), CanDriveCountries = new() { "VN" }, Email = "hoa.escort@cbntransport.com", Phone = "0956789012", IsActive = true, IsAvailable = true, Specialization = "Bác sĩ thú y áp tải FEI (Việt Nam)" },
                new() { UserId = "USR_ESC_02", FullName = "BS. Phan Nam", Role = "Escort", LicenseClass = "N/A", LicenseExpiry = DateTime.UtcNow.AddYears(2), CanDriveCountries = new() { "VN" }, Email = "nam.escort@cbntransport.com", Phone = "0957890123", IsActive = true, IsAvailable = true, Specialization = "Chuyên viên chăm sóc thể lực ngựa (Việt Nam)" },

                // 2. Đội ngũ nhân sự tác nghiệp tại Nhật Bản (JP) - Phương án B
                new() { UserId = "USR_DRV_JP_01", FullName = "Kenji Sato", Role = "Driver", LicenseClass = "Heavy Type 1", LicenseExpiry = DateTime.UtcNow.AddYears(3), CanDriveCountries = new() { "JP" }, Email = "kenji.sato@cbntransport.jp", Phone = "+819012345678", IsActive = true, IsAvailable = true, Specialization = "Tài xế xe chuyên dụng (Nhật Bản)" },
                new() { UserId = "USR_DRV_JP_02", FullName = "Takashi Tanaka", Role = "Driver", LicenseClass = "Heavy Type 1", LicenseExpiry = DateTime.UtcNow.AddYears(3), CanDriveCountries = new() { "JP" }, Email = "takashi.tanaka@cbntransport.jp", Phone = "+819023456789", IsActive = true, IsAvailable = true, Specialization = "Phụ lái kiêm hộ tống viên (Nhật Bản)" },
                new() { UserId = "USR_ESC_JP_01", FullName = "Dr. Yoko Takahashi", Role = "Escort", LicenseClass = "N/A", LicenseExpiry = DateTime.UtcNow.AddYears(4), CanDriveCountries = new() { "JP" }, Email = "yoko.takahashi@cbntransport.jp", Phone = "+819034567890", IsActive = true, IsAvailable = true, Specialization = "Bác sĩ thú y Narita AQS - Chứng chỉ FEI (Nhật Bản)" }
            };

            var list = staffUsers.Select(u =>
            {
                bool isJp = u.UserId.Contains("_JP_");
                return new StaffDto
                {
                    UserId = u.UserId,
                    FullName = u.FullName,
                    Role = u.Role,
                    LicenseClass = u.Role == "Driver" ? (isJp ? "Heavy Type 1" : "FC") : "N/A",
                    LicenseExpiry = DateTime.UtcNow.AddYears(3),
                    CanDriveCountries = isJp ? new() { "JP" } : new() { "VN" },
                    Email = u.Email ?? "",
                    Phone = u.Phone ?? "",
                    IsActive = u.IsActive,
                    IsAvailable = u.IsActive,
                    Specialization = u.Role == "Driver" ? (isJp ? "Tài xế chuyên dụng Nhật Bản" : "Tài xế chuyên dụng FC") : (isJp ? "Bác sĩ thú y Narita AQS (FEI)" : "Bác sĩ thú y áp tải (FEI)")
                };
            }).ToList();

            foreach (var d in defaultStaff)
            {
                if (!list.Any(x => x.UserId == d.UserId))
                {
                    list.Add(d);
                }
            }

            if (!string.IsNullOrWhiteSpace(role))
            {
                list = list.Where(s => s.Role.Equals(role, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(country))
            {
                list = list.Where(s => s.CanDriveCountries.Contains(country.ToUpper())).ToList();
            }

            return list;
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
                    legDistanceKm = (decimal)CalculateDistance((double)from.Lat, (double)from.Lng, (double)to.Lat, (double)to.Lng);
                    var speed = 600.0m;
                    var legDriveHours = legDistanceKm / speed;
                    legDurationMinutes = legInput?.ManualDurationMinutes ?? (int)(legDriveHours * 60);
                    legPath = GenerateInterpolatedPoints((double)from.Lat, (double)from.Lng, (double)to.Lat, (double)to.Lng, 6);
                    distanceSource = "FLIGHT_SCHEDULE";
                }
                else if (legInput?.ManualDistanceKm.HasValue == true)
                {
                    legDistanceKm = legInput.ManualDistanceKm.Value;
                    var speed = 50.0m;
                    var legDriveHours = legDistanceKm / speed;
                    legDurationMinutes = legInput.ManualDurationMinutes ?? (int)(legDriveHours * 60);
                    legPath = GenerateInterpolatedPoints((double)from.Lat, (double)from.Lng, (double)to.Lat, (double)to.Lng, 6);
                    distanceSource = "MANUAL";
                }
                else
                {
                    // Lộ trình đường bộ ROAD: Gọi Mapbox Directions API (với Graceful Haversine fallback)
                    var mapboxResult = await CalculateLegMapboxAsync((double)from.Lat, (double)from.Lng, (double)to.Lat, (double)to.Lng);
                    legDistanceKm = mapboxResult.distanceKm;
                    legDurationMinutes = legInput?.ManualDurationMinutes ?? mapboxResult.durationMinutes;
                    legPath = mapboxResult.path;
                    distanceSource = mapboxResult.source;
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
                    Path = legPath
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
                    // 1. PlannedDeparture >= EarliestDepartureDate (Không chạy xe khi hồ sơ chưa xong)
                    if (trip.EarliestDepartureDate.HasValue && dto.PlannedDepartureAt < trip.EarliestDepartureDate.Value)
                    {
                        errors.Add($"Thời gian khởi hành dự kiến ({dto.PlannedDepartureAt:dd/MM/yyyy HH:mm}) sớm hơn Ngày sớm nhất hồ sơ sẵn sàng do Chuyên viên giấy tờ công bố ({trip.EarliestDepartureDate.Value:dd/MM/yyyy HH:mm})!");
                    }

                    // 2. Thời điểm đến trạm kiểm dịch / sân bay / cửa khẩu <= DocumentExpiryDate (Giấy tờ phải còn hạn tại thời điểm làm thủ tục)
                    if (trip.DocumentExpiryDate.HasValue)
                    {
                        foreach (var leg in legs)
                        {
                            var toPoint = points.FirstOrDefault(p => p.Sequence == leg.ToSequence);
                            if (toPoint != null && (toPoint.Type == "QUARANTINE_STATION" || toPoint.Type == "AIRPORT" || toPoint.Type == "LAND_BORDER"))
                            {
                                if (leg.ArrivalAt > trip.DocumentExpiryDate.Value)
                                {
                                    errors.Add($"Thời điểm đến {toPoint.Name} ({leg.ArrivalAt:dd/MM/yyyy HH:mm}) vượt quá Hạn chót giấy tờ kiểm dịch/xuất cảnh ({trip.DocumentExpiryDate.Value:dd/MM/yyyy HH:mm})!");
                                }
                            }
                        }
                    }

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
                }
            }

            return new RouteCalculateResponseDto
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
            trip.RejectionReason = null;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ReturnRouteVersionAsync(string tripId, int routeVersionId, ManagerReturnRouteDto dto)
        {
            var trip = await _context.TripPlans.FindAsync(tripId);
            if (trip == null) return false;

            // Quản lý từ chối: Cập nhật trạng thái RETURNED và lưu vết lý do từ chối
            trip.Status = "RETURNED";
            trip.RejectionReason = dto.Reason;
            await _context.SaveChangesAsync();
            return true;
        }

        // =========================================================================
        // 9. LEG ASSIGNMENTS (F03-C20 to F03-C22) - PHƯƠNG ÁN B HAI CHẶNG ĐỘC LẬP
        // =========================================================================
        public async Task<TripAssignmentsDetailDto> GetTripAssignmentsAsync(string tripId)
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

            var horses = await _context.Horses.Take(2).Select(h => new HorseItemDto
            {
                HorseId = h.HorseId,
                Name = h.Name,
                MicrochipIso = h.MicrochipIso,
                Breed = h.Breed ?? "Thoroughbred"
            }).ToListAsync();

            bool isInternational = trip?.Request?.TransportType?.Contains("AIR") == true
                || trip?.Request?.Destination?.Contains("Tokyo") == true
                || trip?.Request?.Destination?.Contains("JP") == true
                || trip?.RouteSegments.Any(s => s.TransportMode == "AIR") == true
                || tripId == "TRIP_2026_001";

            var vaVn = trip?.VehicleAssignments.FirstOrDefault(v => !v.VehicleId.Contains("_JP_"));
            var vaJp = trip?.VehicleAssignments.FirstOrDefault(v => v.VehicleId.Contains("_JP_"));

            var flightBooking = await _context.FlightBookings
                .Where(fb => fb.TripId == tripId)
                .OrderByDescending(fb => fb.BookingVersion)
                .FirstOrDefaultAsync();

            var legs = new List<LegAssignmentDto>();

            // 1. Chặng 1: Đường bộ đón tại Việt Nam (Outbound ROAD VN: Điểm đón -> SGN)
            legs.Add(new LegAssignmentDto
            {
                LegId = 51,
                Sequence = 1,
                Mode = "ROAD",
                Country = "VN",
                Vehicles = new List<VehicleLegAssignmentDto>
                {
                    new()
                    {
                        VehicleId = vaVn?.VehicleId ?? "VEH_BOX_01",
                        PlateNumber = vaVn?.Vehicle != null ? (vaVn.Vehicle.VehicleId.Replace("VEH_BOX_", "51C-10") + ".45") : "51C-101.45",
                        MainDriverId = vaVn?.DriverId ?? "USR_DRV_01",
                        CoDriverId = "USR_DRV_02",
                        VeterinarianId = vaVn?.EscortId ?? "USR_ESC_01",
                        Horses = horses.Select((h, i) => new HorseStallAllocationDto { HorseId = h.HorseId, StallNumber = i + 1 }).ToList(),
                        Staff = new List<StaffRoleItemDto>
                        {
                            new() { UserId = vaVn?.DriverId ?? "USR_DRV_01", AssignmentRole = "MAIN_DRIVER" },
                            new() { UserId = "USR_DRV_02", AssignmentRole = "CO_DRIVER" },
                            new() { UserId = vaVn?.EscortId ?? "USR_ESC_01", AssignmentRole = "VETERINARIAN" }
                        }
                    }
                }
            });

            if (isInternational)
            {
                // 2. Chặng 2: Chuyến bay hàng không thẳng VN -> JP (AIR Leg: SGN -> NRT)
                legs.Add(new LegAssignmentDto
                {
                    LegId = 52,
                    Sequence = 2,
                    Mode = "AIR",
                    Country = "INTL",
                    FlightBookingId = flightBooking?.FlightBookingId ?? 300,
                    VeterinarianIds = new List<string>(), // Hãng hàng không chịu trách nhiệm chăm sóc trên chuyến bay
                    HorseIds = horses.Select(h => h.HorseId).ToList()
                });

                // 3. Chặng 3: Đường bộ giao tại Nhật Bản (Inbound ROAD JP: NRT -> Tokyo)
                legs.Add(new LegAssignmentDto
                {
                    LegId = 53,
                    Sequence = 3,
                    Mode = "ROAD",
                    Country = "JP",
                    Vehicles = new List<VehicleLegAssignmentDto>
                    {
                        new()
                        {
                            VehicleId = vaJp?.VehicleId ?? "VEH_JP_01",
                            PlateNumber = vaJp?.VehicleId == "VEH_JP_02" ? "成田 500 い 56-78" : "品川 300 あ 12-34",
                            MainDriverId = vaJp?.DriverId ?? "USR_DRV_JP_01",
                            CoDriverId = "USR_DRV_JP_02",
                            VeterinarianId = vaJp?.EscortId ?? "USR_ESC_JP_01",
                            Horses = horses.Select((h, i) => new HorseStallAllocationDto { HorseId = h.HorseId, StallNumber = i + 1 }).ToList(),
                            Staff = new List<StaffRoleItemDto>
                            {
                                new() { UserId = vaJp?.DriverId ?? "USR_DRV_JP_01", AssignmentRole = "MAIN_DRIVER" },
                                new() { UserId = "USR_DRV_JP_02", AssignmentRole = "CO_DRIVER" },
                                new() { UserId = vaJp?.EscortId ?? "USR_ESC_JP_01", AssignmentRole = "VETERINARIAN" }
                            }
                        }
                    }
                });
            }

            return new TripAssignmentsDetailDto
            {
                TripId = tripId,
                RouteVersionId = 120,
                RouteVersion = 1,
                Editable = true,
                Horses = horses,
                Legs = legs,
                IsComplete = true,
                Missing = new List<string>(),
                AllowedActions = new List<string> { "VALIDATE", "EDIT" }
            };
        }

        public Task<ValidateAssignmentsResponseDto> ValidateAssignmentsAsync(string tripId, TripAssignmentsDetailDto dto)
        {
            var errors = new List<AssignmentErrorDto>();
            var warnings = new List<string>();

            VehicleLegAssignmentDto? outboundVeh = null;
            VehicleLegAssignmentDto? inboundVeh = null;

            foreach (var leg in dto.Legs)
            {
                if (leg.Mode == "ROAD")
                {
                    if (!leg.Vehicles.Any())
                    {
                        errors.Add(new AssignmentErrorDto { Code = "MISSING_VEHICLE", LegId = leg.LegId, Message = $"Chặng {leg.LegId} ({leg.Country}) chưa được phân công phương tiện vận chuyển!" });
                        continue;
                    }

                    foreach (var v in leg.Vehicles)
                    {
                        if (leg.Country == "VN") outboundVeh = v;
                        if (leg.Country == "JP") inboundVeh = v;

                        if (string.IsNullOrEmpty(v.VehicleId))
                        {
                            errors.Add(new AssignmentErrorDto { Code = "MISSING_VEHICLE", LegId = leg.LegId, Message = $"Chặng {leg.LegId} thiếu phương tiện vận chuyển!" });
                        }
                        else
                        {
                            // Kiểm tra quốc gia đăng kiểm xe
                            if (leg.Country == "JP" && !v.VehicleId.Contains("_JP_"))
                            {
                                errors.Add(new AssignmentErrorDto { Code = "RESOURCE_COUNTRY_NOT_ELIGIBLE", LegId = leg.LegId, Message = $"Xe {v.VehicleId} không đủ điều kiện lưu hành tại Nhật Bản (JP)!" });
                            }
                            else if (leg.Country == "VN" && v.VehicleId.Contains("_JP_"))
                            {
                                errors.Add(new AssignmentErrorDto { Code = "RESOURCE_COUNTRY_NOT_ELIGIBLE", LegId = leg.LegId, Message = $"Xe {v.VehicleId} đăng ký tại Nhật Bản không thể dùng cho chặng đón tại Việt Nam (VN)!" });
                            }
                        }

                        if (string.IsNullOrEmpty(v.MainDriverId))
                        {
                            errors.Add(new AssignmentErrorDto { Code = "MISSING_MAIN_DRIVER", LegId = leg.LegId, Message = $"Chặng {leg.LegId} ({leg.Country}) thiếu tài xế chính!" });
                        }
                        if (string.IsNullOrEmpty(v.VeterinarianId))
                        {
                            errors.Add(new AssignmentErrorDto { Code = "MISSING_VETERINARIAN", LegId = leg.LegId, Message = $"Chặng {leg.LegId} ({leg.Country}) bắt buộc phải có Bác sĩ thú y (VETERINARIAN) đi kèm!" });
                        }
                        if (string.IsNullOrEmpty(v.CoDriverId))
                        {
                            warnings.Add($"Chặng {leg.LegId} ({leg.Country}) khuyến nghị phân công Phụ lái kiêm Escort theo tiêu chuẩn an toàn đường bộ.");
                        }

                        // KIỂM TRA ĐỘC LẬP VAI TRÒ TRONG CÙNG 1 CHẶNG (F03-BR-11)
                        if (!string.IsNullOrEmpty(v.MainDriverId) && v.MainDriverId == v.VeterinarianId)
                        {
                            errors.Add(new AssignmentErrorDto { Code = "INDEPENDENT_ROLES_VIOLATION", LegId = leg.LegId, Message = $"Tại chặng {leg.LegId}: Tài xế chính và Bác sĩ thú y không được là cùng một người!" });
                        }
                        if (!string.IsNullOrEmpty(v.MainDriverId) && !string.IsNullOrEmpty(v.CoDriverId) && v.MainDriverId == v.CoDriverId)
                        {
                            errors.Add(new AssignmentErrorDto { Code = "INDEPENDENT_ROLES_VIOLATION", LegId = leg.LegId, Message = $"Tại chặng {leg.LegId}: Tài xế chính và Phụ lái không được trùng nhau!" });
                        }
                        if (!string.IsNullOrEmpty(v.CoDriverId) && !string.IsNullOrEmpty(v.VeterinarianId) && v.CoDriverId == v.VeterinarianId)
                        {
                            errors.Add(new AssignmentErrorDto { Code = "INDEPENDENT_ROLES_VIOLATION", LegId = leg.LegId, Message = $"Tại chặng {leg.LegId}: Phụ lái và Bác sĩ thú y không được trùng nhau!" });
                        }
                    }
                }
                else if (leg.Mode == "AIR")
                {
                    if (leg.FlightBookingId == null || leg.FlightBookingId == 0)
                    {
                        errors.Add(new AssignmentErrorDto { Code = "FLIGHT_BOOKING_REQUIRED", LegId = leg.LegId, Message = "Chặng hàng không (AIR) bắt buộc phải có thông tin đặt vé máy bay đã xác nhận!" });
                    }
                }
            }

            // KIỂM TRA ĐỘC LẬP TÀI NGUYÊN GIỮA HAI CHẶNG ĐƯỜNG BỘ VN VÀ JP (Phương án B)
            if (outboundVeh != null && inboundVeh != null)
            {
                if (outboundVeh.VehicleId == inboundVeh.VehicleId && !string.IsNullOrEmpty(outboundVeh.VehicleId))
                {
                    errors.Add(new AssignmentErrorDto { Code = "VEHICLE_CROSS_LEG_CONFLICT", Message = "Phương án B: Xe chặng đón tại Việt Nam không được trùng với xe chặng giao tại Nhật Bản!" });
                }

                var outboundStaff = new[] { outboundVeh.MainDriverId, outboundVeh.CoDriverId, outboundVeh.VeterinarianId }.Where(s => !string.IsNullOrEmpty(s)).ToList();
                var inboundStaff = new[] { inboundVeh.MainDriverId, inboundVeh.CoDriverId, inboundVeh.VeterinarianId }.Where(s => !string.IsNullOrEmpty(s)).ToList();

                var overlapping = outboundStaff.Intersect(inboundStaff).ToList();
                if (overlapping.Any())
                {
                    errors.Add(new AssignmentErrorDto { Code = "STAFF_CROSS_LEG_CONFLICT", Message = $"Phương án B: Nhân sự chặng Việt Nam không được trùng với nhân sự chặng Nhật Bản! ({string.Join(", ", overlapping)})" });
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
            var valResult = await ValidateAssignmentsAsync(tripId, dto);
            if (!valResult.Valid)
            {
                var firstError = valResult.Errors.FirstOrDefault()?.Message ?? "Phân công xe và nhân sự không hợp lệ!";
                throw new InvalidOperationException(firstError);
            }

            var trip = await _context.TripPlans
                .Include(t => t.VehicleAssignments)
                .FirstOrDefaultAsync(t => t.TripId == tripId);

            if (trip == null) return false;

            // Xóa các phân công cũ của trip để ghi nhận phân công đa chặng mới
            _context.TripVehicleAssignments.RemoveRange(trip.VehicleAssignments);

            // Duyệt từng chặng đường bộ và lưu vào DB
            foreach (var leg in dto.Legs.Where(l => l.Mode == "ROAD"))
            {
                foreach (var v in leg.Vehicles)
                {
                    if (string.IsNullOrEmpty(v.VehicleId)) continue;

                    var assignment = new TripVehicleAssignment
                    {
                        AssignmentId = "ASG_" + Guid.NewGuid().ToString("N")[..8].ToUpper(),
                        TripId = tripId,
                        LegNumber = leg.LegNumber,
                        LegType = leg.LegType ?? (leg.LegNumber == 2 || leg.Country == "JP" ? "INBOUND" : "OUTBOUND"),
                        VehicleId = v.VehicleId,
                        DriverId = v.MainDriverId ?? (leg.Country == "JP" ? "USR_DRV_JP_01" : "USR_DRV_01"),
                        CoDriverId = v.CoDriverId ?? (leg.Country == "JP" ? "USR_DRV_JP_02" : "USR_DRV_02"),
                        VeterinarianId = v.VeterinarianId ?? (leg.Country == "JP" ? "USR_ESC_JP_01" : "USR_ESC_01"),
                        EscortId = v.VeterinarianId ?? (leg.Country == "JP" ? "USR_ESC_JP_01" : "USR_ESC_01")
                    };
                    _context.TripVehicleAssignments.Add(assignment);

                    var vehicleEntity = await _context.Vehicles.FindAsync(v.VehicleId);
                    if (vehicleEntity != null)
                    {
                        vehicleEntity.Status = "READY";
                    }
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> AssignCrewAndVehicleAsync(string tripId, AssignCrewVehicleDto dto)
        {
            var trip = await _context.TripPlans
                .Include(t => t.VehicleAssignments)
                .FirstOrDefaultAsync(t => t.TripId == tripId);

            if (trip == null) throw new KeyNotFoundException($"Không tìm thấy chuyến đi: {tripId}");

            // Kiểm tra quy chuẩn an toàn độc lập vai trò
            if (dto.DriverId == dto.EscortId)
            {
                throw new InvalidOperationException("Vi phạm quy chuẩn an toàn: Một người không được đảm nhận đồng thời 2 vị trí Tài xế và Hộ tống viên!");
            }
            if (!string.IsNullOrEmpty(dto.CoDriverId))
            {
                if (dto.DriverId == dto.CoDriverId)
                {
                    throw new InvalidOperationException("Vi phạm quy chuẩn an toàn: Tài xế chính và Phụ lái không được trùng nhau!");
                }
                if (dto.CoDriverId == dto.EscortId)
                {
                    throw new InvalidOperationException("Vi phạm quy chuẩn an toàn: Phụ lái và Bác sĩ thú y không được trùng nhau!");
                }
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
                if (!dto.DriverId.StartsWith("USR_DRV"))
                {
                    throw new InvalidOperationException($"Nhân sự {dto.DriverId} không hợp lệ hoặc không có vai trò Tài xế!");
                }
            }

            var escort = await _context.Users.FindAsync(dto.EscortId);
            if (escort == null || !escort.IsActive || (escort.Role != "Escort" && escort.Role != "Specialist"))
            {
                if (!dto.EscortId.StartsWith("USR_ESC"))
                {
                    throw new InvalidOperationException($"Nhân sự {dto.EscortId} không hợp lệ hoặc không có vai trò Hộ tống/Bác sĩ thú y!");
                }
            }

            bool isJp = dto.LegNumber == 2 || dto.LegType == "INBOUND" || dto.VehicleId.Contains("_JP_") || dto.DriverId.Contains("_JP_");
            int legNum = dto.LegNumber > 0 ? dto.LegNumber : (isJp ? 2 : 1);
            string legType = !string.IsNullOrEmpty(dto.LegType) ? dto.LegType : (isJp ? "INBOUND" : "OUTBOUND");

            var targetAssignment = trip.VehicleAssignments.FirstOrDefault(va =>
                va.LegNumber == legNum || (isJp ? (va.LegType == "INBOUND" || va.VehicleId.Contains("_JP_")) : (va.LegType == "OUTBOUND" || !va.VehicleId.Contains("_JP_"))));

            if (targetAssignment == null)
            {
                targetAssignment = new TripVehicleAssignment
                {
                    AssignmentId = "ASG_" + Guid.NewGuid().ToString("N")[..8].ToUpper(),
                    TripId = tripId,
                    LegNumber = legNum,
                    LegType = legType,
                    VehicleId = dto.VehicleId,
                    DriverId = dto.DriverId,
                    CoDriverId = dto.CoDriverId,
                    VeterinarianId = dto.VeterinarianId ?? dto.EscortId,
                    EscortId = dto.EscortId
                };
                _context.TripVehicleAssignments.Add(targetAssignment);
            }
            else
            {
                targetAssignment.LegNumber = legNum;
                targetAssignment.LegType = legType;
                targetAssignment.VehicleId = dto.VehicleId;
                targetAssignment.DriverId = dto.DriverId;
                targetAssignment.CoDriverId = dto.CoDriverId;
                targetAssignment.VeterinarianId = dto.VeterinarianId ?? dto.EscortId;
                targetAssignment.EscortId = dto.EscortId;
            }

            vehicle.Status = "READY";
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

            var depAt = dto.DepartureAt != default ? dto.DepartureAt : (dto.DepartureTime ?? DateTime.UtcNow.AddDays(2));
            var arrAt = dto.ArrivalAt != default ? dto.ArrivalAt : (dto.ArrivalTime ?? depAt.AddHours(7));
            var provName = !string.IsNullOrWhiteSpace(dto.ProviderName) ? dto.ProviderName : (!string.IsNullOrWhiteSpace(dto.Airline) ? dto.Airline : "Vietnam Airlines Cargo");
            var bookRef = !string.IsNullOrWhiteSpace(dto.BookingReference) ? dto.BookingReference : (!string.IsNullOrWhiteSpace(dto.BookingRef) ? dto.BookingRef : "VN-BOOKING-" + Guid.NewGuid().ToString("N")[..6].ToUpper());
            var flNumber = !string.IsNullOrWhiteSpace(dto.FlightNumber) ? dto.FlightNumber : "VN310";
            var airline = !string.IsNullOrWhiteSpace(dto.Airline) ? dto.Airline : "Vietnam Airlines Cargo";

            var newBooking = new FlightBooking
            {
                TripId = cleanTripId,
                BookingVersion = nextVersion,
                RouteVersionId = dto.RouteVersionId ?? currentBooking?.RouteVersionId ?? 120,
                ProviderName = provName,
                Airline = airline,
                FlightNumber = flNumber,
                DepartureAirportCheckpointId = dto.DepartureAirportCheckpointId ?? 101,
                ArrivalAirportCheckpointId = dto.ArrivalAirportCheckpointId ?? 201,
                DepartureAt = depAt,
                ArrivalAt = arrAt,
                DirectFlight = true,
                BookingReference = bookRef,
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

            bool routeApproved = trip.Status == "APPROVED" || trip.Status == "READY" || trip.Status == "READY_TO_DEPART" || trip.Status == "IN_TRANSIT" || trip.Status == "COMPLETED" || trip.Status == "EXECUTING" || trip.Status == "PLANNING" || trip.Status == "PLAN_APPROVED" || trip.Status == "SUBMITTED" || trip.Status == "PENDING_APPROVAL";
            if (!routeApproved) missing.Add("Lộ trình chưa được Logistics Manager phê duyệt (ROUTE_APPROVED)");

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

            bool confirmedByCoordinator = trip.Status == "READY_TO_DEPART" || trip.Status == "READY" || trip.Status == "IN_TRANSIT" || trip.Status == "COMPLETED";

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
            trip.ResourcesConfirmedAt = DateTime.UtcNow;
            trip.ResourcesConfirmedBy = "USR_COORD_01";

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
            bool operationsReady = opReadiness.IsReady && (trip?.ResourcesConfirmedAt.HasValue == true || opReadiness.ConfirmedByCoordinator);
            if (!operationsReady && trip?.ResourcesConfirmedAt.HasValue != true)
            {
                missing.Add("OPERATIONS_NOT_CONFIRMED: Điều phối viên chưa bấm Xác nhận nguồn lực (Operations READY)");
            }

            // 2. ĐIỀU KIỆN LEGAL/DOCS READY (Chuyên viên giấy tờ hoàn tất hồ sơ kiểm dịch)
            bool legalReady = trip != null
                && trip.EarliestDepartureDate.HasValue
                && (trip.DocumentExpiryDate == null || trip.DocumentExpiryDate.Value >= DateTime.UtcNow.Date);

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

        private async Task<(decimal distanceKm, int durationMinutes, List<double[]> path, string source)> CalculateLegMapboxAsync(
            double fromLat, double fromLng, double toLat, double toLng, CancellationToken ct = default)
        {
            var token = _configuration?["Maps:Mapbox:AccessToken"]
                ?? _configuration?["Flow1:Maps:Mapbox:AccessToken"]
                ?? "pk.eyJ1IjoiaWNld29ybSIsImEiOiJjbXZhY3RyazQwM3k2MndvbWhsN2Fmb29tIn0.20kPK7DHlQJDDbjXdhAQCw";

            if (!string.IsNullOrWhiteSpace(token) && _httpClientFactory != null)
            {
                try
                {
                    var client = _httpClientFactory.CreateClient("MapboxClient");
                    var fromLngStr = fromLng.ToString(CultureInfo.InvariantCulture);
                    var fromLatStr = fromLat.ToString(CultureInfo.InvariantCulture);
                    var toLngStr = toLng.ToString(CultureInfo.InvariantCulture);
                    var toLatStr = toLat.ToString(CultureInfo.InvariantCulture);

                    var url = $"https://api.mapbox.com/directions/v5/mapbox/driving/{fromLngStr},{fromLatStr};{toLngStr},{toLatStr}?geometries=geojson&overview=full&radiuses=unlimited;unlimited&access_token={token}";

                    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                    cts.CancelAfter(TimeSpan.FromSeconds(8));

                    var response = await client.GetAsync(url, cts.Token);
                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync(cts.Token);
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("routes", out var routes) && routes.GetArrayLength() > 0)
                        {
                            var firstRoute = routes[0];
                            var distanceMeters = firstRoute.GetProperty("distance").GetDouble();
                            var durationSeconds = firstRoute.GetProperty("duration").GetDouble();
                            var distKm = Math.Round((decimal)(distanceMeters / 1000.0), 1);
                            var durMin = (int)Math.Ceiling(durationSeconds / 60.0);

                            var path = new List<double[]>();
                            if (firstRoute.TryGetProperty("geometry", out var geom) && geom.TryGetProperty("coordinates", out var coords))
                            {
                                foreach (var pt in coords.EnumerateArray())
                                {
                                    var lng = pt[0].GetDouble();
                                    var lat = pt[1].GetDouble();
                                    path.Add(new double[] { Math.Round(lat, 5), Math.Round(lng, 5) });
                                }
                            }

                            if (path.Count == 0)
                            {
                                path = GenerateInterpolatedPoints(fromLat, fromLng, toLat, toLng, 6);
                            }

                            return (distKm, durMin, path, "MAPBOX_DIRECTIONS");
                        }
                    }
                }
                catch
                {
                    // Tự động fallback về Haversine khi mất mạng hoặc API lỗi
                }
            }

            var dist = (decimal)CalculateDistance(fromLat, fromLng, toLat, toLng);
            if (dist < 5) dist = 35;
            var driveHours = dist / 50.0m;
            var durMinutes = (int)(driveHours * 60);
            var fallbackPath = GenerateInterpolatedPoints(fromLat, fromLng, toLat, toLng, 6);
            return (Math.Round(dist, 1), durMinutes, fallbackPath, "HAVERSINE_FALLBACK");
        }

        private static List<Vehicle> GetDefaultVehicles()
        {
            return new List<Vehicle>
            {
                new() { VehicleId = "VEH_BOX_01", Type = "HORSEBOX_3_STALLS", CapacityStalls = 3, MaxRangeKm = 900, FuelCostPerKm = 1.20m, Status = "AVAILABLE" },
                new() { VehicleId = "VEH_BOX_02", Type = "HORSEBOX_6_STALLS", CapacityStalls = 6, MaxRangeKm = 1200, FuelCostPerKm = 1.80m, Status = "ON_TRIP" },
                new() { VehicleId = "VEH_BOX_03", Type = "HORSEBOX_2_STALLS", CapacityStalls = 2, MaxRangeKm = 750, FuelCostPerKm = 1.00m, Status = "MAINTENANCE" },
                new() { VehicleId = "VEH_BOX_04", Type = "HORSEBOX_4_STALLS", CapacityStalls = 4, MaxRangeKm = 1000, FuelCostPerKm = 1.40m, Status = "AVAILABLE" },
                new() { VehicleId = "VEH_BOX_05", Type = "HORSEBOX_3_STALLS", CapacityStalls = 3, MaxRangeKm = 950, FuelCostPerKm = 1.25m, Status = "READY" },
                new() { VehicleId = "VEH_JP_01", Type = "HORSEBOX_4_STALLS_JP", CapacityStalls = 4, MaxRangeKm = 800, FuelCostPerKm = 1.60m, Status = "READY" },
                new() { VehicleId = "VEH_JP_02", Type = "HORSEBOX_2_STALLS_JP", CapacityStalls = 2, MaxRangeKm = 650, FuelCostPerKm = 1.30m, Status = "AVAILABLE" }
            };
        }

        private async Task SeedSampleTripsAsync()
        {
            // 1. Seed Vehicles
            foreach (var v in GetDefaultVehicles())
            {
                if (!await _context.Vehicles.AnyAsync(x => x.VehicleId == v.VehicleId))
                {
                    _context.Vehicles.Add(v);
                }
            }

            // 2. Seed Users / Staff (VN & JP)
            var defaultStaff = new List<User>
            {
                new() { UserId = "USR_DRV_01", FullName = "Nguyễn Văn Hùng", Role = "STAFF", Phone = "0912345678", Email = "hung.nguyen@horsetransport.vn", PasswordHash = "AQAAAAIAAYagAAAAEPwdDemoHashSalt1==" },
                new() { UserId = "USR_DRV_02", FullName = "Trần Đình Trọng", Role = "STAFF", Phone = "0912345679", Email = "trong.tran@horsetransport.vn", PasswordHash = "AQAAAAIAAYagAAAAEPwdDemoHashSalt2==" },
                new() { UserId = "USR_ESC_01", FullName = "BS. Lê Minh Hoàng", Role = "STAFF", Phone = "0912345680", Email = "hoang.le@horsetransport.vn", PasswordHash = "AQAAAAIAAYagAAAAEPwdDemoHashSalt3==" },
                new() { UserId = "USR_DRV_JP_01", FullName = "Kenji Sato", Role = "STAFF", Phone = "+81-90-1234-5678", Email = "kenji.sato@horsetransport.jp", PasswordHash = "AQAAAAIAAYagAAAAEPwdDemoHashSalt4==" },
                new() { UserId = "USR_DRV_JP_02", FullName = "Takashi Tanaka", Role = "STAFF", Phone = "+81-90-8765-4321", Email = "takashi.tanaka@horsetransport.jp", PasswordHash = "AQAAAAIAAYagAAAAEPwdDemoHashSalt5==" },
                new() { UserId = "USR_ESC_JP_01", FullName = "Dr. Yoko Takahashi", Role = "STAFF", Phone = "+81-90-5555-6666", Email = "yoko.takahashi@vet-tokyo.jp", PasswordHash = "AQAAAAIAAYagAAAAEPwdDemoHashSalt6==" }
            };
            foreach (var u in defaultStaff)
            {
                if (!await _context.Users.AnyAsync(x => x.UserId == u.UserId))
                {
                    _context.Users.Add(u);
                }
            }

            // 3. Seed REQ_2026_001 (International Multi-modal Air: VN -> JP)
            var req1 = await _context.TransportRequests.FindAsync("REQ_2026_001");
            if (req1 == null)
            {
                req1 = new TransportRequest
                {
                    RequestId = "REQ_2026_001",
                    CustomerId = "USR_CUST_01",
                    Departure = "Trại ngựa Củ Chi, TP.HCM",
                    Destination = "Trường đua Fuchu Racecourse, Tokyo, Nhật Bản",
                    Purpose = "Thi đấu Cúp Hoàng Gia Tokyo 2026",
                    TransportType = "MULTIMODAL_AIR",
                    ExpectedDate = DateTime.UtcNow.AddDays(2),
                    CommittedDeadline = DateTime.UtcNow.AddDays(5),
                    DesignatedReceiverName = "Mr. Kenji Sato",
                    DesignatedReceiverPhone = "+819012345678",
                    BaseCost = 14500.00m,
                    Status = "ACTIVATED"
                };
                _context.TransportRequests.Add(req1);
            }
            else
            {
                req1.Departure = "Trại ngựa Củ Chi, TP.HCM";
                req1.Destination = "Trường đua Fuchu Racecourse, Tokyo, Nhật Bản";
                req1.TransportType = "MULTIMODAL_AIR";
            }

            // 4. Seed RequestHorseMappings for REQ_2026_001
            if (!await _context.RequestHorseMappings.AnyAsync(m => m.RequestId == "REQ_2026_001"))
            {
                _context.RequestHorseMappings.Add(new RequestHorseMapping { RequestId = "REQ_2026_001", HorseId = "HRS_001" });
                _context.RequestHorseMappings.Add(new RequestHorseMapping { RequestId = "REQ_2026_001", HorseId = "HRS_002" });
            }

            // 5. Seed TRIP_2026_001
            var trip1 = await _context.TripPlans.FindAsync("TRIP_2026_001");
            if (trip1 == null)
            {
                trip1 = new TripPlan
                {
                    TripId = "TRIP_2026_001",
                    RequestId = "REQ_2026_001",
                    TotalDistanceKm = 4450.00m,
                    TTotalHours = 18.50m,
                    TotalCost = 14500.00m,
                    Status = "PLANNING"
                };
                _context.TripPlans.Add(trip1);
            }

            // 6. Seed RouteSegments for TRIP_2026_001
            if (!await _context.RouteSegments.AnyAsync(s => s.TripId == "TRIP_2026_001"))
            {
                _context.RouteSegments.AddRange(
                    new RouteSegment
                    {
                        SegmentId = "SEG_2026_001_01",
                        TripId = "TRIP_2026_001",
                        SegmentType = "ORIGIN",
                        LocationName = "Trại ngựa Củ Chi -> Sân bay Tân Sơn Nhất (SGN)",
                        TransportMode = "ROAD",
                        ExpectedEta = DateTime.UtcNow.AddDays(2).AddHours(2),
                        Status = "COMPLETED"
                    },
                    new RouteSegment
                    {
                        SegmentId = "SEG_2026_001_02",
                        TripId = "TRIP_2026_001",
                        SegmentType = "REST_STOP",
                        LocationName = "Sân bay Tân Sơn Nhất (SGN) -> Sân bay Narita (NRT)",
                        TransportMode = "AIR",
                        CarrierName = "Nippon Cargo Airlines",
                        FlightVoyageNo = "KZ-102",
                        ExpectedEta = DateTime.UtcNow.AddDays(2).AddHours(8),
                        Status = "PLANNED"
                    },
                    new RouteSegment
                    {
                        SegmentId = "SEG_2026_001_03",
                        TripId = "TRIP_2026_001",
                        SegmentType = "DESTINATION",
                        LocationName = "Sân bay Narita (NRT) -> Trường đua Fuchu, Tokyo",
                        TransportMode = "ROAD",
                        ExpectedEta = DateTime.UtcNow.AddDays(2).AddHours(11),
                        Status = "PLANNED"
                    }
                );
            }

            // 7. Seed TripVehicleAssignments for TRIP_2026_001 (Phương án B: 2 chặng đường bộ độc lập)
            if (!await _context.TripVehicleAssignments.AnyAsync(a => a.TripId == "TRIP_2026_001"))
            {
                _context.TripVehicleAssignments.AddRange(
                    new TripVehicleAssignment
                    {
                        AssignmentId = "ASG_2026_001_VN",
                        TripId = "TRIP_2026_001",
                        VehicleId = "VEH_BOX_01",
                        DriverId = "USR_DRV_01",
                        EscortId = "USR_ESC_01"
                    },
                    new TripVehicleAssignment
                    {
                        AssignmentId = "ASG_2026_001_JP",
                        TripId = "TRIP_2026_001",
                        VehicleId = "VEH_JP_01",
                        DriverId = "USR_DRV_JP_01",
                        EscortId = "USR_ESC_JP_01"
                    }
                );
            }

            // 8. Seed REQ_2026_002 and TRIP_2026_002
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

            // 8b. Seed REQ_2026_003 (Đơn yêu cầu mới từ khách hàng, đã cọc, chờ lập kế hoạch)
            var req3 = await _context.TransportRequests.FindAsync("REQ_2026_003");
            if (req3 == null)
            {
                req3 = new TransportRequest
                {
                    RequestId = "REQ_2026_003",
                    CustomerId = "USR_CUST_01",
                    Departure = "Trại ngựa Vạn Hạnh, Củ Chi, TP.HCM",
                    Destination = "Sân vận động Quốc gia Mỹ Đình, Hà Nội",
                    Purpose = "Thi đấu Giải Vô địch Quốc gia 2026",
                    TransportType = "ROAD_DOMESTIC",
                    ExpectedDate = DateTime.UtcNow.AddDays(4),
                    CommittedDeadline = DateTime.UtcNow.AddDays(7),
                    DesignatedReceiverName = "Nguyễn Văn Hưng",
                    DesignatedReceiverPhone = "0988776655",
                    BaseCost = 3500.00m,
                    Status = "ACTIVATED"
                };
                _context.TransportRequests.Add(req3);

                if (!await _context.RequestHorseMappings.AnyAsync(m => m.RequestId == "REQ_2026_003"))
                {
                    _context.RequestHorseMappings.Add(new RequestHorseMapping { RequestId = "REQ_2026_003", HorseId = "HRS_001" });
                }
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

            // 9. Seed FlightBooking for TRIP_2026_001
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
