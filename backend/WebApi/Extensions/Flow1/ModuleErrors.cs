using Application.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
namespace WebApi.Extensions.Flow1;
public sealed class ModuleErrors : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var sql = context.Exception as SqlException ?? (context.Exception as DbUpdateException)?.InnerException as SqlException;
        if (sql?.Number is 1205 or 2601 or 2627 or 51300)
        {
            context.Result = new ObjectResult(ApiResponse<object?>.Fail("State changed or the operation is busy; reload and retry.",errorCode:"INVALID_STATE")) { StatusCode = 409 };
            context.ExceptionHandled = true;
        }
    }
}
