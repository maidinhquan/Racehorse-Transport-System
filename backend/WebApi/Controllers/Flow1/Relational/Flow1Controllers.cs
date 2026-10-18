using System.Security.Claims;
using System.Text.Json;
using Application.DTOs;
using Application.DTOs.Flow1;
using Application.Interfaces.Flow1;
using Application.Services.Flow1.Relational;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using static Application.Common.Flow1.Flow1PricingPolicy;

namespace WebApi.Controllers.Flow1.Relational;

public abstract class FlowApi : ControllerBase
{
    protected string Actor=>User.FindFirstValue(ClaimTypes.NameIdentifier)??throw Error("Authentication required.","UNAUTHORIZED",401);
    protected string Key=>Request.Headers["Idempotency-Key"].ToString();
    protected IActionResult Result(object data)=>Ok(ApiResponse<object>.Ok(data));
    protected IActionResult PrivateFile((byte[] Bytes,string ContentType) f,string name) {Response.Headers.CacheControl="no-store";Response.Headers.XContentTypeOptions="nosniff";return File(f.Bytes,f.ContentType,name+(f.ContentType=="application/pdf"?".pdf":f.ContentType=="image/png"?".png":".jpg"));}
    protected static async Task<UploadedFile> Upload(IFormFile f,CancellationToken ct) {if(f is null || f.Length is <16 or >5242880)throw Error("Each upload must be16bytes–5MB.","INVALID_FILE_SIZE");using var m=new MemoryStream();await f.CopyToAsync(m,ct);return new(m.ToArray(),f.FileName);}
}
public sealed class HorseUploadForm
{
    public string Payload { get; set; } = "";
    public IFormFile Photo { get; set; } = null!;
    public IFormFile PassportScan { get; set; } = null!;
    public string Version { get; set; } = "";
}
public sealed record RevisionInput(FlowRequestInput Input,string Version);
public sealed class RequestDocumentsForm
{
    public string Payload { get; set; } = "";
    public List<string> HorseIds { get; set; } = [];
    public List<IFormFile> Files { get; set; } = [];
    public string Version { get; set; } = "";
}

[ApiController,Route("api/flow1/notifications"),Authorize,EnableRateLimiting("flow1-customer")]
public sealed class Flow1NotificationsApi(RelationalFlow1Service service):FlowApi
{
    [HttpGet]public async Task<IActionResult> List(CancellationToken ct)=>Result(await service.NotificationsAsync(Actor,ct));
    [HttpPost("{id}/read")]public async Task<IActionResult> Read(string id,CancellationToken ct)=>Result(await service.ReadNotificationAsync(id,Actor,ct));
}

