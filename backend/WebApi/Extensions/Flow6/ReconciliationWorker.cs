using Application.Flow6.Contracts;
using Application.Flow6.Exceptions;
using Application.Flow6.Interfaces;
using Application.Flow6.Services;
namespace WebApi.Extensions.Flow6;
public sealed class ReconciliationWorker(IServiceScopeFactory scopes,ILogger<ReconciliationWorker> logger):BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer=new PeriodicTimer(TimeSpan.FromMinutes(5));
        try
        {
            while(await timer.WaitForNextTickAsync(stoppingToken))
            {
                try {using var scope=scopes.CreateScope();await scope.ServiceProvider.GetRequiredService<AftercareService>().ReconcilePending(stoppingToken);}
                catch(Exception e)when(e is not OperationCanceledException){logger.LogWarning("Flow 6 payment query failed ({FailureType}); pending payments retained.",e.GetType().Name);}
            }
        }
        catch(OperationCanceledException)when(stoppingToken.IsCancellationRequested){}
    }
}
