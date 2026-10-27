using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;

        [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
        public T? Data { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ErrorCode { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public IDictionary<string, string[]>? Errors { get; set; }

        public static ApiResponse<T> Ok(T data, string message = "Success")
        {
            return new ApiResponse<T>
            {
                Success = true,
                Message = message,
                Data = data
            };
        }

        public static ApiResponse<T?> Fail(string message, IDictionary<string, string[]>? errors = null)
        {
            return new ApiResponse<T?>
            {
                Success = false,
                Message = message,
                Data = default,
                Errors = errors
            };
        }

        public static ApiResponse<T?> FailWithCode(string message, string errorCode, IDictionary<string, string[]>? errors = null)
        {
            return new ApiResponse<T?>
            {
                Success = false,
                Message = message,
                ErrorCode = errorCode,
                Data = default,
                Errors = errors
            };
        }
    }
}

