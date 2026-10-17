using System.Security.Claims;
using Application.DTOs;
using Application.DTOs.Flow1;
using Application.Services.Flow1;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace WebApi.Controllers.Flow1;

[ApiController, Route("api/customer/contracts/{id}"), Authorize(Roles = UserRoles.Customer), EnableRateLimiting("flow1-customer")]
public sealed class CustomerContractLifecycleController(ContractLifecycleService service) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet("lifecycle")] public async Task<IActionResult> Get(string id, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<ContractLifecycleView>.Ok(await service.GetAsync(id, Actor, false, ct))); }
    [HttpPost("decline")] public async Task<IActionResult> Decline(string id, ContractLifecycleCommand input, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<ContractLifecycleView>.Ok(await service.CloseAsync(id, Actor, false, Request.Headers["Idempotency-Key"].ToString(), input, ct))); }
}
[ApiController, Route("api/manager/contracts/{id}"), Authorize(Roles = UserRoles.LogisticsManager), EnableRateLimiting("flow1-customer")]
public sealed class ManagerContractLifecycleController(ContractLifecycleService service) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet("lifecycle")] public async Task<IActionResult> Get(string id, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<ContractLifecycleView>.Ok(await service.GetAsync(id, Actor, true, ct))); }
    [HttpPost("expire")] public async Task<IActionResult> Expire(string id, ContractLifecycleCommand input, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<ContractLifecycleView>.Ok(await service.CloseAsync(id, Actor, true, Request.Headers["Idempotency-Key"].ToString(), input, ct))); }
}
