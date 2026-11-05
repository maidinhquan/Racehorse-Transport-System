using Application.DTOs.Flow5;
using Application.Interfaces.Flow5;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers.Flow5;

[ApiController]
[Route("api/coordinator/incidents")]
[Tags("Flow 5 — Quản lý sự cố & Khôi phục (Incidents & Recovery)")]
[Authorize(Roles = $"{UserRoles.FleetRouteCoordinator},{UserRoles.Admin}")]
public class CoordinatorIncidentsController : BaseApiController
{
    private readonly IFlow5IncidentService _incidentService;

    public CoordinatorIncidentsController(IFlow5IncidentService incidentService)
    {
        _incidentService = incidentService;
    }

    /// <summary>
    /// F5-J06: Coordinator tiếp nhận sự cố
    /// </summary>
    [HttpPost("{incidentId}/accept")]
    public async Task<IActionResult> AcceptIncident([FromRoute] string incidentId)
    {
        var result = await _incidentService.AcceptIncidentAsync(incidentId, CurrentUserId);
        return Success(result, "Điều phối viên đã tiếp nhận sự cố thành công");
    }

    /// <summary>
    /// F5-J07: Xác định chính xác các phần bị ảnh hưởng (8 vùng ảnh hưởng)
    /// </summary>
    [HttpPut("{incidentId}/impact-assessment")]
    public async Task<IActionResult> SaveImpactAssessment([FromRoute] string incidentId, [FromBody] AssessmentInputDto dto)
    {
        var result = await _incidentService.SaveImpactAssessmentAsync(incidentId, dto, CurrentUserId);
        return Success(result, "Đã lưu đánh giá phạm vi ảnh hưởng của sự cố");
    }

    /// <summary>
    /// F5-J10: Giao công việc khắc phục song song cho nhân sự chuyên môn
    /// </summary>
    [HttpPost("{incidentId}/tasks")]
    public async Task<IActionResult> CreateTask([FromRoute] string incidentId, [FromBody] TaskInputDto dto)
    {
        var result = await _incidentService.CreateTaskAsync(incidentId, dto, CurrentUserId);
        return CreatedSuccess(result, "Đã phân công nhiệm vụ thành công");
    }

    /// <summary>
    /// F5-J13: Đọc dữ liệu phụ thuộc để lập phương án khôi phục
    /// </summary>
    [HttpGet("{incidentId}/recovery-context")]
    public async Task<IActionResult> GetRecoveryContext([FromRoute] string incidentId)
    {
        var result = await _incidentService.GetRecoveryContextAsync(incidentId);
        return Success(result);
    }

    /// <summary>
    /// F5-J14: Lưu nháp phương án khôi phục
    /// </summary>
    [HttpPut("{incidentId}/recovery-draft")]
    public async Task<IActionResult> SaveRecoveryDraft([FromRoute] string incidentId, [FromBody] RecoveryInputDto dto)
    {
        var result = await _incidentService.SaveRecoveryDraftAsync(incidentId, dto, CurrentUserId);
        return Success(result, "Đã lưu nháp phương án khôi phục");
    }

    /// <summary>
    /// F5-J15: Kiểm tra tính hợp lệ của phương án khôi phục (không ghi trạng thái)
    /// </summary>
    [HttpPost("{incidentId}/recovery/validate")]
    public async Task<IActionResult> ValidateRecoveryPlan([FromRoute] string incidentId, [FromBody] RecoveryInputDto dto)
    {
        var result = await _incidentService.ValidateRecoveryPlanAsync(incidentId, dto);
        return Success(result);
    }

    /// <summary>
    /// F5-J16: Gửi phương án trình Quản lý và tạm giữ nguồn lực thay thế
    /// </summary>
    [HttpPost("{incidentId}/recovery/submit")]
    public async Task<IActionResult> SubmitRecoveryPlan([FromRoute] string incidentId, [FromBody] RecoveryInputDto dto)
    {
        var result = await _incidentService.SubmitRecoveryPlanAsync(incidentId, dto, CurrentUserId);
        return Success(result, "Phương án khôi phục đã được trình lên Quản lý phê duyệt");
    }

