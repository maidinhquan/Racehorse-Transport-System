using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using Application.Flow6.Services;
namespace WebApi.Extensions.Flow6;
public sealed class ClosureWorker(IServiceScopeFactory scopes,ILogger<ClosureWorker> logger):BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer=new PeriodicTimer(TimeSpan.FromMinutes(1));
        try
        {
            while(await timer.WaitForNextTickAsync(stoppingToken))
            {
                try { using var scope=scopes.CreateScope();await scope.ServiceProvider.GetRequiredService<AftercareService>().CloseDue(stoppingToken); }
                catch(Exception e)when(e is not OperationCanceledException) {logger.LogWarning("Flow 6 closure sweep failed ({FailureType}); records retained for retry.",e.GetType().Name);}
            }
        }
        catch(OperationCanceledException)when(stoppingToken.IsCancellationRequested) {}
    }
}
