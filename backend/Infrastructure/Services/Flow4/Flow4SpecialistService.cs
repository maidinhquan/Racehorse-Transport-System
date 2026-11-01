using System.Text.Json;
using Application.DTOs.Flow4;
using Application.Interfaces.Flow4;
using Domain.Entities.Flow4;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Flow4;

public class Flow4SpecialistService : IFlow4SpecialistService
{
    private readonly HorseTransportDbContext _context;

    public Flow4SpecialistService(HorseTransportDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// F4-J11: Tra cứu danh sách các trạm kiểm soát pháp lý và quyết định kiểm tra trên chuyến đi.
    /// </summary>
    public async Task<List<CheckpointRecordDto>> GetCheckpointsAsync(string tripId)
    {
        var decisions = await _context.CheckpointDecisions
            .Include(c => c.SpecialistUser)
            .Where(c => c.TripId == tripId)
            .OrderByDescending(c => c.OccurredAt)
            .ToListAsync();

        return decisions.Select(d => new CheckpointRecordDto
        {
            Id = d.DecisionId,
            MilestoneId = d.MilestoneId ?? d.CheckpointId,
            Version = d.Version,
            Status = d.Decision,
            Reason = d.Reason,
            EvidenceFileIds = !string.IsNullOrEmpty(d.EvidenceFileIds)
                ? JsonSerializer.Deserialize<List<string>>(d.EvidenceFileIds) ?? new()
                : new(),
            RecordedBy = new Flow4ActorDto
            {
                UserId = d.SpecialistId,
                Name = d.SpecialistUser?.FullName ?? "Chuyên viên pháp lý vận chuyển",
                Role = "TRANSPORT_SPECIALIST"
            },
            RecordedAt = d.RecordedAt.ToString("yyyy-MM-dd HH:mm")
        }).ToList();
    }

    /// <summary>
    /// F4-J12: Chuyên viên pháp lý vận chuyển ghi nhận kết quả kiểm tra thực tế tại trạm (CLEARED / HELD / SUPPLEMENT_REQUIRED).
    /// </summary>
    public async Task<Flow4MutationResultDto> RecordCheckpointDecisionAsync(string tripId, string checkpointId, CheckpointDecisionInputDto dto, string specialistId)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        var trip = await _context.TripPlans.FirstOrDefaultAsync(t => t.TripId == tripId);
        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        if (dto.ExpectedVersion != trip.ExecutionVersion)
            throw new InvalidOperationException($"STALE_VERSION: Phiên bản thực thi không khớp.");

        var decision = new CheckpointDecision
        {
            DecisionId = $"CHK_{Guid.NewGuid():N}"[..20].ToUpper(),
            CheckpointId = checkpointId,
            TripId = tripId,
            SpecialistId = specialistId,
            MilestoneId = checkpointId,
            Decision = dto.Decision,
            OccurredAt = DateTime.TryParse(dto.OccurredAt, out var dt) ? dt : DateTime.UtcNow,
            RecordedAt = DateTime.UtcNow,
            Reason = dto.Reason,
            EvidenceFileIds = dto.EvidenceFileIds.Any() ? JsonSerializer.Serialize(dto.EvidenceFileIds) : "[]",
            Version = dto.CheckpointVersion
        };

        _context.CheckpointDecisions.Add(decision);
        trip.ExecutionVersion += 1;

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return Flow4Helper.BuildMutationResult(trip, decision.DecisionId, _context);
    }
}
