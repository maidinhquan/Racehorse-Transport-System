using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Flow1.Rebuild.Tests;

public sealed class RequestScheduleTests(SqlFixture database) : IClassFixture<SqlFixture>
{
    private static async Task<JsonElement> Data(HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, text);
        return JsonDocument.Parse(text).RootElement.GetProperty("data").Clone();
    }

    [Fact]
    public async Task Required_range_is_validated_and_both_dates_and_creation_time_survive_reload()
    {
        using var factory = new ApiFactory(database); using var client = factory.Customer();
        client.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        await SubmissionTest.ReadyHorseAsync(database);
        object Input(string start, string end) => new { origin = "Hanoi", destination = "Tokyo", originCountry = "VN",
            destinationCountry = "JP", mode = "AIR", expectedTransportDate = start, expectedDeliveryDate = end, careInstructions = "Care" };
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/customer/requests", SubmissionTest.Body( new {
            origin = "Hanoi", destination = "Tokyo", originCountry = "VN", destinationCountry = "JP", mode = "AIR",
            expectedTransportDate = "2027-12-25", careInstructions = "Care" }))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/customer/requests", SubmissionTest.Body( Input("2027-12-25", "2027-12-24")))).StatusCode);
        var created = await Data(await client.PostAsync("/api/customer/requests", SubmissionTest.Body( Input("2027-12-25", "2027-12-25"))));
        var id = created.GetProperty("id").GetString()!;
        Assert.Equal("2027-12-25", created.GetProperty("expectedDeliveryDate").GetString());
        Assert.EndsWith("Z", created.GetProperty("createdAt").GetString());
        var retry = await Data(await client.PostAsync("/api/customer/requests", SubmissionTest.Body( Input("2027-12-25", "2027-12-25"))));
        Assert.Equal(created.GetProperty("createdAt").GetString(), retry.GetProperty("createdAt").GetString());
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsync("/api/customer/requests", SubmissionTest.Body( Input("2027-12-25", "2027-12-26")))).StatusCode);
        await using var db = database.Context();
        var stored = await db.Set<TransportRequest>().SingleAsync(x => x.RequestID == id);
        Assert.Equal(new DateTime(2027, 12, 25), stored.ExpectedDate);
        Assert.Equal(stored.ExpectedDate, stored.CommittedDeadline);
        Assert.NotNull(stored.CreatedAtUtc);
    }

    [Fact]
    public async Task Selectable_checks_the_entire_range_and_drafts_do_not_block_editing()
    {
        using var factory = new ApiFactory(database); using var client = factory.Customer();
        client.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        await SubmissionTest.ReadyHorseAsync(database);
        var created = await Data(await client.PostAsync("/api/customer/requests", SubmissionTest.Body( new { origin = "Hanoi", destination = "Tokyo",
            originCountry = "VN", destinationCountry = "JP", mode = "AIR", expectedTransportDate = "2028-01-10", expectedDeliveryDate = "2028-01-15", careInstructions = "Care" })));
        var id = created.GetProperty("id").GetString()!;
        await using (var db = database.Context())
        {
            var request = await db.Set<TransportRequest>().SingleAsync(x => x.RequestID == id);
            request.Status = "PENDING_REVIEW";
            await db.SaveChangesAsync();
        }
        foreach (var (start, end, available) in new[] {
            ("2028-01-01", "2028-01-09", true), ("2028-01-01", "2028-01-10", false),
            ("2028-01-11", "2028-01-12", false), ("2028-01-01", "2028-01-20", false),
            ("2028-01-16", "2028-01-20", true) })
        {
            var horses = await Data(await client.GetAsync($"/api/customer/horses/selectable?expectedTransportDate={start}&expectedDeliveryDate={end}"));
            Assert.Equal(available, horses.EnumerateArray().Single(h => h.GetProperty("id").GetString() == "HORSE_001").GetProperty("selectable").GetBoolean());
        }
        foreach (var status in new[] { "DRAFT", "CHANGES_REQUESTED" })
        {
            await using (var db = database.Context())
            {
                var request = await db.Set<TransportRequest>().SingleAsync(x => x.RequestID == id);
                request.Status = status;
                await db.SaveChangesAsync();
            }
            var editable = await Data(await client.GetAsync("/api/customer/horses/selectable?expectedTransportDate=2028-01-11&expectedDeliveryDate=2028-01-12"));
            Assert.True(editable.EnumerateArray().Single(h => h.GetProperty("id").GetString() == "HORSE_001").GetProperty("selectable").GetBoolean());
        }
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/customer/horses/selectable?expectedTransportDate=2028-01-12&expectedDeliveryDate=2028-01-11")).StatusCode);
    }
}
