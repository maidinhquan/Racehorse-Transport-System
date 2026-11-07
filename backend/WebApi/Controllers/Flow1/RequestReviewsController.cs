using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace WebApi.Controllers.Flow1;

[Route("api"), Authorize, EnableRateLimiting("flow1-customer")]
public sealed class RequestReviewsController(RequestAssessmentService reviews) : EndpointController
{
    [HttpGet("manager/requests/{requestId}/reviews")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ManagerAsync(string requestId, CancellationToken ct) =>
        Reply(await reviews.ManagerAsync(Actor, requestId, ct));

    [HttpPost("manager/requests/{requestId}/reviews")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> AssignAsync(string requestId, AssignRequestReviewInput input, CancellationToken ct) =>
        Reply(await reviews.AssignAsync(Actor, requestId, input, ct), 201);

    [HttpPost("manager/requests/{requestId}/accept")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> AcceptAsync(string requestId, AcceptRequestReviewInput input, CancellationToken ct) =>
        Reply(await reviews.AcceptAsync(Actor, requestId, input, ct));

    [HttpPost("manager/requests/{requestId}/request-changes")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ChangesAsync(string requestId, ReviewInput input, CancellationToken ct) =>
        Reply(await reviews.ChangesAsync(Actor, requestId, input, ct));

    [HttpPost("manager/requests/{requestId}/reject")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> RejectAsync(string requestId, ReasonInput input, CancellationToken ct) =>
        Reply(await reviews.RejectAsync(Actor, requestId, input.Reason, ct));

    [HttpGet("coordinator/request-reviews")]
    [Authorize(Roles = UserRoles.FleetRouteCoordinator)]
    public async Task<IActionResult> CoordinatorQueueAsync(CancellationToken ct) =>
        Reply(await reviews.QueueAsync(Actor, UserRoles.FleetRouteCoordinator, ct));

    [HttpGet("coordinator/request-reviews/{reviewId}")]
    [Authorize(Roles = UserRoles.FleetRouteCoordinator)]
    public async Task<IActionResult> CoordinatorAsync(string reviewId, CancellationToken ct) =>
        Reply(await reviews.DetailAsync(Actor, reviewId, UserRoles.FleetRouteCoordinator, ct));

    [HttpPost("coordinator/request-reviews/{reviewId}/assessment")]
    [Authorize(Roles = UserRoles.FleetRouteCoordinator)]
    public async Task<IActionResult> CoordinatorAssessmentAsync(string reviewId, CoordinatorAssessmentInput input, CancellationToken ct) =>
        Reply(await reviews.AssessCoordinatorAsync(Actor, reviewId, input, ct));

    [HttpGet("specialist/request-reviews")]
    [Authorize(Roles = UserRoles.TransportSpecialist)]
    public async Task<IActionResult> SpecialistQueueAsync(CancellationToken ct) =>
        Reply(await reviews.QueueAsync(Actor, UserRoles.TransportSpecialist, ct));

    [HttpGet("specialist/request-reviews/{reviewId}")]
    [Authorize(Roles = UserRoles.TransportSpecialist)]
    public async Task<IActionResult> SpecialistAsync(string reviewId, CancellationToken ct) =>
        Reply(await reviews.DetailAsync(Actor, reviewId, UserRoles.TransportSpecialist, ct));

    [HttpGet("specialist/request-reviews/{reviewId}/options/{optionId}/checklist/{itemId}/file")]
    [Authorize(Roles = UserRoles.TransportSpecialist)]
    public async Task<IActionResult> ChecklistFileAsync(string reviewId, string optionId, string itemId, CancellationToken ct) =>
        Binary(await reviews.FileAsync(Actor, reviewId, optionId, itemId, ct));

    [HttpPost("specialist/request-reviews/{reviewId}/options/{optionId}/assessment")]
    [Authorize(Roles = UserRoles.TransportSpecialist)]
    public async Task<IActionResult> SpecialistAssessmentAsync(string reviewId, string optionId, SpecialistAssessmentInput input, CancellationToken ct) =>
        Reply(await reviews.AssessSpecialistAsync(Actor, reviewId, optionId, input, ct));

    [HttpGet("customer/requests/{requestId}/schedule-response")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> PendingScheduleAsync(string requestId, CancellationToken ct) =>
        Reply(new { proposal = await reviews.CustomerAsync(Actor, requestId, ct) });

    [HttpPost("customer/requests/{requestId}/schedule-response")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> ScheduleResponseAsync(string requestId, ScheduleResponseInput input, CancellationToken ct) =>
        Reply(await reviews.RespondAsync(Actor, requestId, input, ct));
}
