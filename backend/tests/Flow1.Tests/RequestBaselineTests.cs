using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Security.Cryptography;
using Application.Common.Exceptions;
using Application.DTOs;
using Application.DTOs.Flow1;
using Domain.Flow1;
using Infrastructure.Storage;
using Microsoft.Data.SqlClient;
using Xunit;

namespace Flow1.Tests;

public sealed class RequestBaselineTests
{
    private static readonly UploadedFile Medical = new(Encoding.UTF8.GetBytes("%PDF-1.4 baseline medical fixture only"), "medical.pdf");
    private static async Task<FlowRequestInput> Input(RelationalFlow1Tests.Fixture f, bool two = false)
    {
        var horses = new List<HorseSelection>();
        for (var n = 0; n < (two ? 2 : 1); n++) {
            var horse = await f.Service.HorseAsync("owner", "baseline-horse-" + n,
                new("Horse " + n, "12345678901234" + n, "BASE-" + n, "Breed", "STALLION", 450, new(2020, 1, 1)),
                new(Encoding.UTF8.GetBytes("fixture photo bytes"), "photo.png"), Medical, null, null, default);
            horses.Add(new(horse.HorseId, horse.Version));
        }
        return new(new(new("A", 10, 106, "VN"), new("B", 11, 107, "VN"), "ROAD", horses.Count, new(2026, 11, 20)),
            new(2026, 11, 20, 3, 0, 0, TimeSpan.Zero), new(2026, 11, 21, 3, 0, 0, TimeSpan.Zero),
            "Transport", new("Owner", "0900000000"), new("Receiver", "0900000001"), horses, 150000.25m);
    }

