using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Infrastructure.Flow1.Data;
using Microsoft.EntityFrameworkCore;
using Domain.Flow1.Entities;
using Xunit;
namespace Flow1.Rebuild.Tests;
public sealed class ApiWorkflowTests(SqlFixture database) : IClassFixture<SqlFixture>
{
    private static async Task<JsonElement> Data(HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync(); Assert.True(response.IsSuccessStatusCode, $"{response.StatusCode}: {text}");
        return JsonDocument.Parse(text).RootElement.GetProperty("data").Clone();
    }
    [Fact] public async Task Runtime_uses_reviewed_routes_and_has_no_mock_or_manual_payment_endpoints()
    {
        using var factory = new ApiFactory(database); using var client = factory.Customer();
        await Data(await client.GetAsync("/api/customer/profile"));
        var routes = await Data(await client.GetAsync("/api/master/supported-routes")); Assert.Equal(3,routes.GetArrayLength());
        var options = await Data(await client.GetAsync("/api/customer/request-form-options?originCountry=VN&destinationCountry=JP&mode=AIR"));
        Assert.Equal(7,options.GetProperty("preparationDays").GetDecimal());
        Assert.Equal(HttpStatusCode.NotFound,(await client.PostAsJsonAsync("/api/customer/contracts/CONTRACT_001/mock-sign",new {})).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,(await client.PostAsJsonAsync("/api/manager/payments/PAYMENT_001/confirm",new {})).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,(await client.PostAsJsonAsync("/api/public/estimates/demo",new {})).StatusCode);
    }
    [Fact] public async Task Concurrent_create_retry_allocates_one_request_and_unknown_fields_are_rejected()
    {
        using var factory=new ApiFactory(database); using var client=factory.Customer();
        client.DefaultRequestHeaders.Add("Idempotency-Key",Guid.NewGuid().ToString());
        var input=new {origin="Hanoi",destination="Tokyo",originCountry="VN",destinationCountry="JP",mode="AIR",date=DateTime.UtcNow.AddDays(80).ToString("yyyy-MM-dd"),careInstructions="Care"};
        var responses=await Task.WhenAll(client.PostAsJsonAsync("/api/customer/requests",input),client.PostAsJsonAsync("/api/customer/requests",input));
        var first=await Data(responses[0]); var second=await Data(responses[1]);
        Assert.Equal(first.GetProperty("id").GetString(),second.GetProperty("id").GetString());
        var rejected=await client.PostAsJsonAsync("/api/customer/requests",new {origin="Hanoi",destination="Tokyo",originCountry="VN",destinationCountry="JP",mode="AIR",date="2026-12-20",careInstructions="Care",ownerId="USER_002"});
        Assert.Equal(HttpStatusCode.BadRequest,rejected.StatusCode);
        using var error=JsonDocument.Parse(await rejected.Content.ReadAsStringAsync());
        Assert.Equal("VALIDATION_ERROR",error.RootElement.GetProperty("errorCode").GetString());
    }
    [Fact] public void Every_openapi_route_has_exactly_one_runtime_action()
    {
        using var factory=new ApiFactory(database);using var client=factory.Customer();
        var source=Microsoft.Extensions.DependencyInjection.ServiceProviderServiceExtensions.GetRequiredService<Microsoft.AspNetCore.Routing.EndpointDataSource>(factory.Services);
        using var contract=JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Contract.json")));
        foreach(var path in contract.RootElement.GetProperty("paths").EnumerateObject())
        foreach(var operation in path.Value.EnumerateObject().Where(o=>new[]{"get","post","put","delete","patch"}.Contains(o.Name)))
        {
            var matches=source.Endpoints.OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>().Count(e=>
                e.RoutePattern.RawText?.Trim('/')==("api"+path.Name).Trim('/') &&
                (e.Metadata.GetMetadata<Microsoft.AspNetCore.Routing.HttpMethodMetadata>()?.HttpMethods.Contains(operation.Name.ToUpperInvariant())??false));
            Assert.True(matches==1,$"{operation.Name} {path.Name}: {matches} actions");
        }
    }
    [Fact] public async Task Wizard_profile_files_update_submit_and_free_text_revision_work()
    {
        using var factory=new ApiFactory(database);using var customer=factory.Customer();using var manager=factory.Manager();
        var horse=await Data(await customer.PostAsJsonAsync("/api/customer/horses",new {name="Wizard horse",breed="Arabian",sex="MARE",dob="2020-01-01",microchip="981"+DateTime.UtcNow.Ticks.ToString()[^12..],value="100000000",currency="VND",healthNotes="Sensitive to loud noises",
            passport=new {number="TEST-PASSPORT",authority="Test Authority",issueDate="2023-01-01",expiryDate="2035-01-01"}}));
        var horseId=horse.GetProperty("id").GetString()!;
        Assert.Equal("Sensitive to loud noises",horse.GetProperty("healthNotes").GetString());
        Assert.False(horse.TryGetProperty("conditions",out _));
        foreach(var kind in new[]{"photo","passport","ownership"})
        {
            using var body=new MultipartFormDataContent();
            var bytes=kind=="photo"?new byte[]{137,80,78,71,13,10,26,10,0,0,0,0,0,0,0,0}:System.Text.Encoding.UTF8.GetBytes("%PDF-1.7 fixture private document");
            body.Add(new ByteArrayContent(bytes),"file",kind+(kind=="photo"?".png":".pdf"));
            await Data(await customer.PostAsync($"/api/customer/horses/{horseId}/files/{kind}",body));
        }
        var date=DateTime.UtcNow.AddDays(70).ToString("yyyy-MM-dd");
        customer.DefaultRequestHeaders.Add("Idempotency-Key",Guid.NewGuid().ToString());
        var draft=await Data(await customer.PostAsJsonAsync("/api/customer/requests",new {origin="Hanoi",destination="Tokyo",originCountry="VN",destinationCountry="JP",mode="AIR",date,careInstructions="Care"}));
        var id=draft.GetProperty("id").GetString()!;
        Assert.Equal(JsonValueKind.Null, draft.GetProperty("requestedAt").ValueKind);
        Assert.Equal(JsonValueKind.Null, draft.GetProperty("submittedAt").ValueKind);
        Assert.Contains("submittedAt", draft.GetProperty("unsupportedFields").EnumerateArray().Select(x => x.GetString()));
        var update=new {origin="Hanoi",destination="Tokyo",originCountry="VN",destinationCountry="JP",mode="AIR",date,careInstructions="Care",
            pickup=new {name="Pickup",address="Hanoi",postal="100000",contact="Customer",phone="0901234567",notes="",latitude=21.02,longitude=105.8},
            delivery=new {name="Receiver",address="Tokyo",postal="1000000",contact="Receiver",phone="0907654321",notes="",latitude=35.6,longitude=139.7},horses=new[]{horseId},horseNotes=new Dictionary<string,string>{{horseId,"Gentle handling"}}};
        await Data(await customer.PutAsJsonAsync($"/api/customer/requests/{id}",update));
        string medicalUrl;
        using (var medicalBody = new MultipartFormDataContent())
        {
            medicalBody.Add(new StringContent("HEALTH_CERTIFICATE"), "documentType");
            medicalBody.Add(new ByteArrayContent(System.Text.Encoding.UTF8.GetBytes("%PDF-1.7 medical private fixture")), "file", "health.pdf");
            var medical = await Data(await customer.PostAsync($"/api/customer/requests/{id}/horses/{horseId}/documents", medicalBody));
            medicalUrl = medical.GetProperty("uploadedFileUrl").GetString()!;
            Assert.Equal("PENDING_REVIEW", medical.GetProperty("documentStatus").GetString());
        }
        var downloaded = await customer.GetAsync(medicalUrl);
        Assert.Equal("application/pdf", downloaded.Content.Headers.ContentType?.MediaType);
        Assert.True(downloaded.IsSuccessStatusCode);
        Assert.True((await manager.GetAsync($"/api/manager/requests/{id}/horses/{horseId}/documents/HEALTH_CERTIFICATE/file")).IsSuccessStatusCode);
        var detail = await Data(await customer.GetAsync($"/api/customer/requests/{id}"));
        Assert.Equal(5, detail.GetProperty("docs").GetArrayLength());
        Assert.Equal("Care",detail.GetProperty("careInstructions").GetString());
        Assert.False(detail.TryGetProperty("careNotes",out _));
        var savedHorse=await Data(await customer.GetAsync($"/api/customer/horses/{horseId}"));
        Assert.Equal("Sensitive to loud noises",savedHorse.GetProperty("healthNotes").GetString());
        var submitted=await Data(await customer.PostAsJsonAsync($"/api/customer/requests/{id}/submit",new {}));Assert.Equal("PENDING_REVIEW",submitted.GetProperty("status").GetString());
        await Data(await manager.PostAsJsonAsync($"/api/manager/requests/{id}/request-changes",new {feedback="Please update the pickup contact details."}));
        await Data(await customer.PutAsJsonAsync($"/api/customer/requests/{id}",update));
        await Data(await customer.PostAsJsonAsync($"/api/customer/requests/{id}/submit",new {}));
        using var other=factory.Customer();other.DefaultRequestHeaders.Remove("X-Test-Actor");other.DefaultRequestHeaders.Add("X-Test-Actor","USER_002");
        Assert.Equal(HttpStatusCode.NotFound,(await other.GetAsync($"/api/customer/requests/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,(await other.GetAsync(medicalUrl)).StatusCode);
    }
    [Fact] public async Task Deposit_ipn_terms_otp_activation_and_assignment_use_real_sql()
    {
        using var factory = new ApiFactory(database); using var customer = factory.Customer(); using var manager = factory.Manager();
        var date=DateTime.UtcNow.AddDays(40).Date;
        customer.DefaultRequestHeaders.Add("Idempotency-Key",Guid.NewGuid().ToString());
        var created=await Data(await customer.PostAsJsonAsync("/api/customer/requests",new { origin="Hanoi",destination="Tokyo",originCountry="VN",destinationCountry="JP",mode="AIR",date=date.ToString("yyyy-MM-dd"),careInstructions="Care" }));
        var id=created.GetProperty("id").GetString()!;
        // Test fixture advances a submitted request directly; submit validation has its own service tests.
        await using(var db=database.Context()) {var row=await db.Set<TransportRequest>().SingleAsync(x=>x.RequestID==id); row.Status="PENDING_REVIEW"; db.Add(new RequestHorse {RequestID=id,HorseID="HORSE_002"}); await db.SaveChangesAsync();}
        await Data(await manager.PostAsJsonAsync($"/api/manager/requests/{id}/accept",new {}));
        var draft=await Data(await manager.PutAsJsonAsync($"/api/manager/requests/{id}/contract-draft",new
        { arriveAt=date.AddDays(2).ToString("yyyy-MM-dd HH:mm"),departAt=date.ToString("yyyy-MM-dd HH:mm"),mode="AIR",depositPct=40,
          budget=new {TRANSPORT=100,PROCEDURE=100,VET=100,INSURANCE=100,STAFF=100},exception="",note="Includes listed charges",
          items=new[]{new {amount=1000000,desc="Transport and included services",required=true}},terms=new[]{new {title="Payment",text="Verified deposit before OTP; remaining amount follows handover."}} }));
        var contract=draft.GetProperty("contractId").GetString()!;
        await Data(await manager.PostAsJsonAsync($"/api/manager/requests/{id}/contract/publish",new {versionNo=1}));
        var published = await Data(await customer.GetAsync($"/api/customer/requests/{id}/contract"));
        var frozen = published.GetProperty("currentVersion").GetProperty("snapshot").GetRawText();
        Assert.True(published.GetProperty("currentVersion").GetProperty("snapshot").GetProperty("parties").TryGetProperty("provider", out _));
        Assert.DoesNotContain("INTERNAL_", frozen);
        await Data(await manager.PostAsJsonAsync($"/api/manager/contracts/{contract}/extend-deadline",new {versionNo=1,reason="Extend within preparation cutoff"}));
        var afterExtension = await Data(await customer.GetAsync($"/api/customer/requests/{id}/contract"));
        Assert.Equal(frozen,afterExtension.GetProperty("currentVersion").GetProperty("snapshot").GetRawText());
        await Data(await customer.PostAsJsonAsync($"/api/customer/contracts/{contract}/accept-terms",new {versionNo=1}));
        var deposit=await Data(await customer.GetAsync($"/api/customer/requests/{id}/deposit"));var invoice=deposit.GetProperty("invoiceId").GetString()!;
        var session=await Data(await customer.PostAsJsonAsync($"/api/customer/invoices/{invoice}/payment-session",new {method="VNPAY"}));
        var payment=session.GetProperty("id").GetString()!;
        var before=await customer.PostAsJsonAsync($"/api/customer/contracts/{contract}/sign-otp",new {versionNo=1});Assert.Equal(HttpStatusCode.Conflict,before.StatusCode);
        var payload=new Dictionary<string,string> { ["vnp_TmnCode"]="DEMO1234",["vnp_TxnRef"]=payment.Replace("_",""),["vnp_Amount"]="40000000",["vnp_CurrCode"]="VND",
            ["vnp_ResponseCode"]="00",["vnp_TransactionStatus"]="00",["vnp_TransactionNo"]="123456789",["vnp_PayDate"]=DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(7)).ToString("yyyyMMddHHmmss") };
        payload["vnp_SecureHash"]=factory.Gateway.Sign(payload);
        var query=string.Join("&",payload.Select(x=>Uri.EscapeDataString(x.Key)+"="+Uri.EscapeDataString(x.Value)));
        var ipn=await customer.GetFromJsonAsync<JsonElement>("/api/payments/vnpay/ipn?"+query);Assert.Equal("00",ipn.GetProperty("RspCode").GetString());
        var duplicate=await customer.GetFromJsonAsync<JsonElement>("/api/payments/vnpay/ipn?"+query);Assert.Equal("02",duplicate.GetProperty("RspCode").GetString());
        var cancellation = await Data(await customer.PostAsJsonAsync($"/api/customer/requests/{id}/cancel",new {reason="Request pre-signature cancellation"}));
        Assert.Equal("CANCELLATION_REQUESTED",cancellation.GetProperty("status").GetString());
        var rejected = await Data(await manager.PostAsJsonAsync($"/api/manager/contracts/{contract}/cancellation/decision",new {decision="REJECTED",reason="Customer agrees to continue transport"}));
        Assert.Equal("DEPOSIT_VERIFIED",rejected.GetProperty("status").GetString());
        Assert.Equal(HttpStatusCode.NotImplemented,(await customer.GetAsync($"/api/customer/payments/{payment}/receipt")).StatusCode);
        await Data(await customer.PostAsJsonAsync($"/api/customer/contracts/{contract}/sign-otp",new {versionNo=1}));
        var code=factory.Sender.Codes[contract];var wrong=code=="000000"?"111111":"000000";
        Assert.Equal(HttpStatusCode.BadRequest,(await customer.PostAsJsonAsync($"/api/customer/contracts/{contract}/sign",new {versionNo=1,otp=wrong})).StatusCode);
        await using(var db=database.Context()) Assert.Equal(1,(await db.Set<Contract>().SingleAsync(c=>c.ContractID==contract)).SignOtpFailedAttempts);
        var signed=await Data(await customer.PostAsJsonAsync($"/api/customer/contracts/{contract}/sign",new {versionNo=1,otp=code}));
        var trip=signed.GetProperty("tripId").GetString()!;Assert.Equal("ACTIVATED",signed.GetProperty("requestStatus").GetString());
        var retry=await Data(await customer.PostAsJsonAsync($"/api/customer/contracts/{contract}/sign",new {versionNo=1,otp=code}));Assert.Equal(trip,retry.GetProperty("tripId").GetString());
        await Data(await manager.PostAsJsonAsync($"/api/manager/trips/{trip}/assignment",new {specialistId="USER_005",coordinatorId="USER_006"}));
        await Data(await manager.PostAsJsonAsync($"/api/manager/trips/{trip}/hold",new {reason="Recheck readiness"}));
        await Data(await manager.PostAsJsonAsync($"/api/manager/trips/{trip}/resume",new {}));
        await using(var db=database.Context()) {Assert.Single(await db.Set<Trip>().Where(t=>t.RequestID==id).ToListAsync());Assert.Equal("EFFECTIVE",(await db.Set<Contract>().SingleAsync(c=>c.ContractID==contract)).ContractStatus);}
    }
}
