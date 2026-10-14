namespace Application.Common.Registration;

public sealed class RegistrationOptions
{
    public int OtpLifetimeSeconds { get; set; } = 300;
    public int SessionLifetimeSeconds { get; set; } = 900;
    public int ResendCooldownSeconds { get; set; } = 60;
    public int MaxFailedAttempts { get; set; } = 5;
    public int MaxEmailsPerWindow { get; set; } = 5;
    public int EmailWindowSeconds { get; set; } = 900;
}
