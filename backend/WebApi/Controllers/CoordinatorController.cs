using Microsoft.AspNetCore.Mvc;
using Application.DTOs;
using Application.Interfaces;

namespace WebApi.Controllers
{
    public class FlightEvidenceUploadForm
    {
        [FromForm(Name = "expectedVersion")]
        public int ExpectedVersion { get; set; }

        [FromForm(Name = "file")]
        public IFormFile File { get; set; } = null!;
    }

    [ApiController]
    [Route("api/coordinator")]
    public class CoordinatorController : BaseApiController
    {
        private readonly ICoordinatorService _coordinatorService;

        public CoordinatorController(ICoordinatorService coordinatorService)
        {
            _coordinatorService = coordinatorService;
        }

        // =========================================================================
        // FLOW 3 V2 ENDPOINTS (CONTRACT 2.0.0)
        // =========================================================================

        /// <summary>
        /// F3-J23: Danh sách chuyến được giao và KPI planning
        /// </summary>
        [HttpGet("trips")]
        public async Task<IActionResult> GetAssignedTrips([FromQuery] string? status, [FromQuery] string? mode)
        {
            var data = await _coordinatorService.GetCoordinatorTripsV2Async(mode, status, null);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J24: Chi tiết chuyến, điểm nhận/giao, ngựa và readiness
        /// </summary>
        [HttpGet("trips/{tripId}")]
        public async Task<IActionResult> GetTripDetail(string tripId)
        {
            var data = await _coordinatorService.GetTripContextAsync(tripId, "COORDINATOR");
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J04: Context điều phối và cả hai nhánh chuẩn bị
        /// </summary>
        [HttpGet("trips/{tripId}/planning-context")]
        public async Task<IActionResult> GetPlanningContext(string tripId)
        {
            var data = await _coordinatorService.GetTripContextAsync(tripId, "COORDINATOR");
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J06: Lưu nháp tuyến, lịch, xe và nhân sự
        /// </summary>
        [HttpPut("trips/{tripId}/plan-draft")]
        public async Task<IActionResult> SavePlanDraft(string tripId, [FromBody] PlanDraftInputDto draft)
        {
            var data = await _coordinatorService.SavePlanDraftAsync(tripId, draft, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J07: Kiểm nháp, không giữ nguồn lực
        /// </summary>
        [HttpPost("trips/{tripId}/plan/validate")]
        public async Task<IActionResult> ValidatePlanDraft(string tripId, [FromBody] PlanCommandDto dto)
        {
            var data = await _coordinatorService.ValidatePlanDraftAsync(tripId, dto);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J08: Gửi tổng thể và giữ tạm nguyên tử
        /// </summary>
        [HttpPost("trips/{tripId}/plan/submit")]
        public async Task<IActionResult> SubmitPlan(string tripId, [FromBody] PlanCommandDto dto)
        {
            var data = await _coordinatorService.SubmitPlanAsync(tripId, dto, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J11: Duyệt/trả toàn bộ phương án (Điều phối & Quản lý)
        /// </summary>
        [HttpPost("trips/{tripId}/plan/decision")]
        public async Task<IActionResult> PlanDecision(string tripId, [FromBody] PlanDecisionInputDto dto)
        {
            var data = await _coordinatorService.PlanDecisionAsync(tripId, dto, CurrentUserId, "Logistics Manager");
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J09: Rút nháp/chờ duyệt/trả lại
        /// </summary>
        [HttpPost("trips/{tripId}/plan/withdraw")]
        public async Task<IActionResult> WithdrawPlan(string tripId, [FromBody] ReasonCommandDto dto)
        {
            var data = await _coordinatorService.WithdrawPlanAsync(tripId, dto, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J12: Tạo bản điều chỉnh approved/flight proposal
        /// </summary>
        [HttpPost("trips/{tripId}/plan/changes")]
        public async Task<IActionResult> ReopenPlanForChanges(string tripId, [FromBody] ReasonCommandDto dto)
        {
            var data = await _coordinatorService.CreatePlanChangesAsync(tripId, dto, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J14: Xác nhận bố trí xe/người và tính Ops READY
        /// </summary>
        [HttpPost("trips/{tripId}/resources/confirm")]
        public async Task<IActionResult> ConfirmResources(string tripId, [FromBody] PlanCommandDto dto)
        {
            var data = await _coordinatorService.ConfirmResourcesV2Async(tripId, dto, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J15: Kiểm tra/xác nhận lại Ops READY
        /// </summary>
        [HttpPost("trips/{tripId}/ops-ready")]
        public async Task<IActionResult> ReevaluateOpsReady(string tripId, [FromBody] ExpectedDto dto)
        {
            var data = await _coordinatorService.ReevaluateOpsReadyAsync(tripId, dto);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J25: Tính tuyến đường bộ tham khảo
        /// </summary>
        [HttpPost("trips/{tripId}/plan/routing")]
        public async Task<IActionResult> CalculateRoute(string tripId, [FromBody] RoutingInputDto dto)
        {
            var data = await _coordinatorService.CalculateRouteV2Async(tripId, dto);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J26: Kiểm tuyến theo kích thước/tải trọng xe
        /// </summary>
        [HttpPost("trips/{tripId}/plan/truck-check")]
        public async Task<IActionResult> CheckTruckRoute(string tripId, [FromBody] PlanCommandDto dto)
        {
            var data = await _coordinatorService.CheckTruckFeasibilityAsync(tripId, dto);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J27: Lọc xe theo chặng/sức chứa/quốc gia/lối vào
        /// </summary>
        [HttpGet("trips/{tripId}/vehicle-options")]
        public async Task<IActionResult> GetVehicleOptions(string tripId, [FromQuery] string? leg)
        {
            var data = await _coordinatorService.GetVehicleOptionsV2Async(tripId, leg);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J55: Danh mục xe và thông số đã xác minh (read-only cho coordinator)
        /// </summary>
        [HttpGet("vehicles")]
        public async Task<IActionResult> GetVehicles([FromQuery] string? status, [FromQuery] string? country, [FromQuery] int? minAvailableStalls)
        {
            var data = await _coordinatorService.GetVehiclesAsync(status, country, minAvailableStalls);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J28: Ghi xác minh xe có vào địa chỉ nhận
        /// </summary>
        [HttpPut("trips/{tripId}/pickup-access")]
        public async Task<IActionResult> VerifyPickupAccess(string tripId, [FromBody] AccessInputDto dto)
        {
            var data = await _coordinatorService.EvaluatePickupAccessAsync(tripId, dto, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J29: Tìm cơ sở tiếp nhận thay thế
        /// </summary>
        [HttpGet("trips/{tripId}/pickup-relocation/candidates")]
        public async Task<IActionResult> GetRelocationCandidates(string tripId)
        {
            var data = await _coordinatorService.GetRelocationCandidatesAsync(tripId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J30: Đề xuất điểm nhận thay thế
        /// </summary>
        [HttpPost("trips/{tripId}/pickup-relocation")]
        public async Task<IActionResult> ProposePickupRelocation(string tripId, [FromBody] PickupProposalInputDto dto)
        {
            var data = await _coordinatorService.ProposePickupRelocationAsync(tripId, dto, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J33: Mở lại đề xuất điểm nhận đã chốt
        /// </summary>
        [HttpPost("trips/{tripId}/pickup-relocation/revisions")]
        public async Task<IActionResult> ReopenRelocation(string tripId, [FromBody] ExpectedDto dto)
        {
            var data = await _coordinatorService.ReopenRelocationProposalAsync(tripId, dto, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J05: Tra chuyến bay đối tác (read-only)
        /// </summary>
        [HttpGet("flights")]
        public async Task<IActionResult> GetFlightCatalog([FromQuery] string? tripId, [FromQuery] string? partnerId, [FromQuery] string? code)
        {
            var data = await _coordinatorService.GetFlightCatalogAsync(partnerId, null, null);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J54: Tra mã chuyến trong đúng bên dịch vụ
        /// </summary>
        [HttpGet("flights/lookup")]
        public async Task<IActionResult> LookupFlight([FromQuery] string tripId, [FromQuery] string partnerId, [FromQuery] string providerFlightCode)
        {
            var data = await _coordinatorService.LookupFlightAsync(partnerId, providerFlightCode);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J39: Chọn dịch vụ đúng partner/mã vào draft
        /// </summary>
        [HttpPut("trips/{tripId}/flight/selection")]
        public async Task<IActionResult> SelectFlight(string tripId, [FromBody] FlightSelectInputDto dto)
        {
            var data = await _coordinatorService.SelectFlightAsync(tripId, dto, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J40: Gửi riêng chi phí dịch vụ bay
        /// </summary>
        [HttpPost("trips/{tripId}/flight/proposal/submit")]
        public async Task<IActionResult> SubmitFlightProposal(string tripId, [FromBody] BudgetCommandDto dto)
        {
            var data = await _coordinatorService.SubmitFlightBudgetProposalAsync(tripId, dto, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J13: Ghi nhận booking đã xác nhận bởi đối tác
        /// </summary>
        [HttpPost("trips/{tripId}/flight/booking")]
        public async Task<IActionResult> SaveFlightBooking(string tripId, [FromBody] BookingInputDto dto)
        {
            var data = await _coordinatorService.SaveFlightBookingV2Async(tripId, dto, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J20: Ghi nhận hủy booking đã được đối tác xác nhận
        /// </summary>
        [HttpPost("trips/{tripId}/flight/booking/cancel")]
        public async Task<IActionResult> CancelFlightBooking(string tripId, [FromBody] CancelBookingInputDto dto)
        {
            var data = await _coordinatorService.CancelFlightBookingV2Async(tripId, dto, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J42: Upload bằng chứng đối tác (tùy chọn booking)
        /// </summary>
        [HttpPost("trips/{tripId}/flight/evidence")]
        public async Task<IActionResult> UploadFlightEvidence(string tripId, [FromForm] FlightEvidenceUploadForm form)
        {
            if (form.File == null || form.File.Length == 0)
            {
                return Failure("File đính kèm không hợp lệ", statusCode: StatusCodes.Status400BadRequest);
            }

            if (form.File.Length > 10485760) // 10MB
            {
                return Failure("Kích thước file vượt quá giới hạn 10MB (FILE_TOO_LARGE)", statusCode: StatusCodes.Status413PayloadTooLarge);
            }

            var allowedExts = new[] { ".pdf", ".jpg", ".jpeg", ".png" };
            var ext = Path.GetExtension(form.File.FileName).ToLowerInvariant();
            if (!allowedExts.Contains(ext))
            {
                return Failure("Chỉ chấp nhận file định dạng PDF, JPG, PNG (UNSUPPORTED_MEDIA_TYPE)", statusCode: StatusCodes.Status415UnsupportedMediaType);
            }

            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "evidence");
            if (!Directory.Exists(uploadsDir))
            {
                Directory.CreateDirectory(uploadsDir);
            }

            var uniqueFileName = $"{tripId}_{Guid.NewGuid():N}_{Path.GetFileName(form.File.FileName)}";
            var savePath = Path.Combine(uploadsDir, uniqueFileName);

            using (var stream = new FileStream(savePath, FileMode.Create))
            {
                await form.File.CopyToAsync(stream);
            }

            var result = await _coordinatorService.UploadPlanningFileAsync(
                tripId,
                form.File.FileName,
                form.File.ContentType,
                form.File.Length,
                savePath,
                CurrentUserId);

            return CreatedSuccess(result, "OK");
        }

        /// <summary>
        /// F3-J34: Danh sách bên dịch vụ bay
        /// </summary>
        [HttpGet("air-partners")]
        public async Task<IActionResult> GetAirPartners([FromQuery] string? status)
        {
            var data = await _coordinatorService.GetAirPartnersAsync(status);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J35: Thêm bên dịch vụ
        /// </summary>
        [HttpPost("air-partners")]
        public async Task<IActionResult> CreateAirPartner([FromBody] AirPartnerInputDto dto)
        {
            var data = await _coordinatorService.CreateAirPartnerAsync(dto, CurrentUserId);
            return CreatedSuccess(data, "OK");
        }

        /// <summary>
        /// F3-J36: Sửa thông tin bên dịch vụ
        /// </summary>
        [HttpPut("air-partners/{partnerId}")]
        public async Task<IActionResult> UpdateAirPartner(string partnerId, [FromBody] AirPartnerUpdateDto dto)
        {
            var data = await _coordinatorService.UpdateAirPartnerAsync(partnerId, dto, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J38: Xóa đối tác chưa từng tham chiếu
        /// </summary>
        [HttpDelete("air-partners/{partnerId}")]
        public async Task<IActionResult> DeleteAirPartner(string partnerId, [FromQuery] int expectedVersion)
        {
            var data = await _coordinatorService.DeleteAirPartnerAsync(partnerId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J37: Kích hoạt/ngừng bên dịch vụ
        /// </summary>
        [HttpPut("air-partners/{partnerId}/status")]
        public async Task<IActionResult> UpdateAirPartnerStatus(string partnerId, [FromBody] AirPartnerStatusDto dto)
        {
            var data = await _coordinatorService.UpdateAirPartnerStatusAsync(partnerId, dto, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J43: Danh mục đa chức năng cho bản đồ
        /// </summary>
        [HttpGet("places")]
        public async Task<IActionResult> GetPlaces([FromQuery] string? country, [FromQuery] string? function, [FromQuery] string? status, [FromQuery] string? q)
        {
            var data = await _coordinatorService.GetPlacesAsync(country, function, status, q);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J44: Thêm địa điểm dùng chung
        /// </summary>
        [HttpPost("places")]
        public async Task<IActionResult> CreatePlace([FromBody] PlaceInputDto dto)
        {
            var data = await _coordinatorService.CreatePlaceAsync(dto, CurrentUserId);
            return CreatedSuccess(data, "OK");
        }

        /// <summary>
        /// F3-J45: Sửa địa điểm và giờ mở
        /// </summary>
        [HttpPut("places/{placeId}")]
        public async Task<IActionResult> UpdatePlace(string placeId, [FromBody] PlaceUpdateDto dto)
        {
            var data = await _coordinatorService.UpdatePlaceAsync(placeId, dto, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J47: Xóa địa điểm chưa được tham chiếu
        /// </summary>
        [HttpDelete("places/{placeId}")]
        public async Task<IActionResult> DeletePlace(string placeId, [FromQuery] int expectedVersion)
        {
            var data = await _coordinatorService.DeletePlaceAsync(placeId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J46: Đổi trạng thái cơ sở
        /// </summary>
        [HttpPut("places/{placeId}/status")]
        public async Task<IActionResult> UpdatePlaceStatus(string placeId, [FromBody] PlaceStatusDto dto)
        {
            var data = await _coordinatorService.UpdatePlaceStatusAsync(placeId, dto, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J48: Danh mục nhân sự và trạng thái vận hành
        /// </summary>
        [HttpGet("staff")]
        public async Task<IActionResult> GetStaffList([FromQuery] string? tripId, [FromQuery] string? leg, [FromQuery] string? status)
        {
            var data = await _coordinatorService.GetStaffListV2Async(tripId, leg, status);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J49: Đổi ACTIVE/ON_LEAVE/INACTIVE
        /// </summary>
        [HttpPut("staff/{staffId}/status")]
        public async Task<IActionResult> UpdateStaffStatus(string staffId, [FromBody] StaffStatusDto dto)
        {
            var data = await _coordinatorService.UpdateStaffStatusV2Async(staffId, dto, CurrentUserId);
            return Success(data, "OK");
        }

        /// <summary>
        /// F3-J53: Đọc báo cáo tài xế gắn mốc trên bản đồ
        /// </summary>
        [HttpGet("trips/{tripId}/route-reports")]
        public async Task<IActionResult> GetDriverRouteReports(string tripId)
        {
            var data = await _coordinatorService.GetDriverReportsAsync(tripId);
            return Success(data, "OK");
        }


        // =========================================================================
        // LEGACY COMPATIBILITY & HELPER ENDPOINTS
        // =========================================================================

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var data = await _coordinatorService.GetDashboardAsync();
            return Success(data, "Lấy thông tin dashboard điều phối thành công");
        }

        [HttpGet("planning-trips")]
        public async Task<IActionResult> GetPlanningTripsLegacy()
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
            var data = await _coordinatorService.StartPlanningTripAsync(dto);
            return Success(data, "Khởi tạo kế hoạch chuyến đi từ đơn yêu cầu thành công");
        }

        [HttpPost("trips/start-planning/{requestId}")]
        public async Task<IActionResult> StartPlanningTripByPath(string requestId)
        {
            var data = await _coordinatorService.StartPlanningTripAsync(new StartPlanningRequestDto { RequestId = requestId });
            return Success(data, "Khởi tạo kế hoạch chuyến đi từ đơn yêu cầu thành công");
        }

        [HttpGet("checkpoints")]
        public async Task<IActionResult> GetCheckpoints([FromQuery] string? country, [FromQuery] string? type, [FromQuery] string? q)
        {
            var data = await _coordinatorService.GetCheckpointsAsync(country, type, q);
            return Success(data, "Lấy danh mục điểm trung chuyển / trạm dừng thành công");
        }

        [HttpGet("maps/geocode")]
        public async Task<IActionResult> GeocodeAddress([FromQuery] string address, [FromQuery] string? country = "VN")
        {
            var data = await _coordinatorService.GeocodeAddressAsync(address, country);
            return Success(data, "Tra cứu tọa độ thành công");
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

        [HttpGet("vehicles/{vehicleId}/schedule")]
        public async Task<IActionResult> GetVehicleSchedule(string vehicleId)
        {
            var data = await _coordinatorService.GetVehicleScheduleAsync(vehicleId);
            return Success(data, "Lấy lịch trình xe thành công");
        }

        [HttpGet("staff/{userId}/schedule")]
        public async Task<IActionResult> GetStaffSchedule(string userId)
        {
            var data = await _coordinatorService.GetStaffScheduleAsync(userId);
            return Success(data, "Lấy lịch trình nhân sự thành công");
        }

        [HttpGet("trips/{tripId}/routes")]
        public async Task<IActionResult> GetRouteVersionsLegacy(string tripId)
        {
            var data = await _coordinatorService.GetRouteVersionsAsync(tripId);
            return Success(data, "Lấy danh sách phiên bản lộ trình thành công");
        }

        [HttpGet("routes/{routeVersionId}")]
        public async Task<IActionResult> GetRouteVersionDetailLegacy(int routeVersionId)
        {
            var data = await _coordinatorService.GetRouteVersionDetailAsync(routeVersionId);
            if (data == null) return NotFoundFailure($"Không tìm thấy phiên bản lộ trình: {routeVersionId}");
            return Success(data, "Lấy chi tiết lộ trình thành công");
        }

        [HttpPost("trips/{tripId}/routes")]
        public async Task<IActionResult> CreateRouteDraftLegacy(string tripId, [FromBody] RouteDraftPayloadDto dto)
        {
            var data = await _coordinatorService.CreateRouteDraftAsync(tripId, dto);
            return Success(data, "Tạo bản nháp lộ trình thành công");
        }

        [HttpPut("routes/{routeVersionId}")]
        public async Task<IActionResult> UpdateRouteDraftLegacy(int routeVersionId, [FromBody] RouteDraftPayloadDto dto)
        {
            var data = await _coordinatorService.UpdateRouteDraftAsync(routeVersionId, dto);
            return Success(data, "Cập nhật bản nháp lộ trình thành công");
        }

        [HttpPost("routes/{routeVersionId}/submit")]
        public async Task<IActionResult> SubmitRouteVersionLegacy(int routeVersionId, [FromBody] SubmitRouteDto dto)
        {
            var data = await _coordinatorService.SubmitRouteVersionAsync(routeVersionId, dto);
            return Success(data, "Gửi lộ trình phê duyệt thành công");
        }

        [HttpPost("trips/{tripId}/submit-route")]
        public async Task<IActionResult> SubmitRouteForApprovalLegacy(string tripId)
        {
            var success = await _coordinatorService.SubmitRouteForApprovalAsync(tripId);
            if (!success) return NotFoundFailure($"Không tìm thấy chuyến đi: {tripId}");
            return SuccessMessage("Gửi toàn bộ lộ trình chờ quản lý phê duyệt thành công");
        }

        [HttpGet("trips/{tripId}/assignments")]
        public async Task<IActionResult> GetAssignmentsLegacy(string tripId)
        {
            var data = await _coordinatorService.GetTripAssignmentsAsync(tripId);
            return Success(data, "Lấy thông tin phân công chuyến đi thành công");
        }

        [HttpPost("trips/{tripId}/assignments/validate")]
        public async Task<IActionResult> ValidateAssignmentsLegacy(string tripId, [FromBody] TripAssignmentsDetailDto dto)
        {
            var data = await _coordinatorService.ValidateAssignmentsAsync(tripId, dto);
            return Success(data, "Kiểm tra tính hợp lệ của phân công thành công");
        }

        [HttpPut("trips/{tripId}/assignments")]
        public async Task<IActionResult> SaveAssignmentsLegacy(string tripId, [FromBody] TripAssignmentsDetailDto dto)
        {
            var success = await _coordinatorService.SaveTripAssignmentsAsync(tripId, dto);
            if (!success) return NotFoundFailure($"Không tìm thấy chuyến đi: {tripId}");
            return SuccessMessage("Lưu bản nháp phân công thành công");
        }

        [HttpPost("trips/{tripId}/assignments")]
        public async Task<IActionResult> AssignCrewAndVehicleLegacy(string tripId, [FromBody] AssignCrewVehicleDto dto)
        {
            var success = await _coordinatorService.AssignCrewAndVehicleAsync(tripId, dto);
            if (!success) return NotFoundFailure($"Không tìm thấy chuyến đi: {tripId}");
            return SuccessMessage("Phân công phương tiện và tài xế thành công");
        }

        [HttpGet("trips/{tripId}/flight-booking")]
        public async Task<IActionResult> GetFlightBookingLegacy(string tripId)
        {
            var data = await _coordinatorService.GetFlightBookingAsync(tripId);
            return Success(data, "Lấy thông tin đặt vé máy bay thành công");
        }

        [HttpPut("trips/{tripId}/flight-booking")]
        public async Task<IActionResult> SaveFlightBookingLegacy(string tripId, [FromBody] UpdateFlightBookingDto dto)
        {
            var data = await _coordinatorService.SaveFlightBookingAsync(tripId, dto);
            return Success(data, "Lưu thông tin đặt vé máy bay thành công");
        }

        [HttpGet("trips/{tripId}/operations-readiness")]
        public async Task<IActionResult> GetOperationsReadinessLegacy(string tripId)
        {
            var data = await _coordinatorService.GetOperationsReadinessAsync(tripId);
            return Success(data, "Lấy trạng thái sẵn sàng vận hành thành công");
        }

        [HttpPost("trips/{tripId}/operations-readiness/confirm")]
        public async Task<IActionResult> ConfirmOperationsReadinessLegacy(string tripId, [FromBody] ConfirmOperationsReadinessRequestDto? dto)
        {
            var success = await _coordinatorService.ConfirmOperationsReadinessAsync(tripId, dto);
            if (!success) return NotFoundFailure($"Không tìm thấy chuyến đi: {tripId}");
            return SuccessMessage("Xác nhận trạng thái sẵn sàng vận hành (Operations Ready) thành công");
        }

        [HttpGet("trips/{tripId}/departure-conditions")]
        public async Task<IActionResult> GetDepartureConditionsLegacy(string tripId)
        {
            var data = await _coordinatorService.GetDepartureConditionsAsync(tripId, isManager: false);
            return Success(data, "Lấy điều kiện khởi hành thành công");
        }

        [HttpGet("trips/{tripId}/monitoring")]
        public async Task<IActionResult> GetMonitoringLegacy(string tripId)
        {
            var data = await _coordinatorService.GetTripMonitoringAsync(tripId);
            if (data == null) return NotFoundFailure($"Không tìm thấy dữ liệu giám sát cho chuyến đi {tripId}");
            return Success(data, "Lấy dữ liệu giám sát chuyến đi thành công");
        }
    }
}
