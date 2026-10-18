// --- [CLOUD UPLOAD INTEGRATED] ---
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Application.DTOs;
using Application.Interfaces;
using Infrastructure.Data.Context;

namespace WebApi.Controllers
{
    /// <summary>
    /// --- [CLOUD UPLOAD INTEGRATED] ---
    /// Controller chuyên biệt xử lý tải lên Hình ảnh (.jpg, .png, .webp) và File PDF
    /// lên Cloud Storage (Cloudinary) và cập nhật đường dẫn (SecureUrl) vào Database.
    /// Tuân thủ Zero-Breaking Changes, giữ nguyên các API nghiệp vụ hiện hành.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class UploadController : BaseApiController
    {
        private readonly ICloudStorageService _cloudStorageService;
        private readonly HorseTransportDbContext _context;
        private readonly ILogger<UploadController> _logger;

        public UploadController(
            ICloudStorageService cloudStorageService,
            HorseTransportDbContext context,
            ILogger<UploadController> logger)
        {
            _cloudStorageService = cloudStorageService;
            _context = context;
            _logger = logger;
        }

        // =========================================================================
        // 1. GENERIC SINGLE FILE UPLOAD
        // POST: /api/upload
        // Form-data: File (IFormFile), SubFolder (string?), CustomFileName (string?)
        // =========================================================================
        [HttpPost]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(52428800)] // Giới hạn 50MB
        public async Task<IActionResult> UploadSingleFile([FromForm] SingleFileUploadDto dto)
        {
            if (dto.File == null || dto.File.Length == 0)
            {
                return Failure("Vui lòng chọn tệp tin cần tải lên (ảnh hoặc PDF).");
            }

            try
            {
                var folder = string.IsNullOrWhiteSpace(dto.SubFolder) ? "documents" : dto.SubFolder.Trim();
                var result = await _cloudStorageService.UploadFileAsync(dto.File, folder, dto.CustomFileName);

                _logger.LogInformation("Tải tệp {FileName} lên Cloudinary thành công: {Url}", dto.File.FileName, result.SecureUrl);

                return Success(new FileUploadResponseDto
                {
                    Url = result.SecureUrl,
                    PublicId = result.PublicId,
                    FileName = result.OriginalFileName,
                    FileType = result.ResourceType,
                    FileSize = result.Bytes,
                    Folder = folder,
                    UploadedAt = result.CreatedAt
                }, "Tải tệp lên Cloud Storage thành công.");
            }
            catch (ArgumentException ex)
            {
                return Failure(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi trong quá trình upload tệp lên Cloudinary: {Message}", ex.Message);
                return Failure($"Không thể tải tệp lên Cloud: {ex.Message}");
            }
        }

        // =========================================================================
        // 2. BATCH MULTI-FILE UPLOAD
        // POST: /api/upload/batch
        // Form-data: Files (List<IFormFile>), SubFolder (string?)
        // =========================================================================
        [HttpPost("batch")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(104857600)] // Giới hạn 100MB cho danh sách tệp
        public async Task<IActionResult> UploadBatchFiles([FromForm] BatchFileUploadDto dto)
        {
            if (dto.Files == null || dto.Files.Count == 0)
            {
                return Failure("Danh sách tệp tin tải lên rỗng.");
            }

            var folder = string.IsNullOrWhiteSpace(dto.SubFolder) ? "dossiers" : dto.SubFolder.Trim();
            var results = new List<FileUploadResponseDto>();
            var errors = new List<string>();

            foreach (var file in dto.Files)
            {
                if (file.Length == 0) continue;

                try
                {
                    var result = await _cloudStorageService.UploadFileAsync(file, folder);
                    results.Add(new FileUploadResponseDto
                    {
                        Url = result.SecureUrl,
                        PublicId = result.PublicId,
                        FileName = result.OriginalFileName,
                        FileType = result.ResourceType,
                        FileSize = result.Bytes,
                        Folder = folder,
                        UploadedAt = result.CreatedAt
                    });
                }
                catch (Exception ex)
                {
                    errors.Add($"Tệp '{file.FileName}': {ex.Message}");
                }
            }

            if (results.Count == 0 && errors.Count > 0)
            {
                return Failure("Không thể tải lên danh sách tệp.", new Dictionary<string, string[]>
                {
                    { "uploadErrors", errors.ToArray() }
                });
            }

            return Success(new
            {
                uploadedFiles = results,
                totalUploaded = results.Count,
                errors = errors.Count > 0 ? errors : null
            }, $"Đã tải lên {results.Count}/{dto.Files.Count} tệp thành công.");
        }

        // =========================================================================
        // 3. ATTACH TO LEGAL MEDICAL RECORD (KIỂM DỊCH / HỘ CHIẾU / XÉT NGHIỆM)
        // POST: /api/upload/legal-medical-record/{recordId}
        // Tải tài liệu và cập nhật trực tiếp UploadedFileUrl vào bảng LEGAL_MEDICAL_RECORD
        // =========================================================================
        [HttpPost("legal-medical-record/{recordId}")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadLegalMedicalRecord(
            string recordId,
            [FromForm] EntityFileUploadDto dto)
        {
            if (dto.File == null || dto.File.Length == 0)
            {
                return Failure("Vui lòng đính kèm tệp hồ sơ kiểm dịch.");
            }

            var record = await _context.LegalMedicalRecords.FindAsync(recordId);
            if (record == null)
            {
                return NotFoundFailure($"Không tìm thấy bản ghi hồ sơ pháp lý y tế với mã: {recordId}");
            }

            try
            {
                // Xóa file cũ trên Cloudinary nếu có để tối ưu dung lượng
                if (!string.IsNullOrWhiteSpace(record.UploadedFileUrl))
                {
                    var oldPublicId = _cloudStorageService.ExtractPublicIdFromUrl(record.UploadedFileUrl);
                    if (!string.IsNullOrWhiteSpace(oldPublicId))
                    {
                        await _cloudStorageService.DeleteFileAsync(oldPublicId);
                    }
                }

                // Tải file mới lên thư mục racehorse_system/medical_records
                var uploadResult = await _cloudStorageService.UploadFileAsync(dto.File, "medical_records");

                // Lưu đường dẫn mới vào Database Entity
                record.UploadedFileUrl = uploadResult.SecureUrl;
                record.DocumentStatus = "Uploaded";
                await _context.SaveChangesAsync();

                _logger.LogInformation("Cập nhật hồ sơ kiểm dịch {RecordId} thành công với URL: {Url}", recordId, uploadResult.SecureUrl);

                return Success(new
                {
                    recordId = record.RecordId,
                    horseId = record.HorseId,
                    documentType = record.DocumentType,
                    documentStatus = record.DocumentStatus,
                    uploadedFileUrl = record.UploadedFileUrl,
                    publicId = uploadResult.PublicId
                }, "Tải lên và lưu hồ sơ kiểm dịch vào CSDL thành công.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi đính kèm hồ sơ y tế: {Message}", ex.Message);
                return Failure($"Lỗi khi lưu hồ sơ y tế: {ex.Message}");
            }
        }

        // =========================================================================
        // 4. ATTACH TO STAFF DOCUMENT (CHỨNG CHỈ / BẰNG LÁI / PASSPORT NHÂN VIÊN)
        // POST: /api/upload/staff-document/{documentId}
        // =========================================================================
        [HttpPost("staff-document/{documentId}")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadStaffDocument(
            string documentId,
            [FromForm] EntityFileUploadDto dto)
        {
            if (dto.File == null || dto.File.Length == 0)
            {
                return Failure("Vui lòng đính kèm chứng chỉ hoặc hồ sơ nhân viên.");
            }

            var doc = await _context.StaffDocuments.FindAsync(documentId);
            if (doc == null)
            {
                return NotFoundFailure($"Không tìm thấy tài liệu nhân viên với mã: {documentId}");
            }

            try
            {
                // Xóa file cũ nếu có
                if (!string.IsNullOrWhiteSpace(doc.DocumentUrl))
                {
                    var oldPublicId = _cloudStorageService.ExtractPublicIdFromUrl(doc.DocumentUrl);
                    if (!string.IsNullOrWhiteSpace(oldPublicId))
                    {
                        await _cloudStorageService.DeleteFileAsync(oldPublicId);
                    }
                }

                var uploadResult = await _cloudStorageService.UploadFileAsync(dto.File, "staff_documents");

                doc.DocumentUrl = uploadResult.SecureUrl;
                doc.Status = "Valid";
                await _context.SaveChangesAsync();

                _logger.LogInformation("Cập nhật tài liệu nhân viên {DocumentId} thành công với URL: {Url}", documentId, uploadResult.SecureUrl);

                return Success(new
                {
                    documentId = doc.DocumentId,
                    userId = doc.UserId,
                    docType = doc.DocType,
                    documentUrl = doc.DocumentUrl,
                    publicId = uploadResult.PublicId
                }, "Cập nhật hồ sơ tài liệu nhân viên vào CSDL thành công.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lưu tài liệu nhân sự: {Message}", ex.Message);
                return Failure($"Lỗi khi lưu tài liệu nhân sự: {ex.Message}");
            }
        }

        // =========================================================================
        // 5. ATTACH TO INCIDENT (ẢNH HIỆN TRƯỜNG SỰ CỐ)
        // POST: /api/upload/incident/{incidentId}
        // =========================================================================
        [HttpPost("incident/{incidentId}")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadIncidentImage(
            string incidentId,
            [FromForm] EntityFileUploadDto dto)
        {
            if (dto.File == null || dto.File.Length == 0)
            {
                return Failure("Vui lòng chọn hình ảnh hiện trường sự cố.");
            }

            var incident = await _context.Incidents.FindAsync(incidentId);
            if (incident == null)
            {
                return NotFoundFailure($"Không tìm thấy sự cố với mã: {incidentId}");
            }

            try
            {
                if (!string.IsNullOrWhiteSpace(incident.ImageUrl))
                {
                    var oldPublicId = _cloudStorageService.ExtractPublicIdFromUrl(incident.ImageUrl);
                    if (!string.IsNullOrWhiteSpace(oldPublicId))
                    {
                        await _cloudStorageService.DeleteFileAsync(oldPublicId, "image");
                    }
                }

                var uploadResult = await _cloudStorageService.UploadFileAsync(dto.File, "incidents");

                incident.ImageUrl = uploadResult.SecureUrl;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Cập nhật ảnh sự cố {IncidentId} thành công với URL: {Url}", incidentId, uploadResult.SecureUrl);

                return Success(new
                {
                    incidentId = incident.IncidentId,
                    tripId = incident.TripId,
                    imageUrl = incident.ImageUrl,
                    publicId = uploadResult.PublicId
                }, "Cập nhật ảnh hiện trường sự cố vào CSDL thành công.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lưu ảnh sự cố: {Message}", ex.Message);
                return Failure($"Lỗi khi lưu ảnh sự cố: {ex.Message}");
            }
        }

        // =========================================================================
        // 6. ATTACH TO HANDOVER ITEM (ẢNH NGỰA KHI BÀN GIAO)
        // POST: /api/upload/handover-item/{handoverItemId}
        // =========================================================================
        [HttpPost("handover-item/{handoverItemId}")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadHandoverPhoto(
            string handoverItemId,
            [FromForm] EntityFileUploadDto dto)
        {
            if (dto.File == null || dto.File.Length == 0)
            {
                return Failure("Vui lòng chọn hình ảnh bàn giao ngựa.");
            }

            var item = await _context.HandoverItems.FindAsync(handoverItemId);
            if (item == null)
            {
                return NotFoundFailure($"Không tìm thấy mục bàn giao: {handoverItemId}");
            }

            try
            {
                if (!string.IsNullOrWhiteSpace(item.PhotoUrl))
                {
                    var oldPublicId = _cloudStorageService.ExtractPublicIdFromUrl(item.PhotoUrl);
                    if (!string.IsNullOrWhiteSpace(oldPublicId))
                    {
                        await _cloudStorageService.DeleteFileAsync(oldPublicId, "image");
                    }
                }

                var uploadResult = await _cloudStorageService.UploadFileAsync(dto.File, "handovers");

                item.PhotoUrl = uploadResult.SecureUrl;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Cập nhật ảnh bàn giao {ItemId} thành công với URL: {Url}", handoverItemId, uploadResult.SecureUrl);

                return Success(new
                {
                    handoverItemId = item.HandoverItemId,
                    horseId = item.HorseId,
                    photoUrl = item.PhotoUrl,
                    publicId = uploadResult.PublicId
                }, "Cập nhật ảnh bàn giao ngựa vào CSDL thành công.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lưu ảnh bàn giao: {Message}", ex.Message);
                return Failure($"Lỗi khi lưu ảnh bàn giao: {ex.Message}");
            }
        }

        // =========================================================================
        // 7. DELETE FILE FROM CLOUD STORAGE
        // DELETE: /api/upload?publicId={publicId}&resourceType={resourceType}
        // Hoặc: DELETE: /api/upload?url={secureUrl}
        // =========================================================================
        [HttpDelete]
        public async Task<IActionResult> DeleteFile(
            [FromQuery] string? publicId,
            [FromQuery] string? url,
            [FromQuery] string? resourceType)
        {
            var targetPublicId = publicId;

            if (string.IsNullOrWhiteSpace(targetPublicId) && !string.IsNullOrWhiteSpace(url))
            {
                targetPublicId = _cloudStorageService.ExtractPublicIdFromUrl(url);
            }

            if (string.IsNullOrWhiteSpace(targetPublicId))
            {
                return Failure("Vui lòng cung cấp PublicId hoặc URL hợp lệ của tệp cần xóa.");
            }

            var result = await _cloudStorageService.DeleteFileAsync(targetPublicId, resourceType);

            if (result.Success)
            {
                _logger.LogInformation("Đã xóa file trên Cloudinary: {PublicId}", targetPublicId);
                return Success(result, "Xóa tệp tin trên Cloud Storage thành công.");
            }

            return Failure($"Xóa tệp thất bại: {result.Result}");
        }

        // =========================================================================
        // 8. STORAGE SERVICE HEALTH CHECK
        // GET: /api/upload/health
        // =========================================================================
        [HttpGet("health")]
        public IActionResult CheckHealth()
        {
            return Success(new
            {
                service = "CloudinaryStorageService",
                status = "Ready",
                supportedFormats = new[] { ".jpg", ".jpeg", ".png", ".webp", ".pdf" },
                maxFileSize = "50MB",
                timestamp = DateTime.UtcNow
            }, "Dịch vụ lưu trữ Cloud Storage đang hoạt động bình thường.");
        }
    }
}
