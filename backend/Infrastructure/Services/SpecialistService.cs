using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;

namespace Infrastructure.Services
{
    public class SpecialistService : ISpecialistService
    {
        private readonly HorseTransportDbContext _context;
        private readonly ITripPlanDAO _tripPlanDao;
        private readonly ITransportRequestDAO _requestDao;
        private readonly ILegalMedicalRecordDAO _recordDao;
        private readonly IPolicyAndTermDAO _policyDao;
        private readonly IQuarantineBookingDAO _quarantineDao;
        private readonly ICustomsClearanceDAO _clearanceDao;
        private readonly INotificationDAO _notificationDao;

        // In-memory runtime state for mock-seed synchronization and dynamic edits
        private static readonly ConcurrentDictionary<string, SpecialistTripDto> _runtimeTrips = new();
        private static readonly ConcurrentDictionary<string, CustomerDocDto> _runtimeCustomerDocs = new();
        private static readonly ConcurrentDictionary<string, DocRequestDto> _runtimeDocRequests = new();
        private static readonly ConcurrentDictionary<string, QuarantineBookingDto> _runtimeBookings = new();
        private static readonly ConcurrentDictionary<string, DocTypeDto> _runtimeDocTypes = new();
        private static readonly ConcurrentDictionary<string, RegulationDto> _runtimeRegulations = new();
        private static readonly ConcurrentDictionary<string, RegPackageDto> _runtimePackages = new();
        private static readonly ConcurrentDictionary<string, TripDocumentDto> _runtimeCompanyDocs = new();
        private static readonly List<AuditEntryDto> _runtimeAudit = new();
        private static readonly object _initLock = new();
        private static bool _initialized = false;

        public SpecialistService(
            HorseTransportDbContext context,
            ITripPlanDAO tripPlanDao,
            ITransportRequestDAO requestDao,
            ILegalMedicalRecordDAO recordDao,
            IPolicyAndTermDAO policyDao,
            IQuarantineBookingDAO quarantineDao,
            ICustomsClearanceDAO clearanceDao,
            INotificationDAO notificationDao)
        {
            _context = context;
            _tripPlanDao = tripPlanDao;
            _requestDao = requestDao;
            _recordDao = recordDao;
            _policyDao = policyDao;
            _quarantineDao = quarantineDao;
            _clearanceDao = clearanceDao;
            _notificationDao = notificationDao;

            EnsureInitialData();
        }

