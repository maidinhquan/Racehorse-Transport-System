using Application.DTOs.Flow4;
using Application.Interfaces.Flow4;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers.Flow4;

[ApiController]
[Route("api/specialist/trips")]
[Authorize(Roles = $"{UserRoles.TransportSpecialist},{UserRoles.Admin}")]
public class SpecialistExecutionController : BaseApiController
{
    private readonly IFlow4SpecialistService _specialistService;

    public SpecialistExecutionController(IFlow4SpecialistService specialistService)
    {
        _specialistService = specialistService;
    }

    /// <summary>
    /// F4-J12: Chuyên viên ghi kết quả kiểm tra pháp lý thực tế (CLEARED/HELD)
    /// </summary>
    [HttpPost("{tripId}/checkpoints/{checkpointId}/decisions")]
    public async Task<IActionResult> RecordCheckpointDecision(
        [FromRoute] string tripId,
        [FromRoute] string checkpointId,
        [FromBody] CheckpointDecisionInputDto dto)
    {
        var result = await _specialistService.RecordCheckpointDecisionAsync(tripId, checkpointId, dto, CurrentUserId);
        return Success(result);
    }
}

