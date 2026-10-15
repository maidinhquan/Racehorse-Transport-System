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
        // 1. DASHBOARD OVERVIEW
        // GET: /api/coordinator/dashboard
        // =========================================================================
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var data = await _coordinatorService.GetDashboardAsync();
            return Success(data, "Lấy thông tin dashboard điều phối thành công");
        }

        // =========================================================================
        // 2. PLANNING TRIPS LIST
        // GET: /api/coordinator/planning-trips
        // =========================================================================
        [HttpGet("planning-trips")]
        public async Task<IActionResult> GetPlanningTrips()
        {
            var data = await _coordinatorService.GetPlanningTripsAsync();
            return Success(data, "Lấy danh sách yêu cầu lập kế hoạch thành công");
        }

        // =========================================================================
        // 3. TRIP DETAIL
        // GET: /api/coordinator/trips/{tripId}
        // =========================================================================
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
        // 4. FLEET (VEHICLES) MANAGEMENT
        // GET: /api/coordinator/vehicles
        // GET: /api/coordinator/vehicles/available
        // POST: /api/coordinator/vehicles
        // PUT: /api/coordinator/vehicles/{vehicleId}/status
        // =========================================================================
        [HttpGet("vehicles")]
        public async Task<IActionResult> GetVehicles([FromQuery] bool onlyAvailable = false)
        {
            var data = await _coordinatorService.GetVehiclesAsync(onlyAvailable);
            return Success(data, "Lấy danh sách phương tiện thành công");
        }

        [HttpGet("vehicles/available")]
        public async Task<IActionResult> GetAvailableVehicles()
        {
            var data = await _coordinatorService.GetVehiclesAsync(true);
            return Success(data, "Lấy danh sách phương tiện khả dụng thành công");
        }

        [HttpPost("vehicles")]
        public async Task<IActionResult> CreateVehicle([FromBody] CreateVehicleDto dto)
        {
            var data = await _coordinatorService.CreateVehicleAsync(dto);
            return Success(data, "Thêm phương tiện mới thành công");
        }

        [HttpPut("vehicles/{vehicleId}/status")]
        public async Task<IActionResult> UpdateVehicleStatus(string vehicleId, [FromBody] UpdateVehicleStatusDto dto)
        {
            var success = await _coordinatorService.UpdateVehicleStatusAsync(vehicleId, dto);
            if (!success)
            {
                return NotFoundFailure($"Không tìm thấy xe: {vehicleId}");
            }
            return SuccessMessage("Cập nhật trạng thái xe thành công");
        }

        // =========================================================================
        // 5. STAFF (DRIVERS & ESCORTS / VETS)
        // GET: /api/coordinator/staff
        // =========================================================================
        [HttpGet("staff")]
        public async Task<IActionResult> GetStaff()
        {
            var data = await _coordinatorService.GetStaffListAsync();
            return Success(data, "Lấy danh sách nhân sự tác nghiệp thành công");
        }

        // =========================================================================
        // 6. ROUTE CALCULATION & SEGMENTS
        // POST: /api/coordinator/routes/calculate
        // GET: /api/coordinator/trips/{tripId}/routes
        // POST: /api/coordinator/trips/{tripId}/routes
        // POST: /api/coordinator/trips/{tripId}/submit-route
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
        public async Task<IActionResult> GetRouteSegments(string tripId)
        {
            var data = await _coordinatorService.GetRouteSegmentsAsync(tripId);
            return Success(data, "Lấy danh sách chặng lộ trình thành công");
        }

        [HttpPost("trips/{tripId}/routes")]
        public async Task<IActionResult> SaveRouteSegments(string tripId, [FromBody] SaveRouteSegmentsDto dto)
        {
            var success = await _coordinatorService.SaveRouteSegmentsAsync(tripId, dto);
            if (!success)
            {
                return NotFoundFailure($"Không tìm thấy chuyến đi: {tripId}");
            }
            return SuccessMessage("Lưu danh sách chặng lộ trình thành công");
        }

        [HttpPost("trips/{tripId}/submit-route")]
        public async Task<IActionResult> SubmitRoute(string tripId)
        {
            var success = await _coordinatorService.SubmitRouteForApprovalAsync(tripId);
            if (!success)
            {
                return NotFoundFailure($"Không tìm thấy chuyến đi: {tripId}");
            }
            return SuccessMessage("Nộp lộ trình chờ Logistics Manager phê duyệt thành công");
        }

        // =========================================================================
        // 7. CREW & VEHICLE ASSIGNMENT
        // POST: /api/coordinator/trips/{tripId}/assignments
        // =========================================================================
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
        }

        // =========================================================================
        // 8. TRIP MONITORING (MAP DATA STREAM & POLYLINE)
        // GET: /api/coordinator/trips/{tripId}/monitoring
        // =========================================================================
        [HttpGet("trips/{tripId}/monitoring")]
        public async Task<IActionResult> GetTripMonitoring(string tripId)
        {
            var data = await _coordinatorService.GetTripMonitoringAsync(tripId);
            return Success(data, "Lấy dữ liệu giám sát lộ trình và tọa độ thành công");
        }

        // =========================================================================
        // 9. OPERATIONS READINESS & APPROVALS
        // GET: /api/coordinator/trips/{tripId}/operations-readiness
        // POST: /api/coordinator/trips/{tripId}/operations-readiness/confirm
        // POST: /api/coordinator/trips/{tripId}/approve-route
        // =========================================================================
        [HttpGet("trips/{tripId}/operations-readiness")]
        public async Task<IActionResult> GetOperationsReadiness(string tripId)
        {
            var data = await _coordinatorService.GetOperationsReadinessAsync(tripId);
            return Success(data, "Lấy trạng thái sẵn sàng vận hành thành công");
        }

        [HttpPost("trips/{tripId}/operations-readiness/confirm")]
        public async Task<IActionResult> ConfirmOperationsReadiness(string tripId)
        {
            try
            {
                var success = await _coordinatorService.ConfirmOperationsReadinessAsync(tripId);
                return SuccessMessage("Xác nhận Operations READY thành công! Chuyến đi đã đủ điều kiện khởi hành.");
            }
            catch (InvalidOperationException ex)
            {
                return Failure(ex.Message);
            }
        }

        [HttpPost("trips/{tripId}/approve-route")]
        public async Task<IActionResult> ApproveRoute(string tripId)
        {
            var success = await _coordinatorService.ApproveRouteAsync(tripId);
            if (!success)
            {
                return NotFoundFailure($"Không tìm thấy chuyến đi: {tripId}");
            }
            return SuccessMessage("Phê duyệt lộ trình chuyến đi thành công");
        }
    }
}

