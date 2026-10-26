using System.Net;
using System.Text.RegularExpressions;
using Domain.Entities;
using Domain.Exceptions;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Registration.Tests;

public sealed class SqlServerFactAttribute : FactAttribute
{
    public SqlServerFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("RACEHORSE_TEST_SQL_SERVER")))
            Skip = "Set RACEHORSE_TEST_SQL_SERVER to a LOCAL SQL Server instance with permission to create a disposable test database.";
    }
}

internal sealed class SqlTestDatabase : IAsyncDisposable
{
    private readonly string name = "RaceHorseRegisterTest_" + Guid.NewGuid().ToString("N");
    private readonly string masterConnection;
    public string ConnectionString { get; }

    private SqlTestDatabase()
    {
        var builder = new SqlConnectionStringBuilder
        {
            DataSource = Environment.GetEnvironmentVariable("RACEHORSE_TEST_SQL_SERVER"),
            InitialCatalog = "master", IntegratedSecurity = true, TrustServerCertificate = true, ConnectTimeout = 10
        };
        masterConnection = builder.ConnectionString;
        builder.InitialCatalog = name;
        ConnectionString = builder.ConnectionString;
    }

    public static async Task<SqlTestDatabase> CreateAsync()
    {
        var db = new SqlTestDatabase();
        await db.ExecuteAsync(db.masterConnection, $"CREATE DATABASE [{db.name}]");
        try
        {
            var root = new DirectoryInfo(AppContext.BaseDirectory);
            while (root is not null && !File.Exists(Path.Combine(root.FullName, "HorseTransportDB", "HorseTransportDB_Reviewed.sql"))) root = root.Parent;
            if (root is null) throw new InvalidOperationException("Cannot find the repository SQL schema.");
            var schema = await File.ReadAllTextAsync(Path.Combine(root.FullName, "HorseTransportDB", "HorseTransportDB_Reviewed.sql"));
            // Execute ONLY the USER table definition. Never execute the database-reset script.
            var table = Regex.Match(schema, @"CREATE TABLE \[USER\] \([\s\S]*?\r?\n\);");
            if (!table.Success) throw new InvalidOperationException("USER table not found in schema.");
            await db.ExecuteAsync(db.ConnectionString, table.Value);
            await db.ExecuteAsync(db.ConnectionString, """
                CREATE SEQUENCE dbo.SEQ_USER_ID AS BIGINT START WITH 11 INCREMENT BY 1 NO CYCLE;
                ALTER TABLE dbo.[USER] ADD CONSTRAINT DF_USER_ID
                    DEFAULT ('USER_' + FORMAT(NEXT VALUE FOR dbo.SEQ_USER_ID, '000', 'en-US')) FOR UserID;
                """);
            return db;
        }
        catch { await db.DisposeAsync(); throw; }
    }

    public Task ExecuteAsync(string command) => ExecuteAsync(ConnectionString, command);
    private async Task ExecuteAsync(string connectionString, string command)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();
        await using var sql = new SqlCommand(command, connection);
        await sql.ExecuteNonQueryAsync();
    }

    public async ValueTask DisposeAsync()
    {
        if (!Regex.IsMatch(name, "^RaceHorseRegisterTest_[a-f0-9]{32}$")) throw new InvalidOperationException("Unsafe test database name.");
        SqlConnection.ClearAllPools();
        // Only the generated, validated test database is ever dropped.
        await ExecuteAsync(masterConnection, $"ALTER DATABASE [{name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{name}];");
    }
}

public sealed class SqlServerRegistrationTests
{
    [SqlServerFact]
    public async Task Full_registration_persists_customer_in_the_real_SQL_schema()
    {
        await using var database = await SqlTestDatabase.CreateAsync();
        using var factory = new RegistrationTestFactory(database.ConnectionString);
        using var client = factory.CreateApiClient();
        var token = await RegistrationApiTests.Token(await RegistrationApiTests.Request(client));
        Assert.Equal(HttpStatusCode.OK, (await RegistrationApiTests.Verify(client, token, factory.Email.Codes["user@example.com"])).StatusCode);
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<HorseTransportDbContext>();
        var user = Assert.Single(await context.Users.AsNoTracking().ToListAsync());
        Assert.Equal("CUSTOMER", user.Role);
        Assert.Equal("USER_011", user.UserId);
        Assert.True(BCrypt.Net.BCrypt.Verify(RegistrationApiTests.Password, user.PasswordHash));
        Assert.Null(user.Username);
        Assert.True(user.IsActive);
    }

