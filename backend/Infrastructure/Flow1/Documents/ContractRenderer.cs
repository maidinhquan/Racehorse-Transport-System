using System.Diagnostics;
using System.Net;
using System.Text;
using System.Text.Json;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Flow1.Interfaces;
using static Application.Flow1.Rules.BusinessRules;
namespace Infrastructure.Flow1.Documents;

public sealed class ContractRenderer(Flow1ContractOptions options, IPrivateFiles files) : IContractRenderer
{
    public async Task<string> RenderAsync(JsonElement snapshot, CancellationToken ct)
    {
        var executable = options.BrowserExecutablePath;
        Require(!string.IsNullOrWhiteSpace(executable) && File.Exists(executable), "PDF_CONVERTER_NOT_CONFIGURED", "Configure the contract browser executable.", 503);
        var work = Path.GetFullPath(options.WorkRoot);
        var job = Path.Combine(work, "snapshot-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(job);
        try
        {
            var html = Path.Combine(job, "contract.html"); var pdf = Path.Combine(job, "contract.pdf");
            var body = new StringBuilder("<!doctype html><html lang='vi'><meta charset='utf-8'><style>body{font:12px Arial;margin:24px}h1{font-size:22px}h2{font-size:17px}section{margin:8px 0}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:5px;vertical-align:top}p{white-space:pre-wrap;overflow-wrap:anywhere} @page{size:A4;margin:18mm}</style><h1>HỢP ĐỒNG VẬN CHUYỂN NGỰA</h1>");
            Render(body, snapshot, 2); body.Append("</html>");
            await File.WriteAllTextAsync(html, body.ToString(), new UTF8Encoding(false), ct);
            var start = new ProcessStartInfo(executable!) { UseShellExecute = false, CreateNoWindow = true, RedirectStandardError = true, RedirectStandardOutput = true };
            if (options.DisableBrowserSandbox) start.ArgumentList.Add("--no-sandbox");
            foreach (var arg in new[] { "--headless", "--disable-gpu", "--no-first-run", "--no-pdf-header-footer", "--user-data-dir=" + Path.Combine(job, "profile"), "--print-to-pdf=" + pdf, new Uri(html).AbsoluteUri }) start.ArgumentList.Add(arg);
            using var process = Process.Start(start) ?? throw Failure("PDF_CONVERSION_FAILED", "Could not start renderer.", 503);
            var stdout = process.StandardOutput.ReadToEndAsync(ct); var stderr = process.StandardError.ReadToEndAsync(ct);
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct); timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(options.TimeoutSeconds, 5, 120)));
            try { await process.WaitForExitAsync(timeout.Token); }
            catch (OperationCanceledException)
            {
                if (!process.HasExited) process.Kill(true);
                if (!ct.IsCancellationRequested) throw Failure("PDF_CONVERSION_TIMEOUT", "PDF generation timed out.", 503);
                throw;
            }
            await Task.WhenAll(stdout, stderr);
            Require(process.ExitCode == 0 && File.Exists(pdf), "PDF_CONVERSION_FAILED", "PDF generation failed.", 503);
            var bytes = await File.ReadAllBytesAsync(pdf, ct);
            Require(bytes.AsSpan().StartsWith("%PDF-"u8), "PDF_CONVERSION_FAILED", "Renderer produced invalid PDF.", 503);
            return await files.PutAsync(new UploadedFile(bytes, "contract.pdf"), false, ct);
        }
        finally
        {
            var target = Path.GetFullPath(job); var parent = Path.GetFullPath(work) + Path.DirectorySeparatorChar;
            if (target.StartsWith(parent, StringComparison.OrdinalIgnoreCase) && Directory.Exists(target)) Directory.Delete(target, true);
        }
    }
    private static void Render(StringBuilder html, JsonElement value, int level)
    {
        if (value.ValueKind == JsonValueKind.Object)
            foreach (var property in value.EnumerateObject())
            {
                html.Append($"<section><h{Math.Min(level, 6)}>{WebUtility.HtmlEncode(property.Name)}</h{Math.Min(level, 6)}>");
                Render(html, property.Value, level + 1); html.Append("</section>");
            }
        else if (value.ValueKind == JsonValueKind.Array)
            foreach (var item in value.EnumerateArray()) { html.Append("<section>"); Render(html, item, level); html.Append("</section><hr>"); }
        else html.Append("<p>").Append(WebUtility.HtmlEncode(value.ValueKind == JsonValueKind.Null ? "Không áp dụng / chưa ghi nhận" : value.ToString())).Append("</p>");
    }
}
