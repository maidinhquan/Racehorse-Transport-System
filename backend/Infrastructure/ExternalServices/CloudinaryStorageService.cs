using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Application.DTOs;
using Application.Interfaces;

namespace Infrastructure.ExternalServices
{
    /// <summary>
    /// Triển khai kết nối Cloud Storage với Cloudinary.
    /// Hỗ trợ cả file ảnh (.jpg, .png, .webp) và tài liệu (.pdf),
    /// tự động phân loại thư mục theo cấu trúc system/{folderName}.
    /// </summary>
    public class CloudinaryStorageService : ICloudStorageService
    {
        private readonly Cloudinary _cloudinary;
        private readonly CloudinarySettings _settings;
        private readonly ILogger<CloudinaryStorageService> _logger;

        private static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg"
        };

        private static readonly HashSet<string> DocumentExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv"
        };

        public CloudinaryStorageService(IConfiguration configuration, ILogger<CloudinaryStorageService> logger)
        {
            _logger = logger;

            // Đọc cấu hình từ appsettings hoặc biến môi trường
            _settings = new CloudinarySettings();
            configuration.GetSection("Cloudinary").Bind(_settings);

            // Cho phép nạp từ Environment Variables nếu có
            var envCloudName = Environment.GetEnvironmentVariable("CLOUDINARY_CLOUD_NAME");
            var envApiKey = Environment.GetEnvironmentVariable("CLOUDINARY_API_KEY");
            var envApiSecret = Environment.GetEnvironmentVariable("CLOUDINARY_API_SECRET");
            var envUrl = Environment.GetEnvironmentVariable("CLOUDINARY_URL");

            if (!string.IsNullOrWhiteSpace(envCloudName)) _settings.CloudName = envCloudName;
            if (!string.IsNullOrWhiteSpace(envApiKey)) _settings.ApiKey = envApiKey;
            if (!string.IsNullOrWhiteSpace(envApiSecret)) _settings.ApiSecret = envApiSecret;

            if (!string.IsNullOrWhiteSpace(envUrl))
            {
                _cloudinary = new Cloudinary(envUrl);
                _cloudinary.Api.Secure = true;
                _logger.LogInformation("CloudinaryStorageService khởi tạo thành công từ CLOUDINARY_URL.");
                return;
            }

            var account = new Account(
                _settings.CloudName,
                _settings.ApiKey,
                _settings.ApiSecret
            );

            _cloudinary = new Cloudinary(account);
            _cloudinary.Api.Secure = true;

            _logger.LogInformation("CloudinaryStorageService khởi tạo với CloudName: {CloudName}", _settings.CloudName);
        }

        public async Task<CloudUploadResult> UploadFileAsync(IFormFile file, string subFolder, string? customFileName = null)
        {
            if (file == null || file.Length == 0)
            {
                throw new ArgumentException("Tệp tin tải lên rỗng hoặc không hợp lệ.", nameof(file));
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var isImage = ImageExtensions.Contains(extension);
            var isDoc = DocumentExtensions.Contains(extension);

            if (!isImage && !isDoc)
            {
                throw new ArgumentException($"Định dạng tệp '{extension}' không được hỗ trợ. Chỉ chấp nhận ảnh (.jpg, .png, .webp) và tài liệu (.pdf).");
            }

            var fileName = string.IsNullOrWhiteSpace(customFileName)
                ? $"{Guid.NewGuid():N}_{Path.GetFileNameWithoutExtension(file.FileName)}"
                : customFileName;

            using var stream = file.OpenReadStream();
            return await ExecuteUploadAsync(stream, fileName, extension, subFolder, isImage, file.FileName);
        }

        public async Task<CloudUploadResult> UploadStreamAsync(Stream stream, string fileName, string subFolder)
        {
            if (stream == null || stream.Length == 0)
            {
                throw new ArgumentException("Luồng dữ liệu (Stream) rỗng.", nameof(stream));
            }

            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            var isImage = ImageExtensions.Contains(extension);
            var cleanFileName = Path.GetFileNameWithoutExtension(fileName);

            return await ExecuteUploadAsync(stream, cleanFileName, extension, subFolder, isImage, fileName);
        }

        private async Task<CloudUploadResult> ExecuteUploadAsync(
            Stream stream,
            string fileName,
            string extension,
            string subFolder,
            bool isImage,
            string originalFileName)
        {
            // Phân loại thư mục: system/{folderName} (hoặc racehorse_system/{folderName})
            var folderPrefix = string.IsNullOrWhiteSpace(_settings.FolderPrefix) ? "system" : _settings.FolderPrefix;
            var cleanSubFolder = (subFolder ?? "general").Trim('/');
            var fullFolder = $"{folderPrefix}/{cleanSubFolder}";

            try
            {
                if (isImage)
                {
                    var uploadParams = new ImageUploadParams
                    {
                        File = new FileDescription(originalFileName, stream),
                        Folder = fullFolder,
                        PublicId = fileName,
                        Overwrite = true,
                        UniqueFilename = false
                    };

                    var uploadResult = await _cloudinary.UploadAsync(uploadParams);

                    if (uploadResult.Error != null)
                    {
                        _logger.LogError("Lỗi tải ảnh lên Cloudinary: {Error}", uploadResult.Error.Message);
                        throw new InvalidOperationException($"Cloudinary upload failed: {uploadResult.Error.Message}");
                    }

                    return new CloudUploadResult
                    {
                        Success = true,
                        SecureUrl = uploadResult.SecureUrl?.ToString() ?? uploadResult.Url?.ToString() ?? string.Empty,
                        PublicId = uploadResult.PublicId,
                        Format = uploadResult.Format ?? extension.TrimStart('.'),
                        Bytes = uploadResult.Bytes,
                        ResourceType = "image",
                        OriginalFileName = originalFileName,
                        CreatedAt = uploadResult.CreatedAt
                    };
                }
                else
                {
                    // Đối với tài liệu PDF hoặc tài liệu khác: dùng RawUploadParams để giữ nguyên cấu trúc PDF
                    var uploadParams = new RawUploadParams
                    {
                        File = new FileDescription(originalFileName, stream),
                        Folder = fullFolder,
                        PublicId = fileName + extension, // Raw files trên Cloudinary cần đuôi file
                        Overwrite = true,
                        UniqueFilename = false
                    };

                    var uploadResult = await _cloudinary.UploadAsync(uploadParams);

                    if (uploadResult.Error != null)
                    {
                        _logger.LogError("Lỗi tải tài liệu PDF lên Cloudinary: {Error}", uploadResult.Error.Message);
                        throw new InvalidOperationException($"Cloudinary upload failed: {uploadResult.Error.Message}");
                    }

                    return new CloudUploadResult
                    {
                        Success = true,
                        SecureUrl = uploadResult.SecureUrl?.ToString() ?? uploadResult.Url?.ToString() ?? string.Empty,
                        PublicId = uploadResult.PublicId,
                        Format = extension.TrimStart('.'),
                        Bytes = uploadResult.Bytes,
                        ResourceType = "raw",
                        OriginalFileName = originalFileName,
                        CreatedAt = uploadResult.CreatedAt
                    };
                }
            }
            catch (Exception ex) when (ex is not InvalidOperationException && ex is not ArgumentException)
            {
                _logger.LogError(ex, "Ngoại lệ khi gọi API Cloudinary: {Message}", ex.Message);
                throw new InvalidOperationException($"Không thể kết nối đến Cloudinary: {ex.Message}", ex);
            }
        }

        public async Task<CloudDeleteResult> DeleteFileAsync(string publicId, string? resourceType = null)
        {
            if (string.IsNullOrWhiteSpace(publicId))
            {
                return new CloudDeleteResult { Success = false, Result = "PublicId trống" };
            }

            try
            {
                var isRaw = string.Equals(resourceType, "raw", StringComparison.OrdinalIgnoreCase) ||
                            publicId.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase);

                var deleteParams = new DeletionParams(publicId)
                {
                    ResourceType = isRaw ? ResourceType.Raw : ResourceType.Image
                };

                var destroyResult = await _cloudinary.DestroyAsync(deleteParams);

                var success = destroyResult.Result?.Equals("ok", StringComparison.OrdinalIgnoreCase) == true;

                return new CloudDeleteResult
                {
                    Success = success,
                    Result = destroyResult.Result ?? "unknown",
                    PublicId = publicId
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa file trên Cloudinary {PublicId}: {Message}", publicId, ex.Message);
                return new CloudDeleteResult
                {
                    Success = false,
                    Result = ex.Message,
                    PublicId = publicId
                };
            }
        }

        public string? ExtractPublicIdFromUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return null;

            try
            {
                var uri = new Uri(url);
                var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);

                // Cloudinary path format: /{cloud_name}/{resource_type}/{type}/v{version}/{folder}/{subfolder}/{public_id}.{format}
                // Tìm vị trí của "upload"
                var uploadIndex = Array.IndexOf(segments, "upload");
                if (uploadIndex < 0 || uploadIndex + 1 >= segments.Length) return null;

                // Bỏ qua version nếu có (v1234567)
                var startIndex = uploadIndex + 1;
                if (startIndex < segments.Length && segments[startIndex].StartsWith("v") && long.TryParse(segments[startIndex].Substring(1), out _))
                {
                    startIndex++;
                }

                if (startIndex >= segments.Length) return null;

                var publicIdWithExt = string.Join("/", segments.Skip(startIndex));

                // Nếu là image thì Cloudinary publicId không bao gồm extension
                // Nếu là raw/pdf thì publicId có thể bao gồm extension
                var isRaw = segments.Contains("raw");
                if (!isRaw && Path.HasExtension(publicIdWithExt))
                {
                    var lastDot = publicIdWithExt.LastIndexOf('.');
                    if (lastDot > 0)
                    {
                        publicIdWithExt = publicIdWithExt.Substring(0, lastDot);
                    }
                }

                return publicIdWithExt;
            }
            catch
            {
                return null;
            }
        }
    }
}
