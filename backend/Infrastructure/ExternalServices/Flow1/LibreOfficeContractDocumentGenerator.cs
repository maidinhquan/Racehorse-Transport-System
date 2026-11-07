using System.Diagnostics;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Flow1.Interfaces;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace Infrastructure.ExternalServices.Flow1;

// One conversion per process; each job has a private profile, bounded timeout and unique directory.
// SQL callers must invoke this adapter before opening their mutation transaction.
public sealed class LibreOfficeContractDocumentGenerator(string contentRoot, Flow1ContractOptions options,
    IFileArchive files) : IDocumentGenerator
{
    private static readonly SemaphoreSlim Gate = new(1, 1);
    private static readonly XNamespace W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    private static readonly Regex Tokens = new(@"\{\{([^{}]+)\}\}", RegexOptions.CultureInvariant);
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public async Task<ContractDocumentResult> GenerateAsync(ContractDocumentRequest request, CancellationToken ct = default)
    {
        if (request.TemplateVersion is not ("v2" or "v3")) throw Error("Unsupported contract template.", "TEMPLATE_UNAVAILABLE", 503);
        if (string.IsNullOrWhiteSpace(options.LibreOfficePath) || !File.Exists(options.LibreOfficePath))
            throw Error("Configure an explicit verified LibreOffice executable.", "PDF_CONVERTER_NOT_CONFIGURED", 503);
        if (OperatingSystem.IsWindows() && !Path.GetFileName(options.LibreOfficePath).Equals("soffice.com", StringComparison.OrdinalIgnoreCase))
            throw Error("Windows PDF conversion requires the synchronous console launcher soffice.com.", "PDF_CONVERTER_NOT_CONFIGURED", 503);
        var model = request.FrozenSnapshot.Deserialize<ContractPdfModel>(Json) ?? throw new InvalidDataException("PDF model missing.");
        var source = Path.Combine(contentRoot, "Resources/Contracts/v1/contract-template.docx");
        var patchBytes = await File.ReadAllBytesAsync(Path.Combine(contentRoot, $"Resources/Contracts/{request.TemplateVersion}/template-patch.json"), ct);
        using var patchDoc = JsonDocument.Parse(patchBytes); var patch = patchDoc.RootElement;
        if (!Convert.ToHexString(SHA256.HashData(await File.ReadAllBytesAsync(source, ct))).Equals(
            patch.GetProperty("sourceSha256").GetString(), StringComparison.OrdinalIgnoreCase))
            throw Error("Reference template integrity check failed.", "TEMPLATE_INTEGRITY_ERROR", 503);
        if (model.Horses.Length is < 1 or > 100) throw new InvalidDataException("A complete horse schedule is required.");
        var workRoot = Path.GetFullPath(options.WorkRoot, contentRoot);
        var publicRoot = Path.GetFullPath("wwwroot", contentRoot);
        if (workRoot.Equals(publicRoot, StringComparison.OrdinalIgnoreCase) || workRoot.StartsWith(publicRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("PDF conversion must be private.");
        await Gate.WaitAsync(ct);
        var job = Path.Combine(workRoot, "job-" + Guid.NewGuid().ToString("N"));
        // LibreOffice's nested profile registry can exceed Windows MAX_PATH under long job paths.
        // Use a short, unique profile in the current user's temp directory, then remove it.
        var profilePath = Path.Combine(Path.GetTempPath(), "rhpdf-" + Guid.NewGuid().ToString("N"));
        var completed = false;
        try
        {
            Directory.CreateDirectory(job);
            var docx = Path.Combine(job, "contract.docx");
            using (var original = ZipFile.OpenRead(source))
            using (var output = ZipFile.Open(docx, ZipArchiveMode.Create))
            {
                foreach (var entry in original.Entries)
                {
                    var target = output.CreateEntry(entry.FullName); using var writer = target.Open();
                    if (!entry.FullName.StartsWith("word/") || !entry.FullName.EndsWith(".xml"))
                    { using var reader = entry.Open(); reader.CopyTo(writer); continue; }
                    using var input = entry.Open();
                    using var xml = XmlReader.Create(input, new XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null });
                    var document = XDocument.Load(xml, LoadOptions.PreserveWhitespace);
                    if (entry.FullName == "word/document.xml") Transform(document, patch, model);
                    foreach (var paragraph in document.Descendants(W + "p")) Bind(paragraph, model.Values);
                    foreach (var row in document.Descendants(W + "tr"))
                    {
                        var properties = row.Element(W + "trPr");
                        if (properties is null) { properties = new(W + "trPr"); row.AddFirst(properties); }
                        if (properties.Element(W + "cantSplit") is null) properties.Add(new XElement(W + "cantSplit"));
                    }
                    if (entry.FullName.StartsWith("word/footer"))
                        foreach (var p in document.Descendants(W + "p").Where(p => Text(p).Contains("Trang / Page") && !p.Descendants(W + "fldSimple").Any()))
                            p.Add(new XElement(W + "fldSimple", new XAttribute(W + "instr", "PAGE"), new XElement(W + "r", new XElement(W + "t", "1"))));
                    document.Save(writer, SaveOptions.DisableFormatting);
                }
            }
            Directory.CreateDirectory(profilePath);
            var profile = new Uri(profilePath).AbsoluteUri;
            using var process = new Process { StartInfo = new(options.LibreOfficePath) {
                UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true } };
            foreach (var arg in new[] { "-env:UserInstallation=" + profile, "--headless", "--nologo", "--nodefault", "--norestore",
                "--convert-to", "pdf:writer_pdf_Export", "--outdir", job, docx }) process.StartInfo.ArgumentList.Add(arg);
            process.Start();
            var stdout = process.StandardOutput.ReadToEndAsync(ct); var stderr = process.StandardError.ReadToEndAsync(ct);
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct); timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(options.TimeoutSeconds, 1, 120)));
            try { await process.WaitForExitAsync(timeout.Token); }
            catch (OperationCanceledException)
            { if (!process.HasExited) { process.Kill(true); await process.WaitForExitAsync(CancellationToken.None); } ct.ThrowIfCancellationRequested(); throw Error("PDF conversion timed out.", "PDF_CONVERSION_TIMEOUT", 503); }
            await Task.WhenAll(stdout, stderr); // Never log private document paths or bound content.
            await File.WriteAllTextAsync(Path.Combine(job, "conversion.log"), $"ExitCode: {process.ExitCode}\n" + await stdout + "\n" + await stderr, ct);
            var pdf = Path.Combine(job, "contract.pdf");
            if (process.ExitCode != 0 || !File.Exists(pdf)) throw Error("PDF converter failed.", "PDF_CONVERSION_FAILED", 503);
            var bytes = await File.ReadAllBytesAsync(pdf, ct);
            if (!bytes.AsSpan().StartsWith("%PDF-"u8) || bytes.Length > 5 * 1024 * 1024 ||
                !Encoding.ASCII.GetString(bytes.AsSpan(Math.Max(0, bytes.Length - 1024))).Contains("%%EOF"))
                throw Error("Converter output failed PDF checks.", "PDF_CONVERSION_FAILED", 503);
            var file = await files.PutAsync(new(bytes, "contract.pdf"), false, ct);
            completed = true;
            return new(file.FileId, file.Sha256, file.SizeBytes, Convert.ToHexString(SHA256.HashData(patchBytes)).ToLowerInvariant());
        }
        finally
        {
            // job is generated below the validated private work root; never delete caller paths.
            try
            {
                // Both paths are generated here, below validated roots; never delete a configured root.
                if (!await TryDelete(profilePath))
                    await File.AppendAllTextAsync(Path.Combine(workRoot, "cleanup-pending.log"), profilePath + Environment.NewLine, CancellationToken.None);
                if (completed) await TryDelete(job);
            }
            finally { Gate.Release(); }
        }
    }
    private static async Task<bool> TryDelete(string path)
    {
        for (var attempt = 0; attempt < 5; attempt++)
        {
            try { if (Directory.Exists(path)) Directory.Delete(path, true); return true; }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException)
            { if (attempt < 4) await Task.Delay(100 * (attempt + 1), CancellationToken.None); }
        }
        return false;
    }
    private static string Text(XElement p) => string.Concat(p.Descendants(W + "t").Select(x => x.Value));
    private static void SetText(XElement p, string text)
    {
        var style = p.Descendants(W + "rPr").FirstOrDefault(); var copy = style is null ? null : new XElement(style);
        p.Elements().Where(e => e.Name != W + "pPr").Remove();
        var run = new XElement(W + "r"); if (copy is not null) run.Add(copy);
        foreach (var line in text.Split('\n')) { if (run.Elements(W + "t").Any()) run.Add(new XElement(W + "br")); run.Add(new XElement(W + "t", new XAttribute(XNamespace.Xml + "space", "preserve"), line)); }
        p.Add(run);
    }
    private static void Transform(XDocument doc, JsonElement patch, ContractPdfModel model)
    {
        var paragraphs = doc.Descendants(W + "p").ToArray();
        foreach (var replacement in patch.GetProperty("paragraphs").EnumerateObject())
            SetText(paragraphs[int.Parse(replacement.Name)], replacement.Value.GetString()!);
        var selling = new XElement(paragraphs[49]); SetText(selling, patch.GetProperty("afterPrice").GetString()!); paragraphs[49].AddAfterSelf(selling);
        var horseRow = paragraphs[113].Ancestors(W + "tr").First();
        var ordinal = 0;
        foreach (var horse in model.Horses)
        {
            var clone = new XElement(horseRow); var fields = new Dictionary<string, string>(model.Values);
            SetText(clone.Descendants(W + "p").First(), (++ordinal).ToString("00"));
            foreach (var item in horse) fields[item.Key] = item.Value;
            foreach (var p in clone.Descendants(W + "p")) Bind(p, fields);
            horseRow.AddBeforeSelf(clone);
        }
        horseRow.Remove();
        foreach (var p in doc.Descendants(W + "p"))
            if (Text(p).Contains("USD")) SetText(p, Text(p).Replace("USD", "VND", StringComparison.Ordinal));
    }
    private static void Bind(XElement p, Dictionary<string, string> values)
    {
        var nodes = p.Descendants(W + "t").ToArray(); var text = Text(p);
        foreach (Match match in Tokens.Matches(text).Cast<Match>().Reverse())
        {
            if (!values.TryGetValue(match.Groups[1].Value, out var value)) throw new InvalidDataException("Unbound contract field: " + match.Groups[1].Value);
            var start = 0; var first = -1; var last = -1; var a = 0; var b = 0;
            for (var i = 0; i < nodes.Length; i++)
            {
                var end = start + nodes[i].Value.Length;
                if (first < 0 && start <= match.Index && match.Index < end) { first = i; a = match.Index - start; }
                if (start < match.Index + match.Length && match.Index + match.Length <= end) { last = i; b = match.Index + match.Length - start; break; }
                start = end;
            }
            var suffix = nodes[last].Value[b..]; var prefix = nodes[first].Value[..a];
            nodes[first].Value = prefix + value + (first == last ? suffix : "");
            for (var i = first + 1; i <= last; i++) nodes[i].Value = i == last ? suffix : "";
            nodes[first].SetAttributeValue(XNamespace.Xml + "space", "preserve");
        }
        if (Tokens.IsMatch(Text(p))) throw new InvalidDataException("Unresolved contract placeholder.");
    }
}
