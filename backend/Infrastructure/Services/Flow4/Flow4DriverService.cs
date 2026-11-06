using System.Text.Json;
using Application.Flow1.Interfaces;
using Application.DTOs.Flow4;
using Application.Interfaces.Flow4;
using Domain.Entities.Flow4;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Flow4;

public class Flow4DriverService : IFlow4DriverService
{
    private readonly HorseTransportDbContext _context;
    private readonly IPrivateFiles _files;

    public Flow4DriverService(HorseTransportDbContext context, IPrivateFiles files)
    {
        _context = context;
        _files = files;
    }

    private async Task<Domain.Entities.Horse> AssignedHorseAsync(string tripId, string horseId, string driverId)
    {
        var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
        var assigned = await _context.TripVehicleAssignments.AnyAsync(a => a.TripId == tripId &&
            (a.DriverId == driverId || a.CoDriverId == driverId || a.VeterinarianId == driverId || a.EscortId == driverId));
        if (trip is null || !assigned || !await _context.RequestHorseMappings.AnyAsync(m => m.RequestId == trip.RequestId && m.HorseId == horseId))
            throw new Application.Common.Exceptions.BusinessRuleException("Không tìm thấy ngựa trong chuyến được phân công.", 404, "NOT_FOUND");
        return await _context.Horses.FirstOrDefaultAsync(h => h.HorseId == horseId)
            ?? throw new Application.Common.Exceptions.BusinessRuleException("Không tìm thấy hồ sơ ngựa.", 404, "NOT_FOUND");
    }

    public async Task<object> GetAssignedHorseAsync(string tripId, string horseId, string driverId)
    {
        var h = await AssignedHorseAsync(tripId, horseId, driverId);
        var trip = await _context.TripPlans.FirstAsync(t => t.TripId == tripId);
        var medical = await _context.LegalMedicalRecords.Where(r => r.RequestId == trip.RequestId && r.HorseId == horseId)
            .Select(r => new { r.RecordId, r.DocumentType, r.DocumentStatus, r.ExpiryDate, r.UploadedFileUrl }).ToListAsync();
        object? file(string kind, string? key) => key is null ? null : new { name = kind + Path.GetExtension(key), url = $"/api/driver/trips/{tripId}/horses/{horseId}/files/{kind}" };
        return new { id = h.HorseId, name = h.Name, breed = h.Breed, sex = h.Sex, dob = h.Dob?.ToString("yyyy-MM-dd"), microchip = h.MicrochipIso,
            value = h.DeclaredValueVnd?.ToString("0"), currency = "VND", healthNotes = h.SpecialHealthNotes,
            passport = new { number = h.FeiPassportNo, authority = h.PassportIssuedBy, issueDate = h.PassportIssuedDate?.ToString("yyyy-MM-dd"), expiryDate = h.PassportExpiryDate?.ToString("yyyy-MM-dd"), scan = file("passport", h.PassportScanUrl) },
            photo = file("photo", h.PhotoUrl), ownership = file("ownership", h.OwnershipCertificateFileUrl), valueProof = file("value-proof", h.ValuationDocumentFileUrl),
            medical = medical.Select(r => new { type = r.DocumentType, status = r.DocumentStatus, expiryDate = r.ExpiryDate?.ToString("yyyy-MM-dd"), file = r.UploadedFileUrl is null ? null : new { name = Path.GetFileName(r.UploadedFileUrl), url = $"/api/driver/trips/{tripId}/horses/{horseId}/files/medical-{r.RecordId}" } }) };
    }

    public async Task<(byte[] Bytes, string ContentType)> ReadAssignedHorseFileAsync(string tripId, string horseId, string kind, string driverId)
    {
        var h = await AssignedHorseAsync(tripId, horseId, driverId);
        string? key = kind switch { "photo" => h.PhotoUrl, "passport" => h.PassportScanUrl, "ownership" => h.OwnershipCertificateFileUrl, "value-proof" => h.ValuationDocumentFileUrl, _ => null };
        if (kind.StartsWith("medical-", StringComparison.Ordinal))
            key = await _context.LegalMedicalRecords.Where(r => r.RecordId == kind[8..] && r.HorseId == horseId).Select(r => r.UploadedFileUrl).FirstOrDefaultAsync();
        if (key is null) throw new Application.Common.Exceptions.BusinessRuleException("Không tìm thấy tệp.", 404, "NOT_FOUND");
        return await _files.ReadAsync(key, CancellationToken.None);
    }

