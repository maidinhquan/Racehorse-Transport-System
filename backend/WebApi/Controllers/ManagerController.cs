using Microsoft.AspNetCore.Mvc;
using Application.DTOs;
using Application.Interfaces;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ManagerController : BaseApiController
    {
        private readonly ICoordinatorService _coordinatorService;
        private readonly IFlow1ManagerService _managerService;
        private readonly HorseTransportDbContext _context;

        public ManagerController(
            ICoordinatorService coordinatorService,
            IFlow1ManagerService managerService,
            HorseTransportDbContext context)
        {
            _coordinatorService = coordinatorService;
            _managerService = managerService;
            _context = context;
        }

        // =========================================================================
        // FLOW 1: REQUESTS & CONTRACT WORKFLOWS
        // =========================================================================

        [HttpGet("requests")]
        public async Task<IActionResult> GetRequests()
        {
            var data = await _managerService.GetRequestsAsync();
            return Success(data, "Lấy danh sách yêu cầu vận chuyển thành công");
        }

        [HttpGet("requests/{id}")]
        public async Task<IActionResult> GetRequestById(string id)
        {
            var data = await _managerService.GetRequestByIdAsync(id);
            if (data == null) return NotFoundFailure($"Không tìm thấy yêu cầu: {id}");
            return Success(data, "Lấy chi tiết yêu cầu thành công");
        }

        [HttpPost("requests/{id}/accept")]
        public async Task<IActionResult> AcceptRequest(string id)
        {
            var data = await _managerService.AcceptRequestAsync(id);
            if (data == null) return NotFoundFailure($"Không tìm thấy yêu cầu: {id}");
            return Success(data, "Chấp thuận yêu cầu thành công");
        }

        [HttpPost("requests/{id}/request-changes")]
        public async Task<IActionResult> RequestChanges(string id, [FromBody] ManagerRequestChangesDto dto)
        {
            var data = await _managerService.RequestChangesAsync(id, dto);
            if (data == null) return NotFoundFailure($"Không tìm thấy yêu cầu: {id}");
            return Success(data, "Đã gửi yêu cầu chỉnh sửa cho khách hàng");
        }

        [HttpPost("requests/{id}/reject")]
        public async Task<IActionResult> RejectRequest(string id, [FromBody] ManagerRejectRequestDto dto)
        {
            var data = await _managerService.RejectRequestAsync(id, dto);
            if (data == null) return NotFoundFailure($"Không tìm thấy yêu cầu: {id}");
            return Success(data, "Đã từ chối yêu cầu vận chuyển");
        }

        [HttpPost("requests/{id}/cost-estimate")]
        public async Task<IActionResult> GetCostEstimate(string id, [FromBody] CostEstimateRequestDto dto)
        {
            var data = await _managerService.GetCostEstimateAsync(id, dto);
            return Success(data, "Tính toán dự toán chi phí thành công");
        }

        [HttpGet("requests/{id}/contract-editor")]
        public async Task<IActionResult> GetContractEditor(string id, [FromQuery] string? mode)
        {
            var data = await _managerService.GetContractEditorAsync(id, mode);
            if (data == null) return NotFoundFailure($"Không tìm thấy yêu cầu: {id}");
            return Success(data, "Lấy dữ liệu soạn thảo hợp đồng thành công");
        }

        [HttpPut("requests/{id}/contract-draft")]
        public async Task<IActionResult> SaveContractDraft(string id, [FromBody] ManagerContractDraftDto draft)
        {
            var success = await _managerService.SaveContractDraftAsync(id, draft);
            if (!success) return NotFoundFailure($"Không tìm thấy yêu cầu: {id}");
            return Success(new { requestId = id, draft }, "Lưu bản nháp hợp đồng thành công");
        }

        [HttpPost("requests/{id}/contract/publish")]
        public async Task<IActionResult> PublishContract(string id, [FromBody] ManagerPublishContractDto dto)
        {
            var data = await _managerService.PublishContractAsync(id, dto.VersionNo);
            return Success(data, "Phát hành hợp đồng thành công");
        }

        [HttpPost("contracts/{id}/feedback/decision")]
        public async Task<IActionResult> RespondFeedback(string id, [FromBody] ManagerRespondFeedbackDto dto)
        {
            var success = await _managerService.RespondFeedbackAsync(id, dto);
            if (!success) return NotFoundFailure($"Không tìm thấy hợp đồng: {id}");
            return SuccessMessage("Đã phản hồi ý kiến khách hàng");
        }

        [HttpPost("contracts/{id}/extend-deadline")]
        public async Task<IActionResult> ExtendDeadline(string id, [FromBody] ManagerExtendDeadlineDto dto)
        {
            var success = await _managerService.ExtendDeadlineAsync(id, dto);
            if (!success) return NotFoundFailure($"Không tìm thấy hợp đồng: {id}");
            return Success(new { validUntil = DateTime.UtcNow.AddHours(24).ToString("yyyy-MM-dd HH:mm") }, "Gia hạn thời gian thành công");
        }

        [HttpPost("contracts/{id}/reminder")]
        public IActionResult RemindSign(string id)
        {
            return SuccessMessage("Đã gửi email nhắc nhở ký hợp đồng cho khách hàng");
        }

        [HttpGet("customers")]
        public async Task<IActionResult> GetCustomers()
        {
            var customers = await _context.Users
                .AsNoTracking()
                .Where(u => u.Role == "Customer" || u.Role == "CUSTOMER")
                .Select(u => new ManagerCustomerInfoDto
                {
                    Id = u.UserId,
                    Name = u.FullName,
                    Email = u.Email ?? "",
                    Phone = u.Phone ?? "",
                    Company = "CLB Đua Ngựa"
                })
                .ToListAsync();
            return Success(customers, "Lấy danh sách khách hàng thành công");
        }

        [HttpGet("horses")]
        public async Task<IActionResult> GetHorses()
        {
            var horses = await _context.Horses
                .AsNoTracking()
                .Select(h => new ManagerHorseRefDto
                {
                    Id = h.HorseId,
                    Name = h.Name,
                    Breed = h.Breed ?? "Thoroughbred",
                    Microchip = h.MicrochipIso,
                    PassportNo = h.FeiPassportNo ?? ""
                })
                .ToListAsync();
            return Success(horses, "Lấy danh sách ngựa thành công");
        }

        [HttpGet("staff")]
        public async Task<IActionResult> GetStaff()
        {
            var staff = await _coordinatorService.GetStaffListAsync();
            return Success(staff, "Lấy danh sách nhân sự thành công");
        }

        [HttpGet("trips")]
        public async Task<IActionResult> GetTrips()
        {
            var trips = await _coordinatorService.GetPlanningTripsAsync();
            return Success(trips, "Lấy danh sách chuyến đi thành công");
        }

        [HttpGet("payments")]
        public async Task<IActionResult> GetPayments()
        {
            var payments = await _context.Payments
                .AsNoTracking()
                .OrderByDescending(p => p.PaymentDate)
                .Select(p => new
                {
                    id = p.PaymentId,
                    invoiceId = p.InvoiceId,
                    amount = p.Amount,
                    method = p.Method,
                    status = p.Status,
                    createdAt = p.PaymentDate.ToString("yyyy-MM-dd HH:mm")
                })
                .ToListAsync();
            return Success(payments, "Lấy danh sách giao dịch thành công");
        }

        [HttpGet("notifications")]
        public IActionResult GetNotifications()
        {
            return Success(Array.Empty<object>(), "Lấy danh sách thông báo thành công");
        }

        // =========================================================================
        // COORDINATOR / ROUTE APPROVAL (EXISTING)
        // =========================================================================

        [HttpGet("planning")]
        public async Task<IActionResult> GetPlanningTrips()
        {
            var data = await _coordinatorService.GetManagerPlanningTripsAsync();
            return Success(data, "Lấy danh sách kế hoạch chờ duyệt thành công");
        }

        [HttpGet("trips/{tripId}/route")]
        public async Task<IActionResult> GetTripRoute(string tripId)
        {
            var data = await _coordinatorService.GetManagerTripRouteAsync(tripId);
            return Success(data, "Lấy thông tin lộ trình chuyến đi thành công");
        }

        [HttpPost("trips/{tripId}/routes/{routeVersionId}/approve")]
        public async Task<IActionResult> ApproveRoute(string tripId, int routeVersionId, [FromBody] ManagerApproveRouteDto dto)
        {
            var success = await _coordinatorService.ApproveRouteVersionAsync(tripId, routeVersionId, dto);
            if (!success) return NotFoundFailure($"Không tìm thấy chuyến đi: {tripId}");
            return SuccessMessage("Phê duyệt lộ trình thành công");
        }

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

        [HttpGet("trips/{tripId}/departure-conditions")]
        public async Task<IActionResult> GetDepartureConditions(string tripId)
        {
            var data = await _coordinatorService.GetDepartureConditionsAsync(tripId, isManager: true);
            return Success(data, "Lấy điều kiện khởi hành tổng thể thành công");
        }
    }
}
