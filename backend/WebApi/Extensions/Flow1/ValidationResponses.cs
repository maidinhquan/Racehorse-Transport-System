using Application.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.Options;
using WebApi.Controllers.Flow1;

namespace WebApi.Extensions.Flow1;
public sealed class ValidationResponses : IPostConfigureOptions<ApiBehaviorOptions>
{
    public void PostConfigure(string? name, ApiBehaviorOptions options)
    {
        var previous = options.InvalidModelStateResponseFactory;
        options.InvalidModelStateResponseFactory = context =>
        {
            var result = previous(context);
            if (context.ActionDescriptor is ControllerActionDescriptor action
                && typeof(EndpointController).IsAssignableFrom(action.ControllerTypeInfo)
                && result is ObjectResult { Value: ApiResponse<object?> payload })
                payload.ErrorCode = "VALIDATION_ERROR";
            return result;
        };
    }
}
