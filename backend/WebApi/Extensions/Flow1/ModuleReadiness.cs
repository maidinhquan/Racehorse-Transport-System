using Infrastructure.Flow1.Data;
using Microsoft.AspNetCore.Mvc.Filters;
namespace WebApi.Extensions.Flow1;
public sealed class ModuleReadiness(SchemaCheck schema) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        await schema.EnsureAsync(context.HttpContext.RequestAborted);
        await next();
    }
}
