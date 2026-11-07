using System.Text.Json;
using System.Text.Json.Nodes;
using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Application.Flow1.Interfaces;
using Application.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;

namespace WebApi.Controllers.Flow1;

[Route("api"), Authorize, EnableRateLimiting("flow1-customer")]
public sealed class RequestsController(RequestService requests, RequestDetailsService details, IServiceProvider? sp = null) : EndpointController
{
    [HttpGet("customer/requests")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> CustomerRequestsAsync(CancellationToken ct) =>
        Reply(await requests.ListAsync(Actor, false, ct));

    [HttpGet("customer/requests/{requestId}")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> CustomerRequestAsync(string requestId, CancellationToken ct)
    {
        var view = await details.GetAsync(Actor, requestId, false, ct);
        AttachSupplements(view, requestId);
        return Reply(view);
    }

    [HttpGet("manager/requests")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ManagerRequestsAsync(CancellationToken ct) =>
        Reply(await requests.ListAsync(Actor, true, ct));

    [HttpGet("manager/requests/{requestId}")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ManagerRequestAsync(string requestId, CancellationToken ct)
    {
        var view = await details.GetAsync(Actor, requestId, true, ct);
        AttachSupplements(view, requestId);
        return Reply(view);
    }

    [HttpPost("customer/requests")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> CreateAsync([FromBody] RequestUpdateInput input, CancellationToken ct)
    {
        return Reply(await requests.CreateAsync(Actor, IdempotencyKey, input, ct), 201);
    }

    [HttpPut("customer/requests/{requestId}")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> UpdateAsync(string requestId, [FromBody] RequestUpdateInput input, CancellationToken ct)
    {
        return Reply(await requests.UpdateAsync(Actor, requestId, input, ct));
    }

    private void AttachSupplements(object view, string requestId)
    {
        if (sp == null || view is not JsonObject obj) return;
        try
        {
            var spec = sp.GetService<ISpecialistService>();
            if (spec == null) return;
            var supps = spec.GetCustomerSupplementsAsync(requestId).GetAwaiter().GetResult();
            obj["supplements"] = JsonSerializer.SerializeToNode(supps.Select(s => new
            {
                id = s.Id,
                key = s.Key,
                scope = s.Scope,
                reason = s.Reason,
                at = s.CreatedAt,
                by = "Specialist",
                status = s.Status
            }));
        }
        catch
        {
            // Fallback gracefully without breaking main view
        }
    }
}
