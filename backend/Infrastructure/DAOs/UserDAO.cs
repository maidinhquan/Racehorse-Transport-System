using Domain.Entities;
using Domain.Interfaces.DAOs;
using Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DAOs
{
    public class UserDAO : BaseDAO<User>, IUserDAO
    {
        public UserDAO(HorseTransportDbContext context) : base(context)
        {
        }

        public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return null;
            }

            var cleanEmail = email.Trim().ToLower();
            return await DbSet.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == cleanEmail, cancellationToken);
        }

        public Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
            => DbSet.FirstOrDefaultAsync(u => u.Username == username, cancellationToken);

        public Task<User?> GetByPhoneAsync(string phone, CancellationToken cancellationToken = default)
            => DbSet.FirstOrDefaultAsync(u => u.Phone == phone, cancellationToken);

        public async Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default)
            => await GetByEmailAsync(email, cancellationToken) != null;

        public async Task<bool> ExistsByPhoneAsync(string phone, CancellationToken cancellationToken = default)
            => await GetByPhoneAsync(phone, cancellationToken) != null;

        public async Task<bool> UpdateUserAsync(User user, CancellationToken cancellationToken = default)
        {
            Context.Users.Update(user);
            await Context.SaveChangesAsync(cancellationToken);
            return true;
        }

        public Task<User?> GetByResetTokenAsync(string resetToken, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(resetToken))
            {
                return Task.FromResult<User?>(null);
            }

            var cleanToken = resetToken.Trim();
            return DbSet.FirstOrDefaultAsync(
                u => u.ForgotPasswordRequest == cleanToken || u.ResetOtpCode == cleanToken,
                cancellationToken);
        }
    }
}
