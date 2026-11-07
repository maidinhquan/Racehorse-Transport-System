using System.Text.Json;
using Application.DTOs.Flow4;
using Application.Interfaces.Flow4;
using Domain.Entities;
using Domain.Entities.Flow4;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Flow4;

public class Flow4HealthService : IFlow4HealthService
{
    private readonly HorseTransportDbContext _context;

    public Flow4HealthService(HorseTransportDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// F4-J22: Tra cứu nhật ký sức khỏe, sinh hiệu của các cá thể ngựa trên chuyến đi.
    /// </summary>
    public async Task<List<HealthLogDto>> GetHealthLogsAsync(string tripId, string? horseId = null)
    {
        var query = _context.HealthLogs
            .Include(h => h.Escort)
            .Where(h => h.TripId == tripId);

        if (!string.IsNullOrWhiteSpace(horseId))
        {
            query = query.Where(h => h.HorseId == horseId);
        }

        var logs = await query
            .OrderByDescending(h => h.RecordedAt)
            .ThenByDescending(h => h.LogId)
            .ToListAsync();

        return logs.Select(h => MapToDto(h)).ToList();
    }

    /// <summary>
    /// F4-J23: Ghi nhận nhật ký sức khỏe, quan sát lâm sàng và sinh hiệu cá thể ngựa.
    /// </summary>
    public async Task<HealthLogDto> RecordHealthLogAsync(string tripId, HealthLogInputDto dto, string userId)
    {
        var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        bool isAbnormal = dto.Condition == "ABNORMAL";

        // Nhật ký luôn gắn với mốc đang chờ: máy khách có thể gửi mốc cũ (đã hoàn tất) hoặc không gửi mốc
        var milestoneId = dto.MilestoneId;
        var current = string.IsNullOrEmpty(milestoneId)
            ? null
            : await _context.TripMilestones.FirstOrDefaultAsync(m => m.TripId == tripId && m.MilestoneId == milestoneId);
        if (current == null || current.Status != "PENDING")
        {
            milestoneId = await _context.TripMilestones
                .Where(m => m.TripId == tripId && m.Status == "PENDING")
                .OrderBy(m => m.SequenceOrder)
                .Select(m => m.MilestoneId)
                .FirstOrDefaultAsync() ?? milestoneId;
        }

        var log = new HealthLog
        {
            LogId = $"HL_{Guid.NewGuid():N}"[..20].ToUpper(),
            TripId = tripId,
            HorseId = dto.HorseId,
            EscortId = userId,
            Condition = dto.Condition,
            Temperature = dto.TemperatureC,
            HeartRate = dto.HeartRateBpm,
            RespiratoryRatePerMin = dto.RespiratoryRatePerMin,
            Feeding = dto.Feeding,
            Water = dto.Water,
            RestStatus = dto.Rest,
            CareNotes = dto.Care,
            Description = dto.Observation,
            PhotoFileIds = dto.PhotoFileIds.Any() ? JsonSerializer.Serialize(dto.PhotoFileIds) : null,
            IncidentId = dto.IncidentId,
            IncidentRequired = isAbnormal,
            MilestoneId = milestoneId,
            LegType = dto.Leg ?? "road",
            LogTime = DateTime.TryParse(dto.ObservedAt, out var dt) ? dt : DateTime.UtcNow,
            RecordedAt = DateTime.UtcNow
        };

        _context.HealthLogs.Add(log);

        // Nếu bất thường, tự động kích hoạt một cảnh báo ExecutionAlert
        if (isAbnormal)
        {
            var alert = new ExecutionAlert
            {
                AlertId = $"ALT_{Guid.NewGuid():N}"[..20].ToUpper(),
                TripId = tripId,
                MilestoneId = dto.MilestoneId,
                AlertKind = "HEALTH_CHECK_DUE",
                Status = "OPEN",
                Message = $"Cảnh báo y tế: Ngựa {dto.HorseId} có dấu hiệu bất thường: {dto.Observation}",
                CreatedAt = DateTime.UtcNow
            };
            _context.ExecutionAlerts.Add(alert);
        }

        await _context.SaveChangesAsync();

        var escortUser = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);

        return MapToDto(log, escortUser);
    }

