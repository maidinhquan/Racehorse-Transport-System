using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using Application.Flow6.Services;
using Infrastructure.Flow6.Data;
using Infrastructure.Flow6.Documents;
using Infrastructure.Flow6.Email;
using Infrastructure.Flow6.Payments;
using Infrastructure.Flow6.Runtime;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection.Extensions;
namespace WebApi.Extensions.Flow6;
public static class ServiceRegistration
{
    private static string Connection(IConfiguration configuration)
    {
        var original=configuration.GetConnectionString("Flow1")??configuration.GetConnectionString("DefaultConnection")??throw new InvalidOperationException("Flow 6 requires the shared business database.");
        var selected=configuration.GetConnectionString("Flow6")??original;
        var a=new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(original);var b=new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(selected);
        if(!string.Equals(a.DataSource,b.DataSource,StringComparison.OrdinalIgnoreCase)||!string.Equals(a.InitialCatalog,b.InitialCatalog,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Flow 6 and Flow 1 must use the same server/database for atomic financial writes.");
        return selected;
    }
    public static IServiceCollection AddFlow6Module(this IServiceCollection services,IConfiguration configuration,IHostEnvironment environment)
    {
        services.TryAddSingleton<IRuntimeGuards,MemoryGuards>();
        var flow6Email = configuration.GetSection("Flow6:Email").Get<Infrastructure.ExternalServices.Flow1.ContractSmtpOptions>() ?? new();
        if (!configuration.GetSection("Flow6:Email:Smtp").Exists())
            flow6Email.Smtp = configuration.GetSection("RegistrationEmail:Smtp").Get<Infrastructure.ExternalServices.Email.RegistrationSmtpOptions>() ?? new();
        services.TryAddSingleton<IDeliveryOtpSender>(_=>new DeliveryOtpSender(flow6Email,environment.IsDevelopment()));
        services.AddScoped<Infrastructure.Flow1.Data.SqlSession>();
        services.AddScoped<Application.Flow1.Interfaces.IDataSession,DepositSession>();
        services.AddScoped<IAftercareStore>(_=>new SqlStore(Connection(configuration)));
        services.TryAddSingleton<IDeliveryRenderer>(_=>new DeliveryRenderer(configuration["Flow6:LibreOfficeExecutable"]??""));
        services.TryAddScoped<IRefundVerifier,UnavailableRefundVerifier>();
        services.AddScoped<AftercareService>(sp=>new(sp.GetRequiredService<IAftercareStore>(),sp.GetRequiredService<Application.Flow1.Interfaces.IOtpSecurity>(),sp.GetRequiredService<IDeliveryOtpSender>(),sp.GetRequiredService<Application.Flow1.Interfaces.IPaymentGateway>(),sp.GetRequiredService<TimeProvider>(),sp.GetRequiredService<IDeliveryRenderer>(),sp.GetRequiredService<IRuntimeGuards>()){RefundVerifier=sp.GetRequiredService<IRefundVerifier>(),QueryGateway=sp.GetService<Application.Flow1.Interfaces.IGatewayQuery>()});
        services.AddSwaggerGen(o=>{o.OperationFilter<SwaggerLayout>();o.DocumentFilter<SwaggerLayout>();});
        services.AddScoped<IpnFilter>();
        services.Configure<MvcOptions>(options=>options.Filters.AddService<IpnFilter>());
        if(configuration.GetValue<bool>("Flow6:EnableClosureWorker")) services.AddHostedService<ClosureWorker>();
        if(configuration.GetValue<bool>("Flow6:EnablePaymentReconciliation"))services.AddHostedService<ReconciliationWorker>();
        return services;
    }
}
