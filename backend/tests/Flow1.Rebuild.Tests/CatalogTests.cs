using Application.Common.Exceptions;
using Application.Flow1.Interfaces;
using Application.Flow1.Services;
using Domain.Flow1.Entities;
using Infrastructure.Flow1.Data;
using Xunit;

namespace Flow1.Rebuild.Tests;
public sealed class CatalogTests(SqlFixture database) : IClassFixture<SqlFixture>
{
    [Fact] public async Task New_country_and_route_work_from_database_and_inactive_country_blocks_provider_call()
    {
        await using var db = database.Context();
        db.Add(new Country { CountryCode="TH", CountryName="Thailand", IsActive=true });
        var route = new SupportedRoute { OriginCountry="VN", DestinationCountry="TH", TransportMode="AIR", IsActive=true };
        db.Add(route); await db.SaveChangesAsync();
        var session = new SqlSession(db); var access = new AccessService(session); var policy = new PolicyService(session);
        await new CatalogService(session,policy).ValidateAsync("VN","TH","AIR",default);
        var provider = new CaptureGeocoder(); var locations = new LocationService(session,access,provider);
        await locations.SearchAsync("USER_001","Bangkok","TH",default); Assert.Equal("TH",provider.Country);
        var country=await db.FindAsync<Country>("TH"); country!.IsActive=false; await db.SaveChangesAsync();
        provider.Country=null;
        await Assert.ThrowsAsync<BusinessRuleException>(()=>locations.SearchAsync("USER_001","Bangkok","TH",default));
        Assert.Null(provider.Country);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>new CatalogService(session,policy).ValidateAsync("VN","TH","AIR",default));
    }
    private sealed class CaptureGeocoder : IGeocodingProvider
    {
        public string? Country;
        public Task<IReadOnlyList<GeocodeCandidate>> SearchAsync(string address,string countryCode,CancellationToken ct=default)
        { Country=countryCode; return Task.FromResult<IReadOnlyList<GeocodeCandidate>>([new(address,new(100,13,countryCode),true,"Test provider")]); }
    }
}
