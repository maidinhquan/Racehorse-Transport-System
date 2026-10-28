using Microsoft.AspNetCore.Mvc;
using Application.DTOs;
using System.Security.Claims;

namespace WebApi.Controllers
{
    /// <summary>
    /// Base Controller mẫu cho toàn bộ các Controller trong dự án sau này.
    /// Kế thừa class này để có route chuẩn "api/[controller]" và các hàm trả kết quả chuẩn hóa theo OpenAPI.
    /// </summary>
    [ApiController]
    public abstract class BaseApiController : ControllerBase
    {
        protected string CurrentUserId => User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                                       ?? User?.FindFirst("sub")?.Value
                                       ?? "USR_COORD_01";

        protected IActionResult Success<T>(T data, string message = "OK")
        {
            return Ok(ApiResponse<T>.Ok(data, message));
        }

        protected IActionResult CreatedSuccess<T>(T data, string message = "OK")
        {
            return StatusCode(StatusCodes.Status201Created, ApiResponse<T>.Ok(data, message));
        }

        protected IActionResult SuccessMessage(string message = "OK")
        {
            return Ok(ApiResponse<object?>.Ok(null, message));
        }

        protected IActionResult Failure(string message, IDictionary<string, string[]>? errors = null, int statusCode = StatusCodes.Status400BadRequest)
        {
            return StatusCode(statusCode, ApiResponse<object?>.Fail(message, errors));
        }

        protected IActionResult NotFoundFailure(string message = "Không tìm thấy dữ liệu yêu cầu")
        {
            return NotFound(ApiResponse<object?>.Fail(message));
        }
    }
}