    /// <summary>
    /// F4-J24: Đính chính nhật ký sức khỏe theo mô hình Append-Only (không sửa đè dữ liệu cũ).
    /// </summary>
    public async Task<HealthLogDto> AmendHealthLogAsync(string tripId, string healthLogId, HealthLogAmendmentInputDto dto, string userId)
    {
        var original = await _context.HealthLogs.FirstOrDefaultAsync(h => h.TripId == tripId && h.LogId == healthLogId);
        if (original == null)
            throw new KeyNotFoundException($"Không tìm thấy nhật ký sức khỏe có mã {healthLogId}.");

        var replacementInput = dto.Replacement;
        bool isAbnormal = replacementInput.Condition == "ABNORMAL";

        var amendment = new HealthLog
        {
            LogId = $"HL_{Guid.NewGuid():N}"[..20].ToUpper(),
            TripId = tripId,
            HorseId = replacementInput.HorseId,
            EscortId = userId,
            Condition = replacementInput.Condition,
            Temperature = replacementInput.TemperatureC,
            HeartRate = replacementInput.HeartRateBpm,
            RespiratoryRatePerMin = replacementInput.RespiratoryRatePerMin,
            Feeding = replacementInput.Feeding,
            Water = replacementInput.Water,
            RestStatus = replacementInput.Rest,
            CareNotes = replacementInput.Care,
            Description = replacementInput.Observation,
            PhotoFileIds = replacementInput.PhotoFileIds.Any() ? JsonSerializer.Serialize(replacementInput.PhotoFileIds) : null,
            IncidentId = replacementInput.IncidentId,
            IncidentRequired = isAbnormal,
            SupersedesLogId = healthLogId,
            AmendmentReason = dto.Reason,
            MilestoneId = replacementInput.MilestoneId,
            LegType = replacementInput.Leg ?? "road",
            LogTime = DateTime.TryParse(replacementInput.ObservedAt, out var dt) ? dt : DateTime.UtcNow,
            RecordedAt = DateTime.UtcNow
        };

        _context.HealthLogs.Add(amendment);
        await _context.SaveChangesAsync();

        var escortUser = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        return MapToDto(amendment, escortUser);
    }

    /// <summary>
    /// F4-J25: Bác sĩ thú y ghi nhận kết luận thể trạng chuyên môn (FIT / NOT_FIT / NEEDS_REVIEW).
    /// </summary>
    public async Task<VetAssessmentDto> RecordVetAssessmentAsync(string tripId, VetAssessmentInputDto dto, string vetId)
    {
        var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        var healthLog = await _context.HealthLogs.FirstOrDefaultAsync(h => h.LogId == dto.HealthLogId);
        if (healthLog == null)
            throw new KeyNotFoundException($"Không tìm thấy nhật ký sức khỏe có mã {dto.HealthLogId}.");

        var assessment = new VetAssessment
        {
            AssessmentId = $"VET_{Guid.NewGuid():N}"[..20].ToUpper(),
            TripId = tripId,
            HorseId = healthLog.HorseId ?? string.Empty,
            VetId = vetId,
            HealthLogId = dto.HealthLogId,
            TransportFitness = dto.TransportFitness,
            Conclusion = dto.Conclusion,
            CareInstructions = dto.Instructions,
            EvidenceFileIds = dto.EvidenceFileIds.Any() ? JsonSerializer.Serialize(dto.EvidenceFileIds) : null,
            IncidentId = dto.IncidentId,
            AssessedAt = DateTime.TryParse(dto.ExaminedAt, out var dt) ? dt : DateTime.UtcNow,
            RecordedAt = DateTime.UtcNow
        };

        _context.VetAssessments.Add(assessment);
        await _context.SaveChangesAsync();

        var vetUser = await _context.Users.FirstOrDefaultAsync(u => u.UserId == vetId);

        return new VetAssessmentDto
        {
            Id = assessment.AssessmentId,
            Entry = dto,
            RecordedBy = new Flow4ActorDto
            {
                UserId = vetId,
                Name = vetUser?.FullName ?? "Bác sĩ thú y",
                Role = "VETERINARIAN"
            },
            RecordedAt = assessment.RecordedAt.ToString("yyyy-MM-dd HH:mm")
        };
    }

