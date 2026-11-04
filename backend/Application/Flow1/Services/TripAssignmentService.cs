using Application.Flow1.Dtos;
using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using Domain.Enums;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;
public sealed class TripAssignmentService(IDataSession data, AccessService access, NotificationService notifications, TimeProvider clock)
{
    public async Task<object> ListAsync(string actor, CancellationToken ct)
    {
        await access.AccountAsync(actor, UserRoles.LogisticsManager, ct);
        var trips = await data.ListAsync<Trip>(t => true, ct);
        var ids = trips.Select(t => t.RequestID).ToArray();
        var requests = (await data.ListAsync<TransportRequest>(r => ids.Contains(r.RequestID), ct)).ToDictionary(r => r.RequestID);
        var records = await HorseRecordsAsync(ids, ct);
        var tripIds = trips.Select(t => t.TripID).ToArray();
        var policies = await data.ListAsync<TripInsuranceRecord>(i => tripIds.Contains(i.TripID), ct);
        return trips.Select(t => View(t, requests.GetValueOrDefault(t.RequestID), Readiness(records.Where(r => r.RequestID == t.RequestID)),
            InsuranceStatus(policies.Where(i => i.TripID == t.TripID)))).ToArray();
    }
    public async Task<object> DetailAsync(string actor, string id, CancellationToken ct)
    {
        await access.AccountAsync(actor, UserRoles.LogisticsManager, ct);
        var trip = await data.FindAsync<Trip>(ct, id) ?? throw Failure("NOT_FOUND", "Trip not found.", 404);
        return await ViewAsync(trip, ct);
    }
    public Task<object> AssignAsync(string actor, string id, AssignmentInput input, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        await access.AccountAsync(actor, UserRoles.LogisticsManager, token);
        var trip = await data.FindAsync<Trip>(token, id) ?? throw Failure("NOT_FOUND", "Trip not found.", 404);
        Require(trip.Status == "PLANNING" && trip.DeploymentStatus != "ON_HOLD", "INVALID_STATE", "Assignment is only available during planning.");
        var contract = (await data.ListAsync<Contract>(c => c.TripID == id, token)).SingleOrDefault();
        Require(contract?.ContractStatus == "EFFECTIVE" && contract.SignedAt is not null, "INVALID_STATE", "A signed effective contract is required.");
        await access.AccountAsync(input.SpecialistId, UserRoles.TransportSpecialist, token);
        await access.AccountAsync(input.CoordinatorId, UserRoles.FleetRouteCoordinator, token);
        if (trip.HandoffEventId is not null)
        {
            Require(trip.AssignedSpecialistId == input.SpecialistId && trip.AssignedCoordinatorId == input.CoordinatorId, "TRIP_ALREADY_ASSIGNED", "Assignment is already confirmed.");
            return await ViewAsync(trip, token);
        }
        trip.AssignedSpecialistId = input.SpecialistId; trip.AssignedCoordinatorId = input.CoordinatorId;
        trip.DeploymentStatus = "CONFIRMED"; trip.DeploymentBy = actor; trip.DeploymentAtUtc = clock.GetUtcNow().UtcDateTime;
        trip.DeploymentReason = "Assigned by Logistics Manager";
        trip.HandoffEventId = "HANDOFF_EVENT_" + trip.TripID["TRIP_".Length..];
        notifications.Add(input.SpecialistId, id, "TRIP_ASSIGNED", "Trip assigned", "Prepare the trip documents.");
        notifications.Add(input.CoordinatorId, id, "TRIP_ASSIGNED", "Trip assigned", "Prepare the operational plan.");
        return await ViewAsync(trip, token);
    }, ct);
    public Task<object> HoldAsync(string actor, string id, string reason, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        await access.AccountAsync(actor, UserRoles.LogisticsManager, token);
        var trip = await data.FindAsync<Trip>(token, id) ?? throw Failure("NOT_FOUND", "Trip not found.", 404);
        Require(trip.Status is "PLANNING" or "READY_TO_DEPART", "INVALID_STATE", "Only a trip before departure may be held.");
        if (trip.DeploymentStatus == "ON_HOLD") return await ViewAsync(trip, token);
        Require(trip.DeploymentStatus == "CONFIRMED" && trip.HandoffEventId is not null, "INVALID_STATE", "Trip is not assigned.");
        trip.DeploymentStatus = "ON_HOLD"; trip.Status = "PLANNING";
        trip.DeploymentReason = Required(reason, 1000); trip.DeploymentBy = actor; trip.DeploymentAtUtc = clock.GetUtcNow().UtcDateTime;
        return await ViewAsync(trip, token);
    }, ct);
    public Task<object> ResumeAsync(string actor, string id, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        await access.AccountAsync(actor, UserRoles.LogisticsManager, token);
        var trip = await data.FindAsync<Trip>(token, id) ?? throw Failure("NOT_FOUND", "Trip not found.", 404);
        Require(trip.Status == "PLANNING", "INVALID_STATE", "Trip must be replanned before departure.");
        if (trip.DeploymentStatus == "CONFIRMED") return await ViewAsync(trip, token);
        Require(trip.DeploymentStatus == "ON_HOLD" && trip.HandoffEventId is not null, "INVALID_STATE", "Trip is not on hold.");
        await access.AccountAsync(trip.AssignedSpecialistId!, UserRoles.TransportSpecialist, token);
        await access.AccountAsync(trip.AssignedCoordinatorId!, UserRoles.FleetRouteCoordinator, token);
        trip.DeploymentStatus = "CONFIRMED"; trip.DeploymentReason = "Resumed; departure approval must be evaluated again";
        trip.DeploymentBy = actor; trip.DeploymentAtUtc = clock.GetUtcNow().UtcDateTime;
        return await ViewAsync(trip, token);
    }, ct);
    private async Task<object> ViewAsync(Trip trip, CancellationToken ct) => View(trip, await data.FindAsync<TransportRequest>(ct, trip.RequestID),
        Readiness(await HorseRecordsAsync(new[] { trip.RequestID }, ct)),
        InsuranceStatus(await data.ListAsync<TripInsuranceRecord>(i => i.TripID == trip.TripID, ct)));
    /// <summary>VERIFIED khi hợp đồng bảo hiểm mới nhất đã được Specialist xác minh; PENDING khi đã có nhưng chưa xác minh; MISSING khi chưa có.</summary>
    private static string InsuranceStatus(IEnumerable<TripInsuranceRecord> policies) =>
        policies.OrderByDescending(i => i.CreatedAtUtc).FirstOrDefault()?.Status switch { null => "MISSING", "VERIFIED" => "VERIFIED", _ => "PENDING" };
    /// <summary>Giấy tờ của từng ngựa trong đơn (bản ghi cấp chuyến không gắn ngựa nên không tính ở đây).</summary>
    private async Task<List<MedicalRecord>> HorseRecordsAsync(string[] requestIds, CancellationToken ct)
    {
        var horseIds = (await data.ListAsync<RequestHorse>(x => requestIds.Contains(x.RequestID), ct)).Select(x => x.HorseID).Distinct().ToArray();
        if (horseIds.Length == 0) return [];
        return await data.ListAsync<MedicalRecord>(x => requestIds.Contains(x.RequestID) && horseIds.Contains(x.HorseID), ct);
    }
    /// <summary>Khi Specialist đã xác nhận Docs READY thì coi toàn bộ hồ sơ hợp lệ (xác nhận này là nguồn đúng, tự hết hiệu lực nếu hồ sơ đổi). Số giấy tờ đã duyệt / tổng số giấy tờ của đơn (mỗi loại giấy tờ theo từng ngựa tính một lần, đạt khi có bản ghi APPROVED và không còn bản ghi cần nộp lại; bản SUBMITTED trùng cũ không tính).</summary>
    private static (int Ready, int Total) Readiness(IEnumerable<MedicalRecord> records)
    {
        var groups = records.GroupBy(r => (r.HorseID ?? "", r.DocumentType ?? "")).ToList();
        return (groups.Count(g => g.Any(r => r.DocumentStatus == "APPROVED") && g.All(r => r.DocumentStatus != "ACTION_REQUIRED")), groups.Count);
    }
    public static object View(Trip trip, TransportRequest? request = null, (int Ready, int Total)? docs = null, string insurance = "MISSING") => new { id = trip.TripID, tripId = trip.TripID, requestId = trip.RequestID, tripStatus = trip.Status,
        status = trip.Status, mode = request?.TransportType, plannedDepart = request?.ExpectedDate?.ToString("yyyy-MM-dd HH:mm"),
        eta = request?.CommittedDeadline?.ToString("yyyy-MM-dd HH:mm"),
        deployment = new { status = trip.DeploymentStatus ?? "NOT_CONFIRMED", eventId = trip.HandoffEventId, reason = trip.DeploymentReason, at = trip.DeploymentAtUtc },
        specialistId = trip.AssignedSpecialistId, coordinatorId = trip.AssignedCoordinatorId,
        readiness = new { docsReady = trip.DocsReadyAtUtc.HasValue ? Math.Max(docs?.Total ?? 0, docs?.Ready ?? 0) : docs?.Ready ?? 0,
            docsTotal = docs?.Total ?? 0, quarantineOk = trip.DocsReadyAtUtc.HasValue, docsReadyAt = trip.DocsReadyAtUtc?.ToString("yyyy-MM-dd HH:mm"), insurance } };
}
