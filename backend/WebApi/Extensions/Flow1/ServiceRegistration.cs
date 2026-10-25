using Application.Common.Flow1;
using Application.Flow1.Interfaces;
using Application.Flow1.Services;
using Application.Flow1.Settings;
using Infrastructure.Flow1.Data;
using Infrastructure.Flow1.Documents;
using Infrastructure.Flow1.Files;
using Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
namespace WebApi.Extensions.Flow1;
public static class ServiceRegistration
{
    public static IServiceCollection AddRequestModule(this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        var connection = configuration.GetConnectionString("Flow1") ?? configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Configure a Flow 1 database connection.");
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<IPostConfigureOptions<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>, ValidationResponses>();
        services.AddOptions<Flow1PrivateFileOptions>().Configure(o => o.Root = configuration["Flow1:PrivateFiles:Root"] ?? "App_Data/flow1/private-bytes");
        services.AddFlow1Providers(configuration, environment);
        // Retired quote services must not force the old schema/context into the new module.
        services.RemoveAll<Application.Services.Flow1.TransportEstimateService>();
        services.RemoveAll<ICostRates>();
        services.AddDbContext<RequestContext>(o => o.UseSqlServer(connection));
        services.AddScoped<IDataSession, SqlSession>();
        services.AddSingleton(new SchemaCheck(connection)); services.AddScoped<ModuleReadiness>(); services.AddScoped<ModuleErrors>();
        services.AddSingleton<IPrivateFiles>(sp => new LocalFileStore(Flow1PrivateStoragePath.Resolve(
            sp.GetRequiredService<IOptions<Flow1PrivateFileOptions>>().Value.Root, environment)));
        services.AddScoped<IContractRenderer, ContractRenderer>();
        services.AddSingleton(configuration.GetSection("Flow1:Estimate").Get<CostSettings>() ?? new());
        services.AddScoped<AccessService>(); services.AddScoped<PolicyService>(); services.AddScoped<CatalogService>();
        services.AddScoped<LocationService>(); services.AddScoped<DirectoryService>(); services.AddScoped<HorseService>(); services.AddScoped<HorseAvailabilityService>();
        services.AddScoped<HorseFilesService>(); services.AddScoped<RequestDocumentsService>(); services.AddScoped<ChecklistService>();
        services.AddScoped<RequestDetailsService>(); services.AddScoped<RequestService>(); services.AddScoped<RequestReviewService>(); services.AddScoped<NotificationService>();
        services.AddScoped<SnapshotBuilder>(); services.AddScoped<ContractService>(); services.AddScoped<ContractLifecycleService>();
        services.AddScoped<PaymentService>(); services.AddScoped<ContractSigningService>(); services.AddScoped<CancellationService>();
        services.AddScoped<HandoffService>(); services.AddScoped<TripAssignmentService>(); services.AddScoped<CostService>();
        return services;
    }
}
