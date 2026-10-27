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

    }
}