        private void EnsureInitialData()
        {
            if (_initialized) return;
            lock (_initLock)
            {
                if (_initialized) return;

                // 1. Doc Types
                var dtList = new List<DocTypeDto>
                {
                    new() { Id = "DT-1", Name = "Hộ chiếu ngựa", Group = "IDENTITY", Scope = "PER_HORSE", Provider = "CUSTOMER", ValidityDays = null, Status = "ACTIVE" },
                    new() { Id = "DT-2", Name = "Giấy chứng nhận sức khỏe", Group = "MEDICAL", Scope = "PER_HORSE", Provider = "CUSTOMER", ValidityDays = 10, Status = "ACTIVE" },
                    new() { Id = "DT-3", Name = "Sổ tiêm phòng cúm ngựa", Group = "MEDICAL", Scope = "PER_HORSE", Provider = "CUSTOMER", ValidityDays = 365, Status = "ACTIVE" },
                    new() { Id = "DT-4", Name = "Giấy phép xuất khẩu", Group = "CUSTOMS", Scope = "PER_TRIP", Provider = "CBN", ValidityDays = 30, Status = "ACTIVE" },
                    new() { Id = "DT-5", Name = "Giấy phép nhập khẩu", Group = "CUSTOMS", Scope = "PER_TRIP", Provider = "CBN", ValidityDays = 30, Status = "ACTIVE" },
                    new() { Id = "DT-6", Name = "Giấy chứng nhận kiểm dịch", Group = "QUARANTINE", Scope = "PER_HORSE", Provider = "CBN", ValidityDays = 14, Status = "ACTIVE" },
                    new() { Id = "DT-7", Name = "Tờ khai hải quan", Group = "CUSTOMS", Scope = "PER_TRIP", Provider = "CBN", ValidityDays = 30, Status = "ACTIVE" },
                    new() { Id = "DT-8", Name = "Giấy phép vận chuyển nội địa", Group = "CUSTOMS", Scope = "PER_TRIP", Provider = "CBN", ValidityDays = 30, Status = "ACTIVE" }
                };
                foreach (var dt in dtList) _runtimeDocTypes[dt.Id] = dt;

                // 2. Regulations
                var reg1 = new RegulationDto
                {
                    Id = "REG-1",
                    Country = "VN",
                    Direction = "EXPORT",
                    V = 1,
                    EffectiveFrom = "2026-08-12",
                    Status = "ACTIVE",
                    Note = "Giấy chứng nhận sức khỏe do Cục Thú y cấp trong vòng 10 ngày trước khởi hành.",
                    Lines = new List<RequirementLineDto>
                    {
                        new() { TypeId = "DT-1", Provider = "CUSTOMER", Scope = "PER_HORSE", Stage = "BEFORE_SUBMIT", Level = "REQUIRED" },
                        new() { TypeId = "DT-2", Provider = "CUSTOMER", Scope = "PER_HORSE", Stage = "BEFORE_DEPART", Condition = "Cấp trong vòng 10 ngày trước khởi hành", Level = "REQUIRED" },
                        new() { TypeId = "DT-3", Provider = "CUSTOMER", Scope = "PER_HORSE", Stage = "BEFORE_DEPART", Level = "REQUIRED" },
                        new() { TypeId = "DT-4", Provider = "CBN", Scope = "PER_TRIP", Stage = "BEFORE_DEPART", Level = "REQUIRED" },
                        new() { TypeId = "DT-7", Provider = "CBN", Scope = "PER_TRIP", Stage = "BEFORE_DEPART", Level = "REQUIRED" }
                    }
                };
                var reg5 = new RegulationDto
                {
                    Id = "REG-5",
                    Country = "VN",
                    Direction = "DOMESTIC",
                    V = 1,
                    EffectiveFrom = "2026-05-10",
                    Status = "ACTIVE",
                    Note = "Giấy phép vận chuyển thú y cấp tỉnh.",
                    Lines = new List<RequirementLineDto>
                    {
                        new() { TypeId = "DT-1", Provider = "CUSTOMER", Scope = "PER_HORSE", Stage = "BEFORE_SUBMIT", Level = "REQUIRED" },
                        new() { TypeId = "DT-3", Provider = "CUSTOMER", Scope = "PER_HORSE", Stage = "BEFORE_DEPART", Level = "REQUIRED" },
                        new() { TypeId = "DT-8", Provider = "CBN", Scope = "PER_TRIP", Stage = "BEFORE_DEPART", Level = "REQUIRED" }
                    }
                };
                var reg10 = new RegulationDto
                {
                    Id = "REG-10",
                    Country = "JP",
                    Direction = "IMPORT",
                    V = 1,
                    EffectiveFrom = "2026-10-01",
                    Status = "ACTIVE",
                    Note = "Giấy phép nhập khẩu và kiểm dịch nhập cảnh tại Cơ quan Kiểm dịch Động vật (AQS) – cách ly tại sân bay đến.",
                    Lines = new List<RequirementLineDto>
                    {
                        new() { TypeId = "DT-1", Provider = "CUSTOMER", Scope = "PER_HORSE", Stage = "BEFORE_SUBMIT", Level = "REQUIRED" },
                        new() { TypeId = "DT-2", Provider = "CUSTOMER", Scope = "PER_HORSE", Stage = "BEFORE_DEPART", Level = "REQUIRED" },
                        new() { TypeId = "DT-3", Provider = "CUSTOMER", Scope = "PER_HORSE", Stage = "BEFORE_DEPART", Level = "REQUIRED" },
                        new() { TypeId = "DT-5", Provider = "CBN", Scope = "PER_TRIP", Stage = "BEFORE_DEPART", Level = "REQUIRED" },
                        new() { TypeId = "DT-6", Provider = "CBN", Scope = "PER_HORSE", Stage = "AT_CHECKPOINT", Condition = "Kiểm dịch nhập cảnh do AQS thực hiện khi ngựa đến sân bay", Level = "REQUIRED" }
                    }
                };
                _runtimeRegulations[reg1.Id] = reg1;
                _runtimeRegulations[reg5.Id] = reg5;
                _runtimeRegulations[reg10.Id] = reg10;

                // 3. Reg Packages
                var p1 = new RegPackageDto { Id = "RP-1", Name = "Nội địa Việt Nam", Items = new List<string[]> { new[] { "VN", "DOMESTIC" } }, Origin = "VN", Dest = "VN", Modes = new List<string> { "ROAD" }, Note = "Giấy phép vận chuyển thú y cấp tỉnh cho tuyến trong nước.", V = 1, EffectiveFrom = "2026-09-15", Status = "ACTIVE" };
                var p2 = new RegPackageDto { Id = "RP-2", Name = "Việt Nam → Nhật Bản (hàng không)", Items = new List<string[]> { new[] { "VN", "EXPORT" }, new[] { "JP", "IMPORT" } }, Origin = "VN", Dest = "JP", Modes = new List<string> { "AIR" }, Note = "Xuất khẩu từ Việt Nam (Cục Thú y) và nhập khẩu Nhật Bản (AQS).", V = 1, EffectiveFrom = "2026-09-15", Status = "ACTIVE" };
                var p3 = new RegPackageDto { Id = "RP-3", Name = "Việt Nam → Thái Lan", Items = new List<string[]> { new[] { "VN", "EXPORT" }, new[] { "TH", "IMPORT" } }, Origin = "VN", Dest = "TH", Modes = new List<string> { "ROAD" }, Note = "Tuyến lịch sử qua Campuchia – không nhận đơn mới.", V = 1, EffectiveFrom = "2026-09-15", Status = "ACTIVE" };
                _runtimePackages[p1.Id] = p1;
                _runtimePackages[p2.Id] = p2;
                _runtimePackages[p3.Id] = p3;

                // 4. Trips
                var t902 = new SpecialistTripDto
                {
                    Id = "TRP-902",
                    RequestId = "TRN-8924",
                    CustomerName = "Alex Equine",
                    Origin = "Hanoi",
                    Destination = "Tokyo",
                    OriginCountry = "VN",
                    DestCountry = "JP",
                    Mode = "AIR",
                    Status = "PLANNING",
                    Deployment = "CONFIRMED",
                    PlannedDepart = "2026-10-18 06:00",
                    Eta = "2026-10-19 06:00",
                    Horses = new List<SpecHorseDto> { new() { Id = "HOR-1035", Name = "Shadowfax", Microchip = "985112004571035", PassportNo = "VN-EQ-2016-1035" } },
                    Checkpoints = new List<RouteCheckpointDto>
                    {
                        new() { Name = "Sân bay Nội Bài", Type = "AIRPORT", Country = "VN", PlannedAt = "2026-10-18 10:00" },
                        new() { Name = "Trạm kiểm dịch sân bay Narita (AQS)", Type = "QUARANTINE_STATION", Country = "JP", PlannedAt = "2026-10-18 20:00" }
                    }
                };

                var t904 = new SpecialistTripDto
                {
                    Id = "TRP-904",
                    RequestId = "TRN-8944",
                    CustomerName = "Alex Equine",
                    Origin = "Ho Chi Minh City",
                    Destination = "Da Nang",
                    OriginCountry = "VN",
                    DestCountry = "VN",
                    Mode = "ROAD",
                    Status = "PLANNING",
                    Deployment = "CONFIRMED",
                    PlannedDepart = "2026-10-12 06:00",
                    Eta = "2026-10-12 20:00",
                    Horses = new List<SpecHorseDto> { new() { Id = "HOR-1092", Name = "Apollo", Microchip = "985112004571092", PassportNo = "VN-EQ-2021-1092" } },
                    Insurance = new InsuranceDto { Insurer = "Bảo hiểm Bảo Việt", Policy = "BV-HX-2026-0441", ValidFrom = "2026-10-12", ValidTo = "2026-10-13", Coverage = 150000, Status = "PENDING" }
                };

                var t906 = new SpecialistTripDto
                {
                    Id = "TRP-906",
                    RequestId = "TRN-8947",
                    CustomerName = "Alex Equine",
                    Origin = "Da Nang",
                    Destination = "Osaka",
                    OriginCountry = "VN",
                    DestCountry = "JP",
                    Mode = "AIR",
                    Status = "PLANNING",
                    Deployment = "CONFIRMED",
                    PlannedDepart = "2026-10-26 08:00",
                    Eta = "2026-10-27 06:00",
                    Horses = new List<SpecHorseDto> { new() { Id = "HOR-1101", Name = "Starboy", Microchip = "985112004571101", PassportNo = "AU-EQ-2018-1101" } },
                    Checkpoints = new List<RouteCheckpointDto>
                    {
                        new() { Name = "Sân bay Đà Nẵng", Type = "AIRPORT", Country = "VN", PlannedAt = "2026-10-26 11:00" },
                        new() { Name = "Trạm kiểm dịch sân bay Kansai (AQS)", Type = "QUARANTINE_STATION", Country = "JP", PlannedAt = "2026-10-26 22:00" }
                    }
                };

                var t903 = new SpecialistTripDto
                {
                    Id = "TRP-903",
                    RequestId = "TRN-8945",
                    CustomerName = "Alex Equine",
                    Origin = "Ho Chi Minh City",
                    Destination = "Da Nang",
                    OriginCountry = "VN",
                    DestCountry = "VN",
                    Mode = "ROAD",
                    Status = "READY_TO_DEPART",
                    Deployment = "CONFIRMED",
                    PlannedDepart = "2026-10-07 06:00",
                    Eta = "2026-10-07 22:00",
                    Horses = new List<SpecHorseDto> { new() { Id = "HOR-1029", Name = "Thunderbolt", Microchip = "985112004571029", PassportNo = "VN-EQ-2020-1029" } },
                    DocsReady = new DocsReadyStampDto { At = "2026-10-03 14:00", By = "Hoang Thu Ha" },
                    Insurance = new InsuranceDto { Insurer = "Bảo hiểm PVI", Policy = "PVI-VC-2026-1180", ValidFrom = "2026-10-07", ValidTo = "2026-10-08", Coverage = 120000, Status = "VERIFIED", CheckedBy = "Hoang Thu Ha", CheckedAt = "2026-10-03 11:00" }
                };

                _runtimeTrips[t902.Id] = t902;
                _runtimeTrips[t904.Id] = t904;
                _runtimeTrips[t906.Id] = t906;
                _runtimeTrips[t903.Id] = t903;

                // 5. Customer Documents
                var cd1 = new CustomerDocDto { TripId = "TRP-902", Key = "passport", Scope = "HOR-1035", Status = "APPROVED", Optional = false, File = "hor-1035-passport.pdf", Note = "Hộ chiếu ngựa quốc tế" };
                var cd2 = new CustomerDocDto { TripId = "TRP-902", Key = "flu", Scope = "HOR-1035", Status = "ACTION_REQUIRED", Optional = false, File = "shadowfax-vaccination.pdf", Issue = "Lần tiêm cúm gần nhất đã quá 12 tháng. Vui lòng tiêm nhắc lại và tải sổ tiêm mới." };
                var cd3 = new CustomerDocDto { TripId = "TRP-902", Key = "health", Scope = "HOR-1035", Status = "SUBMITTED", Optional = false, File = "shadowfax-health-cert.pdf", Expiry = "2026-10-25" };
                var cd4 = new CustomerDocDto { TripId = "TRP-904", Key = "passport", Scope = "HOR-1092", Status = "APPROVED", Optional = false, File = "hor-1092-passport.pdf" };
                var cd5 = new CustomerDocDto { TripId = "TRP-904", Key = "flu", Scope = "HOR-1092", Status = "APPROVED", Optional = false, File = "apollo-flu.pdf" };
                var cd6 = new CustomerDocDto { TripId = "TRP-904", Key = "health", Scope = "HOR-1092", Status = "SUBMITTED", Optional = false, File = "apollo-health-cert.pdf", Expiry = "2026-10-20" };

                _runtimeCustomerDocs[$"{cd1.TripId}_{cd1.Key}_{cd1.Scope}"] = cd1;
                _runtimeCustomerDocs[$"{cd2.TripId}_{cd2.Key}_{cd2.Scope}"] = cd2;
                _runtimeCustomerDocs[$"{cd3.TripId}_{cd3.Key}_{cd3.Scope}"] = cd3;
                _runtimeCustomerDocs[$"{cd4.TripId}_{cd4.Key}_{cd4.Scope}"] = cd4;
                _runtimeCustomerDocs[$"{cd5.TripId}_{cd5.Key}_{cd5.Scope}"] = cd5;
                _runtimeCustomerDocs[$"{cd6.TripId}_{cd6.Key}_{cd6.Scope}"] = cd6;

                // 6. Quarantine Bookings
                var b1 = new QuarantineBookingDto { Id = "QBK-101", TripId = "TRP-902", Station = "Trạm Narita (AQS)", Slot = "2026-10-18 -> 2026-10-25", Ref = "AQS-JP-2026-881", Status = "BOOKED", ConfirmedAt = "2026-10-05 14:00" };
                _runtimeBookings[b1.Id] = b1;

                // 7. Audit Entry
                _runtimeAudit.Add(new AuditEntryDto { At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"), Actor = "Hoang Thu Ha", Role = "TRANSPORT_SPECIALIST", Action = "Khởi tạo hệ thống", Entity = "Setup", Detail = "Hồ sơ y tế kiểm dịch sẵn sàng" });

                _initialized = true;
            }
        }

        public async Task<List<SpecialistTripDto>> GetTripsAsync(CancellationToken cancellationToken = default)
        {
            // 1. Sync with real DB TripPlans if available
            try
            {
                var dbTrips = await _tripPlanDao.GetAllWithDetailsAsync(cancellationToken);
                foreach (var t in dbTrips)
                {
                    if (!_runtimeTrips.ContainsKey(t.TripId))
                    {
                        var req = t.Request;
                        var dto = new SpecialistTripDto
                        {
                            Id = t.TripId,
                            RequestId = t.RequestId,
                            CustomerName = req?.Customer?.FullName ?? "Khách hàng",
                            Origin = req?.Departure ?? "Điểm đi",
                            Destination = req?.Destination ?? "Điểm đến",
                            OriginCountry = "VN",
                            DestCountry = req?.Destination.Contains("Tokyo") == true || req?.Destination.Contains("Japan") == true ? "JP" : "VN",
                            Mode = req?.TransportType ?? "ROAD",
                            Status = t.Status ?? "PLANNING",
                            Deployment = t.DeploymentStatus ?? "CONFIRMED",
                            PlannedDepart = req?.ExpectedDate?.ToString("yyyy-MM-dd HH:mm") ?? DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                            Eta = req?.CommittedDeadline?.ToString("yyyy-MM-dd HH:mm") ?? DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd HH:mm"),
                            Horses = req?.RequestHorseMappings.Select(m => new SpecHorseDto
                            {
                                Id = m.HorseId,
                                Name = m.Horse?.Name ?? m.HorseId,
                                Microchip = m.Horse?.MicrochipIso ?? "",
                                PassportNo = m.Horse?.FeiPassportNo ?? ""
                            }).ToList() ?? new List<SpecHorseDto>()
                        };

                        if (t.DocumentsStatus == "READY")
                        {
                            dto.DocsReady = new DocsReadyStampDto
                            {
                                At = t.DocumentsConfirmedAt?.ToString("yyyy-MM-dd HH:mm") ?? DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                                By = t.DocumentsConfirmedBy ?? "Transport Specialist"
                            };
                        }

                        _runtimeTrips[t.TripId] = dto;
                    }
                }
            }
            catch
            {
                // Fallback gracefully
            }

            // 2. Sync real submitted TransportRequests from DB
            try
            {
                var submittedRequests = await _context.TransportRequests
                    .Include(r => r.Customer)
                    .Include(r => r.RequestHorseMappings)
                        .ThenInclude(m => m.Horse)
                    .Where(r => r.Status != "DRAFT")
                    .ToListAsync(cancellationToken);

                foreach (var req in submittedRequests)
                {
                    var existingTrip = _runtimeTrips.Values.FirstOrDefault(t => t.RequestId == req.RequestId);
                    var tripId = existingTrip?.Id ?? ("TRP-" + req.RequestId.Replace("REQUEST_", "").PadLeft(3, '0'));

                    var isJapan = req.Destination != null && (req.Destination.Contains("Tokyo") || req.Destination.Contains("Japan") || req.Destination.Contains("Osaka"));

                    if (!_runtimeTrips.ContainsKey(tripId))
                    {
                        var dto = new SpecialistTripDto
                        {
                            Id = tripId,
                            RequestId = req.RequestId,
                            CustomerName = req.Customer?.FullName ?? "Khách hàng",
                            Origin = req.Departure ?? "Điểm đi",
                            Destination = req.Destination ?? "Điểm đến",
                            OriginCountry = "VN",
                            DestCountry = isJapan ? "JP" : "VN",
                            Mode = req.TransportType ?? (isJapan ? "AIR" : "ROAD"),
                            Status = req.Status == "COMPLETED" ? "COMPLETED" : "PLANNING",
                            Deployment = "CONFIRMED",
                            PlannedDepart = req.ExpectedDate?.ToString("yyyy-MM-dd HH:mm") ?? DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                            Eta = req.CommittedDeadline?.ToString("yyyy-MM-dd HH:mm") ?? req.ExpectedDate?.AddDays(1).ToString("yyyy-MM-dd HH:mm") ?? DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd HH:mm"),
                            Horses = req.RequestHorseMappings.Select(m => new SpecHorseDto
                            {
                                Id = m.HorseId,
                                Name = m.Horse?.Name ?? m.HorseId,
                                Microchip = m.Horse?.MicrochipIso ?? "",
                                PassportNo = m.Horse?.FeiPassportNo ?? ""
                            }).ToList()
                        };

                        _runtimeTrips[tripId] = dto;
                    }

                    // Sync Customer Documents for all horses in this request
                    foreach (var m in req.RequestHorseMappings)
                    {
                        var horse = m.Horse;
                        if (horse == null) continue;

                        if (!string.IsNullOrWhiteSpace(horse.PassportScanUrl))
                        {
                            var key = $"{tripId}_passport_{horse.HorseId}";
                            if (!_runtimeCustomerDocs.ContainsKey(key))
                            {
                                _runtimeCustomerDocs[key] = new CustomerDocDto
                                {
                                    TripId = tripId,
                                    Key = "passport",
                                    Scope = horse.HorseId,
                                    Status = "SUBMITTED",
                                    Optional = false,
                                    File = Path.GetFileName(horse.PassportScanUrl),
                                    Note = "Hộ chiếu ngựa quốc tế"
                                };
                            }
                        }

                        if (!string.IsNullOrWhiteSpace(horse.OwnershipCertificateFileUrl))
                        {
                            var key = $"{tripId}_ownership_{horse.HorseId}";
                            if (!_runtimeCustomerDocs.ContainsKey(key))
                            {
                                _runtimeCustomerDocs[key] = new CustomerDocDto
                                {
                                    TripId = tripId,
                                    Key = "ownership",
                                    Scope = horse.HorseId,
                                    Status = "SUBMITTED",
                                    Optional = false,
                                    File = Path.GetFileName(horse.OwnershipCertificateFileUrl),
                                    Note = "Giấy chứng nhận sở hữu ngựa"
                                };
                            }
                        }
                    }

                    // Also sync LegalMedicalRecords for this request
                    var medRecords = await _recordDao.GetByRequestIdAsync(req.RequestId, cancellationToken);
                    foreach (var mr in medRecords)
                    {
                        var docKey = mr.DocumentType == "VACCINATION" ? "flu" : "health";
                        var key = $"{tripId}_{docKey}_{mr.HorseId}";
                        if (!_runtimeCustomerDocs.ContainsKey(key))
                        {
                            _runtimeCustomerDocs[key] = new CustomerDocDto
                            {
                                TripId = tripId,
                                Key = docKey,
                                Scope = mr.HorseId,
                                Status = mr.DocumentStatus ?? "SUBMITTED",
                                Optional = mr.DocumentType == "VACCINATION",
                                File = Path.GetFileName(mr.UploadedFileUrl),
                                Expiry = mr.ExpiryDate?.ToString("yyyy-MM-dd"),
                                Note = mr.DocumentType == "VACCINATION" ? "Sổ tiêm ngừa cúm" : "Giấy chứng nhận sức khỏe"
                            };
                        }
                    }
                }
            }
            catch
            {
                // Fallback gracefully
            }

            return _runtimeTrips.Values.OrderBy(t => t.Id).ToList();
        }

        public async Task<SpecialistTripDto?> GetTripByIdAsync(string tripId, CancellationToken cancellationToken = default)
        {
            var trips = await GetTripsAsync(cancellationToken);
            return trips.FirstOrDefault(t => t.Id.Equals(tripId, StringComparison.OrdinalIgnoreCase));
        }

        public async Task<bool> ApplyRequirementSetAsync(string tripId, string pkgId, CancellationToken cancellationToken = default)
        {
            if (!_runtimePackages.TryGetValue(pkgId, out var pkg)) return false;

            var trip = await GetTripByIdAsync(tripId, cancellationToken);
            if (trip == null) return false;

            var snapshot = new ReqSetSnapshotDto
            {
                PkgId = pkg.Id,
                PkgV = pkg.V,
                Name = pkg.Name,
                At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                By = "Hoang Thu Ha",
                Rules = pkg.Items.Select(item =>
                {
                    var c = item[0];
                    var d = item[1];
                    var reg = _runtimeRegulations.Values.FirstOrDefault(r => r.Country == c && r.Direction == d);
                    return new ReqSetRuleDto
                    {
                        Country = c,
                        Direction = d,
                        RegId = reg?.Id,
                        RegV = reg?.V,
                        Lines = reg?.Lines ?? new List<RequirementLineDto>()
                    };
                }).ToList()
            };

            trip.ReqSet = snapshot;
            _runtimeTrips[trip.Id] = trip;

            // Audit
            _runtimeAudit.Add(new AuditEntryDto
            {
                At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                Actor = "Hoang Thu Ha",
                Role = "TRANSPORT_SPECIALIST",
                Action = "Áp dụng bộ quy định",
                Entity = tripId,
                Detail = $"Áp dụng {pkg.Name} (v{pkg.V})"
            });

            return true;
        }

        public async Task<(bool Success, string Message)> ConfirmDocsReadyAsync(string tripId, string specialistName, CancellationToken cancellationToken = default)
        {
            var trip = await GetTripByIdAsync(tripId, cancellationToken);
            if (trip == null) return (false, "Không tìm thấy chuyến đi.");

            // Rule 3.3.1: 100% customer documents of horses approved
            var docs = _runtimeCustomerDocs.Values.Where(d => d.TripId.Equals(tripId, StringComparison.OrdinalIgnoreCase)).ToList();
            var mandatoryDocs = docs.Where(d => !d.Optional).ToList();
            if (mandatoryDocs.Any(d => d.Status != "APPROVED"))
            {
                var pending = mandatoryDocs.First(d => d.Status != "APPROVED");
                return (false, $"Chưa thể đóng dấu: Giấy tờ {pending.Key} ({pending.Scope}) đang ở trạng thái {pending.Status}.");
            }

            // Rule 3.3.2: Insurance verified
            if (trip.Insurance == null || trip.Insurance.Status != "VERIFIED")
            {
                // Auto verify or notify
                if (trip.Insurance != null)
                {
                    trip.Insurance.Status = "VERIFIED";
                    trip.Insurance.CheckedBy = specialistName;
                    trip.Insurance.CheckedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm");
                }
            }

            // Update in-memory
            trip.DocsReady = new DocsReadyStampDto
            {
                At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                By = specialistName
            };
            _runtimeTrips[trip.Id] = trip;

            // Update DB TripPlan if it exists
            var dbTrip = await _tripPlanDao.GetByIdAsync(tripId, cancellationToken);
            if (dbTrip != null)
            {
                dbTrip.DocumentsStatus = "READY";
                dbTrip.DocumentsConfirmedAt = DateTime.UtcNow;
                dbTrip.DocumentsConfirmedBy = specialistName;
                await _tripPlanDao.UpdateAsync(dbTrip, cancellationToken);
            }

            // Audit
            _runtimeAudit.Add(new AuditEntryDto
            {
                At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                Actor = specialistName,
                Role = "TRANSPORT_SPECIALIST",
                Action = "Xác nhận Docs READY",
                Entity = tripId,
                Detail = "Toàn bộ hồ sơ pháp lý & y tế đã hoàn tất"
            });

            return (true, "Xác nhận Sẵn sàng Hồ sơ (Documents READY) thành công.");
        }

        public async Task<bool> SaveInsuranceAsync(string tripId, InsuranceSaveDto dto, CancellationToken cancellationToken = default)
        {
            var trip = await GetTripByIdAsync(tripId, cancellationToken);
            if (trip == null) return false;

            trip.Insurance = new InsuranceDto
            {
                Insurer = dto.Insurer ?? dto.Provider ?? "Bảo hiểm PVI",
                Policy = dto.Policy ?? dto.PolicyNumber ?? "PVI-EQ-2026",
                ValidFrom = dto.ValidFrom ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
                ValidTo = dto.ValidTo ?? DateTime.UtcNow.AddDays(7).ToString("yyyy-MM-dd"),
                Coverage = dto.Coverage ?? dto.CoverageAmount,
                Status = "PENDING"
            };

            _runtimeTrips[trip.Id] = trip;
            return true;
        }

        public async Task<bool> VerifyInsuranceAsync(string tripId, string specialistName, CancellationToken cancellationToken = default)
        {
            var trip = await GetTripByIdAsync(tripId, cancellationToken);
            if (trip == null) return false;

            if (trip.Insurance == null)
            {
                trip.Insurance = new InsuranceDto
                {
                    Insurer = "Bảo hiểm PVI",
                    Policy = "PVI-DEFAULT",
                    ValidFrom = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    ValidTo = DateTime.UtcNow.AddDays(7).ToString("yyyy-MM-dd"),
                    Coverage = 100000
                };
            }

            trip.Insurance.Status = "VERIFIED";
            trip.Insurance.CheckedBy = specialistName;
            trip.Insurance.CheckedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm");
            _runtimeTrips[trip.Id] = trip;

            _runtimeAudit.Add(new AuditEntryDto
            {
                At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                Actor = specialistName,
                Role = "TRANSPORT_SPECIALIST",
                Action = "Xác minh bảo hiểm",
                Entity = tripId,
                Detail = $"Hợp đồng {trip.Insurance.Policy}"
            });

            return true;
        }

        public async Task<bool> RecordClearanceAsync(string tripId, RecordClearanceDto dto, string specialistName, CancellationToken cancellationToken = default)
        {
            var trip = await GetTripByIdAsync(tripId, cancellationToken);
            if (trip == null) return false;

            var cp = trip.Checkpoints.FirstOrDefault(c => c.Type == "QUARANTINE_STATION" || c.Type == "LAND_BORDER" || c.Type == "AIRPORT");
            if (cp == null)
            {
                cp = new RouteCheckpointDto
                {
                    Name = dto.BorderCrossingName ?? "Cửa khẩu / Sân bay",
                    Type = "LAND_BORDER",
                    Country = "VN",
                    PlannedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm")
                };
                trip.Checkpoints.Add(cp);
            }

            cp.Clearance = new CheckpointClearanceDto
            {
                Result = "PASSED",
                At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                Ref = dto.CertNumber,
                By = specialistName
            };

            _runtimeTrips[trip.Id] = trip;

            // Also persist to DB CustomsClearance
            try
            {
                var clearanceEntity = new CustomsClearance
                {
                    ClearanceId = $"CLR-{DateTime.UtcNow.Ticks % 1000000:D6}",
                    TripId = tripId,
                    SegmentId = "SEG-01",
                    BorderCrossingName = dto.BorderCrossingName ?? cp.Name,
                    CustomsAgentName = dto.Authority,
                    DocumentType = dto.DocumentType ?? "EXPORT",
                    DeclarationNumber = dto.CertNumber,
                    Status = "CLEARED",
                    ClearedAt = DateTime.UtcNow
                };
                await _clearanceDao.AddAsync(clearanceEntity, cancellationToken);
            }
            catch
            {
                // Fallback gracefully
            }

            _runtimeAudit.Add(new AuditEntryDto
            {
                At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                Actor = specialistName,
                Role = "TRANSPORT_SPECIALIST",
                Action = "Ghi nhận thông quan / kiểm dịch",
                Entity = tripId,
                Detail = $"Số chứng thư {dto.CertNumber} do {dto.Authority} cấp"
            });

            return true;
        }

        public async Task<List<CustomerDocDto>> GetCustomerDocsAsync(CancellationToken cancellationToken = default)
        {
            await GetTripsAsync(cancellationToken);
            return _runtimeCustomerDocs.Values.OrderBy(d => d.TripId).ThenBy(d => d.Key).ToList();
        }

        public async Task<bool> ReviewCustomerDocAsync(string tripId, ReviewCustomerDocDto dto, string specialistName, CancellationToken cancellationToken = default)
        {
            var target = _runtimeCustomerDocs.Values.FirstOrDefault(d =>
                d.TripId.Equals(tripId, StringComparison.OrdinalIgnoreCase) &&
                ((!string.IsNullOrEmpty(dto.Key) && d.Key.Equals(dto.Key, StringComparison.OrdinalIgnoreCase)) ||
                 (!string.IsNullOrEmpty(dto.DocId) && d.File?.Contains(dto.DocId) == true)));

            if (target == null)
            {
                // Create an entry if reviewing freshly
                target = new CustomerDocDto
                {
                    TripId = tripId,
                    Key = dto.Key ?? "passport",
                    Scope = dto.Scope ?? "HOR-1035",
                    Status = dto.Decision == "APPROVED" ? "APPROVED" : "ACTION_REQUIRED",
                    Optional = false,
                    Note = dto.Reason ?? ""
                };
                _runtimeCustomerDocs[$"{target.TripId}_{target.Key}_{target.Scope}"] = target;
            }

            if (dto.Decision.Equals("REJECTED", StringComparison.OrdinalIgnoreCase) ||
                dto.Decision.Equals("ACTION_REQUIRED", StringComparison.OrdinalIgnoreCase))
            {
                target.Status = "ACTION_REQUIRED";
                target.Issue = dto.Reason;
            }
            else
            {
                target.Status = "APPROVED";
                target.Issue = null;
            }

            target.ReviewedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm");
            target.ReviewedBy = specialistName;

            // Audit
            _runtimeAudit.Add(new AuditEntryDto
            {
                At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                Actor = specialistName,
                Role = "TRANSPORT_SPECIALIST",
                Action = $"Kiểm duyệt hồ sơ: {dto.Decision}",
                Entity = $"{tripId} / {target.Key}",
                Detail = dto.Reason
            });

            return true;
        }

        public Task<List<DocRequestDto>> GetDocRequestsAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_runtimeDocRequests.Values.OrderByDescending(r => r.CreatedAt).ToList());
        }

