using Microsoft.AspNetCore.Mvc;
using Application.DTOs;
using Application.Interfaces;

namespace WebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ManagerController : BaseApiController
    {
        private readonly ICoordinatorService _coordinatorService;

        public ManagerController(ICoordinatorService coordinatorService)
        {
            _coordinatorService = coordinatorService;
        }

        // =========================================================================
        // 1. MANAGER PLANNING QUEUE (F03-M01)
        // GET: /api/manager/planning
        // =========================================================================
        [HttpGet("planning")]
        public async Task<IActionResult> GetPlanningTrips()
        {
            var data = await _coordinatorService.GetManagerPlanningTripsAsync();
            return Success(data, "Lấy danh sách kế hoạch chờ duyệt thành công");
        }

        // =========================================================================
        // 2. VIEW TRIP ROUTE (F03-M02)
        // GET: /api/manager/trips/{tripId}/route
        // =========================================================================
        [HttpGet("trips/{tripId}/route")]
        public async Task<IActionResult> GetTripRoute(string tripId)
        {
            var data = await _coordinatorService.GetManagerTripRouteAsync(tripId);
            return Success(data, "Lấy thông tin lộ trình chuyến đi thành công");
        }

        // =========================================================================
        // 3. APPROVE ROUTE (F03-M03)
        // POST: /api/manager/trips/{tripId}/routes/{routeVersionId}/approve
        // =========================================================================
        [HttpPost("trips/{tripId}/routes/{routeVersionId}/approve")]
        public async Task<IActionResult> ApproveRoute(string tripId, int routeVersionId, [FromBody] ManagerApproveRouteDto dto)
        {
            var success = await _coordinatorService.ApproveRouteVersionAsync(tripId, routeVersionId, dto);
            if (!success) return NotFoundFailure($"Không tìm thấy chuyến đi: {tripId}");
            return SuccessMessage("Phê duyệt lộ trình thành công");
        }

        // =========================================================================
        // 4. RETURN ROUTE (F03-M04)
        // POST: /api/manager/trips/{tripId}/routes/{routeVersionId}/return
        // =========================================================================
        [HttpPost("trips/{tripId}/routes/{routeVersionId}/return")]
        public async Task<IActionResult> ReturnRoute(string tripId, int routeVersionId, [FromBody] ManagerReturnRouteDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Reason))
            {
                return Failure("Lý do trả lại lộ trình là bắt buộc");
            }

            var success = await _coordinatorService.ReturnRouteVersionAsync(tripId, routeVersionId, dto);
            if (!success) return NotFoundFailure($"Không tìm thấy chuyến đi: {tripId}");
            return SuccessMessage("Đã trả lại lộ trình yêu cầu điều chỉnh");
        }

        // =========================================================================
        // 5. DEPARTURE CONDITIONS SNAPSHOT (F03-M06)
        // GET: /api/manager/trips/{tripId}/departure-conditions
        // =========================================================================
        [HttpGet("trips/{tripId}/departure-conditions")]
        public async Task<IActionResult> GetDepartureConditions(string tripId)
        {
            var data = await _coordinatorService.GetDepartureConditionsAsync(tripId, isManager: true);
            return Success(data, "Lấy điều kiện khởi hành tổng thể thành công");
        }

        // =========================================================================
        // 6. APPROVE FINAL DEPARTURE (F03-M07 - BƯỚC 6 TRONG LUỒNG MỚI)
        // POST: /api/manager/trips/{tripId}/approve-departure
        // =========================================================================
        [HttpPost("trips/{tripId}/approve-departure")]
        public async Task<IActionResult> ApproveDeparture(string tripId, [FromBody] ManagerApproveDepartureDto? dto)
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

