using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs;

public class BaseDAO<T>(HorseTransportDbContext context) : IBaseDAO<T> where T : class
{
    protected readonly HorseTransportDbContext Context = context;
    protected readonly DbSet<T> DbSet = context.Set<T>();

    public virtual async Task<T?> GetByIdAsync(string id, CancellationToken cancellationToken = default) =>
        await DbSet.FindAsync([id], cancellationToken);

    // Persist immediately, matching the existing backend/DAO convention.
    public virtual async Task<T> AddAsync(T entity, CancellationToken cancellationToken = default)
    {
        await DbSet.AddAsync(entity, cancellationToken);
        await Context.SaveChangesAsync(cancellationToken);
        return entity;
    }
}
