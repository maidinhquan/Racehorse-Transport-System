using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Mvc;
using Application.DTOs;
using Application.Interfaces;

namespace WebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SpecialistController : BaseApiController
    {
        private readonly ISpecialistService _specialistService;

        public SpecialistController(ISpecialistService specialistService)
        {
            _specialistService = specialistService;
        }

        private (string userId, string role) GetCurrentActor()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                         ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub) 
                         ?? "USER_005";
            var role = User.FindFirstValue(ClaimTypes.Role) ?? "TRANSPORT_SPECIALIST";
            return (userId, role);
        }

        // =========================================================================
        // 1. TRIPS & CONTEXT
        // =========================================================================

        [HttpGet("trips")]
        public async Task<IActionResult> GetTrips()
        {
            var (userId, role) = GetCurrentActor();
            var trips = await _specialistService.GetTripsAsync(userId, role);
            return Success(trips, "Lấy danh sách chuyến đi thành công");
        }

        [HttpGet("trips/{tripId}")]
        public async Task<IActionResult> GetTrip(string tripId)
        {
            var (userId, role) = GetCurrentActor();
            var trips = await _specialistService.GetTripsAsync(userId, role);
            var trip = trips.FirstOrDefault(t => t.Id == tripId);
            if (trip == null)
            {
                return NotFoundFailure($"Không tìm thấy chuyến đi: {tripId}");
            }
            return Success(trip, "Lấy thông tin chi tiết chuyến đi thành công");
        }

        // =========================================================================
        // 2. CUSTOMER DOCUMENTS & REVIEW
        // =========================================================================

        [HttpGet("customer-documents")]
        public async Task<IActionResult> GetCustomerDocs([FromQuery] string? tripId)
        {
            var docs = await _specialistService.GetCustomerDocsAsync(tripId);
            return Success(docs, "Lấy danh sách giấy tờ khách hàng thành công");
        }

        [HttpPost("trips/{tripId}/customer-documents/review")]
        public async Task<IActionResult> ReviewCustomerDoc(string tripId, [FromBody] ReviewCustomerDocInputDto input)
        {
            var (userId, _) = GetCurrentActor();
            var success = await _specialistService.ReviewCustomerDocAsync(tripId, input, userId);
            if (!success)
            {
                return Failure("Không thể xử lý kiểm duyệt giấy tờ khách hàng");
            }
            return SuccessMessage("Duyệt giấy tờ khách hàng thành công");
        }

        // =========================================================================
        // 3. SUPPLEMENT REQUESTS (YÊU CẦU BỔ SUNG)
        // =========================================================================

        [HttpGet("document-requests")]
        public async Task<IActionResult> GetDocRequests([FromQuery] string? tripId)
        {
            var reqs = await _specialistService.GetDocRequestsAsync(tripId);
            return Success(reqs, "Lấy danh sách yêu cầu bổ sung thành công");
        }

        [HttpPost("document-requests")]
        public async Task<IActionResult> CreateDocRequest([FromBody] CreateDocRequestInputDto input)
        {
            var (userId, _) = GetCurrentActor();
            var success = await _specialistService.CreateDocRequestAsync(input, userId);
            if (!success)
            {
                return Failure("Không thể tạo yêu cầu bổ sung hồ sơ");
            }
            return SuccessMessage("Tạo yêu cầu bổ sung hồ sơ thành công");
        }

        // =========================================================================
        // 4. COMPANY DOCUMENTS (CHỨNG TỪ CBN)
        // =========================================================================

        [HttpGet("documents")]
        public async Task<IActionResult> GetCompanyDocuments([FromQuery] string? tripId)
        {
            var docs = await _specialistService.GetCompanyDocumentsAsync(tripId);
            return Success(docs, "Lấy danh sách chứng từ thành công");
        }

        [HttpPost("documents")]
        public async Task<IActionResult> RecordCompanyDocument([FromBody] RecordDocInputDto input)
        {
            var (userId, _) = GetCurrentActor();
            var success = await _specialistService.RecordCompanyDocumentAsync(input, userId);
            if (!success)
            {
                return Failure("Không thể ghi nhận chứng từ");
            }
            return SuccessMessage("Ghi nhận chứng từ thành công");
        }

        [HttpPost("documents/{docId}/review")]
        public async Task<IActionResult> ReviewCompanyDocument(string docId, [FromBody] ReviewDocInputDto input)
        {
            var (userId, _) = GetCurrentActor();
            var success = await _specialistService.ReviewCompanyDocumentAsync(docId, input, userId);
            if (!success)
            {
                return Failure("Không thể kiểm duyệt chứng từ");
            }
            return SuccessMessage("Kiểm duyệt chứng từ thành công");
        }

        // =========================================================================
        // 5. TRIP INSURANCE (BẢO HIỂM CHUYẾN ĐI)
        // =========================================================================

        [HttpPut("trips/{tripId}/insurance")]
        public async Task<IActionResult> SaveInsurance(string tripId, [FromBody] SaveInsuranceInputDto input)
        {
            var (userId, _) = GetCurrentActor();
            var success = await _specialistService.SaveInsuranceAsync(tripId, input, userId);
            if (!success)
            {
                return Failure("Không thể lưu thông tin bảo hiểm");
            }
            return SuccessMessage("Lưu thông tin bảo hiểm thành công");
        }

        [HttpPost("trips/{tripId}/insurance/verify")]
        public async Task<IActionResult> VerifyInsurance(string tripId)
        {
            var (userId, _) = GetCurrentActor();
            var success = await _specialistService.VerifyInsuranceAsync(tripId, userId);
            if (!success)
            {
                return Failure("Không tìm thấy thông tin bảo hiểm để xác minh");
            }
            return SuccessMessage("Xác minh bảo hiểm thành công");
        }

        // =========================================================================
        // 6. QUARANTINE BOOKINGS (ĐẶT CHỖ KIỂM DỊCH)
        // =========================================================================

        [HttpGet("quarantine-bookings")]
        public async Task<IActionResult> GetQuarantineBookings([FromQuery] string? tripId)
        {
            var bookings = await _specialistService.GetQuarantineBookingsAsync(tripId);
            return Success(bookings, "Lấy danh sách đặt chỗ kiểm dịch thành công");
        }

        [HttpPost("quarantine-bookings")]
        public async Task<IActionResult> SaveQuarantineBooking([FromBody] SaveBookingInputDto input)
        {
            var (userId, _) = GetCurrentActor();
            var success = await _specialistService.SaveQuarantineBookingAsync(input, userId);
            if (!success)
            {
                return Failure("Không thể lưu thông tin đặt chỗ kiểm dịch");
            }
            return SuccessMessage("Lưu đặt chỗ kiểm dịch thành công");
        }

        // =========================================================================
        // 7. REQUIREMENT SETS & DOCS READY GATE
        // =========================================================================

        [HttpPut("trips/{tripId}/requirement-set")]
        public async Task<IActionResult> ApplyRequirementSet(string tripId, [FromBody] ApplyRequirementSetInputDto input)
        {
            var (userId, _) = GetCurrentActor();
            var success = await _specialistService.ApplyRequirementSetAsync(tripId, input.PkgId, userId);
            if (!success)
            {
                return Failure("Không thể áp dụng bộ quy định");
            }
            return SuccessMessage("Áp dụng bộ quy định thành công");
        }

        [HttpPost("trips/{tripId}/docs-ready")]
        public async Task<IActionResult> ConfirmDocsReady(string tripId)
        {
            var (userId, _) = GetCurrentActor();
            try
            {
                var success = await _specialistService.ConfirmDocsReadyAsync(tripId, userId);
                if (!success)
                {
                    return Failure("Hồ sơ chưa đủ điều kiện đánh dấu Docs READY. Vui lòng đảm bảo các giấy tờ bắt buộc đã được phê duyệt, bảo hiểm đã xác minh và không còn yêu cầu bổ sung chưa giải quyết.");
                }
                return SuccessMessage("Đã xác nhận hồ sơ đầy đủ (Docs READY)");
            }
            catch (InvalidOperationException ex)
            {
                return Failure(ex.Message);
            }
        }

        // =========================================================================
        // 8. CHECKPOINT CLEARANCE (THÔNG QUAN TRẠM)
        // =========================================================================

        [HttpPost("trips/{tripId}/clearances")]
        public async Task<IActionResult> RecordClearance(string tripId, [FromBody] RecordClearanceInputDto input)
        {
            var (userId, _) = GetCurrentActor();
            var success = await _specialistService.RecordClearanceAsync(tripId, input, userId);
            if (!success)
            {
                return Failure("Không thể ghi nhận thông quan");
            }
            return SuccessMessage("Ghi nhận thông quan trạm thành công");
        }

        // =========================================================================
        // 9. CATALOGS: DOCUMENT TYPES, REGULATIONS, REQUIREMENT SETS
        // =========================================================================

        [HttpGet("document-types")]
        public async Task<IActionResult> GetDocTypes()
        {
            var list = await _specialistService.GetDocTypesAsync();
            return Success(list, "Lấy danh mục loại giấy tờ thành công");
        }

        [HttpPut("document-types")]
        public async Task<IActionResult> SaveDocType([FromBody] DocTypeDto input)
        {
            var (userId, _) = GetCurrentActor();
            var success = await _specialistService.SaveDocTypeAsync(input, userId);
            return SuccessMessage("Lưu loại giấy tờ thành công");
        }

        [HttpGet("regulations")]
        public async Task<IActionResult> GetRegulations()
        {
            var list = await _specialistService.GetRegulationsAsync();
            return Success(list, "Lấy danh mục quy định thành công");
        }

        [HttpPut("regulations")]
        public async Task<IActionResult> SaveRegulation([FromBody] RegulationDto input)
        {
            var (userId, _) = GetCurrentActor();
            var success = await _specialistService.SaveRegulationAsync(input, userId);
            return SuccessMessage("Lưu quy định thành công");
        }

        [HttpGet("requirement-sets")]
        public async Task<IActionResult> GetPackages()
        {
            var list = await _specialistService.GetPackagesAsync();
            return Success(list, "Lấy danh mục gói quy định thành công");
        }

        [HttpPut("requirement-sets")]
        public async Task<IActionResult> SavePackage([FromBody] RegPackageDto input)
        {
            var (userId, _) = GetCurrentActor();
            var success = await _specialistService.SavePackageAsync(input, userId);
            return SuccessMessage("Lưu gói quy định thành công");
        }

        // =========================================================================
        // 10. AUDIT TRAIL
        // =========================================================================

        [HttpGet("audit")]
        public async Task<IActionResult> GetAuditLogs([FromQuery] string? tripId)
        {
            var logs = await _specialistService.GetAuditLogsAsync(tripId);
            return Success(logs, "Lấy nhật ký kiểm toán thành công");
        }
    }
}
