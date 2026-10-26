using System.Net;
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
        input=input with { Horses=[horse], Documents=[new("health.pdf","HEALTH_CERTIFICATE",horse)] };
        await db.Database.ExecuteSqlRawAsync("CREATE TRIGGER dbo.TestFailMedicalInsert ON dbo.LEGAL_MEDICAL_RECORD AFTER INSERT AS BEGIN THROW 51000, 'Simulated metadata persistence failure', 1; END;");
        try
        {
            Assert.Equal(HttpStatusCode.InternalServerError,(await client.PostAsync("/api/customer/requests",SubmissionTest.Body(input,("health.pdf",SubmissionTest.Pdf)))).StatusCode);
            Assert.Equal(count,await db.Set<TransportRequest>().CountAsync());
            Assert.Empty(await db.Set<RequestHorse>().Where(h=>h.HorseID==horse).ToListAsync());
            Assert.Empty(await db.Set<MedicalRecord>().Where(h=>h.HorseID==horse).ToListAsync());
        }
        finally { await db.Database.ExecuteSqlRawAsync("DROP TRIGGER dbo.TestFailMedicalInsert;"); }
    }

    [Fact]
    public async Task Failed_submission_leaves_no_request_and_retries_compare_contacts_and_file_bytes()
    {
        using var factory = new ApiFactory(database); using var client = factory.Customer();
        var horse = await SubmissionTest.NewHorseAsync(database);
        var day = DateTime.UtcNow.AddDays(100).Date;
        var input = SubmissionTest.Input(day.ToString("yyyy-MM-dd"), day.AddDays(2).ToString("yyyy-MM-dd"), horse) with {
            Documents = [new("health.pdf", "HEALTH_CERTIFICATE", horse, "2099-01-01")] };
        await using var db = database.Context();
        var count = await db.Set<TransportRequest>().CountAsync();
        client.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/customer/requests", SubmissionTest.Body(input))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/customer/requests", SubmissionTest.Body(input,("health.pdf","not a valid file signature"u8.ToArray())))).StatusCode);
        Assert.Equal(count, await db.Set<TransportRequest>().CountAsync());
        var created = await client.PostAsync("/api/customer/requests", SubmissionTest.Body(input,("health.pdf",SubmissionTest.Pdf)));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var retry = await client.PostAsync("/api/customer/requests", SubmissionTest.Body(input,("health.pdf",SubmissionTest.Pdf)));
        Assert.Equal(HttpStatusCode.Created, retry.StatusCode);
        Assert.Equal(count+1, await db.Set<TransportRequest>().CountAsync());
        Assert.Equal(HttpStatusCode.Conflict,(await client.PostAsync("/api/customer/requests",SubmissionTest.Body(input with {
            Pickup=input.Pickup with { Phone="0901112223" } },("health.pdf",SubmissionTest.Pdf)))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict,(await client.PostAsync("/api/customer/requests",SubmissionTest.Body(input,("health.pdf","%PDF-1.7 altered attachment content"u8.ToArray())))).StatusCode);
        client.DefaultRequestHeaders.Remove("Idempotency-Key");client.DefaultRequestHeaders.Add("Idempotency-Key",Guid.NewGuid().ToString());
        Assert.Equal(HttpStatusCode.Conflict,(await client.PostAsync("/api/customer/requests",SubmissionTest.Body(input,("health.pdf",SubmissionTest.Pdf)))).StatusCode);
        Assert.Equal(count+1,await db.Set<TransportRequest>().CountAsync());
        using var json=JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var id=json.RootElement.GetProperty("data").GetProperty("id").GetString();
        Assert.Single(await db.Set<MedicalRecord>().Where(m=>m.RequestID==id).ToListAsync());
        Assert.Single(await db.Set<RequestHorse>().Where(m=>m.RequestID==id).ToListAsync());
    }

    [Fact]
    public void Swagger_exposes_multipart_submission_and_no_separate_submit_or_document_upload()
    {
        using var factory = new ApiFactory(database); using var client = factory.Customer();
        var swagger=factory.Services.GetRequiredService<ISwaggerProvider>().GetSwagger("v1");
        var post=swagger.Paths["/api/customer/requests"].Operations[Microsoft.OpenApi.Models.OperationType.Post];
        Assert.Single(post.RequestBody.Content);
        var schema=post.RequestBody.Content["multipart/form-data"].Schema;
        if(schema.Reference is not null)schema=swagger.Components.Schemas[schema.Reference.Id];
        Assert.Contains(schema.Properties.Keys,n=>n.Equals("data",StringComparison.OrdinalIgnoreCase));
        Assert.Contains(schema.Properties.Keys,n=>n.Equals("files",StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain("/api/customer/requests/{requestId}/submit",swagger.Paths.Keys);
        Assert.False(swagger.Paths.TryGetValue("/api/customer/requests/{requestId}/horses/{horseId}/documents",out var oldUpload)
            && oldUpload.Operations.ContainsKey(Microsoft.OpenApi.Models.OperationType.Post));
    }
}
