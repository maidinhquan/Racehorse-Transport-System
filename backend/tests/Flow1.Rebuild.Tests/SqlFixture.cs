using System.Text.RegularExpressions;
using Infrastructure.Flow1.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Xunit;
namespace Flow1.Rebuild.Tests;
public sealed class SqlFixture : IAsyncLifetime
{
    public string Name { get; } = "Flow1Rebuild_" + Guid.NewGuid().ToString("N");
    private string Master => Environment.GetEnvironmentVariable("FLOW1_TEST_SQL") ?? "Server=.\\SQLEXPRESS;Database=master;Integrated Security=true;TrustServerCertificate=true";
    public string Connection => new SqlConnectionStringBuilder(Master) { InitialCatalog = Name }.ConnectionString;
    public RequestContext Context() => new(new DbContextOptionsBuilder<RequestContext>().UseSqlServer(Connection).Options);
    public async Task InitializeAsync()
    {
        var script = (await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "Schema.sql")))
            .Replace("HorseTransportDB_Reviewed", Name, StringComparison.Ordinal);
        await using var sql = new SqlConnection(new SqlConnectionStringBuilder(Master) { InitialCatalog = "master" }.ConnectionString);
        await sql.OpenAsync();
        try
        {
            foreach (var batch in Regex.Split(script, @"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase))
            {
                if (string.IsNullOrWhiteSpace(batch)) continue;
                await using var command = new SqlCommand(batch, sql) { CommandTimeout = 120 };
                await command.ExecuteNonQueryAsync();
            }
        }
        catch { await DisposeAsync(); throw; }
    }
    public async Task DisposeAsync()
    {
        if (!Regex.IsMatch(Name, @"\AFlow1Rebuild_[a-f0-9]{32}\z")) throw new InvalidOperationException("Unsafe test database name");
        SqlConnection.ClearAllPools();
        await using var connection = new SqlConnection(new SqlConnectionStringBuilder(Master) { InitialCatalog = "master" }.ConnectionString);
        await connection.OpenAsync();
        await using var command = new SqlCommand($"IF DB_ID('{Name}') IS NOT NULL BEGIN ALTER DATABASE [{Name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{Name}]; END", connection);
        await command.ExecuteNonQueryAsync();
    }
}
