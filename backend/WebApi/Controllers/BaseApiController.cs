using Microsoft.AspNetCore.Mvc;
using Application.DTOs;

namespace WebApi.Controllers
{
    /// <summary>
    /// Base Controller mẫu cho toàn bộ các Controller trong dự án sau này.
    /// Bất kỳ Controller nào tạo sau này (HorsesController, TripsController, PaymentsController...)
    /// chỉ cần kế thừa class này là tự động có route chuẩn "api/[controller]" và các hàm trả kết quả chuẩn hóa.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public abstract class BaseApiController : ControllerBase
    {
        protected IActionResult Success<T>(T data, string message = "Thao tác thành công")
        {
            return Ok(ApiResponse<T>.Ok(data, message));
        }

        protected IActionResult SuccessMessage(string message = "Thao tác thành công")
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

