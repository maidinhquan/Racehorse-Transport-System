using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
namespace WebApi.Controllers;
// Old planning endpoints returned synthetic routes and wrote Trip.Status directly.
// Keep an explicit migration response rather than allowing a second write path.
public sealed class RetiredPlanningAttribute:ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext context)=>context.Result=new ObjectResult(new{success=false,errorCode="PLANNING_API_RETIRED",message="Use /api/planning for persisted, versioned planning."}){StatusCode=410};
}
