using System.Security.Claims;
using System.Text.Json;
using Application.DTOs;
using Application.DTOs.Flow1;
using Application.Services.Flow1;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace WebApi.Controllers.Flow1;

[ApiController, Route("api/customer/contracts/{id}/payments"), Authorize(Roles = UserRoles.Customer), EnableRateLimiting("flow1-customer")]
public sealed class CustomerDepositPaymentsController(DepositPaymentService service) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet] public async Task<IActionResult> Get(string id, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<DepositPaymentsView>.Ok(await service.GetAsync(id, Actor, false, ct))); }
    [HttpPost("bank-proofs"), RequestSizeLimit(6 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Submit(string id, [FromForm] BankProofUploadForm form, CancellationToken ct)
    {
        var payload = form.Payload;
        var proof = form.Proof;
        BankProofInput input;
        try { input = JsonSerializer.Deserialize<BankProofInput>(payload, new JsonSerializerOptions(JsonSerializerDefaults.Web)) ?? throw new JsonException(); }
        catch (JsonException) { throw Error("Invalid proof payload.", "VALIDATION_ERROR"); }
        if (proof is null || proof.Length is < 16 or > 5 * 1024 * 1024) throw Error("Proof must be 16 bytes–5 MB.", "INVALID_FILE_SIZE");
        using var bytes = new MemoryStream(); await proof.CopyToAsync(bytes, ct);
        Response.Headers.CacheControl = "no-store";
        return Ok(ApiResponse<DepositPaymentsView>.Ok(await service.SubmitAsync(id, Actor, Request.Headers["Idempotency-Key"].ToString(), input,
            new(bytes.ToArray(), proof.FileName), ct)));
    }
    [HttpGet("{paymentId}/proof")] public async Task<IActionResult> Proof(string id, string paymentId, CancellationToken ct)
    {
        var file = await service.ProofAsync(id, paymentId, Actor, false, ct);
        Response.Headers.CacheControl = "no-store"; Response.Headers.XContentTypeOptions = "nosniff";
        return File(file.Bytes, file.ContentType, "payment-proof" + Extension(file.ContentType));
    }
    internal static string Extension(string type) => type == "application/pdf" ? ".pdf" : type == "image/png" ? ".png" : ".jpg";
    [HttpPost("vnpay-sessions")] public async Task<IActionResult> Gateway(string id, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<GatewayPaymentSession>.Ok(await service.GatewaySessionAsync(id, Actor,
        Request.Headers["Idempotency-Key"].ToString(), HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1", ct))); }
}
[ApiController, Route("api/manager/contracts/{id}/payments"), Authorize(Roles = UserRoles.LogisticsManager), EnableRateLimiting("flow1-customer")]
public sealed class ManagerDepositPaymentsController(DepositPaymentService service) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet] public async Task<IActionResult> Get(string id, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<DepositPaymentsView>.Ok(await service.GetAsync(id, Actor, true, ct))); }
    [HttpPost("{paymentId}/confirm")] public async Task<IActionResult> Confirm(string id, string paymentId, ConfirmBankPaymentInput input, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<DepositPaymentsView>.Ok(await service.ConfirmAsync(id, paymentId, Actor, Request.Headers["Idempotency-Key"].ToString(), input, ct))); }
    [HttpPost("{paymentId}/reject")] public async Task<IActionResult> Reject(string id, string paymentId, RejectBankPaymentInput input, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<DepositPaymentsView>.Ok(await service.RejectAsync(id, paymentId, Actor, Request.Headers["Idempotency-Key"].ToString(), input, ct))); }
    [HttpGet("{paymentId}/proof")] public async Task<IActionResult> Proof(string id, string paymentId, CancellationToken ct)
    {
        var file = await service.ProofAsync(id, paymentId, Actor, true, ct);
        Response.Headers.CacheControl = "no-store"; Response.Headers.XContentTypeOptions = "nosniff";
        return File(file.Bytes, file.ContentType, "payment-proof" + CustomerDepositPaymentsController.Extension(file.ContentType));
    }
    [HttpPost("cancel-overdue")] public async Task<IActionResult> Cancel(string id, CancelOverdueDepositInput input, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<DepositPaymentsView>.Ok(await service.CancelOverdueAsync(id, Actor, Request.Headers["Idempotency-Key"].ToString(), input, ct))); }
    [HttpPost("financial-review")] public async Task<IActionResult> Review(string id, AcknowledgeFinancialReviewInput input, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<DepositPaymentsView>.Ok(await service.AcknowledgeFinancialReviewAsync(id, Actor, Request.Headers["Idempotency-Key"].ToString(), input, ct))); }
    [HttpGet("financial-review")] public async Task<IActionResult> ReviewHistory(string id, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<FinancialReviewHistory>.Ok(await service.FinancialHistoryAsync(id, Actor, ct))); }
}

[ApiController, EnableRateLimiting("flow1-customer")]
public sealed class Flow1VnpayController(DepositPaymentService service) : ControllerBase
{
    [HttpGet("api/customer/payments/{paymentId}"), Authorize(Roles = UserRoles.Customer)]
    public async Task<IActionResult> Status(string paymentId, CancellationToken ct)
    { Response.Headers.CacheControl = "no-store"; return Ok(ApiResponse<GatewayPaymentStatus>.Ok(await service.GatewayStatusAsync(paymentId, User.FindFirstValue(ClaimTypes.NameIdentifier)!, ct))); }
    [HttpGet("api/payments/vnpay/ipn"), AllowAnonymous]
    public async Task<IActionResult> Ipn(CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store";
        GatewayIpnResponse result;
        if ((Request.QueryString.Value?.Length ?? 0) > 8192 || Request.Query.Any(p => p.Value.Count != 1)) result = new("97", "Invalid payload");
        else
        {
            try { result = await service.GatewayIpnAsync(Request.Query.ToDictionary(p => p.Key, p => p.Value.ToString(), StringComparer.Ordinal), ct); }
            catch (Exception) when (!ct.IsCancellationRequested) { result = new("99", "Unable to commit; retry later"); }
        }
        // Provider protocol uses exact case, independently of normal camelCase API envelopes.
        return new JsonResult(new Dictionary<string, string> { ["RspCode"] = result.RspCode, ["Message"] = result.Message });
    }
}

public sealed class BankProofUploadForm
{
    public string Payload { get; set; } = string.Empty;
    public IFormFile Proof { get; set; } = null!;
}