    /// <summary>
    /// Chỉ tài xế chính và phụ lái được cập nhật mốc hành trình. Bác sĩ thú y / hộ tống chỉ ghi nhật ký sức khỏe ngựa.
    /// </summary>
    private async Task EnsureCanRecordRouteAsync(string tripId, string userId)
    {
        var allowed = await _context.TripVehicleAssignments
            .AnyAsync(a => a.TripId == tripId && (a.DriverId == userId || a.CoDriverId == userId));
        if (!allowed)
        {
            throw new Application.Common.Exceptions.BusinessRuleException(
                "Chỉ tài xế chính hoặc phụ lái mới được cập nhật mốc hành trình. Bác sĩ thú y ghi nhật ký sức khỏe ngựa.", 403, "FORBIDDEN");
        }
    }

    /// <summary>
    /// Chỉ tài xế chính và phụ lái được cập nhật mốc hành trình. Bác sĩ thú y / hộ tống chỉ ghi nhật ký sức khỏe ngựa.
    /// </summary>
    private async Task EnsureCanRecordRouteAsync(string tripId, string userId)
    {
        var allowed = await _context.TripVehicleAssignments
            .AnyAsync(a => a.TripId == tripId && (a.DriverId == userId || a.CoDriverId == userId));
        if (!allowed)
        {
            throw new Application.Common.Exceptions.BusinessRuleException(
                "Chỉ tài xế chính hoặc phụ lái mới được cập nhật mốc hành trình. Bác sĩ thú y ghi nhật ký sức khỏe ngựa.", 403, "FORBIDDEN");
        }
    }

    /// <summary>
    /// F4-J02: Lấy danh sách nhiệm vụ vận chuyển được phân công cho tài xế/áp tải.
    /// </summary>
    public async Task<List<Flow4TripSummaryDto>> GetAssignedTripsAsync(string driverId, string? status = null)
    {
        var assignedTripIds = await _context.TripVehicleAssignments
            .Where(tva => tva.DriverId == driverId || tva.CoDriverId == driverId || tva.VeterinarianId == driverId || tva.EscortId == driverId)
            .Select(tva => tva.TripId)
            .Distinct()
            .ToListAsync();

        var query = _context.TripPlans
            .Include(t => t.Request)
            .Where(t => assignedTripIds.Contains(t.TripId));

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(t => t.Status == status);
        }

