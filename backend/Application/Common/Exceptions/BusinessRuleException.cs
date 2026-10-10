namespace Application.Common.Exceptions;

public sealed class BusinessRuleException(string message, int statusCode = 400) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}
