using System.Security.Claims;
using Application.DTOs;
using Application.DTOs.Flow1;
using Application.Services.Flow1;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace WebApi.Controllers.Flow1;

[ApiController, Route("api/customer/contracts/{id}/deadlines"), Authorize(Roles = UserRoles.Customer), EnableRateLimiting("flow1-customer")]
public sealed class CustomerContractDeadlineController(ContractDeadlineService service) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> Get(string id, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<ContractDeadlineView>.Ok(await service.GetAsync(id, User.FindFirstValue(ClaimTypes.NameIdentifier)!, false, ct))); }
}
[ApiController, Route("api/manager/contracts/{id}"), Authorize(Roles = UserRoles.LogisticsManager), EnableRateLimiting("flow1-customer")]
public sealed class ManagerContractDeadlineController(ContractDeadlineService service) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet("deadlines")] public async Task<IActionResult> Get(string id, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<ContractDeadlineView>.Ok(await service.GetAsync(id, Actor, true, ct))); }
    [HttpPost("extensions")] public async Task<IActionResult> Extend(string id, ExtendContractDeadlineInput input, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<ContractDeadlineView>.Ok(await service.ExtendAsync(id, Actor, Request.Headers["Idempotency-Key"].ToString(), input, ct))); }
}
