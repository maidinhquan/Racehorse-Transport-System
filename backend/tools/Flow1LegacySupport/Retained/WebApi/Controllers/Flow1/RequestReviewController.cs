using System.Security.Claims;
using Application.DTOs;
using Application.DTOs.Flow1;
using Application.Services.Flow1;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace WebApi.Controllers.Flow1;

[ApiController, Route("api/manager/requests"), Authorize(Roles = UserRoles.LogisticsManager), EnableRateLimiting("flow1-customer")]
public sealed class ManagerRequestReviewController(RequestReviewService service) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw Error("Authentication required.", "UNAUTHORIZED", 401);
    [HttpGet] public async Task<IActionResult> List(string? status, int page = 1, int pageSize = 20, CancellationToken ct = default) =>
        Ok(ApiResponse<object>.Ok(await service.ListAsync(status, page, pageSize, ct)));
    [HttpGet("{id}"), HttpGet("{id}/info-requests"), HttpGet("{id}/change-requests")]
    public async Task<IActionResult> Detail(string id, CancellationToken ct) =>
        Ok(ApiResponse<object>.Ok(await service.ManagerAsync(id, Actor, ct)));
    [HttpGet("{id}/revisions")]
    public async Task<IActionResult> Revisions(string id, CancellationToken ct) => Ok(ApiResponse<object>.Ok(await service.RevisionsAsync(id, Actor, ct)));
    [HttpPost("{id}/{operation}")]
    public async Task<IActionResult> Mutate(string id, string operation, ReviewCommand input, CancellationToken ct)
    {
        var command = operation switch { "accept" => "ACCEPT", "reject" => "REJECT", "request-revision" => "REQUEST_REVISION",
            "info-requests" => "ASK_INFO", "preliminary-plan" => "SAVE_PLAN", "contracts" => "CREATE_DRAFT",
            "contract-versions" => "REPLACE_DRAFT", _ => throw Error("Action not found.", "NOT_FOUND", 404) };
        await service.ExecuteAsync(id, Actor, true, command, Request.Headers["Idempotency-Key"].ToString(), input, ct);
        return Ok(ApiResponse<object>.Ok(await service.ManagerAsync(id, Actor, ct)));
    }
    [HttpPut("{id}/preliminary-plan")]
    public Task<IActionResult> Plan(string id, ReviewCommand input, CancellationToken ct) => Mutate(id, "preliminary-plan", input, ct);
    [HttpPost("{id}/change-requests/{changeId}/{decision}")]
    public async Task<IActionResult> Change(string id, string changeId, string decision, ReviewCommand input, CancellationToken ct)
    {
        var action = decision switch { "approve" => "APPROVE_CHANGE", "reject" => "REJECT_CHANGE", _ => throw Error("Action not found.", "NOT_FOUND", 404) };
        await service.ExecuteAsync(id, Actor, true, action, Request.Headers["Idempotency-Key"].ToString(), input with { QuestionId = changeId }, ct);
        return Ok(ApiResponse<object>.Ok(await service.ManagerAsync(id, Actor, ct)));
    }
    [HttpGet("{id}/preliminary-plan"), HttpGet("{id}/quote-suggestion")]
    public async Task<IActionResult> Plan(string id, CancellationToken ct)
    {
        var view = await service.ManagerAsync(id, Actor, ct);
        if (view.Plan is null) throw Error("Save a preliminary plan first.", "PRELIMINARY_PLAN_REQUIRED", 409);
        return Ok(ApiResponse<object>.Ok(view.Plan));
    }
    [HttpGet("{id}/horses/{horse}/documents/{version:int}/{kind}")]
    public async Task<IActionResult> Document(string id, string horse, int version, string kind, CancellationToken ct)
    {
        var file = await service.DocumentAsync(id, Actor, horse, version, kind, ct);
        Response.Headers.CacheControl = "no-store"; Response.Headers.XContentTypeOptions = "nosniff";
        return File(file.Bytes, file.ContentType, kind + "." + (file.ContentType == "application/pdf" ? "pdf" : file.ContentType == "image/png" ? "png" : "jpg"));
    }
}

[ApiController, Route("api/customer/requests/{id}"), Authorize(Roles = UserRoles.Customer), EnableRateLimiting("flow1-customer")]
public sealed class CustomerRequestReviewController(RequestReviewService service) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw Error("Authentication required.", "UNAUTHORIZED", 401);
    [HttpGet("review"), HttpGet("info-requests"), HttpGet("change-requests")]
    public async Task<IActionResult> Detail(string id, CancellationToken ct) => Ok(ApiResponse<object>.Ok(await service.CustomerAsync(id, Actor, ct)));
    [HttpPost("{operation}")]
    public async Task<IActionResult> Mutate(string id, string operation, ReviewCommand input, CancellationToken ct)
    {
        var command = operation switch { "revision" => "RESUBMIT", "info-responses" => "RESPOND_INFO", "change-requests" => "PROPOSE_CHANGE", "cancel" => "CANCEL",
            _ => throw Error("Action not found.", "NOT_FOUND", 404) };
        await service.ExecuteAsync(id, Actor, false, command, Request.Headers["Idempotency-Key"].ToString(), input, ct);
        return Ok(ApiResponse<object>.Ok(await service.CustomerAsync(id, Actor, ct)));
    }
    [HttpPut("revision")] public Task<IActionResult> Revision(string id, ReviewCommand input, CancellationToken ct) => Mutate(id, "revision", input, ct);
}

[ApiController, Route("api/manager/contracts"), Authorize(Roles = UserRoles.LogisticsManager), EnableRateLimiting("flow1-customer")]
public sealed class ManagerDraftContractsController(RequestReviewService service) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw Error("Authentication required.", "UNAUTHORIZED", 401);
    [HttpGet("{id}")] public async Task<IActionResult> Get(string id, CancellationToken ct) => Ok(ApiResponse<object>.Ok(await service.ManagerContractAsync(id, Actor, ct)));
    // Editing creates a new ContractID/version and supersedes the old Draft; it never rewrites sent terms.
    [HttpPut("{id}")] public async Task<IActionResult> Put(string id, ReviewCommand input, CancellationToken ct) =>
        Ok(ApiResponse<object>.Ok(await service.EditContractAsync(id, Actor, Request.Headers["Idempotency-Key"].ToString(), input, ct)));
    [HttpPost("{id}/reissue")] public async Task<IActionResult> Reissue(string id, ReviewCommand input, CancellationToken ct) =>
        Ok(ApiResponse<ManagerReviewView>.Ok(await service.ReissueContractAsync(id, Actor, Request.Headers["Idempotency-Key"].ToString(), input, ct)));
}

[ApiController, Route("api/customer/contracts"), Authorize(Roles = UserRoles.Customer), EnableRateLimiting("flow1-customer")]
public sealed class CustomerDraftContractsController(RequestReviewService service) : ControllerBase
{
    [HttpGet("{id}")] public async Task<IActionResult> Get(string id, CancellationToken ct) =>
        Ok(ApiResponse<ContractSummary>.Ok(await service.CustomerContractAsync(id,
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw Error("Authentication required.", "UNAUTHORIZED", 401), ct)));
}
