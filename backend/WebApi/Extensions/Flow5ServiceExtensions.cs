using Application.Interfaces.Flow5;
using Infrastructure.Services.Flow5;
using Microsoft.Extensions.DependencyInjection;

namespace WebApi.Extensions;

public static class Flow5ServiceExtensions
{
    public static IServiceCollection AddFlow5Services(this IServiceCollection services)
    {
        services.AddScoped<IFlow5IncidentService, Flow5IncidentService>();
        return services;
    }
}
