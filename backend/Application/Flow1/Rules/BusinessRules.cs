using Application.Common.Exceptions;
namespace Application.Flow1.Rules;

public static class BusinessRules
{
    public static BusinessRuleException Failure(string code, string message, int status = 409) => new(message, status, code);
    public static void Require(bool condition, string code, string message, int status = 409)
    {
        if (!condition) throw Failure(code, message, status);
    }
    public static string Required(string? value, int maximum = 2000)
    {
        Require(!string.IsNullOrWhiteSpace(value) && value.Length <= maximum,
            "VALIDATION_ERROR", $"A value of at most {maximum} characters is required.", 400);
        return value!.Trim();
    }
    public static DateTime Utc(DateTimeOffset value) => value.UtcDateTime;
}
