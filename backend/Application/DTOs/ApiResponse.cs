using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class BlockerDto
    {
        [JsonPropertyName("code")]
        public string Code { get; set; } = string.Empty;

        [JsonPropertyName("field")]
        public string Field { get; set; } = string.Empty;

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;
    }

    public class ApiResponse<T>
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("errorCode")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ErrorCode { get; set; }

        [JsonPropertyName("data")]
        [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
        public T? Data { get; set; }

        [JsonPropertyName("blockers")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<BlockerDto>? Blockers { get; set; }

        [JsonPropertyName("errors")]
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

        public static ApiResponse<T?> Fail(
            string message,
            string? errorCode,
            List<BlockerDto>? blockers = null,
            IDictionary<string, string[]>? errors = null)
        {
            return new ApiResponse<T?>
            {
                Success = false,
                Message = message,
                ErrorCode = errorCode,
                Blockers = blockers,
                Data = default,
                Errors = errors
            };
        }
    }
}
