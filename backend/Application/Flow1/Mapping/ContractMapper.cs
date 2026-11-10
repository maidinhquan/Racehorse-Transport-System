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
            requestStatus = request.Status,
            contractStatus = contract.ContractStatus, versionStatus = version.VersionStatus,
            issuedAt = Format(version.PublishedAtUtc), signedAt = Format(version.SignedAtUtc),
            termsAcceptedAt = Format(version.TermsAcceptedAtUtc),
            currentDeadline = Format(contract.CompletionDeadline), currency = "VND",
            items = Field(commercial, "items"), total = legacy ? Field(snapshot, "TotalQuotedPrice") : Field(commercial, "totalPrice"),
            budget = Field(commercial, "budget"),
            depositPct = legacy ? Field(snapshot, "DepositRateStandard") : Field(commercial, "depositPercent"), depositAmount = legacy ? Field(snapshot, "DepositAmount") : Field(commercial, "depositAmount"),
            note = legacy ? Field(snapshot, "CommercialNotes") : Field(commercial, "notes"), terms = MapTerms(legacy ? Field(snapshot, "Clauses") : Field(snapshot, "terms")), mode = Field(route, "mode"),
            departAt = Format(ReadDate(route, "departureAtUtc")), arriveAt = Format(ReadDate(route, "deliveryAtUtc")),
            snapshot,
            unsupportedFields = legacy ? new[] { "items", "mode", "departAt", "arriveAt" } : Array.Empty<string>(),
            pdfUrl = version.PdfUrl is null ? null : $"/api/customer/contracts/{contract.ContractID}/versions/{version.VersionNo}/pdf"
        };
    }
    private static object? MapTerms(JsonElement? clauses)
    {
        if (clauses is not JsonElement el || el.ValueKind != JsonValueKind.Array) return null;
        var list = new List<object>();
        foreach (var item in el.EnumerateArray())
        {
            var title = item.TryGetProperty("title", out var t1) ? t1.GetString()
                : item.TryGetProperty("Title", out var t2) ? t2.GetString()
                : item.TryGetProperty("TemplateName", out var t3) ? t3.GetString()
                : "";
            var text = item.TryGetProperty("text", out var c1) ? c1.GetString()
                : item.TryGetProperty("content", out var c2) ? c2.GetString()
                : item.TryGetProperty("Content", out var c3) ? c3.GetString()
                : item.TryGetProperty("BodyContent", out var c4) ? c4.GetString()
                : "";
            list.Add(new { title = title ?? "", text = text ?? "" });
        }
        return list;
    }
    private static JsonElement? Field(JsonElement? value, string key) =>
        value is JsonElement obj && obj.ValueKind == JsonValueKind.Object && obj.TryGetProperty(key, out var property) ? property : null;
    private static DateTime? ReadDate(JsonElement? value, string key) =>
        Field(value, key) is JsonElement property && property.ValueKind == JsonValueKind.String && property.TryGetDateTime(out var date) ? date : null;
    private static string? Format(DateTime? value) => value?.ToString("yyyy-MM-dd HH:mm");
}
