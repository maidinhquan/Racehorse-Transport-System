using System.Text.Json;
using Application.DTOs.Flow4;
using Application.Interfaces.Flow4;
using Domain.Entities.Flow4;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Flow4;

public class Flow4CoordinatorService : IFlow4CoordinatorService
{
    private readonly HorseTransportDbContext _context;

    public Flow4CoordinatorService(HorseTransportDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// F4-J01: Đọc chính sách hệ thống và capability giám sát thực thi hành trình.
    /// </summary>
    public Task<Flow4CapabilitiesDto> GetFlow4CapabilitiesAsync()
    {
        var capabilities = new Flow4CapabilitiesDto
        {
            Version = "1.1.0",
            ImplementationStatus = "AVAILABLE",
            PersistenceAvailable = true,
            FilesAvailable = true,
            NotificationsAvailable = true,
            IncidentIntegrationAvailable = true,
            GpsRealtime = false,
            Timezone = "Asia/Ho_Chi_Minh",
            Policy = new Flow4PolicyDto
            {
                Version = 1,
                LateMilestoneMinutes = 30,
                HealthIntervalMinutes = 240,
                MinimumHealthPhotos = 1,
                Configured = true,
                Note = "Chính sách giám sát vận hành hành trình Flow 4"
            }
        };

        return Task.FromResult(capabilities);
    }

    /// <summary>
    /// F4-J03: Đọc ngữ cảnh hành trình, danh sách mốc, xe, ngựa và chốt chặn an toàn (Blockers).
    /// </summary>
    public async Task<Flow4TrackingDto> GetTripExecutionAsync(string tripId, string userId, string role)
    {
        var trip = await _context.TripPlans
            .Include(t => t.Request)
            .FirstOrDefaultAsync(t => t.TripId == tripId);

        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        return Flow4Helper.BuildTrackingDto(trip, userId, role, _context);
    }

    /// <summary>
    /// F4-J07: Lấy lịch sử sự kiện timeline mốc, đính chính và quyết định (Append-Only).
    /// </summary>
    public async Task<List<Flow4HistoryEventDto>> GetTripExecutionHistoryAsync(string tripId)
    {
        var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        var events = new List<Flow4HistoryEventDto>();

        // 1. Lấy mốc đã hoàn tất
        var completedMilestones = await _context.TripMilestones
            .Where(m => m.TripId == tripId && m.Status == "COMPLETED")
            .OrderBy(m => m.OccurredAt)
            .ToListAsync();

        foreach (var m in completedMilestones)
        {
            events.Add(new Flow4HistoryEventDto
            {
                Id = m.MilestoneId,
                TargetId = m.MilestoneId,
                Type = $"MILESTONE_{m.MilestoneKind}",
                Reason = m.Note ?? $"Hoàn tất mốc {m.Label}",
                RecordedAt = m.RecordedAt?.ToString("yyyy-MM-dd HH:mm") ?? "",
                Actor = new Flow4ActorDto
                {
                    UserId = m.RecordedBy ?? "SYSTEM",
                    Name = m.RecordedBy != null ? "Tài xế / Kíp xe" : "Hệ thống",
                    Role = m.RecordedBy != null ? "DRIVER_ESCORT" : "SYSTEM"
                },
                SystemActor = m.RecordedBy == null
            });
        }

        // 2. Lấy các quyết định đính chính
        var corrections = await _context.MilestoneCorrections
            .Where(c => c.TripId == tripId)
            .OrderBy(c => c.RequestedAt)
            .ToListAsync();

        foreach (var c in corrections)
        {
            events.Add(new Flow4HistoryEventDto
            {
                Id = c.CorrectionId,
                TargetId = c.MilestoneId,
                Type = "CORRECTION_DECISION",
                Reason = c.Reason,
                RecordedAt = (c.DecidedAt ?? c.RequestedAt).ToString("yyyy-MM-dd HH:mm"),
                Actor = new Flow4ActorDto
                {
                    UserId = c.DecidedBy ?? c.RequestedBy,
                    Name = c.DecidedBy != null ? "Điều phối viên" : "Tài xế yêu cầu",
                    Role = c.DecidedBy != null ? "FLEET_ROUTE_COORDINATOR" : "DRIVER_ESCORT"
                },
                SystemActor = false
            });
        }

        return events.OrderBy(e => e.RecordedAt).ToList();
    }

    /// <summary>
    /// F4-J09: Danh sách các yêu cầu đính chính mốc đang chờ Điều phối viên xử lý.
    /// </summary>
    public async Task<List<MilestoneCorrectionDto>> GetMilestoneCorrectionsAsync(string tripId)
    {
        var corrections = await _context.MilestoneCorrections
            .Include(c => c.Milestone)
            .Where(c => c.TripId == tripId)
            .OrderByDescending(c => c.RequestedAt)
            .ToListAsync();

        var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
        int currentVersion = trip?.ExecutionVersion ?? 1;

        return corrections.Select(c => new MilestoneCorrectionDto
        {
            Id = c.CorrectionId,
            MilestoneId = c.MilestoneId,
            Version = c.Version,
            Status = c.Status,
            Reason = c.Reason,
            RequestedBy = new Flow4ActorDto
            {
                UserId = c.RequestedBy,
                Name = "Tài xế / Áp tải",
                Role = "DRIVER_ESCORT"
            },
            RequestedAt = c.RequestedAt.ToString("yyyy-MM-dd HH:mm"),
            Original = new MilestoneInputSnapshotDto
            {
                ExpectedVersion = currentVersion,
                OccurredAt = c.OriginalOccurredAt?.ToString("yyyy-MM-dd HH:mm") ?? c.Milestone?.OccurredAt?.ToString("yyyy-MM-dd HH:mm") ?? "",
                Note = c.OriginalNote ?? c.Milestone?.Note,
                EvidenceFileIds = !string.IsNullOrEmpty(c.OriginalEvidenceFileIds)
                    ? JsonSerializer.Deserialize<List<string>>(c.OriginalEvidenceFileIds) ?? new()
                    : new()
            },
            Proposed = new MilestoneInputSnapshotDto
            {
                ExpectedVersion = currentVersion,
                OccurredAt = c.ProposedOccurredAt.ToString("yyyy-MM-dd HH:mm"),
                Note = c.ProposedNote,
                EvidenceFileIds = !string.IsNullOrEmpty(c.ProposedEvidenceFileIds)
                    ? JsonSerializer.Deserialize<List<string>>(c.ProposedEvidenceFileIds) ?? new()
                    : new()
            },
            DecidedBy = c.DecidedBy != null ? new Flow4ActorDto { UserId = c.DecidedBy, Name = "Điều phối viên", Role = "FLEET_ROUTE_COORDINATOR" } : null,
            DecidedAt = c.DecidedAt?.ToString("yyyy-MM-dd HH:mm")
        }).ToList();
    }

    /// <summary>
    /// F4-J10: Điều phối viên ra quyết định duyệt hoặc từ chối yêu cầu đính chính mốc.
    /// </summary>
    public async Task<Flow4MutationResultDto> DecideMilestoneCorrectionAsync(string tripId, string correctionId, MilestoneCorrectionDecisionInputDto dto, string coordinatorId)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        if (dto.ExpectedVersion != trip.ExecutionVersion)
            throw new InvalidOperationException($"STALE_VERSION: Phiên bản thực thi không khớp.");

        var correction = await _context.MilestoneCorrections
            .Include(c => c.Milestone)
            .FirstOrDefaultAsync(c => c.TripId == tripId && c.CorrectionId == correctionId);

        if (correction == null)
            throw new KeyNotFoundException($"Không tìm thấy yêu cầu đính chính có mã {correctionId}.");

        if (correction.Status != "PENDING")
            throw new InvalidOperationException("TRIP_STATE_INVALID: Yêu cầu đính chính này đã được xử lý.");

        correction.Status = dto.Decision == "APPROVE" ? "APPROVED" : "REJECTED";
        correction.DecidedBy = coordinatorId;
        correction.DecidedAt = DateTime.UtcNow;
        correction.DecisionReason = dto.Reason;

        // Nếu duyệt, áp dụng thay đổi vào Milestone
        if (dto.Decision == "APPROVE" && correction.Milestone != null)
        {
            correction.Milestone.OccurredAt = correction.ProposedOccurredAt;
            if (!string.IsNullOrEmpty(correction.ProposedNote))
            {
                correction.Milestone.Note = correction.ProposedNote;
            }
            if (!string.IsNullOrEmpty(correction.ProposedEvidenceFileIds))
            {
                correction.Milestone.EvidenceFileIds = correction.ProposedEvidenceFileIds;
            }
            correction.Milestone.Revision += 1;
        }

        trip.ExecutionVersion += 1;
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return Flow4Helper.BuildMutationResult(trip, correction.MilestoneId, _context);
    }

