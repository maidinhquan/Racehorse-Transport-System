using Microsoft.AspNetCore.Mvc;
using Application.DTOs;
using Application.Interfaces;

namespace WebApi.Controllers
{
    [ApiController]
    [Route("api/manager")]
    public class ManagerController : BaseApiController
    {
        private readonly ICoordinatorService _coordinatorService;

        public ManagerController(ICoordinatorService coordinatorService)
        {
            _coordinatorService = coordinatorService;
        }

        // =========================================================================
        // FLOW 3 V2 ENDPOINTS (API CONTRACT 2.0.0)
        // =========================================================================

        /// <summary>
        /// F3-J10: Manager xem hai nhánh và bundle cần duyệt
        /// </summary>
        [HttpGet("trips/{tripId}/preparation")]
        public async Task<IActionResult> GetManagerPreparation(string tripId)
        {
            var data = await _coordinatorService.GetTripContextAsync(tripId, "MANAGER");
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J11: Duyệt/trả toàn bộ phương án
        /// </summary>
        [HttpPost("trips/{tripId}/plan/decision")]
        public async Task<IActionResult> PlanDecision(string tripId, [FromBody] PlanDecisionInputDto input)
        {
            var data = await _coordinatorService.PlanDecisionAsync(tripId, input, CurrentUserId, "Quản lý điều hành");
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J17: Đọc gate và revision duyệt khởi hành
        /// </summary>
        [HttpGet("trips/{tripId}/readiness")]
        public async Task<IActionResult> GetReadiness(string tripId)
        {
            var data = await _coordinatorService.GetReadinessV2Async(tripId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J18: Duyệt khởi hành riêng
        /// </summary>
        [HttpPost("trips/{tripId}/departure/approve")]
        public async Task<IActionResult> ApproveDepartureV2(string tripId, [FromBody] DepartureInputDto input)
        {
            var data = await _coordinatorService.ApproveDepartureV2Async(tripId, input, CurrentUserId, "Quản lý điều hành");
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J31: Manager xét đề xuất điểm nhận
        /// </summary>
        [HttpPost("trips/{tripId}/pickup-relocation/decision")]
        public async Task<IActionResult> ManagerRelocationDecision(string tripId, [FromBody] PickupDecisionInputDto input)
        {
            var data = await _coordinatorService.ManagerRelocationDecisionAsync(tripId, input, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J32: Ghi nhận khách đã đồng ý thực tế
        /// </summary>
        [HttpPost("trips/{tripId}/pickup-relocation/customer-consent")]
        public async Task<IActionResult> RecordCustomerConsent(string tripId, [FromBody] ConsentInputDto input)
        {
            var data = await _coordinatorService.RecordCustomerConsentAsync(tripId, input, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J41: Manager xét ngân sách bay riêng
        /// </summary>
        [HttpPost("trips/{tripId}/flight/decision")]
        public async Task<IActionResult> ManagerFlightBudgetDecision(string tripId, [FromBody] BudgetDecisionInputDto input)
        {
            var data = await _coordinatorService.ManagerFlightBudgetDecisionAsync(tripId, input, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J50: Manager đọc catalogue bay
        /// </summary>
        [HttpGet("flights")]
        public async Task<IActionResult> GetFlightCatalog([FromQuery] string? tripId, [FromQuery] string? partnerId)
        {
            var data = await _coordinatorService.GetFlightCatalogAsync(partnerId, null, null);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J51: Manager đọc bên dịch vụ
        /// </summary>
        [HttpGet("air-partners")]
        public async Task<IActionResult> GetAirPartners()
        {
            var data = await _coordinatorService.GetAirPartnersAsync(null);
            return Success(data, "OK");
        }


        // =========================================================================
        // LEGACY COMPATIBILITY ENDPOINTS
        // =========================================================================

        [HttpGet("planning")]
        public async Task<IActionResult> GetPlanningTripsLegacy()
        {
            var data = await _coordinatorService.GetManagerPlanningTripsAsync();
            return Success(data, "Lấy danh sách kế hoạch chờ duyệt thành công");
        }

        [HttpGet("trips/{tripId}/route")]
        public async Task<IActionResult> GetTripRouteLegacy(string tripId)
        {
            var data = await _coordinatorService.GetManagerTripRouteAsync(tripId);
            return Success(data, "Lấy thông tin lộ trình chuyến đi thành công");
        }

        [HttpPost("trips/{tripId}/routes/{routeVersionId}/approve")]
        public async Task<IActionResult> ApproveRouteLegacy(string tripId, int routeVersionId, [FromBody] ManagerApproveRouteDto dto)
        {
            var success = await _coordinatorService.ApproveRouteVersionAsync(tripId, routeVersionId, dto);
            if (!success) return NotFoundFailure($"Không tìm thấy chuyến đi: {tripId}");
            return SuccessMessage("Phê duyệt lộ trình thành công");
        }

        [HttpPost("trips/{tripId}/routes/{routeVersionId}/return")]
        public async Task<IActionResult> ReturnRouteLegacy(string tripId, int routeVersionId, [FromBody] ManagerReturnRouteDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Reason))
            {
                return Failure("Lý do trả lại lộ trình là bắt buộc");
            }

            var success = await _coordinatorService.ReturnRouteVersionAsync(tripId, routeVersionId, dto);
            if (!success) return NotFoundFailure($"Không tìm thấy chuyến đi: {tripId}");
            return SuccessMessage("Đã trả lại lộ trình yêu cầu điều chỉnh");
        }

        [HttpGet("trips/{tripId}/departure-conditions")]
        public async Task<IActionResult> GetDepartureConditionsLegacy(string tripId)
        {
            var data = await _coordinatorService.GetDepartureConditionsAsync(tripId, isManager: true);
            return Success(data, "Lấy điều kiện khởi hành tổng thể thành công");
        }

        [HttpPost("trips/{tripId}/approve-departure")]
        public async Task<IActionResult> ApproveDepartureLegacy(string tripId, [FromBody] ManagerApproveDepartureDto? dto)
        {
            try
            {
                var success = await _coordinatorService.ApproveDepartureAsync(tripId, dto);
                if (!success) return NotFoundFailure($"Không tìm thấy chuyến đi: {tripId}");
                return SuccessMessage("Phê duyệt lệnh khởi hành chính thức (READY_TO_DEPART) thành công");
            }
            catch (InvalidOperationException ex)
            {
                return Failure(ex.Message);
            }
        }
    }
}
