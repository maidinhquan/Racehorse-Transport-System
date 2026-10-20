using System.Diagnostics;
using System.Net;
using System.Text;
using System.Text.Json;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Infrastructure.ExternalServices.Flow1;

// Layout is code. Every clause is plain text from the reviewed SQL catalogue.
public sealed class CodeContractDocumentGenerator(string contentRoot, Flow1ContractOptions options,
    IFlow1PrivateFileStore files) : IFlow1ContractDocumentGenerator
{
    public async Task<ContractDocumentResult> GenerateAsync(ContractDocumentRequest request, CancellationToken ct = default)
    {
        var model = request.FrozenSnapshot.Deserialize<ContractPdfModel>(new JsonSerializerOptions(JsonSerializerDefaults.Web))
            ?? throw Error("PDF data missing.", "PDF_CONVERSION_FAILED", 503);
        if (model.Clauses is null || RequiredContractClauses.Ids.Any(id=>model.Clauses.Count(c=>c.ClauseId==id)!=1))
            throw Error("All twelve required clauses must be present exactly once.", "REQUIRED_CLAUSES_MISSING");
        var root = Path.GetFullPath(options.WorkRoot, contentRoot);
        var publicRoot = Path.GetFullPath("wwwroot", contentRoot);
        if (root.Equals(publicRoot, StringComparison.OrdinalIgnoreCase) || root.StartsWith(publicRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw Error("PDF work directory must be private.", "PDF_CONVERTER_NOT_CONFIGURED", 503);
        var job = Path.Combine(root, "issued-" + Guid.NewGuid().ToString("N")); Directory.CreateDirectory(job);
        try
        {
            var html = Path.Combine(job, "contract.html"); var pdf = Path.Combine(job, "contract.pdf");
            await File.WriteAllTextAsync(html, Layout(model), new UTF8Encoding(false), ct);
            var browser = options.BrowserExecutablePath;
            if (string.IsNullOrWhiteSpace(browser) && OperatingSystem.IsWindows())
                browser = new[] { Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google/Chrome/Application/chrome.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft/Edge/Application/msedge.exe") }.FirstOrDefault(File.Exists) ?? "";
            var info = new ProcessStartInfo { UseShellExecute = false, CreateNoWindow = true, RedirectStandardError = true, RedirectStandardOutput = true };
            if (!string.IsNullOrWhiteSpace(browser) && File.Exists(browser))
            {
                info.FileName = browser;
                foreach (var arg in new[] { "--headless", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--no-pdf-header-footer",
                    "--user-data-dir=" + Path.Combine(job, "profile"), "--print-to-pdf=" + pdf, new Uri(html).AbsoluteUri }) info.ArgumentList.Add(arg);
            }
            else
            {
                var office = !string.IsNullOrWhiteSpace(options.LibreOfficePath) ? options.LibreOfficePath : "/usr/bin/soffice";
                if (!File.Exists(office)) throw Error("Configure Flow1:Contracts:BrowserExecutablePath or LibreOfficePath.", "PDF_CONVERTER_NOT_CONFIGURED", 503);
                info.FileName = office;
                foreach (var arg in new[] { "-env:UserInstallation=" + new Uri(Path.Combine(job, "profile")).AbsoluteUri, "--headless", "--convert-to", "pdf:writer_pdf_Export", "--outdir", job, html }) info.ArgumentList.Add(arg);
            }
            using var process = Process.Start(info) ?? throw Error("PDF process failed.", "PDF_CONVERSION_FAILED", 503);
            var stdout = process.StandardOutput.ReadToEndAsync(ct); var stderr = process.StandardError.ReadToEndAsync(ct);
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct); timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(options.TimeoutSeconds, 5, 120)));
            try { await process.WaitForExitAsync(timeout.Token); }
            catch (OperationCanceledException) { if (!process.HasExited) process.Kill(true); throw Error("PDF conversion timed out.", "PDF_CONVERSION_TIMEOUT", 503); }
            await Task.WhenAll(stdout, stderr);
            if (process.ExitCode != 0 || !File.Exists(pdf)) throw Error("PDF conversion failed.", "PDF_CONVERSION_FAILED", 503);
            var bytes = await File.ReadAllBytesAsync(pdf, ct);
            if (!bytes.AsSpan().StartsWith("%PDF-"u8) || bytes.Length > 4 * 1024 * 1024) throw Error("Invalid PDF output.", "PDF_CONVERSION_FAILED", 503);
            bytes = PublishedClauseSelection.Attach(bytes, model.Clauses,model.AdditionalClauses);
            var saved = await files.PutAsync(new(bytes, "contract.pdf"), false, ct);
            return new(saved.FileId, saved.Sha256, saved.SizeBytes);
        }
        finally
        {
            // job is a generated child of the private work root, never a caller path.
            try { Directory.Delete(job, true); } catch (IOException) { } catch (UnauthorizedAccessException) { }
        }
    }
    private static string Layout(ContractPdfModel m)
    {
        static string H(string? x) => WebUtility.HtmlEncode(x ?? "");
        string V(string key) => m.Values.GetValueOrDefault(key) ?? "";
        var b = new StringBuilder("<!doctype html><html lang='vi'><meta charset='utf-8'><style>@page{size:A4;margin:20mm}body{font:12pt Arial,sans-serif;color:#111;line-height:1.5}h1{font-size:19pt;text-align:center}h2{font-size:14pt;break-after:avoid}h3{break-after:avoid}table{width:100%;border-collapse:collapse}td,th{border:1px solid #aaa;padding:6px;text-align:left}section{break-inside:avoid}pre{white-space:pre-wrap;font:inherit}small{color:#444}</style><body>");
        b.Append("<h1>HỢP ĐỒNG DỊCH VỤ VẬN CHUYỂN NGỰA</h1><p>Mã hợp đồng: ").Append(H(V("CONTRACT_CODE"))).Append("<br>Mã yêu cầu: ").Append(H(V("REQUEST_ID"))).Append("</p>");
        b.Append("<h2>1. Các bên</h2><p>Bên cung cấp: ").Append(H(V("COMPANY_NAME"))).Append("<br>Địa chỉ: ").Append(H(V("COMPANY_ADDRESS"))).Append("<br>Đại diện: ").Append(H(V("COMPANY_REPRESENTATIVE"))).Append("<br>Khách hàng: ").Append(H(V("CUSTOMER_FULL_NAME"))).Append("<br>Email: ").Append(H(V("CUSTOMER_EMAIL"))).Append("<br>Điện thoại: ").Append(H(V("CUSTOMER_PHONE"))).Append("</p>");
        b.Append("<h2>2. Vận chuyển và thanh toán</h2><table>");
        foreach (var pair in new[] { ("Điểm đón", "DEPARTURE_LOCATION"), ("Điểm giao", "DESTINATION_LOCATION"), ("Ngày đón", "EXPECTED_DEPARTURE_DATETIME"), ("Ngày giao", "COMMITTED_DEADLINE_DATETIME"), ("Giá hợp đồng (VND)", "TOTAL_PRICE_VND"), ("Cọc 40% (VND)", "DEPOSIT_AMOUNT_40_VND"), ("Hạn chung thanh toán, xác minh và ký OTP", "COMPLETION_DEADLINE") })
            b.Append("<tr><th>").Append(H(pair.Item1)).Append("</th><td>").Append(H(V(pair.Item2))).Append("</td></tr>");
        b.Append("</table><p>Cọc được xác minh trước khi ký OTP. Chỉ sau khi ký thành công, yêu cầu mới được kích hoạt và tạo chuyến đi.</p><h2>3. Danh sách ngựa</h2><table><tr><th>Tên</th><th>Microchip</th><th>Hộ chiếu</th></tr>");
        foreach (var h in m.Horses) b.Append("<tr><td>").Append(H(h.GetValueOrDefault("HORSE_1_NAME"))).Append("</td><td>").Append(H(h.GetValueOrDefault("HORSE_1_MICROCHIP"))).Append("</td><td>").Append(H(h.GetValueOrDefault("HORSE_1_FEI_NO"))).Append("</td></tr>");
        b.Append("</table><h2>4. Điều khoản hợp đồng</h2><p style='break-after:avoid'>Hợp đồng bao gồm đầy đủ 12 điều khoản bắt buộc dưới đây.</p>");
        foreach (var c in m.Clauses!) b.Append("<section><h3>").Append(H(c.Title)).Append("</h3><pre>").Append(H(c.Content)).Append("</pre></section>");
        if(m.AdditionalClauses is {Count:>0}){
            b.Append("<h2>5. Điều khoản bổ sung</h2>");
            for(var index=0;index<m.AdditionalClauses.Count;index++)
                b.Append("<section><h3>Bổ sung ").Append(index+1).Append("</h3><pre>").Append(H(m.AdditionalClauses[index])).Append("</pre></section>");
        }
        return b.Append("<p><small>Nội dung này được cố định khi phát hành. Xác nhận OTP được lưu riêng và gắn với mã SHA-256 của chính PDF này.</small></p></body></html>").ToString();
    }
}
