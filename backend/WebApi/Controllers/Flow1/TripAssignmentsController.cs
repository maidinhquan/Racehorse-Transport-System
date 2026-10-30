using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Application.Flow1.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace WebApi.Controllers.Flow1;

[Route("api"), Authorize, EnableRateLimiting("flow1-customer")]
public sealed class TripAssignmentsController(TripAssignmentService trips) : EndpointController
{
    [HttpGet("manager/trips")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ListAsync(CancellationToken ct) =>
        Reply(await trips.ListAsync(Actor, ct));

    [HttpGet("manager/trips/{tripId}")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> DetailAsync(string tripId, CancellationToken ct) =>
        Reply(await trips.DetailAsync(Actor, tripId, ct));

    [HttpPost("manager/trips/{tripId}/assignment")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> AssignAsync(string tripId, AssignmentInput input, CancellationToken ct) =>
        Reply(await trips.AssignAsync(Actor, tripId, input, ct));

    [HttpPost("manager/trips/{tripId}/hold")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> HoldAsync(string tripId, ReasonInput input, CancellationToken ct) =>
        Reply(await trips.HoldAsync(Actor, tripId, input.Reason, ct));

    [HttpPost("manager/trips/{tripId}/resume")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ResumeAsync(string tripId, CancellationToken ct) =>
        Reply(await trips.ResumeAsync(Actor, tripId, ct));

}
