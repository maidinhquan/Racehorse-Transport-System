using Microsoft.AspNetCore.Http;
using Application.DTOs;

namespace Application.Interfaces
{
    /// <summary>
    /// Service giao tiếp Cloud Storage (Cloudinary) dùng chung cho toàn hệ thống.
    /// Hỗ trợ cả file ảnh (.jpg, .png, .webp) và file tài liệu (.pdf),
    /// tự động phân loại thư mục lưu trữ theo tên phân hệ.
    /// </summary>
    public interface ICloudStorageService
    {
        /// <summary>
        /// Tải file từ form upload lên Cloudinary với thư mục tương ứng phân hệ.
        /// </summary>
        /// <param name="file">File từ client gửi lên (IFormFile)</param>
        /// <param name="subFolder">Tên phân hệ / thư mục con (VD: "medical_records", "staff_documents", "incidents")</param>
        /// <param name="customFileName">Tùy chọn đặt tên file cụ thể nếu muốn ghi đè hoặc cố định mã</param>
        /// <returns>Thông tin kết quả upload gồm SecureUrl và PublicId</returns>
        Task<CloudUploadResult> UploadFileAsync(IFormFile file, string subFolder, string? customFileName = null);

        /// <summary>
        /// Tải file từ luồng bộ nhớ (Stream) lên Cloudinary (hữu ích khi sinh file PDF xuất báo cáo tại backend).
        /// </summary>
        Task<CloudUploadResult> UploadStreamAsync(Stream stream, string fileName, string subFolder);

        /// <summary>
        /// Xóa file trên Cloudinary bằng PublicId khi bản ghi bị xóa hoặc cập nhật file mới.
        /// </summary>
        /// <param name="publicId">Mã định danh file trên Cloudinary</param>
        /// <param name="resourceType">Loại tài nguyên: "image" hoặc "raw" (tự động nhận diện nếu null)</param>
        Task<CloudDeleteResult> DeleteFileAsync(string publicId, string? resourceType = null);

        /// <summary>
        /// Trích xuất PublicId từ một Cloudinary SecureUrl lưu trong database.
        /// </summary>
        string? ExtractPublicIdFromUrl(string? url);
    }
}
