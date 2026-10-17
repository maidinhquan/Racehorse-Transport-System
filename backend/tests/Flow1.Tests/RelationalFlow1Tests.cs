using System.Text.Json;
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
        public ContractDocumentRequest? Last;public Func<Task>? DuringRender;
        public async Task<ContractDocumentResult> GenerateAsync(ContractDocumentRequest r,CancellationToken ct=default) {Last=r;if(DuringRender is not null)await DuringRender();var k=await files.PutAsync(new(Encoding.UTF8.GetBytes("%PDF-fixture-only "+r.FrozenSnapshot.GetRawText()),"c.pdf"),false,ct);return new(k[8..^4],k[8..^4],files.Values[k].Item1.Length);}
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
        public RelationalFlow1Service NewService(IFlow1GatewayQuery? query=null)
        {
            var context=new Flow1RelationalContext(new DbContextOptionsBuilder<Flow1RelationalContext>().UseSqlServer(Db.ConnectionString).Options);Contexts.Add(context);
            var maps=new Maps(); var options=new Flow1ContractOptions{Issuer=new(){["COMPANY_NAME"]="Fixture issuer",["COMPANY_ADDRESS"]="Fixture address",["COMPANY_EMAIL"]="issuer@example.invalid",["COMPANY_HOTLINE"]="0900000000",["COMPANY_TAX_CODE"]="FIXTURE",["COMPANY_BANK_ACCOUNT"]="FIXTURE",["COMPANY_BANK_NAME"]="FIXTURE",["COMPANY_REPRESENTATIVE"]="Fixture representative",["COMPANY_REP_POSITION"]="Fixture manager"}};
            return new(new Flow1Data(context),Storage,new(maps,maps,new(){StandardVehicleCapacityStalls=1},Time),Time,new ContractOtpSecurity("fixture-contract-otp-hmac-key-at-least32bytes"),Email,Renderer,options,new VnpaySandboxGateway(Vnpay,Time),query);
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
    public async Task A_verified_failed_provider_query_allows_zero_money_cancellation_but_a_later_receipt_is_still_retained()
    {
        await using var f=await Fixture.Create();var c=await f.Signed();var p=await f.Session(c);
        c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);c=await f.Service.CancellationAsync(c.ContractId,"owner",false,"request",new(c.Version,"Cancel"),default);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.CancellationAsync(c.ContractId,"manager",true,"approve",new(c.Version,"No IPN yet",CancellationId:c.CancellationId),default));
        var query=f.NewService(new FailedQuery());var payment=c.Payments.Single();c=await query.QueryPaymentAsync(c.ContractId,p,"manager",new(payment.Version,"Provider verified failed"),"127.0.0.1",default);
        c=await f.Service.CancellationAsync(c.ContractId,"manager",true,"approve",new(c.Version,"Zero money, attempt reconciled",CancellationId:c.CancellationId),default);Assert.Equal("CANCELLED",c.Status);
        await f.Service.IpnAsync(f.Callback(p),default);c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);
        Assert.Equal(40000000,c.PaidAmount);Assert.True(c.Payments.Single().ReviewRequired);Assert.Null(c.Trip);Assert.Equal("CANCELLED",c.Status);
    }
    private sealed class FailedQuery:IFlow1GatewayQuery {public Task<GatewayQueryResult> QueryAsync(GatewayQueryRequest i,CancellationToken ct)=>Task.FromResult(new GatewayQueryResult(true,i.PaymentId,i.MerchantId,"FAILED",TransactionStatus:"02"));}

    [LocalSqlFact]
    public async Task Excess_late_money_after_release_revokes_current_handoff_without_creating_another_trip_or_erasing_receipts()
    {
        await using var f=await Fixture.Create();var c=await f.Signed();var old=await f.Session(c);
        f.Time.Value=f.Time.Value.AddMinutes(16);var current=await f.Session(c,"payment-key-two");
        await f.Service.IpnAsync(f.Callback(current,"2222"),default);c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);
        c=await f.Service.DeploymentAsync(c.ContractId,"manager","confirm",new(c.Trip!.Version,"Ready"),default);var released=c.Trip!;
        await f.Service.IpnAsync(f.Callback(old,"1111"),default);c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);
        Assert.Equal(80000000,c.PaidAmount);Assert.Equal(2,c.Payments.Count);Assert.Equal("ON_HOLD",c.Trip!.DeploymentStatus);Assert.Null(c.Trip.EventId);Assert.Empty(await f.Service.OperationsAsync("route",default));
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.AckAsync(released.TripId,"route",new(released.Version,EventId:released.EventId),default));
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
    [LocalSqlFact]
    public async Task Invoice_changed_by_another_module_retains_verified_cash_but_blocks_activation()
    {
        await using var f=await Fixture.Create();var c=await f.Signed();var p=await f.Session(c);
        await f.Db.ExecuteAsync("UPDATE INVOICE SET TotalPayableAmount=1;");
        await f.Service.IpnAsync(f.Callback(p),default);
        Assert.Equal(40000000,await f.Db.ScalarAsync<decimal>("SELECT PaidAmount FROM INVOICE;"));
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM PAYMENT WHERE Status='SUCCESS' AND FinancialReviewRequired=1;"));
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }

    [LocalSqlFact]
    public async Task Account_email_changed_after_publication_requires_reissue_instead_of_signing_old_pdf()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();
        await f.Db.ExecuteAsync("UPDATE [USER] SET Email='changed@example.invalid' WHERE UserID='owner';");
        var e=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default));
        Assert.Equal("CUSTOMER_CHANGED",e.ErrorCode);Assert.Equal("",f.Email.Code);
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
    }

    [LocalSqlFact]
    public async Task Closing_unsigned_versions_keeps_old_pdfs_and_customer_revision_can_be_reissued()
    {
        await using var f=await Fixture.Create();var(r,c)=await f.Published();var hash=c.PdfSha256;
        c=await f.Service.LifecycleAsync(c.ContractId,"owner",false,"decline",new(c.Version,"Correct the request"),default);
        Assert.Equal("DECLINED",c.Status);Assert.False(c.IsCurrent);r=await f.Service.DetailAsync(r.RequestId,"owner",false,default);Assert.Equal("CHANGES_REQUESTED",r.Status);
        r=await f.Service.SubmitAsync("owner","revision-key-one",r.Input! with {Purpose="Updated purpose"},r.RequestId,r.Version,default);
        r=await f.Service.ReviewAsync(r.RequestId,"manager","accept",new(r.Version,"Accepted revision"),default);
        var next=await f.Service.DraftAsync(r.RequestId,"manager","replacement-key",new(r.Version,Price:110000000,PreparationDays:2,Deadline:f.Time.Value.AddDays(3)),default);
        next=await f.Service.LifecycleAsync(next.ContractId,"manager",true,"withdraw",new(next.Version,"Change unsigned quote"),default);Assert.Equal("WITHDRAWN",next.Status);
        Assert.Equal(hash,(await f.Service.ContractAsync(c.ContractId,"owner",false,default)).PdfSha256);
        Assert.NotEmpty((await f.Service.PdfAsync(c.ContractId,"owner",false,default)).Bytes);
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM TRIP_PLAN;"));
    }
    [LocalSqlFact]
    public async Task Time_passing_does_not_auto_cancel_and_manager_expiry_or_unpaid_close_is_explicit()
    {
        await using var f=await Fixture.Create();var(_,c)=await f.Published();f.Time.Value=f.Time.Value.AddDays(3);
        c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);Assert.Equal("PENDING_SIGNATURE",c.Status);
        c=await f.Service.LifecycleAsync(c.ContractId,"manager",true,"expire",new(c.Version,"Explicitly close expired version"),default);Assert.Equal("EXPIRED",c.Status);
        await using var paidWindow=await Fixture.Create();var signed=await paidWindow.Signed();paidWindow.Time.Value=paidWindow.Time.Value.AddHours(25);
        signed=await paidWindow.Service.ContractAsync(signed.ContractId,"manager",true,default);Assert.Equal("SIGNED",signed.Status);
        var cancelled=await paidWindow.Service.CancelOverdueAsync(signed.ContractId,"manager",new(signed.Version,"Verified zero money and no unresolved sessions"),default);
        Assert.Equal("CANCELLED",cancelled.Status);Assert.Equal(signed.SignedAt,cancelled.SignedAt);Assert.Equal(signed.PdfSha256,cancelled.PdfSha256);Assert.Equal(0,cancelled.PaidAmount);Assert.Null(cancelled.Trip);
    }
    [LocalSqlFact]
    public async Task Resends_keep_failed_attempts_and_account_budget_survives_contract_reissue()
    {
        await using var f=await Fixture.Create();var(r,c)=await f.Published();
        for(var n=0;n<5;n++){
            c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);await f.Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default);
            if(n==0){c=await f.Service.ContractAsync(c.ContractId,"owner",false,default);await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SignAsync(c.ContractId,"owner",new(c.Version,Otp:f.Email.Code=="000000"?"111111":"000000",PdfSha256:c.PdfSha256),default));}
            f.Time.Value=f.Time.Value.AddSeconds(61);
        }
        Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT SignOtpFailedAttempts FROM CONTRACT;"));
        c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);await f.Service.LifecycleAsync(c.ContractId,"manager",true,"withdraw",new(c.Version,"Reissue"),default);
        r=await f.Service.DetailAsync(r.RequestId,"manager",true,default);var next=await f.Service.DraftAsync(r.RequestId,"manager","budget-new-contract",new(r.Version,Price:100000000,PreparationDays:2,Deadline:f.Time.Value.AddDays(2)),default);
        next=await f.Service.PublishAsync(next.ContractId,"manager",new(next.Version),default);
        var e=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SendOtpAsync(next.ContractId,"owner",new(next.Version,PdfSha256:next.PdfSha256),default));Assert.Equal("OTP_RATE_LIMITED",e.ErrorCode);
        Assert.Equal(5,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM NOTIFICATION WHERE Type='CONTRACT_OTP';"));
    }
    [LocalSqlFact]
    public async Task Departed_trip_is_not_rolled_back_and_incomplete_legacy_request_needs_review_before_quote()
    {
        await using var f=await Fixture.Create();var incomplete=await f.Service.DetailAsync("req-1","manager",true,default);
        var bad=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.DraftAsync("req-1","manager","incomplete-quote-key",new(incomplete.Version,Price:100,PreparationDays:2,Deadline:f.Time.Value.AddDays(1)),default));Assert.Equal("DATA_REVIEW_REQUIRED",bad.ErrorCode);
        var c=await f.Signed();await f.Service.IpnAsync(f.Callback(await f.Session(c)),default);await f.Db.ExecuteAsync("UPDATE TRIP_PLAN SET Status='IN_TRANSIT';");
        c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);var e=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.DeploymentAsync(c.ContractId,"manager","hold",new(c.Trip!.Version,"Cannot reverse departure"),default));Assert.Equal("DEPARTURE_ALREADY_STARTED",e.ErrorCode);
        Assert.Equal("IN_TRANSIT",await f.Db.ScalarAsync<string>("SELECT Status FROM TRIP_PLAN;"));
    }

    [LocalSqlFact]
    public async Task Horse_changed_by_another_module_during_render_cannot_publish_stale_terms()
    {
        await using var f=await Fixture.Create();var r=await f.Request();r=await f.Service.ReviewAsync(r.RequestId,"manager","accept",new(r.Version,"Accepted"),default);
        var c=await f.Service.DraftAsync(r.RequestId,"manager","render-race-key",new(r.Version,Price:100000000,PreparationDays:2,Deadline:f.Time.Value.AddDays(2)),default);
        f.Renderer.DuringRender=()=>f.Db.ExecuteAsync("UPDATE HORSE SET Name='Changed by another module';");
        var e=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.PublishAsync(c.ContractId,"manager",new(c.Version),default));Assert.Equal("STALE_VERSION",e.ErrorCode);
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT WHERE PdfUrl IS NOT NULL;"));Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM INVOICE;"));
    }

    [LocalSqlFact]
    public async Task Missing_preparation_data_after_session_keeps_verified_money_for_review_instead_of_losing_callback()
    {
        await using var f=await Fixture.Create();var c=await f.Signed();var p=await f.Session(c);
        await f.Db.ExecuteAsync("UPDATE TRANSPORT_REQUEST SET PreparationDays=NULL;");await f.Service.IpnAsync(f.Callback(p),default);
        c=await f.Service.ContractAsync(c.ContractId,"manager",true,default);Assert.Equal(40000000,c.PaidAmount);Assert.True(c.Payments.Single().ReviewRequired);Assert.Null(c.Trip);
    }

    [LocalSqlFact]
    public async Task Vn_jp_air_uses_seven_day_floor_without_inventing_road_distance_or_ground_leg_price()
    {
        await using var f=await Fixture.Create();var r=await f.Request();r=await f.Service.ReviewAsync(r.RequestId,"manager","request-changes",new(r.Version,"Use airport-to-airport"),default);
        var input=r.Input! with{Trip=r.Input!.Trip with{Delivery=new("Arrival airport",35.5,139.7,"JP"),PreferredTransportMode="AIR"}};
        r=await f.Service.SubmitAsync("owner","air-revision-key",input,r.RequestId,r.Version,default);Assert.Equal(7,r.PreparationDays);Assert.Null(r.DistanceKm);
        r=await f.Service.ReviewAsync(r.RequestId,"manager","accept",new(r.Version,"Airport scope accepted"),default);
        var e=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.DraftAsync(r.RequestId,"manager","air-draft-too-short",new(r.Version,Price:100000000,PreparationDays:2,Deadline:f.Time.Value.AddDays(2)),default));Assert.Equal("INVALID_PREPARATION",e.ErrorCode);
        var c=await f.Service.DraftAsync(r.RequestId,"manager","air-draft-valid",new(r.Version,Price:100000000,PreparationDays:7,Deadline:f.Time.Value.AddDays(2)),default);await f.Service.PublishAsync(c.ContractId,"manager",new(c.Version),default);
        var model=f.Renderer.Last!.FrozenSnapshot.Deserialize<ContractPdfModel>(new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web))!;
        Assert.Contains("airport-to-airport",model.Values["TRANSPORT_SCOPE"]);Assert.Contains("ground legs excluded",model.Values["TRANSPORT_SCOPE"]);
    }

    [LocalSqlFact]
    public async Task A_legacy_signed_timestamp_without_acceptance_evidence_is_never_presented_as_an_otp_receipt()
    {
        await using var f=await Fixture.Create();await f.Db.ExecuteAsync("INSERT CONTRACT(ContractID,RequestID,CustomerID,ContractCode,CurrencyCode,TotalQuotedPrice,DepositRateStandard,ContractStatus,SignedAt) VALUES('legacy-contract','req-1','owner','LEGACY','USD',100,40,'SIGNED','20261001');");
        var c=await f.Service.ContractAsync("legacy-contract","owner",false,default);Assert.NotNull(c.SignedAt);Assert.False(c.HasAcceptanceEvidence);Assert.False(c.RelationalTermsReady);Assert.Equal("USD",c.Currency);Assert.False(c.IsCurrent);
        var r=await f.Service.DetailAsync("req-1","manager",true,default);var e=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.ReviewAsync("req-1","manager","reject",new(r.Version,"Do not reinterpret old request"),default));Assert.Equal("DATA_REVIEW_REQUIRED",e.ErrorCode);Assert.Equal("ACCEPTED",(await f.Service.DetailAsync("req-1","manager",true,default)).Status);
    }

    [LocalSqlFact]
    public async Task Draft_retry_normalizes_fractional_deadline_and_rejects_a_changed_preparation_with_the_same_key()
    {
        await using var f=await Fixture.Create();var r=await f.Request();r=await f.Service.ReviewAsync(r.RequestId,"manager","accept",new(r.Version,"Accepted"),default);
        var input=new FlowAction(r.Version,Price:100000000,PreparationDays:2,Deadline:f.Time.Value.AddDays(2).AddMilliseconds(123));
        var first=await f.Service.DraftAsync(r.RequestId,"manager","fractional-deadline-key",input,default);var retry=await f.Service.DraftAsync(r.RequestId,"manager","fractional-deadline-key",input,default);Assert.Equal(first.ContractId,retry.ContractId);
        var e=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.DraftAsync(r.RequestId,"manager","fractional-deadline-key",input with{PreparationDays=3},default));Assert.Equal("IDEMPOTENCY_KEY_REUSED",e.ErrorCode);Assert.Equal(1,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;"));
    }

    [LocalSqlFact]
    public async Task Selectable_dates_and_returned_document_correction_preserve_reservations_and_reject_stale_files()
    {
        await using var f=await Fixture.Create();var r=await f.Request();var h=r.Horses.Single();var from=new DateTimeOffset(r.DepartureAt!.Value);var to=new DateTimeOffset(r.DeliveryAt!.Value);
        Assert.False((await f.Service.HorsesAsync("owner",default,from,to)).Single().Selectable);
        Assert.True((await f.Service.HorsesAsync("owner",default,from.AddDays(3),to.AddDays(3))).Single().Selectable);
        Assert.True((await f.Service.HorsesAsync("owner",default,from,to,r.RequestId)).Single().Selectable);
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.HorsesAsync("other",default,from,to,r.RequestId));
        var photo=new UploadedFile(Encoding.UTF8.GetBytes("replacement fixture photo bytes"),"p.png");var passport=new UploadedFile(Encoding.UTF8.GetBytes("replacement fixture passport bytes"),"p.pdf");
        await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.UpdateFilesAsync(h.HorseId,"owner",h.Version,photo,passport,default));
        r=await f.Service.ReviewAsync(r.RequestId,"manager","request-changes",new(r.Version,"Provide clearer passport"),default);var old=r.Input!;
        var updated=await f.Service.UpdateFilesAsync(h.HorseId,"owner",h.Version,photo,passport,default);Assert.NotEqual(h.Version,updated.Version);
        var stale=await Assert.ThrowsAsync<BusinessRuleException>(()=>f.Service.SubmitAsync("owner","stale-correction-key",old,r.RequestId,r.Version,default));Assert.Equal("STALE_VERSION",stale.ErrorCode);
        r=await f.Service.DetailAsync(r.RequestId,"owner",false,default);r=await f.Service.SubmitAsync("owner","corrected-files-key",r.Input!,r.RequestId,r.Version,default);Assert.Equal("PENDING",r.Status);
        r=await f.Service.ReviewAsync(r.RequestId,"manager","request-changes",new(r.Version,"Returned again"),default);
        r=await f.Service.ReviewAsync(r.RequestId,"manager","reject",new(r.Version,"Explicitly close abandoned revision"),default);Assert.Equal("REJECTED",r.Status);Assert.True((await f.Service.HorsesAsync("owner",default,from,to)).Single().Selectable);
        Assert.Equal(0,await f.Db.ScalarAsync<int>("SELECT COUNT(*) FROM CONTRACT;"));
    }

}
