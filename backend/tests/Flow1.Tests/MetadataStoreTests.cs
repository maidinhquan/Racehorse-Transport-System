using System.Text.Json;
using Application.Common.Exceptions;
using Application.Common.Flow1;
using Infrastructure.Storage;
using Xunit;

namespace Flow1.Tests;

public sealed class MetadataStoreTests : IDisposable
{
    private readonly string root = Path.Combine(Path.GetTempPath(), "RaceHorseFlow1MetadataTest_" + Guid.NewGuid().ToString("N"));
    private LocalFlow1MetadataStore Store(int maxBytes = 2 * 1024 * 1024) =>
        new(root, new Flow1StorageOptions { MaxDocumentBytes = maxBytes }, TimeProvider.System);
    private static JsonElement Payload(int value) => JsonSerializer.SerializeToElement(new { value });

    [Fact]
    public async Task Versions_and_actor_history_survive_a_new_store_instance()
    {
        Assert.Null(await Store().ReadAsync("request", "req-1"));
        var first = await Store().AppendAsync("request", "req-1", 0, "op-1", "owner", "SUBMIT", Payload(1));
        await Store().AppendAsync("request", "req-1", 1, "op-2", "manager", "REVIEW", Payload(2));
        var persisted = Assert.IsType<Application.Interfaces.Flow1.Flow1MetadataDocument>(await Store().ReadAsync("request", "req-1"));
        Assert.Equal(2, persisted.Revisions.Count);
        Assert.Equal("owner", persisted.Revisions[0].ActorUserId);
        Assert.Equal("manager", persisted.Revisions[1].ActorUserId);
        Assert.Equal(1, first.Payload.GetProperty("value").GetInt32());
        Assert.Equal(DateTimeKind.Utc, first.CreatedAtUtc.Kind);
    }

    [Fact]
    public async Task Retry_with_same_operation_is_idempotent_even_with_old_expected_version()
    {
        var a = await Store().AppendAsync("contract", "c-1", 0, "send-1", "manager", "SEND", Payload(1));
        var b = await Store().AppendAsync("contract", "c-1", 0, "send-1", "manager", "SEND", Payload(1));
        Assert.Equal(a.Version, b.Version);
        Assert.Single((await Store().ReadAsync("contract", "c-1"))!.Revisions);
    }

    [Fact]
    public async Task Same_key_with_different_payload_is_rejected_without_overwriting_history()
    {
        await Store().AppendAsync("contract", "c-1", 0, "op", "manager", "SEND", Payload(1));
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            Store().AppendAsync("contract", "c-1", 1, "op", "manager", "SEND", Payload(2)));
        Assert.Equal("IDEMPOTENCY_KEY_REUSED", error.ErrorCode);
        Assert.Single((await Store().ReadAsync("contract", "c-1"))!.Revisions);
    }

    [Fact]
    public async Task Different_store_instances_cannot_both_write_the_same_version()
    {
        var a = Store(); var b = Store();
        var attempts = await Task.WhenAll(Attempt(a, "one"), Attempt(b, "two"));
        Assert.Single(attempts, ok => ok);
        Assert.Single((await Store().ReadAsync("request", "req-1"))!.Revisions);
        Assert.Empty(Directory.GetFiles(root, "*.tmp", SearchOption.AllDirectories));
        async Task<bool> Attempt(LocalFlow1MetadataStore store, string op)
        {
            try { await store.AppendAsync("request", "req-1", 0, op, "owner", "SUBMIT", Payload(1)); return true; }
            catch (BusinessRuleException ex) when (ex.ErrorCode == "STALE_VERSION") { return false; }
        }
    }

    [Fact]
    public async Task Keys_use_the_same_file_for_uppercase_legacy_identifiers()
    {
        await Store().AppendAsync("Request", "REQ-1", 0, "op", "owner", "SUBMIT", Payload(1));
        Assert.Single((await Store().ReadAsync("request", "req-1"))!.Revisions);
    }

    [Theory]
    [InlineData("request", "../escape")]
    [InlineData("..", "id")]
    [InlineData("request", "a/b")]
    [InlineData("request", "a\\b")]
    [InlineData("request", "")]
    public async Task Untrusted_keys_cannot_escape_the_private_storage(string type, string id) =>
        await Assert.ThrowsAsync<ArgumentException>(() => Store().ReadAsync(type, id));

    [Fact]
    public async Task Oversized_revision_does_not_destroy_the_previous_document()
    {
        var store = Store(1000);
        await store.AppendAsync("request", "req-1", 0, "one", "owner", "SUBMIT", Payload(1));
        await Assert.ThrowsAsync<InvalidDataException>(() => store.AppendAsync("request", "req-1", 1,
            "two", "owner", "EDIT", JsonSerializer.SerializeToElement(new { value = new string('x', 3000) })));
        Assert.Single((await store.ReadAsync("request", "req-1"))!.Revisions);
    }

    [Fact]
    public async Task Payload_remains_valid_after_the_callers_JsonDocument_is_disposed()
    {
        using (var payload = JsonDocument.Parse("{\"value\":3}"))
            await Store().AppendAsync("request", "req-1", 0, "one", "owner", "SUBMIT", payload.RootElement);
        Assert.Equal(3, (await Store().ReadAsync("request", "req-1"))!.Revisions[0].Payload.GetProperty("value").GetInt32());
    }

    public void Dispose()
    {
        // Only this generated test directory is removed.
        var resolved = Path.GetFullPath(root);
        var tempRoot = Path.TrimEndingDirectorySeparator(Path.GetFullPath(Path.GetTempPath())) + Path.DirectorySeparatorChar;
        if (!resolved.StartsWith(tempRoot, StringComparison.OrdinalIgnoreCase) ||
            !System.Text.RegularExpressions.Regex.IsMatch(Path.GetFileName(resolved), "\\ARaceHorseFlow1MetadataTest_[a-f0-9]{32}\\z"))
            throw new InvalidOperationException("Unsafe test cleanup path.");
        if (Directory.Exists(resolved)) Directory.Delete(resolved, recursive: true);
    }
}
