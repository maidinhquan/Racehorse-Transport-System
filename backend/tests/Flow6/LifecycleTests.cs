using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using Application.Flow6.Services;
using Flow1.Rebuild.Tests;
using Flow6.Tests.Support;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
namespace Flow6.Tests;
public sealed class LifecycleTests : IAsyncLifetime
{
    private readonly SqlFixture database=new();
    private ApiFactory factory=null!;
    public async Task InitializeAsync()
    {
        await database.InitializeAsync(); factory=new(database);
        await Sql("UPDATE CONTRACT_VERSION SET ContentSnapshot=N'{\"commercial\":{\"totalPrice\":145000000}}' WHERE ContractID='CONTRACT_003' AND VersionNo=1");
    }
    public async Task DisposeAsync(){factory.Dispose();await database.DisposeAsync();}
    private async Task Sql(string text)
    {await using var cn=new SqlConnection(database.Connection);await cn.OpenAsync();await using var cmd=new SqlCommand(text,cn);await cmd.ExecuteNonQueryAsync();}
    private HttpClient Driver(){var c=factory.CreateClient(new(){BaseAddress=new Uri("https://localhost")});c.DefaultRequestHeaders.Add("X-Test-Actor","USER_007");c.DefaultRequestHeaders.Add("X-Test-Role","DRIVER_ESCORT");return c;}
    private static async Task<JsonObject> Ok(HttpResponseMessage response)
    {var raw=await response.Content.ReadAsStringAsync();Assert.True(response.IsSuccessStatusCode,$"{response.StatusCode}: {raw}");return JsonNode.Parse(raw)!.AsObject();}
    private static JsonObject Content()=>JsonNode.Parse("""{"location":"TP HCM","receiver":{"name":"Receiver","phone":"0901234567","authorized":true,"otpEmail":"receiver@example.invalid"},"commonDocuments":null,"items":[{"horseId":"HORSE_001","microchipVerified":true,"condition":"Healthy on inspection","assets":"Lead rope","documents":null,"documentsReceivedAtUtc":null}]}""")!.AsObject();
    private static async Task<HttpResponseMessage> Post(HttpClient c,string path,JsonObject? body=null,string? key=null)
    {var req=new HttpRequestMessage(HttpMethod.Post,"/api/"+path);if(body is not null)req.Content=JsonContent.Create(body);if(key is not null)req.Headers.Add("Idempotency-Key",key);return await c.SendAsync(req);}
    [Fact]
    public async Task Delivery_cases_invoice_and_feedback_lifecycle_use_real_sql()
    {
        using var driver=Driver();using var customer=factory.Customer();using var manager=factory.Manager();
        var denied=await Post(driver,"operations/flow6/trips/TRIP_003/delivery",Content());Assert.Equal(HttpStatusCode.Conflict,denied.StatusCode);
        await Sql("UPDATE ROUTE_SEGMENT SET Status='COMPLETED',ActualTime=SYSUTCDATETIME() WHERE TripID='TRIP_003' AND SegmentType='DESTINATION'");
        var before=await Ok(await driver.GetAsync("/api/operations/flow6/trips/TRIP_003/context"));
        Assert.True(before["data"]!.AsObject().ContainsKey("deliveryHandoverId"));Assert.Null(before["data"]!["deliveryHandoverId"]);Assert.False(before["data"]!.AsObject().ContainsKey("deliveryId"));
        var created=await Ok(await Post(driver,"operations/flow6/trips/TRIP_003/delivery",Content()));var h=created["data"]!["id"]!.GetValue<string>();var r=created["data"]!["currentRevisionId"]!.GetValue<string>();
        var after=await Ok(await driver.GetAsync("/api/operations/flow6/trips/TRIP_003/context"));Assert.Equal(h,after["data"]!["deliveryHandoverId"]!.GetValue<string>());
        Assert.Equal(HttpStatusCode.NotFound,(await driver.GetAsync("/api/operations/flow6/trips/TRIP_002/context")).StatusCode);
        await Ok(await Post(driver,$"operations/flow6/revisions/{r}/otp"));
        var bad=await Post(driver,$"operations/flow6/revisions/{r}/confirm",new(){["otp"]="000000"});Assert.Equal(HttpStatusCode.BadRequest,bad.StatusCode);
        await using(var cn=new SqlConnection(database.Connection)){await cn.OpenAsync();await using var cmd=new SqlCommand("SELECT OtpFailedAttempts FROM HANDOVER_REVISION WHERE HandoverRevisionID=@r",cn);cmd.Parameters.AddWithValue("@r",r);Assert.Equal(1,Convert.ToInt32(await cmd.ExecuteScalarAsync()));}
        var confirmed=await Ok(await Post(driver,$"operations/flow6/revisions/{r}/confirm",new(){["otp"]=factory.Sender.Codes[r]}));Assert.Equal("DELIVERED",confirmed["data"]!["lifecycle"]!["requestStatus"]!.GetValue<string>());
        var list=await Ok(await customer.GetAsync("/api/customer/flow6/settlements"));var s=list["data"]!.AsArray().Single(x=>x!["tripId"]!.GetValue<string>()=="TRIP_003")!["id"]!.GetValue<string>();
        var key=Guid.NewGuid().ToString();var caseBody=new JsonObject{["type"]="COMPLAINT",["subject"]="Delivery question",["description"]="Explain the delivery condition"};
        var issue=await Ok(await Post(customer,$"customer/flow6/settlements/{s}/cases",caseBody,key));var cid=issue["data"]!["id"]!.GetValue<string>();
        var replay=await Ok(await Post(customer,$"customer/flow6/settlements/{s}/cases",caseBody,key));Assert.Equal(cid,replay["data"]!["id"]!.GetValue<string>());
        caseBody["subject"]="Changed";Assert.Equal(HttpStatusCode.Conflict,(await Post(customer,$"customer/flow6/settlements/{s}/cases",caseBody,key)).StatusCode);
        await Ok(await Post(manager,$"manager/flow6/cases/{cid}/start"));await Ok(await Post(manager,$"manager/flow6/cases/{cid}/resolve",new(){["resolution"]="Explained and checked"}));
        var invoice=await Ok(await Post(manager,$"manager/flow6/settlements/{s}/final-invoice",new(){["dueAtUtc"]=factory.Clock.Now.AddDays(3).UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ssZ")}));Assert.Equal(87000000,invoice["data"]!["totalVnd"]!.GetValue<decimal>());
        Assert.Equal(HttpStatusCode.Conflict,(await Post(manager,$"manager/flow6/settlements/{s}/settle")).StatusCode);
        var iid=invoice["data"]!["id"]!.GetValue<string>();
        var pay=await Ok(await Post(customer,$"customer/flow6/invoices/{iid}/payment-session"));Assert.NotNull(pay["data"]!["paymentUrl"]);
        Assert.Equal(HttpStatusCode.Conflict,(await Post(customer,$"customer/flow6/invoices/{iid}/payment-session")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict,(await Post(manager,$"manager/flow6/settlements/{s}/close")).StatusCode);
        var paymentUrl=pay["data"]!["paymentUrl"]!.GetValue<string>();
        var reference=Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(new Uri(paymentUrl).Query)["vnp_TxnRef"].ToString();
        var payload=new Dictionary<string,string>{["vnp_TmnCode"]="DEMO1234",["vnp_TxnRef"]=reference,["vnp_Amount"]="8700000000",["vnp_CurrCode"]="VND",["vnp_ResponseCode"]="00",["vnp_TransactionStatus"]="00",["vnp_TransactionNo"]=DateTime.UtcNow.Ticks.ToString(),["vnp_PayDate"]=factory.Clock.Now.ToOffset(TimeSpan.FromHours(7)).ToString("yyyyMMddHHmmss")};
        async Task<JsonNode> Ipn(bool valid=true)
        {
            payload["vnp_SecureHash"]=valid?factory.Gateway.Sign(payload):new string('0',128);
            var query=string.Join("&",payload.Select(x=>Uri.EscapeDataString(x.Key)+"="+Uri.EscapeDataString(x.Value)));
            var response=await customer.GetAsync("/api/payments/vnpay/ipn?"+query);return JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        }
        Assert.Equal("97",(await Ipn(false))["RspCode"]!.GetValue<string>());
        Assert.Equal("00",(await Ipn())["RspCode"]!.GetValue<string>());
        Assert.Equal("02",(await Ipn())["RspCode"]!.GetValue<string>());
        var settled=await Ok(await Post(manager,$"manager/flow6/settlements/{s}/settle"));Assert.Equal("SETTLED",settled["data"]!["status"]!.GetValue<string>());
        var started=settled["data"]!["feedbackStartsAtUtc"]!.GetValue<string>();
        await Ok(await Post(customer,$"customer/flow6/settlements/{s}/feedback",new(){["rating"]=5,["comment"]="Thank you"},Guid.NewGuid().ToString()));
        Assert.Equal(HttpStatusCode.Conflict,(await Post(customer,$"customer/flow6/settlements/{s}/feedback",new(){["rating"]=4,["comment"]=null},Guid.NewGuid().ToString())).StatusCode);
        factory.Clock.Now=factory.Clock.Now.AddHours(1);
        var c2=await Ok(await Post(customer,$"customer/flow6/settlements/{s}/cases",new(){["type"]="COMPLAINT",["subject"]="After settlement",["description"]="Question during feedback period"},Guid.NewGuid().ToString()));var c2id=c2["data"]!["id"]!.GetValue<string>();
        await Ok(await Post(manager,$"manager/flow6/cases/{c2id}/start"));
        factory.Clock.Now=factory.Clock.Now.AddHours(1);
        await Ok(await Post(manager,$"manager/flow6/cases/{c2id}/resolve",new(){["resolution"]="Resolved by manager"}));
        var restarted=await Ok(await Post(manager,$"manager/flow6/settlements/{s}/restart-feedback-window"));var newStart=restarted["data"]!["feedbackStartsAtUtc"]!.GetValue<string>();Assert.NotEqual(started,newStart);
        factory.Clock.Now=factory.Clock.Now.AddHours(1);
        var retry=await Ok(await Post(manager,$"manager/flow6/settlements/{s}/restart-feedback-window"));Assert.Equal(newStart,retry["data"]!["feedbackStartsAtUtc"]!.GetValue<string>());
        factory.Clock.Now=factory.Clock.Now.AddHours(24);
        using(var scope=factory.Services.CreateScope())Assert.Equal(1,await scope.ServiceProvider.GetRequiredService<AftercareService>().CloseDue(CancellationToken.None));
        var closed=await Ok(await Post(manager,$"manager/flow6/settlements/{s}/close"));Assert.Equal("CLOSED",closed["data"]!["lifecycle"]!["requestStatus"]!.GetValue<string>());

    }
    [Fact]
    public async Task Customer_ownership_closed_support_and_strict_json_are_enforced()
    {
        using var customer=factory.Customer();using var manager=factory.Manager();
        Assert.Equal(HttpStatusCode.NotFound,(await customer.GetAsync("/api/customer/flow6/settlements/SETTLEMENT_002")).StatusCode);
        var body=new JsonObject{["type"]="SUPPORT",["subject"]="Copy of paperwork",["description"]="Please explain the delivery documents"};
        var result=await Ok(await Post(customer,"customer/flow6/settlements/SETTLEMENT_001/cases",body,Guid.NewGuid().ToString()));Assert.Equal("OPEN",result["data"]!["status"]!.GetValue<string>());
        body["type"]="COMPLAINT";Assert.Equal(HttpStatusCode.Conflict,(await Post(customer,"customer/flow6/settlements/SETTLEMENT_001/cases",body,Guid.NewGuid().ToString())).StatusCode);
        body["actor"]="USER_004";Assert.Equal(HttpStatusCode.BadRequest,(await Post(customer,"customer/flow6/settlements/SETTLEMENT_001/cases",body,Guid.NewGuid().ToString())).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,(await Post(customer,"manager/flow6/settlements/SETTLEMENT_001/close")).StatusCode);
    }
    private async Task<(string Settlement,string Revision)> NewDelivery(HttpClient driver,HttpClient customer)
    {
        await Sql("UPDATE ROUTE_SEGMENT SET Status='COMPLETED',ActualTime=SYSUTCDATETIME() WHERE TripID='TRIP_003' AND SegmentType='DESTINATION'");
        var created=await Ok(await Post(driver,"operations/flow6/trips/TRIP_003/delivery",Content()));var r=created["data"]!["currentRevisionId"]!.GetValue<string>();
        await Ok(await Post(driver,$"operations/flow6/revisions/{r}/otp"));
        await Ok(await Post(driver,$"operations/flow6/revisions/{r}/confirm",new(){["otp"]=factory.Sender.Codes[r]}));
        var list=await Ok(await customer.GetAsync("/api/customer/flow6/settlements"));var id=list["data"]!.AsArray().Single(x=>x!["tripId"]!.GetValue<string>()=="TRIP_003")!["id"]!.GetValue<string>();return(id,r);
    }
    [Fact]
    public async Task Adjustments_replace_only_unpaid_invoice_and_replay_never_duplicates()
    {
        using var driver=Driver();using var customer=factory.Customer();using var manager=factory.Manager();
        var (s,r)=await NewDelivery(driver,customer);
        foreach(var route in new[]{"context","pickup-baseline","health-logs","incidents"})await Ok(await driver.GetAsync($"/api/operations/flow6/trips/TRIP_003/{route}"));
        var due=new JsonObject{["dueAtUtc"]=factory.Clock.Now.AddDays(3).UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ssZ")};
        var invoice=await Ok(await Post(manager,$"manager/flow6/settlements/{s}/final-invoice",due));
        var b=new JsonObject{["type"]="CHARGE",["amountVnd"]=100000,["reason"]="Agreed extra service",["decisionReason"]="Manager decision"};var key=Guid.NewGuid().ToString();
        var adjust=await Ok(await Post(manager,$"manager/flow6/settlements/{s}/adjustments",b,key));
        var same=await Ok(await Post(manager,$"manager/flow6/settlements/{s}/adjustments",b,key));Assert.Equal(adjust["data"]!["id"]!.GetValue<string>(),same["data"]!["id"]!.GetValue<string>());
        var changed=await Ok(await Post(manager,$"manager/flow6/settlements/{s}/final-invoice",due));Assert.Equal(87100000,changed["data"]!["totalVnd"]!.GetValue<decimal>());
        var again=await Ok(await Post(manager,$"manager/flow6/settlements/{s}/final-invoice",due));Assert.Equal(changed["data"]!["id"]!.GetValue<string>(),again["data"]!["id"]!.GetValue<string>());
        var paidId=changed["data"]!["id"]!.GetValue<string>();var session=await Ok(await Post(customer,$"customer/flow6/invoices/{paidId}/payment-session"));var payment=session["data"]!["paymentId"]!.GetValue<string>();
        Assert.Equal(HttpStatusCode.NotFound,(await customer.GetAsync($"/api/customer/payments/{payment}")).StatusCode);
        await Ok(await Post(manager,$"manager/flow6/settlements/{s}/adjustments",b,Guid.NewGuid().ToString()));
        Assert.Equal(HttpStatusCode.Conflict,(await Post(manager,$"manager/flow6/settlements/{s}/final-invoice",due)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,(await Post(manager,$"manager/flow6/settlements/{s}/settle",new JsonObject())).StatusCode);
    }
    [Fact]
    public async Task Concurrent_draft_creation_commits_exactly_one_and_refused_revision_is_immutable()
    {
        using var driver=Driver();
        await Sql("UPDATE ROUTE_SEGMENT SET Status='COMPLETED',ActualTime=SYSUTCDATETIME() WHERE TripID='TRIP_003' AND SegmentType='DESTINATION'");
        var pair=await Task.WhenAll(Post(driver,"operations/flow6/trips/TRIP_003/delivery",Content()),Post(driver,"operations/flow6/trips/TRIP_003/delivery",Content()));
        Assert.Single(pair,x=>x.IsSuccessStatusCode);Assert.Single(pair,x=>x.StatusCode==HttpStatusCode.Conflict);
        var created=await Ok(pair.Single(x=>x.IsSuccessStatusCode));var h=created["data"]!["id"]!.GetValue<string>();var r=created["data"]!["currentRevisionId"]!.GetValue<string>();
        await Ok(await Post(driver,$"operations/flow6/revisions/{r}/refuse",new(){["reason"]="Receiver asked for another inspection"}));
        var next=await Ok(await Post(driver,$"operations/flow6/handovers/{h}/revisions",Content(),Guid.NewGuid().ToString()));Assert.Equal(2,next["data"]!["number"]!.GetValue<int>());
        Assert.Equal(HttpStatusCode.Conflict,(await Post(driver,$"operations/flow6/revisions/{r}/confirm",new(){["otp"]="123456"})).StatusCode);
    }

    [Theory]
    [InlineData(false,"04")]
    [InlineData(true,"00")]
    public async Task Wrong_amount_never_credits_and_expired_success_is_retained_for_reconciliation(bool expired,string code)
    {
        using var driver=Driver();using var customer=factory.Customer();using var manager=factory.Manager();var(s,r)=await NewDelivery(driver,customer);
        var invoice=await Ok(await Post(manager,$"manager/flow6/settlements/{s}/final-invoice",new(){["dueAtUtc"]=factory.Clock.Now.AddDays(2).UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ssZ")}));var iid=invoice["data"]!["id"]!.GetValue<string>();
        var pay=await Ok(await Post(customer,$"customer/flow6/invoices/{iid}/payment-session"));var pid=pay["data"]!["paymentId"]!.GetValue<string>();var url=pay["data"]!["paymentUrl"]!.GetValue<string>();var reference=Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(new Uri(url).Query)["vnp_TxnRef"].ToString();
        var paidDate=factory.Clock.Now.ToOffset(TimeSpan.FromHours(7)).ToString("yyyyMMddHHmmss");if(expired)factory.Clock.Now=factory.Clock.Now.AddMinutes(20);
        var payload=new Dictionary<string,string>{["vnp_TmnCode"]="DEMO1234",["vnp_TxnRef"]=reference,["vnp_Amount"]=expired?"8700000000":"10000",["vnp_CurrCode"]="VND",["vnp_ResponseCode"]="00",["vnp_TransactionStatus"]="00",["vnp_TransactionNo"]=DateTime.UtcNow.Ticks.ToString(),["vnp_PayDate"]=paidDate};payload["vnp_SecureHash"]=factory.Gateway.Sign(payload);
        var query=string.Join("&",payload.Select(x=>Uri.EscapeDataString(x.Key)+"="+Uri.EscapeDataString(x.Value)));var response=await customer.GetAsync("/api/payments/vnpay/ipn?"+query);var ipn=JsonNode.Parse(await response.Content.ReadAsStringAsync())!;Assert.Equal(code,ipn["RspCode"]!.GetValue<string>());
        var p=await Ok(await customer.GetAsync($"/api/customer/flow6/payments/{pid}"));Assert.Equal(expired,p["data"]!["financialReviewRequired"]!.GetValue<bool>());Assert.Equal(expired?"SUCCESS":"PENDING_GATEWAY",p["data"]!["status"]!.GetValue<string>());
        Assert.Equal(HttpStatusCode.Conflict,(await Post(manager,$"manager/flow6/settlements/{s}/settle")).StatusCode);
    }

    [Fact]
    public void Swagger_exposes_all_48_routes_and_explicit_request_schemas()
    {
        using var scope=factory.Services.CreateScope();var swagger=scope.ServiceProvider.GetRequiredService<Swashbuckle.AspNetCore.Swagger.ISwaggerProvider>().GetSwagger("v1");
        var operations=swagger.Paths.SelectMany(p=>p.Value.Operations.Values).Where(o=>o.OperationId?.StartsWith("F6-")==true).ToArray();Assert.Equal(48,operations.Length);
        Assert.Equal(11,operations.SelectMany(o=>o.Tags).Select(t=>t.Name).Distinct().Count());
        Assert.All(operations,o=>{Assert.Single(o.Tags);Assert.StartsWith("Flow 6 · ",o.Tags[0].Name);Assert.True(o.Extensions.ContainsKey("x-flow-order"));});
        Assert.Equal(48,operations.Select(o=>((Microsoft.OpenApi.Any.OpenApiInteger)o.Extensions["x-flow-order"]).Value).Distinct().Count());
        var tags=swagger.Tags.Where(t=>t.Name.StartsWith("Flow 6 · ",StringComparison.Ordinal)).ToArray();Assert.Equal(11,tags.Length);
        Assert.Equal(tags.Select(t=>t.Name).OrderBy(x=>x,StringComparer.Ordinal),tags.Select(t=>t.Name));
        Assert.All(tags,t=>Assert.False(string.IsNullOrWhiteSpace(t.Description)));
        Assert.Contains("03.",operations.Single(o=>o.OperationId=="F6-J09").Tags[0].Name);
        Assert.Contains("09.",operations.Single(o=>o.OperationId=="F6-J29").Tags[0].Name);
        Assert.Contains("11.",operations.Single(o=>o.OperationId=="F6-J37").Tags[0].Name);

        Assert.Equal("Flow6_DeliveryContent",operations.Single(o=>o.OperationId=="F6-J03").RequestBody.Content["application/json"].Schema.Reference.Id);
        Assert.Contains("IN_PROGRESS",swagger.Components.Schemas["Flow6_Lifecycle"].Properties["requestStatus"].Enum.Select(x=>((Microsoft.OpenApi.Any.OpenApiString)x).Value));
    }

    [Fact]
    public async Task No_new_tables_and_simultaneous_retries_create_one_case_with_access_rechecked()
    {
        using var driver=Driver();using var customer=factory.Customer();
        var(s,r)=await NewDelivery(driver,customer);
        await using(var cn=new SqlConnection(database.Connection))
        {
            await cn.OpenAsync();await using var cmd=new SqlCommand("SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped=0",cn);
            Assert.Equal(43,Convert.ToInt32(await cmd.ExecuteScalarAsync()));
        }
        var body=new JsonObject{["type"]="COMPLAINT",["subject"]="Check delivery",["description"]="Please check the handover"};var key=Guid.NewGuid().ToString();
        var pair=await Task.WhenAll(Post(customer,$"customer/flow6/settlements/{s}/cases",body.DeepClone().AsObject(),key),Post(customer,$"customer/flow6/settlements/{s}/cases",body.DeepClone().AsObject(),key));
        var first=await Ok(pair[0]);var second=await Ok(pair[1]);Assert.Equal(first["data"]!["id"]!.GetValue<string>(),second["data"]!["id"]!.GetValue<string>());
        await Sql("UPDATE [USER] SET IsActive=0 WHERE UserID='USER_001'");
        Assert.Equal(HttpStatusCode.Forbidden,(await Post(customer,$"customer/flow6/settlements/{s}/cases",body,key)).StatusCode);
    }
    [Fact]
    public async Task Failed_command_is_not_cached_and_same_key_can_retry_after_invoice_is_issued()
    {
        using var driver=Driver();using var customer=factory.Customer();using var manager=factory.Manager();
        var(s,r)=await NewDelivery(driver,customer);
        var b=new JsonObject{["type"]="CHARGE",["amountVnd"]=100000,["reason"]="Agreed extra service",["decisionReason"]="Manager decision"};var key=Guid.NewGuid().ToString();
        Assert.Equal(HttpStatusCode.Conflict,(await Post(manager,$"manager/flow6/settlements/{s}/adjustments",b,key)).StatusCode);
        await Ok(await Post(manager,$"manager/flow6/settlements/{s}/final-invoice",new(){["dueAtUtc"]=factory.Clock.Now.AddDays(3).UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ssZ")}));
        var created=await Ok(await Post(manager,$"manager/flow6/settlements/{s}/adjustments",b,key));
        var replay=await Ok(await Post(manager,$"manager/flow6/settlements/{s}/adjustments",b,key));Assert.Equal(created["data"]!["id"]!.GetValue<string>(),replay["data"]!["id"]!.GetValue<string>());
    }
    [Fact]
    public async Task Restarted_runtime_still_checks_existing_revision_sent_time_and_failed_attempts()
    {
        using var driver=Driver();
        await Sql("UPDATE ROUTE_SEGMENT SET Status='COMPLETED',ActualTime=SYSUTCDATETIME() WHERE TripID='TRIP_003' AND SegmentType='DESTINATION'");
        var created=await Ok(await Post(driver,"operations/flow6/trips/TRIP_003/delivery",Content()));var r=created["data"]!["currentRevisionId"]!.GetValue<string>();
        await Ok(await Post(driver,$"operations/flow6/revisions/{r}/otp"));
        using var scope=factory.Services.CreateScope();using var fresh=new Infrastructure.Flow6.Runtime.MemoryGuards(factory.Clock);
        var service=ActivatorUtilities.CreateInstance<AftercareService>(scope.ServiceProvider,fresh);
        var error=await Assert.ThrowsAsync<AftercareException>(()=>service.Invoke("F6-J07","USER_007",r,null,"","127.0.0.1",CancellationToken.None));Assert.Equal("OTP_RESEND_TOO_SOON",error.Code);
        var wrong=factory.Sender.Codes[r]=="000000"?"111111":"000000";
        await Assert.ThrowsAsync<AftercareException>(()=>service.Invoke("F6-J09","USER_007",r,new JsonObject{["otp"]=wrong},"","127.0.0.1",CancellationToken.None));
        await using var cn=new SqlConnection(database.Connection);await cn.OpenAsync();await using var cmd=new SqlCommand("SELECT OtpFailedAttempts FROM HANDOVER_REVISION WHERE HandoverRevisionID=@r",cn);cmd.Parameters.AddWithValue("@r",r);Assert.Equal(1,Convert.ToInt32(await cmd.ExecuteScalarAsync()));
    }

}
