using Application.DTOs.Flow5;
using Application.Interfaces.Flow5;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers.Flow5;

[ApiController]
[Tags("Flow 5 — Ngoại lệ điểm lấy ngựa (Pickup Access Exception)")]
public class PickupAccessController : BaseApiController
{
    private readonly IPickupAccessService _pickupAccessService;

    public PickupAccessController(IPickupAccessService pickupAccessService)
    {
        _pickupAccessService = pickupAccessService;
    }

    /// <summary>
    /// Endpoint 1: Tài xế báo cáo không thể tiếp cận điểm lấy ngựa
    /// POST /api/driver/trips/{tripId}/pickup-access-blocked
    /// </summary>
    [HttpPost("api/driver/trips/{tripId}/pickup-access-blocked")]
    [HttpPost("driver/trips/{tripId}/pickup-access-blocked")]
    [Authorize(Roles = $"{UserRoles.DriverEscort},{UserRoles.Admin}")]
    [ProducesResponseType(typeof(PickupAccessStatusResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DriverReportPickupBlocked(
        [FromRoute] string tripId,
        [FromBody] PickupAccessBlockedRequestDto dto)
    {
        var result = await _pickupAccessService.ReportAccessBlockedAsync(tripId, dto, CurrentUserId);
        return Success(result, "Đã ghi nhận sự cố không thể vào điểm lấy ngựa và kích hoạt chặn an toàn.");
    }

    /// <summary>
    /// Endpoint 2: Điều phối viên chọn phương án giải quyết (dắt bộ < 500m hoặc xe trung chuyển >= 500m)
    /// POST /api/coordinator/trips/{tripId}/pickup-access-resolution
    /// </summary>
    [HttpPost("api/coordinator/trips/{tripId}/pickup-access-resolution")]
    [HttpPost("coordinator/trips/{tripId}/pickup-access-resolution")]
    [Authorize(Roles = $"{UserRoles.FleetRouteCoordinator},{UserRoles.Admin}")]
    [ProducesResponseType(typeof(PickupAccessStatusResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CoordinatorResolvePickupAccess(
        [FromRoute] string tripId,
        [FromBody] PickupAccessResolutionRequestDto dto)
    {
        var result = await _pickupAccessService.ResolveAccessAsync(tripId, dto, CurrentUserId);
        return Success(result, "Đã lập phương án giải quyết và gửi yêu cầu phê duyệt tới khách hàng.");
    }

    /// <summary>
    /// Endpoint 3: Khách hàng phê duyệt hoặc từ chối phương án giải quyết
    /// POST /api/customer/trips/{tripId}/pickup-access-decision
    /// </summary>
    [HttpPost("api/customer/trips/{tripId}/pickup-access-decision")]
    [HttpPost("customer/trips/{tripId}/pickup-access-decision")]
    [Authorize(Roles = $"{UserRoles.Customer},{UserRoles.Admin}")]
    [ProducesResponseType(typeof(PickupAccessStatusResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CustomerDecidePickupAccess(
        [FromRoute] string tripId,
        [FromBody] PickupAccessDecisionRequestDto dto)
    {
        var result = await _pickupAccessService.DecideAccessAsync(tripId, dto, CurrentUserId);
        var msg = dto.Decision == "APPROVED"
            ? "Khách hàng đã phê duyệt phương án thành công."
            : "Khách hàng đã từ chối phương án; chuyến đi tiếp tục bị tạm dừng để Điều phối viên xử lý tiếp.";
        return Success(result, msg);
    }

    /// <summary>
    /// Endpoint 4: Tra cứu trạng thái tiếp cận điểm đón của chuyến đi
    /// GET /api/customer/trips/{tripId}/pickup-access-status
    /// </summary>
    [HttpGet("api/customer/trips/{tripId}/pickup-access-status")]
    [HttpGet("customer/trips/{tripId}/pickup-access-status")]
    [HttpGet("api/coordinator/trips/{tripId}/pickup-access-status")]
    [HttpGet("coordinator/trips/{tripId}/pickup-access-status")]
    [HttpGet("api/driver/trips/{tripId}/pickup-access-status")]
    [HttpGet("driver/trips/{tripId}/pickup-access-status")]
    [Authorize(Roles = $"{UserRoles.Customer},{UserRoles.FleetRouteCoordinator},{UserRoles.DriverEscort},{UserRoles.Admin}")]
    [ProducesResponseType(typeof(PickupAccessStatusResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPickupAccessStatus([FromRoute] string tripId)
    {
        var result = await _pickupAccessService.GetAccessStatusAsync(tripId, CurrentUserId);
        return Success(result, "Tra cứu thông tin tiếp cận điểm lấy ngựa thành công.");
    }
}
