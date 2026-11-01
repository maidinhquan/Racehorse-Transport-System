using Application.Interfaces.Flow4;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace WebApi.Controllers.Flow4;

[ApiController]
[Route("api/trips/{tripId}/execution")]
[Authorize(Roles = $"{UserRoles.DriverEscort},{UserRoles.FleetRouteCoordinator},{UserRoles.LogisticsManager},{UserRoles.TransportSpecialist},{UserRoles.Admin}")]
public class ExecutionMonitoringController : BaseApiController
{
    private readonly IFlow4CoordinatorService _coordinatorService;
    private readonly IFlow4SpecialistService _specialistService;
    private readonly IFlow4HealthService _healthService;

    public ExecutionMonitoringController(
        IFlow4CoordinatorService coordinatorService,
        IFlow4SpecialistService specialistService,
        IFlow4HealthService healthService)
    {
        _coordinatorService = coordinatorService;
        _specialistService = specialistService;
        _healthService = healthService;
    }

    private string CurrentUserRole => User?.FindFirst(ClaimTypes.Role)?.Value ?? UserRoles.FleetRouteCoordinator;

    /// <summary>
    /// F4-J03: Đọc ngữ cảnh hành trình, xe, ngựa, mốc và blockers
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetTripExecution([FromRoute] string tripId)
    {
        var result = await _coordinatorService.GetTripExecutionAsync(tripId, CurrentUserId, CurrentUserRole);
        return Success(result);
    }

    /// <summary>
    /// F4-J07: Lịch sử timeline mốc, đính chính và quyết định
    /// </summary>
    [HttpGet("history")]
    public async Task<IActionResult> GetExecutionHistory([FromRoute] string tripId)
    {
        var result = await _coordinatorService.GetTripExecutionHistoryAsync(tripId);
        return Success(result);
    }

    /// <summary>
    /// F4-J11: Danh sách kết quả cho phép đi tiếp tại checkpoint
    /// </summary>
    [HttpGet("checkpoints")]
    public async Task<IActionResult> GetCheckpoints([FromRoute] string tripId)
    {
        var result = await _specialistService.GetCheckpointsAsync(tripId);
        return Success(result);
    }

    /// <summary>
    /// F4-J16: Lịch sử thông tin hãng bay và lịch bay dự kiến
    /// </summary>
    [HttpGet("air/notices")]
    public async Task<IActionResult> GetAirNotices([FromRoute] string tripId)
    {
        var result = await _coordinatorService.GetAirNoticesAsync(tripId);
        return Success(result);
    }

    /// <summary>
    /// F4-J19: Đọc ETA hiện hành và lịch sử đề xuất
    /// </summary>
    [HttpGet("eta-proposals")]
    public async Task<IActionResult> GetEtaProposals([FromRoute] string tripId)
    {
        var result = await _coordinatorService.GetEtaProposalsAsync(tripId);
        return Success(result);
    }

    /// <summary>
    /// F4-J22: Nhật ký sinh hiệu, ăn uống, vận động của từng cá thể ngựa
    /// </summary>
    [HttpGet("health-logs")]
    public async Task<IActionResult> GetHealthLogs([FromRoute] string tripId, [FromQuery] string? horseId)
    {
        var result = await _healthService.GetHealthLogsAsync(tripId, horseId);
        return Success(result);
    }

    /// <summary>
    /// F4-J26: Đọc kết luận chuyên môn và chỉ dẫn chăm sóc của bác sĩ thú y
    /// </summary>
    [HttpGet("vet-assessments")]
    public async Task<IActionResult> GetVetAssessments([FromRoute] string tripId, [FromQuery] string? horseId)
    {
        var result = await _healthService.GetVetAssessmentsAsync(tripId, horseId);
        return Success(result);
    }

    /// <summary>
    /// F4-J27: Cảnh báo trễ mốc và chăm sóc y tế đến hạn
    /// </summary>
    [HttpGet("alerts")]
    public async Task<IActionResult> GetAlerts([FromRoute] string tripId)
    {
        var result = await _coordinatorService.GetAlertsAsync(tripId);
        return Success(result);
    }

    /// <summary>
    /// F4-J30: Upload file/ảnh chứng từ hiện trường thực tế (≤10MB)
    /// </summary>
    [HttpPost("files")]
    public async Task<IActionResult> UploadFile(
        [FromRoute] string tripId,
        IFormFile file,
        [FromForm] string? purpose,
        [FromForm] string? horseId)
    {
        if (file == null || file.Length == 0)
        {
            return Failure("File không hợp lệ hoặc rỗng");
        }

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream);
        var bytes = memoryStream.ToArray();

        var result = await _coordinatorService.UploadExecutionFileAsync(
            tripId,
            file.FileName,
            file.ContentType,
            bytes,
            purpose ?? "ATTACHMENT",
            horseId,
            CurrentUserId);

        return Success(result);
    }

    /// <summary>
    /// F4-J31: Download file chứng từ vận hành có kiểm soát phân quyền
    /// </summary>
    [HttpGet("files/{fileId}")]
    public async Task<IActionResult> DownloadFile([FromRoute] string tripId, [FromRoute] string fileId)
    {
        var result = await _coordinatorService.GetExecutionFileAsync(tripId, fileId);
        if (result == null)
        {
            return NotFoundFailure("Không tìm thấy file chứng từ");
        }
        return File(result.Value.fileBytes, result.Value.contentType, result.Value.fileName);
    }

    /// <summary>
    /// F4-J37: Tra cứu danh sách chi phí phát sinh nội bộ chuyến đi
    /// </summary>
    [HttpGet("expenses")]
    public async Task<IActionResult> GetExpenses([FromRoute] string tripId)
    {
        var result = await _coordinatorService.GetExpensesAsync(tripId);
        return Success(result);
    }
}
