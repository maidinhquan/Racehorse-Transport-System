using Application.Common.Flow1;
using Application.Interfaces.Flow1;
using Domain.Interfaces;
using Domain.Interfaces.DAOs;
using Infrastructure.DAOs.Flow1;
using Infrastructure.Storage;
using Infrastructure.Transactions;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace WebApi.Extensions;

public static class Flow1ServiceExtensions
{
    // Foundation only: no migration, payment workflow or background job is run on startup.
    public static IServiceCollection AddFlow1Foundation(this IServiceCollection services,
        IConfiguration configuration, IHostEnvironment environment)
    {
        services.AddScoped<IFlow1UnitOfWork, Flow1UnitOfWork>();
        services.AddScoped<IFlow1Repository, Flow1Repository>();
        services.AddScoped<IFlow1StateStore>(sp => new SqlFlow1StateStore(sp.GetRequiredService<Infrastructure.Data.Context.HorseTransportDbContext>(),
            sp.GetRequiredService<TimeProvider>(), Flow1PrivateStoragePath.Resolve(sp.GetRequiredService<IOptions<Flow1StorageOptions>>().Value, environment)));
        services.AddScoped<Application.Services.Flow1.Flow1RequestTransaction>();
        services.TryAddSingleton(TimeProvider.System);
        services.AddOptions<Flow1StorageOptions>().Bind(configuration.GetSection("Flow1:Storage"))
            .Validate(o => !string.IsNullOrWhiteSpace(o.MetadataRoot) && o.MaxDocumentBytes > 0 &&
                o.LockTimeoutMilliseconds > 0, "Invalid Flow1:Storage configuration.").ValidateOnStart();
        return services;
    }
}
