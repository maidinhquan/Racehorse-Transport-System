using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Application.Common.Exceptions;
using Application.DTOs;
using Application.Interfaces;
using Infrastructure.Data.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Controllers;

[ApiController]
[Route("api/customer")]
[Authorize(Roles = "Customer,CUSTOMER")]
public class CustomerPortalController : ControllerBase
{
    private readonly HorseTransportDbContext _context;
    private readonly IFlow1CustomerService _customerService;

    public CustomerPortalController(
        HorseTransportDbContext context,
        IFlow1CustomerService customerService)
    {
        _context = context;
        _customerService = customerService;
    }

    /// <summary>
    /// F1-J01 — GET /customer/profile: Thông tin Customer
    /// </summary>
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetCurrentUserId();
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId);
        if (user == null)
        {
            return NotFound(ApiResponse<object?>.FailWithCode("Không tìm thấy hoặc không có quyền truy cập tài nguyên", "NOT_FOUND"));
        }

        var rawName = user.FullName ?? "Khách hàng";
        var cleanName = Application.Common.TextEncodingHelper.CleanFullName(rawName);
        if (string.IsNullOrEmpty(cleanName)) cleanName = rawName;

        var nameParts = cleanName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var initials = nameParts.Length > 0
            ? string.Concat(nameParts.Select(p => p[0])).ToUpperInvariant()
            : "KH";
        if (initials.Length > 2) initials = initials[..2];

        var data = new
        {
            id = user.UserId,
            name = cleanName,
            initials = initials,
            email = user.Email ?? "",
            phone = string.IsNullOrWhiteSpace(user.Phone) ? "+84901234567" : user.Phone,
            company = "CLB Đua ngựa"
        };

        return Ok(ApiResponse<object>.Ok(data, "OK"));
    }

    /// <summary>
    /// F1-J03 — GET /customer/notifications: Danh sách thông báo
    /// </summary>
    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications()
    {
        var userId = GetCurrentUserId();
        var notifications = await _context.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.SentAt)
            .Take(20)
            .Select(n => new
            {
                id = n.NotificationId,
                title = n.Title ?? "Thông báo",
                body = n.Message ?? "",
                at = n.SentAt.ToString("yyyy-MM-dd HH:mm"),
                read = n.IsRead,
                link = $"/customer/requests/{n.ReferenceId}"
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(notifications, "OK"));
    }

    [HttpPost("notifications/{id}/read")]
    public async Task<IActionResult> MarkNotificationRead(string id)
    {
        var n = await _context.Notifications.FirstOrDefaultAsync(x => x.NotificationId == id);
        if (n != null)
        {
            n.IsRead = true;
            await _context.SaveChangesAsync();
        }
        return Ok(ApiResponse<object?>.Ok(null, "OK"));
    }

    [HttpPost("notifications/read-all")]
    public async Task<IActionResult> MarkAllNotificationsRead()
    {
        var userId = GetCurrentUserId();
        var unread = await _context.Notifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync();
        foreach (var item in unread) item.IsRead = true;
        await _context.SaveChangesAsync();
        return Ok(ApiResponse<object?>.Ok(null, "OK"));
    }

    /// <summary>
    /// GET /customer/request-form-options
    /// </summary>
    [HttpGet("request-form-options")]
    [AllowAnonymous]
    public async Task<IActionResult> GetFormOptions([FromQuery] string origin = "TP. Hồ Chí Minh", [FromQuery] string destination = "Bangkok", [FromQuery] string? mode = null)
    {
        var options = await _customerService.GetFormOptionsAsync(origin, destination, mode);
        return Ok(ApiResponse<FormOptionsDto>.Ok(options, "OK"));
    }

    /// <summary>
    /// F1-J21 — GET /customer/requests: Danh sách yêu cầu vận chuyển
    /// </summary>
    [HttpGet("requests")]
    public async Task<IActionResult> GetRequests()
    {
        var userId = GetCurrentUserId();
        var result = await _customerService.GetCustomerRequestsAsync(userId);
        return Ok(ApiResponse<List<CustomerTransportRequestDto>>.Ok(result, "OK"));
    }

    /// <summary>
    /// POST /customer/requests: Khởi tạo đơn vận chuyển mới
    /// </summary>
    [HttpPost("requests")]
    public async Task<IActionResult> CreateRequest([FromBody] TripInfoInput input)
    {
        var userId = GetCurrentUserId();
        var result = await _customerService.CreateRequestAsync(userId, input);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<CustomerTransportRequestDto>.Ok(result, "OK"));
    }

    /// <summary>
    /// GET /customer/requests/{id}: Xem chi tiết đơn
    /// </summary>
    [HttpGet("requests/{id}")]
    public async Task<IActionResult> GetRequestById(string id)
    {
        var userId = GetCurrentUserId();
        var result = await _customerService.GetRequestByIdAsync(userId, id);
        if (result == null)
        {
            return NotFound(ApiResponse<object?>.FailWithCode("Không tìm thấy hoặc không có quyền truy cập", "NOT_FOUND"));
        }
        return Ok(ApiResponse<CustomerTransportRequestDto>.Ok(result, "OK"));
    }

    /// <summary>
    /// PUT /customer/requests/{id}: Lưu tiến trình nháp
    /// </summary>
    [HttpPut("requests/{id}")]
    public async Task<IActionResult> SaveRequest(string id, [FromBody] CustomerSaveRequestDto input)
    {
        var userId = GetCurrentUserId();
        var result = await _customerService.SaveRequestAsync(userId, id, input);
        return Ok(ApiResponse<CustomerTransportRequestDto>.Ok(result, "OK"));
    }

    /// <summary>
    /// GET /customer/requests/{id}/document-checklist
    /// </summary>
    [HttpGet("requests/{id}/document-checklist")]
    public async Task<IActionResult> GetDocumentChecklist(string id)
    {
        var userId = GetCurrentUserId();
        var result = await _customerService.GetDocumentChecklistAsync(userId, id);
        return Ok(ApiResponse<DocumentChecklistDto>.Ok(result, "OK"));
    }

    /// <summary>
    /// POST /customer/requests/{requestId}/horses/{horseId}/documents
    /// </summary>
    [HttpPost("requests/{requestId}/horses/{horseId}/documents")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> UploadHorseDocument(string requestId, string horseId, [FromForm] IFormFile? file, [FromForm] string? documentType)
    {
        var userId = GetCurrentUserId();
        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<object?>.FailWithCode("Tệp không hợp lệ", "VALIDATION_ERROR"));
        }

        using var stream = file.OpenReadStream();
        var result = await _customerService.UploadHorseDocumentAsync(userId, requestId, horseId, documentType ?? "PASSPORT", stream, file.FileName, file.ContentType);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<DocRecordDto>.Ok(result, "OK"));
    }

    /// <summary>
    /// POST /customer/requests/{id}/submit
    /// </summary>
    [HttpPost("requests/{id}/submit")]
    public async Task<IActionResult> SubmitRequest(string id)
    {
        var userId = GetCurrentUserId();
        var result = await _customerService.SubmitRequestAsync(userId, id);
        return Ok(ApiResponse<CustomerTransportRequestDto>.Ok(result, "OK"));
    }

    /// <summary>
    /// POST /customer/requests/{id}/cancel
    /// </summary>
    [HttpPost("requests/{id}/cancel")]
    public async Task<IActionResult> CancelRequest(string id, [FromBody] CancelRequestDto dto)
    {
        var userId = GetCurrentUserId();
        var success = await _customerService.CancelRequestAsync(userId, id, dto?.Reason ?? "Khách hàng hủy");
        if (!success)
        {
            return NotFound(ApiResponse<object?>.FailWithCode("Không tìm thấy đơn", "NOT_FOUND"));
        }
        return Ok(ApiResponse<object>.Ok(new { requestStatus = "CANCELLED" }, "OK"));
    }

    /// <summary>
    /// GET /customer/requests/{requestId}/contract
    /// </summary>
    [HttpGet("requests/{requestId}/contract")]
    public async Task<IActionResult> GetContract(string requestId)
    {
        var userId = GetCurrentUserId();
        var result = await _customerService.GetContractAsync(userId, requestId);
        return Ok(ApiResponse<ContractResponseDto>.Ok(result, "OK"));
    }

    /// <summary>
    /// POST /customer/contracts/{id}/accept-terms
    /// </summary>
    [HttpPost("contracts/{id}/accept-terms")]
    public async Task<IActionResult> AcceptTerms(string id, [FromBody] AcceptTermsRequestDto dto)
    {
        var userId = GetCurrentUserId();
        var success = await _customerService.AcceptTermsAsync(userId, id, dto?.VersionNo ?? 1);
        if (!success) return NotFound(ApiResponse<object?>.FailWithCode("Không tìm thấy hợp đồng", "NOT_FOUND"));
        return Ok(ApiResponse<object>.Ok(new { termsAcceptedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm") }, "OK"));
    }

    /// <summary>
    /// POST /customer/contracts/{id}/feedback
    /// </summary>
    [HttpPost("contracts/{id}/feedback")]
    public async Task<IActionResult> RequestContractFeedback(string id, [FromBody] ContractFeedbackRequestDto dto)
    {
        var userId = GetCurrentUserId();
        var success = await _customerService.RequestContractFeedbackAsync(userId, id, dto?.VersionNo ?? 1, dto?.Text ?? "");
        if (!success) return NotFound(ApiResponse<object?>.FailWithCode("Không tìm thấy hợp đồng", "NOT_FOUND"));
        return Ok(ApiResponse<object?>.Ok(null, "OK"));
    }

    /// <summary>
    /// POST /customer/contracts/{id}/sign-otp
    /// </summary>
    [HttpPost("contracts/{id}/sign-otp")]
    public async Task<IActionResult> SendSignOtp(string id, [FromBody] SignOtpRequestDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _customerService.SendSignOtpAsync(userId, id, dto?.VersionNo ?? 1);
        return Ok(ApiResponse<SignOtpResponseDto>.Ok(result, "OK"));
    }

    /// <summary>
    /// POST /customer/contracts/{id}/sign
    /// </summary>
    [HttpPost("contracts/{id}/sign")]
    public async Task<IActionResult> SignContract(string id, [FromBody] SignContractRequestDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _customerService.SignContractAsync(userId, id, dto.VersionNo, dto.Otp);
        return Ok(ApiResponse<SignContractResponseDto>.Ok(result, "OK"));
    }

    /// <summary>
    /// GET /customer/requests/{requestId}/deposit
    /// </summary>
    [HttpGet("requests/{requestId}/deposit")]
    public async Task<IActionResult> GetDepositInfo(string requestId)
    {
        var userId = GetCurrentUserId();
        var result = await _customerService.GetDepositInfoAsync(userId, requestId);
        return Ok(ApiResponse<DepositInfoDto>.Ok(result, "OK"));
    }

    /// <summary>
    /// POST /customer/invoices/{invoiceId}/payment-session
    /// </summary>
    [HttpPost("invoices/{invoiceId}/payment-session")]
    public async Task<IActionResult> CreatePaymentSession(string invoiceId, [FromBody] CreatePaymentSessionRequestDto dto)
    {
        var userId = GetCurrentUserId();
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        var result = await _customerService.CreatePaymentSessionAsync(userId, invoiceId, dto?.Method ?? "VNPAY", ip);
        return Ok(ApiResponse<PaymentSessionResponseDto>.Ok(result, "OK"));
    }

    private string GetCurrentUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirst("sub")?.Value
            ?? string.Empty;
    }
}
