using System.Data;
using System.Text.RegularExpressions;
using Domain.Interfaces;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Transactions;

public sealed class Flow1UnitOfWork(HorseTransportDbContext context) : IFlow1UnitOfWork
{
    public async Task<T> ExecuteAsync<T>(string requestId, Func<CancellationToken, Task<T>> action,
        CancellationToken cancellationToken = default)
    {
        ValidateId(requestId);
        ArgumentNullException.ThrowIfNull(action);
        if (context.Database.CurrentTransaction is not null)
            throw new InvalidOperationException("Nested Flow 1 transactions are not supported.");
        // Reject accidental changes staged outside the request's transaction.
        if (context.ChangeTracker.HasChanges())
            throw new InvalidOperationException("Stage Flow 1 writes inside ExecuteAsync.");

        await using var transaction = await context.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        try
        {
            await LockAsync("Request", requestId, cancellationToken);
            // Never reuse tracked values loaded before the application lock.
            context.ChangeTracker.Clear();
            var result = await action(cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return result;
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            context.ChangeTracker.Clear();
            throw;
        }
    }

    public async Task LockHorsesAsync(IEnumerable<string> horseIds, CancellationToken cancellationToken = default)
    {
        if (context.Database.CurrentTransaction is null)
            throw new InvalidOperationException("Horse locks require a Flow 1 transaction.");
        var ids = horseIds.Select(id => { ValidateId(id); return id.ToUpperInvariant(); })
            .Distinct(StringComparer.Ordinal).OrderBy(id => id, StringComparer.Ordinal);
        foreach (var id in ids) await LockAsync("Horse", id, cancellationToken);
    }

    private Task<int> LockAsync(string kind, string id, CancellationToken ct)
    {
        // SQL IDs in the MVP are ASCII. Normalize case because sp_getapplock names
        // are case-sensitive even when the database's ID columns are not.
        var resource = $"RaceHorse.Flow1.{kind}:{id.ToUpperInvariant()}";
        return context.Database.ExecuteSqlInterpolatedAsync($"""
            DECLARE @result int;
            EXEC @result = sys.sp_getapplock @Resource={resource}, @LockMode='Exclusive',
                @LockOwner='Transaction', @LockTimeout=10000;
            IF @result < 0 THROW 51020, 'Flow 1 lock unavailable.', 1;
            """, ct);
    }

    private static void ValidateId(string id)
    {
        if (string.IsNullOrWhiteSpace(id) || !Regex.IsMatch(id, "\\A[A-Za-z0-9_-]{1,50}\\z", RegexOptions.CultureInvariant))
            throw new ArgumentException("Flow 1 IDs must be 1-50 ASCII letters, digits, underscores or hyphens.");
    }
}
