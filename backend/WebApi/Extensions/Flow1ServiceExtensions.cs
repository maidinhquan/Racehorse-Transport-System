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
        // SQL transition S1: available for transaction tests/import tooling; existing use cases
        // remain on their current provider until the separately verified S2 cutover.
        services.AddScoped<IFlow1StateStore, SqlFlow1StateStore>();
        services.TryAddSingleton(TimeProvider.System);
        services.AddOptions<Flow1StorageOptions>().Bind(configuration.GetSection("Flow1:Storage"))
            .Validate(o => !string.IsNullOrWhiteSpace(o.MetadataRoot) && o.MaxDocumentBytes > 0 &&
                o.LockTimeoutMilliseconds > 0, "Invalid Flow1:Storage configuration.").ValidateOnStart();
        services.AddSingleton<IFlow1MetadataStore>(sp =>
        {
            var options = sp.GetRequiredService<IOptions<Flow1StorageOptions>>().Value;
            var path = Path.GetFullPath(options.MetadataRoot, environment.ContentRootPath);
            var webRoot = environment is IWebHostEnvironment web && !string.IsNullOrWhiteSpace(web.WebRootPath)
                ? Path.GetFullPath(web.WebRootPath)
                : Path.GetFullPath("wwwroot", environment.ContentRootPath);
            if (path.Equals(webRoot, StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith(webRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Flow 1 metadata must be outside wwwroot.");
            return new LocalFlow1MetadataStore(path, options, sp.GetRequiredService<TimeProvider>());
        });
        return services;
    }
}