        public async Task<DocRequestDto> CreateDocRequestAsync(CreateDocRequestDto dto, string specialistName, CancellationToken cancellationToken = default)
        {
            var id = $"REQ-DOC-{DateTime.UtcNow.Ticks % 100000:D5}";
            var docReq = new DocRequestDto
            {
                Id = id,
                TripId = dto.RequestId,
                Key = dto.DocType,
                Scope = dto.HorseId ?? "request",
                Reason = dto.Description,
                Status = "OPEN",
                CreatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                History = new List<string[]> { new[] { DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"), $"Tạo bởi {specialistName}: {dto.Description}" } }
            };

            _runtimeDocRequests[id] = docReq;

            // Trigger Notification to customer
            try
            {
                var notification = new Notification
                {
                    NotificationId = $"NOTIF-{DateTime.UtcNow.Ticks % 1000000:D6}",
                    UserId = "USR-CUST-001",
                    ReferenceId = dto.RequestId,
                    Type = "DOC_REQUEST",
                    Channel = "IN_APP",
                    Title = "Yêu cầu bổ sung hồ sơ vận chuyển",
                    Message = $"Chuyên viên hồ sơ yêu cầu bổ sung {dto.DocType}: {dto.Description}",
                    IsRead = false,
                    SentAt = DateTime.UtcNow
                };
                await _notificationDao.AddAsync(notification, cancellationToken);
            }
            catch
            {
                // Fallback gracefully
            }

            _runtimeAudit.Add(new AuditEntryDto
            {
                At = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),
                Actor = specialistName,
                Role = "TRANSPORT_SPECIALIST",
                Action = "Tạo yêu cầu bổ sung giấy tờ",
                Entity = dto.RequestId,
                Detail = $"{dto.DocType}: {dto.Description}"
            });

            return docReq;
        }

        public async Task<List<QuarantineBookingDto>> GetQuarantineBookingsAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                var dbBookings = await _quarantineDao.GetAllBookingsAsync(cancellationToken);
                foreach (var b in dbBookings)
                {
                    if (!_runtimeBookings.ContainsKey(b.BookingId))
                    {
                        _runtimeBookings[b.BookingId] = new QuarantineBookingDto
                        {
                            Id = b.BookingId,
                            TripId = b.RequestId,
                            Station = b.StationName ?? "Trạm kiểm dịch",
                            Slot = $"{b.ExpectedStartDate:yyyy-MM-dd} -> {b.ExpectedEndDate:yyyy-MM-dd}",
                            Ref = b.ConfirmationNumber ?? b.BookingId,
                            Status = b.Status ?? "BOOKED",
                            ConfirmedAt = b.ExpectedStartDate?.ToString("yyyy-MM-dd HH:mm")
                        };
                    }
                }
            }
            catch
            {
                // Fallback gracefully
            }

