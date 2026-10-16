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
public sealed class CustomerContractAcceptanceController(ContractAcceptanceService service) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpPost("otp"), EnableRateLimiting("flow1-contract-otp")]
    public async Task<IActionResult> Otp(string id, ContractOtpInput input, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<ContractOtpView>.Ok(await service.SendOtpAsync(id, Actor, input, ct))); }
    [HttpPost("sign"), EnableRateLimiting("flow1-contract-otp")]
    public async Task<IActionResult> Sign(string id, ContractSignInput input, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<ContractAcceptanceView>.Ok(await service.SignAsync(id, Actor, Request.Headers["Idempotency-Key"].ToString(), input, ct))); }
    [HttpGet("acceptance")]
    public async Task<IActionResult> Get(string id, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<ContractAcceptanceView>.Ok(await service.GetAsync(id, Actor, false, ct))); }
}

[ApiController, Route("api/manager/contracts/{id}/acceptance"), Authorize(Roles = UserRoles.LogisticsManager), EnableRateLimiting("flow1-customer")]
public sealed class ManagerContractAcceptanceController(ContractAcceptanceService service) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet] public async Task<IActionResult> Get(string id, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<ContractAcceptanceView>.Ok(await service.GetAsync(id, Actor, true, ct))); }
    [HttpPost("recover")] public async Task<IActionResult> Recover(string id, CancellationToken ct) =>
        Ok(ApiResponse<ContractAcceptanceView>.Ok(await service.RecoverAsync(id, Actor, ct)));
    [HttpPost("discard")] public async Task<IActionResult> Discard(string id, DiscardPublicationInput input, CancellationToken ct) =>
        Ok(ApiResponse<ContractAcceptanceView>.Ok(await service.DiscardAsync(id, Actor, input.Reason, ct)));
}
