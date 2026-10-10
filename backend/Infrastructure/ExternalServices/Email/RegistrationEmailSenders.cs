using System.Net;
using System.Net.Mail;
using Application.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.ExternalServices.Email;

// DI only permits this sender in Development. No password or hash is logged.
public sealed class DevelopmentRegistrationEmailSender(ILogger<DevelopmentRegistrationEmailSender> logger) : IRegistrationEmailSender
{
    public Task SendOtpAsync(string email, string otp, DateTimeOffset expiresAt, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        logger.LogInformation("[DEVELOPMENT ONLY] Register OTP for {Email}: {Otp}; expires {ExpiresAt}", email, otp, expiresAt);
        return Task.CompletedTask;
    }
}

public sealed class RegistrationSmtpOptions
{
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string From { get; set; } = "";
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
}

public sealed class SmtpRegistrationEmailSender(IOptions<RegistrationSmtpOptions> options) : IRegistrationEmailSender
{
    public async Task SendOtpAsync(string email, string otp, DateTimeOffset expiresAt, CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        using var client = new SmtpClient(settings.Host, settings.Port)
        {
            EnableSsl = settings.EnableSsl,
            Credentials = string.IsNullOrEmpty(settings.Username) ? null : new NetworkCredential(settings.Username, settings.Password)
        };
        using var message = new MailMessage(settings.From, email)
        {
            Subject = "Xác minh đăng ký RaceHorse Transport",
            Body = $"Mã xác minh đăng ký: {otp}\nHết hạn lúc {expiresAt:O}. Không chia sẻ mã với người khác."
        };
        await client.SendMailAsync(message, cancellationToken);
    }
}
