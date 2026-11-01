using Application.Interfaces.Flow4;
using Infrastructure.Services.Flow4;
using Microsoft.Extensions.DependencyInjection;

namespace WebApi.Extensions;

public static class Flow4ServiceExtensions
{
    public static IServiceCollection AddFlow4Services(this IServiceCollection services)
    {
        services.AddScoped<IFlow4DriverService, Flow4DriverService>();
        services.AddScoped<IFlow4HealthService, Flow4HealthService>();
        services.AddScoped<IFlow4CoordinatorService, Flow4CoordinatorService>();
        services.AddScoped<IFlow4SpecialistService, Flow4SpecialistService>();
        services.AddScoped<IFlow4CustomerTrackingService, Flow4CustomerTrackingService>();
        services.AddScoped<IFlow4ManagerService, Flow4ManagerService>();

        return services;
    }
}

