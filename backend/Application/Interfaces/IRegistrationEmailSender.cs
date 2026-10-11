namespace Application.Interfaces;

public interface IRegistrationEmailSender
{
    Task SendOtpAsync(string email, string otp, DateTimeOffset expiresAt, CancellationToken cancellationToken = default);
}
