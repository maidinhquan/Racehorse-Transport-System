using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.RegularExpressions;
using Infrastructure.Data.Context;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit;

namespace Flow1.Tests;

// Historical SQL tests target the retired RowVersion/migration context, not AddRequestModule.
// Current SQL coverage lives in Flow1.Rebuild.Tests and executes the canonical Reviewed schema.
public sealed class LegacySqlFactAttribute : FactAttribute
{
    public LegacySqlFactAttribute() => Skip = "Retired legacy SQL/migration contract. Run Flow1.Rebuild.Tests against HorseTransportDB/HorseTransportDB_Reviewed.sql.";
}

internal sealed class FlowClock : TimeProvider
{
    public DateTimeOffset Value = new(2026, 10, 15, 20, 0, 0, TimeSpan.Zero);
    public DateTimeOffset Now => Value;
    public override DateTimeOffset GetUtcNow() => Value;
}

internal sealed class Flow1TestFolders : IDisposable
{
    public string Root { get; } = Path.Combine(Path.GetTempPath(), "racehorse-flow1-test-" + Guid.NewGuid().ToString("N"));
    public Flow1TestFolders() => Directory.CreateDirectory(Root);
    public void Dispose() => Cleanup(Root);
    public static void Cleanup(string root) { try { if (Directory.Exists(root)) Directory.Delete(root, true); } catch { } }
}

internal sealed class CustomerTestAuth(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var owner = Request.Headers["X-Test-Owner"].ToString();
        if (owner.Length == 0) return Task.FromResult(AuthenticateResult.NoResult());
        var claims = new[] {
            new Claim(ClaimTypes.NameIdentifier, owner),
            new Claim(ClaimTypes.Role, Request.Headers["X-Test-Role"].FirstOrDefault() ?? "CUSTOMER")
        };
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(
            new ClaimsIdentity(claims, Scheme.Name)), Scheme.Name)));
    }
}

internal sealed class Flow1TestDatabase : IAsyncDisposable
{
    private readonly string name = "RaceHorseFlow1Test_" + Guid.NewGuid().ToString("N");
    private readonly string masterConnection;
    public string ConnectionString { get; }

    private Flow1TestDatabase()
    {
        var server = Environment.GetEnvironmentVariable("RACEHORSE_TEST_SQL_SERVER") ?? "";
        var host = server.Split('\\')[0];
        if (!new[] { ".", "localhost", Environment.MachineName, "(localdb)" }.Contains(host, StringComparer.OrdinalIgnoreCase))
            throw new InvalidOperationException("Flow 1 tests only create disposable databases on a local instance.");
        var builder = new SqlConnectionStringBuilder
        {
            DataSource = server, InitialCatalog = "master", IntegratedSecurity = true,
            TrustServerCertificate = true, ConnectTimeout = 10
        };
        masterConnection = builder.ConnectionString;
        builder.InitialCatalog = name;
        ConnectionString = builder.ConnectionString;
    }

    public static Task<Flow1TestDatabase> CreateAsync(bool migrate = true) =>
        throw new NotSupportedException("The legacy SQL fixture is retired. Use Flow1.Rebuild.Tests/SqlFixture with HorseTransportDB/HorseTransportDB_Reviewed.sql.");

    public HorseTransportDbContext Context() => new(new DbContextOptionsBuilder<HorseTransportDbContext>()
        .UseSqlServer(ConnectionString).Options);
    public Task MigrateAsync() => throw new NotSupportedException("Numbered migrations were removed; use the Reviewed reset schema.");
    public Task ScriptAsync(string filename) => throw new NotSupportedException("Legacy migration assertions are retired; no SQL file is loaded.");
    public Task ExecuteAsync(string sql) => ExecuteOnAsync(ConnectionString, sql);
    public async Task<T> ScalarAsync<T>(string sql)
    {
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var command = new SqlCommand(sql, connection) { CommandTimeout = 30 };
        return (T)(await command.ExecuteScalarAsync())!;
    }
    private static async Task ExecuteOnAsync(string connectionString, string sql)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();
        await using var command = new SqlCommand(sql, connection) { CommandTimeout = 60 };
        await command.ExecuteNonQueryAsync();
    }
    public async ValueTask DisposeAsync()
    {
        if (!Regex.IsMatch(name, "\\ARaceHorseFlow1Test_[a-f0-9]{32}\\z")) throw new InvalidOperationException("Unsafe test database name.");
        SqlConnection.ClearAllPools();
        await ExecuteOnAsync(masterConnection, $"ALTER DATABASE [{name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{name}];");
    }
}
