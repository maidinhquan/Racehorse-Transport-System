using Microsoft.Data.SqlClient;
using System.Text.Json;
using System.Text.RegularExpressions;

// Explicit disposable local Swagger fixture. Never uses HorseTransportDB or SMTP/provider credentials.
if(args.Length!=2 || args[0] is not ("prepare" or "cleanup"))throw new ArgumentException("prepare|cleanup absolute-fixture-json-path");
var fixturePath=Path.GetFullPath(args[1]);
var server=Environment.GetEnvironmentVariable("RACEHORSE_TEST_SQL_SERVER")??@".\SQLEXPRESS";
if(!new[]{".","localhost",Environment.MachineName,"(localdb)"}.Contains(server.Split('\\')[0],StringComparer.OrdinalIgnoreCase))throw new InvalidOperationException("Only local SQL fixtures are permitted.");
var master=new SqlConnectionStringBuilder{DataSource=server,InitialCatalog="master",IntegratedSecurity=true,TrustServerCertificate=true}.ConnectionString;
async Task Execute(string connection,string sql){await using var c=new SqlConnection(connection);await c.OpenAsync();await using var cmd=new SqlCommand(sql,c){CommandTimeout=60};await cmd.ExecuteNonQueryAsync();}
if(args[0]=="cleanup"){
    var fixture=JsonSerializer.Deserialize<Dictionary<string,string>>(await File.ReadAllTextAsync(fixturePath))!;var name=fixture["database"];
    if(!Regex.IsMatch(name,@"\ARaceHorseFlow1Swagger_[a-f0-9]{32}\z"))throw new InvalidOperationException("Invalid fixture database name.");
    await Execute(master,$"ALTER DATABASE [{name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;DROP DATABASE [{name}];");Console.WriteLine("Disposable Swagger database removed.");return;
}
var db="RaceHorseFlow1Swagger_"+Guid.NewGuid().ToString("N");
var builder=new SqlConnectionStringBuilder(master){InitialCatalog=db};await Execute(master,$"CREATE DATABASE [{db}];");
try{
    foreach(var file in new[]{"000_legacy_schema.sql","003_flow1_minimal_schema.sql","006_flow1_simple_relational_foundation.sql","007_flow1_request_baseline.sql","008_flow1_readable_request_codes.sql","009_flow1_final_workflow.sql"})
        await Execute(builder.ConnectionString,await File.ReadAllTextAsync(Path.Combine("backend/database",file)));
    var hash=BCrypt.Net.BCrypt.HashPassword("SwaggerFixture123!");
    foreach(var (id,role) in new[]{("customer","CUSTOMER"),("other","CUSTOMER"),("manager","LOGISTICS_MANAGER"),("manager2","LOGISTICS_MANAGER"),("specialist","TRANSPORT_SPECIALIST"),("coordinator","FLEET_ROUTE_COORDINATOR"),("specialist2","TRANSPORT_SPECIALIST"),("coordinator2","FLEET_ROUTE_COORDINATOR")}){
        await using var c=new SqlConnection(builder.ConnectionString);await c.OpenAsync();await using var cmd=new SqlCommand("INSERT dbo.[USER](UserID,Username,PasswordHash,Role,FullName,Email,IsActive) VALUES(@id,@id,@hash,@role,@id,@email,1)",c);
        cmd.Parameters.AddWithValue("@id",id);cmd.Parameters.AddWithValue("@hash",hash);cmd.Parameters.AddWithValue("@role",role);cmd.Parameters.AddWithValue("@email",id+"@swagger.example.invalid");await cmd.ExecuteNonQueryAsync();
    }
    Directory.CreateDirectory(Path.GetDirectoryName(fixturePath)!);
    await File.WriteAllTextAsync(fixturePath,JsonSerializer.Serialize(new{database=db,connection=builder.ConnectionString}));Console.WriteLine("Disposable Swagger fixture ready.");
}catch{await Execute(master,$"ALTER DATABASE [{db}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;DROP DATABASE [{db}];");throw;}
