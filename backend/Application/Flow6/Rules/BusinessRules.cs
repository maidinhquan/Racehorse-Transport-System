using Application.Flow6.Exceptions;
namespace Application.Flow6.Rules;
public static class BusinessRules
{
    public static void Require(bool condition, string code, string message, int status = 409)
    { if (!condition) throw new AftercareException(code, message, status); }
    public static decimal Money(decimal value)
    { Require(value >= 0 && value <= 9999999999m && decimal.Truncate(value) == value, "INVALID_AMOUNT", "VND amount outside SQL domain.", 400); return value; }
    public static bool CanClose(string status, DateTime? ends, DateTime now, bool obligations)
        => status == "SETTLED" && ends is not null && now >= ends && !obligations;
}
