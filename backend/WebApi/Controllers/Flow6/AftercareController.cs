using System.Security.Claims;
using System.Text.Json.Nodes;
using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using Application.Flow6.Services;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace WebApi.Controllers.Flow6;
[ApiController, Route("api"), Authorize]
public sealed class AftercareController(AftercareService service) : ControllerBase
{
    [HttpGet("operations/flow6/trips"), Authorize(Roles = UserRoles.DriverEscort)]
    public Task<IActionResult> J01(CancellationToken ct) => Run("F6-J01", null, null, ct);
    [HttpGet("operations/flow6/trips/{tripId}/context"), Authorize(Roles = UserRoles.DriverEscort)]
    public Task<IActionResult> J02(string tripId, CancellationToken ct) => Run("F6-J02", tripId, null, ct);
    [HttpPost("operations/flow6/trips/{tripId}/delivery"), Authorize(Roles = UserRoles.DriverEscort)]
    public Task<IActionResult> J03(string tripId, [FromBody] JsonObject body, CancellationToken ct) => Run("F6-J03", tripId, body, ct);
    [HttpGet("operations/flow6/handovers/{handoverId}"), Authorize(Roles = UserRoles.DriverEscort)]
    public Task<IActionResult> J04(string handoverId, CancellationToken ct) => Run("F6-J04", handoverId, null, ct);
    [HttpGet("operations/flow6/revisions/{revisionId}"), Authorize(Roles = UserRoles.DriverEscort)]
    public Task<IActionResult> J05(string revisionId, CancellationToken ct) => Run("F6-J05", revisionId, null, ct);
    [HttpPut("operations/flow6/revisions/{revisionId}"), Authorize(Roles = UserRoles.DriverEscort)]
    public Task<IActionResult> J06(string revisionId, [FromBody] JsonObject body, CancellationToken ct) => Run("F6-J06", revisionId, body, ct);
    [HttpPost("operations/flow6/revisions/{revisionId}/otp"), Authorize(Roles = UserRoles.DriverEscort)]
    public Task<IActionResult> J07(string revisionId, CancellationToken ct) => Run("F6-J07", revisionId, null, ct);
    [HttpPost("operations/flow6/revisions/{revisionId}/invalidate-otp"), Authorize(Roles = UserRoles.DriverEscort)]
    public Task<IActionResult> J08(string revisionId, CancellationToken ct) => Run("F6-J08", revisionId, null, ct);
    [HttpPost("operations/flow6/revisions/{revisionId}/confirm"), Authorize(Roles = UserRoles.DriverEscort)]
    public Task<IActionResult> J09(string revisionId, [FromBody] JsonObject body, CancellationToken ct) => Run("F6-J09", revisionId, body, ct);
    [HttpPost("operations/flow6/revisions/{revisionId}/refuse"), Authorize(Roles = UserRoles.DriverEscort)]
    public Task<IActionResult> J10(string revisionId, [FromBody] JsonObject body, CancellationToken ct) => Run("F6-J10", revisionId, body, ct);
    [HttpPost("operations/flow6/handovers/{handoverId}/revisions"), Authorize(Roles = UserRoles.DriverEscort)]
    public Task<IActionResult> J11(string handoverId, [FromBody] JsonObject body, CancellationToken ct) => Run("F6-J11", handoverId, body, ct);
    [HttpGet("customer/flow6/settlements"), Authorize(Roles = UserRoles.Customer)]
    public Task<IActionResult> J12(CancellationToken ct) => Run("F6-J12", null, null, ct);
    [HttpGet("customer/flow6/settlements/{settlementId}"), Authorize(Roles = UserRoles.Customer)]
    public Task<IActionResult> J13(string settlementId, CancellationToken ct) => Run("F6-J13", settlementId, null, ct);
    [HttpGet("manager/flow6/settlements"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J14([FromQuery] string? status, CancellationToken ct) => Run("F6-J14", status, null, ct);
    [HttpPost("manager/flow6/trips/{tripId}/settlement"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J15(string tripId, CancellationToken ct) => Run("F6-J15", tripId, null, ct);
    [HttpGet("manager/flow6/settlements/{settlementId}"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J16(string settlementId, CancellationToken ct) => Run("F6-J16", settlementId, null, ct);
    [HttpGet("manager/flow6/settlements/{settlementId}/balance"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J17(string settlementId, CancellationToken ct) => Run("F6-J17", settlementId, null, ct);
    [HttpGet("customer/flow6/settlements/{settlementId}/balance"), Authorize(Roles = UserRoles.Customer)]
    public Task<IActionResult> J18(string settlementId, CancellationToken ct) => Run("F6-J18", settlementId, null, ct);
    [HttpPost("manager/flow6/settlements/{settlementId}/adjustments"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J19(string settlementId, [FromBody] JsonObject body, CancellationToken ct) => Run("F6-J19", settlementId, body, ct);
    [HttpGet("manager/flow6/settlements/{settlementId}/adjustments"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J20(string settlementId, CancellationToken ct) => Run("F6-J20", settlementId, null, ct);
    [HttpGet("customer/flow6/settlements/{settlementId}/adjustments"), Authorize(Roles = UserRoles.Customer)]
    public Task<IActionResult> J21(string settlementId, CancellationToken ct) => Run("F6-J21", settlementId, null, ct);
    [HttpPost("manager/flow6/settlements/{settlementId}/final-invoice"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J22(string settlementId, [FromBody] JsonObject body, CancellationToken ct) => Run("F6-J22", settlementId, body, ct);
    [HttpGet("customer/flow6/settlements/{settlementId}/invoice"), Authorize(Roles = UserRoles.Customer)]
    public Task<IActionResult> J23(string settlementId, CancellationToken ct) => Run("F6-J23", settlementId, null, ct);
    [HttpPost("customer/flow6/invoices/{invoiceId}/payment-session"), Authorize(Roles = UserRoles.Customer)]
    public Task<IActionResult> J24(string invoiceId, CancellationToken ct) => Run("F6-J24", invoiceId, null, ct);
    [HttpGet("customer/flow6/payments/{paymentId}"), Authorize(Roles = UserRoles.Customer)]
    public Task<IActionResult> J25(string paymentId, CancellationToken ct) => Run("F6-J25", paymentId, null, ct);
    [HttpPost("manager/flow6/settlements/{settlementId}/settle"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J26(string settlementId, CancellationToken ct) => Run("F6-J26", settlementId, null, ct);
    [HttpPost("manager/flow6/adjustments/{adjustmentId}/refund-processing"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J27(string adjustmentId, CancellationToken ct) => Run("F6-J27", adjustmentId, null, ct);
    [HttpPost("manager/flow6/adjustments/{adjustmentId}/refund-complete"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J28(string adjustmentId, [FromBody] JsonObject body, CancellationToken ct) => Run("F6-J28", adjustmentId, body, ct);
    [HttpPost("customer/flow6/settlements/{settlementId}/cases"), Authorize(Roles = UserRoles.Customer)]
    public Task<IActionResult> J29(string settlementId, [FromBody] JsonObject body, CancellationToken ct) => Run("F6-J29", settlementId, body, ct);
    [HttpGet("customer/flow6/settlements/{settlementId}/cases"), Authorize(Roles = UserRoles.Customer)]
    public Task<IActionResult> J30(string settlementId, CancellationToken ct) => Run("F6-J30", settlementId, null, ct);
    [HttpGet("manager/flow6/cases"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J31(CancellationToken ct) => Run("F6-J31", null, null, ct);
    [HttpPost("manager/flow6/cases/{caseId}/start"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J32(string caseId, CancellationToken ct) => Run("F6-J32", caseId, null, ct);
    [HttpPost("manager/flow6/cases/{caseId}/resolve"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J33(string caseId, [FromBody] JsonObject body, CancellationToken ct) => Run("F6-J33", caseId, body, ct);
    [HttpPost("customer/flow6/settlements/{settlementId}/feedback"), Authorize(Roles = UserRoles.Customer)]
    public Task<IActionResult> J34(string settlementId, [FromBody] JsonObject body, CancellationToken ct) => Run("F6-J34", settlementId, body, ct);
    [HttpGet("customer/flow6/settlements/{settlementId}/feedback"), Authorize(Roles = UserRoles.Customer)]
    public Task<IActionResult> J35(string settlementId, CancellationToken ct) => Run("F6-J35", settlementId, null, ct);
    [HttpPost("manager/flow6/settlements/{settlementId}/restart-feedback-window"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J36(string settlementId, CancellationToken ct) => Run("F6-J36", settlementId, null, ct);
    [HttpPost("manager/flow6/settlements/{settlementId}/close"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J37(string settlementId, CancellationToken ct) => Run("F6-J37", settlementId, null, ct);
    [HttpGet("operations/flow6/trips/{tripId}/pickup-baseline"), Authorize(Roles = UserRoles.DriverEscort)]
    public Task<IActionResult> J38(string tripId, CancellationToken ct) => Run("F6-J38", tripId, null, ct);
    [HttpGet("operations/flow6/trips/{tripId}/health-logs"), Authorize(Roles = UserRoles.DriverEscort)]
    public Task<IActionResult> J39(string tripId, CancellationToken ct) => Run("F6-J39", tripId, null, ct);
    [HttpGet("operations/flow6/trips/{tripId}/incidents"), Authorize(Roles = UserRoles.DriverEscort)]
    public Task<IActionResult> J40(string tripId, CancellationToken ct) => Run("F6-J40", tripId, null, ct);
    [HttpGet("customer/flow6/settlements/{settlementId}/delivery"), Authorize(Roles = UserRoles.Customer)]
    public Task<IActionResult> J41(string settlementId, CancellationToken ct) => Run("F6-J41", settlementId, null, ct);
    [HttpGet("manager/flow6/settlements/{settlementId}/delivery"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J42(string settlementId, CancellationToken ct) => Run("F6-J42", settlementId, null, ct);
    [HttpGet("manager/flow6/settlements/{settlementId}/feedback"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J43(string settlementId, CancellationToken ct) => Run("F6-J43", settlementId, null, ct);
    [HttpGet("manager/flow6/settlements/{settlementId}/payments"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J44(string settlementId, CancellationToken ct) => Run("F6-J44", settlementId, null, ct);
    [HttpGet("operations/flow6/revisions/{revisionId}/pdf"), Authorize(Roles = UserRoles.DriverEscort)]
    public Task<IActionResult> J45(string revisionId, CancellationToken ct) => Run("F6-J45", revisionId, null, ct);
    [HttpGet("customer/flow6/settlements/{settlementId}/delivery/pdf"), Authorize(Roles = UserRoles.Customer)]
    public Task<IActionResult> J46(string settlementId, CancellationToken ct) => Run("F6-J46", settlementId, null, ct);
    [HttpGet("manager/flow6/settlements/{settlementId}/delivery/pdf"), Authorize(Roles = UserRoles.LogisticsManager)]
    public Task<IActionResult> J47(string settlementId, CancellationToken ct) => Run("F6-J47", settlementId, null, ct);
    private async Task<IActionResult> Run(string operation, string? id, JsonObject? body, CancellationToken ct)
    {
        var actor = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (actor is null) return Unauthorized();
        try {
            if(ApiContract.Operations[operation]?["schema"] is null && (Request.ContentLength>0 || Request.Headers.ContainsKey("Transfer-Encoding")))
                throw new AftercareException("VALIDATION_ERROR","This operation does not accept a request body.",400);
            Response.Headers.CacheControl="no-store";
            Response.Headers.XContentTypeOptions="nosniff";
            var result = await service.Invoke(operation,actor,id,body,Request.Headers["Idempotency-Key"].ToString(),HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",ct);
            if(result is byte[] pdf) return File(pdf,"application/pdf");
            return new JsonResult(new { success=true, message="OK", data=result }, new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)) { StatusCode=operation is "F6-J03" or "F6-J11" or "F6-J15" or "F6-J19" or "F6-J24" or "F6-J29" or "F6-J34" ? 201:200 };
        } catch(AftercareException e) { return new JsonResult(new {success=false,message=e.Message,data=(object?)null,errorCode=e.Code},new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)) {StatusCode=e.Status}; }
        catch(Microsoft.Data.SqlClient.SqlException e) when(e.Number is 208 or 207 or 2601 or 2627 or 547 or 1205 or 51300)
        {var unavailable=e.Number is 208 or 207;return new JsonResult(new{success=false,message=unavailable?"Flow 6 schema/infrastructure is unavailable.":"State changed; reload and retry.",data=(object?)null,errorCode=unavailable?"FEATURE_NOT_SUPPORTED":"INVALID_STATE"},new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)){StatusCode=unavailable?501:409};}
    }
}
