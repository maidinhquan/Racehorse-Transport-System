using System.Text.Json;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Domain.Interfaces.DAOs;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1;

public sealed class ContractLifecycleService(IRequestReviewRepository lookup, IFlow1Repository repo, IFlow1StateStore state,
    Flow1RequestTransaction transactions, ContractPublicationService publications, ContractDeadlinePolicy deadlines, TimeProvider clock)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static void Require(bool ok, string code, string message) { if (!ok) throw Error(message, code, 409); }
    private static T Payload<T>(Flow1StateRevision r) => r.Payload.Deserialize<T>(Json) ?? throw Error("Contract evidence is unavailable.", "STATE_UNAVAILABLE", 409);
    private async Task<(Domain.Entities.Contract Contract, Domain.Entities.TransportRequest Request, ContractPublication Publication,
        Flow1StateDocument ReviewDocument, ReviewState Review, ContractDeadlinePolicy.Resolved Deadline)> Load(string id, string requestId, CancellationToken ct)
    {
        var c = await repo.GetContractAsync(id, ct) ?? throw Error("Contract not found.", "NOT_FOUND", 404);
        var r = await repo.GetRequestAsync(requestId, ct) ?? throw Error("Request not found.", "NOT_FOUND", 404);
        var publication = await state.ReadAsync("publication", id, ct);
        var review = await state.ReadAsync("review", requestId, ct);
        Require(publication is not null && review is not null && c.RequestId == requestId && c.CustomerId == r.CustomerId,
            "STATE_UNAVAILABLE", "Issued contract evidence is unavailable.");
        var p = Payload<ContractPublication>(publication!.Revisions[^1]);
        Require(p.Outcome == "COMMITTED" && p.ContractId == id && p.RequestId == requestId && p.CustomerId == c.CustomerId &&
            c.CompletionDeadline == p.CompletionDeadline.UtcDateTime, "STATE_CONFLICT", "Issued document differs from the SQL contract.");
        var draft = await state.ReadAsync("contract", id, ct) ?? throw Error("Contract evidence unavailable.", "STATE_UNAVAILABLE", 409);
        var deadline = await deadlines.ReadAsync(p, Payload<DraftSnapshot>(draft.Revisions[^1]), ct);
        return (c, r, p, review!, Payload<ReviewState>(review!.Revisions[^1]), deadline);
    }
    private async Task<Domain.Entities.Contract> Locate(string id, string actor, bool manager, CancellationToken ct)
    {
        var c = await lookup.ContractAsync(id, ct);
        if (c is null || !manager && c.CustomerId != actor) throw Error("Contract not found.", "NOT_FOUND", 404);
        return c;
    }
    public async Task<ContractLifecycleView> CloseAsync(string id, string actor, bool manager, string key,
        ContractLifecycleCommand input, CancellationToken ct)
    {
        CustomerTransportService.ValidateKey(key);
        Require(!string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Length <= 2000 && input.ExpectedLifecycleVersion >= 0,
            "REASON_REQUIRED", "Enter a reason (max 2000 characters) and reload the current version.");
        var row = await Locate(id, actor, manager, ct);
        await publications.GetAsync(id, actor, manager, ct);
        var action = manager ? "EXPIRED" : "DECLINED";
        var hash = CustomerTransportService.Hash(new { actor, action, input });
        await transactions.ExecuteAsync(row.RequestId, async token => {
            var doc = await state.ReadAsync("lifecycle", id, token);
            var previous = doc?.Revisions.Select(Payload<ContractLifecycleEvent>).SingleOrDefault(x => x.Key == key);
            if (previous is not null)
            { Require(previous.InputHash == hash && previous.Actor == actor && previous.Action == action, "IDEMPOTENCY_KEY_REUSED", "Key was used for different lifecycle input."); return 0; }
            var x = await Load(id, row.RequestId, token);
            Require((doc?.Revisions.Count ?? 0) == input.ExpectedLifecycleVersion, "STALE_VERSION", "Contract lifecycle changed; reload.");
            Require(input.ContractVersion == x.Publication.ContractVersion && input.DocumentHash == x.Publication.Document.Sha256,
                "STALE_DOCUMENT", "Action must refer to the exact issued PDF version and hash.");
            Require(x.Contract.ContractStatus == "PENDING_SIGNATURE" && x.Contract.SignedAt is null && x.Contract.TripId is null &&
                x.Request.Status == "AWAITING_CONTRACT" && x.Review.CurrentContractId == id && x.ReviewDocument.Revisions.Count == x.Publication.ReviewVersion &&
                !x.Review.Changes.Any(c => c.Status == "PENDING") && await repo.GetDepositInvoiceAsync(id, token) is null &&
                await repo.GetTripForRequestAsync(row.RequestId, token) is null, "CONTRACT_NOT_CLOSABLE", "Only the current unsigned issued contract can be closed.");
            Require(manager ? clock.GetUtcNow() >= x.Deadline.Effective : clock.GetUtcNow() < x.Deadline.Effective,
                manager ? "DEADLINE_NOT_REACHED" : "SIGNING_CLOSED", manager ? "The completion deadline has not passed." : "Deadline passed; contact Manager.");
            var terminal = manager ? "EXPIRED" : "SIGN_DECLINED";
            var reason = input.Reason.Trim(); var now = clock.GetUtcNow().UtcDateTime;
            x.Contract.ContractStatus = terminal; x.Request.Status = "ACCEPTED"; // request keeps its booking; no cancellation/Trip/invoice
            var otp = await state.ReadAsync("contract-otp", id, token);
            if (otp is not null) await state.AppendAsync("contract-otp", id, otp.Revisions.Count, "revoke-" + key, actor, "REVOKED",
                JsonSerializer.SerializeToElement(Payload<ContractOtpState>(otp.Revisions[^1]) with { Revoked = true }, Json), token);
            var message = manager ? "Phiên bản hợp đồng đã được đánh dấu hết hạn; đang chờ xử lý tiếp." : "Khách đã từ chối phiên bản hợp đồng; đang chờ quản lý xử lý.";
            var review = x.Review with { Feedback = message,
                LastOperation = new(key, hash, actor, manager ? "EXPIRE_CONTRACT" : "DECLINE_CONTRACT", "COMMITTED"),
                Notices = x.Review.Notices.Append(new ReviewNotice("close-" + key, message, now)).TakeLast(50).ToArray() };
            await state.AppendAsync("review", row.RequestId, x.ReviewDocument.Revisions.Count, "close-" + key, actor, action,
                JsonSerializer.SerializeToElement(review, Json), token);
            await state.AppendAsync("lifecycle", id, doc?.Revisions.Count ?? 0, "lifecycle-" + key, actor, action,
                JsonSerializer.SerializeToElement(new ContractLifecycleEvent(key, hash, actor, action, reason, id, row.RequestId,
                    input.ContractVersion, input.DocumentHash, now), Json), token);
            return 0;
        }, ct);
        return await GetAsync(id, actor, manager, ct);
    }
    public async Task<ContractLifecycleView> GetAsync(string id, string actor, bool manager, CancellationToken ct)
    {
        var row = await Locate(id, actor, manager, ct);
        await publications.GetAsync(id, actor, manager, ct);
        return await transactions.ExecuteAsync(row.RequestId, async token => {
            var x = await Load(id, row.RequestId, token);
            var doc = await state.ReadAsync("lifecycle", id, token);
            var current = x.Review.CurrentContractId == id;
            var open = current && x.Contract.ContractStatus == "PENDING_SIGNATURE" && x.Contract.SignedAt is null && x.Request.Status == "AWAITING_CONTRACT";
            var events = doc?.Revisions.Select(Payload<ContractLifecycleEvent>).ToArray() ?? [];
            Require(events.All(e => e.ContractId == id && e.RequestId == row.RequestId && e.ContractVersion == x.Publication.ContractVersion &&
                e.DocumentHash == x.Publication.Document.Sha256), "STATE_CONFLICT", "Lifecycle evidence differs from the publication.");
            return new ContractLifecycleView(id, x.Contract.ContractStatus, doc?.Revisions.Count ?? 0,
                !manager && open && clock.GetUtcNow() < x.Deadline.Effective,
                manager && open && clock.GetUtcNow() >= x.Deadline.Effective,
                manager && current && x.Request.Status == "ACCEPTED" && (x.Contract.ContractStatus is "SIGN_DECLINED" or "EXPIRED") && x.Review.PlanVersion > 0 && !x.Review.Changes.Any(c => c.Status == "PENDING"),
                events.Select(e => new ContractLifecycleHistoryItem(e.Action, manager || e.Action == "DECLINED" ? e.Reason : null,
                    DateTime.SpecifyKind(e.AtUtc, DateTimeKind.Utc), e.ReplacementContractId, manager ? e.Actor : null)).ToArray());
        }, ct);
    }
}
