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

            var result = vehicles.Select(v =>
            {
                string regCountry = !string.IsNullOrWhiteSpace(v.OperatingCountry) ? v.OperatingCountry : (v.VehicleId.Contains("_JP_") ? "JP" : "VN");
                string plate = !string.IsNullOrWhiteSpace(v.PlateNumber) ? v.PlateNumber : v.VehicleId;

                return new VehicleDto
                {
                    VehicleId = v.VehicleId,
                    PlateNumber = plate,
                    Type = v.Type ?? (regCountry == "JP" ? "HORSEBOX_JP_LUXURY" : "HORSEBOX_3_STALLS"),
                    RegistrationCountry = regCountry,
                    TotalStalls = v.CapacityStalls ?? 3,
                    AvailableStalls = v.CapacityStalls ?? 3,
                    PayloadKg = regCountry == "JP" ? 10000 : 8000,
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

            string regCountry = !string.IsNullOrWhiteSpace(v.OperatingCountry) ? v.OperatingCountry : (v.VehicleId.Contains("_JP_") ? "JP" : "VN");
            string plate = !string.IsNullOrWhiteSpace(v.PlateNumber) ? v.PlateNumber : v.VehicleId;

            return new VehicleDto
            {
                VehicleId = v.VehicleId,
                PlateNumber = plate,
                Type = v.Type ?? (regCountry == "JP" ? "HORSEBOX_JP_LUXURY" : "HORSEBOX_3_STALLS"),
                RegistrationCountry = regCountry,
                TotalStalls = v.CapacityStalls ?? 3,
                AvailableStalls = v.CapacityStalls ?? 3,
                PayloadKg = regCountry == "JP" ? 10000 : 8000,
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
                PlateNumber = dto.PlateNumber,
                Type = dto.Type,
                OperatingCountry = !string.IsNullOrWhiteSpace(dto.OperatingCountry) ? dto.OperatingCountry : (!string.IsNullOrWhiteSpace(dto.RegistrationCountry) ? dto.RegistrationCountry : "VN"),
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
                PlateNumber = vehicle.PlateNumber ?? dto.PlateNumber,
                Type = vehicle.Type,
                RegistrationCountry = vehicle.OperatingCountry,
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

            vehicle.PlateNumber = dto.PlateNumber;
            vehicle.Type = dto.Type;
            if (!string.IsNullOrWhiteSpace(dto.OperatingCountry)) vehicle.OperatingCountry = dto.OperatingCountry;
            else if (!string.IsNullOrWhiteSpace(dto.RegistrationCountry)) vehicle.OperatingCountry = dto.RegistrationCountry;
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

        public async Task<List<ResourceScheduleItemDto>> GetVehicleScheduleAsync(string vehicleId)
        {
            var assignments = await _context.TripVehicleAssignments
                .Include(tva => tva.Trip)
                    .ThenInclude(t => t!.Request)
                .Where(tva => tva.VehicleId == vehicleId && tva.Trip != null)
                .ToListAsync();

            return assignments.Select(a => new ResourceScheduleItemDto
            {
                Kind = "TRIP",
                TripId = a.TripId,
                TripCode = a.TripId,
                LegIds = new List<int> { a.LegNumber },
                From = a.Trip?.Request?.ExpectedDate ?? DateTime.UtcNow,
                To = (a.Trip?.Request?.ExpectedDate ?? DateTime.UtcNow).AddDays(3),
                Note = $"Phân công chuyến đi {a.TripId} - Chặng {a.LegNumber} ({a.LegType})"
            }).ToList();
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
                string regCountry = !string.IsNullOrWhiteSpace(v.OperatingCountry) ? v.OperatingCountry : (v.VehicleId.Contains("_JP_") ? "JP" : "VN");
                string plate = !string.IsNullOrWhiteSpace(v.PlateNumber) ? v.PlateNumber : v.VehicleId;

                return new VehicleDto
                {
                    VehicleId = v.VehicleId,
                    PlateNumber = plate,
                    Type = v.Type ?? (regCountry == "JP" ? "HORSEBOX_JP_LUXURY" : "HORSEBOX_3_STALLS"),
                    RegistrationCountry = regCountry,
                    TotalStalls = v.CapacityStalls ?? 3,
                    AvailableStalls = v.CapacityStalls ?? 3,
                    PayloadKg = regCountry == "JP" ? 10000 : 8000,
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
            var query = _context.Users
                .Include(u => u.StaffDocuments)
                .Where(u => u.Role == "Driver" || u.Role == "Escort" || u.Role == "Specialist" || u.Role == "STAFF");

            if (!string.IsNullOrWhiteSpace(role))
            {
                query = query.Where(u => u.Role == role);
            }

            var staffUsers = await query.ToListAsync();

            var list = staffUsers.Select(u =>
            {
                var licenseDoc = u.StaffDocuments.FirstOrDefault(d => d.DocType == "DRIVING_LICENSE");
                var vetDoc = u.StaffDocuments.FirstOrDefault(d => d.DocType == "VET_CERTIFICATE" || d.DocType == "PASSPORT");
                var activeDoc = licenseDoc ?? vetDoc ?? u.StaffDocuments.FirstOrDefault();

                bool isJp = u.UserId.Contains("_JP_") || (activeDoc?.CountryOfIssue == "JPN");
                string defaultCountry = isJp ? "JP" : "VN";

                var canDrive = new List<string>();
                if (!string.IsNullOrWhiteSpace(activeDoc?.ValidForCountries))
                {
                    canDrive = activeDoc.ValidForCountries
                        .Split(new[] { ',', ';', ' ' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(c => c.Trim().ToUpper() == "JPN" ? "JP" : (c.Trim().ToUpper() == "VNM" ? "VN" : c.Trim().ToUpper()))
                        .Distinct()
                        .ToList();
                }
                if (!canDrive.Any())
                {
                    canDrive.Add(defaultCountry);
                }

                bool isDriverUser = u.Role.Equals("Driver", StringComparison.OrdinalIgnoreCase) || u.UserId.Contains("DRV", StringComparison.OrdinalIgnoreCase);
                bool isVetUser = u.Role.Equals("Escort", StringComparison.OrdinalIgnoreCase) || u.UserId.Contains("ESC", StringComparison.OrdinalIgnoreCase) || u.UserId.Contains("VET", StringComparison.OrdinalIgnoreCase);

                string licenseClass = isDriverUser
                    ? (isJp ? "Heavy Type 1" : "FC")
                    : (isVetUser ? "FEI-VET" : "N/A");

                DateTime? licenseExpiry = activeDoc?.ExpiryDate ?? (u.IsActive ? DateTime.UtcNow.AddYears(2) : null);

                string specialization = isDriverUser
                    ? (isJp ? "Tài xế chuyên dụng quốc tế (Nhật Bản)" : "Tài xế quốc tế hạng FC (Việt Nam)")
                    : (isVetUser
                        ? (isJp ? "Bác sĩ thú y Narita AQS - Chứng chỉ FEI (Nhật Bản)" : "Bác sĩ thú y áp tải FEI (Việt Nam)")
                        : (u.Role.Equals("Specialist", StringComparison.OrdinalIgnoreCase) ? "Chuyên viên thẩm định pháp lý & kiểm dịch" : "Nhân sự tác nghiệp vận tải"));

                return new StaffDto
                {
                    UserId = u.UserId,
                    FullName = u.FullName,
                    Role = u.Role,
                    LicenseClass = licenseClass,
                    LicenseExpiry = licenseExpiry,
                    CanDriveCountries = canDrive,
                    Email = u.Email ?? string.Empty,
                    Phone = u.Phone ?? string.Empty,
                    IsActive = u.IsActive,
                    IsAvailable = u.IsActive && (licenseExpiry == null || licenseExpiry.Value > DateTime.UtcNow),
                    Specialization = specialization
                };
            }).ToList();

            if (!string.IsNullOrWhiteSpace(country))
            {
                list = list.Where(s => s.CanDriveCountries.Contains(country.ToUpper())).ToList();
            }

            return list;
        }

        public async Task<List<ResourceScheduleItemDto>> GetStaffScheduleAsync(string userId)
        {
            var assignments = await _context.TripVehicleAssignments
                .Include(tva => tva.Trip)
                    .ThenInclude(t => t!.Request)
                .Where(tva => tva.DriverId == userId || tva.CoDriverId == userId || tva.VeterinarianId == userId || tva.EscortId == userId)
                .ToListAsync();

            return assignments.Select(a =>
            {
                string assignmentRole = a.DriverId == userId ? "MAIN_DRIVER" :
                                        (a.CoDriverId == userId ? "CO_DRIVER" : "VETERINARIAN");
                return new ResourceScheduleItemDto
                {
                    Kind = "TRIP",
                    TripId = a.TripId,
                    TripCode = a.TripId,
                    LegIds = new List<int> { a.LegNumber },
                    From = a.Trip?.Request?.ExpectedDate ?? DateTime.UtcNow,
                    To = (a.Trip?.Request?.ExpectedDate ?? DateTime.UtcNow).AddDays(3),
                    AssignmentRole = assignmentRole,
                    Note = $"Nhiệm vụ chuyến đi {a.TripId} - Chặng {a.LegNumber} ({assignmentRole})"
                };
            }).ToList();
        }

        // =========================================================================
        // FLOW 3 V2 STAFF OPERATIONS (F3-J48, F3-J49)
        // =========================================================================
        public async Task<List<StaffV2Dto>> GetStaffListV2Async(string? tripId, string? leg, string? status)
        {
            var staffList = await GetStaffListAsync();
            string expectedCountry = leg == "inbound" ? "JP" : "VN";

            var result = new List<StaffV2Dto>();
            foreach (var s in staffList)
            {
                bool isJp = s.CanDriveCountries.Contains("JP") || s.UserId.Contains("_JP_");
                string country = isJp ? "JP" : "VN";
                bool isDrv = s.Role.Equals("Driver", StringComparison.OrdinalIgnoreCase) || s.UserId.Contains("DRV", StringComparison.OrdinalIgnoreCase);
                bool isVet = s.Role.Equals("Escort", StringComparison.OrdinalIgnoreCase) || s.UserId.Contains("ESC", StringComparison.OrdinalIgnoreCase) || s.UserId.Contains("VET", StringComparison.OrdinalIgnoreCase);
                string pos = isDrv ? "DRIVER" :
                             (isVet ? "VETERINARIAN" :
                             (s.Role.Equals("Specialist", StringComparison.OrdinalIgnoreCase) ? "SPECIALIST" : "ESCORT"));

                string staffStatus = s.IsActive ? "ACTIVE" : "INACTIVE";
                if (!string.IsNullOrEmpty(status) && !staffStatus.Equals(status, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                bool isEligible = s.IsAvailable && (string.IsNullOrEmpty(leg) || country == expectedCountry);
                var blockers = new List<BlockerDto>();
                if (!s.IsActive)
                {
                    blockers.Add(new BlockerDto { Code = "STAFF_INACTIVE", Field = "status", Message = "Nhân viên đang tạm ngưng hoạt động" });
                }
                else if (!s.IsAvailable)
                {
                    blockers.Add(new BlockerDto { Code = "DOC_EXPIRED", Field = "licenseExpiry", Message = "Hồ sơ / Giấy phép của nhân viên đã hết hạn hiệu lực" });
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
            var user = await _context.Users
                .Include(u => u.StaffDocuments)
                .FirstOrDefaultAsync(u => u.UserId == staffId);

            if (user != null)
            {
                user.IsActive = dto.Status == "ACTIVE";
                await _context.SaveChangesAsync();
            }

            var staffList = await GetStaffListAsync();
            var updated = staffList.FirstOrDefault(s => s.UserId == staffId);

            return new StaffV2Dto
            {
                Id = staffId,
                Version = dto.ExpectedVersion + 1,
                Name = updated?.FullName ?? user?.FullName ?? "Nhân viên tác nghiệp",
                Phone = updated?.Phone ?? user?.Phone ?? string.Empty,
                Country = updated?.CanDriveCountries.Contains("JP") == true || staffId.Contains("_JP_") ? "JP" : "VN",
                Position = updated?.Role?.ToUpper() ?? user?.Role?.ToUpper() ?? "DRIVER",
                Status = dto.Status,
                Licence = updated?.LicenseClass,
                CertExpiry = updated?.LicenseExpiry?.ToString("yyyy-MM-dd"),
                AssignedTrips = new List<string>(),
                Eligible = dto.Status == "ACTIVE" && (updated?.IsAvailable ?? true),
                Blockers = dto.Status == "ACTIVE" ? new List<BlockerDto>() : new List<BlockerDto>
                {
                    new() { Code = "STATUS_NOT_ACTIVE", Field = "status", Message = dto.Reason ?? "Trạng thái không sẵn sàng" }
                }
            };
        }
    }
}
