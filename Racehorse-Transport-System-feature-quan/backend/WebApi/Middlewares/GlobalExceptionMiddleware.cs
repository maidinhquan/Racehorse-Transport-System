using Application.DTOs;
using Application.Common.Exceptions;
using System.Net;
using System.Text.Json;

namespace WebApi.Middlewares
{
    /// <summary>
    /// Middleware bắt lỗi toàn cục.
    /// Đảm bảo dù bất kỳ Controller nào sau này gặp lỗi không mong muốn,
    /// Backend vẫn luôn trả về định dạng JSON chuẩn cho Frontend thay vì trả về trang HTML 500.
    /// </summary>
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;
        private readonly IWebHostEnvironment _env;

        public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger, IWebHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
            catch (BusinessRuleException ex)
            {
                if (context.Response.HasStarted) throw;
                context.Response.StatusCode = ex.StatusCode;
                await context.Response.WriteAsJsonAsync(ApiResponse<object?>.Fail(ex.Message), context.RequestAborted);
            }
            catch (Exception ex)
            {
                if (context.Response.HasStarted) throw;
                _logger.LogError(ex, "Lỗi không xử lý được xảy ra khi xử lý request: {Path}", context.Request.Path);
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

            // Registration pages show API messages directly; details belong in server logs.
            var includeDetails = _env.IsDevelopment()
                && !context.Request.Path.StartsWithSegments("/api/auth/register");
            var errorMessage = includeDetails
                ? exception.Message
                : "Đã xảy ra lỗi nội bộ từ máy chủ. Vui lòng thử lại sau.";

            var response = new ApiResponse<object?>
            {
                Success = false,
                Message = errorMessage,
                Data = null,
                Errors = includeDetails
                    ? new Dictionary<string, string[]>
                    {
                        { "exceptionType", new[] { exception.GetType().Name } },
                        { "stackTrace", new[] { exception.StackTrace ?? string.Empty } }
                    }
                    : null
            };

            var jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(response, jsonOptions));
        }
    }
}

