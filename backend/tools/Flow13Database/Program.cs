using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
var root=Directory.GetCurrentDirectory();
if(!File.Exists(Path.Combine(root,"backend/Backend.slnx")))throw new InvalidOperationException("Run from repository root.");
if(args.Length>1||args.Length==1&&args[0] is not ("--inspect" or "--apply"))throw new ArgumentException("Use --inspect or --apply.");
var config=new ConfigurationBuilder().SetBasePath(Path.Combine(root,"backend/WebApi")).AddJsonFile("appsettings.json").AddJsonFile("appsettings.Development.json",true).AddJsonFile("appsettings.Local.json",true).AddJsonFile("appsettings.Flow1Sandbox.Local.json",true).AddEnvironmentVariables().Build();
var connection=config.GetConnectionString("DefaultConnection")??throw new InvalidOperationException("DefaultConnection required.");
var target=new SqlConnectionStringBuilder(connection);
Console.WriteLine($"SQL target: {target.DataSource} / {target.InitialCatalog}");
await using var db=new SqlConnection(connection);await db.OpenAsync();
if(args.FirstOrDefault()=="--apply"){
    if(!new[]{".","localhost",Environment.MachineName,"(localdb)"}.Contains(target.DataSource.Split('\\')[0],StringComparer.OrdinalIgnoreCase)||target.InitialCatalog!="HorseTransportDB")
        throw new InvalidOperationException("This local task only authorizes migration of the configured local HorseTransportDB.");
    foreach(var name in new[]{"008_flow1_deposit_before_signature.sql","009_flow3_persistent_planning.sql"}){
        await using var command=new SqlCommand(await File.ReadAllTextAsync(Path.Combine(root,"backend/database",name)),db){CommandTimeout=120};await command.ExecuteNonQueryAsync();Console.WriteLine("Applied: "+name);
    }
}
await using var inspect=new SqlCommand("""
SELECT 'Contracts' AS Item,COUNT(*) AS Count FROM CONTRACT
UNION ALL SELECT 'Payments',COUNT(*) FROM PAYMENT
UNION ALL SELECT 'Trips',COUNT(*) FROM TRIP_PLAN
UNION ALL SELECT 'Vehicles',COUNT(*) FROM VEHICLE
UNION ALL SELECT 'Staff credentials',COUNT(*) FROM STAFF_DOCUMENT
UNION ALL SELECT 'Workflow column',CASE WHEN COL_LENGTH('dbo.CONTRACT','WorkflowVersion') IS NULL THEN 0 ELSE 1 END
UNION ALL SELECT 'Persistent planning table',CASE WHEN OBJECT_ID('dbo.FLOW3_PLAN','U') IS NULL THEN 0 ELSE 1 END;
""",db);
await using var reader=await inspect.ExecuteReaderAsync();while(await reader.ReadAsync())Console.WriteLine($"{reader.GetString(0)}: {reader.GetInt32(1)}");
