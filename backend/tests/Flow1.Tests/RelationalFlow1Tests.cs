using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Application.Common.Exceptions;
using Application.Common.Flow1;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Application.Services.Flow1;
using Application.Services.Flow1.Relational;
using Domain.Enums;
using Infrastructure.Data.Context;
using Infrastructure.ExternalServices.Flow1;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Flow1.Tests;

public sealed class RelationalFlow1Tests
{
    internal sealed class Clock : TimeProvider { public DateTimeOffset Value=new(2026,11,1,3,0,0,TimeSpan.Zero); public override DateTimeOffset GetUtcNow()=>Value; }
    internal sealed class Files : IFlow1CurrentFiles
    {
        public readonly Dictionary<string,(byte[],string)> Values=[];
        public Task<string> PutAsync(UploadedFile f,bool photo,CancellationToken ct) {var k="private/"+Convert.ToHexString(SHA256.HashData(f.Bytes)).ToLowerInvariant()+(photo?".png":".pdf");Values[k]=(f.Bytes,photo?"image/png":"application/pdf"); return Task.FromResult(k);}
        public Task<(byte[] Bytes,string ContentType)> ReadAsync(string k,CancellationToken ct)=>Task.FromResult(Values[k]);
    }
    internal sealed class Sender : IContractOtpSender
    {
        public string Code=""; public bool Fail; public Func<Task>? DuringSend;
        public async Task SendAsync(string email,string code,string id,int version,string hash,DateTimeOffset expiry,CancellationToken ct) { Code=code;if(DuringSend is not null)await DuringSend();if(Fail)throw new InvalidOperationException("Fixture delivery failed"); }
    }
    internal sealed class Pdf(Files files) : IFlow1ContractDocumentGenerator
    {
        public ContractDocumentRequest? Last;
        public async Task<ContractDocumentResult> GenerateAsync(ContractDocumentRequest r,CancellationToken ct=default) {Last=r;var k=await files.PutAsync(new(Encoding.UTF8.GetBytes("%PDF-fixture-only "+r.FrozenSnapshot.GetRawText()),"c.pdf"),false,ct);return new(k[8..^4],k[8..^4],files.Values[k].Item1.Length);}
    }
    internal sealed class Maps : IFlow1RoadRoutingProvider,IFlow1LocationVerifier
    {
        public string Attribution=>"Fixture, not live maps";
        public Task VerifyAsync(MapPoint p,CancellationToken ct)=>Task.CompletedTask;
        public Task<RoadRouteResult> CalculateAsync(RoadRouteQuery q,CancellationToken ct=default)=>Task.FromResult(new RoadRouteResult("FIXTURE",100000,3600,DateTimeOffset.UtcNow,"fixture",true,"Fixture"));
    }
    internal sealed class Fixture : IAsyncDisposable
    {
        public Flow1TestDatabase Db=null!; public Clock Time=new(); public Files Storage=new(); public Sender Email=new(); public Pdf Renderer=null!;
        public readonly Flow1VnpayOptions Vnpay=new(){Enabled=true,TmnCode="TEST0001",HashSecret="fixture-only-vnpay-key",ReturnUrl="http://localhost/customer/payments/return"};
        public RelationalFlow1Service Service=null!; public readonly List<Flow1RelationalContext> Contexts=[];
        public static async Task<Fixture> Create()
        {
            var f=new Fixture{Db=await Flow1TestDatabase.CreateAsync(sqlState:false)};f.Renderer=new(f.Storage);
            await f.Db.ScriptAsync("006_flow1_simple_relational_foundation.sql");
            await f.Db.ExecuteAsync("""
                UPDATE [USER] SET Email='owner@example.invalid' WHERE UserID='owner';
                INSERT [USER](UserID,PasswordHash,Role,FullName,Email) VALUES
                ('manager','fixture','LOGISTICS_MANAGER','Manager','manager@example.invalid'),
                ('other','fixture','CUSTOMER','Other','other@example.invalid'),
                ('route','fixture','FLEET_ROUTE_COORDINATOR','Coordinator','route@example.invalid'),
                ('docs','fixture','TRANSPORT_SPECIALIST','Specialist','docs@example.invalid');
                """);
            f.Service=f.NewService();return f;
        }
        public RelationalFlow1Service NewService()
        {
            var context=new Flow1RelationalContext(new DbContextOptionsBuilder<Flow1RelationalContext>().UseSqlServer(Db.ConnectionString).Options);Contexts.Add(context);
            var maps=new Maps(); var options=new Flow1ContractOptions{Issuer=new(){["COMPANY_NAME"]="Fixture issuer",["COMPANY_ADDRESS"]="Fixture address",["COMPANY_EMAIL"]="issuer@example.invalid",["COMPANY_HOTLINE"]="0900000000",["COMPANY_TAX_CODE"]="FIXTURE",["COMPANY_BANK_ACCOUNT"]="FIXTURE",["COMPANY_BANK_NAME"]="FIXTURE",["COMPANY_REPRESENTATIVE"]="Fixture representative",["COMPANY_REP_POSITION"]="Fixture manager"}};
            return new(new Flow1Data(context),Storage,new(maps,maps,new(){StandardVehicleCapacityStalls=1},Time),Time,new ContractOtpSecurity("fixture-contract-otp-hmac-key-at-least32bytes"),Email,Renderer,options,new VnpaySandboxGateway(Vnpay,Time));
        }
        public async Task<FlowRequestCard> Request(string key="request-key-one")
        {
            var h=await Service.HorseAsync("owner","horse-key-one",new("Horse","123456789012345","FEI-1","Thoroughbred","STALLION",500,new(2020,1,1)),new(Encoding.UTF8.GetBytes("fixture photo bytes"),"p.png"),new(Encoding.UTF8.GetBytes("fixture passport bytes"),"p.pdf"),null,null,default);
            var trip=new EstimateInput(new("A",10,106,"VN"),new("B",11,107,"VN"),"ROAD",1,new(2026,11,20));
            return await Service.SubmitAsync("owner",key,new(trip,new(2026,11,20,3,0,0,TimeSpan.Zero),new(2026,11,21,3,0,0,TimeSpan.Zero),"Race",new("Sender","0900000000"),new("Receiver","0900000001"),[new(h.HorseId,h.Version)]),null,null,default);
        }
        public async Task<(FlowRequestCard R,FlowContractCard C)> Published()
        {
            var r=await Request();r=await Service.ReviewAsync(r.RequestId,"manager","accept",new(r.Version,"Accepted"),default);
            var c=await Service.DraftAsync(r.RequestId,"manager","contract-key-one",new(r.Version,Price:100000000,PreparationDays:2,Deadline:Time.Value.AddDays(2)),default);
            c=await Service.PublishAsync(c.ContractId,"manager",new(c.Version),default);return(r,c);
        }
        public async Task<FlowContractCard> Signed()
        {
            var(_,c)=await Published();await Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default);
            c=await Service.ContractAsync(c.ContractId,"owner",false,default);
            return await Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:Email.Code,PdfSha256:c.PdfSha256),default);
        }
        public async Task<string> Session(FlowContractCard c,string key="payment-key-one")
        {
            var v=await Service.PaymentSessionAsync(c.ContractId,"owner",key,"127.0.0.1",default);
            return System.Text.Json.JsonSerializer.SerializeToElement(v).GetProperty("paymentId").GetString()!;
        }
        public Dictionary<string,string> Callback(string payment,string tx="123456",decimal amount=40000000)
        {
            var p=new Dictionary<string,string>{{"vnp_TmnCode",Vnpay.TmnCode},{"vnp_TxnRef",payment},{"vnp_TransactionNo",tx},{"vnp_ResponseCode","00"},{"vnp_TransactionStatus","00"},{"vnp_Amount",(amount*100).ToString("0",CultureInfo.InvariantCulture)},{"vnp_PayDate",Time.Value.ToOffset(TimeSpan.FromHours(7)).ToString("yyyyMMddHHmmss")},{"vnp_BankCode","NCB"}};
            p["vnp_SecureHash"]=new VnpaySandboxGateway(Vnpay,Time).Sign(p);return p;
        }
        public async ValueTask DisposeAsync() {foreach(var c in Contexts)await c.DisposeAsync();await Db.DisposeAsync();}
    }

    [LocalSqlFact]
    public async Task Native_relational_chain_signs_pays_activates_once_and_handoff_rejects_old_events_after_hold_resume()
    {
        await using var f=await Fixture.Create();var c=await f.Signed();var pid=await f.Session(c);
        var callback=f.Callback(pid);await f.Service.IpnAsync(callback,default);await f.NewService().IpnAsync(callback,default);
        c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);Assert.Equal("EFFECTIVE",c.Status);Assert.Equal(40000000,c.PaidAmount);Assert.NotNull(c.Trip);
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM sys.columns WHERE name='Flow1StateJson';"));
        c=await f.Service.DeploymentAsync(c.ContractId,"manager","confirm",new(c.Trip!.Version,"Ready"),default);
        var handoff=(await f.Service.OperationsAsync("route",default)).Single();await f.Service.AckAsync(c.Trip!.TripId,"route",new(handoff.Trip.Version,EventId:handoff.Trip.EventId),default);
        c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);var oldEvent=c.Trip!.EventId;
        c=await f.Service.DeploymentAsync(c.ContractId,"manager","hold",new(c.Trip.Version,"Weather"),default);Assert.Empty(await f.Service.OperationsAsync("route",default));
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.AckAsync(c.Trip!.TripId,"docs",new(handoff.Trip.Version,EventId:oldEvent),default));
        c=await f.Service.DeploymentAsync(c.ContractId,"manager","resume",new(c.Trip!.Version,"Weather cleared"),default);Assert.Equal("PENDING",c.Trip!.DeploymentStatus);
        c=await f.Service.DeploymentAsync(c.ContractId,"manager","confirm",new(c.Trip.Version,"Reconfirmed"),default);Assert.NotEqual(oldEvent,c.Trip!.EventId);Assert.Null(c.Trip.RoutingAcknowledgedBy);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ContractAsync(c.ContractId,"other",false,default));
    }

    [LocalSqlFact]
    public async Task Incorrect_otp_commits_attempts_and_delivery_failure_never_enables_a_code()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();f.Email.Fail=true;
        await Assert.ThrowsAsync<InvalidOperationException>(()=>f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT WHERE SignOtpHash IS NOT NULL;"));f.Email.Fail=false;f.Time.Value=f.Time.Value.AddSeconds(61);
        c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);await f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default);
        c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:"invalid",PdfSha256:c.PdfSha256),default));
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT SignOtpFailedAttempts FROM CONTRACT;"));
        c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);c=await f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:f.Email.Code,PdfSha256:c.PdfSha256),default);
        Assert.Equal("SIGNED",c.Status);Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT WHERE SignOtpHash IS NOT NULL;"));
    }

    [LocalSqlFact]
    public async Task Extension_keeps_original_pdf_signature_and_signed_due_but_updates_invoice_and_revokes_old_challenge()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();var hash=c.PdfSha256;
        await f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:hash),default);var old=f.Email.Code;c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);
        c=await f.Service.LifecycleAsync(c.ContractId,"manager",true,"extend",new(c.Version,"Extra time",Deadline:f.Time.Value.AddDays(3),Target:"SIGN"),default);
        Assert.Equal(hash,c.PdfSha256);await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:old,PdfSha256:hash),default));
        f.Time.Value=f.Time.Value.AddSeconds(61);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);await f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:hash),default);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
        c=await f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:f.Email.Code,PdfSha256:hash),default);var signed=c.SignedAt;var due=c.DepositDeadline;
        c=await f.Service.LifecycleAsync(c.ContractId,"manager",true,"extend",new(c.Version,"Extra deposit time",Deadline:new DateTimeOffset(due!.Value).AddDays(1),Target:"DEPOSIT"),default);
        Assert.Equal(hash,c.PdfSha256);Assert.Equal(signed,c.SignedAt);Assert.Equal(due,await f.Db.ScalarAsync<DateTime>("SELECT SignedDepositDeadline FROM CONTRACT;"));Assert.Equal(c.DepositDeadline,await f.Db.ScalarAsync<DateTime>("SELECT DueDate FROM INVOICE;"));
    }

    [LocalSqlFact]
    public async Task Cancellation_pending_retains_verified_money_and_reject_activates_while_zero_money_approval_keeps_signature()
    {
        await using(var f=await Fixture.Create()) {
            var c=await f.Signed();var p=await f.Session(c);c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);
            c=await f.Service.CancellationAsync(c.ContractId,"owner",false,"request",new(c.Version,"Change plans"),default);
            await f.Service.IpnAsync(f.Callback(p),default);c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);
            Assert.Equal(40000000,c.PaidAmount);Assert.Null(c.Trip);
            await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.CancellationAsync(c.ContractId,"manager",true,"approve",new(c.Version,"Approved",CancellationId:c.CancellationId),default));
            c=await f.Service.CancellationAsync(c.ContractId,"manager",true,"reject",new(c.Version,"Payment retained",CancellationId:c.CancellationId),default);Assert.NotNull(c.Trip);
        }
        await using(var f=await Fixture.Create()) {
            var c=await f.Signed();var signed=c.SignedAt;var hash=c.PdfSha256;c=await f.Service.CancellationAsync(c.ContractId,"owner",false,"request",new(c.Version,"Cancel"),default);
            c=await f.Service.CancellationAsync(c.ContractId,"manager",true,"approve",new(c.Version,"No money or attempts",CancellationId:c.CancellationId),default);
            Assert.Equal("CANCELLED",c.Status);Assert.Equal(signed,c.SignedAt);Assert.Equal(hash,c.PdfSha256);Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
        }
    }

    [LocalSqlFact]
    public async Task Signed_mismatch_is_recorded_for_review_and_never_allocates_or_creates_a_trip()
    {
        await using var f=await Fixture.Create();var c=await f.Signed();var p=await f.Session(c);await f.Service.IpnAsync(f.Callback(p,amount:1),default);
        c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);Assert.Equal(0,c.PaidAmount);Assert.Null(c.Trip);Assert.Equal(1,c.Payments.Single().ReceivedAmount);Assert.True(c.Payments.Single().ReviewRequired);
        var tampered=f.Callback(p);tampered["vnp_Amount"]="1";await f.Service.IpnAsync(tampered,default);Assert.Equal(1,await f.Db.ScalarAsync<decimal>("SELECT VnpayReceivedAmount FROM PAYMENT;"));
    }

    [LocalSqlFact]
    public async Task Extension_during_smtp_delivery_cannot_reenable_a_revoked_challenge()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();
        f.Email.DuringSend=async()=>{var current=await f.NewService().ContractAsync(c.ContractId,"manager",true,default);
            await f.NewService().LifecycleAsync(c.ContractId,"manager",true,"extend",new(current.Version,"Changed during email",Deadline:f.Time.Value.AddDays(3),Target:"SIGN"),default);};
        var failure=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default));
        Assert.Equal("OTP_REVOKED",failure.ErrorCode);Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT WHERE SignOtpHash IS NOT NULL;"));
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='CONTRACT_OTP';"));
    }

    [LocalSqlFact]
    public async Task Concurrent_callbacks_use_one_sql_receipt_and_activation_failure_rolls_back_money_for_retry()
    {
        await using var f=await Fixture.Create();var c=await f.Signed();var p=await f.Session(c);
        await f.Db.ExecuteAsync("CREATE TRIGGER FixtureTripFailure ON TRIP_PLAN AFTER INSERT AS THROW 51999,'Fixture activation failure',1;");
        await Assert.ThrowsAsync<Microsoft.EntityFrameworkCore.DbUpdateException>(()=>f.Service.IpnAsync(f.Callback(p),default));
        Assert.Equal(0m,await f.Db.ScalarAsync<decimal>("SELECT PaidAmount FROM INVOICE;"));Assert.Equal("PENDING_GATEWAY",await f.Db.ScalarAsync<string>("SELECT Status FROM PAYMENT;"));
        await f.Db.ExecuteAsync("DROP TRIGGER FixtureTripFailure;");
        await Task.WhenAll(f.Service.IpnAsync(f.Callback(p),default),f.NewService().IpnAsync(f.Callback(p),default));
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));Assert.Equal(40000000m,await f.Db.ScalarAsync<decimal>("SELECT PaidAmount FROM INVOICE;"));
    }
}