    /// <summary>
    /// F4-J14: Ghi nhận thông tin lịch bay hoặc sự kiện hàng không từ đối tác AIR.
    /// </summary>
    public async Task<AirNoticeDto> RecordAirNoticeAsync(string tripId, AirNoticeInputDto dto, string coordinatorId)
    {
        var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        var notice = new AirNotice
        {
            NoticeId = $"AN_{Guid.NewGuid():N}"[..20].ToUpper(),
            TripId = tripId,
            BookingId = dto.BookingId,
            NoticeKind = dto.Kind,
            DepartureAt = !string.IsNullOrEmpty(dto.DepartureAt) ? DateTime.Parse(dto.DepartureAt) : null,
            ArrivalAt = !string.IsNullOrEmpty(dto.ArrivalAt) ? DateTime.Parse(dto.ArrivalAt) : null,
            ReceivedAt = DateTime.TryParse(dto.ReceivedAt, out var dt) ? dt : DateTime.UtcNow,
            SourceReference = dto.SourceReference,
            Reason = dto.Reason,
            EvidenceFileIds = dto.EvidenceFileIds.Any() ? JsonSerializer.Serialize(dto.EvidenceFileIds) : null,
            IncidentId = dto.IncidentId,
            RecordedBy = coordinatorId,
            RecordedAt = DateTime.UtcNow
        };

        _context.AirNotices.Add(notice);
        await _context.SaveChangesAsync();

        var coordUser = await _context.Users.FirstOrDefaultAsync(u => u.UserId == coordinatorId);

        return new AirNoticeDto
        {
            Id = notice.NoticeId,
            Input = dto,
            RecordedBy = new Flow4ActorDto
            {
                UserId = coordinatorId,
                Name = coordUser?.FullName ?? "Điều phối viên",
                Role = "FLEET_ROUTE_COORDINATOR"
            },
            RecordedAt = notice.RecordedAt.ToString("yyyy-MM-dd HH:mm"),
            RequiresPlanChange = false,
            MilestoneApplied = false
        };
    }

