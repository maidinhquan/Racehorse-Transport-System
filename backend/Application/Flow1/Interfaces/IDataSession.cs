using System.Linq.Expressions;
namespace Application.Flow1.Interfaces;

public interface IDataSession
{
    Task<T?> FindAsync<T>(CancellationToken ct, params object[] key) where T : class;
    Task<List<T>> ListAsync<T>(Expression<Func<T, bool>> predicate, CancellationToken ct) where T : class;
    void Add<T>(T row) where T : class;
    void Remove<T>(T row) where T : class;
    Task SaveAsync(CancellationToken ct);
    Task<T> WriteAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken ct);
}