    [SqlServerFact]
    public async Task Different_API_instances_cannot_register_the_same_email_without_unique_indexes()
    {
        await using var database = await SqlTestDatabase.CreateAsync();
        using var first = new RegistrationTestFactory(database.ConnectionString);
        using var second = new RegistrationTestFactory(database.ConnectionString);
        using var a = first.CreateApiClient();
        using var b = second.CreateApiClient();
        var tokenA = await RegistrationApiTests.Token(await RegistrationApiTests.Request(a, "user@example.com", "0901234567"));
        var tokenB = await RegistrationApiTests.Token(await RegistrationApiTests.Request(b, "USER@EXAMPLE.COM", "0912345678"));
        var responses = await Task.WhenAll(
            RegistrationApiTests.Verify(a, tokenA, first.Email.Codes["user@example.com"]),
            RegistrationApiTests.Verify(b, tokenB, second.Email.Codes["user@example.com"]));
        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.OK);
        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.Conflict);
        using var scope = first.Services.CreateScope();
        Assert.Equal(1, await scope.ServiceProvider.GetRequiredService<HorseTransportDbContext>().Users.CountAsync());
    }

    [SqlServerFact]
    public async Task Different_API_instances_cannot_register_the_same_phone()
    {
        await using var database = await SqlTestDatabase.CreateAsync();
        using var first = new RegistrationTestFactory(database.ConnectionString);
        using var second = new RegistrationTestFactory(database.ConnectionString);
        using var a = first.CreateApiClient();
        using var b = second.CreateApiClient();
        var tokenA = await RegistrationApiTests.Token(await RegistrationApiTests.Request(a, "first@example.com", "0901234567"));
        var tokenB = await RegistrationApiTests.Token(await RegistrationApiTests.Request(b, "second@example.com", "090-123-4567"));
        var responses = await Task.WhenAll(
            RegistrationApiTests.Verify(a, tokenA, first.Email.Codes["first@example.com"]),
            RegistrationApiTests.Verify(b, tokenB, second.Email.Codes["second@example.com"]));
        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.OK);
        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.Conflict);
    }

    [SqlServerFact]
    public async Task Existing_mixed_case_email_and_formatted_phone_are_detected()
    {
        await using var database = await SqlTestDatabase.CreateAsync();
        await database.ExecuteAsync("INSERT INTO [USER] (UserID,PasswordHash,Role,FullName,Email,Phone) VALUES ('existing','seed','Customer',N'Existing','USER@EXAMPLE.COM','090-123-4567');");
        using var factory = new RegistrationTestFactory(database.ConnectionString);
        using var client = factory.CreateApiClient();
        Assert.Equal(HttpStatusCode.Conflict, (await RegistrationApiTests.Request(client, "user@example.com", "0912345678")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await RegistrationApiTests.Request(client, "other@example.com", "0901234567")).StatusCode);
    }

    [SqlServerFact]
    public async Task Unique_index_errors_are_translated_to_duplicate_user_and_transaction_rolls_back()
    {
        await using var database = await SqlTestDatabase.CreateAsync();
        await database.ExecuteAsync("CREATE UNIQUE INDEX UX_USER_Username_Test ON [USER](Username) WHERE Username IS NOT NULL;");
        using var factory = new RegistrationTestFactory(database.ConnectionString);
        _ = factory.CreateApiClient();
        using var scope = factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<IUserDAO>();
        await users.AddAsync(new User { UserId = "first", Username = "same", Email = "first@example.com", Phone = "0901234567", FullName = "First", PasswordHash = "hash", Role = "CUSTOMER" });
        await Assert.ThrowsAsync<DuplicateUserException>(() => users.AddAsync(new User
        {
            UserId = "second", Username = "same", Email = "second@example.com", Phone = "0912345678", FullName = "Second", PasswordHash = "hash", Role = "CUSTOMER"
        }));
        Assert.Equal(1, await scope.ServiceProvider.GetRequiredService<HorseTransportDbContext>().Users.CountAsync());
    }
}
