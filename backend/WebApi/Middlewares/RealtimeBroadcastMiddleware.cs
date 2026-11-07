using Microsoft.AspNetCore.SignalR;
using WebApi.Realtime;

namespace WebApi.Middlewares
{
    /// <summary>
    /// Sau mỗi thao tác ghi thành công (POST/PUT/PATCH/DELETE trên /api) báo cho các máy khách đang kết nối
    /// rằng dữ liệu đã đổi để tải lại ngay, thay vì chờ chu kỳ polling.
    /// </summary>
    public class RealtimeBroadcastMiddleware
    {
        private static readonly HashSet<string> MutatingMethods = new(StringComparer.OrdinalIgnoreCase)
        {
            HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch, HttpMethods.Delete,
        };

        private readonly RequestDelegate _next;

        public RealtimeBroadcastMiddleware(RequestDelegate next) => _next = next;

        public async Task InvokeAsync(HttpContext context, IHubContext<NotificationHub> hub, ILogger<RealtimeBroadcastMiddleware> logger)
        {
            await _next(context);

            var path = context.Request.Path;
            if (!MutatingMethods.Contains(context.Request.Method)
                || context.Response.StatusCode is < 200 or >= 300
                || !path.StartsWithSegments("/api")
                || path.StartsWithSegments("/api/auth"))
            {
                return;
            }

            try
            {
                await hub.Clients.All.SendAsync(NotificationHub.RequestsUpdated, new { at = DateTime.UtcNow }, context.RequestAborted);
            }
            catch (Exception ex)
            {
                // Realtime chỉ là phần tăng tốc: lỗi gửi không được làm hỏng thao tác đã thành công.
                logger.LogWarning(ex, "Realtime broadcast failed for {Method} {Path}", context.Request.Method, path);
            }
        }
    }
}
