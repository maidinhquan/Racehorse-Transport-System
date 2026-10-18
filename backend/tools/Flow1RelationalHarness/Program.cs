using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;
using Application.Common.Flow1;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System.Text.Json;
using Application.Interfaces.Flow1;
using Infrastructure.Data.Context;

using Microsoft.EntityFrameworkCore;

// Explicit local-only connected test; no writes to the configured business database.
var serve = args.Length == 3 && args[2] == "--serve";
var mainSource = Environment.GetEnvironmentVariable("FLOW1_BROWSER_MAIN_SOURCE") == "1";
if (args.Length != 2 && !serve) throw new ArgumentException("Arguments: absolute Node executable, absolute Playwright module directory, optional --serve.");
var repository = Directory.GetCurrentDirectory();
if (!File.Exists(Path.Combine(repository, "backend/Backend.slnx"))) throw new InvalidOperationException("Run from repository root.");
// Explicit opt-in for bounded real map requests; all SQL/files/accounts remain test-only.
var liveMaps = false;
var signing = true;
var lifecycle = Environment.GetEnvironmentVariable("FLOW1_BROWSER_LIFECYCLE") == "1";
var deadlines = Environment.GetEnvironmentVariable("FLOW1_BROWSER_DEADLINES") == "1";
var bank = Environment.GetEnvironmentVariable("FLOW1_BROWSER_BANK") == "1";
var gateway = true;
var deployment = true;
var cancellation = Environment.GetEnvironmentVariable("FLOW1_BROWSER_CANCELLATION") == "1";
var phase4 = signing || Environment.GetEnvironmentVariable("FLOW1_BROWSER_PHASE4") == "1";
var phase3 = phase4 || Environment.GetEnvironmentVariable("FLOW1_BROWSER_PHASE3") == "1";
Flow1MapOptions? liveOptions = null;
if (liveMaps)
{
    var liveConfig = new ConfigurationBuilder().SetBasePath(Path.Combine(repository, "backend/WebApi"))
        .AddJsonFile("appsettings.json").AddJsonFile("appsettings.Development.json", optional: true)
        .AddJsonFile("appsettings.Local.json", optional: true).AddEnvironmentVariables().Build();
    liveOptions = liveConfig.GetSection("Flow1:Maps").Get<Flow1MapOptions>();
    if (liveOptions is null || liveOptions.Provider != "MAPBOX" || liveOptions.DataProvider != "GEOAPIFY" ||
        !liveOptions.MayPersistResults || string.IsNullOrWhiteSpace(liveOptions.Geoapify.ApiKey) ||
        string.IsNullOrWhiteSpace(liveOptions.Mapbox.AccessToken) ||
        liveConfig.GetValue<int?>("Flow1:Estimate:StandardVehicleCapacityStalls") != 1)
        throw new InvalidOperationException("Live maps require configured Geoapify data, Mapbox preview and the approved capacity=1 policy.");
}
var server = Environment.GetEnvironmentVariable("RACEHORSE_TEST_SQL_SERVER") ?? "";
if (!new[] { ".", "localhost", Environment.MachineName, "(localdb)" }.Contains(server.Split('\\')[0], StringComparer.OrdinalIgnoreCase))
    throw new InvalidOperationException("Set RACEHORSE_TEST_SQL_SERVER to a local SQL instance.");
