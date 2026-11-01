using Application.Interfaces.Flow4;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers.Flow4;

[ApiController]
[Route("api/customer/requests")]
[Authorize(Roles = $"{UserRoles.Customer}")]
public class CustomerTrackingController : BaseApiController
{
    private readonly IFlow4CustomerTrackingService _customerTrackingService;

    public CustomerTrackingController(IFlow4CustomerTrackingService customerTrackingService)
    {
        _customerTrackingService = customerTrackingService;
    }

    /// <summary>
    /// F4-J32: Khách hàng theo dõi tiến độ hành trình đơn của mình
    /// </summary>
    [HttpGet("{requestId}/tracking")]
    public async Task<IActionResult> GetTracking([FromRoute] string requestId)
    {
        var result = await _customerTrackingService.GetCustomerTrackingAsync(requestId, CurrentUserId);
        return Success(result);
    }

    /// <summary>
    /// F4-J33: Khách hàng xem ảnh chăm sóc và sinh hiệu ngựa của mình
    /// </summary>
    [HttpGet("{requestId}/health-logs")]
    public async Task<IActionResult> GetHealthLogs([FromRoute] string requestId)
    {
        var result = await _customerTrackingService.GetCustomerHealthLogsAsync(requestId, CurrentUserId);
        return Success(result);
    }

    /// <summary>
    /// F4-J34: Khách hàng tải ảnh/chứng từ đã được chia sẻ
    /// </summary>
    [HttpGet("{requestId}/tracking-files/{fileId}")]
    public async Task<IActionResult> DownloadTrackingFile(
        [FromRoute] string requestId,
        [FromRoute] string fileId)
    {
        var result = await _customerTrackingService.GetCustomerTrackingFileAsync(requestId, fileId, CurrentUserId);
        if (result == null)
        {
            return NotFoundFailure("Không tìm thấy file chứng từ hoặc không có quyền truy cập");
        }
        return File(result.Value.fileBytes, result.Value.contentType, result.Value.fileName);
    }
}
