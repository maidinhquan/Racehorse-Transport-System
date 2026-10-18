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
            sp.GetRequiredService<TimeProvider>(), Flow1PrivateStoragePath.Resolve(sp.GetRequiredService<IOptions<Flow1LegacyImportOptions>>().Value.SourceRoot, environment)));
        services.AddScoped<Application.Services.Flow1.Flow1RequestTransaction>();
        services.TryAddSingleton(TimeProvider.System);
        // Compatibility is path-only: never restore the old file state provider or its writer settings.
        var oldRoot = configuration["Flow1:Storage:MetadataRoot"] ?? "App_Data/flow1/metadata";
        services.AddOptions<Flow1PrivateFileOptions>().Configure(o => o.Root = configuration["Flow1:PrivateFiles:Root"] ?? Path.Combine(oldRoot, "private-bytes"))
            .Validate(o => !string.IsNullOrWhiteSpace(o.Root), "Private file root is required.").ValidateOnStart();
        services.AddOptions<Flow1LegacyImportOptions>().Configure(o => o.SourceRoot = configuration["Flow1:LegacyImport:SourceRoot"] ?? oldRoot)
            .Validate(o => !string.IsNullOrWhiteSpace(o.SourceRoot), "Legacy source root is required.").ValidateOnStart();
        return services;
    }
}
