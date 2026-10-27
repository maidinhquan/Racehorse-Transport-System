using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

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

        // =========================================================================
        // 1. TRIPS & DOCUMENTS READINESS
        // =========================================================================

        [HttpGet("trips")]
        public async Task<IActionResult> GetTrips(CancellationToken cancellationToken)
        {
            var data = await _specialistService.GetTripsAsync(cancellationToken);
            return Success(data, "Lấy danh sách chuyến đi của chuyên viên thành công");
        }

        [HttpGet("trips/{id}")]
        public async Task<IActionResult> GetTripById(string id, CancellationToken cancellationToken)
        {
            var data = await _specialistService.GetTripByIdAsync(id, cancellationToken);
            if (data == null) return NotFoundFailure($"Không tìm thấy chuyến đi: {id}");
            return Success(data, "Lấy chi tiết hồ sơ chuyến đi thành công");
        }

        [HttpPut("trips/{id}/requirement-set")]
        public async Task<IActionResult> ApplyRequirementSet(string id, [FromBody] ApplyRequirementSetDto dto, CancellationToken cancellationToken)
        {
            var ok = await _specialistService.ApplyRequirementSetAsync(id, dto.PkgId, cancellationToken);
            if (!ok) return NotFoundFailure($"Không thể áp dụng bộ quy định cho chuyến đi {id}");
            return SuccessMessage("Áp dụng bộ quy định kiểm dịch theo tuyến thành công");
        }

        [HttpPost("trips/{id}/docs-ready")]
        public async Task<IActionResult> ConfirmDocsReady(string id, CancellationToken cancellationToken)
        {
            var specialistName = User?.Identity?.Name ?? "Hoang Thu Ha";
            var result = await _specialistService.ConfirmDocsReadyAsync(id, specialistName, cancellationToken);
            if (!result.Success) return Failure(result.Message, null, 409);
            return SuccessMessage(result.Message);
        }

        [HttpPut("trips/{id}/insurance")]
        public async Task<IActionResult> SaveInsurance(string id, [FromBody] InsuranceSaveDto dto, CancellationToken cancellationToken)
        {
            var ok = await _specialistService.SaveInsuranceAsync(id, dto, cancellationToken);
            if (!ok) return NotFoundFailure($"Không tìm thấy chuyến đi {id}");
            return SuccessMessage("Cập nhật thông tin bảo hiểm thành công");
        }

        [HttpPost("trips/{id}/insurance/verify")]
        public async Task<IActionResult> VerifyInsurance(string id, CancellationToken cancellationToken)
        {
            var specialistName = User?.Identity?.Name ?? "Hoang Thu Ha";
            var ok = await _specialistService.VerifyInsuranceAsync(id, specialistName, cancellationToken);
            if (!ok) return NotFoundFailure($"Không tìm thấy chuyến đi {id}");
            return SuccessMessage("Xác minh hiệu lực bảo hiểm thành công");
        }

        [HttpPost("trips/{id}/clearances")]
        public async Task<IActionResult> RecordClearance(string id, [FromBody] RecordClearanceDto dto, CancellationToken cancellationToken)
        {
            var specialistName = User?.Identity?.Name ?? "Hoang Thu Ha";
            var ok = await _specialistService.RecordClearanceAsync(id, dto, specialistName, cancellationToken);
            if (!ok) return NotFoundFailure($"Không tìm thấy chuyến đi {id}");
            return SuccessMessage("Ghi nhận chứng thư kiểm dịch & thông quan thành công");
        }

        // =========================================================================
        // 2. CUSTOMER DOCUMENTS REVIEW & REQUESTS
        // =========================================================================

        [HttpGet("customer-documents")]
        public async Task<IActionResult> GetCustomerDocs(CancellationToken cancellationToken)
        {
            var data = await _specialistService.GetCustomerDocsAsync(cancellationToken);
            return Success(data, "Lấy danh sách hồ sơ khách hàng nộp thành công");
        }

        [HttpPost("trips/{id}/customer-documents/review")]
        public async Task<IActionResult> ReviewCustomerDoc(string id, [FromBody] ReviewCustomerDocDto dto, CancellationToken cancellationToken)
        {
            if (dto.Decision == "REJECTED" && (string.IsNullOrWhiteSpace(dto.Reason) || dto.Reason.Trim().Length < 10))
            {
                return Failure("Khi từ chối hồ sơ, lý do bắt buộc phải từ 10 ký tự trở lên.");
            }

            var specialistName = User?.Identity?.Name ?? "Hoang Thu Ha";
            var ok = await _specialistService.ReviewCustomerDocAsync(id, dto, specialistName, cancellationToken);
            if (!ok) return NotFoundFailure($"Không tìm thấy hồ sơ cho chuyến {id}");
            return SuccessMessage($"Kiểm duyệt hồ sơ thành công: {dto.Decision}");
        }

        [HttpGet("document-requests")]
        public async Task<IActionResult> GetDocRequests(CancellationToken cancellationToken)
        {
            var data = await _specialistService.GetDocRequestsAsync(cancellationToken);
            return Success(data, "Lấy danh sách yêu cầu bổ sung giấy tờ thành công");
        }

        [HttpPost("document-requests")]
        public async Task<IActionResult> CreateDocRequest([FromBody] CreateDocRequestDto dto, CancellationToken cancellationToken)
        {
            var specialistName = User?.Identity?.Name ?? "Hoang Thu Ha";
            var result = await _specialistService.CreateDocRequestAsync(dto, specialistName, cancellationToken);
            return Success(result, "Tạo yêu cầu bổ sung giấy tờ gửi khách hàng thành công");
        }

        // =========================================================================
        // 3. QUARANTINE BOOKINGS
        // =========================================================================

        [HttpGet("quarantine-bookings")]
        public async Task<IActionResult> GetQuarantineBookings(CancellationToken cancellationToken)
        {
            var data = await _specialistService.GetQuarantineBookingsAsync(cancellationToken);
            return Success(data, "Lấy danh sách đặt chỗ cơ sở cách ly thành công");
        }

        [HttpPost("quarantine-bookings")]
        public async Task<IActionResult> SaveQuarantineBooking([FromBody] SaveBookingDto dto, CancellationToken cancellationToken)
        {
            var ok = await _specialistService.SaveQuarantineBookingAsync(dto, cancellationToken);
            return SuccessMessage("Ghi nhận đặt chỗ cơ sở cách ly kiểm dịch thành công");
        }

        // =========================================================================
        // 4. REGULATIONS & STANDARDS
        // =========================================================================

        [HttpGet("document-types")]
        public async Task<IActionResult> GetDocTypes(CancellationToken cancellationToken)
        {
            var data = await _specialistService.GetDocTypesAsync(cancellationToken);
            return Success(data, "Lấy danh mục loại giấy tờ thành công");
        }

        [HttpPut("document-types")]
        public async Task<IActionResult> SaveDocType([FromBody] DocTypeDto dto, CancellationToken cancellationToken)
        {
            await _specialistService.SaveDocTypeAsync(dto, cancellationToken);
            return SuccessMessage("Cập nhật loại giấy tờ thành công");
        }

        [HttpGet("regulations")]
        public async Task<IActionResult> GetRegulations(CancellationToken cancellationToken)
        {
            var data = await _specialistService.GetRegulationsAsync(cancellationToken);
            return Success(data, "Lấy danh mục quy định kiểm dịch thành công");
        }

        [HttpPut("regulations")]
        public async Task<IActionResult> SaveRegulation([FromBody] RegulationDto dto, CancellationToken cancellationToken)
        {
            await _specialistService.SaveRegulationAsync(dto, cancellationToken);
            return SuccessMessage("Cập nhật quy định kiểm dịch thành công");
        }

        [HttpGet("requirement-sets")]
        public async Task<IActionResult> GetRequirementSets(CancellationToken cancellationToken)
        {
            var data = await _specialistService.GetPackagesAsync(cancellationToken);
            return Success(data, "Lấy danh mục bộ quy định kiểm dịch theo tuyến thành công");
        }

        [HttpPut("requirement-sets")]
        public async Task<IActionResult> SaveRequirementSet([FromBody] RegPackageDto dto, CancellationToken cancellationToken)
        {
            await _specialistService.SavePackageAsync(dto, cancellationToken);
            return SuccessMessage("Cập nhật bộ quy định kiểm dịch theo tuyến thành công");
        }

        [HttpGet("documents")]
        public async Task<IActionResult> GetCompanyDocuments(CancellationToken cancellationToken)
        {
            var data = await _specialistService.GetCompanyDocumentsAsync(cancellationToken);
            return Success(data, "Lấy danh sách hồ sơ pháp lý công ty thành công");
        }

        [HttpPost("documents")]
        public async Task<IActionResult> SaveCompanyDocument([FromBody] TripDocumentDto dto, CancellationToken cancellationToken)
        {
            await _specialistService.RecordCompanyDocumentAsync(dto, cancellationToken);
            return SuccessMessage("Lưu hồ sơ pháp lý công ty thành công");
        }

        [HttpGet("audit")]
        public async Task<IActionResult> GetAudit(CancellationToken cancellationToken)
        {
            var data = await _specialistService.GetAuditLogAsync(cancellationToken);
            return Success(data, "Lấy nhật ký kiểm toán hồ sơ thành công");
        }
    }
}
