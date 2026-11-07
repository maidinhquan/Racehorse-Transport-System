using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace WebApi.Realtime;

/// <summary>
/// Kênh đẩy thông báo thời gian thực. Chỉ phát tín hiệu "dữ liệu đã đổi"; máy khách tự tải lại dữ liệu
/// qua API thường nên quyền truy cập vẫn do các endpoint hiện có kiểm soát.
/// </summary>
[Authorize]
public sealed class NotificationHub : Hub
{
    public const string Path = "/hubs/notifications";
    public const string RequestsUpdated = "requests_updated";
}
