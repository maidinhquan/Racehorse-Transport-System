using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Application.Flow1.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace WebApi.Controllers.Flow1;

[Route("api"), Authorize, EnableRateLimiting("flow1-customer")]
public sealed class CancellationsController(CancellationService cancellations) : EndpointController
{
    [HttpPost("customer/requests/{requestId}/cancel")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> CustomerCancelAsync(string requestId, ReasonInput input, CancellationToken ct) =>
        Reply(await cancellations.RequestAsync(Actor, requestId, false, input.Reason, ct));

    [HttpPost("manager/requests/{requestId}/cancel")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ManagerCancelAsync(string requestId, ReasonInput input, CancellationToken ct) =>
        Reply(await cancellations.RequestAsync(Actor, requestId, true, input.Reason, ct));

    [HttpPost("manager/contracts/{contractId}/cancellation/decision")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> DecideAsync(string contractId, CancellationDecision input, CancellationToken ct) =>
        Reply(await cancellations.DecideAsync(Actor, contractId, input.Decision, input.Reason, ct));

    [HttpPost("manager/contracts/{contractId}/refund/complete")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> RefundAsync(string contractId, CancellationToken ct) =>
        Reply(await cancellations.CompleteRefundAsync(Actor, contractId, ct));

}
