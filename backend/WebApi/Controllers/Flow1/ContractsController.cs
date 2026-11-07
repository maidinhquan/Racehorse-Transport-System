using Application.Flow1.Dtos;
using Application.Flow1.Services;
using Application.Flow1.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace WebApi.Controllers.Flow1;

[Route("api"), Authorize, EnableRateLimiting("flow1-customer")]
public sealed class ContractsController(ContractService contracts, ContractLifecycleService lifecycle) : EndpointController
{
    [HttpGet("customer/contracts/{contractId}/versions/{versionNo}")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> CustomerVersionAsync(string contractId, int versionNo, CancellationToken ct) =>
        Reply(await contracts.VersionAsync(Actor, contractId, versionNo, false, ct));

    [HttpGet("manager/contracts/{contractId}/versions/{versionNo}")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ManagerVersionAsync(string contractId, int versionNo, CancellationToken ct) =>
        Reply(await contracts.VersionAsync(Actor, contractId, versionNo, true, ct));

    [HttpGet("manager/requests/{requestId}/contract-editor")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> EditorAsync(string requestId, CancellationToken ct, [FromQuery] string? mode = null) =>
        Reply(await contracts.EditorAsync(Actor, requestId, ct, mode));

    [HttpPut("manager/requests/{requestId}/contract-draft")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> SaveAsync(string requestId, ContractDraftInput input, CancellationToken ct) =>
        Reply(await contracts.SaveAsync(Actor, requestId, input, ct));

    [HttpDelete("manager/requests/{requestId}/contract-draft")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> DeleteAsync(string requestId, CancellationToken ct) =>
        Reply(await lifecycle.DeleteDraftAsync(Actor, requestId, ct));

    [HttpPost("manager/requests/{requestId}/contract/publish")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> PublishAsync(string requestId, VersionInput input, CancellationToken ct) =>
        Reply(await contracts.PublishAsync(Actor, requestId, input.VersionNo, ct), 201);

    [HttpGet("customer/requests/{requestId}/contract")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> CurrentAsync(string requestId, CancellationToken ct) =>
        Reply(await contracts.CustomerAsync(Actor, requestId, ct));

    [HttpGet("customer/contracts/{contractId}/versions/{versionNo}/pdf")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> PdfAsync(string contractId, int versionNo, CancellationToken ct) =>
        Binary(await contracts.PdfAsync(Actor, contractId, versionNo, false, ct));

    [HttpPost("customer/contracts/{contractId}/accept-terms")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> AcceptTermsAsync(string contractId, VersionInput input, CancellationToken ct) =>
        Reply(await contracts.AcceptAsync(Actor, contractId, input.VersionNo, ct));

    [HttpPost("customer/contracts/{contractId}/feedback")]
    [Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> FeedbackAsync(string contractId, FeedbackInput input, CancellationToken ct) =>
        Reply(await contracts.FeedbackAsync(Actor, contractId, input, ct));

    [HttpPost("manager/contracts/{contractId}/feedback/decision")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> FeedbackDecisionAsync(string contractId, FeedbackDecision input, CancellationToken ct) =>
        Reply(await contracts.DecideFeedbackAsync(Actor, contractId, input, ct));

    [HttpPost("manager/contracts/{contractId}/extend-deadline")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> ExtendAsync(string contractId, ExtensionInput input, CancellationToken ct) =>
        Reply(await lifecycle.ExtendAsync(Actor, contractId, input, ct));

    [HttpPost("manager/contracts/{contractId}/reminder")]
    [Authorize(Roles = UserRoles.LogisticsManager)]
    public async Task<IActionResult> RemindAsync(string contractId, CancellationToken ct) =>
        Reply(await lifecycle.ReminderAsync(Actor, contractId, ct));

}
