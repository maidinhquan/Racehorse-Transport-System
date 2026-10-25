using System.Text.Json;
using Domain.Flow1.Entities;

namespace Application.Flow1.Mapping;

public static class ContractMapper
{
    public static object View(Contract contract, ContractVersion version, TransportRequest request)
    {
        var snapshot = JsonSerializer.Deserialize<JsonElement>(version.ContentSnapshot);
        var commercial = Field(snapshot, "commercial");
        var route = Field(snapshot, "route");
        var legacy = commercial is null;
        return new
        {
            contractId = contract.ContractID, requestId = contract.RequestID, versionNo = version.VersionNo,
            v = version.VersionNo, number = contract.ContractID, requestStatus = request.Status,
            contractStatus = contract.ContractStatus, versionStatus = version.VersionStatus, state = version.VersionStatus,
            issuedAt = Format(version.PublishedAtUtc), signedAt = Format(version.SignedAtUtc),
            termsAcceptedAt = Format(version.TermsAcceptedAtUtc),
            validUntil = Format(legacy ? ReadDate(snapshot, "CompletionDeadline") : ReadDate(Field(snapshot, "paymentObligations"), "completionDeadlineUtc")),
            currentDeadline = Format(contract.CompletionDeadline), currency = "VND",
            items = Field(commercial, "items"), total = legacy ? Field(snapshot, "TotalQuotedPrice") : Field(commercial, "totalPrice"),
            depositPct = legacy ? Field(snapshot, "DepositRateStandard") : Field(commercial, "depositPercent"), depositAmount = legacy ? Field(snapshot, "DepositAmount") : Field(commercial, "depositAmount"),
            note = legacy ? Field(snapshot, "CommercialNotes") : Field(commercial, "notes"), terms = legacy ? Field(snapshot, "Clauses") : Field(snapshot, "terms"), mode = Field(route, "mode"),
            departAt = Format(ReadDate(route, "departureAtUtc")), arriveAt = Format(ReadDate(route, "deliveryAtUtc")),
            snapshot,
            unsupportedFields = legacy ? new[] { "items", "mode", "departAt", "arriveAt" } : Array.Empty<string>(),
            pdfUrl = version.PdfUrl is null ? null : $"/api/customer/contracts/{contract.ContractID}/versions/{version.VersionNo}/pdf"
        };
    }
    private static JsonElement? Field(JsonElement? value, string key) =>
        value is JsonElement obj && obj.ValueKind == JsonValueKind.Object && obj.TryGetProperty(key, out var property) ? property : null;
    private static DateTime? ReadDate(JsonElement? value, string key) =>
        Field(value, key) is JsonElement property && property.ValueKind == JsonValueKind.String && property.TryGetDateTime(out var date) ? date : null;
    private static string? Format(DateTime? value) => value?.ToString("yyyy-MM-dd HH:mm");
}
