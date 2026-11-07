using System.Security.Claims;
using System.Text.Json;
using Application.DTOs;
using Microsoft.AspNetCore.Mvc;
using static Application.Flow1.Rules.BusinessRules;
namespace WebApi.Controllers.Flow1;
[ApiController, ServiceFilter(typeof(WebApi.Extensions.Flow1.ModuleReadiness)), ServiceFilter(typeof(WebApi.Extensions.Flow1.ModuleErrors))]
public abstract class EndpointController : ControllerBase
{
    protected string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw Failure("UNAUTHORIZED", "Authentication required.", 401);
    protected string IdempotencyKey => Request.Headers["Idempotency-Key"].ToString();
    protected IActionResult Reply(object? data, int status = 200) => new JsonResult(ApiResponse<object?>.Ok(data), new JsonSerializerOptions(JsonSerializerDefaults.Web)) { StatusCode = status };
    protected IActionResult Binary((byte[] Bytes, string ContentType) file)
    {
        Response.Headers.CacheControl = "no-store"; Response.Headers.XContentTypeOptions = "nosniff";
        return File(file.Bytes, file.ContentType);
    }
}