    /// <summary>
    /// F4-J26: Tra cứu các kết luận và chỉ dẫn chăm sóc y tế của Bác sĩ thú y trên chuyến đi.
    /// </summary>
    public async Task<List<VetAssessmentDto>> GetVetAssessmentsAsync(string tripId, string? horseId = null)
    {
        var query = _context.VetAssessments
            .Include(v => v.VetUser)
            .Where(v => v.TripId == tripId);

        if (!string.IsNullOrWhiteSpace(horseId))
        {
            query = query.Where(v => v.HorseId == horseId);
        }

        var list = await query.OrderByDescending(v => v.AssessedAt).ToListAsync();

        return list.Select(v => new VetAssessmentDto
        {
            Id = v.AssessmentId,
            Entry = new VetAssessmentInputDto
            {
                ExpectedVersion = 1,
                HealthLogId = v.HealthLogId ?? "",
                ExaminedAt = v.AssessedAt.ToString("yyyy-MM-dd HH:mm"),
                Conclusion = v.Conclusion,
                TransportFitness = v.TransportFitness,
                Instructions = v.CareInstructions ?? "",
                EvidenceFileIds = !string.IsNullOrEmpty(v.EvidenceFileIds) ? JsonSerializer.Deserialize<List<string>>(v.EvidenceFileIds) ?? new() : new(),
                IncidentId = v.IncidentId
            },
            RecordedBy = new Flow4ActorDto
            {
                UserId = v.VetId,
                Name = v.VetUser?.FullName ?? "Bác sĩ thú y",
                Role = "VETERINARIAN"
            },
            RecordedAt = v.RecordedAt.ToString("yyyy-MM-dd HH:mm")
        }).ToList();
    }

    private static HealthLogDto MapToDto(HealthLog h, User? user = null)
    {
        var photoIds = !string.IsNullOrEmpty(h.PhotoFileIds)
            ? JsonSerializer.Deserialize<List<string>>(h.PhotoFileIds) ?? new()
            : new();

        return new HealthLogDto
        {
            Id = h.LogId,
            Entry = new HealthLogInputDto
            {
                ExpectedVersion = 1,
                HorseId = h.HorseId ?? string.Empty,
                Leg = h.LegType ?? "road",
                MilestoneId = h.MilestoneId,
                ObservedAt = h.LogTime.ToString("yyyy-MM-dd HH:mm"),
                Condition = h.Condition ?? "NORMAL",
                Observation = h.Description ?? "",
                Feeding = h.Feeding,
                Water = h.Water,
                Rest = h.RestStatus,
                Care = h.CareNotes,
                TemperatureC = h.Temperature,
                HeartRateBpm = h.HeartRate,
                RespiratoryRatePerMin = h.RespiratoryRatePerMin,
                PhotoFileIds = photoIds,
                IncidentId = h.IncidentId
            },
            RecordedBy = new Flow4ActorDto
            {
                UserId = h.EscortId ?? string.Empty,
                Name = user?.FullName ?? h.Escort?.FullName ?? "Nhân viên áp tải",
                Role = "DRIVER_ESCORT"
            },
            RecordedAt = h.RecordedAt?.ToString("yyyy-MM-dd HH:mm") ?? h.LogTime.ToString("yyyy-MM-dd HH:mm"),
            SupersedesId = h.SupersedesLogId,
            AmendmentReason = h.AmendmentReason,
            IncidentRequired = h.IncidentRequired ?? false
        };
    }
}