    [LocalSqlFact]
    public async Task Migration_is_repeatable_adds_one_nullable_scalar_and_preserves_tables_foreign_keys_and_rows()
    {
        await using var db = await Flow1TestDatabase.CreateAsync(sqlState: false);
        await db.ScriptAsync("006_flow1_simple_relational_foundation.sql");
        var columns = await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns;");
        var tables = await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables;");
        var relations = await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.foreign_keys;");
        await db.ScriptAsync("007_flow1_request_baseline.sql"); await db.ScriptAsync("007_flow1_request_baseline.sql");
        Assert.Equal(columns + 1, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns;"));
        Assert.Equal(tables, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.tables;"));
        Assert.Equal(relations, await db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.foreign_keys;"));
        Assert.Equal("ACCEPTED", await db.ScalarAsync<string>("SELECT Status FROM TRANSPORT_REQUEST WHERE RequestID='req-1';"));
        Assert.Equal(547, (await Assert.ThrowsAsync<SqlException>(() => db.ExecuteAsync("UPDATE TRANSPORT_REQUEST SET DeclaredValueUsd=-1;"))).Number);
    }

    [LocalSqlFact]
    public async Task Total_and_multiple_horse_documents_commit_together_and_retry_does_not_duplicate_or_verify_them()
    {
        await using var f = await RelationalFlow1Tests.Fixture.Create(); var input = await Input(f, true);
        var uploads = input.Horses.Select(h => new RequestDocumentUpload(h.HorseId, Medical)).ToArray();
        var r = await f.Service.SubmitWithDocumentsAsync("owner", "baseline-request-one", input, uploads, null, null, default);
        Assert.Equal(150000.25m, r.DeclaredValueUsd); Assert.Equal(input.DeclaredValueUsd, r.Input!.DeclaredValueUsd);
        Assert.Equal(2, r.Documents!.Count); Assert.All(r.Documents, d => Assert.Equal("UPLOADED", d.Status));
        var replay = await f.NewService().SubmitWithDocumentsAsync("owner", "baseline-request-one", input, uploads, null, null, default);
        Assert.Equal(r.RequestId, replay.RequestId); Assert.Equal(r.Version, replay.Version);
        Assert.Equal(2, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM LEGAL_MEDICAL_RECORD WHERE VerifiedBy IS NULL AND DocumentStatus='UPLOADED';"));
        var document = r.Documents[0];
        Assert.Equal(Medical.Bytes, (await f.Service.RequestDocumentAsync(r.RequestId, document.DocumentId, "owner", false, default)).Bytes);
        Assert.Equal(Medical.Bytes, (await f.Service.RequestDocumentAsync(r.RequestId, document.DocumentId, "manager", true, default)).Bytes);
        Assert.Equal("NOT_FOUND", (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.RequestDocumentAsync(r.RequestId, document.DocumentId, "other", false, default))).ErrorCode);
        Assert.Equal("NOT_FOUND", (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.RequestDocumentAsync("req-1", document.DocumentId, "owner", false, default))).ErrorCode);
        Assert.Equal("IDEMPOTENCY_KEY_REUSED", (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.SubmitWithDocumentsAsync("owner", "baseline-request-one", input with { DeclaredValueUsd = 42 }, uploads, null, null, default))).ErrorCode);
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
    }

    [LocalSqlFact]
    public async Task Invalid_values_unselected_horse_duplicate_files_and_booking_failure_do_not_create_partial_requests()
    {
        await using var f = await RelationalFlow1Tests.Fixture.Create(); var input = await Input(f, true);
        foreach (var value in new[] { -1m, 0m, 1.001m, 10000000000000000m })
            Assert.Equal("INVALID_DECLARED_VALUE", (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.SubmitWithDocumentsAsync("owner", "baseline-request-bad", input with { DeclaredValueUsd = value }, [], null, null, default))).ErrorCode);
        Assert.Equal("INVALID_DOCUMENT_HORSE", (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.SubmitWithDocumentsAsync("owner", "baseline-request-bad", input, [new("unselected-horse", Medical)], null, null, default))).ErrorCode);
        Assert.Equal("FORBIDDEN", (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.SubmitWithDocumentsAsync("other", "baseline-request-bad", input, [], null, null, default))).ErrorCode);
        var doc = new RequestDocumentUpload(input.Horses[0].HorseId, Medical);
        Assert.Equal("DUPLICATE_DOCUMENT", (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.SubmitWithDocumentsAsync("owner", "baseline-request-bad", input, [doc, doc], null, null, default))).ErrorCode);
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRANSPORT_REQUEST;"));
        Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM LEGAL_MEDICAL_RECORD;"));
        await f.Service.SubmitWithDocumentsAsync("owner", "baseline-booking-one", input, [doc], null, null, default);
        await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.SubmitWithDocumentsAsync("owner", "baseline-booking-two", input, [doc], null, null, default));
        Assert.Equal(2, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRANSPORT_REQUEST;"));
        Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM LEGAL_MEDICAL_RECORD;"));
    }

    [LocalSqlFact]
    public async Task Returned_request_revision_preserves_selected_horse_files_and_removes_links_to_excluded_horses()
    {
        await using var f = await RelationalFlow1Tests.Fixture.Create(); var input = await Input(f, true);
        var r = await f.Service.SubmitWithDocumentsAsync("owner", "baseline-revision-one", input,
            input.Horses.Select(h => new RequestDocumentUpload(h.HorseId, Medical)).ToArray(), null, null, default);
        var oldVersion = r.Version; var excluded = r.Documents!.Single(d => d.HorseId == input.Horses[1].HorseId);
        r = await f.Service.ReviewAsync(r.RequestId, "manager", "request-changes", new(r.Version, "Reduce horses"), default);
        var overflow = Enumerable.Range(0, 9).Select(n => new RequestDocumentUpload(input.Horses[0].HorseId,
            new(Encoding.UTF8.GetBytes("%PDF-1.4 extra medical fixture " + n), "extra.pdf"))).ToArray();
        Assert.Equal("INVALID_DOCUMENTS", (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.SubmitWithDocumentsAsync("owner", "baseline-revision-cap", input with { DeclaredValueUsd = 1 }, overflow, r.RequestId, r.Version, default))).ErrorCode);
        var unchanged = await f.Service.DetailAsync(r.RequestId, "owner", false, default);
        Assert.Equal("CHANGES_REQUESTED", unchanged.Status); Assert.Equal(150000.25m, unchanged.DeclaredValueUsd); Assert.Equal(2, unchanged.Documents!.Count);
        var updated = input with { Horses = [input.Horses[0]], Trip = input.Trip with { HorseCount = 1 }, DeclaredValueUsd = 75000 };
        await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.SubmitWithDocumentsAsync("owner", "baseline-revision-two", updated, [], r.RequestId, oldVersion, default));
        r = await f.Service.SubmitWithDocumentsAsync("owner", "baseline-revision-two", updated, [], r.RequestId, r.Version, default);
        Assert.Equal(75000m, r.DeclaredValueUsd); Assert.Single(r.Documents!); Assert.Equal("PENDING", r.Status);
        await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.RequestDocumentAsync(r.RequestId, excluded.DocumentId, "owner", false, default));
    }

    [LocalSqlFact]
    public async Task Real_private_store_rejects_disguised_files_and_concurrent_retry_commits_one_request_and_document()
    {
        await using var f = await RelationalFlow1Tests.Fixture.Create(); var input = await Input(f);
        var root = Path.GetFullPath(Path.Combine(Path.GetTempPath(), "flow1-baseline-test-" + Guid.NewGuid().ToString("N")));
        Assert.StartsWith(Path.GetFullPath(Path.GetTempPath()), root);
        try {
            var store = new Flow1CurrentFiles(root, new LocalFlow1PrivateFileStore(root));
            var a = f.NewService(currentFiles: store); var b = f.NewService(currentFiles: store);
            var png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=");
            var horse = await a.UpdateFilesAsync(input.Horses[0].HorseId, "owner", input.Horses[0].Version, new(png, "photo.png"), Medical, default);
            input = input with { Horses = [new(horse.HorseId, horse.Version)] };
            var bad = new RequestDocumentUpload(input.Horses[0].HorseId, new(Encoding.UTF8.GetBytes("<html>not a genuine PDF</html>"), "fake.pdf"));
            Assert.Equal("INVALID_FILE_TYPE", (await Assert.ThrowsAsync<BusinessRuleException>(() => a.SubmitWithDocumentsAsync("owner", "baseline-real-files", input, [bad], null, null, default))).ErrorCode);
            Assert.Equal(0, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM LEGAL_MEDICAL_RECORD;"));
            var doc = new RequestDocumentUpload(input.Horses[0].HorseId, Medical);
            var results = await Task.WhenAll(a.SubmitWithDocumentsAsync("owner", "baseline-real-files", input, [doc], null, null, default),
                b.SubmitWithDocumentsAsync("owner", "baseline-real-files", input, [doc], null, null, default));
            Assert.Equal(results[0].RequestId, results[1].RequestId);
            Assert.Equal(1, await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM LEGAL_MEDICAL_RECORD;"));
            Assert.Equal(Medical.Bytes, (await a.RequestDocumentAsync(results[0].RequestId, results[0].Documents![0].DocumentId, "owner", false, default)).Bytes);
            var privateFile = Path.Combine(root, Convert.ToHexString(SHA256.HashData(Medical.Bytes)).ToLowerInvariant() + ".bin"); await File.AppendAllTextAsync(privateFile, "tamper");
            Assert.Equal("FILE_INTEGRITY_ERROR", (await Assert.ThrowsAsync<BusinessRuleException>(() => a.RequestDocumentAsync(results[0].RequestId, results[0].Documents![0].DocumentId, "owner", false, default))).ErrorCode);
        }
        finally { if (Directory.Exists(root)) Directory.Delete(root, true); }
    }

    [LocalSqlFact]
    public async Task Missing_007_or_a_replaced_check_fails_closed_without_altering_the_database()
    {
        await using var f = await RelationalFlow1Tests.Fixture.Create();
        await f.Db.ExecuteAsync("ALTER TABLE TRANSPORT_REQUEST DROP CONSTRAINT CK_F1D_DeclaredValueUsd;ALTER TABLE TRANSPORT_REQUEST DROP COLUMN DeclaredValueUsd;");
        Assert.Equal("FLOW1_SQL_SCHEMA_REQUIRED", (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.ListAsync("owner", false, default))).ErrorCode);
        await f.Db.ScriptAsync("007_flow1_request_baseline.sql");
        await f.Db.ExecuteAsync("ALTER TABLE TRANSPORT_REQUEST DROP CONSTRAINT CK_F1D_DeclaredValueUsd;ALTER TABLE TRANSPORT_REQUEST ADD CONSTRAINT CK_F1D_DeclaredValueUsd CHECK (DeclaredValueUsd IS NULL OR DeclaredValueUsd >= 0);");
        Assert.Equal("FLOW1_SQL_SCHEMA_REQUIRED", (await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.ListAsync("owner", false, default))).ErrorCode);
        Assert.Equal(51403, (await Assert.ThrowsAsync<SqlException>(() => f.Db.ScriptAsync("007_flow1_request_baseline.sql"))).Number);
    }

    [LocalSqlFact]
    public async Task Multipart_http_stores_links_authorizes_downloads_and_does_not_inflate_transport_quote_or_deposit()
    {
        await using var f = await RelationalFlow1Tests.Fixture.Create(); var input = await Input(f);
        using var app = new RelationalHttpFactory(f); using var owner = app.Client();
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(JsonSerializer.Serialize(input, new JsonSerializerOptions(JsonSerializerDefaults.Web))), "payload");
        form.Add(new StringContent(input.Horses[0].HorseId), "horseIds");
        form.Add(new ByteArrayContent(Medical.Bytes), "files", Medical.FileName);
        owner.DefaultRequestHeaders.Add("Idempotency-Key", "baseline-http-request");
        var response = await owner.PostAsync("/api/customer/requests/with-documents", form);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var r = (await response.Content.ReadFromJsonAsync<ApiResponse<FlowRequestCard>>())!.Data!;
        var file = await owner.GetAsync($"/api/customer/requests/{r.RequestId}/documents/{r.Documents![0].DocumentId}");
        Assert.Equal(Medical.Bytes, await file.Content.ReadAsByteArrayAsync()); Assert.Contains("no-store", file.Headers.CacheControl!.ToString());
        using var other = app.Client("other");
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/api/customer/requests/{r.RequestId}/documents/{r.Documents[0].DocumentId}")).StatusCode);
        using var anonymous = app.Client(null);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync($"/api/customer/requests/{r.RequestId}/documents/{r.Documents[0].DocumentId}")).StatusCode);
        r = await f.Service.ReviewAsync(r.RequestId, "manager", "accept", new(r.Version, "Reviewed"), default);
        var c = await f.Service.DraftAsync(r.RequestId, "manager", "baseline-contract-one", new(r.Version, Price: 100000000, PreparationDays: 2, Deadline: f.Time.Value.AddDays(2)), default);
        Assert.Equal(100000000, c.TotalPrice); Assert.Equal(40000000, c.DepositAmount);
        c = await f.Service.PublishAsync(c.ContractId, "manager", new(c.Version,ClauseIds:[f.ClauseId]), default);
        var session = await f.Session(c); await f.Service.IpnAsync(f.Callback(session), default);
        c = await f.Service.ContractAsync(c.ContractId, "owner", false, default);
        await f.Service.SendOtpAsync(c.ContractId, "owner", new(c.Version, PdfSha256: c.PdfSha256), default);
        c = await f.Service.ContractAsync(c.ContractId, "owner", false, default);
        c = await f.Service.SignAsync(c.ContractId, "owner", new(c.Version, Otp: f.Email.Code, PdfSha256: c.PdfSha256), default);
        c = await f.Service.ContractAsync(c.ContractId, "manager", true, default);
        c = await f.Service.DeploymentAsync(c.ContractId, "manager", "confirm", new(c.Trip!.Version, "Ready",AssignedSpecialistId:"docs",AssignedCoordinatorId:"route"), default);
        var trip = c.Trip!; var document = r.Documents![0].DocumentId;
        Assert.Equal(Medical.Bytes, (await f.Service.OperationsDocumentAsync(trip.TripId, document, "docs", trip.EventId!, default)).Bytes);
        await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.OperationsDocumentAsync(trip.TripId, document, "route", trip.EventId!, default));
        Assert.Equal(input.DeclaredValueUsd, (await f.Service.OperationsAsync("docs", default)).Single().DeclaredValueUsd);
        await f.Service.DeploymentAsync(c.ContractId, "manager", "hold", new(trip.Version, "Hold"), default);
        await Assert.ThrowsAsync<BusinessRuleException>(() => f.Service.OperationsDocumentAsync(trip.TripId, document, "docs", trip.EventId!, default));
    }
}
