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
        public async Task<ContractDocumentResult> GenerateAsync(ContractDocumentRequest r,CancellationToken ct=default) {Last=r;if(DuringRender is not null)await DuringRender();var model=r.FrozenSnapshot.Deserialize<ContractPdfModel>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!;var k=await files.PutAsync(new(PublishedClauseSelection.Attach(Encoding.UTF8.GetBytes("%PDF-fixture-only "+r.FrozenSnapshot.GetRawText()),model.Clauses??[],model.AdditionalClauses),"c.pdf"),false,ct);return new(k[8..^4],k[8..^4],files.Values[k].Item1.Length);}
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
        public string ClauseId=""; public RelationalFlow1Service Service=null!; public readonly List<Flow1RelationalContext> Contexts=[];
        public static async Task<Fixture> Create()
        {
            var f=new Fixture{Db=await Flow1TestDatabase.CreateAsync(migrate:false)};f.Renderer=new(f.Storage);
            await f.Db.ScriptAsync("002_flow1.sql");
            await f.Db.ExecuteAsync("""
                UPDATE [USER] SET Email='owner@example.invalid' WHERE UserID='owner';
                INSERT [USER](UserID,PasswordHash,Role,FullName,Email) VALUES
                ('manager','fixture','LOGISTICS_MANAGER','Manager','manager@example.invalid'),
                ('other','fixture','CUSTOMER','Other','other@example.invalid'),
                ('route','fixture','FLEET_ROUTE_COORDINATOR','Coordinator','route@example.invalid'),
                ('docs','fixture','TRANSPORT_SPECIALIST','Specialist','docs@example.invalid'),
                ('manager2','fixture','LOGISTICS_MANAGER','Other manager','manager2@example.invalid'),
                ('route2','fixture','FLEET_ROUTE_COORDINATOR','Other coordinator','route2@example.invalid'),
                ('docs2','fixture','TRANSPORT_SPECIALIST','Other specialist','docs2@example.invalid');
                """);
            f.Service=f.NewService();f.ClauseId=RequiredContractClauses.Ids[0];await f.Service.SaveClauseAsync(f.ClauseId,"manager",new("Điều khoản vận chuyển","Công ty vận chuyển theo lịch và điều kiện đã thỏa thuận."),default);return f;
        }
        public RelationalFlow1Service NewService(IFlow1GatewayQuery? query=null,IFlow1CurrentFiles? currentFiles=null)
        {
            var context=new Flow1RelationalContext(new DbContextOptionsBuilder<Flow1RelationalContext>().UseSqlServer(Db.ConnectionString).Options);Contexts.Add(context);
            var maps=new Maps(); var options=new Flow1ContractOptions{Issuer=new(){["COMPANY_NAME"]="Fixture issuer",["COMPANY_ADDRESS"]="Fixture address",["COMPANY_EMAIL"]="issuer@example.invalid",["COMPANY_HOTLINE"]="0900000000",["COMPANY_TAX_CODE"]="FIXTURE",["COMPANY_BANK_ACCOUNT"]="FIXTURE",["COMPANY_BANK_NAME"]="FIXTURE",["COMPANY_REPRESENTATIVE"]="Fixture representative",["COMPANY_REP_POSITION"]="Fixture manager"}};
            return new(new Flow1Data(context),currentFiles??Storage,new(maps,maps,new(){StandardVehicleCapacityStalls=1},Time,new DatabaseCostRates(context)),Time,new ContractOtpSecurity("fixture-contract-otp-hmac-key-at-least32bytes"),Email,Renderer,options,new VnpaySandboxGateway(Vnpay,Time),query);
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
            c=await Service.PublishAsync(c.ContractId,"manager",new(c.Version,ClauseIds:[ClauseId]),default);return(r,c);
        }
        public async Task<FlowContractCard> Paid()
        {
            var(_,c)=await Published();await Service.IpnAsync(Callback(await Session(c)),default);
            return await Service.ContractAsync(c.ContractId,"owner",false,default);
        }
        public async Task<FlowContractCard> Signed()
        {
            var c=await Paid();await Service.SendOtpAsync(c.ContractId,"owner",new(c.Version,PdfSha256:c.PdfSha256),default);
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

}