        var trips = await query.ToListAsync();
        return trips.Select(t => Flow4Helper.BuildTripSummary(t, _context)).ToList();
    }

    /// <summary>
    /// F4-J04: Kiểm tra điều kiện xe, ngựa và chốt chặn trước khi xuất phát thực tế.
    /// </summary>
    public async Task<DepartureCheckResultDto> GetDepartureCheckAsync(string tripId, string? leg, string driverId)
    {
        var trip = await _context.TripPlans
            .Include(t => t.Request)
            .FirstOrDefaultAsync(t => t.TripId == tripId);

        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        var checks = new List<Flow4BlockerDto>();

        // 1. Kiểm tra trạng thái phê duyệt chuyến từ Flow 3
        bool approvalValid = trip.Status == "READY_TO_DEPART" || trip.Status == "IN_TRANSIT";
        if (!approvalValid)
        {
            checks.Add(new Flow4BlockerDto
            {
                Code = "TRIP_STATE_INVALID",
                Field = "status",
                Message = $"Chuyến xe chưa ở trạng thái sẵn sàng xuất phát (hiện tại: {trip.Status})."
            });
        }

        // 2. Kiểm tra phân công xe & tài xế
        var assignment = await _context.TripVehicleAssignments
            .FirstOrDefaultAsync(tva => tva.TripId == tripId && (tva.DriverId == driverId || tva.CoDriverId == driverId || tva.VeterinarianId == driverId || tva.EscortId == driverId));

        if (assignment == null)
        {
            checks.Add(new Flow4BlockerDto
            {
                Code = "UNASSIGNED_DRIVER",
                Field = "assignment",
                Message = "Tài xế/áp tải không thuộc danh sách nhân sự được phân công cho chuyến này."
            });
        }

        // 3. Kiểm tra chốt y tế của các cá thể ngựa
        var abnormalHorses = await _context.HealthLogs
            .Where(h => h.TripId == tripId && h.Condition == "ABNORMAL")
            .Select(h => h.HorseId)
            .Distinct()
            .ToListAsync();

        foreach (var horseId in abnormalHorses)
        {
            var isCleared = await _context.VetAssessments
                .AnyAsync(v => v.TripId == tripId && v.HorseId == horseId && v.TransportFitness == "FIT");

            if (!isCleared)
            {
                checks.Add(new Flow4BlockerDto
                {
                    Code = "VET_CLEARANCE_REQUIRED",
                    Field = $"horses[{horseId}]",
                    Message = $"Ngựa {horseId} đang có dấu hiệu bất thường, cần bác sĩ thú y xác nhận FIT trước khi khởi hành."
                });
            }
        }

        bool canDepart = approvalValid && checks.Count == 0;

        return new DepartureCheckResultDto
        {
            Binding = Flow4Helper.BuildBinding(trip),
            ApprovalValid = approvalValid,
            Checks = checks,
            CanDepart = canDepart,
            RequiredAcknowledgements = new List<string> { "HORSES_CHECKED", "VEHICLE_VERIFIED" }
        };
    }

    /// <summary>
    /// F4-J05: Xác nhận xuất phát thực tế (Trip -> IN_TRANSIT, Request -> IN_PROGRESS).
    /// </summary>
    public async Task<Flow4MutationResultDto> ConfirmDepartureAsync(string tripId, DriverDepartureInputDto dto, string driverId)
    {
        await EnsureCanRecordRouteAsync(tripId, driverId);
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
        _context.ChangeTracker.Clear();
        using var transaction = await _context.Database.BeginTransactionAsync();

        var trip = await _context.TripPlans
            .Include(t => t.Request)
            .FirstOrDefaultAsync(t => t.TripId == tripId);

        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        // Kiểm tra Khóa lạc quan (Optimistic Concurrency)
        if (dto.ExpectedVersion != trip.ExecutionVersion)
            throw new InvalidOperationException($"STALE_VERSION: Phiên bản thực thi không khớp. Yêu cầu: {dto.ExpectedVersion}, Hiện tại: {trip.ExecutionVersion}.");

        if (dto.ApprovedPlanVersion != trip.PlanVersion)
            throw new InvalidOperationException($"STALE_VERSION: Phiên bản kế hoạch đã thay đổi. Yêu cầu: {dto.ApprovedPlanVersion}, Hiện tại: {trip.PlanVersion}.");

        // Kiểm tra cam kết bắt buộc
        if (dto.Acknowledgements == null ||
            !dto.Acknowledgements.Contains("HORSES_CHECKED") ||
            !dto.Acknowledgements.Contains("VEHICLE_VERIFIED"))
        {
            throw new InvalidOperationException("VALIDATION_ERROR: Bắt buộc phải xác nhận HORSES_CHECKED và VEHICLE_VERIFIED.");
        }

        // Cập nhật trạng thái chuyến xe và đơn hàng
        trip.Status = "IN_TRANSIT";
        trip.ExecutionPhase = "IN_PROGRESS";
        trip.ExecutionVersion += 1;

        if (trip.Request != null)
        {
            trip.Request.Status = "IN_PROGRESS";
        }

        // Hoàn tất mốc DEPARTED đầu tiên
        var departedMilestone = await _context.TripMilestones
            .Where(m => m.TripId == tripId && m.MilestoneKind == "DEPARTED")
            .OrderBy(m => m.SequenceOrder)
            .FirstOrDefaultAsync();

        string recordId = "DEPARTED_RECORD";
        if (departedMilestone != null)
        {
            departedMilestone.Status = "COMPLETED";
            departedMilestone.OccurredAt = DateTime.TryParse(dto.OccurredAt, out var dt) ? dt : DateTime.UtcNow;
            departedMilestone.RecordedAt = DateTime.UtcNow;
            departedMilestone.RecordedBy = driverId;
            departedMilestone.Note = dto.Note;
            if (dto.EvidenceFileIds.Any())
            {
                departedMilestone.EvidenceFileIds = JsonSerializer.Serialize(dto.EvidenceFileIds);
            }
            recordId = departedMilestone.MilestoneId;
        }

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return Flow4Helper.BuildMutationResult(trip, recordId, _context);
        });
    }

    /// <summary>
    /// F4-J06: Hoàn tất mốc kế tiếp tuần tự theo SequenceOrder.
    /// </summary>
    public async Task<Flow4MutationResultDto> CompleteMilestoneAsync(string tripId, string milestoneId, MilestoneCompleteInputDto dto, string driverId)
    {
        await EnsureCanRecordRouteAsync(tripId, driverId);
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
        _context.ChangeTracker.Clear();
        using var transaction = await _context.Database.BeginTransactionAsync();

        var trip = await _context.TripPlans
            .Include(t => t.Request)
            .FirstOrDefaultAsync(t => t.TripId == tripId);

        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        if (dto.ExpectedVersion != trip.ExecutionVersion)
            throw new InvalidOperationException($"STALE_VERSION: Phiên bản thực thi không khớp. Yêu cầu: {dto.ExpectedVersion}, Hiện tại: {trip.ExecutionVersion}.");

        var milestone = await _context.TripMilestones
            .FirstOrDefaultAsync(m => m.TripId == tripId && m.MilestoneId == milestoneId);

        if (milestone == null)
            throw new KeyNotFoundException($"Không tìm thấy mốc hành trình có mã {milestoneId}.");

        if (milestone.Status == "COMPLETED")
            throw new InvalidOperationException("TRIP_STATE_INVALID: Mốc này đã được hoàn tất trước đó.");

        // 1. Kiểm tra tính tuần tự: Không có mốc PENDING nào có SequenceOrder nhỏ hơn
        var hasEarlierPending = await _context.TripMilestones
            .AnyAsync(m => m.TripId == tripId && m.Status == "PENDING" && m.SequenceOrder < milestone.SequenceOrder);

        if (hasEarlierPending)
            throw new InvalidOperationException("MILESTONE_NOT_NEXT: Bắt buộc phải hoàn tất các mốc trước đó theo đúng trình tự tuần tự.");

        // 2. Chốt chặn y tế: Nếu mốc có cờ RequiresHealthCheck
        if (milestone.RequiresHealthCheck)
        {
            var hasLogs = await _context.HealthLogs
                .AnyAsync(h => h.TripId == tripId && h.MilestoneId == milestoneId);

            if (!hasLogs)
                throw new InvalidOperationException("HEALTH_CHECK_REQUIRED: Trạm dừng này yêu cầu ghi nhận nhật ký sức khỏe cho ngựa trước khi hoàn tất.");
        }

        // 3. Chốt chặn an toàn: Ngựa ABNORMAL phải có xác nhận FIT từ bác sĩ thú y
        var abnormalHorses = await _context.HealthLogs
            .Where(h => h.TripId == tripId && h.Condition == "ABNORMAL")
            .Select(h => h.HorseId)
            .Distinct()
            .ToListAsync();

        foreach (var horseId in abnormalHorses)
        {
            var isCleared = await _context.VetAssessments
                .AnyAsync(v => v.TripId == tripId && v.HorseId == horseId && v.TransportFitness == "FIT");

            if (!isCleared)
                throw new InvalidOperationException($"VET_CLEARANCE_REQUIRED: Ngựa {horseId} đang có chỉ số bất thường, bắt buộc phải có kết luận FIT từ bác sĩ thú y.");
        }

        // 4. Chốt chặn pháp lý: Nếu là mốc CHECKPOINT_DEPARTED, kiểm tra trạm kiểm soát đã được CLEARED
        if (milestone.MilestoneKind == "CHECKPOINT_DEPARTED")
        {
            var checkpointCleared = await _context.CheckpointDecisions
                .AnyAsync(c => c.TripId == tripId && c.Decision == "CLEARED");

            if (!checkpointCleared)
                throw new InvalidOperationException("CHECKPOINT_NOT_CLEARED: Chưa nhận được quyết định CLEARED từ chuyên viên pháp lý tại trạm kiểm soát.");
        }

        // Cập nhật thông tin hoàn tất mốc
        milestone.Status = "COMPLETED";
        milestone.OccurredAt = DateTime.TryParse(dto.OccurredAt, out var dt) ? dt : DateTime.UtcNow;
        milestone.RecordedAt = DateTime.UtcNow;
        milestone.RecordedBy = driverId;
        milestone.Note = dto.Note;
        if (dto.EvidenceFileIds.Any())
        {
            milestone.EvidenceFileIds = JsonSerializer.Serialize(dto.EvidenceFileIds);
        }

        // 5. Nếu mốc là FINAL_ARRIVED (Điểm đến cuối cùng):
        // Giữ nguyên Trip IN_TRANSIT, Request IN_PROGRESS; chỉ chuyển Phase = AWAITING_HANDOVER để mở Flow 6
        if (milestone.MilestoneKind == "FINAL_ARRIVED")
        {
            trip.ExecutionPhase = "AWAITING_HANDOVER";
        }

        trip.ExecutionVersion += 1;
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return Flow4Helper.BuildMutationResult(trip, milestone.MilestoneId, _context);
        });
    }

    /// <summary>
    /// F4-J08: Yêu cầu đính chính mốc đã COMPLETED.
    /// </summary>
    public async Task<MilestoneCorrectionDto> RequestCorrectionAsync(string tripId, string milestoneId, MilestoneCorrectionInputDto dto, string driverId)
    {
        var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        var milestone = await _context.TripMilestones
            .FirstOrDefaultAsync(m => m.TripId == tripId && m.MilestoneId == milestoneId);

        if (milestone == null)
            throw new KeyNotFoundException($"Không tìm thấy mốc hành trình có mã {milestoneId}.");

        if (milestone.Status != "COMPLETED")
            throw new InvalidOperationException("TRIP_STATE_INVALID: Chỉ có thể gửi yêu cầu đính chính cho mốc đã hoàn tất (COMPLETED).");

        var correction = new MilestoneCorrectionRequest
        {
            CorrectionId = $"CORR_{Guid.NewGuid():N}"[..20].ToUpper(),
            MilestoneId = milestoneId,
            TripId = tripId,
            RequestedBy = driverId,
            RequestedAt = DateTime.UtcNow,
            ProposedOccurredAt = DateTime.TryParse(dto.ProposedOccurredAt, out var dt) ? dt : DateTime.UtcNow,
            ProposedNote = dto.ProposedNote,
            ProposedEvidenceFileIds = dto.ProposedEvidenceFileIds.Any() ? JsonSerializer.Serialize(dto.ProposedEvidenceFileIds) : null,
            OriginalOccurredAt = milestone.OccurredAt,
            OriginalNote = milestone.Note,
            OriginalEvidenceFileIds = milestone.EvidenceFileIds,
            Reason = dto.Reason,
            Status = "PENDING",
            Version = 1
        };

        _context.MilestoneCorrections.Add(correction);
        await _context.SaveChangesAsync();

        var driverUser = await _context.Users.FirstOrDefaultAsync(u => u.UserId == driverId);

        return new MilestoneCorrectionDto
        {
            Id = correction.CorrectionId,
            MilestoneId = milestoneId,
            Version = 1,
            Status = "PENDING",
            Reason = correction.Reason,
            RequestedBy = new Flow4ActorDto
            {
                UserId = driverId,
                Name = driverUser?.FullName ?? "Tài xế / Áp tải",
                Role = "DRIVER_ESCORT"
            },
            RequestedAt = correction.RequestedAt.ToString("yyyy-MM-dd HH:mm"),
            Original = new MilestoneInputSnapshotDto
            {
                ExpectedVersion = trip.ExecutionVersion,
                OccurredAt = milestone.OccurredAt?.ToString("yyyy-MM-dd HH:mm") ?? "",
                Note = milestone.Note,
                EvidenceFileIds = !string.IsNullOrEmpty(milestone.EvidenceFileIds)
                    ? JsonSerializer.Deserialize<List<string>>(milestone.EvidenceFileIds) ?? new()
                    : new()
            },
            Proposed = new MilestoneInputSnapshotDto
            {
                ExpectedVersion = dto.ExpectedVersion,
                OccurredAt = dto.ProposedOccurredAt,
                Note = dto.ProposedNote,
                EvidenceFileIds = dto.ProposedEvidenceFileIds
            }
        };
    }

    /// <summary>
    /// F4-J13: Bàn giao ngựa cho đối tác tại kho Cargo Terminal sân bay đi (AIR_HANDOVER).
    /// </summary>
    public async Task<Flow4MutationResultDto> HandoverAirAsync(string tripId, AirHandoverInputDto dto, string driverId)
    {
        await EnsureCanRecordRouteAsync(tripId, driverId);
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
        _context.ChangeTracker.Clear();
        using var transaction = await _context.Database.BeginTransactionAsync();

        var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        if (dto.ExpectedVersion != trip.ExecutionVersion)
            throw new InvalidOperationException($"STALE_VERSION: Phiên bản thực thi không khớp.");

        var handoverMilestone = await _context.TripMilestones
            .FirstOrDefaultAsync(m => m.TripId == tripId && m.MilestoneKind == "AIR_HANDOVER" && m.Status == "PENDING");

        if (handoverMilestone == null)
            throw new InvalidOperationException("TRIP_STATE_INVALID: Không tìm thấy mốc bàn giao hàng không (AIR_HANDOVER) đang chờ xử lý.");

        handoverMilestone.Status = "COMPLETED";
        handoverMilestone.OccurredAt = DateTime.TryParse(dto.OccurredAt, out var dt) ? dt : DateTime.UtcNow;
        handoverMilestone.RecordedAt = DateTime.UtcNow;
        handoverMilestone.RecordedBy = driverId;
        handoverMilestone.Note = dto.Note ?? $"Bàn giao Cargo Terminal đối tác: {dto.PartnerReference}, Booking: {dto.BookingId}";
        if (dto.EvidenceFileIds.Any())
        {
            handoverMilestone.EvidenceFileIds = JsonSerializer.Serialize(dto.EvidenceFileIds);
        }

        trip.ExecutionVersion += 1;
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return Flow4Helper.BuildMutationResult(trip, handoverMilestone.MilestoneId, _context);
        });
    }

    /// <summary>
    /// F4-J15: Tiếp nhận ngựa tại kho Cargo Terminal sân bay đến (AIR_RECEIVED).
    /// </summary>
    public async Task<Flow4MutationResultDto> ReceiveAirAsync(string tripId, AirReceiveInputDto dto, string driverId)
    {
        await EnsureCanRecordRouteAsync(tripId, driverId);
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
        _context.ChangeTracker.Clear();
        using var transaction = await _context.Database.BeginTransactionAsync();

        var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        if (dto.ExpectedVersion != trip.ExecutionVersion)
            throw new InvalidOperationException($"STALE_VERSION: Phiên bản thực thi không khớp.");

        var receiveMilestone = await _context.TripMilestones
            .FirstOrDefaultAsync(m => m.TripId == tripId && m.MilestoneKind == "AIR_RECEIVED" && m.Status == "PENDING");

        if (receiveMilestone == null)
            throw new InvalidOperationException("TRIP_STATE_INVALID: Không tìm thấy mốc tiếp nhận hàng không (AIR_RECEIVED) đang chờ xử lý.");

        receiveMilestone.Status = "COMPLETED";
        receiveMilestone.OccurredAt = DateTime.TryParse(dto.OccurredAt, out var dt) ? dt : DateTime.UtcNow;
        receiveMilestone.RecordedAt = DateTime.UtcNow;
        receiveMilestone.RecordedBy = driverId;
        receiveMilestone.Note = dto.Note ?? $"Tiếp nhận từ Cargo Terminal đối tác: {dto.PartnerReference}, Booking: {dto.BookingId}";
        if (dto.EvidenceFileIds.Any())
        {
            receiveMilestone.EvidenceFileIds = JsonSerializer.Serialize(dto.EvidenceFileIds);
        }

        trip.ExecutionVersion += 1;
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return Flow4Helper.BuildMutationResult(trip, receiveMilestone.MilestoneId, _context);
        });
    }

    /// <summary>
    /// F4-J17: Tài xế đề xuất điều chỉnh ETA khi phát sinh chậm trễ trên đường.
    /// </summary>
    public async Task<EtaProposalDto> ProposeDriverEtaAsync(string tripId, EtaProposalInputDto dto, string driverId)
    {
        var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        var proposedDate = DateTime.Parse(dto.ProposedEta);
        var deadline = trip.DocumentExpiryDate ?? trip.EarliestDepartureDate?.AddDays(2) ?? DateTime.UtcNow.AddDays(2);
        bool requiresManager = proposedDate > deadline;

        var proposal = new EtaProposal
        {
            ProposalId = $"ETA_{Guid.NewGuid():N}"[..20].ToUpper(),
            TripId = tripId,
            MilestoneId = dto.MilestoneId,
            ProposedBy = driverId,
            ProposedAt = DateTime.UtcNow,
            CurrentEtaSnapshot = trip.CurrentEta ?? DateTime.UtcNow,
            ProposedEta = proposedDate,
            Reason = dto.Reason,
            LinkedIncidentId = dto.IncidentId,
            Status = "PENDING_COORDINATOR",
            RequiresManager = requiresManager,
            EscalationReason = requiresManager ? "Thời gian dự kiến đến nơi vượt quá hạn giao hàng của hợp đồng." : null
        };

        trip.PendingEtaProposalId = proposal.ProposalId;
        _context.EtaProposals.Add(proposal);
        await _context.SaveChangesAsync();

        var driverUser = await _context.Users.FirstOrDefaultAsync(u => u.UserId == driverId);

        return new EtaProposalDto
        {
            Id = proposal.ProposalId,
            Version = 1,
            CurrentEta = proposal.CurrentEtaSnapshot.ToString("yyyy-MM-dd HH:mm"),
            ProposedEta = proposal.ProposedEta.ToString("yyyy-MM-dd HH:mm"),
            Status = proposal.Status,
            RequiresManager = proposal.RequiresManager,
            EscalationReasons = requiresManager ? new List<string> { proposal.EscalationReason! } : new List<string>(),
            Reason = proposal.Reason,
            IncidentId = proposal.LinkedIncidentId,
            ProposedBy = new Flow4ActorDto
            {
                UserId = driverId,
                Name = driverUser?.FullName ?? "Tài xế",
                Role = "DRIVER_ESCORT"
            },
            ProposedAt = proposal.ProposedAt.ToString("yyyy-MM-dd HH:mm")
        };
    }

    /// <summary>
    /// F4-J36: Ghi nhận chi phí phát sinh thực tế trên đường (status: RECORDED).
    /// </summary>
    public async Task<TripExpenseRecordDto> RecordExpenseAsync(string tripId, TripExpenseInputDto dto, string driverId)
    {
        var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        var expense = new TripExpense
        {
            ExpenseId = $"EXP_{Guid.NewGuid():N}"[..20].ToUpper(),
            TripId = tripId,
            RecordedBy = driverId,
            RecordedAt = DateTime.UtcNow,
            Category = dto.Category,
            AmountVnd = dto.AmountVnd,
            OccurredAt = DateTime.TryParse(dto.OccurredAt, out var dt) ? dt : DateTime.UtcNow,
            Reason = dto.Reason,
            MilestoneId = dto.MilestoneId,
            ReceiptFileIds = dto.ReceiptFileIds.Any() ? JsonSerializer.Serialize(dto.ReceiptFileIds) : null,
            Status = "RECORDED"
        };

        _context.TripExpenses.Add(expense);
        await _context.SaveChangesAsync();

        var driverUser = await _context.Users.FirstOrDefaultAsync(u => u.UserId == driverId);

        return new TripExpenseRecordDto
        {
            Id = expense.ExpenseId,
            TripId = tripId,
            Entry = dto,
            RecordedBy = new Flow4ActorDto
            {
                UserId = driverId,
                Name = driverUser?.FullName ?? "Tài xế",
                Role = "DRIVER_ESCORT"
            },
            RecordedAt = expense.RecordedAt.ToString("yyyy-MM-dd HH:mm"),
            Status = "RECORDED"
        };
    }
}
