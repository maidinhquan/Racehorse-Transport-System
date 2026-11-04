using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using Application.Flow6.Services;
using Infrastructure.Flow6.Data;
using Infrastructure.Flow6.Documents;
using Infrastructure.Flow6.Email;
using Infrastructure.Flow6.Payments;
using Infrastructure.Flow6.Runtime;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection.Extensions;
namespace WebApi.Extensions.Flow6;
// Keep the existing VNPay IPN URL. Only references issued by Flow 6 are intercepted.
public sealed class IpnFilter(IServiceProvider services) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context,ActionExecutionDelegate next)
    {
        if(context.ActionDescriptor is Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor action
            && action.ControllerTypeInfo.FullName=="WebApi.Controllers.Flow1.VnpayController" && action.MethodInfo.Name=="IpnAsync"
            && context.HttpContext.Request.Query["vnp_TxnRef"].ToString().StartsWith("F6PAYMENT",StringComparison.Ordinal))
        {
            if(context.HttpContext.Request.Query.Any(p=>p.Value.Count!=1)) {context.Result=new JsonResult(new {RspCode="97",Message="Repeated parameters"});return;}
            var flow6=services.GetRequiredService<AftercareService>();
            context.Result=new JsonResult(await flow6.Ipn(context.HttpContext.Request.Query.ToDictionary(x=>x.Key,x=>x.Value.ToString(),StringComparer.Ordinal),context.HttpContext.RequestAborted),new System.Text.Json.JsonSerializerOptions{PropertyNamingPolicy=null});return;
        }
        await next();
    }
}
