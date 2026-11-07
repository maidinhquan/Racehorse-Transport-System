using System.Linq.Expressions;
using Application.Common.Exceptions;
using Application.Flow1.Interfaces;
using Application.Flow1.Services;
using Domain.Flow1.Entities;
using Xunit;

namespace Flow1.Rebuild.Tests;

public class PaymentRecoveryTests
{
    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset Now = new(2026, 11, 7, 8, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private sealed class Store(Payment payment) : IDataSession
    {
        public Task<T?> FindAsync<T>(CancellationToken ct, params object[] key) where T : class =>
            Task.FromResult(payment as T);
        public Task<List<T>> ListAsync<T>(Expression<Func<T, bool>> predicate, CancellationToken ct) where T : class =>
            Task.FromResult(new object[] { payment }.OfType<T>().Where(predicate.Compile()).ToList());
        public void Add<T>(T row) where T : class => throw new NotSupportedException();
        public void Remove<T>(T row) where T : class => throw new NotSupportedException();
        public Task SaveAsync(CancellationToken ct) => Task.CompletedTask;
        public Task<T> WriteAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken ct) => action(ct);
    }

    private sealed class Query : IGatewayQuery
    {
        public bool Unavailable = true;
        public int Calls;
        public Task<GatewayQueryResult> QueryAsync(GatewayQueryRequest input, CancellationToken ct)
        {
            Calls++;
            if (Unavailable)
                throw new BusinessRuleException("VNPay Sandbox trả mã 99 (Unexpected error).", 503, "VNPAY_QUERY_UNAVAILABLE");
            return Task.FromResult(new GatewayQueryResult(true, input.PaymentId, input.MerchantId, "NOT_FOUND"));
        }
    }

    [Fact]
    public async Task Error_99_retains_pending_and_automatically_recovers_after_verified_not_found()
    {
        var clock = new Clock();
        var payment = Pending(clock, -40);
        var query = new Query();
        var service = new PaymentService(new Store(payment), null!, null!, null!, clock, query);
        await service.ReconcileAsync(payment.PaymentID, default);
        Assert.Equal("PENDING_GATEWAY", payment.Status);
        Assert.Contains("99", payment.FinancialReviewReason);
        Assert.Null(payment.VnpayReceivedAmount);
        await service.SweepAsync(default);
        Assert.Equal(1, query.Calls);
        query.Unavailable = false;
        clock.Now = clock.Now.AddMinutes(5);
        await service.SweepAsync(default);
        Assert.Equal(2, query.Calls);
        Assert.Equal("FAILED", payment.Status);
    }

    [Fact]
    public async Task Manual_retry_can_run_before_the_automatic_retry_but_respects_ten_seconds()
    {
        var clock = new Clock();
        var payment = Pending(clock, -40);
        var query = new Query();
        var service = new PaymentService(new Store(payment), null!, null!, null!, clock, query);
        await service.ReconcileAsync(payment.PaymentID, default, force: true);
        await service.ReconcileAsync(payment.PaymentID, default, force: true);
        Assert.Equal(1, query.Calls);
        clock.Now = clock.Now.AddSeconds(11);
        query.Unavailable = false;
        await service.ReconcileAsync(payment.PaymentID, default, force: true);
        Assert.Equal("FAILED", payment.Status);
    }

    [Fact]
    public async Task Verified_not_found_keeps_the_grace_period_for_late_results()
    {
        var clock = new Clock();
        var payment = Pending(clock, -5);
        var query = new Query { Unavailable = false };
        var service = new PaymentService(new Store(payment), null!, null!, null!, clock, query);
        await service.ReconcileAsync(payment.PaymentID, default);
        Assert.Equal("PENDING_GATEWAY", payment.Status);
        clock.Now = clock.Now.AddMinutes(11);
        await service.ReconcileAsync(payment.PaymentID, default);
        Assert.Equal("FAILED", payment.Status);
    }

    private static Payment Pending(Clock clock, int expiryMinutes) => new()
    {
        PaymentID = "PAYMENT_" + Guid.NewGuid().ToString("N"),
        InvoiceID = "INVOICE_TEST", Status = "PENDING_GATEWAY", Method = "VNPAY",
        CurrencyCode = "VND", Amount = 400000, VnpayTmnCode = "TEST0001",
        VnpayExpiresAtUtc = clock.Now.UtcDateTime.AddMinutes(expiryMinutes),
        VnpayCreatedAtUtc = clock.Now.UtcDateTime.AddMinutes(expiryMinutes - 15),
    };
}
