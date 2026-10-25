using System.Linq.Expressions;
using Application.DTOs.Flow1;
namespace Application.Flow1.Interfaces;

public interface IDataStore
{
    Task<T?> FindAsync<T>(string id, CancellationToken ct) where T : class;
    Task<List<T>> QueryAsync<T>(Expression<Func<T, bool>> predicate, CancellationToken ct) where T : class;
    void Add(object row);
    void Remove(object row);
    Task SaveAsync(CancellationToken ct);
    Task<T> RunAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken ct);
}