    /// <summary>
    /// F5-J18: Mở bản sửa phương án khi bị Quản lý yêu cầu điều chỉnh
    /// </summary>
    [HttpPost("{incidentId}/recovery/revisions")]
    public async Task<IActionResult> RequestRecoveryRevision([FromRoute] string incidentId, [FromBody] RecoveryRevisionInputDto dto)
    {
        var result = await _incidentService.RequestRecoveryRevisionAsync(incidentId, dto, CurrentUserId);
        return Success(result, "Đã tạo bản sửa đổi phương án");
    }

    /// <summary>
    /// F5-J43: Rút phương án đang chờ duyệt
    /// </summary>
    [HttpPost("{incidentId}/recovery/withdraw")]
    public async Task<IActionResult> WithdrawRecoveryPlan([FromRoute] string incidentId)
    {
        var result = await _incidentService.WithdrawRecoveryPlanAsync(incidentId, CurrentUserId);
        return Success(result, "Đã rút phương án khôi phục thành công");
    }

    /// <summary>
    /// F5-J20: Tìm xe và nhân sự thay thế phù hợp cho chặng gặp sự cố
    /// </summary>
    [HttpGet("{incidentId}/resource-options")]
    public async Task<IActionResult> GetResourceOptions([FromRoute] string incidentId)
    {
        var result = await _incidentService.GetResourceOptionsAsync(incidentId);
        return Success(result);
    }

    /// <summary>
    /// F5-J23: Ghi nhận xác nhận từ đối tác ngoài (xe cứu hộ, chuyến bay charter)
    /// </summary>
    [HttpPost("{incidentId}/external-actions")]
    public async Task<IActionResult> LogExternalAction([FromRoute] string incidentId, [FromBody] ExternalActionInputDto dto)
    {
        var result = await _incidentService.LogExternalActionAsync(incidentId, dto, CurrentUserId);
        return CreatedSuccess(result, "Đã ghi nhận thông tin xác nhận từ đối tác");
    }

    /// <summary>
    /// F5-J24: Áp dụng phương án khôi phục đã được phê duyệt vào chuyến đi thật
    /// </summary>
    [HttpPost("{incidentId}/recovery/apply")]
    public async Task<IActionResult> ApplyRecoveryPlan([FromRoute] string incidentId)
    {
        var result = await _incidentService.ApplyRecoveryPlanAsync(incidentId, CurrentUserId);
        return Success(result, "Phương án khôi phục đã được áp dụng vào lộ trình thực tế");
    }

    /// <summary>
    /// F5-J26: Cho phép xe tiếp tục hành trình sau sự cố (gỡ Blocker)
    /// </summary>
    [HttpPost("{incidentId}/continue")]
    public async Task<IActionResult> ContinueTrip([FromRoute] string incidentId, [FromBody] ContinuationInputDto dto)
    {
        var result = await _incidentService.ContinueTripAsync(incidentId, dto, CurrentUserId);
        return Success(result, "Đã gỡ bỏ SafetyBlocker và cho phép xe tiếp tục hành trình");
    }

    /// <summary>
    /// F5-J27: Coordinator ghi kết quả và đóng sự cố (RESOLVED)
    /// </summary>
    [HttpPost("{incidentId}/resolve")]
    public async Task<IActionResult> ResolveIncident([FromRoute] string incidentId, [FromBody] IncidentResolutionInputDto dto)
    {
        var result = await _incidentService.ResolveIncidentAsync(incidentId, dto, CurrentUserId);
        return Success(result, "Sự cố đã được giải quyết và đóng lại thành công");
    }

    /// <summary>
    /// F5-J28: Mở lại sự cố nếu tái phát vấn đề
    /// </summary>
    [HttpPost("{incidentId}/reopen")]
    public async Task<IActionResult> ReopenIncident([FromRoute] string incidentId, [FromBody] IncidentReopenInputDto dto)
    {
        var result = await _incidentService.ReopenIncidentAsync(incidentId, dto, CurrentUserId);
        return Success(result, "Sự cố đã được mở lại để tiếp tục xử lý");
    }
}

