using Microsoft.AspNetCore.Mvc;
using Application.DTOs;
using Application.Interfaces;

namespace WebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CoordinatorController : BaseApiController
    {
        private readonly ICoordinatorService _coordinatorService;

        public CoordinatorController(ICoordinatorService coordinatorService)
        {
            _coordinatorService = coordinatorService;
        }

        // =========================================================================
        // 1. DASHBOARD & PLANNING QUEUE
        // =========================================================================
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var data = await _coordinatorService.GetDashboardAsync();
            return Success(data, "Lấy thông tin dashboard điều phối thành công");
        }

        [HttpGet("planning-trips")]
        public async Task<IActionResult> GetPlanningTrips()
        {
            var data = await _coordinatorService.GetPlanningTripsAsync();
            return Success(data, "Lấy danh sách yêu cầu lập kế hoạch thành công");
        }

        [HttpGet("unplanned-requests")]
        public async Task<IActionResult> GetUnplannedRequests()
        {
            var data = await _coordinatorService.GetUnplannedRequestsAsync();
            return Success(data, "Lấy danh sách đơn yêu cầu từ khách hàng chờ lập kế hoạch thành công");
        }

        [HttpPost("trips/start-planning")]
        public async Task<IActionResult> StartPlanningTrip([FromBody] StartPlanningRequestDto dto)
        {
            try
            {
                var data = await _coordinatorService.StartPlanningTripAsync(dto);
                return Success(data, "Khởi tạo kế hoạch chuyến đi từ đơn yêu cầu thành công");
            }
            catch (KeyNotFoundException ex)
            {
                return NotFoundFailure(ex.Message);
            }
            catch (Exception ex)
            {
                return Failure(ex.Message);
            }
        }

        [HttpPost("trips/start-planning/{requestId}")]
        public async Task<IActionResult> StartPlanningTripByPath(string requestId)
        {
            try
            {
                var data = await _coordinatorService.StartPlanningTripAsync(new StartPlanningRequestDto { RequestId = requestId });
                return Success(data, "Khởi tạo kế hoạch chuyến đi từ đơn yêu cầu thành công");
            }
            catch (KeyNotFoundException ex)
            {
                return NotFoundFailure(ex.Message);
            }
            catch (Exception ex)
            {
                return Failure(ex.Message);
            }
        }

        [HttpGet("trips/{tripId}")]
        public async Task<IActionResult> GetTripDetail(string tripId)
        {
            var data = await _coordinatorService.GetTripDetailAsync(tripId);
            if (data == null)
            {
                return NotFoundFailure($"Không tìm thấy chuyến đi: {tripId}");
            }
            return Success(data, "Lấy chi tiết chuyến đi thành công");
        }

        // =========================================================================
        // 2. CHECKPOINTS CATALOG (F03-C04)
        // =========================================================================
        [HttpGet("checkpoints")]
        public async Task<IActionResult> GetCheckpoints([FromQuery] string? country, [FromQuery] string? type, [FromQuery] string? q)
        {
            var data = await _coordinatorService.GetCheckpointsAsync(country, type, q);
            return Success(data, "Lấy danh mục điểm kiểm soát / trạm dừng thành công");
        }

        [HttpGet("maps/geocode")]
        public async Task<IActionResult> GeocodeAddress([FromQuery] string address, [FromQuery] string? country = "VN")
        {
            var data = await _coordinatorService.GeocodeAddressAsync(address, country);
            return Success(data, "Tra cứu tọa độ địa chỉ thành công");
        }

        // =========================================================================
        // 3. FLEET (VEHICLES) MANAGEMENT (F03-C11 to F03-C17)
        // =========================================================================
        [HttpGet("vehicles")]
        public async Task<IActionResult> GetVehicles([FromQuery] string? status, [FromQuery] string? country, [FromQuery] int? minAvailableStalls)
        {
            var data = await _coordinatorService.GetVehiclesAsync(status, country, minAvailableStalls);
            return Success(data, "Lấy danh sách phương tiện thành công");
        }

        [HttpGet("vehicles/{vehicleId}")]
        public async Task<IActionResult> GetVehicleDetail(string vehicleId)
        {
            var data = await _coordinatorService.GetVehicleDetailAsync(vehicleId);
            if (data == null) return NotFoundFailure($"Không tìm thấy xe: {vehicleId}");
            return Success(data, "Lấy thông tin xe thành công");
        }

        [HttpGet("vehicles/available")]
        public async Task<IActionResult> GetAvailableVehicles([FromQuery] string? tripId, [FromQuery] int? legId)
        {
            var data = await _coordinatorService.GetAvailableVehiclesAsync(tripId, legId);
            return Success(data, "Lấy danh sách xe khả dụng thành công");
        }

        [HttpPost("vehicles")]
        public async Task<IActionResult> CreateVehicle([FromBody] CreateVehicleDto dto)
        {
            var data = await _coordinatorService.CreateVehicleAsync(dto);
            return Success(data, "Thêm phương tiện mới thành công");
        }

        [HttpPut("vehicles/{vehicleId}")]
        public async Task<IActionResult> UpdateVehicle(string vehicleId, [FromBody] CreateVehicleDto dto)
        {
            var data = await _coordinatorService.UpdateVehicleAsync(vehicleId, dto);
            if (data == null) return NotFoundFailure($"Không tìm thấy xe: {vehicleId}");
            return Success(data, "Cập nhật phương tiện thành công");
        }

        [HttpPatch("vehicles/{vehicleId}/status")]
        [HttpPut("vehicles/{vehicleId}/status")]
        public async Task<IActionResult> UpdateVehicleStatus(string vehicleId, [FromBody] UpdateVehicleStatusDto dto)
        {
            var success = await _coordinatorService.UpdateVehicleStatusAsync(vehicleId, dto);
            if (!success) return NotFoundFailure($"Không tìm thấy xe: {vehicleId}");
            return SuccessMessage("Cập nhật trạng thái phương tiện thành công");
        }

        [HttpGet("vehicles/{vehicleId}/schedule")]
        public async Task<IActionResult> GetVehicleSchedule(string vehicleId)
        {
            var data = await _coordinatorService.GetVehicleScheduleAsync(vehicleId);
            return Success(data, "Lấy lịch sử dụng xe thành công");
        }

        // =========================================================================
        // 4. STAFF & SCHEDULES (F03-C18, F03-C19)
        // =========================================================================
        [HttpGet("staff")]
        public async Task<IActionResult> GetStaff([FromQuery] string? role, [FromQuery] string? country)
        {
            var data = await _coordinatorService.GetStaffListAsync(role, country);
            return Success(data, "Lấy danh sách nhân sự tác nghiệp thành công");
        }

        [HttpGet("staff/{userId}/schedule")]
        public async Task<IActionResult> GetStaffSchedule(string userId)
        {
            var data = await _coordinatorService.GetStaffScheduleAsync(userId);
            return Success(data, "Lấy lịch phân công nhân sự thành công");
        }

        // =========================================================================
        // 5. ROUTE CALCULATION & ROUTE VERSIONS (F03-C05 to F03-C10)
        // =========================================================================
        [HttpPost("routes/calculate")]
        public async Task<IActionResult> CalculateRoute([FromBody] RouteCalculateRequestDto dto)
        {
            try
            {
                var data = await _coordinatorService.CalculateRouteAsync(dto);
                return Success(data, "Tính toán lộ trình và kiểm tra phúc lợi ngựa thành công");
            }
            catch (ArgumentException ex)
            {
                return Failure(ex.Message);
            }
        }

        [HttpGet("trips/{tripId}/routes")]
        public async Task<IActionResult> GetRouteVersions(string tripId)
        {
            var data = await _coordinatorService.GetRouteVersionsAsync(tripId);
            return Success(data, "Lấy danh sách phiên bản lộ trình thành công");
        }

        [HttpGet("routes/{routeVersionId}")]
        public async Task<IActionResult> GetRouteVersionDetail(int routeVersionId)
        {
            var data = await _coordinatorService.GetRouteVersionDetailAsync(routeVersionId);
            if (data == null) return NotFoundFailure($"Không tìm thấy lộ trình phiên bản: {routeVersionId}");
            return Success(data, "Lấy chi tiết lộ trình thành công");
        }

        [HttpPost("trips/{tripId}/routes")]
        public async Task<IActionResult> CreateRouteDraft(string tripId, [FromBody] RouteDraftPayloadDto dto)
        {
            var data = await _coordinatorService.CreateRouteDraftAsync(tripId, dto);
            return Success(data, "Tạo bản nháp lộ trình thành công");
        }

        [HttpPut("routes/{routeVersionId}")]
        public async Task<IActionResult> UpdateRouteDraft(int routeVersionId, [FromBody] RouteDraftPayloadDto dto)
        {
            var data = await _coordinatorService.UpdateRouteDraftAsync(routeVersionId, dto);
            return Success(data, "Cập nhật bản nháp lộ trình thành công");
        }

        [HttpPost("routes/{routeVersionId}/submit")]
        public async Task<IActionResult> SubmitRouteVersion(int routeVersionId, [FromBody] SubmitRouteDto dto)
        {
            var data = await _coordinatorService.SubmitRouteVersionAsync(routeVersionId, dto);
            return Success(data, "Nộp lộ trình chờ phê duyệt thành công");
        }

        [HttpPost("trips/{tripId}/submit-route")]
        public async Task<IActionResult> SubmitRoute(string tripId)
        {
            var success = await _coordinatorService.SubmitRouteForApprovalAsync(tripId);
            if (!success) return NotFoundFailure($"Không tìm thấy chuyến đi: {tripId}");
            return Success(new { tripId = tripId, status = "SUBMITTED" }, "Nộp lộ trình chờ Logistics Manager phê duyệt thành công");
        }

        // =========================================================================
        // 6. LEG ASSIGNMENTS (F03-C20 to F03-C22)
        // =========================================================================
        [HttpGet("trips/{tripId}/assignments")]
        public async Task<IActionResult> GetTripAssignments(string tripId)
        {
            var data = await _coordinatorService.GetTripAssignmentsAsync(tripId);
            return Success(data, "Lấy chi tiết phân công theo chặng thành công");
        }

        [HttpPost("trips/{tripId}/assignments/validate")]
        public async Task<IActionResult> ValidateAssignments(string tripId, [FromBody] TripAssignmentsDetailDto dto)
        {
            var data = await _coordinatorService.ValidateAssignmentsAsync(tripId, dto);
            return Success(data, "Kiểm tra phân công thành công");
        }

        [HttpPut("trips/{tripId}/assignments")]
        public async Task<IActionResult> SaveTripAssignments(string tripId, [FromBody] TripAssignmentsDetailDto dto)
        {
            var success = await _coordinatorService.SaveTripAssignmentsAsync(tripId, dto);
            if (!success) return NotFoundFailure($"Không tìm thấy chuyến đi: {tripId}");
            return SuccessMessage("Lưu phân công xe và nhân sự thành công");
        }

        [HttpPost("trips/{tripId}/assignments")]
        public async Task<IActionResult> AssignCrewAndVehicle(string tripId, [FromBody] AssignCrewVehicleDto dto)
        {
            try
            {
                var success = await _coordinatorService.AssignCrewAndVehicleAsync(tripId, dto);
                return SuccessMessage("Phân công xe, tài xế và hộ tống viên thành công");
            }
            catch (KeyNotFoundException ex)
            {
                return NotFoundFailure(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Failure(ex.Message);
            }
            catch (Exception ex)
            {
                return Failure(ex.Message);
            }
        }

        // =========================================================================
        // 7. FLIGHT BOOKING (AIR LEG) (F03-C23, F03-C24)
        // =========================================================================
        [HttpGet("trips/{tripId}/flight-booking")]
        public async Task<IActionResult> GetFlightBooking(string tripId)
        {
            var data = await _coordinatorService.GetFlightBookingAsync(tripId);
            return Success(data, "Lấy thông tin đặt vé hàng không thành công");
        }

        [HttpPut("trips/{tripId}/flight-booking")]
        public async Task<IActionResult> SaveFlightBooking(string tripId, [FromBody] UpdateFlightBookingDto dto)
        {
            var data = await _coordinatorService.SaveFlightBookingAsync(tripId, dto);
            return Success(data, "Ghi nhận thông tin chuyến bay thành công");
        }

        // =========================================================================
        // 8. OPERATIONS READINESS & DEPARTURE CONDITIONS (F03-C25 to F03-C27)
        // =========================================================================
        [HttpGet("trips/{tripId}/operations-readiness")]
        public async Task<IActionResult> GetOperationsReadiness(string tripId)
        {
            var data = await _coordinatorService.GetOperationsReadinessAsync(tripId);
            return Success(data, "Lấy trạng thái sẵn sàng vận hành thành công");
        }

        [HttpPost("trips/{tripId}/operations-readiness/confirm")]
        [HttpPost("trips/{tripId}/resources/confirm")]
        public async Task<IActionResult> ConfirmOperationsReadiness(string tripId, [FromBody] ConfirmOperationsReadinessRequestDto? dto)
        {
            try
            {
                var success = await _coordinatorService.ConfirmOperationsReadinessAsync(tripId, dto);
                return SuccessMessage("Xác nhận Operations READY thành công! Chuyến đi đã đủ điều kiện vận hành.");
            }
            catch (InvalidOperationException ex)
            {
                return Failure(ex.Message);
            }
            catch (Exception ex)
            {
                return Failure(ex.Message);
            }
        }

        [HttpGet("trips/{tripId}/departure-conditions")]
        public async Task<IActionResult> GetDepartureConditions(string tripId)
        {
            var data = await _coordinatorService.GetDepartureConditionsAsync(tripId, isManager: false);
            return Success(data, "Lấy điều kiện khởi hành thành công");
        }

        // =========================================================================
        // 9. TRIP MONITORING (MAP DATA STREAM & POLYLINE)
        // =========================================================================
        [HttpGet("trips/{tripId}/monitoring")]
        public async Task<IActionResult> GetTripMonitoring(string tripId)
        {
            var data = await _coordinatorService.GetTripMonitoringAsync(tripId);
            return Success(data, "Lấy dữ liệu giám sát lộ trình và tọa độ thành công");
        }
    }
}
