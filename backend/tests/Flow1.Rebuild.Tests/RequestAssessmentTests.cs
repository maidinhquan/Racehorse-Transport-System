using System.Net;
using System.Net.Http.Json;
using Application.Flow1.Services;
using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using static Flow1.Rebuild.Tests.RequestReviewTest;

namespace Flow1.Rebuild.Tests;

public sealed class RequestAssessmentTests(SqlFixture database) : IClassFixture<SqlFixture>
{
    [Theory]
    [InlineData("ACCEPTED", HttpStatusCode.OK)]
    [InlineData("REJECTED", HttpStatusCode.Conflict)]
    [InlineData(null, HttpStatusCode.Conflict)]
    public async Task Alternative_requires_a_live_customer_acceptance(string? decision, HttpStatusCode expected)
    {
        using var factory = new ApiFactory(database);
        using var customer = factory.Customer();
        using var manager = factory.Manager();
        var original = DateTime.UtcNow.Date.AddDays(25);
        var alternative = original.AddDays(4);
        var horseId = await SubmissionTest.NewHorseAsync(database);
        var input = SubmissionTest.Input(original.ToString("yyyy-MM-dd"), original.AddDays(2).ToString("yyyy-MM-dd"), horseId);
        customer.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        var created = await DataAsync(await customer.PostAsync("/api/customer/requests", SubmissionTest.Body(input)));
        var requestId = created.GetProperty("id").GetString()!;
        var (reviewId, scheduleOptionId) = await AssessAsync(factory, manager, requestId, true, alternative);
        var key = new { reviewId, requestRevision = 1, scheduleOptionId };
        var managerPath = $"/api/manager/requests/{requestId}";
        var customerPath = $"/api/customer/requests/{requestId}";
        Assert.Equal(HttpStatusCode.Conflict, (await manager.PostAsJsonAsync(managerPath + "/accept", key)).StatusCode);
        await DataAsync(await manager.PostAsJsonAsync(managerPath + "/request-changes", new
        {
            reviewId, requestRevision = 1, scheduleOptionId, action = "CONFIRM_SCHEDULE", feedback = "Later schedule is available.",
        }));
        var pending = await DataAsync(await customer.GetAsync(customerPath + "/schedule-response"));
        var proposal = pending.GetProperty("proposal");
        Assert.Equal(scheduleOptionId, proposal.GetProperty("scheduleOptionId").GetString());
        Assert.Equal("CONFIRM_SCHEDULE", proposal.GetProperty("action").GetString());
        var deadline = proposal.GetProperty("customerDeadlineUtc").GetDateTimeOffset();
        Assert.InRange(deadline - DateTimeOffset.UtcNow, TimeSpan.FromHours(23), TimeSpan.FromHours(24));
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PutAsync(customerPath, SubmissionTest.Body(input))).StatusCode);

        if (decision is null)
        {
            await using (var db = database.Context())
            {
                (await db.Set<RequestAssessment>().SingleAsync(x => x.ReviewID == reviewId)).CustomerDeadlineUtc = DateTime.UtcNow.AddSeconds(-1);
                await db.SaveChangesAsync();
            }
            Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsJsonAsync(customerPath + "/schedule-response",
                new { reviewId, requestRevision = 1, scheduleOptionId, decision = "ACCEPTED" })).StatusCode);
            using var scope = factory.Services.CreateScope();
            Assert.Equal(1, await scope.ServiceProvider.GetRequiredService<RequestAssessmentService>().ExpireAsync(default));
            var cancelled = await DataAsync(await customer.GetAsync(customerPath));
            Assert.Equal("CANCELLED", cancelled.GetProperty("status").GetString());
        }
        else
        {
            await DataAsync(await customer.PostAsJsonAsync(customerPath + "/schedule-response",
                new { reviewId, requestRevision = 1, scheduleOptionId, decision }));
            var afterResponse = await DataAsync(await customer.GetAsync(customerPath));
            Assert.Equal((decision == "ACCEPTED" ? alternative : original).ToString("yyyy-MM-dd"),
                afterResponse.GetProperty("expectedTransportDate").GetString());
        }

        var acceptance = await manager.PostAsJsonAsync(managerPath + "/accept", key);
        Assert.Equal(expected, acceptance.StatusCode);
        if (expected == HttpStatusCode.OK)
        {
            var accepted = await DataAsync(acceptance);
            Assert.Equal(alternative.ToString("yyyy-MM-dd"), accepted.GetProperty("expectedTransportDate").GetString());
            Assert.Equal("CONTRACT_PREPARATION", accepted.GetProperty("status").GetString());
            var draft = await DataAsync(await manager.PutAsJsonAsync(managerPath + "/contract-draft", new
            {
                mode = "AIR", departAt = alternative.ToString("yyyy-MM-dd HH:mm"),
                arriveAt = alternative.AddDays(2).ToString("yyyy-MM-dd HH:mm"), depositPct = 40,
                budget = new { TRANSPORT = 0, PROCEDURE = 0, VET = 0, INSURANCE = 0, STAFF = 0 },
                exception = "", note = "", items = new[] { new { amount = 1000000, desc = "Transport", required = true } },
                terms = new[] { new { title = "Payment", text = "Deposit is required before signature." } },
            }));
            var contractId = draft.GetProperty("contractId").GetString()!;
            var published = await DataAsync(await manager.PostAsJsonAsync(managerPath + "/contract/publish", new { versionNo = 1 }));
            var invoiceId = published.GetProperty("invoiceId").GetString()!;
            var changes = await manager.PostAsJsonAsync(managerPath + "/request-changes", new
            {
                reviewId, requestRevision = 1, action = "SUPPLEMENT_DOCUMENTS", feedback = "Please choose a later pickup date.",
            });
            Assert.Equal(HttpStatusCode.Conflict, changes.StatusCode);
            var version = await DataAsync(await manager.GetAsync($"/api/manager/contracts/{contractId}/versions/1"));
            Assert.Equal("ISSUED", version.GetProperty("versionStatus").GetString());
            Assert.Equal(HttpStatusCode.Conflict, (await customer.PutAsync(customerPath, SubmissionTest.Body(input))).StatusCode);

        }
        await using var finalDb = database.Context();
        Assert.False(await finalDb.Set<Trip>().AnyAsync(t => t.RequestID == requestId));
    }
}
