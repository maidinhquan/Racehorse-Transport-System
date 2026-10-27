using System.Linq.Expressions;

namespace Domain.Interfaces.DAOs;

public interface IBaseDAO<T> where T : class
{
    Task<T?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<List<T>> GetAllAsync(CancellationToken cancellationToken = default) => Task.FromResult(new List<T>());
    Task<List<T>> FindAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default) => Task.FromResult(new List<T>());
    Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default) => Task.FromResult<T?>(null);
    Task<T> AddAsync(T entity, CancellationToken cancellationToken = default);
    Task<T> UpdateAsync(T entity, CancellationToken cancellationToken = default) => Task.FromResult(entity);
    Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default) => Task.FromResult(false);
    Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default) => Task.FromResult(false);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) => Task.FromResult(0);
}
