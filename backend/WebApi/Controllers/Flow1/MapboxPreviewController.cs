using Application.Common.Flow1;
using Infrastructure.ExternalServices.Flow1;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.RateLimiting;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace WebApi.Controllers.Flow1;

[ApiController, Route("api/public/maps/mapbox-preview"), EnableRateLimiting("flow1-customer")]
public sealed class MapboxPreviewController(MapboxTransportMaps maps, Flow1MapOptions options) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery, BindRequired] double lat, [FromQuery, BindRequired] double lng, CancellationToken ct)
    {
        if (!string.Equals(options.Provider, "MAPBOX", StringComparison.OrdinalIgnoreCase))
            throw Error("Map preview is not available for the selected provider.", "NOT_FOUND", 404);
        var image = await maps.PreviewAsync(lng, lat, ct);
        Response.Headers.CacheControl = "no-store";
        Response.Headers.XContentTypeOptions = "nosniff";
        return File(image, "image/png");
    }
}
