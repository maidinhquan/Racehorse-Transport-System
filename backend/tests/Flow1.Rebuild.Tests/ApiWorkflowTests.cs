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
        await SubmissionTest.ReadyHorseAsync(database);
        var input=new {origin="Hanoi",destination="Tokyo",originCountry="VN",destinationCountry="JP",mode="AIR",expectedTransportDate=DateTime.UtcNow.AddDays(80).ToString("yyyy-MM-dd"),expectedDeliveryDate=DateTime.UtcNow.AddDays(82).ToString("yyyy-MM-dd"),careInstructions="Care"};
        var responses=await Task.WhenAll(client.PostAsync("/api/customer/requests", SubmissionTest.Body(input)),client.PostAsync("/api/customer/requests", SubmissionTest.Body(input)));
        var first=await Data(responses[0]); var second=await Data(responses[1]);
        Assert.Equal(first.GetProperty("id").GetString(),second.GetProperty("id").GetString());
        var rejected=await client.PostAsync("/api/customer/requests", SubmissionTest.Body(new {origin="Hanoi",destination="Tokyo",originCountry="VN",destinationCountry="JP",mode="AIR",expectedTransportDate="2026-12-20",expectedDeliveryDate="2026-12-22",careInstructions="Care",ownerId="USER_002"}));
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
            if (path.Name.EndsWith("/submit") || operation.Name == "post" && path.Name.EndsWith("/horses/{horseId}/documents")) continue;
            var matches=source.Endpoints.OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>().Count(e=>
                e.RoutePattern.RawText?.Trim('/')==("api"+path.Name).Trim('/') &&
                (e.Metadata.GetMetadata<Microsoft.AspNetCore.Routing.HttpMethodMetadata>()?.HttpMethods.Contains(operation.Name.ToUpperInvariant())??false));
            Assert.True(matches==1,$"{operation.Name} {path.Name}: {matches} actions");
        }
    }
    [Fact] public async Task One_step_submission_includes_documents_and_put_resubmits_returned_requests()
    {
        using var factory=new ApiFactory(database); using var customer=factory.Customer(); using var manager=factory.Manager();
        var horse=await Data(await customer.PostAsJsonAsync("/api/customer/horses",new {name="Wizard horse",breed="Arabian",sex="MARE",dob="2020-01-01",microchip="981"+DateTime.UtcNow.Ticks.ToString()[^12..],value="100000000",currency="VND",healthNotes="Sensitive to loud noises",
            passport=new {number="TEST-PASSPORT",authority="Test Authority",issueDate="2023-01-01",expiryDate="2035-01-01"}}));
        var horseId=horse.GetProperty("id").GetString()!;
        Assert.Equal(JsonValueKind.Null, horse.GetProperty("valueProof").ValueKind);
        foreach(var kind in new[]{"photo","passport","ownership","value-proof"})
        {
            using var body=new MultipartFormDataContent();
            var bytes=kind=="photo"?new byte[]{137,80,78,71,13,10,26,10,0,0,0,0,0,0,0,0}:SubmissionTest.Pdf;
            body.Add(new ByteArrayContent(bytes),"file",kind+(kind=="photo"?".png":".pdf"));
            await Data(await customer.PostAsync($"/api/customer/horses/{horseId}/files/{kind}",body));
        }
        var savedHorse = await Data(await customer.GetAsync($"/api/customer/horses/{horseId}"));
        var proof = savedHorse.GetProperty("valueProof");
        Assert.Equal("value-proof.pdf", proof.GetProperty("name").GetString());
        var proofUrl = proof.GetProperty("url").GetString()!;
        Assert.Equal($"/api/customer/horses/{horseId}/files/value-proof", proofUrl);
        Assert.Equal(SubmissionTest.Pdf, await customer.GetByteArrayAsync(proofUrl));
        var horseList = await Data(await customer.GetAsync("/api/customer/horses"));
        Assert.Equal(proofUrl, horseList.EnumerateArray().Single(h => h.GetProperty("id").GetString() == horseId)
            .GetProperty("valueProof").GetProperty("url").GetString());
        var date=DateTime.UtcNow.AddDays(70).Date;
        var input=SubmissionTest.Input(date.ToString("yyyy-MM-dd"),date.AddDays(2).ToString("yyyy-MM-dd"),horseId) with {
            HorseNotes=new Dictionary<string,string>{{horseId,"Gentle handling"}},
            Documents=[new("competition.pdf","COMPETITION_REGISTRATION","2034-01-01"),new("invitation.pdf","INVITATION_LETTER")] };
        customer.DefaultRequestHeaders.Add("Idempotency-Key",Guid.NewGuid().ToString());
        var submitted=await Data(await customer.PostAsync("/api/customer/requests",SubmissionTest.Body(input,("competition.pdf",SubmissionTest.Pdf),("invitation.pdf",SubmissionTest.Pdf))));
        var id=submitted.GetProperty("id").GetString()!;
        Assert.Equal("PENDING_REVIEW",submitted.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.String,submitted.GetProperty("createdAt").ValueKind);
        Assert.Equal(HttpStatusCode.NotFound,(await customer.PostAsJsonAsync($"/api/customer/requests/{id}/submit",new {})).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict,(await customer.PutAsync($"/api/customer/requests/{id}",SubmissionTest.Body(input,("competition.pdf",SubmissionTest.Pdf),("invitation.pdf",SubmissionTest.Pdf)))).StatusCode);
        var detail=await Data(await customer.GetAsync($"/api/customer/requests/{id}"));
        var document=detail.GetProperty("docs").EnumerateArray().Single(d=>d.GetProperty("key").GetString()=="COMPETITION_REGISTRATION");
        Assert.Equal("application/pdf",(await customer.GetAsync(document.GetProperty("file").GetProperty("url").GetString())).Content.Headers.ContentType?.MediaType);
        Assert.True((await manager.GetAsync($"/api/manager/requests/{id}/shared-documents/INVITATION_LETTER")).IsSuccessStatusCode);
        await Data(await manager.PostAsJsonAsync($"/api/manager/requests/{id}/request-changes",new {feedback="Please update the pickup contact details."}));
        var revised=input with { Documents=null, Pickup=input.Pickup with { Contact="Updated customer" } };
        var result=await Data(await customer.PutAsync($"/api/customer/requests/{id}",SubmissionTest.Body(revised)));
        Assert.Equal("PENDING_REVIEW",result.GetProperty("status").GetString());
        var reloaded=await Data(await customer.GetAsync($"/api/customer/requests/{id}"));
        Assert.Equal(submitted.GetProperty("createdAt").GetString(),reloaded.GetProperty("createdAt").GetString());
        Assert.Single(reloaded.GetProperty("docs").EnumerateArray(),d=>d.GetProperty("key").GetString()=="COMPETITION_REGISTRATION");
        using var other=factory.Customer(); other.DefaultRequestHeaders.Remove("X-Test-Actor");other.DefaultRequestHeaders.Add("X-Test-Actor","USER_002");
        Assert.Equal(HttpStatusCode.NotFound,(await other.GetAsync($"/api/customer/requests/{id}/shared-documents/INVITATION_LETTER")).StatusCode);
        await Data(await manager.PostAsJsonAsync($"/api/manager/requests/{id}/reject",new {reason="Cannot serve this route"}));
        Assert.Equal(HttpStatusCode.Conflict,(await customer.PutAsync($"/api/customer/requests/{id}",SubmissionTest.Body(revised))).StatusCode);
    }
    [Fact] public async Task Deposit_ipn_terms_otp_activation_and_assignment_use_real_sql()
    {
        using var factory = new ApiFactory(database); using var customer = factory.Customer(); using var manager = factory.Manager();
        var date=DateTime.UtcNow.AddDays(40).Date;
        customer.DefaultRequestHeaders.Add("Idempotency-Key",Guid.NewGuid().ToString());
        await SubmissionTest.ReadyHorseAsync(database, "HORSE_002");
        var created=await Data(await customer.PostAsync("/api/customer/requests", SubmissionTest.Body(new { origin="Hanoi",destination="Tokyo",originCountry="VN",destinationCountry="JP",mode="AIR",expectedTransportDate=date.ToString("yyyy-MM-dd"),expectedDeliveryDate=date.AddDays(2).ToString("yyyy-MM-dd"),careInstructions="Care",horses=new[]{"HORSE_002"} })));
        var id=created.GetProperty("id").GetString()!;
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