[ApiController,Route("api/customer"),Authorize(Roles=UserRoles.Customer),EnableRateLimiting("flow1-customer")]
public sealed class Flow1CustomerApi(RelationalFlow1Service service, IFlow1GeocodingProvider locations, Application.Services.Flow1.TransportEstimateService estimates) : FlowApi
{
    [HttpGet("locations/search")]public async Task<IActionResult> Locations(string address,string country,CancellationToken ct)=>Result(await locations.SearchAsync(address,country,ct));
    [HttpPost("estimates")]public async Task<IActionResult> Estimate(EstimateInput input,CancellationToken ct)=>Result((await estimates.CalculateAsync(input,ct)).Customer);
    [HttpGet("horses/selectable")] public async Task<IActionResult> Horses(DateTimeOffset? departureAt,DateTimeOffset? deliveryAt,string? requestId,CancellationToken ct)=>Result(await service.HorsesAsync(Actor,ct,departureAt,deliveryAt,requestId));
    [HttpPost("horses"),Consumes("multipart/form-data"),RequestSizeLimit(11*1024*1024)] public async Task<IActionResult> Horse([FromForm]HorseUploadForm form,CancellationToken ct)
    {
        HorseInput input;try{input=JsonSerializer.Deserialize<HorseInput>(form.Payload,new JsonSerializerOptions(JsonSerializerDefaults.Web))??throw new JsonException();}catch(JsonException){throw Error("Invalid horse form.","VALIDATION_ERROR");}
        return Result(await service.HorseAsync(Actor,Key,input,await Upload(form.Photo,ct),await Upload(form.PassportScan,ct),null,null,ct));
    }
    [HttpPost("horses/{id}/files"),Consumes("multipart/form-data"),RequestSizeLimit(11*1024*1024)] public async Task<IActionResult> HorseFiles(string id,[FromForm]HorseUploadForm form,CancellationToken ct)=>Result(await service.UpdateFilesAsync(id,Actor,form.Version,await Upload(form.Photo,ct),await Upload(form.PassportScan,ct),ct));
    [HttpGet("horses/{id}/files/{kind}")]public async Task<IActionResult> HorseFile(string id,string kind,CancellationToken ct)=>PrivateFile(await service.HorseFileAsync(Actor,id,kind,null,ct),kind);
    [HttpGet("requests")]public async Task<IActionResult> Requests(CancellationToken ct)=>Result(await service.ListAsync(Actor,false,ct));
    [HttpPost("requests")]public async Task<IActionResult> Submit(FlowRequestInput input,CancellationToken ct)=>Result(await service.SubmitAsync(Actor,Key,input,null,null,ct));
    [HttpPost("requests/with-documents"),Consumes("multipart/form-data"),RequestSizeLimit(55*1024*1024),RequestFormLimits(MultipartBodyLengthLimit=55*1024*1024)]
    public Task<IActionResult> SubmitDocuments([FromForm]RequestDocumentsForm form,CancellationToken ct)=>SubmitDocumentForm(form,null,ct);
    [HttpPost("requests/{id}/revision-with-documents"),Consumes("multipart/form-data"),RequestSizeLimit(55*1024*1024),RequestFormLimits(MultipartBodyLengthLimit=55*1024*1024)]
    public Task<IActionResult> ReviseDocuments(string id,[FromForm]RequestDocumentsForm form,CancellationToken ct)=>SubmitDocumentForm(form,id,ct);
    private async Task<IActionResult> SubmitDocumentForm(RequestDocumentsForm form,string? id,CancellationToken ct)
    {
        if(form.Files.Count>10 || form.Files.Count!=form.HorseIds.Count || form.Payload.Length>65536)
            throw Error("Each of at most ten files needs one selected horse.","INVALID_DOCUMENTS");
        FlowRequestInput input;
        try { input=JsonSerializer.Deserialize<FlowRequestInput>(form.Payload,new JsonSerializerOptions(JsonSerializerDefaults.Web))??throw new JsonException(); }
        catch(JsonException) { throw Error("Invalid request form.","VALIDATION_ERROR"); }
        var uploads=new List<RequestDocumentUpload>();
        for(var n=0;n<form.Files.Count;n++)uploads.Add(new(form.HorseIds[n],await Upload(form.Files[n],ct)));
        return Result(await service.SubmitWithDocumentsAsync(Actor,Key,input,uploads,id,form.Version,ct));
    }
    [HttpGet("requests/{id}")]public async Task<IActionResult> GetRequest(string id,CancellationToken ct)=>Result(await service.DetailAsync(id,Actor,false,ct));
    [HttpGet("requests/{id}/documents/{document}")]public async Task<IActionResult> Document(string id,string document,CancellationToken ct)=>PrivateFile(await service.RequestDocumentAsync(id,document,Actor,false,ct),"baseline-"+document);
    [HttpPost("requests/{id}/revision")]public async Task<IActionResult> Revise(string id,RevisionInput input,CancellationToken ct)=>Result(await service.SubmitAsync(Actor,Key,input.Input,id,input.Version,ct));
    [HttpGet("contracts/{id}")]public async Task<IActionResult> Contract(string id,CancellationToken ct)=>Result(await service.ContractAsync(id,Actor,false,ct));
    [HttpGet("contracts/{id}/pdf")]public async Task<IActionResult> Pdf(string id,CancellationToken ct)=>PrivateFile(await service.PdfAsync(id,Actor,false,ct),"contract");
    [HttpPost("contracts/{id}/otp"),EnableRateLimiting("flow1-contract-otp")]public async Task<IActionResult> Otp(string id,FlowAction input,CancellationToken ct){await service.SendOtpAsync(id,Actor,input,ct);return Result(new{sent=true});}
    [HttpPost("contracts/{id}/sign"),EnableRateLimiting("flow1-contract-otp")]public async Task<IActionResult> Sign(string id,FlowAction input,CancellationToken ct)=>Result(await service.SignAsync(id,Actor,input,ct));
    [HttpPost("contracts/{id}/decline")]public async Task<IActionResult> Decline(string id,FlowAction input,CancellationToken ct)=>Result(await service.LifecycleAsync(id,Actor,false,"decline",input,ct));
    [HttpPost("contracts/{id}/cancellation/request")]public async Task<IActionResult> Cancel(string id,FlowAction input,CancellationToken ct)=>Result(await service.CancellationAsync(id,Actor,false,"request",input,ct));
    [HttpPost("contracts/{id}/vnpay")]public async Task<IActionResult> Vnpay(string id,CancellationToken ct)=>Result(await service.PaymentSessionAsync(id,Actor,Key,HttpContext.Connection.RemoteIpAddress?.ToString()??"127.0.0.1",ct));
    [HttpGet("payments/{id}/status")]public async Task<IActionResult> Returned(string id,CancellationToken ct)=>Result(await service.ReturnedAsync(id,Actor,ct));
}
[ApiController,Route("api/manager"),Authorize(Roles=UserRoles.LogisticsManager),EnableRateLimiting("flow1-customer")]
public sealed class Flow1ManagerApi(RelationalFlow1Service service):FlowApi
{
    [HttpGet("requests/{id}/documents/{document}")]public async Task<IActionResult> Document(string id,string document,CancellationToken ct)=>PrivateFile(await service.RequestDocumentAsync(id,document,Actor,true,ct),"baseline-"+document);
    [HttpGet("requests")]public async Task<IActionResult> List(CancellationToken ct)=>Result(await service.ListAsync(Actor,true,ct));
    [HttpGet("requests/{id}")]public async Task<IActionResult> GetRequest(string id,CancellationToken ct)=>Result(await service.DetailAsync(id,Actor,true,ct));
    [HttpPost("requests/{id}/accept"),HttpPost("requests/{id}/reject"),HttpPost("requests/{id}/request-changes")]public async Task<IActionResult> Review(string id,FlowAction input,CancellationToken ct)=>Result(await service.ReviewAsync(id,Actor,HttpContext.Request.Path.Value!.Split('/')[^1],input,ct));
    [HttpPost("requests/{id}/contracts")]public async Task<IActionResult> Draft(string id,FlowAction input,CancellationToken ct)=>Result(await service.DraftAsync(id,Actor,Key,input,ct));
    [HttpGet("requests/{id}/horses/{horse}/files/{kind}")]public async Task<IActionResult> HorseFile(string id,string horse,string kind,CancellationToken ct)=>PrivateFile(await service.HorseFileAsync(Actor,horse,kind,id,ct),kind);
    [HttpGet("contracts/{id}")]public async Task<IActionResult> Contract(string id,CancellationToken ct)=>Result(await service.ContractAsync(id,Actor,true,ct));
    [HttpGet("contracts/{id}/pdf")]public async Task<IActionResult> Pdf(string id,CancellationToken ct)=>PrivateFile(await service.PdfAsync(id,Actor,true,ct),"contract");
    [HttpPost("contracts/{id}/publish")]public async Task<IActionResult> Publish(string id,FlowAction input,CancellationToken ct)=>Result(await service.PublishAsync(id,Actor,input,ct));
    [HttpPost("contracts/{id}/extend"),HttpPost("contracts/{id}/withdraw"),HttpPost("contracts/{id}/expire")]public async Task<IActionResult> Lifecycle(string id,FlowAction input,CancellationToken ct)=>Result(await service.LifecycleAsync(id,Actor,true,HttpContext.Request.Path.Value!.Split('/')[^1],input,ct));
    [HttpPost("contracts/{id}/cancellation/{operation}")]public async Task<IActionResult> Cancellation(string id,string operation,FlowAction input,CancellationToken ct)=>Result(await service.CancellationAsync(id,Actor,true,operation,input,ct));
    [HttpPost("contracts/{id}/payments/{payment}/review")]public async Task<IActionResult> ReviewPayment(string id,string payment,FlowAction input,CancellationToken ct)=>Result(await service.FinancialReviewAsync(id,payment,Actor,input,ct));
    [HttpPost("contracts/{id}/payments/{payment}/query")]public async Task<IActionResult> QueryPayment(string id,string payment,FlowAction input,CancellationToken ct)=>Result(await service.QueryPaymentAsync(id,payment,Actor,input,HttpContext.Connection.RemoteIpAddress?.ToString()??"127.0.0.1",ct));
    [HttpPost("contracts/{id}/cancel-overdue")]public async Task<IActionResult> CancelOverdue(string id,FlowAction input,CancellationToken ct)=>Result(await service.CancelOverdueAsync(id,Actor,input,ct));
    [HttpPost("contracts/{id}/deployment/{operation}")]public async Task<IActionResult> Deployment(string id,string operation,FlowAction input,CancellationToken ct)=>Result(await service.DeploymentAsync(id,Actor,operation,input,ct));
}
[ApiController,Route("api/payments/vnpay")]
public sealed class Flow1VnpayApi(RelationalFlow1Service service):ControllerBase
{
    [HttpGet("ipn"),AllowAnonymous]public async Task<IActionResult> Ipn(CancellationToken ct)
    {
        if(Request.Query.Any(x=>x.Value.Count!=1))return new JsonResult(new{RspCode="97",Message="Repeated parameters"},new JsonSerializerOptions{PropertyNamingPolicy=null});
        return new JsonResult(await service.IpnAsync(Request.Query.ToDictionary(x=>x.Key,x=>x.Value.ToString(),StringComparer.Ordinal),ct),new JsonSerializerOptions{PropertyNamingPolicy=null});
    }
}
[ApiController,Route("api/operations/flow1/trips"),Authorize(Roles=UserRoles.FleetRouteCoordinator+","+UserRoles.TransportSpecialist),EnableRateLimiting("flow1-customer")]
public sealed class Flow1OperationsApi(RelationalFlow1Service service):FlowApi
{
    [HttpGet("{id}/documents/{document}"),Authorize(Roles=UserRoles.TransportSpecialist)]public async Task<IActionResult> Document(string id,string document,string eventId,CancellationToken ct)=>PrivateFile(await service.OperationsDocumentAsync(id,document,Actor,eventId,ct),"baseline-"+document);
    [HttpGet]public async Task<IActionResult> List(CancellationToken ct)=>Result(await service.OperationsAsync(Actor,ct));
    [HttpPost("{id}/ack")]public async Task<IActionResult> Ack(string id,FlowAction input,CancellationToken ct)=>Result(await service.AckAsync(id,Actor,input,ct));
    [HttpGet("{id}/pdf")]public async Task<IActionResult> Pdf(string id,string eventId,CancellationToken ct)=>PrivateFile(await service.OperationsPdfAsync(id,Actor,eventId,ct),"contract");
    [HttpGet("{id}/horses/{horse}/files/{kind}")]public async Task<IActionResult> Horse(string id,string horse,string kind,string eventId,CancellationToken ct)=>PrivateFile(await service.OperationsHorseFileAsync(id,horse,kind,Actor,eventId,ct),kind);
}
