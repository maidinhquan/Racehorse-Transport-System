using System.Text.Json.Serialization;

namespace RaceHorse_Transport_Application.DTOs
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }

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
    }
}

