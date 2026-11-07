using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Application.Flow1.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace WebApi.Controllers.Flow1;

[Route("api"), Authorize, EnableRateLimiting("flow1-customer")]
public sealed class RequestReviewsController(RequestReviewService reviews) : EndpointController
{
    [HttpPost("manager/requests/{requestId}/accept")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> AcceptAsync(string requestId, CancellationToken ct) =>
        Reply(await reviews.AcceptAsync(Actor, requestId, ct));

    [HttpPost("manager/requests/{requestId}/request-changes")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ChangesAsync(string requestId, ReviewInput input, CancellationToken ct) =>
        Reply(await reviews.ChangesAsync(Actor, requestId, input.Feedback, ct));

    [HttpPost("manager/requests/{requestId}/reject")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> RejectAsync(string requestId, ReasonInput input, CancellationToken ct) =>
        Reply(await reviews.RejectAsync(Actor, requestId, input.Reason, ct));

}
