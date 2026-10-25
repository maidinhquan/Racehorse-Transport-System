using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Application.Flow1.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace WebApi.Controllers.Flow1;

[Route("api"), Authorize, EnableRateLimiting("flow1-customer")]
public sealed class CostsController(CostService costs) : EndpointController
{
    [HttpPost("manager/requests/{requestId}/cost-estimate")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> CalculateAsync(string requestId, CostInput input, CancellationToken ct) =>
        Reply(await costs.CalculateAsync(Actor, requestId, input, ct));

}
