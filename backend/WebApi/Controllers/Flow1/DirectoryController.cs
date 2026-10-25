using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Application.Flow1.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace WebApi.Controllers.Flow1;

[Route("api"), Authorize, EnableRateLimiting("flow1-customer")]
public sealed class DirectoryController(DirectoryService directory) : EndpointController
{
    [HttpGet("customer/profile")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> ProfileAsync(CancellationToken ct) =>
        Reply(await directory.ProfileAsync(Actor, ct));

    [HttpGet("manager/customers")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> CustomersAsync(CancellationToken ct) =>
        Reply(await directory.CustomersAsync(Actor, ct));

    [HttpGet("manager/staff")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> StaffAsync(CancellationToken ct) =>
        Reply(await directory.StaffAsync(Actor, ct));

}
