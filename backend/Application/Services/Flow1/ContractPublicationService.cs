using System.Text.Json;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Domain.Entities;
using Domain.Interfaces;
using Domain.Interfaces.DAOs;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1;

public sealed class ContractPublicationService(IRequestReviewRepository lookup, IFlow1Repository repo,
    IFlow1UnitOfWork work, IFlow1MetadataStore metadata, IFlow1PrivateFileStore files,
    IFlow1ContractDocumentGenerator generator, RequestReviewService reviews, CustomerTransportService customer,
    Flow1ContractOptions options, TimeProvider clock)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static T Payload<T>(Flow1MetadataRevision r) => r.Payload.Deserialize<T>(Json) ?? throw new InvalidDataException("Missing publication metadata.");
    private static void Require(bool value, string code, string message) { if (!value) throw Error(message, code, 409); }
    private async Task<(int Version, T Value)> Read<T>(string type, string id, CancellationToken ct)
    {
        var doc = await metadata.ReadAsync(type, id, ct) ?? throw Error("Contract metadata unavailable.", "METADATA_UNAVAILABLE", 409);
        return (doc.Revisions.Count, Payload<T>(doc.Revisions[^1]));
    }
    private async Task<(int Version, ContractPublication Value)?> Publication(string id, CancellationToken ct)
    {
        var doc = await metadata.ReadAsync("publication", id, ct);
        return doc is null ? null : (doc.Revisions.Count, Payload<ContractPublication>(doc.Revisions[^1]));
    }
    private Task<Flow1MetadataRevision> Append(ContractPublication p, int version, string action, string actor, CancellationToken ct) =>
        metadata.AppendAsync("publication", p.ContractId, version, action.ToLowerInvariant() + "-" + p.OperationKey, actor,
            action, JsonSerializer.SerializeToElement(p, Json), ct);
    private async Task<Contract> Locate(string id, string actor, bool manager, CancellationToken ct)
    {
        var c = await lookup.ContractAsync(id, ct);
        if (c is null || !manager && c.CustomerId != actor) throw Error("Contract not found.", "NOT_FOUND", 404);
        return c;
    }
    public async Task<PublishedContractView> PublishAsync(string id, string actor, string key, PublishContractInput input, CancellationToken ct)
    {
        CustomerTransportService.ValidateKey(key);
        var row = await Locate(id, actor, true, ct);
        input = input with { CompletionDeadline = input.CompletionDeadline.ToUniversalTime() };
        var hash = CustomerTransportService.Hash(new { actor, input });
        var previous = await Publication(id, ct);
        var history = await metadata.ReadAsync("publication", id, ct);
        var recorded = history?.Revisions.Select(Payload<ContractPublication>).LastOrDefault(p => p.OperationKey == key);
        if (recorded is not null)
        {
            Require(recorded.InputHash == hash && recorded.Actor == actor, "IDEMPOTENCY_KEY_REUSED", "Key was used with different publication input.");
            Require(recorded.Outcome != "ABORTED", "OPERATION_ABORTED", "This publication was discarded; reload and use a new key.");
        }
        if (previous.HasValue && previous.Value.Value.OperationKey == key)
        {
            Require(previous.Value.Value.InputHash == hash && previous.Value.Value.Actor == actor, "IDEMPOTENCY_KEY_REUSED", "Key was used with different publication input.");
            Require(previous.Value.Value.Outcome != "ABORTED", "OPERATION_ABORTED", "This publication was discarded; reload and use a new key.");
            await ResumeAsync(id, actor, ct);
            return (await GetAsync(id, actor, true, ct))!;
        }
        Require(previous is null || previous.Value.Value.Outcome == "ABORTED", "CONTRACT_FROZEN", "A publication already exists; retry or recover it.");
        var view = await reviews.ManagerAsync(row.RequestId, actor, ct);
        Require(view.Version == input.ExpectedReviewVersion && view.Contract?.ContractId == id && row.ContractStatus == "DRAFT" && view.Plan is not null &&
            view.Review.Pending is null && !view.Review.Changes.Any(x => x.Status == "PENDING"), "STALE_VERSION", "Reload the current Draft and resolve pending changes first.");
        var draft = await Read<DraftSnapshot>("contract", id, ct);
        var owner = await repo.GetCustomerAsync(row.CustomerId, ct) ?? throw Error("Customer unavailable.", "NOT_FOUND", 404);
        Feasible(input.CompletionDeadline, draft.Value);
        var issuedAt = clock.GetUtcNow();
        var model = ContractPdfModelBuilder.Build(row, owner, view.Request.Snapshot!, draft.Value, input.CompletionDeadline, issuedAt, options);
        var pdf = await generator.GenerateAsync(new(id, draft.Version, "v2", JsonSerializer.SerializeToElement(model, Json)), ct);
        var p = new ContractPublication(id, row.RequestId, row.CustomerId, draft.Version, draft.Value.RequestVersion,
            draft.Value.PlanVersion, view.Version, "v2", input.CompletionDeadline, pdf, model, CustomerTransportService.Hash(draft.Value), key, hash, actor, issuedAt.UtcDateTime);
        await work.ExecuteAsync(row.RequestId, async token => {
            await ValidateBefore(p, token);
            var current = await Publication(id, token);
            Require((current?.Version ?? 0) == (previous?.Version ?? 0), "STALE_VERSION", "Another publication was prepared concurrently.");
            await Append(p, current?.Version ?? 0, "PREPARED", actor, token);
            await Apply(p, token); return 0;
        }, ct);
        await ResumeAsync(id, actor, ct);
        return (await GetAsync(id, actor, true, ct))!;
    }
    private void Feasible(DateTimeOffset deadline, DraftSnapshot draft) => Require(deadline > clock.GetUtcNow() &&
        draft.Plan.Input.PlannedDepartureAt is not null && deadline <= draft.Plan.Input.PlannedDepartureAt.Value.AddDays(-draft.Plan.Input.PreparationDays),
        "INVALID_COMPLETION_DEADLINE", "Deadline must be in the future and preserve the plan's preparation interval.");
    private async Task ValidateBefore(ContractPublication p, CancellationToken ct)
    {
        var canonical = await Read<RequestSnapshot>("request", p.RequestId, ct);
        await work.LockHorsesAsync(canonical.Value.Input.Horses.Select(h => h.HorseId), ct);
        var c = await repo.GetContractAsync(p.ContractId, ct); var r = await repo.GetRequestAsync(p.RequestId, ct);
        var review = await Read<ReviewState>("review", p.RequestId, ct);
        var draft = await Read<DraftSnapshot>("contract", p.ContractId, ct);
        var plan = await Read<PreliminaryPlan>("plan", p.RequestId, ct);
        Require(c is not null && r is not null && c.CustomerId == p.CustomerId && r.CustomerId == p.CustomerId && c.RequestId == p.RequestId && c.ContractStatus == "DRAFT" &&
            c.SignedAt is null && c.TripId is null && c.CompletionDeadline is null && r.Status == "ACCEPTED", "CONTRACT_FROZEN", "Contract/request no longer matches the prepared Draft.");
        Require(review.Version == p.ReviewVersion && review.Value.Pending is null && review.Value.CurrentContractId == p.ContractId &&
            !review.Value.Changes.Any(x => x.Status == "PENDING") && canonical.Version == p.RequestVersion && plan.Version == p.PlanVersion &&
            draft.Version == p.ContractVersion && draft.Value.RequestVersion == p.RequestVersion && draft.Value.PlanVersion == p.PlanVersion &&
            CustomerTransportService.Hash(draft.Value) == p.DraftHash && c!.TotalQuotedPrice == draft.Value.Total && c.CurrencyCode == "VND" && c.DepositRateStandard == 40,
            "STALE_VERSION", "Request, plan, amount or review changed before publication.");
        Feasible(p.CompletionDeadline, draft.Value);
        await customer.ValidateHorsesAsync(p.CustomerId, canonical.Value.Input, p.RequestId, ct);
        await VerifyPdf(p, ct);
    }
    private Task<byte[]> VerifyPdf(ContractPublication p, CancellationToken ct) => files.ReadAsync(
        new(p.Document.PrivateStorageKey, p.Document.Sha256, "application/pdf", checked((int)p.Document.SizeBytes)), ct);
    private async Task Apply(ContractPublication p, CancellationToken ct)
    {
        var c = (await repo.GetContractAsync(p.ContractId, ct))!; var r = (await repo.GetRequestAsync(p.RequestId, ct))!;
        c.CompletionDeadline = p.CompletionDeadline.UtcDateTime; c.ContractStatus = "PENDING_SIGNATURE"; r.Status = "AWAITING_CONTRACT";
    }
    private static bool After(Contract c, TransportRequest r, ContractPublication p) =>
        c.ContractStatus == "PENDING_SIGNATURE" && r.Status == "AWAITING_CONTRACT" && c.CompletionDeadline == p.CompletionDeadline.UtcDateTime && c.SignedAt is null && c.TripId is null;
    public async Task ResumeAsync(string id, string actor, CancellationToken ct)
    {
        var row = await Locate(id, actor, true, ct);
        await work.ExecuteAsync(row.RequestId, async token => {
            var doc = await Publication(id, token) ?? throw Error("Publication not found.", "NOT_FOUND", 404);
            var p = doc.Value;
            if (p.Outcome != "PREPARED") return 0;
            var canonical = await Read<RequestSnapshot>("request", row.RequestId, token);
            await work.LockHorsesAsync(canonical.Value.Input.Horses.Select(h => h.HorseId), token);
            var c = (await repo.GetContractAsync(id, token))!; var r = (await repo.GetRequestAsync(row.RequestId, token))!;
            if (!After(c, r, p)) { await ValidateBefore(p, token); await Apply(p, token); }
            return 0;
        }, ct);
        await GetAsync(id, actor, true, ct);
    }
    public async Task DiscardAsync(string id, string actor, string reason, CancellationToken ct)
    {
        Require(!string.IsNullOrWhiteSpace(reason) && reason.Length <= 2000, "REASON_REQUIRED", "Enter a discard reason.");
        var row = await Locate(id, actor, true, ct);
        await work.ExecuteAsync(row.RequestId, async token => {
            var doc = await Publication(id, token) ?? throw Error("Publication not found.", "NOT_FOUND", 404);
            if (doc.Value.Outcome == "ABORTED" && doc.Value.Reason == reason.Trim()) return 0;
            var c = (await repo.GetContractAsync(id, token))!; var r = (await repo.GetRequestAsync(row.RequestId, token))!;
            Require(doc.Value.Outcome == "PREPARED" && c.ContractStatus == "DRAFT" && c.CompletionDeadline is null && c.SignedAt is null && c.TripId is null && r.Status == "ACCEPTED",
                "RECOVERY_CONFLICT", "Cannot discard a publication committed in SQL.");
            await Append(doc.Value with { Outcome = "ABORTED", Reason = reason.Trim() }, doc.Version, "ABORTED", actor, token); return 0;
        }, ct);
    }
    public async Task<PublishedContractView?> GetAsync(string id, string actor, bool manager, CancellationToken ct)
    {
        var row = await Locate(id, actor, manager, ct);
        return await work.ExecuteAsync(row.RequestId, async token => {
            var doc = await Publication(id, token); if (doc is null || doc.Value.Value.Outcome == "ABORTED") return null;
            var p = doc.Value.Value;
            var c = (await repo.GetContractAsync(id, token))!; var r = (await repo.GetRequestAsync(row.RequestId, token))!;
            Require(p.ContractId == id && p.RequestId == c.RequestId && p.CustomerId == c.CustomerId && r.CustomerId == c.CustomerId,
                "RECOVERY_CONFLICT", "Publication ownership does not match the SQL contract/request.");
            if (p.Outcome == "PREPARED" && After(c, r, p))
            { await VerifyPdf(p, token); p = p with { Outcome = "COMMITTED" }; await Append(p, doc.Value.Version, "COMPLETED", actor, token); }
            if (p.Outcome == "PREPARED" && !manager) throw Error("Contract is not issued yet.", "PUBLICATION_RECOVERY_REQUIRED", 409);
            if (p.Outcome == "COMMITTED") Require(c.CompletionDeadline == p.CompletionDeadline.UtcDateTime && c.ContractStatus != "DRAFT",
                "RECOVERY_CONFLICT", "Issued PDF and SQL state do not match.");
            var draft = await Read<DraftSnapshot>("contract", id, token);
            Require(draft.Version == p.ContractVersion && CustomerTransportService.Hash(draft.Value) == p.DraftHash &&
                c.TotalQuotedPrice == draft.Value.Total && c.CurrencyCode == "VND" && c.DepositRateStandard == 40, "RECOVERY_CONFLICT", "Issued terms or amount differ from the frozen Draft/SQL.");
            return new PublishedContractView(id, p.ContractVersion, c.ContractStatus, "VND", draft.Value.Total, draft.Value.Deposit, p.CompletionDeadline,
                p.Document.Sha256, p.Document.SizeBytes, p.TemplateVersion, clock.GetUtcNow() >= p.CompletionDeadline, p.Outcome == "PREPARED");
        }, ct);
    }
    public async Task<byte[]> PdfAsync(string id, string actor, bool manager, CancellationToken ct)
    {
        var view = await GetAsync(id, actor, manager, ct);
        Require(view is not null && !view.RecoveryRequired, "PDF_NOT_ISSUED", "PDF is not issued yet.");
        return await VerifyPdf((await Publication(id, ct))!.Value.Value, ct);
    }
}
