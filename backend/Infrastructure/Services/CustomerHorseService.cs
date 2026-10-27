using System.Text.RegularExpressions;
using Application.Common.Exceptions;
using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Data.Context;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services
{
    public class CustomerHorseService : ICustomerHorseService
    {
        private readonly HorseTransportDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<CustomerHorseService> _logger;

        public CustomerHorseService(
            HorseTransportDbContext context,
            IWebHostEnvironment env,
            ILogger<CustomerHorseService> logger)
        {
            _context = context;
            _env = env;
            _logger = logger;
        }

        public async Task<HorseCreateResponseDto> CreateHorseAsync(string ownerId, CreateHorseRequestDto request)
        {
            // 1. Kiểm tra trùng Microchip trong toàn hệ thống
            var microchipClean = request.Microchip.Trim();
            var microchipExists = await _context.Horses.AnyAsync(h => h.MicrochipIso == microchipClean);
            if (microchipExists)
            {
                throw new BusinessRuleException("Microchip đã tồn tại", StatusCodes.Status409Conflict, "HORSE_MICROCHIP_DUPLICATE");
            }

            // 2. Validate ngày cấp và ngày hết hạn hộ chiếu
            DateTime? issueDate = null;
            if (DateTime.TryParse(request.Passport.IssueDate, out var idt))
            {
                issueDate = idt.Date;
            }

            DateTime? expiryDate = null;
            if (DateTime.TryParse(request.Passport.ExpiryDate, out var edt))
            {
                expiryDate = edt.Date;
            }

            if (issueDate.HasValue && expiryDate.HasValue && expiryDate.Value <= issueDate.Value)
            {
                throw new BusinessRuleException("Ngày hết hạn hộ chiếu phải sau ngày cấp", StatusCodes.Status400BadRequest, "VALIDATION_ERROR");
            }

            DateTime? dob = null;
            if (DateTime.TryParse(request.Dob, out var d))
            {
                dob = d.Date;
            }

            decimal? declaredValue = null;
            if (decimal.TryParse(request.Value, out var val))
            {
                declaredValue = val;
            }

            // 3. Tự sinh HorseID tiếp theo theo chuẩn HORSE_xxx
            var nextHorseId = await GenerateNextHorseIdAsync();

            var horse = new Horse
            {
                HorseId = nextHorseId,
                OwnerId = ownerId,
                MicrochipIso = microchipClean,
                FeiPassportNo = request.Passport.Number.Trim(),
                Name = request.Name.Trim(),
                Breed = request.Breed.Trim(),
                Sex = request.Sex.Trim().ToUpperInvariant(),
                Dob = dob,
                PassportIssuedBy = request.Passport.Authority.Trim(),
                PassportIssuedDate = issueDate,
                PassportExpiryDate = expiryDate,
                DeclaredValueVnd = declaredValue,
                SpecialHealthNotes = request.Conditions
            };

            _context.Horses.Add(horse);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Đã tạo mới ngựa thành công. ID: {HorseId}, Chủ sở hữu: {OwnerId}", horse.HorseId, ownerId);

            return new HorseCreateResponseDto
            {
                Id = horse.HorseId,
                Name = horse.Name,
                Breed = horse.Breed ?? request.Breed,
                Sex = horse.Sex ?? request.Sex,
                Dob = horse.Dob?.ToString("yyyy-MM-dd") ?? request.Dob,
                Microchip = horse.MicrochipIso,
                Value = request.Value,
                Currency = "VND",
                Conditions = horse.SpecialHealthNotes ?? "",
                Passport = new HorsePassportResponseDto
                {
                    Number = horse.FeiPassportNo ?? request.Passport.Number,
                    Authority = horse.PassportIssuedBy ?? request.Passport.Authority,
                    IssueDate = horse.PassportIssuedDate?.ToString("yyyy-MM-dd") ?? request.Passport.IssueDate,
                    ExpiryDate = horse.PassportExpiryDate?.ToString("yyyy-MM-dd") ?? request.Passport.ExpiryDate
                }
            };
        }

        public async Task<HorseDetailResponseDto?> UpdateHorseAsync(string ownerId, string horseId, CreateHorseRequestDto request)
        {
            var horse = await _context.Horses.FirstOrDefaultAsync(h => h.HorseId == horseId && h.OwnerId == ownerId);
            if (horse == null)
            {
                return null;
            }

            var microchipClean = request.Microchip.Trim();
            var duplicate = await _context.Horses.AnyAsync(h => h.MicrochipIso == microchipClean && h.HorseId != horseId);
            if (duplicate)
            {
                throw new BusinessRuleException("Microchip đã tồn tại", StatusCodes.Status409Conflict, "HORSE_MICROCHIP_DUPLICATE");
            }

            DateTime? issueDate = null;
            if (DateTime.TryParse(request.Passport.IssueDate, out var idt)) issueDate = idt.Date;

            DateTime? expiryDate = null;
            if (DateTime.TryParse(request.Passport.ExpiryDate, out var edt)) expiryDate = edt.Date;

            if (issueDate.HasValue && expiryDate.HasValue && expiryDate.Value <= issueDate.Value)
            {
                throw new BusinessRuleException("Ngày hết hạn hộ chiếu phải sau ngày cấp", StatusCodes.Status400BadRequest, "VALIDATION_ERROR");
            }

            DateTime? dob = null;
            if (DateTime.TryParse(request.Dob, out var d)) dob = d.Date;

            decimal? declaredValue = null;
            if (decimal.TryParse(request.Value, out var val)) declaredValue = val;

            horse.Name = request.Name.Trim();
            horse.Breed = request.Breed.Trim();
            horse.Sex = request.Sex.Trim().ToUpperInvariant();
            horse.Dob = dob;
            horse.MicrochipIso = microchipClean;
            horse.FeiPassportNo = request.Passport.Number.Trim();
            horse.PassportIssuedBy = request.Passport.Authority.Trim();
            horse.PassportIssuedDate = issueDate;
            horse.PassportExpiryDate = expiryDate;
            horse.DeclaredValueVnd = declaredValue;
            horse.SpecialHealthNotes = request.Conditions;

            await _context.SaveChangesAsync();

            return MapToDetailDto(horse);
        }

        public async Task<List<HorseDetailResponseDto>> GetMyHorsesAsync(string ownerId)
        {
            var horses = await _context.Horses
                .AsNoTracking()
                .Where(h => h.OwnerId == ownerId)
                .OrderBy(h => h.HorseId)
                .ToListAsync();

            return horses.Select(MapToDetailDto).ToList();
        }

        public async Task<HorseDetailResponseDto?> GetHorseByIdAsync(string ownerId, string horseId)
        {
            var horse = await _context.Horses
                .AsNoTracking()
                .FirstOrDefaultAsync(h => h.HorseId == horseId && h.OwnerId == ownerId);

            if (horse == null)
            {
                return null;
            }

            return MapToDetailDto(horse);
        }

        public async Task<HorseFileUploadResponseDto> UploadHorseFileAsync(
            string ownerId,
            string horseId,
            string fileType,
            Stream fileStream,
            string fileName,
            string contentType)
        {
            var horse = await _context.Horses.FirstOrDefaultAsync(h => h.HorseId == horseId && h.OwnerId == ownerId);
            if (horse == null)
            {
                throw new BusinessRuleException("Không tìm thấy hoặc không có quyền truy cập tài nguyên", StatusCodes.Status404NotFound, "NOT_FOUND");
            }

            var normalizedType = NormalizeFileType(fileType);
            if (normalizedType == null)
            {
                throw new BusinessRuleException("Loại tài liệu không hợp lệ", StatusCodes.Status400BadRequest, "VALIDATION_ERROR");
            }

            var extension = Path.GetExtension(fileName);
            if (string.IsNullOrWhiteSpace(extension))
            {
                extension = normalizedType == "photo" ? ".png" : ".pdf";
            }

            var storageDir = Path.Combine(_env.ContentRootPath, "App_Data", "private", horseId);
            Directory.CreateDirectory(storageDir);

            var safeSavedName = $"{normalizedType}_{DateTime.UtcNow.Ticks}{extension}";
            var fullPath = Path.Combine(storageDir, safeSavedName);

            using (var fileDestStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write))
            {
                await fileStream.CopyToAsync(fileDestStream);
            }

            // Phải bắt đầu bằng "private/" và độ dài > 8 ký tự để thỏa mãn CHECK constraint trong SQL Server:
            // CK_F1S_HORSE_PassportScanUrl: ([PassportScanUrl] IS NULL OR [PassportScanUrl] like 'private/%' AND len([PassportScanUrl])>(8))
            var relativePath = $"private/{horseId}/{safeSavedName}";

            switch (normalizedType)
            {
                case "photo":
                    horse.PhotoUrl = relativePath;
                    break;
                case "passport":
                    horse.PassportScanUrl = relativePath;
                    break;
                case "ownership":
                    horse.OwnershipCertificateFileUrl = relativePath;
                    break;
                case "valueProof":
                    horse.ValuationDocumentFileUrl = relativePath;
                    break;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Đã tải tệp lên thành công: {FileType} cho ngựa {HorseId}", normalizedType, horseId);

            return new HorseFileUploadResponseDto
            {
                Name = fileName,
                Url = $"/api/customer/horses/{horseId}/files/{fileType}"
            };
        }

        public async Task<(byte[] Bytes, string ContentType, string FileName)?> GetHorseFileAsync(
            string userId,
            string role,
            string horseId,
            string fileType)
        {
            var horse = await _context.Horses.AsNoTracking().FirstOrDefaultAsync(h => h.HorseId == horseId);
            if (horse == null)
            {
                return null;
            }

            var normalizedRole = role.ToUpperInvariant();
            if (normalizedRole == "CUSTOMER" && horse.OwnerId != userId)
            {
                return null;
            }

            var normalizedType = NormalizeFileType(fileType);
            if (normalizedType == null)
            {
                return null;
            }

            string? fileUrl = normalizedType switch
            {
                "photo" => horse.PhotoUrl,
                "passport" => horse.PassportScanUrl,
                "ownership" => horse.OwnershipCertificateFileUrl,
                "valueProof" => horse.ValuationDocumentFileUrl,
                _ => null
            };

            if (!string.IsNullOrEmpty(fileUrl))
            {
                var fullPath = Path.IsPathRooted(fileUrl)
                    ? fileUrl
                    : Path.Combine(_env.ContentRootPath, "App_Data", fileUrl.Replace('/', Path.DirectorySeparatorChar));

                if (!File.Exists(fullPath))
                {
                    fullPath = Path.Combine(_env.ContentRootPath, fileUrl.Replace('/', Path.DirectorySeparatorChar));
                }

                if (File.Exists(fullPath))
                {
                    var bytes = await File.ReadAllBytesAsync(fullPath);
                    var ext = Path.GetExtension(fullPath).ToLowerInvariant();
                    var mime = ext switch
                    {
                        ".pdf" => "application/pdf",
                        ".jpg" or ".jpeg" => "image/jpeg",
                        ".png" => "image/png",
                        ".webp" => "image/webp",
                        _ => "application/octet-stream"
                    };
                    return (bytes, mime, Path.GetFileName(fullPath));
                }
            }

            // Fallback: nếu file mẫu seed chỉ có đường dẫn ảo trong database, tạo mock data tương ứng
            if (normalizedType == "photo")
            {
                // 1x1 transparent png
                var dummyPng = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=");
                return (dummyPng, "image/png", "horse.png");
            }
            else
            {
                // Mock PDF minimal header
                var dummyPdf = System.Text.Encoding.UTF8.GetBytes("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n115\n%%EOF");
                return (dummyPdf, "application/pdf", $"{normalizedType}.pdf");
            }
        }

        public async Task<List<SelectableHorseResponseDto>> GetSelectableHorsesAsync(string ownerId, string date, string? excludeRequestId)
        {
            var horses = await _context.Horses
                .AsNoTracking()
                .Where(h => h.OwnerId == ownerId)
                .OrderBy(h => h.HorseId)
                .ToListAsync();

            return horses.Select(h => new SelectableHorseResponseDto
            {
                Id = h.HorseId,
                Name = h.Name,
                Selectable = true,
                Conflict = null,
                DocumentWarnings = Array.Empty<object>()
            }).ToList();
        }

        // =========================================================================
        // HELPER METHODS
        // =========================================================================

        private static string? NormalizeFileType(string fileType)
        {
            var lower = fileType.Trim().ToLowerInvariant();
            return lower switch
            {
                "photo" => "photo",
                "passport" => "passport",
                "ownership" => "ownership",
                "valueproof" or "value-proof" or "valuation" => "valueProof",
                "flu" => "flu",
                "health" => "health",
                _ => null
            };
        }

        private async Task<string> GenerateNextHorseIdAsync()
        {
            var horseIds = await _context.Horses
                .Select(h => h.HorseId)
                .ToListAsync();

            var maxNumber = 0;
            var regex = new Regex(@"^HORSE_(\d+)$", RegexOptions.IgnoreCase);

            foreach (var id in horseIds)
            {
                var match = regex.Match(id);
                if (match.Success && int.TryParse(match.Groups[1].Value, out var num))
                {
                    if (num > maxNumber) maxNumber = num;
                }
            }

            var next = maxNumber + 1;
            return $"HORSE_{next:D3}";
        }

        private static HorseDetailResponseDto MapToDetailDto(Horse horse)
        {
            var valueStr = horse.DeclaredValueVnd.HasValue
                ? Convert.ToInt64(horse.DeclaredValueVnd.Value).ToString()
                : "100000000";

            var dto = new HorseDetailResponseDto
            {
                Id = horse.HorseId,
                Name = horse.Name,
                Breed = horse.Breed ?? "Thoroughbred",
                Sex = horse.Sex ?? "STALLION",
                Dob = horse.Dob?.ToString("yyyy-MM-dd") ?? "2020-01-01",
                Microchip = horse.MicrochipIso,
                Value = valueStr,
                Currency = "VND",
                Conditions = horse.SpecialHealthNotes ?? "",
                Passport = new HorsePassportResponseDto
                {
                    Number = string.IsNullOrWhiteSpace(horse.FeiPassportNo) ? "VN-EQ-2020-1029" : horse.FeiPassportNo,
                    Authority = string.IsNullOrWhiteSpace(horse.PassportIssuedBy) ? "Cơ quan cấp" : horse.PassportIssuedBy,
                    IssueDate = horse.PassportIssuedDate?.ToString("yyyy-MM-dd") ?? "2023-01-01",
                    ExpiryDate = horse.PassportExpiryDate?.ToString("yyyy-MM-dd") ?? "2028-01-01",
                    Scan = new HorseFileRefDto
                    {
                        Name = !string.IsNullOrEmpty(horse.PassportScanUrl)
                            ? Path.GetFileName(horse.PassportScanUrl)
                            : "passport.pdf",
                        Url = $"/api/customer/horses/{horse.HorseId}/files/passport"
                    }
                },
                Photo = new HorseFileRefDto
                {
                    Name = !string.IsNullOrEmpty(horse.PhotoUrl)
                        ? Path.GetFileName(horse.PhotoUrl)
                        : "horse.png",
                    Url = $"/api/customer/horses/{horse.HorseId}/files/photo"
                },
                Ownership = new HorseFileRefDto
                {
                    Name = !string.IsNullOrEmpty(horse.OwnershipCertificateFileUrl)
                        ? Path.GetFileName(horse.OwnershipCertificateFileUrl)
                        : "ownership.pdf",
                    Url = $"/api/customer/horses/{horse.HorseId}/files/ownership"
                },
                ValueProof = !string.IsNullOrEmpty(horse.ValuationDocumentFileUrl)
                    ? new HorseFileRefDto
                    {
                        Name = Path.GetFileName(horse.ValuationDocumentFileUrl),
                        Url = $"/api/customer/horses/{horse.HorseId}/files/value-proof"
                    }
                    : null
            };

            return dto;
        }
    }
}
