using System.Net;
using System.Text.Json;
using Application.Common.Exceptions;
using Application.DTOs;

namespace WebApi.Middlewares
{
    /// <summary>
    /// Middleware xử lý ngoại lệ toàn cục theo chuẩn OpenAPI Flow 3 v2.
    /// Chuẩn hóa toàn bộ lỗi thành định dạng ApiResponse có ErrorCode và mảng Blockers.
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
            catch (Exception ex)
            {
                if (context.Response.HasStarted) throw;
                await HandleExceptionAsync(context, ex);
            }
        }

        /// <summary>Mã lỗi nghiệp vụ biểu thị xung đột trạng thái (HTTP 409).</summary>
        private static readonly HashSet<string> ConflictErrorCodes = new(StringComparer.Ordinal)
        {
            "TRIP_STATE_INVALID", "INVALID_SEQUENCE", "MILESTONE_NOT_NEXT", "MILESTONE_ALREADY_COMPLETED", "NOT_ASSIGNED_LEG", "CHECKPOINT_NOT_CLEARED",
            "INCIDENT_BLOCKING", "HEALTH_CHECK_REQUIRED", "VET_CLEARANCE_REQUIRED", "EVIDENCE_INVALID", "INVALID_EVENT_TIME",
            "STAFF_BUSY_ON_ACTIVE_TRIP", "STALE_VERSION", "READINESS_CHANGED",
        };

        /// <summary>Giá trị trong phần "errors" của phản hồi lỗi chỉ được dài tối đa 2000 ký tự theo contract.</summary>
        private static string CapForContract(string? value) =>
            string.IsNullOrEmpty(value) ? string.Empty : value.Length <= 1900 ? value : value[..1900] + "...";

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";

            int statusCode = (int)HttpStatusCode.InternalServerError;
            string errorCode = "INTERNAL_ERROR";
            string message = exception.Message;
            var blockers = new List<BlockerDto>();

            switch (exception)
            {
                case KeyNotFoundException knf:
                    statusCode = (int)HttpStatusCode.NotFound;
                    errorCode = "NOT_FOUND";
                    message = knf.Message;
                    blockers.Add(new BlockerDto { Code = "NOT_FOUND", Field = "id", Message = knf.Message });
                    break;

                case InvalidOperationException inv:
                    var msg = inv.Message;
                    if (msg.StartsWith("STALE_VERSION"))
                    {
                        statusCode = (int)HttpStatusCode.Conflict;
                        errorCode = "STALE_VERSION";
                        message = msg.Replace("STALE_VERSION: ", "");
                        blockers.Add(new BlockerDto { Code = "STALE_VERSION", Field = "expectedVersion", Message = message });
                    }
                    else if (msg.StartsWith("READINESS_CHANGED"))
                    {
                        statusCode = (int)HttpStatusCode.Conflict;
                        errorCode = "READINESS_CHANGED";
                        message = msg.Replace("READINESS_CHANGED: ", "");
                        blockers.Add(new BlockerDto { Code = "READINESS_CHANGED", Field = "readinessVersion", Message = message });
                    }
                    else if (msg.StartsWith("RESOURCE_NOT_CONFIRMED"))
                    {
                        statusCode = (int)HttpStatusCode.BadRequest;
                        errorCode = "RESOURCE_NOT_CONFIRMED";
                        message = msg.Replace("RESOURCE_NOT_CONFIRMED: ", "");
                        blockers.Add(new BlockerDto { Code = "RESOURCE_NOT_CONFIRMED", Field = "resources", Message = message });
                    }
                    else if (msg.StartsWith("PLAN_NOT_APPROVED"))
                    {
                        statusCode = (int)HttpStatusCode.BadRequest;
                        errorCode = "PLAN_NOT_APPROVED";
                        message = msg.Replace("PLAN_NOT_APPROVED: ", "");
                        blockers.Add(new BlockerDto { Code = "PLAN_NOT_APPROVED", Field = "plan", Message = message });
                    }
                    else if (msg.StartsWith("FLIGHT_NOT_BOOKED"))
                    {
                        statusCode = (int)HttpStatusCode.BadRequest;
                        errorCode = "FLIGHT_NOT_BOOKED";
                        message = msg.Replace("FLIGHT_NOT_BOOKED: ", "");
                        blockers.Add(new BlockerDto { Code = "FLIGHT_NOT_BOOKED", Field = "flight", Message = message });
                    }
                    else if (msg.StartsWith("DUPLICATE_COORDINATES"))
                    {
                        statusCode = (int)HttpStatusCode.Conflict;
                        errorCode = "DUPLICATE_COORDINATES";
                        message = msg.Replace("DUPLICATE_COORDINATES: ", "");
                        blockers.Add(new BlockerDto { Code = "DUPLICATE_COORDINATES", Field = "geo", Message = message });
                    }
                    else if (msg.StartsWith("CANNOT_DELETE"))
                    {
                        statusCode = (int)HttpStatusCode.Conflict;
                        errorCode = "CANNOT_DELETE";
                        message = msg.Replace("CANNOT_DELETE: ", "");
                        blockers.Add(new BlockerDto { Code = "CANNOT_DELETE", Field = "id", Message = message });
                    }
                    else if (msg.StartsWith("DEPARTURE_GATE_FAILED"))
                    {
                        statusCode = (int)HttpStatusCode.BadRequest;
                        errorCode = "DEPARTURE_GATE_FAILED";
                        message = msg.Replace("DEPARTURE_GATE_FAILED: ", "");
                        blockers.Add(new BlockerDto { Code = "DEPARTURE_GATE_FAILED", Field = "readiness", Message = message });
                    }
                    else if (System.Text.RegularExpressions.Regex.Match(msg, @"^([A-Z][A-Z0-9_]{2,}):\s*(.*)$", System.Text.RegularExpressions.RegexOptions.Singleline) is { Success: true } coded)
                    {
                        // Mã lỗi nghiệp vụ do dịch vụ chủ động ném ra: xung đột trạng thái trả 409, các lỗi còn lại trả 400
                        errorCode = coded.Groups[1].Value;
                        message = coded.Groups[2].Value;
                        statusCode = ConflictErrorCodes.Contains(errorCode) ? (int)HttpStatusCode.Conflict : (int)HttpStatusCode.BadRequest;
                        blockers.Add(new BlockerDto { Code = errorCode, Field = "business", Message = message });
                    }
                    else
                    {
                        statusCode = (int)HttpStatusCode.InternalServerError;
                        errorCode = "INTERNAL_ERROR";
                        var includeDetails = _env.IsDevelopment() && !context.Request.Path.StartsWithSegments("/api/auth/register");
                        message = includeDetails ? msg : "Đã xảy ra lỗi nội bộ từ máy chủ. Vui lòng thử lại sau.";
                        blockers.Add(new BlockerDto { Code = "INTERNAL_ERROR", Field = "server", Message = message });
                    }
                    break;

                case UnauthorizedAccessException:
                    statusCode = (int)HttpStatusCode.Unauthorized;
                    errorCode = "UNAUTHENTICATED";
                    message = "Yêu cầu đăng nhập hoặc token xác thực không hợp lệ.";
                    blockers.Add(new BlockerDto { Code = "UNAUTHENTICATED", Field = "auth", Message = message });
                    break;

                case BusinessRuleException bre:
                    statusCode = bre.StatusCode;
                    errorCode = !string.IsNullOrWhiteSpace(bre.ErrorCode) ? bre.ErrorCode : "BUSINESS_RULE_VIOLATION";
                    message = bre.Message;
                    blockers.Add(new BlockerDto { Code = errorCode, Field = "business", Message = bre.Message });
                    break;

                default:
                    statusCode = (int)HttpStatusCode.InternalServerError;
                    errorCode = "INTERNAL_ERROR";
                    _logger.LogError(exception, "Lỗi không xử lý được xảy ra khi xử lý request: {Path}", context.Request.Path);
                    var detailMsg = exception.InnerException != null ? $"{exception.Message} -> {exception.InnerException.Message}" : exception.Message;
                    var includeDefaultDetails = _env.IsDevelopment() && !context.Request.Path.StartsWithSegments("/api/auth/register");
                    message = includeDefaultDetails ? detailMsg : "Đã xảy ra lỗi nội bộ từ máy chủ. Vui lòng thử lại sau.";
                    blockers.Add(new BlockerDto { Code = "INTERNAL_ERROR", Field = "server", Message = message });
                    break;
            }

            context.Response.StatusCode = statusCode;

            var response = ApiResponse<object?>.Fail(
                message,
                errorCode,
                blockers,
                _env.IsDevelopment() && !context.Request.Path.StartsWithSegments("/api/auth/register")
                    ? new Dictionary<string, string[]>
                    {
                        { "exceptionType", new[] { exception.GetType().Name } },
                        { "stackTrace", new[] { CapForContract(exception.StackTrace) } }
                    }
                    : null
            );

            await context.Response.WriteAsJsonAsync(response);
        }
    }
}
