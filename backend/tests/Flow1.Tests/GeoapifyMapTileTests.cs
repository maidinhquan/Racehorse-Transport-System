using System.Net;
using System.Net.Http.Headers;
using Application.Common.Exceptions;
using Application.Common.Flow1;
using Infrastructure.ExternalServices.Flow1;
using Microsoft.Extensions.Caching.Memory;
using Xunit;

namespace Flow1.Tests;

public sealed class GeoapifyMapTileTests
{
    private static readonly byte[] Png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=");
    private sealed class Handler(Func<HttpRequestMessage, HttpResponseMessage> reply) : HttpMessageHandler
    {
        public int Calls { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        { Calls++; return Task.FromResult(reply(request)); }
    }
    private static GeoapifyTransportMaps Maps(Handler handler) => new(new(handler), new Flow1MapOptions
    { Geoapify = new() { ApiKey = "test-key-only" }, MayPersistResults = true }, new(), TimeProvider.System,
        new MemoryCache(new MemoryCacheOptions()));

    [Fact]
    public async Task Valid_tile_uses_configured_key_and_cache()
    {
        var handler = new Handler(request =>
        {
            Assert.Equal("maps.geoapify.com", request.RequestUri!.Host);
            Assert.Equal("/v1/tile/osm-bright/4/8/7.png", request.RequestUri.AbsolutePath);
            Assert.Contains("apiKey=test-key-only", request.RequestUri.Query);
            var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(Png) };
            response.Content.Headers.ContentType = new MediaTypeHeaderValue("image/png");
            return response;
        });
        var maps = Maps(handler);
        Assert.Equal(Png, await maps.TileAsync(4, 8, 7, default));
        Assert.Equal(Png, await maps.TileAsync(4, 8, 7, default));
        Assert.Equal(1, handler.Calls);
    }

    [Theory]
    [InlineData(-1, 0, 0)]
    [InlineData(20, 0, 0)]
    [InlineData(4, 16, 0)]
    [InlineData(4, 0, -1)]
    public async Task Invalid_coordinates_never_call_provider(int z, int x, int y)
    {
        var handler = new Handler(_ => throw new Exception("Must not call network"));
        Assert.Equal("VALIDATION_ERROR", (await Assert.ThrowsAsync<BusinessRuleException>(() => Maps(handler).TileAsync(z, x, y, default))).ErrorCode);
        Assert.Equal(0, handler.Calls);
    }

    [Theory]
    [InlineData(403)]
    [InlineData(429)]
    [InlineData(200)]
    public async Task Provider_errors_or_non_png_content_are_not_returned_as_map_images(int status)
    {
        var handler = new Handler(_ => new HttpResponseMessage((HttpStatusCode)status) { Content = new StringContent("secret provider diagnostic") });
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => Maps(handler).TileAsync(4, 8, 7, default));
        Assert.DoesNotContain("secret", error.Message);
        Assert.DoesNotContain("test-key-only", error.Message);
    }
}
