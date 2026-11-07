namespace Application.Flow6.Exceptions;
public sealed class AftercareException(string code, string message, int status = 409) : Exception(message)
{ public string Code { get; } = code; public int Status { get; } = status; }
