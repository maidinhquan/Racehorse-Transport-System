using System.Text.Json;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Domain.Entities;
using Domain.Interfaces.DAOs;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1;

/// <summary>Operational release and downstream receipts live on the existing CONTRACT owner. No infrastructure deployment.</summary>
public sealed class DeploymentService(DepositPaymentService money, IFlow1Repository repo, IFlow1StateStore state,
    CustomerTransportService customers, TimeProvider clock)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static void Require(bool ok, string code, string message) { if (!ok) throw Error(message, code, 409); }
    private async Task<T> Read<T>(string type, string id, CancellationToken ct)
    {
        var d = await state.ReadAsync(type, id, ct) ?? throw Error("Operational evidence missing.", "STATE_UNAVAILABLE", 409);
        return d.Revisions[^1].Payload.Deserialize<T>(Json) ?? throw Error("Operational evidence missing.", "STATE_UNAVAILABLE", 409);
    }
    private sealed record Context(DepositPaymentsView Money, Contract Contract, TripPlan Trip, ContractPublication Publication,
        DraftSnapshot Draft, RequestSnapshot Request, int Version, DeploymentState State, DeploymentState[] History);
    private async Task<Context> Load(DepositPaymentsView v, CancellationToken ct)
    {
        Require(v.Activation is not null && v.ContractStatus == "EFFECTIVE" && v.RequestStatus == "ACTIVATED" && v.VerifiedAmount >= v.RequiredDeposit,
            "DEPLOYMENT_NOT_ACTIVATED", "Deployment requires signed terms, verified deposit and activation.");
        var c = (await repo.GetContractAsync(v.ContractId, ct))!; var trip = await repo.GetTripForRequestAsync(c.RequestId, ct);
        var p = await Read<ContractPublication>("publication", v.ContractId, ct); var draft = await Read<DraftSnapshot>("contract", v.ContractId, ct);
        var requestDoc = (await state.ReadAsync("request", c.RequestId, ct))!; var planDoc = (await state.ReadAsync("plan", c.RequestId, ct))!;
        var request = requestDoc.Revisions[^1].Payload.Deserialize<RequestSnapshot>(Json)!; var review = await Read<ReviewState>("review", c.RequestId, ct);
        var row = (await repo.GetRequestAsync(c.RequestId, ct))!;
        Require(trip is not null && trip.TripId == c.TripId && trip.TripId == v.Activation!.TripId && trip.TotalCost == draft.Plan.EstimatedCost &&
            trip.TotalDistanceKm == draft.Plan.RoadDistanceKm && requestDoc.Revisions.Count == p.RequestVersion && planDoc.Revisions.Count == p.PlanVersion &&
            CustomerTransportService.Hash(planDoc.Revisions[^1].Payload.Deserialize<PreliminaryPlan>(Json)) == CustomerTransportService.Hash(draft.Plan) &&
            review.CurrentContractId == c.ContractId && review.RequestVersion == p.RequestVersion && review.PlanVersion == p.PlanVersion && !review.Changes.Any(x => x.Status == "PENDING") &&
            row.ExpectedDate == request.Input.Trip.DesiredDepartureDate.ToDateTime(TimeOnly.MinValue) && row.CommittedDeadline == request.Input.DeliveryDeadline.ToDateTime(TimeOnly.MinValue),
            "HANDOFF_CONFLICT", "Operational plan/request/Trip differ from signed terms.");
        var doc = await state.ReadAsync("deployment", v.ContractId, ct);
        var history = doc?.Revisions.Select(r => r.Payload.Deserialize<DeploymentState>(Json)!).ToArray() ?? [];
        var value = history.LastOrDefault() ?? new(trip!.TripId, "PENDING", null, [], new("initial", "", "SYSTEM", "PENDING", null, v.Activation!.AtUtc));
        Require(value.TripId == trip!.TripId && value.Status is "PENDING" or "CONFIRMED" or "ON_HOLD", "HANDOFF_CONFLICT", "Deployment state differs from Trip.");
        return new(v, c, trip, p, draft, request, history.Length, value, history);
    }
    private bool Feasible(Context x) => x.Draft.Plan.Input.PlannedDepartureAt is not null &&
        clock.GetUtcNow().AddDays(x.Draft.Plan.Input.PreparationDays) <= x.Draft.Plan.Input.PlannedDepartureAt.Value;
    private bool BeforeDeparture(Context x) => x.Trip.Status is "PLANNING" or "READY_TO_DEPART";
    private DeploymentView View(Context x, bool manager) => new(x.Contract.ContractId, x.Contract.RequestId, x.Trip.TripId, x.State.Status, x.Trip.Status, x.Version,
        manager && x.State.Status == "PENDING" && x.Trip.Status == "PLANNING" && Feasible(x) && !x.Money.FinancialReviewRequired,
        manager && x.State.Status != "ON_HOLD" && BeforeDeparture(x), manager && x.State.Status == "ON_HOLD" && x.Trip.Status == "PLANNING",
        x.History.Select(h => new DeploymentHistory(h.LastOperation.Action, manager ? h.LastOperation.Reason : null, h.LastOperation.AtUtc)).ToArray(),
        manager ? x.State.Acknowledgements : x.State.Acknowledgements.Select(a => a with { Actor = "" }).ToArray());
    public Task<DeploymentView> GetAsync(string id, string actor, bool manager, CancellationToken ct) =>
        money.UnderLockAsync(id, actor, manager, async (v, token) => View(await Load(v, token), manager), ct);
    public async Task<DeploymentView> ActAsync(string id, string actor, string key, string action, DeploymentInput input, CancellationToken ct)
    {
        CustomerTransportService.ValidateKey(key);
        Require(action is "confirm" or "hold" or "resume", "INVALID_ACTION", "Invalid deployment action.");
        Require(!string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Length <= 2000, "REASON_REQUIRED", "Enter the operational decision reason.");
        var hash = CustomerTransportService.Hash(new { actor, action, input });
        await money.UnderLockAsync(id, actor, true, async (v, token) => {
            var x = await Load(v, token); var prior = x.History.SingleOrDefault(h => h.LastOperation.Key == key);
            if (prior is not null) { Require(prior.LastOperation.Hash == hash && prior.LastOperation.Actor == actor, "IDEMPOTENCY_KEY_REUSED", "Key was used for another decision."); return 0; }
            Require(x.Version == input.ExpectedVersion, "STALE_VERSION", "Deployment changed; reload.");
            Require(BeforeDeparture(x), "DEPARTURE_ALREADY_STARTED", "Flow 1 cannot roll back a departed or completed Trip.");
            var next = action == "confirm" ? "CONFIRMED" : action == "hold" ? "ON_HOLD" : "PENDING";
            if (action == "confirm")
            {
                Require(x.State.Status == "PENDING" && x.Trip.Status == "PLANNING" && Feasible(x), "DEPARTURE_SCHEDULE_NOT_FEASIBLE", "Confirm requires a pending deployment and the frozen preparation interval.");
                Require(!v.FinancialReviewRequired, "FINANCIAL_REVIEW_REQUIRED", "Resolve financial review before operational release.");
                await customers.ValidateHorsesAsync(x.Contract.CustomerId, x.Request.Input, x.Contract.RequestId, token);
            }
            if (action == "hold") Require(x.State.Status != "ON_HOLD", "ALREADY_ON_HOLD", "Deployment is already on hold.");
            if (action == "resume") Require(x.State.Status == "ON_HOLD" && x.Trip.Status == "PLANNING", "NOT_ON_HOLD", "Only a held planning Trip can resume.");
            if (action == "hold" && x.Trip.Status == "READY_TO_DEPART") x.Trip.Status = "PLANNING";
            var eventId = action == "confirm" ? "f1-" + CustomerTransportService.Hash(new { id, trip = x.Trip.TripId, version = x.Version + 1 })[..40] : null;
            var value = new DeploymentState(x.Trip.TripId, next, eventId, [], new(key, hash, actor, action.ToUpperInvariant(), input.Reason!.Trim(), clock.GetUtcNow()));
            await state.AppendAsync("deployment", id, x.Version, "deployment-" + key, actor, action.ToUpperInvariant(), JsonSerializer.SerializeToElement(value, Json), token);
            return 0;
        }, ct);
        return await GetAsync(id, actor, true, ct);
    }
    public async Task<DeploymentView[]> QueueAsync(string actor, CancellationToken ct)
    {
        var results = new List<DeploymentView>();
        foreach (var c in await repo.GetActivatedContractsAsync(ct)) results.Add(await GetAsync(c.ContractId, actor, true, ct));
        return results.ToArray();
    }
    private async Task<Contract> ByTrip(string tripId, CancellationToken ct) =>
        await repo.GetTripContractAsync(tripId, ct) ?? throw Error("Trip not found.", "NOT_FOUND", 404);
    private void Released(Context x) => Require(x.State.Status == "CONFIRMED" && x.State.HandoffEventId is not null &&
        (x.Trip.Status is "PLANNING" or "READY_TO_DEPART") && !x.Money.FinancialReviewRequired && x.Draft.Plan.Input.PlannedDepartureAt > clock.GetUtcNow(),
        "DEPLOYMENT_NOT_CONFIRMED", "Operational work requires a confirmed, financially reconciled deployment before departure.");
    private static Flow1Handoff Package(Context x)
    {
        var p = x.Draft.Plan.Input;
        return new(1, x.State.HandoffEventId!, x.Contract.RequestId, x.Trip.TripId, x.Contract.ContractId,
            x.Publication.RequestVersion, x.Publication.PlanVersion, x.Publication.ContractVersion, x.Publication.Document.Sha256,
            new(p.DepartureDate, p.DeliveryDate, p.PlannedDepartureAt, p.PreparationDays, p.VehicleCount, p.StallsRequired, p.Resources,
                p.DepartureGateway, p.ArrivalGateway, p.GroundLegScope), x.Request.Input, "PENDING_SPECIALIST_REVIEW", x.State.Acknowledgements);
    }
    public async Task<Flow1Handoff> HandoffAsync(string tripId, string actor, CancellationToken ct)
    {
        var c = await ByTrip(tripId, ct);
        return await money.UnderLockAsync(c.ContractId, actor, true, async (v, token) => { var x = await Load(v, token); Released(x); return Package(x); }, ct);
    }
    public async Task<Flow1Handoff> AcknowledgeAsync(string tripId, string actor, string role, string key, HandoffAckInput input, CancellationToken ct)
    {
        CustomerTransportService.ValidateKey(key);
        Require(role == "FLEET_ROUTE_COORDINATOR" && input.Stream == "ROUTING" || role == "TRANSPORT_SPECIALIST" && input.Stream == "DOCUMENTS",
            "HANDOFF_ROLE_MISMATCH", "Only the responsible operational role can acknowledge this stream.");
        var c = await ByTrip(tripId, ct); var hash = CustomerTransportService.Hash(new { actor, role, input });
        return await money.UnderLockAsync(c.ContractId, actor, true, async (v, token) => {
            var x = await Load(v, token); Released(x);
            var prior = x.History.SingleOrDefault(h => h.LastOperation.Key == key);
            if (prior is not null) { Require(prior.LastOperation.Hash == hash && prior.LastOperation.Actor == actor && input.EventId == x.State.HandoffEventId,
                "IDEMPOTENCY_KEY_REUSED", "Handoff receipt was superseded or key reused."); return Package(x); }
            Require(input.ExpectedVersion == x.Version && input.EventId == x.State.HandoffEventId, "STALE_HANDOFF", "Reload the current handoff; a hold/resume invalidates earlier work packages.");
            await customers.ValidateHorsesAsync(x.Contract.CustomerId, x.Request.Input, x.Contract.RequestId, token);
            if (x.State.Acknowledgements.Any(a => a.Stream == input.Stream)) return Package(x);
            var value = x.State with { Acknowledgements = [.. x.State.Acknowledgements, new HandoffAcknowledgement(input.EventId, input.Stream, actor, clock.GetUtcNow())],
                LastOperation = new(key, hash, actor, "HANDOFF_ACKNOWLEDGED", input.Stream, clock.GetUtcNow()) };
            await state.AppendAsync("deployment", c.ContractId, x.Version, "ack-" + key, actor, "HANDOFF_ACKNOWLEDGED", JsonSerializer.SerializeToElement(value, Json), token);
            return Package(x with { State = value });
        }, ct);
    }
    public async Task<(byte[] Bytes, string ContentType)> DocumentAsync(string tripId, string actor, string horseId, int version, string kind, CancellationToken ct)
    {
        var c = await ByTrip(tripId, ct); var package = await HandoffAsync(tripId, actor, ct);
        if (!package.Request.Horses.Any(h => h.HorseId == horseId && h.DocumentVersion == version)) throw Error("Document not found.", "NOT_FOUND", 404);
        return await customers.DocumentFileAsync(c.CustomerId, horseId, version, kind, ct);
    }
}
