using Application.Flow1.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace WebApi.Controllers.Flow1;
[ApiController, Route("api/payments/vnpay"), AllowAnonymous]
public sealed class VnpayController(PaymentService payments) : ControllerBase
{
    [HttpGet("ipn")]
    public async Task<IActionResult> IpnAsync(CancellationToken ct)
    {
        if (Request.Query.Any(p => p.Value.Count != 1)) return new JsonResult(new { RspCode = "97", Message = "Repeated parameters" });
        return new JsonResult(await payments.IpnAsync(Request.Query.ToDictionary(p => p.Key, p => p.Value.ToString(), StringComparer.Ordinal), ct),
            new System.Text.Json.JsonSerializerOptions { PropertyNamingPolicy = null });
    }
}
