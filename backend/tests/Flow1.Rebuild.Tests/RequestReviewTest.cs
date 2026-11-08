using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Flow1.Rebuild.Tests;

internal static class RequestReviewTest
{
    internal static async Task<JsonElement> DataAsync(HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"{response.StatusCode}: {text}");
        return JsonDocument.Parse(text).RootElement.GetProperty("data").Clone();
    }

    internal static async Task<(string ReviewId, string OptionId)> AssessAsync(ApiFactory factory, HttpClient manager,
        string requestId, bool feasible, DateTime? alternative = null)
    {
        using var coordinator = factory.Reviewer("USER_006", "FLEET_ROUTE_COORDINATOR");
        using var specialist = factory.Reviewer("USER_005", "TRANSPORT_SPECIALIST");
        var requestPath = $"/api/manager/requests/{requestId}";
        var assignment = await DataAsync(await manager.PostAsJsonAsync(requestPath + "/reviews",
            new { requestRevision = 1, coordinatorId = "USER_006", specialistId = "USER_005" }));
        var reviewId = assignment.GetProperty("reviewId").GetString()!;
        var coordinatorPath = $"/api/coordinator/request-reviews/{reviewId}";
        var specialistPath = $"/api/specialist/request-reviews/{reviewId}";
        var queue = await DataAsync(await coordinator.GetAsync("/api/coordinator/request-reviews"));
        Assert.Contains(queue.EnumerateArray(), row => row.GetProperty("reviewId").GetString() == reviewId);
        var view = await DataAsync(await coordinator.GetAsync(coordinatorPath));
        Assert.Equal(JsonValueKind.Object, view.GetProperty("resources").ValueKind);
        Assert.Equal(HttpStatusCode.Conflict, (await specialist.GetAsync(specialistPath)).StatusCode);

        var original = new { result = feasible && alternative is null ? "FEASIBLE" : "NOT_FEASIBLE", reason = "Route reviewed" };
        if (alternative is not null)
        {
            var invalidAlternative = await coordinator.PostAsJsonAsync(coordinatorPath + "/assessment", new
            {
                requestRevision = 1, original,
                alternative = new
                {
                    mode = "AIR", expectedTransportDate = alternative.Value.ToString("yyyy-MM-dd"),
                    expectedDeliveryDate = alternative.Value.AddDays(2).ToString("yyyy-MM-dd"),
                    result = "NOT_FEASIBLE", reason = "No usable schedule",
                },
            });
            Assert.Equal(HttpStatusCode.BadRequest, invalidAlternative.StatusCode);
        }
        var assessment = await DataAsync(await coordinator.PostAsJsonAsync(coordinatorPath + "/assessment", new
        {
            requestRevision = 1,
            original,
            alternative = alternative is null ? null : new
            {
                mode = "AIR", expectedTransportDate = alternative.Value.ToString("yyyy-MM-dd"),
                expectedDeliveryDate = alternative.Value.AddDays(2).ToString("yyyy-MM-dd"),
                result = "FEASIBLE", reason = "Later capacity is available",
            },
        }));
        var optionId = assessment.GetProperty("options").EnumerateArray().Last().GetProperty("scheduleOptionId").GetString()!;
        Assert.Equal(HttpStatusCode.Conflict, (await manager.PostAsJsonAsync(requestPath + "/accept",
            new { reviewId, requestRevision = 1, scheduleOptionId = optionId })).StatusCode);
        if (!feasible) return (reviewId, optionId);
        var detail = await DataAsync(await specialist.GetAsync(specialistPath));
        var option = detail.GetProperty("options").EnumerateArray().Single(x => x.GetProperty("scheduleOptionId").GetString() == optionId);
        var items = option.GetProperty("checklist").EnumerateArray().Select(item =>
        {
            var stage = item.GetProperty("stage").GetString();
            var usable = item.GetProperty("usable").GetBoolean();
            return new
            {
                checklistItemId = item.GetProperty("checklistItemId").GetString(),
                status = usable ? "VERIFIED" : stage == "BEFORE_DEPARTURE" ? "NEEDS_FOLLOW_UP" : "MISSING",
                reason = usable ? null : "Supplier confirmed expected completion",
                requiredByDate = stage == "BEFORE_DEPARTURE" && !usable ? DateTime.UtcNow.AddDays(5).ToString("yyyy-MM-dd") : null,
                estimatedProcessingDays = stage == "BEFORE_DEPARTURE" && !usable ? (int?)2 : null,
            };
        }).ToArray();
        var finished = await DataAsync(await specialist.PostAsJsonAsync($"{specialistPath}/options/{optionId}/assessment",
            new { requestRevision = 1, checklistVersion = option.GetProperty("checklistVersion").GetString(), result = "FEASIBLE", items }));
        Assert.Equal("MANAGER_PENDING", finished.GetProperty("status").GetString());
        return (reviewId, optionId);
    }

    internal static async Task AcceptAsync(ApiFactory factory, HttpClient manager, string requestId)
    {
        var (reviewId, scheduleOptionId) = await AssessAsync(factory, manager, requestId, true);
        await DataAsync(await manager.PostAsJsonAsync($"/api/manager/requests/{requestId}/accept",
            new { reviewId, requestRevision = 1, scheduleOptionId }));
    }
}
