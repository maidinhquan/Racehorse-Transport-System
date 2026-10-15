namespace Domain.Interfaces;

/// <summary>All Flow 1 SQL mutations for a request share one transaction and request lock.</summary>
public interface IFlow1UnitOfWork
{
    Task<T> ExecuteAsync<T>(string requestId, Func<CancellationToken, Task<T>> action,
        CancellationToken cancellationToken = default);
    Task LockHorsesAsync(IEnumerable<string> horseIds, CancellationToken cancellationToken = default);
}
