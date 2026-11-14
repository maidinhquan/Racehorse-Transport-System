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
    public Task<User?> GetByResetTokenAsync(string resetToken, CancellationToken cancellationToken = default) =>
        DbSet.FirstOrDefaultAsync(u => u.ForgotPasswordRequest == resetToken, cancellationToken);

    private static bool IsPrimaryKeyViolation(SqlException sql) =>
        sql.Number == 2627 && sql.Message.Contains("PK_User", StringComparison.OrdinalIgnoreCase);

    private Task SyncUserSequenceAsync(CancellationToken cancellationToken) =>
        Context.Database.ExecuteSqlRawAsync("""
            IF OBJECT_ID('dbo.SEQ_USER_ID', 'SO') IS NOT NULL
            BEGIN
                DECLARE @nextId bigint = ISNULL((
                    SELECT MAX(TRY_CAST(SUBSTRING(UserID, 6, 20) AS bigint))
                    FROM dbo.[USER]
                    WHERE UserID LIKE 'USER_[0-9]%'
                      AND TRY_CAST(SUBSTRING(UserID, 6, 20) AS bigint) IS NOT NULL
                ), 0) + 1;
                DECLARE @ddl nvarchar(200) = N'ALTER SEQUENCE dbo.[SEQ_USER_ID] RESTART WITH ' + CAST(@nextId AS nvarchar(30)) + N';';
                EXEC sp_executesql @ddl;
            END
            """, cancellationToken);

    public override async Task<User> AddAsync(User entity, CancellationToken cancellationToken = default)
    {
        var initialUserId = entity.UserId;
        var generatedBySequence = string.IsNullOrWhiteSpace(initialUserId);
        var strategy = Context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
        entity.UserId = initialUserId;
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
            try
            {
                await base.AddAsync(entity, cancellationToken);
            }
            catch (DbUpdateException exception) when (generatedBySequence && exception.InnerException is SqlException sql && IsPrimaryKeyViolation(sql))
            {
                Context.Entry(entity).State = EntityState.Detached;
                entity.UserId = initialUserId;
                await SyncUserSequenceAsync(cancellationToken);
                await base.AddAsync(entity, cancellationToken);
            }
            await transaction.CommitAsync(cancellationToken);
            return entity;
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException sql && (sql.Number == 2601 || (sql.Number == 2627 && !IsPrimaryKeyViolation(sql))))
        {
            Context.Entry(entity).State = EntityState.Detached;
            throw new DuplicateUserException(exception);
        }
        catch
        {
            Context.Entry(entity).State = EntityState.Detached;
            throw;
        }
        });
    }
}
