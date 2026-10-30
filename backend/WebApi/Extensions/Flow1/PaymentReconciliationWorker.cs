using Application.Flow1.Services;

namespace WebApi.Extensions.Flow1;

/// <summary>
/// Every 5 minutes asks VNPAY about payments still waiting for the gateway, so a missed IPN
/// (tunnel down, machine off) never leaves a deposit pending forever. See PaymentService.ReconcileAsync.
/// </summary>
public sealed class PaymentReconciliationWorker(IServiceScopeFactory scopes, ILogger<PaymentReconciliationWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try { await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); } catch (OperationCanceledException) { return; }
        using var timer = new PeriodicTimer(Interval);
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                var checkedCount = await scope.ServiceProvider.GetRequiredService<PaymentService>().SweepAsync(stoppingToken);
                if (checkedCount > 0) logger.LogInformation("VNPAY reconciliation checked {Count} pending payment(s).", checkedCount);
            }
            catch (Exception error) when (error is not OperationCanceledException)
            {
                logger.LogWarning(error, "VNPAY reconciliation sweep failed; retrying in {Interval}.", Interval);
            }
        }
        while (await WaitAsync(timer, stoppingToken));
    }

    private static async Task<bool> WaitAsync(PeriodicTimer timer, CancellationToken ct)
    {
        try { return await timer.WaitForNextTickAsync(ct); } catch (OperationCanceledException) { return false; }
    }
}
