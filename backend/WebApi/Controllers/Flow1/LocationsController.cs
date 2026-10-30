using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Application.Flow1.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace WebApi.Controllers.Flow1;

[Route("api"), Authorize, EnableRateLimiting("flow1-customer")]
public sealed class LocationsController(LocationService locations) : EndpointController
{
    [HttpGet("locations/search")]
    public async Task<IActionResult> SearchAsync([FromQuery] string q, [FromQuery] string country,
        [FromQuery, System.ComponentModel.DataAnnotations.Required] string cityId, CancellationToken ct) =>
        Reply(await locations.SearchAsync(Actor, q, country, cityId, ct));

    [HttpGet("locations/cities")]
    public async Task<IActionResult> CitiesAsync([FromQuery] string q, [FromQuery] string country, CancellationToken ct) =>
        Reply(await locations.CitiesAsync(Actor, q, country, ct));

}