var name = "RaceHorseFlow1Browser_" + Guid.NewGuid().ToString("N");
var master = new SqlConnectionStringBuilder { DataSource = server, InitialCatalog = "master", IntegratedSecurity = true, TrustServerCertificate = true }.ConnectionString;
var connection = new SqlConnectionStringBuilder(master) { InitialCatalog = name }.ConnectionString;
var output = Path.Combine(repository, (serve ? "backend/WebApi/App_Data/flow1/local-demo-" : "backend/WebApi/App_Data/flow1/browser-") + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(output);
Process? api = null;
StreamWriter? log = null;
var created = false;
try
{
    await Sql(master, $"CREATE DATABASE [{name}];"); created = true;
    foreach (var file in new[] { "000_legacy_schema.sql", "003_flow1_minimal_schema.sql", "006_flow1_simple_relational_foundation.sql", "007_flow1_request_baseline.sql", "008_flow1_readable_request_codes.sql" })
        await Sql(connection, await File.ReadAllTextAsync(Path.Combine(repository, "backend/database", file)));
    await Sql(connection, "INSERT INTO dbo.[USER](UserID,PasswordHash,Role,FullName) VALUES ('browser-owner','test-only','CUSTOMER',N'Browser Demo');");
    if (phase3) await Sql(connection, "INSERT INTO dbo.[USER](UserID,PasswordHash,Role,FullName) VALUES ('browser-manager','test-only','LOGISTICS_MANAGER',N'Manager Demo');");
    if (deployment) await Sql(connection, "INSERT INTO dbo.[USER](UserID,PasswordHash,Role,FullName) VALUES ('browser-route','test-only','FLEET_ROUTE_COORDINATOR',N'Route Demo'),('browser-docs','test-only','TRANSPORT_SPECIALIST',N'Documents Demo');");
    if (signing) await Sql(connection, "UPDATE dbo.[USER] SET Email='browser-owner@example.invalid' WHERE UserID='browser-owner';");
    var loginHash=BCrypt.Net.BCrypt.HashPassword("Flow1_Native_Fixture_Only_2026!");
    await Sql(connection,"UPDATE [USER] SET Email=UserID+'@example.invalid',PasswordHash='"+loginHash+"';");
    if(mainSource) await Sql(connection,"UPDATE [USER] SET Phone='0900000000' WHERE UserID='browser-owner';");
    var apiPort = serve ? Available(5129) : Port(); var mapPort = Port(); var frontPort = serve ? Available(5173) : Port();
    if(serve) await File.WriteAllTextAsync(Path.Combine(output,"host.json"),JsonSerializer.Serialize(new { hostPid=Environment.ProcessId, database=name, output, apiPort, frontPort }));
    var smtpPort = Port();
    var mapProvider = Environment.GetEnvironmentVariable("FLOW1_BROWSER_MAP_PROVIDER") ?? "OSM";
    if (mapProvider is not ("OSM" or "MAPBOX" or "GEOAPIFY")) throw new ArgumentException("FLOW1_BROWSER_MAP_PROVIDER must be OSM, MAPBOX or GEOAPIFY.");
    const string jwt = "Flow1BrowserFixtureKey_NotAProductionSecret_2026_AtLeast32Bytes";
    var apiInfo = new ProcessStartInfo("dotnet") { WorkingDirectory = Path.Combine(repository, "backend/WebApi"), UseShellExecute = false, RedirectStandardOutput = true, RedirectStandardError = true, CreateNoWindow = true };
    apiInfo.ArgumentList.Add(Path.Combine(repository, "backend/WebApi/bin/Debug/net8.0/WebApi.dll"));
    apiInfo.ArgumentList.Add("--urls"); apiInfo.ArgumentList.Add($"http://127.0.0.1:{apiPort}");
    var env = new Dictionary<string, string> {
        ["ASPNETCORE_ENVIRONMENT"] = "Development", ["ConnectionStrings__DefaultConnection"] = connection,
        ["Jwt__Key"] = jwt, ["RegistrationEmail__Mode"] = "Development",
        ["Flow1__Maps__Provider"] = mapProvider == "OSM" ? "OSM" : "MAPBOX",
        ["Flow1__Maps__DataProvider"] = mapProvider == "OSM" ? "OSM" : "GEOAPIFY",
        ["Flow1__Maps__Geoapify__ApiKey"] = "geoapify_flow1_fixture_not_live",
        ["Flow1__Maps__Geoapify__ApiBaseUrl"] = $"http://127.0.0.1:{mapPort}/",
        ["Flow1__Maps__Mapbox__ApiBaseUrl"] = $"http://127.0.0.1:{mapPort}/",
        ["Flow1__Maps__Mapbox__AccessToken"] = "pk.flow1_fixture_not_live",
        ["Flow1__Maps__Mapbox__PermanentGeocodingEnabled"] = "false",
        ["Flow1__Maps__Mapbox__Attribution"] = "LOCAL MAPBOX HTTP FIXTURE - NOT LIVE",
        ["Flow1__Maps__RoutingBaseUrl"] = $"http://127.0.0.1:{mapPort}/", ["Flow1__Maps__GeocodingBaseUrl"] = $"http://127.0.0.1:{mapPort}/",
        ["Flow1__Maps__UserAgent"] = "RaceHorse-LocalBrowserFixture/1.0", ["Flow1__Maps__MayPersistResults"] = "true",
        ["Flow1__Maps__Attribution"] = "LOCAL HTTP FIXTURE - NOT LIVE MAP DATA", ["Flow1__Estimate__StandardVehicleCapacityStalls"] = "1",
        ["Flow1__PrivateFiles__Root"] = Path.Combine(output, "private-bytes"),
        ["Flow1__LegacyImport__SourceRoot"] = Path.Combine(output, "legacy-source") };
    foreach (var pair in env) apiInfo.Environment[pair.Key] = pair.Value;
    // Fixture merchant signs only local callbacks; this never contacts VNPay or sends a real transaction.
    apiInfo.Environment["Flow1__Vnpay__Enabled"] = gateway ? "true" : "false";
    if (gateway) {
        apiInfo.Environment["Flow1__Vnpay__TmnCode"] = "TEST2026";
        apiInfo.Environment["Flow1__Vnpay__HashSecret"] = "Sandbox_Unit_Test_Key_Not_A_Provider_Credential";
        apiInfo.Environment["Flow1__Vnpay__PaymentUrl"] = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
        apiInfo.Environment["Flow1__Vnpay__ReturnUrl"] = $"http://127.0.0.1:{frontPort}/customer/payments/return";
    }
    // Always override private SMTP configuration. The Node sink binds only loopback and never forwards mail.
    apiInfo.Environment["Flow1__Contracts__OtpHmacKey"] = "ContractBrowserFixture_Key_NotProduction_AtLeast32Bytes_2026";
    apiInfo.Environment["Flow1__Contracts__Email__Smtp__Host"] = "127.0.0.1";
    apiInfo.Environment["Flow1__Contracts__Email__Smtp__Port"] = smtpPort.ToString();
    apiInfo.Environment["Flow1__Contracts__Email__Smtp__From"] = "noreply@example.invalid";
    apiInfo.Environment["Flow1__Contracts__Email__Smtp__EnableSsl"] = "false";
    apiInfo.Environment["Flow1__Contracts__Email__Smtp__Username"] = "";
    apiInfo.Environment["Flow1__Contracts__Email__Smtp__Password"] = "";
    apiInfo.Environment["Flow1__Contracts__Email__AllowDevelopmentLoopback"] = "true";
    if (phase4)
    {
        apiInfo.Environment["Flow1__Contracts__LibreOfficePath"] = Environment.GetEnvironmentVariable("RACEHORSE_TEST_LIBREOFFICE")
            ?? throw new InvalidOperationException("Phase 4 browser requires explicit RACEHORSE_TEST_LIBREOFFICE.");
        apiInfo.Environment["Flow1__Contracts__WorkRoot"] = Path.Combine(output, "conversion");
        foreach (var field in new[] { "COMPANY_NAME", "COMPANY_ADDRESS", "COMPANY_EMAIL", "COMPANY_HOTLINE", "COMPANY_TAX_CODE", "COMPANY_BANK_ACCOUNT", "COMPANY_BANK_NAME", "COMPANY_REPRESENTATIVE", "COMPANY_REP_POSITION" })
            apiInfo.Environment["Flow1__Contracts__Issuer__" + field] = "DEMO FIXTURE " + field;
    }
    if (liveOptions is not null)
    {
        // Real keys stay in the backend process. Never pass them to Node/browser/output.
        apiInfo.Environment["Flow1__Maps__Provider"] = "MAPBOX";
        apiInfo.Environment["Flow1__Maps__DataProvider"] = "GEOAPIFY";
        apiInfo.Environment["Flow1__Maps__Geoapify__ApiKey"] = liveOptions.Geoapify.ApiKey;
        apiInfo.Environment["Flow1__Maps__Geoapify__ApiBaseUrl"] = "https://api.geoapify.com/";
        apiInfo.Environment["Flow1__Maps__Mapbox__AccessToken"] = liveOptions.Mapbox.AccessToken;
        apiInfo.Environment["Flow1__Maps__Mapbox__ApiBaseUrl"] = "https://api.mapbox.com/";
    }
    log = new StreamWriter(Path.Combine(output, "api.log")) { AutoFlush = true };
    api = Process.Start(apiInfo) ?? throw new InvalidOperationException("Could not launch local API.");
    api.OutputDataReceived += (_, e) => { if (e.Data is not null) lock (log) log.WriteLine(e.Data); };
    api.ErrorDataReceived += (_, e) => { if (e.Data is not null) lock (log) log.WriteLine(e.Data); };
    api.BeginOutputReadLine(); api.BeginErrorReadLine();
    var nodeInfo = new ProcessStartInfo(Path.GetFullPath(args[0])) { WorkingDirectory = repository, UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true };
    nodeInfo.ArgumentList.Add(Path.Combine(repository, "backend/tools/flow1-relational-browser.cjs"));
    foreach (var arg in new[] { args[1], apiPort.ToString(), mapPort.ToString(), frontPort.ToString(), output, smtpPort.ToString() }) nodeInfo.ArgumentList.Add(arg);
    nodeInfo.Environment["FLOW1_LOCAL_DEMO"] = serve ? "1" : "0";
    nodeInfo.Environment["FLOW1_BROWSER_PHASE3"] = phase3 ? "1" : "0";
    nodeInfo.Environment["FLOW1_BROWSER_PHASE4"] = phase4 ? "1" : "0";
    nodeInfo.Environment["FLOW1_BROWSER_SIGNING"] = signing ? "1" : "0";
    nodeInfo.Environment["FLOW1_BROWSER_LIVE_MAPS"] = liveMaps ? "1" : "0";
    foreach (var key in nodeInfo.Environment.Keys.Where(k => k.StartsWith("Flow1__Maps__", StringComparison.OrdinalIgnoreCase)).ToArray())
        nodeInfo.Environment.Remove(key);
    using var node = Process.Start(nodeInfo) ?? throw new InvalidOperationException("Could not start browser runner.");
    var stdout = node.StandardOutput.ReadToEndAsync(); var stderr = node.StandardError.ReadToEndAsync();
    using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(deployment ? 10 : bank || cancellation ? 8 : lifecycle || deadlines ? 7 : phase4 ? 5 : 4));
    try { await node.WaitForExitAsync(serve && Environment.GetEnvironmentVariable("FLOW1_LOCAL_DEMO_AUTOCHECK")!="1" ? CancellationToken.None : timeout.Token); }
    finally { if (!node.HasExited) node.Kill(entireProcessTree: true); }
    var nodeLog = await stdout + "\n" + await stderr;
    await File.WriteAllTextAsync(Path.Combine(output, "browser.log"), nodeLog);
    Console.WriteLine(nodeLog);
    if (node.ExitCode != 0) throw new InvalidOperationException($"Chromium flow failed; inspect {output}.");
    if(serve && Environment.GetEnvironmentVariable("FLOW1_LOCAL_DEMO_AUTOCHECK")!="1"){Console.WriteLine("Local demo stopped. Its private test database will be removed; business DB was never used.");return;}
    await using var apiLogRead = new FileStream(Path.Combine(output, "api.log"), FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
    using var apiLogReader = new StreamReader(apiLogRead);
    var apiLog = await apiLogReader.ReadToEndAsync();
    if (apiLog.Contains("pk.flow1_fixture_not_live") || apiLog.Contains("geoapify_flow1_fixture_not_live"))
        throw new InvalidOperationException("A fixture map credential leaked into API logs.");
    if (liveOptions is not null && (apiLog.Contains(liveOptions.Mapbox.AccessToken) || apiLog.Contains(liveOptions.Geoapify.ApiKey) ||
        nodeLog.Contains(liveOptions.Mapbox.AccessToken) || nodeLog.Contains(liveOptions.Geoapify.ApiKey)))
        throw new InvalidOperationException("A map credential leaked into a test log.");
    if(mainSource) await Sql(connection,$"IF (SELECT COUNT(*) FROM HORSE)<>{(Environment.GetEnvironmentVariable("FLOW1_BROWSER_BASELINE")=="1"?2:1)} OR (SELECT COUNT(*) FROM TRANSPORT_REQUEST WHERE Status='AWAITING_SIGNATURE')<>1 OR (SELECT COUNT(*) FROM CONTRACT WHERE ContractStatus='PENDING_SIGNATURE' AND PdfSha256 IS NOT NULL AND SignedAt IS NULL)<>1 OR EXISTS(SELECT 1 FROM INVOICE) OR EXISTS(SELECT 1 FROM PAYMENT) OR EXISTS(SELECT 1 FROM TRIP_PLAN) THROW 51030,'Main-source UI scope invariants failed.',1;");
    else await Sql(connection, "IF (SELECT COUNT(*) FROM TRANSPORT_REQUEST)<>1 OR (SELECT COUNT(*) FROM HORSE)<>1 OR (SELECT COUNT(*) FROM CONTRACT)<>1 OR (SELECT COUNT(*) FROM INVOICE WHERE PaidAmount=40000000 AND TotalPayableAmount=40000000 AND PaymentStatus='PAID')<>1 OR (SELECT COUNT(*) FROM PAYMENT WHERE Status='SUCCESS' AND Method='VNPAY')<>1 OR (SELECT COUNT(*) FROM TRIP_PLAN WHERE DeploymentStatus='CONFIRMED' AND RoutingAcknowledgedBy='browser-route' AND DocumentsAcknowledgedBy='browser-docs')<>1 THROW 51030,'Typed browser SQL invariants failed.',1;");
    if(Environment.GetEnvironmentVariable("FLOW1_BROWSER_BASELINE")=="1") await Sql(connection,"IF (SELECT COUNT(*) FROM TRANSPORT_REQUEST WHERE DeclaredValueUsd=150000.25)<>1 OR (SELECT COUNT(*) FROM LEGAL_MEDICAL_RECORD WHERE DocumentType='BASELINE_MEDICAL' AND DocumentStatus='UPLOADED' AND VerifiedBy IS NULL)<>2 THROW 51034,'Baseline declarations or unverified document links differ.',1;");
    await Sql(connection,"IF EXISTS(SELECT 1 FROM COST_ITEM) THROW 51032,'Unexpected quote cost rows.',1;");
    var airRoute=Environment.GetEnvironmentVariable("FLOW1_RELATIONAL_AIR")=="1";
    await Sql(connection,airRoute?"IF NOT EXISTS(SELECT 1 FROM TRANSPORT_REQUEST WHERE TransportType='AIR' AND OriginCountry='VN' AND DestinationCountry='JP' AND DistanceKm IS NULL AND PreparationDays=7) THROW 51033,'AIR scope differs.',1;":"IF NOT EXISTS(SELECT 1 FROM TRANSPORT_REQUEST WHERE TransportType='ROAD' AND DistanceKm=300 AND PreparationDays=2) THROW 51033,'ROAD scope differs.',1;");
    await Sql(connection,"IF EXISTS(SELECT 1 FROM sys.columns WHERE name IN ('Flow1StateJson','Flow1StateVersion')) THROW 51031,'Unexpected JSON schema in native browser database.',1;");
    Console.WriteLine(mainSource ? "PASS: original main UI / login guard / owned data / real Draft and PDF; zero signature/invoice/payment/Trip. Missing UI deferred to frontend teammate." : "PASS: typed browser / real PDF / loopback SMTP / signed IPN fixture / one deposit and Trip / current handoff acknowledgements; no live provider payment.");
    Console.WriteLine("Evidence: "+output);
}
finally
{
    if(api is not null){if(!api.HasExited){api.Kill(entireProcessTree:true);await api.WaitForExitAsync();}api.Dispose();}log?.Dispose();
    if(created){if(!Regex.IsMatch(name,@"\ARaceHorseFlow1Browser_[a-f0-9]{32}\z"))throw new InvalidOperationException("Unsafe cleanup target.");SqlConnection.ClearAllPools();await Sql(master,$"ALTER DATABASE [{name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{name}];");}
}
static int Port(){var socket=new TcpListener(IPAddress.Loopback,0);socket.Start();var port=((IPEndPoint)socket.LocalEndpoint).Port;socket.Stop();return port;}
static async Task Sql(string connection,string sql){await using var db=new SqlConnection(connection);await db.OpenAsync();await using var command=new SqlCommand(sql,db){CommandTimeout=60};await command.ExecuteNonQueryAsync();}

static int Available(int port){try{var socket=new TcpListener(IPAddress.Loopback,port);socket.Start();socket.Stop();return port;}catch(SocketException){throw new InvalidOperationException($"Local demo port {port} is occupied; stop the owning app yourself or reuse an existing demo.");}}
