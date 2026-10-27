using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Application.DTOs;
using Domain.Entities;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Middlewares
{
    /// <summary>
    /// Middleware kiểm soát tính Idempotent theo chuẩn API Flow 3 v2 (F3-J01..J55).
    /// Bắt buộc có header Idempotency-Key trên các tác vụ mutation (POST, PUT, DELETE).
    /// Tự động cache và trả về kết quả 24h nếu trùng khóa và trùng body hash.
    /// Trả về 422 IDEMPOTENCY_CONFLICT nếu trùng khóa nhưng khác nội dung body.
    /// </summary>
    public class IdempotencyMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<IdempotencyMiddleware> _logger;

        public IdempotencyMiddleware(RequestDelegate next, ILogger<IdempotencyMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, HorseTransportDbContext dbContext)
        {
            var method = context.Request.Method.ToUpper();
            var path = context.Request.Path.Value?.ToLower() ?? string.Empty;

            // Chỉ áp dụng cho các request thay đổi trạng thái (POST, PUT, DELETE)
            if (method != "POST" && method != "PUT" && method != "DELETE")
            {
                await _next(context);
                return;
            }

            // Bỏ qua các endpoint read-only hoặc auth
            if (path.Contains("/plan/validate") || 
                path.Contains("/auth/login") || 
                path.Contains("/auth/register") ||
                path.Contains("/swagger"))
            {
                await _next(context);
                return;
            }

            // Chỉ áp dụng cho các route thuộc phạm vi điều phối / quản lý / chuyên viên Flow 3
            bool isFlow3Path = path.Contains("/coordinator") || 
                               path.Contains("/manager") || 
                               path.Contains("/specialist") || 
                               path.Contains("/trips") ||
                               path.Contains("/places") ||
                               path.Contains("/air-partners");

            if (!isFlow3Path)
            {
                await _next(context);
                return;
            }

            // Kiểm tra sự hiện diện của header Idempotency-Key
            if (!context.Request.Headers.TryGetValue("Idempotency-Key", out var rawKey) || string.IsNullOrWhiteSpace(rawKey))
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                context.Response.ContentType = "application/json";

                var err = ApiResponse<object?>.Fail(
                    "Header Idempotency-Key là bắt buộc cho thao tác này (yêu cầu UUID).",
                    "MISSING_IDEMPOTENCY_KEY",
                    new List<BlockerDto>
                    {
                        new() { Code = "MISSING_IDEMPOTENCY_KEY", Field = "header.Idempotency-Key", Message = "Thiếu header Idempotency-Key" }
                    });

                await context.Response.WriteAsJsonAsync(err);
                return;
            }

            string key = rawKey.ToString().Trim();

            // Đọc và băm SHA256 nội dung request body
            context.Request.EnableBuffering();
            string bodyText;
            using (var reader = new StreamReader(context.Request.Body, Encoding.UTF8, leaveOpen: true))
            {
                bodyText = await reader.ReadToEndAsync();
                context.Request.Body.Position = 0;
            }

            string bodyHash = ComputeSha256(bodyText);
            string userId = context.User?.FindFirst("userId")?.Value ?? "ANONYMOUS";

            // Kiểm tra khóa đã tồn tại trong database chưa
            var existingRecord = await dbContext.IdempotencyRecords
                .FirstOrDefaultAsync(r => r.IdempotencyKey == key);

            if (existingRecord != null)
            {
                // Nếu đã hết hạn cache 24h thì dọn dẹp và tiếp tục
                if (existingRecord.ExpiresAtUtc <= DateTime.UtcNow)
                {
                    dbContext.IdempotencyRecords.Remove(existingRecord);
                    await dbContext.SaveChangesAsync();
                }
                else
                {
                    // Nếu trùng khóa nhưng body khác -> Trả về lỗi 422 IDEMPOTENCY_CONFLICT
                    if (existingRecord.RequestBodyHash != bodyHash)
                    {
                        context.Response.StatusCode = StatusCodes.Status422UnprocessableEntity;
                        context.Response.ContentType = "application/json";

                        var err = ApiResponse<object?>.Fail(
                            "Khóa Idempotency-Key đã được sử dụng trước đó với nội dung request khác (Payload Conflict).",
                            "IDEMPOTENCY_CONFLICT",
                            new List<BlockerDto>
                            {
                                new() { Code = "IDEMPOTENCY_CONFLICT", Field = "header.Idempotency-Key", Message = "Trùng khóa nhưng khác nội dung body" }
                            });

                        await context.Response.WriteAsJsonAsync(err);
                        return;
                    }

                    // Nếu trùng khóa và trùng body -> Trả về response cache đã lưu trước đó ngay lập tức
                    context.Response.StatusCode = existingRecord.ResponseStatusCode;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(existingRecord.ResponseBody);
                    return;
                }
            }

            // Bắt giữ response body để lưu cache nếu thành công
            var originalBodyStream = context.Response.Body;
            using var responseBodyMemoryStream = new MemoryStream();
            context.Response.Body = responseBodyMemoryStream;

            try
            {
                await _next(context);

                responseBodyMemoryStream.Position = 0;
                string responseBodyText = await new StreamReader(responseBodyMemoryStream).ReadToEndAsync();
                responseBodyMemoryStream.Position = 0;

                // Lưu cache nếu request thực thi thành công (HTTP 2xx)
                if (context.Response.StatusCode >= 200 && context.Response.StatusCode < 300)
                {
                    try
                    {
                        var newRecord = new IdempotencyRecord
                        {
                            IdempotencyKey = key,
                            ActorId = userId,
                            HttpMethod = method,
                            RequestPath = path,
                            RequestBodyHash = bodyHash,
                            ResponseStatusCode = context.Response.StatusCode,
                            ResponseBody = responseBodyText,
                            CreatedAtUtc = DateTime.UtcNow,
                            ExpiresAtUtc = DateTime.UtcNow.AddHours(24)
                        };

                        dbContext.IdempotencyRecords.Add(newRecord);
                        await dbContext.SaveChangesAsync();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Không thể lưu IdempotencyRecord cho key {Key}", key);
                    }
                }

                await responseBodyMemoryStream.CopyToAsync(originalBodyStream);
            }
            finally
            {
                context.Response.Body = originalBodyStream;
            }
        }

        private static string ComputeSha256(string raw)
        {
            if (string.IsNullOrEmpty(raw)) return "EMPTY";
            using var sha = SHA256.Create();
            byte[] bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(raw));
            return Convert.ToHexString(bytes);
        }
    }
}

