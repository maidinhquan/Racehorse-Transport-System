using System.Security.Claims;
using Application.DTOs;
using Application.DTOs.Flow1;
using Application.Services.Flow1;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace WebApi.Controllers.Flow1;

[ApiController, Route("api/manager/contracts/{id}"), Authorize(Roles = UserRoles.LogisticsManager), EnableRateLimiting("flow1-customer")]
public sealed class ManagerContractPublicationController(ContractPublicationService service) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpPost("send")] public async Task<IActionResult> Send(string id, PublishContractInput input, CancellationToken ct) =>
        Ok(ApiResponse<PublishedContractView>.Ok(await service.PublishAsync(id, Actor, Request.Headers["Idempotency-Key"].ToString(), input, ct)));
    [HttpGet("publication")] public async Task<IActionResult> Get(string id, CancellationToken ct) =>
        Ok(ApiResponse<PublishedContractView?>.Ok(await service.GetAsync(id, Actor, true, ct)));
    [HttpGet("pdf")] public async Task<IActionResult> Pdf(string id, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; Response.Headers.XContentTypeOptions = "nosniff"; return File(await service.PdfAsync(id, Actor, true, ct), "application/pdf", id + ".pdf"); }
}

[ApiController, Route("api/customer/contracts/{id}"), Authorize(Roles = UserRoles.Customer), EnableRateLimiting("flow1-customer")]
public sealed class CustomerContractPublicationController(ContractPublicationService service) : ControllerBase
{
    [HttpGet("publication")] public async Task<IActionResult> Get(string id, CancellationToken ct) =>
        Ok(ApiResponse<PublishedContractView?>.Ok(await service.GetAsync(id, User.FindFirstValue(ClaimTypes.NameIdentifier)!, false, ct)));
    [HttpGet("pdf")] public async Task<IActionResult> Pdf(string id, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; Response.Headers.XContentTypeOptions = "nosniff"; return File(await service.PdfAsync(id, User.FindFirstValue(ClaimTypes.NameIdentifier)!, false, ct), "application/pdf", id + ".pdf"); }
}
