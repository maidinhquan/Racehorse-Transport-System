using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Application.Services.Flow1;
using Infrastructure.ExternalServices.Flow1;
using Infrastructure.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace Flow1.Tests;

public sealed class ContractPublicationTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static string Root() { var dir = new DirectoryInfo(Directory.GetCurrentDirectory()); while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "backend/Backend.slnx"))) dir = dir.Parent; return dir?.FullName ?? throw new IOException("Repository root missing."); }
    internal static Flow1ContractOptions Options() => new() { Issuer = new[] { "COMPANY_NAME", "COMPANY_ADDRESS", "COMPANY_EMAIL", "COMPANY_HOTLINE", "COMPANY_TAX_CODE", "COMPANY_BANK_ACCOUNT", "COMPANY_BANK_NAME", "COMPANY_REPRESENTATIVE", "COMPANY_REP_POSITION" }.ToDictionary(k => k, k => "DEMO FIXTURE " + k) };
    internal sealed class Clock : TimeProvider { public DateTimeOffset Now = new FlowClock().GetUtcNow(); public override DateTimeOffset GetUtcNow() => Now; }
    internal sealed class Renderer(IFlow1PrivateFileStore files) : IFlow1ContractDocumentGenerator
    {
        public int Calls; public bool Fail;
        public async Task<ContractDocumentResult> GenerateAsync(ContractDocumentRequest input, CancellationToken ct = default)
        {
            Interlocked.Increment(ref Calls); if (Fail) throw new IOException("Injected converter failure.");
            var bytes = System.Text.Encoding.UTF8.GetBytes($"%PDF-1.4\nPUBLICATION TEST DOUBLE ONLY {input.ContractId} v{input.Version}\n%%EOF");
            var file = await files.PutAsync(new(bytes, "fixture.pdf"), false, ct);
            return new(file.FileId, file.Sha256, file.SizeBytes);
        }
    }
    internal sealed class Fixture : IAsyncDisposable
    {
        public required Flow1TestDatabase Db; public required string Folder; public required CustomerTestFactory Factory;
        public required HttpClient Manager; public required HttpClient Customer; public required string RequestId; public required string ContractId;
        public required int Version; public required Renderer Renderer; public required SqlStateFaults Fault; public required Clock Clock;
        public PublishContractInput Input => new(Version, new(2026, 11, 10, 10, 0, 0, TimeSpan.Zero));
        public static async Task<Fixture> Create(Action<IServiceCollection>? customize = null)
        {
            var db = await Flow1TestDatabase.CreateAsync(); var folder = Path.Combine(Path.GetTempPath(), "RaceHorseFlow1Api-" + Guid.NewGuid().ToString("N"));
            var clock = new Clock(); var store = new SqlStateFaults();
            var renderer = new Renderer(new LocalFlow1PrivateFileStore(Path.Combine(folder, "bytes")));
            var factory = new CustomerTestFactory(db.ConnectionString, folder, customize: s => {
                s.RemoveAll<TimeProvider>(); s.AddSingleton<TimeProvider>(clock);
                s.RemoveAll<SqlStateFaults>(); s.AddSingleton(store);
                s.RemoveAll<IFlow1ContractDocumentGenerator>(); s.AddSingleton<IFlow1ContractDocumentGenerator>(renderer);
                s.RemoveAll<Flow1ContractOptions>(); s.AddSingleton(Options()); customize?.Invoke(s);
            });
            var customer = factory.Client(); var manager = factory.Client("manager", "LOGISTICS_MANAGER");
            try
            {
                var h = await Data<HorseView>(await Send(customer, "/api/customer/horses", CustomerTransportTests.HorseBody()), HttpStatusCode.Created);
                var r = await Data<RequestView>(await Send(customer, "/api/customer/requests", CustomerTransportTests.Request(h.HorseId)), HttpStatusCode.Created);
                var v = await Data<ManagerReviewView>(await Send(manager, $"/api/manager/requests/{r.RequestId}/accept", new ReviewCommand(0)));
                v = await Data<ManagerReviewView>(await Send(manager, $"/api/manager/requests/{r.RequestId}/preliminary-plan", new ReviewCommand(v.Version,
                    Plan: new(new(2026, 11, 20), new(2026, 11, 25), 2, 1, 1, "Fixture resources"))));
                v = await Data<ManagerReviewView>(await Send(manager, $"/api/manager/requests/{r.RequestId}/contracts", new ReviewCommand(v.Version,
                    Lines: [new("TRANSPORT", "Gói demo", 1, 115_000_000)])));
                return new() { Db = db, Folder = folder, Factory = factory, Customer = customer, Manager = manager, RequestId = r.RequestId,
                    ContractId = v.Contract!.ContractId, Version = v.Version, Renderer = renderer, Fault = store, Clock = clock };
            }
            catch { manager.Dispose(); customer.Dispose(); factory.Dispose(); await db.DisposeAsync(); Flow1TestFolders.Cleanup(folder); throw; }
        }
        public Task<HttpResponseMessage> Publish(string key = "publish-fixture-001", PublishContractInput? input = null) => Send(Manager, $"/api/manager/contracts/{ContractId}/send", input ?? Input, key);
        public Task<HttpResponseMessage> Recover() => Send(Manager, $"/api/manager/contracts/{ContractId}/publication/recover", new { });
        public Task<HttpResponseMessage> Discard() => Send(Manager, $"/api/manager/contracts/{ContractId}/publication/discard", new { reason = "Lập lại thời hạn" });
        public Task<HttpResponseMessage> Public() => Customer.GetAsync($"/api/customer/contracts/{ContractId}/publication");
        public async ValueTask DisposeAsync() { Manager.Dispose(); Customer.Dispose(); Factory.Dispose(); await Db.DisposeAsync(); Flow1TestFolders.Cleanup(Folder); }
    }
    internal static async Task<HttpResponseMessage> Send(HttpClient client, string path, object body, string? key = null)
    { using var req = new HttpRequestMessage(HttpMethod.Post, path) { Content = body as HttpContent ?? JsonContent.Create(body) }; req.Headers.Add("Idempotency-Key", key ?? Guid.NewGuid().ToString()); return await client.SendAsync(req); }
    internal static async Task<T> Data<T>(HttpResponseMessage response, HttpStatusCode code = HttpStatusCode.OK)
    { var text = await response.Content.ReadAsStringAsync(); Assert.True(response.StatusCode == code, text); return JsonDocument.Parse(text).RootElement.GetProperty("data").Deserialize<T>(Json)!; }
    [LocalSqlFact]
    public async Task Issue_is_owner_scoped_immutable_idempotent_and_does_not_create_invoice_or_trip()
    {
        await using var f = await Fixture.Create();
        Assert.Equal(HttpStatusCode.Conflict, (await f.Customer.GetAsync($"/api/customer/contracts/{f.ContractId}/pdf")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Send(f.Customer, $"/api/manager/contracts/{f.ContractId}/send", f.Input)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await f.Publish(input: f.Input with { ExpectedReviewVersion = 0 })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await f.Publish(input: f.Input with { CompletionDeadline = new(2026, 11, 19, 20, 0, 0, TimeSpan.Zero) })).StatusCode);
        var issued = await Data<PublishedContractView>(await f.Publish()); Assert.Equal("PENDING_SIGNATURE", issued.Status);
        Assert.Equal("AWAITING_CONTRACT", await f.Db.ScalarAsync<string>("SELECT Status FROM TRANSPORT_REQUEST;"));
        var again = await Data<PublishedContractView>(await f.Publish()); Assert.Equal(issued.DocumentHash, again.DocumentHash); Assert.Equal(1, f.Renderer.Calls);
        Assert.Equal(HttpStatusCode.Conflict, (await f.Publish(input: f.Input with { CompletionDeadline = f.Input.CompletionDeadline.AddDays(-1) })).StatusCode);
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;")); Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
        var bytes = await (await f.Customer.GetAsync($"/api/customer/contracts/{f.ContractId}/pdf")).Content.ReadAsByteArrayAsync();
        Assert.Equal(issued.DocumentHash, Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant());
        using var other = f.Factory.Client("other"); Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/api/customer/contracts/{f.ContractId}/pdf")).StatusCode);
        var view = await Data<ManagerReviewView>(await f.Manager.GetAsync($"/api/manager/requests/{f.RequestId}"));
        Assert.Empty(view.AllowedActions);
        Assert.Equal(HttpStatusCode.Conflict, (await Send(f.Customer, $"/api/customer/requests/{f.RequestId}/cancel", new ReviewCommand(view.Version, "Hủy"))).StatusCode);
        var publication = await (await f.Public()).Content.ReadAsStringAsync(); Assert.DoesNotContain("frozenModel", publication); Assert.DoesNotContain("privateStorageKey", publication);
        await f.Db.ExecuteAsync("INSERT INTO [USER](UserID,PasswordHash,Role,FullName) VALUES ('publication-other','test-only','CUSTOMER',N'Other Fixture'); UPDATE CONTRACT SET CustomerID='publication-other';");
        using var changedOwner = f.Factory.Client("publication-other");
        Assert.Equal(HttpStatusCode.Conflict, (await changedOwner.GetAsync($"/api/customer/contracts/{f.ContractId}/pdf")).StatusCode);
    }
    [LocalSqlFact]
    public async Task Converter_failure_leaves_draft_and_concurrent_issuers_publish_only_once()
    {
        await using var f = await Fixture.Create();
        var options = f.Factory.Services.GetRequiredService<Flow1ContractOptions>();
        var issuer = options.Issuer["COMPANY_NAME"]; options.Issuer.Remove("COMPANY_NAME");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await f.Publish()).StatusCode); Assert.Equal(0, f.Renderer.Calls);
        options.Issuer["COMPANY_NAME"] = issuer; f.Renderer.Fail = true;
        Assert.Equal(HttpStatusCode.InternalServerError, (await f.Publish()).StatusCode);
        Assert.Equal("DRAFT", await f.Db.ScalarAsync<string>("SELECT ContractStatus FROM CONTRACT;"));
        Assert.Equal("ACCEPTED", await f.Db.ScalarAsync<string>("SELECT Status FROM TRANSPORT_REQUEST;"));
        Assert.Null(await Data<PublishedContractView?>(await f.Public()));
        f.Renderer.Fail = false;
        var results = await Task.WhenAll(f.Publish("parallel-issue-one"), f.Publish("parallel-issue-two"));
        Assert.Single(results, x => x.StatusCode == HttpStatusCode.OK); Assert.Single(results, x => x.StatusCode == HttpStatusCode.Conflict);
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT WHERE ContractStatus='PENDING_SIGNATURE';"));
    }
    [LocalSqlFact]
    public async Task Sql_failure_rolls_back_deadline_status_and_manifest_then_same_key_can_retry()
    {
        await using var f = await Fixture.Create();
        await f.Db.ExecuteAsync("ALTER TABLE CONTRACT ADD CONSTRAINT CK_TestPublicationFault CHECK (ContractStatus <> 'PENDING_SIGNATURE');");
        Assert.Equal(HttpStatusCode.InternalServerError, (await f.Publish()).StatusCode);
        Assert.Equal("ACCEPTED", await f.Db.ScalarAsync<string>("SELECT Status FROM TRANSPORT_REQUEST;"));
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT WHERE ContractStatus='DRAFT' AND CompletionDeadline IS NULL;"));
        Assert.Null(await f.Factory.State("publication", f.ContractId)); Assert.Null(await Data<PublishedContractView?>(await f.Public()));
        await f.Db.ExecuteAsync("ALTER TABLE CONTRACT DROP CONSTRAINT CK_TestPublicationFault;");
        Assert.Equal("PENDING_SIGNATURE", (await Data<PublishedContractView>(await f.Publish())).Status);
    }
    [LocalSqlFact]
    public async Task Failure_after_manifest_write_does_not_publish_pdf_and_retry_is_fully_atomic()
    {
        await using var f = await Fixture.Create(); f.Fault.Mode = "publication-after-state";
        Assert.Equal(HttpStatusCode.InternalServerError, (await f.Publish()).StatusCode);
        Assert.Equal("DRAFT", await f.Db.ScalarAsync<string>("SELECT ContractStatus FROM CONTRACT;"));
        Assert.Null(await Data<PublishedContractView?>(await f.Public()));
        Assert.Equal(HttpStatusCode.Conflict, (await f.Customer.GetAsync($"/api/customer/contracts/{f.ContractId}/pdf")).StatusCode);
        var published = await Data<PublishedContractView>(await f.Publish()); Assert.False(published.RecoveryRequired);
        Assert.Equal(published.DocumentHash, (await Data<PublishedContractView>(await f.Publish())).DocumentHash);
        Assert.Single((await f.Factory.State("publication", f.ContractId))!.Revisions);
    }
    [LocalSqlFact]
    public async Task Failure_after_all_sql_writes_before_commit_cannot_leave_publication_or_signed_status()
    {
        await using var f = await Fixture.Create(); f.Fault.Mode = "after-save";
        Assert.Equal(HttpStatusCode.InternalServerError, (await f.Publish()).StatusCode);
        Assert.Equal("DRAFT", await f.Db.ScalarAsync<string>("SELECT ContractStatus FROM CONTRACT;"));
        Assert.Null(await f.Factory.State("publication", f.ContractId));
        var issued = await Data<PublishedContractView>(await f.Publish());
        Assert.Equal(issued.DocumentHash, (await Data<PublishedContractView>(await f.Public())).DocumentHash);
        Assert.False(Directory.Exists(Path.Combine(f.Folder, "metadata")));
    }
    [LocalSqlFact]
    public async Task Rolled_back_publication_revalidates_deadline_and_issued_pdf_corruption_fails_closed()
    {
        await using var f = await Fixture.Create(); f.Fault.Mode = "publication-after-state";
        Assert.Equal(HttpStatusCode.InternalServerError, (await f.Publish()).StatusCode);
        f.Clock.Now = f.Input.CompletionDeadline.AddHours(1);
        Assert.Equal(HttpStatusCode.Conflict, (await f.Publish()).StatusCode);
        var issued = await Data<PublishedContractView>(await f.Publish("new-deadline-issue", f.Input with { CompletionDeadline = f.Clock.Now.AddDays(1) }));
        f.Clock.Now = issued.OriginalCompletionDeadline.AddHours(1);
        Assert.True((await Data<PublishedContractView>(await f.Public())).Overdue);
        Assert.Equal("AWAITING_CONTRACT", await f.Db.ScalarAsync<string>("SELECT Status FROM TRANSPORT_REQUEST;"));
        await File.WriteAllTextAsync(Path.Combine(f.Folder, "bytes", issued.DocumentHash + ".bin"), "CORRUPTED");
        Assert.Equal(HttpStatusCode.Conflict, (await f.Customer.GetAsync($"/api/customer/contracts/{f.ContractId}/pdf")).StatusCode);
    }
    [LocalPdfFact]
    public async Task Real_libreoffice_renders_v2_two_horses_and_retains_reference_hash()
    {
        var root = Root(); var folder = Path.Combine(root, "backend/WebApi/App_Data/flow1/phase4-pdf-qa-" + Guid.NewGuid().ToString("N"));
        var options = Options(); options.LibreOfficePath = Environment.GetEnvironmentVariable("RACEHORSE_TEST_LIBREOFFICE")!;
        options.WorkRoot = Path.Combine(folder, "conversion");
        var original = Path.Combine(root, "backend/WebApi/Resources/Contracts/v1/contract-template.docx");
        var before = SHA256.HashData(await File.ReadAllBytesAsync(original));
        var bytes = new LocalFlow1PrivateFileStore(Path.Combine(folder, "bytes"));
        var service = new LibreOfficeContractDocumentGenerator(Path.Combine(root, "backend/WebApi"), options, bytes);
        var values = JsonSerializer.Deserialize<Dictionary<string, string>>(await File.ReadAllTextAsync(Path.Combine(root, "backend/tools/fixtures/contract-pdf-spike.json")))!;
        values["COMPLETION_DEADLINE"] = "10/11/2026 17:00 UTC+07"; values["PLAN_VERSION"] = "2"; values["TRANSPORT_SCOPE"] = "ROAD";
        values["SELLING_LINES"] = "Vận chuyển: 1 × 115.000.000 = 115.000.000 VND";
        var horse = values.Where(x => x.Key.StartsWith("HORSE_1_")).ToDictionary(x => x.Key, x => x.Value);
        var second = new Dictionary<string, string>(horse) { ["HORSE_1_NAME"] = "Ngựa Demo Hai", ["HORSE_1_MICROCHIP"] = "987654321012345", ["HORSE_1_ID"] = "horse-demo-002" };
        var result = await service.GenerateAsync(new("c-demo", 1, "v2", JsonSerializer.SerializeToElement(new ContractPdfModel(values, [horse, second]), Json)));
        var pdf = await bytes.ReadAsync(new(result.PrivateStorageKey, result.Sha256, "application/pdf", (int)result.SizeBytes), default);
        await File.WriteAllBytesAsync(Path.Combine(folder, "issued-v2-two-horses.pdf"), pdf);
        Assert.True(pdf.Length > 100_000); Assert.Equal(before, SHA256.HashData(await File.ReadAllBytesAsync(original)));
        Assert.Empty(Directory.GetDirectories(options.WorkRoot));
        Console.WriteLine("PDF_QA: " + folder);
    }
}
public sealed class LocalPdfFactAttribute : FactAttribute
{
    public LocalPdfFactAttribute() { if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("RACEHORSE_TEST_LIBREOFFICE"))) Skip = "Set RACEHORSE_TEST_LIBREOFFICE to a verified headless runtime for real PDF acceptance."; }
}
