using System.Net;
using Application.Common.Exceptions;
using Application.Common.Flow1;
using Application.Flow1.Interfaces;
using Infrastructure.ExternalServices.Flow1;
using Xunit;

namespace Flow1.Tests;

public sealed class GeoapifyCityLocationsTests
{
    private const string Id = "51aaaaaaaaaaaaaaaaaaaa";
    private const string CanonicalId = "51bbbbbbbbbbbbbbbbbbbb";
    private const string Details = """{"features":[{"geometry":{"type":"Polygon"},"properties":{"country_code":"vn","place_id":"51bbbbbbbbbbbbbbbbbbbb","formatted":"Hanoi, Vietnam","datasource":{"raw":{"admin_level":4,"boundary":"administrative","osm_type":"r","osm_id":1903516}}}}]}""";
    private static string Membership(bool match) => """{"features":[{"properties":{"country_code":"vn","datasource":{"raw":{"osm_type":"r","osm_id":ID}}}}]}""".Replace("ID", match ? "1903516" : "999999");
    private sealed class Handler(Func<HttpRequestMessage, string> body) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body(request)) });
    }
    private static GeoapifyTransportMaps Maps(Func<HttpRequestMessage, string> body) => new(new(new Handler(body)),
        new Flow1MapOptions { Provider = "MAPBOX", DataProvider = "GEOAPIFY", MayPersistResults = true,
            Geoapify = new() { ApiKey = "fixture-key" } }, new(), new FlowClock());

    [Fact]
    public async Task Cities_returns_only_known_boundary_ids_in_the_selected_country()
    {
        var maps = Maps(request =>
        {
            if (request.RequestUri!.AbsolutePath.Contains("place-details")) return Details;
            var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(request.RequestUri.Query);
            Assert.Equal("locality", query["type"]); Assert.Equal("countrycode:vn", query["filter"]);
            Assert.Equal("vi", query["lang"]);
            return """{"results":[{"result_type":"city","country_code":"vn","place_id":"51aaaaaaaaaaaaaaaaaaaa"},{"result_type":"country","country_code":"vn","place_id":"51cccccccccccccccccccc"}]}""";
        });
        var city = Assert.Single(await maps.CitiesAsync("Hanoi", "VN", default));
        Assert.Equal(CanonicalId, city.CityId); Assert.Equal("GEOAPIFY", city.Provider);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Coordinate_membership_uses_real_boundary_identity_not_label_or_client_filter(bool match)
    {
        var maps = Maps(request =>
        {
            if (request.RequestUri!.AbsolutePath.Contains("place-details")) return Details;
            var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(request.RequestUri.Query);
            Assert.False(query.ContainsKey("filter")); Assert.False(query.ContainsKey("countrycodes"));
            Assert.Equal("21.03", query["lat"]); Assert.Equal("105.85", query["lon"]);
            return Membership(match);
        });
        var action = () => maps.VerifyCityAsync(new(105.85, 21.03, "VN"), Id, default);
        if (match) Assert.Equal(CanonicalId, (await action()).CityId);
        else Assert.Equal("CITY_MISMATCH", (await Assert.ThrowsAsync<BusinessRuleException>(action)).ErrorCode);
    }

    [Fact]
    public async Task Search_filters_by_country_and_boundary_and_drops_outside_results()
    {
        var maps = Maps(request =>
        {
            var uri = request.RequestUri!;
            if (uri.AbsolutePath.Contains("place-details")) return Details;
            if (uri.AbsolutePath.Contains("part-of")) return Membership(!uri.Query.Contains("10.8"));
            var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(uri.Query);
            Assert.Equal("countrycode:vn|place:" + CanonicalId, query["filter"]);
            Assert.Equal("q & filter=countrycode:th", query["text"]);
            return """{"results":[{"formatted":"Hanoi","country_code":"vn","lon":105.85,"lat":21.03},{"formatted":"HCMC","country_code":"vn","lon":106.6,"lat":10.8}]}""";
        });
        Assert.Equal("Hanoi", Assert.Single(await maps.SearchInCityAsync("q & filter=countrycode:th", "VN", Id, default)).Label);
    }

    [Theory]
    [InlineData("country")]
    [InlineData("level")]
    [InlineData("malformed")]
    public async Task Country_wide_non_boundary_and_malformed_ids_are_rejected(string scenario)
    {
        var maps = Maps(_ => scenario == "country" ? Details.Replace("\"vn\"", "\"jp\"")
            : Details.Replace("\"admin_level\":4", "\"admin_level\":2"));
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => maps.VerifyCityAsync(new(105.85, 21.03, "VN"), scenario == "malformed" ? "anything|countrycode:vn" : Id, default));
        Assert.Equal(scenario == "country" ? "COUNTRY_MISMATCH" : "INVALID_CITY", error.ErrorCode);
    }
}
