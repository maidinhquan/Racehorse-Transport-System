using Application.Common.Exceptions;
using Application.Flow1.Interfaces;
using Application.Flow1.Services;
using Domain.Flow1.Entities;
using Infrastructure.Flow1.Data;
using Xunit;

namespace Flow1.Rebuild.Tests;
public sealed class CatalogTests(SqlFixture database) : IClassFixture<SqlFixture>
{
    [Fact] public async Task Form_options_for_a_selected_route_return_only_that_route_and_its_policies()
    {
        using var factory = new ApiFactory(database); using var client = factory.Customer();
        var response = await client.GetAsync("/api/customer/request-form-options?originCountry=VN&destinationCountry=JP&mode=AIR");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        using var json = System.Text.Json.JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = json.RootElement.GetProperty("data");
        Assert.False(data.TryGetProperty("supportedRoutes", out _));
        var route = data.GetProperty("selectedRoute");
        Assert.Equal("VN", route.GetProperty("originCountry").GetString());
        Assert.Equal("JP", route.GetProperty("destinationCountry").GetString());
        Assert.Equal("AIR", route.GetProperty("mode").GetString());
        Assert.Equal(7, data.GetProperty("preparationDays").GetDecimal());
        Assert.True(data.GetProperty("defaultDepositPct").GetDecimal() > 0);
        Assert.True(data.GetProperty("contractDeadlineHours").GetDecimal() > 0);

        var initial = await client.GetAsync("/api/customer/request-form-options");
        Assert.True(initial.IsSuccessStatusCode, await initial.Content.ReadAsStringAsync());
        using var initialJson = System.Text.Json.JsonDocument.Parse(await initial.Content.ReadAsStringAsync());
        Assert.True(initialJson.RootElement.GetProperty("data").GetProperty("supportedRoutes").GetArrayLength() > 0);
        Assert.False(initialJson.RootElement.GetProperty("data").TryGetProperty("selectedRoute", out _));
    }

    [Theory]
    [InlineData("originCountry=VN")]
    [InlineData("originCountry=VN&destinationCountry=JP")]
    [InlineData("originCountry=VN&destinationCountry=JP&mode=ROAD")]
    public async Task Partial_or_unsupported_route_selection_is_rejected(string query)
    {
        using var factory = new ApiFactory(database); using var client = factory.Customer();
        Assert.Equal(System.Net.HttpStatusCode.BadRequest,
            (await client.GetAsync("/api/customer/request-form-options?" + query)).StatusCode);
    }

    [Fact] public async Task New_country_and_route_work_from_database_and_inactive_country_blocks_provider_call()
    {
        await using var db = database.Context();
        db.Add(new Country { CountryCode="TH", CountryName="Thailand", IsActive=true });
        var route = new SupportedRoute { OriginCountry="VN", DestinationCountry="TH", TransportMode="AIR", IsActive=true };
        db.Add(route); await db.SaveChangesAsync();
        var session = new SqlSession(db); var access = new AccessService(session); var policy = new PolicyService(session);
        await new CatalogService(session,policy).ValidateAsync("VN","TH","AIR",default);
        var provider = new CaptureGeocoder(); var locations = new LocationService(session,access,provider);
        await locations.SearchAsync("USER_001","Bangkok","TH","fixture-bangkok",default); Assert.Equal("TH",provider.Country);
        var country=await db.FindAsync<Country>("TH"); country!.IsActive=false; await db.SaveChangesAsync();
        provider.Country=null;
        await Assert.ThrowsAsync<BusinessRuleException>(()=>locations.SearchAsync("USER_001","Bangkok","TH","fixture-bangkok",default));
        Assert.Null(provider.Country);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>new CatalogService(session,policy).ValidateAsync("VN","TH","AIR",default));
    }
    private sealed class CaptureGeocoder : IGeocodingProvider, ICityLocations
    {
        public string? Country;
        public Task<IReadOnlyList<CitySelection>> CitiesAsync(string query, string country, CancellationToken ct) => throw new NotSupportedException();
        public Task<CitySelection> VerifyCityAsync(MapPoint point, string cityId, CancellationToken ct) => throw new NotSupportedException();
        public Task<IReadOnlyList<GeocodeCandidate>> SearchInCityAsync(string query, string country, string cityId, CancellationToken ct) => SearchAsync(query, country, ct);
        public Task<IReadOnlyList<GeocodeCandidate>> SearchAsync(string address,string countryCode,CancellationToken ct=default)
        { Country=countryCode; return Task.FromResult<IReadOnlyList<GeocodeCandidate>>([new(address,new(100,13,countryCode),true,"Test provider")]); }
    }
}
