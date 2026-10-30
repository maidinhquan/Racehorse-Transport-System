using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Application.Flow1.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace WebApi.Controllers.Flow1;

[Route("api"), Authorize, EnableRateLimiting("flow1-customer")]
public sealed class HorsesController(HorseService horses, HorseAvailabilityService availability) : EndpointController
{
    [HttpGet("customer/horses")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> CustomerHorsesAsync(CancellationToken ct) =>
        Reply(await horses.ListAsync(Actor, false, ct));

    [HttpGet("manager/horses")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ManagerHorsesAsync(CancellationToken ct) =>
        Reply(await horses.ListAsync(Actor, true, ct));

    [HttpPost("customer/horses")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> CreateAsync(HorseInput input, CancellationToken ct) =>
        Reply(await horses.SaveAsync(Actor, null, input, ct), 201);

    [HttpGet("customer/horses/{horseId}")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> DetailAsync(string horseId, CancellationToken ct) =>
        Reply(await horses.GetAsync(Actor, horseId, ct));

    [HttpPut("customer/horses/{horseId}")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> UpdateAsync(string horseId, HorseInput input, CancellationToken ct) =>
        Reply(await horses.SaveAsync(Actor, horseId, input, ct));

    [HttpGet("customer/horses/selectable")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> SelectableAsync([FromQuery] string expectedTransportDate, [FromQuery] string expectedDeliveryDate, CancellationToken ct,
        [FromQuery] string? excludeRequestId = null) =>
        Reply(await availability.SelectAsync(Actor, expectedTransportDate, expectedDeliveryDate, ct, excludeRequestId));

}
