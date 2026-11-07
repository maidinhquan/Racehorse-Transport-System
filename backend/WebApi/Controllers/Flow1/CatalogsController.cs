using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Application.Flow1.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace WebApi.Controllers.Flow1;

[Route("api"), Authorize, EnableRateLimiting("flow1-customer")]
public sealed class CatalogsController(CatalogService catalogs) : EndpointController
{
    [HttpGet("master/supported-routes")]
    public async Task<IActionResult> RoutesAsync(CancellationToken ct) =>
        Reply(await CatalogRoutes(ct));

    [HttpGet("customer/request-form-options")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> OptionsAsync([FromQuery] string? originCountry, [FromQuery] string? destinationCountry, [FromQuery] string? mode, CancellationToken ct) =>
        Reply(await catalogs.OptionsAsync(originCountry, destinationCountry, mode, ct));

    private async Task<object> CatalogRoutes(CancellationToken ct) => (await catalogs.RoutesAsync(ct)).Select(r =>
        new { id = r.RouteID, originCountry = r.OriginCountry, destinationCountry = r.DestinationCountry, mode = r.TransportMode }).ToArray();
}
