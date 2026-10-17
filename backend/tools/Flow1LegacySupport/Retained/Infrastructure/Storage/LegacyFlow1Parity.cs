using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Application.Services.Flow1;

namespace Infrastructure.Storage;

internal static class LegacyFlow1Parity
{
    private static readonly JsonSerializerOptions Json = LegacyFlow1Sources.Json;
    private static void Need(bool ok, string code) { if (!ok) throw new InvalidDataException(code); }
    private static bool Id(string? a, string? b) => string.Equals(a, b, StringComparison.OrdinalIgnoreCase);
    private static bool Same<T>(T a, T b) => CustomerTransportService.Hash(a) == CustomerTransportService.Hash(b);
    private static bool Hex(string value) => Regex.IsMatch(value ?? "", @"\A[a-fA-F0-9]{64}\z");
    internal static async Task Validate(Flow1StateDocument document, Dictionary<(string Kind, string Id), Flow1StateDocument> all,
        Flow1LegacyStateImporter.Business sql, string bytesRoot, Dictionary<string, string> files, CancellationToken ct)
    {
        var id = document.AggregateId;
        Flow1StateDocument Doc(string kind, string owner) => all.TryGetValue((kind, LegacyFlow1Sources.Key(owner)), out var d) ? d : throw new InvalidDataException("DEPENDENCY_MISSING");
        T Read<T>(string kind, string owner, int? version = null) => Flow1LegacyStateImporter.Payload<T>(Doc(kind, owner), version);
        var latest = document.Revisions.Count;
        foreach (var revision in document.Revisions)
        {
            await Files(revision.Payload, bytesRoot, files, ct);
            switch (document.AggregateType)
            {
                case "horse":
                    var h = revision.Payload.Deserialize<HorseSnapshot>(Json)!;
                    Need(h.Identity is not null && h.Photo is not null && h.PassportScan is not null && Hex(h.InputHash) && h.Status == "ACTIVE", "HORSE_PAYLOAD");
                    if (revision.Version == latest)
                    {
                        var row = sql.Horses.Single(x => Id(x.HorseId, id));
                        Need(row.MicrochipIso == h.Identity!.MicrochipIso && row.Name == h.Identity.Name.Trim() && row.FeiPassportNo == h.Identity.FeiPassportNo.Trim() &&
                            row.Breed == h.Identity.Breed.Trim() && row.Sex == h.Identity.Sex && row.Weight == h.Identity.Weight &&
                            row.Dob == h.Identity.Dob.ToDateTime(TimeOnly.MinValue), "HORSE_SQL_CONFLICT");
                    }
                    break;
                case "request":
                    var r = revision.Payload.Deserialize<RequestSnapshot>(Json)!;
                    var request = sql.Requests.Single(x => Id(x.RequestId, id));
                    var original = Read<RequestSnapshot>("request", id, 1);
                    Need(r.Input is not null && r.Estimate is not null && r.HorseSnapshots is not null && Hex(r.InputHash) &&
                        r.InputHash == original.InputHash && original.InputHash == CustomerTransportService.Hash(original.Input), "REQUEST_PAYLOAD");
                    Need(r.Estimate!.Currency == "VND" && r.Estimate.EstimatedDeposit == Flow1ContractFactory.DepositAmount(r.Estimate.EstimatedPrice), "ESTIMATE_MONEY");
                    Need(r.Input!.Horses.Count == r.Input.Trip.HorseCount && r.HorseSnapshots!.Count == r.Input.Horses.Count, "HORSE_REFERENCE_COUNT");
                    for (var i = 0; i < r.Input.Horses.Count; i++)
                    {
                        var reference = r.Input.Horses[i];
                        Need(Id(sql.Horses.Single(x => Id(x.HorseId, reference.HorseId)).OwnerId, request.CustomerId), "HORSE_OWNER_CONFLICT");
                        Need(Same(Read<HorseSnapshot>("horse", reference.HorseId, reference.DocumentVersion), r.HorseSnapshots![i]), "HORSE_VERSION_CONFLICT");
                    }
                    if (revision.Version == latest)
                    {
                        Need(request.Departure == r.Input.Trip.Pickup.Address.Trim() && request.Destination == r.Input.Trip.Delivery.Address.Trim() &&
                            request.Purpose == r.Input.Purpose.Trim() && request.TransportType == r.Input.Trip.PreferredTransportMode &&
                            request.ExpectedDate == r.Input.Trip.DesiredDepartureDate.ToDateTime(TimeOnly.MinValue) &&
                            request.CommittedDeadline == r.Input.DeliveryDeadline.ToDateTime(TimeOnly.MinValue) &&
                            request.DesignatedReceiverName == r.Input.Receiver.Name.Trim() && request.DesignatedReceiverPhone == r.Input.Receiver.Phone.Trim() &&
                            sql.Mappings.Where(x => Id(x.RequestId, id)).Select(x => x.HorseId.ToLowerInvariant()).Order().SequenceEqual(r.Input.Horses.Select(x => x.HorseId.ToLowerInvariant()).Order()), "REQUEST_SQL_CONFLICT");
                        if (!all.ContainsKey(("review", id))) Need(request.Status == "PENDING", "REQUEST_STATUS_WITHOUT_REVIEW");
                    }
                    break;
                case "review":
                    var review = revision.Payload.Deserialize<ReviewState>(Json)!;
                    Need(review.Questions is not null && review.Changes is not null && review.Notices is not null, "REVIEW_PAYLOAD");
                    Read<RequestSnapshot>("request", id, review.RequestVersion);
                    foreach (var change in review.Changes!)
                        foreach (var reference in change.Proposal.Horses)
                        {
                            Read<HorseSnapshot>("horse", reference.HorseId, reference.DocumentVersion);
                            Need(Id(sql.Horses.Single(x => Id(x.HorseId, reference.HorseId)).OwnerId,
                                sql.Requests.Single(x => Id(x.RequestId, id)).CustomerId), "PROPOSAL_OWNER_CONFLICT");
                        }
                    if (revision.Version == latest)
                    {
                        Need(review.RequestVersion == Doc("request", id).Revisions.Count, "REVIEW_CANONICAL_VERSION");
                        if (review.PlanVersion > 0) Need(Read<PreliminaryPlan>("plan", id, review.PlanVersion).RequestVersion == review.RequestVersion, "PLAN_VERSION_CONFLICT");
                        var expectedStatus = "PENDING";
                        foreach (var audit in document.Revisions)
                        {
                            if (audit.Payload.TryGetProperty("pending", out var pending) && pending.ValueKind != JsonValueKind.Null) continue;
                            var receipt = audit.Payload.Deserialize<ReviewState>(Json)!.LastOperation;
                            if (receipt?.Outcome != "COMMITTED") continue;
                            expectedStatus = receipt.Action switch { "ACCEPT" => "ACCEPTED", "REJECT" => "REJECTED", "CANCEL" => "CANCELLED",
                                "REQUEST_REVISION" => "CHANGES_REQUESTED", "RESUBMIT" or "APPROVE_CHANGE" => "PENDING", _ => expectedStatus };
                        }
                        if (review.CurrentContractId is not null)
                        {
                            var current = sql.Contracts.Single(x => Id(x.ContractId, review.CurrentContractId));
                            Need(Id(current.RequestId, id) && current.ContractStatus is "DRAFT" or "PENDING_SIGNATURE" or "SIGNED", "CURRENT_CONTRACT_CONFLICT");
                            var snapshot = Read<DraftSnapshot>("contract", current.ContractId);
                            Need(snapshot.RequestVersion == review.RequestVersion && snapshot.PlanVersion == review.PlanVersion, "CURRENT_DRAFT_VERSION");
                            expectedStatus = current.ContractStatus switch { "PENDING_SIGNATURE" => "AWAITING_CONTRACT", "SIGNED" => "AWAITING_DEPOSIT", _ => "ACCEPTED" };
                        }
                        Need(sql.Requests.Single(x => Id(x.RequestId, id)).Status == expectedStatus, "REQUEST_STATUS_CONFLICT");
                    }
                    break;
                case "plan":
                    var plan = revision.Payload.Deserialize<PreliminaryPlan>(Json)!;
                    var input = Read<RequestSnapshot>("request", id, plan.RequestVersion).Input;
                    Need(plan.Input is not null && plan.Input.PreparationDays >= plan.MinimumPreparationDays && plan.Input.PreparationDays <= 90 &&
                        plan.Input.DepartureDate == input.Trip.DesiredDepartureDate && plan.Input.DeliveryDate == input.DeliveryDeadline &&
                        (plan.Input.PlannedDepartureAt is null || plan.Input.PlannedDepartureAt.Value.Offset == TimeSpan.Zero) &&
                        plan.Floor == Flow1PricingPolicy.Round(plan.EstimatedCost * 1.05m) &&
                        plan.Suggested == Flow1PricingPolicy.Round(plan.EstimatedCost * 1.20m), "PLAN_PARITY");
                    break;
                case "contract":
                    var draft = revision.Payload.Deserialize<DraftSnapshot>(Json)!;
                    var contract = sql.Contracts.Single(x => Id(x.ContractId, id));
                    Need(Id(contract.CustomerId, sql.Requests.Single(x => Id(x.RequestId, contract.RequestId)).CustomerId), "CONTRACT_OWNER_CONFLICT");
                    Read<RequestSnapshot>("request", contract.RequestId, draft.RequestVersion);
                    Need(Same(Read<PreliminaryPlan>("plan", contract.RequestId, draft.PlanVersion), draft.Plan), "DRAFT_PLAN_CONFLICT");
                    Need(draft.Lines is { Length: > 0 } && draft.Total == draft.Lines.Sum(x => Flow1PricingPolicy.Round(x.Quantity * x.UnitPrice)) &&
                        draft.Deposit == Flow1ContractFactory.DepositAmount(draft.Total), "DRAFT_MONEY_CONFLICT");
                    if (revision.Version == latest)
                        Need(contract.TotalQuotedPrice == draft.Total && contract.CurrencyCode == "VND" && contract.DepositRateStandard == 40, "CONTRACT_SQL_MONEY");
                    break;
                case "publication":
                    var p = revision.Payload.Deserialize<ContractPublication>(Json)!;
                    var c = sql.Contracts.Single(x => Id(x.ContractId, id));
                    var d = Read<DraftSnapshot>("contract", id, p.ContractVersion);
                    Need(Id(p.ContractId, id) && Id(p.RequestId, c.RequestId) && Id(p.CustomerId, c.CustomerId) &&
                        p.DraftHash == CustomerTransportService.Hash(d) && d.RequestVersion == p.RequestVersion && d.PlanVersion == p.PlanVersion &&
                        Read<ReviewState>("review", c.RequestId, p.ReviewVersion).CurrentContractId == c.ContractId &&
                        p.Outcome is "PREPARED" or "COMMITTED" or "ABORTED", "PUBLICATION_BINDING");
                    if (revision.Version == latest && p.Outcome == "COMMITTED")
                        Need(c.CompletionDeadline == p.CompletionDeadline.UtcDateTime && c.ContractStatus is "PENDING_SIGNATURE" or "SIGNED" &&
                            c.SignedAt.HasValue == (c.ContractStatus == "SIGNED"), "PUBLICATION_SQL_CONFLICT");
                    break;
                case "contract-otp":
                    var otp = revision.Payload.Deserialize<ContractOtpState>(Json)!;
                    var issued = Read<ContractPublication>("publication", id);
                    Need(otp.CustomerId == issued.CustomerId && otp.ContractVersion == issued.ContractVersion &&
                        otp.DocumentHash == issued.Document.Sha256 && Hex(otp.EmailDigest) && Hex(otp.CodeDigest) &&
                        otp.Attempts is >= 0 and <= 5 && otp.Delivery is "DELIVERING" or "DELIVERED" or "FAILED" &&
                        otp.ExpiresAt > otp.SentAt && otp.ExpiresAt <= issued.CompletionDeadline, "OTP_BINDING_OR_COUNTERS");
                    break;
                case "acceptance":
                    var acceptance = revision.Payload.Deserialize<AcceptanceState>(Json)!.Operation;
                    var evidence = acceptance.Evidence;
                    var publication = Read<ContractPublication>("publication", id);
                    Need(Id(evidence.ContractId, id) && evidence.CustomerId == publication.CustomerId && evidence.ContractVersion == publication.ContractVersion &&
                        evidence.DocumentHash == publication.Document.Sha256 && evidence.Method == "EMAIL_OTP" &&
                        evidence.Deposit == Read<DraftSnapshot>("contract", id, evidence.ContractVersion).Deposit &&
                        evidence.InvoiceId == "di-" + CustomerTransportService.Hash(id + "/DEPOSIT")[..32] &&
                        Hex(acceptance.InputDigest) && acceptance.Outcome is "PREPARED" or "COMMITTED" or "ABORTED", "ACCEPTANCE_BINDING");
                    if (revision.Version == latest && acceptance.Outcome == "COMMITTED")
                    {
                        var signed = sql.Contracts.Single(x => Id(x.ContractId, id));
                        var invoice = sql.Invoices.Single(x => Id(x.ContractId, id) && x.InvoiceType == "DEPOSIT");
                        Need(signed.ContractStatus == "SIGNED" && signed.SignedAt == evidence.SignedAtUtc && signed.TripId is null &&
                            invoice.InvoiceId == evidence.InvoiceId && invoice.CurrencyCode == "VND" && invoice.TotalPayableAmount == evidence.Deposit &&
                            invoice.DueDate == evidence.InvoiceDueAtUtc &&
                            evidence.InvoiceDueAtUtc == DateTimeOffset.FromUnixTimeSeconds(publication.CompletionDeadline.ToUnixTimeSeconds()).UtcDateTime &&
                            Read<ContractOtpState>("contract-otp", id).Consumed, "SIGNATURE_INVOICE_PARITY");
                    }
                    break;
                case "otp-account":
                    var budget = revision.Payload.Deserialize<ContractOtpAccount>(Json)!;
                    Need(budget.Sends is not null && budget.Sends.Length is > 0 and <= 5 && budget.Sends.All(t => t.Offset == TimeSpan.Zero), "ACCOUNT_COUNTERS");
                    break;
                default: throw new InvalidDataException("UNSUPPORTED_LEGACY_KIND");
            }
        }
        if (document.AggregateType == "contract")
        {
            var c = sql.Contracts.Single(x => Id(x.ContractId, id));
            if (c.ContractStatus is "PENDING_SIGNATURE" or "SIGNED")
                Need(Read<ContractPublication>("publication", id).Outcome == "COMMITTED", "PUBLICATION_MISSING");
            if (c.ContractStatus == "SIGNED") Need(Read<AcceptanceState>("acceptance", id).Operation.Outcome == "COMMITTED", "ACCEPTANCE_MISSING");
            else Need(c.SignedAt is null && !sql.Invoices.Any(x => Id(x.ContractId, id) && x.InvoiceType == "DEPOSIT"), "UNEXPECTED_SIGNATURE_OR_INVOICE");
        }
    }
    private static async Task Files(JsonElement payload, string root, Dictionary<string, string> checkedFiles, CancellationToken ct)
    {
        if (payload.ValueKind == JsonValueKind.Object)
        {
            var hasFile = payload.TryGetProperty("fileId", out var file) || payload.TryGetProperty("privateStorageKey", out file);
            if (hasFile)
            {
                var id = file.GetString()!;
                var sha = payload.GetProperty("sha256").GetString()!;
                var size = payload.GetProperty("sizeBytes").GetInt32();
                Need(Regex.IsMatch(id, @"\A[a-f0-9]{64}\z") && Hex(sha) && size is > 0 and <= LocalFlow1PrivateFileStore.MaxBytes, "FILE_REFERENCE_INVALID");
                var binding = sha.ToUpperInvariant() + ":" + size;
                if (checkedFiles.TryGetValue(id, out var old)) Need(old == binding, "FILE_REFERENCE_CONFLICT");
                else
                {
                    LegacyFlow1Sources.NoLinks(Path.Combine(root, id + ".bin"));
                    await new LocalFlow1PrivateFileStore(root).ReadAsync(new(id, sha, "", size), ct);
                    checkedFiles.Add(id, binding);
                }
            }
            foreach (var p in payload.EnumerateObject()) await Files(p.Value, root, checkedFiles, ct);
        }
        else if (payload.ValueKind == JsonValueKind.Array)
            foreach (var item in payload.EnumerateArray()) await Files(item, root, checkedFiles, ct);
    }
}
