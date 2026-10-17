using System.Reflection;
using Application.Common.Flow1;
using Application.Interfaces.Flow1;
using Application.Services.Flow1.Relational;
using Infrastructure.Data.Context;
using Infrastructure.Storage;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace WebApi.Extensions;

// Entire API generation is selected once, never a field/resource fallback.
// The legacy branch is used explicitly by historical regression test hosts only.
public sealed class Flow1ControllerSelection(bool legacyTests=false):IApplicationFeatureProvider<ControllerFeature>
{
    public void PopulateFeature(IEnumerable<ApplicationPart> parts,ControllerFeature feature)
    {
        foreach(var type in feature.Controllers.ToArray())
        {
            var ns=type.Namespace??"";
            if(!ns.StartsWith("WebApi.Controllers.Flow1",StringComparison.Ordinal))continue;
            if(type.Name is "MapboxPreviewController" or "PublicEstimatesController")continue;
            var relational=ns.EndsWith(".Relational",StringComparison.Ordinal);
            if(relational==legacyTests)feature.Controllers.Remove(type);
        }
    }
}
public static class Flow1RelationalExtensions
{
    public static IServiceCollection AddFlow1Relational(this IServiceCollection s,IConfiguration config,IHostEnvironment env)
    {
        s.AddSingleton(TimeProvider.System);
        s.AddOptions<Flow1PrivateFileOptions>().Configure(o=>o.Root=config["Flow1:PrivateFiles:Root"]??"App_Data/flow1/private-bytes");
        s.AddFlow1Providers(config,env);
        s.AddDbContext<Flow1RelationalContext>(o=>o.UseSqlServer(config.GetConnectionString("DefaultConnection")));
        s.AddScoped<IFlow1Data>(sp=>new Flow1Data(sp.GetRequiredService<Flow1RelationalContext>(),
            Flow1PrivateStoragePath.Resolve(config["Flow1:LegacyImport:SourceRoot"]??config["Flow1:Storage:MetadataRoot"]??"App_Data/flow1/metadata",env))); s.AddScoped<RelationalFlow1Service>();
        s.AddSingleton<IFlow1CurrentFiles>(sp=>new Flow1CurrentFiles(Flow1PrivateStoragePath.Resolve(sp.GetRequiredService<IOptions<Flow1PrivateFileOptions>>().Value.Root,env),sp.GetRequiredService<IFlow1PrivateFileStore>()));
        return s;
    }
}
