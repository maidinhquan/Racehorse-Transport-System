using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Application.Services.Flow1;
using Infrastructure.ExternalServices.Flow1;
using Infrastructure.Storage;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;
using static Flow1.Tests.ContractPublicationTests;

namespace Flow1.Tests;

public sealed class LegacyStateImportTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private sealed class Sink : IContractOtpSender
    {
        public string Code = "";
        public Task SendAsync(string email, string code, string id, int version, string hash, DateTimeOffset expires, CancellationToken ct)
        { Assert.EndsWith("@example.invalid", email); Code = code; return Task.CompletedTask; }
    }
    private sealed class SourceFixture(Fixture fixture, string root, Dictionary<string, Flow1StateDocument> originals) : IAsyncDisposable
    {
        public Fixture F = fixture; public string Root = root; public Dictionary<string, Flow1StateDocument> Originals = originals;
        public string Bytes => Path.Combine(F.Folder, "bytes");
        public Flow1LegacyStateImporter Importer(Infrastructure.Data.Context.HorseTransportDbContext context) => new(context, Root, Bytes);
        public ValueTask DisposeAsync() => F.DisposeAsync();
    }
    private static Flow1StateRevision Rehash(Flow1StateRevision r) =>
        r with { RequestHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(r.Payload.GetRawText()))) };
    private static async Task Write(string root, string path, Flow1StateDocument doc)
    { var target = Path.Combine(root, path); Directory.CreateDirectory(Path.GetDirectoryName(target)!); await File.WriteAllBytesAsync(target, JsonSerializer.SerializeToUtf8Bytes(doc, Json)); }
    private static async Task<SourceFixture> Source(bool signed = false, bool revise = false)
    {
        var sink = new Sink();
        var f = await Fixture.Create(s => {
            s.RemoveAll<IContractOtpSender>(); s.AddSingleton<IContractOtpSender>(sink);
            s.RemoveAll<IContractOtpSecurity>(); s.AddSingleton<IContractOtpSecurity>(new ContractOtpSecurity("ImportFixtureKey_2026_NotProduction_AtLeast32Bytes"));
        });
        try
        {
            if (revise)
            {
                var current = await Data<ManagerReviewView>(await f.Manager.GetAsync($"/api/manager/requests/{f.RequestId}"));
                var original = current.Request.Snapshot!.Input;
                var proposal = original with { Receiver = original.Receiver with { Name = "Người nhận đã thay đổi" } };
                var change = await Data<CustomerReviewView>(await Send(f.Customer, $"/api/customer/requests/{f.RequestId}/change-requests",
                    new ReviewCommand(current.Version, "Thay người nhận", Request: proposal)));
                current = await Data<ManagerReviewView>(await Send(f.Manager, $"/api/manager/requests/{f.RequestId}/change-requests/{change.Changes.Single().Id}/approve",
                    new ReviewCommand(change.Version, "Đã kiểm tra")));
                current = await Data<ManagerReviewView>(await Send(f.Manager, $"/api/manager/requests/{f.RequestId}/accept", new ReviewCommand(current.Version)));
                current = await Data<ManagerReviewView>(await Send(f.Manager, $"/api/manager/requests/{f.RequestId}/preliminary-plan",
                    new ReviewCommand(current.Version, Plan: new(new(2026, 11, 20), new(2026, 11, 25), 3, 1, 1, "Revised resources"))));
                current = await Data<ManagerReviewView>(await Send(f.Manager, $"/api/manager/requests/{f.RequestId}/contracts",
                    new ReviewCommand(current.Version, Lines: [new("TRANSPORT", "Revised selling", 1, 115_000_000)])));
                f.ContractId = current.Contract!.ContractId; f.Version = current.Version;
            }
            if (signed)
            {
                await f.Db.ExecuteAsync("UPDATE [USER] SET Email='owner@example.invalid' WHERE UserID='owner';");
                var pdf = await Data<PublishedContractView>(await f.Publish());
                var otp = await Data<ContractOtpView>(await Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/otp", new ContractOtpInput(pdf.Version, pdf.DocumentHash)));
                var input = new ContractSignInput(pdf.Version, pdf.DocumentHash, otp.ChallengeId, sink.Code, true);
                var wrong = sink.Code == "000000" ? "111111" : "000000";
                Assert.Equal(HttpStatusCode.Conflict, (await Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/sign", input with { Otp = wrong }, "import-wrong-otp")).StatusCode);
                await Data<ContractAcceptanceView>(await Send(f.Customer, $"/api/customer/contracts/{f.ContractId}/sign", input, "import-sign-fixture"));
            }
            var root = Path.Combine(f.Folder, "legacy-source");
            Directory.CreateDirectory(root);
            var docs = new Dictionary<string, Flow1StateDocument>();
            await using (var connection = new SqlConnection(f.Db.ConnectionString))
            {
                await connection.OpenAsync();
                foreach (var table in new[] { "HORSE", "TRANSPORT_REQUEST", "CONTRACT", "USER" })
                {
                    await using var command = new SqlCommand($"SELECT Flow1StateJson FROM dbo.[{table}] WHERE Flow1StateJson IS NOT NULL;", connection);
                    await using var reader = await command.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        using var bundle = JsonDocument.Parse(reader.GetString(0));
                        foreach (var property in bundle.RootElement.GetProperty("documents").EnumerateObject())
                        {
                            var doc = property.Value.Deserialize<Flow1StateDocument>(Json)!;
                            if (doc.AggregateType == "otp-account") doc = doc with { AggregateId = ("oa-" + CustomerTransportService.Hash("owner")[..32]).ToLowerInvariant() };
                            if (doc.AggregateType == "review")
                                doc = doc with { Revisions = doc.Revisions.Select(r => {
                                    var node = JsonNode.Parse(r.Payload.GetRawText())!.AsObject(); node["pending"] = null;
                                    return Rehash(r with { Payload = JsonSerializer.SerializeToElement(node, Json) });
                                }).ToArray() };
                            if (doc.AggregateType is "publication" or "acceptance")
                            {
                                var last = doc.Revisions[^1]; var node = JsonNode.Parse(last.Payload.GetRawText())!;
                                if (doc.AggregateType == "publication") node["outcome"] = "PREPARED"; else node["operation"]!["outcome"] = "PREPARED";
                                var prepared = Rehash(last with { Version = 1, OperationId = "legacy-prepare", Action = "PREPARED",
                                    Payload = JsonSerializer.SerializeToElement(node, Json), CreatedAtUtc = last.CreatedAtUtc.AddTicks(-1) });
                                doc = doc with { Revisions = [prepared, last with { Version = 2 }] };
                            }
                            var path = doc.AggregateType + "/" + doc.AggregateId + ".json";
                            docs.Add(path, doc); await Write(root, path, doc);
                        }
                    }
                }
            }
            await f.Db.ExecuteAsync("UPDATE HORSE SET Flow1StateJson=NULL,Flow1StateVersion=0; UPDATE TRANSPORT_REQUEST SET Flow1StateJson=NULL,Flow1StateVersion=0; UPDATE CONTRACT SET Flow1StateJson=NULL,Flow1StateVersion=0; UPDATE [USER] SET Flow1StateJson=NULL,Flow1StateVersion=0;");
            return new(f, root, docs);
        }
        catch { await f.DisposeAsync(); throw; }
    }
    [LocalSqlFact]
    public async Task Signed_import_preserves_audit_private_hashes_OTP_attempts_budget_invoice_and_allows_SQL_runtime_without_removing_sources()
    {
        await using var f = await Source(signed: true, revise: true); await using var context = f.F.Db.Context();
        var importer = f.Importer(context); var inventory = await importer.InventoryAsync();
        Assert.Empty(inventory.Issues); Assert.False(inventory.Applied); Assert.False(inventory.ParityVerified);
        Assert.Equal(0L, await f.F.Db.ScalarAsync<long>("SELECT SUM(Flow1StateVersion) FROM CONTRACT;"));
        var fileBytes = Directory.GetFiles(f.Root, "*.json", SearchOption.AllDirectories).ToDictionary(p => p, File.ReadAllBytes);
        var result = await importer.ImportAsync(inventory.SourceFingerprint);
        Assert.Empty(result.Issues); Assert.True(result.Applied); Assert.True(result.ParityVerified); Assert.Equal(1, await f.F.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
        var runtime = new SqlFlow1StateStore(context, TimeProvider.System, f.Root);
        foreach (var (_, original) in f.Originals)
        {
            var owner = original.AggregateType == "otp-account" ? "owner" : original.AggregateId;
            var imported = await runtime.ReadAsync(original.AggregateType, owner);
            Assert.Equal(JsonSerializer.Serialize(original.Revisions, Json), JsonSerializer.Serialize(imported!.Revisions, Json));
        }
        var challenge = (await runtime.ReadAsync("contract-otp", f.F.ContractId))!.Revisions[^1].Payload.Deserialize<ContractOtpState>(Json)!;
        Assert.True(challenge.Consumed); Assert.Equal(1, challenge.Attempts);
        Assert.Single((await runtime.ReadAsync("otp-account", "owner"))!.Revisions[^1].Payload.Deserialize<ContractOtpAccount>(Json)!.Sends);
        Assert.Equal(0, await f.F.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
        foreach (var (path, bytes) in fileBytes) Assert.Equal(bytes, await File.ReadAllBytesAsync(path));
        var counter = await f.F.Db.ScalarAsync<long>("SELECT SUM(Flow1StateVersion) FROM CONTRACT;");
        Assert.True((await importer.ImportAsync(inventory.SourceFingerprint)).ParityVerified);
        Assert.Equal(counter, await f.F.Db.ScalarAsync<long>("SELECT SUM(Flow1StateVersion) FROM CONTRACT;"));
        using var fresh = new CustomerTestFactory(f.F.Db.ConnectionString, f.F.Folder, customize: services => {
            services.RemoveAll<IFlow1StateStore>();
            services.AddScoped<IFlow1StateStore>(sp => new SqlFlow1StateStore(sp.GetRequiredService<Infrastructure.Data.Context.HorseTransportDbContext>(), sp.GetRequiredService<TimeProvider>(), f.Root));
        });
        var receipt = await Data<ContractAcceptanceView>(await fresh.Client().GetAsync($"/api/customer/contracts/{f.F.ContractId}/acceptance"));
        Assert.Equal("SIGNED", receipt.Status); Assert.Equal(46_000_000m, receipt.Invoice!.Amount);
        var sourceFile = fileBytes.First().Key; await File.AppendAllTextAsync(sourceFile, " ");
        await using var changed = f.F.Db.Context();
        var error = await Assert.ThrowsAsync<Application.Common.Exceptions.BusinessRuleException>(() => new SqlFlow1StateStore(changed, TimeProvider.System, f.Root).ReadAsync("request", f.F.RequestId));
        Assert.Equal("FLOW1_STATE_IMPORT_REQUIRED", error.ErrorCode);
    }
    [LocalSqlFact]
    public async Task Interruption_after_partial_owner_writes_rolls_back_entire_batch_and_retry_is_idempotent()
    {
        await using var f = await Source(); await using var context = f.F.Db.Context(); var importer = f.Importer(context);
        var inventory = await importer.InventoryAsync(); Assert.Empty(inventory.Issues);
        await Assert.ThrowsAsync<IOException>(() => importer.ImportAsync(inventory.SourceFingerprint, checkpoint: (n, _) => n == 2 ? throw new IOException("Injected import interruption") : Task.CompletedTask));
        Assert.Equal(0L, await f.F.Db.ScalarAsync<long>("SELECT SUM(Flow1StateVersion) FROM HORSE;"));
        Assert.Equal(0L, await f.F.Db.ScalarAsync<long>("SELECT SUM(Flow1StateVersion) FROM TRANSPORT_REQUEST;"));
        Assert.True((await importer.ImportAsync(inventory.SourceFingerprint)).ParityVerified);
        Assert.True((await importer.InventoryAsync()).ParityVerified);
    }
    [LocalSqlFact]
    public async Task Source_changed_after_writes_rolls_back_receipts_and_state_without_replacing_source()
    {
        await using var f = await Source(); await using var context = f.F.Db.Context(); var importer = f.Importer(context);
        var inventory = await importer.InventoryAsync(); var path = Directory.GetFiles(f.Root, "*.json", SearchOption.AllDirectories).First();
        await Assert.ThrowsAsync<InvalidDataException>(() => importer.ImportAsync(inventory.SourceFingerprint, checkpoint: async (n, _) => {
            if (n == 1) await File.AppendAllTextAsync(path, " ");
        }));
        Assert.Equal(0L, await f.F.Db.ScalarAsync<long>("SELECT SUM(Flow1StateVersion) FROM CONTRACT;"));
        Assert.EndsWith(" ", await File.ReadAllTextAsync(path));
    }
    [LocalSqlFact]
    public async Task Reviewed_fingerprint_must_match_actual_source_and_target_business_snapshot()
    {
        await using var f = await Source(); await using var context = f.F.Db.Context(); var importer = f.Importer(context);
        var inventory = await importer.InventoryAsync();
        await f.F.Db.ExecuteAsync("UPDATE TRANSPORT_REQUEST SET BaseCost=123 WHERE RequestID='req-1';");
        Assert.Equal("REVIEWED_INVENTORY_CHANGED", (await Assert.ThrowsAsync<InvalidDataException>(() => importer.ImportAsync(inventory.SourceFingerprint))).Message);
        Assert.Equal(0L, await f.F.Db.ScalarAsync<long>("SELECT SUM(Flow1StateVersion) FROM HORSE;"));
    }
    [LocalSqlFact]
    public async Task Existing_SQL_conflicting_history_is_reported_and_not_overwritten()
    {
        await using var f = await Source(); await using var context = f.F.Db.Context(); var importer = f.Importer(context);
        var inventory = await importer.InventoryAsync(); await importer.ImportAsync(inventory.SourceFingerprint);
        await f.F.Db.ExecuteAsync("UPDATE HORSE SET Flow1StateJson=JSON_MODIFY(Flow1StateJson,'$.documents.horse.revisions[0].action','CONFLICT');");
        var conflict = await importer.InventoryAsync();
        Assert.Contains(conflict.Issues, x => x.Code == "SQL_HISTORY_CONFLICT"); Assert.False((await importer.ImportAsync(conflict.SourceFingerprint)).Applied);
        Assert.Equal("CONFLICT", await f.F.Db.ScalarAsync<string>("SELECT JSON_VALUE(Flow1StateJson,'$.documents.horse.revisions[0].action') FROM HORSE;"));
    }
    [LocalSqlFact]
    public async Task Missing_file_hash_tamper_or_owner_status_money_mismatch_never_import()
    {
        await using var f = await Source(); await using var context = f.F.Db.Context(); var importer = f.Importer(context);
        await f.F.Db.ExecuteAsync("UPDATE CONTRACT SET TotalQuotedPrice=TotalQuotedPrice+1;");
        Assert.Contains((await importer.InventoryAsync()).Issues, x => x.Code == "CONTRACT_SQL_MONEY");
        await f.F.Db.ExecuteAsync("UPDATE CONTRACT SET TotalQuotedPrice=TotalQuotedPrice-1;");
        var file = Directory.GetFiles(f.Bytes, "*.bin").First(); var original = await File.ReadAllBytesAsync(file);
        await File.WriteAllBytesAsync(file, new byte[original.Length]);
        Assert.Contains((await importer.InventoryAsync()).Issues, x => x.Code == "PAYLOAD_OR_PRIVATE_FILE_INVALID");
        File.Delete(file);
        Assert.Contains((await importer.InventoryAsync()).Issues, x => x.Code == "PAYLOAD_OR_PRIVATE_FILE_INVALID");
        Assert.Equal(0L, await f.F.Db.ScalarAsync<long>("SELECT SUM(Flow1StateVersion) FROM CONTRACT;"));
    }
    [LocalSqlFact]
    public async Task Latest_PREPARED_source_is_reported_as_reconciliation_conflict_without_touching_SQL()
    {
        await using var f = await Source(signed: true); await using var context = f.F.Db.Context(); var importer = f.Importer(context);
        var path = f.Originals.Keys.Single(k => k.StartsWith("acceptance/")); var doc = f.Originals[path];
        await Write(f.Root, path, doc with { Revisions = [doc.Revisions[0]] });
        Assert.Contains((await importer.InventoryAsync()).Issues, x => x.Code == "PREPARED_REQUIRES_RECONCILIATION");
        Assert.Equal(0L, await f.F.Db.ScalarAsync<long>("SELECT SUM(Flow1StateVersion) FROM CONTRACT;"));
    }
    [LocalSqlFact]
    public async Task Duplicate_owner_account_mapping_and_missing_dependency_are_reported_not_merged_or_invented()
    {
        await using var f = await Source(signed: true); await using var context = f.F.Db.Context(); var importer = f.Importer(context);
        var account = f.Originals.Single(x => x.Key.StartsWith("otp-account/")).Value;
        await Write(f.Root, "otp-account/owner.json", account with { AggregateId = "owner" });
        Assert.Contains((await importer.InventoryAsync()).Issues, x => x.Code == "DUPLICATE_OWNER_DOCUMENT");
        File.Delete(Path.Combine(f.Root, "otp-account/owner.json"));
        File.Delete(Directory.GetFiles(Path.Combine(f.Root, "plan")).Single());
        Assert.Contains((await importer.InventoryAsync()).Issues, x => x.Code == "DEPENDENCY_MISSING");
        Assert.Equal(0L, await f.F.Db.ScalarAsync<long>("SELECT SUM(Flow1StateVersion) FROM CONTRACT;"));
    }
    [LocalSqlFact]
    public async Task Unknown_directory_partial_write_and_invalid_revision_hash_fail_closed()
    {
        await using var f = await Source(); await using var context = f.F.Db.Context(); var importer = f.Importer(context);
        var path = f.Originals.Keys.First(); var doc = f.Originals[path];
        await Write(f.Root, path, doc with { Revisions = [doc.Revisions[0] with { RequestHash = new string('0', 64) }] });
        Assert.Contains((await importer.InventoryAsync()).Issues, x => x.Code == "REVISION_OR_HASH");
        await Write(f.Root, path, doc);
        var temp = Path.Combine(f.Root, path + ".tmp"); await File.WriteAllTextAsync(temp, "interrupted source write");
        Assert.Contains((await importer.InventoryAsync()).Issues, x => x.Code == "INCOMPLETE_SOURCE_WRITE");
        File.Delete(temp); Directory.CreateDirectory(Path.Combine(f.Root, "unknown"));
        await File.WriteAllTextAsync(Path.Combine(f.Root, "unknown", "x.json"), "{}");
        Assert.Contains((await importer.InventoryAsync()).Issues, x => x.Code == "UNKNOWN_SOURCE");
    }

    [LocalSqlFact]
    public async Task Newer_SQL_revisions_and_import_receipts_survive_reimport_without_counter_changes()
    {
        await using var f = await Source(); await using var context = f.F.Db.Context(); var importer = f.Importer(context);
        var inventory = await importer.InventoryAsync(); await importer.ImportAsync(inventory.SourceFingerprint);
        var store = new SqlFlow1StateStore(context, TimeProvider.System, f.Root);
        var old = (await store.ReadAsync("review", f.F.RequestId))!;
        await new Infrastructure.Transactions.Flow1UnitOfWork(context).ExecuteAsync(f.F.RequestId, ct => store.AppendAsync("review", f.F.RequestId,
            old.Revisions.Count, "new-sql-audit", "owner", "FIXTURE_AUDIT", old.Revisions[^1].Payload, ct));
        var counter = await f.F.Db.ScalarAsync<long>($"SELECT Flow1StateVersion FROM TRANSPORT_REQUEST WHERE RequestID='{f.F.RequestId}';");
        Assert.True((await importer.ImportAsync(inventory.SourceFingerprint)).ParityVerified);
        Assert.Equal(counter, await f.F.Db.ScalarAsync<long>($"SELECT Flow1StateVersion FROM TRANSPORT_REQUEST WHERE RequestID='{f.F.RequestId}';"));
        Assert.Equal(old.Revisions.Count + 1, (await new SqlFlow1StateStore(context, TimeProvider.System, f.Root).ReadAsync("review", f.F.RequestId))!.Revisions.Count);
    }

    [LocalSqlFact]
    public async Task Missing_schema_is_reported_without_migration_or_invented_legacy_state()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false); await using var context = db.Context();
        var root = Path.Combine(Path.GetTempPath(), "flow1-empty-inventory-" + Guid.NewGuid().ToString("N")); Directory.CreateDirectory(root);
        try
        {
            var report = await new Flow1LegacyStateImporter(context, root, root).InventoryAsync();
            Assert.Equal(4, report.Issues.Count(x => x.Code == "SQL_SCHEMA_REQUIRED")); Assert.False(report.Applied);
            Assert.Contains(report.Warnings, x => x.Code == "LEGACY_REQUEST_WITHOUT_STATE");
            Assert.Equal(0, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE name='Flow1StateJson';"));
        }
        finally { Directory.Delete(root); }
    }

    [LocalSqlFact]
    public async Task Command_defaults_to_read_only_inventory_and_rejects_unconfirmed_target_or_apply_without_offline_flag()
    {
        await using var f = await Source();
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "backend/Backend.slnx"))) directory = directory.Parent;
        Assert.NotNull(directory);
        var configuration = new DirectoryInfo(AppContext.BaseDirectory).Parent!.Name;
        var dll = Path.Combine(directory.FullName, "backend/tools/Flow1StateImport/bin", configuration, "net8.0/Flow1StateImport.dll");
        var target = new SqlConnectionStringBuilder(f.F.Db.ConnectionString).InitialCatalog;
        async Task<(int Code, string Text)> Run(string confirm, bool apply)
        {
            var start = new System.Diagnostics.ProcessStartInfo("dotnet") { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true };
            foreach (var arg in new[] { dll, "--connection-env", "FLOW1_IMPORT_FIXTURE_CONNECTION", "--confirm-database", confirm, "--source-root", f.Root, "--private-files-root", f.Bytes }) start.ArgumentList.Add(arg);
            if (apply) start.ArgumentList.Add("--apply");
            start.Environment["FLOW1_IMPORT_FIXTURE_CONNECTION"] = f.F.Db.ConnectionString;
            using var process = System.Diagnostics.Process.Start(start)!;
            var stdout = process.StandardOutput.ReadToEndAsync(); var stderr = process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync(); return (process.ExitCode, await stdout + await stderr);
        }
        var dryRun = await Run(target, false); Assert.Equal(0, dryRun.Code); Assert.Contains("\"applied\":false", dryRun.Text);
        Assert.Equal(0L, await f.F.Db.ScalarAsync<long>("SELECT SUM(Flow1StateVersion) FROM HORSE;"));
        Assert.Equal(1, (await Run("HorseTransportDB", false)).Code);
        Assert.Equal(1, (await Run(target, true)).Code);
        Assert.DoesNotContain(f.F.Db.ConnectionString, dryRun.Text); Assert.DoesNotContain("microchipIso", dryRun.Text);
    }

    [LocalSqlFact]
    public async Task Concurrent_importers_commit_one_history_and_one_set_of_receipts()
    {
        await using var f = await Source(); await using var read = f.F.Db.Context();
        var inventory = await f.Importer(read).InventoryAsync();
        async Task<Flow1ImportReport> Apply()
        { await using var context = f.F.Db.Context(); return await f.Importer(context).ImportAsync(inventory.SourceFingerprint); }
        foreach (var result in await Task.WhenAll(Apply(), Apply())) Assert.True(result.ParityVerified);
        var expected = f.Originals.Values.Where(d => d.AggregateId == f.F.RequestId).Sum(d => d.Revisions.Count);
        Assert.Equal((long)expected, await f.F.Db.ScalarAsync<long>($"SELECT Flow1StateVersion FROM TRANSPORT_REQUEST WHERE RequestID='{f.F.RequestId}';"));
    }

    [LocalSqlFact]
    public async Task Cancellation_after_first_owner_write_rolls_back_the_batch()
    {
        await using var f = await Source(); await using var context = f.F.Db.Context(); var importer = f.Importer(context);
        var inventory = await importer.InventoryAsync(); using var stop = new CancellationTokenSource();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => importer.ImportAsync(inventory.SourceFingerprint, stop.Token, (_, _) => { stop.Cancel(); return Task.CompletedTask; }));
        Assert.Equal(0L, await f.F.Db.ScalarAsync<long>("SELECT SUM(Flow1StateVersion) FROM CONTRACT;"));
        Assert.Equal(0L, await f.F.Db.ScalarAsync<long>("SELECT SUM(Flow1StateVersion) FROM HORSE;"));
    }

    [LocalSqlFact]
    public async Task Duplicate_JSON_property_and_plaintext_OTP_fields_are_reported_without_echoing_payload()
    {
        await using var f = await Source(); await using var context = f.F.Db.Context(); var importer = f.Importer(context);
        var path = f.Originals.Keys.First(); var physical = Path.Combine(f.Root, path); var original = await File.ReadAllTextAsync(physical);
        await File.WriteAllTextAsync(physical, original.Insert(1, "\"schemaVersion\":1,"));
        Assert.Contains((await importer.InventoryAsync()).Issues, x => x.Code == "DUPLICATE_PROPERTY");
        await File.WriteAllTextAsync(physical, original.Insert(1, "\"otp\":\"123456\","));
        var report = await importer.InventoryAsync(); Assert.Contains(report.Issues, x => x.Code == "PLAINTEXT_SECRET_FIELD");
        Assert.DoesNotContain("123456", JsonSerializer.Serialize(report));
    }

    [LocalSqlFact]
    public async Task Incompatible_or_disabled_SQL_constraints_block_import_without_repairing_schema()
    {
        await using var f = await Source(); await using var context = f.F.Db.Context(); var importer = f.Importer(context);
        await f.F.Db.ExecuteAsync("ALTER TABLE HORSE NOCHECK CONSTRAINT CK_HORSE_Flow1StateJson;");
        Assert.Contains((await importer.InventoryAsync()).Issues, x => x.Code == "SQL_SCHEMA_REQUIRED" && x.Source == "HORSE");
        await f.F.Db.ExecuteAsync("ALTER TABLE HORSE DROP CONSTRAINT CK_HORSE_Flow1StateJson; ALTER TABLE HORSE ADD CONSTRAINT CK_HORSE_Flow1StateJson CHECK(1=1);");
        Assert.Contains((await importer.InventoryAsync()).Issues, x => x.Code == "SQL_SCHEMA_REQUIRED" && x.Source == "HORSE");
        Assert.Equal(0L, await f.F.Db.ScalarAsync<long>("SELECT SUM(Flow1StateVersion) FROM HORSE;"));
    }

    [LocalSqlFact]
    public async Task Unknown_source_or_SQL_envelope_fields_are_not_silently_dropped_by_deserialization()
    {
        await using var f = await Source(); await using var context = f.F.Db.Context(); var importer = f.Importer(context);
        var path = Path.Combine(f.Root, f.Originals.Keys.First()); var original = await File.ReadAllTextAsync(path);
        await File.WriteAllTextAsync(path, original.Insert(1, "\"unrecognized\":\"retain me\","));
        Assert.Contains((await importer.InventoryAsync()).Issues, x => x.Code == "UNSUPPORTED_SOURCE_FIELD");
        await File.WriteAllTextAsync(path, original);
        await importer.ImportAsync((await importer.InventoryAsync()).SourceFingerprint);
        await f.F.Db.ExecuteAsync("UPDATE HORSE SET Flow1StateJson=JSON_MODIFY(Flow1StateJson,'$.extra','retain me');");
        var inventory = await importer.InventoryAsync(); Assert.Contains(inventory.Issues, x => x.Code == "SQL_STATE_INVALID");
        Assert.False((await importer.ImportAsync(inventory.SourceFingerprint)).Applied);
        Assert.Equal("retain me", await f.F.Db.ScalarAsync<string>("SELECT JSON_VALUE(Flow1StateJson,'$.extra') FROM HORSE;"));
    }
}
