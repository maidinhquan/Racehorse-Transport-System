using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;
using Application.Services;
using Application.Common.Flow1;
using Domain.Entities;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

// Explicit local-only connected test; no writes to the configured business database.
if (args.Length != 2) throw new ArgumentException("Arguments: absolute Node executable, absolute Playwright module directory.");
var repository = Directory.GetCurrentDirectory();
if (!File.Exists(Path.Combine(repository, "backend/Backend.slnx"))) throw new InvalidOperationException("Run from repository root.");
// Explicit opt-in for bounded real map requests; all SQL/files/accounts remain test-only.
var liveMaps = Environment.GetEnvironmentVariable("FLOW1_BROWSER_LIVE_MAPS") == "1";
var phase4 = Environment.GetEnvironmentVariable("FLOW1_BROWSER_PHASE4") == "1";
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
var output = Path.Combine(repository, "backend/WebApi/App_Data/flow1/browser-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(output);
Process? api = null;
StreamWriter? log = null;
var created = false;
try
{
    await Sql(master, $"CREATE DATABASE [{name}];"); created = true;
    foreach (var file in new[] { "000_legacy_schema.sql", "003_flow1_minimal_schema.sql" })
        await Sql(connection, await File.ReadAllTextAsync(Path.Combine(repository, "backend/database", file)));
    await Sql(connection, "INSERT INTO dbo.[USER](UserID,PasswordHash,Role,FullName) VALUES ('browser-owner','test-only','CUSTOMER',N'Browser Demo');");
    if (phase3) await Sql(connection, "INSERT INTO dbo.[USER](UserID,PasswordHash,Role,FullName) VALUES ('browser-manager','test-only','LOGISTICS_MANAGER',N'Manager Demo');");
    var apiPort = Port(); var mapPort = Port(); var frontPort = Port();
    var mapProvider = Environment.GetEnvironmentVariable("FLOW1_BROWSER_MAP_PROVIDER") ?? "OSM";
    if (mapProvider is not ("OSM" or "MAPBOX" or "GEOAPIFY")) throw new ArgumentException("FLOW1_BROWSER_MAP_PROVIDER must be OSM, MAPBOX or GEOAPIFY.");
    const string jwt = "Flow1BrowserFixtureKey_NotAProductionSecret_2026_AtLeast32Bytes";
    var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Jwt:Key"] = jwt }).Build();
    var token = new TokenService(config).GenerateAccessToken(new User { UserId = "browser-owner", Role = "CUSTOMER", FullName = "Browser Demo" });
    var managerToken = new TokenService(config).GenerateAccessToken(new User { UserId = "browser-manager", Role = "LOGISTICS_MANAGER", FullName = "Manager Demo" });
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
        ["Flow1__Storage__MetadataRoot"] = Path.Combine(output, "metadata") };
    foreach (var pair in env) apiInfo.Environment[pair.Key] = pair.Value;
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
    nodeInfo.ArgumentList.Add(Path.Combine(repository, "backend/tools/flow1-browser.cjs"));
    foreach (var arg in new[] { args[1], apiPort.ToString(), mapPort.ToString(), frontPort.ToString(), output }) nodeInfo.ArgumentList.Add(arg);
    nodeInfo.Environment["FLOW1_FIXTURE_TOKEN"] = token;
    nodeInfo.Environment["FLOW1_MANAGER_FIXTURE_TOKEN"] = managerToken;
    nodeInfo.Environment["FLOW1_BROWSER_PHASE3"] = phase3 ? "1" : "0";
    nodeInfo.Environment["FLOW1_BROWSER_PHASE4"] = phase4 ? "1" : "0";
    nodeInfo.Environment["FLOW1_BROWSER_LIVE_MAPS"] = liveMaps ? "1" : "0";
    foreach (var key in nodeInfo.Environment.Keys.Where(k => k.StartsWith("Flow1__Maps__", StringComparison.OrdinalIgnoreCase)).ToArray())
        nodeInfo.Environment.Remove(key);
    using var node = Process.Start(nodeInfo) ?? throw new InvalidOperationException("Could not start browser runner.");
    var stdout = node.StandardOutput.ReadToEndAsync(); var stderr = node.StandardError.ReadToEndAsync();
    using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(phase4 ? 5 : 4));
    try { await node.WaitForExitAsync(timeout.Token); }
    finally { if (!node.HasExited) node.Kill(entireProcessTree: true); }
    var nodeLog = await stdout + "\n" + await stderr;
    await File.WriteAllTextAsync(Path.Combine(output, "browser.log"), nodeLog);
    Console.WriteLine(nodeLog);
    if (node.ExitCode != 0) throw new InvalidOperationException($"Chromium flow failed; inspect {output}.");
    await using var apiLogRead = new FileStream(Path.Combine(output, "api.log"), FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
    using var apiLogReader = new StreamReader(apiLogRead);
    var apiLog = await apiLogReader.ReadToEndAsync();
    if (apiLog.Contains("pk.flow1_fixture_not_live") || apiLog.Contains("geoapify_flow1_fixture_not_live"))
        throw new InvalidOperationException("A fixture map credential leaked into API logs.");
    if (liveOptions is not null && (apiLog.Contains(liveOptions.Mapbox.AccessToken) || apiLog.Contains(liveOptions.Geoapify.ApiKey) ||
        nodeLog.Contains(liveOptions.Mapbox.AccessToken) || nodeLog.Contains(liveOptions.Geoapify.ApiKey)))
        throw new InvalidOperationException("A map credential leaked into a test log.");
    await Sql(connection, "IF (SELECT COUNT(*) FROM TRANSPORT_REQUEST) <> 1 OR (SELECT COUNT(*) FROM HORSE) <> 1 OR EXISTS(SELECT 1 FROM TRIP_PLAN) OR EXISTS(SELECT 1 FROM INVOICE) THROW 51030, 'Browser acceptance SQL invariant failed.', 1;");
    await Sql(connection, phase4
        ? "IF (SELECT COUNT(*) FROM CONTRACT) <> 2 OR (SELECT COUNT(*) FROM CONTRACT WHERE ContractStatus='PENDING_SIGNATURE' AND CompletionDeadline IS NOT NULL AND SignedAt IS NULL AND TripID IS NULL AND DepositRateStandard=40 AND CurrencyCode='VND') <> 1 OR (SELECT COUNT(*) FROM CONTRACT WHERE ContractStatus='SUPERSEDED') <> 1 OR NOT EXISTS(SELECT 1 FROM TRANSPORT_REQUEST WHERE Status='AWAITING_CONTRACT') THROW 51032, 'Phase 4 PDF publication invariant failed.', 1;"
        : phase3
        ? "IF (SELECT COUNT(*) FROM CONTRACT) <> 2 OR (SELECT COUNT(*) FROM CONTRACT WHERE ContractStatus='DRAFT' AND TripID IS NULL AND DepositRateStandard=40 AND CurrencyCode='VND') <> 1 OR (SELECT COUNT(*) FROM CONTRACT WHERE ContractStatus='SUPERSEDED') <> 1 THROW 51031, 'Phase 3 Draft invariant failed.', 1;"
        : "IF EXISTS(SELECT 1 FROM CONTRACT) THROW 51031, 'Phase 2 created a Contract early.', 1;");
    Console.WriteLine(phase4 ? "PASS: Manager issues immutable PDF using real LibreOffice; Customer views/downloads identical hash; no sign/Trip/Invoice yet."
        : phase3 ? "PASS: Customer + Manager review/revision/plan/Draft/change through real API/SQL/private files; no Trip/Invoice."
        : "PASS: real Chromium → frontend → API → SQL/private files; PENDING request, no Contract/Trip.");
    Console.WriteLine("Evidence: " + output);
}
finally
{
    if (api is not null) { if (!api.HasExited) { api.Kill(entireProcessTree: true); await api.WaitForExitAsync(); } api.Dispose(); }
    log?.Dispose();
    if (created)
    {
        if (!Regex.IsMatch(name, @"\ARaceHorseFlow1Browser_[a-f0-9]{32}\z")) throw new InvalidOperationException("Unsafe cleanup target.");
        SqlConnection.ClearAllPools();
        await Sql(master, $"ALTER DATABASE [{name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{name}];");
    }
}
static int Port() { var socket = new TcpListener(IPAddress.Loopback, 0); socket.Start(); var port = ((IPEndPoint)socket.LocalEndpoint).Port; socket.Stop(); return port; }
static async Task Sql(string connection, string sql) { await using var db = new SqlConnection(connection); await db.OpenAsync(); await using var command = new SqlCommand(sql, db) { CommandTimeout = 60 }; await command.ExecuteNonQueryAsync(); }
