using Domain.Entities;
using Domain.Exceptions;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs.Identity;

public sealed class UserDAO(HorseTransportDbContext context) : BaseDAO<User>(context), IUserDAO
{
    public Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        DbSet.AsNoTracking().FirstOrDefaultAsync(u => u.Email != null && u.Email.Trim().ToLower() == email, cancellationToken);
    public Task<User?> GetByPhoneAsync(string phone, CancellationToken cancellationToken = default) =>
        DbSet.AsNoTracking().FirstOrDefaultAsync(u => u.Phone != null &&
            u.Phone.Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "") == phone, cancellationToken);
    public Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default) =>
        DbSet.AsNoTracking().FirstOrDefaultAsync(u => u.Username == username, cancellationToken);
    public async Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        await GetByEmailAsync(email, cancellationToken) is not null;
    public async Task<bool> ExistsByPhoneAsync(string phone, CancellationToken cancellationToken = default) =>
        await GetByPhoneAsync(phone, cancellationToken) is not null;
    public async Task<bool> UpdateUserAsync(User user, CancellationToken cancellationToken = default)
    {
        Context.Users.Update(user);
        await Context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public override async Task<User> AddAsync(User entity, CancellationToken cancellationToken = default)
    {
        await using var transaction = await Context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            // Database-scoped transaction lock serializes final registration writes across API
            // instances. It works even before the optional unique-index script is installed.
            await Context.Database.ExecuteSqlRawAsync("""
                DECLARE @result int;
                EXEC @result = sys.sp_getapplock @Resource = N'RaceHorse.UserRegistration',
                    @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
                IF @result < 0 THROW 50010, 'Registration lock unavailable.', 1;
                """, cancellationToken);
            if (entity.Email is not null && await ExistsByEmailAsync(entity.Email, cancellationToken) ||
                entity.Phone is not null && await ExistsByPhoneAsync(entity.Phone, cancellationToken))
                throw new DuplicateUserException();
            await base.AddAsync(entity, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return entity;
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException { Number: 2601 or 2627 })
        {
            Context.Entry(entity).State = EntityState.Detached;
            throw new DuplicateUserException(exception);
        }
        catch
        {
            Context.Entry(entity).State = EntityState.Detached;
            throw;
        }
    }

    public async Task<bool> UpdateUserAsync(User user, CancellationToken cancellationToken = default)
    {
        DbSet.Update(user);
        await Context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
