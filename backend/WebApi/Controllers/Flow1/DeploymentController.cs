using System.Security.Claims;
using Application.DTOs;
using Application.DTOs.Flow1;
using Application.Services.Flow1;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace WebApi.Controllers.Flow1;

[ApiController, Route("api/manager/contracts/{id}/deployment"), Authorize(Roles = UserRoles.LogisticsManager), EnableRateLimiting("flow1-customer")]
public sealed class ManagerDeploymentController(DeploymentService service) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet] public async Task<IActionResult> Get(string id, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<DeploymentView>.Ok(await service.GetAsync(id, Actor, true, ct))); }
    [HttpPost("{actionName}")] public async Task<IActionResult> Act(string id, string actionName, DeploymentInput input, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<DeploymentView>.Ok(await service.ActAsync(id, Actor, Request.Headers["Idempotency-Key"].ToString(), actionName, input, ct))); }
}
[ApiController, Route("api/customer/contracts/{id}/deployment"), Authorize(Roles = UserRoles.Customer), EnableRateLimiting("flow1-customer")]
public sealed class CustomerDeploymentController(DeploymentService service) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> Get(string id, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<DeploymentView>.Ok(await service.GetAsync(id, User.FindFirstValue(ClaimTypes.NameIdentifier)!, false, ct))); }
}
[ApiController, Route("api/operations"), Authorize(Roles = UserRoles.LogisticsManager + "," + UserRoles.FleetRouteCoordinator + "," + UserRoles.TransportSpecialist), EnableRateLimiting("flow1-customer")]
public sealed class Flow1HandoffController(DeploymentService service) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet("flow1-work")] public async Task<IActionResult> Queue(CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<DeploymentView[]>.Ok(await service.QueueAsync(Actor, ct))); }
    [HttpGet("trips/{tripId}/flow1-handoff")] public async Task<IActionResult> Handoff(string tripId, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<Flow1Handoff>.Ok(await service.HandoffAsync(tripId, Actor, ct))); }
    [HttpPost("trips/{tripId}/flow1-handoff/acknowledgements")]
    public async Task<IActionResult> Acknowledge(string tripId, HandoffAckInput input, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<Flow1Handoff>.Ok(await service.AcknowledgeAsync(tripId, Actor, User.FindFirstValue(ClaimTypes.Role)!,
        Request.Headers["Idempotency-Key"].ToString(), input, ct))); }
    [HttpGet("trips/{tripId}/horses/{horseId}/documents/{version:int}/{kind}")]
    public async Task<IActionResult> Document(string tripId, string horseId, int version, string kind, CancellationToken ct)
    {
        var file = await service.DocumentAsync(tripId, Actor, horseId, version, kind, ct);
        Response.Headers.CacheControl = "no-store"; Response.Headers.XContentTypeOptions = "nosniff";
        return File(file.Bytes, file.ContentType, "horse-" + kind + CustomerDepositPaymentsController.Extension(file.ContentType));
    }
}
