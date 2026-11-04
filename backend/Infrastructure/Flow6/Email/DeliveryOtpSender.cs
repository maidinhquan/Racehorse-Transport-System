using System.Net;
using System.Net.Mail;
using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using Application.Flow6.Services;
using Infrastructure.ExternalServices.Flow1;
namespace Infrastructure.Flow6.Email;
public sealed class DeliveryOtpSender(ContractSmtpOptions options,bool development) : IDeliveryOtpSender
{
    public async Task Send(string email,string code,string revisionId,string documentHash,DateTime expiresAtUtc,CancellationToken ct)
    {
        if (development)
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"\n==================================================");
            Console.WriteLine($"[DEVELOPMENT OTP] Handover Revision: {revisionId}");
            Console.WriteLine($"Receiver Email: {email}");
            Console.WriteLine($"OTP Code: {code}");
            Console.WriteLine($"Expires At: {expiresAtUtc:O}");
            Console.WriteLine($"==================================================\n");
            Console.ResetColor();

            try
            {
                File.WriteAllText(Path.Combine(AppContext.BaseDirectory, "flow6_latest_otp.txt"), $"{revisionId}:{code}:{email}");
            }
            catch { }
        }

        var s=options.Smtp;
        var local=s.Host.Equals("localhost",StringComparison.OrdinalIgnoreCase)||IPAddress.TryParse(s.Host,out var ip)&&IPAddress.IsLoopback(ip);
        if(string.IsNullOrWhiteSpace(s.Host)||string.IsNullOrWhiteSpace(s.From)||s.Port is <1 or >65535||!s.EnableSsl&&!(development&&options.AllowDevelopmentLoopback&&local))
        {
            if (development) return;
            throw new AftercareException("EMAIL_NOT_CONFIGURED","Configure Flow6:Email SMTP with TLS.",503);
        }
        try
        {
            using var timeout=CancellationTokenSource.CreateLinkedTokenSource(ct);timeout.CancelAfter(TimeSpan.FromSeconds(15));
            using var smtp=new SmtpClient(s.Host,s.Port){EnableSsl=s.EnableSsl,UseDefaultCredentials=false,Credentials=string.IsNullOrEmpty(s.Username)?null:new NetworkCredential(s.Username,s.Password)};
            using var mail=new MailMessage(s.From,email){Subject="RaceHorse — Xác nhận biên bản bàn giao",Body=$"Phiên bản biên bản: {revisionId}\nMã đối chiếu nội dung: {documentHash}\nMã OTP: {code}\nHết hạn UTC: {expiresAtUtc:O}\nChỉ cung cấp mã cho nhân sự giao nhận sau khi đã xem và đồng ý đúng nội dung biên bản."};
            await smtp.SendMailAsync(mail,timeout.Token);
        }
        catch(Exception e)when(e is SmtpException or InvalidOperationException or FormatException or OperationCanceledException)
        {
            if(ct.IsCancellationRequested)throw new OperationCanceledException(ct);
            if(development)
            {
                Console.WriteLine($"[DEVELOPMENT OTP] Email delivery skipped/failed: {e.Message}");
                return;
            }
            throw new AftercareException("EMAIL_UNAVAILABLE","Delivery confirmation email could not be sent.",503);
        }
    }
}
