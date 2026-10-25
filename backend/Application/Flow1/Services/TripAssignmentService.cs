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
        return trips.Select(t => View(t, requests.GetValueOrDefault(t.RequestID))).ToArray();
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
    private async Task<object> ViewAsync(Trip trip, CancellationToken ct) => View(trip, await data.FindAsync<TransportRequest>(ct, trip.RequestID));
    public static object View(Trip trip, TransportRequest? request = null) => new { id = trip.TripID, tripId = trip.TripID, requestId = trip.RequestID, tripStatus = trip.Status,
        status = trip.Status, mode = request?.TransportType, plannedDepart = request?.ExpectedDate?.ToString("yyyy-MM-dd HH:mm"),
        eta = request?.CommittedDeadline?.ToString("yyyy-MM-dd HH:mm"),
        readiness = (object?)null, unsupportedFields = new[] { "readiness" },
        deployment = new { status = trip.DeploymentStatus ?? "NOT_CONFIRMED", eventId = trip.HandoffEventId, reason = trip.DeploymentReason, at = trip.DeploymentAtUtc },
        specialistId = trip.AssignedSpecialistId, coordinatorId = trip.AssignedCoordinatorId };
}
