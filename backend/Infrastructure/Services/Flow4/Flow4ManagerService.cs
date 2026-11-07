using Application.DTOs.Flow4;
using Application.Interfaces.Flow4;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Flow4;

public class Flow4ManagerService : IFlow4ManagerService
{
    private readonly HorseTransportDbContext _context;

    public Flow4ManagerService(HorseTransportDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// F4-J35: Màn hình chỉ huy giám sát tổng thể toàn diện tiến độ vận hành của Quản lý logistics.
    /// </summary>
    public async Task<Flow4TrackingDto> GetManagerExecutionAsync(string tripId)
    {
        var trip = await _context.TripPlans
            .Include(t => t.Request)
            .FirstOrDefaultAsync(t => t.TripId == tripId);

        if (trip == null)
            throw new KeyNotFoundException($"Không tìm thấy chuyến đi có mã {tripId}.");

        return Flow4Helper.BuildTrackingDto(trip, "MANAGER", "LOGISTICS_MANAGER", _context);
    }

    /// <summary>
    /// F4-J21: Quản lý logistics đưa ra quyết định đối với các đề xuất điều chỉnh ETA vượt hạn giao hàng (PENDING_MANAGER).
    /// </summary>
    public async Task<Flow4MutationResultDto> DecideManagerEtaProposalAsync(string tripId, string proposalId, EtaDecisionInputDto dto, string managerId)
    {
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

        var proposal = await _context.EtaProposals
            .FirstOrDefaultAsync(p => p.TripId == tripId && p.ProposalId == proposalId);

        if (proposal == null)
            throw new KeyNotFoundException($"Không tìm thấy đề xuất ETA có mã {proposalId}.");

        if (proposal.Status != "PENDING_MANAGER")
            throw new InvalidOperationException("TRIP_STATE_INVALID: Đề xuất ETA này không ở trạng thái chờ Quản lý phê duyệt (PENDING_MANAGER).");

        if (dto.Decision == "APPROVE")
        {
            proposal.Status = "APPROVED";
            proposal.ManagerDecisionBy = managerId;
            proposal.ManagerDecisionAt = DateTime.UtcNow;
            proposal.ManagerDecisionReason = dto.Reason;
            trip.CurrentEta = proposal.ProposedEta;
            trip.PendingEtaProposalId = null;
        }
        else
        {
            proposal.Status = "REJECTED";
            proposal.ManagerDecisionBy = managerId;
            proposal.ManagerDecisionAt = DateTime.UtcNow;
            proposal.ManagerDecisionReason = dto.Reason;
            trip.PendingEtaProposalId = null;
        }

        trip.ExecutionVersion += 1;
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return Flow4Helper.BuildMutationResult(trip, proposal.ProposalId, _context);
        });
    }
}
