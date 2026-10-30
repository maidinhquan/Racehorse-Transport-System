using System.Text.Json;
using System.Text.Json.Nodes;
using Application.Common.Flow1;
using Application.Flow1.Dtos;
using Application.Flow1.Mapping;
using Application.Flow1.Interfaces;
using Domain.Flow1.Entities;
using static Application.Flow1.Rules.BusinessRules;
namespace Application.Flow1.Services;

public sealed class ContractService(IDataSession data, AccessService access, CatalogService catalogs,
    SnapshotBuilder snapshots, IContractRenderer renderer, IPrivateFiles files,
    NotificationService notifications, Flow1ContractOptions issuer, TimeProvider clock, RequestDetailsService details)
{
    public async Task<object> EditorAsync(string actor, string request, CancellationToken ct, string? mode = null)
    {
        var row = await access.RequestAsync(request, actor, true, ct);
        var contract = (await data.ListAsync<Contract>(c => c.RequestID == request, ct)).SingleOrDefault();
        var current = contract?.CurrentVersionNo is int version ? await data.FindAsync<ContractVersion>(ct, contract.ContractID, version) : null;
        var account = await data.FindAsync<Account>(ct, row.CustomerID) ?? throw Failure("NOT_FOUND", "Customer not found.", 404);
        var links = await data.ListAsync<RequestHorse>(x => x.RequestID == request, ct);
        var horseIds = links.Select(x => x.HorseID).ToArray();
        var versions = contract is null ? [] : await data.ListAsync<ContractVersion>(x => x.ContractID == contract.ContractID, ct);
        var published = versions.Where(x => x.PublishedAtUtc is not null).OrderByDescending(x => x.VersionNo).FirstOrDefault();
        var clauses = (await data.ListAsync<ContractClause>(c => c.IsActive, ct)).Select(c => new { id = c.TemplateID, title = c.TemplateName, text = c.BodyContent, language = c.LanguageCode }).ToArray();
        var savedMode = current is null ? null : JsonNode.Parse(current.ContentSnapshot)?["route"]?["mode"]?.GetValue<string>();
        var defaults = JsonSerializer.SerializeToNode(await catalogs.FormAsync(row.OriginCountry!, row.DestinationCountry!, mode ?? savedMode ?? row.TransportType!, ct))!.AsObject();
        defaults["supportedRoutes"] = JsonSerializer.SerializeToNode((await catalogs.RoutesAsync(ct))
            .Where(r => r.OriginCountry == row.OriginCountry && r.DestinationCountry == row.DestinationCountry)
            .Select(r => new { id = r.RouteID, originCountry = r.OriginCountry, destinationCountry = r.DestinationCountry, mode = r.TransportMode }));
        defaults["terms"] = JsonSerializer.SerializeToNode(clauses);
        return new { requestId = request, status = row.Status, contractId = contract?.ContractID,
            request = await details.GetAsync(actor, request, true, ct),
            customer = new { id = account.UserID, name = account.FullName, email = account.Email, phone = account.Phone },
            horses = (await data.ListAsync<Horse>(h => horseIds.Contains(h.HorseID), ct)).Select(HorseMapper.View).ToArray(),
            versionNo = current?.VersionNo, draft = current?.VersionStatus == "DRAFT" ? View(contract!, current, row) : null,
            currentContract = published is null ? null : View(contract!, published, row),
            versions = versions.OrderBy(x => x.VersionNo).Select(x => View(contract!, x, row)).ToArray(),
            clauses, internalCosts = contract is null ? [] : await data.ListAsync<CostItem>(c => c.ContractID == contract.ContractID && c.Bearer == "COMPANY", ct),
            defaults };

    }
    public Task<object> SaveAsync(string actor, string request, ContractDraftInput input, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        var row = await access.RequestAsync(request, actor, true, token);
        Require(row.Status is "CONTRACT_PREPARATION" or "CONTRACT_CHANGES_REQUESTED", "INVALID_STATE", "Request is not open for drafting.");
        await catalogs.ValidateAsync(row.OriginCountry!, row.DestinationCountry!, input.Mode, token);
        Require(SnapshotBuilder.Timestamp(input.DepartAt).Date == row.ExpectedDate?.Date, "VALIDATION_ERROR", "The plan must keep the customer departure date.", 400);
        Require(row.CommittedDeadline is null || SnapshotBuilder.Timestamp(input.ArriveAt).Date == row.CommittedDeadline.Value.Date,
            "VALIDATION_ERROR", "The plan must keep the customer delivery date.", 400);
        await RequireHorsesFreeAsync(request, token);
        Require(input.Items.Count > 0 && input.Items.All(i => i.Amount >= 0 && i.Amount == decimal.Truncate(i.Amount) && (!i.Required || i.Amount > 0) && !string.IsNullOrWhiteSpace(i.Desc))
            && input.Items.Sum(i => i.Amount) is > 0 and <= 9999999999m, "VALIDATION_ERROR", "Complete commercial price lines in whole VND.", 400);
        Require(input.Terms.Count > 0 && input.Terms.All(t => !string.IsNullOrWhiteSpace(t.Title) && !string.IsNullOrWhiteSpace(t.Text)), "VALIDATION_ERROR", "Complete contract terms.", 400);
        Require(input.DepositPct is > 0 and <= 100, "VALIDATION_ERROR", "Invalid deposit percentage.", 400);
        var costs = new Dictionary<string, decimal> { ["TRANSPORT"] = input.Budget.TRANSPORT, ["CREW"] = input.Budget.STAFF,
            ["PERMIT"] = input.Budget.PROCEDURE, ["VET"] = input.Budget.VET, ["INSURANCE"] = input.Budget.INSURANCE };
        Require(costs.Values.All(x => x >= 0 && x == decimal.Truncate(x)), "VALIDATION_ERROR", "Invalid internal budget.", 400);
        Require(input.Items.Sum(x => x.Amount) >= costs.Values.Sum() || !string.IsNullOrWhiteSpace(input.Exception), "VALIDATION_ERROR", "Explain a sale below internal cost.", 400);
        Require(SnapshotBuilder.Timestamp(input.ArriveAt) > SnapshotBuilder.Timestamp(input.DepartAt), "VALIDATION_ERROR", "Delivery must follow departure.", 400);
        var contract = (await data.ListAsync<Contract>(c => c.RequestID == request, token)).SingleOrDefault();
        if (contract is null)
        {
            contract = new Contract { RequestID = request, CustomerID = row.CustomerID, CurrencyCode = "VND", ContractStatus = "DRAFT" };
            data.Add(contract); await data.SaveAsync(token);
        }
        Require(contract.SignedAt is null && contract.ContractStatus != "CANCELLED", "INVALID_STATE", "Signed or cancelled contract cannot be edited.");
        var prior = contract.CurrentVersionNo is int priorNo ? await data.FindAsync<ContractVersion>(token, contract.ContractID, priorNo) : null;
        var draft = prior;
        if (prior is null || prior.VersionStatus != "DRAFT")
        {
            // Never move deposited money onto another version implicitly.
            var priorInvoices = await data.ListAsync<Invoice>(i => i.ContractID == contract.ContractID && i.PaidAmount > 0, token);
            Require(priorInvoices.Count == 0, "PAYMENT_RECONCILIATION_REQUIRED", "Resolve received funds before issuing a replacement version.");
            var allInvoices = await data.ListAsync<Invoice>(i => i.ContractID == contract.ContractID, token);
            var ids = allInvoices.Select(i => i.InvoiceID).ToArray();
            Require(!(await data.ListAsync<Payment>(p => ids.Contains(p.InvoiceID) && p.VnpayReceivedAmount > 0, token)).Any(),
                "PAYMENT_RECONCILIATION_REQUIRED", "Resolve every verified receipt before replacing the contract.");
            draft = new ContractVersion { ContractID = contract.ContractID,
                VersionNo = (await data.ListAsync<ContractVersion>(v => v.ContractID == contract.ContractID, token)).Select(v => v.VersionNo).DefaultIfEmpty(0).Max() + 1,
                VersionStatus = "DRAFT", CreatedBy = actor, CreatedAtUtc = clock.GetUtcNow().UtcDateTime };
            draft.ContentSnapshot = await snapshots.BuildAsync(contract, draft.VersionNo, row, input, token);
            data.Add(draft); await data.SaveAsync(token);
            contract.CurrentVersionNo = draft.VersionNo;
        }
        else draft!.ContentSnapshot = await snapshots.BuildAsync(contract, draft.VersionNo, row, input, token);
        // The internal budget never enters the customer snapshot.
        foreach (var item in await data.ListAsync<CostItem>(x => x.ContractID == contract.ContractID && x.SubcodeName != null && x.SubcodeName.StartsWith("INTERNAL_"), token)) data.Remove(item);
        foreach (var item in costs) data.Add(new CostItem { ContractID = contract.ContractID, CategoryName = item.Key,
            SubcodeName = "INTERNAL_" + item.Key, Bearer = "COMPANY", CurrencyCode = "VND", TotalMoney = item.Value });
        return new { contractId = contract.ContractID, requestId = request, versionNo = draft!.VersionNo, status = "DRAFT", savedAt = clock.GetUtcNow() };
    }, ct);
    public async Task<object> PublishAsync(string actor, string request, int version, CancellationToken ct)
    {
        var row = await access.RequestAsync(request, actor, true, ct);
        var contract = (await data.ListAsync<Contract>(c => c.RequestID == request, ct)).SingleOrDefault() ?? throw Failure("NOT_FOUND", "Draft not found.", 404);
        var draft = await data.FindAsync<ContractVersion>(ct, contract.ContractID, version) ?? throw Failure("NOT_FOUND", "Version not found.", 404);
        if (draft.VersionStatus == "ISSUED" && contract.CurrentVersionNo == version)
        {
            var invoice = (await data.ListAsync<Invoice>(i => i.ContractID == contract.ContractID && i.ContractVersionNo == version && i.InvoiceType == "DEPOSIT", ct)).Single();
            return Publication(contract, draft, row, invoice);
        }
        Require(contract.CurrentVersionNo == version && draft.VersionStatus == "DRAFT" && contract.SignedAt is null, "CONTRACT_NOT_CURRENT", "Only the current draft can be published.");
        Require(new[] { "legalName", "address", "email", "phone", "representative", "taxCode" }.All(key => issuer.Issuer.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value)), "CONTRACT_ISSUER_NOT_CONFIGURED", "Configure the complete issuing party.", 503);
        var original = draft.ContentSnapshot;
        var node = JsonNode.Parse(original)!.AsObject(); var now = clock.GetUtcNow().UtcDateTime;
        Require(node["commercial"] is JsonObject && node["route"] is JsonObject && node["appliedPolicies"] is JsonObject,
            "CONTRACT_DRAFT_REQUIRES_SAVE", "Save this draft with the Reviewed editor before publication.", 400);
        var hours = node["appliedPolicies"]!["contractDeadlineHours"]!.GetValue<decimal>();
        var deadline = now.AddHours((double)hours);
        var departure = node["route"]!["departureAtUtc"]!.GetValue<DateTime>();
        var preparation = checked((int)node["route"]!["preparationDays"]!.GetValue<decimal>());
        Require(deadline <= departure.AddDays(-preparation), "CONTRACT_EXPIRED", "Publication needs a full completion window before preparation.");
        node["issuedAtUtc"] = now; node["paymentObligations"]!["completionDeadlineUtc"] = deadline;
        var frozen = node.ToJsonString(); var pdf = await renderer.RenderAsync(JsonSerializer.Deserialize<JsonElement>(frozen), ct);
        return await data.WriteAsync<object>(async token =>
        {
            contract = await access.ContractAsync(contract.ContractID, actor, true, token);
            row = await access.RequestAsync(request, actor, true, token);
            draft = await data.FindAsync<ContractVersion>(token, contract.ContractID, version) ?? throw Failure("NOT_FOUND", "Version not found.", 404);
            Require(contract.CurrentVersionNo == version && draft.VersionStatus == "DRAFT" && draft.ContentSnapshot == original && contract.SignedAt is null,
                "CONTRACT_NOT_CURRENT", "Draft changed during rendering.");
            Require(row.Status is "CONTRACT_PREPARATION" or "CONTRACT_CHANGES_REQUESTED", "INVALID_STATE", "Request cannot be published.");
            await RequireHorsesFreeAsync(request, token);
            await catalogs.ValidateAsync(row.OriginCountry!, row.DestinationCountry!, node["route"]!["mode"]!.GetValue<string>(), token);
            Require(clock.GetUtcNow().UtcDateTime < deadline, "CONTRACT_EXPIRED", "Publication window elapsed.");
            foreach (var old in await data.ListAsync<ContractVersion>(v => v.ContractID == contract.ContractID && v.VersionStatus == "ISSUED" && v.VersionNo != version, token)) old.VersionStatus = "SUPERSEDED";
            foreach (var invoice in await data.ListAsync<Invoice>(i => i.ContractID == contract.ContractID && i.ContractVersionNo != version, token))
            { Require(invoice.PaidAmount == 0, "PAYMENT_RECONCILIATION_REQUIRED", "Old version has received money."); invoice.PaymentStatus = "CANCELLED"; }
            var total = node["commercial"]!["totalPrice"]!.GetValue<decimal>();
            var amount = node["commercial"]!["depositAmount"]!.GetValue<decimal>();
            draft.ContentSnapshot = frozen; draft.VersionStatus = "ISSUED"; draft.PdfUrl = pdf; draft.PublishedAtUtc = now; draft.PublishedBy = actor;
            contract.PublishedAtUtc = now; contract.PublishedBy = actor; contract.PdfUrl = pdf; contract.CompletionDeadline = deadline;
            contract.TotalQuotedPrice = total; contract.DepositAmount = amount; contract.DepositRateStandard = node["commercial"]!["depositPercent"]!.GetValue<decimal>();
            contract.ContractStatus = "ISSUED"; contract.SignOtpHash = null; contract.SignOtpExpiry = null; contract.SignOtpSentAtUtc = null; contract.SignOtpFailedAttempts = 0;
            row.ExpectedDate = departure; row.CommittedDeadline = node["route"]!["deliveryAtUtc"]!.GetValue<DateTime>();
            row.PreparationDays = preparation; row.TransportType = node["route"]!["mode"]!.GetValue<string>(); row.Status = "CONTRACT_READY";
            var invoiceRow = new Invoice { ContractID = contract.ContractID, ContractVersionNo = version, InvoiceType = "DEPOSIT", CurrencyCode = "VND",
                TotalPayableAmount = amount, PaidAmount = 0, DueDate = deadline, PaymentStatus = "UNPAID" };
            data.Add(invoiceRow); notifications.Add(row.CustomerID, request, "CONTRACT_ISSUED", "Contract issued", $"Contract {contract.ContractID}, version {version} is ready.");
            await data.SaveAsync(token);
            return Publication(contract, draft, row, invoiceRow);
        }, ct);
    }
    public async Task<object> CustomerAsync(string actor, string request, CancellationToken ct)
    {
        var row = await access.RequestAsync(request, actor, false, ct);
        var contract = (await data.ListAsync<Contract>(c => c.RequestID == request, ct)).SingleOrDefault();
        if (contract is null) return new { requestId = request, currentVersion = (object?)null };
        var version = (await data.ListAsync<ContractVersion>(v => v.ContractID == contract.ContractID && v.PublishedAtUtc != null, ct)).OrderByDescending(v => v.VersionNo).FirstOrDefault();
        return new { requestId = request, currentVersion = version is null ? null : View(contract, version, row) };
    }
    public async Task<object> VersionAsync(string actor, string id, int number, bool manager, CancellationToken ct)
    {
        var contract = await access.ContractAsync(id, actor, manager, ct);
        var version = await data.FindAsync<ContractVersion>(ct, id, number);
        Require(version is not null && (manager || version.PublishedAtUtc is not null), "NOT_FOUND", "Version not found.", 404);
        return View(contract, version!, await data.FindAsync<TransportRequest>(ct, contract.RequestID)! ?? throw Failure("NOT_FOUND", "Request not found.", 404));
    }
    public async Task<(byte[] Bytes, string ContentType)> PdfAsync(string actor, string id, int number, bool manager, CancellationToken ct)
    {
        await access.ContractAsync(id, actor, manager, ct);
        var version = await data.FindAsync<ContractVersion>(ct, id, number);
        Require(version?.PublishedAtUtc is not null && version.PdfUrl is not null, "NOT_FOUND", "Published PDF not found.", 404);
        return await files.ReadAsync(version!.PdfUrl!, ct);
    }
    public Task<object> AcceptAsync(string actor, string id, int number, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        var contract = await access.ContractAsync(id, actor, false, token); var version = await CurrentAsync(contract, number, token);
        Require(contract.CompletionDeadline > clock.GetUtcNow().UtcDateTime, "CONTRACT_EXPIRED", "Contract has expired.");
        Require(version.VersionStatus == "ISSUED" && contract.CancellationStatus != "PENDING", "INVALID_STATE", "Contract is not open for acceptance.");
        version.TermsAcceptedAtUtc ??= clock.GetUtcNow().UtcDateTime;
        return new { requestId = contract.RequestID, contractId = id, versionNo = number, termsAcceptedAt = version.TermsAcceptedAtUtc, requestStatus = "CONTRACT_READY" };
    }, ct);
    public Task<object> FeedbackAsync(string actor, string id, FeedbackInput input, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        var contract = await access.ContractAsync(id, actor, false, token); await CurrentAsync(contract, input.VersionNo, token);
        var row = await access.RequestAsync(contract.RequestID, actor, false, token);
        Require(contract.SignedAt is null && row.Status == "CONTRACT_READY" && contract.CompletionDeadline > clock.GetUtcNow().UtcDateTime,
            "INVALID_STATE", "Contract is not open for feedback.");
        contract.CustomerFeedback = Required(input.Text); contract.FeedbackStatus = "PENDING"; contract.FeedbackAtUtc = clock.GetUtcNow().UtcDateTime;
        contract.ManagerFeedback = null; contract.FeedbackHandledAtUtc = null; row.Status = "CONTRACT_CHANGES_REQUESTED";
        return new { requestId = row.RequestID, contractId = id, versionNo = input.VersionNo, status = row.Status, feedback = contract.CustomerFeedback };
    }, ct);
    public Task<object> DecideFeedbackAsync(string actor, string id, FeedbackDecision input, CancellationToken ct) => data.WriteAsync<object>(async token =>
    {
        var contract = await access.ContractAsync(id, actor, true, token); await CurrentAsync(contract, input.VersionNo, token);
        Require(contract.FeedbackStatus == "PENDING" && contract.SignedAt is null, "INVALID_STATE", "No pending feedback.");
        Require(input.Decision is "ACCEPTED" or "REJECTED", "VALIDATION_ERROR", "Invalid decision.", 400);
        contract.FeedbackStatus = input.Decision; contract.ManagerFeedback = Required(input.Text); contract.FeedbackHandledAtUtc = clock.GetUtcNow().UtcDateTime;
        var row = await data.FindAsync<TransportRequest>(token, contract.RequestID) ?? throw Failure("NOT_FOUND", "Request not found.", 404);
        if (input.Decision == "REJECTED") row.Status = "CONTRACT_READY";
        notifications.Add(row.CustomerID, row.RequestID, "FEEDBACK_DECIDED", "Contract feedback reviewed", contract.ManagerFeedback);
        return new { contractId = id, versionNo = input.VersionNo, decision = input.Decision, requestStatus = row.Status };
    }, ct);
    private async Task RequireHorsesFreeAsync(string request, CancellationToken ct)
    {
        var row = await data.FindAsync<TransportRequest>(ct, request) ?? throw Failure("NOT_FOUND", "Request not found.", 404);
        var horses = (await data.ListAsync<RequestHorse>(h => h.RequestID == request, ct)).Select(h => h.HorseID).ToArray();
        await HorseBookingRules.RequireAvailableAsync(data, horses, row, ct);
    }
    public async Task<ContractVersion> CurrentAsync(Contract contract, int number, CancellationToken ct)
    {
        Require(contract.CurrentVersionNo == number, "CONTRACT_NOT_CURRENT", "The selected version is not current.");
        return await data.FindAsync<ContractVersion>(ct, contract.ContractID, number) ?? throw Failure("NOT_FOUND", "Version not found.", 404);
    }
    private static object Publication(Contract contract, ContractVersion version, TransportRequest request, Invoice invoice) => new
    {
        requestId = request.RequestID, contractId = contract.ContractID, versionNo = version.VersionNo,
        invoiceId = invoice.InvoiceID, requestStatus = request.Status, total = contract.TotalQuotedPrice,
        depositPct = contract.DepositRateStandard, depositAmount = invoice.TotalPayableAmount, currency = "VND",
        validUntil = contract.CompletionDeadline?.ToString("yyyy-MM-dd HH:mm")
    };
    public static object View(Contract contract, ContractVersion version, TransportRequest request) => ContractMapper.View(contract, version, request);
}
