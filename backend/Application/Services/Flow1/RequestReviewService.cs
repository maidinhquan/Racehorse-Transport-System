using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Domain.Entities;
using Domain.Interfaces;
using Domain.Interfaces.DAOs;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Application.Services.Flow1;

public sealed class RequestReviewService(IRequestReviewRepository repo, IFlow1Repository contracts,
    IFlow1UnitOfWork work, IFlow1StateStore stateStore, Flow1RequestTransaction transactions, CustomerTransportService customer,
    TransportEstimateService estimates, TimeProvider clock)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly string[] Categories = ["TRANSPORT", "PROCEDURE", "VETERINARY_CARE", "INSURANCE"];
    private static T Payload<T>(Flow1StateRevision revision) => revision.Payload.Deserialize<T>(Json)
        ?? throw Error("Metadata unavailable.", "METADATA_UNAVAILABLE", 409);
    private async Task<(int Version, T Value)> Read<T>(string type, string id, CancellationToken ct)
    {
        var doc = await stateStore.ReadAsync(type, id, ct) ?? throw Error("Metadata required before review.", "METADATA_UNAVAILABLE", 409);
        return (doc.Revisions.Count, Payload<T>(doc.Revisions[^1]));
    }
    private Task<Flow1StateRevision> Append<T>(string type, string id, int version, string key, string actor, string action, T payload, CancellationToken ct) =>
        stateStore.AppendAsync(type, id, version, key, actor, action, JsonSerializer.SerializeToElement(payload, Json), ct);
    private static RequestProjection Projection(TransportRequest r) => new(r.Status, r.Departure, r.Destination, r.Purpose,
        r.TransportType, r.ExpectedDate, r.CommittedDeadline, r.DesignatedReceiverName, r.DesignatedReceiverPhone,
        r.RequestHorseMappings.Select(x => x.HorseId).Order(StringComparer.OrdinalIgnoreCase).ToArray());
    private static RequestProjection Projection(SubmitRequestInput x, string status) => new(status, x.Trip.Pickup.Address.Trim(),
        x.Trip.Delivery.Address.Trim(), x.Purpose.Trim(), x.Trip.PreferredTransportMode,
        x.Trip.DesiredDepartureDate.ToDateTime(TimeOnly.MinValue), x.DeliveryDeadline.ToDateTime(TimeOnly.MinValue),
        x.Receiver.Name.Trim(), x.Receiver.Phone.Trim(), x.Horses.Select(h => h.HorseId).Order(StringComparer.OrdinalIgnoreCase).ToArray());
    private static bool Same<T>(T a, T b) => CustomerTransportService.Hash(a) == CustomerTransportService.Hash(b);
    private static void Owner(TransportRequest r, string actor, bool manager)
    { if (!manager && r.CustomerId != actor) throw Error("Request not found.", "NOT_FOUND", 404); }
    private static void Require(bool ok, string code, string message)
    { if (!ok) throw Error(message, code, 409); }
    private static string Reason(ReviewCommand c)
    { Require(!string.IsNullOrWhiteSpace(c.Reason) && c.Reason.Length <= 2000, "REASON_REQUIRED", "Enter a reason or response (max 2000 characters)."); return c.Reason!.Trim(); }
    private static string[] Actions(TransportRequest r, ReviewState s, bool manager, string? contractStatus = null)
    {
        if (r.Status is not ("PENDING" or "CHANGES_REQUESTED" or "ACCEPTED")) return [];
        var actions = new List<string>();
        if (manager)
        {
            actions.AddRange(["REJECT", "ASK_INFO"]);
            if (s.Changes.Any(x => x.Status == "PENDING")) actions.AddRange(["APPROVE_CHANGE", "REJECT_CHANGE"]);
            else
            {
                if (r.Status == "PENDING") actions.AddRange(["ACCEPT", "REQUEST_REVISION"]);
                if (r.Status == "ACCEPTED")
                {
                    actions.Add("SAVE_PLAN");
                    if (s.PlanVersion > 0)
                    {
                        if (s.CurrentContractId is null) actions.Add("CREATE_DRAFT");
                        else if (contractStatus is "SIGN_DECLINED" or "EXPIRED") actions.Add("REISSUE_DRAFT");
                        else if (contractStatus == "DRAFT") actions.Add("REPLACE_DRAFT");
                    }
                }
            }
        }
        else
        {
            actions.Add("CANCEL");
            if (s.Questions.Any(x => x.Answer is null)) actions.Add("RESPOND_INFO");
            if (r.Status == "CHANGES_REQUESTED") actions.Add("RESUBMIT");
            if (r.Status is "PENDING" or "ACCEPTED" && !s.Changes.Any(x => x.Status == "PENDING")) actions.Add("PROPOSE_CHANGE");
        }
        return actions.ToArray();
    }
    private async Task Apply(TransportRequest r, RequestProjection after, ContractProjection[] markers, DraftSnapshot? draft, string? draftId, CancellationToken ct)
    {
        var before = Projection(r);
        r.Status = after.Status; r.Departure = after.Departure; r.Destination = after.Destination;
        r.Purpose = after.Purpose; r.TransportType = after.TransportType; r.ExpectedDate = after.ExpectedDate;
        r.CommittedDeadline = after.CommittedDeadline; r.DesignatedReceiverName = after.ReceiverName; r.DesignatedReceiverPhone = after.ReceiverPhone;
        if (!Same(before.HorseIds, after.HorseIds)) repo.ReplaceHorses(r, after.HorseIds);
        foreach (var marker in markers)
        {
            var c = await contracts.GetContractAsync(marker.Id, ct);
            if (c is null)
            {
                Require(draft is not null && marker.Id == draftId, "STATE_UNAVAILABLE", "Draft snapshot is missing.");
                c = Flow1ContractFactory.CreateDraft(marker.Id, r.RequestId, r.CustomerId, "F1-" + marker.Id, draft!.Total);
                contracts.AddContract(c);
            }
            c.ContractStatus = marker.Status!; c.TotalQuotedPrice = marker.Total;
        }
        if (draft is not null) await work.FlushAsync(ct); // owner Contract must exist; still inside the same transaction
    }
    private async Task<(TransportRequest R, int Version, ReviewState State, RequestSnapshot Canonical)> Load(string id, string actor, bool manager, CancellationToken ct)
    {
        var requestDocument = await stateStore.ReadAsync("request", id, ct);
        if (requestDocument is null) throw Error("Request state unavailable.", manager ? "METADATA_UNAVAILABLE" : "NOT_FOUND", manager ? 409 : 404);
        var canonical = (Version: requestDocument.Revisions.Count, Value: Payload<RequestSnapshot>(requestDocument.Revisions[^1]));
        var doc = await stateStore.ReadAsync("review", id, ct);
        var state = doc is null ? new ReviewState(canonical.Version, null, [], [], [], []) : Payload<ReviewState>(doc.Revisions[^1]);
        var r = await repo.GetAsync(id, ct) ?? throw Error("Request not found.", "NOT_FOUND", 404);
        Owner(r, actor, manager);
        var version = doc?.Revisions.Count ?? 0;
        Require(canonical.Version == state.RequestVersion, "RECOVERY_CONFLICT", "Request snapshot version does not match the review receipt.");
        return (r, version, state, canonical.Value);
    }
    public async Task ExecuteAsync(string id, string actor, bool manager, string action, string key, ReviewCommand input, CancellationToken ct)
    {
        CustomerTransportService.ValidateKey(key);
        Require(input.ExpectedVersion >= 0 && (input.Reason?.Length ?? 0) <= 2000, "VALIDATION_ERROR", "Invalid version or reason.");
        if (input.Request is not null) CustomerTransportService.ValidateSubmission(input.Request);
        var hash = CustomerTransportService.Hash(new { action, actor, input });
        await transactions.ExecuteAsync(id, async token =>
        {
            var (r, version, s, canonical) = await Load(id, actor, manager, token);
            var history = await stateStore.ReadAsync("review", id, token);
            var receipt = history?.Revisions.Select(Payload<ReviewState>).Select(x => x.LastOperation)
                .LastOrDefault(x => x?.Key == key);
            if (receipt is not null)
            {
                Require(receipt.Hash == hash && receipt.Actor == actor, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was used with different input.");
                Require(receipt.Outcome == "COMMITTED", "OPERATION_ABORTED", "The prepared operation was discarded; reload and use a new key.");
                return 0;
            }
            Require(version == input.ExpectedVersion, "STALE_VERSION", "Review changed; reload before saving.");
            if (action is "CREATE_DRAFT" or "REPLACE_DRAFT" or "REISSUE_DRAFT")
                Require(s.PlanVersion > 0, "PRELIMINARY_PLAN_REQUIRED", "Save a preliminary plan first.");
            var existing = await contracts.GetContractsForRequestAsync(id, token);
            var sourceContract = existing.SingleOrDefault(c => c.ContractId == s.CurrentContractId);
            Require(Actions(r, s, manager, sourceContract?.ContractStatus).Contains(action), "ACTION_NOT_ALLOWED", "Action is not allowed in the current state.");
            Require(existing.All(x => x.SignedAt is null && x.ContractStatus is "DRAFT" or "SUPERSEDED" or "SIGN_DECLINED" or "EXPIRED"),
                "CONTRACT_FROZEN", "A sent or signed contract prevents review changes.");
            var before = Projection(r); var after = before; var next = s;
            RequestSnapshot? nextCanonical = null; PreliminaryPlan? plan = null; DraftSnapshot? draft = null; string? draftId = null;
            var newContracts = new List<ContractProjection>();
            void InvalidateDraft()
            {
                foreach (var c in existing.Where(x => x.ContractStatus == "DRAFT"))
                { newContracts.Add(new(c.ContractId, true, "SUPERSEDED", c.TotalQuotedPrice)); }
                next = next with { CurrentContractId = null, PlanVersion = 0 };
            }
            switch (action)
            {
                case "ACCEPT":
                    await customer.ValidateHorsesAsync(r.CustomerId, canonical.Input, id, token);
                    Require(canonical.Input.Trip.DesiredDepartureDate >= Today(clock).AddDays(canonical.Estimate.MinimumPreparationDays), "INVALID_DEPARTURE_DATE", "Departure is now too early.");
                    after = before with { Status = "ACCEPTED" }; next = next with { Feedback = null, RevisionFields = [] }; break;
                case "REJECT": case "CANCEL": case "REQUEST_REVISION":
                    var reason = Reason(input);
                    if (action == "REQUEST_REVISION") Require(input.Fields is { Length: > 0 and <= 6 } && input.Fields.All(x =>
                        new[] { "ROUTE", "DATES", "CONTACTS", "HORSES", "DOCUMENTS", "PURPOSE" }.Contains(x)), "VALIDATION_ERROR", "Choose the fields requiring revision.");
                    InvalidateDraft(); after = before with { Status = action == "REJECT" ? "REJECTED" : action == "CANCEL" ? "CANCELLED" : "CHANGES_REQUESTED" };
                    next = next with { Feedback = reason, RevisionFields = input.Fields ?? [], Changes = s.Changes.Select(x => x.Status == "PENDING" ? x with { Status = "REJECTED", DecisionReason = reason } : x).ToArray() }; break;
                case "ASK_INFO":
                    Require(s.Questions.Length < 20, "LIMIT_REACHED", "Maximum 20 information questions per request.");
                    next = s with { Questions = [.. s.Questions, new ReviewQuestion("q-" + CustomerTransportService.Hash(key)[..24], Reason(input), actor, clock.GetUtcNow().UtcDateTime, RequestVersion: s.RequestVersion)] }; break;
                case "RESPOND_INFO":
                    Require(s.Questions.Any(x => x.Id == input.QuestionId && x.Answer is null), "QUESTION_NOT_OPEN", "Information question is not open.");
                    var answer = Reason(input); next = s with { Questions = s.Questions.Select(x => x.Id == input.QuestionId ? x with { Answer = answer, AnsweredAtUtc = clock.GetUtcNow().UtcDateTime } : x).ToArray() }; break;
                case "PROPOSE_CHANGE":
                    Require(input.Request is not null && s.Changes.Length < 10, "VALIDATION_ERROR", "A complete change proposal is required (maximum 10).");
                    next = s with { Changes = [.. s.Changes, new ReviewChange("ch-" + CustomerTransportService.Hash(key)[..24], Reason(input), input.Request!, "PENDING", s.RequestVersion)] }; break;
                case "REJECT_CHANGE":
                    Require(s.Changes.Any(x => x.Id == input.QuestionId && x.Status == "PENDING"), "CHANGE_NOT_PENDING", "Change is not pending.");
                    var rejectReason = Reason(input); next = s with { Changes = s.Changes.Select(x => x.Id == input.QuestionId ? x with { Status = "REJECTED", DecisionReason = rejectReason } : x).ToArray() }; break;
                case "RESUBMIT": case "APPROVE_CHANGE":
                    if (action == "APPROVE_CHANGE") Require(s.Changes.Any(x => x.Id == input.QuestionId && x.Status == "PENDING" && x.BaseRequestVersion == s.RequestVersion),
                        "STALE_VERSION", "Change proposal no longer matches the canonical request version.");
                    var proposal = action == "RESUBMIT" ? input.Request : s.Changes.SingleOrDefault(x => x.Id == input.QuestionId && x.Status == "PENDING")?.Proposal;
                    Require(proposal is not null, "CHANGE_NOT_PENDING", "Complete revision or pending proposal required.");
                    CustomerTransportService.ValidateSubmission(proposal!);
                    var horseSnapshots = await customer.ValidateHorsesAsync(r.CustomerId, proposal!, id, token);
                    var calculation = await estimates.CalculateAsync(proposal!.Trip, token);
                    Require(calculation.Route?.MayPersist != false, "MAP_STORAGE_NOT_PERMITTED", "Provider results cannot be stored.");
                    nextCanonical = canonical with { Input = proposal, Estimate = calculation.Customer, HorseSnapshots = horseSnapshots,
                        ReceiverVerificationStatus = proposal.Receiver.IsProxy ? "REQUIRED_NOT_VERIFIED" : "NOT_REQUIRED" };
                    InvalidateDraft(); after = Projection(proposal, "PENDING");
                    next = next with { RequestVersion = s.RequestVersion + 1, Feedback = null, RevisionFields = [], Changes = s.Changes.Select(x =>
                        x.Id == input.QuestionId ? x with { Status = "APPROVED", DecisionReason = input.Reason?.Trim() } : x).ToArray() }; break;
                case "SAVE_PLAN":
                    await customer.ValidateHorsesAsync(r.CustomerId, canonical.Input, id, token);
                    if (s.PlanVersion > 0)
                    {
                        var prior = await Read<PreliminaryPlan>("plan", id, token);
                        Require(input.Plan is not null && input.Plan.PreparationDays >= prior.Value.Input.PreparationDays,
                            "INVALID_PREPARATION", "Preparation days may only increase within a request version.");
                    }
                    plan = await PlanAsync(canonical, s.RequestVersion, input.Plan, token);
                    InvalidateDraft();
                    // Plan revisions keep increasing even after plan invalidation.
                    var oldPlan = await stateStore.ReadAsync("plan", id, token);
                    next = next with { PlanVersion = (oldPlan?.Revisions.Count ?? 0) + 1 }; break;
                case "CREATE_DRAFT": case "REPLACE_DRAFT": case "REISSUE_DRAFT":
                    if (input.QuestionId is not null) Require(input.QuestionId == s.CurrentContractId, "STALE_VERSION", "Only the current Draft can be replaced.");
                    if (action == "REISSUE_DRAFT")
                    {
                        Reason(input);
                        Require((sourceContract?.ContractStatus is "SIGN_DECLINED" or "EXPIRED") && sourceContract.SignedAt is null &&
                            sourceContract.TripId is null && await contracts.GetDepositInvoiceAsync(sourceContract.ContractId, token) is null,
                            "CONTRACT_NOT_REISSUABLE", "Only a closed unsigned contract can be reissued.");
                        var lifecycle = await stateStore.ReadAsync("lifecycle", sourceContract!.ContractId, token);
                        var issued = await Read<ContractPublication>("publication", sourceContract.ContractId, token);
                        Require(issued.Value.Outcome == "COMMITTED" && issued.Value.ContractId == sourceContract.ContractId &&
                            issued.Value.RequestId == id && issued.Value.CustomerId == r.CustomerId &&
                            sourceContract.CompletionDeadline == issued.Value.CompletionDeadline.UtcDateTime,
                            "STATE_CONFLICT", "Closed publication does not match its SQL owner.");
                        Require(lifecycle is not null && lifecycle.Revisions.Select(Payload<ContractLifecycleEvent>).Any(e =>
                            e.Action == (sourceContract.ContractStatus == "EXPIRED" ? "EXPIRED" : "DECLINED") &&
                            e.ContractId == sourceContract.ContractId && e.RequestId == id && e.ContractVersion == issued.Value.ContractVersion &&
                            e.DocumentHash == issued.Value.Document.Sha256), "STATE_UNAVAILABLE", "Closing receipt is required before reissue.");
                    }
                    plan = null;
                    var savedPlan = await Read<PreliminaryPlan>("plan", id, token);
                    Require(savedPlan.Version == s.PlanVersion && savedPlan.Value.RequestVersion == s.RequestVersion, "PRELIMINARY_PLAN_REQUIRED", "Save a current preliminary plan first.");
                    Require(canonical.Input.Trip.DesiredDepartureDate >= Today(clock).AddDays(savedPlan.Value.Input.PreparationDays), "INVALID_PREPARATION", "Schedule must be replanned before drafting.");
                    await customer.ValidateHorsesAsync(r.CustomerId, canonical.Input, id, token);
                    var lines = input.Lines;
                    Require(lines is { Length: > 0 and <= 20 }, "VALIDATION_ERROR", "Enter 1–20 selling lines.");
                    decimal total = 0;
                    foreach (var line in lines!)
                    {
                        ValidateLine(line.Category, line.Description, line.Quantity, line.UnitPrice);
                        total += Round(line.Quantity * line.UnitPrice);
                    }
                    Money(total);
                    if (total < savedPlan.Value.Floor) Reason(input);
                    InvalidateDraft(); next = next with { PlanVersion = s.PlanVersion };
                    draftId = "c-" + CustomerTransportService.Hash(new { id, actor, key })[..32].ToLowerInvariant();
                    draft = new(s.RequestVersion, s.PlanVersion, lines!, total, Flow1ContractFactory.DepositAmount(total),
                        total < savedPlan.Value.Floor ? input.Reason!.Trim() : null, savedPlan.Value);
                    newContracts.Add(new(draftId, true, "DRAFT", total));
                    next = next with { CurrentContractId = draftId }; break;
            }
            next = next with { Notices = s.Notices.Append(new ReviewNotice(key, PublicMessage(action), clock.GetUtcNow().UtcDateTime)).TakeLast(50).ToArray() };
            await Apply(r, after, newContracts.ToArray(), draft, draftId, token);
            if (nextCanonical is not null) await Append("request", id, s.RequestVersion, "wf-" + key, actor, action, nextCanonical, token);
            if (plan is not null) await Append("plan", id, next.PlanVersion - 1, "wf-" + key, actor, action, plan, token);
            if (draft is not null) await Append("contract", draftId!, 0, "wf-" + key, actor, action, draft, token);
            if (action == "REISSUE_DRAFT")
            {
                var lifecycle = (await stateStore.ReadAsync("lifecycle", sourceContract!.ContractId, token))!;
                var p = await Read<ContractPublication>("publication", sourceContract.ContractId, token);
                await Append("lifecycle", sourceContract.ContractId, lifecycle.Revisions.Count, "lifecycle-" + key, actor, "REISSUED",
                    new ContractLifecycleEvent(key, hash, actor, "REISSUED", input.Reason!.Trim(), sourceContract.ContractId, id,
                        p.Value.ContractVersion, p.Value.Document.Sha256, clock.GetUtcNow().UtcDateTime, draftId), token);
            }
            next = next with { LastOperation = new ReviewReceipt(key, hash, actor, action, "COMMITTED") };
            await Append("review", id, version, "done-" + key, actor, "COMPLETED", next, token);
            return 0;
        }, ct, input.Request?.Horses.Select(h => h.HorseId));
    }
    private async Task<PreliminaryPlan> PlanAsync(RequestSnapshot canonical, int version, PlanInput? input, CancellationToken ct)
    {
        Require(input is not null, "VALIDATION_ERROR", "Preliminary plan is required."); var p = input!;
        var calc = await estimates.CalculateAsync(canonical.Input.Trip, ct);
        Require(calc.Route?.MayPersist != false, "MAP_STORAGE_NOT_PERMITTED", "Provider results cannot be stored.");
        Require(p.DepartureDate == canonical.Input.Trip.DesiredDepartureDate && p.DeliveryDate == canonical.Input.DeliveryDeadline &&
            p.PreparationDays >= calc.Customer.MinimumPreparationDays && p.PreparationDays <= 90 &&
            p.DepartureDate >= Today(clock).AddDays(p.PreparationDays), "INVALID_PREPARATION", "Keep customer dates and increase preparation only above the route floor.");
        Require(p.VehicleCount >= calc.Customer.VehicleCount && p.VehicleCount <= 100 && p.StallsRequired >= canonical.Input.Trip.HorseCount && p.StallsRequired <= 100 &&
            !string.IsNullOrWhiteSpace(p.Resources) && p.Resources.Length <= 100, "INVALID_RESOURCES", "Enter sufficient preliminary vehicles, stalls and resources.");
        var air = canonical.Input.Trip.PreferredTransportMode == "AIR";
        Require(!air || p.VehicleCount == 0 && p.GroundLegScope == "EXCLUDED" && Regex.IsMatch(p.DepartureGateway ?? "", "^[A-Z]{3}$") &&
            Regex.IsMatch(p.ArrivalGateway ?? "", "^[A-Z]{3}$"), "INVALID_GATEWAYS", "AIR requires gateway codes and an explicitly airport-to-airport scope; ground legs are excluded.");
        var cost = calc.EstimatedCost + (air ? (p.StallsRequired - calc.Customer.StallsRequired) * 70_000_000m :
            Round(calc.Route!.DistanceMeters / 1000m * 35_000m * (p.VehicleCount - calc.Customer.VehicleCount)));
        Require((p.AdditionalCosts?.Length ?? 0) <= 20, "VALIDATION_ERROR", "Maximum 20 additional budget lines.");
        foreach (var line in p.AdditionalCosts ?? []) { ValidateLine(line.Category, line.Description, line.Quantity, line.UnitCost); cost += Round(line.Quantity * line.UnitCost); }
        Money(Round(cost * 1.20m));
        var departureAt = p.PlannedDepartureAt ?? new DateTimeOffset(p.DepartureDate.ToDateTime(TimeOnly.MinValue), TimeSpan.FromHours(7));
        Require(DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeBySystemTimeZoneId(departureAt, "Asia/Ho_Chi_Minh").DateTime) == p.DepartureDate,
            "INVALID_PREPARATION", "Planned departure timestamp must fall on the customer's Vietnam departure date.");
        return new(p with { PlannedDepartureAt = departureAt.ToUniversalTime() }, version, calc.Customer.PricingPolicyVersion, cost, Round(cost * 1.05m), Round(cost * 1.20m),
            calc.Customer.RoadDistanceKm, calc.Customer.MinimumPreparationDays, calc.Customer.Attribution ?? calc.Customer.LocationAttribution, clock.GetUtcNow().UtcDateTime);
    }
    private static void Money(decimal x) => Require(x is > 0 and <= 9_999_999_999m && x == decimal.Truncate(x), "AMOUNT_OUT_OF_RANGE", "VND amount must be positive and fit the existing schema.");
    private static void ValidateLine(string category, string description, decimal quantity, decimal amount) => Require(
        Categories.Contains(category) && !string.IsNullOrWhiteSpace(description) && description.Length <= 200 && quantity is > 0 and <= 1000 &&
        amount is > 0 and <= 9_999_999_999m && amount == decimal.Truncate(amount), "INVALID_PRICE_LINE", "Invalid VND budget/selling line.");
    private static string PublicMessage(string action) => action switch {
        "ACCEPT" => "Yêu cầu đã được chấp nhận để lập kế hoạch.", "REQUEST_REVISION" => "Vui lòng chỉnh sửa yêu cầu theo phản hồi.",
        "REJECT" => "Yêu cầu đã bị từ chối; xem lý do.", "ASK_INFO" => "Có câu hỏi bổ sung cần trả lời.",
        "RESPOND_INFO" => "Đã nhận câu trả lời bổ sung.", "CREATE_DRAFT" or "REPLACE_DRAFT" or "REISSUE_DRAFT" => "Đang soạn hợp đồng; chưa phát hành để ký.",
        _ => "Đã cập nhật hồ sơ yêu cầu." };
    private async Task<ContractSummary?> Summary(string id, ReviewState state, CancellationToken ct)
    {
        if (state.CurrentContractId is null) return null;
        var row = await contracts.GetContractAsync(state.CurrentContractId, ct);
        Require(row is not null && row.RequestId == id, "RECOVERY_CONFLICT", "Current contract relation is invalid.");
        var file = await Read<DraftSnapshot>("contract", state.CurrentContractId, ct);
        Require(row!.TotalQuotedPrice == file.Value.Total && row.CurrencyCode == "VND" && row.DepositRateStandard == 40, "RECOVERY_CONFLICT", "Contract amount state does not match SQL.");
        Require(file.Value.RequestVersion == state.RequestVersion && file.Value.PlanVersion == state.PlanVersion,
            "RECOVERY_CONFLICT", "Current Draft does not reference the current request and plan.");
        return new(row.ContractId, row.ContractStatus, file.Version, row.CurrencyCode, file.Value.Total, file.Value.Deposit, file.Value.Lines);
    }
    public Task<ManagerReviewView> ManagerAsync(string id, string actor, CancellationToken ct) => transactions.ExecuteAsync(id, async token =>
    {
        var x = await Load(id, actor, true, token);
        PreliminaryPlan? plan = null;
        if (x.State.PlanVersion > 0)
        {
            var saved = await Read<PreliminaryPlan>("plan", id, token);
            Require(saved.Version == x.State.PlanVersion && saved.Value.RequestVersion == x.State.RequestVersion,
                "RECOVERY_CONFLICT", "Plan does not match the current canonical request.");
            plan = saved.Value;
        }
        var note = x.State.CurrentContractId is null ? null : (await Read<DraftSnapshot>("contract", x.State.CurrentContractId, token)).Value.BelowFloorReason;
        var summary = await Summary(id, x.State, token);
        return new ManagerReviewView(new(x.R.RequestId, x.R.Status, x.R.Departure, x.R.Destination, x.R.ExpectedDate, x.R.CommittedDeadline,
            x.State.RequestVersion, x.Canonical, []), x.Version, x.State, plan, summary, Actions(x.R, x.State, true, summary?.Status), note, await History(id, x.State.CurrentContractId, token));
    }, ct);
    public Task<CustomerReviewView> CustomerAsync(string id, string actor, CancellationToken ct) => transactions.ExecuteAsync(id, async token =>
    {
        var x = await Load(id, actor, false, token);
        return await CustomerView(x.R, x.Version, x.State, token);
    }, ct);
    private async Task<CustomerReviewView> CustomerView(TransportRequest r, int version, ReviewState state, CancellationToken ct)
    {
        var summary = await Summary(r.RequestId, state, ct);
        return new(version, state.RequestVersion, state.Feedback, state.RevisionFields, state.Questions,
            state.Changes, state.Notices, summary, false, Actions(r, state, false, summary?.Status), await History(r.RequestId, state.CurrentContractId, ct));
    }
    private async Task<ContractVersionView[]> History(string id, string? current, CancellationToken ct)
    {
        var result = new List<ContractVersionView>();
        foreach (var c in (await contracts.GetContractsForRequestAsync(id, ct)).Where(c => c.ContractId != current).OrderBy(c => c.ContractId))
        {
            var draft = await Read<DraftSnapshot>("contract", c.ContractId, ct);
            var publication = await stateStore.ReadAsync("publication", c.ContractId, ct);
            result.Add(new(c.ContractId, c.ContractStatus, draft.Version, draft.Value.Total, draft.Value.Deposit,
                publication is not null && Payload<ContractPublication>(publication.Revisions[^1]).Outcome == "COMMITTED"));
        }
        return result.ToArray();
    }
    public Task<RequestView> CustomerDetailAsync(string id, string actor, CancellationToken ct) => transactions.ExecuteAsync(id, async token =>
    {
        // Read canonical request, SQL status and public Draft under one request lock.
        // A concurrent revision must not mix an old review/contract with a new request snapshot.
        var x = await Load(id, actor, false, token);
        var review = await CustomerView(x.R, x.Version, x.State, token);
        return new RequestView(x.R.RequestId, x.R.Status, x.R.Departure, x.R.Destination, x.R.ExpectedDate,
            x.R.CommittedDeadline, x.State.RequestVersion, x.Canonical, review.AllowedActions, review);
    }, ct);
    public async Task<PageView<RequestView>> ListAsync(string? status, int page, int size, CancellationToken ct)
    {
        Require(page is >= 1 and <= 100_000 && size is >= 1 and <= 100 && (status is null ||
            new[] { "PENDING", "ACCEPTED", "CHANGES_REQUESTED", "REJECTED", "CANCELLED", "AWAITING_CONTRACT", "AWAITING_DEPOSIT", "ACTIVATED" }.Contains(status)), "VALIDATION_ERROR", "Invalid status or pagination.");
        var (items, count) = await repo.ListAsync(status, page, size, ct);
        return new(items.Select(r => new RequestView(r.RequestId, r.Status, r.Departure, r.Destination, r.ExpectedDate, r.CommittedDeadline, 0, null, [])).ToArray(), page, size, count);
    }
    public async Task<(byte[] Bytes, string ContentType)> DocumentAsync(string id, string actor, string horse, int version, string kind, CancellationToken ct)
    {
        var view = await ManagerAsync(id, actor, ct);
        var references = view.Request.Snapshot!.Input.Horses.Concat(view.Review.Changes
            .Where(x => x.Status == "PENDING").SelectMany(x => x.Proposal.Horses));
        if (!references.Any(x => x.HorseId == horse && x.DocumentVersion == version)) throw Error("Document not found.", "NOT_FOUND", 404);
        var r = await repo.GetAsync(id, ct);
        return await customer.DocumentFileAsync(r!.CustomerId, horse, version, kind, ct);
    }
    public async Task<object> RevisionsAsync(string id, string actor, CancellationToken ct)
    {
        await ManagerAsync(id, actor, ct);
        var doc = await stateStore.ReadAsync("request", id, ct);
        return doc!.Revisions.Select(r => new { r.Version, r.ActorUserId, r.Action, r.CreatedAtUtc, Snapshot = Payload<RequestSnapshot>(r) }).ToArray();
    }
    public async Task<object> ManagerContractAsync(string id, string actor, CancellationToken ct)
    {
        var row = await repo.ContractAsync(id, ct) ?? throw Error("Contract not found.", "NOT_FOUND", 404);
        var view = await ManagerAsync(row.RequestId, actor, ct);
        var snapshot = await Read<DraftSnapshot>("contract", id, ct);
        return new { row.ContractId, row.RequestId, row.ContractStatus, row.CurrencyCode, snapshot.Version,
            ReviewVersion = view.Version, Snapshot = snapshot.Value,
            Editable = row.ContractStatus == "DRAFT" && view.Contract?.ContractId == id && view.AllowedActions.Contains("REPLACE_DRAFT") };
    }
    public async Task<object> EditContractAsync(string id, string actor, string key, ReviewCommand input, CancellationToken ct)
    {
        var row = await repo.ContractAsync(id, ct) ?? throw Error("Contract not found.", "NOT_FOUND", 404);
        await ExecuteAsync(row.RequestId, actor, true, "REPLACE_DRAFT", key, input with { QuestionId = id }, ct);
        return await ManagerAsync(row.RequestId, actor, ct);
    }
    public async Task<ManagerReviewView> ReissueContractAsync(string id, string actor, string key, ReviewCommand input, CancellationToken ct)
    {
        var row = await repo.ContractAsync(id, ct) ?? throw Error("Contract not found.", "NOT_FOUND", 404);
        await ExecuteAsync(row.RequestId, actor, true, "REISSUE_DRAFT", key, input with { QuestionId = id }, ct);
        return await ManagerAsync(row.RequestId, actor, ct);
    }
    public async Task<ContractSummary> CustomerContractAsync(string id, string actor, CancellationToken ct)
    {
        var row = await repo.ContractAsync(id, ct);
        if (row is null || row.CustomerId != actor) throw Error("Contract not found.", "NOT_FOUND", 404);
        await CustomerAsync(row.RequestId, actor, ct);
        row = (await repo.ContractAsync(id, ct))!;
        var file = await Read<DraftSnapshot>("contract", id, ct);
        Require(row.TotalQuotedPrice == file.Value.Total && row.CurrencyCode == "VND" && row.DepositRateStandard == 40,
            "RECOVERY_CONFLICT", "Contract amount state does not match SQL.");
        return new(row.ContractId, row.ContractStatus, file.Version, row.CurrencyCode, file.Value.Total, file.Value.Deposit, file.Value.Lines);
    }
}
