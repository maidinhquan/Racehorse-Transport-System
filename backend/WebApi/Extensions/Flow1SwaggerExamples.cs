using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace WebApi.Extensions;

public sealed class Flow1SwaggerExamples : IOperationFilter
{
    public void Apply(OpenApiOperation operation,OperationFilterContext context)
    {
        var path=context.ApiDescription.RelativePath??"";
        if(!path.StartsWith("api/manager",StringComparison.OrdinalIgnoreCase) && !path.StartsWith("api/customer",StringComparison.OrdinalIgnoreCase) && !path.StartsWith("api/operations/flow1",StringComparison.OrdinalIgnoreCase))return;
        operation.Description=(operation.Description??"")+"\nFlow 1: Get the current record first and copy its `version` (a concurrency token, not a contract edition). Use the signed-in account's role. One shared 24-hour deadline covers deposit, verification and OTP signing. Deposit verification alone never creates a Trip.";
        var action=operation.Parameters?.FirstOrDefault(p=>p.Name=="operation");
        if(action is not null)action.Schema.Enum=(path.Contains("/cancellation/")?new[]{"approve","reject","refund-start","refund-complete"}:new[]{"confirm","hold","resume"}).Select(x=>(IOpenApiAny)new OpenApiString(x)).ToList();
        foreach(var code in new[]{"400","401","403","404","409","429","503"})operation.Responses.TryAdd(code,new OpenApiResponse{Description=code switch{"400"=>"Invalid fields; check errors/errorCode.","401"=>"Login and authorize with the accessToken.","403"=>"Wrong role or assignment.","404"=>"Resource unavailable to this account.","409"=>"Business guard or stale version; reload the record.","429"=>"Rate limit; retry after Retry-After.",_=>"Required provider/configuration/schema unavailable."}});
        if(operation.RequestBody?.Content.TryGetValue("application/json",out var media)!=true)return;
        // RevisionInput wraps the complete request; never replace it with FlowAction.
        if(path.EndsWith("/revision",StringComparison.OrdinalIgnoreCase))return;
        OpenApiObject body=new(){["version"]=new OpenApiString("COPY_version_FROM_GET"),["reason"]=new OpenApiString("Confirmed by responsible Manager")};
        if(path.EndsWith("/clauses",StringComparison.OrdinalIgnoreCase)||path.Contains("/clauses/",StringComparison.OrdinalIgnoreCase))
            body=new(){["title"]=new OpenApiString("Điều kiện vận chuyển"),["content"]=new OpenApiString("Hai bên thực hiện vận chuyển theo lịch và giá trong hợp đồng."),["languageCode"]=new OpenApiString("VI"),["isActive"]=new OpenApiBoolean(true)};
        else if(path.EndsWith("/feedback",StringComparison.OrdinalIgnoreCase))
            body=new(){["version"]=new OpenApiString("COPY_version_FROM_GET"),["feedbackMessage"]=new OpenApiString("Đề nghị điều chỉnh giá và lịch đón/giao."),["fields"]=new OpenApiArray{new OpenApiString("PRICE"),new OpenApiString("DEPARTURE_AT"),new OpenApiString("DELIVERY_AT")}};
        else if(path.EndsWith("/publish",StringComparison.OrdinalIgnoreCase))body["clauseIds"]=new OpenApiArray{new OpenApiString("COPY_clauseId_FROM_GET_manager_clauses")};
        else if(path.Contains("/deployment/",StringComparison.OrdinalIgnoreCase)){
            body["assignedSpecialistId"]=new OpenApiString("COPY_userId_FROM_staff_specialists");body["assignedCoordinatorId"]=new OpenApiString("COPY_userId_FROM_staff_coordinators");operation.Description+=" For deployment use trip.version, not contract.version.";
        }
        else if(path.EndsWith("/otp",StringComparison.OrdinalIgnoreCase)||path.EndsWith("/sign",StringComparison.OrdinalIgnoreCase)){
            body.Remove("reason");body["pdfSha256"]=new OpenApiString("COPY_pdfSha256_FROM_GET");if(path.EndsWith("/sign",StringComparison.OrdinalIgnoreCase))body["otp"]=new OpenApiString("COPY_6_digit_code_FROM_EMAIL");
        }
        else if(path.EndsWith("/contracts",StringComparison.OrdinalIgnoreCase)){
            body["price"]=new OpenApiLong(100000000);body["preparationDays"]=new OpenApiInteger(2);operation.Description+=" Draft uses request.version. The issue deadline is calculated by the server, not supplied by the client.";
        }
        else if(path.EndsWith("/reissue",StringComparison.OrdinalIgnoreCase)){
            body["price"]=new OpenApiLong(95000000);body["preparationDays"]=new OpenApiInteger(2);body["departureAt"]=new OpenApiString("2026-12-20T08:00:00+07:00");body["deliveryAt"]=new OpenApiString("2026-12-21T08:00:00+07:00");body["clauseIds"]=new OpenApiArray{new OpenApiString("COPY_clauseId_FROM_GET_manager_clauses")};
        }
        else if(path.EndsWith("/extend",StringComparison.OrdinalIgnoreCase)){body["deadline"]=new OpenApiString("2026-12-10T08:00:00+07:00");operation.Description+=" This extends the ONE shared deadline; payment and signing do not get separate windows.";}
        else if(!path.Contains("/contracts/",StringComparison.OrdinalIgnoreCase) && !path.Contains("/requests/",StringComparison.OrdinalIgnoreCase) && !path.EndsWith("/ack",StringComparison.OrdinalIgnoreCase))return;
        if(path.Contains("/cancellation/",StringComparison.OrdinalIgnoreCase)){body["cancellationId"]=new OpenApiString("COPY_cancellationId_FROM_GET");if(action is not null){body["target"]=new OpenApiString("VERIFIED_BANK_REFUND_REFERENCE");operation.Description+=" For refund-complete, target must contain the verified refund reference. This records a refund performed separately; it does not transfer money.";}}
        if(path.EndsWith("/ack",StringComparison.OrdinalIgnoreCase)){body["eventId"]=new OpenApiString("COPY_eventId_FROM_GET_operations_queue");operation.Description+=" Use trip.version and the current eventId from the assigned queue.";}
        media!.Example=body;
    }
}
