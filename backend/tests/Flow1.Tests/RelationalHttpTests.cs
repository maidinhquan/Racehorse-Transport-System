using Microsoft.Extensions.Configuration;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Application.DTOs;
using Application.DTOs.Flow1;
using Application.Flow1.Interfaces;
using Infrastructure.Data.Context;
using Infrastructure.ExternalServices.Flow1;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace Flow1.Tests;

internal sealed class RelationalHttpFactory(RelationalFlow1Tests.Fixture fixture,string? connection=null):WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_,c)=>c.AddInMemoryCollection(new Dictionary<string,string?> { ["Jwt:Key"]="Fixture_Only_Not_A_Real_Secret_2026_AtLeast32Bytes" }));
        builder.ConfigureServices(s=>{
            s.RemoveAll<DbContextOptions<Flow1RelationalContext>>();s.RemoveAll<Flow1RelationalContext>();
            s.AddDbContext<Flow1RelationalContext>(o=>o.UseSqlServer(connection??fixture.Db.ConnectionString));
            s.RemoveAll<DbContextOptions<HorseTransportDbContext>>();s.RemoveAll<HorseTransportDbContext>();s.AddDbContext<HorseTransportDbContext>(o=>o.UseSqlServer(connection??fixture.Db.ConnectionString));
            s.RemoveAll<TimeProvider>();s.AddSingleton<TimeProvider>(fixture.Time);
            s.AddSingleton<IPrivateFiles>(fixture.Storage);s.AddSingleton<IDocumentGenerator>(fixture.Renderer);
            s.AddSingleton<IOtpSender>(fixture.Email);s.AddSingleton<IOtpSecurity>(new ContractOtpSecurity("fixture-contract-otp-hmac-key-at-least32bytes"));
            s.RemoveAll<Flow1VnpayOptions>();s.AddSingleton(fixture.Vnpay);
            s.AddSingleton<IPaymentGateway>(new VnpaySandboxGateway(fixture.Vnpay,fixture.Time));
            s.AddSingleton<IGatewayQuery>(new NoNetworkQuery());
            var maps=new RelationalFlow1Tests.Maps();s.AddSingleton<IRoadRouter>(maps);s.AddSingleton<ILocationVerifier>(maps);
            s.AddSingleton(new Application.Common.Flow1.Flow1EstimateOptions{StandardVehicleCapacityStalls=1});
            s.AddSingleton(new Application.Common.Flow1.Flow1ContractOptions{Issuer=new(){["COMPANY_NAME"]="Fixture issuer",["COMPANY_ADDRESS"]="Fixture address",["COMPANY_EMAIL"]="issuer@example.invalid",["COMPANY_HOTLINE"]="0900000000",["COMPANY_TAX_CODE"]="FIXTURE",["COMPANY_BANK_ACCOUNT"]="FIXTURE",["COMPANY_BANK_NAME"]="FIXTURE",["COMPANY_REPRESENTATIVE"]="Fixture representative",["COMPANY_REP_POSITION"]="Fixture manager"}});
            s.AddAuthentication(o=>{o.DefaultAuthenticateScheme="RelationalTest";o.DefaultChallengeScheme="RelationalTest";o.DefaultForbidScheme="RelationalTest";}).AddScheme<AuthenticationSchemeOptions,CustomerTestAuth>("RelationalTest",_=>{});
        });
    }
    private sealed class NoNetworkQuery:IGatewayQuery
    {public Task<GatewayQueryResult> QueryAsync(GatewayQueryRequest request,CancellationToken ct)=>throw new Application.Common.Exceptions.BusinessRuleException("Fixture query unavailable; no external request.",503,"VNPAY_QUERY_UNAVAILABLE");}
    public HttpClient Client(string? actor="owner",string role="CUSTOMER")
    {var c=CreateClient(new(){BaseAddress=new("https://localhost"),AllowAutoRedirect=false});if(actor is not null)c.DefaultRequestHeaders.Add("X-Test-Owner",actor);c.DefaultRequestHeaders.Add("X-Test-Role",role);return c;}
}
public sealed class RelationalHttpTests
{
    private static async Task<T> Read<T>(HttpResponseMessage response)
    {var text=await response.Content.ReadAsStringAsync();Assert.True(response.IsSuccessStatusCode,text);return JsonSerializer.Deserialize<ApiResponse<T>>(text,new JsonSerializerOptions(JsonSerializerDefaults.Web))!.Data!;}
    private static async Task<T> Post<T>(HttpClient c,string url,object data,string? key=null)
    {using var r=new HttpRequestMessage(HttpMethod.Post,url){Content=JsonContent.Create(data)};if(key is not null)r.Headers.Add("Idempotency-Key",key);return await Read<T>(await c.SendAsync(r));}
    [LocalSqlFact]
    public async Task Full_typed_http_chain_uses_only_current_schema_and_retired_routes_are_not_exposed()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();using var app=new RelationalHttpFactory(f);using var customer=app.Client();using var manager=app.Client("manager","LOGISTICS_MANAGER");
        using var horseRequest=new HttpRequestMessage(HttpMethod.Post,"/api/customer/horses"){Content=CustomerTransportTests.HorseBody()};horseRequest.Headers.Add("Idempotency-Key","http-horse-key");
        var h=await Read<FlowHorseCard>(await customer.SendAsync(horseRequest));
        var trip=new EstimateInput(new("A",10,106,"VN"),new("B",11,107,"VN"),"ROAD",1,new(2026,11,20));
        var input=new FlowRequestInput(trip,new(2026,11,20,3,0,0,TimeSpan.Zero),new(2026,11,21,3,0,0,TimeSpan.Zero),"Race",new("Sender","0900000000"),new("Receiver","0900000001"),[new(h.HorseId,h.Version)]);
        var r=await Post<FlowRequestCard>(customer,"/api/customer/requests",input,"http-request-key");
        Assert.NotNull(r.Input);Assert.Equal(input.PickupContact,r.Input.PickupContact);Assert.Equal("Fixture, not live maps",r.MapAttribution);
        r=await Post<FlowRequestCard>(manager,$"/api/manager/requests/{r.RequestId}/accept",new FlowAction(r.Version,"Accepted"));
        using var manager2=app.Client("manager2","LOGISTICS_MANAGER");
        var shared=await Read<FlowRequestCard[]>(await manager2.GetAsync("/api/manager/requests"));
        Assert.Contains(shared,x=>x.RequestId==r.RequestId);
        var c=await Post<FlowContractCard>(manager2,$"/api/manager/requests/{r.RequestId}/contracts",new FlowAction(r.Version,Price:100000000,Costs:CustomerTransportTests.Quote(100000000),PreparationDays:2,Deadline:f.Time.Value.AddDays(2)),"http-contract-key");
        c=await Post<FlowContractCard>(manager,$"/api/manager/contracts/{c.ContractId}/publish",new FlowAction(c.Version,ClauseIds:[f.ClauseId]));
        Assert.Equal("no-store",(await customer.GetAsync($"/api/customer/contracts/{c.ContractId}/pdf")).Headers.CacheControl?.ToString());
        var session=await Post<JsonElement>(customer,$"/api/customer/contracts/{c.ContractId}/vnpay",new{},"http-payment-key");var payment=session.GetProperty("paymentId").GetString()!;
        Assert.StartsWith("https://sandbox.vnpayment.vn/",session.GetProperty("paymentUrl").GetString());
        var query=string.Join('&',f.Callback(payment).Select(x=>Uri.EscapeDataString(x.Key)+"="+Uri.EscapeDataString(x.Value)));
        var ipn=await customer.GetFromJsonAsync<JsonElement>("/api/payments/vnpay/ipn?"+query);Assert.Equal("00",ipn.GetProperty("RspCode").GetString());
        c=await Read<FlowContractCard>(await manager.GetAsync($"/api/manager/contracts/{c.ContractId}"));Assert.Equal("PENDING_SIGNATURE",c.Status);
        await Post<JsonElement>(customer,$"/api/customer/contracts/{c.ContractId}/otp",new FlowAction(c.Version,PdfSha256:c.PdfSha256));
        c=await Read<FlowContractCard>(await customer.GetAsync($"/api/customer/contracts/{c.ContractId}"));
        c=await Post<FlowContractCard>(customer,$"/api/customer/contracts/{c.ContractId}/sign",new FlowAction(c.Version,Otp:f.Email.Code,PdfSha256:c.PdfSha256));
        c=await Read<FlowContractCard>(await manager.GetAsync($"/api/manager/contracts/{c.ContractId}"));Assert.Equal("EFFECTIVE",c.Status);
        c=await Post<FlowContractCard>(manager,$"/api/manager/contracts/{c.ContractId}/deployment/confirm",new FlowAction(c.Trip!.Version,"Ready",AssignedSpecialistId:"docs",AssignedCoordinatorId:"route"));
        using var routing=app.Client("route","FLEET_ROUTE_COORDINATOR");var queue=await Read<FlowHandoff[]>(await routing.GetAsync("/api/operations/flow1/trips"));Assert.Single(queue);
        Assert.Equal(HttpStatusCode.NotFound,(await routing.PostAsJsonAsync($"/api/operations/flow1/trips/{c.Trip!.TripId}/ack",new{})).StatusCode);
        using var specialist=app.Client("docs","TRANSPORT_SPECIALIST");
        Assert.Equal(c.Trip.TripId,Assert.Single(await Read<FlowHandoff[]>(await specialist.GetAsync("/api/operations/flow1/trips"))).Trip.TripId);
        Assert.Equal(HttpStatusCode.NotFound,(await manager.GetAsync($"/api/manager/requests/{r.RequestId}/info-requests")).StatusCode);
        var swagger=await manager.GetFromJsonAsync<JsonElement>("/swagger/v1/swagger.json");
        Assert.DoesNotContain(swagger.GetProperty("paths").EnumerateObject(),p=>p.Name.EndsWith("/claim",StringComparison.Ordinal));
        Assert.Equal(HttpStatusCode.NotFound,(await manager.PostAsJsonAsync($"/api/manager/contracts/{c.ContractId}/bank-proofs",new{})).StatusCode);
        using var other=app.Client("other");Assert.Equal(HttpStatusCode.NotFound,(await other.GetAsync($"/api/customer/contracts/{c.ContractId}")).StatusCode);
        using var anonymous=app.Client(null);Assert.Equal(HttpStatusCode.Unauthorized,(await anonymous.GetAsync("/api/customer/requests")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,(await customer.GetAsync("/api/manager/requests")).StatusCode);
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Missing_schema_fails_closed_without_startup_migration_and_current_schema_restores_access()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();await using var empty=await Flow1TestDatabase.CreateAsync(migrate:false);
        using var app=new RelationalHttpFactory(f,empty.ConnectionString);using var c=app.Client();
        var response=await c.GetAsync("/api/customer/requests");Assert.Equal(HttpStatusCode.ServiceUnavailable,response.StatusCode);
        Assert.Contains("FLOW1_SQL_SCHEMA_REQUIRED",await response.Content.ReadAsStringAsync());
        Assert.Equal(0,await empty.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('HORSE') AND name='PhotoUrl';"));
        await empty.ScriptAsync("002_flow1.sql");
        Assert.Equal(HttpStatusCode.OK,(await c.GetAsync("/api/customer/requests")).StatusCode);
    }
    [LocalSqlFact]
    public async Task Real_login_on_current_schema_requires_matching_password_instead_of_a_common_development_bypass()
    {
        await using var f=await RelationalFlow1Tests.Fixture.Create();using var app=new RelationalHttpFactory(f);using var anonymous=app.Client(null);
        var hash=BCrypt.Net.BCrypt.HashPassword("Flow1_Native_Fixture_Only_2026!");
        await f.Db.ExecuteAsync("UPDATE [USER] SET PasswordHash='"+hash+"' WHERE UserID='owner';");
        foreach(var wrong in new[]{"Password123!","123456","admin123","string","incorrect-password"})Assert.Equal(HttpStatusCode.Unauthorized,(await anonymous.PostAsJsonAsync("/api/auth/login",new{email="owner@example.invalid",password=wrong})).StatusCode);
        var result=await Read<JsonElement>(await anonymous.PostAsJsonAsync("/api/auth/login",new{email="owner@example.invalid",password="Flow1_Native_Fixture_Only_2026!"}));
        Assert.Equal("CUSTOMER",result.GetProperty("role").GetString());Assert.False(string.IsNullOrWhiteSpace(result.GetProperty("accessToken").GetString()));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE name='Flow1StateJson';"));
    }

}
