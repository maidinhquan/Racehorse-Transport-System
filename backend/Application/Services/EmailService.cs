using Microsoft.Extensions.Configuration;
using System.Net;
using System.Net.Mail;

namespace Application.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            var host = _config["Smtp:Host"];
            var portString = _config["Smtp:Port"];
            var username = _config["Smtp:Username"];
            var password = _config["Smtp:Password"];
            var fromEmail = _config["Smtp:FromEmail"] ?? "noreply@horsetransport.com";
            var fromName = _config["Smtp:FromName"] ?? "RaceHorse Transport System";
            var enableSsl = bool.TryParse(_config["Smtp:EnableSsl"], out var ssl) ? ssl : true;

            // Nếu chưa cấu hình SMTP trong appsettings.json hoặc thông tin là giá trị mẫu, fallback in ra console để test
            if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) || host.Contains("example.com"))
            {
                PrintFallbackConsole(toEmail, subject, body);
                return;
            }

            try
            {
                int port = int.TryParse(portString, out var p) ? p : 587;
                using var client = new SmtpClient(host, port)
                {
                    EnableSsl = enableSsl,
                    UseDefaultCredentials = false,
                    Credentials = new NetworkCredential(username, password)
                };

                using var mailMessage = new MailMessage
                {
                    From = new MailAddress(fromEmail, fromName),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };
                mailMessage.To.Add(toEmail);

                await client.SendMailAsync(mailMessage);

                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($"\n[EMAIL SERVICE] >>> ĐÃ GỬI EMAIL THÀNH CÔNG TỚI: {toEmail} (qua SMTP {host}) <<<\n");
                Console.ResetColor();
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"[EMAIL SERVICE] Gửi email qua SMTP thất bại: {ex.Message}. Kích hoạt fallback console:");
                Console.ResetColor();
                PrintFallbackConsole(toEmail, subject, body);
            }
        }

        private static void PrintFallbackConsole(string toEmail, string subject, string body)
        {
            // Tách mã OTP từ nội dung nếu có để in to rõ ràng
            var cleanText = System.Text.RegularExpressions.Regex.Replace(body, "<.*?>", " ")
                .Replace("&nbsp;", " ")
                .Trim();

            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("================================================================================");
            Console.WriteLine("[EMAIL THÔNG BÁO / CONSOLE]");
            Console.WriteLine($"Gửi tới: {toEmail}");
            Console.WriteLine($"Tiêu đề: {subject}");
            Console.WriteLine($"Nội dung: {cleanText}");
            Console.WriteLine("================================================================================");
            Console.ResetColor();
        }
    }
}

