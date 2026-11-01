using Application.DTOs.Flow4;

namespace Application.Interfaces.Flow4;

public interface IFlow4CustomerTrackingService
{
    /// <summary>
    /// F4-J32: Khách hàng theo dõi tiến độ hành trình đơn vận chuyển của mình (dữ liệu công khai, ẩn chi phí nội bộ).
    /// </summary>
    Task<Flow4PublicTrackingDto> GetCustomerTrackingAsync(string requestId, string customerId);

    /// <summary>
    /// F4-J33: Khách hàng tra cứu nhật ký sức khỏe, sinh hiệu và ảnh chăm sóc cá thể ngựa của mình.
    /// </summary>
    Task<List<Flow4PublicHealthDto>> GetCustomerHealthLogsAsync(string requestId, string customerId);

    /// <summary>
    /// F4-J34: Khách hàng tải ảnh/chứng từ hành trình đã được phân quyền chia sẻ cho đơn hàng của mình.
    /// </summary>
    Task<(string fileName, string contentType, byte[] fileBytes)?> GetCustomerTrackingFileAsync(string requestId, string fileId, string customerId);
}