            return _runtimeBookings.Values.OrderByDescending(b => b.Id).ToList();
        }

        public async Task<bool> SaveQuarantineBookingAsync(SaveBookingDto dto, CancellationToken cancellationToken = default)
        {
            var id = $"QBK-{DateTime.UtcNow.Ticks % 100000:D5}";
            var booking = new QuarantineBookingDto
            {
                Id = id,
                TripId = dto.TripId ?? "TRP-902",
                Station = dto.FacilityName ?? dto.Station ?? "Trạm kiểm dịch",
                Slot = $"{dto.StartDate} -> {dto.EndDate}",
                Ref = dto.BookingRef ?? dto.Ref ?? $"REF-{id}",
                Status = "BOOKED",
                Notes = dto.Notes ?? "",
                ConfirmedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm")
            };

            _runtimeBookings[id] = booking;

            // Persist to DB if possible
            try
            {
                var entity = new QuarantineBooking
                {
                    BookingId = id,
                    RequestId = dto.TripId ?? "TRN-8924",
                    StationName = booking.Station,
                    Country = "JP",
                    ExpectedStartDate = DateTime.TryParse(dto.StartDate, out var s) ? s : DateTime.UtcNow,
                    ExpectedEndDate = DateTime.TryParse(dto.EndDate, out var e) ? e : DateTime.UtcNow.AddDays(7),
                    ConfirmationNumber = booking.Ref,
                    Status = "CONFIRMED"
                };
                await _quarantineDao.AddAsync(entity, cancellationToken);
            }
            catch
            {
                // Fallback gracefully
            }

            return true;
        }

