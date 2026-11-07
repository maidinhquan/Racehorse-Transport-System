using System.Net;
using Xunit;

namespace Flow1.Rebuild.Tests;

public sealed class MapPreviewQueryTests(SqlFixture database) : IClassFixture<SqlFixture>
{
    [Theory]
    [InlineData("lat=21.0278")]
    [InlineData("lng=105.8342")]
    [InlineData("")]
    public async Task Preview_requires_both_coordinates_instead_of_defaulting_to_zero(string query)
    {
        using var factory = new ApiFactory(database);
        using var client = factory.CreateClient();
        var response = await client.GetAsync("/api/public/maps/mapbox-preview?" + query);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
