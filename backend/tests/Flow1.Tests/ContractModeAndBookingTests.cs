using System.Linq.Expressions;
using System.Text.Json;
using Application.Common.Exceptions;
using Application.Common.Flow1;
using Application.Flow1.Dtos;
using Application.Flow1.Interfaces;
using Application.Flow1.Mapping;
using Application.Flow1.Services;
using Domain.Flow1.Entities;
using Xunit;

namespace Flow1.Tests;

public sealed class ContractModeAndBookingTests
{
    [Theory]
    [InlineData("ROAD", 2)]
    [InlineData("AIR", 7)]
    public async Task Saved_mode_and_its_policies_survive_reopening(string mode, int preparationDays)
    {
        var f = new Fixture();
        await f.Service.SaveAsync("manager", "request", f.Input(mode), default);
        using var snapshot = JsonDocument.Parse(f.Version.ContentSnapshot);
        Assert.Equal(mode, snapshot.RootElement.GetProperty("route").GetProperty("mode").GetString());
        Assert.Equal(preparationDays, snapshot.RootElement.GetProperty("route").GetProperty("preparationDays").GetDecimal());
        var editor = JsonSerializer.SerializeToElement(await f.Service.EditorAsync("manager", "request", default));
        var defaults = editor.GetProperty("defaults");
        Assert.Equal(mode, defaults.GetProperty("selectedRoute").GetProperty("mode").GetString());
        Assert.Equal(2, defaults.GetProperty("supportedRoutes").GetArrayLength());
        Assert.All(defaults.GetProperty("supportedRoutes").EnumerateArray(), route =>
            Assert.Equal("VN", route.GetProperty("destinationCountry").GetString()));
        Assert.Equal(mode, editor.GetProperty("draft").GetProperty("mode").GetString());
    }

