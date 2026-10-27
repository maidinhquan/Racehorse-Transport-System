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
        // PRIVATE HELPERS & SEED DATA
        // =========================================================================
        private static List<Vehicle> GetDefaultVehicles()
        {
            return new List<Vehicle>
            {
                new() { VehicleId = "VEH_BOX_01", Type = "HORSEBOX_3_STALLS", CapacityStalls = 3, MaxRangeKm = 900, FuelCostPerKm = 1.20m, Status = "AVAILABLE", OperatingCountry = "VN", PlateNumber = "51C-101.45", HeightM = 3.80m, WidthM = 2.50m, LengthM = 10.00m, GrossWeightTons = 18.00m, AxleWeightTons = 4.00m },
                new() { VehicleId = "VEH_BOX_02", Type = "HORSEBOX_6_STALLS", CapacityStalls = 6, MaxRangeKm = 1200, FuelCostPerKm = 1.80m, Status = "ON_TRIP", OperatingCountry = "VN", PlateNumber = "51C-202.88", HeightM = 3.90m, WidthM = 2.55m, LengthM = 12.00m, GrossWeightTons = 24.00m, AxleWeightTons = 6.00m },
                new() { VehicleId = "VEH_BOX_03", Type = "HORSEBOX_2_STALLS", CapacityStalls = 2, MaxRangeKm = 750, FuelCostPerKm = 1.00m, Status = "MAINTENANCE", OperatingCountry = "VN", PlateNumber = "29B-303.12", HeightM = 3.40m, WidthM = 2.30m, LengthM = 7.50m, GrossWeightTons = 10.00m, AxleWeightTons = 3.50m },
                new() { VehicleId = "VEH_BOX_04", Type = "HORSEBOX_4_STALLS", CapacityStalls = 4, MaxRangeKm = 1000, FuelCostPerKm = 1.40m, Status = "AVAILABLE", OperatingCountry = "VN", PlateNumber = "51C-404.11", HeightM = 3.85m, WidthM = 2.50m, LengthM = 11.00m, GrossWeightTons = 20.00m, AxleWeightTons = 5.00m },
                new() { VehicleId = "VEH_BOX_05", Type = "HORSEBOX_3_STALLS", CapacityStalls = 3, MaxRangeKm = 950, FuelCostPerKm = 1.25m, Status = "READY", OperatingCountry = "VN", PlateNumber = "51C-505.22", HeightM = 3.80m, WidthM = 2.50m, LengthM = 10.00m, GrossWeightTons = 18.00m, AxleWeightTons = 4.00m },
                new() { VehicleId = "VEH_JP_01", Type = "HORSEBOX_3_STALLS", CapacityStalls = 3, MaxRangeKm = 1000, FuelCostPerKm = 2.50m, Status = "AVAILABLE", OperatingCountry = "JP", PlateNumber = "品川 300 あ 12-34", HeightM = 3.80m, WidthM = 2.50m, LengthM = 10.00m, GrossWeightTons = 18.00m, AxleWeightTons = 4.00m },
                new() { VehicleId = "VEH_JP_02", Type = "HORSEBOX_6_STALLS", CapacityStalls = 6, MaxRangeKm = 1300, FuelCostPerKm = 3.20m, Status = "AVAILABLE", OperatingCountry = "JP", PlateNumber = "成田 500 い 56-78", HeightM = 3.90m, WidthM = 2.55m, LengthM = 12.00m, GrossWeightTons = 24.00m, AxleWeightTons = 6.00m }
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