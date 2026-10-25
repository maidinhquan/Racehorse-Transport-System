using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Application.Flow1.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace WebApi.Controllers.Flow1;

[Route("api"), Authorize, EnableRateLimiting("flow1-customer")]
public sealed class RequestsController(RequestService requests, RequestDetailsService details) : EndpointController
{
    [HttpGet("customer/requests")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> CustomerRequestsAsync(CancellationToken ct) =>
        Reply(await requests.ListAsync(Actor, false, ct));

    [HttpGet("customer/requests/{requestId}")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> CustomerRequestAsync(string requestId, CancellationToken ct) =>
        Reply(await details.GetAsync(Actor, requestId, false, ct));

    [HttpGet("manager/requests")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ManagerRequestsAsync(CancellationToken ct) =>
        Reply(await requests.ListAsync(Actor, true, ct));

    [HttpGet("manager/requests/{requestId}")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ManagerRequestAsync(string requestId, CancellationToken ct) =>
        Reply(await details.GetAsync(Actor, requestId, true, ct));

    [HttpPost("customer/requests")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> CreateAsync(RequestDraftInput input, CancellationToken ct) =>
        Reply(await requests.CreateAsync(Actor, IdempotencyKey, input, ct), 201);

    [HttpPut("customer/requests/{requestId}")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> UpdateAsync(string requestId, RequestUpdateInput input, CancellationToken ct) =>
        Reply(await requests.UpdateAsync(Actor, requestId, input, ct));

    [HttpPost("customer/requests/{requestId}/submit")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> SubmitAsync(string requestId, CancellationToken ct) =>
        Reply(await requests.SubmitAsync(Actor, requestId, ct));

}
