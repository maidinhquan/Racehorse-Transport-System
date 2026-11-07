using System.Globalization;
using System.Net;
using System.Net.Mail;
using System.Net.Mime;
using System.Text;

namespace Infrastructure.ExternalServices.Email;

/// <summary>Khung thư OTP dùng chung (đăng ký, ký hợp đồng, xác nhận bàn giao): tên hệ thống hiển thị ở ô người gửi và bố cục thống nhất.</summary>
public static class OtpEmailTemplate
{
    public const string BrandName = "CBN Transport";
    private const string Tagline = "Hệ thống vận chuyển ngựa đua quốc tế";

    public sealed record Detail(string Label, string Value);

    public static string FormatExpiry(DateTimeOffset expiresAt) =>
        expiresAt.ToOffset(TimeSpan.FromHours(7)).ToString("HH:mm 'ngày' dd/MM/yyyy", CultureInfo.InvariantCulture) + " (GMT+7)";

    public static MailMessage Create(string from, string to, string subject, string heading, string intro, string code,
        IReadOnlyList<Detail> details, DateTimeOffset expiresAt, string warning)
    {
        var expiry = FormatExpiry(expiresAt);
        var message = new MailMessage { From = new MailAddress(from, BrandName, Encoding.UTF8), Subject = subject, SubjectEncoding = Encoding.UTF8, BodyEncoding = Encoding.UTF8 };
        message.To.Add(to);

        var text = new StringBuilder();
        text.AppendLine(heading).AppendLine().AppendLine(intro).AppendLine();
        text.AppendLine($"Mã xác nhận: {code}");
        foreach (var d in details) text.AppendLine($"{d.Label}: {d.Value}");
        text.AppendLine($"Hết hạn lúc: {expiry}").AppendLine().AppendLine(warning).AppendLine().AppendLine($"— {BrandName} · {Tagline}");
        message.Body = text.ToString();
        message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(BuildHtml(heading, intro, code, details, expiry, warning), Encoding.UTF8, MediaTypeNames.Text.Html));
        return message;
    }

    private static string E(string value) => WebUtility.HtmlEncode(value);

    private static string BuildHtml(string heading, string intro, string code, IReadOnlyList<Detail> details, string expiry, string warning)
    {
        var rows = new StringBuilder();
        foreach (var d in details)
            rows.Append($"<tr><td style=\"padding:6px 0;color:#6b7280;font-size:13px;width:38%;vertical-align:top\">{E(d.Label)}</td><td style=\"padding:6px 0;color:#111827;font-size:13px;font-weight:600;word-break:break-all\">{E(d.Value)}</td></tr>");
        rows.Append($"<tr><td style=\"padding:6px 0;color:#6b7280;font-size:13px;width:38%\">Hết hạn lúc</td><td style=\"padding:6px 0;color:#111827;font-size:13px;font-weight:600\">{E(expiry)}</td></tr>");

        return $"""
<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{E(heading)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <tr><td style="background:#f08a2b;padding:20px 28px">
      <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.3px">{E(BrandName)}</div>
      <div style="color:#ffedd5;font-size:12px;margin-top:2px">{E(Tagline)}</div>
    </td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 8px;font-size:18px;color:#111827">{E(heading)}</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151">{E(intro)}</p>
      <div style="text-align:center;margin:0 0 20px">
        <div style="font-size:12px;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Mã xác nhận</div>
        <div style="display:inline-block;background:#fff7ed;border:1px dashed #f08a2b;border-radius:10px;padding:12px 28px;font-size:32px;font-weight:700;letter-spacing:8px;color:#c2410c;font-family:Consolas,'Courier New',monospace">{E(code)}</div>
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;margin:0 0 18px">{rows}</table>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#b45309;background:#fffbeb;border-radius:8px;padding:10px 12px">{E(warning)}</p>
    </td></tr>
    <tr><td style="padding:16px 28px;background:#f9fafb;color:#9ca3af;font-size:11px;text-align:center">
      Thư tự động từ {E(BrandName)}. Vui lòng không trả lời thư này.
    </td></tr>
  </table>
</td></tr></table>
</body></html>
""";
    }
}
