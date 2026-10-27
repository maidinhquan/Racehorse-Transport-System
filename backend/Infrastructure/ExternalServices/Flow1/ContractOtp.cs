using System.Globalization;
using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using Application.Flow1.Interfaces;
using Infrastructure.ExternalServices.Email;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Infrastructure.ExternalServices.Flow1;

public sealed class ContractOtpSecurity(string? configuredKey) : IOtpSecurity
{
    // No embedded/default signing key. A missing secret fails only the OTP commands, not PDF reads.
    public string NewCode() => RandomNumberGenerator.GetInt32(1_000_000).ToString("D6", CultureInfo.InvariantCulture);
    public string Digest(string purpose, string value)
    {
        if (string.IsNullOrWhiteSpace(configuredKey) || Encoding.UTF8.GetByteCount(configuredKey) < 32)
            throw Error("Configure a private contract OTP key of at least 32 bytes.", "CONTRACT_OTP_NOT_CONFIGURED", 503);
        var derived = HMACSHA256.HashData(Encoding.UTF8.GetBytes(configuredKey), Encoding.UTF8.GetBytes("RaceHorse.Flow1.ContractOtp.v1/" + purpose));
        return Convert.ToHexString(HMACSHA256.HashData(derived, Encoding.UTF8.GetBytes(value))).ToLowerInvariant();
    }
    public bool Matches(string expected, string actual) => CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(actual));
}

public sealed class ContractSmtpOptions
{
    public RegistrationSmtpOptions Smtp { get; set; } = new();
    public bool AllowDevelopmentLoopback { get; set; }
}
// A dedicated sender: the registration Development sender deliberately logs codes and is unsuitable here.
public sealed class ContractSmtpSender(ContractSmtpOptions options, bool development) : IOtpSender
{
    public async Task SendAsync(string email, string code, string contractId, int version, string documentHash, DateTimeOffset expiresAt, CancellationToken ct)
    {
        var s = options.Smtp;
        var loopback = s.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || IPAddress.TryParse(s.Host, out var ip) && IPAddress.IsLoopback(ip);
        if (string.IsNullOrWhiteSpace(s.Host) || string.IsNullOrWhiteSpace(s.From) || s.Port is < 1 or > 65535 ||
            !s.EnableSsl && !(development && options.AllowDevelopmentLoopback && loopback))
            throw Error("Configure contract email delivery with TLS (or an explicit Development loopback sink).", "CONTRACT_EMAIL_NOT_CONFIGURED", 503);
        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct); timeout.CancelAfter(TimeSpan.FromSeconds(20));
            using var client = new SmtpClient(s.Host, s.Port) { EnableSsl = s.EnableSsl, UseDefaultCredentials = false,
                Credentials = string.IsNullOrEmpty(s.Username) ? null : new NetworkCredential(s.Username, s.Password) };
            using var message = new MailMessage(s.From, email) { Subject = "RaceHorse Transport - Contract confirmation",
                Body = $"Contract: {contractId}\nDocument reference: {documentHash}\nConfirmation code: {code}\nExpires: {expiresAt:O}\nDo not share this code. Only confirm the PDF you reviewed." };
            await client.SendMailAsync(message, timeout.Token);
        }
        catch (Exception e) when (e is SmtpException or FormatException or InvalidOperationException or OperationCanceledException)
        {
            if (ct.IsCancellationRequested) throw new OperationCanceledException(ct);
            // Do not propagate SMTP diagnostics, recipients, body or codes into logs/API responses.
            throw Error("Contract email could not be delivered; request a new code after the cooldown.", "CONTRACT_EMAIL_UNAVAILABLE", 503);
        }
    }
}
