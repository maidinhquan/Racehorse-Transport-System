using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Application.Flow1.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace WebApi.Controllers.Flow1;

[Route("api"), Authorize, EnableRateLimiting("flow1-customer")]
public sealed class ContractSigningController(ContractSigningService signing) : EndpointController
{
    [HttpPost("customer/contracts/{contractId}/sign-otp")]
    [Authorize(Roles = UserRoles.Customer)]
    [EnableRateLimiting("flow1-contract-otp")]
    public async Task<IActionResult> SendAsync(string contractId, VersionInput input, CancellationToken ct) =>
        Reply(await signing.SendAsync(Actor, contractId, input.VersionNo, ct));

    [HttpPost("customer/contracts/{contractId}/sign")]
    [Authorize(Roles = UserRoles.Customer)]
    [EnableRateLimiting("flow1-contract-otp")]
    public async Task<IActionResult> SignAsync(string contractId, SignInput input, CancellationToken ct) =>
        Reply(await signing.SignAsync(Actor, contractId, input, ct));

}
