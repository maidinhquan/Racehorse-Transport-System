using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Application.Flow1.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace WebApi.Controllers.Flow1;

[Route("api"), Authorize, EnableRateLimiting("flow1-customer")]
public sealed class NotificationsController(NotificationService notifications) : EndpointController
{
    [HttpGet("customer/notifications")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> CustomerNotificationsAsync(CancellationToken ct) =>
        Reply(await notifications.ListAsync(Actor, ct));

    [HttpPost("customer/notifications/{notificationId}/read")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> CustomerReadAsync(string notificationId, CancellationToken ct) =>
        Reply(await notifications.ReadAsync(Actor, notificationId, ct));

    [HttpPost("customer/notifications/read-all")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> CustomerReadAllAsync(CancellationToken ct) =>
        Reply(await notifications.ReadAsync(Actor, null, ct));

    [HttpGet("manager/notifications")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ManagerNotificationsAsync(CancellationToken ct) =>
        Reply(await notifications.ListAsync(Actor, ct));

    [HttpPost("manager/notifications/{notificationId}/read")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ManagerReadAsync(string notificationId, CancellationToken ct) =>
        Reply(await notifications.ReadAsync(Actor, notificationId, ct));

    [HttpPost("manager/notifications/read-all")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ManagerReadAllAsync(CancellationToken ct) =>
        Reply(await notifications.ReadAsync(Actor, null, ct));

}
