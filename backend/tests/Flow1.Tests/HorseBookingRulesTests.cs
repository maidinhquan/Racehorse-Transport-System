using System.Linq.Expressions;
using Application.Common.Exceptions;
using Application.Flow1.Interfaces;
using Application.Flow1.Services;
using Domain.Flow1.Entities;
using Xunit;

namespace Flow1.Tests;

public sealed class HorseBookingRulesTests
{
    private static TransportRequest Request(string id, string status, int day = 1) => new()
    {
        RequestID = id, Status = status, CustomerID = "owner",
        ExpectedDate = new(2026, 11, day), CommittedDeadline = new(2026, 11, day + 1),
        Destination = "Stable B", DestinationCountry = "VN", DeliveryLatitude = 10, DeliveryLongitude = 106
    };
    private static MemorySession History(params TransportRequest[] requests) => new(requests.Cast<object>()
        .Concat(requests.Select(r => new RequestHorse { RequestID = r.RequestID, HorseID = "horse" })).ToArray());
    private static Task<Dictionary<string, HorseBookingState>> Check(MemorySession data, string? exclude = null) =>
        HorseBookingRules.CheckAsync(data, new[] { "horse" }, exclude, default);

    [Theory]
    [InlineData("PENDING_REVIEW")]
    [InlineData("ACTIVATED")]
    [InlineData("CHANGES_REQUESTED")]
    [InlineData("CANCELLATION_REQUESTED")]
    public async Task Active_request_keeps_horse_even_for_different_dates(string status)
    {
        var data = History(Request("old", status));
        var next = Request("next", "PENDING_REVIEW", 20);
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() =>
            HorseBookingRules.RequireAvailableAsync(data, new[] { "horse" }, next, default));
        Assert.Equal("HORSE_SCHEDULE_CONFLICT", error.ErrorCode);
        Assert.Equal("IN_TRANSPORT_REQUEST", (await Check(data))["horse"].Status);
    }

    [Theory]
    [InlineData("CANCELLED")]
    [InlineData("REJECTED")]
    [InlineData("DRAFT")]
    public async Task Released_request_does_not_hold_horse_or_change_location(string status)
    {
        var state = (await Check(History(Request("old", status))))["horse"];
        Assert.Null(state.ConflictCode);
        Assert.Equal("AVAILABLE", state.Status);
    }

    [Theory]
    [InlineData("DELIVERED")]
    [InlineData("COMPLETED")]
    [InlineData("CLOSED")]
    public async Task Delivered_horse_can_be_booked_again_from_any_pickup(string status)
    {
        var data = History(Request("old", status));
        Assert.Null((await Check(data))["horse"].ConflictCode);
        Assert.Equal("DELIVERED", (await Check(data))["horse"].Status);
        var next = Request("next", "PENDING_REVIEW", 20);
        next.OriginCountry = "JP"; next.Departure = "Other stable"; next.PickupLatitude = 35; next.PickupLongitude = 139;
        await HorseBookingRules.RequireAvailableAsync(data, new[] { "horse" }, next, default);
    }

    [Fact]
    public async Task Completed_trip_releases_activated_request()
    {
        var data = History(Request("old", "ACTIVATED"));
        data.Add(new Trip { TripID = "trip", RequestID = "old", Status = "COMPLETED" });
        Assert.Equal("DELIVERED", (await Check(data))["horse"].Status);
        Assert.Null((await Check(data))["horse"].ConflictCode);
        await new HorseService(data, new AccessService(data), TimeProvider.System).EditableAsync("horse", default);
    }

    [Fact]
    public async Task Resubmission_ignores_own_request_but_keeps_other_reservations()
    {
        var data = History(Request("self", "PENDING_REVIEW"));
        Assert.Null((await Check(data, exclude: "self"))["horse"].ConflictCode);
        data.Add(Request("other", "ACTIVATED"));
        data.Add(new RequestHorse { RequestID = "other", HorseID = "horse" });
        Assert.Equal("HORSE_SCHEDULE_CONFLICT", (await Check(data, exclude: "self"))["horse"].ConflictCode);
    }

    [Fact]
    public async Task Returned_request_keeps_reservation_but_allows_profile_corrections()
    {
        var data = History(Request("old", "CHANGES_REQUESTED"));
        Assert.Equal("HORSE_SCHEDULE_CONFLICT", (await Check(data))["horse"].ConflictCode);
        await new HorseService(data, new AccessService(data), TimeProvider.System).EditableAsync("horse", default);
    }

    private sealed class MemorySession(params object[] initial) : IDataSession
    {
        private readonly List<object> rows = [.. initial];
        public Task<T?> FindAsync<T>(CancellationToken ct, params object[] key) where T : class => throw new NotSupportedException();
        public Task<List<T>> ListAsync<T>(Expression<Func<T, bool>> predicate, CancellationToken ct) where T : class =>
            Task.FromResult(rows.OfType<T>().Where(predicate.Compile()).ToList());
        public void Add<T>(T row) where T : class => rows.Add(row);
        public void Remove<T>(T row) where T : class => rows.Remove(row);
        public Task SaveAsync(CancellationToken ct) => Task.CompletedTask;
        public Task<T> WriteAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken ct) => action(ct);
    }
}