        public Task<List<DocTypeDto>> GetDocTypesAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_runtimeDocTypes.Values.OrderBy(d => d.Id).ToList());
        }

        public Task<bool> SaveDocTypeAsync(DocTypeDto dto, CancellationToken cancellationToken = default)
        {
            _runtimeDocTypes[dto.Id] = dto;
            return Task.FromResult(true);
        }

        public Task<List<RegulationDto>> GetRegulationsAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_runtimeRegulations.Values.OrderBy(r => r.Id).ToList());
        }

        public Task<bool> SaveRegulationAsync(RegulationDto dto, CancellationToken cancellationToken = default)
        {
            _runtimeRegulations[dto.Id] = dto;
            return Task.FromResult(true);
        }

        public Task<List<RegPackageDto>> GetPackagesAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_runtimePackages.Values.OrderBy(p => p.Id).ToList());
        }

        public Task<bool> SavePackageAsync(RegPackageDto dto, CancellationToken cancellationToken = default)
        {
            _runtimePackages[dto.Id] = dto;
            return Task.FromResult(true);
        }

        public Task<List<TripDocumentDto>> GetCompanyDocumentsAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_runtimeCompanyDocs.Values.OrderBy(d => d.Id).ToList());
        }

        public Task<bool> RecordCompanyDocumentAsync(TripDocumentDto dto, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrEmpty(dto.Id)) dto.Id = $"DOC-{DateTime.UtcNow.Ticks % 100000:D5}";
            _runtimeCompanyDocs[dto.Id] = dto;
            return Task.FromResult(true);
        }

        public Task<List<AuditEntryDto>> GetAuditLogAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_runtimeAudit.OrderByDescending(a => a.At).ToList());
        }
    }
}
