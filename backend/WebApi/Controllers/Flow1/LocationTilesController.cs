using Application.Flow1.Interfaces;
using Application.Flow1.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace WebApi.Controllers.Flow1;

[Route("api/locations/tiles"), Authorize, EnableRateLimiting("flow1-map-tiles")]
public sealed class LocationTilesController(IMapTiles tiles, AccessService access) : EndpointController
{
    [HttpGet("{z:int}/{x:int}/{y:int}.png")]
    public async Task<IActionResult> TileAsync(int z, int x, int y, CancellationToken ct)
    {
        await access.AccountAsync(Actor, null, ct);
        var bytes = await tiles.TileAsync(z, x, y, ct);
        Response.Headers.CacheControl = "private,max-age=3600";
        return File(bytes, "image/png");
    }
}
