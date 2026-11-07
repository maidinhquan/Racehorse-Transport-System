namespace Application.Common.Exceptions;

public sealed class BusinessRuleException(string message, int statusCode = 400, string? errorCode = null) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public string? ErrorCode { get; } = errorCode;
}
