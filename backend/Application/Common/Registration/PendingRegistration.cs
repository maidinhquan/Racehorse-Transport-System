namespace Application.Common.Registration;

// Access mutable fields only inside IRegistrationStore.ExecuteAsync's session lock.
public sealed class PendingRegistration
{
    public required string RegistrationToken { get; init; }
    public required string FullName { get; init; }
    public required string Email { get; init; }
    public required string PhoneNumber { get; init; }
    public required string PasswordHash { get; init; }
    public required DateTimeOffset SessionExpiresAt { get; init; }
    public required byte[] OtpHash { get; set; }
    public required DateTimeOffset OtpExpiresAt { get; set; }
    public required DateTimeOffset ResendAvailableAt { get; set; }
    public int FailedAttempts { get; set; }
    public bool Completed { get; set; }
}
