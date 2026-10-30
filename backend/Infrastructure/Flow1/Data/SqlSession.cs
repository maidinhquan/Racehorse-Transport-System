using System.Linq.Expressions;
using Application.Flow1.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Flow1.Data;

public sealed class SqlSession(RequestContext context) : IDataSession
{
    public async Task<T?> FindAsync<T>(CancellationToken ct, params object[] key)
        where T : class => await context.Set<T>().FindAsync(key, ct);

    public Task<List<T>> ListAsync<T>(Expression<Func<T, bool>> predicate, CancellationToken ct)
        where T : class => context.Set<T>().Where(predicate).ToListAsync(ct);

    public void Add<T>(T row)
        where T : class => context.Add(row);

    public void Remove<T>(T row)
        where T : class => context.Remove(row);

    public Task SaveAsync(CancellationToken ct) => context.SaveChangesAsync(ct);

    public async Task<T> WriteAsync<T>(
        Func<CancellationToken, Task<T>> action,
        CancellationToken ct
    )
    {
        // Serialize this module's short write transactions, including read/decision/write.
        // External calls must be completed before entering this scope.
        await using var transaction = await context.Database.BeginTransactionAsync(
            System.Data.IsolationLevel.Serializable,
            ct
        );
        try
        {
            await context.Database.ExecuteSqlRawAsync(
                """
                DECLARE @result int;
                EXEC @result = sys.sp_getapplock @Resource=N'RaceHorse.Flow1.Write',
                    @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000;
                IF @result < 0 THROW 51300, 'Flow 1 write busy', 1;
                """,
                ct
            );
            // Do not make decisions from an entity cached before the lock was acquired.
            context.ChangeTracker.Clear();
            var result = await action(ct);
            await context.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return result;
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            context.ChangeTracker.Clear();
            throw;
        }
    }
}
