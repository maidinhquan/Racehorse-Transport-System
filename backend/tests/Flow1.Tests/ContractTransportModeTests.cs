using System.Linq.Expressions;
using System.Text.Json;
using Application.Common.Flow1;
using Application.Flow1.Dtos;
using Application.Flow1.Interfaces;
using Application.Flow1.Services;
using Domain.Flow1.Entities;
using Xunit;

namespace Flow1.Tests;

public sealed class ContractTransportModeTests
{
    [Theory]
    [InlineData("ROAD", 3)]
    [InlineData("AIR", 7)]
    public async Task Snapshot_records_manager_selection_and_its_preparation_policy(string mode, int days)
    {
        var data = new Session();
        data.Rows.Add(new Account { UserID = "owner" });
        data.Rows.Add(new Country { CountryCode = "VN", IsActive = true });
        foreach (var method in new[] { "ROAD", "AIR" })
        {
            data.Rows.Add(new SupportedRoute { OriginCountry = "VN", DestinationCountry = "VN", TransportMode = method, IsActive = true });
            data.Rows.Add(new BusinessPolicy { Code = "MIN_PREPARATION_DAYS", ScopeType = "TRANSPORT_MODE", ScopeID = method,
                ValueType = "NUMBER", Unit = "DAY", NumberValue = method == "ROAD" ? 3 : 7 });
        }
        data.Rows.Add(new BusinessPolicy { Code = "DEFAULT_DEPOSIT_PERCENT", ScopeType = "GLOBAL", ValueType = "NUMBER", Unit = "PERCENT", NumberValue = 30 });
        data.Rows.Add(new BusinessPolicy { Code = "CONTRACT_DEADLINE_HOURS", ScopeType = "GLOBAL", ValueType = "NUMBER", Unit = "HOUR", NumberValue = 24 });
        var builder = new SnapshotBuilder(data, new Flow1ContractOptions(), new CatalogService(data, new PolicyService(data)));
        var input = new ContractDraftInput("2026-12-15 18:00", new(0, 0, 0, 0, 0), "2026-12-09 06:00", 30, "", [], mode, "", []);
        var snapshot = await builder.BuildAsync(new Contract { ContractID = "contract", CustomerID = "owner" }, 1,
            new TransportRequest { RequestID = "request", OriginCountry = "VN", DestinationCountry = "VN" }, input, default);
        using var json = JsonDocument.Parse(snapshot);
        var route = json.RootElement.GetProperty("route");
        Assert.Equal(mode, route.GetProperty("mode").GetString());
        Assert.Equal("CONTRACT", route.GetProperty("transportModeDecision").GetString());
        Assert.Equal(days, route.GetProperty("preparationDays").GetDecimal());
    }

    private sealed class Session : IDataSession
    {
        public List<object> Rows { get; } = [];
        public Task<T?> FindAsync<T>(CancellationToken ct, params object[] key) where T : class => Task.FromResult(Rows.OfType<T>().FirstOrDefault());
        public Task<List<T>> ListAsync<T>(Expression<Func<T, bool>> predicate, CancellationToken ct) where T : class => Task.FromResult(Rows.OfType<T>().Where(predicate.Compile()).ToList());
        public void Add<T>(T row) where T : class => Rows.Add(row);
        public void Remove<T>(T row) where T : class => Rows.Remove(row);
        public Task SaveAsync(CancellationToken ct) => Task.CompletedTask;
        public Task<T> WriteAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken ct) => action(ct);
    }
}
