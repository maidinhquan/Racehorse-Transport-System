using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Application.Flow1.Dtos;
using Domain.Flow1.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Swashbuckle.AspNetCore.Swagger;
using Xunit;
namespace Flow1.Rebuild.Tests;

public sealed class RequestSubmissionTests(SqlFixture database) : IClassFixture<SqlFixture>
{
    [Theory]
    [InlineData("pickup", "Thiếu thông tin bên giao")]
    [InlineData("delivery", "Thiếu thông tin bên nhận")]
    [InlineData("missing-horses", "Chưa chọn ngựa")]
    [InlineData("empty-horses", "Chưa chọn ngựa")]
    [InlineData("too-many", "tối đa 6 ngựa")]
    [InlineData("blank-id", "mã ngựa để trống")]
    [InlineData("duplicate", "bị trùng ngựa: HORSE_006")]
    [InlineData("missing-notes", "Thiếu horseNotes")]
    [InlineData("unselected-note", "ngựa HORSE_001, nhưng yêu cầu chỉ chọn HORSE_006")]
    [InlineData("null-note", "ngựa HORSE_006 không được null")]
    [InlineData("long-note", "ngựa HORSE_006 vượt quá 2.000 ký tự")]
    public async Task Submission_validation_identifies_the_specific_contact_horse_or_note_error(string invalid, string message)
    {
        using var factory = new ApiFactory(database); using var customer = factory.Customer();
        customer.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        var input = SubmissionTest.Input("2028-12-20", "2028-12-22", "HORSE_006");
        input = invalid switch {
            "pickup" => input with { Pickup = null! },
            "delivery" => input with { Delivery = null! },
            "missing-horses" => input with { Horses = null! },
            "empty-horses" => input with { Horses = [] },
            "too-many" => input with { Horses = Enumerable.Range(1, 7).Select(i => $"HORSE_{i:000}").ToArray() },
            "blank-id" => input with { Horses = [""] },
            "duplicate" => input with { Horses = ["HORSE_006", "HORSE_006"] },
            "missing-notes" => input with { HorseNotes = null! },
            "unselected-note" => input with { HorseNotes = new Dictionary<string, string> { ["HORSE_001"] = "Gentle handling" } },
            "null-note" => input with { HorseNotes = new Dictionary<string, string> { ["HORSE_006"] = null! } },
            "long-note" => input with { HorseNotes = new Dictionary<string, string> { ["HORSE_006"] = new string('a', 2001) } },
            _ => throw new InvalidOperationException()
        };
        var response = await customer.PostAsync("/api/customer/requests", SubmissionTest.Body(input));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("VALIDATION_ERROR", json.RootElement.GetProperty("errorCode").GetString());
        if (invalid is "pickup" or "delivery" or "missing-horses" or "missing-notes")
        {
            var field = invalid switch { "missing-horses" => "horses", "missing-notes" => "horseNotes", _ => invalid };
            Assert.True(json.RootElement.GetProperty("errors").TryGetProperty(field, out var errors));
            Assert.NotEmpty(errors.EnumerateArray());
        }
        else Assert.Contains(message, json.RootElement.GetProperty("message").GetString());
    }

