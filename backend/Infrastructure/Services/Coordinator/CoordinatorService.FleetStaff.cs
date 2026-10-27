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

        public async Task<bool> DeleteVehicleAsync(string vehicleId)
        {
            var vehicle = await _context.Vehicles.FindAsync(vehicleId);
            if (vehicle == null) return false;

            // Kiểm tra xe có đang nằm trong chuyến đi đang thực hiện hoặc lên kế hoạch không
            var hasActiveAssignment = await _context.TripVehicleAssignments
                .Include(tva => tva.Trip)
                .AnyAsync(tva => tva.VehicleId == vehicleId &&
                    tva.Trip != null &&
                    (tva.Trip.Status == "IN_TRANSIT" || tva.Trip.Status == "READY_TO_DEPART" || tva.Trip.Status == "PLANNING"));

            if (hasActiveAssignment)
            {
                throw new InvalidOperationException($"Không thể vô hiệu hóa phương tiện {vehicleId} vì xe đang được phân công trong chuyến đi.");
            }

            vehicle.Status = "INACTIVE";
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
            var query = _context.Vehicles
                .Where(v => v.Status == "AVAILABLE" || v.Status == "READY")
                .Where(v => v.Status != "INACTIVE" && v.Status != "MAINTENANCE" && v.Status != "ON_TRIP");

            if (!string.IsNullOrEmpty(tripId))
            {
                var busyVehicleIds = await _context.TripVehicleAssignments
                    .Include(tva => tva.Trip)
                    .Where(tva => tva.TripId != tripId &&
                        tva.Trip != null &&
                        (tva.Trip.Status == "IN_TRANSIT" || tva.Trip.Status == "READY_TO_DEPART"))
                    .Select(tva => tva.VehicleId)
                    .Distinct()
                    .ToListAsync();

                query = query.Where(v => !busyVehicleIds.Contains(v.VehicleId));
            }

            var vehicles = await query.ToListAsync();
            return vehicles.Select(v =>
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
                    Status = v.Status ?? "AVAILABLE",
                    IsAvailable = true
                };
            }).ToList();
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
        // FLOW 3 V2 STAFF OPERATIONS (F3-J48, F3-J49)
        // =========================================================================
        public async Task<List<StaffV2Dto>> GetStaffListV2Async(string? tripId, string? leg, string? status)
        {
            var oldStaff = await GetStaffListAsync();
            string expectedCountry = leg == "inbound" ? "JP" : "VN";

            var result = new List<StaffV2Dto>();
            foreach (var s in oldStaff)
            {
                bool isJp = s.CanDriveCountries.Contains("JP") || s.UserId.Contains("_JP_");
                string country = isJp ? "JP" : "VN";
                string pos = s.Role.Equals("Driver", StringComparison.OrdinalIgnoreCase) ? "DRIVER" :
                             (s.Role.Equals("Escort", StringComparison.OrdinalIgnoreCase) ? "VETERINARIAN" : "ESCORT");

                string staffStatus = s.IsActive ? "ACTIVE" : "INACTIVE";
                if (!string.IsNullOrEmpty(status) && !staffStatus.Equals(status, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                bool isEligible = s.IsActive && (string.IsNullOrEmpty(leg) || country == expectedCountry);
                var blockers = new List<BlockerDto>();
                if (!s.IsActive)
                {
                    blockers.Add(new BlockerDto { Code = "STAFF_INACTIVE", Field = "status", Message = "Nhân viên đang tạm ngưng hoạt động" });
                }
                if (!string.IsNullOrEmpty(leg) && country != expectedCountry)
                {
                    blockers.Add(new BlockerDto { Code = "COUNTRY_MISMATCH", Field = "country", Message = $"Nhân sự trực thuộc {country}, không thể phân công chặng {expectedCountry}" });
                }

                result.Add(new StaffV2Dto
                {
                    Id = s.UserId,
                    Version = 1,
                    Name = s.FullName,
                    Phone = s.Phone,
                    Country = country,
                    Position = pos,
                    Status = staffStatus,
                    Licence = s.LicenseClass,
                    CertExpiry = s.LicenseExpiry?.ToString("yyyy-MM-dd"),
                    AssignedTrips = new List<string>(),
                    Eligible = isEligible,
                    Blockers = blockers
                });
            }

            return result;
        }

        public async Task<StaffV2Dto> UpdateStaffStatusV2Async(string staffId, StaffStatusDto dto, string userId)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == staffId);
            if (user != null)
            {
                user.IsActive = dto.Status == "ACTIVE";
                user.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return new StaffV2Dto
            {
                Id = staffId,
                Version = dto.ExpectedVersion + 1,
                Name = user?.FullName ?? "Nhân viên tác nghiệp",
                Phone = user?.Phone ?? "+84901234567",
                Country = staffId.Contains("_JP_") ? "JP" : "VN",
                Position = user?.Role?.ToUpper() ?? "DRIVER",
                Status = dto.Status,
                AssignedTrips = new List<string>(),
                Eligible = dto.Status == "ACTIVE",
                Blockers = dto.Status == "ACTIVE" ? new List<BlockerDto>() : new List<BlockerDto>
                {
                    new() { Code = "STATUS_NOT_ACTIVE", Field = "status", Message = dto.Reason ?? "Trạng thái không sẵn sàng" }
                }
            };
        }
    }
}