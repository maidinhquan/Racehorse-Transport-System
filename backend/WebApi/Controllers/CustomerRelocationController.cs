using Microsoft.AspNetCore.Mvc;
using Application.DTOs;
using Application.Interfaces;

namespace WebApi.Controllers
{
    [ApiController]
    [Route("api/customer")]
    public class CustomerRelocationController : BaseApiController
    {
        private readonly ICoordinatorService _coordinatorService;

        public CustomerRelocationController(ICoordinatorService coordinatorService)
        {
            _coordinatorService = coordinatorService;
        }

        /// <summary>
        /// F3-J57: Khách xem đề xuất điểm nhận được Manager gửi
        /// </summary>
        [HttpGet("trips/{tripId}/pickup-relocation")]
        public async Task<IActionResult> GetCustomerPickupRelocation(string tripId)
        {
            var data = await _coordinatorService.GetCustomerPickupRelocationAsync(tripId, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J32: Khách hàng đồng ý hoặc từ chối điểm nhận mới
        /// </summary>
        [HttpPost("trips/{tripId}/pickup-relocation/decision")]
        public async Task<IActionResult> CustomerRelocationDecision(string tripId, [FromBody] CustomerPickupDecisionInputDto input)
        {
            var data = await _coordinatorService.CustomerRelocationDecisionAsync(tripId, input, CurrentUserId);
            return Success(data, "OK");
        }
    }
}