    /// <summary>
    /// F4-J16: Tra cứu lịch sử các thông báo lịch bay của chặng hàng không.
    /// </summary>
    public async Task<List<AirNoticeDto>> GetAirNoticesAsync(string tripId)
    {
        var notices = await _context.AirNotices
            .Include(a => a.RecordedByUser)
            .Where(a => a.TripId == tripId)
            .OrderByDescending(a => a.RecordedAt)
            .ToListAsync();

        return notices.Select(n => new AirNoticeDto
        {
            Id = n.NoticeId,
            Input = new AirNoticeInputDto
            {
                ExpectedVersion = 1,
                BookingId = n.BookingId ?? "",
                Kind = n.NoticeKind,
                DepartureAt = n.DepartureAt?.ToString("yyyy-MM-dd HH:mm"),
                ArrivalAt = n.ArrivalAt?.ToString("yyyy-MM-dd HH:mm"),
                ReceivedAt = n.ReceivedAt.ToString("yyyy-MM-dd HH:mm"),
                SourceReference = n.SourceReference ?? "",
                Reason = n.Reason ?? "",
                EvidenceFileIds = !string.IsNullOrEmpty(n.EvidenceFileIds)
                    ? JsonSerializer.Deserialize<List<string>>(n.EvidenceFileIds) ?? new()
                    : new(),
                IncidentId = n.IncidentId
            },
            RecordedBy = new Flow4ActorDto
            {
                UserId = n.RecordedBy,
                Name = n.RecordedByUser?.FullName ?? "Điều phối viên",
                Role = "FLEET_ROUTE_COORDINATOR"
            },
            RecordedAt = n.RecordedAt.ToString("yyyy-MM-dd HH:mm"),
            RequiresPlanChange = false,
            MilestoneApplied = false
        }).ToList();
    }

