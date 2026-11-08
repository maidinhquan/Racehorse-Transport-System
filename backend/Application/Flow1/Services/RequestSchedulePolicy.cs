namespace Application.Flow1.Services;

public sealed class RequestSchedulePolicy(PolicyService policies, TimeProvider clock)
{
    public Task<decimal> PreparationAsync(string? mode, CancellationToken ct) =>
        policies.NumberAsync("FLOW1_PREPARATION_DAYS", "DAY", null, mode, 1, 365, true, ct);

    public Task<decimal> CustomerResponseHoursAsync(CancellationToken ct) =>
        policies.NumberAsync("FLOW1_CUSTOMER_RESPONSE_HOURS", "HOUR", null, null, 1, 720, true, ct);

    public async Task<int> MinimumLeadDaysAsync(string? mode, bool includeReview, CancellationToken ct)
    {
        var preparation = await PreparationAsync(mode, ct);
        var signing = await policies.NumberAsync("FLOW1_SIGNING_BUFFER_DAYS", "DAY", null, null, 2, 365, true, ct);
        var review = includeReview
            ? await policies.NumberAsync("FLOW1_REVIEW_BUFFER_DAYS", "DAY", null, null, 0, 365, true, ct)
            : 0;
        return (int)(preparation + signing + review);
    }

    public DateTime Today(string? country)
    {
        var hours = country switch { "JP" => 9, "VN" or "TH" => 7, _ => 0 };
        return clock.GetUtcNow().UtcDateTime.AddHours(hours).Date;
    }

    public async Task<DateTime> EarliestPickupAsync(string? origin, string? mode, bool includeReview, CancellationToken ct) =>
        Today(origin).AddDays(await MinimumLeadDaysAsync(mode, includeReview, ct));
}