    [Fact]
    public async Task Removed_documents_are_rejected_on_create_and_update()
    {
        using var factory = new ApiFactory(database); using var customer = factory.Customer(); using var manager = factory.Manager();
        var horse = await SubmissionTest.NewHorseAsync(database);
        var day = DateTime.UtcNow.AddDays(160).Date;
        var input = SubmissionTest.Input(day.ToString("yyyy-MM-dd"), day.AddDays(2).ToString("yyyy-MM-dd"), horse);
        customer.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        var created = await customer.PostAsync("/api/customer/requests", SubmissionTest.Body(input));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        using var result = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var id = result.RootElement.GetProperty("data").GetProperty("id").GetString();
        Assert.True((await manager.PostAsJsonAsync($"/api/manager/requests/{id}/request-changes", new { feedback = "Update contact" })).IsSuccessStatusCode);
        foreach (var type in new[] { "INVITATION_LETTER", "COMPETITION_REGISTRATION", "ATA_CARNET" })
        {
            var body = JsonSerializer.SerializeToNode(input, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
            body["documents"] = new System.Text.Json.Nodes.JsonArray(new System.Text.Json.Nodes.JsonObject { ["fileName"] = "old.pdf", ["documentType"] = type });
            Assert.Equal(HttpStatusCode.BadRequest, (await customer.PostAsync("/api/customer/requests", SubmissionTest.Body(body))).StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, (await customer.PutAsync($"/api/customer/requests/{id}", SubmissionTest.Body(body))).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await customer.GetAsync($"/api/customer/requests/{id}/shared-documents/{type}")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await manager.GetAsync($"/api/manager/requests/{id}/shared-documents/{type}")).StatusCode);
        }
        using var oldForm = new MultipartFormDataContent();
        oldForm.Add(new StringContent(JsonSerializer.Serialize(input)), "data");
        oldForm.Add(new ByteArrayContent(SubmissionTest.Pdf), "files", "old.pdf");
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, (await customer.PostAsync("/api/customer/requests", oldForm)).StatusCode);
        await using var db = database.Context();
        Assert.Empty(await db.Set<MedicalRecord>().Where(m => m.RequestID == id).ToListAsync());
        var connection = db.Database.GetDbConnection(); await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.TRANSPORT_REQUEST') AND name IN ('InvitationLetterFileUrl','CompetitionRegistrationFileUrl','AtaCarnetFileUrl')";
        Assert.Equal(0, Convert.ToInt32(await command.ExecuteScalarAsync()));
    }

    [Fact]
    public async Task Concurrent_distinct_requests_cannot_reserve_the_same_horse_interval()
    {
        using var factory=new ApiFactory(database);using var first=factory.Customer();using var second=factory.Customer();
        var horse=await SubmissionTest.NewHorseAsync(database);var day=DateTime.UtcNow.AddDays(130).Date;
        var input=SubmissionTest.Input(day.ToString("yyyy-MM-dd"),day.AddDays(2).ToString("yyyy-MM-dd"),horse);
        first.DefaultRequestHeaders.Add("Idempotency-Key",Guid.NewGuid().ToString());
        second.DefaultRequestHeaders.Add("Idempotency-Key",Guid.NewGuid().ToString());
        var results=await Task.WhenAll(first.PostAsync("/api/customer/requests",SubmissionTest.Body(input)),second.PostAsync("/api/customer/requests",SubmissionTest.Body(input)));
        Assert.Single(results,r=>r.StatusCode==HttpStatusCode.Created);
        Assert.Single(results,r=>r.StatusCode==HttpStatusCode.Conflict);
        await using var db=database.Context();Assert.Single(await db.Set<RequestHorse>().Where(h=>h.HorseID==horse).ToListAsync());
    }

    [Fact]
    public async Task Foreign_horses_and_metadata_failure_cannot_leave_partial_requests()
    {
        using var factory=new ApiFactory(database);using var client=factory.Customer();
        var day=DateTime.UtcNow.AddDays(120).Date;
        var input=SubmissionTest.Input(day.ToString("yyyy-MM-dd"),day.AddDays(2).ToString("yyyy-MM-dd"),"HORSE_003");
        client.DefaultRequestHeaders.Add("Idempotency-Key",Guid.NewGuid().ToString());
        await using var db=database.Context();var count=await db.Set<TransportRequest>().CountAsync();
        Assert.Equal(HttpStatusCode.NotFound,(await client.PostAsync("/api/customer/requests",SubmissionTest.Body(input))).StatusCode);
        Assert.Equal(count,await db.Set<TransportRequest>().CountAsync());
        var horse=await SubmissionTest.NewHorseAsync(database);
        input=input with { Horses=[horse] };
        await db.Database.ExecuteSqlRawAsync("CREATE TRIGGER dbo.TestFailRequestMetadata ON dbo.TRANSPORT_REQUEST AFTER INSERT, UPDATE AS BEGIN IF EXISTS(SELECT 1 FROM inserted WHERE PickupContactName IS NOT NULL) THROW 51000, 'Simulated metadata persistence failure', 1; END;");
        try
        {
            Assert.Equal(HttpStatusCode.InternalServerError,(await client.PostAsync("/api/customer/requests",SubmissionTest.Body(input))).StatusCode);
            Assert.Equal(count,await db.Set<TransportRequest>().CountAsync());
            Assert.Empty(await db.Set<RequestHorse>().Where(h=>h.HorseID==horse).ToListAsync());
            Assert.Empty(await db.Set<MedicalRecord>().Where(h=>h.HorseID==horse).ToListAsync());
        }
        finally { await db.Database.ExecuteSqlRawAsync("DROP TRIGGER dbo.TestFailRequestMetadata;"); }
    }

    [Fact]
    public async Task Failed_submission_leaves_no_request_and_retries_compare_contacts()
    {
        using var factory = new ApiFactory(database); using var client = factory.Customer();
        var horse = await SubmissionTest.NewHorseAsync(database);
        var day = DateTime.UtcNow.AddDays(100).Date;
        var input = SubmissionTest.Input(day.ToString("yyyy-MM-dd"), day.AddDays(2).ToString("yyyy-MM-dd"), horse);
        await using var db = database.Context(); var count = await db.Set<TransportRequest>().CountAsync();
        client.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/customer/requests", SubmissionTest.Body(input with { Pickup = null! }))).StatusCode);
        Assert.Equal(count, await db.Set<TransportRequest>().CountAsync());
        var created = await client.PostAsync("/api/customer/requests", SubmissionTest.Body(input));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsync("/api/customer/requests", SubmissionTest.Body(input))).StatusCode);
        Assert.Equal(count + 1, await db.Set<TransportRequest>().CountAsync());
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsync("/api/customer/requests", SubmissionTest.Body(input with { Pickup = input.Pickup with { Phone = "0901112223" } }))).StatusCode);
        client.DefaultRequestHeaders.Remove("Idempotency-Key"); client.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsync("/api/customer/requests", SubmissionTest.Body(input))).StatusCode);
        Assert.Equal(count + 1, await db.Set<TransportRequest>().CountAsync());
    }

    [Fact]
    public void Swagger_exposes_json_submission_without_request_upload_fields_or_shared_routes()
    {
        using var factory = new ApiFactory(database); using var client = factory.Customer();
        var swagger = factory.Services.GetRequiredService<ISwaggerProvider>().GetSwagger("v1");
        foreach (var operation in new[] { swagger.Paths["/api/customer/requests"].Operations[Microsoft.OpenApi.Models.OperationType.Post],
            swagger.Paths["/api/customer/requests/{requestId}"].Operations[Microsoft.OpenApi.Models.OperationType.Put] })
        {
            Assert.Contains("application/json", operation.RequestBody.Content.Keys);
            Assert.DoesNotContain("multipart/form-data", operation.RequestBody.Content.Keys);
            var schema = operation.RequestBody.Content["application/json"].Schema;
            if (schema.Reference is not null) schema = swagger.Components.Schemas[schema.Reference.Id];
            Assert.DoesNotContain("documents", schema.Properties.Keys);
            Assert.DoesNotContain("files", schema.Properties.Keys);
        }
        Assert.DoesNotContain(swagger.Paths.Keys, p => p.Contains("shared-documents"));
        Assert.DoesNotContain("/api/customer/requests/{requestId}/submit", swagger.Paths.Keys);
    }

}
