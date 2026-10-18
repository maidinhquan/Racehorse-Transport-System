using Flow1RelationalConvert;
using Infrastructure.Data.Context;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
// No connection strings or secrets in argv/output. Dry-run is the default.
try {
    var values=args.Chunk(2).ToDictionary(x=>x[0],x=>x.Length==2?x[1]:throw new ArgumentException("Arguments must be --name value pairs."));
    var allowed=new[]{"--target","--source-root","--private-root","--apply","--offline","--fingerprint","--drop-retained-state","--schema-only","--shadow-dry-run","--retain-unverified-history"};
    if(values.Keys.Except(allowed).Any())throw new ArgumentException("Unknown argument.");
    var cs=Environment.GetEnvironmentVariable("FLOW1_CONVERSION_CONNECTION")??throw new ArgumentException("Set FLOW1_CONVERSION_CONNECTION privately.");
    var b=new SqlConnectionStringBuilder(cs);var target=b.DataSource+"/"+b.InitialCatalog;
    if(string.IsNullOrWhiteSpace(b.InitialCatalog)||b.InitialCatalog.Equals("master",StringComparison.OrdinalIgnoreCase)||!values.TryGetValue("--target",out var exact)||exact!=target)throw new ArgumentException("Exact --target server/database is required, including for inventory.");
    await using var context=new Flow1RelationalContext(new DbContextOptionsBuilder<Flow1RelationalContext>().UseSqlServer(cs).Options);
    var history=values.GetValueOrDefault("--retain-unverified-history")?.Split(',',StringSplitOptions.RemoveEmptyEntries).ToHashSet(StringComparer.Ordinal);
    var tool=new RelationalConverter(context,Path.GetFullPath(values["--source-root"]),Path.GetFullPath(values["--private-root"]),history);
    if(values.GetValueOrDefault("--shadow-dry-run")=="true"){if(values.GetValueOrDefault("--apply")=="true")throw new ArgumentException("Shadow inventory cannot apply to the source.");Console.WriteLine(JsonSerializer.Serialize(await ShadowInventory.RunAsync(cs,Path.GetFullPath(values["--source-root"]),Path.GetFullPath(values["--private-root"]),history),new JsonSerializerOptions{WriteIndented=true}));return;}
    if(values.GetValueOrDefault("--schema-only")=="true"){if(values.GetValueOrDefault("--apply")=="true")throw new ArgumentException("Schema inventory cannot apply changes.");Console.WriteLine(JsonSerializer.Serialize(await tool.SchemaAsync(),new JsonSerializerOptions{WriteIndented=true}));return;}
    var result=await tool.RunAsync(values.GetValueOrDefault("--apply")=="true",values.GetValueOrDefault("--offline")=="true",values.GetValueOrDefault("--fingerprint"),values.GetValueOrDefault("--drop-retained-state")=="true");
    Console.WriteLine(JsonSerializer.Serialize(result,new JsonSerializerOptions{WriteIndented=true}));
    if(result.Blockers.Length!=0)Environment.ExitCode=2;
} catch(Exception e)when(e is not OutOfMemoryException){Console.Error.WriteLine("CONVERSION_STOPPED: "+(e is InvalidDataException or ArgumentException?e.Message:"Operator review required; no source/private bytes were changed."));Environment.ExitCode=1;}
