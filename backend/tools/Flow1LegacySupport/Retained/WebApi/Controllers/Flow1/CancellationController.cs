using System.Security.Claims;
using Application.DTOs;
using Application.DTOs.Flow1;
using Application.Services.Flow1;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace WebApi.Controllers.Flow1;

[ApiController, Route("api/customer/contracts/{id}/cancellation-requests"), Authorize(Roles = UserRoles.Customer), EnableRateLimiting("flow1-customer")]
public sealed class CustomerCancellationController(DepositPaymentService service) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet] public async Task<IActionResult> Get(string id, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<CancellationsView>.Ok(await service.CancellationsAsync(id, Actor, false, ct))); }
    [HttpPost] public async Task<IActionResult> RequestCancellation(string id, RequestCancellationInput input, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<CancellationsView>.Ok(await service.RequestCancellationAsync(id, Actor, Request.Headers["Idempotency-Key"].ToString(), input, ct))); }
}
[ApiController, Route("api/manager/contracts/{id}/cancellation-requests"), Authorize(Roles = UserRoles.LogisticsManager), EnableRateLimiting("flow1-customer")]
public sealed class ManagerCancellationController(DepositPaymentService service) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet] public async Task<IActionResult> Get(string id, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<CancellationsView>.Ok(await service.CancellationsAsync(id, Actor, true, ct))); }
    [HttpPost("{cancellationId}/approve")] public Task<IActionResult> Approve(string id, string cancellationId, DecideCancellationInput input, CancellationToken ct) => Decide(id, cancellationId, input, true, ct);
    [HttpPost("{cancellationId}/reject")] public Task<IActionResult> Reject(string id, string cancellationId, DecideCancellationInput input, CancellationToken ct) => Decide(id, cancellationId, input, false, ct);
    private async Task<IActionResult> Decide(string id, string cancellationId, DecideCancellationInput input, bool approve, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<CancellationsView>.Ok(await service.DecideCancellationAsync(id, cancellationId, Actor,
        Request.Headers["Idempotency-Key"].ToString(), approve, input, ct))); }
}
