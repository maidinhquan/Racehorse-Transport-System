using Microsoft.AspNetCore.Mvc;
using Application.DTOs;
using Application.Interfaces;

namespace WebApi.Controllers
{
    [ApiController]
    [Route("api/specialist")]
    public class SpecialistController : BaseApiController
    {
        private readonly ICoordinatorService _coordinatorService;

        public SpecialistController(ICoordinatorService coordinatorService)
        {
            _coordinatorService = coordinatorService;
        }

        /// <summary>
        /// F3-J02: Context cho nhánh hồ sơ song song
        /// </summary>
        [HttpGet("trips/{tripId}/planning-context")]
        public async Task<IActionResult> GetSpecialistPlanningContext(string tripId)
        {
            var data = await _coordinatorService.GetTripContextAsync(tripId, "SPECIALIST");
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J16: Xác nhận Docs READY độc lập nhánh điều phối
        /// </summary>
        [HttpPost("trips/{tripId}/docs-ready")]
        public async Task<IActionResult> ConfirmDocsReady(string tripId, [FromBody] ExpectedDto input)
        {
            var data = await _coordinatorService.ConfirmDocsReadyAsync(tripId, input, CurrentUserId, "Chuyên viên pháp lý");
            return Success(data, "OK");
        }
    }
}

