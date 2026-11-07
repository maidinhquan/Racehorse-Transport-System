using System.Text.Json;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Infrastructure.Flow1.Documents;
using Infrastructure.Flow1.Files;
using Xunit;

namespace Flow1.Rebuild.Tests;

public sealed class BrowserFactAttribute : FactAttribute
{
    public static string? Browser => new[] { Environment.GetEnvironmentVariable("FLOW1_TEST_BROWSER"),
        @"C:\Program Files\Google\Chrome\Application\chrome.exe", @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" }.FirstOrDefault(x => !string.IsNullOrEmpty(x) && File.Exists(x));
    public BrowserFactAttribute() { if (Browser is null) Skip = "Set FLOW1_TEST_BROWSER to run real PDF conversion."; }
}
public sealed class DocumentTests
{
    [BrowserFact] public async Task Real_browser_renders_frozen_snapshot_and_private_store_checks_integrity()
    {
        var root = Path.Combine(Path.GetTempPath(), "Flow1DocumentTest_" + Guid.NewGuid().ToString("N"));
        try
        {
            var store = new LocalFileStore(Path.Combine(root, "private"));
            var renderer = new ContractRenderer(new Flow1ContractOptions { BrowserExecutablePath = BrowserFactAttribute.Browser!, WorkRoot = Path.Combine(root, "jobs"), TimeoutSeconds = 30 }, store);
            using var snapshot = JsonDocument.Parse("""{"contractId":"CONTRACT_999","versionNo":2,"terms":[{"title":"Frozen terms","text":"Immutable transport document <script>safe text</script>"}]}""");
            var key = await renderer.RenderAsync(snapshot.RootElement, CancellationToken.None);
            var result = await store.ReadAsync(key, CancellationToken.None);
            Assert.Equal("application/pdf", result.ContentType); Assert.True(result.Bytes.Length > 1000);
            Assert.True(result.Bytes.AsSpan().StartsWith("%PDF-"u8));
            var path = Directory.GetFiles(Path.Combine(root, "private"), "*.bin").Single();
            await File.WriteAllBytesAsync(path, Enumerable.Repeat((byte)1, result.Bytes.Length).ToArray());
            await Assert.ThrowsAsync<Application.Common.Exceptions.BusinessRuleException>(() => store.ReadAsync(key, CancellationToken.None));
        }
        finally
        {
            var full = Path.GetFullPath(root); var parent = Path.GetFullPath(Path.GetTempPath());
            if (full.StartsWith(parent, StringComparison.OrdinalIgnoreCase) && Path.GetFileName(full).StartsWith("Flow1DocumentTest_", StringComparison.Ordinal) && Directory.Exists(full)) Directory.Delete(full, true);
        }
    }
}
