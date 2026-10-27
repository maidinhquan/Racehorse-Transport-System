using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Application.Common.Exceptions;
using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers
{
    [ApiController]
    [Route("api/customer/horses")]
    [Authorize]
    public class CustomerHorsesController : ControllerBase
    {
        private readonly ICustomerHorseService _horseService;
        private readonly ILogger<CustomerHorsesController> _logger;

        public CustomerHorsesController(
            ICustomerHorseService horseService,
            ILogger<CustomerHorsesController> logger)
        {
            _horseService = horseService;
            _logger = logger;
        }

        /// <summary>
        /// F1-J12 — POST /customer/horses: Thêm ngựa mới
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Customer,CUSTOMER")]
        public async Task<IActionResult> CreateHorse([FromBody] CreateHorseRequestDto request)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<object?>.FailWithCode("Vui lòng đăng nhập", "UNAUTHORIZED"));
            }

            var result = await _horseService.CreateHorseAsync(userId, request);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<HorseCreateResponseDto>.Ok(result, "OK"));
        }

        /// <summary>
        /// F1-J02 — GET /customer/horses: Danh sách ngựa của người dùng
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Customer,CUSTOMER")]
        public async Task<IActionResult> GetMyHorses()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<object?>.FailWithCode("Vui lòng đăng nhập", "UNAUTHORIZED"));
            }

            var result = await _horseService.GetMyHorsesAsync(userId);
            return Ok(ApiResponse<List<HorseDetailResponseDto>>.Ok(result, "OK"));
        }

        /// <summary>
        /// F1-J14 — GET /customer/horses/selectable: Danh sách ngựa khả dụng
        /// </summary>
        [HttpGet("selectable")]
        [Authorize(Roles = "Customer,CUSTOMER")]
        public async Task<IActionResult> GetSelectableHorses([FromQuery] string? date, [FromQuery] string? excludeRequestId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<object?>.FailWithCode("Vui lòng đăng nhập", "UNAUTHORIZED"));
            }

            var result = await _horseService.GetSelectableHorsesAsync(userId, date ?? string.Empty, excludeRequestId);
            return Ok(ApiResponse<List<SelectableHorseResponseDto>>.Ok(result, "OK"));
        }

        /// <summary>
        /// F1-J11 — GET /customer/horses/{horseId}: Chi tiết một con ngựa
        /// </summary>
        [HttpGet("{horseId}")]
        [Authorize(Roles = "Customer,CUSTOMER")]
        public async Task<IActionResult> GetHorseById(string horseId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<object?>.FailWithCode("Vui lòng đăng nhập", "UNAUTHORIZED"));
            }

            var horse = await _horseService.GetHorseByIdAsync(userId, horseId);
            if (horse == null)
            {
                return NotFound(ApiResponse<object?>.FailWithCode("Không tìm thấy hoặc không có quyền truy cập tài nguyên", "NOT_FOUND"));
            }

            return Ok(ApiResponse<HorseDetailResponseDto>.Ok(horse, "OK"));
        }

        /// <summary>
        /// F1-J13 — PUT /customer/horses/{horseId}: Sửa hồ sơ ngựa
        /// </summary>
        [HttpPut("{horseId}")]
        [Authorize(Roles = "Customer,CUSTOMER")]
        public async Task<IActionResult> UpdateHorse(string horseId, [FromBody] CreateHorseRequestDto request)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<object?>.FailWithCode("Vui lòng đăng nhập", "UNAUTHORIZED"));
            }

            var updated = await _horseService.UpdateHorseAsync(userId, horseId, request);
            if (updated == null)
            {
                return NotFound(ApiResponse<object?>.FailWithCode("Không tìm thấy hoặc không có quyền truy cập tài nguyên", "NOT_FOUND"));
            }

            return Ok(ApiResponse<HorseDetailResponseDto>.Ok(updated, "OK"));
        }

        /// <summary>
        /// F1-J15 — POST /customer/horses/{horseId}/files/{fileType}: Tải lên file của ngựa
        /// </summary>
        [HttpPost("{horseId}/files/{fileType}")]
        [Authorize(Roles = "Customer,CUSTOMER")]
        [RequestSizeLimit(20 * 1024 * 1024)] // 20 MB max
        public async Task<IActionResult> UploadHorseFile(string horseId, string fileType, IFormFile? file)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<object?>.FailWithCode("Vui lòng đăng nhập", "UNAUTHORIZED"));
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(ApiResponse<object?>.FailWithCode(
                    "Dữ liệu không hợp lệ",
                    "VALIDATION_ERROR",
                    new Dictionary<string, string[]> { { "file", new[] { "Nội dung file không hợp lệ" } } }));
            }

            using var stream = file.OpenReadStream();
            var result = await _horseService.UploadHorseFileAsync(userId, horseId, fileType, stream, file.FileName, file.ContentType);
            return StatusCode(StatusCodes.Status201Created, ApiResponse<HorseFileUploadResponseDto>.Ok(result, "OK"));
        }

        /// <summary>
        /// F1-J16 — GET /customer/horses/{horseId}/files/{fileType}: Đọc file của ngựa (trả binary file)
        /// </summary>
        [HttpGet("{horseId}/files/{fileType}")]
        [HttpHead("{horseId}/files/{fileType}")]
        public async Task<IActionResult> GetHorseFile(string horseId, string fileType)
        {
            var userId = GetCurrentUserId();
            var role = GetCurrentUserRole();

            var fileResult = await _horseService.GetHorseFileAsync(userId, role, horseId, fileType);
            if (fileResult == null)
            {
                return NotFound(ApiResponse<object?>.FailWithCode("Không tìm thấy hoặc không có quyền truy cập tài nguyên", "NOT_FOUND"));
            }

            Response.Headers["Content-Disposition"] = $"inline; filename=\"{fileResult.Value.FileName}\"";
            return File(fileResult.Value.Bytes, fileResult.Value.ContentType);
        }

        // =========================================================================
        // HELPER METHODS
        // =========================================================================

        private string GetCurrentUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? User.FindFirst("sub")?.Value
                ?? string.Empty;
        }

        private string GetCurrentUserRole()
        {
            return User.FindFirstValue(ClaimTypes.Role)
                ?? User.FindFirst("role")?.Value
                ?? string.Empty;
        }
    }
}
