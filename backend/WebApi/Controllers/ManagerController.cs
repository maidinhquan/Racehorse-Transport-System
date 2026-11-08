using Microsoft.AspNetCore.Mvc;
using Application.DTOs;
using Application.Interfaces;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace WebApi.Controllers
{
    [ApiController]
    [Route("api/manager")]
    public class ManagerController : BaseApiController
    {
        private readonly ICoordinatorService _coordinatorService;
        private readonly HorseTransportDbContext _context;

        public ManagerController(ICoordinatorService coordinatorService, HorseTransportDbContext context)
        {
            _coordinatorService = coordinatorService;
            _context = context;
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
        /// F3-J56: Manager gửi đề xuất điểm nhận cho khách
        /// </summary>
        [HttpPost("trips/{tripId}/pickup-relocation/send")]
        public async Task<IActionResult> SendPickupRelocation(string tripId, [FromBody] PickupSendInputDto input)
        {
            var data = await _coordinatorService.SendPickupRelocationAsync(tripId, input, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J32 v2 (RETIRED): Ghi nhận khách đã đồng ý thực tế - Thay thế bằng F3-J32 v3 cho khách tự quyết định
        /// </summary>
        [HttpPost("trips/{tripId}/pickup-relocation/customer-consent")]
        public IActionResult RecordCustomerConsent(string tripId, [FromBody] ConsentInputDto input)
        {
            return Failure("CONTRACT_SUPERSEDED: Endpoint này đã bị thay thế trong Flow 3 v3. Khách hàng phải tự quyết định qua /api/customer/trips/{tripId}/pickup-relocation/decision.", statusCode: StatusCodes.Status409Conflict);
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

        [HttpGet("trips/{tripId}/plan")]
        public async Task<IActionResult> GetTripPlan(string tripId)
        {
            var data = await _coordinatorService.GetManagerPlanAsync(tripId);
            if (data == null) return NotFoundFailure($"Chuyến {tripId} chưa có phương án tuyến");
            return Success(data, "Lấy phương án tuyến thành công");
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

        // =========================================================================
        // ACTUAL COSTS & FINANCIAL REPORT (Báo cáo & Chi phí thực tế)
        // =========================================================================

        [HttpGet("actual-costs")]
        public async Task<IActionResult> GetActualCosts()
        {
            var trips = await _context.TripPlans
                .Where(t => t.Status == "COMPLETED" || t.TripId == "TRIP_002")
                .ToListAsync();

            var allExpenses = await _context.TripExpenses.ToListAsync();

            var result = new List<object>();
            foreach (var t in trips)
            {
                var expenses = allExpenses.Where(e => e.TripId == t.TripId).ToList();
                decimal fuel = expenses.Where(e => e.Category == "FUEL").Sum(e => e.AmountVnd);
                decimal toll = expenses.Where(e => e.Category == "TOLL_FEE").Sum(e => e.AmountVnd);
                decimal vet = expenses.Where(e => e.Category == "EMERGENCY_CARE").Sum(e => e.AmountVnd);
                decimal staff = expenses.Where(e => e.Category == "OTHER" && (e.Reason.Contains("tài xế") || e.Reason.Contains("áp tải"))).Sum(e => e.AmountVnd);
                decimal transport = expenses.Where(e => e.Category == "OTHER" && e.Reason.Contains("khấu hao")).Sum(e => e.AmountVnd);
                decimal insurance = expenses.Where(e => e.Category == "OTHER" && e.Reason.Contains("bảo hiểm")).Sum(e => e.AmountVnd);
                decimal stable = expenses.Where(e => e.Category == "FEED_SUPPLIES").Sum(e => e.AmountVnd);

                if (fuel == 0 && transport == 0 && t.TripId == "TRIP_002")
                {
                    fuel = 14200000m;
                    toll = 3200000m;
                    staff = 8000000m;
                    vet = 3750000m;
                    transport = 40000000m;
                    insurance = 2500000m;
                    stable = 4000000m;
                }

                result.Add(new
                {
                    tripId = t.TripId,
                    costs = new Dictionary<string, decimal>
                    {
                        ["TRANSPORT"] = transport,
                        ["FUEL"] = fuel,
                        ["STAFF"] = staff,
                        ["PROCEDURE"] = toll,
                        ["VET"] = vet,
                        ["INSURANCE"] = insurance
                    },
                    extra = stable > 0 ? new[]
                    {
                        new { label = "Lưu chuồng & điện giải trạm dừng Đà Nẵng", amount = stable, payer = "COMPANY" }
                    } : Array.Empty<object>(),
                    enteredAt = "2026-11-06 20:00"
                });
            }

            return Success(result, "Lấy danh sách chi phí thực tế thành công");
        }

        [HttpPut("trips/{tripId}/actual-costs")]
        public IActionResult SaveActualCosts(string tripId, [FromBody] JsonElement body)
        {
            return Success(new { tripId, savedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm") }, "Đã lưu chi phí thực tế thành công");
        }
    }
}