    [Fact]
    public async Task Policy_preview_does_not_change_saved_mode_and_unsupported_mode_is_rejected()
    {
        var f = new Fixture();
        await f.Service.SaveAsync("manager", "request", f.Input("ROAD"), default);
        var before = f.Version.ContentSnapshot;
        var editor = JsonSerializer.SerializeToElement(await f.Service.EditorAsync("manager", "request", default, "AIR"));
        Assert.Equal("AIR", editor.GetProperty("defaults").GetProperty("selectedRoute").GetProperty("mode").GetString());
        Assert.Equal(before, f.Version.ContentSnapshot);
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            f.Service.SaveAsync("manager", "request", f.Input("SEA"), default));
        Assert.Equal("UNSUPPORTED_ROUTE", error.ErrorCode);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Another_unfinished_request_blocks_saving_and_publishing(bool publish)
    {
        var f = new Fixture();
        await f.Service.SaveAsync("manager", "request", f.Input("ROAD"), default);
        var original = f.Version.ContentSnapshot;
        f.Data.Add(new TransportRequest { RequestID = "other", Status = "ACTIVATED" });
        f.Data.Add(new RequestHorse { RequestID = "other", HorseID = "horse" });
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => publish
            ? f.Service.PublishAsync("manager", "request", 1, default)
            : f.Service.SaveAsync("manager", "request", f.Input("ROAD"), default));
        Assert.Equal("HORSE_SCHEDULE_CONFLICT", error.ErrorCode);
        Assert.Equal(original, f.Version.ContentSnapshot);
        Assert.Equal("DRAFT", f.Version.VersionStatus);
    }

    [Fact]
    public void Rejection_reason_is_exposed_only_for_rejected_requests()
    {
        var request = new TransportRequest { RequestID = "request", Status = "REJECTED", ManagerNotes = "Missing documents" };
        var view = JsonSerializer.SerializeToElement(RequestMapper.View(request, []));
        Assert.Equal("Missing documents", view.GetProperty("rejectionReason").GetString());
        request.Status = "CONTRACT_PREPARATION";
        view = JsonSerializer.SerializeToElement(RequestMapper.View(request, []));
        Assert.Equal(JsonValueKind.Null, view.GetProperty("rejectionReason").ValueKind);
    }

    private sealed class Fixture
    {
        public MemorySession Data { get; } = new();
        public ContractVersion Version { get; } = new()
        {
            ContractID = "contract", VersionNo = 1, VersionStatus = "DRAFT", ContentSnapshot = "{}"
        };
        public ContractService Service { get; }

        public Fixture()
        {
            Data.Add(new Account { UserID = "manager", Role = "LOGISTICS_MANAGER", IsActive = true });
            Data.Add(new Account { UserID = "owner", Role = "CUSTOMER", IsActive = true });
            Data.Add(new TransportRequest { RequestID = "request", CustomerID = "owner", Status = "CONTRACT_PREPARATION",
                OriginCountry = "VN", DestinationCountry = "VN", TransportType = "ROAD",
                ExpectedDate = new(2099, 1, 10), CommittedDeadline = new(2099, 1, 12) });
            Data.Add(new Contract { ContractID = "contract", RequestID = "request", CustomerID = "owner", CurrentVersionNo = 1, ContractStatus = "DRAFT" });
            Data.Add(Version);
            Data.Add(new Horse { HorseID = "horse", OwnerID = "owner", Name = "Horse" });
            Data.Add(new RequestHorse { RequestID = "request", HorseID = "horse" });
            Data.Add(new Country { CountryCode = "VN", IsActive = true });
            Data.Add(new Country { CountryCode = "JP", IsActive = true });
            Data.Add(new SupportedRoute { RouteID = "road", OriginCountry = "VN", DestinationCountry = "VN", TransportMode = "ROAD", IsActive = true });
            Data.Add(new SupportedRoute { RouteID = "air", OriginCountry = "VN", DestinationCountry = "VN", TransportMode = "AIR", IsActive = true });
            Data.Add(new SupportedRoute { RouteID = "japan", OriginCountry = "VN", DestinationCountry = "JP", TransportMode = "AIR", IsActive = true });
            Data.Add(new SupportedRoute { RouteID = "inactive", OriginCountry = "VN", DestinationCountry = "VN", TransportMode = "SEA", IsActive = false });
            Policy("MIN_PREPARATION_DAYS", "DAY", 2, "ROAD");
            Policy("MIN_PREPARATION_DAYS", "DAY", 7, "AIR");
            Policy("DEFAULT_DEPOSIT_PERCENT", "PERCENT", 40);
            Policy("CONTRACT_DEADLINE_HOURS", "HOUR", 24);
            var access = new AccessService(Data);
            var policies = new PolicyService(Data);
            var issuer = new Flow1ContractOptions { Issuer = new()
            {
                ["legalName"] = "Transport", ["address"] = "Address", ["email"] = "issuer@example.invalid",
                ["phone"] = "0901112233", ["representative"] = "Manager", ["taxCode"] = "TEST"
            } };
            Service = new ContractService(Data, access, new CatalogService(Data, policies),
                new SnapshotBuilder(Data, issuer, policies), new Renderer(), null!,
                new NotificationService(Data, access, TimeProvider.System), issuer, TimeProvider.System,
                new RequestDetailsService(Data, access));
        }

        private void Policy(string code, string unit, decimal value, string? mode = null) => Data.Add(new BusinessPolicy
        {
            PolicyID = code + mode, Code = code, Unit = unit, ValueType = "NUMBER", NumberValue = value,
            ScopeType = mode is null ? "GLOBAL" : "TRANSPORT_MODE", ScopeID = mode
        });

        public ContractDraftInput Input(string mode) => new("2099-01-12 18:00", new(0, 0, 0, 0, 0), "2099-01-10 08:00",
            40, "", [new PriceItem(1000000, "Transport", true)], mode, "", [new ContractTerm("Payment", "Deposit before signature")]);
    }

    private sealed class Renderer : IContractRenderer
    {
        public Task<string> RenderAsync(JsonElement snapshot, CancellationToken ct) => Task.FromResult("test.pdf");
    }

    private sealed class MemorySession : IDataSession
    {
        private readonly List<object> rows = [];
        public Task<T?> FindAsync<T>(CancellationToken ct, params object[] key) where T : class => Task.FromResult(rows.OfType<T>().SingleOrDefault(row => row switch
        {
            Account a => a.UserID == (string)key[0],
            TransportRequest r => r.RequestID == (string)key[0],
            Contract c => c.ContractID == (string)key[0],
            ContractVersion v => v.ContractID == (string)key[0] && v.VersionNo == (int)key[1],
            _ => false
        }));
        public Task<List<T>> ListAsync<T>(Expression<Func<T, bool>> predicate, CancellationToken ct) where T : class =>
            Task.FromResult(rows.OfType<T>().Where(predicate.Compile()).ToList());
        public void Add<T>(T row) where T : class => rows.Add(row);
        public void Remove<T>(T row) where T : class => rows.Remove(row);
        public Task SaveAsync(CancellationToken ct) => Task.CompletedTask;
        public Task<T> WriteAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken ct) => action(ct);
    }
}
