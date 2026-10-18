using Application.Interfaces.Flow1;
using Application.Services.Flow1;
using Infrastructure.DAOs.Flow1;
namespace WebApi.Extensions;
public static class LegacyFlow1TestExtensions
{
    public static IServiceCollection AddFlow1Customer(this IServiceCollection services, IConfiguration config, IHostEnvironment environment)
    {
        services.AddLegacyFlow1Services();
        return services.AddFlow1Providers(config,environment);
    }
    // Explicit historical regression support; not registered by the active WebApi.
    public static IServiceCollection AddLegacyFlow1Services(this IServiceCollection services)
    {
        services.AddScoped<ICustomerTransportRepository, CustomerTransportRepository>();
        services.AddScoped<CustomerTransportService>();
        services.AddScoped<IRequestReviewRepository, RequestReviewRepository>();
        services.AddScoped<RequestReviewService>();
        services.AddScoped<ContractPublicationService>();
        services.AddScoped<ContractAcceptanceService>();
        services.AddScoped<ContractLifecycleService>();
        services.AddScoped<ContractDeadlinePolicy>();
        services.AddScoped<ContractDeadlineService>();
        services.AddScoped<DepositPaymentService>();
        services.AddScoped<DeploymentService>();
        return services;
    }
}