    /// <summary>
    /// F4-J18: Điều phối viên lập đề xuất điều chỉnh ETA khi phát sinh thay đổi lịch trình.
    /// </summary>
    public async Task<EtaProposalDto> ProposeCoordinatorEtaAsync(string tripId, EtaProposalInputDto dto, string coordinatorId)
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
            ProposedBy = coordinatorId,
            ProposedAt = DateTime.UtcNow,
            CurrentEtaSnapshot = trip.CurrentEta ?? DateTime.UtcNow,
            ProposedEta = proposedDate,
            Reason = dto.Reason,
            LinkedIncidentId = dto.IncidentId,
            Status = "PENDING_COORDINATOR",
            RequiresManager = requiresManager,
            EscalationReason = requiresManager ? "Thời gian đề xuất vượt hạn giao hàng của hợp đồng." : null
        };

        trip.PendingEtaProposalId = proposal.ProposalId;
        _context.EtaProposals.Add(proposal);
        await _context.SaveChangesAsync();

        var coordUser = await _context.Users.FirstOrDefaultAsync(u => u.UserId == coordinatorId);

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
                UserId = coordinatorId,
                Name = coordUser?.FullName ?? "Điều phối viên",
                Role = "FLEET_ROUTE_COORDINATOR"
            },
            ProposedAt = proposal.ProposedAt.ToString("yyyy-MM-dd HH:mm")
        };
    }

    /// <summary>
    /// F4-J19: Tra cứu ETA hiện hành và danh sách các đề xuất điều chỉnh ETA.
    /// </summary>
    public async Task<List<EtaProposalDto>> GetEtaProposalsAsync(string tripId)
    {
        var proposals = await _context.EtaProposals
            .Include(p => p.ProposedByUser)
            .Where(p => p.TripId == tripId)
            .OrderByDescending(p => p.ProposedAt)
            .ToListAsync();

        return proposals.Select(p => new EtaProposalDto
        {
            Id = p.ProposalId,
            Version = 1,
            CurrentEta = p.CurrentEtaSnapshot.ToString("yyyy-MM-dd HH:mm"),
            ProposedEta = p.ProposedEta.ToString("yyyy-MM-dd HH:mm"),
            Status = p.Status,
            RequiresManager = p.RequiresManager,
            EscalationReasons = !string.IsNullOrEmpty(p.EscalationReason) ? new List<string> { p.EscalationReason } : new List<string>(),
            Reason = p.Reason,
            IncidentId = p.LinkedIncidentId,
            ProposedBy = new Flow4ActorDto
            {
                UserId = p.ProposedBy,
                Name = p.ProposedByUser?.FullName ?? "Người đề xuất",
                Role = "FLEET_ROUTE_COORDINATOR"
            },
            ProposedAt = p.ProposedAt.ToString("yyyy-MM-dd HH:mm"),
            DecidedAt = (p.ManagerDecisionAt ?? p.CoordinatorDecisionAt)?.ToString("yyyy-MM-dd HH:mm"),
            DecisionReason = p.CoordinatorDecisionReason ?? p.ManagerDecisionReason
        }).ToList();
    }

    /// <summary>
    /// F4-J20: Điều phối viên phê duyệt ETA (nếu trong hạn giao hàng) hoặc chuyển cấp Quản lý.
    /// </summary>
    public async Task<Flow4MutationResultDto> DecideEtaProposalAsync(string tripId, string proposalId, EtaDecisionInputDto dto, string coordinatorId)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        if (dto.ExpectedVersion != trip.ExecutionVersion)
            throw new InvalidOperationException($"STALE_VERSION: Phiên bản thực thi không khớp.");

        var proposal = await _context.EtaProposals
            .FirstOrDefaultAsync(p => p.TripId == tripId && p.ProposalId == proposalId);

        if (proposal == null)
            throw new KeyNotFoundException($"Không tìm thấy đề xuất ETA có mã {proposalId}.");

        if (proposal.Status != "PENDING_COORDINATOR")
            throw new InvalidOperationException("TRIP_STATE_INVALID: Đề xuất ETA này không ở trạng thái chờ Điều phối viên xử lý.");

        var deadline = trip.DocumentExpiryDate ?? trip.EarliestDepartureDate?.AddDays(2) ?? DateTime.UtcNow.AddDays(2);

        if (dto.Decision == "APPROVE")
        {
            // Kiểm tra quy tắc 2 cấp ETA
            if (proposal.ProposedEta > deadline)
            {
                // Vượt hạn giao hàng -> Tự động leo thang lên Manager
                proposal.RequiresManager = true;
                proposal.Status = "PENDING_MANAGER";
                proposal.EscalationReason = "Đề xuất ETA vượt quá hạn giao hàng của hợp đồng, chuyển cấp Quản lý logistics phê duyệt.";
                proposal.CoordinatorDecisionBy = coordinatorId;
                proposal.CoordinatorDecisionAt = DateTime.UtcNow;
                proposal.CoordinatorDecisionReason = dto.Reason;
            }
            else
            {
                // Trong hạn giao hàng -> Điều phối viên duyệt thành công
                proposal.Status = "APPROVED";
                proposal.CoordinatorDecisionBy = coordinatorId;
                proposal.CoordinatorDecisionAt = DateTime.UtcNow;
                proposal.CoordinatorDecisionReason = dto.Reason;
                trip.CurrentEta = proposal.ProposedEta;
                trip.PendingEtaProposalId = null;
            }
        }
        else
        {
            proposal.Status = "REJECTED";
            proposal.CoordinatorDecisionBy = coordinatorId;
            proposal.CoordinatorDecisionAt = DateTime.UtcNow;
            proposal.CoordinatorDecisionReason = dto.Reason;
            trip.PendingEtaProposalId = null;
        }

        trip.ExecutionVersion += 1;
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return Flow4Helper.BuildMutationResult(trip, proposal.ProposalId, _context);
    }

    /// <summary>
    /// F4-J27: Danh sách cảnh báo trễ mốc và đến hạn kiểm tra y tế của chuyến đi.
    /// </summary>
    public async Task<List<Flow4AlertDto>> GetAlertsAsync(string tripId)
    {
        var alerts = await _context.ExecutionAlerts
            .Where(a => a.TripId == tripId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return alerts.Select(a => new Flow4AlertDto
        {
            Id = a.AlertId,
            TripId = a.TripId,
            Kind = a.AlertKind,
            MilestoneId = a.MilestoneId,
            Status = a.Status,
            Message = a.Message,
            CreatedAt = a.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
            AssigneeUserIds = !string.IsNullOrEmpty(a.AssigneeUserIds)
                ? JsonSerializer.Deserialize<List<string>>(a.AssigneeUserIds) ?? new()
                : new(),
            AcknowledgedBy = a.AcknowledgedBy != null ? new Flow4ActorDto { UserId = a.AcknowledgedBy, Name = "Điều phối viên", Role = "FLEET_ROUTE_COORDINATOR" } : null
        }).ToList();
    }

    /// <summary>
    /// F4-J28: Điều phối viên xác nhận đã tiếp nhận và đang xử lý cảnh báo.
    /// </summary>
    public async Task<Flow4MutationResultDto> AcknowledgeAlertAsync(string tripId, string alertId, Flow4AcknowledgeAlertInputDto dto, string coordinatorId)
    {
        var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        var alert = await _context.ExecutionAlerts
            .FirstOrDefaultAsync(a => a.TripId == tripId && a.AlertId == alertId);

        if (alert == null)
            throw new KeyNotFoundException($"Không tìm thấy cảnh báo có mã {alertId}.");

        alert.Status = "ACKNOWLEDGED";
        alert.AcknowledgedBy = coordinatorId;
        alert.AcknowledgedAt = DateTime.UtcNow;

        trip.ExecutionVersion += 1;
        await _context.SaveChangesAsync();

        return Flow4Helper.BuildMutationResult(trip, alertId, _context);
    }

    /// <summary>
    /// F4-J29: Ghi nhật ký liên hệ khẩn cấp ngoài luồng khi kíp xe không phản hồi.
    /// </summary>
    public async Task<Flow4MutationResultDto> RecordContactLogAsync(string tripId, Flow4ContactLogInputDto dto, string coordinatorId)
    {
        var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        var contactLog = new ExecutionContactLog
        {
            ContactLogId = $"CL_{Guid.NewGuid():N}"[..20].ToUpper(),
            TripId = tripId,
            ContactedUserId = dto.ContactedUserId,
            Channel = dto.Channel,
            Result = dto.Result,
            ContactedAt = DateTime.TryParse(dto.ContactedAt, out var dt) ? dt : DateTime.UtcNow,
            RecordedBy = coordinatorId,
            RecordedAt = DateTime.UtcNow
        };

        _context.ExecutionContactLogs.Add(contactLog);
        trip.ExecutionVersion += 1;
        await _context.SaveChangesAsync();

        return Flow4Helper.BuildMutationResult(trip, contactLog.ContactLogId, _context);
    }

    /// <summary>
    /// F4-J30: Tải lên file ảnh/chứng từ hiện trường thực tế (giới hạn dung lượng <= 10MB).
    /// </summary>
    public async Task<Flow4FileUploadResultDto> UploadExecutionFileAsync(string tripId, string fileName, string contentType, byte[] fileBytes, string purpose, string? horseId, string userId)
    {
        if (fileBytes.Length > 10 * 1024 * 1024)
            throw new InvalidOperationException("VALIDATION_ERROR: Dung lượng file không được vượt quá 10MB.");

        var allowedMimes = new[] { "image/jpeg", "image/png", "application/pdf" };
        if (!allowedMimes.Contains(contentType.ToLowerInvariant()))
            throw new InvalidOperationException("VALIDATION_ERROR: Chỉ hỗ trợ định dạng ảnh JPEG, PNG hoặc tài liệu PDF.");

        string fileId = $"EVIDENCE_{Guid.NewGuid():N}"[..20].ToUpper();
        string uploadDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "flow4");
        Directory.CreateDirectory(uploadDir);

        string safeFileName = $"{fileId}_{Path.GetFileName(fileName)}";
        string filePath = Path.Combine(uploadDir, safeFileName);
        await File.WriteAllBytesAsync(filePath, fileBytes);

        var attachment = new ExecutionAttachment
        {
            FileId = fileId,
            TripId = tripId,
            HorseId = horseId,
            FileName = fileName,
            ContentType = contentType,
            FileSize = fileBytes.Length,
            StoragePath = filePath,
            Purpose = purpose,
            UploadedBy = userId,
            UploadedAtUtc = DateTime.UtcNow
        };

        _context.ExecutionAttachments.Add(attachment);
        await _context.SaveChangesAsync();

        return new Flow4FileUploadResultDto
        {
            Id = fileId,
            TripId = tripId,
            Filename = fileName,
            MimeType = contentType,
            SizeBytes = fileBytes.Length,
            Purpose = purpose,
            UploadedAt = attachment.UploadedAtUtc.ToString("yyyy-MM-dd HH:mm")
        };
    }

    /// <summary>
    /// F4-J31: Tải xuống file chứng từ thực thi theo fileId có kiểm soát phân quyền.
    /// </summary>
    public async Task<(string fileName, string contentType, byte[] fileBytes)?> GetExecutionFileAsync(string tripId, string fileId)
    {
        var attachment = await _context.ExecutionAttachments
            .FirstOrDefaultAsync(a => a.TripId == tripId && a.FileId == fileId);

        if (attachment == null || !File.Exists(attachment.StoragePath))
            return null;

        var bytes = await File.ReadAllBytesAsync(attachment.StoragePath);
        return (attachment.FileName, attachment.ContentType, bytes);
    }

    /// <summary>
    /// F4-J37: Tra cứu danh sách các khoản chi phí phát sinh thực tế trên đường (Petty Cash).
    /// </summary>
    public async Task<List<TripExpenseRecordDto>> GetExpensesAsync(string tripId)
    {
        var expenses = await _context.TripExpenses
            .Include(e => e.RecordedByUser)
            .Where(e => e.TripId == tripId)
            .OrderByDescending(e => e.OccurredAt)
            .ToListAsync();

        return expenses.Select(e => new TripExpenseRecordDto
        {
            Id = e.ExpenseId,
            TripId = e.TripId,
            Entry = new TripExpenseInputDto
            {
                ExpectedVersion = 1,
                Category = e.Category,
                AmountVnd = e.AmountVnd,
                OccurredAt = e.OccurredAt.ToString("yyyy-MM-dd HH:mm"),
                Reason = e.Reason,
                MilestoneId = e.MilestoneId,
                ReceiptFileIds = !string.IsNullOrEmpty(e.ReceiptFileIds)
                    ? JsonSerializer.Deserialize<List<string>>(e.ReceiptFileIds) ?? new()
                    : new()
            },
            RecordedBy = new Flow4ActorDto
            {
                UserId = e.RecordedBy,
                Name = e.RecordedByUser?.FullName ?? "Tài xế / Kíp xe",
                Role = "DRIVER_ESCORT"
            },
            RecordedAt = e.RecordedAt.ToString("yyyy-MM-dd HH:mm"),
            Status = e.Status
        }).ToList();
    }
}
