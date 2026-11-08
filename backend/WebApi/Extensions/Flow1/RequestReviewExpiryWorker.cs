using Application.Flow1.Services;

namespace WebApi.Extensions.Flow1;

public sealed class RequestReviewExpiryWorker(IServiceScopeFactory scopes, ILogger<RequestReviewExpiryWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = scopes.CreateScope();
                await scope.ServiceProvider.GetRequiredService<RequestAssessmentService>().ExpireAsync(stoppingToken);
            }
            catch (Exception error) when (error is not OperationCanceledException)
            {
                logger.LogWarning(error, "Flow 1 request review expiry sweep failed.");
            }
        }
    }
}
