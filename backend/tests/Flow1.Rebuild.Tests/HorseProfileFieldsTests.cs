using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Application.Flow1.Dtos;
using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Flow1.Rebuild.Tests;

public sealed class HorseProfileFieldsTests(SqlFixture database) : IClassFixture<SqlFixture>
{
    private static HorseInput Input() => new("Profile fields", "Arabian", "MARE", "2020-01-01",
        "982" + DateTime.UtcNow.Ticks.ToString()[^12..], "100000000", "VND",
        new("TEST-PASSPORT", "Authority", "2021-01-01", "2035-01-01"), "", "NOT_PREGNANT", 485.25m);

    private static async Task<JsonElement> Data(HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, text);
        return JsonDocument.Parse(text).RootElement.GetProperty("data").Clone();
    }

    [Fact]
    public async Task Create_update_and_reload_preserve_reproduction_and_weight()
    {
        using var factory = new ApiFactory(database); using var client = factory.Customer();
        var input = Input();
        var created = await Data(await client.PostAsJsonAsync("/api/customer/horses", input));
        var id = created.GetProperty("id").GetString();
        Assert.Equal("NOT_PREGNANT", created.GetProperty("reproductiveStatus").GetString());
        Assert.Equal(485.25m, created.GetProperty("weight").GetDecimal());
        await Data(await client.PutAsJsonAsync($"/api/customer/horses/{id}", input with { ReproductiveStatus = "PREGNANT", Weight = 510.50m }));
        var read = await Data(await client.GetAsync($"/api/customer/horses/{id}"));
        Assert.Equal("PREGNANT", read.GetProperty("reproductiveStatus").GetString());
        Assert.Equal(510.50m, read.GetProperty("weight").GetDecimal());
        await using var db = database.Context();
        var horse = await db.Set<Horse>().AsNoTracking().SingleAsync(h => h.HorseID == id);
        Assert.Equal("PREGNANT", horse.ReproductiveStatus); Assert.Equal(510.50m, horse.Weight);
    }

    [Theory]
    [InlineData("UNKNOWN", 500)]
    [InlineData("INTACT", 0)]
    [InlineData("INTACT", -1)]
    [InlineData("INTACT", 500.123)]
    [InlineData("INTACT", 100000000)]
    public async Task Invalid_reproduction_or_weight_is_rejected(string status, decimal weight)
    {
        using var factory = new ApiFactory(database); using var client = factory.Customer();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/customer/horses",
            Input() with { ReproductiveStatus = status, Weight = weight })).StatusCode);
    }
}
